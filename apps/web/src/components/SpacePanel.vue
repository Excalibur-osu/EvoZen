<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import { getResourceName } from '../utils/resourceNames'

const game = useGameStore()

const structureLabels: Record<string, string> = {
  satellite: '卫星',
  propellant_depot: '推进剂储备站',
  gps: 'GPS',
  nav_beacon: '导航信标',
  moon_base: '月面基地',
  iridium_mine: '铱矿',
  helium_mine: '氦-3 采集站',
  observatory: '月面天文台',
  spaceport: '火星航天港',
  living_quarters: '火星居住区',
  vr_center: 'VR 中心',
  garage: '火星车库',
  red_mine: '火星矿场',
  fabrication: '火星工坊',
  mars_base: '火星基地',
  red_tower: '火星高塔',
  red_factory: '太空工厂',
  biodome: '生物穹顶',
  exotic_lab: '异星实验室',
  geothermal: '地热发电站',
  swarm_control: '虫群控制站',
  swarm_satellite: '虫群卫星',
  gas_mining: '气体采集站',
  gas_storage: '轨道储存站',
  outpost: '前哨站',
  oil_extractor: '石油提取器',
  space_station: '太空站',
  elerium_ship: '超铀采矿船',
  iridium_ship: '铱矿采矿船',
  iron_ship: '铁矿采矿船',
  elerium_contain: '超铀容器',
  e_reactor: '超铀反应堆',
  world_collider: '世界对撞机',
  world_controller: '世界控制器',
  starport: '星港',
  mining_droid: '采矿无人机',
  habitat: '定居点',
}

const regionLabels: Record<string, string> = {
  spc_home: '近地轨道',
  spc_moon: '月球',
  spc_red: '红色行星',
  spc_hell: '地狱行星',
  spc_sun: '恒星',
  spc_gas: '气态巨行星',
  spc_gas_moon: '气态卫星',
  spc_belt: '小行星带',
  spc_dwarf: '矮行星',
  int_alpha: '半人马座 Alpha',
}

const highTech = computed(() => game.state.tech['high_tech'] ?? 0)
const spaceLevel = computed(() => game.state.tech['space'] ?? 0)
const spaceExplore = computed(() => game.state.tech['space_explore'] ?? 0)
const luna = computed(() => game.state.tech['luna'] ?? 0)
const mars = computed(() => game.state.tech['mars'] ?? 0)
const ftl = computed(() => game.state.tech['ftl'] ?? 0)
const alpha = computed(() => game.state.tech['alpha'] ?? 0)

const actionCards = computed(() => {
  return game.SPACE_ACTIONS.map((action) => {
    const costs = game.getSpaceActionCost(action.id)
    const reqEntries = Object.entries(action.reqs)
    let unlocked = true
    for (const [techId, lvl] of reqEntries) {
      if ((game.state.tech[techId] ?? 0) < lvl) {
        unlocked = false
        break
      }
    }

    const completed =
      (action.id === 'test_launch' && spaceLevel.value >= 2) ||
      (action.id === 'moon_mission' && spaceLevel.value >= 3) ||
      (action.id === 'red_mission' && spaceLevel.value >= 4) ||
      (action.id === 'hell_mission' && (game.state.tech['hell'] ?? 0) >= 1) ||
      (action.id === 'sun_mission' && (game.state.tech['solar'] ?? 0) >= 1) ||
      (action.id === 'gas_mission' && spaceLevel.value >= 5) ||
      (action.id === 'gas_moon_mission' && spaceLevel.value >= 6) ||
      (action.id === 'belt_mission' && (game.state.tech['asteroid'] ?? 0) >= 1) ||
      (action.id === 'dwarf_mission' && (game.state.tech['dwarf'] ?? 0) >= 1) ||
      (action.id === 'alpha_mission' && (game.state.tech['alpha'] ?? 0) >= 1)

    return {
      ...action,
      costs,
      reqText: reqEntries.map(([techId, lvl]) => `${techId}:${lvl}`).join(' / '),
      unlocked,
      completed,
      runnable: game.canRunSpaceAction(action.id),
    }
  })
})

