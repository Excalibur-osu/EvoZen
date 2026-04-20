<!--
  市政岗位分配面板 (JobPanel.vue)
  读取解锁的各种社会工作岗位（农民、伐木工等），展现加成和分配上限。
  包含了自动扣除“失业人口”补充至有生产力岗位的核心 UI 交互。
-->
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
        <span class="title-icon">👷</span>
        岗位中心
      </h3>
      
      <!-- 待分配劳动力移至头部，作为紧凑的 Badge -->
      <div 
        class="unemployed-badge" 
        v-if="visibleJobs.some(j => j.id === 'unemployed')"
        :class="{ 'has-unemployed': getWorkers('unemployed') > 0 }"
      >
        <span class="ub-icon" v-if="getWorkers('unemployed') > 0">⚡</span>
        <span class="ub-icon" v-else>👥</span>
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
            <button 
              class="jw-btn" 
              @click="game.removeWorker(job.id)" 
              :disabled="getWorkers(job.id) <= 0"
            >
              <svg viewBox="0 0 24 24" fill="none" class="icon-minus" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
            
            <div class="jw-value">
              <span class="val-curr" :class="{ 'val-active': getWorkers(job.id) > 0 }">{{ getWorkers(job.id) }}</span>
              <span class="val-sep">/</span>
              <span class="val-max">{{ getMax(job.id) >= 0 ? getMax(job.id) : '∞' }}</span>
            </div>

            <button 
              class="jw-btn" 
              @click="game.assignWorker(job.id)" 
              :disabled="!canAssignMore(job.id)"
            >
              <svg viewBox="0 0 24 24" fill="none" class="icon-plus" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
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
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.section-title {
  font-size: 15px;
  font-weight: 700;
  color: #f8fafc;
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
}

.title-icon {
  font-size: 16px;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
}

/* 顶部紧凑 Badge */
.unemployed-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  transition: all 0.2s ease;
}

.unemployed-badge.has-unemployed {
  background: rgba(59, 130, 246, 0.15);
  border-color: rgba(59, 130, 246, 0.4);
  box-shadow: 0 0 12px rgba(59, 130, 246, 0.2);
}

.ub-icon {
  font-size: 13px;
}
.has-unemployed .ub-icon {
  color: #60a5fa;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

.ub-label {
  font-size: 12px;
  color: #cbd5e1;
}

.ub-count {
  font-size: 14px;
  font-weight: 700;
  font-family: var(--font-mono);
  color: #94a3b8;
}

.has-unemployed .ub-count {
  color: #60a5fa;
  text-shadow: 0 0 8px rgba(96, 165, 250, 0.5);
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
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 10px;
  transition: background 0.2s, transform 0.1s;
  cursor: default;
}

.job-widget:hover {
  background: rgba(30, 41, 59, 0.8);
  border-color: rgba(255, 255, 255, 0.15);
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
  color: #f1f5f9;
  white-space: nowrap;
}

.jw-output {
  font-size: 11px;
  color: #94a3b8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 操作器 */
.jw-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(15, 23, 42, 0.6);
  border-radius: 4px;
  padding: 2px;
  border: 1px solid rgba(255, 255, 255, 0.04);
}

.jw-btn {
  width: 28px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: #94a3b8;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.1s;
}

.jw-btn svg {
  width: 12px;
  height: 12px;
}

.jw-btn:not(:disabled):hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.jw-btn:not(:disabled):hover .icon-plus {
  color: #10b981;
}

.jw-btn:not(:disabled):hover .icon-minus {
  color: #f43f5e;
}

.jw-btn:disabled {
  opacity: 0.2;
  cursor: not-allowed;
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
  color: #64748b;
  transition: color 0.1s;
}
.val-curr.val-active {
  color: #f8fafc;
}

.val-sep {
  margin: 0 4px;
  font-size: 11px;
  color: #475569;
}

.val-max {
  font-size: 12px;
  color: #64748b;
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
