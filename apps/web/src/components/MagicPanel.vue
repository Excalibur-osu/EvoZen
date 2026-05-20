<!--
  MagicPanel — 魔法宇宙面板
  对标 legacy 中的 alchemy / rituals / astrology / clerics / shrine 等魔法机制
-->
<script setup lang="ts">
import { useGameStore } from '../stores/game'
import { computed } from 'vue'
import type { RitualType } from '@evozen/game-core'

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
    <div class="title-section">
      <h2 class="title">✨ 魔法</h2>
      <p class="subtitle">在魔法宇宙中使用魔力进行神秘运作。</p>
    </div>

    <div v-if="!isMagic" class="locked">
      <span>🔒 该面板仅在魔法宇宙中可用。</span>
    </div>

    <template v-else>
      <!-- Mana 状态 -->
      <div class="resource-card">
        <span class="res-label">魔力 (Mana)</span>
        <span class="res-value">{{ Math.floor(totalMana) }} / {{ Math.floor(maxMana) }}</span>
      </div>
      <div class="resource-card">
        <span class="res-label">水晶 (Crystal)</span>
        <span class="res-value">{{ Math.floor(totalCrystal) }}</span>
      </div>

      <!-- 占星 -->
      <div class="section">
        <h3 class="section-title">⭐ 今日星座</h3>
        <div class="zodiac-card">
          <span class="zodiac-name">{{ zodiac }}</span>
          <span class="zodiac-effect">效果：[{{ zodiacEffect.join(', ') }}]</span>
        </div>
      </div>

      <!-- 仪式 -->
      <div class="section">
        <h3 class="section-title">🔮 仪式</h3>
        <p class="hint">使用 Mana 增强各类岗位产出（每次 +1 消耗 1 Mana，可累加）。</p>
        <div class="rituals-grid">
          <div v-for="r in ritualOptions" :key="r.id" class="ritual-row">
            <span class="ritual-label">{{ r.label }}</span>
            <button class="ritual-btn" @click="setRitual(r.id, -1)">−</button>
            <span class="ritual-level">{{ ritualLevels[r.id] ?? 0 }}</span>
            <button class="ritual-btn" @click="setRitual(r.id, 1)">+</button>
          </div>
        </div>
        <button class="cancel-all" @click="cancelAll">取消所有仪式</button>
      </div>

      <!-- 炼金 -->
      <div class="section">
        <h3 class="section-title">🧪 炼金术</h3>
        <p class="hint">炼金当前分配：</p>
        <div class="alchemy-list">
          <div
            v-for="(amount, res) in alchemyMap"
            :key="res"
            class="alchemy-item"
          >
            <span>{{ res }}</span>
            <span class="alchemy-amt">×{{ amount }}</span>
          </div>
          <div v-if="Object.keys(alchemyMap).length === 0" class="empty-hint">
            尚未解锁炼金术（需研究 magic Lv.3+）。
          </div>
        </div>
      </div>

      <!-- 法术 -->
      <div class="section">
        <h3 class="section-title">🪄 法术</h3>
        <button
          class="spell-btn"
          :disabled="!conjuringUnlocked"
          @click="castFood"
        >
          召唤食物（2 Mana + 5 Crystal）
        </button>
        <button
          class="spell-btn"
          @click="castShrine"
        >
          建造神龛（需满月，Stone 50K + Cement 25K）
        </button>
        <p class="shrine-status">当前神龛数：{{ shrineCount }}</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.magic-panel { padding: 1rem; color: #e0e0e0; }
.title-section { margin-bottom: 1rem; }
.title { font-size: 1.3rem; color: #ee99ff; margin: 0 0 0.3rem; }
.subtitle { font-size: 0.85rem; color: #aaa; }

.locked {
  text-align: center;
  color: #888;
  padding: 2rem;
  font-style: italic;
}

.resource-card {
  display: flex;
  justify-content: space-between;
  background: #1a1325;
  padding: 0.5rem 0.8rem;
  border-radius: 4px;
  margin-bottom: 0.4rem;
  border: 1px solid #443355;
}
.res-label { color: #aaa; font-size: 0.85rem; }
.res-value { font-weight: bold; color: #cc99ff; }

.section { margin-top: 1.2rem; }
.section-title { font-size: 1rem; color: #ee99ff; margin: 0 0 0.5rem; }
.hint { font-size: 0.8rem; color: #888; margin-bottom: 0.5rem; }

.zodiac-card {
  background: #1f1530;
  border: 1px solid #663388;
  border-radius: 6px;
  padding: 0.8rem;
}
.zodiac-name { font-size: 1.2rem; font-weight: bold; color: #cc99ff; text-transform: capitalize; }
.zodiac-effect { display: block; font-size: 0.85rem; color: #aaa; margin-top: 0.3rem; }

.rituals-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.4rem;
  margin-bottom: 0.5rem;
}
.ritual-row {
  display: flex;
  align-items: center;
  background: #2a1f3a;
  border-radius: 4px;
  padding: 0.4rem 0.6rem;
}
.ritual-label { flex: 1; font-size: 0.85rem; }
.ritual-btn {
  width: 24px;
  height: 24px;
  background: #553388;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.ritual-btn:hover { background: #7733aa; }
.ritual-level { min-width: 30px; text-align: center; font-weight: bold; color: #cc99ff; }
.cancel-all {
  background: #553333;
  color: #fff;
  border: none;
  padding: 0.4rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
}

.alchemy-list { font-size: 0.85rem; }
.alchemy-item {
  display: inline-block;
  background: #2a1f3a;
  padding: 0.2rem 0.6rem;
  margin: 0.1rem;
  border-radius: 12px;
}
.alchemy-amt { color: #99ccff; margin-left: 0.3rem; }
.empty-hint { color: #888; font-style: italic; padding: 0.5rem; }

.spell-btn {
  background: #663388;
  color: #fff;
  border: none;
  padding: 0.4rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  margin-right: 0.4rem;
  margin-bottom: 0.3rem;
}
.spell-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.spell-btn:hover:not(:disabled) { background: #7744aa; }
.shrine-status { color: #aaa; font-size: 0.85rem; margin-top: 0.3rem; }
</style>
