<!--
  TruepathPanel — 真相之路（Truepath）面板
  外太阳系 5 区域 + AI 末日 / 退休终局
-->
<script setup lang="ts">
import { useGameStore } from '../stores/game'
import { computed, ref } from 'vue'
import type { GrapheneFeedstockId, TruepathRegionId } from '@evozen/game-core'
import { getResourceName } from '../utils/resourceNames'
import PanelHeader from './ui/PanelHeader.vue'
import SegmentedTabs from './ui/SegmentedTabs.vue'
import EmptyState from './ui/EmptyState.vue'
import AllocationControl from './ui/AllocationControl.vue'

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
const grapheneFactory = computed(() => game.getGrapheneFactory())
const grapheneFeedstocks = computed<GrapheneFeedstockId[]>(() =>
  game.state.race['kindling_kindred'] || game.state.race['smoldering']
    ? ['Oil', 'Coal']
    : ['Oil', 'Coal', 'Lumber'],
)
const grapheneAssigned = computed(() => grapheneFeedstocks.value.reduce(
  (sum, resource) => sum + (grapheneFactory.value?.[resource] ?? 0),
  0,
))
const tritonStatus = computed(() => {
  const fob = game.state.space['fob'] as { count?: number; on?: number; active?: number; troops?: number; enemy?: number } | undefined
  const lander = game.state.space['lander'] as { count?: number; on?: number; active?: number } | undefined
  const wreck = game.state.space['crashed_ship'] as { count?: number } | undefined
  return {
    fob,
    lander,
    wreck,
    control: Math.max(0, Math.min(100, wreck?.count ?? 0)),
  }
})

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
function adjustSpaceOn(id: string, delta: number) {
  const structure = game.state.space[id] as { count?: number; on?: number } | undefined
  if (!structure) return
  structure.on = Math.max(0, Math.min(structure.count ?? 0, (structure.on ?? structure.count ?? 0) + delta))
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
          <span v-if="b.buildable !== false && buildingCount(b.id) > 0" class="building-count">
            ×{{ buildingCount(b.id) }}<template v-if="b.power !== 0"> ({{ buildingPowered(b.id) }} 通电)</template>
          </span>
          <button v-if="b.buildable !== false" class="build-btn btn primary sm" :disabled="!canBuild(b.id)" @click="build(b.id)">建造</button>
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
        <div v-if="b.id === 'fob' && tritonStatus.fob" class="triton-status">
          <span>控制度 {{ tritonStatus.control }}/100</span>
          <span>敌军 {{ Math.round(tritonStatus.fob.enemy ?? 0) }}</span>
          <span>已部署 {{ Math.round(tritonStatus.fob.troops ?? 0) }} 人</span>
        </div>
        <div v-if="b.id === 'lander' && tritonStatus.lander" class="triton-controls">
          <span>配置 {{ tritonStatus.lander.on ?? tritonStatus.lander.count ?? 0 }}/{{ tritonStatus.lander.count ?? 0 }}</span>
          <AllocationControl
            :value="tritonStatus.lander.on ?? tritonStatus.lander.count ?? 0"
            :decrement-disabled="(tritonStatus.lander.on ?? tritonStatus.lander.count ?? 0) <= 0"
            :increment-disabled="(tritonStatus.lander.on ?? tritonStatus.lander.count ?? 0) >= (tritonStatus.lander.count ?? 0)"
            decrement-label="减少登陆器运行数"
            increment-label="增加登陆器运行数"
            @decrement="adjustSpaceOn('lander', -1)"
            @increment="adjustSpaceOn('lander', 1)"
          />
        </div>
        <div v-if="b.id === 'crashed_ship'" class="triton-status">
          <span>控制进度 {{ tritonStatus.control }}/100</span>
          <span v-if="tritonStatus.control >= 100">Cipher 已解锁</span>
        </div>
        <div v-if="b.id === 'g_factory' && grapheneFactory" class="graphene-lines">
          <div class="graphene-heading">
            <span>石墨烯原料产线</span>
            <span>{{ grapheneAssigned }}/{{ grapheneFactory.on }}</span>
          </div>
          <div v-for="resource in grapheneFeedstocks" :key="resource" class="graphene-line">
            <span class="graphene-resource">{{ getResourceName(resource) }}</span>
            <AllocationControl
              :value="grapheneFactory[resource]"
              :decrement-disabled="grapheneFactory[resource] <= 0"
              :increment-disabled="grapheneAssigned >= grapheneFactory.on"
              :decrement-label="`减少${getResourceName(resource)}产线`"
              :increment-label="`增加${getResourceName(resource)}产线`"
              @decrement="game.removeGrapheneFeedstock(resource)"
              @increment="game.assignGrapheneFeedstock(resource)"
            />
          </div>
        </div>
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
.triton-status,
.triton-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-top: 8px;
  color: var(--text-secondary);
  font-size: 12px;
}
.triton-status span + span { padding-left: 8px; border-left: 1px solid var(--border-color); }
.graphene-lines {
  margin-top: 10px;
  padding-top: 9px;
  border-top: 1px solid var(--border-color);
}
.graphene-heading,
.graphene-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.graphene-heading {
  margin-bottom: 6px;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
}
.graphene-line + .graphene-line { margin-top: 6px; }
.graphene-resource { font-size: 12px; color: var(--text-primary); }
</style>
