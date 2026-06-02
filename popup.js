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
      <div style="padding: 6px 14px 4px;">
        <input type="text" id="task-label" placeholder="Label this task (optional)" value="${current.task_label ?? ""}">
      </div>
      <div id="self-report-section" style="display:none; padding: 6px 14px 4px;">
        <div style="color:#aaa; font-size:12px; margin-bottom:6px;" id="self-report-prompt">How much did you rely on the AI? (1 = rewrote entirely, 5 = used as-is)</div>
        <div style="display:flex; gap:6px;">
          ${[1,2,3,4,5].map((n) => `<button class="score-btn" data-score="${n}">${n}</button>`).join("")}
        </div>
      </div>
      <div style="padding: 4px 14px 6px;">
        <button id="end-task-btn">End task</button>
      </div>
      <div class="footer"><button id="export-btn">Export session</button></div>`;

    const taskLabelInput = document.getElementById("task-label");
    taskLabelInput.addEventListener("change", () => {
      chrome.runtime.sendMessage({ type: "UPDATE_SESSION", task_label: taskLabelInput.value }).catch(() => {});
    });

    document.getElementById("end-task-btn").addEventListener("click", () => {
      document.getElementById("self-report-section").style.display = "block";
    });

    document.querySelectorAll(".score-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        chrome.runtime.sendMessage({ type: "UPDATE_SESSION", self_report_score: parseInt(btn.dataset.score) }).catch(() => {});
        document.getElementById("self-report-prompt").textContent = "Saved.";
        document.querySelectorAll(".score-btn").forEach((b) => { b.disabled = true; });
      });
    });
  }

  document.getElementById("export-btn").addEventListener("click", () => {
    exportSessions(sessions);
  });
}

init();
