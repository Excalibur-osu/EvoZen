<script setup lang="ts">
import { computed } from 'vue'
import { canBuildSeasonalFirework, getFireworkRegion, getSolsticeThermiteGoal, isSeasonalEventActive } from '@evozen/game-core'
import { useGameStore } from '../stores/game'
import AppIcon from './ui/AppIcon.vue'

const game = useGameStore()
const summerActive = computed(() => isSeasonalEventActive(game.state, 'summer'))
const fireworkActive = computed(() => isSeasonalEventActive(game.state, 'firework'))
const thermiteGoal = computed(() => getSolsticeThermiteGoal(game.state))
const thermite = computed(() => game.state.resource['Thermite']?.amount ?? 0)
const firework = computed(() => {
  const bucket = getFireworkRegion(game.state) === 'space' ? game.state.space : game.state.city
  return bucket['firework'] as { count?: number; on?: number } | undefined
})
const canBuildFirework = computed(() => canBuildSeasonalFirework(game.state))
</script>

<template>
  <section v-if="summerActive || fireworkActive" class="seasonal-events">
    <div class="section-header">
      <AppIcon name="achievement" class="section-icon" />
      <span class="section-title">季节活动</span>
    </div>
    <div v-if="summerActive" class="event-row">
      <div>
        <strong>夏至篝火</strong>
        <p>铝热剂 {{ Math.floor(thermite).toLocaleString() }} / {{ thermiteGoal.toLocaleString() }}</p>
      </div>
    </div>
    <div v-if="fireworkActive" class="event-row">
      <div>
        <strong>烟花狂欢</strong>
        <p v-if="(firework?.count ?? 0) < 1">金币 50,000 · 铁 7,500 · 水泥 10,000</p>
        <p v-else>{{ (firework?.on ?? 0) > 0 ? '表演进行中' : '烟花厂已停用' }}</p>
      </div>
      <button v-if="(firework?.count ?? 0) < 1" class="btn primary sm" :disabled="!canBuildFirework" @click="game.buildSeasonalFirework()">建造</button>
      <button v-else class="btn secondary sm" @click="game.setSeasonalFireworkActive((firework?.on ?? 0) < 1)">
        {{ (firework?.on ?? 0) > 0 ? '停用' : '开启' }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.seasonal-events { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
.section-header { display: flex; align-items: center; gap: 8px; padding-bottom: 8px; border-bottom: 1px solid var(--border-color); }
.section-icon { width: 14px; height: 14px; color: var(--accent); }
.section-title { font-size: 13px; font-weight: 600; }
.event-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border-color); }
.event-row strong { font-size: 13px; }
.event-row p { margin: 3px 0 0; color: var(--text-secondary); font-size: 12px; }
</style>
