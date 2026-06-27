<!--
  MagicPanel — 魔法宇宙面板
  对标 legacy 中的 alchemy / rituals / astrology / clerics / shrine 等魔法机制
-->
<script setup lang="ts">
import { useGameStore } from '../stores/game'
import { computed } from 'vue'
import type { RitualType } from '@evozen/game-core'
import PanelHeader from './ui/PanelHeader.vue'
import EmptyState from './ui/EmptyState.vue'
import MetricCard from './ui/MetricCard.vue'
import AllocationControl from './ui/AllocationControl.vue'
import { getResourceName } from '../utils/resourceNames'

const game = useGameStore()

const isMagic = computed(() => game.isMagicUniverse)

const ritualLevels = computed(() => {
  const casting = game.state.race['casting'] as Record<string, number> | undefined
  return casting ?? {}
})

const totalMana = computed(() => game.state.resource['Mana']?.amount ?? 0)
const maxMana = computed(() => game.state.resource['Mana']?.max ?? 0)
const totalCrystal = computed(() => game.state.resource['Crystal']?.amount ?? 0)

const zodiac = computed(() => game.currentZodiac)
const zodiacEffect = computed(() => game.zodiacEffect())

const ritualOptions: { id: RitualType; label: string }[] = [
  { id: 'farmer', label: '农夫' },
  { id: 'miner', label: '矿工' },
  { id: 'lumberjack', label: '伐木' },
  { id: 'science', label: '科学' },
  { id: 'factory', label: '工厂' },
  { id: 'army', label: '士兵' },
  { id: 'hunting', label: '狩猎' },
  { id: 'crafting', label: '工艺' },
]

function setRitual(ritual: RitualType, delta: number) {
  const current = (ritualLevels.value[ritual] ?? 0) + delta
  if (current < 0) return
  game.setRitualPower(ritual, current)
}

const alchemyMap = computed(() => {
  return (game.state.race['alchemy'] as Record<string, number> | undefined) ?? {}
})

const conjuringUnlocked = computed(() => (game.state.tech['conjuring'] ?? 0) >= 1)
const shrineCount = computed(() => {
  const shrine = game.state.city['shrine'] as { count?: number } | undefined
  return shrine?.count ?? 0
})

function castFood() { game.conjureFood() }
function castShrine() { game.buildShrine() }
function cancelAll() { game.cancelRituals() }
</script>

<template>
  <div class="magic-panel">
    <PanelHeader icon="magic" title="魔法" subtitle="在魔法宇宙中使用魔力进行神秘运作。" />

    <EmptyState v-if="!isMagic" text="该面板仅在魔法宇宙中可用。" icon="lock" />

    <template v-else>
      <!-- 魔力状态 -->
      <div class="magic-metrics">
        <MetricCard label="魔力" :value="`${Math.floor(totalMana)} / ${Math.floor(maxMana)}`" tone="accent" />
        <MetricCard label="水晶" :value="Math.floor(totalCrystal)" />
      </div>

      <!-- 占星 -->
      <section class="section card">
        <h3 class="section-title">今日星座</h3>
        <div class="zodiac-card">
          <span class="zodiac-name">{{ zodiac }}</span>
          <span class="zodiac-effect">效果：[{{ zodiacEffect.join(', ') }}]</span>
        </div>
      </section>

      <!-- 仪式 -->
      <section class="section card">
        <h3 class="section-title">仪式</h3>
        <p class="hint">使用魔力增强各类岗位产出（每次 +1 消耗 1 魔力，可累加）。</p>
        <div class="rituals-grid">
          <div v-for="r in ritualOptions" :key="r.id" class="ritual-row card">
            <span class="ritual-label">{{ r.label }}</span>
            <AllocationControl
              :value="ritualLevels[r.id] ?? 0"
              :decrement-disabled="(ritualLevels[r.id] ?? 0) <= 0"
              :increment-disabled="totalMana < 1"
              decrement-label="减少仪式强度"
              increment-label="增加仪式强度"
              @decrement="setRitual(r.id, -1)"
              @increment="setRitual(r.id, 1)"
            />
          </div>
        </div>
        <button class="cancel-all btn danger" @click="cancelAll">取消所有仪式</button>
      </section>

      <!-- 炼金 -->
      <section class="section card">
        <h3 class="section-title">炼金术</h3>
        <p class="hint">炼金当前分配：</p>
        <div class="alchemy-list">
          <div
            v-for="(amount, res) in alchemyMap"
            :key="res"
            class="alchemy-item"
          >
            <span>{{ getResourceName(String(res)) }}</span>
            <span class="alchemy-amt">×{{ amount }}</span>
          </div>
          <EmptyState v-if="Object.keys(alchemyMap).length === 0" text="尚未解锁炼金术（需研究魔法 3 级）。" icon="lock" />
        </div>
      </section>

      <!-- 法术 -->
      <section class="section card">
        <h3 class="section-title">法术</h3>
        <button
          class="spell-btn btn primary"
          :disabled="!conjuringUnlocked"
          @click="castFood"
        >
          召唤食物（2 魔力 + 5 水晶）
        </button>
        <button
          class="spell-btn btn primary"
          @click="castShrine"
        >
          建造神龛（需满月，石头 50K + 水泥 25K）
        </button>
        <p class="shrine-status">当前神龛数：{{ shrineCount }}</p>
      </section>
    </template>
  </div>
</template>

<style scoped>
.magic-panel { display: flex; flex-direction: column; gap: 10px; }
.magic-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 8px;
}

.section { padding: 10px; }
.section-title { font-size: 13px; color: var(--text-primary); margin: 0 0 6px; }
.hint { font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.5rem; }

.zodiac-card {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.zodiac-name { font-size: 1rem; font-weight: 700; color: var(--accent); text-transform: capitalize; }
.zodiac-effect { display: block; font-size: 0.85rem; color: var(--text-secondary); }

.rituals-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.4rem;
  margin-bottom: 0.5rem;
}
.ritual-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0.4rem 0.6rem;
}
.ritual-label { flex: 1; font-size: 0.85rem; }

.alchemy-list { font-size: 0.85rem; }
.alchemy-item {
  display: inline-block;
  background: var(--surface-pressed);
  padding: 0.2rem 0.6rem;
  margin: 0.1rem;
  border-radius: var(--radius-sm);
}
.alchemy-amt { color: var(--accent); margin-left: 0.3rem; }
.spell-btn { margin-right: 0.4rem; margin-bottom: 0.3rem; }
.shrine-status { color: var(--text-secondary); font-size: 0.85rem; margin-top: 0.3rem; }
</style>
