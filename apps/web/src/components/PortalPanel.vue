<!--
  PortalPanel — 地狱门面板
  对标 legacy/src/portal.js + portal-tab UI

  显示：要塞威胁/墙体 + 8 区域建筑列表 + 尖塔登顶进度
-->
<script setup lang="ts">
import { useGameStore } from '../stores/game'
import { computed, ref } from 'vue'
import type { PortalRegionId } from '@evozen/game-core'
import { tunePillar, getTunedPillarCount } from '@evozen/game-core'
import PanelHeader from './ui/PanelHeader.vue'
import SegmentedTabs from './ui/SegmentedTabs.vue'
import EmptyState from './ui/EmptyState.vue'
import MetricCard from './ui/MetricCard.vue'
import ProgressBar from './ui/ProgressBar.vue'
import AppIcon from './ui/AppIcon.vue'

const game = useGameStore()

const allRegions: PortalRegionId[] = ['fortress', 'badlands', 'wasteland', 'pit', 'ruins', 'gate', 'lake', 'spire', 'hellpit']
const activeRegion = ref<PortalRegionId>('fortress')

const visibleRegions = computed(() =>
  allRegions.filter((r) => game.isRegionUnlocked(r))
)
const regionTabs = computed(() => visibleRegions.value.map((r) => ({ id: r, label: regionLabel(r) })))

const buildings = computed(() => {
  return game.getPortalBuildingsByRegion(activeRegion.value)
    .filter((b) => {
      // 简单可见性：检查 tech reqs（trait 检查在 isVisible 里完成）
      for (const [tech, lvl] of Object.entries(b.reqs)) {
        if ((game.state.tech[tech] ?? 0) < lvl) return false
      }
      // notTrait 检查
      if (b.notTrait) for (const t of b.notTrait) if (game.state.race[t]) return false
      if (b.trait) for (const t of b.trait) if (!game.state.race[t]) return false
      return true
    })
})

const fortress = computed(() => game.getFortressState())

function buildingCount(id: string) {
  const portal = game.state.portal as Record<string, Record<string, number>>
  return portal[id]?.count ?? 0
}

function buildingPowered(id: string) {
  const portal = game.state.portal as Record<string, Record<string, number>>
  return portal[id]?.on ?? 0
}

function buildCost(id: string) {
  return game.getPortalBuildCost(id) ?? {}
}

function canAfford(id: string) {
  return game.canBuildPortalStructure(id)
}

function build(id: string) {
  game.buildPortalStructure(id)
}

function regionLabel(r: PortalRegionId) {
  const def = game.PORTAL_REGIONS[r]
  return def ? `${def.name}` : r
}

const spireInfo = computed(() => game.spireInfo())
const spireLevel = computed(() => spireInfo.value.level)

function tryAscendSpire() {
  const result = game.attemptSpireFloor()
  if (result.rewards) {
    const rewardSummary = Object.entries(result.rewards).map(([r, a]) => `${r} +${a}`).join(', ')
    console.log('Spire 奖励:', rewardSummary)
  }
}

// Ancient Pillar 调谐
const pillarCount = computed(() => {
  const portal = game.state.portal as Record<string, Record<string, number>>
  return portal['ancient_pillars']?.['count'] ?? 0
})
const tunedPillars = computed(() => getTunedPillarCount(game.state))
const harmony = computed(() => (game.state.prestige as Record<string, { count?: number }>)?.['Harmony']?.count ?? 0)
function doTunePillar() {
  if (tunePillar(game.state)) {
    game.state.portal = { ...game.state.portal } as typeof game.state.portal
  }
}

function fmtNum(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(2) + 'K'
  return Math.round(n).toString()
}
</script>

