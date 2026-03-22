<!--
  贸易面板 (TradePanel.vue)
  展示贸易系统的 UI：
  - 手动市场：可对可交易资源进行一键买卖
  - 贸易路线：每座贸易站解锁一条自动路线，可配置买/卖/关闭

  依赖 Store actions: tradeBuy, tradeSell, updateTradeRoute, getBuyPrice, getSellPrice
-->
<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import { TRADABLE_RESOURCES, type TradeRoute } from '@evozen/game-core'
import { getResourceName } from '../utils/resourceNames'

const game = useGameStore()

const isUnlocked = computed(() => (game.state.tech['trade'] ?? 0) >= 1)

const tradeRoutes = computed(() => {
  return ((game.state.city as any).trade_routes ?? []) as TradeRoute[]
})

/** 获取可交易且已显示的资源列表 */
const visibleTradables = computed(() => {
  return TRADABLE_RESOURCES.filter(id => game.state.resource[id]?.display)
})

/** 获取当前可用金额 */
const money = computed(() => Math.floor(game.state.resource['Money']?.amount ?? 0))
const marketQty = computed(() => ((game.state.city.market as { qty?: number } | undefined)?.qty ?? 1))
const marketQtyLimit = computed(() => game.getManualTradeLimit())
const routeQtyLimit = computed(() => game.getTradeRouteQtyLimit())

function cycleAction(index: number) {
  const route = tradeRoutes.value[index]
  if (!route) return
  const nextAction = route.action === 'none' ? 'buy' : route.action === 'buy' ? 'sell' : 'none'
  game.updateTradeRoute(index, { ...route, action: nextAction })
}

function changeRouteResource(index: number, resourceId: string) {
  const route = tradeRoutes.value[index]
  if (!route) return
  game.updateTradeRoute(index, { ...route, resource: resourceId })
}

function adjustRouteQty(index: number, delta: number) {
  const route = tradeRoutes.value[index]
  if (!route) return
  game.updateTradeRoute(index, { ...route, qty: (route.qty ?? 1) + delta })
}

function actionLabel(action: string): string {
  return action === 'buy' ? '买入' : action === 'sell' ? '卖出' : '关闭'
}

function actionClass(action: string): string {
  return action === 'buy' ? 'action-buy' : action === 'sell' ? 'action-sell' : 'action-none'
}
</script>

<template>
  <div v-if="isUnlocked" class="trade-panel">
    <!-- 手动市场 -->
    <h3 class="section-title">
      <span class="icon">🏪</span> 市场
      <span class="money-badge">💰 {{ money }}</span>
    </h3>

    <div class="market-tools">
      <span class="tool-label">单次交易数量</span>
      <button class="qty-btn" @click="game.adjustMarketTradeQty(-1)" :disabled="marketQty <= 1">−</button>
      <span class="qty-value">{{ marketQty }}</span>
      <button class="qty-btn" @click="game.adjustMarketTradeQty(1)" :disabled="marketQty >= marketQtyLimit">+</button>
      <span class="tool-hint">上限 {{ marketQtyLimit }}</span>
    </div>

    <div class="market-grid">
      <div
        v-for="resId in visibleTradables"
        :key="resId"
        class="market-row"
      >
        <span class="res-name">{{ getResourceName(resId) }}</span>
        <span class="res-amount">{{ Math.floor(game.state.resource[resId]?.amount ?? 0) }}</span>

        <div class="trade-btns">
          <button
            class="btn btn-buy"
            :disabled="money < game.getBuyPrice(resId) * marketQty"
            @click="game.tradeBuy(resId, marketQty)"
            :title="`买入 ${marketQty}: ${game.getBuyPrice(resId) * marketQty} 金`"
          >
            买 {{ marketQty }} / ${{ game.getBuyPrice(resId) * marketQty }}
          </button>
          <button
            class="btn btn-sell"
            :disabled="(game.state.resource[resId]?.amount ?? 0) < marketQty"
            @click="game.tradeSell(resId, marketQty)"
            :title="`卖出 ${marketQty}: ${game.getSellPrice(resId) * marketQty} 金`"
          >
            卖 {{ marketQty }} / ${{ game.getSellPrice(resId) * marketQty }}
          </button>
        </div>
      </div>
    </div>

    <!-- 贸易路线 -->
    <div v-if="tradeRoutes.length > 0" class="routes-section">
      <h3 class="section-title" style="margin-top: 20px">
        <span class="icon">🛤</span> 贸易路线
        <span class="subtitle">{{ tradeRoutes.length }} 条路线</span>
      </h3>

      <div class="route-grid">
        <div
          v-for="(route, idx) in tradeRoutes"
          :key="idx"
          class="route-row"
        >
          <span class="route-idx">#{{ idx + 1 }}</span>

          <select
            class="route-select"
            :value="route.resource"
            @change="changeRouteResource(idx, ($event.target as HTMLSelectElement).value)"
          >
            <option
              v-for="resId in visibleTradables"
              :key="resId"
              :value="resId"
            >{{ getResourceName(resId) }}</option>
          </select>

          <button
            class="btn btn-action"
            :class="actionClass(route.action)"
            @click="cycleAction(idx)"
          >
            {{ actionLabel(route.action) }}
          </button>

          <div class="route-qty">
            <button class="qty-btn" @click="adjustRouteQty(idx, -1)" :disabled="(route.qty ?? 1) <= 1">−</button>
            <span class="qty-value">{{ route.qty ?? 1 }}</span>
            <button class="qty-btn" @click="adjustRouteQty(idx, 1)" :disabled="(route.qty ?? 1) >= routeQtyLimit">+</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.trade-panel {
  margin-top: 16px;
}

