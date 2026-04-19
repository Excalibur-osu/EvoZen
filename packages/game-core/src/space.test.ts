/**
 * space.ts + satellite 集成测试
 *
 * 对标 legacy/src/space.js L58-93（satellite 定义）
 * 以及 legacy/src/main.js L4197-4199 / L9329-9331 / L9363-9370（satellite 三类加成）。
 */

import { describe, it, expect } from 'vitest';
import {
  SPACE_STRUCTURES,
  canBuildSpaceStructure,
  getSpaceBuildCost,
  getSatelliteCount,
  getSatelliteKnowledgeCapBonus,
  getSatelliteScientistImpactMultiplier,
  getSatelliteWardenclyffeMultiplier,
  getPropellantDepotCount,
  getPropellantDepotOilCapBonus,
  getPropellantDepotHeliumCapBonus,
  getGpsCount,
  getGpsTradeRouteBonus,
  getMoonBaseCount,
  getMoonBaseIridiumCapBonus,
  getHeliumMineHeliumCapBonus,
} from './space';
import { resolveSpaceSupport } from './space-support';
import { buildSpaceStructure } from './actions';
import { createNewGame } from './state';
import { applyDerivedStateInPlace } from './derived-state';
import { getMaxTradeRoutes } from './trade';
import type { GameState } from '@evozen/shared-types';

function makeState(): GameState {
  const s = createNewGame();
  s.race.species = 'human';
  // 确保主要资源已 display，避免 createNewGame 默认分支差异
  for (const r of [
    'Money', 'Knowledge', 'Oil', 'Alloy', 'Aluminium', 'Copper', 'Titanium',
    'Cement', 'Polymer', 'Lumber', 'Steel', 'Iridium',
  ]) {
    if (!s.resource[r]) {
      s.resource[r] = {
        name: r,
        display: true,
        value: 0,
        amount: 0,
        max: 1_000_000,
        rate: 0,
        crates: 0,
        diff: 0,
        delta: 0,
      };
    }
    s.resource[r].amount = 1_000_000;
    s.resource[r].max = 1_000_000;
  }
  return s;
}

describe('space.ts — 定义与成本公式', () => {
  it('SPACE_STRUCTURES 包含 spc_home 四座 + spc_moon 三座', () => {
    expect(SPACE_STRUCTURES.map((d) => d.id)).toEqual([
      'satellite',
      'propellant_depot',
      'gps',
      'nav_beacon',
      'moon_base',
      'iridium_mine',
      'helium_mine',
    ]);
    const homeIds = SPACE_STRUCTURES.filter((d) => d.region === 'spc_home').map((d) => d.id);
    const moonIds = SPACE_STRUCTURES.filter((d) => d.region === 'spc_moon').map((d) => d.id);
    expect(homeIds).toEqual(['satellite', 'propellant_depot', 'gps', 'nav_beacon']);
    expect(moonIds).toEqual(['moon_base', 'iridium_mine', 'helium_mine']);
  });

  it('satellite 首座成本与 legacy space.js L63-68 一致', () => {
    const s = makeState();
    const cost = getSpaceBuildCost(s, 'satellite');
    expect(cost).toEqual({
      Money: 72000,
      Knowledge: 28000,
      Oil: 3200,
      Alloy: 8000,
    });
  });

  it('satellite 第 2 座成本按 1.22 倍递增（legacy spaceCostMultiplier）', () => {
    const s = makeState();
    (s.space as any)['satellite'] = { count: 1 };
    const cost = getSpaceBuildCost(s, 'satellite');
    expect(cost).toEqual({
      Money: Math.round(72000 * 1.22),
      Knowledge: Math.round(28000 * 1.22),
      Oil: Math.round(3200 * 1.22),
      Alloy: Math.round(8000 * 1.22),
    });
  });
});

