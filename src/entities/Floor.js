export class Floor {
    constructor(game, yIndex) {
        this.game = game;
        this.yIndex = yIndex;
        // 8 floors total. Height 768.
        // 768 / 8 = 96 pixels per floor.
        this.height = 12; // Thinner floors (was 32)
        this.y = (yIndex + 1) * 96 - this.height;

        this.holes = [];

        // Reduce speed significantly for Level 1 feel
        // Original was roughly 1px/frame at 256px wide. 
        // 1024width means 4x pixels. So ~60fps * 4 = 240px/s is "fast".
        // Let's start slower. 40 + index*10
        this.speed = (yIndex % 2 === 0 ? 1 : -1) * (40 + yIndex * 15);

        // Initialize with one hole
        this.addHole();

        // SAFE SPAWN LOGIC:
        // If this is the bottom floor (Index 7) where Jack spawns (x ~= 512),
        // ensure there is NO hole near the center.
        if (this.yIndex === 7) {
            this.holes = this.holes.filter(h => {
                const holeCenter = h.x + h.width / 2;
                // Game width 1024. Center is 512. Safe zone 312-712 (Radius 200).
                return Math.abs(holeCenter - 512) > 200;
            });
            // If we removed all holes, maybe add one far away?
            if (this.holes.length === 0) {
                this.holes.push({ x: 100, width: 80 });
            }
        }
    }

    addHole() {
        // Cap holes per floor to avoid impossible/chaotic situations
        if (this.holes.length >= 2) return;

        this.holes.push({
            x: Math.random() * (this.game.width - 80),
            width: 80
        });
    }

    update(dt) {
        // Move holes
        for (let hole of this.holes) {
            hole.x += this.speed * dt;

            // Wrap around
            if (this.speed > 0 && hole.x > this.game.width) {
                hole.x = -hole.width;
            } else if (this.speed < 0 && hole.x + hole.width < 0) {
                hole.x = this.game.width;
            }
        }
    }

    draw(ctx) {
        const colors = this.game.getThemeColors();

        ctx.shadowBlur = this.game.theme === 'dark' ? 10 : 0;
        ctx.shadowColor = colors.floor;
        ctx.fillStyle = colors.floor;

        // robust drawing for multiple holes
        let segments = [{ start: 0, end: this.game.width }];

        for (let hole of this.holes) {
            let nextSegments = [];
            let holeStart = hole.x;
            let holeEnd = hole.x + hole.width;

            // Handle wrapping calculation for the hole "cut"
            let cuts = [];
            if (holeStart < 0) {
                // Hole wraps on left: cut [0, holeEnd] and [width + holeStart, width]
                cuts.push({ s: 0, e: holeEnd });
                cuts.push({ s: this.game.width + holeStart, e: this.game.width });
            } else if (holeEnd > this.game.width) {
                // Hole wraps on right: cut [holeStart, width] and [0, holeEnd - width]
                cuts.push({ s: holeStart, e: this.game.width });
                cuts.push({ s: 0, e: holeEnd - this.game.width });
            } else {
                // Normal hole
                cuts.push({ s: holeStart, e: holeEnd });
            }

            // Apply cuts to current segments
            for (let seg of segments) {
                let currentPieces = [seg];
                for (let cut of cuts) {
                    let newPieces = [];
                    for (let piece of currentPieces) {
                        // precise intersection
                        let cutS = Math.max(piece.start, cut.s);
                        let cutE = Math.min(piece.end, cut.e);

                        if (cutS < cutE) {
                            // Overlap found, split piece
                            if (piece.start < cutS) newPieces.push({ start: piece.start, end: cutS });
                            if (piece.end > cutE) newPieces.push({ start: cutE, end: piece.end });
                        } else {
                            // No overlap, keep piece
                            newPieces.push(piece);
                        }
                    }
                    currentPieces = newPieces;
                }
                nextSegments.push(...currentPieces);
            }
            segments = nextSegments;
        }

        // Draw final segments
        for (let seg of segments) {
            if (seg.end > seg.start) {
                ctx.fillRect(seg.start, this.y, seg.end - seg.start, this.height);
            }
        }
    }
}
