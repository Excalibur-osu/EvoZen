<!--
  WomlingPanel — 外星矮人管理面板
-->
<script setup lang="ts">
import { useGameStore } from '../stores/game'
import { computed } from 'vue'

const game = useGameStore()

const unlocked = computed(() => game.canUseWomling())
const w = computed(() => game.getWomling())
const cap = computed(() => game.getWomlingPopCap())

const totalAssigned = computed(() => {
  const j = w.value.jobs
  return j.farmer + j.miner + j.lab + j.soldier
})

const unassigned = computed(() => Math.floor(w.value.population) - totalAssigned.value)

const jobLabels: Record<'farmer' | 'miner' | 'lab' | 'soldier', string> = {
  farmer: '农夫', miner: '矿工', lab: '学者', soldier: '士兵',
}
const jobs: Array<'farmer' | 'miner' | 'lab' | 'soldier'> = ['farmer', 'miner', 'lab', 'soldier']

function adjust(job: typeof jobs[number], delta: number) {
  game.assignWomling(job, delta)
}

function discover() {
  game.discoverWomling()
}
</script>

<template>
  <div class="womling-panel">
    <h2 class="title">🧟 Womling 外星矮人</h2>
    <p class="subtitle">在厄里斯发现的外星种族 — 雇佣他们做工。</p>

    <div v-if="!unlocked" class="locked">
      <p>🔒 尚未与 Womling 接触。需在 Eris 远征中达到接触阶段。</p>
      <button class="discover-btn" @click="discover">（调试）模拟接触</button>
    </div>

    <template v-else>
      <div class="stats-row">
        <div class="stat-card">
          <span>人口</span>
          <strong>{{ Math.floor(w.population) }} / {{ cap }}</strong>
        </div>
        <div class="stat-card">
          <span>士气</span>
          <strong>{{ Math.floor(w.morale) }}</strong>
        </div>
        <div class="stat-card">
          <span>闲置</span>
          <strong>{{ unassigned }}</strong>
        </div>
      </div>

      <h3 class="section-title">岗位分配</h3>
      <div v-for="job in jobs" :key="job" class="job-row">
        <span class="job-label">{{ jobLabels[job] }}</span>
        <button class="job-btn" @click="adjust(job, -1)">−</button>
        <span class="job-count">{{ w.jobs[job] }}</span>
        <button class="job-btn" @click="adjust(job, 1)">+</button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.womling-panel { padding: 1rem; color: #e0e0e0; }
.title { font-size: 1.3rem; color: #99ff99; margin: 0 0 0.3rem; }
.subtitle { font-size: 0.85rem; color: #aaa; margin-bottom: 1rem; }
.locked { text-align: center; padding: 2rem; color: #888; }
.discover-btn { background: #557755; color: #fff; border: none; padding: 0.4rem 1rem; border-radius: 4px; cursor: pointer; margin-top: 0.6rem; }

.stats-row { display: flex; gap: 0.6rem; margin-bottom: 1rem; flex-wrap: wrap; }
.stat-card { background: rgba(153,255,153,0.06); border: 1px solid #557755; padding: 0.5rem 0.8rem; border-radius: 4px; flex: 1; min-width: 100px; display: flex; flex-direction: column; }
.stat-card span { font-size: 0.75rem; color: #aaa; }
.stat-card strong { font-size: 1.1rem; color: #99ff99; }

.section-title { font-size: 1rem; color: #99ff99; margin: 0.8rem 0 0.5rem; }
.job-row { display: flex; align-items: center; gap: 0.5rem; padding: 0.3rem 0; }
.job-label { flex: 1; font-size: 0.9rem; }
.job-btn { width: 28px; height: 28px; background: #557755; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
.job-btn:hover { background: #779977; }
.job-count { min-width: 40px; text-align: center; font-weight: bold; color: #99ff99; }
</style>
