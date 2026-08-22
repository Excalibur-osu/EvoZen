<script setup lang="ts">
import { computed } from 'vue'
import {
  TAUCETI_MISSIONS,
  WOMLING_RELATIONS,
  getTaucetiGeneratorFuel,
  getTaucetiPowerCost,
  getTaucetiSupportFuel,
  getTauExplorerForDismantle,
  getTaucetiRepositoryResources,
  getTaucetiRepositoryStorageBonus,
  getTaucetiFactoryLinesPerBuilding,
  TAUCETI_REPOSITORY_CONTAINER_CAPACITY,
  resolveTaucetiSupport,
  type TaucetiStructureDefinition,
} from '@evozen/game-core'
import { useGameStore } from '../stores/game'
import PanelHeader from './ui/PanelHeader.vue'
import MetricCard from './ui/MetricCard.vue'
import EmptyState from './ui/EmptyState.vue'
import StepperButton from './ui/StepperButton.vue'
import AppIcon from './ui/AppIcon.vue'

const game = useGameStore()

const regionSections = computed(() => [
  {
    id: 'tau_home' as const,
    title: 'Tau 家园',
    buildings: game.getTaucetiStructuresByRegion('tau_home').filter(game.isTaucetiStructureVisible),
  },
  {
    id: 'tau_red' as const,
    title: '红色行星',
    buildings: game.getTaucetiStructuresByRegion('tau_red').filter(game.isTaucetiStructureVisible),
  },
].filter((section) => section.buildings.length > 0))
const availableMissions = computed(() =>
  TAUCETI_MISSIONS.filter((mission) => game.isTaucetiMissionAvailable(mission.id)),
)
const relationAvailable = computed(() => game.isWomlingRelationAvailable())
const activeConsumers = computed(() => game.state.city.power?.activeConsumers ?? {})
const activeGenerators = computed(() => game.state.city.power?.activeGenerators ?? {})
const support = computed(() => resolveTaucetiSupport(game.state, activeConsumers.value))

function structure(id: string) {
  return game.state.tauceti[id]
}

function count(id: string): number {
  return structure(id)?.count ?? 0
}

function configuredOn(id: string): number {
  const current = structure(id)
  return current?.on ?? current?.count ?? 0
}

function activeOn(building: TaucetiStructureDefinition): number {
  if (building.tracksOn === false) return 0
  return building.powerCost && building.powerCost < 0
    ? activeGenerators.value[building.id] ?? 0
    : activeConsumers.value[building.id] ?? configuredOn(building.id)
}

function supportedOn(id: string): number {
  return support.value.supportOn[id] ?? 0
}

function relationCost(relation: 'friend' | 'god' | 'lord'): Record<string, number> {
  return game.getWomlingRelationCost(relation) ?? {}
}

function powerCost(id: string): number {
  return getTaucetiPowerCost(game.state, id)
}

function fuel(building: TaucetiStructureDefinition) {
  return building.powerCost && building.powerCost < 0
    ? getTaucetiGeneratorFuel(game.state, building)
    : getTaucetiSupportFuel(game.state, building)
}

function cost(id: string): Record<string, number> {
  return game.getTaucetiBuildCost(id) ?? {}
}

function repositoryBonuses(): { id: string; name: string; amount: number }[] {
  return getTaucetiRepositoryResources(game.state)
    .map((id) => ({
      id,
      name: game.state.resource[id]?.name ?? id,
      amount: getTaucetiRepositoryStorageBonus(game.state, id, 1),
    }))
    .filter(({ amount }) => amount > 0)
}

function adjustOn(id: string, delta: number) {
  const current = structure(id)
  if (!current) return
  current.on = Math.max(0, Math.min(current.count, (current.on ?? current.count) + delta))
}

