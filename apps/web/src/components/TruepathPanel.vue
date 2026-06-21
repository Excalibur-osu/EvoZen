<!--
  TruepathPanel — 真相之路（Truepath）面板
  外太阳系 5 区域 + AI 末日 / 退休终局
-->
<script setup lang="ts">
import { useGameStore } from '../stores/game'
import { computed, ref } from 'vue'
import type { TruepathRegionId } from '@evozen/game-core'
import PanelHeader from './ui/PanelHeader.vue'
import SegmentedTabs from './ui/SegmentedTabs.vue'
import EmptyState from './ui/EmptyState.vue'

const game = useGameStore()

const regionsAll: TruepathRegionId[] = ['titan', 'enceladus', 'triton', 'kuiper', 'eris']
const activeRegion = ref<TruepathRegionId>('titan')

const visibleRegions = computed(() => regionsAll.filter((r) => game.isTruepathRegionUnlocked(r)))
const regionTabs = computed(() => visibleRegions.value.map((r) => ({ id: r, label: regionLabel(r) })))

const buildings = computed(() =>
  game.getTruepathBuildingsByRegion(activeRegion.value).filter((b) => {
    for (const [tech, lvl] of Object.entries(b.reqs)) {
      if ((game.state.tech[tech] ?? 0) < lvl) return false
    }
    return true
  }),
)

function regionLabel(r: TruepathRegionId): string {
  return game.TRUEPATH_REGIONS[r]?.name ?? r
}
function regionDesc(r: TruepathRegionId): string {
  return game.TRUEPATH_REGIONS[r]?.desc ?? ''
}

function buildingCount(id: string) {
  return (game.state.space as Record<string, { count?: number }>)[id]?.count ?? 0
}
function buildingPowered(id: string) {
  return (game.state.space as Record<string, { on?: number }>)[id]?.on ?? 0
}
function buildCost(id: string) {
  return game.getTruepathBuildCost(id) ?? {}
}
function canBuild(id: string) {
  return game.canBuildTruepath(id)
}
function build(id: string) {
  game.buildTruepathStructure(id)
}

function fmtNum(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(2) + 'K'
  return Math.round(n).toString()
}
</script>

<template>
  <div class="truepath-panel">
    <PanelHeader icon="truepath" title="真相之路" subtitle="外太阳系探索，通往 AI 末日或退休终局的挑战路线。" />

    <EmptyState v-if="!game.isTruepathMode" text="此面板仅在 Truepath 挑战模式下可用。" icon="lock" />

    <template v-else>
      <SegmentedTabs :items="regionTabs" :active="activeRegion" @select="activeRegion = $event" />

      <p class="region-desc">{{ regionDesc(activeRegion) }}</p>

      <EmptyState v-if="buildings.length === 0" text="此区域当前无可用建筑（待解锁科技）。" icon="lock" />

      <div v-for="b in buildings" :key="b.id" class="building-card card">
        <div class="building-header">
          <span class="building-name">{{ b.name }}</span>
          <span class="building-count" v-if="buildingCount(b.id) > 0">
            ×{{ buildingCount(b.id) }} ({{ buildingPowered(b.id) }} 通电)
          </span>
          <button class="build-btn btn primary sm" :disabled="!canBuild(b.id)" @click="build(b.id)">建造</button>
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
.truepath-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.region-desc {
  color: var(--text-secondary);
  font-size: 12px;
  margin: 0 0 2px;
}

.building-card {
  padding: 10px;
  margin-bottom: 0;
}
.building-header { display: flex; align-items: center; gap: 0.5rem; }
.building-name { font-weight: 700; color: var(--text-primary); flex: 1; }
.building-count { font-size: 0.8rem; color: var(--text-secondary); }
.building-desc { font-size: 0.8rem; color: var(--text-secondary); margin: 0.3rem 0; }
.building-cost { font-size: 0.8rem; display: flex; flex-wrap: wrap; gap: 0.35rem 0.6rem; }
.cost-item { color: var(--text-primary); }
.building-power { font-size: 0.8rem; margin: 0.3rem 0; }
.pow-cost { color: var(--danger); }
.pow-gen { color: var(--success); }
.building-effect { font-size: 0.8rem; color: var(--accent); margin-bottom: 0; }
</style>
