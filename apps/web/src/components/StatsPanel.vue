<!--
  StatsPanel — 统计面板
  展示 state.stats 中已经累计的运行、转生、战斗和收藏数据。
-->
<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'

const game = useGameStore()

const stats = computed(() => game.state.stats)

const runDays = computed(() => Number(stats.value.days ?? 0))
const totalDays = computed(() => Number(stats.value.tdays ?? 0))
const attacks = computed(() => Number(stats.value.attacks ?? 0))
const deaths = computed(() => Number(stats.value.died ?? 0))

const resetStats = computed(() => [
  { label: '总转生', value: Number(stats.value.reset ?? 0) },
  { label: 'MAD', value: Number(stats.value.mad ?? 0) },
  { label: '生物播种', value: Number(stats.value.bioseed ?? 0) },
  { label: '黑洞', value: Number(stats.value.blackhole ?? 0) },
  { label: '地狱门', value: Number(stats.value.portals ?? 0) },
])

const achievementCount = computed(() => Object.keys(stats.value.achieve ?? {}).length)
const featCount = computed(() => Object.keys((stats.value as Record<string, unknown>).feat as Record<string, unknown> | undefined ?? {}).length)

function formatInt(n: number): string {
  return Math.floor(n).toLocaleString()
}

function formatDuration(days: number): string {
  const total = Math.max(0, Math.floor(days))
  const years = Math.floor(total / 365)
  const remDays = total % 365
  if (years > 0) return `${years.toLocaleString()} 年 ${remDays} 天`
  return `${remDays.toLocaleString()} 天`
}
</script>

<template>
  <div class="stats-panel">
    <section class="stats-section">
      <h3 class="section-title">运行</h3>
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-label">本轮天数</span>
          <span class="stat-value">{{ formatDuration(runDays) }}</span>
          <span class="stat-sub">{{ formatInt(runDays) }} 天</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">累计天数</span>
          <span class="stat-value">{{ formatDuration(totalDays) }}</span>
          <span class="stat-sub">{{ formatInt(totalDays) }} 天</span>
        </div>
      </div>
    </section>

    <section class="stats-section">
      <h3 class="section-title">转生</h3>
      <div class="stats-grid compact">
        <div v-for="item in resetStats" :key="item.label" class="stat-card">
          <span class="stat-label">{{ item.label }}</span>
          <span class="stat-value">{{ formatInt(item.value) }}</span>
        </div>
      </div>
    </section>

    <section class="stats-section">
      <h3 class="section-title">战斗</h3>
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-label">发起战役</span>
          <span class="stat-value">{{ formatInt(attacks) }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">阵亡/死亡</span>
          <span class="stat-value danger">{{ formatInt(deaths) }}</span>
        </div>
      </div>
    </section>

    <section class="stats-section">
      <h3 class="section-title">收藏</h3>
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-label">已记录成就</span>
          <span class="stat-value">{{ formatInt(achievementCount) }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">已记录 Feats</span>
          <span class="stat-value">{{ formatInt(featCount) }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.stats-panel {
  max-width: 860px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.stats-section {
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.012);
}

.section-title {
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-accent);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 8px;
}

.stats-grid.compact {
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
}

.stat-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 72px;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: var(--radius-sm);
  background: var(--bg-input);
}

.stat-label {
  font-size: 11px;
  color: var(--text-muted);
}

.stat-value {
  font-family: var(--font-mono);
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-value.danger {
  color: var(--danger);
}

.stat-sub {
  margin-top: auto;
  font-size: 10px;
  color: var(--text-secondary);
}
</style>