describe('space.ts — 前置与建造门槛', () => {
  it('未研究 rocketry（space < 2）时不能建造 satellite', () => {
    const s = makeState();
    expect(s.tech['space'] ?? 0).toBeLessThan(2);
    expect(canBuildSpaceStructure(s, 'satellite')).toBe(false);
  });

  it('tech.space >= 2 且资源充足时可建造 satellite', () => {
    const s = makeState();
    s.tech['space'] = 2;
    expect(canBuildSpaceStructure(s, 'satellite')).toBe(true);
  });

  it('资源不足时阻止建造', () => {
    const s = makeState();
    s.tech['space'] = 2;
    s.resource['Alloy'].amount = 100;
    expect(canBuildSpaceStructure(s, 'satellite')).toBe(false);
  });
});

describe('buildSpaceStructure — 状态迁移', () => {
  it('成功建造后 count +1 并从资源扣除成本', () => {
    const s0 = makeState();
    s0.tech['space'] = 2;
    const s1 = buildSpaceStructure(s0, 'satellite');
    expect(s1).not.toBeNull();
    const next = s1 as GameState;
    expect(getSatelliteCount(next)).toBe(1);
    expect(next.resource['Money'].amount).toBe(1_000_000 - 72000);
    expect(next.resource['Knowledge'].amount).toBe(1_000_000 - 28000);
    expect(next.resource['Oil'].amount).toBe(1_000_000 - 3200);
    expect(next.resource['Alloy'].amount).toBe(1_000_000 - 8000);
  });

  it('前置不满足时返回 null', () => {
    const s = makeState();
    // 保持 space = 0
    expect(buildSpaceStructure(s, 'satellite')).toBeNull();
  });

  it('未知 ID 返回 null', () => {
    const s = makeState();
    s.tech['space'] = 99;
    expect(buildSpaceStructure(s, 'nonexistent')).toBeNull();
  });
});

describe('satellite — 三类加成系数（对标 legacy main.js）', () => {
  it('getSatelliteKnowledgeCapBonus = 750 * count（legacy L9364，非 cataclysm/orbit_decayed）', () => {
    const s = makeState();
    expect(getSatelliteKnowledgeCapBonus(s)).toBe(0);
    (s.space as any)['satellite'] = { count: 3 };
    expect(getSatelliteKnowledgeCapBonus(s)).toBe(2250);
  });

  it('getSatelliteWardenclyffeMultiplier = 1 + count * 0.04（legacy L9330）', () => {
    const s = makeState();
    expect(getSatelliteWardenclyffeMultiplier(s)).toBe(1);
    (s.space as any)['satellite'] = { count: 5 };
    expect(getSatelliteWardenclyffeMultiplier(s)).toBeCloseTo(1.2, 10);
  });

  it('getSatelliteScientistImpactMultiplier = 1 + count * 0.01（legacy L4198）', () => {
    const s = makeState();
    expect(getSatelliteScientistImpactMultiplier(s)).toBe(1);
    (s.space as any)['satellite'] = { count: 10 };
    expect(getSatelliteScientistImpactMultiplier(s)).toBeCloseTo(1.1, 10);
  });
});

describe('propellant_depot — 定义与闸门', () => {
  it('首座成本与 legacy space.js L143-147 一致', () => {
    const s = makeState();
    s.tech['space_explore'] = 1;
    const cost = getSpaceBuildCost(s, 'propellant_depot');
    expect(cost).toEqual({
      Money: 55000,
      Aluminium: 22000,
      Oil: 5500,
    });
  });

  it('第 2 座成本按 1.35 倍递增', () => {
    const s = makeState();
    (s.space as any)['propellant_depot'] = { count: 1 };
    const cost = getSpaceBuildCost(s, 'propellant_depot');
    expect(cost).toEqual({
      Money: Math.round(55000 * 1.35),
      Aluminium: Math.round(22000 * 1.35),
      Oil: Math.round(5500 * 1.35),
    });
  });

  it('space_explore < 1 时不可建造', () => {
    const s = makeState();
    expect(canBuildSpaceStructure(s, 'propellant_depot')).toBe(false);
  });

  it('space_explore >= 1 且资源充足时可建造', () => {
    const s = makeState();
    s.tech['space_explore'] = 1;
    expect(canBuildSpaceStructure(s, 'propellant_depot')).toBe(true);
  });
});

