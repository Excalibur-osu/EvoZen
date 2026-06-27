<!--
  军事面板 (MilitaryPanel.vue)
  展示驻军状态、训练进度、战术选择、战役操作和佣兵雇佣。
  对标 legacy/src/civics.js garrison UI。
-->
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGameStore } from '../stores/game'
import AppIcon from './ui/AppIcon.vue'
import IconButton from './ui/IconButton.vue'
import ProgressBar from './ui/ProgressBar.vue'
import StepperButton from './ui/StepperButton.vue'

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
      hstl: number; mil: number; eco: number; unrest: number; spy: number; trn: number; sab: number; occ: boolean; anx: boolean; buy: boolean
    }
    return {
      index: i,
      name: names[i],
      hstl: gov.hstl,
      mil: gov.mil || 75,
      eco: gov.eco || 75,
      unrest: gov.unrest || 0,
      spy: gov.spy || 0,
      trn: gov.trn || 0,
      sab: gov.sab || 0,
      occ: gov.occ,
      anx: gov.anx,
      buy: gov.buy,
      status: gov.occ ? '已占领' : gov.anx ? '已吞并' : gov.buy ? '已收购' : '独立',
    }
  })
})

const isSpyUnlocked = computed(() => (game.state.tech['spy'] ?? 0) >= 1)
const canSabotage = computed(() => (game.state.tech['spy'] ?? 0) >= 2)

const showEspionageModal = ref<number | null>(null)

function adjustRaid(delta: number) {
  game.setRaid((garrison.value?.raid ?? 0) + delta)
}
</script>

