/**
 * events.ts 事件系统测试
 *
 * 验证：
 * 1. 事件条件筛选逻辑
 * 2. 事件效果正确修改 state
 * 3. 边界情况（防御性检查）
 */

import { describe, it, expect } from 'vitest';
import { createNewGame } from './state';
import { EVENTS } from './events';
import type { GameState } from '@evozen/shared-types';

function makeCivState(): GameState {
  const s = createNewGame();
  s.race.species = 'human';
  s.resource['human'] = { name: '人类', display: true, value: 0, amount: 5, max: 10, rate: 0, crates: 0, diff: 0, delta: 0 };
  s.resource['Food'].display = true;
  s.resource['Food'].amount = 100;
  s.resource['Lumber'].display = true;
  s.resource['Lumber'].amount = 100;
  s.resource['Money'].display = true;
  s.resource['Money'].amount = 50;
  s.tech['primitive'] = 1;
  return s;
}

// ============================================================
// 事件列表完整性
// ============================================================

describe('EVENTS 列表结构', () => {
  it('所有事件都有必要字段', () => {
    for (const ev of EVENTS) {
      expect(ev.id, `事件 ${ev.id} 缺少 id`).toBeTruthy();
      expect(['major', 'minor']).toContain(ev.type);
      expect(typeof ev.effect).toBe('function');
    }
  });

  it('不存在重复 id', () => {
    const ids = EVENTS.map(e => e.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('至少有 5 个 major 事件和 8 个 minor 事件', () => {
    const majors = EVENTS.filter(e => e.type === 'major');
    const minors = EVENTS.filter(e => e.type === 'minor');
    expect(majors.length).toBeGreaterThanOrEqual(5);
    expect(minors.length).toBeGreaterThanOrEqual(8);
  });
});

// ============================================================
// fire 事件
// ============================================================

describe('fire 事件效果', () => {
  it('有木材时减少木材', () => {
    const s = makeCivState();
    s.resource['Lumber'].amount = 200;
    const fireEv = EVENTS.find(e => e.id === 'fire')!;
    const before = s.resource['Lumber'].amount;
    fireEv.effect(s);
    expect(s.resource['Lumber'].amount).toBeLessThan(before);
  });

  it('木材为 0 时不崩溃，返回无损失消息', () => {
    const s = makeCivState();
    s.resource['Lumber'].amount = 0;
    const fireEv = EVENTS.find(e => e.id === 'fire')!;
    expect(() => fireEv.effect(s)).not.toThrow();
    expect(s.resource['Lumber'].amount).toBe(0); // 不变
  });
});

// ============================================================
// mine_collapse 事件
// ============================================================

describe('mine_collapse 事件', () => {
  it('condition: 矿工 > 0 且人口 > 0 时为 true', () => {
    const s = makeCivState();
    s.tech['mining'] = 1;
    s.civic['miner'] = { workers: 2, max: 2, display: true } as any;

    const ev = EVENTS.find(e => e.id === 'mine_collapse')!;
    expect(ev.condition!(s)).toBe(true);
  });

  it('condition: 无矿工时为 false', () => {
    const s = makeCivState();
    s.tech['mining'] = 1;
    s.civic['miner'] = { workers: 0, max: 2, display: true } as any;

    const ev = EVENTS.find(e => e.id === 'mine_collapse')!;
    expect(ev.condition!(s)).toBe(false);
  });

  it('effect: 减少 1 矿工和 1 人口', () => {
    const s = makeCivState();
    s.tech['mining'] = 1;
    s.civic['miner'] = { workers: 2, max: 2, display: true } as any;
    s.civic['unemployed'] = { workers: 3, max: -1, display: true } as any;
    s.resource['human'].amount = 5;

    const ev = EVENTS.find(e => e.id === 'mine_collapse')!;
    ev.effect(s);

    expect((s.civic['miner'] as any).workers).toBe(1);
    expect(s.resource['human'].amount).toBe(4);
    expect((s.civic['unemployed'] as any).workers).toBe(3);
    expect(s.stats.died).toBe(1);
  });
});

describe('raid 事件', () => {
  it('金币为 0 时消息不会虚报金钱损失', () => {
    const s = makeCivState();
    s.tech['military'] = 1;
    s.resource['Money'].amount = 0;
    s.civic.foreign.gov0.hstl = 90;
    s.civic.garrison.workers = 6;
    s.civic.garrison.wounded = 2;

    const ev = EVENTS.find(e => e.id === 'raid')!;
    const original = Math.random;
    let current = 1501 % 233280;
    Math.random = () => {
      current = (current * 9301 + 49297) % 233280;
      return current / 233280;
    };

    try {
      const text = ev.effect(s);
      expect(text).toContain('阵亡 1 人，受伤 2 人');
      expect(text).not.toContain('损失金钱');
      expect(s.resource['Money'].amount).toBe(0);
      expect(s.stats.died).toBe(1);
    } finally {
      Math.random = original;
    }
  });
});

// ============================================================
// dollar / pickpocket 事件
// ============================================================

describe('dollar / pickpocket 事件效果', () => {
  it('dollar 增加金钱（不超上限）', () => {
    const s = makeCivState();
    s.tech['currency'] = 1;
    s.resource['Money'].amount = 999;
    s.resource['Money'].max = 1000;

    const ev = EVENTS.find(e => e.id === 'dollar')!;
    ev.effect(s);
    expect(s.resource['Money'].amount).toBeLessThanOrEqual(1000);
    expect(s.resource['Money'].amount).toBeGreaterThanOrEqual(999);
  });

  it('pickpocket 减少金钱（不低于 0）', () => {
    const s = makeCivState();
    s.resource['Money'].amount = 3;
    s.resource['Money'].max = 1000;

    const ev = EVENTS.find(e => e.id === 'pickpocket')!;
    ev.effect(s);
    // 金额可能被偷光，但不能变负
    expect(s.resource['Money'].amount).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================
// 天气事件
// ============================================================

describe('天气事件 — heatwave / coldsnap', () => {
  it('heatwave 将温度设为 2（热）', () => {
    const s = makeCivState();
    s.city.calendar!.temp = 1;
    const ev = EVENTS.find(e => e.id === 'heatwave')!;
    ev.effect(s);
    expect(s.city.calendar!.temp).toBe(2);
  });

  it('heatwave condition: 当前已经是高温时返回 false', () => {
    const s = makeCivState();
    s.city.calendar!.temp = 2;
    const ev = EVENTS.find(e => e.id === 'heatwave')!;
    expect(ev.condition!(s)).toBe(false);
  });

  it('coldsnap 将温度设为 0（冷）', () => {
    const s = makeCivState();
    s.city.calendar!.temp = 1;
    const ev = EVENTS.find(e => e.id === 'coldsnap')!;
    ev.effect(s);
    expect(s.city.calendar!.temp).toBe(0);
  });

  it('coldsnap condition: 当前已经是低温时返回 false', () => {
    const s = makeCivState();
    s.city.calendar!.temp = 0;
    const ev = EVENTS.find(e => e.id === 'coldsnap')!;
    expect(ev.condition!(s)).toBe(false);
  });
});

// ============================================================
// tax_revolt 事件
// ============================================================

describe('tax_revolt 事件', () => {
  it('condition: 低士气 + 高税率时触发', () => {
    const s = makeCivState();
    s.tech['currency'] = 3; // 解锁税率
    s.city.morale = { current: 80, cap: 125, stress: 0 } as any;
    s.civic.taxes = { tax_rate: 40 } as any;
    s.civic.govern = { type: 'democracy' } as any;

    const ev = EVENTS.find(e => e.id === 'tax_revolt')!;
    // low_morale req: <99, 且税率 > 25
    expect(ev.condition!(s)).toBe(true);
  });

  it('condition: 低税率时不触发', () => {
    const s = makeCivState();
    s.city.morale = { current: 80, cap: 125, stress: 0 } as any;
    s.civic.taxes = { tax_rate: 15 } as any;
    s.civic.govern = { type: 'democracy' } as any;

    const ev = EVENTS.find(e => e.id === 'tax_revolt')!;
    expect(ev.condition!(s)).toBe(false);
  });

  it('effect: 减少可见资源', () => {
    const s = makeCivState();
    s.city.morale = { current: 80, cap: 125, stress: 0 } as any;
    s.civic.taxes = { tax_rate: 50 } as any;
    s.civic.govern = { type: 'democracy' } as any;
    s.resource['Food'].amount = 500;
    s.resource['Lumber'].amount = 500;

    const ev = EVENTS.find(e => e.id === 'tax_revolt')!;
    ev.effect(s);

    // 高税率 (risk = (50-25)*0.04 = 1.0) 应该大量扣除资源
    expect(s.resource['Food'].amount).toBeLessThan(500);
    expect(s.resource['Lumber'].amount).toBeLessThan(500);
  });
});
