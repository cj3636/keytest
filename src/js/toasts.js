// Toast notification system (standalone, no dependencies)
// Mirrors the behavior from toasts.html and exposes window.Toast API.
(function () {
  const toastArea = document.getElementById('toastArea');
  const muteBtn = document.getElementById('muteBtn');
  const bellOn = document.getElementById('bellOn');
  const bellOff = document.getElementById('bellOff');
  const countEl = document.getElementById('toastCount');
  const edgeFlash = document.getElementById('edgeFlash');

  const historyPanel = document.getElementById('historyPanel');
  const historyBtn = document.getElementById('historyBtn');
  const clearHistory = document.getElementById('clearHistory');
  const historyList = document.getElementById('historyList');

  if (!toastArea) {
    console.warn('[Toast] Missing container');
    return;
  }

  let muted = false;
  let queue = [];
  let active = [];
  let history = [];
  let seq = 0;

  function setCount(n) {
    if (countEl) countEl.textContent = String(n);
  }

  function updateMuteUI() {
    if (muteBtn) muteBtn.setAttribute('aria-pressed', String(muted));
    if (bellOn) bellOn.style.display = muted ? 'none' : '';
    if (bellOff) bellOff.style.display = muted ? '' : 'none';
  }

  function flashEdge(type) {
    const colorMap = {
      info: '--c-info',
      success: '--c-success',
      warning: '--c-warning',
      danger: '--c-danger'
    };
    const cssVar = colorMap[type] || '--c-info';
    const c = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim() || '#0ea5e9';

    if (!edgeFlash) return;
    edgeFlash.style.background = c;
    edgeFlash.classList.remove('show');
    void edgeFlash.offsetWidth;
    edgeFlash.classList.add('show');
  }

  function msVar(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    if (!v) return fallback;
    if (v.endsWith('ms')) return parseFloat(v);
    if (v.endsWith('s')) return parseFloat(v) * 1000;
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : fallback;
  }

  function push(type, title, msg) {
    const id = 't' + Date.now() + '_' + (seq++);
    const item = { id, type, title, msg, time: new Date() };

    history.unshift(item);
    setCount(history.length);

    if (historyPanel && historyPanel.classList.contains('open')) {
      prependHistoryItem(item);
    }

    if (muted) {
      flashEdge(type);
      return id;
    }

    queue.push(item);
    drain();
    return id;
  }

  function drain() {
    const maxSimul = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--maxSimul'), 10) || 4;
    while (active.length < maxSimul && queue.length) {
      spawn(queue.shift());
    }
  }

  function spawn(item) {
    const n = document.createElement('div');
    n.className = 'toast ' + item.type;
    n.setAttribute('role', 'status');
    n.dataset.id = item.id;
    n.dataset.order = String(active.length);
    n.innerHTML =
      '<span class="ico" aria-hidden="true">' + iconFor(item.type) + '</span>' +
      '<span class="body">' +
      '<span class="t">' + escapeHTML(item.title) + '</span>' +
      '<span class="m">' + escapeHTML(item.msg) + '</span>' +
      '</span>';

    n.addEventListener('click', function () { removeToast(n); });

    toastArea.prepend(n);
    active.unshift(n);

    const life = msVar('--life', 5200);
    n._removeTimer = setTimeout(function () { removeToast(n); }, life);
  }

  function removeToast(n) {
    if (!n || !toastArea.contains(n)) return;
    clearTimeout(n._removeTimer);
    n.style.animation = 'toastOut 240ms ease forwards';
    n.addEventListener('animationend', function () {
      const idx = active.indexOf(n);
      if (idx !== -1) active.splice(idx, 1);
      n.remove();
      drain();
    }, { once: true });
  }

  function historyItemHTML(item, extraClass) {
    const colorVar = ({
      info: '--c-info',
      success: '--c-success',
      warning: '--c-warning',
      danger: '--c-danger'
    }[item.type]) || '--c-info';
    const extra = extraClass || '';
    const time = item.time instanceof Date ? item.time : new Date(item.time);

    return (
      '<div class="item ' + extra + '">' +
      '<div class="bar" style="background: var(' + colorVar + ')"></div>' +
      '<div class="meta">' +
      '<div class="title">' + escapeHTML(item.title) + '</div>' +
      '<div class="msg">' + escapeHTML(item.msg) + '</div>' +
      '</div>' +
      '<div class="time" title="' + time.toLocaleString() + '">' + time.toLocaleTimeString() + '</div>' +
      '</div>'
    );
  }

  function prependHistoryItem(item) {
    if (!historyList) return;

    if (history.length === 1) {
      historyList.innerHTML = '';
    }

    historyList.insertAdjacentHTML('afterbegin', historyItemHTML(item, 'entering'));
    const inserted = historyList.firstElementChild;
    if (inserted) {
      inserted.addEventListener('animationend', function () {
        inserted.classList.remove('entering');
      }, { once: true });
    }
    historyList.scrollTop = 0;
  }

  function renderHistory() {
    if (!historyList) return;

    if (!history.length) {
      historyList.innerHTML = '<div class="item"><div class="bar" style="background:var(--c-info)"></div><div class="meta"><div class="title">No notifications yet</div><div class="msg">New toasts will appear here.</div></div><div class="time"></div></div>';
      return;
    }

    historyList.innerHTML = history.map(function (item) {
      return historyItemHTML(item);
    }).join('');
  }

  function iconFor(type) {
    const paths = {
      info: '<path d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2Zm1 14h-2v-6h2v6Zm0-8h-2V7h2v2Z"/>',
      success: '<path d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2Zm-1.2 13.8-3.7-3.7 1.4-1.4 2.3 2.3 5.5-5.5 1.4 1.4-6.9 6.9Z"/>',
      warning: '<path d="M1 21h22L12 2 1 21Zm12-3h-2v-2h2v2Zm0-4h-2v-4h2v4Z"/>',
      danger: '<path d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2Zm-1 13h2v2h-2v-2Zm0-8h2v6h-2V7Z"/>'
    };
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (paths[type] || paths.info) + '</svg>';
  }

  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[c];
    });
  }

  if (muteBtn) {
    muteBtn.addEventListener('click', function () {
      muted = !muted;
      updateMuteUI();
    });
  }

  if (historyBtn) {
    historyBtn.addEventListener('click', function () {
      renderHistory();
      if (historyPanel) historyPanel.classList.add('open');
    });
  }

  if (clearHistory) {
    clearHistory.addEventListener('click', function () {
      history = [];
      setCount(0);
      renderHistory();
    });
  }

  document.addEventListener('pointerdown', function (e) {
    if (!historyPanel || !historyPanel.classList.contains('open')) return;
    if (historyPanel.contains(e.target) || (historyBtn && historyBtn.contains(e.target))) return;
    historyPanel.classList.remove('open');
  });

  const API = {
    push: push,
    info: function (t, m) { return push('info', t, m); },
    success: function (t, m) { return push('success', t, m); },
    warning: function (t, m) { return push('warning', t, m); },
    danger: function (t, m) { return push('danger', t, m); },
    mute: function (v) {
      muted = !!v;
      updateMuteUI();
    },
    history: function () { return history.slice(); },
    renderHistory: renderHistory
  };

  window.Toast = API;

  updateMuteUI();
  setCount(0);
})();
