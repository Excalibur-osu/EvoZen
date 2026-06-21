<!--
  RacesPanel — 种族图鉴
  展示所有 60+ 原版种族及其 genus、trait、解锁条件
-->
<script setup lang="ts">
import { useGameStore } from '../stores/game'
import { computed, ref } from 'vue'
import type { GenusId } from '@evozen/game-core'
import PanelHeader from './ui/PanelHeader.vue'
import SegmentedTabs from './ui/SegmentedTabs.vue'

const game = useGameStore()

const genusOptions = computed<GenusId[]>(() => Object.keys(game.GENUS_DEFS) as GenusId[])
const activeGenus = ref<GenusId | 'all'>('all')

const allRaces = computed(() => Object.values(game.RACES))

const filteredRaces = computed(() => {
  if (activeGenus.value === 'all') return allRaces.value
  return allRaces.value.filter((r) => r.type === activeGenus.value)
})

const genusTabItems = computed(() => [
  { id: 'all' as const, label: '全部', count: allRaces.value.length },
  ...genusOptions.value.map((id) => ({
    id,
    label: genusLabel(id),
    count: allRaces.value.filter((r) => r.type === id).length,
  })),
])

function genusLabel(id: GenusId): string {
  return game.GENUS_DEFS[id]?.name ?? id
}

function basicAvailable(raceId: string): boolean {
  const def = game.RACES[raceId as keyof typeof game.RACES]
  if (!def) return false
  return def.basic(game.state)
}

function showTraits(raceId: string): Array<[string, number]> {
  const def = game.RACES[raceId as keyof typeof game.RACES]
  if (!def) return []
  return Object.entries(def.traits)
}

const currentSpecies = computed(() => game.state.race.species)
</script>

<template>
  <div class="races-panel">
    <PanelHeader icon="races" title="种族图鉴" subtitle="原版 60+ 种族数据库。当前游戏种族会高亮显示。" />

    <SegmentedTabs :items="genusTabItems" :active="activeGenus" @select="activeGenus = $event" />

    <div class="races-grid">
      <div
        v-for="r in filteredRaces"
        :key="r.id"
        :class="['race-card', { current: currentSpecies === r.id, locked: !basicAvailable(r.id) && currentSpecies !== r.id }]"
      >
        <div class="race-header">
          <span class="race-name">{{ r.name }}</span>
          <span class="race-genus">[{{ genusLabel(r.type) }}]</span>
          <span v-if="currentSpecies === r.id" class="current-badge">当前</span>
        </div>
        <p class="race-desc">{{ r.desc }}</p>
        <div class="race-meta">
          <span class="home">家园：{{ r.home }}</span>
        </div>
        <div class="race-traits">
          <span v-for="[t, rank] in showTraits(r.id)" :key="t" class="trait-chip">
            {{ t }}<span v-if="rank !== 1" class="rank">×{{ rank }}</span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.races-panel {
  max-width: 1100px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.races-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 8px;
}
.race-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 10px;
  transition: border-color 0.18s ease, background 0.18s ease, opacity 0.18s ease;
}
.race-card.current {
  border-color: var(--accent);
  background: var(--accent-glow);
}
.race-card.locked { opacity: 0.55; }

.race-header { display: flex; align-items: center; gap: 0.4rem; }
.race-name {
  font-weight: 700;
  color: var(--text-primary);
}
.race-genus {
  font-size: 10px;
  color: var(--text-muted);
}
.current-badge {
  margin-left: auto;
  border: 1px solid var(--accent);
  color: var(--accent);
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  font-size: 10px;
  font-weight: 700;
}
.race-desc {
  font-size: 11px;
  color: var(--text-secondary);
  margin: 5px 0;
}
.race-meta {
  font-size: 10px;
  color: var(--text-muted);
}

.race-traits {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 7px;
}
.trait-chip {
  background: var(--surface-pressed);
  color: var(--text-secondary);
  padding: 2px 6px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 10px;
}
.rank {
  color: var(--warning);
  margin-left: 0.2rem;
}
</style>
