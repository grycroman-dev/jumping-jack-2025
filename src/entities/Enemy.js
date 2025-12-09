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

        if (this.game.theme === 'stargate') {
            this.drawReplicator(ctx, cx, cy, scale);
        } else {
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
        }

        ctx.restore();
    }

    drawReplicator(ctx, cx, cy, scale) {
        // Simple Replicator Bug (Legos)
        // Rectangular body, leg blocks
        ctx.fillStyle = '#CCCCCC'; // Silver/purple tint
        ctx.strokeStyle = '#8888AA';
        ctx.lineWidth = 1;

        // Random jitter for leg movement
        const time = Date.now() / 100;

        // Body Block
        ctx.fillRect(-12, -8, 24, 10);
        ctx.strokeRect(-12, -8, 24, 10);

        // Head Block
        ctx.fillStyle = '#DDDDDD';
        ctx.fillRect(-8, -14, 16, 6);
        ctx.strokeRect(-8, -14, 16, 6);

        // Legs (4 per side-ish)
        ctx.fillStyle = '#AAAAAA';
        for (let i = 0; i < 4; i++) {
            // Left legs
            let legAngle = Math.sin(time + i) * 0.5 + 0.5; // 0 to 1
            ctx.save();
            ctx.translate(-10 + i * 5, 2);
            ctx.rotate(Math.PI / 4 + legAngle * 0.2);
            ctx.fillRect(0, 0, 4, 12);
            ctx.restore();

            // Right legs (visual perspective fail, just draw them)
            // Let's just draw lines for legs, easier
        }

        // Better Legs: just draw angled rectangles
        const legW = 4;
        const legH = 12;

        // Front Left
        ctx.fillRect(-18, 0, legW, legH);
        // Back Left
        ctx.fillRect(-22, -4, legW, legH);

        // Front Right
        ctx.fillRect(14, 0, legW, legH);
        // Back Right
        ctx.fillRect(18, -4, legW, legH);

        // Eyes (Glowing Purple/Red?)
        ctx.fillStyle = '#FF00FF';
        ctx.beginPath();
        ctx.arc(-4, -10, 1.5, 0, Math.PI * 2);
        ctx.arc(4, -10, 1.5, 0, Math.PI * 2);
        ctx.fill();
    }
}
