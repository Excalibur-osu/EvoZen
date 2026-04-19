<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'

const game = useGameStore()

const structureLabels: Record<string, string> = {
  satellite: '卫星',
  propellant_depot: '推进剂储备站',
  gps: 'GPS',
  nav_beacon: '导航信标',
  moon_base: '月面基地',
  iridium_mine: '铱矿',
  helium_mine: '氦-3 采集站',
  spaceport: '火星航天港',
  observatory: '月面天文台',
  mars_base: '火星基地',
  red_tower: '火星高塔',
  red_factory: '太空工厂',
}

const highTech = computed(() => game.state.tech['high_tech'] ?? 0)
const spaceLevel = computed(() => game.state.tech['space'] ?? 0)
const spaceExplore = computed(() => game.state.tech['space_explore'] ?? 0)
const luna = computed(() => game.state.tech['luna'] ?? 0)
const mars = computed(() => game.state.tech['mars'] ?? 0)

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
      (action.id === 'red_mission' && spaceLevel.value >= 4)

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

const structures = computed(() => {
  return Object.entries(game.state.space)
    .map(([id, value]) => {
      const item = value as { count?: number; on?: number; support?: number; s_max?: number }
      return {
        id,
        name: structureLabels[id] ?? id,
        count: item.count ?? 0,
        on: item.on ?? 0,
        support: item.support ?? 0,
        sMax: item.s_max ?? 0,
      }
    })
    .filter((item) => item.count > 0 || item.id === 'satellite' || item.id === 'iridium_mine' || item.id === 'helium_mine')
})

function performAction(actionId: string) {
  game.runSpaceAction(actionId)
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

    <section class="registry-card">
      <div class="registry-head">
        <span class="registry-title">已注册的太空结构</span>
        <span class="registry-count">{{ structures.length }}</span>
      </div>
      <div v-if="structures.length === 0" class="empty-state">
        完成发射与月球任务后，这里会开始出现真实的太空结构槽位。
      </div>
      <div v-else class="structure-list">
        <div v-for="item in structures" :key="item.id" class="structure-row">
          <span class="structure-name">{{ item.name }}</span>
          <span class="structure-meta">
            count {{ item.count }}<template v-if="item.on > 0"> / on {{ item.on }}</template><template v-if="item.sMax > 0 || item.support > 0"> / support {{ item.support }} / s_max {{ item.sMax }}</template>
          </span>
        </div>
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
</style>
