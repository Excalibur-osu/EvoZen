<!--
  军事面板 (MilitaryPanel.vue)
  展示驻军状态、训练进度、战术选择、战役操作和佣兵雇佣。
  对标 legacy/src/civics.js garrison UI。
-->
<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'

const game = useGameStore()

const garrison = computed(() => game.state.civic.garrison)
const isVisible = computed(() => garrison.value?.display ?? false)

/** 训练进度百分比 */
const trainingPct = computed(() => {
  if (!garrison.value) return 0
  return Math.floor(garrison.value.progress)
})

/** 训练速率/tick */
const trainingRate = computed(() => {
  if (!garrison.value) return '0.00'
  return garrison.value.rate.toFixed(2)
})

/** 可调配的最大士兵数 */
const maxRaid = computed(() => {
  if (!garrison.value) return 0
  return Math.max(0, garrison.value.workers - garrison.value.crew)
})

/** 防御军力评级 */
const defenseRating = computed(() => {
  const size = game.getGarrisonSize()
  const raid = garrison.value?.raid ?? 0
  const defenders = size - raid
  return Math.floor(game.getArmyRating(Math.max(0, defenders)))
})

/** 进攻军力评级 */
const attackRating = computed(() => {
  const raid = garrison.value?.raid ?? 0
  if (raid <= 0) return 0
  return Math.floor(game.getArmyRating(raid))
})

/** 佣兵是否解锁 */
const mercsUnlocked = computed(() => (game.state.tech['mercs'] ?? 0) >= 1)

/** 佣兵费用 */
const mercPrice = computed(() => game.getMercCost())

/** 战术名称列 */
const tactics = game.TACTIC_NAMES

/** 外交对象 */
const foreignGovs = computed(() => {
  const names = ['莫鲁尼亚', '巴尔卡尼亚', '卡什米利亚']
  return [0, 1, 2].map(i => {
    const gov = game.state.civic.foreign[`gov${i}` as keyof typeof game.state.civic.foreign] as {
      hstl: number; mil: number; eco: number; occ: boolean; anx: boolean; buy: boolean
    }
    return {
      index: i,
      name: names[i],
      hstl: gov.hstl,
      mil: gov.mil || 75,
      eco: gov.eco || 75,
      occ: gov.occ,
      anx: gov.anx,
      buy: gov.buy,
      status: gov.occ ? '已占领' : gov.anx ? '已吞并' : gov.buy ? '已收购' : '独立',
    }
  })
})

function adjustRaid(delta: number) {
  game.setRaid((garrison.value?.raid ?? 0) + delta)
}
</script>

<template>
  <div v-if="isVisible" class="military-panel">
    <h3 class="section-title">⚔️ 驻军</h3>

    <!-- 士兵状态 -->
    <div class="stat-grid">
      <div class="stat-card">
        <span class="stat-label">士兵</span>
        <span class="stat-value">
          {{ garrison!.workers }}
          <span class="stat-max">/ {{ garrison!.max }}</span>
        </span>
      </div>
      <div class="stat-card" v-if="garrison!.wounded > 0">
        <span class="stat-label">🤕 负伤</span>
        <span class="stat-value wounded-val">{{ garrison!.wounded }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">🛡 防御</span>
        <span class="stat-value">{{ defenseRating }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">⚔️ 进攻</span>
        <span class="stat-value">{{ attackRating }}</span>
      </div>
    </div>

    <!-- 训练进度 -->
    <div class="training-section" v-if="garrison!.workers < garrison!.max">
      <div class="training-header">
        <span class="training-label">🎯 训练进度</span>
        <span class="training-rate font-mono">{{ trainingRate }}/tick</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: trainingPct + '%' }"></div>
      </div>
      <span class="progress-text font-mono text-xs">{{ trainingPct }}%</span>
    </div>
    <div v-else class="training-full">
      ✅ 兵营满员
    </div>

    <!-- 战术选择 -->
    <div class="tactic-section">
      <span class="tactic-label">战术:</span>
      <div class="tactic-btns">
        <button
          v-for="(name, idx) in tactics"
          :key="idx"
          class="tactic-btn"
          :class="{ active: garrison!.tactic === idx }"
          @click="game.setTactic(idx)"
        >
          {{ name }}
        </button>
      </div>
    </div>

    <!-- 出征人数 -->
    <div class="raid-section">
      <span class="raid-label">出征:</span>
      <div class="raid-controls">
        <button class="ctrl-btn" @click="adjustRaid(-5)" :disabled="garrison!.raid <= 0">-5</button>
        <button class="ctrl-btn" @click="adjustRaid(-1)" :disabled="garrison!.raid <= 0">−</button>
        <span class="raid-count font-mono">{{ garrison!.raid }}</span>
        <span class="raid-max font-mono text-xs">/ {{ maxRaid }}</span>
        <button class="ctrl-btn" @click="adjustRaid(1)" :disabled="garrison!.raid >= maxRaid">+</button>
        <button class="ctrl-btn" @click="adjustRaid(5)" :disabled="garrison!.raid >= maxRaid">+5</button>
        <button class="ctrl-btn all-btn" @click="game.setRaid(maxRaid)">全部</button>
      </div>
    </div>

    <!-- 战役目标 -->
    <div class="campaign-section">
      <h4 class="sub-title">🌍 外交</h4>
      <div class="gov-list">
        <div v-for="gov in foreignGovs" :key="gov.index" class="gov-row">
          <div class="gov-info">
            <span class="gov-name">{{ gov.name }}</span>
            <span class="gov-status" :class="{ 'occ': gov.occ, 'anx': gov.anx }">{{ gov.status }}</span>
          </div>
          <div class="gov-stats text-xs font-mono">
            <span title="敌意">😤 {{ gov.hstl }}</span>
            <span title="军力">⚔️ {{ gov.mil }}</span>
          </div>
          <button
            class="campaign-btn"
            @click="game.doWarCampaign(gov.index)"
            :disabled="garrison!.raid <= 0"
          >
            {{ gov.occ ? '撤军' : gov.anx || gov.buy ? '解除' : '进攻' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 佣兵 -->
    <div class="merc-section" v-if="mercsUnlocked">
      <button class="merc-btn" @click="game.doHireMerc()" :disabled="garrison!.workers >= garrison!.max">
        💰 雇佣佣兵 ({{ mercPrice }} 金币)
      </button>
    </div>

    <!-- 厌战/疲劳指标 -->
    <div class="war-fatigue" v-if="garrison!.fatigue > 0 || garrison!.protest > 0">
      <span class="fatigue-item" v-if="garrison!.fatigue > 0">
        😮‍💨 疲劳: {{ Math.floor(garrison!.fatigue) }}
      </span>
      <span class="fatigue-item" v-if="garrison!.protest > 0">
        ✊ 厌战: {{ Math.floor(garrison!.protest) }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.military-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-accent);
  margin-bottom: 4px;
}

.sub-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
}

/* 统计网格 */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 6px;
}
.stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.stat-label {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.stat-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-accent);
  font-family: var(--font-mono, monospace);
}
.stat-max {
  font-size: 12px;
  font-weight: 400;
  color: var(--text-muted);
}
.wounded-val {
  color: #f87171;
}

