<!--
  进化面板 (EvolutionPanel.vue) — 完整进化树版本
  对标 legacy/src/actions.js evolution 节点 + legacy UI 流程

  流程：
    1. RNA 收集阶段（手动点击 + 自动产出）
    2. 细胞升级阶段（membrane/organelles/nucleus/eukaryotic_cell/mitochondria）
    3. 进化步骤阶段（有性生殖→吞噬→多细胞→双侧对称→哺乳动物→人形化）
    4. 种族 + 行星特性选择 → 开始文明
-->
<script setup lang="ts">
import { useGameStore } from '../stores/game'
import { computed, ref, onMounted } from 'vue'
import { getSpeciesTraitDescriptors, type EvoUpgrade } from '@evozen/game-core'

const game = useGameStore()

const hasEvolvedOnce = ref(false)
onMounted(() => {
  try {
    hasEvolvedOnce.value = localStorage.getItem('evozen_has_evolved_once') === 'true'
  } catch (e) {}
})

// ---- 响应式计算 ----

const rna = computed(() => game.state.resource['RNA'])
const dna = computed(() => game.state.resource['DNA'])

const rnaAmount = computed(() => Math.floor(rna.value?.amount ?? 0))
const rnaMax = computed(() => rna.value?.max ?? 100)
const rnaDiff = computed(() => (rna.value?.diff ?? 0) * 4)

const dnaAmount = computed(() => Math.floor(dna.value?.amount ?? 0))
const dnaMax = computed(() => dna.value?.max ?? 100)
const dnaDiff = computed(() => (dna.value?.diff ?? 0) * 4)
const dnaNVisible = computed(() => dna.value?.display ?? false)

function formatRate(n: number): string {
  const sign = n > 0 ? '+' : ''
  return sign + n.toFixed(2)
}

function rateClass(n: number): string {
  if (n > 0) return 'rate-positive'
  if (n < 0) return 'rate-negative'
  return 'rate-zero'
}

const evoLevel = computed(() => (game.state.tech['evo'] as number | undefined) ?? 0)
const evoFinal = computed(() => (game.state.evolution as Record<string, number | { count: number }>)['final'] as number ?? 0)

const availableUpgrades = computed(() => game.getAvailableUpgrades())
const availableSteps = computed(() => game.getAvailableSteps())
const availableRaces = computed(() => game.getAvailableRaces())

const showRaceSelect = computed(() => availableRaces.value.length > 0)

// 行星特性
const TRAIT_EMOJIS: Record<string, string> = {
  none: '🌍', unstable: '🌋', dense: '⛰️', mellow: '🌿',
  rage: '🔥', magnetic: '🧲', trashed: '🗑️', permafrost: '🧊',
  toxic: '☠️', ozone: '☀️', stormy: '⛈️', flare: '💥',
}
const activeTraits = computed(() =>
  Object.values(game.PLANET_TRAITS).filter((t) => t.activePhase1 || t.id === 'none')
)

const selectedSpecies = ref('human')
const selectedPtrait = ref('none')

// ---- 辅助 ----

function upgradeCount(id: string) {
  return game.getUpgradeCount(id)
}

function upgradeCost(id: string) {
  return game.getUpgradeCost(id)
}

function canAffordUpgrade(id: string) {
  const cost = upgradeCost(id)
  const hasRna = cost.rna === 0 || (rna.value?.amount ?? 0) >= cost.rna
  const hasDna = cost.dna === 0 || (dna.value?.amount ?? 0) >= cost.dna
  return hasRna && hasDna
}

function canAffordStep(dnaCost: number) {
  return (dna.value?.amount ?? 0) >= dnaCost
}

/**
 * 构建升级上下文（各升级已购 count），传入 effectText 以匹配原版行为
 * （线粒体会影响细胞膜和真核细胞的每次增量）
 */
function upgradeEffectText(upg: EvoUpgrade): string {
  const ctx: Record<string, number> = {}
  for (const u of availableUpgrades.value) {
    ctx[u.id] = upgradeCount(u.id)
  }
  return upg.effectText(upgradeCount(upg.id), ctx)
}