interface BuildCard {
  id: string
  scope: 'space' | 'interstellar'
  region: string
  name: string
  description: string
  effect: string
  reqText: string
  count: number
  on: number
  support: number
  sMax: number
  costs: Record<string, number>
  techUnlocked: boolean
  spaceReqsOk: boolean
  traitOk: boolean
  canBuild: boolean
}

interface RegionGroup {
  id: string
  name: string
  items: BuildCard[]
}

/**
 * 构造每座建筑的可建造卡片。筛选规则：
 *   - 科技条件全部满足（reqs）才会显示为"可建造"候选；尚未解锁时不进区域卡片列表，
 *     但如果该槽位已 ensureSpaceStructure（state.space[id] 存在），仍作为占位展示。
 */
const regionGroups = computed<RegionGroup[]>(() => {
  const groups: Record<string, RegionGroup> = {}
  const allStructures = [
    ...game.SPACE_STRUCTURES.map((def) => ({ ...def, scope: 'space' as const })),
    ...game.INTERSTELLAR_STRUCTURES.map((def) => ({ ...def, scope: 'interstellar' as const })),
  ]

  for (const def of allStructures) {
    const bucket = def.scope === 'space' ? game.state.space : game.state.interstellar
    const struct = bucket[def.id] as
      | { count?: number; on?: number; support?: number; s_max?: number }
      | undefined

    // 科技前置
    let techUnlocked = true
    for (const [techId, lvl] of Object.entries(def.reqs)) {
      if ((game.state.tech[techId] ?? 0) < lvl) {
        techUnlocked = false
        break
      }
    }
    // 太空前置建筑
    let spaceReqsOk = true
    if (def.spaceReqs) {
      for (const [sid, minCount] of Object.entries(def.spaceReqs)) {
        const s = game.state.space[sid] as { count?: number } | undefined
        if ((s?.count ?? 0) < minCount) {
          spaceReqsOk = false
          break
        }
      }
    }
    // 种族 not_trait
    let traitOk = true
    if (def.notTrait) {
      for (const trait of def.notTrait) {
        if ((game.state.race as Record<string, unknown>)[trait] !== undefined) {
          traitOk = false
          break
        }
      }
    }

    // 未解锁且未注册槽位的建筑直接跳过
    const hasSlot = (struct?.count ?? 0) > 0
    if (!techUnlocked && !hasSlot) continue
    if (!traitOk && !hasSlot) continue

    if (!groups[def.region]) {
      groups[def.region] = {
        id: def.region,
        name: regionLabels[def.region] ?? def.region,
        items: [],
      }
    }

    const reqParts: string[] = []
    for (const [techId, lvl] of Object.entries(def.reqs)) reqParts.push(`${techId}:${lvl}`)
    if (def.spaceReqs) {
      for (const [sid, minCount] of Object.entries(def.spaceReqs)) {
        reqParts.push(`${structureLabels[sid] ?? sid}≥${minCount}`)
      }
    }

    groups[def.region].items.push({
      id: def.id,
      scope: def.scope,
      region: def.region,
      name: structureLabels[def.id] ?? def.name,
      description: def.description,
      effect: def.effect,
      reqText: reqParts.join(' / '),
      count: struct?.count ?? 0,
      on: struct?.on ?? 0,
      support: struct?.support ?? 0,
      sMax: struct?.s_max ?? 0,
      costs: techUnlocked
        ? (def.scope === 'space' ? game.getSpaceBuildCost(def.id) : game.getInterstellarBuildCost(def.id))
        : {},
      techUnlocked,
      spaceReqsOk,
      traitOk,
      canBuild: def.scope === 'space'
        ? game.canBuildSpaceStructure(def.id)
        : game.canBuildInterstellarStructure(def.id),
    })
  }

  const order = ['spc_home', 'spc_moon', 'spc_red', 'spc_hell', 'spc_sun', 'spc_gas', 'spc_gas_moon', 'spc_belt', 'spc_dwarf', 'int_alpha']
  return order.filter((r) => groups[r]).map((r) => groups[r])
})

