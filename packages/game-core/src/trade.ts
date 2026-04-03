/**
 * 贸易系统 (Trade System)
 *
 * 本模块实现原版 Evolve 的贸易站买卖机制：
 * - 买入：花费金币购入资源，价格 = 资源基础价值 × 贸易比率
 * - 卖出：出售资源获得金币，卖价 = 买价 / 4（与原版一致）
 * - 贸易路线：每座贸易站提供多条自动贸易路线（买/卖/关闭），每 tick 自动执行
 *
 * 纯函数模块，零 UI 依赖。
 */

import type { GameState } from '@evozen/shared-types';
import { RESOURCE_VALUES, TRADE_RATIOS } from './resources';
import { getTradeBuyPriceMultiplier, getTradeSellPriceMultiplier } from './traits';

// ============================================================
// 贸易路线数据结构
// ============================================================

/** 单条贸易路线的配置 */
export interface TradeRoute {
  /** 交易的资源 ID */
  resource: string;
  /** 'buy' = 买入资源, 'sell' = 卖出资源, 'none' = 关闭 */
  action: 'buy' | 'sell' | 'none';
  /** 每次交易的数量倍率（默认 1） */
  qty: number;
}

// ============================================================
// 可交易资源列表
// ============================================================

/** 第一阶段支持贸易的资源 ID */
export const TRADABLE_RESOURCES = [
  'Food', 'Lumber', 'Stone', 'Furs', 'Copper', 'Iron', 'Cement', 'Coal',
] as const;

export type TradableResourceId = (typeof TRADABLE_RESOURCES)[number];

/**
 * 手动市场每次交易的数量上限
 *
 * 对标 legacy resources.js tradeMax():
 * - currency < 4 → 100
 * - currency >= 4 → 5000
 */
export function getManualTradeLimit(state: GameState): number {
  return (state.tech['currency'] ?? 0) >= 4 ? 5000 : 100;
}

/**
 * 单条资源贸易路线的数量上限
 *
 * 对标 legacy resources.js importRouteEnabled/exportRouteEnabled():
 * - currency < 4 → 25
 * - currency >= 4 → 100
 */
export function getTradeRouteQtyLimit(state: GameState): number {
  return (state.tech['currency'] ?? 0) >= 4 ? 100 : 25;
}

// ============================================================
// 价格计算
// ============================================================

/**
 * 计算资源的买入价格（每单位花费的金币）
 *
 * 原版公式简化：buyPrice = value × tradeRatio
 */
export function getBuyPrice(resourceId: string, state?: GameState): number {
  const value = RESOURCE_VALUES[resourceId] ?? 0;
  const ratio = TRADE_RATIOS[resourceId] ?? 1;
  const traitMult = state ? getTradeBuyPriceMultiplier(state) : 1;
  return +(value * ratio * traitMult).toFixed(1);
}

/**
 * 计算资源的卖出价格（每单位获得的金币）
 *
 * 原版公式简化：sellPrice = value × tradeRatio / 4
 */
export function getSellPrice(resourceId: string, state?: GameState): number {
  const value = RESOURCE_VALUES[resourceId] ?? 0;
  const ratio = TRADE_RATIOS[resourceId] ?? 1;
  const traitMult = state ? getTradeSellPriceMultiplier(state) : 1;
  return +(((value * ratio) / 4) * traitMult).toFixed(1);
}

// ============================================================
// 手动买卖
// ============================================================

/**
 * 手动买入资源
 * @param state      当前状态
 * @param resourceId 要购买的资源 ID
 * @param qty        数量
 * @returns 新状态，或 null（金币不足/资源满）
 */
export function buyResource(
  state: GameState,
  resourceId: string,
  qty: number = 1
): GameState | null {
  qty = Math.max(1, Math.floor(qty));
  qty = Math.min(qty, getManualTradeLimit(state));
  const price = getBuyPrice(resourceId, state) * qty;
  const money = state.resource['Money'];
  if (!money || money.amount < price) return null;

  const res = state.resource[resourceId];
  if (!res) return null;
  // 如果有上限且已满，不允许买入
  if (res.max > 0 && res.amount >= res.max) return null;

  const newState: GameState = JSON.parse(JSON.stringify(state));
  newState.resource['Money'].amount -= price;
  const targetRes = newState.resource[resourceId];
  targetRes.amount += qty;
  // 钳位到上限
  if (targetRes.max > 0 && targetRes.amount > targetRes.max) {
    targetRes.amount = targetRes.max;
  }

  return newState;
}