// 进化史诗旁白文本
const stageDesc = computed(() => {
  if (evoLevel.value === 0) return '你是原生质——宇宙中最初的一滴生命。收集遗传物质，开始进化之旅。'
  if (evoLevel.value === 1) return '你的细胞已足够复杂。发展出有性生殖，加速你的演化。'
  if (evoLevel.value === 2) return '一次伟大的阶跃：走向动物路线，掌握吞噬的原始法则。'
  if (evoLevel.value === 3) return '单细胞生命的壁垒已被打破，向着多细胞的方向野蛮生长吧。'
  if (evoLevel.value === 4) return '生命开始分化。两侧对称将为高效运动与感知构建温床。'
  if (evoLevel.value === 5) return '脊椎动物的篇章！温血与智慧的火种即将在大地燎原。'
  if (evoLevel.value === 6) return '直立行走，双手解放——文明的大门已然触手可及！'
  if (evoFinal.value >= 100) return '漫长的演化已臻圆满，选择你的种族，点燃文明的星火。'
  return '伟大的演化正在悄然发生…'
})

</script>

<template>
  <div class="evo-panel animate-in">
    <!-- 阶段史诗旁白 -->
    <div class="stage-quote-container border-glow">
      <p class="stage-quote">
        <span class="quote-mark">“</span>
        {{ stageDesc }}
        <span class="quote-mark">”</span>
      </p>
    </div>

    <!-- 快速开始 -->
    <template v-if="hasEvolvedOnce">
      <div class="quick-start-card">
        <div class="quick-start-header">
          <span class="quick-start-icon">⚡</span>
          <div>
            <h3 class="quick-start-title">快速开始</h3>
            <p class="quick-start-desc">跳过进化阶段，直接以人类身份开始文明。</p>
          </div>
        </div>
        <button class="btn primary quick-start-btn" @click="game.startCivilization('human')">
          🚀 直接跳过进化
        </button>
      </div>

      <div class="divider">
        <span class="divider-text">或者 · 体验完整进化流程</span>
      </div>
    </template>

    <!-- RNA / DNA 资源条 -->
    <div class="evo-resources">
      <!-- RNA -->
      <div class="evo-res-item">
        <div class="evo-res-header">
          <span class="evo-res-label" data-tooltip="核糖核酸：进化的基础货币，用于购买细胞升级并合成 DNA">🔮 RNA</span>
          <div style="flex:1"></div>
          <span class="evo-res-rate font-mono" :class="rateClass(rnaDiff)" style="margin-right: 8px" v-if="rnaDiff !== 0">
            {{ formatRate(rnaDiff) }}/s
          </span>
          <span class="evo-res-value font-mono">{{ rnaAmount }} / {{ rnaMax }}</span>
        </div>
        <div class="progress-bar">
          <div
            class="fill"
            :style="{ width: (rnaAmount / rnaMax * 100) + '%' }"
            style="background: linear-gradient(90deg, #7c3aed, #a78bfa)"
          />
        </div>
        <button 
          class="btn" 
          :class="{ primary: rnaAmount < rnaMax }"
          style="margin-top: 8px; width: 100%" 
          :disabled="rnaAmount >= rnaMax"
          @click="game.gatherRNA()"
        >
          收集 RNA
        </button>
      </div>

      <!-- DNA（仅解锁后显示） -->
      <div v-if="dnaNVisible" class="evo-res-item">
        <div class="evo-res-header">
          <span class="evo-res-label" data-tooltip="脱氧核糖核酸：由 2 RNA 合成，用于进化突破">🧬 DNA</span>
          <div style="flex:1"></div>
          <span class="evo-res-rate font-mono" :class="rateClass(dnaDiff)" style="margin-right: 8px" v-if="dnaDiff !== 0">
            {{ formatRate(dnaDiff) }}/s
          </span>
          <span class="evo-res-value font-mono">{{ dnaAmount }} / {{ dnaMax }}</span>
        </div>
        <div class="progress-bar">
          <div
            class="fill"
            :style="{ width: (dnaAmount / dnaMax * 100) + '%' }"
            style="background: linear-gradient(90deg, #db2777, #f472b6)"
          />
        </div>
        <button
          class="btn"
          style="margin-top: 8px; width: 100%"
          :disabled="rnaAmount < 2 || dnaAmount >= dnaMax"
          @click="game.formDNA()"
        >
          合成 DNA（消耗 2 RNA）
        </button>
      </div>
    </div>

    <!-- 细胞升级区 -->
    <div v-if="availableUpgrades.length > 0" class="upgrades-section">
      <h3 class="section-title">🔬 细胞升级</h3>
      <div class="upgrades-grid">
        <div
          v-for="upg in availableUpgrades"
          :key="upg.id"
          class="upgrade-card"
          :class="{ affordable: canAffordUpgrade(upg.id) }"
        >
          <div class="upgrade-header">
            <span class="upgrade-name">{{ upg.name }}</span>
            <span class="upgrade-count">已购：{{ upgradeCount(upg.id) }}</span>
          </div>
          <div class="upgrade-desc">{{ upg.desc }}</div>
          <div class="upgrade-effect">{{ upgradeEffectText(upg) }}</div>
          <div class="upgrade-cost">
            <span
              v-if="upgradeCost(upg.id).rna > 0"
              :class="{ 'cost-lack': rnaAmount < upgradeCost(upg.id).rna }"
              data-tooltip="RNA 费用"
            >
              🔮 {{ upgradeCost(upg.id).rna }}
            </span>
            <span
              v-if="upgradeCost(upg.id).dna > 0"
              :class="{ 'cost-lack': dnaAmount < upgradeCost(upg.id).dna }"
              data-tooltip="DNA 费用"
            >
              🧬 {{ upgradeCost(upg.id).dna }}
            </span>
          </div>
          <button
            class="btn upgrade-btn"
            :class="{ primary: canAffordUpgrade(upg.id) }"
            :disabled="!canAffordUpgrade(upg.id)"
            @click="game.purchaseUpgrade(upg.id)"
          >
            购买
          </button>
        </div>
      </div>
    </div>

    <!-- 进化步骤区 -->
    <div v-if="availableSteps.length > 0" class="steps-section">
      <h3 class="section-title">🧬 进化突破</h3>
      <div class="steps-grid">
        <div
          v-for="step in availableSteps"
          :key="step.id"
          class="step-card"
          :class="{ affordable: canAffordStep(step.dnaCost) }"
        >
          <div class="step-name">⚡ {{ step.name }}</div>
          <div class="step-desc">{{ step.desc }}</div>
          <div class="step-effect">{{ step.effectText }}</div>
          <div class="step-cost">
            <span
              :class="{ 'cost-lack': dnaAmount < step.dnaCost }"
              data-tooltip="DNA 费用"
            >🧬 {{ step.dnaCost }}</span>
          </div>
          <button
            class="btn step-btn"
            :class="{ primary: canAffordStep(step.dnaCost) }"
            :disabled="!canAffordStep(step.dnaCost)"
            @click="game.advanceStep(step.id)"
          >
            进化
          </button>
        </div>
      </div>
    </div>

    <!-- 种族 + 行星特性选择（evo=7 后出现） -->
    <div v-if="showRaceSelect" class="evo-species">
      <h3>选择你的种族</h3>
      <div class="species-grid">
        <button
          v-for="race in availableRaces"
          :key="race.id"
          class="species-card"
          :class="{ active: selectedSpecies === race.id }"
          @click="selectedSpecies = race.id"
        >
          <span class="species-emoji">{{ race.emoji }}</span>
          <span class="species-name">{{ race.name }}</span>
          <span class="species-traits">
            {{ getSpeciesTraitDescriptors(race.id).map(t => t.label).join(' / ') }}
          </span>
          <span class="species-effect">{{ race.desc }}</span>
        </button>
      </div>

      <!-- 行星特性 -->
      <div class="ptrait-section">
        <h4>🪐 行星特性</h4>
        <div class="ptrait-grid">
          <button
            v-for="pt in activeTraits"
            :key="pt.id"
            class="ptrait-card"
            :class="{ active: selectedPtrait === pt.id }"
            @click="selectedPtrait = pt.id"
          >
            <span class="ptrait-emoji">{{ TRAIT_EMOJIS[pt.id] ?? '🌍' }}</span>
            <span class="ptrait-name">{{ pt.label }}</span>
            <span class="ptrait-desc">{{ pt.desc }}</span>
          </button>
        </div>
      </div>

      <!-- 费用展示 + 进化按钮 -->
      <div class="sentience-cost">
        <span>消耗：</span>
        <span data-tooltip="RNA 费用">🔮 320</span>
        <span data-tooltip="DNA 费用">🧬 320</span>
        <span :class="{ 'cost-lack': rnaAmount < 320 || dnaAmount < 320 }">
          （当前 RNA {{ rnaAmount }} / DNA {{ dnaAmount }}）
        </span>
      </div>
      <button
        class="btn primary sentience-btn"
        :disabled="rnaAmount < 320 || dnaAmount < 320"
        @click="game.chooseRace(selectedSpecies, selectedPtrait)"
      >
        🌟 进化为 {{ availableRaces.find(r => r.id === selectedSpecies)?.name ?? selectedSpecies }} 踏上文明！
      </button>
    </div>
  </div>
