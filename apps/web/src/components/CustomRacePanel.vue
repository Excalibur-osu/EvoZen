<!--
  CustomRacePanel — 自定义种族编辑器
-->
<script setup lang="ts">
import { useGameStore } from '../stores/game'
import { computed, ref } from 'vue'
import {
  GENUS_DEFS,
  TRAITS,
  loadCustomRace,
  saveCustomRace,
  validateCustomRace,
  calcCustomRaceBalance,
  type CustomRaceConfig,
  type GenusId,
  type RaceTraitDetail,
} from '@evozen/game-core'
import PanelHeader from './ui/PanelHeader.vue'

const game = useGameStore()

const name = ref('我的自定义种族')
const desc = ref('一支独特的种族')
const home = ref('故乡')
const entity = ref('居民')
const genus = ref<GenusId>('humanoid')
const hybridParentA = ref<GenusId>('humanoid')
const hybridParentB = ref<GenusId>('small')
const selectedTraits = ref<string[]>([])
const traitRanks = ref<Record<string, number>>({})
const fanaticism = ref('')
const saveMessage = ref('')

const genusOptions: GenusId[] = ['humanoid', 'carnivore', 'herbivore', 'omnivore', 'small', 'giant', 'reptilian', 'avian', 'insectoid', 'plant', 'fungi', 'aquatic', 'fey', 'heat', 'polar', 'sand', 'demonic', 'angelic', 'synthetic', 'eldritch']
const hybridParentOptions = genusOptions
const rankOptions = [0.1, 0.25, 0.5, 1, 2, 3, 4]

const availableTraits = computed(() =>
  Object.entries(TRAITS)
    .filter(([, def]) => def.type === 'major')
    .map(([id, def]) => ({ id, ...def })),
)

const balance = computed(() => calcCustomRaceBalance(selectedTraits.value))

const selectedTraitRanks = computed(() => {
  const ranks: Record<string, number> = {}
  for (const traitId of selectedTraits.value) {
    const rank = traitRanks.value[traitId] ?? 1
    if (rank !== 1) ranks[traitId] = rank
  }
  return ranks
})

const customConfig = computed<CustomRaceConfig>(() => ({
  name: name.value,
  desc: desc.value,
  home: home.value,
  entity: entity.value,
  genus: genus.value,
  traits: selectedTraits.value,
  fanaticism: fanaticism.value,
  ranks: selectedTraitRanks.value,
}))

const hybridConfig = computed<CustomRaceConfig>(() => ({
  ...customConfig.value,
  genus: 'hybrid',
  hybrid: [hybridParentA.value, hybridParentB.value],
}))

const customValidation = computed(() => validateCustomRace(customConfig.value))
const hybridValidation = computed(() => validateCustomRace(hybridConfig.value))

const savedCustom = computed(() => loadCustomRace(game.state, false))
const savedHybrid = computed(() => loadCustomRace(game.state, true))

const customPreview = computed(() => buildTraitPreview(customConfig.value))
const hybridPreview = computed(() => buildTraitPreview(hybridConfig.value))

function toggleTrait(t: string) {
  const idx = selectedTraits.value.indexOf(t)
  if (idx >= 0) {
    selectedTraits.value.splice(idx, 1)
    delete traitRanks.value[t]
    if (fanaticism.value === t) fanaticism.value = selectedTraits.value[0] ?? ''
  } else if (selectedTraits.value.length < 7) {
    selectedTraits.value.push(t)
    traitRanks.value[t] = 1
    if (!fanaticism.value) fanaticism.value = t
  }
}

function save(hybrid: boolean = false) {
  const baseConfig = hybrid ? hybridConfig.value : customConfig.value
  const config: CustomRaceConfig = {
    ...baseConfig,
    traits: [...baseConfig.traits],
    hybrid: baseConfig.hybrid ? [...baseConfig.hybrid] : undefined,
    ranks: { ...(baseConfig.ranks ?? {}) },
  }
  saveCustomRace(game.state, config, hybrid)
  saveMessage.value = `已保存为${hybrid ? '混血自定义' : '自定义'}种族。`
  game.addMessage(saveMessage.value, 'success', 'progress')
}

function loadSaved(hybrid: boolean) {
  const config = loadCustomRace(game.state, hybrid)
  if (!config) return
  name.value = config.name
  desc.value = config.desc
  home.value = config.home
  entity.value = config.entity
  genus.value = config.genus === 'hybrid' ? 'humanoid' : config.genus
  const parents = config.hybrid ?? []
  hybridParentA.value = parents[0] && isEditableGenus(parents[0]) ? parents[0] : 'humanoid'
  hybridParentB.value = parents[1] && isEditableGenus(parents[1]) ? parents[1] : 'small'
  selectedTraits.value = [...config.traits]
  traitRanks.value = Object.fromEntries(config.traits.map((traitId) => [traitId, config.ranks?.[traitId] ?? 1]))
  fanaticism.value = config.traits.includes(config.fanaticism) ? config.fanaticism : (config.traits[0] ?? '')
  saveMessage.value = `已载入${hybrid ? '混血自定义' : '自定义'}配置。`
}

