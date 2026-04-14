<!-- 
  游戏顶部导航/状态栏组件 (GameHeader.vue)
  负责展示当前种族物种、游戏内年月日历流转状态，以及暂停/存档等全局功能入口
-->
<script setup lang="ts">
import { useGameStore } from '../stores/game'
import { computed, ref, watch } from 'vue'

const game = useGameStore()
const appVersion = __APP_VERSION__

const moraleTooltip = computed(() => {
  const m = game.state.city.morale
  if (!m) return '士气: 100%'
  const lines = [
    `基础: 100%`,
    m.season !== 0 ? `季节: ${m.season > 0 ? '+' : ''}${m.season}%` : '',
    m.weather !== 0 ? `天气: ${m.weather > 0 ? '+' : ''}${m.weather}%` : '',
    m.entertain !== 0 ? `娱乐: +${m.entertain}%` : '',
    m.stress !== 0 ? `压力: ${m.stress.toFixed(1)}%` : '',
    m.unemployed !== 0 ? `失业: ${m.unemployed}%` : '',
    `———`,
    `当前: ${m.current}% (上限 ${m.cap}%)`,
    `产出乘数: ×${game.globalMultiplier}`,
  ]
  return lines.filter(l => l).join('\n')
})

const showSaveIndicator = ref(false)
let saveIndicatorTimeout: ReturnType<typeof setTimeout>

watch(() => game.lastSaveTime, () => {
  showSaveIndicator.value = true
  clearTimeout(saveIndicatorTimeout)
  saveIndicatorTimeout = setTimeout(() => {
    showSaveIndicator.value = false
  }, 3000)
})
</script>

<template>
  <header class="top-bar">
    <div class="bar-left">
      <span class="game-logo">EvoZen</span>
      <span class="game-version">v{{ appVersion }}</span>
      <a href="https://github.com/Excalibur-osu/EvoZen" target="_blank" class="github-link">GitHub</a>
    </div>

    <div class="bar-center" v-if="!game.isEvolving">
      <template v-if="(game.state.tech['primitive'] ?? 0) >= 3">
        <span class="cal-year">年 <b>{{ game.year }}</b></span>
        <span class="cal-day">日 <b>{{ game.day }}</b></span>
        <span class="cal-season" :class="'season-' + game.state.city.calendar?.season">{{ game.season }}</span>
        <span class="cal-weather">{{ game.weatherLabel }}</span>
      </template>

      <span
        v-if="game.population > 0"
        class="morale-badge"
        :class="{
          'morale-low': game.morale < 100,
          'morale-ok': game.morale === 100,
          'morale-high': game.morale > 100,
        }"
        :title="moraleTooltip"
      >
        😊 {{ game.morale }}%
      </span>
    </div>

    <div class="bar-right">
      <button class="bar-btn" @click="game.togglePause()">
        {{ game.isPaused ? '▶ 继续' : '⏸ 暂停' }}
      </button>
      <button class="bar-btn" @click="game.save()">💾 存档</button>
      <button class="bar-btn" @click="game.toggleSettings()">⚙️ 设置</button>
    </div>
  </header>

  <Teleport to="body">
    <div class="global-save-toast" :class="{ 'toast-visible': showSaveIndicator }">
      ✓ 进度已保存
    </div>
  </Teleport>
</template>

<style scoped>
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  height: 32px; /* reduced height */
  background: rgba(2, 6, 23, 0.7); /* Deep darker background with transparency */
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.5);
  flex-shrink: 0;
  z-index: 20;
  font-size: 12px;
}

.bar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.game-logo {
  font-weight: 700;
  font-size: 14px;
  letter-spacing: 0.5px;
  background: -webkit-linear-gradient(45deg, #a78bfa, #f472b6);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 0 10px rgba(167, 139, 250, 0.4);
}

.game-version {
  font-size: 10px;
  color: var(--text-muted);
  font-family: var(--font-mono);
  margin-left: 8px;
  letter-spacing: 0;
}

.github-link {
  font-size: 11px;
  color: var(--text-secondary);
  text-decoration: none;
  transition: color 0.2s;
  margin-left: 12px;
}
.github-link:hover {
  color: var(--accent);
}

.species-label {
  font-size: 11px;
  color: var(--text-secondary);
  padding: 1px 6px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
}

.bar-center {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--text-secondary);
  font-size: 12px;
}
.bar-center b {
  color: var(--warning);
  font-family: var(--font-mono);
  font-weight: 600;
}
.cal-season {
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  font-weight: 600;
  font-size: 11px;
}
.season-0 { color: #4ade80; background: rgba(74,222,128,0.1); }
.season-1 { color: #facc15; background: rgba(250,204,21,0.1); }
.season-2 { color: #fb923c; background: rgba(251,146,60,0.1); }
.season-3 { color: #60a5fa; background: rgba(96,165,250,0.1); }

.bar-right {
  display: flex;
  align-items: center;
  gap: 6px;
  position: relative;
}

.bar-btn {
  padding: 2px 8px;
  font-size: 11px;
  font-family: var(--font-sans);
  background: var(--bg-card);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s;
}
.bar-btn:hover {
  background: var(--bg-card-hover);
  color: var(--text-primary);
  border-color: var(--border-hover);
}
.bar-btn.danger:hover {
  background: rgba(239, 68, 68, 0.1);
  color: var(--danger);
  border-color: var(--danger);
}

/* 天气 */
.cal-weather {
  font-size: 11px;
}

/* 士气 */
.morale-badge {
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  font-weight: 600;
  font-size: 11px;
  font-family: var(--font-mono);
  cursor: help;
  white-space: pre-line;
}
.morale-low {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}
.morale-ok {
  color: #eab308;
  background: rgba(234, 179, 8, 0.1);
}
.morale-high {
  color: #22c55e;
  background: rgba(34, 197, 94, 0.1);
}

.global-save-toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  padding: 8px 16px;
  border-radius: var(--radius-md);
  font-size: 13px;
  color: var(--success);
  font-weight: 600;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  opacity: 0;
  transform: translate(-50%, 20px);
  pointer-events: none;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  z-index: 9999;
  letter-spacing: 0.5px;
}
.global-save-toast.toast-visible {
  opacity: 1;
  transform: translate(-50%, 0);
}
</style>
