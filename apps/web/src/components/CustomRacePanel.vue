<!--
  CustomRacePanel — 自定义种族编辑器
-->
<script setup lang="ts">
import { useGameStore } from '../stores/game'
import { computed, ref } from 'vue'
import {
  GENUS_DEFS,
  TRAITS,
  saveCustomRace,
  validateCustomRace,
  calcCustomRaceBalance,
  type CustomRaceConfig,
  type GenusId,
} from '@evozen/game-core'
import PanelHeader from './ui/PanelHeader.vue'

const game = useGameStore()

const name = ref('我的自定义种族')
const desc = ref('一支独特的种族')
const home = ref('故乡')
const entity = ref('居民')
const genus = ref<GenusId>('humanoid')
const selectedTraits = ref<string[]>([])
const fanaticism = ref('')
const saveMessage = ref('')

const genusOptions: GenusId[] = ['humanoid', 'carnivore', 'herbivore', 'small', 'giant', 'reptilian', 'avian', 'insectoid', 'plant', 'fungi', 'aquatic', 'fey', 'heat', 'polar', 'sand', 'demonic', 'angelic', 'synthetic', 'eldritch']

const availableTraits = computed(() =>
  Object.entries(TRAITS)
    .filter(([, def]) => def.type === 'major')
    .map(([id, def]) => ({ id, ...def })),
)

const balance = computed(() => calcCustomRaceBalance(selectedTraits.value))

const validation = computed(() => {
  return validateCustomRace({
    name: name.value,
    desc: desc.value,
    home: home.value,
    entity: entity.value,
    genus: genus.value,
    traits: selectedTraits.value,
    fanaticism: fanaticism.value,
  })
})

function toggleTrait(t: string) {
  const idx = selectedTraits.value.indexOf(t)
  if (idx >= 0) {
    selectedTraits.value.splice(idx, 1)
    if (fanaticism.value === t) fanaticism.value = selectedTraits.value[0] ?? ''
  } else if (selectedTraits.value.length < 7) {
    selectedTraits.value.push(t)
    if (!fanaticism.value) fanaticism.value = t
  }
}

function save(hybrid: boolean = false) {
  const config: CustomRaceConfig = {
    name: name.value,
    desc: desc.value,
    home: home.value,
    entity: entity.value,
    genus: genus.value,
    traits: [...selectedTraits.value],
    fanaticism: fanaticism.value,
  }
  saveCustomRace(game.state, config, hybrid)
  saveMessage.value = `已保存为 ${hybrid ? 'Hybrid' : 'Custom'} 种族。`
  game.addMessage(saveMessage.value, 'success', 'progress')
}
</script>

<template>
  <div class="custom-panel">
    <PanelHeader icon="customRace" title="自定义种族编辑器" subtitle="设计你专属的种族，平衡分数应保持在 0 附近。" />

    <div class="editor-card card">
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
    </div>

    <h3 class="section-title">选择 Trait（{{ selectedTraits.length }}/7）</h3>
    <div class="balance">
      平衡分：<strong :class="balance > 5 ? 'bad' : (balance < -5 ? 'low' : 'good')">{{ balance }}</strong>
      （越接近 0 越平衡）
    </div>

    <div class="traits-grid">
      <button
        v-for="t in availableTraits"
        :key="t.id"
        :class="['trait-chip', { active: selectedTraits.includes(t.id), positive: t.val > 0, negative: t.val < 0 }]"
        :title="t.desc"
        @click="toggleTrait(t.id)"
      >
        {{ t.name }} ({{ t.val > 0 ? '+' + t.val : t.val }})
      </button>
    </div>

    <div class="row" v-if="selectedTraits.length > 0">
      <label>狂热信仰：</label>
      <select v-model="fanaticism" class="genus-select">
        <option v-for="t in selectedTraits" :key="t" :value="t">{{ TRAITS[t]?.name ?? t }}</option>
      </select>
    </div>

    <div class="actions">
      <button class="save-btn btn primary" :disabled="!validation.valid" @click="save(false)">保存为 Custom</button>
      <button class="save-btn btn primary" :disabled="!validation.valid" @click="save(true)">保存为 Hybrid</button>
    </div>
    <p v-if="!validation.valid" class="error">{{ validation.reason }}</p>
    <p v-else-if="saveMessage" class="success">{{ saveMessage }}</p>
  </div>
</template>

<style scoped>
.custom-panel { display: flex; flex-direction: column; gap: 10px; }
.editor-card { padding: 10px; }
.row { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
.row:last-child { margin-bottom: 0; }
.row label { min-width: 70px; color: var(--text-secondary); }
.text-input { flex: 1; background: var(--bg-input); color: var(--text-primary); border: 1px solid var(--border-color); padding: 0.3rem 0.5rem; border-radius: var(--radius-sm); }
.genus-select { background: var(--bg-input); color: var(--text-primary); border: 1px solid var(--border-color); padding: 0.3rem 0.5rem; border-radius: var(--radius-sm); }

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

.actions { margin-top: 0.8rem; display: flex; gap: 0.5rem; }
.error { color: var(--danger); margin-top: 0.5rem; font-size: 0.85rem; }
.success { color: var(--success); margin-top: 0.5rem; font-size: 0.85rem; }
</style>
