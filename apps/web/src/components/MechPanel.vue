<!--
  MechPanel — 机甲设计 + 库存
  对标 legacy/src/portal.js mech 系统 UI
-->
<script setup lang="ts">
import { useGameStore } from '../stores/game'
import { computed, ref } from 'vue'
import type { MechSize, MechChassis, MechWeapon, MechEquipment } from '@evozen/game-core'

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
    <h2 class="title">🤖 机甲</h2>
    <p class="subtitle">建造战斗机甲，征服尖塔与地狱深坑。</p>

    <div class="stats-row">
      <div class="stat-card">
        <span>容量</span>
        <strong>{{ capacity.used }} / {{ capacity.max }}</strong>
      </div>
      <div class="stat-card">
        <span>总战力</span>
        <strong>{{ fmtNum(total) }}</strong>
      </div>
      <div class="stat-card">
        <span>机甲数</span>
        <strong>{{ (mechState.mechs ?? []).length }}</strong>
      </div>
    </div>

    <!-- 建造中 -->
    <div v-if="mechState.building" class="building-card">
      <h3>建造中：{{ sizeLabels[mechState.building.def.size] }}</h3>
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: `${(mechState.building.progress / mechState.building.total * 100).toFixed(0)}%` }"></div>
      </div>
      <span>{{ Math.floor(mechState.building.progress) }} / {{ mechState.building.total }}</span>
    </div>

    <!-- 设计器 -->
    <div class="designer">
      <h3>设计新机甲</h3>

      <div class="row">
        <label>尺寸：</label>
        <button
          v-for="s in sizes"
          :key="s"
          :class="['chip', { active: selSize === s }]"
          @click="selSize = s"
        >{{ sizeLabels[s] }}</button>
      </div>

      <div class="row">
        <label>底盘：</label>
        <button
          v-for="c in chassisOptions"
          :key="c"
          :class="['chip', { active: selChassis === c }]"
          @click="selChassis = c"
        >{{ chassisLabels[c] }}</button>
      </div>

      <div class="row">
        <label>武器：</label>
        <button
          v-for="w in weaponOptions"
          :key="w"
          :class="['chip', { active: selWeapon === w }]"
          @click="selWeapon = w"
        >{{ weaponLabels[w] }}</button>
      </div>

      <div class="row">
        <label>装备 ({{ selEquip.length }}/3)：</label>
        <button
          v-for="e in equipOptions"
          :key="e"
          :class="['chip', { active: selEquip.includes(e) }]"
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
        <button class="build-btn" @click="build" :disabled="!!mechState.building">建造</button>
      </div>
    </div>

    <!-- 库存 -->
    <h3 class="section-title">机甲库存</h3>
    <div v-if="(mechState.mechs ?? []).length === 0" class="empty">尚无机甲。</div>
    <div v-else class="mech-list">
      <div v-for="(m, i) in (mechState.mechs ?? [])" :key="i" class="mech-card">
        <span class="mech-name">{{ sizeLabels[m.size] }} {{ chassisLabels[m.chassis] }}/{{ weaponLabels[m.weapon] }}</span>
        <span class="mech-rating">⚔️ {{ fmtNum(game.mechRating(m)) }}</span>
        <span class="mech-equip" v-if="m.equip.length">[{{ m.equip.map(e => equipLabels[e]).join(', ') }}]</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mech-panel { padding: 1rem; color: #e0e0e0; }
.title { font-size: 1.3rem; color: #66ccff; margin: 0 0 0.3rem; }
.subtitle { font-size: 0.85rem; color: #aaa; margin-bottom: 1rem; }
.stats-row { display: flex; gap: 0.6rem; margin-bottom: 1rem; flex-wrap: wrap; }
.stat-card { background: rgba(102,204,255,0.08); border: 1px solid #335577; padding: 0.5rem 0.8rem; border-radius: 4px; flex: 1; min-width: 120px; display: flex; flex-direction: column; }
.stat-card span { font-size: 0.75rem; color: #aaa; }
.stat-card strong { font-size: 1.1rem; color: #66ccff; }

.building-card { background: #18222e; border: 1px solid #335577; border-radius: 6px; padding: 0.7rem; margin-bottom: 1rem; }
.progress-bar { background: #0f1620; height: 14px; border-radius: 4px; overflow: hidden; margin: 0.3rem 0; }
.progress-fill { background: #66ccff; height: 100%; transition: width 0.2s; }

.designer { background: #18222e; border: 1px solid #2a3a4f; border-radius: 6px; padding: 0.8rem; margin-bottom: 1rem; }
.row { display: flex; align-items: center; gap: 0.3rem; flex-wrap: wrap; margin-bottom: 0.5rem; }
.row label { min-width: 80px; color: #aaa; }
.chip { background: #2a3548; color: #ddd; border: 1px solid #3a4558; padding: 0.3rem 0.6rem; border-radius: 12px; cursor: pointer; font-size: 0.8rem; }
.chip.active { background: #335577; color: #fff; border-color: #66ccff; }
.preview { margin-top: 0.8rem; padding-top: 0.5rem; border-top: 1px solid #2a3548; }
.costs { font-size: 0.85rem; margin: 0.3rem 0; }
.cost-item { color: #ccc; margin-right: 0.5rem; }
.build-btn { background: #335577; color: #fff; border: none; padding: 0.5rem 1.2rem; border-radius: 4px; cursor: pointer; margin-top: 0.5rem; }
.build-btn:hover:not(:disabled) { background: #4477aa; }
.build-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.section-title { font-size: 1rem; color: #66ccff; margin: 0.8rem 0 0.5rem; }
.empty { color: #888; padding: 1rem; text-align: center; }
.mech-list { display: grid; gap: 0.3rem; }
.mech-card { background: #18222e; border: 1px solid #2a3548; border-radius: 4px; padding: 0.4rem 0.6rem; display: flex; gap: 0.6rem; align-items: center; }
.mech-name { flex: 1; }
.mech-rating { color: #ffd700; }
.mech-equip { font-size: 0.75rem; color: #888; }
</style>
