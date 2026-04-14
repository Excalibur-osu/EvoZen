<!--
  GovernmentPanel.vue — 政府与税收面板
  
  用途：
    显示当前政体、提供政体切换按钮、展示税率滑块，
    并说明每种政体对产出的实际影响。
    
  对接状态：
    - game.state.civic.govern.type     当前政体 ID
    - game.state.civic.govern.rev      政体切换冷却（>0 = 切换中）
    - game.state.civic.taxes.tax_rate  税率（0~maxTaxRate）
    - game.changeGov(type)             切换政体 action
    - game.setTaxRate(n)               设置税率 action
    - game.getMaxTaxRate()             获取当前政体允许的最高税率
    - game.GOVERNMENT_DEFS             政体定义表
    
  显示条件：游戏已过进化阶段 + govern >= 1（government 科技已研究）
-->
<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'

const game = useGameStore()

/** 当前政体 */
const currentGovType = computed(() => game.state.civic.govern?.type ?? 'anarchy')

/** 当前政体定义 */
const currentGovDef = computed(() =>
  game.GOVERNMENT_DEFS.find((d: { id: string }) => d.id === currentGovType.value)
)

/** 冷却计数器 */
const govCooldown = computed(() => game.state.civic.govern?.rev ?? 0)

/** 是否处于冷却 */
const isInCooldown = computed(() => govCooldown.value > 0)

/** 当前税率 */
const taxRate = computed(() => game.state.civic.taxes?.tax_rate ?? 20)

/** 最高税率（受政体影响） */
const maxTaxRate = computed(() => game.getMaxTaxRate())

/** 税收侧政体乘数 */
const taxIncomeGovMultiplier = computed(() => {
  switch (currentGovType.value) {
    case 'oligarchy':
      return 0.95
    case 'corpocracy':
      return 0.5
    case 'socialist':
      return 0.8
    default:
      return 1
  }
})

/** 是否已解锁政府系统 */
const isGovUnlocked = computed(() => (game.state.tech['govern'] ?? 0) >= 1)

/** 切换政体 */
function switchGov(govType: string) {
  game.changeGov(govType as any)
}

/** 拖动改变税率 */
function onTaxInput(e: Event) {
  const val = parseInt((e.target as HTMLInputElement).value, 10)
  game.setTaxRate(val)
}

/** 精确调整税率（+1/-1） */
function adjustTax(delta: number) {
  game.setTaxRate(taxRate.value + delta)
}

/** 检查某政体是否可用（科技前置是否满足） */
function isGovAvailable(def: { id: string; reqGovern: number }): boolean {
  // 基本前置：govern 科技等级
  if ((game.state.tech['govern'] ?? 0) < def.reqGovern) return false
  // 神权政体额外需要 gov_theo:1（对标 legacy/src/civics.js L397）
  if (def.id === 'theocracy' && (game.state.tech['gov_theo'] ?? 0) < 1) return false
  if (def.id === 'socialist' && (game.state.tech['gov_soc'] ?? 0) < 1) return false
  if (def.id === 'corpocracy' && (game.state.tech['gov_corp'] ?? 0) < 1) return false
  return true
}
</script>