.section-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-accent);
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.section-title .icon {
  font-size: 18px;
}
.section-title .subtitle {
  font-size: 12px;
  font-weight: 400;
  color: var(--text-secondary);
  margin-left: auto;
}

.money-badge {
  margin-left: auto;
  font-size: 13px;
  font-weight: 600;
  color: var(--success, #22c55e);
}

.market-tools {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  padding: 6px 10px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
}

.tool-label,
.tool-hint {
  font-size: 12px;
  color: var(--text-secondary);
}

.tool-hint {
  margin-left: auto;
}

/* 市场网格 */
.market-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.market-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  background: var(--bg-secondary);
  border-radius: 6px;
  border: 1px solid var(--border-color);
}

.res-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  min-width: 48px;
}

.res-amount {
  font-size: 12px;
  color: var(--text-secondary);
  min-width: 40px;
  text-align: right;
}

.trade-btns {
  display: flex;
  gap: 6px;
  margin-left: auto;
}

.btn-buy,
.btn-sell {
  padding: 3px 10px;
  font-size: 11px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-family: var(--font-sans);
  transition: opacity 0.15s;
}

.btn-buy {
  background: var(--accent, #6366f1);
  color: #fff;
}
.btn-sell {
  background: #ef4444;
  color: #fff;
}

.btn-buy:disabled,
.btn-sell:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.btn-buy:not(:disabled):hover,
.btn-sell:not(:disabled):hover {
  opacity: 0.85;
}

/* 贸易路线 */
.route-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.route-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  background: var(--bg-secondary);
  border-radius: 6px;
  border: 1px solid var(--border-color);
}

.route-idx {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 600;
  min-width: 24px;
}

.route-select {
  flex: 1;
  padding: 3px 6px;
  font-size: 12px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: var(--font-sans);
}

.route-qty {
  display: flex;
  align-items: center;
  gap: 4px;
}

.qty-btn {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  cursor: pointer;
  font-family: var(--font-sans);
  font-weight: 700;
  padding: 0;
}

.qty-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.qty-value {
  min-width: 28px;
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

.btn-action {
  padding: 3px 12px;
  font-size: 11px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  cursor: pointer;
  font-family: var(--font-sans);
  font-weight: 600;
  min-width: 50px;
  text-align: center;
  transition: all 0.15s;
}

.action-none {
  background: var(--bg-secondary);
  color: var(--text-secondary);
}
.action-buy {
  background: var(--accent, #6366f1);
  color: #fff;
  border-color: var(--accent, #6366f1);
}
.action-sell {
  background: #ef4444;
  color: #fff;
  border-color: #ef4444;
}
.btn-action:hover {
  opacity: 0.85;
}
</style>
