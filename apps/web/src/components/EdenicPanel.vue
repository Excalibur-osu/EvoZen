<!--
  EdenicPanel — 伊甸园面板
  4 区域 + 神化终局
-->
<script setup lang="ts">
import { useGameStore } from '../stores/game'
import { computed, ref } from 'vue'
import type { EdenicRegionId } from '@evozen/game-core'
import { loadCustomRace, validateCustomRace } from '@evozen/game-core'
import PanelHeader from './ui/PanelHeader.vue'
import SegmentedTabs from './ui/SegmentedTabs.vue'
import EmptyState from './ui/EmptyState.vue'
import { useConfirmDialog } from '../utils/confirm-dialog'

const game = useGameStore()
const { confirm } = useConfirmDialog()
const emit = defineEmits<{ openCustomRace: [] }>()

const regionsAll: EdenicRegionId[] = ['asphodel', 'elysium', 'isle', 'palace']
const activeRegion = ref<EdenicRegionId>('asphodel')

const visibleRegions = computed(() => regionsAll.filter((r) => game.isEdenicRegionUnlocked(r)))
const regionTabs = computed(() => visibleRegions.value.map((r) => ({ id: r, label: regionLabel(r) })))

const buildings = computed(() =>
  game.getEdenicBuildingsByRegion(activeRegion.value).filter((b) => {
    if (b.actionOnly) return false
    for (const [tech, lvl] of Object.entries(b.reqs)) {
      if ((game.state.tech[tech] ?? 0) < lvl) return false
    }
    return true
  }),
)
const palaceLevel = computed(() => game.state.tech['palace'] ?? 0)
const palaceEnergy = computed(() => (game.state.eden['palace'] as { energy?: number } | undefined)?.energy ?? 0)
const savedHybrid = computed(() => loadCustomRace(game.state, true))
const hybridReady = computed(() => {
  const config = savedHybrid.value
  return Boolean(config && validateCustomRace(config, game.state).valid)
})

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
function buildingCountLabel(id: string, cap?: number) {
  const count = buildingCount(id)
  return cap ? `${count}/${cap}` : `×${count}`
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

async function completeApotheosis() {
  if (!game.canReset('apotheosis')) return
  const ok = await confirm({
    title: '确认神灵灌注',
    message: `将以混血种族“${savedHybrid.value?.name ?? ''}”承载神圣能量并结束当前世代。`,
    confirmLabel: '进行神灵灌注',
    tone: 'danger',
  })
  if (ok) game.triggerReset('apotheosis')
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
    <PanelHeader icon="edenic" title="伊甸园" subtitle="飞升至神圣领域，推进终极目标神化。" />

    <EmptyState v-if="!game.isEdenicUnlocked" text="需先飞升以解锁伊甸园。" icon="lock" />

    <template v-else>
      <SegmentedTabs :items="regionTabs" :active="activeRegion" @select="activeRegion = $event" />

      <p class="region-desc">{{ regionDesc(activeRegion) }}</p>

      <div v-if="activeRegion === 'palace' && palaceEnergy > 0" class="palace-energy">
        <span>宫殿灵魂能量</span>
        <strong class="font-mono">{{ fmtNum(palaceEnergy) }}</strong>
      </div>

      <EmptyState v-if="buildings.length === 0" text="此区域当前无可用建筑。" icon="lock" />

      <div v-for="b in buildings" :key="b.id" class="building-card card">
        <div class="building-header">
          <span class="building-name">{{ b.name }}</span>
          <span class="building-count" v-if="buildingCount(b.id) > 0">
            {{ buildingCountLabel(b.id, b.segmentCap) }}<template v-if="b.power !== 0"> ({{ buildingPowered(b.id) }} 通电)</template>
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

      <section v-if="activeRegion === 'palace' && palaceLevel >= 7" class="apotheosis-action">
        <div>
          <h3 class="section-title">神灵灌注</h3>
          <p class="apotheosis-state">混血基因组：{{ hybridReady ? savedHybrid?.name : '未就绪' }}</p>
        </div>
        <div class="apotheosis-controls">
          <button class="btn secondary" @click="emit('openCustomRace')">编辑混血</button>
          <button class="btn danger" :disabled="!game.canReset('apotheosis')" @click="completeApotheosis">进行神灵灌注</button>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.edenic-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.region-desc {
  color: var(--text-secondary);
  font-size: 12px;
  margin: 0 0 2px;
}
.palace-energy,
.apotheosis-action {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-size: 12px;
}
.apotheosis-action { border-top: 1px solid var(--border-color); border-bottom: 0; }
.apotheosis-state { margin: 4px 0 0; color: var(--text-muted); }
.apotheosis-controls { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }

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
