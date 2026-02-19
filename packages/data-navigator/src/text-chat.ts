import inputFactory from './input';
import type { TextChatOptions, TextChatInstance, NodeObject, Structure } from './data-navigator';

/**
 * Default node description — self-contained, no inspector dependency.
 */
const defaultDescribeNode = (node: NodeObject): string => {
    if (node.semantics?.label) {
        const label = typeof node.semantics.label === 'function'
            ? node.semantics.label()
            : node.semantics.label;
        if (label) return label;
    }
    if (!node.derivedNode) {
        if (node.data) {
            return (
                Object.keys(node.data)
                    .map(key => `${key}: ${node.data[key]}`)
                    .join('. ') + '. Data point.'
            );
        }
        return node.id;
    }
    if (node.data?.dimensionKey) {
        let count = 0;
        const divisions = Object.keys(node.data.divisions || {});
        divisions.forEach(div => {
            count += Object.keys(node.data.divisions[div].values || {}).length;
        });
        let label = `${node.derivedNode}.`;
        label +=
            divisions.length && count
                ? ` ${divisions.length} division${divisions.length > 1 ? 's' : ''}, ${count} datapoint${count > 1 ? 's' : ''}.`
                : ' No child data points.';
        label += ` ${node.data.type} dimension.`;
        return label;
    }
    return `${node.derivedNode}: ${node.data?.[node.derivedNode]}. ${
        Object.keys(node.data?.values || {}).length
    } child data point${Object.keys(node.data?.values || {}).length > 1 ? 's' : ''}. Division.`;
};

/**
 * Gets available navigation rules for a node by inspecting its edges.
 */
const getAvailableRules = (node: NodeObject, structure: Structure): string[] => {
    const available = new Set<string>();
    if (node.edges) {
        node.edges.forEach((edgeId: string) => {
            const edge = structure.edges[edgeId];
            if (edge) {
                edge.navigationRules.forEach((r: string) => available.add(r));
            }
        });
    }
    return Array.from(available);
};

/**
 * All known navigation rule names from the structure.
 */
const getAllRuleNames = (structure: Structure): string[] => {
    if (!structure.navigationRules) return [];
    return Object.keys(structure.navigationRules);
};

/**
 * Fuzzy match: exact match first, then unique prefix match.
 * Returns { match, ambiguous? } where ambiguous is a list of candidates if prefix is not unique.
 */
const fuzzyMatch = (
    input: string,
    candidates: string[]
): { match: string | null; ambiguous: string[] } => {
    const lower = input.toLowerCase().trim();
    // Exact match
    const exact = candidates.find(c => c.toLowerCase() === lower);
    if (exact) return { match: exact, ambiguous: [] };
    // Prefix match
    const prefixMatches = candidates.filter(c => c.toLowerCase().startsWith(lower));
    if (prefixMatches.length === 1) return { match: prefixMatches[0], ambiguous: [] };
    if (prefixMatches.length > 1) return { match: null, ambiguous: prefixMatches };
    return { match: null, ambiguous: [] };
};

/**
 * Creates a text chat navigation interface.
 */
