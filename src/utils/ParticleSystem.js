export class ParticleSystem {
    constructor(game) {
        this.game = game;
        this.particles = [];
    }

    emit(x, y, color, count = 10, speed = 100, life = 0.5) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const velocity = Math.random() * speed;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * velocity,
                vy: Math.sin(angle) * velocity,
                life: life, // seconds
                maxLife: life,
                color: color,
                size: Math.random() * 3 + 1
            });
        }
    }

    // Special emitter for jump/land dust
    emitDust(x, y) {
        this.emit(x, y, '#FFFFFF', 5, 50, 0.3);
    }

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= dt;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            p.x += p.vx * dt;
            p.y += p.vy * dt;

            // Fricton?
            p.vx *= 0.95;
            p.vy *= 0.95;
        }
    }

    draw(ctx) {
        for (let p of this.particles) {
            ctx.globalAlpha = p.life / p.maxLife;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;
    }
}
