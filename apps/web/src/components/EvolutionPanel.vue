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
import { computed, ref } from 'vue'
import { getSpeciesTraitDescriptors } from '@evozen/game-core'

const game = useGameStore()

// ---- 响应式计算 ----

const rna = computed(() => game.state.resource['RNA'])
const dna = computed(() => game.state.resource['DNA'])

const rnaAmount = computed(() => Math.floor(rna.value?.amount ?? 0))
const rnaMax = computed(() => rna.value?.max ?? 100)
const dnaAmount = computed(() => Math.floor(dna.value?.amount ?? 0))
const dnaMax = computed(() => dna.value?.max ?? 100)
const dnaNVisible = computed(() => dna.value?.display ?? false)

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


// 进化阶段描述文本
const stageDesc = computed(() => {
  if (evoLevel.value === 0) return '你是原生质——宇宙中最初的一滴生命。收集遗传物质，开始进化之旅。'
  if (evoLevel.value === 1) return '你的细胞已足够复杂。发展出有性生殖，加速进化。'
  if (evoLevel.value === 2) return '进化选择：走向动物路线，掌握吞噬能力。'
  if (evoLevel.value === 3) return '单细胞生命的极限已到。迈向多细胞！'
  if (evoLevel.value === 4) return '生命开始分化。两侧对称将为运动奠定基础。'
  if (evoLevel.value === 5) return '脊椎动物时代！温血的哺乳动物将主宰大地。'
  if (evoLevel.value === 6) return '直立行走，双手解放——文明的曙光触手可及！'
  if (evoFinal.value >= 100) return '进化完成！选择你的种族，踏上文明之路。'
  return '持续进化中…'
})
</script>

<template>
  <div class="evo-panel animate-in">
    <!-- 标题区 -->
    <div class="evo-title-section">
      <h2 class="evo-title">🧫 原始之汤</h2>
      <p class="evo-subtitle">{{ stageDesc }}</p>
    </div>

    <!-- 快速开始 -->
    <div class="quick-start-card">
      <div class="quick-start-header">
        <span class="quick-start-icon">⚡</span>
        <div>
          <h3 class="quick-start-title">快速开始</h3>
          <p class="quick-start-desc">跳过进化阶段，直接以人类身份开始文明。</p>
        </div>
      </div>
      <button class="btn primary quick-start-btn" @click="game.startCivilization('human')">
        🚀 直接开始游戏
      </button>
    </div>

    <div class="divider">
      <span class="divider-text">或者 · 体验完整进化流程</span>
    </div>

    <!-- RNA / DNA 资源条 -->
    <div class="evo-resources">
      <!-- RNA -->
      <div class="evo-res-item">
        <div class="evo-res-header">
          <span class="evo-res-label">🔮 RNA</span>
          <span class="evo-res-value font-mono">{{ rnaAmount }} / {{ rnaMax }}</span>
        </div>
        <div class="progress-bar">
          <div
            class="fill"
            :style="{ width: (rnaAmount / rnaMax * 100) + '%' }"
            style="background: linear-gradient(90deg, #7c3aed, #a78bfa)"
          />
        </div>
        <button class="btn primary" style="margin-top: 8px; width: 100%" @click="game.gatherRNA()">
          收集 RNA
        </button>
      </div>

      <!-- DNA（仅解锁后显示） -->
      <div v-if="dnaNVisible" class="evo-res-item">
        <div class="evo-res-header">
          <span class="evo-res-label">🧬 DNA</span>
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
          <div class="upgrade-effect">{{ upg.effectText(upgradeCount(upg.id)) }}</div>
          <div class="upgrade-cost">
            <span v-if="upgradeCost(upg.id).rna > 0" :class="{ 'cost-lack': rnaAmount < upgradeCost(upg.id).rna }">
              🔮 {{ upgradeCost(upg.id).rna }}
            </span>
            <span v-if="upgradeCost(upg.id).dna > 0" :class="{ 'cost-lack': dnaAmount < upgradeCost(upg.id).dna }">
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
            <span :class="{ 'cost-lack': dnaAmount < step.dnaCost }">🧬 {{ step.dnaCost }}</span>
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
        <span>消耗：🔮 320 &nbsp; 🧬 320</span>
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
  max-width: 520px;
  margin: 40px auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.evo-title-section { text-align: center; }
