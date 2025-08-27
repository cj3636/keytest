// --- Utility helpers ----------------------------------------------------
const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);
const now = () => performance.now();
const fmtMs = v => `${Math.round(v)} ms`;
const isModifierCode = c => c === 'ShiftLeft' || c === 'ShiftRight' || c === 'ControlLeft' || c === 'ControlRight' || c === 'AltLeft' || c === 'AltRight' || c === 'MetaLeft' || c === 'MetaRight';
const isRefreshKey = c => c === 'F5';
const prettyLabel = (ev) => {
    // Prefer event.key for printed character, fallback to code
    let key = ev.key;
    if (key === ' ') key = 'Space';
    if (key.length === 1) key = key.toUpperCase();
    // Add L/R suffix for modifiers
    const loc = ev.location === 1 ? ' ⬅' : ev.location === 2 ? ' ➡' : '';
    return `${key}${loc}`;
};
const snapshotMods = s => ({ ctrl: s.pressed.has('ControlLeft') || s.pressed.has('ControlRight'), shift: s.pressed.has('ShiftLeft') || s.pressed.has('ShiftRight'), alt: s.pressed.has('AltLeft') || s.pressed.has('AltRight'), meta: s.pressed.has('MetaLeft') || s.pressed.has('MetaRight') });
const modsToString = m => [m.ctrl && 'Ctrl', m.shift && 'Shift', m.alt && 'Alt', m.meta && 'Meta'].filter(Boolean).join('+');

// --- App state ----------------------------------------------------------
const state = {
    pressed: new Set(),           // event.code strings currently down
    keys: new Map(),              // code -> stats
    combos: new Map(),            // combo string -> stats
    eventCount: 0,
    maxSimul: 0,
    capture: true,
    lastFocus: document.hasFocus(),
};

const commonCombos = [
    ['Ctrl+C'], ['Ctrl+V'], ['Ctrl+X'],
    ['Ctrl+Z'], ['Ctrl+Y'], ['Ctrl+Shift+Z'],
    ['Ctrl+A'], ['Ctrl+S'], ['Ctrl+P'],
    ['Ctrl+K'], ['Ctrl+T'], ['Ctrl+W'],
];

const comboListEl = $('#comboList');
const comboUi = new Map();

function initCombos() {
    comboListEl.innerHTML = '';
    for (const arr of commonCombos) {
        const name = arr[0];
        const el = document.createElement('div');
        el.className = 'combo';
        el.innerHTML = `
    <div class="row"><div><span class="dot" aria-hidden="true"></span><b>${name}</b></div><div class="tiny">hits: <span class="hits">0</span></div></div>
    <div class="tiny">last: <span class="last">never</span></div>
    <div class="tiny">notes: <span class="notes">—</span></div>
    `;
        comboListEl.appendChild(el);
        comboUi.set(name, el);
        state.combos.set(name, { hits: 0, last: 0, notes: [] });
    }
}

// --- Key stat structure -------------------------------------------------
function ensureKey(ev) {
    const code = ev.code;
    if (!state.keys.has(code)) {
        state.keys.set(code, {
            code,
            sampleKey: ev.key,
            location: ev.location,
            label: prettyLabel(ev),
            downs: 0,
            ups: 0,
            repeats: 0,
            lastDownTs: 0,
            lastUpTs: 0,
            isDown: false,
            dwellSum: 0,
            dwellCount: 0,
            lastDwell: 0,
            bounceCount: 0,
            anomalies: [],
            lastSeen: 0,
        });
    }
    return state.keys.get(code);
}

function addAnom(stat, msg, level = 'warn') {
    stat.anomalies.unshift({ ts: now(), msg, level });
    if (stat.anomalies.length > 5) stat.anomalies.length = 5;
    // Surface anomaly via toast (throttled by simple time window)
    try {
        if (window.Toast) {
            const type = level === 'bad' ? 'danger' : level === 'warn' ? 'warning' : 'info';
            // Only toast if last anomaly for this key differs to avoid spam
            if (!stat._lastToastMsg || stat._lastToastMsg !== msg) {
                stat._lastToastMsg = msg;
                window.Toast.push(type, stat.label + ' anomaly', msg);
            }
        }
    } catch (e) { /* ignore */ }
}

// --- Rendering ----------------------------------------------------------
const keyGrid = $('#keyGrid');
const keyTiles = new Map();

