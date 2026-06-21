<!--
  GalaxyPanel — 银河区域建筑入口
  接入 core GALAXY_STRUCTURES，并承载 fasting endless_hunger b1 的 embassy 建造触发。
-->
<script setup lang="ts">
import { computed, ref } from 'vue'
import type { GalaxyRegion } from '@evozen/game-core'
import { useGameStore } from '../stores/game'
import PanelHeader from './ui/PanelHeader.vue'
import EmptyState from './ui/EmptyState.vue'
import SegmentedTabs from './ui/SegmentedTabs.vue'

const game = useGameStore()

const regionLabels: Record<GalaxyRegion, string> = {
  gxy_stargate: '星门',
  gxy_gateway: '网关',
  gxy_gorddon: '戈登',
  gxy_alien1: '外星文明 I',
  gxy_alien2: '外星文明 II',
  gxy_chthonian: '地底世界',
}

const regions = computed(() =>
  game.GALAXY_STRUCTURES
    .map((s) => s.region as GalaxyRegion)
    .filter((region, index, list) => list.indexOf(region) === index)
)

const visibleRegions = computed(() =>
  regions.value.filter((region) => game.GALAXY_STRUCTURES.some((s) => s.region === region && isVisible(s.id)))
)

const activeRegion = ref<GalaxyRegion>('gxy_stargate')

const activeRegionSafe = computed(() => {
  if (visibleRegions.value.includes(activeRegion.value)) return activeRegion.value
  return visibleRegions.value[0] ?? activeRegion.value
})

const regionTabs = computed(() =>
  visibleRegions.value.map((id) => ({
    id,
    label: regionLabels[id] ?? id,
    count: buildingsByRegion(id).length,
  }))
)

const buildings = computed(() => buildingsByRegion(activeRegionSafe.value))
const isUnlocked = computed(() => visibleRegions.value.length > 0)

function isVisible(id: string): boolean {
  const def = game.GALAXY_STRUCTURES.find((s) => s.id === id)
  if (!def) return false
  for (const [tech, lvl] of Object.entries(def.reqs)) {
    if ((game.state.tech[tech] ?? 0) < lvl) return false
  }
  if (def.condition && !def.condition(game.state)) return false
  return true
}

function buildingsByRegion(region: GalaxyRegion) {
  return game.GALAXY_STRUCTURES.filter((s) => s.region === region && isVisible(s.id))
}

function buildingCount(id: string): number {
  const galaxy = (game.state as unknown as { galaxy?: Record<string, { count?: number }> }).galaxy
  return galaxy?.[id]?.count ?? 0
}

function buildingOn(id: string): number {
  const galaxy = (game.state as unknown as { galaxy?: Record<string, { on?: number }> }).galaxy
  return galaxy?.[id]?.on ?? 0
}

function buildCost(id: string): Record<string, number> {
  return game.getGalaxyBuildCost(id)
}

function canBuild(id: string): boolean {
  return game.canBuildGalaxyStructure(id)
}

function build(id: string): void {
  game.buildGalaxyStructure(id)
}

function formatNum(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return Math.ceil(n).toLocaleString()
}
</script>

<template>
  <section class="galaxy-panel animate-in">
    <PanelHeader
      icon="galaxy"
      title="银河"
      subtitle="星门之后的银河设施。此处先接入建筑入口、成本和基础解锁，舰队/海盗/外交仍待继续验收。"
    />

    <EmptyState
      v-if="!isUnlocked"
      icon="galaxy"
      text="尚未解锁银河区域。继续推进星际、星门和 xeno 科技。"
    />

    <template v-else>
      <SegmentedTabs
        :items="regionTabs"
        :active="activeRegionSafe"
        @select="activeRegion = $event"
      />

      <div class="galaxy-grid">
        <article
          v-for="building in buildings"
          :key="building.id"
          class="galaxy-card card"
          :class="{ ready: canBuild(building.id), built: buildingCount(building.id) > 0 }"
        >
          <div class="galaxy-card-head">
            <div>
              <h3>{{ building.name }}</h3>
              <p>{{ building.description }}</p>
            </div>
            <div class="galaxy-count font-mono" v-if="buildingCount(building.id) > 0">
              x{{ buildingCount(building.id) }}
              <span v-if="buildingOn(building.id) > 0">/{{ buildingOn(building.id) }} on</span>
            </div>
          </div>

          <div class="galaxy-costs">
            <span
              v-for="(amount, resource) in buildCost(building.id)"
              :key="resource"
              class="cost-chip"
              :class="{ lack: (game.state.resource[resource]?.amount ?? 0) < amount }"
            >
              {{ resource }} {{ formatNum(amount) }}
            </span>
          </div>

          <div class="galaxy-meta">
            <span v-if="building.powerCost">耗电 {{ building.powerCost }} MW</span>
            <span v-if="building.support">支援 {{ building.support.pool }} {{ building.support.amount > 0 ? '+' : '' }}{{ building.support.amount }}</span>
            <span v-if="building.supportFuel">燃料 {{ building.supportFuel.resource }} / tick</span>
          </div>

          <p class="galaxy-effect">{{ building.effect }}</p>

          <button class="btn primary build-btn" :disabled="!canBuild(building.id)" @click="build(building.id)">
            建造
          </button>
        </article>
      </div>
    </template>
  </section>
</template>

<style scoped>
.galaxy-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 12px;
}

.galaxy-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 8px;
}

.galaxy-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
}

.galaxy-card.ready {
  border-color: color-mix(in srgb, var(--success) 50%, transparent);
}

.galaxy-card.built {
  background: var(--surface-raised);
}

.galaxy-card-head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.galaxy-card h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: 13px;
}

.galaxy-card p {
  margin: 3px 0 0;
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 1.35;
}

.galaxy-count {
  flex-shrink: 0;
  color: var(--accent);
  font-size: 11px;
}

.galaxy-costs,
.galaxy-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.cost-chip,
.galaxy-meta span {
  padding: 2px 6px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background: var(--surface-pressed);
  color: var(--text-secondary);
  font-size: 10px;
}

.cost-chip.lack {
  color: var(--danger);
  border-color: color-mix(in srgb, var(--danger) 45%, transparent);
}

.galaxy-effect {
  min-height: 30px;
  color: var(--text-muted) !important;
}

.build-btn {
  margin-top: auto;
  align-self: flex-end;
}
</style>
