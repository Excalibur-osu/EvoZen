<!--
  WomlingPanel — 外星矮人管理面板
-->
<script setup lang="ts">
import { useGameStore } from '../stores/game'
import { computed } from 'vue'
import PanelHeader from './ui/PanelHeader.vue'
import EmptyState from './ui/EmptyState.vue'
import MetricCard from './ui/MetricCard.vue'
import AllocationControl from './ui/AllocationControl.vue'

const game = useGameStore()

const unlocked = computed(() => game.canUseWomling())
const w = computed(() => game.getWomling())
const cap = computed(() => game.getWomlingPopCap())
const servants = computed(() => game.getServants())
const hasWomlingVillage = computed(() => w.value.discovered)
const hasServants = computed(() => Boolean(servants.value))
const servantTotal = computed(() => (servants.value?.max ?? 0) + (servants.value?.smax ?? 0))
const servantUsed = computed(() => (servants.value?.used ?? 0) + (servants.value?.sused ?? 0))
const servantFree = computed(() => Math.max(0, servantTotal.value - servantUsed.value))

const totalAssigned = computed(() => {
  const j = w.value.jobs
  return j.farmer + j.miner + j.lab + j.soldier
})

const unassigned = computed(() => Math.floor(w.value.population) - totalAssigned.value)

const jobLabels: Record<'farmer' | 'miner' | 'lab' | 'soldier', string> = {
  farmer: '农夫', miner: '矿工', lab: '学者', soldier: '士兵',
}
const jobs: Array<'farmer' | 'miner' | 'lab' | 'soldier'> = ['farmer', 'miner', 'lab', 'soldier']

function adjust(job: typeof jobs[number], delta: number) {
  game.assignWomling(job, delta)
}

function discover() {
  game.discoverWomling()
}
</script>

<template>
  <div class="womling-panel">
    <PanelHeader icon="womling" title="Womling 外星矮人" subtitle="在厄里斯发现的外星种族，可雇佣他们做工。" />

    <div v-if="!unlocked" class="locked">
      <EmptyState text="尚未与 Womling 接触。需在 Eris 远征中达到接触阶段。" icon="lock" />
      <button class="discover-btn btn primary" @click="discover">（调试）模拟接触</button>
    </div>

    <template v-else>
      <div v-if="hasServants" class="stats-row">
        <MetricCard label="仆从" :value="`${servants?.used ?? 0} / ${servants?.max ?? 0}`" />
        <MetricCard label="熟练仆从" :value="`${servants?.sused ?? 0} / ${servants?.smax ?? 0}`" tone="accent" />
        <MetricCard label="可用仆从" :value="servantFree" />
      </div>

      <template v-if="hasWomlingVillage">
      <div class="stats-row">
        <MetricCard label="人口" :value="`${Math.floor(w.population)} / ${cap}`" />
        <MetricCard label="士气" :value="Math.floor(w.morale)" tone="accent" />
        <MetricCard label="闲置" :value="unassigned" />
      </div>

      <h3 class="section-title">岗位分配</h3>
      <div v-for="job in jobs" :key="job" class="job-row card">
        <span class="job-label">{{ jobLabels[job] }}</span>
        <AllocationControl
          :value="w.jobs[job]"
          :decrement-disabled="w.jobs[job] <= 0"
          :increment-disabled="unassigned <= 0"
          decrement-label="减少岗位分配"
          increment-label="增加岗位分配"
          @decrement="adjust(job, -1)"
          @increment="adjust(job, 1)"
        />
      </div>
      </template>
    </template>
  </div>
</template>

<style scoped>
.womling-panel { display: flex; flex-direction: column; gap: 10px; }
.locked { display: flex; flex-direction: column; gap: 10px; align-items: center; }

.stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 8px; }

.section-title { font-size: 13px; color: var(--text-primary); margin: 0; }
.job-row { display: flex; align-items: center; gap: 0.5rem; padding: 6px 8px; }
.job-label { flex: 1; font-size: 0.9rem; }
</style>
