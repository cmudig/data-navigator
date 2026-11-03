const Recognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

export const speechSupported = () => !!Recognition;

export function createSpeech({ onText, onStatus, onChange }) {
    let recognition = null;

    const stop = () => recognition?.abort();

    const listen = () => {
        if (recognition) return stop();
        recognition = new Recognition();
        recognition.lang = document.documentElement.lang || 'en-US';
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        let heard = false;
        recognition.onstart = () => {
            onChange(true);
            onStatus('Listening.');
        };
        recognition.onresult = e => {
            heard = true;
            const text = e.results[0][0].transcript
                .toLowerCase()
                .replace(/[^\p{L}\p{N}\s-]/gu, '')
                .trim();
            onStatus('');
            onText(text);
        };
        recognition.onerror = e => {
            heard = true;
            if (e.error === 'aborted') return onStatus('Stopped listening.');
            if (e.error === 'not-allowed') return onStatus('Microphone access is blocked.');
            if (e.error === 'no-speech') return onStatus("Didn't hear anything. Try again.");
            onStatus(`Speech recognition stopped: ${e.error}.`);
        };
        recognition.onend = () => {
            if (!heard) onStatus("Didn't catch that. Try again.");
            recognition = null;
            onChange(false);
        };
        recognition.start();
    };

    return { listen, stop };
}
