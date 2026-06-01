function exportSessions(sessions) {
  const header = "session_id,timestamp,duration_s,paste_rate_per_min,tab_switch_rate_per_10s,edit_granularity_ratio";
  const rows = sessions.map((s) =>
    [
      s.session_id,
      new Date(s.started_at).toISOString(),
      s.stats.duration_s,
      s.stats.paste_rate_per_min,
      s.stats.tab_switch_rate_per_10s,
      s.stats.edit_granularity_ratio,
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
}
