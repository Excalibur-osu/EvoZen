<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import { getResourceName } from '../utils/resourceNames'
import type { MiningDroidTargetId } from '@evozen/game-core'

const game = useGameStore()

const droidState = computed(() => {
  const droid = game.state.interstellar['mining_droid'] as {
    count?: number
    on?: number
    adam?: number
    uran?: number
    coal?: number
    alum?: number
  } | undefined
  return droid
})

const totalDroids = computed(() => droidState.value?.on ?? droidState.value?.count ?? 0)
const isUnlocked = computed(() => (droidState.value?.count ?? 0) > 0)

const targets: Array<{
  id: MiningDroidTargetId
  name: string
  desc: string
}> = [
  { id: 'adam', name: getResourceName('Adamantite'), desc: '开采精金' },
  { id: 'uran', name: getResourceName('Uranium'), desc: '开采铀矿' },
  { id: 'coal', name: getResourceName('Coal'), desc: '开采煤炭' },
  { id: 'alum', name: getResourceName('Aluminium'), desc: '开采铝矿' },
]

const totalAssigned = computed(() => {
  if (!droidState.value) return 0
  return targets.reduce((sum, t) => sum + (droidState.value?.[t.id] ?? 0), 0)
})

function assigned(targetId: MiningDroidTargetId): number {
  return droidState.value?.[targetId] ?? 0
}
</script>

<template>
  <div v-if="isUnlocked" class="droid-panel">
    <h3 class="section-title">
      <span class="icon">🛸</span> 采矿无人机分配
      <span class="subtitle">分配: {{ totalAssigned }}/{{ totalDroids }}</span>
    </h3>

    <div class="droid-grid">
      <article
        v-for="target in targets"
        :key="target.id"
        class="droid-card"
      >
        <div class="droid-head">
          <span class="droid-name">{{ target.name }}</span>
          <span class="droid-meta">{{ assigned(target.id) }}</span>
        </div>
        <p class="droid-desc">{{ target.desc }}</p>
        <div class="controls">
          <button
            class="btn-minus"
            :disabled="assigned(target.id) <= 0"
            @click="game.removeMiningDroid(target.id)"
          >
            -
          </button>
          <span class="val">{{ assigned(target.id) }}</span>
          <button
            class="btn-plus"
            :disabled="totalAssigned >= totalDroids"
            @click="game.assignMiningDroid(target.id)"
          >
            +
          </button>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.droid-panel {
  margin-top: 16px;
  margin-bottom: 16px;
}

.section-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-accent);
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.subtitle {
  margin-left: auto;
  font-size: 12px;
  font-weight: 400;
  color: var(--text-secondary);
}

.droid-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.droid-card {
  padding: 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.07);
}

.droid-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.droid-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
}

.droid-meta {
  font-size: 12px;
  color: var(--text-accent);
  font-family: var(--font-mono);
}

.droid-desc {
  margin: 8px 0 10px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-secondary);
}

.controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-minus,
.btn-plus {
  width: 24px;
  height: 24px;
  border: 1px solid var(--border-color);
  background: rgba(255,255,255,0.05);
  color: var(--text-primary);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.btn-minus:disabled,
.btn-plus:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.val {
  min-width: 20px;
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}
</style>
