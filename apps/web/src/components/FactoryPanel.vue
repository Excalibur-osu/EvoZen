<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import { getResourceName } from '../utils/resourceNames'
import type { FactoryState, FactoryLineId } from '@evozen/game-core'
import AppIcon from './ui/AppIcon.vue'
import AllocationControl from './ui/AllocationControl.vue'

const game = useGameStore()

const factoryState = computed(() => game.state.city.factory as FactoryState | undefined)
const cityFactories = computed(() => factoryState.value?.count ?? 0)
const redFactories = computed(() => {
  const red = game.state.space['red_factory'] as { count?: number } | undefined
  return red?.count ?? 0
})
const totalFactories = computed(() => cityFactories.value + redFactories.value)
const isUnlocked = computed(() => totalFactories.value > 0)

const lineDefs: Array<{
  id: FactoryLineId
  name: string
  desc: string
  unlocked: () => boolean
}> = [
  {
    id: 'Lux',
    name: '奢侈品',
    desc: '消耗毛皮，按人口需求转化为金币收入。',
    unlocked: () => true,
  },
  {
    id: 'Furs',
    name: '合成毛皮',
    desc: '消耗金币与聚合物，自动生产毛皮。',
    unlocked: () => true,
  },
  {
    id: 'Alloy',
    name: '合金',
    desc: '消耗铜与铝，生产高级工业材料。',
    unlocked: () => true,
  },
  {
    id: 'Polymer',
    name: '聚合物',
    desc: '消耗石油与木材，生产高分子材料。',
    unlocked: () => true,
  },
  {
    id: 'Nano',
    name: getResourceName('Nano_Tube'),
    desc: '消耗煤与中子素，生产纳米管。',
    unlocked: () => (game.state.tech['nano'] ?? 0) >= 1 || !!game.state.resource['Nano_Tube']?.display,
  },
  {
    id: 'Stanene',
    name: getResourceName('Stanene'),
    desc: '消耗铝与纳米管，生产锡烯。',
    unlocked: () => (game.state.tech['stanene'] ?? 0) >= 1 || !!game.state.resource['Stanene']?.display,
  },
]

const visibleLines = computed(() => lineDefs.filter((line) => line.unlocked()))
const totalAssigned = computed(() => {
  if (!factoryState.value) return 0
  return visibleLines.value.reduce((sum, line) => sum + (factoryState.value?.[line.id] ?? 0), 0)
})

function assigned(lineId: FactoryLineId): number {
  return factoryState.value?.[lineId] ?? 0
}
</script>

<template>
  <div v-if="isUnlocked" class="factory-panel">
    <h3 class="section-title">
      <AppIcon name="factory" class="section-icon" />
      <span>工厂产线</span>
      <span class="subtitle">产线: {{ totalAssigned }}/{{ totalFactories }}</span>
    </h3>

    <div class="factory-grid">
      <article
        v-for="line in visibleLines"
        :key="line.id"
        class="factory-card"
      >
        <div class="factory-head">
          <span class="factory-name">{{ line.name }}</span>
          <span class="factory-meta">{{ assigned(line.id) }}</span>
        </div>
        <p class="factory-desc">{{ line.desc }}</p>
        <AllocationControl
          :value="assigned(line.id)"
          :decrement-disabled="assigned(line.id) <= 0"
          :increment-disabled="totalAssigned >= totalFactories"
          decrement-label="减少产线分配"
          increment-label="增加产线分配"
          @decrement="game.removeFactoryLine(line.id)"
          @increment="game.assignFactoryLine(line.id)"
        />
      </article>
    </div>
  </div>
</template>

<style scoped>
.factory-panel {
  margin-top: 16px;
}

.section-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-accent);
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.section-icon {
  width: 16px;
  height: 16px;
  flex: 0 0 auto;
}

.subtitle {
  margin-left: auto;
  font-size: 12px;
  font-weight: 400;
  color: var(--text-secondary);
}

.factory-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.factory-card {
  padding: 12px;
  border-radius: var(--radius-md);
  background: var(--bg-card);
  border: 1px solid var(--border-color);
}

.factory-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.factory-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
}

.factory-meta {
  font-size: 12px;
  color: var(--text-accent);
  font-family: var(--font-mono);
}

.factory-desc {
  margin: 8px 0 10px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-secondary);
}

</style>
