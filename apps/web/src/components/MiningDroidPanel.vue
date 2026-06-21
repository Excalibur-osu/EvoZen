<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import { getResourceName } from '../utils/resourceNames'
import type { MiningDroidTargetId } from '@evozen/game-core'
import AppIcon from './ui/AppIcon.vue'
import AllocationControl from './ui/AllocationControl.vue'

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
      <AppIcon name="mining" class="section-icon" />
      <span>采矿无人机分配</span>
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
        <AllocationControl
          :value="assigned(target.id)"
          :decrement-disabled="assigned(target.id) <= 0"
          :increment-disabled="totalAssigned >= totalDroids"
          decrement-label="减少采矿分配"
          increment-label="增加采矿分配"
          @decrement="game.removeMiningDroid(target.id)"
          @increment="game.assignMiningDroid(target.id)"
        />
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
.section-icon {
  width: 16px;
  height: 16px;
  flex: 0 0 auto;
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
  border-radius: var(--radius-md);
  background: var(--bg-card);
  border: 1px solid var(--border-color);
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

</style>