function formatNum(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`
  return Math.ceil(value).toLocaleString()
}

function missionDetail(id: 'home_mission' | 'dismantle' | 'excavate' | 'red_mission'): string | undefined {
  if (id !== 'dismantle') return undefined
  const explorer = getTauExplorerForDismantle(game.state)
  return explorer ? `将拆解：${explorer.name}` : '需要一艘已抵达 Tau 的探索舰'
}
</script>

<template>
  <section class="tauceti-panel animate-in">
    <PanelHeader icon="space" title="Tau Ceti" subtitle="真相之路的外星家园与隔离研究设施。" />

    <div class="support-strip">
      <MetricCard label="家园支援" :value="`${support.used} / ${support.capacity}`" tone="accent" />
      <MetricCard label="有效轨道站" :value="support.supplierEffectiveOn.orbital_station ?? 0" />
      <MetricCard label="有效传染病实验室" :value="supportedOn('infectious_disease_lab')" />
      <MetricCard label="有效殖民地" :value="supportedOn('colony')" />
      <MetricCard label="有效矿坑" :value="supportedOn('mining_pit')" />
      <MetricCard label="红星支援" :value="`${support.redUsed} / ${support.redCapacity}`" tone="accent" />
      <MetricCard label="有效轨道平台" :value="support.supplierEffectiveOn.orbital_platform ?? 0" />
      <MetricCard label="有效 Womling 矿场" :value="supportedOn('womling_mine')" />
    </div>

    <section v-if="availableMissions.length > 0" class="region-section">
      <h2>行星任务</h2>
      <div class="building-grid">
        <article v-for="mission in availableMissions" :key="mission.id" class="building-card card">
          <div class="building-copy">
            <h3>{{ mission.name }}</h3>
            <p>{{ mission.description }}</p>
            <p v-if="missionDetail(mission.id)" class="mission-detail">{{ missionDetail(mission.id) }}</p>
          </div>
          <div class="cost-row">
            <span
              v-for="(amount, resource) in mission.costs"
              :key="resource"
              class="cost-item"
              :class="{ lack: (game.state.resource[resource]?.amount ?? 0) < amount }"
            >
              {{ game.state.resource[resource]?.name ?? resource }} {{ formatNum(amount) }}
            </span>
          </div>
          <button class="btn primary" :disabled="!game.canRunTaucetiMission(mission.id)" @click="game.runTaucetiMission(mission.id)">
            <AppIcon name="space" />
            <span>执行任务</span>
          </button>
        </article>
      </div>
    </section>

    <section v-if="relationAvailable" class="region-section">
      <h2>Womling 接触</h2>
      <div class="building-grid">
        <article v-for="relation in WOMLING_RELATIONS" :key="relation.id" class="building-card card">
          <div class="building-copy">
            <h3>{{ relation.name }}</h3>
            <p>{{ relation.description }}</p>
          </div>
          <div class="cost-row">
            <span
              v-for="(amount, resource) in relationCost(relation.id)"
              :key="resource"
              class="cost-item"
              :class="{ lack: (game.state.resource[resource]?.amount ?? 0) < amount }"
            >
              {{ game.state.resource[resource]?.name ?? resource }} {{ formatNum(amount) }}
            </span>
          </div>
          <button class="btn primary" :disabled="!game.canChooseWomlingRelation(relation.id)" @click="game.chooseWomlingRelation(relation.id)">
            <AppIcon name="womling" />
            <span>选择</span>
          </button>
        </article>
      </div>
    </section>

    <EmptyState v-if="regionSections.length === 0 && availableMissions.length === 0" icon="lock" text="当前没有已解锁的 Tau Ceti 设施。" />

    <section v-for="section in regionSections" :key="section.id" class="region-section">
      <h2>{{ section.title }}</h2>
      <div class="building-grid">
      <article v-for="building in section.buildings" :key="building.id" class="building-card card">
        <div class="building-head">
          <div class="building-copy">
            <h3>{{ building.name }}</h3>
            <p>{{ building.description }}</p>
          </div>
          <span v-if="building.segmentCap" class="building-count font-mono">
            {{ count(building.id) }}/{{ building.segmentCap }} 段
          </span>
          <span v-else-if="building.tracksOn === false && count(building.id) > 0" class="building-count font-mono">
            已建 {{ count(building.id) }}
          </span>
          <span v-else-if="count(building.id) > 0" class="building-count font-mono">
            {{ activeOn(building) }}/{{ configuredOn(building.id) }}/{{ count(building.id) }}
          </span>
        </div>

        <div class="status-row">
          <span v-if="powerCost(building.id) < 0" class="status power-gain">
            <AppIcon name="zap" /> +{{ -powerCost(building.id) }} MW
          </span>
          <span v-else-if="powerCost(building.id) > 0" class="status power-cost">
            <AppIcon name="zap" /> -{{ powerCost(building.id) }} MW
          </span>
          <span v-if="building.support" class="status">
            支援 {{ building.support.amount > 0 ? '+' : '' }}{{ building.support.amount }}
          </span>
          <span v-if="fuel(building)" class="status">
            {{ fuel(building)?.resource }} {{ fuel(building)?.amountPerTick }}/tick
          </span>
          <span v-if="building.id === 'infectious_disease_lab' && count(building.id) > 0" class="status">
            有效 {{ supportedOn(building.id) }}
          </span>
          <span v-if="building.id === 'tau_factory' && count(building.id) > 0" class="status">
            有效 {{ supportedOn(building.id) }} · 每座 {{ getTaucetiFactoryLinesPerBuilding(game.state) }} 产线
          </span>
          <span v-if="building.id === 'tau_factory' && count(building.id) > 0" class="status">
            自动合成 +{{ game.state.tech['isolation'] ? 275 : 90 }}%/座
          </span>
          <span v-if="building.support?.amount === -1 && count(building.id) > 0" class="status">
            有效 {{ supportedOn(building.id) }}
          </span>
        </div>

        <p class="building-effect">{{ building.effect }}</p>

        <div v-if="building.id === 'repository'" class="repository-bonuses">
          <span v-for="bonus in repositoryBonuses()" :key="bonus.id" class="status">
            每座 {{ bonus.name }} +{{ formatNum(bonus.amount) }}
          </span>
          <span v-if="game.state.tech['isolation']" class="status">
            每座板条箱/集装箱 +{{ TAUCETI_REPOSITORY_CONTAINER_CAPACITY }}
          </span>
        </div>

        <div class="cost-row">
          <span
            v-for="(amount, resource) in cost(building.id)"
            :key="resource"
            class="cost-item"
            :class="{ lack: (game.state.resource[resource]?.amount ?? 0) < amount }"
          >
            {{ game.state.resource[resource]?.name ?? resource }} {{ formatNum(amount) }}
          </span>
        </div>

        <div class="building-actions">
          <div v-if="count(building.id) > 0 && building.tracksOn !== false" class="on-controls">
            <StepperButton label="−" title="停用一座" :disabled="configuredOn(building.id) <= 0" @click="adjustOn(building.id, -1)" />
            <span class="font-mono">ON {{ configuredOn(building.id) }}</span>
            <StepperButton label="+" title="启用一座" :disabled="configuredOn(building.id) >= count(building.id)" @click="adjustOn(building.id, 1)" />
          </div>
          <button v-if="building.buildable !== false" class="btn primary" :disabled="!game.canBuildTaucetiStructure(building.id)" @click="game.buildTaucetiStructure(building.id)">
            <AppIcon name="hammer" />
            <span>{{ building.segmentCap && count(building.id) >= building.segmentCap ? '已完成' : building.segmentCap ? '建造一段' : '建造' }}</span>
          </button>
        </div>
      </article>
      </div>
    </section>
  </section>
</template>

<style scoped>
.tauceti-panel { display: flex; flex-direction: column; gap: 12px; margin-top: 12px; }
.support-strip { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.region-section { display: flex; flex-direction: column; gap: 8px; }
.region-section > h2 { margin: 4px 0 0; color: var(--text-primary); font-size: 13px; }
.building-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 8px; }
.building-card { min-width: 0; padding: 10px; display: flex; flex-direction: column; gap: 8px; }
.building-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
.building-copy { min-width: 0; }
.building-copy h3 { margin: 0; color: var(--text-primary); font-size: 13px; }
.building-copy p, .building-effect { margin: 3px 0 0; color: var(--text-secondary); font-size: 11px; line-height: 1.4; }
.building-count { flex: 0 0 auto; color: var(--accent); font-size: 11px; }
.status-row, .cost-row, .repository-bonuses { display: flex; flex-wrap: wrap; gap: 4px; }
.status, .cost-item { padding: 2px 6px; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); color: var(--text-secondary); font-size: 10px; }
.power-gain { color: var(--success); }
.power-cost, .cost-item.lack { color: var(--danger); }
.status :deep(svg) { width: 11px; height: 11px; vertical-align: -2px; }
.building-effect { min-height: 31px; }
.cost-row { min-height: 23px; }
.building-actions { margin-top: auto; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.on-controls { display: flex; align-items: center; gap: 6px; color: var(--text-secondary); font-size: 10px; }
.building-actions .btn { margin-left: auto; }
@media (max-width: 720px) {
  .support-strip { grid-template-columns: 1fr; }
}
</style>
