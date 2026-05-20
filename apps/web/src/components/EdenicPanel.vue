<!--
  EdenicPanel — 伊甸园面板
  4 区域 + 神化终局
-->
<script setup lang="ts">
import { useGameStore } from '../stores/game'
import { computed, ref } from 'vue'
import type { EdenicRegionId } from '@evozen/game-core'

const game = useGameStore()

const regionsAll: EdenicRegionId[] = ['asphodel', 'elysium', 'isle', 'palace']
const activeRegion = ref<EdenicRegionId>('asphodel')

const visibleRegions = computed(() => regionsAll.filter((r) => game.isEdenicRegionUnlocked(r)))

const buildings = computed(() =>
  game.getEdenicBuildingsByRegion(activeRegion.value).filter((b) => {
    for (const [tech, lvl] of Object.entries(b.reqs)) {
      if ((game.state.tech[tech] ?? 0) < lvl) return false
    }
    return true
  }),
)

function regionLabel(r: EdenicRegionId): string {
  return game.EDENIC_REGIONS[r]?.name ?? r
}
function regionDesc(r: EdenicRegionId): string {
  return game.EDENIC_REGIONS[r]?.desc ?? ''
}
function buildingCount(id: string) {
  return (game.state.eden as Record<string, { count?: number }>)[id]?.count ?? 0
}
function buildingPowered(id: string) {
  return (game.state.eden as Record<string, { on?: number }>)[id]?.on ?? 0
}
function buildCost(id: string) {
  return game.getEdenicBuildCost(id) ?? {}
}
function canBuild(id: string) {
  return game.canBuildEdenic(id)
}
function build(id: string) {
  game.buildEdenicStructure(id)
}

function fmtNum(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(2) + 'K'
  return Math.round(n).toString()
}
</script>

<template>
  <div class="edenic-panel">
    <div class="title-section">
      <h2 class="title">🌟 伊甸园</h2>
      <p class="subtitle">飞升至神圣领域。这是终极目标 — 神化（Apotheosis）。</p>
    </div>

    <div v-if="!game.isEdenicUnlocked" class="locked">
      <span>🔒 需先飞升以解锁伊甸园。</span>
    </div>

    <template v-else>
      <div class="region-tabs">
        <button
          v-for="r in visibleRegions"
          :key="r"
          :class="['region-tab', { active: activeRegion === r }]"
          @click="activeRegion = r"
        >
          {{ regionLabel(r) }}
        </button>
      </div>

      <p class="region-desc">{{ regionDesc(activeRegion) }}</p>

      <div v-if="buildings.length === 0" class="empty">
        <span>🔒 此区域当前无可用建筑</span>
      </div>

      <div v-for="b in buildings" :key="b.id" class="building-card">
        <div class="building-header">
          <span class="building-name">{{ b.name }}</span>
          <span class="building-count" v-if="buildingCount(b.id) > 0">
            ×{{ buildingCount(b.id) }} ({{ buildingPowered(b.id) }} 通电)
          </span>
          <button class="build-btn" :disabled="!canBuild(b.id)" @click="build(b.id)">建造</button>
        </div>
        <p class="building-desc">{{ b.desc }}</p>
        <div class="building-cost">
          <span v-for="(amt, res) in buildCost(b.id)" :key="res" class="cost-item">
            {{ res }} ×{{ fmtNum(amt as number) }}
          </span>
        </div>
        <div v-if="b.power !== 0" class="building-power">
          <span :class="b.power > 0 ? 'pow-cost' : 'pow-gen'">
            {{ b.power > 0 ? `耗电 ${b.power} MW` : `发电 ${-b.power} MW` }}
          </span>
        </div>
        <p class="building-effect">{{ b.effectDesc }}</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.edenic-panel { padding: 1rem; color: #e0e0e0; }
.title-section { margin-bottom: 1rem; }
.title { font-size: 1.3rem; color: #ffdd99; margin: 0 0 0.3rem; }
.subtitle { font-size: 0.85rem; color: #aaa; }
.locked { text-align: center; color: #888; padding: 2rem; font-style: italic; }

.region-tabs { display: flex; gap: 0.3rem; margin-bottom: 0.5rem; flex-wrap: wrap; }
.region-tab {
  background: #2a2410; color: #ddd; border: 1px solid #554422;
  padding: 0.4rem 0.8rem; border-radius: 4px; cursor: pointer;
}
.region-tab.active { background: #886633; color: #fff; border-color: #ffdd99; }

.region-desc { color: #aaa; font-size: 0.85rem; margin-bottom: 0.8rem; }
.empty { text-align: center; color: #888; padding: 1.5rem; }

.building-card {
  background: #1f1a13; border: 1px solid #443322;
  border-radius: 6px; padding: 0.7rem; margin-bottom: 0.5rem;
}
.building-header { display: flex; align-items: center; gap: 0.5rem; }
.building-name { font-weight: bold; color: #ffdd99; flex: 1; }
.building-count { font-size: 0.8rem; color: #aaa; }
.build-btn {
  background: #886633; color: #fff; border: none; padding: 0.4rem 0.9rem;
  border-radius: 4px; cursor: pointer;
}
.build-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.build-btn:hover:not(:disabled) { background: #aa8844; }
.building-desc { font-size: 0.8rem; color: #aaa; margin: 0.3rem 0; }
.building-cost { font-size: 0.8rem; }
.cost-item { color: #ccc; margin-right: 0.6rem; }
.building-power { font-size: 0.8rem; margin: 0.3rem 0; }
.pow-cost { color: #ff8c8c; }
.pow-gen { color: #66ff99; }
.building-effect { font-size: 0.8rem; color: #ccccff; }
</style>
