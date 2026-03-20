<!-- 
  游戏顶部导航/状态栏组件 (GameHeader.vue)
  负责展示当前种族物种、游戏内年月日历流转状态，以及暂停/存档等全局功能入口
-->
<script setup lang="ts">
import { useGameStore } from '../stores/game'

const game = useGameStore()

const speciesLabels: Record<string, string> = {
  human: '人类', elven: '精灵', orc: '兽人', dwarf: '矮人', goblin: '地精',
  protoplasm: '原生质'
}
</script>

<template>
  <header class="top-bar">
    <div class="bar-left">
      <span class="game-logo">🧬 EvoZen</span>
      <span class="species-label" v-if="!game.isEvolving">
        {{ speciesLabels[game.state.race.species] ?? game.state.race.species }}
      </span>
    </div>

    <div class="bar-center" v-if="!game.isEvolving">
      <span class="cal-year">年 <b>{{ game.year }}</b></span>
      <span class="cal-day">日 <b>{{ game.day }}</b></span>
      <span class="cal-season" :class="'season-' + game.state.city.calendar?.season">{{ game.season }}</span>
    </div>

    <div class="bar-right">
      <button class="bar-btn" @click="game.togglePause()">
        {{ game.isPaused ? '▶ 继续' : '⏸ 暂停' }}
      </button>
      <button class="bar-btn" @click="game.save()">💾 存档</button>
    </div>
  </header>
</template>

<style scoped>
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  height: 38px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
  z-index: 10;
  font-size: 13px;
}

.bar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.game-logo {
  font-weight: 700;
  font-size: 14px;
  background: linear-gradient(135deg, var(--accent), #a78bfa);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.species-label {
  font-size: 12px;
  color: var(--text-secondary);
  padding: 1px 8px;
  background: var(--bg-card);
  border-radius: var(--radius-sm);
}

.bar-center {
  display: flex;
  align-items: center;
  gap: 16px;
  color: var(--text-secondary);
  font-size: 13px;
}
.bar-center b {
  color: var(--warning);
  font-family: var(--font-mono);
}
.cal-season {
  padding: 1px 8px;
  border-radius: var(--radius-sm);
  font-weight: 600;
  font-size: 12px;
}
.season-0 { color: #34d399; background: rgba(52,211,153,0.1); }
.season-1 { color: #fbbf24; background: rgba(251,191,36,0.1); }
.season-2 { color: #f59e42; background: rgba(245,158,66,0.1); }
.season-3 { color: #60a5fa; background: rgba(96,165,250,0.1); }

.bar-right {
  display: flex;
  gap: 6px;
}

.bar-btn {
  padding: 3px 10px;
  font-size: 12px;
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
</style>