/**
 * 手动卖出资源
 * @param state      当前状态
 * @param resourceId 要出售的资源 ID
 * @param qty        数量
 * @returns 新状态，或 null（资源不足）
 */
export function sellResource(
  state: GameState,
  resourceId: string,
  qty: number = 1
): GameState | null {
  qty = Math.max(1, Math.floor(qty));
  qty = Math.min(qty, getManualTradeLimit(state));
  const res = state.resource[resourceId];
  if (!res || res.amount < qty) return null;

  const income = getSellPrice(resourceId, state) * qty;

  const newState: GameState = JSON.parse(JSON.stringify(state));
  newState.resource[resourceId].amount -= qty;
  newState.resource['Money'].amount += income;
  // 金币钳位
  const moneyRes = newState.resource['Money'];
  if (moneyRes.max > 0 && moneyRes.amount > moneyRes.max) {
    moneyRes.amount = moneyRes.max;
  }

  return newState;
}

// ============================================================
// 贸易路线 Tick（自动贸易）
// ============================================================

/**
 * 每个 tick 执行所有贸易路线
 * 贸易路线存储在 state.city.trade_routes 数组中
 *
 * @returns 各资源的 delta 变化量
 */
export function tradeTick(state: GameState): Record<string, number> {
  const deltas: Record<string, number> = {};

  // 贸易科技未解锁则跳过
  if ((state.tech['trade'] ?? 0) < 1) return deltas;

  const routes = (state.city as any).trade_routes as TradeRoute[] | undefined;
  if (!routes || routes.length === 0) return deltas;

  for (const route of routes) {
    if (route.action === 'none') continue;

    const { resource, action, qty } = route;

    if (action === 'buy') {
      const price = getBuyPrice(resource, state) * qty;
      const money = state.resource['Money']?.amount ?? 0;
      const totalMoneyDelta = deltas['Money'] ?? 0;
      // 检查金币是否足够（考虑之前路线的消耗）
      if (money + totalMoneyDelta < price) continue;

      const res = state.resource[resource];
      if (!res) continue;
      // 检查是否已满
      if (res.max > 0 && res.amount >= res.max) continue;

      deltas['Money'] = (deltas['Money'] ?? 0) - price;
      deltas[resource] = (deltas[resource] ?? 0) + qty;
    } else if (action === 'sell') {
      const income = getSellPrice(resource, state) * qty;
      const resAmount = state.resource[resource]?.amount ?? 0;
      const totalResDelta = deltas[resource] ?? 0;
      // 检查资源是否充足
      if (resAmount + totalResDelta < qty) continue;

      deltas[resource] = (deltas[resource] ?? 0) - qty;
      deltas['Money'] = (deltas['Money'] ?? 0) + income;
    }
  }

  return deltas;
}

// ============================================================
// 贸易路线管理
// ============================================================

/**
 * 获取当前可用的贸易路线数量上限
 *
 * 对标原版 main.js L9865：
 * - 普通种族下每座贸易站提供 `trade等级 + 1` 条路线
 * - 当前阶段未实现 xenophobic / nomadic 等种族修正
 */
export function getMaxTradeRoutes(state: GameState): number {
  const tradePost = state.city['trade_post'] as { count: number } | undefined;
  const tradeLevel = state.tech['trade'] ?? 0;
  const tradePostCount = tradePost?.count ?? 0;
  const routesPerPost = tradeLevel >= 1 ? tradeLevel + 1 : 0;
  let totalRoutes = tradePostCount * routesPerPost;

  // 对标原版 main.js L9890-9893:
  // freight (trade:3) 后每座 storage_yard 额外提供 1 条贸易路线
  if (tradeLevel >= 3) {
    const storageYards = (state.city['storage_yard'] as { count: number } | undefined)?.count ?? 0;
    totalRoutes += storageYards;
  }

  // 对标 actions.js L3214: wharf 每座 +2 贸易路线（无需通电）
  const wharves = (state.city['wharf'] as { count: number } | undefined)?.count ?? 0;
  totalRoutes += wharves * 2;

  return totalRoutes;
}

/**
 * 添加或修改一条贸易路线
 */
export function setTradeRoute(
  state: GameState,
  index: number,
  route: TradeRoute
): GameState {
  const newState: GameState = JSON.parse(JSON.stringify(state));
  if (!(newState.city as any).trade_routes) {
    (newState.city as any).trade_routes = [];
  }
  const routes = (newState.city as any).trade_routes as TradeRoute[];
  routes[index] = {
    ...route,
    qty: Math.max(1, Math.min(Math.floor(route.qty ?? 1), getTradeRouteQtyLimit(newState))),
  };
  return newState;
}
