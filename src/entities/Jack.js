export class Jack {
    constructor(game) {
        this.game = game;
        this.width = 48;
        this.height = 64;

        this.x = game.width / 2;
        // Floor 7 Y is 756. Jack height 64. 756 - 64 = 692.
        this.y = 692; // Safely grounded on bottom floor

        this.vx = 0;
        this.vy = 0;

        this.speed = 300;
        this.jumpForce = -900;
        this.gravity = 2500;

        this.isGrounded = false;
        this.stunnedTimer = 0;
        this.currentFloorIndex = -1;
        this.lastGroundedFloorIndex = -1; // [NEW] Track last stable floor to prevent combo spam
        this.stepTimer = 0; // For sound steps
    }

    update(dt) {
        if (this.stunnedTimer > 0) {
            this.stunnedTimer -= dt;
            // Apply gravity while stunned
            this.vy += this.gravity * dt;
            this.y += this.vy * dt;
            this.checkCollisions(dt);
            return;
        }

        const input = this.game.input;

        // Horizontal Movement
        if (input.isDown('LEFT')) {
            this.vx = -this.speed;
        } else if (input.isDown('RIGHT')) {
            this.vx = this.speed;
        } else {
            this.vx = 0;
        }

        // Walking Sound
        if (this.isGrounded && this.vx !== 0) {
            this.stepTimer += dt;
            if (this.stepTimer > 0.15) { // Faster steps matches animation better
                this.game.audio.playStep();
                this.stepTimer = 0;
            }
        } else {
            this.stepTimer = 0.2; // Ready to step immediately on move
        }

        // Jumping
        if (this.isGrounded && input.isDown('JUMP')) {
            this.vy = this.jumpForce;
            this.isGrounded = false;
            // Particle effect
            this.game.particles.emitDust(this.x + this.width / 2, this.y + this.height);
            this.game.audio.playJump();
        }

        // Apply Gravity
        this.vy += this.gravity * dt;

        // Apply Velocity
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Screen Borders
        if (this.x < 0) this.x = this.game.width;
        if (this.x > this.game.width) this.x = 0;

        // Floor Collisions
        this.checkCollisions(dt);

        // Check for hole passing
        this.checkPassingThrough();

        // Win Condition
        if (this.y < 0) {
            this.game.onLevelComplete();
        }
    }

    checkCollisions(dt) {
        this.isGrounded = false;

        for (let floor of this.game.floors) {
            // Check landing
            if (this.vy >= 0) {
                if (this.y + this.height > floor.y && this.y + this.height < floor.y + floor.height + 20) {
                    if (!this.isInHole(floor)) {
                        this.y = floor.y - this.height;
                        if (this.vy > 500) { // Impact dust
                            this.game.particles.emitDust(this.x + this.width / 2, this.y + this.height);
                            this.game.audio.playLand();
                            // Small shake on land
                            if (this.vy > 500) this.game.triggerShake(0.1, 5);
                        }
                        this.vy = 0;
                        this.isGrounded = true;

                        // [NEW] Check for Score/Combo on Landing
                        const landedFloorIndex = Math.floor((this.y + this.height / 2) / 96);

                        // If we have a valid last floor, and we landed on a HIGHER floor (lower index)
                        if (this.lastGroundedFloorIndex !== -1 && landedFloorIndex < this.lastGroundedFloorIndex) {
                            // Detect floor change (upward)
                            this.game.addHole();

                            // Score with Combo
                            this.game.comboManager.addCombo();
                            const points = 10 * this.game.comboManager.multiplier;
                            const oldScore = this.game.score;
                            this.game.score += points;

                            // Check for 750-point milestone (extra life spawn)
                            const oldMilestone = Math.floor(oldScore / 750);
                            const newMilestone = Math.floor(this.game.score / 750);
                            if (newMilestone > oldMilestone) {
                                // Crossed a 750-point threshold!
                                this.game.spawnExtraLife();
                            }

                            // Visual Popup
                            this.game.floatingTexts.add(`+${points}`, this.x + this.width / 2, this.y, '#00FF00');
                        }

                        // Update last grounded floor
                        this.lastGroundedFloorIndex = landedFloorIndex;
                    }
                }
            } else {
                // Check bonking head (moving up)
                if (this.y < floor.y + floor.height && this.y > floor.y - 20) {
                    if (!this.isInHole(floor)) {
                        this.y = floor.y + floor.height;
                        this.vy = 0; // Stop moving up
                    }
                }
            }
        }

        // Check Bottom Screen
        if (this.y > this.game.height) {
            this.game.onLifeLost();
            this.reset();
        }
    }

    isInHole(floor) {
        const cx = this.x + this.width / 2;
        for (let hole of floor.holes) {
            if (cx >= hole.x && cx <= hole.x + hole.width) {
                return true;
            }
        }
        return false;
    }

    checkPassingThrough() {
        const cy = this.y + this.height / 2;
        const newFloorIndex = Math.floor(cy / 96);

        // Just track the floor index
        this.currentFloorIndex = newFloorIndex;
    }

    reset() {
        this.x = this.game.width / 2;
        this.y = 692; // Safely grounded
        this.vx = 0;

        this.vy = 0;
        this.isGrounded = false;
        this.stunnedTimer = 0;
        this.currentFloorIndex = -1;
        this.lastGroundedFloorIndex = -1;

        // this.game.onLifeLost();
        this.game.particles.emit(this.x, this.y, '#FF0000', 30, 200, 1.0); // Death explosion
    }

    stun() {
        if (this.stunnedTimer > 0) return;
        this.stunnedTimer = 1.0;
        this.vy = -200; // Small hop
        this.vx = 0;
        this.game.particles.emit(this.x + this.width / 2, this.y, '#FFFF00', 10); // Stun stars
        this.game.audio.playStun();
    }

    draw(ctx) {
        // Humanoid Jack High Def
        const cx = this.x + this.width / 2;
        const colors = this.game.getThemeColors();

        ctx.shadowBlur = this.game.theme === 'dark' ? 15 : 0;
        const baseColor = this.stunnedTimer > 0 ? '#FF0055' : colors.jack;
        ctx.shadowColor = baseColor;
        ctx.fillStyle = baseColor;
        ctx.strokeStyle = baseColor;
        ctx.lineWidth = 3;

        // Shield Visual
        if (this.hasShield) {
            ctx.save();
            ctx.strokeStyle = '#00FFFF';
            ctx.lineWidth = 2;
            const shieldScale = 1.0 + Math.sin(Date.now() / 200) * 0.1;
            ctx.beginPath();
            ctx.arc(cx, this.y + 32, 40 * shieldScale, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = 'rgba(0, 255, 255, 0.2)';
            ctx.fill();
            ctx.restore();
        }

        // Animate
        const time = Date.now() / 150;

        // Direction facing (1 = right, -1 = left)
        if (this.vx > 0) this.facing = 1;
        if (this.vx < 0) this.facing = -1;
        if (!this.facing) this.facing = 1;

        // Head
        ctx.beginPath();
        ctx.arc(cx, this.y + 12, 10, 0, Math.PI * 2);
        ctx.fill();

        // Face (Eyes & Mouth) - drawn in background color (e.g. black) to "cut out"
        // Face (Eyes & Mouth) - drawn in background color (e.g. black) to "cut out"
        // IMPROVEMENT: Use high contrast colors and thicker lines
        // User Request: Dark Mode -> Black features (on Cyan body). Light Mode -> White features (on Dark Blue body).
        ctx.fillStyle = this.game.theme === 'light' ? '#FFFFFF' : '#000000';
        ctx.strokeStyle = this.game.theme === 'light' ? '#FFFFFF' : '#000000';
        ctx.lineWidth = 2; // Thicker face features
        ctx.shadowBlur = 0;

        // Eyes
        const eyeOffset = 4 * this.facing;
        ctx.beginPath();
        // Left eye relative to face
        ctx.arc(cx + eyeOffset - 3, this.y + 10, 1.5, 0, Math.PI * 2);
        // Right eye
        ctx.arc(cx + eyeOffset + 3, this.y + 10, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Mouth (Expression)
        ctx.beginPath();
        if (this.stunnedTimer > 0 || this.game.lives <= 0) {
            // Grimace (Frown)
            ctx.arc(cx + eyeOffset, this.y + 20, 3, Math.PI, 0);
        } else if (this.vy < 0) {
            // Open mouth jump (excited/effort)
            ctx.arc(cx + eyeOffset, this.y + 16, 2, 0, Math.PI * 2);
        } else if (this.vy > 0 && !this.isGrounded) {
            // Falling (O face / worried)
            ctx.arc(cx + eyeOffset, this.y + 16, 3, 0, Math.PI * 2);
        } else {
            // Smile (Normal)
            ctx.arc(cx + eyeOffset, this.y + 15, 3, 0, Math.PI, false);
        }
        ctx.stroke();

        // [THEME] Sunglasses for O'Neill
        if (this.game.theme === 'stargate') {
            ctx.fillStyle = '#111111';
            // Draw sunglasses over eyes
            // Left lens
            ctx.beginPath();
            ctx.rect(cx + eyeOffset - 6, this.y + 8, 5, 3);
            ctx.rect(cx + eyeOffset + 1, this.y + 8, 5, 3);
            // Bridge
            ctx.rect(cx + eyeOffset - 1, this.y + 9, 2, 1);
            ctx.fill();
        }


        // Restore color
        ctx.shadowBlur = this.game.theme === 'dark' ? 15 : 0;
        ctx.fillStyle = baseColor;
        ctx.strokeStyle = baseColor;

        // Body
        ctx.beginPath();
        const bodyBottom = this.y + 45;
        ctx.moveTo(cx, this.y + 22);
        ctx.lineTo(cx, bodyBottom);
        ctx.stroke();

        // Arms
        ctx.beginPath();
        const shoulderY = this.y + 28;
        // Animated Arms
        const armCycle = this.vx !== 0 ? Math.sin(time) : 0;

        // Front Arm (based on facing)
        ctx.moveTo(cx, shoulderY);
        let armAngleF = this.vy !== 0 ? -2.5 : (Math.cos(time) * (this.vx !== 0 ? 1 : 0));
        // Simple IK-ish lines
        ctx.lineTo(cx + Math.sin(armAngleF) * 15 + (10 * this.facing), shoulderY + Math.cos(armAngleF) * 15);

        // Back Arm
        ctx.moveTo(cx, shoulderY);
        let armAngleB = this.vy !== 0 ? 2.5 : (-Math.cos(time) * (this.vx !== 0 ? 1 : 0));
        ctx.lineTo(cx + Math.sin(armAngleB) * 15 - (10 * this.facing), shoulderY + Math.cos(armAngleB) * 15);

        ctx.stroke();

        // Legs
        ctx.beginPath();
        // Leg Cycle
        const legCycle = this.vx !== 0 ? Math.sin(time * 1.5) : 0;

        // Front Leg
        ctx.moveTo(cx, bodyBottom);
        const legF = this.isGrounded ? legCycle : 0.5;
        ctx.lineTo(cx + (legF * 15 * this.facing), this.y + 64 - (this.vy < 0 ? 10 : 0));

        // Back Leg
        ctx.moveTo(cx, bodyBottom);
        const legB = this.isGrounded ? -legCycle : -0.2;
        ctx.lineTo(cx + (legB * 15 * this.facing), this.y + 64 - (this.vy < 0 ? 5 : 0));
        ctx.stroke();

        // [THEME] Stargate Extras (Cap & P90)
        if (this.game.theme === 'stargate') {
            const headY = this.y + 12; // Center of head

            ctx.save();
            // 1. Military Cap
            ctx.fillStyle = '#3b4d3b'; // Darker Olive
            ctx.beginPath();
            // Cap top
            ctx.fillRect(cx - 9, headY - 14, 18, 6);
            // Cap bill/visor
            ctx.fillStyle = '#1a261a'; // Dark brim
            ctx.beginPath();
            if (this.facing === 1) {
                ctx.rect(cx - 9, headY - 9, 22, 3); // Extending right
            } else {
                ctx.rect(cx - 13, headY - 9, 22, 3); // Extending left
            }
            ctx.fill();

            ctx.restore();
        }

        // Santa Hat
        if (this.game.theme === 'xmas') {
            const headY = this.y + 10;
            ctx.save();
            ctx.fillStyle = '#FF0000';
            ctx.beginPath();
            ctx.moveTo(cx - 15, headY - 10);
            ctx.lineTo(cx + 15, headY - 10);
            ctx.lineTo(cx, headY - 40);
            ctx.fill();

            // Pom pom
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(cx, headY - 40, 5, 0, Math.PI * 2);
            ctx.fill();

            // Trim
            ctx.beginPath();
            ctx.rect(cx - 16, headY - 10, 32, 6);
            ctx.fill();
            ctx.restore();
        }

    }
}