describe('propellant_depot — 存储上限集成', () => {
  it('Oil.max +1250/座 对标 legacy space.js L159', () => {
    const s = makeState();
    s.tech['space_explore'] = 1;
    applyDerivedStateInPlace(s);
    const baseline = s.resource['Oil'].max;

    (s.space as any)['propellant_depot'] = { count: 3 };
    applyDerivedStateInPlace(s);
    expect(s.resource['Oil'].max - baseline).toBe(3 * 1250);
    expect(getPropellantDepotCount(s)).toBe(3);
    expect(getPropellantDepotOilCapBonus(s)).toBe(3750);
  });

  it('Helium_3 未 display 时不贡献上限；display 后按 1000/座 计入', () => {
    const s = makeState();
    s.tech['space_explore'] = 1;
    (s.space as any)['propellant_depot'] = { count: 2 };

    // 默认 Helium_3 未 display
    s.resource['Helium_3'].display = false;
    applyDerivedStateInPlace(s);
    expect(getPropellantDepotHeliumCapBonus(s)).toBe(0);
    expect(s.resource['Helium_3'].max).toBe(0);

    // display 打开后生效
    s.resource['Helium_3'].display = true;
    applyDerivedStateInPlace(s);
    expect(getPropellantDepotHeliumCapBonus(s)).toBe(2000);
    expect(s.resource['Helium_3'].max).toBe(2000);
  });

  it('applyDerivedStateInPlace 多次调用不会重复叠加 Helium_3 上限', () => {
    const s = makeState();
    s.tech['space_explore'] = 1;
    (s.space as any)['propellant_depot'] = { count: 2 };
    s.resource['Helium_3'].display = true;

    applyDerivedStateInPlace(s);
    applyDerivedStateInPlace(s);
    applyDerivedStateInPlace(s);

    expect(s.resource['Helium_3'].max).toBe(2000);
  });
});

describe('gps — 定义与前置', () => {
  it('首座成本与 legacy space.js L108-113 一致', () => {
    const s = makeState();
    const cost = getSpaceBuildCost(s, 'gps');
    expect(cost).toEqual({
      Money: 75000,
      Knowledge: 50000,
      Copper: 6500,
      Oil: 3500,
      Titanium: 8000,
    });
  });

  it('satellite 未建造时不可建造 gps（spaceReqs satellite:1）', () => {
    const s = makeState();
    expect(canBuildSpaceStructure(s, 'gps')).toBe(false);
  });

  it('至少 1 座 satellite + 资源充足时可建造 gps', () => {
    const s = makeState();
    (s.space as any)['satellite'] = { count: 1 };
    expect(canBuildSpaceStructure(s, 'gps')).toBe(true);
  });

  it('terrifying 种族特性阻止建造 gps（对标 legacy not_trait）', () => {
    const s = makeState();
    (s.space as any)['satellite'] = { count: 1 };
    (s.race as Record<string, unknown>).terrifying = true;
    expect(canBuildSpaceStructure(s, 'gps')).toBe(false);
  });
});

