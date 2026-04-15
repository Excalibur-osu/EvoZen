<!--
  熔炉管理面板 (SmelterPanel.vue)
  允许玩家为不同数量的熔炉分配消耗燃料（Wood, Coal, Oil等）与产物（Iron, Steel, Iridium）。
-->
<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import type { SmelterState } from '@evozen/shared-types'

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

const fuels = [
  { id: 'Wood', name: '木材' },
  { id: 'Coal', name: '煤炭' },
  { id: 'Oil', name: '石油' },
  // { id: 'Inferno', name: '地狱风暴' },
]

const outputs = [
  { id: 'Iron', name: '铁' },
  { id: 'Steel', name: '钢', reqTech: 2 },
  { id: 'Iridium', name: '铱', reqTech: 0 }, // TODO: correct tech level for iridium smelting
]

function getTechLevel(tech: string) {
  return game.state.tech[tech] ?? 0
}

function assignFuel(id: string) {
  game.assignSmelter('fuel', id)
}
function removeFuel(id: string) {
  game.removeSmelter('fuel', id)
}

function assignOutput(id: string) {
  game.assignSmelter('output', id)
}
function removeOutput(id: string) {
  game.removeSmelter('output', id)
}
</script>

<template>
  <div v-if="isUnlocked" class="smelter-panel">
    <h3 class="section-title">
      <span class="icon">🔥</span> 冶金分配
      <span class="subtitle">燃料炉: {{ totalFuelsAssigned }}/{{ smeltersCount }}</span>
    </h3>

    <div class="smelter-layout">
      <!-- 燃料列 -->
      <div class="smelter-col">
        <h4 class="col-title">燃料消耗</h4>
        <div class="smelter-row" v-for="f in fuels" :key="f.id">
          <div class="name">{{ f.name }}</div>
          <div class="controls">
            <button class="btn-minus" @click="removeFuel(f.id)" :disabled="(smelterState[f.id as keyof SmelterState] as number ?? 0) <= 0">-</button>
            <span class="val">{{ smelterState[f.id as keyof SmelterState] ?? 0 }}</span>
            <button class="btn-plus" @click="assignFuel(f.id)" :disabled="totalFuelsAssigned >= smeltersCount">+</button>
          </div>
        </div>
      </div>

      <!-- 产物列 -->
      <div class="smelter-col">
        <h4 class="col-title">产出目标 <span class="sub">({{ totalOutputsAssigned }}/{{ totalFuelsAssigned }})</span></h4>
        <template v-for="o in outputs" :key="o.id">
          <div class="smelter-row" v-if="(getTechLevel('smelting') >= (o.reqTech ?? 0) && (o.id !== 'Iridium' || getTechLevel('irid_smelting') >= 1))">
            <div class="name">{{ o.name }}</div>
            <div class="controls">
              <button class="btn-minus" @click="removeOutput(o.id)" :disabled="(smelterState[o.id as keyof SmelterState] as number ?? 0) <= 0">-</button>
              <span class="val">{{ smelterState[o.id as keyof SmelterState] ?? 0 }}</span>
              <button class="btn-plus" @click="assignOutput(o.id)" :disabled="totalOutputsAssigned >= totalFuelsAssigned">+</button>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.smelter-panel {
  margin-top: 16px;
  background: var(--bg-neutral);
  /* Use panel styling consistent with CraftPanel/JobPanel */
}

.smelter-layout {
  display: flex;
  gap: 16px;
  background: rgba(0,0,0,0.1);
  border: 1px solid var(--border-color);
  border-radius: 8px;
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

.controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-minus, .btn-plus {
  width: 24px;
  height: 24px;
  border: 1px solid var(--border-color);
  background: rgba(255,255,255,0.05);
  color: var(--text-primary);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-minus:hover:not(:disabled), .btn-plus:hover:not(:disabled) {
  background: rgba(255,255,255,0.1);
  border-color: var(--accent);
}

.btn-minus:disabled, .btn-plus:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.val {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-accent);
  min-width: 20px;
  text-align: center;
}
</style>
