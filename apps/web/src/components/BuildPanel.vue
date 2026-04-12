<!--
  城市建设面板 (BuildPanel.vue)
  分为“手动采集(Gather)”与“建设建筑”两部分。
  读取基础建筑数据，计算价格与显示建造成本，处理能否建造的判定逻辑和建筑点击事件。
-->
<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import { BASIC_STRUCTURES } from '@evozen/game-core'
import { getResourceName } from '../utils/resourceNames'
import QueuePanel from './QueuePanel.vue'

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
  const actions = []
  
  if ((game.state.tech['primitive'] ?? 0) >= 1) {
    actions.push({ 
      resId: 'Food', 
      label: '搜集食物', 
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z"/><path d="M10 2c1 .5 2 2 2 5"/></svg>',
      visible: true,
      colorVar: 'var(--res-food)'
    })
  }

  actions.push({ 
    resId: 'Lumber', 
    label: '捡拾木材', 
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m14 12-8.5 8.5a2.12 2.12 0 1 1-3-3L11 9"/><path d="M15 13 9 7l4-4 6 6h3a8 8 0 0 1-7 7z"/></svg>',
    visible: true,
    colorVar: 'var(--res-lumber)'
  })

  // 有了骨制工具后可以搜集石头
  if ((game.state.tech['primitive'] ?? 0) >= 2) {
    actions.push({ 
      resId: 'Stone', 
      label: '采集石头', 
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg>',
      visible: true,
      colorVar: 'var(--res-stone)'
    })
  }
  return actions.filter(a => a.visible)
})

function getCount(id: string): number {
  return (game.state.city[id] as { count: number } | undefined)?.count ?? 0
}

function formatCost(structureId: string): Array<{ resId: string; amount: number; affordable: boolean }> {
  const costs = game.getBuildCost(structureId)
  return (Object.entries(costs) as Array<[string, number]>)
    .filter(([_, amount]) => Math.ceil(amount) > 0)
    .map(([resId, amount]) => ({
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
  <div class="build-panel animate-in">
    <QueuePanel />
    
    <!-- 手动采集区 -->
    <div class="gather-section">
      <div class="section-header">
        <svg class="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 11V6a2 2 0 0 0-4 0v4"/><path d="M14 10V4a2 2 0 0 0-4 0v6"/><path d="M10 10.5V3a2 2 0 0 0-4 0v9"/><path d="M6 14v-2a2 2 0 1 0-4 0v5a11 11 0 0 0 11 11h2.5a6.5 6.5 0 0 0 6.5-6.5v-7a2 2 0 0 0-4 0v3"/></svg>
        <span class="section-title">手动采集</span>
      </div>
      <div class="gather-grid">
        <button
          v-for="action in gatherActions"
          :key="action.resId"
          class="gather-btn"
          :class="{ disabled: isStorageFull(action.resId) }"
          :disabled="isStorageFull(action.resId)"
          @click="game.gather(action.resId)"
          :style="{ color: action.colorVar }"
        >
          <span class="gather-icon-wrapper" v-html="action.icon"></span>
          <span class="gather-label" style="color: var(--text-primary)">{{ action.label }}</span>
        </button>
      </div>
    </div>

    <!-- 建筑列表 -->
    <div class="build-section" v-if="availableBuildings.length > 0">
      <div class="section-header">
        <svg class="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="16" x="4" y="4" rx="2"/><path d="M9 4v16"/><path d="M4 9h16"/><path d="M4 15h16"/></svg>
        <span class="section-title">设施建造</span>
      </div>
      <div class="build-grid">
        <div
          v-for="def in availableBuildings"
          :key="def.id"
          class="build-item"
          :class="{ disabled: !game.canAfford(def.id) }"
          @click="game.build(def.id)"
        >
          <div class="build-header">
            <div class="build-header-left">
              <span class="build-name">{{ def.name }}</span>
              <span class="build-count font-mono" v-if="getCount(def.id) > 0">{{ getCount(def.id) }}</span>
            </div>
            <button 
              v-if="game.isQueueUnlocked"
              class="q-btn" 
              :disabled="!game.canEnqueueBuilding"
              @click.stop="game.enqueueBuilding(def.id)"
              title="加入建造队列"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
              队列
            </button>
          </div>
          <p class="build-effect">{{ def.effect }}</p>
          <div class="build-costs">
            <span
              v-for="cost in formatCost(def.id)"
              :key="cost.resId"
              class="cost-tag"
              :class="{ unaffordable: !cost.affordable }"
            >
              <span class="cost-name">{{ getResourceName(cost.resId) }}</span>
              {{ cost.amount.toLocaleString() }}
            </span>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.build-panel {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.section-icon {
  width: 14px;
  height: 14px;
  color: var(--accent);
  opacity: 0.8;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

/* 采集区 */
.gather-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.gather-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
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
}

.gather-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.gather-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
}

.gather-icon-wrapper :deep(svg) {
  width: 14px;
  height: 14px;
}

.gather-label {
  font-size: 12px;
}

/* 建筑列表 */
.build-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
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
.build-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.q-btn {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  color: var(--text-accent);
  padding: 1px 6px;
  font-size: 11px;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.15s;
}
.q-btn:hover:not(:disabled) {
  background: var(--bg-card-hover);
  border-color: var(--border-hover);
  color: var(--text-primary);
}
.q-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
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
  font-size: 11px;
  font-family: var(--font-mono);
  color: var(--success);
}
.cost-tag.unaffordable {
  color: var(--danger);
}
</style>
