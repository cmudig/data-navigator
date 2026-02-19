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
 * Gets available navigation rules for a node, filtering out edges that
 * resolve back to the current node (i.e. would not actually move).
 */
const getAvailableRules = (
    nodeId: string,
    node: NodeObject,
    structure: Structure
): string[] => {
    const available = new Set<string>();
    const navRules = structure.navigationRules || {};
    if (node.edges) {
        node.edges.forEach((edgeId: string) => {
            const edge = structure.edges[edgeId];
            if (!edge) return;
            edge.navigationRules.forEach((ruleName: string) => {
                const navRule = navRules[ruleName];
                if (!navRule) return;
                // Resolve the endpoint this rule would navigate to
                const endpoint = navRule.direction === 'target' ? edge.target : edge.source;
                const resolved = typeof endpoint === 'function'
                    ? (endpoint as Function)(node, nodeId)
                    : endpoint;
                // Only include if it actually leads somewhere different
                if (resolved && resolved !== nodeId) {
                    available.add(ruleName);
                }
            });
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
 * Formats a rule name for display, using commandLabels if provided.
 */
const formatRule = (ruleName: string, labels: Record<string, string>): string => {
    if (labels[ruleName]) return `${labels[ruleName]} (${ruleName})`;
    return ruleName;
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
        commandLabels = {},
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

    // Command history
    const history: string[] = [];
    let historyIndex = -1;

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

    // Command history navigation (up/down arrow)
    let savedInput = '';
    inputEl.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (history.length === 0) return;
            if (historyIndex === -1) {
                savedInput = inputEl.value;
                historyIndex = history.length - 1;
            } else if (historyIndex > 0) {
                historyIndex--;
            }
            inputEl.value = history[historyIndex];
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIndex === -1) return;
            if (historyIndex < history.length - 1) {
                historyIndex++;
                inputEl.value = history[historyIndex];
            } else {
                historyIndex = -1;
                inputEl.value = savedInput;
            }
        }
    });

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
    addSystemMessage('Text navigation ready. Type "enter" to begin or "help" for available commands.');

    // Special commands (not nav rules — handled before fuzzy matching)
    const specialCommands = ['enter', 'help', 'more', 'more help', 'clear'];

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

        // Enter — explicit entry into the structure
        if (lower === 'enter') {
            if (currentNodeId) {
                addResponse('Already in the structure. Type "help" to see available commands.');
                return;
            }
            const entryNode = inputHandler.enter();
            if (!entryNode) {
                addResponse('Could not enter the structure. No entry point found.');
                return;
            }
            currentNodeId = entryNode.id;
            if (onNavigate) onNavigate(entryNode);
            addResponse(`Entered: ${describeNode(entryNode)}`);
            return;
        }

        // Help — available commands from current node
        if (lower === 'help') {
            if (!currentNodeId) {
                addResponse(
                    'Not yet in the structure. Type "enter" to begin navigating.'
                );
            } else {
                const node = structure.nodes[currentNodeId];
                const available = getAvailableRules(currentNodeId, node, structure);
                const formatted = available.map(r => formatRule(r, commandLabels));
                addResponse(`Available: ${formatted.join(', ')}.`);
            }
            return;
        }

        // More help — all nav rules
        if (lower === 'more' || lower === 'more help') {
            const allRules = getAllRuleNames(structure);
            const formatted = allRules.map(r => formatRule(r, commandLabels));
            addResponse(`All navigation rules: ${formatted.join(', ')}.`);
            return;
        }

        // Must be entered before any navigation command
        if (!currentNodeId) {
            addResponse('Type "enter" to begin navigating the structure.');
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
            const formatted = ambiguous.map(r => formatRule(r, commandLabels));
            addResponse(`Did you mean: ${formatted.join(', ')}?`);
            return;
        }

        if (!match) {
            addResponse(`Unknown command "${trimmed}". Type "help" for available commands.`);
            return;
        }

        // We have a nav rule match
        const direction = match;
        const label = commandLabels[direction] || direction;

        // Exit
        if (direction === 'exit') {
            currentNodeId = null;
            if (onExit) onExit();
            addResponse('Exited the structure. Type "enter" to re-enter.');
            return;
        }

        // Attempt the move
        const nextNode = inputHandler.move(currentNodeId, direction);
        if (nextNode) {
            currentNodeId = nextNode.id;
            if (onNavigate) onNavigate(nextNode);
            addResponse(`${label}: ${describeNode(nextNode)}`);
        } else {
            addResponse(`Cannot move "${direction}" from here.`);
        }
    };

    // Form submit
    formEl.addEventListener('submit', (e: Event) => {
        e.preventDefault();
        const value = inputEl.value.trim();
        if (value) {
            history.push(value);
            historyIndex = -1;
        }
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
