<!--
  WomlingPanel — 外星矮人管理面板
-->
<script setup lang="ts">
import { useGameStore } from '../stores/game'
import { computed } from 'vue'
import { getWomlingRelation } from '@evozen/game-core'
import PanelHeader from './ui/PanelHeader.vue'
import EmptyState from './ui/EmptyState.vue'
import MetricCard from './ui/MetricCard.vue'

const game = useGameStore()

const servants = computed(() => game.getServants())
const hasServants = computed(() => Boolean(servants.value))
const servantTotal = computed(() => (servants.value?.max ?? 0) + (servants.value?.smax ?? 0))
const servantUsed = computed(() => (servants.value?.used ?? 0) + (servants.value?.sused ?? 0))
const servantFree = computed(() => Math.max(0, servantTotal.value - servantUsed.value))
const relation = computed(() => getWomlingRelation(game.state))
const relationName = computed(() => ({ friend: '盟友', god: '神使', lord: '领主' })[relation.value ?? 'friend'])
const hasWomlings = computed(() => relation.value !== undefined)
const overseer = computed(() => game.state.tauceti.overseer as {
  pop?: number
  working?: number
  injured?: number
  morale?: number
  loyal?: number
  prod?: number
} | undefined)
const farm = computed(() => game.state.tauceti.womling_farm as { farmers?: number } | undefined)
const mine = computed(() => game.state.tauceti.womling_mine as { miners?: number } | undefined)
</script>

<template>
  <div class="womling-panel">
    <PanelHeader icon="womling" title="Womling" subtitle="Tau Ceti 红色行星上的智慧种族。" />

    <div v-if="hasServants" class="stats-row">
        <MetricCard label="仆从" :value="`${servants?.used ?? 0} / ${servants?.max ?? 0}`" />
        <MetricCard label="熟练仆从" :value="`${servants?.sused ?? 0} / ${servants?.smax ?? 0}`" tone="accent" />
        <MetricCard label="可用仆从" :value="servantFree" />
    </div>

    <template v-if="hasWomlings">
      <div class="stats-row">
        <MetricCard label="关系" :value="relationName" />
        <MetricCard label="人口" :value="overseer?.pop ?? 0" />
        <MetricCard label="生产率" :value="`${overseer?.prod ?? 0}%`" tone="accent" />
        <MetricCard label="忠诚" :value="overseer?.loyal ?? 0" />
        <MetricCard label="士气" :value="overseer?.morale ?? 0" />
        <MetricCard label="伤员" :value="overseer?.injured ?? 0" />
      </div>

      <h3 class="section-title">自动岗位</h3>
      <div class="job-row card">
        <span class="job-label">农夫</span>
        <span class="font-mono">{{ farm?.farmers ?? 0 }}</span>
      </div>
      <div class="job-row card">
        <span class="job-label">矿工</span>
        <span class="font-mono">{{ mine?.miners ?? 0 }}</span>
      </div>
      <div class="job-row card">
        <span class="job-label">工作人口</span>
        <span class="font-mono">{{ overseer?.working ?? 0 }}</span>
      </div>
    </template>
    <EmptyState v-else-if="!hasServants" text="尚未在 Tau Ceti 红色行星与 Womling 建立关系。" icon="lock" />
  </div>
</template>

<style scoped>
.womling-panel { display: flex; flex-direction: column; gap: 10px; }
.stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 8px; }

.section-title { font-size: 13px; color: var(--text-primary); margin: 0; }
.job-row { display: flex; align-items: center; gap: 0.5rem; padding: 6px 8px; }
.job-label { flex: 1; font-size: 0.9rem; }
</style>
