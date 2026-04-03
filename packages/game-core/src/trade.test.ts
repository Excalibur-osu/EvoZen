/**
 * trade.ts 回归测试
 *
 * 对标 legacy/src/resources.js
 * 验证价格公式、路线上限、手动买卖、自动贸易 tick。
 */

import { describe, it, expect } from 'vitest';
import {
  getBuyPrice,
  getSellPrice,
  getManualTradeLimit,
  getTradeRouteQtyLimit,
  getMaxTradeRoutes,
  buyResource,
  sellResource,
  tradeTick,
} from './trade';
import { RESOURCE_VALUES, TRADE_RATIOS } from './resources';
import { createNewGame } from './state';
import type { GameState } from '@evozen/shared-types';

// ─── 测试辅助 ─────────────────────────────────────

function makeState(): GameState {
  const s = createNewGame();
  s.race.species = 'human';
  s.resource['Money'] = { name: '金币', display: true, value: 0, amount: 10000, max: 50000, rate: 0, crates: 0, diff: 0, delta: 0 };
  s.resource['Lumber'] = { name: '木材', display: true, value: 0, amount: 500, max: 1000, rate: 0, crates: 0, diff: 0, delta: 0 };
  s.resource['Food'] = { name: '食物', display: true, value: 0, amount: 500, max: 1000, rate: 0, crates: 0, diff: 0, delta: 0 };
  s.resource['Iron'] = { name: '铁', display: true, value: 0, amount: 100, max: 500, rate: 0, crates: 0, diff: 0, delta: 0 };
  return s;
}

// ============================================================
// 价格公式 — legacy resources.js L1977 buy = value × ratio / divide
// ============================================================

describe('getBuyPrice — 买入价格公式', () => {
  it('buyPrice = value × ratio（无种族加成）', () => {
    const lumberValue = RESOURCE_VALUES['Lumber'] ?? 0;
    const lumberRatio = TRADE_RATIOS['Lumber'] ?? 1;
    const expected = +(lumberValue * lumberRatio).toFixed(1);
    expect(getBuyPrice('Lumber')).toBe(expected);
  });

  it('buyPrice > 0 对所有可交易资源', () => {
    const resources = ['Food', 'Lumber', 'Stone', 'Furs', 'Copper', 'Iron', 'Cement', 'Coal'];
    for (const res of resources) {
      expect(getBuyPrice(res)).toBeGreaterThan(0);
    }
  });

  it('未知资源 buyPrice = 0', () => {
    expect(getBuyPrice('UnknownResource')).toBe(0);
  });
});

describe('getSellPrice — 卖出价格公式', () => {
  it('sellPrice = buyPrice / 4 — legacy resources.js divide=4', () => {
    const buyP = getBuyPrice('Lumber');
    const sellP = getSellPrice('Lumber');
    expect(sellP).toBeCloseTo(buyP / 4, 3);
  });

  it('sellPrice < buyPrice 对所有资源', () => {
    const resources = ['Food', 'Lumber', 'Stone', 'Iron'];
    for (const res of resources) {
      expect(getSellPrice(res)).toBeLessThan(getBuyPrice(res));
    }
  });
});

// ============================================================
// 交易数量上限 — legacy resources.js tradeMax / importRouteEnabled
// ============================================================

describe('getManualTradeLimit', () => {
  it('currency < 4 → 100', () => {
    const s = makeState();
    s.tech['currency'] = 3;
    expect(getManualTradeLimit(s)).toBe(100);
  });

  it('currency = 0 → 100', () => {
    const s = makeState();
    expect(getManualTradeLimit(s)).toBe(100);
  });

  it('currency >= 4 → 5000', () => {
    const s = makeState();
    s.tech['currency'] = 4;
    expect(getManualTradeLimit(s)).toBe(5000);
  });
});

describe('getTradeRouteQtyLimit', () => {
  it('currency < 4 → 25', () => {
    const s = makeState();
    s.tech['currency'] = 1;
    expect(getTradeRouteQtyLimit(s)).toBe(25);
  });

  it('currency >= 4 → 100', () => {
    const s = makeState();
    s.tech['currency'] = 4;
    expect(getTradeRouteQtyLimit(s)).toBe(100);
  });
});

// ============================================================
// 贸易路线上限 — legacy main.js L9865
// ============================================================

describe('getMaxTradeRoutes', () => {
  it('无贸易站 → 0 条路线', () => {
    const s = makeState();
    s.tech['trade'] = 1;
    expect(getMaxTradeRoutes(s)).toBe(0);
  });

  it('trade:1 + 1 座贸易站 → (1+1)=2 条路线', () => {
    const s = makeState();
    s.tech['trade'] = 1;
    (s.city as any)['trade_post'] = { count: 1 };
    expect(getMaxTradeRoutes(s)).toBe(2);
  });

  it('trade:2 + 2 座贸易站 → (2+1)×2=6 条路线', () => {
    const s = makeState();
    s.tech['trade'] = 2;
    (s.city as any)['trade_post'] = { count: 2 };
    expect(getMaxTradeRoutes(s)).toBe(6);
  });

  it('trade:3 + 1 贸易站 + 2 仓储站 → 4 + 2 = 6 条路线', () => {
    const s = makeState();
    s.tech['trade'] = 3;
    (s.city as any)['trade_post'] = { count: 1 };
    (s.city as any)['storage_yard'] = { count: 2 };
    // (3+1)×1 + 2 = 6
    expect(getMaxTradeRoutes(s)).toBe(6);
  });

  it('wharf 每座 +2 条路线 — legacy actions.js L3214', () => {
    const s = makeState();
    s.tech['trade'] = 1;
    (s.city as any)['trade_post'] = { count: 1 };
    (s.city as any)['wharf'] = { count: 3 };
    // 2 (贸易站) + 3×2 (wharf) = 8
    expect(getMaxTradeRoutes(s)).toBe(8);
  });
});