.evo-title {
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(135deg, #a78bfa, #f472b6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 8px;
}
.evo-subtitle {
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.6;
}

/* 快速开始 */
.quick-start-card {
  padding: 20px;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(59, 130, 246, 0.08));
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.quick-start-header { display: flex; align-items: center; gap: 12px; }
.quick-start-icon { font-size: 28px; flex-shrink: 0; }
.quick-start-title { font-size: 16px; font-weight: 700; color: var(--text-accent); margin: 0; }
.quick-start-desc { font-size: 13px; color: var(--text-secondary); margin: 4px 0 0; }
.quick-start-btn { width: 100%; padding: 12px; font-size: 15px; font-weight: 700; }

/* 分割线 */
.divider { display: flex; align-items: center; gap: 12px; margin: 4px 0; }
.divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: var(--border-color); }
.divider-text { font-size: 12px; color: var(--text-muted); white-space: nowrap; }

/* 资源条 */
.evo-resources { display: flex; flex-direction: column; gap: 12px; }
.evo-res-item {
  padding: 14px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
}
.evo-res-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.evo-res-label { font-weight: 600; font-size: 15px; }
.evo-res-value { font-size: 13px; color: var(--text-accent); }

/* 升级区 */
.section-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-accent);
  margin-bottom: 10px;
}
.upgrades-section, .steps-section {
  padding: 16px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
}
.upgrades-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
}
.upgrade-card {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 12px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  transition: border-color 0.2s;
}
.upgrade-card.affordable {
  border-color: var(--border-hover);
}
.upgrade-header { display: flex; justify-content: space-between; align-items: center; }
.upgrade-name { font-weight: 700; font-size: 13px; color: var(--text-primary); }
.upgrade-count { font-size: 11px; color: var(--text-muted); }
.upgrade-desc { font-size: 11px; color: var(--text-secondary); line-height: 1.4; }
.upgrade-effect { font-size: 10px; color: var(--text-accent); line-height: 1.4; }
.upgrade-cost {
  display: flex;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}
.upgrade-btn { width: 100%; padding: 5px 0; font-size: 12px; margin-top: 4px; }

/* 进化步骤 */
.steps-grid { display: flex; flex-direction: column; gap: 10px; }
.step-card {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 14px;
  background: var(--bg-input);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  transition: border-color 0.2s, box-shadow 0.2s;
}
.step-card.affordable {
  border-color: var(--accent);
  box-shadow: 0 0 10px var(--accent-glow);
}
.step-name { font-size: 14px; font-weight: 700; color: var(--text-primary); }
.step-desc { font-size: 12px; color: var(--text-secondary); }
.step-effect { font-size: 11px; color: var(--text-accent); }
.step-cost { font-size: 12px; font-weight: 600; color: var(--text-secondary); }
.step-btn { width: 100%; padding: 7px 0; font-size: 13px; margin-top: 4px; }

/* 费用不足 */
.cost-lack { color: var(--danger, #ef4444) !important; }

/* 种族选择 */
.evo-species {
  padding: 20px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  animation: fadeIn 0.4s ease;
}
.evo-species h3 {
  text-align: center;
  font-size: 16px;
  margin-bottom: 16px;
  color: var(--text-accent);
}
.species-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
}
.species-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  padding: 14px 12px;
  background: var(--bg-input);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s;
  color: var(--text-primary);
  font-family: var(--font-sans);
  text-align: left;
}
.species-card:hover { border-color: var(--border-hover); background: var(--bg-card-hover); }
.species-card.active { border-color: var(--accent); background: var(--accent-glow); box-shadow: 0 0 12px var(--accent-glow); }
.species-emoji { font-size: 28px; }
.species-name { font-size: 13px; font-weight: 700; }
.species-traits { font-size: 11px; color: var(--text-accent); }
.species-effect { font-size: 10px; line-height: 1.4; color: var(--text-secondary); }

/* 行星特性 */
.ptrait-section { margin-top: 16px; }
.ptrait-section h4 { text-align: center; font-size: 14px; margin-bottom: 10px; color: var(--text-accent); }
.ptrait-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 8px;
}
.ptrait-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 8px;
  background: var(--bg-input);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s;
  color: var(--text-primary);
  font-family: var(--font-sans);
}
.ptrait-card:hover { border-color: var(--border-hover); background: var(--bg-card-hover); }
.ptrait-card.active { border-color: var(--accent); background: var(--accent-glow); box-shadow: 0 0 10px var(--accent-glow); }
.ptrait-emoji { font-size: 20px; }
.ptrait-name { font-size: 11px; font-weight: 700; }
.ptrait-desc { font-size: 9px; line-height: 1.3; color: var(--text-secondary); text-align: center; }

/* 最终进化按钮 */
.sentience-cost {
  margin-top: 16px;
  font-size: 13px;
  color: var(--text-secondary);
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}
.sentience-btn {
  width: 100%;
  padding: 13px;
  font-size: 15px;
  font-weight: 700;
  margin-top: 8px;
}
</style>
