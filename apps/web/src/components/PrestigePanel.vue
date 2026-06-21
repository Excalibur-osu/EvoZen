<!--
  PrestigePanel — 转生面板
  显示所有可用转生类型 + 预估收益 + 触发按钮
-->
<script setup lang="ts">
import { useGameStore } from '../stores/game'
import { computed, ref } from 'vue'
import type { ResetType } from '@evozen/game-core'
import { UNIVERSES, type UniverseType } from '@evozen/game-core'
import PanelHeader from './ui/PanelHeader.vue'
import EmptyState from './ui/EmptyState.vue'
import MetricCard from './ui/MetricCard.vue'
import { useConfirmDialog } from '../utils/confirm-dialog'
import AppIcon from './ui/AppIcon.vue'
import type { IconName } from './ui/app-icons'

const game = useGameStore()
const { confirm } = useConfirmDialog()

const selectedUniverse = ref<UniverseType>('standard')
const universeOptions = Object.values(UNIVERSES)

interface ResetInfo {
  type: ResetType
  name: string
  desc: string
  rewards: string
  icon: IconName
}

const allResets: ResetInfo[] = [
  { type: 'mad',        name: 'MAD 核灭',     icon: 'madReset', desc: '触发相互毁灭，结束当前世代。',                          rewards: 'Plasmid（或 AntiPlasmid）' },
  { type: 'bioseed',    name: '生物播种',     icon: 'bioseedReset', desc: '将生命基因播种到新星球。',                              rewards: 'Plasmid + Phage' },
  { type: 'cataclysm',  name: '灾变',         icon: 'cataclysmReset', desc: '不稳定行星地震，所有人迁徙至地下。',                    rewards: 'Plasmid + Phage（保留种族）' },
  { type: 'blackhole',  name: '黑洞',         icon: 'blackholeReset', desc: '点燃黑洞引擎，缩成奇点重启宇宙。',                      rewards: 'Plasmid + Phage + Dark Energy' },
  { type: 'vacuum',     name: '真空坍塌',     icon: 'vacuumReset', desc: '魔法虹吸过度，撕裂维度。',                              rewards: 'Plasmid + Phage + Dark Energy' },
  { type: 'ascend',     name: '飞升',         icon: 'cloudReset', desc: '飞升至高维，地质 +0.02。',                              rewards: 'Plasmid + Phage + Harmony' },
  { type: 'descend',    name: '堕落',         icon: 'descendReset', desc: '与恶魔融合，下一世代 corruption=5。',                   rewards: 'Artifact' },
  { type: 'apotheosis', name: '神化',         icon: 'edenic', desc: '伊甸园终局，触发神化转生。',                            rewards: 'Plasmid + Supercoiled' },
  { type: 'terraform',  name: '地球化',       icon: 'terraformReset', desc: '改造新行星至宜居态。',                                  rewards: 'Plasmid + Phage + Harmony' },
  { type: 'aiApoc',     name: 'AI 末日',      icon: 'mech', desc: '人工智能觉醒并取代有机生命。',                          rewards: 'Plasmid + Phage + AI Core' },
  { type: 'matrix',     name: '矩阵',         icon: 'matrixReset', desc: '进入模拟矩阵世代。',                                    rewards: 'Plasmid + Phage' },
  { type: 'retire',     name: '退休',         icon: 'retireReset', desc: '点燃气态巨星 + AI 完成，安享退休。',                    rewards: 'Plasmid + Phage + AI Core' },
  { type: 'eden',       name: '伊甸园',       icon: 'edenReset', desc: '完成伊甸园的终极目标。',                                rewards: 'Plasmid + Phage + Harmony' },
]

const availableResets = computed(() => allResets.filter((r) => game.canReset(r.type)))

function preview(type: ResetType) {
  return game.calcPrestigeGains(type)
}