export default (options: TextChatOptions): TextChatInstance => {
    const {
        structure,
        container,
        entryPoint,
        describeNode = defaultDescribeNode,
        onNavigate,
        onExit
    } = options;

    const rootEl =
        typeof container === 'string' ? document.getElementById(container) : container;
    if (!rootEl) {
        throw new Error(`textChat: container "${container}" not found`);
    }

    // Determine entry point
    const resolvedEntryPoint =
        entryPoint ||
        (structure.dimensions
            ? structure.dimensions[Object.keys(structure.dimensions)[0]]?.nodeId
            : Object.keys(structure.nodes)[0]);

    // Create input handler
    const inputHandler = inputFactory({
        structure,
        navigationRules: structure.navigationRules || {},
        entryPoint: resolvedEntryPoint
    });

    // State
    let currentNodeId: string | null = null;
    const uid = Math.random().toString(36).slice(2, 8);

    // Build DOM
    const chatEl = document.createElement('div');
    chatEl.className = 'dn-text-chat';

    // Log area
    const logEl = document.createElement('div');
    logEl.className = 'dn-text-chat-log';
    logEl.setAttribute('role', 'log');
    logEl.setAttribute('aria-live', 'polite');
    chatEl.appendChild(logEl);

    // Controls
    const controlsEl = document.createElement('div');
    controlsEl.className = 'dn-text-chat-controls';
    const announceLabel = document.createElement('label');
    const announceCheckbox = document.createElement('input');
    announceCheckbox.type = 'checkbox';
    announceCheckbox.checked = true;
    announceCheckbox.addEventListener('change', () => {
        logEl.setAttribute('aria-live', announceCheckbox.checked ? 'polite' : 'off');
    });
    announceLabel.appendChild(announceCheckbox);
    announceLabel.appendChild(document.createTextNode(' Automatically announce to screen readers'));
    controlsEl.appendChild(announceLabel);
    chatEl.appendChild(controlsEl);

    // Form
    const formEl = document.createElement('form');
    formEl.className = 'dn-text-chat-form';
    const inputLabel = document.createElement('label');
    inputLabel.setAttribute('for', `dn-text-chat-input-${uid}`);
    inputLabel.className = 'dn-text-chat-sr-only';
    inputLabel.textContent = 'Navigation command';
    const inputEl = document.createElement('input');
    inputEl.type = 'text';
    inputEl.id = `dn-text-chat-input-${uid}`;
    inputEl.autocomplete = 'off';
    inputEl.setAttribute('placeholder', 'Type a command...');
    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.textContent = 'Send';
    formEl.appendChild(inputLabel);
    formEl.appendChild(inputEl);
    formEl.appendChild(submitBtn);
    chatEl.appendChild(formEl);

    rootEl.appendChild(chatEl);

    // Helpers
    const addMessage = (text: string, className: string) => {
        const msg = document.createElement('div');
        msg.className = `dn-text-chat-message ${className}`;
        msg.textContent = text;
        logEl.appendChild(msg);
        // Scroll to bottom
        logEl.scrollTop = logEl.scrollHeight;
    };

    const addSystemMessage = (text: string) => addMessage(text, 'dn-text-chat-system');
    const addEcho = (text: string) => addMessage(`> ${text}`, 'dn-text-chat-input-echo');
    const addResponse = (text: string) => addMessage(text, 'dn-text-chat-response');

    // Welcome message
    addSystemMessage('Text navigation ready. Type "help" for available commands.');

    // Special commands (not nav rules)
    const specialCommands = ['help', 'more', 'more help', 'clear'];

    // Command handler
    const handleCommand = (raw: string) => {
        const trimmed = raw.trim();
        if (!trimmed) return;

        addEcho(trimmed);
        const lower = trimmed.toLowerCase();

        // Clear
        if (lower === 'clear') {
            logEl.innerHTML = '';
            addSystemMessage('Chat cleared. Type "help" for available commands.');
            return;
        }

        // Help — available commands from current node
        if (lower === 'help') {
            if (!currentNodeId) {
                const allRules = getAllRuleNames(structure);
                const navRules = allRules.filter(r => r !== 'exit' && r !== 'help' && r !== 'undo');
                addResponse(
                    `Not yet in the structure. Type any navigation command to enter. Available commands: ${navRules.join(', ')}.`
                );
            } else {
                const node = structure.nodes[currentNodeId];
                const available = getAvailableRules(node, structure);
                addResponse(`Available from current position: ${available.join(', ')}.`);
            }
            return;
        }

        // More help — all nav rules
        if (lower === 'more' || lower === 'more help') {
            const allRules = getAllRuleNames(structure);
            addResponse(`All navigation rules in this structure: ${allRules.join(', ')}.`);
            return;
        }

        // Navigation command
        // Build candidate list: all nav rule names + special commands for fuzzy matching
        const allRules = getAllRuleNames(structure);
        const { match, ambiguous } = fuzzyMatch(lower, [...allRules, ...specialCommands]);

        if (match && specialCommands.includes(match)) {
            // Recursively handle matched special command
            handleCommand(match);
            return;
        }

        if (!match && ambiguous.length > 0) {
            addResponse(`Did you mean: ${ambiguous.join(', ')}?`);
            return;
        }

        if (!match) {
            addResponse(`Unknown command "${trimmed}". Type "help" for available commands.`);
            return;
        }

        // We have a nav rule match
        const direction = match;

        // Exit
        if (direction === 'exit') {
            if (!currentNodeId) {
                addResponse('Not in the structure. Nothing to exit.');
                return;
            }
            currentNodeId = null;
            if (onExit) onExit();
            addResponse('Exited the structure.');
            return;
        }

        // If not yet entered, enter first
        if (!currentNodeId) {
            const entryNode = inputHandler.enter();
            if (!entryNode) {
                addResponse('Could not enter the structure. No entry point found.');
                return;
            }
            currentNodeId = entryNode.id;
            if (onNavigate) onNavigate(entryNode);
            addResponse(`Entered: ${describeNode(entryNode)}`);

            // If the command was specifically "child" or "enter", entering is the action
            if (direction === 'child' || direction === 'enter') {
                return;
            }
            // Otherwise, also attempt the navigation from the entry point
        }

        // Attempt the move
        const nextNode = inputHandler.move(currentNodeId, direction);
        if (nextNode) {
            currentNodeId = nextNode.id;
            if (onNavigate) onNavigate(nextNode);
            addResponse(`Moved "${direction}": ${describeNode(nextNode)}`);
        } else {
            addResponse(`Cannot move "${direction}" from here.`);
        }
    };

    // Form submit
    formEl.addEventListener('submit', (e: Event) => {
        e.preventDefault();
        handleCommand(inputEl.value);
        inputEl.value = '';
        inputEl.focus();
    });

    // Public API
    return {
        destroy() {
            rootEl.removeChild(chatEl);
        },
        getCurrentNode() {
            return currentNodeId ? structure.nodes[currentNodeId] || null : null;
        }
    };
};