function isEditableGenus(value: GenusId): boolean {
  return hybridParentOptions.includes(value)
}

function buildTraitPreview(config: CustomRaceConfig): RaceTraitDetail[] {
  const ranks: Record<string, number> = {}
  if (config.genus !== 'hybrid') {
    Object.assign(ranks, GENUS_DEFS[config.genus]?.traits ?? {})
  }
  for (const parent of config.hybrid ?? []) {
    Object.assign(ranks, GENUS_DEFS[parent]?.traits ?? {})
  }
  for (const traitId of config.traits) {
    ranks[traitId] = config.ranks?.[traitId] ?? 1
  }
  return Object.entries(ranks).map(([id, rank]) => {
    const def = TRAITS[id]
    return {
      id,
      name: def?.name ?? id,
      desc: def?.desc ?? '',
      rank,
      val: def?.val ?? 0,
      type: def?.type ?? '',
      isFanaticism: config.fanaticism === id,
    }
  })
}
</script>

<template>
  <div class="custom-panel">
    <PanelHeader icon="customRace" title="自定义种族编辑器" subtitle="设计你专属的种族，平衡分数应保持在 0 附近。" />

    <div class="editor-card card">
    <div class="load-row">
      <button class="btn secondary" :disabled="!savedCustom" @click="loadSaved(false)">载入自定义</button>
      <button class="btn secondary" :disabled="!savedHybrid" @click="loadSaved(true)">载入混血</button>
      <span class="saved-state">
        {{ savedCustom ? `自定义：${savedCustom.name}` : '自定义未保存' }} /
        {{ savedHybrid ? `混血：${savedHybrid.name}` : '混血未保存' }}
      </span>
    </div>
    <div class="row">
      <label>名字：</label>
      <input v-model="name" class="text-input" />
    </div>
    <div class="row">
      <label>描述：</label>
      <input v-model="desc" class="text-input" />
    </div>
    <div class="row">
      <label>故乡：</label>
      <input v-model="home" class="text-input" />
    </div>
    <div class="row">
      <label>单位：</label>
      <input v-model="entity" class="text-input" />
    </div>

    <div class="row">
      <label>属类：</label>
      <select v-model="genus" class="genus-select">
        <option v-for="g in genusOptions" :key="g" :value="g">{{ GENUS_DEFS[g].name }}</option>
      </select>
    </div>

    <div class="row hybrid-row">
      <label>混血父属：</label>
      <select v-model="hybridParentA" class="genus-select">
        <option v-for="g in hybridParentOptions" :key="g" :value="g">{{ GENUS_DEFS[g].name }}</option>
      </select>
      <span class="hybrid-plus">+</span>
      <select v-model="hybridParentB" class="genus-select">
        <option v-for="g in hybridParentOptions" :key="g" :value="g">{{ GENUS_DEFS[g].name }}</option>
      </select>
    </div>
    </div>

    <h3 class="section-title">选择特质（{{ selectedTraits.length }}/7）</h3>
    <div class="balance">
      平衡分：<strong :class="balance > 5 ? 'bad' : (balance < -5 ? 'low' : 'good')">{{ balance }}</strong>
      （越接近 0 越平衡）
    </div>

    <div class="traits-grid">
      <button
        v-for="t in availableTraits"
        :key="t.id"
        :class="['trait-chip', { active: selectedTraits.includes(t.id), positive: t.val > 0, negative: t.val < 0 }]"
        :data-tooltip="t.desc || undefined"
        data-tooltip-pos="bottom"
        @click="toggleTrait(t.id)"
      >
        {{ t.name }} ({{ t.val > 0 ? '+' + t.val : t.val }})
      </button>
    </div>

    <div v-if="selectedTraits.length > 0" class="rank-grid">
      <div v-for="t in selectedTraits" :key="t" class="rank-row">
        <span class="rank-name">{{ TRAITS[t]?.name ?? t }}</span>
        <select v-model.number="traitRanks[t]" class="genus-select">
          <option v-for="rank in rankOptions" :key="rank" :value="rank">等级 {{ rank }}</option>
        </select>
      </div>
    </div>

    <div class="row" v-if="selectedTraits.length > 0">
      <label>狂热信仰：</label>
      <select v-model="fanaticism" class="genus-select">
        <option v-for="t in selectedTraits" :key="t" :value="t">{{ TRAITS[t]?.name ?? t }}</option>
      </select>
    </div>

    <div class="actions">
      <button class="save-btn btn primary" :disabled="!customValidation.valid" @click="save(false)">保存为自定义</button>
      <button class="save-btn btn primary" :disabled="!hybridValidation.valid" @click="save(true)">保存为混血</button>
    </div>

    <div v-if="customPreview.length || hybridPreview.length" class="preview-grid">
      <section class="preview-panel">
        <h3 class="section-title">自定义预览</h3>
        <div class="preview-meta">{{ GENUS_DEFS[customConfig.genus]?.name ?? customConfig.genus }}</div>
        <div class="trait-list">
          <span
            v-for="trait in customPreview"
            :key="trait.id"
            :class="['trait-pill', { positive: trait.val > 0, negative: trait.val < 0, fanatic: trait.isFanaticism }]"
            :data-tooltip="trait.desc || undefined"
            data-tooltip-pos="bottom"
          >
            {{ trait.name }}{{ trait.rank !== 1 ? ` ×${trait.rank}` : '' }}{{ trait.isFanaticism ? ' · 狂热' : '' }}
          </span>
        </div>
      </section>
      <section class="preview-panel">
        <h3 class="section-title">混血预览</h3>
        <div class="preview-meta">{{ GENUS_DEFS[hybridParentA]?.name }} + {{ GENUS_DEFS[hybridParentB]?.name }}</div>
        <div class="trait-list">
          <span
            v-for="trait in hybridPreview"
            :key="trait.id"
            :class="['trait-pill', { positive: trait.val > 0, negative: trait.val < 0, fanatic: trait.isFanaticism }]"
            :data-tooltip="trait.desc || undefined"
            data-tooltip-pos="bottom"
          >
            {{ trait.name }}{{ trait.rank !== 1 ? ` ×${trait.rank}` : '' }}{{ trait.isFanaticism ? ' · 狂热' : '' }}
          </span>
        </div>
      </section>
    </div>

    <p v-if="!customValidation.valid" class="error">自定义：{{ customValidation.reason }}</p>
    <p v-if="!hybridValidation.valid" class="error">混血：{{ hybridValidation.reason }}</p>
    <p v-else-if="saveMessage" class="success">{{ saveMessage }}</p>
  </div>