<template>
  <div v-if="isVisible" class="military-panel">
    <h3 class="section-title">
      <AppIcon name="military" />
      <span>驻军</span>
    </h3>

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
        <span class="stat-label icon-label">
          <AppIcon name="heartPulse" />
          <span>负伤</span>
        </span>
        <span class="stat-value wounded-val">{{ garrison!.wounded }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label icon-label">
          <AppIcon name="shieldCheck" />
          <span>防御</span>
        </span>
        <span class="stat-value">{{ defenseRating }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label icon-label">
          <AppIcon name="military" />
          <span>进攻</span>
        </span>
        <span class="stat-value">{{ attackRating }}</span>
      </div>
    </div>

    <!-- 训练进度 -->
    <div class="training-section" v-if="garrison!.workers < garrison!.max">
      <div class="training-header">
        <span class="training-label icon-label">
          <AppIcon name="crosshair" />
          <span>训练进度</span>
        </span>
        <span class="training-rate font-mono">{{ trainingRate }}/tick</span>
      </div>
      <ProgressBar :value="trainingPct" tone="info" size="md" />
      <span class="progress-text font-mono text-xs">{{ trainingPct }}%</span>
    </div>
    <div v-else class="training-full">
      <AppIcon name="shieldCheck" />
      <span>兵营满员</span>
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
        <StepperButton label="-5" aria-label="减少 5 名出征士兵" :disabled="garrison!.raid <= 0" @click="adjustRaid(-5)" />
        <StepperButton label="−" aria-label="减少 1 名出征士兵" :disabled="garrison!.raid <= 0" @click="adjustRaid(-1)" />
        <span class="raid-count font-mono">{{ garrison!.raid }}</span>
        <span class="raid-max font-mono text-xs">/ {{ maxRaid }}</span>
        <StepperButton label="+" aria-label="增加 1 名出征士兵" :disabled="garrison!.raid >= maxRaid" @click="adjustRaid(1)" />
        <StepperButton label="+5" aria-label="增加 5 名出征士兵" :disabled="garrison!.raid >= maxRaid" @click="adjustRaid(5)" />
        <StepperButton label="全部" aria-label="全部出征" @click="game.setRaid(maxRaid)" />
      </div>
    </div>

    <!-- 战役目标 -->
    <div class="campaign-section">
      <h4 class="sub-title">
        <AppIcon name="handshake" />
        <span>外交</span>
      </h4>
      <div class="gov-list">
        <template v-for="gov in foreignGovs" :key="gov.index">
        <div class="gov-row">
          <div class="gov-info">
            <span class="gov-name">{{ gov.name }}</span>
            <span class="gov-status" :class="{ 'occ': gov.occ, 'anx': gov.anx }">{{ gov.status }}</span>
          </div>
          <div class="gov-stats text-xs font-mono">
            <span class="gov-stat" data-tooltip="敌意" data-tooltip-pos="bottom">
              <AppIcon name="dangerAlert" />
              <span>{{ gov.hstl }}</span>
            </span>
            <span class="gov-stat" data-tooltip="军力" data-tooltip-pos="bottom">
              <AppIcon name="military" />
              <span>{{ gov.mil }}</span>
            </span>
            <span class="gov-stat" data-tooltip="动荡" data-tooltip-pos="bottom" v-if="isSpyUnlocked">
              <AppIcon name="flame" />
              <span>{{ gov.unrest }}</span>
            </span>
          </div>
          <div class="campaign-actions">
            <button
              class="campaign-btn"
              @click="game.doWarCampaign(gov.index)"
              :disabled="garrison!.raid <= 0"
            >
              {{ gov.occ ? '撤军' : gov.anx || gov.buy ? '解除' : '进攻' }}
            </button>
            <button
              v-if="isSpyUnlocked && !gov.occ && !gov.anx && !gov.buy"
              class="spy-btn"
              data-tooltip="训练间谍（花费随参数指数增加）"
              data-tooltip-pos="bottom"
              @click="game.trainSpy(gov.index)"
              :disabled="gov.trn > 0"
            >
              <AppIcon name="crosshair" />
              <span v-if="gov.trn > 0">{{ gov.trn }}...</span>
              <span v-else>{{ gov.spy }}</span>
            </button>
            <button
              v-if="canSabotage && !gov.occ && !gov.anx && !gov.buy && gov.spy >= 1"
              class="spy-btn action-btn"
              @click="showEspionageModal = showEspionageModal === gov.index ? null : gov.index"
              :disabled="gov.sab > 0"
            >
              <span v-if="gov.sab > 0">潜伏 {{ gov.sab }}...</span>
              <span v-else>行动</span>
            </button>
          </div>
        </div>
        
        <!-- 间谍行动面板（折叠） -->
        <div class="espionage-modal" v-if="showEspionageModal === gov.index">
          <div class="esp-header">
            <span>针对 {{ gov.name }} 的间谍密谋</span>
            <IconButton
              icon="close"
              label="关闭间谍行动面板"
              tone="danger"
              size="sm"
              @click="showEspionageModal = null"
            />
          </div>
          <div class="esp-actions">
            <button class="btn sm esp-action-btn" @click="game.startEspionage(gov.index, 'influence')">
              <AppIcon name="messages" />
              <span>影响力 (降敌意)</span>
            </button>
            <button class="btn sm esp-action-btn" @click="game.startEspionage(gov.index, 'sabotage')">
              <AppIcon name="dangerAlert" />
              <span>搞破坏 (削军力)</span>
            </button>
            <button class="btn sm esp-action-btn inc" @click="game.startEspionage(gov.index, 'incite')">
              <AppIcon name="flame" />
              <span>煽动叛乱 (增动荡)</span>
            </button>
            <button 
              class="btn sm esp-action-btn anx"
              v-if="gov.unrest >= 50 && gov.hstl <= 50" 
              @click="game.startEspionage(gov.index, 'annex')"
            >
              <AppIcon name="landmark" />
              <span>颠覆兼并</span>
            </button>
            <button 
              class="btn sm esp-action-btn buy"
              v-if="gov.spy >= 3" 
              @click="game.startEspionage(gov.index, 'purchase')"
            >
              <AppIcon name="handCoins" />
              <span>金元收购</span>
            </button>
          </div>
        </div>
      </template>
      </div>
    </div>

    <!-- 佣兵 -->
    <div class="merc-section" v-if="mercsUnlocked">
      <button class="btn sm merc-btn" @click="game.doHireMerc()" :disabled="garrison!.workers >= garrison!.max">
        <AppIcon name="handCoins" />
        <span>雇佣佣兵 ({{ mercPrice }} 金币)</span>
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
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-accent);
  margin-bottom: 4px;
}

