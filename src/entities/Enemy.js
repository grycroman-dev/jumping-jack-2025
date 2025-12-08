export class Enemy {
    constructor(game, floorY) {
        this.game = game;
        this.width = 40;
        this.height = 40;
        this.y = floorY - this.height; // Sit on top of floor
        this.x = Math.random() * game.width;

        this.speed = 100 + Math.random() * 80;
        this.direction = Math.random() > 0.5 ? 1 : -1;
    }

    update(dt) {
        this.x += this.speed * this.direction * dt;

        // Bounce off walls
        if (this.x < 0) {
            this.x = 0;
            this.direction = 1;
        }
        if (this.x + this.width > this.game.width) {
            this.x = this.game.width - this.width;
            this.direction = -1;
        }

        // Check collision with Jack
        this.checkCollision();
    }

    checkCollision() {
        // Simple AABB
        const j = this.game.jack;
        if (
            this.x < j.x + j.width &&
            this.x + this.width > j.x &&
            this.y < j.y + j.height &&
            this.y + this.height > j.y
        ) {
            j.stun();
        }
    }

    draw(ctx) {
        const colors = this.game.getThemeColors();
        ctx.shadowBlur = this.game.theme === 'dark' ? 20 : 0;
        ctx.shadowColor = colors.enemy;
        ctx.fillStyle = colors.enemy;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;

        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;

        // Pulsate effect
        const scale = 1 + Math.sin(Date.now() / 100) * 0.1;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(scale, scale);

        // Draw Spiked Ball (Enemy)
        ctx.beginPath();
        const spikes = 8;
        const outerRadius = this.width / 2;
        const innerRadius = this.width / 4;

        for (let i = 0; i < spikes; i++) {
            let angle = (Math.PI * 2 * i) / spikes;
            let x = Math.cos(angle) * outerRadius;
            let y = Math.sin(angle) * outerRadius;
            ctx.lineTo(x, y);

            angle = (Math.PI * 2 * (i + 0.5)) / spikes;
            x = Math.cos(angle) * innerRadius;
            y = Math.sin(angle) * innerRadius;
            ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Evil Eyes
        ctx.fillStyle = '#000000'; // Black eyes
        if (this.game.theme === 'dark') ctx.fillStyle = '#FFFFFF'; // White eyes in dark mode

        ctx.beginPath();
        ctx.arc(-8, -4, 4, 0, Math.PI * 2);
        ctx.arc(8, -4, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
        ctx.shadowBlur = 0;
    }
}
