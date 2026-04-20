import type { GameState } from '@evozen/shared-types';

export interface SpaceActionDefinition {
  id: string;
  name: string;
  description: string;
  effect: string;
  reqs: Record<string, number>;
  costs: Record<string, number>;
}

export const SPACE_ACTIONS: SpaceActionDefinition[] = [
  {
    id: 'test_launch',
    name: '试验发射',
    description: '执行首次轨道发射测试，验证火箭与近地轨道基础能力。',
    effect: '完成后建立卫星结构槽位，并将太空阶段推进到 Lv.2。',
    reqs: { space: 1 },
    costs: {
      Money: 100000,
      Oil: 7500,
    },
  },
  {
    id: 'moon_mission',
    name: '月球任务',
    description: '发射首轮月面任务，建立月球采矿与后续殖民的任务入口。',
    effect: '完成后推进到 space:3 / luna:1，并建立月面矿业槽位。',
    reqs: { space: 2, space_explore: 2 },
    costs: {
      Oil: 12000,
    },
  },
  {
    id: 'red_mission',
    name: '火星任务',
    description: '执行首次红色行星调查任务，为后续前线支援与殖民建筑建立正式入口。',
    effect: '完成后推进到 space:4，并注册火星前线首批结构槽位。',
    reqs: { space: 3, space_explore: 3 },
    costs: {
      Helium_3: 4500,
    },
  },
  {
    id: 'hell_mission',
    name: '地狱行星任务',
    description: '探索灼热的内行星，为地热发电建立入口。',
    effect: '完成后推进到 hell:1，解锁地热发电站。',
    reqs: { space: 3, space_explore: 3 },
    costs: { Helium_3: 6500 },
  },
  {
    id: 'sun_mission',
    name: '恒星任务',
    description: '向恒星发射探测器，为戴森虫群奠定基础。',
    effect: '完成后推进到 solar:1。',
    reqs: { space_explore: 4 },
    costs: { Helium_3: 15000 },
  },
  {
    id: 'gas_mission',
    name: '气态巨行星任务',
    description: '向外太阳系的气态巨行星发射探测器。',
    effect: '完成后推进到 space:5，解锁气体卫星与小行星带区域。',
    reqs: { space: 4, space_explore: 4 },
    costs: { Helium_3: 12500 },
  },
  {
    id: 'gas_moon_mission',
    name: '气态卫星任务',
    description: '探索气态巨行星的卫星，建立中子素采集前哨。',
    effect: '完成后推进到 space:6 / gas_moon:1，解锁前哨站。',
    reqs: { space: 5 },
    costs: { Helium_3: 30000 },
  },
  {
    id: 'belt_mission',
    name: '小行星带任务',
    description: '探索火星与木星之间的小行星带。',
    effect: '完成后推进到 asteroid:1，解锁矮行星区域。',
    reqs: { space: 5 },
    costs: { Helium_3: 25000 },
  },
  {
    id: 'dwarf_mission',
    name: '矮行星任务',
    description: '探索小行星带外缘的矮行星。',
    effect: '完成后推进到 dwarf:1，解锁超铀容器。',
    reqs: { asteroid: 1, elerium: 1 },
    costs: { Helium_3: 45000 },
  },
];

function cloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

function ensureSpaceStructure(state: GameState, id: string): void {
  if (!state.space[id]) {
    state.space[id] = { count: 0 };
  }
}

export function getSpaceActionCost(_state: GameState, actionId: string): Record<string, number> {
  const def = SPACE_ACTIONS.find((action) => action.id === actionId);
  if (!def) return {};
  return { ...def.costs };
}

export function canRunSpaceAction(state: GameState, actionId: string): boolean {
  const def = SPACE_ACTIONS.find((action) => action.id === actionId);
  if (!def) return false;

  for (const [techId, lvl] of Object.entries(def.reqs)) {
    if ((state.tech[techId] ?? 0) < lvl) return false;
  }

  if (actionId === 'test_launch' && (state.tech['space'] ?? 0) >= 2) return false;
  if (actionId === 'moon_mission' && (state.tech['space'] ?? 0) >= 3) return false;
  if (actionId === 'red_mission' && (state.tech['space'] ?? 0) >= 4) return false;
  if (actionId === 'hell_mission' && (state.tech['hell'] ?? 0) >= 1) return false;
  if (actionId === 'sun_mission' && (state.tech['solar'] ?? 0) >= 1) return false;
  if (actionId === 'gas_mission' && (state.tech['space'] ?? 0) >= 5) return false;
  if (actionId === 'gas_moon_mission' && (state.tech['space'] ?? 0) >= 6) return false;
  if (actionId === 'belt_mission' && (state.tech['asteroid'] ?? 0) >= 1) return false;
  if (actionId === 'dwarf_mission' && (state.tech['dwarf'] ?? 0) >= 1) return false;

  const costs = getSpaceActionCost(state, actionId);
  for (const [resId, cost] of Object.entries(costs)) {
    if ((state.resource[resId]?.amount ?? 0) < cost) return false;
  }

  return true;
}

export function runSpaceAction(state: GameState, actionId: string): GameState | null {
  if (!canRunSpaceAction(state, actionId)) return null;

  const next = cloneState(state);
  const costs = getSpaceActionCost(next, actionId);
  for (const [resId, cost] of Object.entries(costs)) {
    if (!next.resource[resId]) return null;
    next.resource[resId].amount -= cost;
  }

  switch (actionId) {
    case 'test_launch':
      next.tech['space'] = Math.max(next.tech['space'] ?? 0, 2);
      ensureSpaceStructure(next, 'satellite');
      return next;
    case 'moon_mission':
      next.tech['space'] = Math.max(next.tech['space'] ?? 0, 3);
      next.tech['luna'] = Math.max(next.tech['luna'] ?? 0, 1);
      ensureSpaceStructure(next, 'iridium_mine');
      ensureSpaceStructure(next, 'helium_mine');
      return next;
    case 'red_mission':
      next.tech['space'] = Math.max(next.tech['space'] ?? 0, 4);
      ensureSpaceStructure(next, 'living_quarters');
      ensureSpaceStructure(next, 'garage');
      ensureSpaceStructure(next, 'red_mine');
      ensureSpaceStructure(next, 'fabrication');
      return next;
    case 'hell_mission':
      next.tech['hell'] = Math.max(next.tech['hell'] ?? 0, 1);
      ensureSpaceStructure(next, 'geothermal');
      return next;
    case 'sun_mission':
      next.tech['solar'] = Math.max(next.tech['solar'] ?? 0, 1);
      return next;
    case 'gas_mission':
      next.tech['space'] = Math.max(next.tech['space'] ?? 0, 5);
      // 对标 legacy/src/space.js L1857：gas_mission 完成后初始化 space_station 槽位
      ensureSpaceStructure(next, 'space_station');
      return next;
    case 'gas_moon_mission':
      next.tech['space'] = Math.max(next.tech['space'] ?? 0, 6);
      next.tech['gas_moon'] = Math.max(next.tech['gas_moon'] ?? 0, 1);
      ensureSpaceStructure(next, 'outpost');
      return next;
    case 'belt_mission':
      next.tech['asteroid'] = Math.max(next.tech['asteroid'] ?? 0, 1);
      return next;
    case 'dwarf_mission':
      next.tech['dwarf'] = Math.max(next.tech['dwarf'] ?? 0, 1);
      ensureSpaceStructure(next, 'elerium_contain');
      return next;
    default:
      return null;
  }
}
