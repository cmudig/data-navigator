import { createGestureRecognizer, everyFrame } from './vision.js';

const HOLD_MS = 400;
const NO_HAND_MS = 2000;
const named = {
    Open_Palm: 'drill-in',
    Closed_Fist: 'to-year',
    Victory: 'to-browser',
    Thumb_Up: 'drill-out',
    Thumb_Down: 'exit'
};

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const extended = (hand, tip, joint) => dist(hand[tip], hand[0]) > dist(hand[joint], hand[0]);
const pointing = hand =>
    extended(hand, 8, 6) && !extended(hand, 12, 10) && !extended(hand, 16, 14) && !extended(hand, 20, 18);

const pointDirection = hand => {
    const dx = hand[8].x - hand[5].x;
    const dy = hand[8].y - hand[5].y;
    if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'left' : 'right';
    return dy > 0 ? 'down' : 'up';
};

const read = result => {
    const hand = result.landmarks[0];
    const gesture = result.gestures[0]?.[0];
    if (gesture && named[gesture.categoryName] && gesture.score > 0.6) return named[gesture.categoryName];
    if (pointing(hand)) return pointDirection(hand);
    return null;
};

export async function startHand(video, { onRule, onStatus }) {
    const recognizer = await createGestureRecognizer();
    let candidate = null;
    let since = 0;
    let fired = null;
    let lastSeen = performance.now();
    let missing = false;

    const stopLoop = everyFrame(video, now => {
        const result = recognizer.recognizeForVideo(video, now);
        if (!result.landmarks.length) {
            candidate = fired = null;
            if (!missing && now - lastSeen > NO_HAND_MS) {
                missing = true;
                onStatus('No hand in view.');
            }
            return;
        }
        lastSeen = now;
        if (missing) {
            missing = false;
            onStatus('Hand found.');
        }
        const rule = read(result);
        if (rule !== candidate) {
            candidate = rule;
            since = now;
        }
        if (!rule) {
            fired = null;
            return;
        }
        if (rule !== fired && now - since >= HOLD_MS) {
            fired = rule;
            onRule(rule);
        }
    });

    return () => {
        stopLoop();
        recognizer.close();
    };
}
