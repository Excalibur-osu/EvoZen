<!--
  RacesPanel — 种族图鉴
  展示所有 60+ 原版种族及其 genus、trait、解锁条件
-->
<script setup lang="ts">
import { useGameStore } from '../stores/game'
import { computed, ref } from 'vue'
import type { GenusId } from '@evozen/game-core'

const game = useGameStore()

const genusOptions = computed<GenusId[]>(() => Object.keys(game.GENUS_DEFS) as GenusId[])
const activeGenus = ref<GenusId | 'all'>('all')

const allRaces = computed(() => Object.values(game.RACES))

const filteredRaces = computed(() => {
  if (activeGenus.value === 'all') return allRaces.value
  return allRaces.value.filter((r) => r.type === activeGenus.value)
})

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
    <div class="title-section">
      <h2 class="title">🧬 种族图鉴</h2>
      <p class="subtitle">原版 60+ 种族数据库。当前游戏种族会高亮显示。</p>
    </div>

    <div class="genus-tabs">
      <button
        :class="['tab', { active: activeGenus === 'all' }]"
        @click="activeGenus = 'all'"
      >全部 ({{ allRaces.length }})</button>
      <button
        v-for="g in genusOptions"
        :key="g"
        :class="['tab', { active: activeGenus === g }]"
        @click="activeGenus = g"
      >{{ genusLabel(g) }}</button>
    </div>

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
.races-panel { padding: 1rem; color: #e0e0e0; }
.title-section { margin-bottom: 1rem; }
.title { font-size: 1.3rem; color: #66ff99; margin: 0 0 0.3rem; }
.subtitle { font-size: 0.85rem; color: #aaa; }

.genus-tabs {
  display: flex;
  gap: 0.3rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}
.tab {
  background: #1a2a1f;
  color: #ddd;
  border: 1px solid #335544;
  padding: 0.3rem 0.7rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
}
.tab.active {
  background: #335544;
  color: #66ff99;
  border-color: #66ff99;
}

.races-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 0.6rem;
}
.race-card {
  background: #131a14;
  border: 1px solid #2a3a2a;
  border-radius: 6px;
  padding: 0.7rem;
}
.race-card.current {
  border-color: #66ff99;
  background: rgba(102, 255, 153, 0.06);
}
.race-card.locked { opacity: 0.55; }

.race-header { display: flex; align-items: center; gap: 0.4rem; }
.race-name { font-weight: bold; color: #66ff99; }
.race-genus { font-size: 0.8rem; color: #aaa; }
.current-badge {
  margin-left: auto;
  background: #4caa66;
  color: #fff;
  padding: 0.1rem 0.5rem;
  border-radius: 12px;
  font-size: 0.7rem;
}
.race-desc { font-size: 0.8rem; color: #ccc; margin: 0.3rem 0; }
.race-meta { font-size: 0.75rem; color: #888; }

.race-traits {
  display: flex;
  flex-wrap: wrap;
  gap: 0.2rem;
  margin-top: 0.4rem;
}
.trait-chip {
  background: #2a3a2a;
  color: #aaffcc;
  padding: 0.15rem 0.5rem;
  border-radius: 10px;
  font-size: 0.72rem;
}
.rank {
  color: #ffaa55;
  margin-left: 0.2rem;
}
</style>
