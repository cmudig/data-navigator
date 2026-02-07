---
layout: doc
title: Interactive Demo
---

# Interactive Demo

::: warning Under Construction
This demo is currently being updated for the new docs site. Check back soon!

In the meantime, you can explore the [Getting Started guide](/getting-started/) to build your own navigable chart.
:::

<!-- TODO: restore demo when static-bundle.js and dependencies are working

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  // Load demo stylesheet
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = '/demo-style.css'
  document.head.appendChild(link)
})
</script>

<style scoped>
/* Demo page specific accessibility styles */
.dn-test-path {
  margin: -2px;
  border: 1px solid #767676;
}

.dn-test-path:focus {
  border: 3px solid #0063ff;
  outline: 3px solid #0063ff;
  outline-offset: 2px;
}

img {
  pointer-events: none;
}

.container {
  position: relative;
  overflow: hidden;
  width: 100%;
  padding-top: 56.25%;
}

.responsive-iframe {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  width: 100%;
  height: 100%;
  border: 1px solid #767676;
}

.responsive-iframe:focus {
  outline: 3px solid #0063ff;
  outline-offset: 2px;
}

pre {
  overflow: auto;
  background: #f6f6f6;
  padding: 10px;
  border-radius: 10px;
  border: 2px solid #ccc;
}

/* Citation copy button with accessibility */
.bib {
  min-width: 44px;
  min-height: 44px;
  width: 44px;
  height: 44px;
  border-radius: 22px;
  border: 2px solid #333;
  cursor: pointer;
  background: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.bib:hover {
  border-color: #000;
  background: #f5f5f5;
}

.bib:focus {
  outline: 3px solid #0063ff;
  outline-offset: 2px;
  border-color: #0063ff;
}

.bib svg {
  width: 20px;
  height: 20px;
  pointer-events: none;
}

.bib:active path {
  fill: #015ee9;
}

.bib path {
  fill: #333;
}

/* Tables */
:deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 1rem 0;
}

:deep(th),
:deep(td) {
  text-align: left;
  padding: 0.5rem;
  border: 1px solid #767676;
}

:deep(th) {
  background: #f5f5f5;
  font-weight: 600;
}

/* Form elements */
:deep(input[type="text"]),
:deep(input[type="submit"]) {
  min-height: 44px;
  padding: 0.5rem;
  border: 1px solid #767676;
  border-radius: 4px;
  font-size: 1rem;
}

:deep(input[type="text"]:focus),
:deep(input[type="submit"]:focus) {
  outline: 3px solid #0063ff;
  outline-offset: 2px;
  border-color: #0063ff;
}

/* Buttons */
:deep(button) {
  min-width: 44px;
  min-height: 44px;
  padding: 0.5rem 1rem;
  border: 1px solid #767676;
  border-radius: 4px;
  cursor: pointer;
  background: #0063ff;
  color: #fff;
  font-weight: 500;
  font-size: 1rem;
}

:deep(button:hover) {
  background: #0052cc;
}

:deep(button:focus) {
  outline: 3px solid #0063ff;
  outline-offset: 2px;
}

:deep(button:disabled) {
  opacity: 0.6;
  cursor: not-allowed;
  background: #999;
}

/* Details/Summary */
:deep(summary) {
  cursor: pointer;
  padding: 0.5rem;
  border: 1px solid #767676;
  border-radius: 4px;
  min-height: 44px;
  list-style: none;
}

:deep(summary:focus) {
  outline: 3px solid #0063ff;
  outline-offset: 2px;
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  * {
    transition: none !important;
    animation: none !important;
  }
}
</style>

In this demo, you can use a variety of different input modalities to navigate the data structure of a PNG image of a chart.

The core 3 subsystems within Data Navigator are Structure, Input, and Rendering:

- The structure is bespoke but mostly follows common patterns.
- You can use a lot of different inputs!
- The chart itself is just a PNG image. The rendered elements (when you navigate) are semantic HTML with custom visuals.

