<!--
  铸造面板 (CraftPanel.vue)
  展示工匠合成系统的 UI：
  - 显示每种合成品的配方、合成按钮
  - 显示工匠分配控制（+/-）到各产线
  - 仅在解锁铸造科技后显示

  依赖 Store actions: doCraft, assignCraftLine, removeCraftLine
-->
<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import { CRAFT_COSTS, CRAFTABLE_IDS, type CraftableId, type FoundryState } from '@evozen/game-core'
import { getResourceName } from '../utils/resourceNames'
import AppIcon from './ui/AppIcon.vue'
import AllocationControl from './ui/AllocationControl.vue'

const game = useGameStore()

/** 合成品中文名 */
const craftNames: Record<string, string> = {
  Plywood: '胶合板',
  Brick: '砖块',
  Wrought_Iron: '锻铁',
  Sheet_Metal: '金属板',
  Mythril: '秘银',
}

/** 合成品描述 */
const craftDesc: Record<string, string> = {
  Plywood: '由木材压制而成，用于高级建筑。',
  Brick: '由水泥烧制而成，坚固耐用的建材。',
  Wrought_Iron: '由铁锭锻造而成的高强度材料。',
  Sheet_Metal: '由铝材压制成板，用于更先进的工业与太空建材。',
  Mythril: '以铱和合金锻造的稀有材料，是火星前线扩张的关键资源。',
}

const isUnlocked = computed(() => (game.state.tech['foundry'] ?? 0) >= 1)

const foundry = computed(() => game.state.city['foundry'] as FoundryState | undefined)

const craftsmanWorkers = computed(() => {
  const job = game.state.civic['craftsman'] as { workers: number } | undefined
  return job?.workers ?? 0
})

const totalAssigned = computed(() => {
  if (!foundry.value) return 0
  let total = 0
  for (const id of CRAFTABLE_IDS) {
    total += foundry.value[id] ?? 0
  }
  return total
})

const unassigned = computed(() => craftsmanWorkers.value - totalAssigned.value)
const visibleCraftIds = computed(() => CRAFTABLE_IDS.filter(id => game.state.resource[id]?.display))

/** 检查是否有足够原料手动合成 */
function canCraft(craftId: string): boolean {
  const recipe = CRAFT_COSTS[craftId]
  if (!recipe) return false
  for (const { resource, amount } of recipe) {
    if ((game.state.resource[resource]?.amount ?? 0) < amount) return false
  }
  return true
}

/** 获取当前产线分配的工匠数 */
function getAssigned(craftId: string): number {
  return foundry.value?.[craftId] ?? 0
}

/** 获取当前已有的合成品数量 */
function getCraftAmount(craftId: string): number {
  return Math.floor(game.state.resource[craftId]?.amount ?? 0)
}
</script>

<template>
  <div v-if="isUnlocked" class="craft-panel">
    <h3 class="section-title">
      <AppIcon name="industry" class="section-icon" />
      <span>铸造厂</span>
      <span class="subtitle">工匠: {{ totalAssigned }}/{{ craftsmanWorkers }}</span>
    </h3>

    <div class="craft-grid">
      <div
        v-for="craftId in visibleCraftIds"
        :key="craftId"
        class="craft-card card"
      >
        <div class="craft-header">
          <span class="craft-name">{{ craftNames[craftId] ?? craftId }}</span>
          <span class="craft-stock">{{ getCraftAmount(craftId) }}</span>
        </div>

        <div class="craft-desc">{{ craftDesc[craftId] ?? '' }}</div>

        <!-- 配方 -->
        <div class="recipe-line">
          <span class="recipe-label">配方:</span>
          <span
            v-for="(item, idx) in CRAFT_COSTS[craftId]"
            :key="idx"
            class="recipe-item"
            :class="{ insufficient: (game.state.resource[item.resource]?.amount ?? 0) < item.amount }"
          >
            {{ getResourceName(item.resource) }} ×{{ item.amount }}
          </span>
        </div>

        <!-- 操作行 -->
        <div class="craft-actions">
          <!-- 手动合成按钮 -->
          <button
            class="btn primary sm craft-action-btn"
            :disabled="!canCraft(craftId)"
            @click="game.doCraft(craftId as CraftableId)"
          >
            合成 ×1
          </button>

          <!-- 工匠分配 -->
          <AllocationControl
            :value="getAssigned(craftId)"
            :decrement-disabled="getAssigned(craftId) <= 0"
            :increment-disabled="unassigned <= 0"
            decrement-label="减少此产线工匠"
            increment-label="增加此产线工匠"
            @decrement="game.removeCraftLine(craftId as CraftableId)"
            @increment="game.assignCraftLine(craftId as CraftableId)"
          />
        </div>
      </div>
    </div>

    <div v-if="craftsmanWorkers === 0" class="craft-hint">
      建造铸造厂并分配工匠，即可自动生产合成材料。
    </div>
  </div>
</template>

<style scoped>
.craft-panel {
  margin-top: 16px;
}

.section-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-accent);
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.section-icon {
  width: 16px;
  height: 16px;
  flex: 0 0 auto;
}
.section-title .subtitle {
  font-size: 12px;
  font-weight: 400;
  color: var(--text-secondary);
  margin-left: auto;
}

.craft-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.craft-card {
  padding: 12px 14px;
}

.craft-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.craft-name {
  font-weight: 600;
  font-size: 14px;
  color: var(--text-primary);
}

.craft-stock {
  font-size: 13px;
  color: var(--accent);
  font-weight: 600;
}

.craft-desc {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.recipe-line {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}
.recipe-label {
  font-size: 12px;
  color: var(--text-secondary);
}
.recipe-item {
  font-size: 12px;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  background: var(--bg-secondary);
  color: var(--text-primary);
}
.recipe-item.insufficient {
  color: var(--danger);
  background: var(--danger-glow);
}

.craft-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.craft-action-btn {
  flex: 0 0 auto;
}

.craft-hint {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 8px;
  padding: 8px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
}
</style>
