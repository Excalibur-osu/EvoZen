<!--
  GovernorPanel — 总督面板
  对标 legacy/src/governor.js drawnGovernOffice / appointGovernor

  显示候选人 → 任命 → 任务槽配置 → 解雇
-->
<script setup lang="ts">
import { useGameStore } from '../stores/game'
import { computed, ref } from 'vue'
import type { GovernorCandidate, GovernorTaskId } from '@evozen/game-core'

const game = useGameStore()

const candidates = ref<GovernorCandidate[]>([])

const currentGovernor = computed(() => {
  const gov = game.state.race['governor'] as { g?: GovernorCandidate; tasks?: Record<string, GovernorTaskId> } | undefined
  return gov?.g ?? null
})

const taskSlotCount = computed(() => game.governorTaskSlotCount())

const slots = computed(() => {
  const count = taskSlotCount.value
  return Array.from({ length: count }, (_, i) => i as 0 | 1 | 2 | 3 | 4)
})

function refreshCandidates() {
  candidates.value = game.generateGovernorCandidates(10)
}

function appoint(c: GovernorCandidate) {
  game.appointGovernor(c)
  candidates.value = []
}

function fire() {
  game.fireGovernor()
  refreshCandidates()
}

function getTaskForSlot(slot: 0 | 1 | 2 | 3 | 4): GovernorTaskId {
  const gov = game.state.race['governor'] as { tasks?: Record<string, GovernorTaskId> } | undefined
  return (gov?.tasks?.[`t${slot}`] ?? 'none') as GovernorTaskId
}

function setSlotTask(slot: 0 | 1 | 2 | 3 | 4, task: GovernorTaskId) {
  game.setGovernorTask(slot, task)
}

const availableTasks = computed<GovernorTaskId[]>(() => {
  const all: GovernorTaskId[] = ['none','tax','storage','bal_storage','assemble','clone','merc','spy','spyop','slave','sacrifice','horseshoe','mech','replicate']
  return all.filter((t) => {
    const def = game.GOVERNOR_TASKS[t]
    return def && def.isAvailable(game.state)
  })
})

function backgroundName(bg: string): string {
  return (game.GOVERNOR_BACKGROUNDS as Record<string, { name: string }>)[bg]?.name ?? bg
}

function traitsList(bg: string): string[] {
  const def = (game.GOVERNOR_BACKGROUNDS as Record<string, { traits: Record<string, number> }>)[bg]
  return def ? Object.keys(def.traits) : []
}

function taskName(t: GovernorTaskId): string {
  return game.GOVERNOR_TASKS[t]?.name ?? t
}
</script>

<template>
  <div class="governor-panel">
    <div class="title-section">
      <h2 class="title">👔 总督</h2>
      <p class="subtitle">任命一位总督，让他自动管理城市事务。</p>
    </div>

    <!-- 已任命：显示当前总督 + 任务槽 -->
    <div v-if="currentGovernor" class="active-governor">
      <div class="gov-card">
        <div class="gov-info">
          <span class="gov-title">{{ currentGovernor.t }} {{ currentGovernor.n }}</span>
          <span class="gov-bg">[{{ backgroundName(currentGovernor.bg) }}]</span>
        </div>
        <button class="fire-btn" @click="fire">解雇</button>
      </div>
      <div class="gov-traits">
        <span class="trait-label">特长：</span>
        <span v-for="t in traitsList(currentGovernor.bg)" :key="t" class="trait-chip">
          {{ t }}
        </span>
      </div>

      <div class="task-slots">
        <h3 class="section-title">任务槽 ({{ taskSlotCount }})</h3>
        <div v-for="slot in slots" :key="slot" class="task-slot">
          <span class="slot-label">槽 {{ slot + 1 }}</span>
          <select
            class="slot-select"
            :value="getTaskForSlot(slot)"
            @change="setSlotTask(slot, ($event.target as HTMLSelectElement).value as GovernorTaskId)"
          >
            <option v-for="t in availableTasks" :key="t" :value="t">{{ taskName(t) }}</option>
          </select>
        </div>
      </div>
    </div>

    <!-- 未任命：显示候选人 -->
    <div v-else class="candidates-section">
      <div class="header-row">
        <h3 class="section-title">候选人</h3>
        <button class="refresh-btn" @click="refreshCandidates">
          {{ candidates.length === 0 ? '生成候选人' : '重新生成' }}
        </button>
      </div>

      <div v-if="candidates.length === 0" class="empty-hint">
        <span>点击"生成候选人"开始招募。</span>
      </div>

      <div v-for="(c, i) in candidates" :key="i" class="candidate-card">
        <div class="candidate-info">
          <span class="cand-title">{{ c.t }} {{ c.n }}</span>
          <span class="cand-bg">[{{ backgroundName(c.bg) }}]</span>
        </div>
        <div class="candidate-traits">
          <span v-for="t in traitsList(c.bg)" :key="t" class="trait-chip">{{ t }}</span>
        </div>
        <button class="appoint-btn" @click="appoint(c)">任命</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.governor-panel { padding: 1rem; color: #e0e0e0; }
.title-section { margin-bottom: 1rem; }
.title { font-size: 1.3rem; color: #ffd24c; margin: 0 0 0.3rem; }
.subtitle { font-size: 0.85rem; color: #aaa; }

.active-governor {
  background: rgba(255, 210, 76, 0.05);
  border: 1px solid #665533;
  border-radius: 6px;
  padding: 1rem;
}
.gov-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}
.gov-info { font-size: 1rem; }
.gov-title { font-weight: bold; color: #ffd24c; }
.gov-bg { color: #aaa; margin-left: 0.5rem; }
.fire-btn {
  background: #883333;
  color: #fff;
  border: none;
  padding: 0.4rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}
.gov-traits { margin: 0.5rem 0; }
.trait-label { color: #aaa; font-size: 0.85rem; }
.trait-chip {
  display: inline-block;
  background: #443322;
  color: #ffd24c;
  padding: 0.15rem 0.6rem;
  border-radius: 12px;
  font-size: 0.75rem;
  margin-right: 0.3rem;
}

.task-slots {
  margin-top: 1rem;
  border-top: 1px solid #443322;
  padding-top: 0.8rem;
}
.section-title { font-size: 1rem; color: #ffd24c; margin: 0 0 0.5rem; }
.task-slot { display: flex; align-items: center; margin-bottom: 0.4rem; }
.slot-label { width: 60px; color: #aaa; font-size: 0.85rem; }
.slot-select {
  flex: 1;
  background: #2a2010;
  color: #ddd;
  border: 1px solid #443322;
  padding: 0.3rem 0.6rem;
  border-radius: 4px;
}

.candidates-section { }
.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}
.refresh-btn {
  background: #885511;
  color: #fff;
  border: none;
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  cursor: pointer;
}
.empty-hint { color: #888; padding: 1rem; text-align: center; }

.candidate-card {
  background: #1f1810;
  border: 1px solid #443322;
  border-radius: 6px;
  padding: 0.6rem 0.8rem;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.candidate-info { flex: 1; }
.cand-title { font-weight: bold; color: #ffd24c; }
.cand-bg { color: #aaa; margin-left: 0.5rem; font-size: 0.85rem; }
.candidate-traits { flex: 1; }
.appoint-btn {
  background: #557733;
  color: #fff;
  border: none;
  padding: 0.4rem 1rem;
  border-radius: 4px;
  cursor: pointer;
}
.appoint-btn:hover { background: #669944; }
</style>
