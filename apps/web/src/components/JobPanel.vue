<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import { BASE_JOBS } from '@evozen/game-core'

const game = useGameStore()

/** 可见岗位 */
const visibleJobs = computed(() => {
  return BASE_JOBS.filter(job => {
    if (job.id === 'unemployed') return true
    const civicJob = game.state.civic[job.id] as { display?: boolean } | undefined
    return civicJob?.display ?? false
  })
})

function getWorkers(jobId: string): number {
  return (game.state.civic[jobId] as { workers: number } | undefined)?.workers ?? 0
}

function getMax(jobId: string): number {
  return (game.state.civic[jobId] as { max?: number } | undefined)?.max ?? -1
}

/** 产出标签 */
const JOB_OUTPUT: Record<string, string> = {
  hunter: '🍖 食物 + 🧶 毛皮',
  farmer: '🌾 食物',
  lumberjack: '🪵 木材',
  quarry_worker: '🪨 石头',
  miner: '🔶 铜/铁',
  coal_miner: '⚫ 煤炭',
  cement_worker: '🧱 水泥 (消耗石头)',
  banker: '💰 金币加成',
  professor: '📚 知识',
  scientist: '🔬 知识',
  entertainer: '🎭 士气',
  craftsman: '🔨 制造',
}

function canAssignMore(jobId: string): boolean {
  if (getWorkers('unemployed') <= 0) return false
  const max = getMax(jobId)
  if (max < 0) return true // 无限制
  return getWorkers(jobId) < max
}
</script>

<template>
  <div class="job-list">
    <h3 class="section-title">👷 岗位分配</h3>

    <div
      v-for="job in visibleJobs"
      :key="job.id"
      class="job-row"
      :class="{ 'job-unemployed': job.id === 'unemployed' }"
    >
      <div class="job-info">
        <div class="job-name-row">
          <span class="job-name">{{ job.name }}</span>
          <span class="job-output text-xs" v-if="JOB_OUTPUT[job.id]">{{ JOB_OUTPUT[job.id] }}</span>
        </div>
        <span class="job-desc text-xs" v-if="job.id !== 'unemployed'">{{ job.description }}</span>
      </div>
      <div class="job-controls">
        <template v-if="job.id !== 'unemployed'">
          <button class="ctrl-btn" @click="game.removeWorker(job.id)" :disabled="getWorkers(job.id) <= 0" title="减少工人">−</button>
        </template>
        <span class="job-count font-mono">{{ getWorkers(job.id) }}</span>
        <span class="job-max font-mono text-xs" v-if="getMax(job.id) >= 0">/ {{ getMax(job.id) }}</span>
        <span class="job-max font-mono text-xs" v-else-if="job.id !== 'unemployed'">/ ∞</span>
        <template v-if="job.id !== 'unemployed'">
          <button class="ctrl-btn" @click="game.assignWorker(job.id)" :disabled="!canAssignMore(job.id)" title="增加工人">+</button>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.job-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-accent);
  margin-bottom: 8px;
}

.job-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
}
.job-unemployed {
  background: rgba(248, 113, 113, 0.05);
  border-color: rgba(248, 113, 113, 0.15);
}

.job-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}
.job-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.job-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}
.job-output {
  color: var(--text-muted);
  opacity: 0.8;
}
.job-desc {
  color: var(--text-muted);
  line-height: 1.3;
}

.job-controls {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.ctrl-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
  font-family: var(--font-sans);
  padding: 0;
}
.ctrl-btn:hover:not(:disabled) {
  background: var(--bg-card-hover);
  border-color: var(--border-hover);
}
.ctrl-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.job-count {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-accent);
  min-width: 20px;
  text-align: center;
}
.job-max {
  color: var(--text-muted);
}
</style>