function performAction(actionId: string) {
  game.runSpaceAction(actionId)
}

function buildStructure(item: BuildCard) {
  if (item.scope === 'space') {
    game.buildSpaceStructure(item.id)
    return
  }
  game.buildInterstellarStructure(item.id)
}

function formatAmount(amount: number): string {
  if (amount >= 10000) return amount.toLocaleString()
  return amount.toString()
}

function resourceName(id: string): string {
  return getResourceName(id)
}
</script>

<template>
  <div class="space-panel">
    <section class="hero-card">
      <div class="eyebrow">Single-Player Parity</div>
      <h2 class="title">太空阶段</h2>
      <p class="subtitle">
        当前阶段不再用科技直接跳过关键节点，优先恢复原版的真实推进动作。你现在需要先完成任务，再进入后续建筑与科技链。
      </p>
      <div class="stats-row">
        <div class="stat">
          <span class="stat-label">高科技</span>
          <span class="stat-value">{{ highTech }}</span>
        </div>
        <div class="stat">
          <span class="stat-label">space</span>
          <span class="stat-value">{{ spaceLevel }}</span>
        </div>
        <div class="stat">
          <span class="stat-label">space_explore</span>
          <span class="stat-value">{{ spaceExplore }}</span>
        </div>
        <div class="stat">
          <span class="stat-label">luna</span>
          <span class="stat-value">{{ luna }}</span>
        </div>
        <div class="stat">
          <span class="stat-label">mars</span>
          <span class="stat-value">{{ mars }}</span>
        </div>
        <div class="stat">
          <span class="stat-label">ftl</span>
          <span class="stat-value">{{ ftl }}</span>
        </div>
        <div class="stat">
          <span class="stat-label">alpha</span>
          <span class="stat-value">{{ alpha }}</span>
        </div>
      </div>
    </section>

    <section class="action-grid">
      <article
        v-for="action in actionCards"
        :key="action.id"
        class="action-card"
        :class="{ completed: action.completed }"
      >
        <div class="action-head">
          <span class="action-title">{{ action.name }}</span>
          <span class="action-state">
            {{ action.completed ? '已完成' : action.unlocked ? '已解锁' : '未解锁' }}
          </span>
        </div>
        <p class="action-desc">{{ action.description }}</p>
        <p class="action-effect">✨ {{ action.effect }}</p>
        <p class="action-req">前置：{{ action.reqText }}</p>
        <div class="cost-row">
          <span v-for="(amount, res) in action.costs" :key="res" class="cost-chip">
            {{ res }} {{ amount.toLocaleString() }}
          </span>
        </div>
        <button
          class="btn primary action-btn"
          :disabled="action.completed || !action.runnable"
          @click="performAction(action.id)"
        >
          {{ action.completed ? '已完成' : action.runnable ? '执行任务' : '条件不足' }}
        </button>
      </article>
    </section>

    <section v-if="regionGroups.length === 0" class="registry-card">
      <div class="empty-state">
        完成发射与月球任务后，这里会开始出现真实的太空结构槽位。
      </div>
    </section>

    <section
      v-for="group in regionGroups"
      :key="group.id"
      class="region-card"
    >
      <div class="region-head">
        <span class="region-title">{{ group.name }}</span>
        <span class="region-count">{{ group.items.length }} 座结构</span>
      </div>
      <div class="build-grid">
        <article
          v-for="item in group.items"
          :key="item.id"
          class="build-card"
          :class="{ locked: !item.techUnlocked, ready: item.canBuild }"
        >
          <div class="build-head">
            <span class="build-title">{{ item.name }}</span>
            <span class="build-meta">
              <template v-if="item.count > 0">已建 {{ item.count }}</template>
              <template v-else>未建造</template>
              <template v-if="item.on > 0"> / on {{ item.on }}</template>
              <template v-if="item.sMax > 0 || item.support > 0"> / support {{ item.support }}/{{ item.sMax }}</template>
            </span>
          </div>
          <p class="build-desc">{{ item.description }}</p>
          <p class="build-effect">✨ {{ item.effect }}</p>
          <p class="build-req">前置：{{ item.reqText || '—' }}</p>
          <div v-if="item.techUnlocked" class="cost-row">
            <span v-for="(amount, res) in item.costs" :key="res" class="cost-chip">
              {{ resourceName(String(res)) }} {{ formatAmount(amount) }}
            </span>
          </div>
          <button
            class="btn primary build-btn"
            :disabled="!item.canBuild"
            @click="buildStructure(item)"
          >
            {{ !item.techUnlocked ? '未解锁' : !item.spaceReqsOk ? '前置不足' : item.canBuild ? '建造一座' : '资源不足' }}
          </button>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.space-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hero-card,