</template>

<style scoped>
.evo-panel {
  max-width: 860px; /* 增加最大宽度限制，防止在超宽屏幕上拉伸过度 */
  margin: 0 auto; /* 居中显示 */
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.evo-title-section {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
}
.evo-title {
  font-size: 20px;
  font-weight: 700;
  background: linear-gradient(135deg, #a78bfa, #f472b6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
}
.evo-subtitle {
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 1.4;
  margin: 0;
}

/* 快速开始 */
.quick-start-card {
  padding: 12px;
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.05), rgba(59, 130, 246, 0.05));
  border: 1px solid rgba(34, 197, 94, 0.15);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.quick-start-header { display: flex; align-items: center; gap: 12px; }
.quick-start-icon { font-size: 24px; flex-shrink: 0; text-shadow: 0 0 10px rgba(34, 197, 94, 0.3); }
.quick-start-title { font-size: 13px; font-weight: 700; color: var(--text-accent); margin: 0; }
.quick-start-desc { font-size: 11px; color: var(--text-secondary); margin: 2px 0 0; }
.quick-start-btn { padding: 6px 16px; font-size: 12px; font-weight: 700; white-space: nowrap; }

/* 分割线 */
.divider { display: flex; align-items: center; gap: 12px; margin: 4px 0; }
.divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: var(--border-color); }
.divider-text { font-size: 11px; color: var(--text-muted); font-family: var(--font-mono); white-space: nowrap; }

