const BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1';
const MODELS = 'https://storage.googleapis.com/mediapipe-models';

let loading = null;
const loadVision = () => {
    loading ||= (async () => {
        const vision = await import(/* @vite-ignore */ `${BASE}/vision_bundle.mjs`);
        const fileset = await vision.FilesetResolver.forVisionTasks(`${BASE}/wasm`);
        return { vision, fileset };
    })();
    return loading;
};

const create = async (Task, model, options) => {
    const { fileset } = await loadVision();
    const base = { runningMode: 'VIDEO', ...options };
    try {
        return await Task.createFromOptions(fileset, {
            ...base,
            baseOptions: { modelAssetPath: model, delegate: 'GPU' }
        });
    } catch {
        return Task.createFromOptions(fileset, { ...base, baseOptions: { modelAssetPath: model, delegate: 'CPU' } });
    }
};

export const createGestureRecognizer = async () => {
    const { vision } = await loadVision();
    return create(
        vision.GestureRecognizer,
        `${MODELS}/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task`,
        {
            numHands: 1
        }
    );
};

export const createFaceLandmarker = async () => {
    const { vision } = await loadVision();
    return create(vision.FaceLandmarker, `${MODELS}/face_landmarker/face_landmarker/float16/1/face_landmarker.task`, {
        numFaces: 1,
        outputFaceBlendshapes: true
    });
};

export function createCamera(video) {
    let stream = null;
    let users = 0;
    return {
        async start() {
            users++;
            if (stream) return;
            stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
                audio: false
            });
            video.muted = true;
            video.srcObject = stream;
            await video.play();
        },
        stop() {
            users = Math.max(0, users - 1);
            if (users || !stream) return;
            stream.getTracks().forEach(track => track.stop());
            stream = null;
            video.srcObject = null;
        }
    };
}

export function everyFrame(video, step) {
    let id = 0;
    let last = -1;
    const tick = () => {
        if (video.readyState >= 2 && video.currentTime !== last) {
            last = video.currentTime;
            step(performance.now());
        }
        id = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(id);
}
