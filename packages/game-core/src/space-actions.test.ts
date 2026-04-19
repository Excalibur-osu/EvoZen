import { describe, expect, it } from 'vitest';
import type { GameState } from '@evozen/shared-types';
import { createNewGame } from './state';
import { researchTech } from './actions';
import {
  SPACE_ACTIONS,
  getSpaceActionCost,
  canRunSpaceAction,
  runSpaceAction,
} from './space-actions';

function makeState(): GameState {
  const s = createNewGame();
  s.race.species = 'human';
  for (const r of [
    'Money',
    'Knowledge',
    'Oil',
    'Alloy',
    'Polymer',
    'Uranium',
    'Steel',
    'Iridium',
    'Helium_3',
    'Mythril',
    'Cement',
    'Sheet_Metal',
    'Aluminium',
  ]) {
    if (!s.resource[r]) {
      s.resource[r] = {
        name: r,
        display: true,
        value: 0,
        amount: 0,
        max: 5_000_000,
        rate: 0,
        crates: 0,
        diff: 0,
        delta: 0,
      };
    }
    s.resource[r].display = true;
    s.resource[r].amount = 5_000_000;
    s.resource[r].max = 5_000_000;
  }
  return s;
}

describe('space-actions — 定义', () => {
  it('包含首批真实任务入口', () => {
    expect(SPACE_ACTIONS.map((action) => action.id)).toEqual(['test_launch', 'moon_mission', 'red_mission']);
  });

  it('test_launch 费用与 legacy space.js L27-52 对齐', () => {
    const s = makeState();
    expect(getSpaceActionCost(s, 'test_launch')).toEqual({
      Money: 100000,
      Oil: 7500,
    });
  });

  it('moon_mission 费用与 legacy space.js L229-244 对齐', () => {
    const s = makeState();
    expect(getSpaceActionCost(s, 'moon_mission')).toEqual({
      Oil: 12000,
    });
  });

  it('red_mission 费用与 legacy space.js L461-486 对齐', () => {
    const s = makeState();
    expect(getSpaceActionCost(s, 'red_mission')).toEqual({
      Helium_3: 4500,
    });
  });
});

describe('space-actions — 研究桥接收缩', () => {
  it('rocketry 只建立 space:1，不再直接跳到 space:2', () => {
    const s = makeState();
    s.tech['high_tech'] = 6;
    const next = researchTech(s, 'rocketry');
    expect(next).not.toBeNull();
    expect((next as GameState).tech['high_tech']).toBe(7);
    expect((next as GameState).tech['space']).toBe(1);
  });

  it('rover 不再直接授予 space:3 / luna:1', () => {
    const s = makeState();
    s.tech['space'] = 2;
    s.tech['space_explore'] = 1;
    const next = researchTech(s, 'rover');
    expect(next).not.toBeNull();
    expect((next as GameState).tech['space_explore']).toBe(2);
    expect((next as GameState).tech['space']).toBe(2);
    expect(((next as GameState).tech['luna'] ?? 0)).toBe(0);
  });

  it('probes 不再直接授予 space:4 / mars:1，只注册 spaceport 槽位', () => {
    const s = makeState();
    s.tech['space_explore'] = 2;
    const next = researchTech(s, 'probes');
    expect(next).not.toBeNull();
    expect((next as GameState).tech['space_explore']).toBe(3);
    expect(((next as GameState).tech['space'] ?? 0)).toBe(0);
    expect(((next as GameState).tech['mars'] ?? 0)).toBe(0);
    expect((next as GameState).space['spaceport']).toEqual({ count: 0 });
  });
});

describe('space-actions — test_launch', () => {
  it('space:1 且资源足够时可执行', () => {
    const s = makeState();
    s.tech['space'] = 1;
    expect(canRunSpaceAction(s, 'test_launch')).toBe(true);
  });

  it('执行后扣费、推进到 space:2，并初始化 satellite 槽位', () => {
    const s = makeState();
    s.tech['space'] = 1;
    const next = runSpaceAction(s, 'test_launch');
    expect(next).not.toBeNull();
    expect((next as GameState).resource['Money'].amount).toBe(5_000_000 - 100000);
    expect((next as GameState).resource['Oil'].amount).toBe(5_000_000 - 7500);
    expect((next as GameState).tech['space']).toBe(2);
    expect((next as GameState).space['satellite']).toEqual({ count: 0 });
  });

  it('已达到 space:2 后不可重复执行', () => {
    const s = makeState();
    s.tech['space'] = 2;
    expect(canRunSpaceAction(s, 'test_launch')).toBe(false);
  });
});

describe('space-actions — moon_mission', () => {
  it('需要 space:2 + space_explore:2', () => {
    const s = makeState();
    s.tech['space'] = 2;
    s.tech['space_explore'] = 1;
    expect(canRunSpaceAction(s, 'moon_mission')).toBe(false);

    s.tech['space_explore'] = 2;
    expect(canRunSpaceAction(s, 'moon_mission')).toBe(true);
  });

  it('执行后推进到 space:3 / luna:1，并初始化月矿槽位', () => {
    const s = makeState();
    s.tech['space'] = 2;
    s.tech['space_explore'] = 2;
    const next = runSpaceAction(s, 'moon_mission');
    expect(next).not.toBeNull();
    expect((next as GameState).resource['Oil'].amount).toBe(5_000_000 - 12000);
    expect((next as GameState).tech['space']).toBe(3);
    expect((next as GameState).tech['luna']).toBe(1);
    expect((next as GameState).space['iridium_mine']).toEqual({ count: 0 });
    expect((next as GameState).space['helium_mine']).toEqual({ count: 0 });
    expect((next as GameState).space['moon_base']).toBeUndefined();
  });
});

describe('space-actions — red_mission', () => {
  it('需要 space:3 + space_explore:3', () => {
    const s = makeState();
    s.tech['space'] = 3;
    s.tech['space_explore'] = 2;
    expect(canRunSpaceAction(s, 'red_mission')).toBe(false);

    s.tech['space_explore'] = 3;
    expect(canRunSpaceAction(s, 'red_mission')).toBe(true);
  });

  it('执行后推进到 space:4，并注册火星前线首批结构', () => {
    const s = makeState();
    s.tech['space'] = 3;
    s.tech['space_explore'] = 3;
    const next = runSpaceAction(s, 'red_mission');
    expect(next).not.toBeNull();
    expect((next as GameState).resource['Helium_3'].amount).toBe(5_000_000 - 4500);
    expect((next as GameState).tech['space']).toBe(4);
    expect((next as GameState).space['living_quarters']).toEqual({ count: 0 });
    expect((next as GameState).space['garage']).toEqual({ count: 0 });
    expect((next as GameState).space['red_mine']).toEqual({ count: 0 });
    expect((next as GameState).space['fabrication']).toEqual({ count: 0 });
    expect((next as GameState).tech['mars'] ?? 0).toBe(0);
  });

  it('达到 space:4 后不可重复执行', () => {
    const s = makeState();
    s.tech['space'] = 4;
    s.tech['space_explore'] = 3;
    expect(canRunSpaceAction(s, 'red_mission')).toBe(false);
  });
});
