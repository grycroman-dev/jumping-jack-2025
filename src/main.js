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
});
