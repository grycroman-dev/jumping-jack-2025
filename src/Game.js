import { InputHandler } from './utils/InputHandler.js';
import { Floor } from './entities/Floor.js';
import { Jack } from './entities/Jack.js';
import { Enemy } from './entities/Enemy.js';
import { ParticleSystem } from './utils/ParticleSystem.js';
import { SoundManager } from './utils/SoundManager.js';
import { ComboManager } from './utils/ComboManager.js';
import { FloatingTextManager } from './utils/FloatingTextManager.js';
import { PowerUp } from './entities/PowerUp.js';

export class Game {
    constructor(canvas, onlineManager) {
        this.canvas = canvas;
        this.onlineManager = onlineManager;
        this.ctx = canvas.getContext('2d');

        this.lastTime = 0;
        this.accumulatedTime = 0;

        // High Def Resolution
        this.width = 1024;
        this.height = 768;

        this.input = new InputHandler(this);
        this.particles = new ParticleSystem(this);
        this.audio = new SoundManager();
        this.comboManager = new ComboManager(this);
        this.floatingTexts = new FloatingTextManager();

        // Initialize Theme from Storage or Default
        this.theme = localStorage.getItem('jj_theme') || 'dark';
        this.setupMenu();
        // this.setupTheme(); // Merged into setupMenu
        // this.setupHelp(); // Merged into setupMenu
        // this.setupLeaderboard(); // Merged into setupMenu

        this.level = 1;
        this.lives = 3;
        this.score = 0;
        this.level = 1;
        this.lives = 3;
        this.score = 0;
        this.highScore = 0; // Will be updated from Server
        this.syncGlobalHighScore();

        this.enemies = [];
        this.powerUps = [];
        this.lastLifeMilestone = 0; // Track for 750-point extra life spawns
        this.leaderboardPromptShown = false; // Track if we already showed leaderboard prompt
        this.gameState = 'START'; // START, PLAYING, POEM, GAMEOVER

        this.snowflakes = [];
        this.initSnow();

        this.logoImage = new Image();
        this.logoImage.onload = () => { console.log("Logo Loaded"); };
        this.logoImage.onerror = () => { console.error("Logo Failed"); };
        this.logoImage.src = '/logo.png';

        this.timeScale = 1.0; // [NEW] Time Slow
        this.slowTimer = 0;

        this.holeTimer = 0;

        this.initFloors();
        this.initEnemies();

        this.jack = new Jack(this);

        this.poemLines = [
            "A daring explorer named Jack",
            "Once found a peculiar track",
            "There were dangers galore",
            "Even holes in the floor",
            "So he kept falling flat on his back",
            "Quite soon he got used to the place",
            "He could jump to escape from the chase",
            "But without careful thought",
            "His leaps came to nought",
            "And he left with a much wider face"
        ];

        // Screen Shake
        this.shakeTimer = 0;
        this.shakeIntensity = 0;
    }

    updateHighScoreDisplay() {
        const el = document.getElementById('high-score-display');
        if (el) el.innerText = `BEST: ${this.highScore}`;
    }

    syncGlobalHighScore() {
        // Subscribe to top score to update "BEST" display
        this.onlineManager.subscribeToLeaderboard((scores) => {
            this.topScores = scores || []; // Cache for game over check
            if (this.topScores.length > 0) {
                // scores[0] is the highest due to reverse() in OnlineManager
                this.highScore = this.topScores[0].score;
                this.updateHighScoreDisplay();
            }
            // If leaderboard modal is open, refresh it dynamically
            const modal = document.getElementById('leaderboard-modal');
            if (modal && modal.style.display === 'flex') {
                const tbody = document.getElementById('leaderboard-body');
                this.refreshLeaderboard(tbody);
            }
        });
    }

