<!--
  CrisprPanel — 基因强化（CRISPR）面板
-->
<script setup lang="ts">
import { useGameStore } from '../stores/game'
import { computed, ref } from 'vue'
import {
  addRaceTrait,
  canAddRaceTrait,
  CRISPR_UPGRADES,
  canRemoveRaceTrait,
  canPurchaseCrispr,
  getAddableRaceTraits,
  getCrisprLevel,
  getCrisprPrestigeResource,
  getDiscoveredMinorTraits,
  getGeneSequenceState,
  getRemovableRaceTraits,
  GENE_MINOR_TRAIT_NAMES,
  isCrisprUnlocked,
  purchaseCrispr,
  removeRaceTrait,
  rollMinorTrait,
  setGeneSequenceActive,
} from '@evozen/game-core'
import PanelHeader from './ui/PanelHeader.vue'
import EmptyState from './ui/EmptyState.vue'
import MetricCard from './ui/MetricCard.vue'
import ProgressBar from './ui/ProgressBar.vue'
import AppIcon from './ui/AppIcon.vue'
import { useConfirmDialog } from '../utils/confirm-dialog'

const game = useGameStore()
const { confirm } = useConfirmDialog()

const unlocked = computed(() => isCrisprUnlocked(game.state))
const plasmid = computed(() => (game.state.prestige as Record<string, { count?: number }>)?.['Plasmid']?.count ?? 0)
const phage = computed(() => (game.state.prestige as Record<string, { count?: number }>)?.['Phage']?.count ?? 0)
const antiPlasmid = computed(() => (game.state.prestige as Record<string, { count?: number }>)?.['AntiPlasmid']?.count ?? 0)
const crisprPrestigeName = computed(() => getCrisprPrestigeResource(game.state) === 'AntiPlasmid' ? '反质粒' : '质粒')
const geneAmount = computed(() => game.state.resource['Genes']?.amount ?? 0)
const sequence = computed(() => getGeneSequenceState(game.state))
const sequencePercent = computed(() => {
  const current = sequence.value
  return current && current.max > 0 ? current.progress / current.max * 100 : 0
})
const sequenceLabel = computed(() => (game.state.tech['genetics'] ?? 0) === 2 ? '基因组测序' : '基因突变')
const knowledgeRate = computed(() => {
  const mutation = Number(game.state.race['mutation'] ?? 0)
  return (50 + mutation * 10) * (sequence.value?.boost ? 4 : 1)
})

function toggleSequence() {
  const current = sequence.value
  if (!current) return
  setGeneSequenceActive(game.state, !current.on)
  game.state.arpa = { ...game.state.arpa }
}

function level(id: string) { return getCrisprLevel(game.state, id) }
function canBuy(id: string) { return canPurchaseCrispr(game.state, id) }
function buy(id: string) {
  if (purchaseCrispr(game.state, id)) {
    // 触发响应式更新
    game.state.prestige = { ...game.state.prestige } as typeof game.state.prestige
    game.state.genes = { ...game.state.genes }
    game.state.race = { ...game.state.race }
  }
}
function plasmidCost(id: string) {
  const u = CRISPR_UPGRADES.find((x) => x.id === id)
  if (!u) return 0
  return u.plasmidCost(level(id))
}
function phageCost(id: string) {
  const u = CRISPR_UPGRADES.find((x) => x.id === id)
  if (!u || !u.phageCost) return 0
  return u.phageCost(level(id))
}

const discoveredMinor = computed(() => getDiscoveredMinorTraits(game.state))
const mutationLevel = computed(() => Number(game.state.genes['mutation'] ?? 0))
const removableTraits = computed(() => getRemovableRaceTraits(game.state))
const addableTraits = computed(() => getAddableRaceTraits(game.state))
const lastRolled = ref<string | null>(null)
function doRoll() {
  const result = rollMinorTrait(game.state)
  if (result) {
    lastRolled.value = GENE_MINOR_TRAIT_NAMES[result] ?? result
  } else {
    lastRolled.value = '抽取失败：质粒/噬菌体不足或已发现全部'
  }
}

function refreshModificationState() {
  game.state.prestige = { ...game.state.prestige } as typeof game.state.prestige
  game.state.race = { ...game.state.race }
  game.state.stats = { ...game.state.stats }
}

