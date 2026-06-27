<!--
  AchievementsPanel — 成就 / Feats 面板
  对标 legacy/src/achieve.js drawAchieve / drawPerks
-->
<script setup lang="ts">
import { useGameStore } from '../stores/game'
import { computed, ref } from 'vue'
import PanelHeader from './ui/PanelHeader.vue'
import MetricCard from './ui/MetricCard.vue'
import SegmentedTabs from './ui/SegmentedTabs.vue'

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
const categoryItems = computed(() =>
  categories.map((id) => ({
    id,
    label: categoryLabel(id),
    count: id === 'all'
      ? allAchievements.value.length
      : allAchievements.value.filter((a) => a.type === id).length,
  })),
)

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
    <PanelHeader icon="achievement" title="成就" subtitle="解锁成就以获得永久加成。" />

    <div class="stats-row">
      <MetricCard label="已解锁成就" :value="`${counts.achievements} / ${allAchievements.length}`" tone="accent" />
      <MetricCard label="已解锁功绩" :value="`${counts.feats} / ${allFeats.length}`" />
      <MetricCard label="挑战等级" :value="universeLvl.aLvl" />
      <MetricCard label="掌握度加成" :value="`+${(mastery * 100).toFixed(1)}%`" tone="accent" />
    </div>

    <SegmentedTabs :items="categoryItems" :active="activeCategory" @select="activeCategory = $event" />

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

    <h3 class="section-title">功绩</h3>
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
.achievements-panel {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 8px;
}

.section-title {
  font-size: 13px;
  color: var(--text-accent);
  margin: 4px 0 0;
}

.achievements-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 8px;
}
.ach-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 10px;
  opacity: 0.5;
  transition: border-color 0.18s ease, opacity 0.18s ease, background 0.18s ease;
}
.ach-card.unlocked {
  opacity: 1;
  border-color: color-mix(in srgb, var(--success) 55%, transparent);
  background: var(--success-glow);
}
.feat-card.unlocked {
  border-color: color-mix(in srgb, var(--info) 55%, transparent);
  background: color-mix(in srgb, var(--info) 10%, transparent);
}
.ach-header { display: flex; justify-content: space-between; }
.ach-name {
  color: var(--text-primary);
  font-weight: 700;
}
.ach-rank {
  color: var(--accent);
  font-size: 11px;
}
.ach-desc {
  font-size: 11px;
  color: var(--text-secondary);
  margin: 5px 0;
}
.ach-flair {
  font-size: 10px;
  color: var(--text-muted);
  font-style: italic;
}
</style>
