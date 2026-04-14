<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'

const game = useGameStore()

const highTech = computed(() => game.state.tech['high_tech'] ?? 0)
const spaceExplore = computed(() => game.state.tech['space_explore'] ?? 0)
const mars = computed(() => game.state.tech['mars'] ?? 0)

const milestones = computed(() => [
  {
    id: 'launch',
    title: '轨道入口',
    unlocked: highTech.value >= 7,
    detail: highTech.value >= 7 ? '已掌握火箭学，进入近地轨道时代。' : '需要先完成「火箭学」。',
  },
  {
    id: 'moon',
    title: '月面探索',
    unlocked: spaceExplore.value >= 2,
    detail: spaceExplore.value >= 2 ? '已具备探测车与月面前哨骨架。' : '研究「天体物理学」与「探测车」后开启。',
  },
  {
    id: 'deep',
    title: '深空航道',
    unlocked: spaceExplore.value >= 3,
    detail: spaceExplore.value >= 3 ? '已具备深空探针与火星航道入口。' : '研究「深空探针」后开启。',
  },
  {
    id: 'mars',
    title: '火星殖民',
    unlocked: mars.value >= 1,
    detail: mars.value >= 1 ? `火星殖民等级 ${mars.value}，后续可继续扩展。` : '研究「殖民化」后开启火星阶段。',
  },
])

const spaceKeys = computed(() => Object.keys(game.state.space))
</script>

<template>
  <div class="space-panel">
    <section class="hero-card">
      <div class="eyebrow">Space Entry</div>
      <h2 class="title">太空入口</h2>
      <p class="subtitle">
        当前阶段先接通科技链、标签页和基础占位结构。月球 / 火星的具体建筑与产线会在后续 sprint 继续展开。
      </p>
      <div class="stats-row">
        <div class="stat">
          <span class="stat-label">高科技</span>
          <span class="stat-value">{{ highTech }}</span>
        </div>
        <div class="stat">
          <span class="stat-label">太空探索</span>
          <span class="stat-value">{{ spaceExplore }}</span>
        </div>
        <div class="stat">
          <span class="stat-label">火星</span>
          <span class="stat-value">{{ mars }}</span>
        </div>
      </div>
    </section>

    <section class="milestone-grid">
      <article
        v-for="item in milestones"
        :key="item.id"
        class="milestone-card"
        :class="{ unlocked: item.unlocked }"
      >
        <div class="milestone-head">
          <span class="milestone-title">{{ item.title }}</span>
          <span class="milestone-state">{{ item.unlocked ? '已开启' : '未开启' }}</span>
        </div>
        <p class="milestone-detail">{{ item.detail }}</p>
      </article>
    </section>

    <section class="skeleton-card">
      <div class="skeleton-head">
        <span class="skeleton-title">已注册的太空结构槽位</span>
        <span class="skeleton-count">{{ spaceKeys.length }}</span>
      </div>
      <div v-if="spaceKeys.length === 0" class="empty-state">
        研究太空入口科技后，这里会出现对应的占位结构。
      </div>
      <div v-else class="chip-row">
        <span v-for="key in spaceKeys" :key="key" class="chip">{{ key }}</span>
      </div>
    </section>
  </div>
</template>

<style scoped>
.space-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hero-card,
.milestone-card,
.skeleton-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
}

.hero-card {
  padding: 18px;
  background:
    radial-gradient(circle at top right, rgba(56, 189, 248, 0.16), transparent 35%),
    linear-gradient(160deg, rgba(15, 23, 42, 0.9), rgba(12, 18, 32, 0.92));
}

.eyebrow {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.title {
  margin: 0;
  font-size: 26px;
  font-weight: 800;
  color: var(--text-primary);
}

.subtitle {
  margin: 8px 0 0;
  max-width: 700px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-secondary);
}

.stats-row {
  display: flex;
  gap: 10px;
  margin-top: 14px;
  flex-wrap: wrap;
}

.stat {
  min-width: 110px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
}

.stat-label {
  display: block;
  font-size: 10px;
  color: var(--text-muted);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.stat-value {
  display: block;
  margin-top: 4px;
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
}

.milestone-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.milestone-card {
  padding: 14px;
}

.milestone-card.unlocked {
  border-color: color-mix(in srgb, var(--accent) 35%, var(--border-color));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 15%, transparent);
}

.milestone-head,
.skeleton-head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
}

.milestone-title,
.skeleton-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
}

.milestone-state,
.skeleton-count {
  font-size: 11px;
  color: var(--text-accent);
}

.milestone-detail {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-secondary);
}

.skeleton-card {
  padding: 14px;
}

.empty-state {
  margin-top: 10px;
  font-size: 12px;
  color: var(--text-muted);
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.chip {
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(56, 189, 248, 0.08);
  border: 1px solid rgba(56, 189, 248, 0.18);
  color: #7dd3fc;
  font-size: 11px;
  font-family: var(--font-mono);
}
</style>
