<!--
  CrisprPanel — 基因强化（CRISPR）面板
-->
<script setup lang="ts">
import { useGameStore } from '../stores/game'
import { computed, ref } from 'vue'
import { CRISPR_UPGRADES, getCrisprLevel, canPurchaseCrispr, purchaseCrispr, isCrisprUnlocked, rollMinorTrait, getDiscoveredMinorTraits } from '@evozen/game-core'
import PanelHeader from './ui/PanelHeader.vue'
import EmptyState from './ui/EmptyState.vue'
import MetricCard from './ui/MetricCard.vue'

const game = useGameStore()

const unlocked = computed(() => isCrisprUnlocked(game.state))
const plasmid = computed(() => (game.state.prestige as Record<string, { count?: number }>)?.['Plasmid']?.count ?? 0)
const phage = computed(() => (game.state.prestige as Record<string, { count?: number }>)?.['Phage']?.count ?? 0)

function level(id: string) { return getCrisprLevel(game.state, id) }
function canBuy(id: string) { return canPurchaseCrispr(game.state, id) }
function buy(id: string) {
  if (purchaseCrispr(game.state, id)) {
    // 触发响应式更新
    game.state.prestige = { ...game.state.prestige } as typeof game.state.prestige
    game.state.genes = { ...game.state.genes }
    game.state.race = { ...game.state.race }
  }
}
function plasmidCost(id: string) {
  const u = CRISPR_UPGRADES.find((x) => x.id === id)
  if (!u) return 0
  return u.plasmidCost(level(id))
}
function phageCost(id: string) {
  const u = CRISPR_UPGRADES.find((x) => x.id === id)
  if (!u || !u.phageCost) return 0
  return u.phageCost(level(id))
}

const discoveredMinor = computed(() => getDiscoveredMinorTraits(game.state))
const lastRolled = ref<string | null>(null)
function doRoll() {
  const result = rollMinorTrait(game.state)
  if (result) {
    lastRolled.value = result
  } else {
    lastRolled.value = '抽取失败：质粒/噬菌体不足或已发现全部'
  }
}
</script>

<template>
  <div class="crispr-panel">
    <PanelHeader icon="crispr" title="CRISPR 基因强化" subtitle="用质粒永久强化基因，跨转生保留。" />

    <EmptyState v-if="!unlocked" text="需研究遗传学科技并至少拥有 1 个质粒。" icon="lock" />

    <template v-else>
      <div class="prestige-row">
        <MetricCard label="质粒" :value="Math.floor(plasmid)" tone="accent" />
        <MetricCard label="噬菌体" :value="Math.floor(phage)" />
      </div>

      <!-- 抽取次要特质 -->
      <div class="roll-section card">
        <h3 class="section-title">抽取次要特质</h3>
        <p>用 25 质粒 + 1 噬菌体随机抽取一个次要特质加入基因池。</p>
        <p>已发现 ({{ discoveredMinor.length }}/13)：
          <span v-for="t in discoveredMinor" :key="t" class="minor-chip">{{ t }}</span>
        </p>
        <button class="roll-btn btn primary" @click="doRoll">抽取</button>
        <p v-if="lastRolled" class="roll-result">{{ lastRolled }}</p>
      </div>

      <div class="upgrade-list">
        <div v-for="upg in CRISPR_UPGRADES" :key="upg.id" class="upgrade-card card">
          <div class="upg-head">
            <span class="upg-name">{{ upg.name }}</span>
            <span class="upg-level">Lv. {{ level(upg.id) }}/{{ upg.maxLevel ?? 5 }}</span>
          </div>
          <p class="upg-desc">{{ upg.desc }}</p>
          <div class="upg-buy">
            <span class="cost">
              {{ plasmidCost(upg.id) }} 质粒
              <span v-if="phageCost(upg.id) > 0"> + {{ phageCost(upg.id) }} 噬菌体</span>
            </span>
            <button class="buy-btn btn primary sm" :disabled="!canBuy(upg.id)" @click="buy(upg.id)">
              强化
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.crispr-panel { display: flex; flex-direction: column; gap: 10px; }

.prestige-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; }

.upgrade-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 0.5rem; }
.upgrade-card { padding: 10px; }
.upg-head { display: flex; justify-content: space-between; }
.upg-name { font-weight: 700; color: var(--text-primary); }
.upg-level { color: var(--text-secondary); font-size: 0.85rem; }
.upg-desc { font-size: 0.8rem; color: var(--text-secondary); margin: 0.3rem 0; }
.upg-buy { display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem; }
.cost { font-size: 0.85rem; color: var(--warning); }
.roll-section { padding: 10px; }
.section-title { font-size: 13px; color: var(--text-primary); margin: 0 0 6px; }
.roll-section p { font-size: 0.85rem; color: var(--text-secondary); margin: 0.3rem 0; }
.minor-chip { display: inline-block; background: var(--surface-pressed); color: var(--warning); padding: 0.1rem 0.4rem; border-radius: var(--radius-sm); font-size: 0.75rem; margin: 0.1rem; }
.roll-result { color: var(--warning); font-weight: 700; }
</style>
