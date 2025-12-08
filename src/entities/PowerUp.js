export class PowerUp {
    constructor(game, x, y, type) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.type = type; // 'SHIELD', 'TIME_SLOW', 'EXTRA_LIFE'
        this.width = 32;
        this.height = 32;
        this.active = true;
        this.floatTimer = 0;
    }

    update(dt) {
        // Float animation
        this.floatTimer += dt * 4;
        this.y += Math.sin(this.floatTimer) * 0.5;

        // Despawn if off screen top (floors move up? wait no, Jack moves, floors move relative? 
        // Actually floors move up in this game logic? No, Jack stops on them.
        // Wait, floors move *up* as game progresses? 
        // In this game: Floors wrap around. Holes move horizontally.
        // So PowerUp should probably ride on a Floor or float in space.
        // Let's make it float in space for now, but if it goes off screen it's gone?
        // Actually floors stay fixed Y, holes move X. Jack moves X/Y.
        // So PowerUps should probably just sit there?
    }

    draw(ctx) {
        if (!this.active) return;

        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);

        const scale = 1.0 + Math.sin(this.floatTimer) * 0.2;
        ctx.scale(scale, scale);

        if (this.game.theme === 'xmas') {
            // Draw visual as Gift
            ctx.fillStyle = this.type === 'SHIELD' ? '#FF0000' : '#FFD700'; // Red or Gold
            ctx.fillRect(-15, -15, 30, 30);

            // Ribbon
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(-5, -15, 10, 30);
            ctx.fillRect(-15, -5, 30, 10);

            // Text
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 16px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.type === 'SHIELD' ? 'S' : 'T', 0, 0);

        } else if (this.type === 'SHIELD') {
            ctx.fillStyle = '#00FFFF';
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // Icon S
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 20px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('S', 0, 1);
        } else if (this.type === 'TIME') {
            ctx.fillStyle = '#FFFF00';
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.rect(-12, -12, 24, 24);
            ctx.fill();
            ctx.stroke();
            // Icon T
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 20px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('T', 0, 1);
        } else if (this.type === 'EXTRA_LIFE') {
            // Heart shape
            const glowIntensity = 10 + Math.sin(this.floatTimer * 2) * 5;
            ctx.shadowBlur = glowIntensity;
            ctx.shadowColor = '#FF0055';
            ctx.fillStyle = '#FF0055';

            // Draw heart using two circles and a triangle
            ctx.beginPath();
            // Left circle
            ctx.arc(-6, -4, 8, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            // Right circle
            ctx.arc(6, -4, 8, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            // Triangle bottom
            ctx.moveTo(-12, 0);
            ctx.lineTo(0, 12);
            ctx.lineTo(12, 0);
            ctx.closePath();
            ctx.fill();

            ctx.shadowBlur = 0;
        }

        ctx.restore();
    }
}
