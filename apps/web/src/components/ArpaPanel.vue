<!--
  ARPA 长线研究面板 (ArpaPanel.vue)
  对标 legacy/src/arpa.js — Physics 项目（monument + stock_exchange）

  机制说明：
    玩家选择纪念碑类型 → 点击"开始"→ 每 tick 扣 cost/100 资源 → 进度条满 100% 自动完成
    完成后 rank+1，费用按 mult^rank 递增，可重复建造
-->
<script setup lang="ts">
import { useGameStore } from '../stores/game'
import { computed, ref } from 'vue'
import type { MonumentType } from '@evozen/game-core'

const game = useGameStore()

const projects = computed(() => game.getAvailableArpaProjects())
const hasAnyArpa = computed(() => projects.value.length > 0)

function projectState(id: string) {
  return game.getArpaProjectState(id)
}

function projectCost(id: string) {
  return game.arpaCost(id)
}

function canAfford(id: string): boolean {
  const cost = projectCost(id)
  for (const [res, amount] of Object.entries(cost)) {
    const rs = game.state.resource[res]
    if (!rs || rs.amount < amount / 100) return false
  }
  return true
}

// 纪念碑类型选择
const selectedMonumentType = ref<MonumentType>(
  (game.getMonumentType() as MonumentType) ?? 'Obelisk'
)
function selectMonumentType(t: MonumentType) {
  selectedMonumentType.value = t
  game.changeMonumentType(t)
}

// 纪念碑类型图标及资源提示
const MONUMENT_RES_LABEL: Record<MonumentType, string> = {
  Obelisk:  '石材 ×1,000,000',
  Statue:   '铝 ×350,000',
  Sculpture:'钢铁 ×300,000',
  Monolith: '水泥 ×300,000',
  Pillar:   '木材 ×1,000,000',
}
const MONUMENT_ICON: Record<MonumentType, string> = {
  Obelisk:  '🗿',
  Statue:   '🗽',
  Sculpture:'🪨',
  Monolith: '🧱',
  Pillar:   '🏛️',
}
const MONUMENT_TYPES: MonumentType[] = ['Obelisk','Statue','Sculpture','Monolith','Pillar']
</script>

