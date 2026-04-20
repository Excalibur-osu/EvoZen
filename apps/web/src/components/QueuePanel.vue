<!--
  建造队列面板 (QueuePanel.vue)
  显示当前建造队列的状态、进度和消耗
-->
<script setup lang="ts">
import { useGameStore } from '../stores/game'
import { getResourceName } from '../utils/resourceNames'
import type { QueueItem } from '@evozen/shared-types'

const game = useGameStore()

function getProgressPercent(item: QueueItem): number {
  if (!item.cost || Object.keys(item.cost).length === 0) return 0
  let totalCost = 0
  let totalProgress = 0
  for (const [resId, amount] of Object.entries(item.cost)) {
    totalCost += amount as number
    const p = item.progress?.[resId] || 0
    totalProgress += p as number
  }
  if (totalCost === 0) return 100
  return Math.min(100, Math.floor((totalProgress / totalCost) * 100))
}
</script>

<template>
  <div class="queue-panel" v-if="game.isQueueUnlocked">
    <div class="queue-header">
      <span class="queue-title">🚧 建造队列</span>
      <span class="queue-count font-mono">{{ game.state.queue.queue?.length || 0 }} / {{ game.queueMax }}</span>
    </div>

    <div class="queue-list" v-if="game.state.queue.queue && game.state.queue.queue.length > 0">
      <div 
        class="queue-item"
        v-for="(item, index) in game.state.queue.queue"
        :key="item.id + index"
      >
        <div class="qi-main">
          <span class="qi-label">{{ index + 1 }}. {{ item.label }}</span>
          <button class="qi-cancel" @click="game.dequeueBuilding(index)" title="取消并返还资源">✕</button>
        </div>
        <div class="qi-progress-bar">
          <div class="qi-progress-fill" :style="{ width: getProgressPercent(item) + '%' }"></div>
        </div>
        <div class="qi-details">
          <span v-for="(amount, resId) in item.cost" :key="resId" class="qi-cost-tag">
            {{ getResourceName(resId as string) }}: 
            {{ Math.floor((item.progress?.[resId] || 0) as number) }} / {{ Math.floor(amount as number) }}
          </span>
        </div>
      </div>
    </div>
    
    <div class="queue-empty" v-else>
      <span>队列为空</span>
    </div>
  </div>
</template>

<style scoped>
.queue-panel {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 10px;
  margin-bottom: 15px;
}

.queue-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.queue-title {
  font-weight: 600;
  font-size: 13px;
  color: var(--warning);
}
.queue-count {
  font-size: 12px;
  color: var(--text-secondary);
  background: rgba(255,255,255,0.05);
  padding: 2px 6px;
  border-radius: 3px;
}

.queue-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.queue-item {
  background: rgba(0,0,0,0.15);
  border: 1px solid var(--border-color);
  border-radius: 3px;
  padding: 6px 8px;
}

.qi-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.qi-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}
.qi-cancel {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0 4px;
}
.qi-cancel:hover {
  color: var(--danger);
}

.qi-progress-bar {
  height: 4px;
  background: rgba(255,255,255,0.05);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 4px;
}
.qi-progress-fill {
  height: 100%;
  background: var(--warning);
  transition: width 0.2s;
}

.qi-details {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 10px;
  color: var(--text-secondary);
}
.qi-cost-tag {
  background: rgba(0,0,0,0.2);
  padding: 1px 4px;
  border-radius: 2px;
}

.queue-empty {
  text-align: center;
  font-size: 12px;
  color: var(--text-muted);
  padding: 8px 0;
}
</style>
