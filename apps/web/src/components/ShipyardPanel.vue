<script setup lang="ts">
import { computed, ref } from 'vue'
import { EXPLORER_ELERIUM_PER_TICK, EXPLORER_TAU_TRANSIT } from '@evozen/game-core'
import { useGameStore } from '../stores/game'
import { getResourceName } from '../utils/resourceNames'
import AppIcon from './ui/AppIcon.vue'

const game = useGameStore()
const shipName = ref('')
const ships = computed(() => game.getExplorerShips())
const cost = computed(() => game.getExplorerShipCost())
const powered = computed(() => game.isTruepathShipyardPowered())
const crewSize = computed(() => game.getExplorerCrewSize())

const buildStatus = computed(() => {
  if ((game.state.tech['tauceti'] ?? 0) < 1) return '星际驱动未完成'
  if ((game.state.tech['syard_power'] ?? 0) < 4) return '舰船聚变未研发'
  if (!powered.value) return '造船厂未供电'
  return game.canBuildExplorerShip() ? '可以建造' : '资源不足'
})

function buildExplorer() {
  const ship = game.buildExplorerShip(shipName.value)
  if (ship) shipName.value = ''
}

function locationLabel(location: string, transit: number): string {
  if (transit > 0) return '前往 Tau Ceti'
  return location === 'tauceti' ? 'Tau Ceti 轨道' : '矮行星造船厂'
}

function formatAmount(amount: number): string {
  if (amount >= 1e9) return `${(amount / 1e9).toFixed(2)}B`
  if (amount >= 1e6) return `${(amount / 1e6).toFixed(2)}M`
  if (amount >= 1e3) return `${(amount / 1e3).toFixed(1)}K`
  return amount.toLocaleString()
}
</script>

<template>
  <section class="shipyard-panel">
    <header class="shipyard-head">
      <div>
        <span class="eyebrow">Truepath Fleet</span>
        <h2>探索舰队</h2>
      </div>
      <div class="yard-state" :class="{ online: powered }">
        <AppIcon name="zap" />
        <span>{{ powered ? '50 MW 已供电' : '等待 50 MW' }}</span>
      </div>
    </header>

    <div class="blueprint-layout">
      <div class="blueprint-copy">
        <div class="blueprint-title">
          <span>探索舰</span>
          <span class="build-state">{{ buildStatus }}</span>
        </div>
        <div class="spec-row">
          <span>EM 驱动</span>
          <span>量子传感器</span>
          <span>埃勒里动力</span>
          <span>中子素装甲</span>
        </div>
        <div class="metrics-row">
          <span>船员 {{ crewSize }}</span>
          <span>航程 {{ EXPLORER_TAU_TRANSIT.toLocaleString() }} 日</span>
          <span>燃料 {{ EXPLORER_ELERIUM_PER_TICK }} Elerium/s</span>
          <span>扫描距离 160 km</span>
        </div>
        <div class="cost-row">
          <span
            v-for="(amount, resource) in cost"
            :key="resource"
            class="cost-item"
            :class="{ lack: (game.state.resource[resource]?.amount ?? 0) < amount }"
          >
            {{ getResourceName(resource) }} {{ formatAmount(amount) }}
          </span>
        </div>
      </div>
      <div class="build-controls">
        <label for="explorer-name">舰名</label>
        <input id="explorer-name" v-model="shipName" maxlength="40" placeholder="探索者" />
        <button class="btn primary" :disabled="!game.canBuildExplorerShip()" @click="buildExplorer">
          <AppIcon name="hammer" />
          <span>建造探索舰</span>
        </button>
      </div>
    </div>

    <div v-if="ships.length > 0" class="fleet-list">
      <article v-for="ship in ships" :key="ship.id" class="ship-row">
        <div class="ship-identity">
          <strong>{{ ship.name }}</strong>
          <span>{{ locationLabel(ship.location, ship.transit) }}</span>
        </div>
        <div class="ship-progress">
          <div class="progress-label">
            <span v-if="ship.transit > 0">剩余 {{ ship.transit.toLocaleString() }} 日</span>
            <span v-else>航行完成</span>
            <span :class="ship.fueled ? 'fuel-ok' : 'fuel-wait'">
              {{ ship.location === 'spc_dwarf' && ship.transit === 0 ? '停泊' : ship.fueled ? '燃料正常' : '燃料中断' }}
            </span>
          </div>
          <progress :value="ship.dist > 0 ? ship.dist - ship.transit : 0" :max="ship.dist || 1" />
        </div>
        <div class="ship-meta">
          <span>船体 {{ 100 - ship.damage }}%</span>
          <span>船员 {{ crewSize }}</span>
        </div>
        <button
          v-if="ship.location === 'spc_dwarf' && ship.transit === 0"
          class="btn primary dispatch-btn"
          :disabled="!game.canDispatchExplorerToTau(ship.id)"
          @click="game.dispatchExplorerToTau(ship.id)"
        >
          <AppIcon name="route" />
          <span>前往 Tau Ceti</span>
        </button>
      </article>
    </div>
  </section>
