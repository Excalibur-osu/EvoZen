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

const game = useGameStore()

const allRegions: PortalRegionId[] = ['fortress', 'badlands', 'wasteland', 'pit', 'ruins', 'gate', 'lake', 'spire', 'hellpit']
const activeRegion = ref<PortalRegionId>('fortress')

const visibleRegions = computed(() =>
  allRegions.filter((r) => game.isRegionUnlocked(r))
)

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
    <div class="title-section">
      <h2 class="title">🔥 地狱门</h2>
      <p class="subtitle">来自地狱深处的传送门正在开启，准备好对抗恶魔的入侵。</p>
    </div>

    <!-- 要塞威胁与墙体状态 -->
    <div class="fortress-status" v-if="game.isPortalUnlocked">
      <div class="stat-card">
        <span class="stat-label">威胁等级</span>
        <span class="stat-value danger">{{ Math.floor(fortress?.threat ?? 0) }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">城墙完整度</span>
        <span class="stat-value">{{ Math.floor(fortress?.walls ?? 100) }} / {{ fortress?.max_walls ?? 100 }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">巡逻队</span>
        <span class="stat-value">{{ fortress?.patrols ?? 0 }} × {{ fortress?.patrol_size ?? 10 }}</span>
      </div>
    </div>

    <!-- 区域切换 Tab -->
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

    <!-- 远古石柱调谐 -->
    <div v-if="activeRegion === 'ruins' && pillarCount > 0" class="pillar-section">
      <h3 class="pillar-title">🏛️ 远古石柱调谐</h3>
      <div class="pillar-info">
        <span>已调谐：{{ tunedPillars }} / {{ pillarCount }}</span>
        <span>Harmony：{{ harmony.toFixed(2) }}</span>
        <button class="tune-btn" :disabled="tunedPillars >= pillarCount || harmony < 1" @click="doTunePillar">
          调谐一根 (消耗 1 Harmony)
        </button>
      </div>
      <p class="pillar-desc">每调谐一根柱子提供 +5% 全球产出。</p>
    </div>

    <!-- 尖塔登顶 -->
    <div v-if="activeRegion === 'spire'" class="spire-section">
      <div class="spire-progress">
        <span class="spire-label">尖塔层数：</span>
        <span class="spire-value">{{ spireLevel }} / 100</span>
      </div>
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
          class="ascend-btn"
          :disabled="spireLevel >= 100"
          @click="tryAscendSpire"
        >
          {{ spireLevel >= 100 ? '已征服' : '挑战下一层' }}
        </button>
      </div>
    </div>

    <!-- 建筑列表 -->
    <div v-if="buildings.length === 0" class="locked-region">
      <span>🔒 此区域当前无可用建筑（检查科技或种族特质）</span>
    </div>

    <div v-for="b in buildings" :key="b.id" class="building-card">
      <div class="building-header">
        <div class="building-info">
          <span class="building-name">{{ b.name }}</span>
          <span class="building-count" v-if="buildingCount(b.id) > 0">
            × {{ buildingCount(b.id) }}
            <span v-if="b.power > 0" class="power-on">（{{ buildingPowered(b.id) }} 已通电）</span>
          </span>
        </div>
        <button
          class="build-btn"
          :disabled="!canAfford(b.id)"
          @click="build(b.id)"
        >
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
  padding: 1rem;
  color: #e0e0e0;
}
.title-section { margin-bottom: 1rem; }
.title { font-size: 1.3rem; color: #ff6464; margin: 0 0 0.3rem; }
.subtitle { font-size: 0.85rem; color: #aaa; }

.fortress-status {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}
.stat-card {
  background: rgba(255, 100, 100, 0.1);
  border: 1px solid #663030;
  border-radius: 6px;
  padding: 0.6rem 1rem;
  flex: 1;
  min-width: 140px;
}
.stat-label { display: block; font-size: 0.75rem; color: #aaa; }
.stat-value { display: block; font-size: 1.2rem; font-weight: bold; color: #ffaa55; }
.stat-value.danger { color: #ff5555; }

.region-tabs {
  display: flex;
  gap: 0.3rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}
.region-tab {
  background: #2a1818;
  color: #ddd;
  border: 1px solid #4a2828;
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
}
.region-tab.active {
  background: #663030;
  color: #fff;
  border-color: #ff6464;
}

.pillar-section {
  background: rgba(255, 200, 100, 0.06);
  border: 1px solid #886633;
  padding: 0.8rem;
  border-radius: 6px;
  margin-bottom: 1rem;
}
.pillar-title { font-size: 1rem; color: #ffd24c; margin: 0 0 0.4rem; }
.pillar-info { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; font-size: 0.85rem; }
.pillar-desc { font-size: 0.8rem; color: #aaa; margin-top: 0.4rem; }
.tune-btn { background: #886633; color: #fff; border: none; padding: 0.3rem 0.8rem; border-radius: 4px; cursor: pointer; margin-left: auto; }
.tune-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.tune-btn:hover:not(:disabled) { background: #aa8844; }

.spire-section {
  background: rgba(150, 100, 220, 0.1);
  border: 1px solid #553388;
  padding: 0.8rem;
  border-radius: 6px;
  margin-bottom: 1rem;
}
.spire-progress { display: flex; align-items: center; gap: 0.8rem; }
.spire-label { font-size: 0.9rem; }
.spire-value { font-size: 1.1rem; font-weight: bold; color: #cc99ff; }
.ascend-btn {
  background: #553388;
  color: #fff;
  border: none;
  padding: 0.5rem 1.2rem;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 0.6rem;
  width: 100%;
}
.ascend-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.ascend-btn:hover:not(:disabled) { background: #7733aa; }
.spire-battle { margin-top: 0.6rem; padding-top: 0.5rem; border-top: 1px solid #443366; }
.battle-stat { display: flex; justify-content: space-between; padding: 0.2rem 0; font-size: 0.85rem; }
.bs-label { color: #aaa; }
.bs-value { color: #cc99ff; font-weight: bold; }
.bs-value.danger { color: #ff7777; }

.locked-region {
  text-align: center;
  color: #888;
  padding: 2rem;
  font-style: italic;
}

.building-card {
  background: #1a1010;
  border: 1px solid #3a2020;
  border-radius: 6px;
  padding: 0.8rem;
  margin-bottom: 0.6rem;
}
.building-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.3rem;
}
.building-name { font-weight: bold; color: #ffaa55; }
.building-count { font-size: 0.85rem; color: #aaa; margin-left: 0.5rem; }
.power-on { color: #4ecdc4; }
.build-btn {
  background: #884444;
  color: #fff;
  border: none;
  padding: 0.4rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}
.build-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.build-btn:hover:not(:disabled) { background: #aa5555; }
.building-desc { font-size: 0.8rem; color: #aaa; margin: 0.3rem 0; }
.building-cost, .building-power, .building-effect {
  font-size: 0.8rem;
  margin-top: 0.2rem;
}
.cost-item { margin-right: 0.6rem; color: #ccc; }
.power-cost { color: #ff8c8c; }
.power-gen { color: #66ff99; }
.effect-text { color: #99ccff; }
</style>
