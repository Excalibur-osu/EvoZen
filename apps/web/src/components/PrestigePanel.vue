<!--
  PrestigePanel — 转生面板
  显示所有可用转生类型 + 预估收益 + 触发按钮
-->
<script setup lang="ts">
import { useGameStore } from '../stores/game'
import { computed, ref } from 'vue'
import type { ResetType } from '@evozen/game-core'
import { UNIVERSES, type UniverseType, resetBlackhole } from '@evozen/game-core'

const game = useGameStore()

const selectedUniverse = ref<UniverseType>('standard')
const universeOptions = Object.values(UNIVERSES)

interface ResetInfo {
  type: ResetType
  name: string
  desc: string
  rewards: string
  icon: string
}

const allResets: ResetInfo[] = [
  { type: 'mad',        name: 'MAD 核灭',     icon: '☢️', desc: '触发相互毁灭，结束当前世代。',                          rewards: 'Plasmid（或 AntiPlasmid）' },
  { type: 'bioseed',    name: '生物播种',     icon: '🌱', desc: '将生命基因播种到新星球。',                              rewards: 'Plasmid + Phage' },
  { type: 'cataclysm',  name: '灾变',         icon: '🌋', desc: '不稳定行星地震，所有人迁徙至地下。',                    rewards: 'Plasmid + Phage（保留种族）' },
  { type: 'blackhole',  name: '黑洞',         icon: '🕳️', desc: '点燃黑洞引擎，缩成奇点重启宇宙。',                      rewards: 'Plasmid + Phage + Dark Energy' },
  { type: 'vacuum',     name: '真空坍塌',     icon: '💀', desc: '魔法虹吸过度，撕裂维度。',                              rewards: 'Plasmid + Phage + Dark Energy' },
  { type: 'ascend',     name: '飞升',         icon: '👼', desc: '飞升至高维，地质 +0.02。',                              rewards: 'Plasmid + Phage + Harmony' },
  { type: 'descend',    name: '堕落',         icon: '😈', desc: '与恶魔融合，下一世代 corruption=5。',                   rewards: 'Artifact' },
  { type: 'apotheosis', name: '神化',         icon: '🌟', desc: '伊甸园终局，触发神化转生。',                            rewards: 'Plasmid + Supercoiled' },
  { type: 'terraform',  name: '地球化',       icon: '🌍', desc: '改造新行星至宜居态。',                                  rewards: 'Plasmid + Phage + Harmony' },
  { type: 'aiApoc',     name: 'AI 末日',      icon: '🤖', desc: '人工智能觉醒并取代有机生命。',                          rewards: 'Plasmid + Phage + AI Core' },
  { type: 'matrix',     name: '矩阵',         icon: '💻', desc: '进入模拟矩阵世代。',                                    rewards: 'Plasmid + Phage' },
  { type: 'retire',     name: '退休',         icon: '🏝️', desc: '点燃气态巨星 + AI 完成，安享退休。',                    rewards: 'Plasmid + Phage + AI Core' },
  { type: 'eden',       name: '伊甸园',       icon: '🌳', desc: '完成伊甸园的终极目标。',                                rewards: 'Plasmid + Phage + Harmony' },
]

const availableResets = computed(() => allResets.filter((r) => game.canReset(r.type)))

function preview(type: ResetType) {
  return game.calcPrestigeGains(type)
}

function trigger(type: ResetType) {
  if (!confirm(`确定要触发"${type}"转生吗？当前世代将彻底重置。`)) return
  // 黑洞/真空可指定目标宇宙
  if (type === 'blackhole' || type === 'vacuum') {
    const newState = resetBlackhole(game.state, selectedUniverse.value)
    if (newState) {
      game.state = newState
    }
    return
  }
  game.triggerReset(type)
}

const currentPlasmid = computed(() => (game.state.prestige as Record<string, { count?: number }> | undefined)?.['Plasmid']?.count ?? 0)
const currentPhage = computed(() => (game.state.prestige as Record<string, { count?: number }> | undefined)?.['Phage']?.count ?? 0)
const currentDark = computed(() => (game.state.prestige as Record<string, { count?: number }> | undefined)?.['Dark']?.count ?? 0)
const currentHarmony = computed(() => (game.state.prestige as Record<string, { count?: number }> | undefined)?.['Harmony']?.count ?? 0)
const currentArtifact = computed(() => (game.state.prestige as Record<string, { count?: number }> | undefined)?.['Artifact']?.count ?? 0)
const currentSupercoiled = computed(() => (game.state.prestige as Record<string, { count?: number }> | undefined)?.['Supercoiled']?.count ?? 0)
</script>