</template>

<style scoped>
.shipyard-panel {
  padding: 16px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
}

.shipyard-head,
.blueprint-title,
.progress-label,
.ship-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.shipyard-head h2 {
  margin: 2px 0 0;
  font-size: 16px;
  color: var(--text-primary);
}

.eyebrow {
  font-size: 10px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0;
}

.yard-state {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--danger);
  font-size: 12px;
}

.yard-state.online,
.fuel-ok {
  color: var(--success);
}

.blueprint-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(190px, 240px);
  gap: 20px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}

.blueprint-copy,
.build-controls,
.ship-progress,
.ship-identity {
  min-width: 0;
}

.blueprint-title {
  justify-content: flex-start;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.build-state {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-accent);
}

.spec-row,
.metrics-row,
.cost-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.spec-row span,
.metrics-row span,
.cost-item {
  font-size: 11px;
}

.spec-row span {
  padding: 4px 8px;
  border: 1px solid var(--border-color);
  color: var(--text-primary);
}

.metrics-row span {
  color: var(--text-secondary);
}

.cost-item {
  color: var(--info);
  font-family: var(--font-mono);
}

.cost-item.lack,
.fuel-wait {
  color: var(--danger);
}

.build-controls {
  display: grid;
  align-content: start;
  gap: 8px;
}

.build-controls label {
  font-size: 11px;
  color: var(--text-secondary);
}

.build-controls input {
  width: 100%;
  min-width: 0;
  padding: 8px 10px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background: var(--surface-pressed);
  color: var(--text-primary);
}

.build-controls .btn,
.dispatch-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.fleet-list {
  margin-top: 16px;
  border-top: 1px solid var(--border-color);
}

.ship-row {
  display: grid;
  grid-template-columns: minmax(150px, 0.8fr) minmax(220px, 1.4fr) minmax(120px, 0.6fr) auto;
  align-items: center;
  gap: 16px;
  padding: 14px 0;
  border-bottom: 1px solid var(--border-color);
}

.ship-identity strong,
.ship-identity span {
  display: block;
  overflow-wrap: anywhere;
}

.ship-identity strong {
  color: var(--text-primary);
}

.ship-identity span,
.progress-label,
.ship-meta {
  margin-top: 4px;
  font-size: 11px;
  color: var(--text-secondary);
}

.ship-progress progress {
  display: block;
  width: 100%;
  height: 6px;
  margin-top: 6px;
  accent-color: var(--accent);
}

.ship-meta {
  flex-direction: column;
  align-items: flex-start;
}

@media (max-width: 760px) {
  .blueprint-layout,
  .ship-row {
    grid-template-columns: 1fr;
  }

  .dispatch-btn {
    justify-self: start;
  }
}
</style>
