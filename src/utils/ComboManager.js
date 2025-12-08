export class ComboManager {
    constructor(game) {
        this.game = game;
        this.comboCount = 0;
        this.multiplier = 1;
        this.timer = 0;
        this.maxTimer = 2.0; // Seconds to keep combo alive
    }

    addCombo(amount = 1) {
        this.comboCount += amount;
        this.timer = this.maxTimer;

        // Calculate Multiplier logic
        this.multiplier = 1 + Math.floor(this.comboCount / 5) * 0.5;

        // Visual Feedback
        const headX = this.game.jack.x + this.game.jack.width / 2;
        const headY = this.game.jack.y;
        this.game.floatingTexts.add(`x${this.comboCount}`, headX, headY, '#FFFF00');

        // Play sound (pitch modulated by combo?)
        // this.game.audio.playCombo(this.comboCount);
    }

    reset() {
        if (this.comboCount > 5) {
            this.game.floatingTexts.add("COMBO LOST", this.game.jack.x, this.game.jack.y - 20, '#FF0000');
        }
        this.comboCount = 0;
        this.multiplier = 1;
    }

    update(dt) {
        if (this.comboCount > 0) {
            this.timer -= dt;
            if (this.timer <= 0) {
                this.reset();
            }
        }
    }

    draw(ctx) {
        if (this.comboCount > 1) {
            ctx.fillStyle = '#FFFF00';
            ctx.font = "20px 'Orbitron'";
            ctx.textAlign = "right";
            ctx.fillText(`COMBO x${this.comboCount}`, this.game.width - 20, 70);

            // Timer bar?
            ctx.fillStyle = '#FF0000';
            const barWidth = 100 * (this.timer / this.maxTimer);
            ctx.fillRect(this.game.width - 120, 80, barWidth, 5);

            ctx.textAlign = "left"; // Reset for other draws
        }
    }
}