</template>

<style scoped>
.custom-panel { display: flex; flex-direction: column; gap: 10px; }
.editor-card { padding: 10px; }
.load-row { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
.saved-state { color: var(--text-muted); font-size: 12px; }
.row { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
.row:last-child { margin-bottom: 0; }
.row label { min-width: 70px; color: var(--text-secondary); }
.text-input { flex: 1; background: var(--bg-input); color: var(--text-primary); border: 1px solid var(--border-color); padding: 0.3rem 0.5rem; border-radius: var(--radius-sm); }
.genus-select { background: var(--bg-input); color: var(--text-primary); border: 1px solid var(--border-color); padding: 0.3rem 0.5rem; border-radius: var(--radius-sm); }
.hybrid-row { flex-wrap: wrap; }
.hybrid-plus { color: var(--text-muted); }

.section-title { font-size: 13px; color: var(--text-primary); margin: 0; }
.balance { font-size: 0.85rem; margin-bottom: 0.5rem; }
.balance strong.good { color: var(--success); }
.balance strong.bad { color: var(--danger); }
.balance strong.low { color: var(--warning); }

.traits-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 0.3rem; margin-bottom: 1rem; }
.trait-chip {
  background: var(--bg-card); color: var(--text-secondary); border: 1px solid var(--border-color);
  padding: 0.3rem 0.5rem; border-radius: var(--radius-sm); cursor: pointer; font-size: 0.8rem;
  text-align: left;
}
.trait-chip:hover { border-color: var(--border-hover); color: var(--text-primary); }
.trait-chip.active { background: var(--accent-glow); border-color: var(--accent); }
.trait-chip.positive { color: var(--success); }
.trait-chip.negative { color: var(--danger); }
.rank-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 6px; margin-bottom: 10px; }
.rank-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-sm); }
.rank-name { color: var(--text-secondary); font-size: 12px; }
.preview-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px; margin-top: 10px; }
.preview-panel { border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 8px; background: var(--bg-card); }
.preview-meta { margin-top: 4px; color: var(--text-muted); font-size: 12px; }
.trait-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.trait-pill { border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 3px 6px; color: var(--text-secondary); font-size: 12px; }
.trait-pill.positive { color: var(--success); }
.trait-pill.negative { color: var(--danger); }
.trait-pill.fanatic { border-color: var(--accent); background: var(--accent-glow); color: var(--text-primary); }

.actions { margin-top: 0.8rem; display: flex; gap: 0.5rem; }
.error { color: var(--danger); margin-top: 0.5rem; font-size: 0.85rem; }
.success { color: var(--success); margin-top: 0.5rem; font-size: 0.85rem; }
</style>
