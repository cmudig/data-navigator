import dataNavigator from 'data-navigator';
import { Inspector } from '@data-navigator/inspector';
import { commands, commandLabels, tableRows, tableColumns } from './commands.js';

export function createNavigator({
    structure,
    description,
    chartHost,
    chatHost,
    inspectorHost,
    commandsHost,
    onStatus
}) {
    const elementData = {};
    Object.values(structure.nodes).forEach(node => {
        node.renderId = `mw-node-${node.id}`;
        elementData[node.renderId] = node;
    });
    const entryPoint = 'chart';
    let current = null;

    const rendering = dataNavigator.rendering({
        elementData,
        suffixId: 'mw',
        defaults: { cssClass: 'dn-node' },
        root: { id: chartHost.id, description, width: '100%', height: 0 },
        entryButton: { include: true, callbacks: { click: () => enter() } },
        exitElement: { include: true },
        commandsElement: {
            include: true,
            rootId: commandsHost.id,
            title: 'Commands for every input',
            commands: tableRows,
            columns: tableColumns
        }
    });
    rendering.initialize();

    const input = dataNavigator.input({
        structure,
        navigationRules: structure.navigationRules,
        entryPoint,
        exitPoint: rendering.exitElement.id
    });

    const width = Math.min(480, inspectorHost.clientWidth || 360);
    const inspector = Inspector({
        structure,
        container: inspectorHost,
        size: { width, height: Math.round(width * 0.75) },
        mode: 'tree'
    });

    const onKeydown = e => {
        const rule = input.keydownValidator(e);
        if (!rule) return;
        e.preventDefault();
        move(rule);
    };

    const show = (id, focus) => {
        const previous = current;
        current = id;
        const node = structure.nodes[id];
        let el = document.getElementById(node.renderId);
        if (!el) {
            el = rendering.render(node);
            el.addEventListener('keydown', onKeydown);
        }
        el.classList.add('is-current');
        if (focus) input.focus(node.renderId);
        if (previous && previous !== id) rendering.remove(structure.nodes[previous].renderId);
        inspector.highlight(id);
    };

    const clear = () => {
        current = null;
        rendering.clearStructure();
        inspector.clear();
    };

    const enter = () => {
        const node = input.enter();
        show(node.id, true);
        chat.setCurrentNode(node.id);
    };

    const exit = () => {
        clear();
        chat.setCurrentNode(null);
        rendering.exitElement.style.display = 'block';
        input.focus(rendering.exitElement.id);
    };

    const move = rule => {
        if (rule === 'exit') return exit();
        const next = input.move(current, rule);
        if (!next) {
            onStatus(`"${commandLabels[rule] || rule}" isn't available here.`);
            return;
        }
        show(next.id, true);
        chat.setCurrentNode(next.id);
    };

    const chat = dataNavigator.textChat({
        structure,
        container: chatHost,
        entryPoint,
        commandLabels,
        onNavigate: node => show(node.id, false),
        onExit: clear
    });

    const inChart = () => rendering.wrapper.contains(document.activeElement);

    const run = (rule, way) => {
        if (!current && rule !== 'drill-in') {
            const how = commands.find(c => c.rule === 'drill-in')[way];
            onStatus(`Not in the chart yet. To enter: ${how.toLowerCase()}.`);
            return;
        }
        if (inChart()) {
            current ? move(rule) : enter();
            return;
        }
        chat.submit(current ? rule : 'enter');
    };

    return {
        run,
        say: text => chat.submit(text),
        destroy() {
            chat.destroy();
            inspector.destroy();
            commandsHost.replaceChildren();
            rendering.wrapper.remove();
            rendering.exitElement.remove();
        }
    };
}