describe('gps — 贸易路线加成集成', () => {
  it('count < 4 时不贡献贸易路线（legacy main.js L9885 条件）', () => {
    const s = makeState();
    (s.space as any)['gps'] = { count: 3 };
    expect(getGpsCount(s)).toBe(3);
    expect(getGpsTradeRouteBonus(s)).toBe(0);
  });

  it('count = 4 时 +8 条贸易路线', () => {
    const s = makeState();
    (s.space as any)['gps'] = { count: 4 };
    expect(getGpsTradeRouteBonus(s)).toBe(8);
  });

  it('count = 6 时 +12 条贸易路线（每座 2 条）', () => {
    const s = makeState();
    (s.space as any)['gps'] = { count: 6 };
    expect(getGpsTradeRouteBonus(s)).toBe(12);
  });

  it('getMaxTradeRoutes 在 gps 达阈值后计入 GPS 贡献', () => {
    const s = makeState();
    s.tech['trade'] = 1;
    (s.city as any)['trade_post'] = { count: 1 }; // trade:1 => 每座 2 条
    const before = getMaxTradeRoutes(s);
    expect(before).toBe(2);

    (s.space as any)['gps'] = { count: 4 };
    expect(getMaxTradeRoutes(s)).toBe(2 + 8);
  });
});

describe('satellite — derived-state 知识上限集成', () => {
  it('1 座卫星直接贡献 Knowledge.max +750', () => {
    const s = makeState();
    s.tech['space'] = 2;
    applyDerivedStateInPlace(s);
    const baseline = s.resource['Knowledge'].max;

    (s.space as any)['satellite'] = { count: 1 };
    applyDerivedStateInPlace(s);
    expect(s.resource['Knowledge'].max - baseline).toBe(750);
  });

  it('沃登克里夫存在时，satellite 将其贡献整体放大 (1 + count*0.04)', () => {
    const s = makeState();
    s.tech['space'] = 2;
    s.tech['science'] = 7; // 激活 wardenclyffe 1500 powered bonus
    (s.city as any)['wardenclyffe'] = { count: 1, on: 1 };

    applyDerivedStateInPlace(s);
    const withoutSat = s.resource['Knowledge'].max;

    (s.space as any)['satellite'] = { count: 5 };
    applyDerivedStateInPlace(s);
    const withSat = s.resource['Knowledge'].max;

    // 加成 = satellite 直接加 750 * 5 = 3750
    //       + wardenclyffe 贡献被放大 (1 + 5*0.04) = 1.2 倍
    //       wardenclyffe 贡献 = 1 * 1000 + 1 * 1500 = 2500，放大后 3000 → 净增 500
    expect(withSat - withoutSat).toBe(3750 + 500);
  });
});

// ============================================================
// spc_moon — 月球首条闭环
// ============================================================

describe('moon_base — 定义与成本', () => {
  it('首座成本与 legacy space.js L255-260 一致', () => {
    const s = makeState();
    s.tech['space'] = 3;
    expect(getSpaceBuildCost(s, 'moon_base')).toEqual({
      Money: 22000,
      Cement: 18000,
      Alloy: 7800,
      Polymer: 12500,
    });
  });

  it('space < 3 时不可建造 moon_base', () => {
    const s = makeState();
    s.tech['space'] = 2;
    expect(canBuildSpaceStructure(s, 'moon_base')).toBe(false);
  });

  it('space = 3 且资源足时可建造 moon_base', () => {
    const s = makeState();
    s.tech['space'] = 3;
    expect(canBuildSpaceStructure(s, 'moon_base')).toBe(true);
  });

  it('建造后 on/support/s_max 字段均已初始化', () => {
    const s = makeState();
    s.tech['space'] = 3;
    const next = buildSpaceStructure(s, 'moon_base');
    expect(next).not.toBeNull();
    const mb = (next as GameState).space['moon_base'] as Record<string, number>;
    expect(mb.count).toBe(1);
    expect(mb.on).toBe(1);
    expect(mb.support).toBe(0);
    expect(mb.s_max).toBe(0);
  });

  it('每座 moon_base 贡献 Iridium.max +500 并解锁 display', () => {
    const s = makeState();
    s.tech['space'] = 3;
    s.resource['Iridium'].display = false;
    s.resource['Iridium'].max = 0;
    (s.space as any)['moon_base'] = { count: 2, on: 2, support: 0, s_max: 0 };
    applyDerivedStateInPlace(s);
    expect(s.resource['Iridium'].max).toBe(1000);
    expect(s.resource['Iridium'].display).toBe(true);
    expect(getMoonBaseCount(s)).toBe(2);
    expect(getMoonBaseIridiumCapBonus(s)).toBe(1000);
  });
});

