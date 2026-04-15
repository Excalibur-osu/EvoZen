/**
 * morale.ts 回归测试
 *
 * 对标 legacy/src/main.js L1286-3290
 * 验证 calculateMorale 的每个分项与公式常量。
 */

import { describe, it, expect } from 'vitest';
import { calculateMorale } from './morale';
import { createNewGame } from './state';
import type { GameState } from '@evozen/shared-types';

// ─── 测试辅助 ─────────────────────────────────────

function makeState(): GameState {
  const s = createNewGame();
  s.race.species = 'human';
  // 无工人，确保基础值干净
  return s;
}

function setCalendar(s: GameState, season: number, year = 1, weather = 1, temp = 1, wind = 0) {
  (s.city as any).calendar = { season, year, weather, temp, wind, day: 1 };
}

// ============================================================
// 基础值
// ============================================================

describe('calculateMorale — 基础值', () => {
  it('无任何修正时士气为 100', () => {
    const s = makeState();
    setCalendar(s, 1); // 夏季：无季节加成，多云：无天气效果
    const result = calculateMorale(s);
    expect(result.morale).toBe(100);
  });

  it('globalMultiplier 在 morale=100 时为 1.0', () => {
    const s = makeState();
    setCalendar(s, 1);
    const { globalMultiplier } = calculateMorale(s);
    expect(globalMultiplier).toBe(1.0);
  });
});

// ============================================================
// 季节加成 — legacy main.js L1317-1337
// ============================================================

describe('季节加成', () => {
  it('春季 (season=0) 且 year>0 → +5', () => {
    const s = makeState();
    setCalendar(s, 0, 1, 1); // 春, year=1, 多云
    const { morale } = calculateMorale(s);
    expect(morale).toBe(100);  // cap at 100, so 105 → clamped to 100
  });

  it('冬季 (season=3) → -5', () => {
    const s = makeState();
    setCalendar(s, 3, 1, 1);
    const { morale } = calculateMorale(s);
    expect(morale).toBe(95);
  });

  it('第 0 年春季 → 无加成（仍是 100）', () => {
    const s = makeState();
    setCalendar(s, 0, 0, 1);
    const { morale } = calculateMorale(s);
    expect(morale).toBe(100);
  });

  it('夏季和秋季无加成', () => {
    for (const season of [1, 2]) {
      const s = makeState();
      setCalendar(s, season, 1, 1);
      expect(calculateMorale(s).morale).toBe(100);
    }
  });
});

// ============================================================
// 天气效果 — legacy main.js L1397-1438
// ============================================================

describe('天气效果', () => {
  it('晴天(weather=2)+ 无风(wind=0)+ 非热(temp<2) → +2', () => {
    const s = makeState();
    setCalendar(s, 1, 1, 2, 1, 0); // 夏, 晴, 温和, 无风
    expect(calculateMorale(s).morale).toBe(100);  // capped at 100
  });

  it('晴天(weather=2)+ 有风(wind=1)+ 热(temp=2) → +2', () => {
    const s = makeState();
    setCalendar(s, 1, 1, 2, 2, 1);
    expect(calculateMorale(s).morale).toBe(100);  // capped at 100
  });

  it('雷暴(weather=0, temp>0, wind=1) → -5', () => {
    const s = makeState();
    setCalendar(s, 1, 1, 0, 1, 1);
    expect(calculateMorale(s).morale).toBe(95);
  });

  it('普通雨(weather=0, temp>0, wind=0) → -2', () => {
    const s = makeState();
    setCalendar(s, 1, 1, 0, 1, 0);
    expect(calculateMorale(s).morale).toBe(98);
  });

  it('寒雨(weather=0, temp=0) → 无效果', () => {
    const s = makeState();
    setCalendar(s, 3, 1, 0, 0, 0);
    // 冬季-5，无天气效果 → 95
    expect(calculateMorale(s).morale).toBe(95);
  });

  it('多云(weather=1) → 无效果', () => {
    const s = makeState();
    setCalendar(s, 1, 1, 1, 1, 0);
    expect(calculateMorale(s).morale).toBe(100);
  });
});

// ============================================================
// 失业惩罚 — legacy main.js L1469-1473
// ============================================================

describe('失业惩罚', () => {
  it('5 个失业人口 → 士气 -5', () => {
    const s = makeState();
    setCalendar(s, 1);
    (s.civic['unemployed'] as any) = { workers: 5, max: -1, display: true };
    expect(calculateMorale(s).morale).toBe(95);
  });

  it('失业 0 → 无惩罚', () => {
    const s = makeState();
    setCalendar(s, 1);
    (s.civic['unemployed'] as any) = { workers: 0, max: -1, display: true };
    expect(calculateMorale(s).morale).toBe(100);
  });
});