<template>
  <div class="arpa-panel">
    <div class="arpa-title-section">
      <h2 class="arpa-title">🔬 ARPA 长线研究</h2>
      <p class="arpa-subtitle">
        大型基础设施项目，资源分 100 次自动扣取，进度满即完成。
      </p>
    </div>

    <div v-if="!hasAnyArpa" class="arpa-locked">
      <span>🔒 尚无可用项目。研究更高级的科技以解锁 ARPA。</span>
    </div>

    <div v-for="proj in projects" :key="proj.id" class="arpa-project-card">
      <div class="proj-header">
        <div class="proj-info">
          <span class="proj-name">{{ proj.name }}</span>
          <span class="proj-rank" v-if="projectState(proj.id).rank > 0">
            × {{ projectState(proj.id).rank }}
          </span>
        </div>
        <div class="proj-status-badge" :class="projectState(proj.id).active ? 'active' : 'idle'">
          {{ projectState(proj.id).active ? '施工中' : '待命' }}
        </div>
      </div>

      <p class="proj-desc">{{ proj.desc }}</p>
      <p class="proj-effect">✨ {{ proj.effectText }}</p>

      <!-- 纪念碑类型选择器 -->
      <div v-if="proj.id === 'monument'" class="monument-type-selector">
        <p class="selector-label">纪念碑类型：</p>
        <div class="monument-type-grid">
          <button
            v-for="mt in MONUMENT_TYPES"
            :key="mt"
            class="monument-btn"
            :class="{ active: selectedMonumentType === mt }"
            :disabled="projectState(proj.id).active"
            @click="selectMonumentType(mt)"
          >
            <span class="mt-icon">{{ MONUMENT_ICON[mt] }}</span>
            <span class="mt-name">{{ game.MONUMENT_NAMES[mt] }}</span>
            <span class="mt-res">{{ MONUMENT_RES_LABEL[mt] }}</span>
          </button>
        </div>
      </div>

      <!-- 进度条 -->
      <div class="progress-wrap">
        <div class="progress-header">
          <span>进度</span>
          <span class="font-mono">{{ projectState(proj.id).progress }}%</span>
        </div>
        <div class="progress-bar">
          <div
            class="fill"
            :style="{
              width: projectState(proj.id).progress + '%',
              background: 'linear-gradient(90deg, var(--accent), #a78bfa)',
            }"
          />
        </div>
      </div>

      <!-- 费用展示 -->
      <div class="proj-cost">
        <span class="cost-label">单次总费用：</span>
        <span v-for="(amount, res) in projectCost(proj.id)" :key="res" class="cost-item">
          {{ res }} {{ amount.toLocaleString() }}
        </span>
        <span class="cost-step">（每 tick 扣 1%）</span>
      </div>

      <!-- 控制按钮 -->
      <div class="proj-actions">
        <button
          v-if="!projectState(proj.id).active"
          class="btn primary"
          :disabled="!canAfford(proj.id)"
          @click="game.startArpa(proj.id)"
        >
          {{ canAfford(proj.id) ? '▶ 开始建造' : '⚠ 资源不足' }}
        </button>
        <button
          v-else
          class="btn danger"
          @click="game.stopArpa(proj.id)"
        >
          ⏸ 暂停
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.arpa-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.arpa-title-section { text-align: center; margin-bottom: 4px; }
.arpa-title {
  font-size: 22px;
  font-weight: 700;
  background: linear-gradient(135deg, #3b82f6, #a78bfa);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.arpa-subtitle { font-size: 13px; color: var(--text-secondary); margin-top: 4px; }

.arpa-locked {
  text-align: center;
  padding: 32px 16px;
  color: var(--text-muted);
  background: var(--bg-card);
  border: 1px dashed var(--border-color);
  border-radius: var(--radius-md);
}

.arpa-project-card {
  padding: 18px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: border-color 0.2s;
}
.arpa-project-card:hover { border-color: var(--border-hover); }

.proj-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.proj-info { display: flex; align-items: center; gap: 8px; }
.proj-name { font-size: 16px; font-weight: 700; color: var(--text-primary); }
.proj-rank {
  font-size: 12px;
  background: var(--accent-glow);
  color: var(--accent);
  padding: 2px 8px;
  border-radius: 99px;
  font-weight: 600;
}
.proj-status-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 99px;
}
.proj-status-badge.active { background: rgba(16,185,129,0.15); color: #10b981; }
.proj-status-badge.idle   { background: var(--bg-input); color: var(--text-muted); }

.proj-desc { font-size: 13px; color: var(--text-secondary); }
.proj-effect { font-size: 12px; color: var(--text-accent); }

/* 纪念碑类型选择 */
.monument-type-selector { margin-top: 4px; }
.selector-label { font-size: 12px; color: var(--text-muted); margin-bottom: 6px; }
.monument-type-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 6px;
}
.monument-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 8px 6px;
  background: var(--bg-input);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.15s;
  color: var(--text-primary);
  font-family: var(--font-sans);
}
.monument-btn:hover:not(:disabled) { border-color: var(--border-hover); background: var(--bg-card-hover); }
.monument-btn.active { border-color: var(--accent); background: var(--accent-glow); box-shadow: 0 0 8px var(--accent-glow); }
.monument-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.mt-icon { font-size: 20px; }
.mt-name { font-size: 11px; font-weight: 700; }
.mt-res { font-size: 9px; color: var(--text-muted); text-align: center; }

/* 进度条 */
.progress-wrap { display: flex; flex-direction: column; gap: 4px; }
.progress-header {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-secondary);
}

/* 费用 */
.proj-cost {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
}
.cost-label { font-weight: 600; }
.cost-item {
  background: var(--bg-input);
  padding: 2px 8px;
  border-radius: 99px;
  font-size: 11px;
  font-family: var(--font-mono);
}
.cost-step { color: var(--text-muted); font-size: 11px; }

/* 按钮 */
.proj-actions { display: flex; gap: 8px; }
.btn.danger {
  background: rgba(239,68,68,0.1);
  color: #ef4444;
  border: 1px solid rgba(239,68,68,0.3);
}
.btn.danger:hover { background: rgba(239,68,68,0.2); }
</style>