/* 训练进度 */
.training-section {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
}
.training-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.training-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}
.training-rate {
  font-size: 11px;
  color: var(--text-muted);
}
.progress-bar {
  height: 6px;
  background: var(--bg-input);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 4px;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #60a5fa);
  border-radius: 3px;
  transition: width 0.3s ease;
}
.progress-text {
  color: var(--text-muted);
}
.training-full {
  color: #22c55e;
  font-size: 13px;
  font-weight: 500;
  padding: 8px 12px;
  background: rgba(34, 197, 94, 0.08);
  border-radius: var(--radius-sm);
  border: 1px solid rgba(34, 197, 94, 0.2);
}

/* 战术 */
.tactic-section {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.tactic-label {
  font-size: 13px;
  color: var(--text-primary);
  font-weight: 500;
}
.tactic-btns {
  display: flex;
  gap: 4px;
}
.tactic-btn {
  padding: 4px 10px;
  font-size: 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background: var(--bg-input);
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.15s;
}
.tactic-btn:hover {
  background: var(--bg-card-hover);
  border-color: var(--border-hover);
}
.tactic-btn.active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: #fff;
}

/* 出征 */
.raid-section {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.raid-label {
  font-size: 13px;
  color: var(--text-primary);
  font-weight: 500;
}
.raid-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}
.raid-count {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-accent);
  min-width: 24px;
  text-align: center;
}
.raid-max {
  color: var(--text-muted);
}
.ctrl-btn {
  width: 28px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
  padding: 0;
}
.ctrl-btn:hover:not(:disabled) {
  background: var(--bg-card-hover);
  border-color: var(--border-hover);
}
.ctrl-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.all-btn {
  width: auto;
  padding: 0 8px;
  font-size: 11px;
}

/* 战役 */
.campaign-section {
  margin-top: 4px;
}
.gov-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.gov-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 12px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
}
.gov-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 90px;
}
.gov-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}
.gov-status {
  font-size: 11px;
  color: var(--text-muted);
}
.gov-status.occ {
  color: #22c55e;
}
.gov-status.anx {
  color: #3b82f6;
}
.gov-stats {
  display: flex;
  gap: 8px;
  color: var(--text-muted);
}
.campaign-btn {
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background: rgba(239, 68, 68, 0.1);
  color: #f87171;
  cursor: pointer;
  transition: all 0.15s;
}
.campaign-btn:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.2);
  border-color: #f87171;
}
.campaign-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* 佣兵 */
.merc-section {
  margin-top: 4px;
}
.merc-btn {
  width: 100%;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 600;
  border: 1px solid rgba(250, 204, 21, 0.3);
  border-radius: var(--radius-sm);
  background: rgba(250, 204, 21, 0.08);
  color: #facc15;
  cursor: pointer;
  transition: all 0.15s;
}
.merc-btn:hover:not(:disabled) {
  background: rgba(250, 204, 21, 0.15);
  border-color: #facc15;
}
.merc-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* 厌战 */
.war-fatigue {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #fb923c;
  padding: 6px 12px;
  background: rgba(251, 146, 60, 0.06);
  border-radius: var(--radius-sm);
  border: 1px solid rgba(251, 146, 60, 0.15);
}
</style>
