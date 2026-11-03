import { createFaceLandmarker, everyFrame } from './vision.js';

const NO_FACE_MS = 2000;
const CALIBRATION_FRAMES = 15;
const holdMs = { 'drill-out': 1000, exit: 500 };
const limits = { turn: 0.15, nod: 0.12, tilt: 0.25, eyesClosed: 0.5, frown: 0.3, mouthOpen: 0.45 };

const pose = (face, aspect) => {
    const [a, b, nose] = [face[33], face[263], face[1]].map(p => ({ x: p.x * aspect, y: p.y }));
    const tilt = Math.atan2(b.y - a.y, b.x - a.x);
    const eyes = Math.hypot(b.x - a.x, b.y - a.y);
    const dx = (nose.x - (a.x + b.x) / 2) / eyes;
    const dy = (nose.y - (a.y + b.y) / 2) / eyes;
    const cos = Math.cos(-tilt);
    const sin = Math.sin(-tilt);
    return { turn: dx * cos - dy * sin, nod: dx * sin + dy * cos, tilt };
};

const scores = result =>
    Object.fromEntries((result.faceBlendshapes[0]?.categories || []).map(c => [c.categoryName, c.score]));

export async function startHead(video, { onRule, onStatus }) {
    const landmarker = await createFaceLandmarker();
    const samples = [];
    let neutral = null;
    let candidate = null;
    let since = 0;
    let ready = true;
    let lastSeen = performance.now();
    let missing = false;

    const read = (p, s) => {
        if (Math.min(s.eyeBlinkLeft, s.eyeBlinkRight) > limits.eyesClosed) return 'drill-out';
        if ((s.mouthFrownLeft + s.mouthFrownRight) / 2 > limits.frown) return 'exit';
        if (s.jawOpen > limits.mouthOpen) return 'drill-in';
        const turn = p.turn - neutral.turn;
        const nod = p.nod - neutral.nod;
        const tilt = p.tilt - neutral.tilt;
        if (Math.abs(tilt) > limits.tilt) return tilt > 0 ? 'to-year' : 'to-browser';
        if (Math.abs(turn) / limits.turn > Math.abs(nod) / limits.nod) {
            if (Math.abs(turn) > limits.turn) return turn > 0 ? 'left' : 'right';
        } else if (Math.abs(nod) > limits.nod) {
            return nod > 0 ? 'down' : 'up';
        }
        return null;
    };

    const stopLoop = everyFrame(video, now => {
        const result = landmarker.detectForVideo(video, now);
        const face = result.faceLandmarks[0];
        if (!face) {
            candidate = null;
            if (!missing && now - lastSeen > NO_FACE_MS) {
                missing = true;
                onStatus('No face in view.');
            }
            return;
        }
        lastSeen = now;
        if (missing) {
            missing = false;
            onStatus('Face found.');
        }
        const p = pose(face, video.videoWidth / video.videoHeight);
        if (!neutral) {
            samples.push(p);
            if (samples.length < CALIBRATION_FRAMES) return;
            neutral = Object.fromEntries(
                Object.keys(p).map(k => [k, samples.reduce((sum, s) => sum + s[k], 0) / samples.length])
            );
            onStatus('Head tracking ready.');
            return;
        }
        const rule = read(p, scores(result));
        if (!rule) {
            candidate = null;
            ready = true;
            return;
        }
        if (rule !== candidate) {
            candidate = rule;
            since = now;
        }
        if (ready && now - since >= (holdMs[rule] || 250)) {
            ready = false;
            onRule(rule);
        }
    });

    return () => {
        stopLoop();
        landmarker.close();
    };
}