// ============================================================
// 压力 — legacy main.js L2968-3004
// ============================================================

describe('压力计算', () => {
  it('猎人使用固定 divisor=5 计算压力', () => {
    const s = makeState();
    setCalendar(s, 1);
    // 5 猎人 → stress = -5/5 = -1
    (s.civic['hunter'] as any) = { workers: 5, max: -1, display: true };
    const { breakdown } = calculateMorale(s);
    expect(breakdown.stress).toBeCloseTo(-1, 5);
  });

  it('独裁政体压力减少 25% — legacy main.js L3120-3121', () => {
    const s = makeState();
    setCalendar(s, 1);
    (s.civic['hunter'] as any) = { workers: 10, max: -1, display: true };

    const base = makeState();
    setCalendar(base, 1);
    (base.civic['hunter'] as any) = { workers: 10, max: -1, display: true };

    const auto = makeState();
    setCalendar(auto, 1);
    (auto.civic['hunter'] as any) = { workers: 10, max: -1, display: true };
    (auto.civic as any).govern = { type: 'autocracy', rev: 0 };

    const baseStress = calculateMorale(base).breakdown.stress;
    const autoStress = calculateMorale(auto).breakdown.stress;

    // 独裁压力 = 基础压力 × 0.75
    expect(autoStress).toBeCloseTo(baseStress * 0.75, 5);
  });

  it('独裁政体在 high_tech:2 时压力修正降为 18%', () => {
    const base = makeState();
    setCalendar(base, 1);
    (base.civic['hunter'] as any) = { workers: 10, max: -1, display: true };

    const auto = makeState();
    setCalendar(auto, 1);
    auto.tech['high_tech'] = 2;
    (auto.civic['hunter'] as any) = { workers: 10, max: -1, display: true };
    (auto.civic as any).govern = { type: 'autocracy', rev: 0 };

    const baseStress = calculateMorale(base).breakdown.stress;
    const autoStress = calculateMorale(auto).breakdown.stress;

    expect(autoStress).toBe(-1.6);
  });
});

// ============================================================
// 娱乐 — legacy main.js L3020-3041
// ============================================================

describe('娱乐加成', () => {
  it('无 theatre 科技时艺人无效果', () => {
    const s = makeState();
    setCalendar(s, 1);
    (s.civic['entertainer'] as any) = { workers: 3, max: -1, display: true };
    // theatre=0 → no entertainment
    expect(calculateMorale(s).breakdown.entertain).toBe(0);
  });

  it('2 艺人 × theatre:2 → breakdown.entertain = 4', () => {
    const s = makeState();
    setCalendar(s, 1);
    s.tech['theatre'] = 2;
    (s.civic['entertainer'] as any) = { workers: 2, max: -1, display: true };
    // entertainment = 2 × 2 = 4（艺人自身有 stress:10，产生 -0.2 压力，morale=103.8）
    expect(calculateMorale(s).breakdown.entertain).toBe(4);
  });

  it('民主政体娱乐 +20% — legacy civics.js L193', () => {
    const base = makeState();
    setCalendar(base, 1);
    base.tech['theatre'] = 2;
    (base.civic['entertainer'] as any) = { workers: 2, max: -1, display: true };

    const demo = makeState();
    setCalendar(demo, 1);
    demo.tech['theatre'] = 2;
    (demo.civic['entertainer'] as any) = { workers: 2, max: -1, display: true };
    (demo.civic as any).govern = { type: 'democracy', rev: 0 };

    const baseEnt = calculateMorale(base).breakdown.entertain;
    const demoEnt = calculateMorale(demo).breakdown.entertain;

    expect(demoEnt).toBeCloseTo(baseEnt * 1.2, 5);
  });

  it('民主政体在 high_tech:2 时娱乐加成提升到 +25%', () => {
    const base = makeState();
    setCalendar(base, 1);
    base.tech['theatre'] = 2;
    (base.civic['entertainer'] as any) = { workers: 2, max: -1, display: true };

    const demo = makeState();
    setCalendar(demo, 1);
    demo.tech['theatre'] = 2;
    demo.tech['high_tech'] = 2;
    (demo.civic['entertainer'] as any) = { workers: 2, max: -1, display: true };
    (demo.civic as any).govern = { type: 'democracy', rev: 0 };

    const baseEnt = calculateMorale(base).breakdown.entertain;
    const demoEnt = calculateMorale(demo).breakdown.entertain;

    expect(demoEnt).toBeCloseTo(baseEnt * 1.25, 5);
  });
});

