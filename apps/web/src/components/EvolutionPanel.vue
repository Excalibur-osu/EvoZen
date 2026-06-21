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
import { BASIC_CHALLENGE_UNLOCK_LEVEL, SCENARIO_CHALLENGE_UNLOCK_LEVEL, type ChallengeStartOptions } from '../stores/game'
import { computed, ref, onMounted } from 'vue'
import { applyCustomRace, getAchievementLevel, getSpeciesTraitDescriptors, type EvoUpgrade } from '@evozen/game-core'
import AppIcon from './ui/AppIcon.vue'
import ProgressBar from './ui/ProgressBar.vue'

const game = useGameStore()

const hasEvolvedOnce = ref(false)
onMounted(() => {
  try {
    hasEvolvedOnce.value = localStorage.getItem('evozen_has_evolved_once') === 'true'
  } catch {
    /* localStorage may be unavailable */
  }
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
const dnaNVisible = computed(() => true)

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
const useCustom = ref(false)
type ChallengeMode = NonNullable<ChallengeStartOptions['mode']>
const selectedChallengeMode = ref<ChallengeMode>('standard')
const noPlasmidChallenge = ref(false)
const weakMasteryChallenge = ref(false)
const noTradeChallenge = ref(false)
const noCraftChallenge = ref(false)
const noCrisprChallenge = ref(false)
const nerfedChallenge = ref(false)
const badGenesChallenge = ref(false)
const joylessChallenge = ref(false)
const steelenChallenge = ref(false)
const decayChallenge = ref(false)
const emfieldChallenge = ref(false)
const inflationChallenge = ref(false)
const orbitDecayChallenge = ref(false)
const gravityWellChallenge = ref(false)
const witchHunterChallenge = ref(false)
const sludgeChallenge = ref(false)
const ultraSludgeChallenge = ref(false)
const hasCustomRace = computed(() => {
  const cust = (game.state as Record<string, unknown>)['custom'] as { race0?: unknown } | undefined
  return !!cust?.race0
})
const challengeLevel = computed(() => Number((game.state.genes as Record<string, number>)['challenge'] ?? 0))
const isChallengeUnlocked = computed(() => challengeLevel.value >= 1)

const challengeModes = [
  { id: 'standard', name: '标准', desc: '正常文明开局。', minChallenge: 0 },
  { id: 'junker', name: '废物种', desc: '负面特质场景挑战。', minChallenge: SCENARIO_CHALLENGE_UNLOCK_LEVEL.junker },
  { id: 'cataclysm', name: '灾变', desc: '需要 Shaken 成就；自动套用无质粒、禁 CRISPR、禁贸易、禁制造。', minChallenge: SCENARIO_CHALLENGE_UNLOCK_LEVEL.cataclysm },
  { id: 'banana', name: '香蕉共和国', desc: '需要白洞或飞升；自动套用无质粒、禁 CRISPR、禁贸易、禁制造。', minChallenge: SCENARIO_CHALLENGE_UNLOCK_LEVEL.banana },
  { id: 'truepath', name: '真相之路', desc: '需要飞升或腐化；自动套用削弱、坏基因、禁贸易、禁制造。', minChallenge: SCENARIO_CHALLENGE_UNLOCK_LEVEL.truepath },
  { id: 'fasting', name: '无尽饥饿', desc: '需要腐化；启用禁食挑战科技线。', minChallenge: SCENARIO_CHALLENGE_UNLOCK_LEVEL.fasting },
  { id: 'lone_survivor', name: '孤独幸存者', desc: '需要退休；自动套用削弱、坏基因、禁贸易、禁制造。', minChallenge: SCENARIO_CHALLENGE_UNLOCK_LEVEL.lone_survivor },
  { id: 'warlord', name: '战争之主', desc: '需要 evil 宇宙神杀者；启用 evil/warlord，并自动套用无质粒、禁 CRISPR、禁贸易、禁制造。', minChallenge: SCENARIO_CHALLENGE_UNLOCK_LEVEL.warlord },
] as const

const specialChallenges = [
  { flag: 'joyless', name: '无欢', desc: '禁用快乐相关收益。', model: joylessChallenge },
  { flag: 'steelen', name: '钢铁', desc: '限制材料路线。', model: steelenChallenge },
  { flag: 'decay', name: '基因衰退', desc: '需要白洞。', model: decayChallenge },
  { flag: 'emfield', name: '电磁场', desc: '需要飞升。', model: emfieldChallenge },
  { flag: 'inflation', name: '通货膨胀', desc: '需要守财奴。', model: inflationChallenge },
  { flag: 'orbitDecay', name: '轨道衰退', desc: '需要白洞或飞升。', model: orbitDecayChallenge },
  { flag: 'gravityWell', name: '重力井', desc: '需要 heavy 宇宙播种者。', model: gravityWellChallenge },
  { flag: 'witchHunter', name: '猎巫', desc: '需要 magic 宇宙飞升。', model: witchHunterChallenge },
  { flag: 'sludge', name: '污泥族', desc: '需要飞升/腐化与废物种灭绝。', model: sludgeChallenge },
  { flag: 'ultraSludge', name: '超级污泥族', desc: '需要神杀者与污泥族灭绝。', model: ultraSludgeChallenge },
] as const

const challengeOptions = computed<ChallengeStartOptions>(() => {
  if (!isChallengeUnlocked.value) return { mode: 'standard' }
  const mode = selectedChallengeMode.value
  if (mode !== 'standard') return { mode }
  return {
    mode,
    noPlasmid: noPlasmidChallenge.value,
    weakMastery: weakMasteryChallenge.value,
    noTrade: noTradeChallenge.value,
    noCraft: noCraftChallenge.value,
    noCrispr: noCrisprChallenge.value,
    nerfed: nerfedChallenge.value,
    badGenes: badGenesChallenge.value,
    joyless: joylessChallenge.value,
    steelen: steelenChallenge.value,
    decay: decayChallenge.value,
    emfield: emfieldChallenge.value,
    inflation: inflationChallenge.value,
    orbitDecay: orbitDecayChallenge.value,
    gravityWell: gravityWellChallenge.value,
    witchHunter: witchHunterChallenge.value,
    sludge: sludgeChallenge.value,
    ultraSludge: ultraSludgeChallenge.value,
  }
})

const selectedChallengePreset = computed(() => {
  if (selectedChallengeMode.value === 'truepath' || selectedChallengeMode.value === 'lone_survivor') {
    return ['削弱', '坏基因', '禁贸易', '禁制造']
  }
  if (selectedChallengeMode.value === 'cataclysm' || selectedChallengeMode.value === 'warlord' || selectedChallengeMode.value === 'banana') {
    return ['无质粒', '禁 CRISPR', '禁贸易', '禁制造']
  }
  return []
})

const finalSpeciesName = computed(() => {
  if (selectedChallengeMode.value === 'junker') return '废物种'
  if (selectedChallengeMode.value === 'standard' && ultraSludgeChallenge.value && canSelectSpecialChallenge('ultraSludge')) return '超级污泥族'
  if (selectedChallengeMode.value === 'standard' && sludgeChallenge.value && canSelectSpecialChallenge('sludge')) return '污泥族'
  return availableRaces.value.find(r => r.id === selectedSpecies.value)?.name ?? selectedSpecies.value
})

function hasAchievement(id: string, affix?: 'h' | 'mg' | 'e') {
  return getAchievementLevel(game.state, id, affix) > 0
}

function canSelectChallengeMode(mode: typeof challengeModes[number]) {
  if (challengeLevel.value < mode.minChallenge) return false
  switch (mode.id) {
    case 'standard':
      return true
    case 'cataclysm':
      return hasAchievement('shaken')
    case 'banana':
      return hasAchievement('whitehole') || hasAchievement('ascended')
    case 'truepath':
      return hasAchievement('ascended') || hasAchievement('corrupted')
    case 'lone_survivor':
      return hasAchievement('retired')
    case 'warlord':
      return game.state.race.universe === 'evil' && hasAchievement('godslayer', 'e')
    case 'fasting':
      return hasAchievement('corrupted')
    case 'junker':
      return true
  }
}

function isChallengeFlagUnlocked(flag: keyof Omit<ChallengeStartOptions, 'mode'>) {
  return challengeLevel.value >= BASIC_CHALLENGE_UNLOCK_LEVEL[flag]
}

function canSelectSpecialChallenge(flag: keyof Omit<ChallengeStartOptions, 'mode'>) {
  if (!isChallengeFlagUnlocked(flag)) return false
  switch (flag) {
    case 'joyless':
    case 'steelen':
      return true
    case 'decay':
      return hasAchievement('whitehole')
    case 'emfield':
      return hasAchievement('ascended')
    case 'inflation':
      return hasAchievement('scrooge')
    case 'orbitDecay':
      return hasAchievement('whitehole') || hasAchievement('ascended')
    case 'gravityWell':
      return game.state.race.universe === 'heavy' && hasAchievement('seeder', 'h')
    case 'witchHunter':
      return game.state.race.universe === 'magic' && hasAchievement('ascended', 'mg')
    case 'sludge':
      return (hasAchievement('ascended') || hasAchievement('corrupted')) && hasAchievement('extinct_junker')
    case 'ultraSludge':
      return hasAchievement('godslayer') && hasAchievement('extinct_sludge')
    default:
      return true
  }
}

function toggleSpecialChallenge(flag: keyof Omit<ChallengeStartOptions, 'mode'>, checked: boolean) {
  if (flag === 'sludge' && checked) ultraSludgeChallenge.value = false
  if (flag === 'ultraSludge' && checked) sludgeChallenge.value = false
}

function selectChallengeMode(mode: typeof challengeModes[number]) {
  if (!canSelectChallengeMode(mode)) return
  selectedChallengeMode.value = mode.id
}

function chooseRaceFinal() {
  game.chooseRace(selectedSpecies.value, selectedPtrait.value, challengeOptions.value)
  // 选择后若启用自定义种族，应用 trait
  if (useCustom.value && hasCustomRace.value) {
    applyCustomRace(game.state, false)
  }
}

function quickStart() {
  game.startCivilization('human', 'none', challengeOptions.value)
}

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
          <span class="quick-start-icon"><AppIcon name="zap" /></span>
          <div>
            <h3 class="quick-start-title">快速开始</h3>
            <p class="quick-start-desc">跳过进化阶段，直接以人类身份开始文明。</p>
          </div>
        </div>
        <button class="btn primary quick-start-btn" @click="quickStart()">
          <AppIcon name="play" />
          <span>直接跳过进化</span>
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
          <div class="evo-res-spacer"></div>
          <span class="evo-res-rate font-mono" :class="rateClass(rnaDiff)" v-if="rnaDiff !== 0">
            {{ formatRate(rnaDiff) }}/s
          </span>
          <span class="evo-res-value font-mono">{{ rnaAmount }} / {{ rnaMax }}</span>
        </div>
        <ProgressBar :value="rnaAmount / rnaMax * 100" tone="rna" />
        <button 
          class="btn evo-res-btn" 
          :class="{ primary: rnaAmount < rnaMax }"
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
          <div class="evo-res-spacer"></div>
          <span class="evo-res-rate font-mono" :class="rateClass(dnaDiff)" v-if="dnaDiff !== 0">
            {{ formatRate(dnaDiff) }}/s
          </span>
          <span class="evo-res-value font-mono">{{ dnaAmount }} / {{ dnaMax }}</span>
        </div>
        <ProgressBar :value="dnaAmount / dnaMax * 100" tone="dna" />
        <button
          class="btn evo-res-btn"
          :class="{ primary: rnaAmount >= 2 && dnaAmount < dnaMax }"
          :disabled="rnaAmount < 2 || dnaAmount >= dnaMax"
          @click="game.formDNA()"
        >
          合成 DNA
        </button>
      </div>
    </div>

    <!-- 细胞升级区 -->
    <div v-if="availableUpgrades.length > 0" class="upgrades-section">
      <h3 class="section-title">
        <AppIcon name="crispr" />
        <span>细胞升级</span>
      </h3>
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
      <h3 class="section-title">
        <AppIcon name="evolution" />
        <span>进化突破</span>
      </h3>
      <div class="steps-grid">
        <div
          v-for="step in availableSteps"
          :key="step.id"
          class="step-card"
          :class="{ affordable: canAffordStep(step.dnaCost) }"
        >
          <div class="step-name">
            <AppIcon name="zap" />
            <span>{{ step.name }}</span>
          </div>
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

      <!-- 自定义种族（已配置时显示） -->
      <div v-if="hasCustomRace" class="custom-race-option">
        <h4>
          <AppIcon name="customRace" />
          <span>自定义种族</span>
        </h4>
        <button
          class="species-card"
          :class="{ active: useCustom }"
          @click="useCustom = !useCustom"
        >
          <span class="custom-race-label">
            <AppIcon :name="useCustom ? 'achievement' : 'customRace'" />
            <span>使用自定义种族</span>
          </span>
        </button>
      </div>

      <div class="challenge-section">
        <div class="challenge-head">
          <h4>⚑ 挑战开局</h4>
          <span class="challenge-level">Challenge Lv. {{ challengeLevel }}/5</span>
        </div>
        <div v-if="!isChallengeUnlocked" class="challenge-lock">
          在 CRISPR 中购买挑战基因后可选择挑战开局。
        </div>
        <div class="challenge-grid">
          <button
            v-for="mode in challengeModes"
            :key="mode.id"
            class="challenge-card"
            :class="{ active: selectedChallengeMode === mode.id, locked: !canSelectChallengeMode(mode) }"
            :disabled="!canSelectChallengeMode(mode)"
            @click="selectChallengeMode(mode)"
          >
            <span class="challenge-name">{{ mode.name }}</span>
            <span class="challenge-desc">{{ mode.desc }}</span>
          </button>
        </div>
        <div v-if="selectedChallengePreset.length > 0" class="challenge-preset">
          <span>自动限制</span>
          <span v-for="flag in selectedChallengePreset" :key="flag" class="challenge-chip">{{ flag }}</span>
        </div>
        <div v-if="isChallengeUnlocked && selectedChallengeMode === 'standard'" class="challenge-flags">
          <label class="challenge-toggle">
            <input v-model="noPlasmidChallenge" type="checkbox" :disabled="!isChallengeFlagUnlocked('noPlasmid')">
            <span>无质粒</span>
          </label>
          <label class="challenge-toggle">
            <input v-model="weakMasteryChallenge" type="checkbox" :disabled="!isChallengeFlagUnlocked('weakMastery')">
            <span>弱化精通</span>
          </label>
          <label class="challenge-toggle">
            <input v-model="noTradeChallenge" type="checkbox" :disabled="!isChallengeFlagUnlocked('noTrade')">
            <span>禁贸易</span>
          </label>
          <label class="challenge-toggle">
            <input v-model="noCraftChallenge" type="checkbox" :disabled="!isChallengeFlagUnlocked('noCraft')">
            <span>禁制造</span>
          </label>
          <label class="challenge-toggle">
            <input v-model="noCrisprChallenge" type="checkbox" :disabled="!isChallengeFlagUnlocked('noCrispr')">
            <span>禁 CRISPR</span>
          </label>
          <label class="challenge-toggle">
            <input v-model="nerfedChallenge" type="checkbox" :disabled="!isChallengeFlagUnlocked('nerfed')">
            <span>削弱</span>
          </label>
          <label class="challenge-toggle">
            <input v-model="badGenesChallenge" type="checkbox" :disabled="!isChallengeFlagUnlocked('badGenes')">
            <span>坏基因</span>
          </label>
        </div>
        <div v-if="isChallengeUnlocked && selectedChallengeMode === 'standard'" class="special-challenges">
          <div class="challenge-subtitle">特殊挑战</div>
          <div class="challenge-flags">
            <label
              v-for="challenge in specialChallenges"
              :key="challenge.flag"
              class="challenge-toggle"
              :class="{ locked: !canSelectSpecialChallenge(challenge.flag) }"
            >
              <input
                v-model="challenge.model.value"
                type="checkbox"
                :disabled="!canSelectSpecialChallenge(challenge.flag)"
                @change="toggleSpecialChallenge(challenge.flag, challenge.model.value)"
              >
              <span>{{ challenge.name }}</span>
              <span class="challenge-note">{{ challenge.desc }}</span>
            </label>
          </div>
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
        @click="chooseRaceFinal()"
      >
        <AppIcon name="edenic" />
        <span>进化为 {{ finalSpeciesName }} 踏上文明</span>
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
  color: var(--accent);
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
  background: linear-gradient(135deg, var(--accent-glow), color-mix(in srgb, var(--info) 10%, transparent));
  border: 1px solid color-mix(in srgb, var(--accent) 24%, transparent);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.quick-start-header { display: flex; align-items: center; gap: 12px; }
.quick-start-icon {
  display: inline-flex;
  color: var(--accent);
  flex-shrink: 0;
  filter: drop-shadow(0 0 8px var(--accent-glow));
}
.quick-start-icon svg { width: 22px; height: 22px; }
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
  background: var(--surface-raised);
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
.evo-res-spacer { flex: 1; }
.evo-res-rate { margin-right: 8px; }
.evo-res-value { font-size: 11px; color: var(--text-primary); font-family: var(--font-mono); }
.evo-res-btn {
  width: 100%;
  margin-top: 8px;
}
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
.section-title svg {
  width: 15px;
  height: 15px;
  flex: 0 0 auto;
}
.upgrades-section, .steps-section {
  padding: 12px;
  background: var(--surface-raised);
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
.upgrade-card.affordable { border-color: color-mix(in srgb, var(--accent) 50%, transparent); }
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
.step-name {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-primary);
}
.step-name svg {
  width: 13px;
  height: 13px;
  flex: 0 0 auto;
  color: var(--accent);
}
.step-desc { font-size: 10px; color: var(--text-secondary); line-height: 1.3; min-height: 39px; }
.step-effect { font-size: 10px; color: var(--accent); }
.step-cost { font-size: 10px; font-weight: 600; color: var(--text-secondary); font-family: var(--font-mono); margin-top: auto; }
.step-btn { width: 100%; padding: 4px 0; font-size: 11px; margin-top: 6px; }

/* 费用不足 */
.cost-lack { color: var(--danger) !important; }

/* 种族选择 */
.evo-species {
  padding: 16px;
  background: var(--surface-raised);
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
.species-card.active { border-color: var(--accent); background: var(--accent-glow); box-shadow: inset 0 0 0 1px var(--accent); }
.species-emoji { font-size: 20px; }
.species-name { font-size: 12px; font-weight: 700; }
.species-traits { font-size: 10px; color: var(--secondary); }
.species-effect { font-size: 10px; line-height: 1.3; color: var(--text-secondary); }
.custom-race-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
}
.custom-race-option h4 {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.custom-race-option h4 svg {
  width: 14px;
  height: 14px;
  flex: 0 0 auto;
}

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
.ptrait-card.active { border-color: var(--accent); background: var(--accent-glow); }
.ptrait-emoji { font-size: 16px; }
.ptrait-name { font-size: 10px; font-weight: 700; }
.ptrait-desc { font-size: 9px; line-height: 1.2; color: var(--text-secondary); text-align: center; }

.challenge-section { margin-top: 16px; }
.challenge-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.challenge-section h4 { font-size: 12px; margin: 0; color: var(--text-secondary); text-align: left; }
.challenge-level {
  font-size: 10px;
  color: var(--text-muted);
  font-family: var(--font-mono);
}
.challenge-lock {
  margin-bottom: 8px;
  padding: 6px 8px;
  background: var(--warning-glow);
  border: 1px solid color-mix(in srgb, var(--warning) 28%, transparent);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 10px;
  text-align: left;
}
.challenge-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 6px;
}
.challenge-card {
  min-height: 68px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 8px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
  transition: all 0.2s;
}
.challenge-card:hover { border-color: var(--border-hover); background: var(--bg-card-hover); }
.challenge-card.active { border-color: var(--accent); background: var(--accent-glow); }
.challenge-card:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.challenge-card.locked:hover {
  border-color: var(--border-color);
  background: var(--bg-input);
}
.challenge-name { font-size: 11px; font-weight: 700; }
.challenge-desc { font-size: 10px; line-height: 1.3; color: var(--text-secondary); }
.challenge-preset {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  color: var(--text-muted);
  font-size: 10px;
}
.challenge-chip {
  padding: 3px 6px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
}
.challenge-flags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
.special-challenges { margin-top: 10px; }
.challenge-subtitle {
  font-size: 10px;
  font-weight: 700;
  color: var(--text-muted);
  text-align: left;
}
.challenge-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 28px;
  padding: 5px 8px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 11px;
  cursor: pointer;
}
.challenge-toggle.locked {
  opacity: 0.48;
  cursor: not-allowed;
}
.challenge-toggle input { margin: 0; }
.challenge-note {
  color: var(--text-muted);
  font-size: 10px;
}

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
  background: linear-gradient(180deg, var(--surface-pressed) 0%, var(--surface-raised) 100%);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
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
  text-shadow: 0 0 10px var(--accent-glow);
}

.quote-mark {
  color: var(--accent);
  opacity: 0.6;
  font-size: 16px;
  font-style: normal;
  margin: 0 6px;
}

.border-glow {
  box-shadow: inset 0 0 20px var(--surface-pressed),
              0 0 15px var(--accent-glow);
}
</style>
