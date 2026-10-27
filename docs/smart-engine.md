# Smart engine

The Cove Smart Engine (CSE v4) is an on-device adaptive layer. It learns from local interactions, maps circadian rhythms, and predicts short workflow chains. It has no cloud model, no account, and no pre-seeded behaviour.

The engine is optional. It can be set to full autonomous, assisted, or manual, and every automation can be disabled individually.

## What it observes

The engine records typed signals:

- quick-link opens,
- tab switches,
- search engine choices,
- widget interactions,
- focus starts, completions, and aborts,
- neural audio mode and soundscape choices,
- scene changes,
- command-palette actions.

It does not read page content, keystrokes, clipboard, or form fields. The signal log stores a label and a target needed to replay a suggestion, not a transcript of your browsing.

## Circadian model

The day is divided into five slots:

| Slot | Hours | Label |
| :--- | :--- | :--- |
| Dawn | 05:00-08:59 | Early Dawn |
| Deep morning | 09:00-12:59 | Morning Flow |
| Afternoon | 13:00-16:59 | Afternoon Sprint |
| Evening | 17:00-21:59 | Evening Unwind |
| Late night | 22:00-04:59 | Quiet Night |

Each slot is split by weekday and weekend, giving ten context keys. The engine blends the current hour with adjacent hours so a single unusual day does not reset the model. Counters are kept for activity, focus, work signals, and personal signals.

## Markov memory

The engine maintains two transition tables:

- **First-order**: `A -> B`, learned when two signals occur within 15 minutes.
- **Second-order**: `A >> B -> C`, learned when three signals occur within the same window.

Transitions need evidence before they surface:

- second-order chain: weight at least 1.3 and probability at least 40%,
- first-order chain: weight at least 1.5 and probability at least 34%.

A prediction is only active for 15 minutes after the last signal. After that, the chain is stale and is not shown.

## Decay

Scores decay with an approximately 14-day half-life. The decay applies to link, domain, engine, widget, sound, neural, scene, command, and transition tables. The goal is to let preferences change rather than locking a user into their first week.

## Evolution stages

| Stage | Signals | Unlocks |
| :--- | :--- | :--- |
| Seed | 0-7 | Signal and rhythm mapping |
| Sprout | 8-21 | Circadian shortcut and search adaptation |
| Calibrated | 22-49 | First-order Markov chain prediction |
| Attuned | 50-99 | Bento shaping and 7x24 heatmap |
| Symbiotic | 100+ | Scene and sound harmony |

Confidence starts at 0% with zero signals and rises with real evidence, accepted feedback, and chain count. It is capped at 99%; the UI should never imply certainty.

## Autonomy modes

| Mode | Behaviour |
| :--- | :--- |
| Full Autonomous | Applies supported adaptations automatically and shows a quiet log |
| Assisted | Suggests actions and waits for acceptance |
| Manual | Learns only; no automatic changes |

Individual switches include:

- Whisper Mode (invisible UI),
- adaptive sound intelligence,
- autonomous work/personal context,
- adaptive focus duration,
- smart link sorting,
- pulse suggestions,
- Markov predictions,
- Bento shaping,
- scene evolution,
- command sorting.

## Suggestions

The pulse bar can surface a small number of high-confidence actions, such as:

- continue a learned workflow chain,
- clean duplicate tabs,
- rest a stale tab set,
- start a focus sprint,
- open a saved article,
- apply a circadian scene.

Each suggestion has a reason and a confidence. Dismissals reduce the category affinity and apply a backoff, so the same card should not nag. The autopilot log records what changed and when.

## Work and personal context

If the user has enough real link-group signals, the engine can infer whether the current hour is work or personal. It blends the current hour with neighbouring hours and requires a clear ratio before overriding the configured schedule. With too little evidence, it falls back to the schedule.

## Focus calibration

Focus starts and aborts adjust `preferredFocusMinutes` gradually:

- a completed sprint nudges the preferred duration toward the completed length,
- an abort after at least five minutes nudges it shorter,
- the value is clamped to 15-60 minutes.

The change is visible in the focus settings. It is a suggestion model, not a hidden timer.

## Privacy

- Memory lives in `chrome.storage.local` under `smartMemory`.
- It is included in the JSON backup so the user can inspect it.
- It is never sent to a Cove service.
- It can be reset by clearing local data or resetting the engine.
- Disabling the engine stops new signals from changing the profile.

See [Privacy](privacy.md) and [Data model](data-model.md).

## Inspecting the engine

Press `Cmd/Ctrl+J` or open the command palette and choose **Open Cove Smart Engine Studio**. The studio shows:

- total signals and evolution stage,
- circadian slot and confidence,
- top workflow chains,
- learned link, domain, sound, and scene affinities,
- recent signal log,
- autopilot actions.

If the log is empty, the engine has no evidence yet. That is the correct state for a new install.

## Design constraints

- No seeded or simulated signals.
- No claim that a prediction is certain.
- No dark-pattern nudge that cannot be dismissed.
- No cross-device or cross-user learning.
- No page-content inspection.
- No hidden automation; every automatic action is logged.

## Known limitations

- The model is small and explainable, not a deep-learning system.
- Sparse usage produces weak suggestions; the engine should stay quiet rather than invent confidence.
- Time-of-day learning assumes the device clock is correct.
- There is no export of a human-readable "why" beyond the chain labels and log.
- The 15-minute Markov window is a fixed heuristic.

## Related reading

- [Features](features.md)
- [Privacy](privacy.md)
- [Data model](data-model.md)
- [FAQ](faq.md)
