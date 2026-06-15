# [KeyTest](https://keytest.org) - NKRO and Combo Diagnostics

A desktop-focused, single-page keyboard diagnostic tool for validating key events, rollover behavior, modifier reliability, hotkeys, and switch anomalies.

This project helps identify real keyboard issues such as:

- stuck modifiers (Ctrl, Shift, Alt, Meta)
- key chatter and bounce
- missing keyup events
- combo detection failures (for example Ctrl+Z or Ctrl+Shift+Z)
- rollover (simultaneous key press limits)

## Highlights

- Live key state monitoring
  - active key count
  - max simultaneous key presses
  - running event counter
- Per-key diagnostics
  - keydown/keyup/repeat counts
  - dwell timing (last and average)
  - down/up mismatch tracking
  - anomaly feed per key
- Combo and hotkey validation
  - common shortcuts such as Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z
  - hit counters and recent status
- Integrated toast notification system
  - info/success/warning/error toasts
  - mute toggle
  - history panel with clear action
  - edge flash indicator while muted
- Session export
  - JSON report generation for diagnostics and sharing

## Why This Exists

OS-level keyboard test tools are often heavy, platform-specific, or do not expose event-level browser behavior. This site provides a focused in-browser diagnostic layer that is useful for:

- validating keyboard behavior after hardware changes
- investigating shortcut issues in web apps
- checking custom keyboard firmware mappings
- reproducing intermittent key chatter complaints

## Tech Stack

- HTML5
- Vanilla JavaScript (no framework)
- Modern CSS (custom properties, glass UI styling)

No build step is required.

## Getting Started

### Option 1: Open directly

Open index.html in a desktop browser.

### Option 2: Serve locally (recommended)

Use any static server. Example with Python:

```bash
python -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

## Usage Workflow

1. Focus the page by clicking anywhere in the body.
2. Keep Capture enabled to prevent browser defaults where possible.
3. Press normal keys, modifiers, and multi-key combinations.
4. Review:
   - Live Status for active modifiers and pressed keys
   - Combo / Hotkey Tests for expected shortcuts
   - Per-Key Diagnostics for mismatches, repeats, dwell, and anomaly flags
5. Export JSON when you need a report for debugging or support.

## Understanding Results

- Down/Up mismatch > 0
  - keydown events occurred without matching keyup events
  - can indicate lost events, focus interruption, or hardware behavior
- Very fast re-press anomaly
  - can indicate switch bounce/chatter
- Keyup without prior keydown
  - indicates ordering loss or event drop
- Combo misses while modifier appears pressed
  - useful when diagnosing shortcut failures in specific environments

## Browser and Platform Notes

- Some OS-reserved shortcuts cannot be captured by browsers (for example Alt+Tab, many Windows key combinations).
- Best experience is desktop browsers with the tab in focus.
- Avoid running tests while typing inside form fields or external overlays.

## Data and Privacy

- All diagnostics run in the browser.
- No backend is required.
- Exported JSON is generated client-side.

## Project Structure

```text
index.html
src/
  css/
    style.css
  js/
    icons.js
    toasts.js
    keytest.js
```

## Contributing

Contributions are welcome. Helpful areas include:

- additional combo presets (per OS/editor)
- accessibility improvements
- improved anomaly heuristics and threshold tuning
- automated browser-based regression checks

## Development Notes

- Keep the app dependency-free unless there is a strong reason.
- Preserve low-latency event handling in keytest.js.
- Keep toast UI behavior consistent between standalone demos and app CSS/JS.

## Roadmap Ideas

- import previously exported JSON sessions for side-by-side comparison
- expanded keyboard layout visualization
- optional test scenarios and guided diagnostics
- i18n for labels and report metadata
