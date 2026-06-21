<!--
  熔炉管理面板 (SmelterPanel.vue)
  允许玩家为不同数量的熔炉分配消耗燃料（Wood, Coal, Oil等）与产物（Iron, Steel, Iridium）。
-->
<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import type { SmelterState, SmelterFuelId, SmelterOutputId } from '@evozen/shared-types'
import AppIcon from './ui/AppIcon.vue'
import AllocationControl from './ui/AllocationControl.vue'

const game = useGameStore()

const smeltersCount = computed(() => {
  const s = game.state.city['smelter'] as SmelterState | undefined
  return s?.count ?? 0
})

const isUnlocked = computed(() => smeltersCount.value > 0)

const smelterState = computed(() => game.state.city.smelter as SmelterState)

const totalFuelsAssigned = computed(() => {
  if (!smelterState.value) return 0
  return (smelterState.value.Wood ?? 0) + (smelterState.value.Coal ?? 0) + (smelterState.value.Oil ?? 0) + (smelterState.value.Inferno ?? 0)
})

const totalOutputsAssigned = computed(() => {
  if (!smelterState.value) return 0
  return (smelterState.value.Iron ?? 0) + (smelterState.value.Steel ?? 0) + (smelterState.value.Iridium ?? 0)
})

const fuels: Array<{ id: SmelterFuelId; name: string }> = [
  { id: 'Wood', name: '木材' },
  { id: 'Coal', name: '煤炭' },
  { id: 'Oil', name: '石油' },
  // { id: 'Inferno', name: '地狱风暴' },
]

const outputs: Array<{ id: SmelterOutputId; name: string; reqTech: number }> = [
  { id: 'Iron', name: '铁', reqTech: 0 },
  { id: 'Steel', name: '钢', reqTech: 2 },
  { id: 'Iridium', name: '铱', reqTech: 0 }, // TODO: correct tech level for iridium smelting
]

function getTechLevel(tech: string) {
  return game.state.tech[tech] ?? 0
}

function assigned(id: SmelterFuelId | SmelterOutputId): number {
  return (smelterState.value[id as keyof SmelterState] as number | undefined) ?? 0
}

function assignFuel(id: SmelterFuelId) {
  game.assignSmelter('fuel', id)
}
function removeFuel(id: SmelterFuelId) {
  game.removeSmelter('fuel', id)
}

function assignOutput(id: SmelterOutputId) {
  game.assignSmelter('output', id)
}
function removeOutput(id: SmelterOutputId) {
  game.removeSmelter('output', id)
}
</script>

<template>
  <div v-if="isUnlocked" class="smelter-panel">
    <h3 class="section-title">
      <AppIcon name="flame" class="section-icon" />
      <span>冶金分配</span>
      <span class="subtitle">燃料炉: {{ totalFuelsAssigned }}/{{ smeltersCount }}</span>
    </h3>

    <div class="smelter-layout">
      <!-- 燃料列 -->
      <div class="smelter-col">
        <h4 class="col-title">燃料消耗</h4>
        <div class="smelter-row" v-for="f in fuels" :key="f.id">
          <div class="name">{{ f.name }}</div>
          <AllocationControl
            :value="assigned(f.id)"
            :decrement-disabled="assigned(f.id) <= 0"
            :increment-disabled="totalFuelsAssigned >= smeltersCount"
            decrement-label="减少燃料分配"
            increment-label="增加燃料分配"
            @decrement="removeFuel(f.id)"
            @increment="assignFuel(f.id)"
          />
        </div>
      </div>

      <!-- 产物列 -->
      <div class="smelter-col">
        <h4 class="col-title">产出目标 <span class="sub">({{ totalOutputsAssigned }}/{{ totalFuelsAssigned }})</span></h4>
        <template v-for="o in outputs" :key="o.id">
          <div class="smelter-row" v-if="(getTechLevel('smelting') >= (o.reqTech ?? 0) && (o.id !== 'Iridium' || getTechLevel('irid_smelting') >= 1))">
            <div class="name">{{ o.name }}</div>
            <AllocationControl
              :value="assigned(o.id)"
              :decrement-disabled="assigned(o.id) <= 0"
              :increment-disabled="totalOutputsAssigned >= totalFuelsAssigned"
              decrement-label="减少产出分配"
              increment-label="增加产出分配"
              @decrement="removeOutput(o.id)"
              @increment="assignOutput(o.id)"
            />
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.smelter-panel {
  margin-top: 16px;
}

.smelter-layout {
  display: flex;
  gap: 16px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 12px;
}

.smelter-col {
  flex: 1;
}

.col-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 0;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 4px;
}
.col-title .sub {
  font-weight: 400;
  opacity: 0.7;
}

.smelter-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
}

.name {
  font-size: 13px;
  color: var(--text-primary);
  font-weight: 500;
}

.section-icon {
  width: 16px;
  height: 16px;
  flex: 0 0 auto;
}
</style>