describe('iridium_mine / helium_mine — 定义', () => {
  it('iridium_mine 首座成本与 legacy space.js L318-322 一致', () => {
    const s = makeState();
    expect(getSpaceBuildCost(s, 'iridium_mine')).toEqual({
      Money: 42000,
      Lumber: 9000,
      Titanium: 17500,
    });
  });

  it('helium_mine 首座成本与 legacy space.js L367-371 一致', () => {
    const s = makeState();
    expect(getSpaceBuildCost(s, 'helium_mine')).toEqual({
      Money: 38000,
      Aluminium: 9000,
      Steel: 17500,
    });
  });

  it('iridium_mine 前置 space:3 + luna:1', () => {
    const s = makeState();
    s.tech['space'] = 3;
    expect(canBuildSpaceStructure(s, 'iridium_mine')).toBe(false);
    s.tech['luna'] = 1;
    expect(canBuildSpaceStructure(s, 'iridium_mine')).toBe(true);
  });

  it('建造 helium_mine 后 Helium_3 display 打开且 max +100', () => {
    const s = makeState();
    s.tech['space'] = 3;
    s.tech['luna'] = 1;
    s.resource['Helium_3'].display = false;
    const next = buildSpaceStructure(s, 'helium_mine');
    expect(next).not.toBeNull();
    const n = next as GameState;
    expect(n.resource['Helium_3'].display).toBe(true);
    expect(n.resource['Helium_3'].max).toBe(100);
    expect(getHeliumMineHeliumCapBonus(n)).toBe(100);
  });
});

describe('nav_beacon — 跨区支援贡献', () => {
  it('前置 luna:2', () => {
    const s = makeState();
    s.tech['luna'] = 1;
    expect(canBuildSpaceStructure(s, 'nav_beacon')).toBe(false);
    s.tech['luna'] = 2;
    expect(canBuildSpaceStructure(s, 'nav_beacon')).toBe(true);
  });

  it('建造后初始化 on（需电），未登记 support/s_max（非供给主设施）', () => {
    const s = makeState();
    s.tech['luna'] = 2;
    const next = buildSpaceStructure(s, 'nav_beacon');
    const nb = (next as GameState).space['nav_beacon'] as Record<string, number | undefined>;
    expect(nb.count).toBe(1);
    expect(nb.on).toBe(1);
    // 供给主设施在 spc_moon（moon_base）；nav_beacon 只跨区 +s_max，不在自身维护 support/s_max
    expect(nb.support).toBe(0);
    expect(nb.s_max).toBe(0);
  });
});

// ============================================================
// resolveSpaceSupport — 月球支援池解算
// ============================================================

