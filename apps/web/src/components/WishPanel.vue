<script setup lang="ts">
import { computed, ref } from 'vue'
import { castGreatnessWish, getWishStats, isMajorWishReady, type GreatnessWishResult } from '@evozen/game-core'
import { useGameStore } from '../stores/game'
import EmptyState from './ui/EmptyState.vue'
import PanelHeader from './ui/PanelHeader.vue'

const game = useGameStore()
const stats = computed(() => getWishStats(game.state))
const ready = computed(() => isMajorWishReady(game.state))
const result = ref<GreatnessWishResult | null>(null)

const resultLabel = computed(() => {
  if (!result.value) return ''
  if (result.value.type === 'feat') return result.value.unlocked ? '功绩“许愿”已经实现。' : '愿望回响消散了。'
  if (result.value.type === 'no_wonder') return '没有可由愿望创造的新奇观。'
  const names = { lighthouse: '神奇灯塔', pyramid: '神奇金字塔', statue: '神奇雕像', gardens: '神奇花园' }
  return `${names[result.value.wonder]}已凭空出现。`
})

function castGreatness() {
  const outcome = castGreatnessWish(game.state)
  if (!outcome) return
  result.value = outcome
  game.state.race = { ...game.state.race }
  game.state.stats = { ...game.state.stats }
  game.state.city = { ...game.state.city }
  game.state.space = { ...game.state.space }
  game.state.interstellar = { ...game.state.interstellar }
  game.state.portal = { ...game.state.portal }
}
</script>

<template>
  <div class="wish-panel">
    <PanelHeader icon="magic" title="愿望" subtitle="神灯精灵的超自然能力。" />
    <EmptyState v-if="(game.state.tech['wish'] ?? 0) < 2" icon="lock" text="研究高级愿望后可追求伟大。" />
    <section v-else class="wish-section">
      <div class="wish-heading">
        <div>
          <h3>高级愿望</h3>
          <p>冷却 {{ Math.ceil(stats?.major ?? 0) }}</p>
        </div>
        <span class="wish-status" :class="{ ready }">{{ ready ? '可用' : '恢复中' }}</span>
      </div>
      <button class="btn primary" :disabled="!ready" @click="castGreatness">追求伟大</button>
      <p v-if="resultLabel" class="wish-result">{{ resultLabel }}</p>
    </section>
  </div>
</template>

<style scoped>
.wish-panel { display: flex; flex-direction: column; gap: 10px; }
.wish-section { padding: 12px 0; border-top: 1px solid var(--border-subtle); border-bottom: 1px solid var(--border-subtle); display: flex; flex-direction: column; align-items: flex-start; gap: 10px; }
.wish-heading { width: 100%; display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.wish-heading h3 { margin: 0; color: var(--text-primary); font-size: 14px; }
.wish-heading p { margin: 3px 0 0; color: var(--text-secondary); font-size: 12px; }
.wish-status { padding: 3px 8px; border-radius: var(--radius-sm); background: var(--bg-input); color: var(--text-muted); font-size: 11px; font-weight: 700; }
.wish-status.ready { background: var(--success-glow); color: var(--success); }
.wish-result { margin: 0; color: var(--warning); font-size: 12px; font-weight: 700; }
</style>
