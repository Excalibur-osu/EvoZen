<!--
  资源详情面板组件 (ResourceDetailPanel.vue)
  在游戏主界面的独立面板，使用表格详尽展示每种已解锁资源的总额、最大上限、每秒获取/消耗速率。
  通过填充条动态可视化当前的满仓程度。
-->
<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import { getResourceName } from '../utils/resourceNames'
import type { ResourceState } from '@evozen/shared-types'

const game = useGameStore()

const allResources = computed(() => {
  return (Object.entries(game.state.resource) as Array<[string, ResourceState]>)
    .filter(([_, res]) => res.display)
    .map(([id, res]) => ({ id, ...res }))
})

function formatNum(n: number): string {
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M'
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return Math.floor(n).toLocaleString()
}

function formatRate(n: number): string {
  if (n === 0) return '—'
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
</script>

<template>
  <div class="res-detail-panel">
    <h3 class="section-title">📊 资源详情</h3>

    <table class="res-table">
      <thead>
        <tr>
          <th class="col-name">资源</th>
          <th class="col-num">数量</th>
          <th class="col-num">上限</th>
          <th class="col-num">速率</th>
          <th class="col-bar">填充度</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="res in allResources" :key="res.id">
          <td class="col-name">{{ res.name || getResourceName(res.id) }}</td>
          <td class="col-num font-mono">{{ formatNum(res.amount) }}</td>
          <td class="col-num font-mono" style="color: var(--text-muted)">{{ res.max > 0 ? formatNum(res.max) : '∞' }}</td>
          <td class="col-num font-mono" :class="rateClass(res.diff)">{{ formatRate(res.diff * 4) }}/s</td>
          <td class="col-bar">
            <div class="mini-bar" v-if="res.max > 0">
              <div
                class="mini-fill"
                :style="{
                  width: fillPercent(res) + '%',
                  background: fillPercent(res) > 95 ? 'var(--danger)' : fillPercent(res) > 75 ? 'var(--warning)' : 'var(--success)',
                }"
              />
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.res-detail-panel {
  max-width: 800px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-accent);
  margin-bottom: 12px;
}

.res-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.res-table th {
  text-align: left;
  color: var(--text-muted);
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 6px 8px;
  border-bottom: 1px solid var(--border-color);
}
.res-table td {
  padding: 6px 8px;
  border-bottom: 1px solid rgba(255,255,255,0.03);
}
.col-name { width: 25%; }
.col-num { width: 18%; text-align: right; }
.col-bar { width: 20%; }

.mini-bar {
  height: 6px;
  background: rgba(255,255,255,0.06);
  border-radius: 3px;
  overflow: hidden;
}
.mini-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}
</style>