function renderKeyTile(code) {
    const s = state.keys.get(code);
    let tile = keyTiles.get(code);
    const mismatch = s.downs - s.ups;
    const avg = s.dwellCount ? (s.dwellSum / s.dwellCount) : 0;
    const health = mismatch > 1 ? 'bad' : mismatch === 1 ? 'warn' : 'ok';

    const anomHtml = s.anomalies.map(a => `<div class="tiny ${a.level === 'bad' ? 'flag-bad' : a.level === 'warn' ? 'flag-warn' : 'flag-ok'}">• ${a.msg}</div>`).join('');

    const inner = `
    <div class="head">
        <div>
            <div class="kbd" title="event.code: ${s.code}">${s.label}</div>
            <div class="label">code: ${s.code}</div>
        </div>
        <div class="label">last seen: ${fmtMs(now() - s.lastSeen)} ago</div>
    </div>
    <div class="counts">
        <div class="chip">downs: <b>${s.downs}</b></div>
        <div class="chip">ups: <b>${s.ups}</b></div>
        <div class="chip" title="auto-repeat keydown events">repeats: <b>${s.repeats}</b></div>
    </div>
    <div class="counts">
        <div class="chip">last dwell: <b>${s.lastDwell ? fmtMs(s.lastDwell) : '—'}</b></div>
        <div class="chip">avg dwell: <b>${avg ? fmtMs(avg) : '—'}</b></div>
        <div class="chip ${health === 'ok' ? 'flag-ok' : health === 'warn' ? 'flag-warn' : 'flag-bad'}">mismatch: <b>${mismatch}</b></div>
    </div>
    <div class="anoms">${anomHtml || '<span class="tiny">No recent anomalies.</span>'}</div>
    `;

    if (!tile) {
        tile = document.createElement('div');
        tile.className = 'tile';
        tile.dataset.code = code;
        tile.innerHTML = inner;
        keyGrid.prepend(tile);
        keyTiles.set(code, tile);
    } else {
        tile.innerHTML = inner;
    }
    tile.classList.toggle('down', s.isDown);
}

function renderAll() {
    const mods = snapshotMods(state);
    $('#mCtrl').classList.toggle('active', mods.ctrl);
    $('#mShift').classList.toggle('active', mods.shift);
    $('#mAlt').classList.toggle('active', mods.alt);
    $('#mMeta').classList.toggle('active', mods.meta);

    $('#activeCount').textContent = state.pressed.size;
    $('#maxSimul').textContent = state.maxSimul;
    $('#eventCount').textContent = state.eventCount;
    $('#nowTs').textContent = Math.round(now());
    $('#focusState').textContent = document.hasFocus() ? 'focused' : 'unfocused';

    const pk = $('#pressedKeys');
    pk.innerHTML = '';
    for (const code of state.pressed) {
        const s = state.keys.get(code);
        const chip = document.createElement('div');
        chip.className = 'keychip';
        chip.textContent = s ? s.label : code;
        pk.appendChild(chip);
    }

    // Update tiles for all known keys (sorted by lastSeen desc)
    const codes = [...state.keys.values()].sort((a, b) => b.lastSeen - a.lastSeen).map(s => s.code);
    for (const c of codes) renderKeyTile(c);
}

// --- Combo logic --------------------------------------------------------
function comboFromEvent(ev) {
    const parts = [];
    if (ev.ctrlKey) parts.push('Ctrl');
    if (ev.shiftKey) parts.push('Shift');
    if (ev.altKey) parts.push('Alt');
    if (ev.metaKey) parts.push('Meta');
    const k = ev.key.length === 1 ? ev.key.toUpperCase() : ev.key;
    // Exclude pure modifier-only events
    if (!isModifierCode(ev.code)) parts.push(k);
    return parts.join('+');
}

function markCombo(name, ok = true, note = '') {
    if (!comboUi.has(name)) return;
    const box = comboUi.get(name);
    const dot = box.querySelector('.dot');
    const hitsEl = box.querySelector('.hits');
    const lastEl = box.querySelector('.last');
    const notesEl = box.querySelector('.notes');
    const model = state.combos.get(name);
    if (ok) {
        model.hits++;
        hitsEl.textContent = model.hits;
        dot.classList.remove('bad');
        dot.classList.add('ok');
    } else {
        dot.classList.remove('ok');
        dot.classList.add('bad');
    }
    model.last = now();
    lastEl.textContent = fmtMs(0) + ' ago';
    if (note) model.notes.unshift({ ts: model.last, note });
    if (model.notes.length > 3) model.notes.length = 3;
    notesEl.textContent = model.notes[0]?.note || '—';
}

// Update the "last" timestamps text for combos periodically
setInterval(() => {
    for (const [name, box] of comboUi.entries()) {
        const model = state.combos.get(name);
        if (!model || !model.last) continue;
        box.querySelector('.last').textContent = fmtMs(now() - model.last) + ' ago';
    }
    $('#nowTs').textContent = Math.round(now());
}, 200);