/* 资源条 */
.evo-resources {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}
.evo-res-item {
  padding: 10px;
  background: rgba(255, 255, 255, 0.015);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
}
.evo-res-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.evo-res-label { font-weight: 600; font-size: 12px; }
.evo-res-value { font-size: 11px; color: var(--text-primary); font-family: var(--font-mono); }

/* 升级区 & 进化步骤 */
.section-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.upgrades-section, .steps-section {
  padding: 12px;
  background: rgba(255, 255, 255, 0.01);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
}
.upgrades-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 8px;
}
.upgrade-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.upgrade-card.affordable { border-color: rgba(34, 197, 94, 0.5); }
.upgrade-header { display: flex; justify-content: space-between; align-items: center; }
.upgrade-name { font-weight: 700; font-size: 11px; color: var(--text-primary); }
.upgrade-count { font-size: 10px; color: var(--text-muted); font-family: var(--font-mono); }
.upgrade-desc { font-size: 10px; color: var(--text-secondary); line-height: 1.3; min-height: 39px; }
.upgrade-effect { font-size: 10px; color: var(--secondary); line-height: 1.3; }
.upgrade-cost {
  display: flex;
  gap: 6px;
  font-size: 10px;
  font-weight: 600;
  color: var(--text-secondary);
  font-family: var(--font-mono);
  margin-top: auto;
}
.upgrade-btn { width: 100%; padding: 4px 0; font-size: 11px; margin-top: 6px; }

