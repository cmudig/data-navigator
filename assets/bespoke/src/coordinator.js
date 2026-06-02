import dataNavigator from 'data-navigator';
import { structure, storyStructure, callbacks } from './structure.js';

const captionEl = document.getElementById('caption');

// ── Source mode ──────────────────────────────────────────────────────────────
let sourceCurrent = null,
    sourcePrevious = null;
let sourceInput;

const enterSource = () => {
    if (timeCurrent) {
        timeRendering.remove(timeCurrent);
        timeCurrent = null;
        timePrevious = null;
    }
    if (timeRendering.exitElement) timeRendering.exitElement.style.display = 'none';
    const nextNode = sourceInput.enter();
    if (nextNode) sourceLifecycle(nextNode);
};

const sourceRendering = dataNavigator.rendering({
    elementData: structure.nodes,
    defaults: { cssClass: 'dn-bespoke-node' },
    suffixId: 'source',
    root: {
        id: 'chart-wrapper',
        description:
            'Stratigraphic chart of glacial sediment deposits in Wisconsin. Three columns by sediment source direction.',
        width: '100%',
        height: 0
    },
    entryButton: { include: true, callbacks: { click: enterSource } },
    exitElement: { include: true }
});
sourceRendering.initialize();
sourceRendering.entryButton.innerText = 'Explore sediment by source';

callbacks.onSourceExit = () => {
    sourceRendering.exitElement.style.display = 'block';
    sourceInput.focus(sourceRendering.exitElement.id);
    if (sourceCurrent) {
        sourceRendering.remove(sourceCurrent);
        sourceCurrent = null;
    }
    if (captionEl) captionEl.textContent = '';
};

sourceInput = dataNavigator.input({
    structure,
    navigationRules: structure.navigationRules,
    entryPoint: 'glacial-sediment-w-nw',
    exitPoint: sourceRendering.exitElement?.id
});

const sourceMove = direction => {
    const nextNode = sourceInput.move(sourceCurrent, direction);
    if (nextNode) sourceLifecycle(nextNode);
};

const sourceLifecycle = nextNode => {
    if (sourcePrevious) sourceRendering.remove(sourcePrevious);
    const element = sourceRendering.render({ renderId: nextNode.renderId, datum: nextNode });
    element.addEventListener('keydown', e => {
        const direction = sourceInput.keydownValidator(e);
        if (direction) {
            e.preventDefault();
            sourceMove(direction);
        }
    });
    element.addEventListener('focus', () => {
        if (captionEl) captionEl.textContent = nextNode.semantics.label;
    });
    sourceInput.focus(nextNode.renderId);
    sourcePrevious = sourceCurrent;
    sourceCurrent = nextNode.id;
};

// ── Time mode ────────────────────────────────────────────────────────────────
let timeCurrent = null,
    timePrevious = null;
let timeInput;

const enterTime = () => {
    if (sourceCurrent) {
        sourceRendering.remove(sourceCurrent);
        sourceCurrent = null;
        sourcePrevious = null;
    }
    if (sourceRendering.exitElement) sourceRendering.exitElement.style.display = 'none';
    const nextNode = timeInput.enter();
    if (nextNode) timeLifecycle(nextNode);
};

const timeRendering = dataNavigator.rendering({
    elementData: storyStructure.nodes,
    defaults: { cssClass: 'dn-story-node' },
    suffixId: 'time',
    root: {
        id: 'chart-wrapper',
        description: 'Stratigraphic chart showing glacial sediment layers through time in Wisconsin.',
        width: '100%',
        height: 0
    },
    entryButton: { include: true, callbacks: { click: enterTime } },
    exitElement: { include: true }
});
timeRendering.initialize();
timeRendering.entryButton.innerText = 'Navigate sediment by time';

callbacks.onTimeExit = () => {
    timeRendering.exitElement.style.display = 'block';
    timeInput.focus(timeRendering.exitElement.id);
    if (timeCurrent) {
        timeRendering.remove(timeCurrent);
        timeCurrent = null;
    }
    if (captionEl) captionEl.textContent = '';
};

timeInput = dataNavigator.input({
    structure: storyStructure,
    navigationRules: storyStructure.navigationRules,
    entryPoint: 'st-01',
    exitPoint: timeRendering.exitElement?.id
});

const timeMove = direction => {
    const nextNode = timeInput.move(timeCurrent, direction);
    if (nextNode) timeLifecycle(nextNode);
};

const timeLifecycle = nextNode => {
    if (timePrevious) timeRendering.remove(timePrevious);
    const element = timeRendering.render({ renderId: nextNode.renderId, datum: nextNode });
    element.addEventListener('keydown', e => {
        const direction = timeInput.keydownValidator(e);
        if (direction) {
            e.preventDefault();
            timeMove(direction);
        }
    });
    element.addEventListener('focus', () => {
        if (captionEl) captionEl.textContent = nextNode.semantics.label;
    });
    timeInput.focus(nextNode.renderId);
    timePrevious = timeCurrent;
    timeCurrent = nextNode.id;
};
