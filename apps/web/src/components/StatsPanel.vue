<!--
  StatsPanel — 统计面板
  展示 state.stats 中已经累计的运行、转生、战斗和收藏数据。
-->
<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import PanelHeader from './ui/PanelHeader.vue'
import MetricCard from './ui/MetricCard.vue'

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
  { label: '灾变', value: Number(stats.value.cataclysm ?? 0) },
  { label: '黑洞', value: Number(stats.value.blackhole ?? 0) },
  { label: '宇宙重启', value: Number(stats.value.universes ?? 0) },
  { label: '飞升', value: Number(stats.value.ascend ?? 0) },
  { label: '堕落', value: Number(stats.value.descend ?? 0) },
  { label: '神化', value: Number(stats.value.apotheosis ?? 0) },
  { label: '地球化', value: Number(stats.value.terraform ?? 0) },
  { label: 'AI 末日', value: Number((stats.value as Record<string, unknown>).aiApoc ?? (stats.value as Record<string, unknown>).aiappoc ?? 0) },
  { label: '矩阵', value: Number(stats.value.matrix ?? 0) },
  { label: '退休', value: Number(stats.value.retire ?? 0) },
  { label: '伊甸园', value: Number(stats.value.eden ?? 0) },
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
    <PanelHeader
      icon="stats"
      title="统计"
      subtitle="当前存档已经记录的运行、转生、战斗和收藏数据。"
    />

    <section class="stats-section">
      <h3 class="section-title">运行</h3>
      <div class="stats-grid">
        <MetricCard label="本轮天数" :value="formatDuration(runDays)" :sub="`${formatInt(runDays)} 天`" />
        <MetricCard label="累计天数" :value="formatDuration(totalDays)" :sub="`${formatInt(totalDays)} 天`" />
      </div>
    </section>

    <section class="stats-section">
      <h3 class="section-title">转生</h3>
      <div class="stats-grid compact">
        <MetricCard
          v-for="item in resetStats"
          :key="item.label"
          :label="item.label"
          :value="formatInt(item.value)"
        />
      </div>
    </section>

    <section class="stats-section">
      <h3 class="section-title">战斗</h3>
      <div class="stats-grid">
        <MetricCard label="发起战役" :value="formatInt(attacks)" />
        <MetricCard label="阵亡/死亡" :value="formatInt(deaths)" tone="danger" />
      </div>
    </section>

    <section class="stats-section">
      <h3 class="section-title">收藏</h3>
      <div class="stats-grid">
        <MetricCard label="已记录成就" :value="formatInt(achievementCount)" tone="accent" />
        <MetricCard label="已记录 Feats" :value="formatInt(featCount)" tone="accent" />
      </div>
    </section>
  </div>
</template>

<style scoped>
.stats-panel {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.stats-section {
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--surface-raised);
}

.section-title {
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-accent);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 8px;
}

.stats-grid.compact {
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
}
</style>
