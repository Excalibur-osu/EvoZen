<!--
  左侧边栏资源概览面板 (ResourcePanel.vue)
  精简版展示当前解锁的所有资源，只提供 [当前数目 / 填充比率条 / 每秒浮动速率] 等核心信息。
-->
<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import type { ResourceState } from '@evozen/shared-types'

const game = useGameStore()

/** 显示的资源列表（排除种族人口资源，人口由左侧信息卡单独展示） */
const visibleResources = computed(() => {
  return (Object.entries(game.state.resource) as Array<[string, ResourceState]>)
    .filter(([id, res]) => res.display && !SPECIES_IDS.has(id))
    .map(([id, res]) => ({ id, ...res }))
})

function formatNum(n: number): string {
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M'
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return Math.floor(n).toLocaleString()
}

function formatRate(n: number): string {
  const sign = n > 0 ? '+' : ''
  return sign + n.toFixed(2)
}

function rateClass(n: number): string {
  if (n > 0) return 'rate-positive'
  if (n < 0) return 'rate-negative'
  return 'rate-zero'
}

function fillPercent(res: { amount: number; max: number }): number {
  if (res.max <= 0) return 0
  return Math.min(100, (res.amount / res.max) * 100)
}

function getEffectiveRate(res: { amount: number; max: number; diff: number }): number {
  if (res.max > 0 && res.amount >= res.max && res.diff > 0) {
    return 0
  }
  return res.diff
}

/** 种族（人口）资源 ID 集合：满载是正常状态，不应显示红色 */
const SPECIES_IDS = new Set(['human', 'elven', 'orc', 'dwarf', 'goblin'])

function fillColor(res: { id: string; amount: number; max: number }): string {
  if (res.id === 'RNA') return 'linear-gradient(90deg, #7c3aed, #a78bfa)'
  if (res.id === 'DNA') return 'linear-gradient(90deg, #f43f5e, #fb7185)'

  const pct = fillPercent(res)

  // 人口资源：满载 = 需要建更多住房（蓝色提示），不是危险状态
  if (SPECIES_IDS.has(res.id)) {
    return pct >= 100 ? 'var(--info)' : 'var(--success)'
  }

  if (pct > 99) return 'var(--danger)'
  if (pct > 75) return 'var(--warning)'
  return 'var(--success)'
}
</script>

<template>
  <div class="resource-list">
    <div class="res-header">
      <span class="res-section-title">📦 资源</span>
    </div>
    <div class="res-scroll">
      <div
        v-for="res in visibleResources"
        :key="res.id"
        class="res-row"
      >
        <div class="res-top">
          <span class="res-name">{{ res.name }}</span>
          <span class="res-amount font-mono">{{ formatNum(res.amount) }}</span>
        </div>
        <div class="res-bottom">
          <span class="res-rate font-mono" :class="rateClass(getEffectiveRate(res))" v-if="Math.abs(getEffectiveRate(res) * 4) >= 0.005">
            {{ formatRate(getEffectiveRate(res) * 4) }}/s
          </span>
          <span class="res-max font-mono" v-if="res.max > 0">/ {{ formatNum(res.max) }}</span>
        </div>
        <div class="progress-bar" v-if="res.max > 0" style="height: 3px; margin-top: 2px">
          <div
            class="fill"
            :style="{
              width: fillPercent(res) + '%',
              background: fillColor(res)
            }"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.resource-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

.res-header {
  padding: 4px 8px;
  flex-shrink: 0;
  background: rgba(255,255,255,0.015);
  border-bottom: 1px solid var(--border-color);
}
.res-section-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.res-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 2px 8px;
}

.res-row {
  padding: 3px 0;
  border-bottom: 1px solid rgba(255,255,255,0.03);
}
.res-row:last-child {
  border-bottom: none;
}

.res-top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.res-name {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-primary);
}
.res-amount {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-primary);
}

.res-bottom {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 9px;
  margin-top: 1px;
}
.res-rate {
  font-size: 9px;
}
.rate-positive { color: var(--success); }
.rate-negative { color: var(--danger); }
.rate-zero { color: var(--text-muted); }

.res-max {
  color: var(--text-muted);
  margin-left: auto;
}
</style>
