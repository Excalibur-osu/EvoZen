<!-- 
  游戏顶部导航/状态栏组件 (GameHeader.vue)
  负责展示当前种族物种、游戏内年月日历流转状态，以及暂停/存档等全局功能入口
-->
<script setup lang="ts">
import { useGameStore } from '../stores/game'
import { computed, ref, watch } from 'vue'
import AppIcon from './ui/AppIcon.vue'

const game = useGameStore()
const appVersion = __APP_VERSION__

const moraleTooltip = computed(() => {
  const m = game.state.city.morale
  if (!m) return '士气: 100%'
  const vrBonus = m.vr ?? 0
  const lines = [
    `基础: 100%`,
    m.season !== 0 ? `季节: ${m.season > 0 ? '+' : ''}${m.season}%` : '',
    m.weather !== 0 ? `天气: ${m.weather > 0 ? '+' : ''}${m.weather}%` : '',
    m.entertain !== 0 ? `娱乐: +${m.entertain}%` : '',
    vrBonus !== 0 ? `VR 中心: +${vrBonus}%` : '',
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
        <span class="cal-temp">{{ game.tempLabel }}</span>
        <span class="cal-weather">{{ game.weatherLabel }}</span>
        <span class="cal-moon">{{ game.moonLabel }}</span>
      </template>

      <span
        v-if="game.population > 0"
        class="morale-badge"
        :class="{
          'morale-low': game.morale < 100,
          'morale-ok': game.morale === 100,
          'morale-high': game.morale > 100,
        }"
        :data-tooltip="moraleTooltip"
        data-tooltip-pos="bottom"
      >
        <AppIcon name="smile" />
        <span>{{ game.morale }}%</span>
      </span>
    </div>

    <div class="bar-right">
      <button class="bar-btn" @click="game.togglePause()">
        <AppIcon :name="game.isPaused ? 'play' : 'pause'" />
        <span>{{ game.isPaused ? '继续' : '暂停' }}</span>
      </button>
      <button class="bar-btn" @click="game.save()">
        <AppIcon name="save" />
        <span>存档</span>
      </button>
      <button class="bar-btn" @click="game.toggleSettings()">
        <AppIcon name="settings" />
        <span>设置</span>
      </button>
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
  background: color-mix(in srgb, var(--bg-primary) 78%, transparent);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border-color);
  box-shadow: 0 2px 12px color-mix(in srgb, var(--bg-primary) 80%, transparent);
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
  color: var(--accent);
  text-shadow: 0 0 10px var(--accent-glow);
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
  background: var(--surface-raised);
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
.season-0 { color: var(--success); background: var(--success-glow); }
.season-1 { color: var(--warning); background: var(--warning-glow); }
.season-2 { color: var(--res-copper); background: color-mix(in srgb, var(--res-copper) 18%, transparent); }
.season-3 { color: var(--info); background: color-mix(in srgb, var(--info) 18%, transparent); }

.bar-right {
  display: flex;
  align-items: center;
  gap: 6px;
  position: relative;
}

.bar-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
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
  background: var(--danger-glow);
  color: var(--danger);
  border-color: var(--danger);
}

/* 天气 */
.cal-weather {
  font-size: 11px;
}

/* 温度 */
.cal-temp {
  font-size: 11px;
  color: var(--text-secondary);
}

/* 月相 */
.cal-moon {
  font-size: 11px;
  color: var(--text-secondary);
}

/* 士气 */
.morale-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  font-weight: 600;
  font-size: 11px;
  font-family: var(--font-mono);
  white-space: pre-line;
}
.morale-low {
  color: var(--danger);
  background: var(--danger-glow);
}
.morale-ok {
  color: var(--warning);
  background: var(--warning-glow);
}
.morale-high {
  color: var(--success);
  background: var(--success-glow);
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
  box-shadow: 0 4px 16px color-mix(in srgb, var(--bg-primary) 70%, transparent);
  opacity: 0;
  transform: translate(-50%, 20px);
  pointer-events: none;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  z-index: var(--z-toast);
  letter-spacing: 0.5px;
}
.global-save-toast.toast-visible {
  opacity: 1;
  transform: translate(-50%, 0);
}
</style>