.action-card,
.registry-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
}

.hero-card {
  padding: 18px;
  background:
    radial-gradient(circle at top right, rgba(14, 165, 233, 0.16), transparent 36%),
    linear-gradient(165deg, rgba(11, 18, 32, 0.96), rgba(16, 24, 39, 0.92));
}

.eyebrow {
  margin-bottom: 6px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-secondary);
}

.title {
  margin: 0;
  font-size: 26px;
  font-weight: 800;
  color: var(--text-primary);
}

.subtitle {
  margin: 8px 0 0;
  max-width: 760px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-secondary);
}

.stats-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.stat {
  min-width: 96px;
  padding: 10px 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
}

.stat-label {
  display: block;
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.stat-value {
  display: block;
  margin-top: 4px;
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 12px;
}

.action-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px;
}

.action-card.completed {
  border-color: color-mix(in srgb, var(--accent) 35%, var(--border-color));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 15%, transparent);
}

.action-head,
.registry-head,
.structure-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.action-title,
.registry-title,
.structure-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
}

.action-state,
.registry-count {
  font-size: 11px;
  color: var(--text-accent);
}

.action-desc,
.action-effect,
.action-req,
.empty-state,
.structure-meta {
  font-size: 12px;
  line-height: 1.5;
}

.action-desc,
.action-req,
.empty-state,
.structure-meta {
  color: var(--text-secondary);
}

.action-effect {
  color: var(--text-accent);
}

.cost-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.cost-chip {
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(14, 165, 233, 0.08);
  border: 1px solid rgba(14, 165, 233, 0.18);
  color: #7dd3fc;
  font-size: 11px;
  font-family: var(--font-mono);
}

.action-btn {
  align-self: flex-start;
  margin-top: 4px;
}

.registry-card {
  padding: 14px;
}

.structure-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
}

.region-card {
  padding: 14px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
}

.region-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.region-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.region-count {
  font-size: 11px;
  color: var(--text-muted);
}

.build-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 12px;
}

.build-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 10px;
}

.build-card.locked {
  opacity: 0.55;
}

.build-card.ready {
  border-color: color-mix(in srgb, var(--accent) 35%, var(--border-color));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 15%, transparent);
}

.build-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.build-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
}

.build-meta {
  font-size: 11px;
  color: var(--text-muted);
  font-family: var(--font-mono);
}

.build-desc,
.build-effect,
.build-req {
  font-size: 12px;
  line-height: 1.5;
}

.build-desc,
.build-req {
  color: var(--text-secondary);
}

.build-effect {
  color: var(--text-accent);
}

.build-btn {
  align-self: flex-start;
  margin-top: 4px;
}
</style>
