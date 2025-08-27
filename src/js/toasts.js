// Toast notification system (standalone, no dependencies)
// Provides window.Toast API: Toast.info|success|warning|danger(title, message)
// Also exposes Toast.mute(bool), Toast.push(type,title,msg)
(function () {
  const root = document.documentElement;
  const toastArea = document.getElementById('toastArea');
  const bellBtn = document.getElementById('muteBtn'); // Changed from historyBtn
  const bellOn = document.getElementById('bellOn');
  const bellOff = document.getElementById('bellOff');
  const activeCount = document.getElementById('toastActiveCount');
  const edgeFlash = document.getElementById('edgeFlash');
  const historyPanel = document.getElementById('historyPanel');
  const closeHistory = document.getElementById('closeHistory');
  const clearHistory = document.getElementById('clearHistory');
  const historyList = document.getElementById('historyList');
  const muteToggle = document.getElementById('muteToggle');

  if (!toastArea) { console.warn('[Toast] Missing container'); return; }

  let muted = false;
  let queue = [];
  let active = [];
  let history = []; // [{id,type,title,msg,time}]
  let seq = 0;
  const HISTORY_LIMIT = 20;

  function cssNum(varName, fallback) {
    const v = getComputedStyle(root).getPropertyValue(varName).trim();
    if (!v) return fallback;
    if (v.endsWith('ms')) return parseFloat(v);
    if (v.endsWith('s')) return parseFloat(v) * 1000;
    const n = parseFloat(v); return Number.isFinite(n) ? n : fallback;
  }

  function setBadge() { 
    if (activeCount) activeCount.textContent = String(active.length); 
  }

  function updateMuteState() {
    if (bellBtn) bellBtn.setAttribute('aria-pressed', String(muted));
    if (bellOn) bellOn.style.display = muted ? 'none' : '';
    if (bellOff) bellOff.style.display = muted ? '' : 'none';
    if (muteToggle) muteToggle.checked = muted;
  }

  function flashEdge(type) {
    if (!muted) return;
    const colors = { info: '--c-info', success: '--c-success', warning: '--c-warning', danger: '--c-danger' };
    const cssVar = colors[type] || '--c-info';
    edgeFlash && (edgeFlash.style.background = getComputedStyle(root).getPropertyValue(cssVar));
    if (edgeFlash) {
      edgeFlash.classList.remove('show');
      void edgeFlash.offsetWidth; // reflow to restart
      edgeFlash.classList.add('show');
    }
  }

  function push(type, title, msg) {
    const id = 't' + Date.now() + '_' + (seq++);
    const item = { id, type, title, msg, time: Date.now() };
    history.unshift(item);
    if (history.length > HISTORY_LIMIT) history.length = HISTORY_LIMIT;
    
    if (muted) { 
      flashEdge(type); 
      // Still update badge count even when muted
      setBadge();
      return id; 
    }
    
    queue.push(item);
    drain();
    return id;
  }

  function drain() {
    const maxSimul = parseInt(getComputedStyle(root).getPropertyValue('--toast-max')) || 5;
    while (active.length < maxSimul && queue.length) { spawn(queue.shift()); }
  }

  function spawn(item) {
    const n = document.createElement('div');
    n.className = 'toast ' + item.type;
    n.setAttribute('role', 'status');
    n.dataset.id = item.id;
    n.dataset.order = String(active.length);
    n.innerHTML = `
      <span class="ico" aria-hidden="true">${icon(item.type)}</span>
      <span class="body"><span class="t">${esc(item.title)}</span><span class="d">${esc(item.msg)}</span></span>`;

    // Click to dismiss
    n.addEventListener('click', () => removeToast(n));

    toastArea.prepend(n); // newest on top
    active.unshift(n);

    setBadge();
    const life = cssNum('--toast-life', 5200);
    const collapsedLife = cssNum('--toast-collapsed-life', 2600);
    let remaining = life + collapsedLife;
    function scheduleRemove() {
      clearTimeout(n._removeTimer);
      n._removeTimer = setTimeout(() => removeToast(n), remaining);
    }
    let lastTick = performance.now();
    n.addEventListener('mouseenter', () => { clearTimeout(n._removeTimer); remaining -= (performance.now() - lastTick); });
    n.addEventListener('mouseleave', () => { lastTick = performance.now(); scheduleRemove(); });
    lastTick = performance.now();
    scheduleRemove();
  }

  function removeToast(n) {
    if (!n || !toastArea.contains(n)) return;
    clearTimeout(n._collapseTimer); clearTimeout(n._removeTimer);
    n.style.animation = 'toastOut 240ms ease forwards';
    n.addEventListener('animationend', () => {
      const idx = active.indexOf(n); if (idx !== -1) active.splice(idx, 1);
      n.remove();
      setBadge();
      drain();
    }, { once: true });
  }

  function renderHistory() {
    if (!historyList) return;
    historyList.innerHTML = history.map(h => {
      const colorVar = ({ info: '--c-info', success: '--c-success', warning: '--c-warning', danger: '--c-danger' }[h.type]) || '--c-info';
      const time = new Date(h.time);
      return `<div class="item"><div class="bar" style="background:var(${colorVar})"></div><div class="meta"><div class="title">${esc(h.title)}</div><div class="msg">${esc(h.msg)}</div></div><div class="time" title="${time.toLocaleString()}">${time.toLocaleTimeString()}</div></div>`;
    }).join('') || `<div class="item"><div class="bar" style="background:var(--c-info)"></div><div class="meta"><div class="title">No notifications yet</div><div class="msg">New toasts will appear here.</div></div><div class="time"></div></div>`;
  }

  // Controls - bell button now opens history
  bellBtn && bellBtn.addEventListener('click', () => { 
    renderHistory(); 
    historyPanel?.classList.add('open'); 
  });
  
  closeHistory && closeHistory.addEventListener('click', () => historyPanel?.classList.remove('open'));
  clearHistory && clearHistory.addEventListener('click', () => { history = []; setBadge(); renderHistory(); });
  
  // Mute toggle in history modal
  muteToggle && muteToggle.addEventListener('change', () => {
    muted = muteToggle.checked;
    updateMuteState();
  });

  function icon(type) {
    const paths = {
      info: '<path d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2Zm1 14h-2v-6h2v6Zm0-8h-2V7h2v2Z"/>',
      success: '<path d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2Zm-1.2 13.8-3.7-3.7 1.4-1.4 2.3 2.3 5.5-5.5 1.4 1.4-6.9 6.9Z"/>',
      warning: '<path d="M1 21h22L12 2 1 21Zm12-3h-2v-2h2v2Zm0-4h-2v-4h2v4Z"/>',
      danger: '<path d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2Zm-1 13h2v2h-2v-2Zm0-8h2v6h-2V7Z"/>'
    };
    return `<svg viewBox='0 0 24 24' aria-hidden='true'>${paths[type] || paths.info}</svg>`;
  }
  
  function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c])); }

  // Public API
  const API = {
    push,
    info: (t, m) => push('info', t, m),
    success: (t, m) => push('success', t, m),
    warning: (t, m) => push('warning', t, m),
    danger: (t, m) => push('danger', t, m),
    mute: (v) => { muted = !!v; updateMuteState(); },
    history: () => [...history],
    renderHistory
  };
  window.Toast = API;

  // Initialize mute state
  updateMuteState();
})();
