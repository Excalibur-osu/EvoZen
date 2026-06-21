<!--
  市政岗位分配面板 (JobPanel.vue)
  读取解锁的各种社会工作岗位（农民、伐木工等），展现加成和分配上限。
  包含了自动扣除“失业人口”补充至有生产力岗位的核心 UI 交互。
-->
<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import { BASE_JOBS } from '@evozen/game-core'
import AppIcon from './ui/AppIcon.vue'
import StepperButton from './ui/StepperButton.vue'

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
  colonist: '🚀 火星前线',
  cement_worker: '🧱 水泥 (消耗石头)',
  banker: '💰 金币加成',
  professor: '📚 知识',
  scientist: '🔬 知识',
  entertainer: '🎭 士气',
  priest: '⛪ 信仰/士气',
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
  <div class="job-panel">
    <div class="panel-header">
      <h3 class="section-title">
        <AppIcon name="civic" />
        <span>岗位中心</span>
      </h3>
      
      <!-- 待分配劳动力移至头部，作为紧凑的 Badge -->
      <div 
        class="unemployed-badge" 
        v-if="visibleJobs.some(j => j.id === 'unemployed')"
        :class="{ 'has-unemployed': getWorkers('unemployed') > 0 }"
      >
        <AppIcon class="ub-icon" :name="getWorkers('unemployed') > 0 ? 'zap' : 'users'" />
        <span class="ub-label">待分配:</span>
        <span class="ub-count">{{ getWorkers('unemployed') }}</span>
      </div>
    </div>

    <!-- 紧凑型岗位网格 -->
    <TransitionGroup name="list" tag="div" class="job-grid">
      <template v-for="job in visibleJobs" :key="job.id">
        <div class="job-widget" v-if="job.id !== 'unemployed'" :data-tooltip="job.description">
          
          <div class="jw-header">
            <span class="jw-name">{{ job.name }}</span>
            <span class="jw-output" v-if="JOB_OUTPUT[job.id]">{{ JOB_OUTPUT[job.id] }}</span>
          </div>
          
          <div class="jw-controls">
            <StepperButton
              label="−"
              :aria-label="`移除 ${job.name}`"
              tone="danger"
              :disabled="getWorkers(job.id) <= 0"
              @click="game.removeWorker(job.id)"
            />
            
            <div class="jw-value">
              <span class="val-curr" :class="{ 'val-active': getWorkers(job.id) > 0 }">{{ getWorkers(job.id) }}</span>
              <span class="val-sep">/</span>
              <span class="val-max">{{ getMax(job.id) >= 0 ? getMax(job.id) : '∞' }}</span>
            </div>

            <StepperButton
              label="+"
              :aria-label="`分配 ${job.name}`"
              tone="success"
              :disabled="!canAssignMore(job.id)"
              @click="game.assignWorker(job.id)"
            />
          </div>
          
        </div>
      </template>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.job-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
}

.section-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
}

.section-title svg {
  width: 16px;
  height: 16px;
}

/* 顶部紧凑 Badge */
.unemployed-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  transition: all 0.2s ease;
}

.unemployed-badge.has-unemployed {
  background: color-mix(in srgb, var(--info) 12%, var(--bg-card));
  border-color: color-mix(in srgb, var(--info) 45%, var(--border-color));
  box-shadow: 0 0 12px color-mix(in srgb, var(--info) 22%, transparent);
}

.ub-icon {
  width: 13px;
  height: 13px;
  flex: 0 0 auto;
}
.has-unemployed .ub-icon {
  color: var(--info);
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

.ub-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.ub-count {
  font-size: 14px;
  font-weight: 700;
  font-family: var(--font-mono);
  color: var(--text-muted);
}

.has-unemployed .ub-count {
  color: var(--info);
  text-shadow: 0 0 8px color-mix(in srgb, var(--info) 45%, transparent);
}

/* 紧凑型网格 */
.job-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 8px;
}

.job-widget {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 10px;
  transition: background 0.2s, transform 0.1s;
  cursor: default;
}

.job-widget:hover {
  background: var(--bg-card-hover);
  border-color: var(--border-hover);
  transform: translateY(-1px);
}

.jw-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
}

.jw-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
}

.jw-output {
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 操作器 */
.jw-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-input);
  border-radius: var(--radius-md);
  padding: 2px;
  border: 1px solid var(--border-color);
}

.jw-value {
  display: flex;
  align-items: baseline;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: 13px;
}

.val-curr {
  font-weight: 700;
  color: var(--text-muted);
  transition: color 0.1s;
}
.val-curr.val-active {
  color: var(--text-primary);
}

.val-sep {
  margin: 0 4px;
  font-size: 11px;
  color: var(--border-hover);
}

.val-max {
  font-size: 12px;
  color: var(--text-muted);
}

/* 列表过渡动画 */
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
