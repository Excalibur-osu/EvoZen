<!--
  MechPanel — 机甲设计 + 库存
  对标 legacy/src/portal.js mech 系统 UI
-->
<script setup lang="ts">
import { useGameStore } from '../stores/game'
import { computed, ref } from 'vue'
import type { MechSize, MechChassis, MechWeapon, MechEquipment } from '@evozen/game-core'
import PanelHeader from './ui/PanelHeader.vue'
import EmptyState from './ui/EmptyState.vue'
import MetricCard from './ui/MetricCard.vue'
import ProgressBar from './ui/ProgressBar.vue'

const game = useGameStore()

const sizes: MechSize[] = ['small', 'medium', 'large', 'titan', 'collector']
const chassisOptions: MechChassis[] = ['wheel', 'tread', 'hover', 'spider', 'biped', 'quad']
const weaponOptions: MechWeapon[] = ['plasma', 'laser', 'kinetic', 'shotgun', 'missile', 'flame', 'sonic']
const equipOptions: MechEquipment[] = ['shields', 'sonar', 'grappling', 'special', 'gyro', 'flare', 'ablative']

const selSize = ref<MechSize>('small')
const selChassis = ref<MechChassis>('wheel')
const selWeapon = ref<MechWeapon>('kinetic')
const selEquip = ref<MechEquipment[]>([])

const capacity = computed(() => game.getMechBayCapacity())
const total = computed(() => game.totalMechRating())
const mechState = computed(() => game.getMechs())

const previewCost = computed(() => game.mechCost(selSize.value))
const previewRating = computed(() =>
  game.mechRating({ size: selSize.value, chassis: selChassis.value, weapon: selWeapon.value, equip: selEquip.value, built: false }),
)

function toggleEquip(e: MechEquipment) {
  const idx = selEquip.value.indexOf(e)
  if (idx >= 0) selEquip.value.splice(idx, 1)
  else if (selEquip.value.length < 3) selEquip.value.push(e)
}

function build() {
  game.startMechBuild({
    size: selSize.value,
    chassis: selChassis.value,
    weapon: selWeapon.value,
    equip: [...selEquip.value],
  })
}

const sizeLabels: Record<MechSize, string> = {
  small: '小型', medium: '中型', large: '大型', titan: '泰坦', collector: '收集者',
}
const chassisLabels: Record<MechChassis, string> = {
  wheel: '轮式', tread: '履带', hover: '悬浮', spider: '蜘蛛腿', biped: '双足', quad: '四足',
}
const weaponLabels: Record<MechWeapon, string> = {
  plasma: '等离子', laser: '激光', kinetic: '动能', shotgun: '霰弹', missile: '导弹', flame: '火焰', sonic: '声波',
}
const equipLabels: Record<MechEquipment, string> = {
  shields: '护盾', sonar: '声纳', grappling: '钩爪', special: '特殊', gyro: '陀螺仪', flare: '照明弹', ablative: '消融装甲',
}

function fmtNum(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(2) + 'K'
  return Math.round(n).toString()
}
</script>

