/**
 * Swarm — UI Manager & HUD
 * Manages Title screen, in-game HUD, Level-up Modal, Pause, and Results screens.
 */

import { CREDITS_TEXT } from './constants.js';

export class UIManager {
  constructor(game) {
    this.game = game;

    // DOM Elements
    this.titleScreen = document.getElementById('title-screen');
    this.hud = document.getElementById('hud');
    this.levelupModal = document.getElementById('levelup-modal');
    this.pauseModal = document.getElementById('pause-modal');
    this.resultsModal = document.getElementById('results-modal');

    // HUD Elements
    this.xpFill = document.getElementById('xp-fill');
    this.levelBadge = document.getElementById('level-badge');
    this.timerEl = document.getElementById('hud-timer');
    this.killsEl = document.getElementById('hud-kills');
    this.hpFill = document.getElementById('hp-fill');
    this.hpText = document.getElementById('hp-text');
    this.weaponsBar = document.getElementById('weapons-bar');

    // Modals
    this.cardsContainer = document.getElementById('upgrade-cards');
    this.rerollBtn = document.getElementById('btn-reroll');
    this.skipBtn = document.getElementById('btn-skip');

    this.bindEvents();
  }

  bindEvents() {
    document.getElementById('btn-start-run').addEventListener('click', () => {
      this.game.startRun();
    });

    document.getElementById('btn-stress-test').addEventListener('click', () => {
      this.game.startRun();
      this.game.waveSpawner.spawnStressSwarm(this.game.player, 600);
    });

    document.getElementById('btn-resume').addEventListener('click', () => {
      this.game.togglePause();
    });

    document.getElementById('btn-pause-quit').addEventListener('click', () => {
      this.game.showTitle();
    });

    document.getElementById('btn-restart').addEventListener('click', () => {
      this.game.startRun();
    });

    document.getElementById('btn-results-title').addEventListener('click', () => {
      this.game.showTitle();
    });

    this.rerollBtn.addEventListener('click', () => {
      this.game.rerollUpgrades();
    });

    this.skipBtn.addEventListener('click', () => {
      this.game.skipUpgrades();
    });
  }

  showScreen(screen) {
    this.titleScreen.classList.add('hidden');
    this.hud.classList.add('hidden');
    this.levelupModal.classList.add('hidden');
    this.pauseModal.classList.add('hidden');
    this.resultsModal.classList.add('hidden');

    if (screen === 'title') {
      this.titleScreen.classList.remove('hidden');
    } else if (screen === 'playing') {
      this.hud.classList.remove('hidden');
    } else if (screen === 'levelup') {
      this.hud.classList.remove('hidden');
      this.levelupModal.classList.remove('hidden');
    } else if (screen === 'paused') {
      this.hud.classList.remove('hidden');
      this.pauseModal.classList.remove('hidden');
    } else if (screen === 'results') {
      this.resultsModal.classList.remove('hidden');
    }
  }

  updateHud(player, runTimer, totalKills) {
    // XP Bar
    const pct = Math.min(100, Math.floor((player.xp / player.xpToNext) * 100));
    this.xpFill.style.width = `${pct}%`;
    this.levelBadge.textContent = `LV ${player.level}`;

    // Timer (MM:SS)
    const mins = Math.floor(runTimer / 60);
    const secs = Math.floor(runTimer % 60);
    this.timerEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    // Kills & HP
    this.killsEl.textContent = `${totalKills}`;
    const hpPct = Math.max(0, Math.min(100, Math.floor((player.hp / player.maxHp) * 100)));
    this.hpFill.style.width = `${hpPct}%`;
    this.hpText.textContent = `${Math.ceil(player.hp)} / ${player.maxHp}`;

    // Update bottom-left weapons bar
    this.updateWeaponsBar();
  }

  updateWeaponsBar() {
    const wm = this.game.weaponManager;
    let html = '';
    for (const id in wm.weapons) {
      const w = wm.weapons[id];
      html += `<div class="weapon-slot">
        <span class="w-name">${w.name}</span>
        <span class="w-lvl">L${w.level}</span>
      </div>`;
    }
    this.weaponsBar.innerHTML = html;
  }

  showLevelUp(choices) {
    this.showScreen('levelup');
    this.cardsContainer.innerHTML = '';

    choices.forEach((choice) => {
      const card = document.createElement('div');
      card.className = 'upgrade-card';

      const tagClass = choice.isNew ? 'tag-new' : 'tag-level';
      const tagText = choice.isNew ? 'NEW' : `LVL ${choice.level}`;

      card.innerHTML = `
        <div class="card-header">
          <span class="card-icon">${choice.icon || '⚔️'}</span>
          <span class="card-title">${choice.name}</span>
          <span class="card-tag ${tagClass}">${tagText}</span>
        </div>
        <div class="card-desc">${choice.description}</div>
      `;

      card.addEventListener('click', () => {
        choice.apply();
        this.game.resumeAfterLevelUp();
      });

      this.cardsContainer.appendChild(card);
    });

    const up = this.game.upgradeSystem;
    this.rerollBtn.disabled = up.rerollsRemaining <= 0;
    this.rerollBtn.textContent = `Reroll (${up.rerollsRemaining})`;

    this.skipBtn.disabled = up.skipsRemaining <= 0;
    this.skipBtn.textContent = `Skip (${up.skipsRemaining})`;
  }

  showResults(player, runTimer) {
    this.showScreen('results');
    const mins = Math.floor(runTimer / 60);
    const secs = Math.floor(runTimer % 60);
    const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    document.getElementById('res-time').textContent = timeStr;
    document.getElementById('res-level').textContent = String(player.level);
    document.getElementById('res-kills').textContent = String(player.totalKills);
    document.getElementById('res-gems').textContent = String(player.totalGemsCollected);

    // Damage bar chart
    const stats = this.game.weaponManager.damageStats;
    const chartEl = document.getElementById('res-damage-chart');
    let maxDmg = 1;
    for (const w in stats) {
      if (stats[w] > maxDmg) maxDmg = stats[w];
    }

    let chartHtml = '';
    for (const w in stats) {
      const dmg = stats[w];
      const pct = Math.round((dmg / maxDmg) * 100);
      const name = w.replace('_', ' ').toUpperCase();
      chartHtml += `
        <div class="chart-row">
          <div class="chart-label">${name} (${dmg})</div>
          <div class="chart-bar-bg">
            <div class="chart-bar-fill" style="width: ${pct}%"></div>
          </div>
        </div>
      `;
    }
    chartEl.innerHTML = chartHtml;
  }
}
