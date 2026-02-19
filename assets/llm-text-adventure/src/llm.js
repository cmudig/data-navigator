// Creates an LLM function for use with dataNavigator.textChat().
// getApiKey is called on each request so the key can change at runtime.
export function createLLM(getApiKey) {
    return async (messages) => {
        const apiKey = getApiKey();
        if (!apiKey) return null;

        const systemContent = messages.find(m => m.role === 'system')?.content || '';
        const chatMessages = messages.filter(m => m.role !== 'system');

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-5-20250929',
                max_tokens: 1024,
                system: systemContent,
                messages: chatMessages
            })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || `API error ${response.status}`);
        }

        const body = await response.json();
        return body.content[0]?.text || '';
    };
}
