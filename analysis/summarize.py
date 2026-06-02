import csv
import statistics
import sys
from pathlib import Path

INDICATORS = [
    ("paste_rate_per_min",              "Paste rate (/ min)",              2.0, 4.0),
    ("tab_switch_rate_per_10s",         "Tab switches (/ 10s)",            1.0, 2.5),
    ("edit_granularity_ratio",          "Edit granularity (ratio)",        0.3, 0.6),
    ("avg_paste_length",                "Avg paste length (chars)",        None, None),
    ("paste_after_idle_count",          "Paste after idle (count)",        None, None),
    ("first_interaction_delay_s",       "First interaction delay (s)",     None, None),
    ("avg_keypresses_between_pastes",   "Avg keypresses between pastes",   None, None),
]


def load_sessions(path):
    with open(path, newline="") as f:
        return list(csv.DictReader(f))


def classify(value, yellow, red):
    if value >= red:
        return "RED"
    if value >= yellow:
        return "YELLOW"
    return "GREEN"


def safe_float(v):
    try:
        return float(v)
    except (ValueError, TypeError):
        return None


def summarize(sessions):
    print(f"  Sessions: {len(sessions)}")
    for key, label, yellow, red in INDICATORS:
        values = [safe_float(s[key]) for s in sessions if s.get(key, "") not in ("", None)]
        values = [v for v in values if v is not None]
        if not values:
            continue
        mean = statistics.mean(values)
        lo, hi = min(values), max(values)
        if yellow is not None and red is not None:
            risk = classify(mean, yellow, red)
            print(f"  {label}: mean={mean:.2f}  range=[{lo:.2f}, {hi:.2f}]  [{risk}]")
        else:
            print(f"  {label}: mean={mean:.2f}  range=[{lo:.2f}, {hi:.2f}]")

    high_reliance = [s for s in sessions if s.get("self_report_score", "") not in ("", None)]
    if high_reliance:
        flagged = [s for s in high_reliance if float(s["self_report_score"]) >= 4]
        if flagged:
            print(f"\n  High self-reported reliance (score >= 4): {len(flagged)} session(s)")
            for s in flagged:
                sid = s.get("session_id", "?")
                score = s["self_report_score"]
                pr = s.get("paste_rate_per_min", "?")
                eg = s.get("edit_granularity_ratio", "?")
                task = s.get("task_label", "")
                label_str = f"  task={task!r}" if task else ""
                print(f"    {sid}: score={score}  paste_rate={pr}  edit_granularity={eg}{label_str}")


def main():
    paths = sys.argv[1:] or list(Path(".").glob("*.csv"))
    if not paths:
        print("Usage: python summarize.py <file.csv> [...]")
        sys.exit(1)

    all_sessions = []
    for path in paths:
        sessions = load_sessions(path)
        print(f"\n--- {path} ---")
        summarize(sessions)
        all_sessions.extend(sessions)

    if len(paths) > 1:
        print(f"\n=== Aggregate ({len(all_sessions)} sessions total) ===")
        summarize(all_sessions)


if __name__ == "__main__":
    main()
