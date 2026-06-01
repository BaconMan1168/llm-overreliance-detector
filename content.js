chrome.runtime.sendMessage({ type: "SESSION_START", timestamp: Date.now() }).catch(() => {});

document.addEventListener("paste", (e) => {
  const text = e.clipboardData?.getData("text") ?? "";
  chrome.runtime.sendMessage({
    type: "EVENT",
    event: "paste",
    timestamp: Date.now(),
    contentLength: text.length,
  }).catch(() => {});
});

document.addEventListener("keydown", (e) => {
  chrome.runtime.sendMessage({
    type: "EVENT",
    event: "keydown",
    timestamp: Date.now(),
    key: e.key,
  }).catch(() => {});
});

document.addEventListener("copy", () => {
  chrome.runtime.sendMessage({
    type: "EVENT",
    event: "copy",
    timestamp: Date.now(),
  }).catch(() => {});
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    chrome.runtime.sendMessage({
      type: "EVENT",
      event: "visibilitychange",
      timestamp: Date.now(),
    }).catch(() => {});
  }
});
