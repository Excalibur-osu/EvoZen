<!--
  AchievementsPanel — 成就 / Feats 面板
  对标 legacy/src/achieve.js drawAchieve / drawPerks
-->
<script setup lang="ts">
import { useGameStore } from '../stores/game'
import { computed, ref } from 'vue'

const game = useGameStore()

const counts = computed(() => game.countAchievements())
const universeLvl = computed(() => game.universeLevels())
const mastery = computed(() => game.masteryMultiplier())

const categories = ['all', 'misc', 'species', 'genus', 'planet', 'universe', 'challenge'] as const
type Cat = typeof categories[number]
const activeCategory = ref<Cat>('all')

const allAchievements = computed(() => Object.values(game.ACHIEVEMENTS))
const filteredAchievements = computed(() =>
  activeCategory.value === 'all'
    ? allAchievements.value
    : allAchievements.value.filter((a) => a.type === activeCategory.value)
)

const allFeats = computed(() => Object.values(game.FEATS))

function getAchievementRecord(id: string) {
  const stats = game.state.stats as Record<string, unknown>
  const achieve = (stats['achieve'] as Record<string, { l?: number }> | undefined) ?? {}
  return achieve[id]
}

function getFeatRecord(id: string): number {
  const stats = game.state.stats as Record<string, unknown>
  const feat = (stats['feat'] as Record<string, number> | undefined) ?? {}
  return feat[id] ?? 0
}

function categoryLabel(c: Cat): string {
  const labels: Record<Cat, string> = {
    all: '全部',
    misc: '杂项',
    species: '物种灭绝',
    genus: '属类',
    planet: '行星',
    universe: '宇宙',
    challenge: '挑战',
  }
  return labels[c]
}

function rankStars(rank: number): string {
  return '★'.repeat(Math.min(5, rank))
}
</script>

<template>
  <div class="achievements-panel">
    <div class="title-section">
      <h2 class="title">🏆 成就</h2>
      <p class="subtitle">解锁成就以获得永久加成。</p>
    </div>

    <div class="stats-row">
      <div class="stat-card">
        <span class="stat-label">已解锁成就</span>
        <span class="stat-value">{{ counts.achievements }} / {{ allAchievements.length }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">已解锁 Feats</span>
        <span class="stat-value">{{ counts.feats }} / {{ allFeats.length }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">挑战等级</span>
        <span class="stat-value">{{ universeLvl.aLvl }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">掌握度加成</span>
        <span class="stat-value">+{{ (mastery * 100).toFixed(1) }}%</span>
      </div>
    </div>

    <div class="category-tabs">
      <button
        v-for="c in categories"
        :key="c"
        :class="['cat-tab', { active: activeCategory === c }]"
        @click="activeCategory = c"
      >
        {{ categoryLabel(c) }}
      </button>
    </div>

    <h3 class="section-title">成就</h3>
    <div class="achievements-grid">
      <div
        v-for="a in filteredAchievements"
        :key="a.id"
        :class="['ach-card', { unlocked: getAchievementRecord(a.id) }]"
      >
        <div class="ach-header">
          <span class="ach-name">{{ a.name }}</span>
          <span v-if="getAchievementRecord(a.id)" class="ach-rank">{{ rankStars(getAchievementRecord(a.id)?.l ?? 0) }}</span>
        </div>
        <p class="ach-desc">{{ a.desc || '（条件保密）' }}</p>
        <p v-if="getAchievementRecord(a.id) && a.flair" class="ach-flair">"{{ a.flair }}"</p>
      </div>
    </div>

    <h3 class="section-title">Feats（功绩）</h3>
    <div class="achievements-grid">
      <div
        v-for="f in allFeats"
        :key="f.id"
        :class="['ach-card feat-card', { unlocked: getFeatRecord(f.id) > 0 }]"
      >
        <div class="ach-header">
          <span class="ach-name">{{ f.name }}</span>
          <span v-if="getFeatRecord(f.id)" class="ach-rank">{{ rankStars(getFeatRecord(f.id)) }}</span>
        </div>
        <p class="ach-desc">{{ f.desc }}</p>
        <p v-if="getFeatRecord(f.id) && f.flair" class="ach-flair">"{{ f.flair }}"</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.achievements-panel { padding: 1rem; color: #e0e0e0; }
.title-section { margin-bottom: 1rem; }
.title { font-size: 1.3rem; color: #ffd700; margin: 0 0 0.3rem; }
.subtitle { font-size: 0.85rem; color: #aaa; }

.stats-row {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}
.stat-card {
  background: rgba(255, 215, 0, 0.1);
  border: 1px solid #665522;
  padding: 0.5rem 0.8rem;
  border-radius: 4px;
  flex: 1;
  min-width: 130px;
}
.stat-label { display: block; font-size: 0.75rem; color: #aaa; }
.stat-value { display: block; font-size: 1.1rem; font-weight: bold; color: #ffd700; }

.category-tabs {
  display: flex;
  gap: 0.3rem;
  margin-bottom: 0.8rem;
  flex-wrap: wrap;
}
.cat-tab {
  background: #2a2010;
  color: #ddd;
  border: 1px solid #443322;
  padding: 0.3rem 0.7rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
}
.cat-tab.active {
  background: #443322;
  color: #ffd700;
  border-color: #ffd700;
}

.section-title { font-size: 1rem; color: #ffd700; margin: 0.8rem 0 0.5rem; }

.achievements-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.5rem;
}
.ach-card {
  background: #1a1810;
  border: 1px solid #332e1a;
  border-radius: 6px;
  padding: 0.6rem;
  opacity: 0.5;
}
.ach-card.unlocked {
  opacity: 1;
  border-color: #ffd700;
  background: rgba(255, 215, 0, 0.06);
}
.feat-card.unlocked { border-color: #ff5c5c; background: rgba(255, 92, 92, 0.06); }
.ach-header { display: flex; justify-content: space-between; }
.ach-name { font-weight: bold; }
.ach-rank { color: #ffd700; font-size: 0.85rem; }
.ach-desc { font-size: 0.8rem; color: #aaa; margin: 0.3rem 0; }
.ach-flair { font-size: 0.75rem; color: #ffaa55; font-style: italic; }
</style>
