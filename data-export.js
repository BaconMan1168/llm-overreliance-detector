function exportSessions(sessions) {
  const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const header = "session_id,timestamp,duration_s,paste_rate_per_min,tab_switch_rate_per_10s,edit_granularity_ratio,task_label,self_report_score,avg_paste_length,paste_after_idle_count,first_interaction_delay_s,avg_keypresses_between_pastes";
  const rows = sessions.map((s) =>
    [
      s.session_id,
      new Date(s.started_at).toISOString(),
      s.stats.duration_s,
      s.stats.paste_rate_per_min,
      s.stats.tab_switch_rate_per_10s,
      s.stats.edit_granularity_ratio,
      q(s.task_label),
      s.self_report_score ?? "",
      s.stats.avg_paste_length,
      s.stats.paste_after_idle_count,
      s.stats.first_interaction_delay_s,
      s.stats.avg_keypresses_between_pastes,
    ].join(",")
  );

  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "overreliance_sessions.csv";
  a.click();
  URL.revokeObjectURL(url);

  setTimeout(() => {
    const rawHeader = "session_id,timestamp,event_type,content_length,key,scroll_delta,direction";
    const rawRows = [];
    for (const s of sessions) {
      for (const e of s.raw_events ?? []) {
        rawRows.push([
          s.session_id,
          e.timestamp,
          q(e.event ?? ""),
          e.contentLength ?? "",
          q(e.key ?? ""),
          e.scrollDelta ?? "",
          q(e.direction ?? ""),
        ].join(","));
      }
    }
    const rawCsv = [rawHeader, ...rawRows].join("\n");
    const rawBlob = new Blob([rawCsv], { type: "text/csv" });
    const rawUrl = URL.createObjectURL(rawBlob);

    const b = document.createElement("a");
    b.href = rawUrl;
    b.download = "overreliance_events.csv";
    b.click();
    URL.revokeObjectURL(rawUrl);
  }, 300);
}
