export class FloatingTextManager {
    constructor() {
        this.texts = [];
    }

    add(text, x, y, color = '#FFFFFF', duration = 1.0) {
        this.texts.push({
            text, x, y, color, duration, life: duration
        });
    }

    update(dt) {
        for (let i = this.texts.length - 1; i >= 0; i--) {
            const t = this.texts[i];
            t.life -= dt;
            t.y -= 30 * dt; // Float up
            if (t.life <= 0) {
                this.texts.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.font = "bold 16px 'Orbitron', sans-serif";
        ctx.textAlign = "center";
        ctx.shadowBlur = 4;

        for (let t of this.texts) {
            const alpha = t.life / t.duration;
            ctx.fillStyle = t.color;
            ctx.globalAlpha = alpha;
            ctx.shadowColor = t.color;
            ctx.fillText(t.text, t.x, t.y);
        }
        ctx.restore();
    }
}