## Overall Instructions and Commands

You will need to "enter" Data Navigator's structure before you can begin navigating.

The details of every input command are outlined below, however note that each input modality specifies these commands in different ways (see each section for more details):

<details>
<summary>View commands:</summary>

| Command | Result |
|---------|--------|
| **Enter** | Enter the interface. (You must enter the interface before using any other command.) |
| **Exit** | Exit the interface. |
| **Right** | Move right (across teams). |
| **Left** | Move left (across teams). |
| **Up** | Move up (across legend items or between title/legend/axes). |
| **Down** | Move down (across legend items or between title/legend/axes). |
| **Child** | Drill into the x axis, legend, or childmost elements. |
| **Parent** | Drill out toward the x axis. |
| **Legend** | Drill out toward the legend. |
| **Undo** | Move to a previous position. |

</details>

## Keyboard, Screen Reader, Touch, and Mouse-drag

<details>
<summary>Show section</summary>

### Keyboard and Desktop Screen Reader Controls

| Command | Expected Input |
|---------|----------------|
| **Enter** | Click the "Enter navigation area" button. |
| **Exit** | <kbd>ESC</kbd> key. |
| **Right** | <kbd>→</kbd> (right arrow key). |
| **Left** | <kbd>←</kbd> (left arrow key). |
| **Up** | <kbd>↑</kbd> (up arrow key). |
| **Down** | <kbd>↓</kbd> (down arrow key). |
| **Child** | <kbd>ENTER</kbd> key. |
| **Parent** | <kbd>BACKSPACE</kbd> key. |
| **Legend** | <kbd>L</kbd> key. |
| **Undo** | <kbd>.</kbd> (period) key. |

### Mobile Screen Reader, Touch, and Mouse-drag Controls

| Command | Expected Input |
|---------|----------------|
| **Enter** | Long press and release on the chart area or click the "Enter navigation area" button. |
| **Exit** | Long press and release on the chart area (if you have entered already). |
| **Right** | → Press and swipe right. |
| **Left** | ← Press and swipe left. |
| **Up** | ↑ Press and swipe up. |
| **Down** | ↓ Press and swipe down. |
| **Child** | ↘ Press and swipe down and to the right. |
| **Parent** | ↖ Press and swipe up and to the left. |
| **Legend** | ↗ Press and swipe up and to the right. |
| **Undo** | ↙ Press and swipe down and to the left. |

</details>

## Text and Speech

<details>
<summary>Show section</summary>

All of the commands from the previous section (Overall Commands) can simply be typed into the text input or spoken using the button. For example:

| Command | Expected Input |
|---------|----------------|
| **Enter** | "Enter" "enter" and "EnTeR" are all valid. |

<div class="row">
<div class="column left">

**Issue a text command:**

<form id="form">
  <input type="text" id="textCommand" />
  <input id="submit" type="submit" />
</form>

</div>
<div class="column right limited">

**Speak a single-word command:**

<button id="enableSpeech">Issue voice command</button>

<p class="alert" id="alert"></p>

</div>
</div>

</details>

## Gesture

<details>
<summary>Show section</summary>

The gesture control model is heavy, so we only load it if you want to try it. Click "Load Gesture Model" to load it and then activate the model with "Open Webcam" (it will need access to your camera).

### Gesture Controls

Close your hand to set the gesture center (marked by an 👊 emoji on the camera space). When ready, you can open your hand or point in a direction to move. Close your hand again to set the gesture center for a new gesture (and repeat).

The model is slow and isn't very smart, so you will need to exaggerate your movement distances and hold your gesture for about a second. It fails often (apologies).