<template>
  <div class="portal-panel">
    <PanelHeader icon="portal" title="地狱门" subtitle="来自地狱深处的传送门正在开启，准备好对抗恶魔的入侵。" />

    <!-- 要塞威胁与墙体状态 -->
    <div class="fortress-status" v-if="game.isPortalUnlocked">
      <MetricCard label="威胁等级" :value="Math.floor(fortress?.threat ?? 0)" tone="danger" />
      <MetricCard label="城墙完整度" :value="`${Math.floor(fortress?.walls ?? 100)} / ${fortress?.max_walls ?? 100}`" />
      <MetricCard label="巡逻队" :value="`${fortress?.patrols ?? 0} x ${fortress?.patrol_size ?? 10}`" />
    </div>

    <!-- 区域切换 Tab -->
    <SegmentedTabs :items="regionTabs" :active="activeRegion" @select="activeRegion = $event" />

    <!-- 远古石柱调谐 -->
    <section v-if="activeRegion === 'ruins' && pillarCount > 0" class="special-section">
      <h3 class="section-title">
        <AppIcon name="columns" :size="14" />
        远古石柱调谐
      </h3>
      <div class="pillar-info">
        <span>已调谐：{{ tunedPillars }} / {{ pillarCount }}</span>
        <span>和谐：{{ harmony.toFixed(2) }}</span>
        <button class="tune-btn btn primary sm" :disabled="tunedPillars >= pillarCount || harmony < 1" @click="doTunePillar">
          <AppIcon name="sparkles" :size="14" />
          调谐一根（消耗 1 和谐）
        </button>
      </div>
      <p class="pillar-desc">每调谐一根柱子提供 +5% 全球产出。</p>
    </section>

    <!-- 尖塔登顶 -->
    <section v-if="activeRegion === 'spire'" class="special-section">
      <div class="spire-progress">
        <span class="spire-label">尖塔层数</span>
        <span class="spire-value">{{ spireLevel }} / 100</span>
      </div>
      <ProgressBar :value="spireLevel" tone="danger" size="sm" />
      <div class="spire-battle">
        <div class="battle-stat">
          <span class="bs-label">下一层 ({{ spireInfo.nextFloor }})</span>
          <span class="bs-value danger">敌方战力 {{ fmtNum(spireInfo.nextEnemyRating) }}</span>
        </div>
        <div class="battle-stat">
          <span class="bs-label">你的机甲</span>
          <span class="bs-value">战力 {{ fmtNum(spireInfo.playerRating) }}</span>
        </div>
        <div class="battle-stat">
          <span class="bs-label">入场费</span>
          <span class="bs-value">{{ fmtNum(spireInfo.cost) }} Money</span>
        </div>
        <button
          class="ascend-btn btn primary"
          :disabled="spireLevel >= 100"
          @click="tryAscendSpire"
        >
          <AppIcon :name="spireLevel >= 100 ? 'shieldCheck' : 'flame'" :size="15" />
          {{ spireLevel >= 100 ? '已征服' : '挑战下一层' }}
        </button>
      </div>
    </section>

    <!-- 建筑列表 -->
    <EmptyState v-if="buildings.length === 0" text="此区域当前无可用建筑（检查科技或种族特质）。" icon="lock" />

    <div v-for="b in buildings" :key="b.id" class="building-card card">
      <div class="building-header">
        <div class="building-info">
          <span class="building-name">{{ b.name }}</span>
          <span class="building-count" v-if="buildingCount(b.id) > 0">
            × {{ buildingCount(b.id) }}
            <span v-if="b.power > 0" class="power-on">（{{ buildingPowered(b.id) }} 已通电）</span>
          </span>
        </div>
        <button
          class="build-btn btn primary sm"
          :disabled="!canAfford(b.id)"
          @click="build(b.id)"
        >
          <AppIcon name="hammer" :size="14" />
          建造
        </button>
      </div>

      <p class="building-desc">{{ b.desc }}</p>

      <div class="building-cost">
        <span class="cost-label">成本：</span>
        <span v-for="(amt, res) in buildCost(b.id)" :key="res" class="cost-item">
          {{ res }} ×{{ fmtNum(amt as number) }}
        </span>
      </div>

      <div v-if="b.power !== 0" class="building-power">
        <span :class="b.power > 0 ? 'power-cost' : 'power-gen'">
          {{ b.power > 0 ? `耗电 ${b.power} MW` : `发电 ${-b.power} MW` }}
        </span>
      </div>

      <div class="building-effect">
        <span class="effect-text">{{ b.effectDesc }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.portal-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.fortress-status {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 8px;
}

.special-section {
  padding: 10px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
}
.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-primary);
  margin: 0 0 6px;
}
.pillar-info { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 12px; color: var(--text-secondary); }
.tune-btn { margin-left: auto; }
.pillar-desc { font-size: 12px; color: var(--text-secondary); margin-top: 6px; }

.spire-progress {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}
.spire-label { font-size: 12px; color: var(--text-secondary); }
.spire-value { font-size: 15px; font-weight: 700; color: var(--accent); }
.ascend-btn {
  margin-top: 8px;
  width: 100%;
}
.spire-battle { margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border-color); }
.battle-stat { display: flex; justify-content: space-between; padding: 0.2rem 0; font-size: 0.85rem; }
.bs-label { color: var(--text-secondary); }
.bs-value { color: var(--text-primary); font-weight: 700; }
.bs-value.danger { color: var(--danger); }

.building-card {
  padding: 10px;
}
.building-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.3rem;
}
.building-name { font-weight: 700; color: var(--text-primary); }
.building-count { font-size: 0.85rem; color: var(--text-secondary); margin-left: 0.5rem; }
.power-on { color: var(--info); }
.building-desc { font-size: 0.8rem; color: var(--text-secondary); margin: 0.3rem 0; }
.building-cost, .building-power, .building-effect {
  font-size: 0.8rem;
  margin-top: 0.2rem;
}
.cost-label { color: var(--text-muted); }
.cost-item { margin-right: 0.6rem; color: var(--text-primary); }
.power-cost { color: var(--danger); }
.power-gen { color: var(--success); }
.effect-text { color: var(--accent); }
</style>