.sub-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
}
.section-title svg,
.sub-title svg {
  width: 15px;
  height: 15px;
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
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.icon-label svg,
.gov-stat svg,
.merc-btn svg,
.spy-btn svg {
  width: 13px;
  height: 13px;
  flex: 0 0 auto;
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
  color: var(--danger);
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
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}
.training-rate {
  font-size: 11px;
  color: var(--text-muted);
}
.progress-text {
  display: inline-block;
  margin-top: 4px;
  color: var(--text-muted);
}
.training-full {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--success);
  font-size: 13px;
  font-weight: 500;
  padding: 8px 12px;
  background: var(--success-glow);
  border-radius: var(--radius-sm);
  border: 1px solid color-mix(in srgb, var(--success) 35%, transparent);
}
.training-full svg {
  width: 14px;
  height: 14px;
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
  background: var(--info);
  border-color: var(--info);
  color: var(--text-primary);
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
  color: var(--success);
}
.gov-status.anx {
  color: var(--info);
}
.gov-stats {
  display: flex;
  gap: 8px;
  color: var(--text-muted);
}
.gov-stat {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
.campaign-actions {
  display: flex;
  gap: 4px;
}
.campaign-btn, .spy-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 4px 8px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s;
}
.campaign-btn {
  background: var(--danger-glow);
  color: var(--danger);
}
.campaign-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--danger) 25%, transparent);
  border-color: var(--danger);
}
.campaign-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.spy-btn {
  background: var(--bg-input);
  color: var(--text-primary);
}
.spy-btn:hover:not(:disabled) {
  background: var(--bg-card-hover);
  border-color: var(--border-hover);
}
.spy-btn.action-btn {
  color: var(--res-rna);
  border-color: color-mix(in srgb, var(--res-rna) 35%, transparent);
  background: color-mix(in srgb, var(--res-rna) 14%, transparent);
}
.spy-btn.action-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--res-rna) 25%, transparent);
  border-color: var(--res-rna);
}

/* Espionage Modal */
.espionage-modal {
  margin-top: 2px;
  margin-bottom: 6px;
  padding: 8px 10px;
  background: var(--bg-sidebar);
  border: 1px dashed var(--border-color);
  border-radius: var(--radius-sm);
}
.esp-header {
  font-size: 12px;
  color: var(--res-rna);
  margin-bottom: 6px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.esp-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
}
.esp-action-btn {
  text-align: left;
  justify-content: flex-start;
}
.esp-action-btn svg {
  width: 13px;
  height: 13px;
  flex: 0 0 auto;
}
.esp-action-btn.inc { color: var(--res-copper); }
.esp-action-btn.anx { color: var(--info); border-color: color-mix(in srgb, var(--info) 35%, transparent); }
.esp-action-btn.buy { color: var(--warning); border-color: color-mix(in srgb, var(--warning) 35%, transparent); }
.esp-action-btn:hover { background: var(--bg-card-hover); }

/* 佣兵 */
.merc-section {
  margin-top: 4px;
}
.merc-btn {
  width: 100%;
  min-height: 32px;
  border: 1px solid color-mix(in srgb, var(--warning) 35%, transparent);
  background: var(--warning-glow);
  color: var(--warning);
}
.merc-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--warning) 25%, transparent);
  border-color: var(--warning);
}

/* 厌战 */
.war-fatigue {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--res-copper);
  padding: 6px 12px;
  background: color-mix(in srgb, var(--res-copper) 12%, transparent);
  border-radius: var(--radius-sm);
  border: 1px solid color-mix(in srgb, var(--res-copper) 22%, transparent);
}
</style>