async function trigger(type: ResetType) {
  const ok = await confirm({
    title: '确认转生',
    message: `确定要触发“${type}”转生吗？当前世代将彻底重置。`,
    confirmLabel: '触发转生',
    tone: 'danger',
  })
  if (!ok) return
  if (type === 'blackhole') {
    game.triggerReset(type, { targetUniverse: selectedUniverse.value })
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
    <PanelHeader icon="prestige" title="转生" subtitle="选择一种结束方式，开启新世代并获得永久声望奖励。" />

    <div class="current-prestige">
      <MetricCard label="Plasmid" :value="Math.floor(currentPlasmid)" tone="accent" />
      <MetricCard label="Phage" :value="Math.floor(currentPhage)" />
      <MetricCard label="Dark" :value="currentDark.toFixed(3)" />
      <MetricCard label="Harmony" :value="currentHarmony.toFixed(2)" />
      <MetricCard label="Artifact" :value="Math.floor(currentArtifact)" />
      <MetricCard label="Supercoiled" :value="Math.floor(currentSupercoiled)" />
    </div>

    <!-- 真空坍塌警告（syphon ≥ 80）-->
    <div v-if="(game.state.tech['syphon'] ?? 0) >= 60" class="vacuum-warning card">
      <h3 class="section-title">真空坍塌警告</h3>
      <p>
        魔法虹吸 (syphon) 等级：<strong>{{ game.state.tech['syphon'] }} / 80</strong>。
        <br>
        当达到 80 时，维度将崩溃，触发真空转生 — 获得大量 Plasmid + Phage + Dark Energy。
      </p>
      <p v-if="(game.state.tech['syphon'] ?? 0) >= 80" class="vacuum-imminent">
        <AppIcon name="dangerAlert" /> 维度即将崩溃，立即转生以获得收益。
      </p>
    </div>

    <!-- 宇宙选择（黑洞转生时）-->
    <div class="universe-select card" v-if="game.canReset('blackhole')">
      <h3 class="section-title">下个宇宙类型</h3>
      <select v-model="selectedUniverse">
        <option v-for="u in universeOptions" :key="u.id" :value="u.id">
          {{ u.name }} — {{ u.desc }}
        </option>
      </select>
    </div>

    <h3 class="section-title">可用的转生</h3>

    <EmptyState v-if="availableResets.length === 0" text="当前没有满足条件的转生选项。继续推进游戏进度。" icon="lock" />

    <div v-for="r in availableResets" :key="r.type" class="reset-card card">
      <div class="reset-header">
        <span class="reset-icon"><AppIcon :name="r.icon" /></span>
        <span class="reset-name">{{ r.name }}</span>
        <button class="reset-btn btn danger" @click="trigger(r.type)">触发</button>
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
.prestige-panel { display: flex; flex-direction: column; gap: 10px; }

.current-prestige {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 8px;
}
.section-title { font-size: 13px; color: var(--text-primary); margin: 0 0 6px; }

.vacuum-warning {
  padding: 10px;
}
.vacuum-warning p { font-size: 0.85rem; color: var(--text-secondary); margin: 0.2rem 0; }
.vacuum-imminent { display: inline-flex; align-items: center; gap: 6px; color: var(--warning) !important; font-weight: 700; }
.universe-select { padding: 10px; }
.universe-select select { width: 100%; background: var(--bg-input); color: var(--text-primary); border: 1px solid var(--border-color); padding: 0.4rem; border-radius: var(--radius-sm); }

.reset-card {
  padding: 10px;
}
.reset-header { display: flex; align-items: center; gap: 0.5rem; }
.reset-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: var(--accent);
}
.reset-name { font-weight: 700; color: var(--text-primary); flex: 1; }
.reset-desc { font-size: 0.85rem; color: var(--text-secondary); margin: 0.4rem 0; }
.reset-rewards { font-size: 0.8rem; color: var(--text-secondary); }
.reset-preview {
  margin-top: 0.5rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.reset-preview span {
  background: var(--surface-pressed);
  padding: 0.2rem 0.6rem;
  border-radius: var(--radius-sm);
  font-size: 0.78rem;
  color: var(--accent);
}
</style>
