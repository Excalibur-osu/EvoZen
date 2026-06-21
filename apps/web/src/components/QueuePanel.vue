<!--
  建造队列面板 (QueuePanel.vue)
  显示当前建造队列的状态、进度和消耗
-->
<script setup lang="ts">
import { useGameStore } from '../stores/game'
import { getResourceName } from '../utils/resourceNames'
import type { QueueItem } from '@evozen/shared-types'
import AppIcon from './ui/AppIcon.vue'
import EmptyState from './ui/EmptyState.vue'
import IconButton from './ui/IconButton.vue'
import ProgressBar from './ui/ProgressBar.vue'

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
      <span class="queue-title">
        <AppIcon name="industry" />
        <span>建造队列</span>
      </span>
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
          <IconButton
            icon="close"
            label="取消并返还资源"
            tone="danger"
            size="sm"
            @click="game.dequeueBuilding(index)"
          />
        </div>
        <ProgressBar class="qi-progress-bar" :value="getProgressPercent(item)" tone="warning" size="sm" />
        <div class="qi-details">
          <span v-for="(amount, resId) in item.cost" :key="resId" class="qi-cost-tag">
            {{ getResourceName(resId as string) }}: 
            {{ Math.floor((item.progress?.[resId] || 0) as number) }} / {{ Math.floor(amount as number) }}
          </span>
        </div>
      </div>
    </div>
    
    <EmptyState v-else text="队列为空。" icon="industry" />
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
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  font-size: 13px;
  color: var(--warning);
}
.queue-count {
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--surface-pressed);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}

.queue-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.queue-item {
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
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
.qi-progress-bar { margin-bottom: 4px; }

.qi-details {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 10px;
  color: var(--text-secondary);
}
.qi-cost-tag {
  background: var(--surface-pressed);
  padding: 1px 4px;
  border-radius: var(--radius-sm);
}
</style>
