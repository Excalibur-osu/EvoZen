<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'

const game = useGameStore()

/** 显示的资源列表 */
const visibleResources = computed(() => {
  return Object.entries(game.state.resource)
    .filter(([_, res]) => res.display)
    .map(([id, res]) => ({ id, ...res }))
})

function formatNum(n: number): string {
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M'
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return Math.floor(n).toLocaleString()
}

function formatRate(n: number): string {
  if (n === 0) return ''
  const sign = n > 0 ? '+' : ''
  if (Math.abs(n) < 0.01) return sign + n.toFixed(3)
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

function fillColor(res: { amount: number; max: number }): string {
  const pct = fillPercent(res)
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
          <span class="res-rate font-mono" :class="rateClass(res.diff)" v-if="res.diff !== 0">
            {{ formatRate(res.diff) }}/s
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
  padding: 6px 12px;
  flex-shrink: 0;
  background: rgba(255,255,255,0.02);
}
.res-section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.res-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 4px 12px;
}

.res-row {
  padding: 5px 0;
  border-bottom: 1px solid rgba(255,255,255,0.04);
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
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
}
.res-amount {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.res-bottom {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 10px;
  margin-top: 1px;
}
.res-rate {
  font-size: 10px;
}
.res-max {
  color: var(--text-muted);
}
</style>
