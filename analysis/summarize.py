import csv
import statistics
import sys
from pathlib import Path

INDICATORS = [
    ("paste_rate_per_min",      "Paste rate (/ min)",       2.0, 4.0),
    ("tab_switch_rate_per_10s", "Tab switches (/ 10s)",     1.0, 2.5),
    ("edit_granularity_ratio",  "Edit granularity (ratio)", 0.3, 0.6),
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


def summarize(sessions):
    print(f"  Sessions: {len(sessions)}")
    for key, label, yellow, red in INDICATORS:
        values = [float(s[key]) for s in sessions if s.get(key)]
        if not values:
            continue
        mean = statistics.mean(values)
        lo, hi = min(values), max(values)
        risk = classify(mean, yellow, red)
        print(f"  {label}: mean={mean:.2f}  range=[{lo:.2f}, {hi:.2f}]  [{risk}]")


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