    refreshLeaderboard(tbody) {
        if (!tbody) return;

        if (!this.topScores || this.topScores.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3">No scores yet.</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        // Display only top 10
        const displayScores = this.topScores.slice(0, 10);
        displayScores.forEach((entry, index) => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #333';
            tr.innerHTML = `
                <td style="padding: 10px; color: #FFF;">${index + 1}</td>
                <td style="padding: 10px; color: ${index === 0 ? '#FFFF00' : '#FFF'};">${entry.name}</td>
                <td style="padding: 10px; text-align: right; color: #00FFFF;">${entry.score}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    triggerShake(duration, intensity) {
        this.shakeTimer = duration;
        this.shakeIntensity = intensity;
    }

    // ... (rest of methods until onLifeLost) ...

    onLifeLost() {
        if (this.jack.hasShield) {
            this.jack.hasShield = false;
            this.triggerShake(0.2, 10);
            this.floatingTexts.add("SHIELD BREAK!", this.jack.x, this.jack.y - 30, '#00FFFF');
            // Play Break Sound?
            this.audio.playStun();
            return;
        }

        this.lives--;
        this.comboManager.reset();
        this.triggerShake(0.5, 20); // Big shake on hit
        this.audio.playStun();
        if (this.lives <= 0) {
            console.log("Game Over");
            this.gameState = 'GAMEOVER';

            // Check for Leaderboard Prompt (Top 10 Only)
            // Condition: 
            // 1. Score > 0 AND
            // 2. (Fewer than 10 scores on board OR Score > Lowest Score on board)

            let qualifies = false;
            if (this.score > 0) {
                if (!this.topScores || this.topScores.length < 10) {
                    qualifies = true;
                } else {
                    const lowestTopScore = this.topScores[this.topScores.length - 1].score;
                    if (this.score > lowestTopScore) {
                        qualifies = true;
                    }
                }
            }

            if (qualifies) {
                setTimeout(() => {
                    const modal = document.getElementById('leaderboard-modal');
                    const inputSection = document.getElementById('name-input-section');
                    const tbody = document.getElementById('leaderboard-body');

                    if (modal && inputSection) {
                        modal.style.display = 'flex';
                        inputSection.style.display = 'block'; // Show input
                        this.refreshLeaderboard(tbody);
                    }
                }, 1000);
            }
        }
    }

    setupMenu() {
        // --- DOM ELEMENTS ---
        const menuBtn = document.getElementById('menu-btn');
        const menuModal = document.getElementById('menu-modal');
        const menuCloseBtn = document.getElementById('menu-close-btn');

        const menuResumeBtn = document.getElementById('menu-resume-btn');
        const menuRestartBtn = document.getElementById('menu-restart-btn');
        const menuThemeBtn = document.getElementById('menu-theme-btn');
        const menuSoundCheck = document.getElementById('menu-sound-checkbox');
        const menuHelpBtn = document.getElementById('menu-help-btn');
        const menuLeaderboardBtn = document.getElementById('menu-leaderboard-btn');

        // Help Modal
        const helpModal = document.getElementById('help-modal');
        const closeHelpBtn = document.getElementById('close-help-btn');

        // Leaderboard Modal
        const leaderboardModal = document.getElementById('leaderboard-modal');
        const closeLeaderboardBtn = document.getElementById('close-leaderboard-btn');
        const tbody = document.getElementById('leaderboard-body');
        const inputSection = document.getElementById('name-input-section');
        const submitBtn = document.getElementById('submit-score-btn');
        const nameInput = document.getElementById('player-name-input');

        // --- MENU OPEN/CLOSE ---
        if (menuBtn && menuModal) {
            menuBtn.addEventListener('click', () => {
                menuModal.style.display = 'flex';
                this.isPaused = true;
                menuBtn.blur();
            });
        }
        if (menuCloseBtn) {
            menuCloseBtn.addEventListener('click', () => {
                menuModal.style.display = 'none';
                if (this.gameState !== 'GAMEOVER') this.isPaused = false;
            });
        }
        if (menuResumeBtn) {
            menuResumeBtn.addEventListener('click', () => {
                menuModal.style.display = 'none';
                if (this.gameState !== 'GAMEOVER') this.isPaused = false;
            });
        }
        if (menuRestartBtn) {
            menuRestartBtn.addEventListener('click', () => {
                menuModal.style.display = 'none';
                this.restartGame();
            });
        }

        // --- THEME TOGGLE ---
        this.updateThemeButton(); // Init text
        if (menuThemeBtn) {
            menuThemeBtn.addEventListener('click', () => {
                if (this.theme === 'dark') this.theme = 'light';
                else if (this.theme === 'light') this.theme = 'xmas';
                else this.theme = 'dark';

                localStorage.setItem('jj_theme', this.theme);
                this.updateThemeButton();

                // Update Body Class
                document.body.className = '';
                if (this.theme === 'light') document.body.classList.add('light-mode');
                if (this.theme === 'xmas') document.body.classList.add('xmas-mode');

                if (this.theme === 'xmas') {
                    if (this.snowflakes.length === 0) this.initSnow();
                }
            });
        }

        // --- SOUND TOGGLE ---
        if (menuSoundCheck) {
            const savedSound = localStorage.getItem('jj_sound');
            const isSoundEnabled = (savedSound !== 'false');
            menuSoundCheck.checked = isSoundEnabled;
            this.audio.enabled = isSoundEnabled;

            menuSoundCheck.addEventListener('change', (e) => {
                this.audio.enabled = e.target.checked;
                localStorage.setItem('jj_sound', this.audio.enabled);
                if (this.audio.enabled && this.audio.ctx.state === 'suspended') {
                    this.audio.ctx.resume();
                }
            });
        }

        // --- HELP MODAL ---
        if (menuHelpBtn && helpModal) {
            menuHelpBtn.addEventListener('click', () => {
                helpModal.style.display = 'flex';
                // Menu stays open behind it, or close menu? Let's leave menu open behind or replace. 
                // Better UX: Close menu, show Help.
                menuModal.style.display = 'none';
            });
        }
        if (closeHelpBtn) {
            closeHelpBtn.addEventListener('click', () => {
                helpModal.style.display = 'none';
                // Return to Gameplay or Menu? Return to Menu is nicer.
                menuModal.style.display = 'flex';
            });
        }

        // --- LEADERBOARD ---
        if (menuLeaderboardBtn && leaderboardModal) {
            menuLeaderboardBtn.addEventListener('click', () => {
                leaderboardModal.style.display = 'flex';
                inputSection.style.display = 'none';
                menuModal.style.display = 'none';
                this.refreshLeaderboard(tbody);
            });
        }
        if (closeLeaderboardBtn) {
            closeLeaderboardBtn.addEventListener('click', () => {
                leaderboardModal.style.display = 'none';
                // Return to Menu
                menuModal.style.display = 'flex';
            });
        }

        // --- LEADERBOARD SUBMIT ---
        if (submitBtn && nameInput) {
            submitBtn.addEventListener('click', () => {
                const name = nameInput.value.trim().toUpperCase() || 'ANONYMOUS';

                const inputForm = document.getElementById('name-input-form');
                const successMsg = document.getElementById('submit-success-message');
                const errorMsg = document.getElementById('submit-error-message');

                this.onlineManager.saveScore(name, this.score)
                    .then(() => {
                        inputForm.style.display = 'none';
                        successMsg.style.display = 'block';
                        errorMsg.style.display = 'none';
                        setTimeout(() => this.refreshLeaderboard(tbody), 1000);
                    })
                    .catch((error) => {
                        console.error('Submit failed:', error);
                        inputForm.style.display = 'none';
                        successMsg.style.display = 'none';
                        errorMsg.style.display = 'block';
                    });
            });
        }
    }

    updateThemeButton() {
        const btn = document.getElementById('menu-theme-btn');
        if (!btn) return;

        btn.textContent = `THEME: ${this.theme.toUpperCase()}`;
        if (this.theme === 'dark') {
            btn.style.color = '#00FFFF';
            btn.style.borderColor = '#00FFFF';
        } else if (this.theme === 'light') {
            btn.style.color = '#FFFFFF';
            btn.style.borderColor = '#FFFFFF';
        } else {
            btn.style.color = '#FF0000'; // Xmas
            btn.style.borderColor = '#00FF00';
        }
    }




    getThemeColors() {
        if (this.theme === 'light') {
            return {
                bg: '#FFFFFF',
                grid: '#DDDDDD',
                text: '#000000',
                floor: '#333333',
                jack: '#0000FF',
                enemy: '#CC0000'
            };
        }
        if (this.theme === 'xmas') {
            return {
                bg: '#051f20', // Dark Greenish Night
                grid: '#165b33', // Green
                text: '#f8b229', // Gold
                floor: '#bb2528', // Red
                jack: '#ff0000', // Red (Santa)
                enemy: '#f8b229'  // Gold
            };
        }
        return {
            bg: '#0a0a10',
            grid: '#1e1e2e',
            text: '#00FFFF',
            floor: '#00FF00',
            jack: '#00FFFF',
            enemy: '#FF00FF'
        };
    }

    initEnemies() {
        this.enemies = [];
        this.powerUps = []; // Reset powerups
        if (this.level > 1) {
            for (let i = 0; i < this.level - 1; i++) {
                const floorIdx = Math.floor(Math.random() * 8);
                const floorY = this.floors[floorIdx].y;
                this.enemies.push(new Enemy(this, floorY));
            }
        }
    }

    initFloors() {
        this.floors = [];
        for (let i = 0; i < 8; i++) {
            this.floors.push(new Floor(this, i));
        }
    }

    start() {
        this.lastTime = performance.now();
        requestAnimationFrame((time) => this.loop(time));
    }

    loop(currentTime) {
        let dt = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        // Apply Time Scale
        dt *= this.timeScale;

        this.update(dt);
        this.draw();

        requestAnimationFrame((time) => this.loop(time));
    }

    update(dt) {
        // Global Shake Update (Independent of Game State)
        if (this.shakeTimer > 0) {
            this.shakeTimer -= dt;
            if (this.shakeTimer < 0) this.shakeTimer = 0;
        }

        // Update Floors
        for (let floor of this.floors) {
            floor.update(dt);
        }

        // Update Enemies
        // Update Enemies
        for (let enemy of this.enemies) {
            enemy.update(dt);
        }

        // Update Jack Logic based on State
        if (this.gameState === 'START') {
            if (this.input.isDown('JUMP')) {
                this.gameState = 'PLAYING';
                this.audio.playWin(); // Start sound
            }
            return;
        }

        if (this.gameState === 'PLAYING') {
            if (this.input.isPressed('PAUSE')) {
                this.gameState = 'PAUSED';
                return; // Skip update
            }
            // Theme Toggle (T Key)
            if (this.input.isPressed('THEME')) {
                if (this.theme === 'dark') this.theme = 'light';
                else if (this.theme === 'light') this.theme = 'xmas';
                else this.theme = 'dark';

                localStorage.setItem('jj_theme', this.theme);
                this.updateThemeButton();

                // Update Body Class
                document.body.className = '';
                if (this.theme === 'light') document.body.classList.add('light-mode');
                if (this.theme === 'xmas') document.body.classList.add('xmas-mode');

                if (this.theme === 'xmas') {
                    if (this.snowflakes.length === 0) this.initSnow();
                }
            }
            this.jack.update(dt);
        } else if (this.gameState === 'PAUSED') {
            if (this.input.isPressed('PAUSE')) {
                this.gameState = 'PLAYING';
            }
            return; // Don't update game
        } else if (this.gameState === 'POEM') {
            if (this.input.isDown('JUMP')) {
                this.nextLevel();
            }
        } else if (this.gameState === 'GAMEOVER') {
            if (this.input.isDown('JUMP')) {
                this.restartGame();
            }
        } else if (this.gameState === 'VICTORY') {
            if (this.input.isDown('JUMP')) {
                // Only show leaderboard prompt once
                if (!this.leaderboardPromptShown) {
                    this.leaderboardPromptShown = true;
                    // Check if score qualifies for leaderboard
                    this.checkLeaderboardQualification();
                    // If they don't qualify, restart immediately
                    const qualifies = this.score > 0 &&
                        (!this.topScores || this.topScores.length < 10 ||
                            this.score >= this.topScores[this.topScores.length - 1].score);
                    if (!qualifies) {
                        this.restartGame();
                    }
                } else {
                    // Already showed prompt, just restart
                    this.restartGame();
                }
            }
        }

        // Periodic Hole Generation (SLOWED DOWN)
        if (this.gameState === 'PLAYING') {
            this.holeTimer += dt;
            if (this.holeTimer > 8.0) { // Every 8s instead of 3s
                this.addHole();
                this.holeTimer = 0;
            }
        }

        this.particles.update(dt);
        this.comboManager.update(dt);
        this.floatingTexts.update(dt);

        // Update PowerUps
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            let p = this.powerUps[i];
            p.update(dt);
            // Collision with Jack
            if (this.checkCollision(this.jack, p)) {
                this.collectPowerUp(p);
                this.powerUps.splice(i, 1);
            }
        }

        // Time Slow Decay
        if (this.slowTimer > 0) {
            this.slowTimer -= dt / this.timeScale; // Real time decrement roughly
            if (this.slowTimer <= 0) {
                this.timeScale = 1.0;
                this.slowTimer = 0;
            }
        }
    }

    checkCollision(rect1, rect2) {
        return (
            rect1.x < rect2.x + rect2.width &&
            rect1.x + rect1.width > rect2.x &&
            rect1.y < rect2.y + rect2.height &&
            rect1.y + rect1.height > rect2.y
        );
    }

    collectPowerUp(p) {
        if (p.type === 'SHIELD') {
            this.jack.hasShield = true;
            this.floatingTexts.add("SHIELD!", this.jack.x, this.jack.y - 30, '#00FFFF');
            this.audio.playWin(); // Placeholder
        } else if (p.type === 'TIME') {
            this.timeScale = 0.5;
            this.slowTimer = 5.0; // 5 seconds of slow mo
            this.floatingTexts.add("SLOW MO!", this.jack.x, this.jack.y - 30, '#FFFF00');
            this.audio.playWin();
        } else if (p.type === 'EXTRA_LIFE') {
            if (this.lives < 6) {
                this.lives++;
                this.floatingTexts.add("+1 LIFE", this.jack.x, this.jack.y - 30, '#00FF00');
                this.particles.emit(this.jack.x + this.jack.width / 2, this.jack.y, '#FF0055', 20, 150, 0.8);
                this.audio.playWin();
            } else {
                // At max lives, still show feedback but don't increase
                this.floatingTexts.add("MAX LIVES!", this.jack.x, this.jack.y - 30, '#FFAA00');
            }
        }
    }

    draw() {
        const colors = this.getThemeColors();

        // Screen Shake Effect
        this.ctx.save();
        if (this.shakeTimer > 0) {
            const dx = (Math.random() - 0.5) * this.shakeIntensity;
            const dy = (Math.random() - 0.5) * this.shakeIntensity;
            this.ctx.translate(dx, dy);
        }

        // Clear screen
        this.ctx.fillStyle = colors.bg;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Draw Grid Background
        this.ctx.save();
        if (this.theme === 'xmas') {
            this.drawTrees(this.ctx);
        } else {
            this.drawGrid(colors.grid);
        }
        this.ctx.restore();

        // Draw Floors
        for (let floor of this.floors) {
            floor.draw(this.ctx);
        }

        // Draw Enemies
        for (let enemy of this.enemies) {
            enemy.draw(this.ctx);
        }

        // Draw PowerUps
        for (let p of this.powerUps) {
            p.draw(this.ctx);
        }

        // Draw Particles
        this.particles.draw(this.ctx);

        if (this.theme === 'xmas') {
            this.drawSnow(this.ctx);
        }

        if (this.gameState === 'START') {
            this.drawStart();
        } else if (this.gameState === 'PLAYING') {
            this.jack.draw(this.ctx);
        } else if (this.gameState === 'POEM') {
            this.drawPoem();
        } else if (this.gameState === 'GAMEOVER') {
            this.drawGameOver();
        } else if (this.gameState === 'VICTORY') {
            this.drawVictory();
        } else if (this.gameState === 'PAUSED') {
            this.jack.draw(this.ctx); // Draw game frozen
            this.drawPaused();
        }

        // Floating Texts & Combo
        this.comboManager.draw(this.ctx);
        this.floatingTexts.draw(this.ctx);

        // HUD
        this.ctx.fillStyle = colors.text;
        this.ctx.font = "20px 'Orbitron'";
        this.ctx.shadowBlur = 0;
        this.ctx.fillText(`LEVEL: ${this.level}  LIVES: ${this.lives}  SCORE: ${this.score}`, 20, 30);

        this.ctx.restore(); // Restore Shake
    }

    drawGrid(color) {
        this.ctx.save();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        for (let x = 0; x < this.width; x += 50) {
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.height);
        }
        for (let y = 0; y < this.height; y += 50) {
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
        }
        this.ctx.stroke();
        this.ctx.restore();
    }

    onLevelComplete() {
        this.gameState = 'POEM';
        this.audio.playWin();
    }

    nextLevel() {
        if (this.gameState !== 'POEM') return;

        // Check if player completed all 10 levels
        if (this.level >= 10) {
            this.gameState = 'VICTORY';
            this.audio.playWin();
            // Don't check leaderboard yet - let player see VICTORY screen first
            return;
        }

        this.level++;
        this.initFloors();
        this.initEnemies();
        this.jack.reset();
        this.jack.y = this.height - 96;
        this.gameState = 'PLAYING';
    }

    restartGame() {
        this.level = 1;
        this.lives = 3;
        this.score = 0;
        this.initFloors();
        this.initEnemies();
        this.jack.reset();
        this.jack.y = this.height - 96;
        this.gameState = 'PLAYING';
    }

    drawStart() {
        // Overlay
        this.ctx.fillStyle = 'rgba(0,0,0,1.0)';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Draw Logo
        if (this.logoImage.complete && this.logoImage.naturalWidth > 0) {
            const size = 300;
            this.ctx.drawImage(this.logoImage, this.width / 2 - size / 2, this.height / 2 - 200, size, size);
        }

        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = '#00FFFF';
        this.ctx.fillStyle = '#00FFFF';
        this.ctx.font = "30px 'Orbitron'";
        this.ctx.textAlign = 'center';
        this.ctx.fillText("PRESS [SPACE] TO START", this.width / 2, this.height / 2 + 150);

        this.ctx.shadowBlur = 0;
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = "16px 'Orbitron'";
        this.ctx.fillText("ARROWS to Move   |   [T] to Change Theme", this.width / 2, this.height / 2 + 200);
        this.ctx.textAlign = 'left'; // Reset
    }

    drawPoem() {
        // Overlay
        this.ctx.fillStyle = 'rgba(0,0,0,0.8)';
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = '#FFFF00';
        this.ctx.fillStyle = '#FFFF00';
        this.ctx.font = "24px 'Orbitron'";

        const lineIndex = (this.level - 1) % this.poemLines.length;
        const line = this.poemLines[lineIndex];

        this.ctx.fillText("LEVEL " + this.level + " COMPLETED", 100, 150);

        this.ctx.shadowColor = '#00FFFF';
        this.ctx.fillStyle = '#00FFFF';
        this.ctx.fillText(line, 50, 300);

        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillText("PRESS [JUMP] TO CONTINUE", 100, 500);
        this.ctx.shadowBlur = 0;
    }

    drawGameOver() {
        this.ctx.fillStyle = 'rgba(0,0,0,0.9)';
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = '#FF0055';
        this.ctx.fillStyle = '#FF0055';
        this.ctx.font = "60px 'Orbitron'";
        this.ctx.fillText("GAME OVER", this.width / 2 - 180, this.height / 2 - 50);

        this.ctx.font = "24px 'Orbitron'";
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.shadowBlur = 0;
        this.ctx.fillText("PRESS [JUMP] TO RESTART", this.width / 2 - 160, this.height / 2 + 50);
    }

    drawVictory() {
        this.ctx.fillStyle = 'rgba(0,0,0,0.95)';
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.ctx.shadowBlur = 30;
        this.ctx.shadowColor = '#FFD700';
        this.ctx.fillStyle = '#FFD700';
        this.ctx.font = "60px 'Orbitron'";
        this.ctx.textAlign = 'center';
        this.ctx.fillText("🎉 VICTORY! 🎉", this.width / 2, this.height / 2 - 100);

        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = '#00FFFF';
        this.ctx.fillStyle = '#00FFFF';
        this.ctx.font = "30px 'Orbitron'";
        this.ctx.fillText("YOU COMPLETED ALL 10 LEVELS!", this.width / 2, this.height / 2 - 20);

        this.ctx.font = "24px 'Orbitron'";
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.shadowBlur = 0;
        this.ctx.fillText(`FINAL SCORE: ${this.score}`, this.width / 2, this.height / 2 + 40);

        this.ctx.font = "20px 'Orbitron'";
        this.ctx.fillStyle = '#AAAAAA';
        this.ctx.fillText("PRESS [JUMP] TO PLAY AGAIN", this.width / 2, this.height / 2 + 120);

        this.ctx.textAlign = 'left'; // Reset
    }

    drawPaused() {
        this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = '#FFFFFF';
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = "60px 'Orbitron'";
        this.ctx.fillText("PAUSED", this.width / 2 - 120, this.height / 2);
        this.ctx.shadowBlur = 0;
    }

    onLifeLost() {
        if (this.jack.hasShield) {
            this.jack.hasShield = false;
            this.triggerShake(0.2, 10);
            this.floatingTexts.add("SHIELD BREAK!", this.jack.x, this.jack.y - 30, '#00FFFF');
            // Play Break Sound?
            this.audio.playStun();
            return;
        }

        this.lives--;
        this.comboManager.reset();
        this.triggerShake(0.5, 20); // Big shake on hit
        this.audio.playStun();
        if (this.lives <= 0) {
            this.gameState = 'GAMEOVER';
            this.checkLeaderboardQualification();
        }
    }

    checkLeaderboardQualification() {
        // Check for Leaderboard Prompt (Top 10 Only)
        let qualifies = false;
        if (this.score > 0) {
            if (!this.topScores || this.topScores.length < 10) {
                // Board not full, you qualify!
                qualifies = true;
            } else {
                // Board full, beat the last guy?
                const lowestTopScore = this.topScores[this.topScores.length - 1].score;
                if (this.score >= lowestTopScore) {
                    qualifies = true;
                }
            }
        }

        if (qualifies) {
            setTimeout(() => {
                const modal = document.getElementById('leaderboard-modal');
                const inputSection = document.getElementById('name-input-section');
                const tbody = document.getElementById('leaderboard-body');

                // Reset form state
                const inputForm = document.getElementById('name-input-form');
                const successMsg = document.getElementById('submit-success-message');
                const errorMsg = document.getElementById('submit-error-message');
                const nameInput = document.getElementById('player-name-input');

                if (modal && inputSection) {
                    // Reset to initial state
                    inputForm.style.display = 'block';
                    successMsg.style.display = 'none';
                    errorMsg.style.display = 'none';
                    nameInput.value = ''; // Clear input

                    modal.style.display = 'flex';
                    inputSection.style.display = 'block'; // Show input
                    this.refreshLeaderboard(tbody);
                }
            }, 1000);
        }
    }

    addHole() {
        const floorIndex = Math.floor(Math.random() * this.floors.length);
        this.floors[floorIndex].addHole();

        // Chance to spawn PowerUp (15%)
        if (Math.random() < 0.15) {
            const roll = Math.random();
            let type;
            if (roll < 0.05) {
                // 5% chance for EXTRA_LIFE (out of 15% spawn chance = ~0.75% overall)
                type = 'EXTRA_LIFE';
            } else if (roll < 0.525) {
                // ~47.5% of spawns = SHIELD
                type = 'SHIELD';
            } else {
                // ~47.5% of spawns = TIME
                type = 'TIME';
            }
            const px = Math.random() * (this.width - 50);
            const py = Math.random() * (this.height - 200) + 100;
            this.powerUps.push(new PowerUp(this, px, py, type));
        }
    }

    spawnExtraLife() {
        // Spawn EXTRA_LIFE power-up at milestone (750 points)
        const px = Math.random() * (this.width - 50);
        const py = Math.random() * (this.height - 200) + 100;
        this.powerUps.push(new PowerUp(this, px, py, 'EXTRA_LIFE'));

        // Visual/audio feedback for milestone
        this.floatingTexts.add("750 POINTS! +LIFE", this.width / 2, 100, '#FF0055');
        this.audio.playWin();
    }

    initSnow() {
        for (let i = 0; i < 100; i++) {
            this.snowflakes.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                radius: Math.random() * 2 + 1,
                speed: Math.random() * 50 + 20
            });
        }
    }

    updateSnow(dt) {
        for (let flake of this.snowflakes) {
            flake.y += flake.speed * dt;
            if (flake.y > this.height) {
                flake.y = -10;
                flake.x = Math.random() * this.width;
            }
        }
    }

    drawSnow(ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        for (let flake of this.snowflakes) {
            ctx.moveTo(flake.x, flake.y);
            ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
        }
        ctx.fill();
    }

    drawTrees(ctx) {
        // Draw some background trees
        ctx.fillStyle = '#114422';
        for (let i = 0; i < 5; i++) {
            const x = 100 + i * 200;
            const y = this.height;
            const w = 100;
            const h = 300;

            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + w / 2, y - h);
            ctx.lineTo(x + w, y);
            ctx.fill();
        }
    }
}
