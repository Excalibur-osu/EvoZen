<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import { BASIC_STRUCTURES } from '@evozen/game-core'
import { getResourceName } from '../utils/resourceNames'

const game = useGameStore()

/** 可见建筑：前置科技已满足 */
const availableBuildings = computed(() => {
  return BASIC_STRUCTURES.filter(def => {
    for (const [techId, lvl] of Object.entries(def.reqs)) {
      if ((game.state.tech[techId] ?? 0) < lvl) return false
    }
    return true
  })
})

/** 手动采集按钮配置 */
const gatherActions = computed(() => {
  const actions = [
    { resId: 'Food', label: '搜集食物', icon: '🍖', visible: true },
    { resId: 'Lumber', label: '捡拾木材', icon: '🪵', visible: true },
  ]
  // 有了骨制工具后可以搜集石头
  if ((game.state.tech['primitive'] ?? 0) >= 2) {
    actions.push({ resId: 'Stone', label: '采集石头', icon: '🪨', visible: true })
  }
  return actions.filter(a => a.visible)
})

function getCount(id: string): number {
  return (game.state.city[id] as { count: number } | undefined)?.count ?? 0
}

function formatCost(structureId: string): Array<{ resId: string; amount: number; affordable: boolean }> {
  const costs = game.getBuildCost(structureId)
  return Object.entries(costs).map(([resId, amount]) => ({
    resId,
    amount: Math.ceil(amount),
    affordable: (game.state.resource[resId]?.amount ?? 0) >= amount,
  }))
}

function isStorageFull(resId: string): boolean {
  const res = game.state.resource[resId]
  if (!res) return false
  return res.max > 0 && res.amount >= res.max
}
</script>

<template>
  <div class="build-panel">
    <!-- 手动采集区 -->
    <div class="gather-section">
      <h3 class="section-title">🖐️ 手动采集</h3>
      <div class="gather-grid">
        <button
          v-for="action in gatherActions"
          :key="action.resId"
          class="gather-btn"
          :class="{ disabled: isStorageFull(action.resId) }"
          :disabled="isStorageFull(action.resId)"
          @click="game.gather(action.resId)"
        >
          <span class="gather-icon">{{ action.icon }}</span>
          <span class="gather-label">{{ action.label }}</span>
        </button>
      </div>
    </div>

    <!-- 建筑列表 -->
    <div class="build-list" v-if="availableBuildings.length > 0">
      <h3 class="section-title">🏗️ 建造</h3>
      <div
        v-for="def in availableBuildings"
        :key="def.id"
        class="build-item"
        :class="{ disabled: !game.canAfford(def.id) }"
        @click="game.build(def.id)"
      >
        <div class="build-header">
          <span class="build-name">{{ def.name }}</span>
          <span class="build-count font-mono" v-if="getCount(def.id) > 0">{{ getCount(def.id) }}</span>
        </div>
        <p class="build-effect">{{ def.effect }}</p>
        <div class="build-costs">
          <span
            v-for="cost in formatCost(def.id)"
            :key="cost.resId"
            class="cost-tag"
            :class="{ unaffordable: !cost.affordable }"
          >
            {{ getResourceName(cost.resId) }} {{ cost.amount.toLocaleString() }}
          </span>
        </div>
      </div>
    </div>

    <div class="empty-state" v-if="availableBuildings.length === 0">
      <p style="color: var(--text-muted); font-size: 13px; text-align: center; padding: 40px 0">
        研究更多科技来解锁建筑...
      </p>
    </div>
  </div>
</template>

<style scoped>
.build-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-accent);
  margin-bottom: 8px;
}

/* 采集区 */
.gather-section {
  margin-bottom: 4px;
}
.gather-grid {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.gather-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  font-family: var(--font-sans);
  user-select: none;
}
.gather-btn:hover:not(.disabled) {
  background: var(--bg-card-hover);
  border-color: var(--border-hover);
  transform: scale(1.02);
}
.gather-btn:active:not(.disabled) {
  transform: scale(0.98);
}
.gather-btn.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.gather-icon {
  font-size: 16px;
}
.gather-label {
  font-size: 12px;
}

/* 建筑列表 */
.build-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.build-item {
  padding: 10px 14px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s;
  user-select: none;
}
.build-item:hover:not(.disabled) {
  background: var(--bg-card-hover);
  border-color: var(--border-hover);
}
.build-item:active:not(.disabled) {
  transform: scale(0.995);
}
.build-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.build-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 3px;
}
.build-name {
  font-weight: 600;
  font-size: 13px;
  color: var(--text-primary);
}
.build-count {
  font-size: 13px;
  color: var(--text-accent);
  background: rgba(79,124,218,0.1);
  padding: 0 6px;
  border-radius: 3px;
}

.build-effect {
  font-size: 11px;
  color: var(--text-secondary);
  margin-bottom: 4px;
  line-height: 1.4;
}

.build-costs {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.cost-tag {
  font-size: 10px;
  font-family: var(--font-mono);
  padding: 1px 6px;
  border-radius: 3px;
  background: rgba(52,211,153,0.08);
  color: var(--success);
}
.cost-tag.unaffordable {
  background: rgba(248,113,113,0.08);
  color: var(--danger);
}
</style>
