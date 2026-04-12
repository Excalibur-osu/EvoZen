<!--
  电力网格面板 (PowerPanel.vue)
  显示发电/耗电/净余状态，以及发电站和用电建筑的 on/count
-->
<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'

const game = useGameStore()

const power = computed(() => game.state.city.power ?? { generated: 0, consumed: 0, surplus: 0 })
const hasPower = computed(() => power.value.generated > 0 || power.value.consumed > 0)

/** 发电站列表 */
const generators = computed(() => {
  const list: Array<{ id: string; name: string; count: number; on: number; power: number; fuel: string; fuelRate: number }> = []
  
  const coalPower = game.state.city['coal_power'] as { count: number; on?: number } | undefined
  if (coalPower && coalPower.count > 0) {
    list.push({
      id: 'coal_power', name: '燃煤发电站',
      count: coalPower.count, on: coalPower.on ?? coalPower.count,
      power: 5, fuel: '煤', fuelRate: 0.35,
    })
  }

  const oilPower = game.state.city['oil_power'] as { count: number; on?: number } | undefined
  if (oilPower && oilPower.count > 0) {
    list.push({
      id: 'oil_power', name: '石油发电站',
      count: oilPower.count, on: oilPower.on ?? oilPower.count,
      power: 6, fuel: '石油', fuelRate: 0.65,
    })
  }

  return list
})

/** 用电建筑列表 */
const consumers = computed(() => {
  const defs = [
    { id: 'mine', name: '矿井', powerCost: 1 },
    { id: 'coal_mine', name: '煤矿', powerCost: 1 },
    { id: 'wardenclyffe', name: '沃登克里弗塔', powerCost: 2 },
    { id: 'metal_refinery', name: '金属精炼厂', powerCost: 2 },
  ]
  return defs.filter(d => {
    const s = game.state.city[d.id] as { count: number } | undefined
    return s && s.count > 0
  }).map(d => {
    const s = game.state.city[d.id] as { count: number; on?: number }
    return { ...d, count: s.count, on: s.on ?? s.count }
  })
})


function adjustGeneratorOn(id: string, delta: number) {
  const struct = game.state.city[id] as { count: number; on?: number } | undefined
  if (!struct) return
  const current = struct.on ?? struct.count
  struct.on = Math.max(0, Math.min(struct.count, current + delta))
}
</script>

<template>
  <div class="power-panel" v-if="hasPower">
    <h3 class="section-title">⚡ 电力网格</h3>

    <!-- 电力摘要 -->
    <div class="power-summary">
      <div class="power-stat">
        <span class="stat-label">发电</span>
        <span class="stat-value gen">+{{ power.generated }} MW</span>
      </div>
      <div class="power-stat">
        <span class="stat-label">耗电</span>
        <span class="stat-value con">-{{ power.consumed }} MW</span>
      </div>
      <div class="power-stat">
        <span class="stat-label">净余</span>
        <span class="stat-value" :class="power.surplus >= 0 ? 'surplus' : 'deficit'">
          {{ power.surplus >= 0 ? '+' : '' }}{{ power.surplus }} MW
        </span>
      </div>
    </div>

    <!-- 警告 -->
    <div class="power-warning" v-if="power.surplus < 0">
      ⚠️ 电力不足！部分建筑已停工。
    </div>

    <!-- 发电站 -->
    <div class="power-section" v-if="generators.length > 0">
      <h4 class="subsection-title">发电站</h4>
      <div v-for="gen in generators" :key="gen.id" class="power-row">
        <div class="power-row-info">
          <span class="power-row-name">{{ gen.name }}</span>
          <span class="power-row-detail font-mono">
            {{ gen.on }}/{{ gen.count }} · +{{ gen.on * gen.power }}MW
          </span>
        </div>
        <div class="power-row-controls">
          <button class="ctrl-btn" @click="adjustGeneratorOn(gen.id, -1)" :disabled="(gen.on ?? 0) <= 0" data-tooltip="关闭一台">−</button>
          <button class="ctrl-btn" @click="adjustGeneratorOn(gen.id, 1)" :disabled="gen.on >= gen.count" data-tooltip="开启一台">+</button>
        </div>
      </div>
    </div>

    <!-- 用电建筑 -->
    <div class="power-section" v-if="consumers.length > 0">
      <h4 class="subsection-title">用电建筑</h4>
      <div v-for="con in consumers" :key="con.id" class="power-row">
        <div class="power-row-info">
          <span class="power-row-name">{{ con.name }}</span>
          <span class="power-row-detail font-mono">
            {{ con.count }}座 · -{{ con.count * con.powerCost }}MW
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.power-panel {
  margin-bottom: 16px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-accent);
  margin-bottom: 10px;
}

.power-summary {
  display: flex;
  gap: 12px;
  margin-bottom: 10px;
  padding: 8px 12px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
}

.power-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.stat-label {
  font-size: 10px;
  color: var(--text-secondary);
  margin-bottom: 2px;
}

.stat-value {
  font-size: 14px;
  font-weight: 700;
  font-family: var(--font-mono);
}

.stat-value.gen { color: var(--success); }
.stat-value.con { color: var(--warning, #f59e0b); }
.stat-value.surplus { color: var(--success); }
.stat-value.deficit { color: var(--danger); }

.power-warning {
  padding: 6px 10px;
  margin-bottom: 10px;
  background: rgba(248, 113, 113, 0.1);
  border: 1px solid rgba(248, 113, 113, 0.3);
  border-radius: var(--radius-sm);
  color: var(--danger);
  font-size: 12px;
  font-weight: 500;
}

.subsection-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.power-section {
  margin-bottom: 10px;
}

.power-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  margin-bottom: 4px;
}

.power-row-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.power-row-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
}

.power-row-detail {
  font-size: 11px;
  color: var(--text-secondary);
}

.power-row-controls {
  display: flex;
  gap: 4px;
}

.ctrl-btn {
  width: 22px;
  height: 22px;
  font-size: 14px;
  font-weight: 700;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 3px;
  color: var(--text-accent);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  padding: 0;
  line-height: 1;
}

.ctrl-btn:hover:not(:disabled) {
  background: var(--bg-card-hover);
  border-color: var(--border-hover);
}

.ctrl-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
</style>
