const INDICATORS = [
  {
    key: "paste_rate_per_min",
    label: "Copy-paste rate",
    unit: "/ min",
    max: 8,
    thresholds: { yellow: 2, red: 4 },
  },
  {
    key: "tab_switch_rate_per_10s",
    label: "Tab switches",
    unit: "/ 10s",
    max: 5,
    thresholds: { yellow: 1, red: 2.5 },
  },
  {
    key: "edit_granularity_ratio",
    label: "Edit granularity",
    unit: "ratio",
    max: 1,
    thresholds: { yellow: 0.3, red: 0.6 },
  },
];

function colorFor(value, thresholds) {
  if (value >= thresholds.red) return "red";
  if (value >= thresholds.yellow) return "yellow";
  return "green";
}

function renderCards(stats) {
  return INDICATORS.map((ind) => {
    const value = stats[ind.key] ?? 0;
    const color = colorFor(value, ind.thresholds);
    const pct = Math.min(100, (value / ind.max) * 100).toFixed(0);
    const display = ind.key === "edit_granularity_ratio"
      ? value.toFixed(2)
      : value.toFixed(1);
    return `
      <div class="card">
        <div class="dot ${color}"></div>
        <div class="label">${ind.label}</div>
        <div class="bar-wrap">
          <div class="bar-fill ${color}" style="width:${pct}%"></div>
        </div>
        <div class="value">${display} ${ind.unit}</div>
      </div>`;
  }).join("");
}

async function init() {
  const contentEl = document.getElementById("content");

  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const tabId = activeTab?.id;

  const { sessions = [], tab_sessions = {} } = await chrome.storage.local.get(["sessions", "tab_sessions"]);
  const sessionId = tabId ? tab_sessions[tabId] : null;
  const current = sessions.find((s) => s.session_id === sessionId);

  if (!current) {
    contentEl.innerHTML = `
      <div class="empty">No active session.<br>Open ChatGPT or Claude.ai to start.</div>
      <div class="footer"><button id="export-btn">Export all sessions</button></div>`;
  } else {
    contentEl.innerHTML = `
      <div class="cards">${renderCards(current.stats)}</div>
      <div class="footer"><button id="export-btn">Export session</button></div>`;
  }

  document.getElementById("export-btn").addEventListener("click", () => {
    exportSessions(sessions);
  });
}

init();