<template>
  <div class="gov-panel">
    <!-- 未解锁时的占位 -->
    <div v-if="!isGovUnlocked" class="locked-hint">
      <div class="locked-icon">🏛️</div>
      <div class="locked-text">研究「政府」科技（需要货币 Lv.1）以解锁政体系统</div>
    </div>

    <template v-else>
      <!-- 当前政体卡片 -->
      <section class="section-card current-gov">
        <div class="section-header">
          <span class="header-label">当前政体</span>
          <span v-if="isInCooldown" class="cooldown-badge">
            ⏳ 切换冷却中：{{ govCooldown }} tick
          </span>
        </div>

        <div class="gov-name">{{ currentGovDef?.name ?? '无政府' }}</div>
        <div class="gov-desc">{{ currentGovDef?.description }}</div>
        <ul class="gov-effects">
          <li v-for="eff in (currentGovDef?.effects ?? [])" :key="eff">
            {{ eff }}
          </li>
        </ul>
      </section>

      <!-- 政体切换 -->
      <section class="section-card gov-select">
        <div class="section-header">
          <span class="header-label">切换政体</span>
        </div>
        <div class="gov-grid">
          <button
            v-for="def in game.GOVERNMENT_DEFS"
            :key="def.id"
            class="gov-btn"
            :class="{
              active: currentGovType === def.id,
              locked: !isGovAvailable(def),
            }"
            :disabled="isInCooldown || currentGovType === def.id || !isGovAvailable(def)"
            @click="switchGov(def.id)"
          >
            <div class="gov-btn-name">{{ def.name }}</div>
            <div class="gov-btn-desc">{{ def.description }}</div>
          </button>
        </div>
        <p class="switch-note" v-if="isInCooldown">
          革命进行中，请等待新制度稳固后再次变更。
        </p>
      </section>

      <!-- 税率调节 -->
      <section class="section-card tax-section">
        <div class="section-header">
          <span class="header-label">税率调节</span>
          <span class="tax-value">{{ taxRate }}%</span>
        </div>

        <div class="tax-row">
          <button class="tax-adj-btn" @click="adjustTax(-1)" :disabled="taxRate <= 0">–</button>
          <input
            type="range"
            class="tax-slider"
            :min="0"
            :max="maxTaxRate"
            :value="taxRate"
            @input="onTaxInput"
          />
          <button class="tax-adj-btn" @click="adjustTax(1)" :disabled="taxRate >= maxTaxRate">+</button>
        </div>

        <div class="tax-hint">
          <span>当前上限：{{ maxTaxRate }}%</span>
          <span v-if="maxTaxRate > 20" class="bonus-note">（寡头制特权 +{{ maxTaxRate - 20 }}%）</span>
        </div>

        <div class="tax-effects">
          <div class="tax-effect-row">
            <span class="effect-lbl">💰 预计金币/s</span>
            <span class="effect-val">
              <!--
                对标 main.js L7587-7626:
                income = (pop - unemployed) * 0.4 * (taxRate/20)
                乘 TIME_MULTIPLIER(0.25) = 每 tick 金额
                ×4 (per-second) = 每秒金额
                寡头额外 ×0.95
              -->
              {{ (
                (game.population * 0.4 * (taxRate / 20)) * 0.25 * 4
                * taxIncomeGovMultiplier
              ).toFixed(2) }}
            </span>
          </div>
          <div v-if="currentGovType === 'oligarchy'" class="tax-effect-row" style="margin-top:4px">
            <span class="effect-lbl" style="color:var(--accent)">⚠️ 寡头税收效率</span>
            <span class="effect-val" style="color:var(--accent)">×0.95</span>
          </div>
          <div v-if="currentGovType === 'socialist'" class="tax-effect-row" style="margin-top:4px">
            <span class="effect-lbl" style="color:var(--accent)">⚠️ 社会主义税收效率</span>
            <span class="effect-val" style="color:var(--accent)">×0.80</span>
          </div>
          <div v-if="currentGovType === 'corpocracy'" class="tax-effect-row" style="margin-top:4px">
            <span class="effect-lbl" style="color:var(--accent)">⚠️ 企业政体税收效率</span>
            <span class="effect-val" style="color:var(--accent)">×0.50</span>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.gov-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 未解锁占位 */
.locked-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 200px;
  color: var(--text-secondary);
  text-align: center;
}
.locked-icon {
  font-size: 48px;
  opacity: 0.4;
}
.locked-text {
  font-size: 14px;
  max-width: 260px;
}

/* 通用 section */
.section-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 14px 16px;
}
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.header-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

/* 冷却 badge */
.cooldown-badge {
  font-size: 11px;
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
  border-radius: 999px;
  padding: 2px 10px;
}

/* 当前政体 */
.gov-name {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-accent);
  margin-bottom: 4px;
}
.gov-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}
.gov-effects {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.gov-effects li {
  font-size: 12px;
  color: var(--text-secondary);
  padding: 4px 8px;
  background: var(--bg-primary);
  border-radius: 6px;
}
.gov-effects li::before {
  content: '▸ ';
  color: var(--accent);
}

/* 切换按钮网格 */
.gov-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.gov-btn {
  text-align: left;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  cursor: pointer;
  transition: all 0.18s;
  min-height: 60px;
}
.gov-btn:hover:not(:disabled) {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, var(--bg-primary));
}
.gov-btn.active {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 14%, var(--bg-primary));
}
.gov-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.gov-btn.locked {
  opacity: 0.35;
}
.gov-btn-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 2px;
}
.gov-btn-desc {
  font-size: 11px;
  color: var(--text-secondary);
  line-height: 1.4;
}
.switch-note {
  margin-top: 10px;
  font-size: 12px;
  color: var(--accent);
  text-align: center;
}

/* 税率 */
.tax-section .section-header {
  align-items: center;
}
.tax-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-accent);
}
.tax-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.tax-adj-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  color: var(--text-primary);
  flex-shrink: 0;
  transition: background 0.15s;
}
.tax-adj-btn:hover:not(:disabled) {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}
.tax-adj-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.tax-slider {
  flex: 1;
  accent-color: var(--accent);
  height: 4px;
}
.tax-hint {
  font-size: 11px;
  color: var(--text-secondary);
  margin-bottom: 10px;
  display: flex;
  gap: 8px;
}
.bonus-note {
  color: var(--text-accent);
}
.tax-effects {
  background: var(--bg-primary);
  border-radius: 6px;
  padding: 8px 12px;
}
.tax-effect-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-secondary);
}
.effect-val {
  color: var(--text-primary);
  font-weight: 600;
}
</style>