| Command | Expected Input |
|---------|----------------|
| **Enter** | 🖐 Open your hand, facing the camera. |
| **Exit** | 🖐 Open your hand, facing the camera (once already entered). |
| **Right** | 👉 Point right of your gesture center. |
| **Left** | 👈 Point left of your gesture center. |
| **Up** | ☝ Point above your gesture center. |
| **Down** | 👇 Point below your gesture center. |
| **Child** | 👇👉 Point below and to the right of your gesture center. |
| **Parent** | ☝👈 Point above and to the left of your gesture center. |
| **Legend** | ☝👉 Point above and to the right of your gesture center. |
| **Undo** | 👇👈 Point below and to the left of your gesture center. |

<button id="loadModel">Load Gesture Model</button>
<br />
<button id="openWebcam" disabled>Open Webcam</button>
<br />
<button id="closeWebcam" disabled>Close Model</button>
<br /><br />

<div id="status" class="hidden">

**Ready for a command?** <span id="ready">No. Try closing your hand.</span>

**Command used:** <span id="command">(none yet)</span>

</div>

<div class="video-wrapper">
  <video class="videobox canvasbox" autoplay="autoplay" id="feed"></video>
  <canvas id="canvas" class="border canvasbox hidden"></canvas>
  <div id="fist">👊</div>
</div>

</details>

## Try It!

<div class="wrapper">
  <div id="root" class="wrapper">
    <img
      id="chart"
      src="/static.png"
      alt="Major trophies for some English teams. Stacked bar chart."
    />
  </div>
  <div id="tooltip" role="presentation" class="tooltip hidden" focusable="false"></div>
</div>

## Copy Citation

<button id="bib-copy" class="bib" title="Copy to clipboard" aria-label="Copy to clipboard">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
    <path d="M208 0H332.1c12.7 0 24.9 5.1 33.9 14.1l67.9 67.9c9 9 14.1 21.2 14.1 33.9V336c0 26.5-21.5 48-48 48H208c-26.5 0-48-21.5-48-48V48c0-26.5 21.5-48 48-48zM48 128h80v64H64V448H256V416h64v48c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V176c0-26.5 21.5-48 48-48z" />
  </svg>
</button>
<span aria-live="polite" id="copy-announcer"></span>

```bibtex
@article{2023-elavsky-data-navigator,
  title = {{Data Navigator}: An Accessibility-Centered Data Navigation Toolkit},
  publisher = {{IEEE}},
  author = {Frank Elavsky and Lucas Nadolskis and Dominik Moritz},
  journal = {{IEEE} Transactions on Visualization and Computer Graphics},
  year = {2023},
  url = {http://dig.cmu.edu/data-navigator/}
}
```

<script>
// Wait for DOM to be ready
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    // Load external dependencies
    const hammerScript = document.createElement('script')
    hammerScript.src = 'https://hammerjs.github.io/dist/hammer.min.js'
    document.body.appendChild(hammerScript)

    const handtrackScript = document.createElement('script')
    handtrackScript.src = 'https://cdn.jsdelivr.net/npm/handtrackjs@latest/dist/handtrack.min.js'
    document.body.appendChild(handtrackScript)

    // Load the demo bundle after dependencies
    handtrackScript.onload = () => {
      const demoScript = document.createElement('script')
      demoScript.src = '/static-bundle.js'
      document.body.appendChild(demoScript)
    }

    // Clipboard functionality
    setTimeout(() => {
      const bibCopy = document.getElementById('bib-copy')
      const bibtex = document.querySelector('pre code')
      const announce = document.getElementById('copy-announcer')

      if (bibCopy && bibtex && announce) {
        bibCopy.addEventListener('click', (evt) => {
          const setText = txt => () => {
            announce.innerText = txt
            window.setTimeout(() => (announce.innerText = ''), 1500)
          }

          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard
              .writeText(bibtex.innerText)
              .then(setText(' Copied!'), setText(' Failed.'))
          } else {
            setText(' Clipboard not available.')()
          }
        })
      }
    }, 1000)
  })
}
</script>

end of commented out demo -->
