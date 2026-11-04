---
title: Many Ways
---

<script setup>
import { onMounted, onBeforeUnmount } from 'vue';
import 'data-navigator/text-chat.css';
import '../assets/many-ways/src/style.css';

let destroy;
onMounted(async () => {
    const { mountManyWays } = await import('../assets/many-ways/src/main.js');
    destroy = mountManyWays(document.getElementById('mw-demo'));
});
onBeforeUnmount(() => destroy?.());
</script>

# Many Ways

One chart and one Data Navigator structure, with at least six different ways to navigate. Try out our demo and all of the ways that Data Navigator enables input!

<div class="many-ways" id="mw-demo">
    <fieldset class="mw-ways">
        <legend>Ways to navigate</legend>
        <p class="mw-hint">Keyboard and text are always on. Turn on any others.</p>
        <label><input type="checkbox" id="mw-voice" aria-describedby="mw-voice-note" /> Voice</label>
        <label><input type="checkbox" id="mw-hand" /> Hand gestures</label>
        <label><input type="checkbox" id="mw-head" /> Head movement</label>
        <label><input type="checkbox" id="mw-swipe" aria-describedby="mw-swipe-note" /> Touch swiping</label>
        <p class="mw-hint" id="mw-voice-note" hidden>This browser does not support speech recognition.</p>
        <p class="mw-hint" id="mw-swipe-note">Swiping takes over touch on the chart. Leave it off if you use a screen reader.</p>
    </fieldset>
    <div class="mw-camera" id="mw-camera" hidden>
        <video id="mw-video" muted playsinline aria-label="Camera preview"></video>
        <p class="mw-hint">Video is processed on your device and is not sent anywhere.</p>
    </div>
    <p class="mw-status" id="mw-status" role="status"></p>
    <div class="mw-chart" id="mw-chart"></div>
    <div>
        <p class="mw-label" id="mw-chat-label">Text chat</p>
        <button type="button" class="mw-speak" id="mw-speak" hidden>Speak a command</button>
        <div id="mw-chat" role="group" aria-labelledby="mw-chat-label"></div>
    </div>
    <details class="mw-structure">
        <summary>View navigation structure</summary>
        <div class="mw-inspector" id="mw-inspector"></div>
    </details>
    <div class="mw-commands" id="mw-commands"></div>
</div>

## Try a path

1. Enter the chart. You land on the chart summary.
2. Drill in three times: Year, then 2015, then `62%, Chrome, 2015`.
3. Go right to 2016, then up to Firefox.
4. Drill out to the browser to hear about Firefox across all years.

Mix inputs as you go. Type `drill in`, point right with your hand, then say "up to the browser". Every input moves the same position, shown by one outline on the chart and in the inspector.

## "Many ways"

Offering many ways to do the same thing, and reach the same goals, is one of the best measures of a robust, accessible system. People use different inputs because of disability, device, setting, or preference, and those can change from one moment to the next. When every input reaches the same places, many more folks can reach the goals that they have in their own way.

This idea builds on [Chartability](https://www.frank.computer/chartability/), especially its robust and flexible principles, and on [Skeleton](https://arxiv.org/abs/2607.14579), which calls for accommodating inputs beyond the keyboard, including touch and text.

We put this idea into the simple 2 words, "many ways," while working with the React Spectrum Charts team at Adobe. Thank you to that team for helping to shape our micro-philosophy for accessible interaction design.

## How it works

Everything runs on one `structure`, one `input`, one `rendering`, and one `textChat`. The chart is a [dual tree](/patterns/dual-tree): every data point belongs to a year and a browser, so you can move across years or across browsers from any point.

| Input    | How it reaches a navigation rule                                                   |
| -------- | ---------------------------------------------------------------------------------- |
| Keyboard | `input.keydownValidator(event)` returns the rule for the key                       |
| Text     | `textChat` matches what you type to a rule name or label                           |
| Voice    | The browser's speech recognition passes what you said to `chat.submit(text)`       |
| Hand     | A MediaPipe gesture recognizer maps each gesture to a rule name                    |
| Head     | A MediaPipe face landmarker maps head turns, nods, tilts, and expressions to rules |
| Touch    | Pointer events map swipes, taps, and presses to rules                              |

Every input ends in the same call, `input.move(current, rule)`, so the navigation rules are defined once.

### Many names for one rule

Speech and text need more than one name for each move. People say "drill in", "go in", "child", or "open". Each of these is its own navigation rule, added to the same edges as `drill-in` and pointing in the same direction. Nothing else changes. The commands below the chart list every name.

<<< @/../assets/many-ways/src/commands.js#aliases{js}

### One position

Keyboard moves focus to the chart element, so a screen reader reads it. Other inputs move the same position through the text chat with `chat.submit()`, which logs the result and announces it. When the keyboard moves, `chat.setCurrentNode()` keeps the chat in sync. See [Sharing a position with other inputs](/examples/data-text-adventure#sharing-a-position-with-other-inputs).

Camera, microphone, and swiping status (such as "No hand in view") goes to a separate status message, so it never repeats what the chat or focus already said.

## Notes on each input

- **Voice** is push to talk. Always-on listening can hear a screen reader read a result aloud and act on it again. Speech recognition works in Chrome, Edge, and Safari. Some browsers send audio to a server to recognize it.
- **Hand gestures** and **head movement** use [MediaPipe Tasks Vision](https://ai.google.dev/edge/mediapipe/solutions/guide), which runs in the browser, including on phones. Models download when you turn them on. Hold a gesture briefly to use it, then relax before the next one. Head movement measures your resting position first, so hold still for a moment after turning it on.
- **Touch swiping** is off by default. Screen readers on phones use swipes for their own navigation, so swiping here would get in the way. Swiping also works with a mouse drag.

## Focus indicators

Each node's outline matches what it represents: a box around a bar, a box around a year's column, an outline around each segment for a browser, and a box around the browser names for the browser grouping. See [Focus Indication](/examples/focus-indication) for how to build these, and [Trouble with Focus Indication](/getting-started/first-chart#trouble-with-focus-indication) for charts drawn on a canvas.

## The code

This demo is a ready-to-run project in [assets/many-ways](https://github.com/cmudig/data-navigator/tree/main/assets/many-ways). Run `npm install` in that folder and serve it from the repository root.

::: code-group

<<< @/../assets/many-ways/src/main.js{js} [main.js]

<<< @/../assets/many-ways/src/navigator.js{js} [navigator.js]

<<< @/../assets/many-ways/src/commands.js{js} [commands.js]

<<< @/../assets/many-ways/src/structure.js{js} [structure.js]

<<< @/../assets/many-ways/src/chart.js{js} [chart.js]

<<< @/../assets/many-ways/src/speech.js{js} [speech.js]

<<< @/../assets/many-ways/src/hand.js{js} [hand.js]

<<< @/../assets/many-ways/src/head.js{js} [head.js]

<<< @/../assets/many-ways/src/swipe.js{js} [swipe.js]

<<< @/../assets/many-ways/src/vision.js{js} [vision.js]

<<< @/../assets/many-ways/index.html{html} [index.html]

<<< @/../assets/many-ways/src/style.css{css} [style.css]

:::

## Related

- [Dual Tree pattern](/patterns/dual-tree)
- [Text Labels](/patterns/labels), for how the descriptions are written
- [Commands and Instructions](/examples/commands-instructions), for the commands table
- [Data Text Adventure](/examples/data-text-adventure), for the text chat
- [Using the Inspector](/examples/using-the-inspector)