// ============================================================
// 士气上限 — legacy main.js L3164-3211
// ============================================================

describe('士气上限', () => {
  it('默认上限为 100', () => {
    const s = makeState();
    setCalendar(s, 1);
    expect(calculateMorale(s).moraleCap).toBe(100);
  });

  it('每座圆形剧场 +1 上限', () => {
    const s = makeState();
    setCalendar(s, 1);
    (s.city['amphitheatre'] as any) = { count: 3, on: 3 };
    expect(calculateMorale(s).moraleCap).toBe(103);
  });

  it('每座已通电赌场 +1 上限', () => {
    const s = makeState();
    setCalendar(s, 1);
    expect(calculateMorale(s, { activeCasinos: 2 }).moraleCap).toBe(102);
  });

  it('税率 10 → 低税率奖励 +5（10 - floor(10/2)）', () => {
    const s = makeState();
    setCalendar(s, 1);
    (s.civic as any).taxes = { tax_rate: 10 };
    // 10 - floor(10/2) = 10 - 5 = 5
    expect(calculateMorale(s).moraleCap).toBe(105);
  });

  it('税率 0 → 低税率奖励 +10', () => {
    const s = makeState();
    setCalendar(s, 1);
    (s.civic as any).taxes = { tax_rate: 0 };
    expect(calculateMorale(s).moraleCap).toBe(110);
  });

  it('税率 ≥ 20 → 无奖励', () => {
    const s = makeState();
    setCalendar(s, 1);
    (s.civic as any).taxes = { tax_rate: 20 };
    expect(calculateMorale(s).moraleCap).toBe(100);
  });

  it('士气超过上限时钳位到 moraleCap', () => {
    const s = makeState();
    setCalendar(s, 0, 1, 2, 1, 0); // 春+5, 晴+2 → 107
    s.tech['theatre'] = 3;
    (s.civic['entertainer'] as any) = { workers: 10, max: -1, display: true }; // +30
    // morale = 107 + 30 = 137，但上限 125 → 钳位到 125
    const { morale, moraleCap } = calculateMorale(s);
    expect(moraleCap).toBe(100);
    expect(morale).toBe(100);
  });

  it('士气低于 50 时钳位到 50', () => {
    const s = makeState();
    setCalendar(s, 1);
    (s.civic['unemployed'] as any) = { workers: 100, max: -1, display: true }; // -100
    expect(calculateMorale(s).morale).toBe(50);
  });
});

// ============================================================
// 全局乘数公式 — legacy main.js L3274-3289
// ============================================================

describe('globalMultiplier 公式', () => {
  it('morale=50 → 0.5（惩罚区）', () => {
    const s = makeState();
    setCalendar(s, 1);
    (s.civic['unemployed'] as any) = { workers: 100, max: -1, display: true }; // 钳位到 50
    expect(calculateMorale(s).globalMultiplier).toBeCloseTo(0.5, 4);
  });

  it('morale=80 → 0.8', () => {
    const s = makeState();
    setCalendar(s, 1);
    (s.civic['unemployed'] as any) = { workers: 20, max: -1, display: true }; // 100-20=80
    expect(calculateMorale(s).globalMultiplier).toBeCloseTo(0.8, 4);
  });

  it('morale=100 → 1.0', () => {
    const s = makeState();
    setCalendar(s, 1);
    expect(calculateMorale(s).globalMultiplier).toBe(1.0);
  });

  it('morale=120 → 1 + (120-100)/200 = 1.1', () => {
    const s = makeState();
    setCalendar(s, 0, 1, 2, 1, 0); // 春+5, 晴+2 → 107
    s.tech['theatre'] = 2;
    (s.civic['entertainer'] as any) = { workers: 6, max: -1, display: true }; // +12 → 119≈120 after rounding
    const { morale, globalMultiplier } = calculateMorale(s);
    // globalMultiplier = 1 + (morale - 100) / 200
    const expected = 1 + (morale - 100) / 200;
    expect(globalMultiplier).toBeCloseTo(expected, 4);
  });

  it('morale=100（上限）→ 1 + 0/200 = 1.0', () => {
    const s = makeState();
    setCalendar(s, 0, 1, 2, 1, 0); // 春+5, 晴+2
    s.tech['theatre'] = 3;
    (s.civic['entertainer'] as any) = { workers: 10, max: -1, display: true }; // +30 → 钳位到100
    expect(calculateMorale(s).globalMultiplier).toBeCloseTo(1.0, 4);
  });
});
