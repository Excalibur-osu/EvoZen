<!--
  仓储系统面板 (StoragePanel.vue)
  展示板条箱/集装箱的拥有量、上限和分配情况。
  提供建造板条箱/集装箱按钮，以及为各资源分配/取消分配操作。
  对标 legacy/src/resources.js drawModal() 弹窗机制，简化为固定面板形式。
-->
<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import { getResourceName } from '../utils/resourceNames'
import type { ResourceState } from '@evozen/shared-types'

const game = useGameStore()

/** 板条箱状态 */
const cratesState = computed(() => game.state.resource['Crates'])
const containersState = computed(() => game.state.resource['Containers'])

/** 显示板条箱区域 */
const showCrates = computed(() => cratesState.value?.display ?? false)
/** 显示集装箱区域 */
const showContainers = computed(() => containersState.value?.display ?? false)

/** 计算已分配的板条箱总数 */
const totalAssignedCrates = computed(() => {
  let total = 0
  for (const res of Object.values(game.state.resource) as ResourceState[]) {
    total += res.crates ?? 0
  }
  return total
})

/** 计算已分配的集装箱总数 */
const totalAssignedContainers = computed(() => {
  let total = 0
  for (const res of Object.values(game.state.resource) as ResourceState[]) {
    total += res.containers ?? 0
  }
  return total
})

/** 未分配的板条箱 */
const freeCrates = computed(() => (cratesState.value?.amount ?? 0) - totalAssignedCrates.value)
/** 未分配的集装箱 */
const freeContainers = computed(() => (containersState.value?.amount ?? 0) - totalAssignedContainers.value)

/** 可分配资源列表 */
const storableResources = computed(() => {
  return game.STORABLE_RESOURCES
    .filter((id: string) => game.state.resource[id]?.display)
    .map((id: string) => ({
      id,
      name: getResourceName(id),
      crates: game.state.resource[id]?.crates ?? 0,
      containers: game.state.resource[id]?.containers ?? 0,
      crateBonus: (game.state.resource[id]?.crates ?? 0) * game.getCrateValue(game.state),
      containerBonus: (game.state.resource[id]?.containers ?? 0) * game.CONTAINER_VALUE,
    }))
})

/** 能否建造板条箱 */
const canBuildCrate = computed(() => {
  const plywood = game.state.resource['Plywood']?.amount ?? 0
  const crates = cratesState.value
  return plywood >= game.CRATE_COST_PLYWOOD && crates && crates.amount < crates.max
})

/** 能否建造集装箱 */
const canBuildContainer = computed(() => {
  const steel = game.state.resource['Steel']?.amount ?? 0
  const containers = containersState.value
  return steel >= game.CONTAINER_COST_STEEL && containers && containers.amount < containers.max
})
</script>

<template>
  <div class="storage-panel" v-if="showCrates || showContainers">
    <h3 class="panel-title">📦 仓储管理</h3>

    <!-- 板条箱区域 -->
    <div class="storage-section" v-if="showCrates">
      <div class="section-header">
        <span class="section-title">🪵 板条箱</span>
        <span class="section-count font-mono">
          {{ cratesState?.amount ?? 0 }} / {{ cratesState?.max ?? 0 }}
          <span class="free-label" v-if="freeCrates > 0">（可用 {{ freeCrates }}）</span>
        </span>
      </div>
      <div class="build-row">
        <button
          class="btn btn-sm btn-build"
          :disabled="!canBuildCrate"
          @click="game.doBuildCrate(1)"
        >
          制造板条箱（{{ game.CRATE_COST_PLYWOOD }} 胶合板）
        </button>
      </div>

      <!-- 分配列表 -->
      <div class="assign-list">
        <div
          v-for="res in storableResources"
          :key="'crate-' + res.id"
          class="assign-row"
        >
          <span class="res-name">{{ res.name }}</span>
          <span class="assign-info font-mono">
            {{ res.crates }}
            <span class="bonus" v-if="res.crateBonus > 0">(+{{ res.crateBonus }})</span>
          </span>
          <div class="assign-btns">
            <button
              class="btn-assign btn-minus"
              :disabled="res.crates <= 0"
              @click="game.doUnassignCrate(res.id)"
              data-tooltip="取消分配一个板条筐"
            >−</button>
            <button
              class="btn-assign btn-plus"
              :disabled="freeCrates <= 0"
              @click="game.doAssignCrate(res.id)"
              data-tooltip="分配一个板条筐"
            >+</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 集装箱区域 -->
    <div class="storage-section" v-if="showContainers">
      <div class="section-header">
        <span class="section-title">🏗️ 集装箱</span>
        <span class="section-count font-mono">
          {{ containersState?.amount ?? 0 }} / {{ containersState?.max ?? 0 }}
          <span class="free-label" v-if="freeContainers > 0">（可用 {{ freeContainers }}）</span>
        </span>
      </div>
      <div class="build-row">
        <button
          class="btn btn-sm btn-build"
          :disabled="!canBuildContainer"
          @click="game.doBuildContainer(1)"
        >
          制造集装箱（{{ game.CONTAINER_COST_STEEL }} 钢）
        </button>
      </div>

      <!-- 分配列表 -->
      <div class="assign-list">
        <div
          v-for="res in storableResources"
          :key="'container-' + res.id"
          class="assign-row"
        >
          <span class="res-name">{{ res.name }}</span>
          <span class="assign-info font-mono">
            {{ res.containers }}
            <span class="bonus" v-if="res.containerBonus > 0">(+{{ res.containerBonus }})</span>
          </span>
          <div class="assign-btns">
            <button
              class="btn-assign btn-minus"
              :disabled="res.containers <= 0"
              @click="game.doUnassignContainer(res.id)"
              data-tooltip="取消分配一个集装筱"
            >−</button>
            <button
              class="btn-assign btn-plus"
              :disabled="freeContainers <= 0"
              @click="game.doAssignContainer(res.id)"
              data-tooltip="分配一个集装筱"
            >+</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.storage-panel {
  padding: 12px;
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.storage-section {
  margin-bottom: 16px;
  background: rgba(255,255,255,0.03);
  border-radius: 8px;
  padding: 10px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
}

.section-count {
  font-size: 12px;
  color: var(--text-muted);
}

.free-label {
  color: var(--success);
  font-size: 11px;
}

.build-row {
  margin-bottom: 10px;
}

.btn-build {
  font-size: 11px;
  padding: 4px 10px;
  background: var(--surface-light);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 4px;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.15s;
}
.btn-build:hover:not(:disabled) {
  background: var(--accent);
  color: #fff;
}
.btn-build:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.assign-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.assign-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 3px 6px;
  border-radius: 4px;
  font-size: 12px;
}
.assign-row:hover {
  background: rgba(255,255,255,0.04);
}

.res-name {
  flex: 1;
  color: var(--text-primary);
}

.assign-info {
  width: 80px;
  text-align: right;
  color: var(--text-muted);
  font-size: 11px;
  margin-right: 6px;
}

.bonus {
  color: var(--success);
  font-size: 10px;
}

.assign-btns {
  display: flex;
  gap: 2px;
}

.btn-assign {
  width: 22px;
  height: 20px;
  font-size: 14px;
  line-height: 1;
  background: var(--surface-light);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 3px;
  color: var(--text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}
.btn-assign:hover:not(:disabled) {
  background: var(--accent);
  color: #fff;
}
.btn-assign:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.btn-minus:hover:not(:disabled) {
  background: var(--danger);
}
.btn-plus:hover:not(:disabled) {
  background: var(--success);
}
</style>
