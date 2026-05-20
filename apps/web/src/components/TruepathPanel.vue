<!--
  TruepathPanel — 真相之路（Truepath）面板
  外太阳系 5 区域 + AI 末日 / 退休终局
-->
<script setup lang="ts">
import { useGameStore } from '../stores/game'
import { computed, ref } from 'vue'
import type { TruepathRegionId } from '@evozen/game-core'

const game = useGameStore()

const regionsAll: TruepathRegionId[] = ['titan', 'enceladus', 'triton', 'kuiper', 'eris']
const activeRegion = ref<TruepathRegionId>('titan')

const visibleRegions = computed(() => regionsAll.filter((r) => game.isTruepathRegionUnlocked(r)))

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
    <div class="title-section">
      <h2 class="title">🛸 真相之路</h2>
      <p class="subtitle">外太阳系探索 — 通往 AI 末日或退休终局的挑战路线。</p>
    </div>

    <div v-if="!game.isTruepathMode" class="locked">
      <span>🔒 此面板仅在 Truepath 挑战模式下可用。</span>
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
        <span>🔒 此区域当前无可用建筑（待解锁科技）</span>
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
.truepath-panel { padding: 1rem; color: #e0e0e0; }
.title-section { margin-bottom: 1rem; }
.title { font-size: 1.3rem; color: #66bbff; margin: 0 0 0.3rem; }
.subtitle { font-size: 0.85rem; color: #aaa; }
.locked { text-align: center; color: #888; padding: 2rem; font-style: italic; }

.region-tabs {
  display: flex; gap: 0.3rem; margin-bottom: 0.5rem; flex-wrap: wrap;
}
.region-tab {
  background: #1a2030; color: #ddd; border: 1px solid #2a3a55;
  padding: 0.4rem 0.8rem; border-radius: 4px; cursor: pointer;
}
.region-tab.active { background: #3a5588; color: #fff; border-color: #66bbff; }

.region-desc { color: #aaa; font-size: 0.85rem; margin-bottom: 0.8rem; }

.empty { text-align: center; color: #888; padding: 1.5rem; }

.building-card {
  background: #131a25; border: 1px solid #2a3548;
  border-radius: 6px; padding: 0.7rem; margin-bottom: 0.5rem;
}
.building-header { display: flex; align-items: center; gap: 0.5rem; }
.building-name { font-weight: bold; color: #66bbff; flex: 1; }
.building-count { font-size: 0.8rem; color: #aaa; }
.build-btn {
  background: #3a5588; color: #fff; border: none; padding: 0.4rem 0.9rem;
  border-radius: 4px; cursor: pointer;
}
.build-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.build-btn:hover:not(:disabled) { background: #4477aa; }
.building-desc { font-size: 0.8rem; color: #aaa; margin: 0.3rem 0; }
.building-cost { font-size: 0.8rem; }
.cost-item { color: #ccc; margin-right: 0.6rem; }
.building-power { font-size: 0.8rem; margin: 0.3rem 0; }
.pow-cost { color: #ff8c8c; }
.pow-gen { color: #66ff99; }
.building-effect { font-size: 0.8rem; color: #99ccff; }
</style>