<template>
  <div class="prestige-panel">
    <div class="title-section">
      <h2 class="title">♻️ 转生</h2>
      <p class="subtitle">选择一种结束方式，开启新世代并获得永久声望奖励。</p>
    </div>

    <div class="current-prestige">
      <div class="prestige-card"><span>Plasmid</span><span class="val">{{ Math.floor(currentPlasmid) }}</span></div>
      <div class="prestige-card"><span>Phage</span><span class="val">{{ Math.floor(currentPhage) }}</span></div>
      <div class="prestige-card"><span>Dark</span><span class="val">{{ currentDark.toFixed(3) }}</span></div>
      <div class="prestige-card"><span>Harmony</span><span class="val">{{ currentHarmony.toFixed(2) }}</span></div>
      <div class="prestige-card"><span>Artifact</span><span class="val">{{ Math.floor(currentArtifact) }}</span></div>
      <div class="prestige-card"><span>Supercoiled</span><span class="val">{{ Math.floor(currentSupercoiled) }}</span></div>
    </div>

    <!-- 真空坍塌警告（syphon ≥ 80）-->
    <div v-if="(game.state.tech['syphon'] ?? 0) >= 60" class="vacuum-warning">
      <h3>⚠️ 真空坍塌警告</h3>
      <p>
        魔法虹吸 (syphon) 等级：<strong>{{ game.state.tech['syphon'] }} / 80</strong>。
        <br>
        当达到 80 时，维度将崩溃，触发真空转生 — 获得大量 Plasmid + Phage + Dark Energy。
      </p>
      <p v-if="(game.state.tech['syphon'] ?? 0) >= 80" class="vacuum-imminent">
        🌀 维度即将崩溃！立即转生以获得收益。
      </p>
    </div>

    <!-- 宇宙选择（黑洞/真空转生时）-->
    <div class="universe-select" v-if="game.canReset('blackhole') || game.canReset('vacuum')">
      <h3 class="section-title">下个宇宙类型</h3>
      <select v-model="selectedUniverse">
        <option v-for="u in universeOptions" :key="u.id" :value="u.id">
          {{ u.name }} — {{ u.desc }}
        </option>
      </select>
    </div>

    <h3 class="section-title">可用的转生</h3>

    <div v-if="availableResets.length === 0" class="empty">
      <span>🔒 当前没有满足条件的转生选项。继续推进游戏进度。</span>
    </div>

    <div v-for="r in availableResets" :key="r.type" class="reset-card">
      <div class="reset-header">
        <span class="reset-icon">{{ r.icon }}</span>
        <span class="reset-name">{{ r.name }}</span>
        <button class="reset-btn" @click="trigger(r.type)">触发</button>
      </div>
      <p class="reset-desc">{{ r.desc }}</p>
      <p class="reset-rewards">奖励：{{ r.rewards }}</p>
      <div class="reset-preview">
        <span v-if="preview(r.type).plasmid > 0">Plasmid +{{ preview(r.type).plasmid }}</span>
        <span v-if="preview(r.type).phage > 0">Phage +{{ preview(r.type).phage }}</span>
        <span v-if="preview(r.type).dark > 0">Dark +{{ preview(r.type).dark }}</span>
        <span v-if="preview(r.type).harmony > 0">Harmony +{{ preview(r.type).harmony }}</span>
        <span v-if="preview(r.type).artifact > 0">Artifact +{{ preview(r.type).artifact }}</span>
        <span v-if="preview(r.type).supercoiled > 0">Supercoiled +{{ preview(r.type).supercoiled }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.prestige-panel { padding: 1rem; color: #e0e0e0; }
.title-section { margin-bottom: 1rem; }
.title { font-size: 1.3rem; color: #ff99cc; margin: 0 0 0.3rem; }
.subtitle { font-size: 0.85rem; color: #aaa; }

.current-prestige {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.4rem;
  margin-bottom: 1.5rem;
}
.prestige-card {
  background: rgba(255, 153, 204, 0.05);
  border: 1px solid #553344;
  padding: 0.5rem 0.7rem;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
}
.prestige-card .val {
  font-size: 1.1rem;
  font-weight: bold;
  color: #ff99cc;
}
.section-title { font-size: 1rem; color: #ff99cc; margin: 0.8rem 0 0.5rem; }
.empty { text-align: center; color: #888; padding: 2rem; font-style: italic; }

.vacuum-warning {
  background: rgba(140, 80, 200, 0.15);
  border: 1px solid #6633aa;
  border-radius: 6px;
  padding: 0.8rem 1rem;
  margin-bottom: 1rem;
}
.vacuum-warning h3 { color: #cc99ff; margin: 0 0 0.4rem; font-size: 1rem; }
.vacuum-warning p { font-size: 0.85rem; color: #ccc; margin: 0.2rem 0; }
.vacuum-imminent { color: #ff66ff !important; font-weight: bold; }
.universe-select { background: rgba(80,140,200,0.06); border: 1px solid #3a5588; padding: 0.6rem; border-radius: 4px; margin-bottom: 1rem; }
.universe-select select { width: 100%; background: #1a1f30; color: #ddd; border: 1px solid #3a5588; padding: 0.4rem; border-radius: 4px; }

.reset-card {
  background: #1a131a;
  border: 1px solid #3a2535;
  border-radius: 6px;
  padding: 0.8rem;
  margin-bottom: 0.6rem;
}
.reset-header { display: flex; align-items: center; gap: 0.5rem; }
.reset-icon { font-size: 1.4rem; }
.reset-name { font-weight: bold; color: #ff99cc; flex: 1; }
.reset-btn {
  background: #993366;
  color: #fff;
  border: none;
  padding: 0.4rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}
.reset-btn:hover { background: #bb4488; }
.reset-desc { font-size: 0.85rem; color: #ccc; margin: 0.4rem 0; }
.reset-rewards { font-size: 0.8rem; color: #aaa; }
.reset-preview {
  margin-top: 0.5rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.reset-preview span {
  background: #3a2535;
  padding: 0.2rem 0.6rem;
  border-radius: 10px;
  font-size: 0.78rem;
  color: #ff99cc;
}
</style>
