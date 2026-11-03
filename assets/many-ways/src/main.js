import { data } from './data.js';
import { drawChart } from './chart.js';
import { buildStructure } from './structure.js';
import { createNavigator } from './navigator.js';
import { speechSupported, createSpeech } from './speech.js';
import { createCamera } from './vision.js';
import { startHand } from './hand.js';
import { startHead } from './head.js';
import { startSwipe } from './swipe.js';

export function mountManyWays(root) {
    const $ = id => root.querySelector(`#${id}`);
    const chartHost = $('mw-chart');
    const status = $('mw-status');
    const announce = text => {
        status.textContent = '';
        requestAnimationFrame(() => (status.textContent = text));
    };

    const geometry = drawChart(chartHost, data, { width: Math.min(640, chartHost.clientWidth || 640) });
    const nav = createNavigator({
        structure: buildStructure(data, geometry),
        description: 'Browser share chart',
        chartHost,
        chatHost: $('mw-chat'),
        inspectorHost: $('mw-inspector'),
        commandsHost: $('mw-commands'),
        onStatus: announce
    });

    const stops = {};
    const stop = way => {
        stops[way]?.();
        delete stops[way];
    };

    const speak = $('mw-speak');
    const voice = $('mw-voice');
    const speech = speechSupported()
        ? createSpeech({
              onText: nav.say,
              onStatus: announce,
              onChange: listening => (speak.textContent = listening ? 'Stop listening' : 'Speak a command')
          })
        : null;
    if (!speech) {
        voice.disabled = true;
        $('mw-voice-note').hidden = false;
    }
    voice.addEventListener('change', () => {
        speak.hidden = !voice.checked;
        if (!voice.checked) speech.stop();
        announce(voice.checked ? 'Voice on. Press Speak a command, then say a command.' : 'Voice off.');
    });
    speak.addEventListener('click', () => speech.listen());

    const video = $('mw-video');
    const camera = createCamera(video);
    const cameraPanel = $('mw-camera');
    const vision = {
        hand: { box: $('mw-hand'), start: startHand, name: 'Hand', ready: 'Show one hand to the camera.' },
        head: {
            box: $('mw-head'),
            start: startHead,
            name: 'Head',
            ready: 'Look at the camera and hold still for a moment.'
        }
    };
    const showCamera = () => (cameraPanel.hidden = !(vision.hand.box.checked || vision.head.box.checked));
    Object.entries(vision).forEach(([way, { box, start, name, ready }]) => {
        box.addEventListener('change', async () => {
            showCamera();
            if (!box.checked) {
                stop(way);
                return announce(`${name} tracking off.`);
            }
            announce(`Loading ${way} tracking.`);
            try {
                await camera.start();
                const end = await start(video, { onRule: rule => nav.run(rule, way), onStatus: announce });
                stops[way] = () => {
                    end();
                    camera.stop();
                };
                if (!box.checked) return stop(way);
                announce(`${name} tracking on. ${ready}`);
            } catch (error) {
                camera.stop();
                box.checked = false;
                showCamera();
                announce(
                    error.name === 'NotAllowedError' ? 'Camera access is blocked.' : `Couldn't start ${way} tracking.`
                );
            }
        });
    });

    const swipe = $('mw-swipe');
    swipe.addEventListener('change', () => {
        if (!swipe.checked) {
            stop('touch');
            return announce('Swiping off.');
        }
        stops.touch = startSwipe(chartHost, { onRule: rule => nav.run(rule, 'touch') });
        announce('Swiping on. Swipe, tap, or press on the chart.');
    });

    return () => {
        Object.keys(stops).forEach(stop);
        speech?.stop();
        nav.destroy();
        chartHost.querySelector('.mw-svg')?.remove();
    };
}