function handleRefresh(ev) {
    ev.preventDefault();
    resetAll();
    window.location.reload();
    console.log('Reloading to allow refresh key to work');
}
// --- Event handlers -----------------------------------------------------
function onKeyDown(ev) {
    if (isRefreshKey(ev.code)) return handleRefresh(ev);
    state.eventCount++;
    if (state.capture) {
        // Avoid breaking hard reloads; allow F5/Ctrl+R only if Meta on mac? We'll block generally for a tester.
        ev.preventDefault();
    }

    const s = ensureKey(ev);
    s.lastSeen = now();

    // Auto-repeat handling
    if (ev.repeat) {
        s.repeats++;
        // If repeats are firing while we believe a modifier should be held but it's not, note it.
        const mods = snapshotMods(state);
        if ((ev.key.length === 1) && (mods.ctrl || mods.alt || mods.meta) === false) {
            addAnom(s, 'Character repeating without modifiers held (possible modifier drop)');
        }
    }

    // Fresh keydown
    if (!s.isDown) {
        s.isDown = true;
        s.downs++;
        s.lastDownTs = now();
        // Bounce detection: very quick down after an up
        const gap = s.lastDownTs - s.lastUpTs;
        if (s.lastUpTs && gap < 25) {
            s.bounceCount++;
            addAnom(s, `Very fast re-press (${Math.round(gap)} ms) — possible switch bounce`, 'warn');
        }
        state.pressed.add(ev.code);
        state.maxSimul = Math.max(state.maxSimul, state.pressed.size);
    } else if (!ev.repeat) {
        // Non-repeat second keydown without an intervening up
        addAnom(s, 'Second keydown received without keyup — possible chatter', 'bad');
    }

    // Combo detection
    const combo = comboFromEvent(ev);
    if (comboUi.has(combo)) {
        // A valid combo was pressed
        markCombo(combo, true);
    } else {
        // Heuristic: if user intended Ctrl+Z but we saw just "Z" while a ctrl key is pressed set-wise, then mark failure
        if ((ev.key === 'z' || ev.key === 'Z') && (state.pressed.has('ControlLeft') || state.pressed.has('ControlRight'))) {
            markCombo('Ctrl+Z', false, 'Z seen while Control pressed set-wise, but combo not detected.');
        }
        if ((ev.key === 'y' || ev.key === 'Y') && (state.pressed.has('ControlLeft') || state.pressed.has('ControlRight'))) {
            markCombo('Ctrl+Y', false, 'Y seen while Control pressed, but combo not detected.');
        }
    }

    renderAll();
}

function onKeyUp(ev) {
    state.eventCount++;
    if (state.capture) ev.preventDefault();
    if (isRefreshKey(ev.code)) return handleRefresh(ev);

    const s = ensureKey(ev);
    s.lastSeen = now();

    // Compute dwell
    if (s.isDown && s.lastDownTs) {
        const dwell = now() - s.lastDownTs;
        s.lastDwell = dwell;
        // Treat comically low/high as potential issues
        if (dwell < 15) addAnom(s, `Extremely short press (${Math.round(dwell)} ms)`, 'warn');
        if (dwell > 2000) addAnom(s, `Long hold (${Math.round(dwell)} ms)`, 'warn');
        s.dwellSum += dwell;
        s.dwellCount++;
    } else {
        addAnom(s, 'Keyup without prior keydown — possible event loss', 'bad');
    }

    s.isDown = false;
    s.ups++;
    s.lastUpTs = now();
    state.pressed.delete(ev.code);

    // After releasing, check mismatch
    const mismatch = s.downs - s.ups;
    if (mismatch !== 0) addAnom(s, `Down/Up mismatch: ${mismatch}`, mismatch > 0 ? 'warn' : 'bad');

    // Modifier-assisted combo confirmation on release of the character key
    const name = comboFromEvent(ev);
    if (comboUi.has(name)) markCombo(name, true);

    renderAll();
}

// --- Export / Reset -----------------------------------------------------
function exportJson() {
    const data = {
        generatedAtMs: Math.round(performance.timeOrigin + now()),
        meta: { maxSimultaneous: state.maxSimul, totalEvents: state.eventCount },
        keys: [...state.keys.values()].map(k => ({
            code: k.code,
            label: k.label,
            location: k.location,
            downs: k.downs,
            ups: k.ups,
            repeats: k.repeats,
            lastDwell: k.lastDwell,
            avgDwell: k.dwellCount ? k.dwellSum / k.dwellCount : 0,
            mismatch: k.downs - k.ups,
            bounceCount: k.bounceCount,
            anomalies: k.anomalies,
        })),
        combos: [...state.combos.entries()].map(([name, m]) => ({ name, hits: m.hits, last: m.last, notes: m.notes })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'keyboard-test-report.json';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
}

function resetAll() {
    state.pressed.clear();
    state.keys.clear();
    state.combos.clear();
    state.eventCount = 0;
    state.maxSimul = 0;
    initCombos();
    keyGrid.innerHTML = '';
    keyTiles.clear();
    renderAll();
}

// --- Focus visual -------------------------------------------------------
function handleFocus() { $('#focusState').textContent = 'focused'; }
function handleBlur() { $('#focusState').textContent = 'unfocused'; }

// --- Boot ---------------------------------------------------------------
function boot() {
    initCombos();
    renderAll();

    window.addEventListener('keydown', onKeyDown, { passive: false });
    window.addEventListener('keyup', onKeyUp, { passive: false });
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    $('#captureToggle').addEventListener('change', e => { state.capture = e.target.checked; });
    $('#resetBtn').addEventListener('click', resetAll);
    $('#exportBtn').addEventListener('click', exportJson);

    // Initial focus hint
    if (!document.hasFocus()) {
        document.body.addEventListener('click', () => document.body.focus(), { once: true });
    }

    // Intro toast
    if (window.Toast) {
        setTimeout(() => window.Toast.info('Ready', 'Begin pressing keys – anomalies will appear here.'), 600);
    }
}

boot();