<template>
  <div class="mech-panel">
    <PanelHeader icon="mech" title="机甲" subtitle="建造战斗机甲，征服尖塔与地狱深坑。" />

    <div class="stats-row">
      <MetricCard label="容量" :value="`${capacity.used} / ${capacity.max}`" />
      <MetricCard label="总战力" :value="fmtNum(total)" tone="accent" />
      <MetricCard label="机甲数" :value="(mechState.mechs ?? []).length" />
    </div>

    <!-- 建造中 -->
    <div v-if="mechState.building" class="building-card card">
      <h3 class="section-title">建造中：{{ sizeLabels[mechState.building.def.size] }}</h3>
      <ProgressBar :value="mechState.building.progress / mechState.building.total * 100" size="lg" />
      <span>{{ Math.floor(mechState.building.progress) }} / {{ mechState.building.total }}</span>
    </div>

    <!-- 设计器 -->
    <div class="designer card">
      <h3 class="section-title">设计新机甲</h3>

      <div class="row">
        <label>尺寸：</label>
        <button
          v-for="s in sizes"
          :key="s"
          :class="['chip', { active: selSize === s }]"
          type="button"
          @click="selSize = s"
        >{{ sizeLabels[s] }}</button>
      </div>

      <div class="row">
        <label>底盘：</label>
        <button
          v-for="c in chassisOptions"
          :key="c"
          :class="['chip', { active: selChassis === c }]"
          type="button"
          @click="selChassis = c"
        >{{ chassisLabels[c] }}</button>
      </div>

      <div class="row">
        <label>武器：</label>
        <button
          v-for="w in weaponOptions"
          :key="w"
          :class="['chip', { active: selWeapon === w }]"
          type="button"
          @click="selWeapon = w"
        >{{ weaponLabels[w] }}</button>
      </div>

      <div class="row">
        <label>装备 ({{ selEquip.length }}/3)：</label>
        <button
          v-for="e in equipOptions"
          :key="e"
          :class="['chip', { active: selEquip.includes(e) }]"
          type="button"
          @click="toggleEquip(e)"
        >{{ equipLabels[e] }}</button>
      </div>

      <div class="preview">
        <div>预估战力：<strong>{{ fmtNum(previewRating) }}</strong></div>
        <div class="costs">
          成本：
          <span v-for="(amt, res) in previewCost" :key="res" class="cost-item">
            {{ res }} ×{{ fmtNum(amt as number) }}
          </span>
        </div>
        <button class="build-btn btn primary" @click="build" :disabled="!!mechState.building">建造</button>
      </div>
    </div>

    <!-- 库存 -->
    <h3 class="section-title">机甲库存</h3>
    <EmptyState v-if="(mechState.mechs ?? []).length === 0" text="尚无机甲。" icon="mech" />
    <div v-else class="mech-list">
      <div v-for="(m, i) in (mechState.mechs ?? [])" :key="i" class="mech-card card">
        <span class="mech-name">{{ sizeLabels[m.size] }} {{ chassisLabels[m.chassis] }}/{{ weaponLabels[m.weapon] }}</span>
        <span class="mech-rating">{{ fmtNum(game.mechRating(m)) }}</span>
        <span class="mech-equip" v-if="m.equip.length">[{{ m.equip.map(e => equipLabels[e]).join(', ') }}]</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mech-panel { display: flex; flex-direction: column; gap: 10px; }
.stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; }

.building-card { padding: 10px; }
.designer { padding: 10px; }
.row { display: flex; align-items: center; gap: 0.3rem; flex-wrap: wrap; margin-bottom: 0.5rem; }
.row label { min-width: 80px; color: var(--text-secondary); }
.chip { background: var(--bg-card); color: var(--text-secondary); border: 1px solid var(--border-color); padding: 0.3rem 0.6rem; border-radius: var(--radius-sm); cursor: pointer; font-size: 0.8rem; }
.chip:hover { border-color: var(--border-hover); color: var(--text-primary); }
.chip.active { background: var(--accent-glow); color: var(--accent); border-color: var(--accent); }
.preview { margin-top: 0.8rem; padding-top: 0.5rem; border-top: 1px solid var(--border-color); }
.costs { font-size: 0.85rem; margin: 0.3rem 0; }
.cost-item { color: var(--text-primary); margin-right: 0.5rem; }
.build-btn { margin-top: 0.5rem; }

.section-title { font-size: 13px; color: var(--text-primary); margin: 0 0 6px; }
.mech-list { display: grid; gap: 0.3rem; }
.mech-card { padding: 0.4rem 0.6rem; display: flex; gap: 0.6rem; align-items: center; }
.mech-name { flex: 1; }
.mech-rating { color: var(--warning); font-family: var(--font-mono); }
.mech-equip { font-size: 0.75rem; color: var(--text-muted); }
</style>