// ============================================================
// 手动买入 — buyResource
// ============================================================

describe('buyResource', () => {
  it('足够金币时买入成功，资源+qty，金币-price', () => {
    const s = makeState();
    const price = getBuyPrice('Lumber') * 10;
    const result = buyResource(s, 'Lumber', 10);
    expect(result).not.toBeNull();
    expect(result!.resource['Lumber'].amount).toBe(510);
    expect(result!.resource['Money'].amount).toBeCloseTo(10000 - price, 1);
  });

  it('金币不足时返回 null', () => {
    const s = makeState();
    s.resource['Money'].amount = 0;
    expect(buyResource(s, 'Lumber', 10)).toBeNull();
  });

  it('资源已满时返回 null', () => {
    const s = makeState();
    s.resource['Lumber'].amount = 1000; // max=1000
    expect(buyResource(s, 'Lumber', 1)).toBeNull();
  });

  it('购买数量不超过 getManualTradeLimit', () => {
    const s = makeState();
    // currency=0 → limit=100，尝试买 200 应该被截断到 100
    const result = buyResource(s, 'Lumber', 200);
    expect(result).not.toBeNull();
    expect(result!.resource['Lumber'].amount).toBe(500 + 100);
  });

  it('不修改原始 state（不可变）', () => {
    const s = makeState();
    const originalMoney = s.resource['Money'].amount;
    buyResource(s, 'Lumber', 10);
    expect(s.resource['Money'].amount).toBe(originalMoney);
  });
});

// ============================================================
// 手动卖出 — sellResource
// ============================================================

describe('sellResource', () => {
  it('足够资源时卖出成功，资源-qty，金币+income', () => {
    const s = makeState();
    const income = getSellPrice('Lumber') * 50;
    const result = sellResource(s, 'Lumber', 50);
    expect(result).not.toBeNull();
    expect(result!.resource['Lumber'].amount).toBe(450);
    expect(result!.resource['Money'].amount).toBeCloseTo(10000 + income, 1);
  });

  it('资源不足时返回 null', () => {
    const s = makeState();
    s.resource['Lumber'].amount = 5;
    expect(sellResource(s, 'Lumber', 10)).toBeNull();
  });

  it('不修改原始 state（不可变）', () => {
    const s = makeState();
    const originalLumber = s.resource['Lumber'].amount;
    sellResource(s, 'Lumber', 50);
    expect(s.resource['Lumber'].amount).toBe(originalLumber);
  });
});

// ============================================================
// 自动贸易 tick — tradeTick
// ============================================================

describe('tradeTick', () => {
  it('无 trade 科技时返回空 deltas', () => {
    const s = makeState();
    expect(tradeTick(s)).toEqual({});
  });

  it('无路线时返回空 deltas', () => {
    const s = makeState();
    s.tech['trade'] = 1;
    expect(tradeTick(s)).toEqual({});
  });

  it('buy 路线：金币减少，资源增加', () => {
    const s = makeState();
    s.tech['trade'] = 1;
    const price = getBuyPrice('Lumber');
    (s.city as any).trade_routes = [{ resource: 'Lumber', action: 'buy', qty: 5 }];
    const deltas = tradeTick(s);
    expect(deltas['Lumber']).toBe(5);
    expect(deltas['Money']).toBeCloseTo(-(price * 5), 1);
  });

  it('sell 路线：资源减少，金币增加', () => {
    const s = makeState();
    s.tech['trade'] = 1;
    const income = getSellPrice('Lumber');
    (s.city as any).trade_routes = [{ resource: 'Lumber', action: 'sell', qty: 10 }];
    const deltas = tradeTick(s);
    expect(deltas['Lumber']).toBe(-10);
    expect(deltas['Money']).toBeCloseTo(income * 10, 1);
  });

  it('金币不足时 buy 路线跳过', () => {
    const s = makeState();
    s.tech['trade'] = 1;
    s.resource['Money'].amount = 0;
    (s.city as any).trade_routes = [{ resource: 'Lumber', action: 'buy', qty: 10 }];
    const deltas = tradeTick(s);
    expect(deltas['Lumber'] ?? 0).toBe(0);
  });

  it('资源不足时 sell 路线跳过', () => {
    const s = makeState();
    s.tech['trade'] = 1;
    s.resource['Lumber'].amount = 3;
    (s.city as any).trade_routes = [{ resource: 'Lumber', action: 'sell', qty: 10 }];
    const deltas = tradeTick(s);
    expect(deltas['Lumber'] ?? 0).toBe(0);
  });

  it('none 路线被跳过', () => {
    const s = makeState();
    s.tech['trade'] = 1;
    (s.city as any).trade_routes = [{ resource: 'Lumber', action: 'none', qty: 10 }];
    const deltas = tradeTick(s);
    expect(Object.keys(deltas)).toHaveLength(0);
  });

  it('多条路线同时执行，金币累积', () => {
    const s = makeState();
    s.tech['trade'] = 1;
    (s.city as any).trade_routes = [
      { resource: 'Lumber', action: 'sell', qty: 10 },
      { resource: 'Iron', action: 'sell', qty: 5 },
    ];
    const deltas = tradeTick(s);
    const expectedIncome = getSellPrice('Lumber') * 10 + getSellPrice('Iron') * 5;
    expect(deltas['Money']).toBeCloseTo(expectedIncome, 1);
  });
});
