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
    default:
      return null;
  }
}
