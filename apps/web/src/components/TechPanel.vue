<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import { BASIC_TECHS } from '@evozen/game-core'
import { getResourceName } from '../utils/resourceNames'

const game = useGameStore()

/** 可研究的科技 */
const availableTechs = computed(() => {
  return BASIC_TECHS.filter(t => game.isTechAvailable(t.id))
})

/** 已研究完成的科技 */
const completedTechs = computed(() => {
  return BASIC_TECHS.filter(t => {
    const [grantKey, grantLvl] = t.grant
    return (game.state.tech[grantKey] ?? 0) >= grantLvl
  })
})

function formatCost(costs: Record<string, number>): Array<{ resId: string; amount: number; affordable: boolean }> {
  return Object.entries(costs).map(([resId, amount]) => ({
    resId,
    amount: Math.ceil(amount),
    affordable: (game.state.resource[resId]?.amount ?? 0) >= amount,
  }))
}
</script>

<template>
  <div class="tech-panel">
    <h3 class="section-title">🔬 可用研究</h3>

    <div v-if="availableTechs.length === 0" style="color: var(--text-muted); font-size: 13px; padding: 20px 0; text-align: center">
      暂无可用研究项目
    </div>

    <div
      v-for="tech in availableTechs"
      :key="tech.id"
      class="tech-item"
      :class="{ disabled: !game.canAffordTech(tech.id) }"
      @click="game.research(tech.id)"
    >
      <div class="tech-header">
        <span class="tech-name">{{ tech.name }}</span>
        <span class="tech-era text-xs">{{ tech.era }}</span>
      </div>
      <p class="tech-effect">{{ tech.effect }}</p>
      <div class="tech-costs">
        <span
          v-for="cost in formatCost(tech.costs)"
          :key="cost.resId"
          class="cost-tag"
          :class="{ unaffordable: !cost.affordable }"
        >
          {{ getResourceName(cost.resId) }} {{ cost.amount.toLocaleString() }}
        </span>
      </div>
    </div>

    <!-- 已完成的研究 -->
    <div v-if="completedTechs.length > 0" style="margin-top: 24px">
      <h3 class="section-title" style="opacity: 0.5">📜 已完成 ({{ completedTechs.length }})</h3>
      <div class="completed-list">
        <span
          v-for="tech in completedTechs"
          :key="tech.id"
          class="completed-tag"
        >
          ✓ {{ tech.name }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tech-panel {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-accent);
  margin-bottom: 8px;
}

.tech-item {
  padding: 10px 14px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s;
  user-select: none;
}
.tech-item:hover:not(.disabled) {
  background: var(--bg-card-hover);
  border-color: var(--border-hover);
}
.tech-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tech-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 3px;
}
.tech-name {
  font-weight: 600;
  font-size: 13px;
  color: var(--text-accent);
}
.tech-era {
  color: var(--text-muted);
  padding: 0 6px;
  background: rgba(255,255,255,0.04);
  border-radius: 3px;
}

.tech-effect {
  font-size: 11px;
  color: var(--text-secondary);
  margin-bottom: 4px;
  line-height: 1.4;
}

.tech-costs {
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

.completed-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.completed-tag {
  font-size: 11px;
  color: var(--text-muted);
  padding: 2px 8px;
  background: rgba(255,255,255,0.03);
  border-radius: 4px;
}
</style>
