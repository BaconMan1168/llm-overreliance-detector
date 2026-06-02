# LLM Overreliance Detector

A Chrome extension implementing the behavioral detection layer for real-world measurement of LLM overreliance, based on Wu et al. (CHI 2026).

[![arXiv](https://img.shields.io/badge/arXiv-2602.11567-b31b1b.svg)](https://arxiv.org/abs/2602.11567)
[![CHI 2026](https://img.shields.io/badge/CHI-2026-blue.svg)](https://dl.acm.org/doi/10.1145/3772318.3790332)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Abstract

Wu et al. (CHI 2026) identified five behavioral indicators of LLM overreliance from a controlled laboratory study and explicitly called for "adaptive mitigation that leverages real-time, process-level signals" — but did not build the detection layer. This repository is that detection layer: a passive Chrome extension (Manifest V3, no build step) that instruments ChatGPT and Claude.ai sessions to capture three of the five identified behavioral signals in real time. All data remains local to the user's browser. The artifact is designed to support a replication-ready mini-experiment protocol in which session-level behavioral traces are correlated against a ground-truth task-performance score, bridging the gap between the paper's controlled lab findings and ecologically valid measurement in the wild.

---

## Research Context

Wu et al. conducted a study with 77 participants working across three task types (quiz solving, article summarization, trip planning) using an LLM seeded with plausible misinformation. Overreliance was operationalized as failure to detect and correct factual errors. Through semantic clustering of interaction logs, the authors identified five distinct behavioral patterns distinguishing low- from high-overreliance users. Low-overreliance users exhibited careful task comprehension before prompting, fine-grained text navigation, and selective copy-paste behavior. High-overreliance users exhibited frequent and unedited copy-paste, repeated LLM references in rapid succession, and coarse navigation with acceptance of misinformation despite observable hesitation.

The paper concluded with five proposed design interventions (context-aware auto-verification, adaptive task road-mapping, task chunking, granular review staging, and query visualization) but noted that all five depend on a real-time behavioral signal pipeline that does not yet exist outside of the lab. This extension implements that pipeline.

---

## Behavioral Indicators

The table below maps the five indicators from the paper to their implementation status in this artifact.

| # | Indicator | Signal | Paper Finding | Status | Threshold (Green / Yellow / Red) |
|---|-----------|--------|---------------|--------|----------------------------------|
| 1 | Copy-paste frequency | `paste` DOM events | High overreliance: 5–6 pastes/60 s, unedited; Low: 1–3, edited | **Built** | < 2 / min · 2–4 / min · > 4 / min |
| 2 | LLM reference frequency | `visibilitychange` events | High: 3–4 tab alternations/10 s; Low: single reference | **Built** | < 1 / 10 s · 1–2.5 / 10 s · > 2.5 / 10 s |
| 3 | Edit granularity | Paste-to-keypress ratio (rolling 5-min window) | High: coarse paste-and-navigate; Low: precise keypress editing | **Built** | < 0.3 · 0.3–0.6 · > 0.6 |
| 4 | Task comprehension at start | `first_interaction_delay_s` | Low overreliance: deliberate reading before first prompt | **Proxy** | Thresholds TBD from pilot data |
| 5 | Hesitation before prompting | `paste_after_idle_count` | High: idle on task page, then immediate LLM acceptance | **Proxy** | Thresholds TBD from pilot data |

> **Note on thresholds.** The paper provides qualitative cluster descriptions rather than exact cutoffs. The numeric thresholds above for Indicators 1–3 are approximated midpoints calibrated against those descriptions. They are intended as starting values to be refined through empirical pilot data.

---

## System Description

The extension is implemented in vanilla JavaScript with no build tooling. It is loaded directly into Chrome as an unpacked extension via `chrome://extensions`. No data leaves the browser; all session state is written to `chrome.storage.local`.

### Architecture

```
Target page (ChatGPT / Claude.ai)
        │
        │  DOM events (paste, keydown, keyup,
        │  visibilitychange, copy, scroll, idle)
        ▼
  content.js  ──── chrome.runtime.sendMessage ────▶  background.js
                                                           │
                                                    Aggregation &
                                                    windowing logic
                                                           │
                                                    chrome.storage.local
                                                           │
                          ┌────────────────────────────────┤
                          │                                │
                     popup.js                      data-export.js
                   (live display)               (CSV download trigger)
```

### File Reference

| File | Role |
|------|------|
| `manifest.json` | MV3 manifest; declares content scripts, service worker, and permissions |
| `content.js` | Injected into target pages; attaches DOM event listeners and forwards raw events |
| `background.js` | Service worker; applies time-window bucketing; writes aggregated stats to storage |
| `popup.html` | Extension popup shell |
| `popup.js` | Reads storage on popup open; renders indicator cards with threshold color coding |
| `data-export.js` | Serializes session log to CSV; triggers browser download |
| `analysis/summarize.py` | Offline analysis script; reads exported CSVs; outputs aggregate statistics (Python 3 stdlib only) |

---

## Installation

**Requirements:** Google Chrome 88 or later. No Node.js, npm, or build tooling required.

1. Clone or download this repository.
   ```bash
   git clone https://github.com/<your-username>/llm-overreliance-detector.git
   ```
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode** (toggle, top-right).
4. Click **Load unpacked** and select the repository root directory.
5. The extension icon will appear in the Chrome toolbar.

**Supported domains:** `chat.openai.com`, `claude.ai`

To reload after editing source files, click the reload icon on the extension card in `chrome://extensions`.

---

## Study Protocol

### Overview

This extension is designed to support a within-subjects mini-experiment in which behavioral traces collected during real LLM-assisted task completion are correlated against a ground-truth task-performance score. This mirrors the methodology of Wu et al. while operating in naturalistic conditions — the ecological validity gap the paper identified as a direction for future work.

### Task Design

Participants are assigned tasks with objectively scorable correct answers: factual research questions with a single verifiable answer, debugging exercises with a known fix, or short-answer questions drawn from standardized question sets. The use of tasks with ground-truth outcomes eliminates the need to inject misinformation (as in the original study) while still enabling a post-hoc overreliance label.

### Procedure

1. The participant installs the extension via the steps above.
2. The experimenter assigns a task with a known correct answer. The participant is not informed of the scoring criterion.
3. The participant completes the task using ChatGPT or Claude.ai with the extension running.
4. On task completion, the participant clicks **End Task** in the popup and optionally enters a free-text task label and a self-report score (1–5 scale: *"used AI answer directly"* → *"rewrote entirely"*).
5. The participant clicks **Export session** to download the session CSV.
6. The experimenter scores the final output against the ground truth.

### Pilot Parameters

| Parameter | Value |
|-----------|-------|
| Participants | 3–5 (informal, sideloaded) |
| Sessions per participant | 3–5 |
| Target total sessions | 15–25 |
| Task duration | 10–20 minutes per session |
| IRB status | Not required — personal tool, no formal recruitment, no deception |

---

## Data Collection and Export

### Aggregated Session CSV

Clicking **Export session** in the popup downloads a CSV with one row per completed task session.

| Column | Description |
|--------|-------------|
| `session_id` | UUID generated at session start |
| `task_label` | Free-text label entered by participant |
| `timestamp` | ISO 8601 session start time |
| `duration_s` | Session duration in seconds |
| `paste_rate_per_min` | Average paste events per minute |
| `tab_switch_rate_per_10s` | Average tab-switch events per 10 seconds |
| `edit_granularity_ratio` | Paste events / (keydown + delete events), rolling 5-min window |
| `paste_after_idle_count` | Paste events preceded by ≥ 3 s of inactivity |
| `first_interaction_delay_s` | Seconds from session start to first keydown on the LLM page |
| `avg_keypresses_between_pastes` | Mean keypress count between consecutive paste events |
| `self_report_score` | Participant-reported reliance score (1–5) |

### Raw Event CSV

A second CSV containing the complete timestamped event stream is available via **Export raw events**. Each row represents one discrete DOM event with its associated attributes (event type, content length, scroll direction, etc.).

### Offline Analysis

```bash
python3 analysis/summarize.py path/to/sessions.csv
```

Outputs per-indicator means, standard deviations, and threshold distribution counts across all sessions in the file.

---

## Limitations

**Proxy indicators.** Indicators 4 (task comprehension at start) and 5 (hesitation before prompting) are approximated via derived statistics (`first_interaction_delay_s` and `paste_after_idle_count`). These proxies do not directly replicate the paper's operationalization, which relied on screen-recorded interaction logs with full cursor and gaze context unavailable to a browser extension.

**Threshold approximation.** The numeric thresholds for Indicators 1–3 are estimated from the paper's qualitative cluster descriptions. The paper does not report exact cutoff values. The current thresholds should be treated as prior estimates subject to revision once pilot data is available.

**Domain and context constraints.** The extension instruments ChatGPT and Claude.ai only. Behavioral norms vary across task types, session lengths, and user populations; the current thresholds were not calibrated against a representative sample.

---

## Future Directions

The following directions address the gap between the current prototype and the full measurement framework called for in Wu et al.

- **Direct idle and scroll instrumentation.** Adding idle detection (≥ 3 s of inactivity) and scroll event tracking would enable direct measurement of Indicator 5 (hesitation before prompting) and contribute a navigation-granularity signal closer to the paper's coarse-vs.-fine operationalization of Indicator 3.

- **Controlled task battery.** A standardized set of tasks with pre-scored ground-truth answers would reduce experimenter overhead and enable cross-participant comparison on a common scale.

- **Larger participant pool and formal recruitment.** The current pilot (N ≈ 3–5) is sufficient for signal validation but not for statistical inference. Scaling to N ≥ 30 with controlled task assignment would support the clustering analysis conducted by Wu et al.

- **Threshold calibration via labeled data.** Once a pilot dataset with ground-truth overreliance labels exists, logistic regression or decision-tree fitting on the behavioral features would yield empirically grounded thresholds to replace the current approximations.

- **Cross-platform extension.** Expanding to additional LLM interfaces (Gemini, Copilot, Perplexity) would test the generalizability of the behavioral indicators beyond the two domains studied here.

---

## Citation

If this artifact informs your work, please also cite the originating paper:

```bibtex
@inproceedings{wu2026behavioral,
  title     = {Behavioral Indicators of Overreliance During Interaction with Conversational Language Models},
  author    = {Wu, Sherry Tongshuang and others},
  booktitle = {Proceedings of the 2026 CHI Conference on Human Factors in Computing Systems},
  year      = {2026},
  doi       = {10.1145/3772318.3790332},
  url       = {https://arxiv.org/abs/2602.11567}
}
```

To cite this repository:

```bibtex
@software{guirao2026overreliance,
  title  = {{LLM Overreliance Detector}: A Chrome Extension for Real-World Behavioral Signal Collection},
  author = {Guirao, Daniel},
  year   = {2026},
  url    = {https://github.com/<your-username>/llm-overreliance-detector}
}
```

---

## License

MIT
