<!--
  进化初始面板 (EvolutionPanel.vue)
  呈现开局第一阶段玩法，让玩家通过点击或挂机获取 RNA/DNA。
  当 RNA 和 DNA 储能填满时，可开启物种进化树与文明时代。
-->
<script setup lang="ts">
import { useGameStore } from '../stores/game'
import { ref } from 'vue'
import { getSpeciesTraitDescriptors } from '@evozen/game-core'

const game = useGameStore()

const speciesOptions = [
  {
    id: 'human',
    label: '人类',
    emoji: '🧑',
    traits: getSpeciesTraitDescriptors('human'),
  },
  {
    id: 'elven',
    label: '精灵',
    emoji: '🧝',
    traits: getSpeciesTraitDescriptors('elven'),
  },
  {
    id: 'orc',
    label: '兽人',
    emoji: '👹',
    traits: getSpeciesTraitDescriptors('orc'),
  },
  {
    id: 'dwarf',
    label: '矮人',
    emoji: '⛏️',
    traits: getSpeciesTraitDescriptors('dwarf'),
  },
  {
    id: 'goblin',
    label: '地精',
    emoji: '👺',
    traits: getSpeciesTraitDescriptors('goblin'),
  },
]

const selectedSpecies = ref('human')

function startEvolution() {
  const species = speciesOptions.find(s => s.id === selectedSpecies.value)
  game.startCivilization(species?.id ?? 'human')
}
</script>

<template>
  <div class="evo-panel animate-in">
    <div class="evo-title-section">
      <h2 class="evo-title">🧫 原始之汤</h2>
      <p class="evo-subtitle">你是宇宙中最初的一滴原生质。收集遗传物质，选择进化方向。</p>
    </div>

    <!-- 快速开始 -->
    <div class="quick-start-card">
      <div class="quick-start-header">
        <span class="quick-start-icon">⚡</span>
        <div>
          <h3 class="quick-start-title">快速开始</h3>
          <p class="quick-start-desc">跳过进化阶段，直接以人类身份开始文明。</p>
        </div>
      </div>
      <button class="btn primary quick-start-btn" @click="game.startCivilization('human')">
        🚀 直接开始游戏
      </button>
    </div>

    <div class="divider">
      <span class="divider-text">或者 · 体验完整进化流程</span>
    </div>

    <!-- 资源显示 -->
    <div class="evo-resources">
      <div class="evo-res-item">
        <div class="evo-res-header">
          <span class="evo-res-label">🔮 RNA</span>
          <span class="evo-res-value font-mono">
            {{ Math.floor(game.state.resource['RNA']?.amount ?? 0) }}
            / {{ game.state.resource['RNA']?.max ?? 100 }}
          </span>
        </div>
        <div class="progress-bar">
          <div
            class="fill"
            :style="{ width: ((game.state.resource['RNA']?.amount ?? 0) / (game.state.resource['RNA']?.max ?? 100) * 100) + '%' }"
            style="background: linear-gradient(90deg, #7c3aed, #a78bfa)"
          />
        </div>
        <button class="btn primary" style="margin-top: 8px; width: 100%" @click="game.gatherRNA()">
          收集 RNA
        </button>
      </div>

      <div class="evo-res-item">
        <div class="evo-res-header">
          <span class="evo-res-label">🧬 DNA</span>
          <span class="evo-res-value font-mono">
            {{ Math.floor(game.state.resource['DNA']?.amount ?? 0) }}
            / {{ game.state.resource['DNA']?.max ?? 100 }}
          </span>
        </div>
        <div class="progress-bar">
          <div
            class="fill"
            :style="{ width: ((game.state.resource['DNA']?.amount ?? 0) / (game.state.resource['DNA']?.max ?? 100) * 100) + '%' }"
            style="background: linear-gradient(90deg, #db2777, #f472b6)"
          />
        </div>
        <button
          class="btn"
          style="margin-top: 8px; width: 100%"
          :disabled="(game.state.resource['RNA']?.amount ?? 0) < 2"
          @click="game.formDNA()"
        >
          合成 DNA（消耗 2 RNA）
        </button>
      </div>
    </div>

    <!-- 种族选择 -->
    <div class="evo-species" v-if="(game.state.resource['DNA']?.amount ?? 0) >= 10">
      <h3>选择你的种族</h3>
      <div class="species-grid">
        <button
          v-for="sp in speciesOptions"
          :key="sp.id"
          class="species-card"
          :class="{ active: selectedSpecies === sp.id }"
          @click="selectedSpecies = sp.id"
        >
          <span class="species-emoji">{{ sp.emoji }}</span>
          <span class="species-name">{{ sp.label }}</span>
          <span class="species-traits">
            {{ sp.traits.map(t => t.label).join(' / ') }}
          </span>
          <span class="species-effect">
            {{ sp.traits.map(t => t.summary).join(' ') }}
          </span>
        </button>
      </div>
      <button
        class="btn primary"
        style="margin-top: 16px; width: 100%; padding: 12px"
        :disabled="(game.state.resource['DNA']?.amount ?? 0) < 10"
        @click="startEvolution()"
      >
        🚀 开始进化
      </button>
    </div>
  </div>
</template>

<style scoped>
.evo-panel {
  max-width: 500px;
  margin: 40px auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.evo-title-section {
  text-align: center;
}
.evo-title {
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(135deg, #a78bfa, #f472b6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 8px;
}
.evo-subtitle {
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.6;
}

.evo-resources {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.evo-res-item {
  padding: 16px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
}
.evo-res-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.evo-res-label {
  font-weight: 600;
  font-size: 15px;
}
.evo-res-value {
  font-size: 13px;
  color: var(--text-accent);
}

.evo-species {
  padding: 20px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  animation: fadeIn 0.4s ease;
}
.evo-species h3 {
  text-align: center;
  font-size: 16px;
  margin-bottom: 16px;
  color: var(--text-accent);
}

.species-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px;
}
.species-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  padding: 14px 12px;
  background: var(--bg-input);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s;
  color: var(--text-primary);
  font-family: var(--font-sans);
}
.species-card:hover {
  border-color: var(--border-hover);
  background: var(--bg-card-hover);
}
.species-card.active {
  border-color: var(--accent);
  background: var(--accent-glow);
  box-shadow: 0 0 12px var(--accent-glow);
}
.species-emoji {
  font-size: 28px;
}
.species-name {
  font-size: 13px;
  font-weight: 700;
}
.species-traits {
  font-size: 11px;
  color: var(--text-accent);
}
.species-effect {
  font-size: 10px;
  line-height: 1.4;
  color: var(--text-secondary);
  text-align: left;
}

@media (max-width: 640px) {
  .species-grid {
    grid-template-columns: 1fr;
  }

  .species-effect {
    display: none;
  }
}

/* 快速开始 */
.quick-start-card {
  padding: 20px;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(59, 130, 246, 0.08));
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.quick-start-header {
  display: flex;
  align-items: center;
  gap: 12px;
}
.quick-start-icon {
  font-size: 28px;
  flex-shrink: 0;
}
.quick-start-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-accent);
  margin: 0;
}
.quick-start-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 4px 0 0;
}
.quick-start-btn {
  width: 100%;
  padding: 12px;
  font-size: 15px;
  font-weight: 700;
}

/* 分割线 */
.divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 4px 0;
}
.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border-color);
}
.divider-text {
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
}
</style>