async function purgeTrait(traitId: string, name: string) {
  const trait = removableTraits.value.find((item) => item.id === traitId)
  if (!trait) return
  const ok = await confirm({
    title: '移除种族特质',
    message: `确定消耗 ${trait.cost} ${trait.resource === 'AntiPlasmid' ? '反质粒' : '质粒'}移除“${name}”吗？本世代的后续编辑费用会提高。`,
    confirmLabel: '移除特质',
    tone: 'danger',
  })
  if (ok && removeRaceTrait(game.state, traitId)) refreshModificationState()
}

function gainTrait(traitId: string) {
  if (addRaceTrait(game.state, traitId)) refreshModificationState()
}
</script>

<template>
  <div class="crispr-panel">
    <PanelHeader icon="crispr" title="基因工程" subtitle="基因组测序、基因突变与 CRISPR 强化。" />

    <div class="prestige-row">
      <MetricCard label="基因" :value="Math.floor(geneAmount)" tone="accent" />
      <MetricCard label="质粒" :value="Math.floor(plasmid)" />
      <MetricCard label="反质粒" :value="Math.floor(antiPlasmid)" />
      <MetricCard label="噬菌体" :value="Math.floor(phage)" />
    </div>

    <section v-if="sequence" class="sequence-section card">
      <div class="sequence-head">
        <div>
          <h3 class="section-title">{{ sequenceLabel }}</h3>
          <p class="sequence-meta">通电实验室 {{ sequence.labs }} · 知识消耗 {{ knowledgeRate }}/秒</p>
        </div>
        <span class="sequence-status" :class="sequence.on ? 'active' : 'idle'">
          {{ sequence.on ? '运行中' : '已暂停' }}
        </span>
      </div>
      <div class="sequence-progress">
        <div class="progress-label">
          <span>进度</span>
          <span class="font-mono">{{ sequence.progress.toFixed(1) }} / {{ sequence.max.toLocaleString() }}</span>
        </div>
        <ProgressBar :value="sequencePercent" />
      </div>
      <button class="btn" :class="sequence.on ? 'danger' : 'primary'" @click="toggleSequence">
        <AppIcon :name="sequence.on ? 'pause' : 'play'" />
        <span>{{ sequence.on ? '暂停' : '启动' }}</span>
      </button>
    </section>

    <EmptyState v-if="!unlocked" text="研究 CRISPR 科技后可使用永久基因强化。" icon="lock" />

    <template v-else>
      <section class="modification-section card">
        <div class="modification-head">
          <div>
            <h3 class="section-title">种族特质编辑</h3>
            <p>形态突变等级 {{ mutationLevel }}/3</p>
          </div>
          <span class="mutation-badge">本世代修改 {{ Number((game.state.race.modified as Record<string, number> | undefined)?.t ?? 0) }} 次</span>
        </div>

        <p v-if="mutationLevel < 1" class="modification-empty">购买形态突变后可移除主要特质。</p>
        <template v-else>
          <h4 class="trait-group-title">可移除特质</h4>
          <div v-if="removableTraits.length" class="trait-grid">
            <div v-for="trait in removableTraits" :key="`remove-${trait.id}`" class="trait-row">
              <div class="trait-copy">
                <strong>{{ trait.name }} <span>Rank {{ trait.rank }}</span></strong>
                <p>{{ trait.desc }}</p>
              </div>
              <button class="btn danger sm" :disabled="!canRemoveRaceTrait(game.state, trait.id)" @click="purgeTrait(trait.id, trait.name)">
                移除 · {{ trait.cost }} {{ trait.resource === 'AntiPlasmid' ? '反质粒' : '质粒' }}
              </button>
            </div>
          </div>
          <p v-else class="modification-empty">当前没有可移除的特质。</p>
        </template>

        <template v-if="mutationLevel >= 3">
          <h4 class="trait-group-title">可添加特质</h4>
          <div v-if="addableTraits.length" class="trait-grid">
            <div v-for="trait in addableTraits" :key="`add-${trait.id}`" class="trait-row">
              <div class="trait-copy">
                <strong>{{ trait.name }} <span>Rank {{ trait.rank }}</span></strong>
                <p>{{ trait.desc }}</p>
              </div>
              <button class="btn primary sm" :disabled="!canAddRaceTrait(game.state, trait.id)" @click="gainTrait(trait.id)">
                添加 · {{ trait.cost }} {{ trait.resource === 'AntiPlasmid' ? '反质粒' : '质粒' }}
              </button>
            </div>
          </div>
          <p v-else class="modification-empty">当前种族没有可添加的同属主要特质。</p>
        </template>
      </section>

      <!-- 抽取次要特质 -->
      <div class="roll-section card">
        <h3 class="section-title">抽取次要特质</h3>
        <p>用 25 {{ crisprPrestigeName }} + 1 噬菌体随机抽取一个次要特质加入基因池。</p>
        <p>已发现 ({{ discoveredMinor.length }}/13)：
          <span v-for="t in discoveredMinor" :key="t" class="minor-chip">{{ GENE_MINOR_TRAIT_NAMES[t] ?? t }}</span>
        </p>
        <button class="roll-btn btn primary" @click="doRoll">抽取</button>
        <p v-if="lastRolled" class="roll-result">{{ lastRolled }}</p>
      </div>

      <div class="upgrade-list">
        <div v-for="upg in CRISPR_UPGRADES" :key="upg.id" class="upgrade-card card">
          <div class="upg-head">
            <span class="upg-name">{{ upg.name }}</span>
            <span class="upg-level">Lv. {{ level(upg.id) }}/{{ upg.maxLevel ?? 5 }}</span>
          </div>
          <p class="upg-desc">{{ upg.desc }}</p>
          <div class="upg-buy">
            <span class="cost">
              {{ plasmidCost(upg.id) }} {{ crisprPrestigeName }}
              <span v-if="phageCost(upg.id) > 0"> + {{ phageCost(upg.id) }} 噬菌体</span>
            </span>
            <button class="buy-btn btn primary sm" :disabled="!canBuy(upg.id)" @click="buy(upg.id)">
              强化
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.crispr-panel { display: flex; flex-direction: column; gap: 10px; }

