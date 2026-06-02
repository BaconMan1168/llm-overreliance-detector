chrome.runtime.sendMessage({ type: "SESSION_START", timestamp: Date.now() }).catch(() => {});

let idleTimer = null;
let lastActivityAt = Date.now();

function resetIdleTimer() {
  lastActivityAt = Date.now();
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    const idleDuration_ms = Date.now() - lastActivityAt;
    chrome.runtime.sendMessage({
      type: "EVENT",
      event: "idle",
      timestamp: Date.now(),
      idleDuration_ms,
    }).catch(() => {});
  }, 3000);
}

let scrollDebounceTimer = null;
let scrollAccumulator = 0;

document.addEventListener("paste", (e) => {
  const text = e.clipboardData?.getData("text") ?? "";
  chrome.runtime.sendMessage({
    type: "EVENT",
    event: "paste",
    timestamp: Date.now(),
    contentLength: text.length,
  }).catch(() => {});
  resetIdleTimer();
});

document.addEventListener("keydown", (e) => {
  chrome.runtime.sendMessage({
    type: "EVENT",
    event: "keydown",
    timestamp: Date.now(),
    key: e.key,
  }).catch(() => {});
  resetIdleTimer();
});

document.addEventListener("copy", () => {
  const text = window.getSelection()?.toString() ?? "";
  chrome.runtime.sendMessage({
    type: "EVENT",
    event: "copy",
    timestamp: Date.now(),
    contentLength: text.length,
  }).catch(() => {});
  resetIdleTimer();
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    chrome.runtime.sendMessage({
      type: "EVENT",
      event: "visibilitychange",
      timestamp: Date.now(),
    }).catch(() => {});
  }
  resetIdleTimer();
});

document.addEventListener("wheel", (e) => {
  scrollAccumulator += e.deltaY;
  clearTimeout(scrollDebounceTimer);
  scrollDebounceTimer = setTimeout(() => {
    const delta = scrollAccumulator;
    scrollAccumulator = 0;
    chrome.runtime.sendMessage({
      type: "EVENT",
      event: "scroll",
      timestamp: Date.now(),
      scrollDelta: Math.abs(delta),
      direction: delta > 0 ? "down" : "up",
    }).catch(() => {});
    resetIdleTimer();
  }, 50);
});
