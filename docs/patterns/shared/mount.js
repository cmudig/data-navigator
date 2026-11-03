// Wires one structure to keyboard navigation, text chat, the inspector, and a keys table.
// Keyboard and text chat each keep their own position. Both show a focus indicator on the chart.
import dataNavigator from 'data-navigator';
import { Inspector } from '@data-navigator/inspector';

// The rules some edge actually uses, in a friendly order, plus exit.
// This is what the built-in commands table shows.
const usedRules = structure => {
    const used = new Set();
    Object.values(structure.edges).forEach(e => e.navigationRules.forEach(r => used.add(r)));
    const order = ['left', 'right', 'up', 'down', 'backward', 'forward', 'previous', 'next', 'drill-in', 'drill-out'];
    const rules = {};
    [...used]
        .filter(r => structure.navigationRules[r])
        .sort((a, b) => {
            const ia = order.indexOf(a) === -1 ? 99 : order.indexOf(a);
            const ib = order.indexOf(b) === -1 ? 99 : order.indexOf(b);
            return ia - ib || a.localeCompare(b);
        })
        .forEach(r => (rules[r] = structure.navigationRules[r]));
    rules.exit = structure.navigationRules.exit;
    return rules;
};

export const defaultEntry = structure => {
    const level0 = Object.keys(structure.nodes).find(id => structure.nodes[id].dimensionLevel === 0);
    const firstDim = structure.dimensions && Object.values(structure.dimensions)[0]?.nodeId;
    return (
        structure.frame?.rootId ||
        level0 ||
        structure.spatialGrid?.rootId ||
        structure.hierarchy?.rootId ||
        firstDim ||
        Object.keys(structure.nodes)[0]
    );
};

export function mountPattern({
    id,
    structure,
    chartHost,
    chatHost,
    inspectorHost,
    instructionsHost,
    description,
    entryPoint,
    commandLabels = {},
    inspectorSize = { width: 420, height: 300 },
    onFocus = () => {}
}) {
    // Each node renders under a page-unique id.
    const elementData = {};
    Object.values(structure.nodes).forEach(node => {
        node.renderId = `${id}-${node.id}`;
        elementData[node.renderId] = node;
    });
    structure.navigationRules.exit = structure.navigationRules.exit || { key: 'Escape', direction: 'target' };
    const entry = entryPoint || defaultEntry(structure);
    const state = { keyboard: null, chat: null };

    const rendering = dataNavigator.rendering({
        elementData,
        defaults: { cssClass: 'dn-node' },
        suffixId: id,
        root: { id: chartHost.id, description: description || 'Data navigation', width: '100%', height: 0 },
        entryButton: { include: true, callbacks: { click: () => enter() } },
        exitElement: { include: true },
        // the built-in commands table: one row per rule, with its key and the text chat command
        commandsElement: instructionsHost
            ? {
                  include: true,
                  rootId: instructionsHost.id,
                  title: 'Keyboard and text commands',
                  navigationRules: usedRules(structure),
                  descriptions: { exit: 'Exit the chart', ...commandLabels },
                  columns: [
                      { label: 'Key', id: 'label' },
                      { label: 'Action', id: 'description' },
                      { label: 'Type in chat', id: 'command' }
                  ]
              }
            : undefined
    });
    rendering.initialize();

    const input = dataNavigator.input({
        structure,
        navigationRules: structure.navigationRules,
        entryPoint: entry,
        exitPoint: rendering.exitElement?.id
    });

    let inspector = null;
    if (inspectorHost) {
        inspector = Inspector({ structure, container: inspectorHost, size: inspectorSize, mode: 'tree' });
    }

    const report = () => {
        const current = state.keyboard || state.chat;
        if (inspector) {
            current ? inspector.highlight(current) : inspector.clear();
        }
        onFocus(current ? structure.nodes[current] : null);
    };

    const ensureRendered = nodeId => {
        const node = structure.nodes[nodeId];
        let el = document.getElementById(node.renderId);
        if (!el) {
            el = rendering.render(node);
            el.addEventListener('keydown', onKeydown);
        }
        return el;
    };
    const removeIfUnused = nodeId => {
        if (nodeId && nodeId !== state.keyboard && nodeId !== state.chat) {
            rendering.remove(structure.nodes[nodeId].renderId);
        }
    };
    const markChat = () => {
        rendering.wrapper.querySelectorAll('.is-chat-current').forEach(el => el.classList.remove('is-chat-current'));
        if (state.chat) ensureRendered(state.chat).classList.add('is-chat-current');
    };

    function focusNode(nodeId) {
        const prev = state.keyboard;
        state.keyboard = nodeId;
        ensureRendered(nodeId);
        input.focus(structure.nodes[nodeId].renderId);
        removeIfUnused(prev);
        report();
    }
    function enter() {
        const node = input.enter();
        if (node) focusNode(node.id);
    }
    function exit() {
        state.keyboard = null;
        if (rendering.exitElement) {
            rendering.exitElement.style.display = 'block';
            input.focus(rendering.exitElement.id);
        }
        // exiting clears every rendered node, so put the chat position back
        markChat();
        report();
    }
    function onKeydown(e) {
        const rule = input.keydownValidator(e);
        if (!rule) return;
        e.preventDefault();
        if (rule === 'exit') return exit();
        const next = input.move(state.keyboard, rule);
        if (next) focusNode(next.id);
    }

    const chat = dataNavigator.textChat({
        structure,
        container: chatHost,
        entryPoint: entry,
        commandLabels,
        onNavigate: node => {
            const prev = state.chat;
            state.chat = node.id;
            markChat();
            removeIfUnused(prev);
            report();
        },
        onExit: () => {
            const prev = state.chat;
            state.chat = null;
            markChat();
            removeIfUnused(prev);
            report();
        }
    });

    return {
        destroy() {
            chat.destroy();
            inspector?.destroy();
            instructionsHost?.querySelector('dn-commands-table')?.remove();
            rendering.wrapper?.remove();
            rendering.exitElement?.remove();
        }
    };
}