describe('resolveSpaceSupport — moon 池', () => {
  function moonReady(): GameState {
    const s = makeState();
    s.tech['space'] = 3;
    s.tech['luna'] = 1;
    // 电力充足：假装外部 poweredOn 映射会覆盖这些
    return s;
  }

  it('无任何太空建筑 → 0 支援 / 0 produce', () => {
    const s = moonReady();
    const r = resolveSpaceSupport(s, {});
    expect(r.supportOn).toEqual({ iridium_mine: 0, helium_mine: 0 });
    expect(r.fuelDrain).toEqual({});
    expect(r.supplierEffectiveOn).toEqual({ nav_beacon: 0, moon_base: 0 });
  });

  it('1 座 moon_base on 且 Oil 足够 → s_max=2, drain=2 Oil/tick', () => {
    const s = moonReady();
    (s.space as any)['moon_base'] = { count: 1, on: 1, support: 0, s_max: 0 };
    s.resource['Oil'].amount = 1000;
    const r = resolveSpaceSupport(s, { moon_base: 1 });
    expect(r.supplierEffectiveOn['moon_base']).toBe(1);
    expect(r.fuelDrain['Oil']).toBe(2);
    expect((s.space as any).moon_base.s_max).toBe(2);
    expect((s.space as any).moon_base.support).toBe(0);
  });

  it('Oil 不足 → 供给者 effective on 被裁剪', () => {
    const s = moonReady();
    (s.space as any)['moon_base'] = { count: 2, on: 2, support: 0, s_max: 0 };
    // 只够 1 座（2 oil/tick * 0.25 = 0.5），故 available 1.0 只能支撑 2 座... 调整到更严格
    s.resource['Oil'].amount = 0.6; // 只够 1 座（0.5 < 0.6 < 1.0）
    const r = resolveSpaceSupport(s, { moon_base: 2 });
    expect(r.supplierEffectiveOn['moon_base']).toBe(1);
    expect(r.fuelDrain['Oil']).toBe(2); // 1 座 × 2 = 2
    expect((s.space as any).moon_base.s_max).toBe(2);
  });

  it('moon_base 未通电 → effective on = 0，无燃料消耗，s_max = 0', () => {
    const s = moonReady();
    (s.space as any)['moon_base'] = { count: 1, on: 1, support: 0, s_max: 0 };
    s.resource['Oil'].amount = 1000;
    const r = resolveSpaceSupport(s, { moon_base: 0 }); // 电力为 0
    expect(r.supplierEffectiveOn['moon_base']).toBe(0);
    expect(r.fuelDrain['Oil']).toBeUndefined();
    expect((s.space as any).moon_base.s_max).toBe(0);
  });

  it('1 座 moon_base + 2 iridium_mine + 1 helium_mine → iridium 优先吃 2 支援，helium 吃剩余 0', () => {
    const s = moonReady();
    (s.space as any)['moon_base'] = { count: 1, on: 1, support: 0, s_max: 0 };
    (s.space as any)['iridium_mine'] = { count: 2, on: 2 };
    (s.space as any)['helium_mine'] = { count: 1, on: 1 };
    s.resource['Oil'].amount = 1000;
    const r = resolveSpaceSupport(s, { moon_base: 1 });
    expect(r.supportOn['iridium_mine']).toBe(2);
    expect(r.supportOn['helium_mine']).toBe(0);
    expect((s.space as any).moon_base.support).toBe(2); // 2 消耗
    expect((s.space as any).moon_base.s_max).toBe(2);
  });

  it('nav_beacon on 后 moon_base.s_max +1（跨区支援，luna:2 已在建造时校验）', () => {
    const s = moonReady();
    s.tech['luna'] = 2;
    (s.space as any)['moon_base'] = { count: 1, on: 1, support: 0, s_max: 0 };
    (s.space as any)['nav_beacon'] = { count: 1, on: 1 };
    s.resource['Oil'].amount = 1000;
    const r = resolveSpaceSupport(s, { moon_base: 1, nav_beacon: 1 });
    // moon_base 2 + nav_beacon 1 = 3 s_max
    expect((s.space as any).moon_base.s_max).toBe(3);
    expect(r.supplierEffectiveOn['nav_beacon']).toBe(1);
  });

  it('nav_beacon 未通电时不贡献 s_max', () => {
    const s = moonReady();
    s.tech['luna'] = 2;
    (s.space as any)['moon_base'] = { count: 1, on: 1, support: 0, s_max: 0 };
    (s.space as any)['nav_beacon'] = { count: 1, on: 1 };
    s.resource['Oil'].amount = 1000;
    const r = resolveSpaceSupport(s, { moon_base: 1, nav_beacon: 0 });
    expect((s.space as any).moon_base.s_max).toBe(2);
    expect(r.supplierEffectiveOn['nav_beacon']).toBe(0);
  });
});
