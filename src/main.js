import './style.css';
import { Game } from './Game.js';
import { OnlineManager } from './utils/OnlineManager.js';

window.addEventListener('load', () => {
  // Init Online Manager
  const onlineManager = new OnlineManager();
  onlineManager.init('online-counter');

  const canvas = document.getElementById('gameCanvas');
  const game = new Game(canvas, onlineManager);
  game.start();

  // --- Touch Controls Setup ---
  const bindTouch = (id, code) => {
    const btn = document.getElementById(id);
    if (!btn) return;

    const setInput = (active) => {
      if (game.input) game.input.setKey(code, active);
    };

    // prevent default to stop scrolling/selection
    const handler = (active) => (e) => {
      e.preventDefault();
      setInput(active);
    };

    btn.addEventListener('touchstart', handler(true), { passive: false });
    btn.addEventListener('touchend', handler(false), { passive: false });
    // Mouse fallbacks for testing
    btn.addEventListener('mousedown', handler(true));
    btn.addEventListener('mouseup', handler(false));
    btn.addEventListener('mouseleave', handler(false));
  };

  bindTouch('btn-left', 'ArrowLeft');
  bindTouch('btn-right', 'ArrowRight');
  bindTouch('btn-jump', 'Space');
});
