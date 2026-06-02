function isEditKey(key) {
  return key.length === 1 || key === "Backspace" || key === "Delete";
}

function computeStats(events, startedAt) {
  const now = Date.now();
  const durationS = Math.round((now - startedAt) / 1000);

  const window60s = now - 60_000;
  const pasteRatePerMin = events.filter(
    (e) => e.event === "paste" && e.timestamp >= window60s
  ).length;

  const window10s = now - 10_000;
  const tabSwitchRatePer10s = events.filter(
    (e) => e.event === "visibilitychange" && e.timestamp >= window10s
  ).length;

  const window5m = now - 300_000;
  const pastes5m = events.filter((e) => e.event === "paste" && e.timestamp >= window5m);
  const editKeys5m = events.filter(
    (e) => e.event === "keydown" && isEditKey(e.key) && e.timestamp >= window5m
  ).length;
  const editGranularityRatio =
    editKeys5m > 0 ? +(pastes5m.length / editKeys5m).toFixed(3) : 0;

  const pastes60s = events.filter((e) => e.event === "paste" && e.timestamp >= window60s);
  const avgPasteLength =
    pastes60s.length > 0
      ? +(pastes60s.reduce((sum, e) => sum + (e.contentLength ?? 0), 0) / pastes60s.length).toFixed(1)
      : 0;

  return { paste_rate_per_min: pasteRatePerMin, tab_switch_rate_per_10s: tabSwitchRatePer10s, edit_granularity_ratio: editGranularityRatio, avg_paste_length: avgPasteLength, duration_s: durationS };
}

async function startNewSession(tabId) {
  const sessionId = crypto.randomUUID();
  const session = {
    session_id: sessionId,
    tab_id: tabId,
    started_at: Date.now(),
    last_updated: Date.now(),
    raw_events: [],
    stats: { paste_rate_per_min: 0, tab_switch_rate_per_10s: 0, edit_granularity_ratio: 0, avg_paste_length: 0, duration_s: 0 },
    task_label: "",
    self_report_score: null,
  };

  const { sessions = [], tab_sessions = {} } = await chrome.storage.local.get(["sessions", "tab_sessions"]);
  sessions.push(session);
  tab_sessions[tabId] = sessionId;

  await chrome.storage.local.set({ sessions, tab_sessions, current_session_id: sessionId });
}

async function appendEvent(tabId, eventData) {
  const { sessions = [], tab_sessions = {} } = await chrome.storage.local.get(["sessions", "tab_sessions"]);
  const sessionId = tab_sessions[tabId];
  if (!sessionId) return;

  const idx = sessions.findIndex((s) => s.session_id === sessionId);
  if (idx === -1) return;

  sessions[idx].raw_events.push(eventData);
  sessions[idx].last_updated = Date.now();
  sessions[idx].stats = computeStats(sessions[idx].raw_events, sessions[idx].started_at);

  await chrome.storage.local.set({ sessions, current_session_id: sessionId });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "UPDATE_SESSION") {
    (async () => {
      const { sessions = [] } = await chrome.storage.local.get(["sessions"]);
      const idx = sessions.findIndex((s) => s.session_id === message.session_id);
      if (idx === -1) return sendResponse({ ok: false });
      if (message.task_label !== undefined) sessions[idx].task_label = message.task_label;
      if (message.self_report_score !== undefined) sessions[idx].self_report_score = message.self_report_score;
      await chrome.storage.local.set({ sessions });
      sendResponse({ ok: true });
    })();
    return true;
  }

  const tabId = sender.tab?.id;
  if (!tabId) return;

  if (message.type === "SESSION_START") {
    startNewSession(tabId).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message.type === "EVENT") {
    appendEvent(tabId, message).then(() => sendResponse({ ok: true }));
    return true;
  }
});