.prestige-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; }

.sequence-section { padding: 12px; display: flex; flex-direction: column; gap: 10px; }
.sequence-head, .progress-label { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.sequence-meta, .progress-label { margin: 3px 0 0; color: var(--text-secondary); font-size: 12px; }
.sequence-status { padding: 3px 8px; border-radius: var(--radius-sm); font-size: 11px; font-weight: 700; }
.sequence-status.active { color: var(--success); background: var(--success-glow); }
.sequence-status.idle { color: var(--text-muted); background: var(--bg-input); }
.sequence-progress { display: flex; flex-direction: column; gap: 5px; }
.sequence-section .btn { align-self: flex-start; }

.upgrade-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 0.5rem; }
.upgrade-card { padding: 10px; }
.upg-head { display: flex; justify-content: space-between; }
.upg-name { font-weight: 700; color: var(--text-primary); }
.upg-level { color: var(--text-secondary); font-size: 0.85rem; }
.upg-desc { font-size: 0.8rem; color: var(--text-secondary); margin: 0.3rem 0; }
.upg-buy { display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem; }
.cost { font-size: 0.85rem; color: var(--warning); }
.roll-section { padding: 10px; }
.section-title { font-size: 13px; color: var(--text-primary); margin: 0 0 6px; }
.roll-section p { font-size: 0.85rem; color: var(--text-secondary); margin: 0.3rem 0; }
.minor-chip { display: inline-block; background: var(--surface-pressed); color: var(--warning); padding: 0.1rem 0.4rem; border-radius: var(--radius-sm); font-size: 0.75rem; margin: 0.1rem; }
.roll-result { color: var(--warning); font-weight: 700; }
.modification-section { padding: 12px; display: flex; flex-direction: column; gap: 8px; }
.modification-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
.modification-head p, .modification-empty { margin: 2px 0 0; color: var(--text-secondary); font-size: 12px; }
.mutation-badge { padding: 3px 8px; border-radius: var(--radius-sm); background: var(--bg-input); color: var(--text-secondary); font-size: 11px; white-space: nowrap; }
.trait-group-title { margin: 5px 0 0; font-size: 12px; color: var(--text-secondary); }
.trait-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 6px; }
.trait-row { min-width: 0; padding: 8px; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.trait-copy { min-width: 0; }
.trait-copy strong { display: block; color: var(--text-primary); font-size: 12px; }
.trait-copy strong span { color: var(--text-muted); font-weight: 500; }
.trait-copy p { margin: 2px 0 0; color: var(--text-secondary); font-size: 11px; }
.trait-row .btn { flex: 0 0 auto; }

@media (max-width: 640px) {
  .trait-row { align-items: stretch; flex-direction: column; }
  .trait-row .btn { width: 100%; }
}
</style>
