import inputFactory from './input';
import type { TextChatOptions, TextChatInstance, NodeObject, Structure, LLMMessage } from './data-navigator';

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
 * Damerau-Levenshtein edit distance between two strings.
 * Counts insertions, deletions, substitutions, and transpositions of
 * adjacent characters — each as a single edit.
 * O(m×n) where m, n are string lengths — trivial for short command strings.
 */
const damerauLevenshtein = (a: string, b: string): number => {
    const m = a.length;
    const n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(
                dp[i - 1][j] + 1,      // deletion
                dp[i][j - 1] + 1,      // insertion
                dp[i - 1][j - 1] + cost // substitution
            );
            // transposition of two adjacent characters
            if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
                dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + cost);
            }
        }
    }
    return dp[m][n];
};

/**
 * Maximum edit distance allowed for typo correction.
 * Short strings (≤4 chars) allow 1 edit; longer strings allow 2.
 */
const maxTypoDistance = (len: number): number => len <= 4 ? 1 : 2;

/**
 * Fuzzy match: checks rule names and their labels.
 * Priority: exact name → exact label → prefix on name → prefix on label word → typo correction.
 * Returns { match, ambiguous } where ambiguous lists candidates if prefix is not unique.
 */
const fuzzyMatch = (
    input: string,
    candidates: string[],
    labels: Record<string, string> = {}
): { match: string | null; ambiguous: string[] } => {
    const lower = input.toLowerCase().trim();

    // 1. Exact match on candidate name
    const exactName = candidates.find(c => c.toLowerCase() === lower);
    if (exactName) return { match: exactName, ambiguous: [] };

    // 2. Exact match on label text
    const exactLabel = candidates.find(c =>
        labels[c] && labels[c].toLowerCase() === lower
    );
    if (exactLabel) return { match: exactLabel, ambiguous: [] };

    // 3. Prefix match on candidate name
    const namePrefix = candidates.filter(c => c.toLowerCase().startsWith(lower));
    if (namePrefix.length === 1) return { match: namePrefix[0], ambiguous: [] };

    // 4. Prefix/word match on label — matches if any word in the label starts
    //    with the input, or if the full label starts with the input
    const labelMatches = candidates.filter(c => {
        if (!labels[c]) return false;
        const labelLower = labels[c].toLowerCase();
        if (labelLower.startsWith(lower)) return true;
        return labelLower.split(/\s+/).some(word => word.startsWith(lower));
    });

    // Combine name prefix and label matches (deduplicated)
    const combined = new Set([...namePrefix, ...labelMatches]);
    const all = Array.from(combined);

    if (all.length === 1) return { match: all[0], ambiguous: [] };
    if (all.length > 1) return { match: null, ambiguous: all };

    // 5. Typo correction via Levenshtein distance on names and label words
    const threshold = maxTypoDistance(lower.length);
    const typoMatches: Array<{ candidate: string; dist: number }> = [];
    for (let i = 0; i < candidates.length; i++) {
        const c = candidates[i];
        const nameDist = damerauLevenshtein(lower, c.toLowerCase());
        if (nameDist <= threshold) {
            typoMatches.push({ candidate: c, dist: nameDist });
            continue;
        }
        // Also check label words
        if (labels[c]) {
            const words = labels[c].toLowerCase().split(/\s+/);
            for (let w = 0; w < words.length; w++) {
                if (damerauLevenshtein(lower, words[w]) <= threshold) {
                    typoMatches.push({ candidate: c, dist: damerauLevenshtein(lower, words[w]) });
                    break;
                }
            }
        }
    }

    if (typoMatches.length === 1) return { match: typoMatches[0].candidate, ambiguous: [] };
    if (typoMatches.length > 1) {
        // If one is clearly closer, use it; otherwise ambiguous
        typoMatches.sort((a, b) => a.dist - b.dist);
        if (typoMatches[0].dist < typoMatches[1].dist) {
            return { match: typoMatches[0].candidate, ambiguous: [] };
        }
        return { match: null, ambiguous: typoMatches.map(t => t.candidate) };
    }

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
 * Searches structure nodes for a query string. Matches against node data
 * values, derivedNode names, and node IDs (case-insensitive substring).
 * Returns up to `limit` results as { nodeId, description } pairs.
 */
const searchNodes = (
    query: string,
    structure: Structure,
    describeFn: (node: NodeObject) => string,
    limit = 10
): Array<{ nodeId: string; description: string }> => {
    const lower = query.toLowerCase();
    const results: Array<{ nodeId: string; description: string }> = [];
    const nodeIds = Object.keys(structure.nodes);
    for (let i = 0; i < nodeIds.length && results.length < limit; i++) {
        const nodeId = nodeIds[i];
        const node = structure.nodes[nodeId];
        let matched = false;
        // Check node data values
        if (node.data && !matched) {
            const dataKeys = Object.keys(node.data);
            for (let j = 0; j < dataKeys.length && !matched; j++) {
                const val = node.data[dataKeys[j]];
                if (val != null && typeof val !== 'object' && String(val).toLowerCase().includes(lower)) {
                    matched = true;
                }
            }
        }
        // Check derivedNode
        if (!matched && node.derivedNode && node.derivedNode.toLowerCase().includes(lower)) {
            matched = true;
        }
        // Check node ID
        if (!matched && nodeId.toLowerCase().includes(lower)) {
            matched = true;
        }
        if (matched) {
            results.push({ nodeId, description: describeFn(node) });
        }
    }
    return results;
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
        onExit,
        onClick,
        onHover,
        llm,
        data
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

    // Pending "move to" choices — one-time numbered commands
    let pendingChoices: Array<{ nodeId: string; description: string }> | null = null;

    // LLM conversation history (user questions + LLM responses only, not nav commands)
    const llmHistory: LLMMessage[] = [];

    // Build system prompt for LLM context
    const buildSystemPrompt = (): string => {
        let prompt = 'You are a data assistant helping a user explore a dataset through a text-based navigation interface.\n\n';
        if (data && data.length > 0) {
            const columns = Object.keys(data[0]);
            const sampleRows = data.slice(0, 3).map(r => JSON.stringify(r)).join('\n  ');
            prompt += `DATASET SUMMARY:\n- Columns: ${columns.join(', ')}\n- Rows: ${data.length}\n- Sample (first 3):\n  ${sampleRows}\n\n`;
            // Include the full dataset so the model can compute over it
            prompt += 'FULL DATASET (JSON):\n' + JSON.stringify(data) + '\n\n';
        }
        if (currentNodeId) {
            const node = structure.nodes[currentNodeId];
            prompt += `CURRENT POSITION: ${node ? describeNode(node) : currentNodeId}\n\n`;
        } else {
            prompt += 'CURRENT POSITION: Not yet navigated into the structure.\n\n';
        }
        prompt += 'PRIORITY: Always prefer answers that can be verified against the dataset. For any statistical or quantitative claim (averages, comparisons, trends, extremes), briefly describe the method you used. Avoid open-ended or contextual claims that go beyond what the data can support — if the user asks something that cannot be checked against the dataset, say so and suggest they verify externally.\n\n';
        prompt += 'VERIFICATION: When the user asks you to verify a claim, write a short Python script (using the dataset as a JSON array) that computes the answer, and show the expected output. If the claim is too open-ended to verify with code, explain why and recommend external verification.\n\n';
        prompt += 'IMPORTANT: Your responses may contain errors. The user has been told they can ask you to "verify" any answer, and you will attempt to provide a Python script to check it.';
        return prompt;
    };

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

    const addResponseWithList = (intro: string, items: string[]) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'dn-text-chat-message dn-text-chat-response';
        const p = document.createElement('span');
        p.textContent = intro;
        wrapper.appendChild(p);
        const ol = document.createElement('ol');
        ol.className = 'dn-text-chat-choices';
        items.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            ol.appendChild(li);
        });
        wrapper.appendChild(ol);
        logEl.appendChild(wrapper);
        logEl.scrollTop = logEl.scrollHeight;
    };

    // LLM helper: ask a question, returns response string, null if LLM declined, or '' if error was handled
    const askLLM = async (question: string): Promise<string | null> => {
        const systemMsg: LLMMessage = { role: 'system', content: buildSystemPrompt() };
        llmHistory.push({ role: 'user', content: question });
        // Show thinking indicator
        const thinkingMsg = document.createElement('div');
        thinkingMsg.className = 'dn-text-chat-message dn-text-chat-llm-thinking';
        thinkingMsg.textContent = 'Thinking...';
        logEl.appendChild(thinkingMsg);
        logEl.scrollTop = logEl.scrollHeight;
        try {
            const response = await llm!([systemMsg, ...llmHistory]);
            logEl.removeChild(thinkingMsg);
            if (response === null) {
                llmHistory.pop();
                return null;
            }
            llmHistory.push({ role: 'assistant', content: response });
            addResponse(response);
            return response;
        } catch (err: any) {
            logEl.removeChild(thinkingMsg);
            llmHistory.pop();
            addResponse(`Error: ${err.message || 'Could not get a response.'}`);
            return '';
        }
    };

    // Welcome message
    if (llm) {
        addSystemMessage('Text navigation ready. Type "enter" to begin navigating, "help" for commands, or ask a question about the data.');
        addSystemMessage('Note: AI-generated answers may be inaccurate. You can ask the model to "verify" any answer — it will attempt to provide a Python script that checks the claim against the dataset. If a claim cannot be verified with code, it should be verified externally.');
    } else {
        addSystemMessage('Text navigation ready. Type "enter" to begin or "help" for available commands.');
    }

    // Special commands (not nav rules — handled before fuzzy matching)
    const specialCommands = ['enter', 'help', 'more', 'more help', 'clear', 'click', 'select', 'hover', 'inspect'];

    // Helper: move directly to a node by ID
    const moveToNode = (nodeId: string) => {
        const node = inputHandler.moveTo(nodeId);
        if (node) {
            currentNodeId = node.id;
            if (onNavigate) onNavigate(node);
            addResponse(`Moved to: ${describeNode(node)}`);
        } else {
            addResponse('Could not move to that node.');
        }
    };

    // Command handler
    const handleCommand = async (raw: string) => {
        const trimmed = raw.trim();
        if (!trimmed) return;

        addEcho(trimmed);
        const lower = trimmed.toLowerCase();

        // Check for pending numbered choice first
        if (pendingChoices) {
            const num = parseInt(trimmed, 10);
            if (!isNaN(num) && num >= 1 && num <= pendingChoices.length) {
                const choice = pendingChoices[num - 1];
                pendingChoices = null;
                moveToNode(choice.nodeId);
                return;
            }
            // Any non-number command clears pending choices and falls through
            pendingChoices = null;
        }

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
            const llmHint = llm ? ' You can also type any question about the data.' : '';
            const interactionHints: string[] = [];
            if (onClick) interactionHints.push('"click" or "select"');
            if (onHover) interactionHints.push('"hover" or "inspect"');
            const interactionSuffix = interactionHints.length
                ? ` Interaction: ${interactionHints.join(', ')}.`
                : '';
            if (!currentNodeId) {
                addResponse(
                    'Not yet in the structure. Type "enter" to begin navigating, or "move to <search>" to jump to a node.' +
                        interactionSuffix +
                        llmHint
                );
            } else {
                const node = structure.nodes[currentNodeId];
                const available = getAvailableRules(currentNodeId, node, structure);
                const formatted = available.map(r => formatRule(r, commandLabels));
                addResponse(
                    `Available: ${formatted.join(', ')}, move to <search>.` + interactionSuffix + llmHint
                );
            }
            return;
        }

        // Click / Select — trigger onClick callback on current node
        if (lower === 'click' || lower === 'select') {
            if (!currentNodeId) {
                addResponse('Not in the structure. Type "enter" to begin.');
                return;
            }
            const node = structure.nodes[currentNodeId];
            if (onClick && node) {
                onClick(node);
                addResponse(`Clicked: ${describeNode(node)}`);
            } else {
                addResponse(
                    onClick
                        ? 'Nothing to click here.'
                        : 'Click interaction is not enabled for this chart.'
                );
            }
            return;
        }

        // Hover / Inspect — trigger onHover callback on current node
        if (lower === 'hover' || lower === 'inspect') {
            if (!currentNodeId) {
                addResponse('Not in the structure. Type "enter" to begin.');
                return;
            }
            const node = structure.nodes[currentNodeId];
            if (onHover && node) {
                onHover(node);
                addResponse(`Hovering over: ${describeNode(node)}`);
            } else {
                addResponse(
                    onHover
                        ? 'Nothing to hover over here.'
                        : 'Hover interaction is not enabled for this chart.'
                );
            }
            return;
        }

        // Move to — direct navigation by search (works before or after entering)
        if (lower.startsWith('move to ')) {
            const query = trimmed.slice('move to '.length).trim();
            if (!query) {
                addResponse('Usage: move to <search term>');
                return;
            }
            const results = searchNodes(query, structure, describeNode);
            if (results.length === 0) {
                addResponse(`No nodes found matching "${query}".`);
            } else if (results.length === 1) {
                moveToNode(results[0].nodeId);
            } else {
                pendingChoices = results;
                addResponseWithList(
                    `Found ${results.length} matches. Type a number to move there:`,
                    results.map(r => r.description)
                );
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
            // If LLM is available, try treating it as a question
            if (llm) {
                const response = await askLLM(trimmed);
                if (response !== null) return;
                // LLM declined (e.g. no API key) — fall through to hint
            }
            const llmHint = llm ? ' Enter an API key above to ask questions about the data.' : '';
            addResponse('Type "enter" to begin navigating the structure, or "move to <search>" to jump to a node.' + llmHint);
            return;
        }

        // Navigation command
        // Build candidate list: all nav rule names + special commands for fuzzy matching
        const allRules = getAllRuleNames(structure);
        const { match, ambiguous } = fuzzyMatch(lower, [...allRules, ...specialCommands], commandLabels);

        if (match && specialCommands.includes(match)) {
            // Recursively handle matched special command
            await handleCommand(match);
            return;
        }

        if (!match && ambiguous.length > 0) {
            const formatted = ambiguous.map(r => formatRule(r, commandLabels));
            addResponse(`Did you mean: ${formatted.join(', ')}?`);
            return;
        }

        if (!match) {
            // If LLM is available, try treating unrecognized input as a question
            if (llm) {
                const response = await askLLM(trimmed);
                if (response !== null) return;
                // LLM declined — fall through to unknown command hint
            }
            const llmHint = llm ? ' Enter an API key above to ask questions about the data.' : '';
            addResponse(`Unknown command "${trimmed}". Type "help" for available commands.` + llmHint);
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
    formEl.addEventListener('submit', async (e: Event) => {
        e.preventDefault();
        const value = inputEl.value.trim();
        if (value) {
            history.push(value);
            historyIndex = -1;
        }
        await handleCommand(inputEl.value);
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
