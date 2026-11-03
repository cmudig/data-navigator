const SWIPE_PX = 30;
const TAP_PX = 10;
const DOUBLE_TAP_MS = 300;
const LONG_PRESS_MS = 600;

export function startSwipe(surface, { onRule }) {
    const pointers = new Map();
    let start = null;
    let twoFingers = false;
    let lastTap = 0;
    let pressTimer = 0;

    const reset = () => {
        clearTimeout(pressTimer);
        start = null;
        twoFingers = false;
    };

    const down = e => {
        pointers.set(e.pointerId, e);
        surface.setPointerCapture(e.pointerId);
        if (pointers.size === 2) {
            twoFingers = true;
            clearTimeout(pressTimer);
            return;
        }
        if (pointers.size > 2) return reset();
        start = { x: e.clientX, y: e.clientY };
        pressTimer = setTimeout(() => {
            onRule('drill-out');
            start = null;
        }, LONG_PRESS_MS);
    };

    const move = e => {
        if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > TAP_PX) clearTimeout(pressTimer);
    };

    const up = e => {
        pointers.delete(e.pointerId);
        clearTimeout(pressTimer);
        if (pointers.size) return;
        if (twoFingers) {
            onRule('to-browser');
            return reset();
        }
        if (!start) return;
        const dx = e.clientX - start.x;
        const dy = e.clientY - start.y;
        reset();
        if (Math.max(Math.abs(dx), Math.abs(dy)) >= SWIPE_PX) {
            onRule(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
        } else if (e.timeStamp - lastTap < DOUBLE_TAP_MS) {
            lastTap = 0;
            onRule('drill-in');
        } else {
            lastTap = e.timeStamp;
        }
    };

    const cancel = e => {
        pointers.delete(e.pointerId);
        reset();
    };

    surface.classList.add('is-swiping');
    surface.addEventListener('pointerdown', down);
    surface.addEventListener('pointermove', move);
    surface.addEventListener('pointerup', up);
    surface.addEventListener('pointercancel', cancel);

    return () => {
        reset();
        pointers.clear();
        surface.classList.remove('is-swiping');
        surface.removeEventListener('pointerdown', down);
        surface.removeEventListener('pointermove', move);
        surface.removeEventListener('pointerup', up);
        surface.removeEventListener('pointercancel', cancel);
    };
}
