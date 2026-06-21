<!--
  科技研究面板 (TechPanel.vue)
  读取所有的基础科技项并检查前置依赖。
  玩家点击时消耗资源进行科技解锁。解锁后可能会连带解锁新资源、新建筑与新岗位。
-->
<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import { BASIC_TECHS, type TechDefinition } from '@evozen/game-core'
import { getResourceName } from '../utils/resourceNames'
import AppIcon from './ui/AppIcon.vue'
import EmptyState from './ui/EmptyState.vue'

const game = useGameStore()

const techCatalog = computed(() => {
  const seen = new Set<string>()
  return BASIC_TECHS.filter(tech => {
    if (seen.has(tech.id)) return false
    seen.add(tech.id)
    return true
  })
})

/** 可研究的科技 */
const availableTechs = computed(() => {
  return techCatalog.value
    .filter(t => game.isTechAvailable(t.id))
    .sort((a, b) => {
      const ak = a.costs.Knowledge ?? Number.MAX_SAFE_INTEGER
      const bk = b.costs.Knowledge ?? Number.MAX_SAFE_INTEGER
      if (ak !== bk) return ak - bk
      return totalCost(a) - totalCost(b)
    })
})

/** 已研究完成的科技 */
const completedTechs = computed(() => {
  return techCatalog.value.filter(t => {
    const [grantKey, grantLvl] = t.grant
    return (game.state.tech[grantKey] ?? 0) >= grantLvl
  })
})

function formatCost(techId: string): Array<{ resId: string; amount: number; affordable: boolean }> {
  return (Object.entries(game.getTechCost(techId)) as Array<[string, number]>)
    .filter(([_, amount]) => Math.ceil(amount) > 0)
    .map(([resId, amount]) => ({
      resId,
      amount: Math.ceil(amount),
      affordable: (game.state.resource[resId]?.amount ?? 0) >= amount,
    }))
}

function totalCost(tech: TechDefinition): number {
  return Object.values(tech.costs).reduce((sum, cost) => sum + cost, 0)
}

function techTooltip(tech: TechDefinition): string {
  const costs = formatCost(tech.id)
  const costText = costs.length > 0
    ? costs.map(cost => `${getResourceName(cost.resId)} ${cost.amount.toLocaleString()}`).join('，')
    : '无'
  return `${tech.description}\n效果：${tech.effect}\n费用：${costText}`
}
</script>

<template>
  <div class="tech-panel animate-in">
    <div class="tech-section">
      <div class="section-header">
        <AppIcon name="crispr" class="section-icon" />
        <span class="section-title">可用研究</span>
      </div>

      <EmptyState v-if="availableTechs.length === 0" text="暂无可用研究项目。" icon="lock" />

      <!-- 2 列 grid -->
      <div class="tech-grid" v-else>
        <div
          v-for="tech in availableTechs"
          :key="tech.id"
          class="tech-card"
          :class="{ disabled: !game.canAffordTech(tech.id) }"
          :data-tooltip="techTooltip(tech)"
          data-tooltip-pos="bottom"
          @click="game.research(tech.id)"
        >
          <div class="tech-card-top">
            <span class="tech-name">{{ tech.name }}</span>
            <span class="tech-era">{{ tech.era }}</span>
          </div>
          <p class="tech-effect">{{ tech.effect }}</p>
          <div class="tech-costs">
            <span
              v-for="cost in formatCost(tech.id)"
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

    <!-- 已完成的研究 -->
    <div v-if="completedTechs.length > 0" class="completed-section">
      <div class="section-header completed-header">
        <AppIcon name="shieldCheck" class="section-icon" />
        <span class="section-title">已完成 ({{ completedTechs.length }})</span>
      </div>
      <div class="completed-list">
        <span
          v-for="tech in completedTechs"
          :key="tech.id"
          class="completed-tag"
          :data-tooltip="tech.effect"
        >
          <span class="dot"></span>{{ tech.name }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tech-panel {
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-top: 24px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
}

.section-icon {
  width: 14px;
  height: 14px;
  color: var(--secondary);
  opacity: 0.8;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

/* 自适应列数 */
.tech-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}

.tech-card {
  padding: 10px 14px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s;
  user-select: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tech-card:hover:not(.disabled) {
  background: var(--bg-card-hover);
  border-color: var(--border-hover);
}

.tech-card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tech-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.tech-name {
  font-weight: 600;
  font-size: 13px;
  color: var(--text-primary);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tech-era {
  font-size: 10px;
  color: var(--text-muted);
  padding: 1px 5px;
  background: var(--surface-pressed);
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}

.tech-effect {
  font-size: 11px;
  color: var(--text-secondary);
  line-height: 1.4;
  margin: 0;
}

.tech-costs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.cost-tag {
  font-size: 10px;
  font-family: var(--font-mono);
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  background: var(--success-glow);
  color: var(--success);
}

.cost-tag .cost-name {
  color: var(--text-secondary);
  font-family: var(--font-sans);
  font-size: 10px;
  margin-right: 2px;
}

.cost-tag.unaffordable {
  background: var(--danger-glow);
  color: var(--danger);
}

.completed-header {
  opacity: 0.6;
}
.completed-header .section-icon {
  color: var(--success);
}

.completed-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.completed-tag {
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 500;
  color: var(--text-secondary);
  padding: 4px 10px;
  background: var(--surface-raised);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  transition: all 0.2s ease;
}
.completed-tag:hover {
  background: var(--surface-pressed);
  color: var(--text-primary);
}
.completed-tag .dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--success);
  margin-right: 6px;
  opacity: 0.8;
}

/* 覆盖全局 tooltip 位置，使其向右展开，防止被左侧边栏遮挡 */
.completed-tag[data-tooltip]::after {
  left: 0 !important;
  transform: translateX(0) translateY(4px) !important;
}
.completed-tag[data-tooltip]::before {
  left: 20px !important;
  transform: translateX(-50%) translateY(4px) !important;
  z-index: var(--z-tooltip) !important;
}
.completed-tag[data-tooltip]:hover::after {
  transform: translateX(0) translateY(0) !important;
}
.completed-tag[data-tooltip]:hover::before {
  transform: translateX(-50%) translateY(0) !important;
}
</style>
