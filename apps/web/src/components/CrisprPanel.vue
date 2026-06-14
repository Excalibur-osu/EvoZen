<!--
  CrisprPanel — 基因强化（CRISPR）面板
-->
<script setup lang="ts">
import { useGameStore } from '../stores/game'
import { computed, ref } from 'vue'
import { CRISPR_UPGRADES, getCrisprLevel, canPurchaseCrispr, purchaseCrispr, isCrisprUnlocked, rollMinorTrait, getDiscoveredMinorTraits } from '@evozen/game-core'

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
    lastRolled.value = '抽取失败：Plasmid/Phage 不足或已发现全部'
  }
}
</script>

<template>
  <div class="crispr-panel">
    <h2 class="title">🧬 CRISPR 基因强化</h2>
    <p class="subtitle">用 Plasmid 永久强化基因 — 跨转生保留。</p>

    <div v-if="!unlocked" class="locked">
      <p>🔒 需研究 genetics 科技并至少拥有 1 个 Plasmid。</p>
    </div>

    <template v-else>
      <div class="prestige-row">
        <span class="pres">Plasmid: <strong>{{ Math.floor(plasmid) }}</strong></span>
        <span class="pres">Phage: <strong>{{ Math.floor(phage) }}</strong></span>
      </div>

      <!-- 抽取 Minor Trait -->
      <div class="roll-section">
        <h3>🎲 抽取 Minor Trait</h3>
        <p>用 25 Plasmid + 1 Phage 随机抽取一个 minor trait 加入基因池。</p>
        <p>已发现 ({{ discoveredMinor.length }}/13)：
          <span v-for="t in discoveredMinor" :key="t" class="minor-chip">{{ t }}</span>
        </p>
        <button class="roll-btn" @click="doRoll">抽取</button>
        <p v-if="lastRolled" class="roll-result">{{ lastRolled }}</p>
      </div>

      <div class="upgrade-list">
        <div v-for="upg in CRISPR_UPGRADES" :key="upg.id" class="upgrade-card">
          <div class="upg-head">
            <span class="upg-name">{{ upg.name }}</span>
            <span class="upg-level">Lv. {{ level(upg.id) }}/{{ upg.maxLevel ?? 5 }}</span>
          </div>
          <p class="upg-desc">{{ upg.desc }}</p>
          <div class="upg-buy">
            <span class="cost">
              {{ plasmidCost(upg.id) }} Plasmid
              <span v-if="phageCost(upg.id) > 0"> + {{ phageCost(upg.id) }} Phage</span>
            </span>
            <button class="buy-btn" :disabled="!canBuy(upg.id)" @click="buy(upg.id)">
              强化
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.crispr-panel { padding: 1rem; color: #e0e0e0; }
.title { font-size: 1.3rem; color: #ff77cc; margin: 0 0 0.3rem; }
.subtitle { font-size: 0.85rem; color: #aaa; margin-bottom: 1rem; }
.locked { text-align: center; padding: 2rem; color: #888; }

.prestige-row { display: flex; gap: 1rem; margin-bottom: 1rem; padding: 0.6rem; background: rgba(255,119,204,0.06); border: 1px solid #553344; border-radius: 4px; }
.pres { font-size: 0.9rem; color: #ccc; }
.pres strong { color: #ff77cc; margin-left: 0.3rem; }

.upgrade-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 0.5rem; }
.upgrade-card { background: #1f1318; border: 1px solid #3a2535; border-radius: 6px; padding: 0.7rem; }
.upg-head { display: flex; justify-content: space-between; }
.upg-name { font-weight: bold; color: #ff77cc; }
.upg-level { color: #aaa; font-size: 0.85rem; }
.upg-desc { font-size: 0.8rem; color: #ccc; margin: 0.3rem 0; }
.upg-buy { display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem; }
.cost { font-size: 0.85rem; color: #ffaa55; }
.buy-btn { background: #993366; color: #fff; border: none; padding: 0.3rem 0.8rem; border-radius: 4px; cursor: pointer; }
.buy-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.buy-btn:hover:not(:disabled) { background: #bb4488; }
.roll-section { background: rgba(255,170,85,0.06); border: 1px solid #886633; border-radius: 6px; padding: 0.8rem; margin-bottom: 1rem; }
.roll-section h3 { color: #ffaa55; margin: 0 0 0.4rem; font-size: 1rem; }
.roll-section p { font-size: 0.85rem; color: #ccc; margin: 0.3rem 0; }
.minor-chip { display: inline-block; background: #443322; color: #ffaa55; padding: 0.1rem 0.4rem; border-radius: 8px; font-size: 0.75rem; margin: 0.1rem; }
.roll-btn { background: #886633; color: #fff; border: none; padding: 0.4rem 1rem; border-radius: 4px; cursor: pointer; }
.roll-result { color: #ffaa55; font-weight: bold; }
</style>
