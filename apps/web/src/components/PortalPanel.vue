<!--
  PortalPanel — 地狱门面板
  对标 legacy/src/portal.js + portal-tab UI

  显示：要塞威胁/墙体 + 8 区域建筑列表 + 尖塔登顶进度
-->
<script setup lang="ts">
import { useGameStore } from '../stores/game'
import { computed, ref } from 'vue'
import type { PortalRegionId } from '@evozen/game-core'
import { getTunedPillarCount } from '@evozen/game-core'
import PanelHeader from './ui/PanelHeader.vue'
import SegmentedTabs from './ui/SegmentedTabs.vue'
import EmptyState from './ui/EmptyState.vue'
import MetricCard from './ui/MetricCard.vue'
import ProgressBar from './ui/ProgressBar.vue'
import AppIcon from './ui/AppIcon.vue'
import StepperButton from './ui/StepperButton.vue'

const game = useGameStore()

const allRegions: PortalRegionId[] = ['fortress', 'badlands', 'wasteland', 'pit', 'ruins', 'gate', 'lake', 'spire', 'hellpit']
const activeRegion = ref<PortalRegionId>('fortress')

const visibleRegions = computed(() =>
  allRegions.filter((r) => game.isRegionUnlocked(r))
)
const regionTabs = computed(() => visibleRegions.value.map((r) => ({ id: r, label: regionLabel(r) })))

const buildings = computed(() => {
  return game.getPortalBuildingsByRegion(activeRegion.value)
    .filter((building) => game.isPortalBuildingVisible(building))
})

const fortress = computed(() => game.getFortressState())
const availableSoldiers = computed(() => game.state.civic.garrison?.workers ?? 0)
const patrolCapacity = computed(() => Math.floor(
  Number(fortress.value?.garrison ?? 0) / Math.max(1, Number(fortress.value?.patrol_size ?? 1)),
))

function adjustFortressGarrison(delta: number) {
  game.setFortressGarrison(Number(fortress.value?.garrison ?? 0) + delta)
}

function adjustPatrols(delta: number) {
  game.setFortressPatrols(Number(fortress.value?.patrols ?? 0) + delta)
}

function adjustPatrolSize(delta: number) {
  game.setFortressPatrolSize(Number(fortress.value?.patrol_size ?? 1) + delta)
}

function buildingCount(id: string) {
  if (id === 'ancient_pillars') return getTunedPillarCount(game.state)
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

const pillarCount = computed(() => getTunedPillarCount(game.state))
const currentPillarRank = computed(() => game.state.pillars[game.state.race.species] ?? 0)

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
      <MetricCard label="昨日击杀" :value="Math.floor(fortress?.last_kills ?? 0)" />
      <MetricCard label="昨日宝石" :value="Math.floor(fortress?.last_gems ?? 0)" tone="accent" />
    </div>

    <div v-if="game.isPortalUnlocked && activeRegion === 'fortress'" class="fortress-controls">
      <div class="fortress-control-row">
        <span class="control-label">要塞驻军</span>
        <span class="control-value">{{ fortress?.garrison ?? 0 }} / {{ availableSoldiers }}</span>
        <div class="control-actions">
          <StepperButton label="−" title="撤回一名驻军" :disabled="Number(fortress?.garrison ?? 0) <= Number(fortress?.patrols ?? 0) * Number(fortress?.patrol_size ?? 1)" @click="adjustFortressGarrison(-1)" />
          <StepperButton label="+" title="派驻一名士兵" :disabled="Number(fortress?.garrison ?? 0) >= availableSoldiers" @click="adjustFortressGarrison(1)" />
        </div>
      </div>
      <div class="fortress-control-row">
        <span class="control-label">巡逻队数量</span>
        <span class="control-value">{{ fortress?.patrols ?? 0 }} / {{ patrolCapacity }}</span>
        <div class="control-actions">
          <StepperButton label="−" title="减少一支巡逻队" :disabled="Number(fortress?.patrols ?? 0) <= 0" @click="adjustPatrols(-1)" />
          <StepperButton label="+" title="增加一支巡逻队" :disabled="Number(fortress?.patrols ?? 0) >= patrolCapacity" @click="adjustPatrols(1)" />
        </div>
      </div>
      <div class="fortress-control-row">
        <span class="control-label">每队人数</span>
        <span class="control-value">{{ fortress?.patrol_size ?? 1 }}</span>
        <div class="control-actions">
          <StepperButton label="−" title="每队减少一人" :disabled="Number(fortress?.patrol_size ?? 1) <= 1" @click="adjustPatrolSize(-1)" />
          <StepperButton label="+" title="每队增加一人" :disabled="Number(fortress?.patrol_size ?? 1) >= Number(fortress?.garrison ?? 0)" @click="adjustPatrolSize(1)" />
        </div>
      </div>
    </div>

    <!-- 区域切换 Tab -->
    <SegmentedTabs :items="regionTabs" :active="activeRegion" @select="activeRegion = $event" />

    <!-- 远古石柱记录 -->
    <section v-if="activeRegion === 'ruins' && pillarCount > 0" class="special-section">
      <h3 class="section-title">
        <AppIcon name="columns" :size="14" />
        远古石柱
      </h3>
      <div class="pillar-info">
        <span>已完成物种：{{ pillarCount }}</span>
        <span>当前物种等级：{{ currentPillarRank || '未完成' }}</span>
      </div>
      <p class="pillar-desc">每个已完成物种提供 +1% 全局产出；当前物种的石柱总计提供 +4%。</p>
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

.fortress-controls {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border-block: 1px solid var(--border-color);
}

.fortress-control-row {
  display: grid;
  grid-template-columns: minmax(76px, 1fr) auto auto;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 6px 10px;
}

.fortress-control-row + .fortress-control-row {
  border-left: 1px solid var(--border-color);
}

.control-label {
  color: var(--text-secondary);
  font-size: 12px;
}

.control-value {
  min-width: 52px;
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 12px;
  text-align: right;
}

.control-actions {
  display: flex;
  gap: 4px;
}

@media (max-width: 760px) {
  .fortress-controls {
    grid-template-columns: 1fr;
  }

  .fortress-control-row + .fortress-control-row {
    border-top: 1px solid var(--border-color);
    border-left: 0;
  }
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