/* 进化步骤 */
.steps-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 8px;
}
.step-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.step-card.affordable {
  border-color: var(--accent);
  box-shadow: 0 0 8px var(--accent-glow);
}
.step-name { font-size: 12px; font-weight: 700; color: var(--text-primary); }
.step-desc { font-size: 10px; color: var(--text-secondary); line-height: 1.3; min-height: 39px; }
.step-effect { font-size: 10px; color: var(--accent); }
.step-cost { font-size: 10px; font-weight: 600; color: var(--text-secondary); font-family: var(--font-mono); margin-top: auto; }
.step-btn { width: 100%; padding: 4px 0; font-size: 11px; margin-top: 6px; }

/* 费用不足 */
.cost-lack { color: var(--danger) !important; }

/* 种族选择 */
.evo-species {
  padding: 16px;
  background: rgba(255, 255, 255, 0.015);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  animation: fadeIn 0.4s ease;
}
.evo-species h3 {
  text-align: left;
  font-size: 13px;
  margin-bottom: 12px;
  color: var(--text-accent);
}
.species-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 8px;
}
.species-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 8px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  color: var(--text-primary);
  text-align: left;
}
.species-card:hover { border-color: var(--border-hover); background: var(--bg-card-hover); }
.species-card.active { border-color: var(--accent); background: rgba(34, 197, 94, 0.05); box-shadow: inset 0 0 0 1px var(--accent); }
.species-emoji { font-size: 20px; }
.species-name { font-size: 12px; font-weight: 700; }
.species-traits { font-size: 10px; color: var(--secondary); }
.species-effect { font-size: 10px; line-height: 1.3; color: var(--text-secondary); }

/* 行星特性 */
.ptrait-section { margin-top: 16px; }
.ptrait-section h4 { font-size: 12px; margin-bottom: 8px; color: var(--text-secondary); text-align: left; }
.ptrait-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  gap: 6px;
}
.ptrait-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 6px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s;
  color: var(--text-primary);
}
.ptrait-card:hover { border-color: var(--border-hover); background: var(--bg-card-hover); }
.ptrait-card.active { border-color: var(--accent); background: rgba(34, 197, 94, 0.05); }
.ptrait-emoji { font-size: 16px; }
.ptrait-name { font-size: 10px; font-weight: 700; }
.ptrait-desc { font-size: 9px; line-height: 1.2; color: var(--text-secondary); text-align: center; }

/* 最终进化按钮 */
.sentience-cost {
  margin-top: 16px;
  font-size: 11px;
  color: var(--text-secondary);
  display: flex;
  gap: 8px;
  align-items: center;
  font-family: var(--font-mono);
}
.sentience-btn {
  width: 100%;
  padding: 10px;
  font-size: 13px;
  font-weight: 700;
  margin-top: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 史诗旁白文本样式 */
.stage-quote-container {
  margin-bottom: 24px;
  padding: 16px 20px;
  background: linear-gradient(180deg, rgba(167, 139, 250, 0.05) 0%, rgba(167, 139, 250, 0.01) 100%);
  border-radius: var(--radius-lg);
  border: 1px solid rgba(167, 139, 250, 0.2);
  position: relative;
  overflow: hidden;
}

.stage-quote {
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-primary);
  font-style: italic;
  text-align: center;
  position: relative;
  z-index: 1;
  text-shadow: 0 0 10px rgba(167, 139, 250, 0.3);
}

.quote-mark {
  color: var(--accent);
  opacity: 0.6;
  font-size: 16px;
  font-style: normal;
  margin: 0 6px;
}

.border-glow {
  box-shadow: inset 0 0 20px rgba(167, 139, 250, 0.05),
              0 0 15px rgba(167, 139, 250, 0.05);
}
</style>
