export class InputHandler {
    constructor() {
        this.keys = {};
        this.down = {};
        this.pressed = {};

        this.actions = {
            LEFT: ['ArrowLeft', 'KeyA'],
            RIGHT: ['ArrowRight', 'KeyD'],
            JUMP: ['Space', 'ArrowUp', 'KeyW'],
            PAUSE: ['KeyP', 'Escape'],
            THEME: ['KeyT']
        };

        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));
    }

    onKeyDown(e) {
        // [FIX] Ignore keys if user is typing in an input field
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        if (!this.keys[e.code]) {
            this.pressed[e.code] = true; // Set pressed only on new keydown
        }
        this.keys[e.code] = true;
    }

    onKeyUp(e) {
        this.keys[e.code] = false;
        this.down[e.code] = false; // Reset down state logic if needed
    }

    isDown(actionName) {
        const codes = this.actions[actionName];
        if (!codes) return false;
        return codes.some(code => this.keys[code]);
    }

    isPressed(actionName) {
        const codes = this.actions[actionName];
        if (!codes) return false;
        // Check if any key for this action was pressed THIS FRAME
        // We need to track 'pressed' state which is cleared after reading or frame update
        // Simple approach: check this.keys[code] AND !this.down[code] (if we tracked prev state)
        // OR: just rely on keydown setting a 'pressed' flag that we consume.

        for (let code of codes) {
            if (this.pressed[code]) {
                this.pressed[code] = false; // Consume it
                return true;
            }
        }
        return false;
    }
    clearPressed() {
        this.pressed = {};
    }
}
