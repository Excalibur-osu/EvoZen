/**
 * 基础建筑定义
 * 严格对标 legacy/src/actions.js 原版数值
 *
 * 每项建筑的 reqs、costs 均从原版源码逐行核对。
 * 费用递增公式: Math.ceil(base * Math.pow(mult, count))
 *
 * 注意：原版很多建筑的 Money 费用在前几座为 0（条件性出现），
 * 这里简化为始终有 Money 费用，以 base 值为准。
 */

import type { GameState } from '@evozen/shared-types';

export type CostFunction = (state: GameState, count: number) => number;

export interface StructureDefinition {
  id: string;
  name: string;
  description: string;
  category: 'housing' | 'food' | 'resource' | 'storage' | 'commerce' | 'science' | 'military' | 'craft';
  /** 前置科技要求 */
  reqs: Record<string, number>;
  /** 各资源费用（基于已有数量递增） */
  costs: Record<string, CostFunction>;
  /** 效果描述 */
  effect: string;
  /** 是否需要供电 */
  powered?: boolean;
  /** 耗电量 */
  powerCost?: number;
}

// 通用费用递增公式
function scaleCost(base: number, mult: number): CostFunction {
  return (_state, count) => Math.ceil(base * Math.pow(mult, count));
}

/**
 * 第一阶段基础建筑
 * 数据来源：legacy/src/actions.js
 */
export const BASIC_STRUCTURES: StructureDefinition[] = [
  // ---- 住房 ----
  // actions.js L1375-1427: basic_housing
  {
    id: 'basic_housing',
    name: '小屋',
    description: '为市民提供基本住所。',
    category: 'housing',
    reqs: { housing: 1 },
    costs: {
      Lumber: scaleCost(10, 1.23),
    },
    effect: '市民上限 +1',
  },
  // actions.js L1429-1478: cottage
  // 原版需要合成材料：Plywood, Brick, Wrought_Iron
  {
    id: 'cottage',
    name: '茅屋',
    description: '更好的住所，可以容纳更多人。',
    category: 'housing',
    reqs: { housing: 2 },
    costs: {
      Money: scaleCost(900, 1.15),
      Plywood: scaleCost(25, 1.25),
      Brick: scaleCost(20, 1.25),
      Wrought_Iron: scaleCost(15, 1.25),
    },
    effect: '市民上限 +2',
  },

  // ---- 食物 ----
  // actions.js L1728-1785: farm
  {
    id: 'farm',
    name: '农场',
    description: '生产食物的基础设施。',
    category: 'food',
    reqs: { agriculture: 1 },
    costs: {
      Lumber: scaleCost(20, 1.36),
      Stone: scaleCost(10, 1.36),
    },
    effect: '允许农民工作以获得更高效的食物产量。',
  },
  // actions.js L1837-1926: mill
  {
    id: 'mill',
    name: '磨坊',
    description: '利用风力磨碎谷物，提高食物产量。',
    category: 'food',
    reqs: { agriculture: 4 },
    costs: {
      Money: scaleCost(1000, 1.31),
      Lumber: scaleCost(600, 1.33),
      Iron: scaleCost(150, 1.33),
      Cement: scaleCost(125, 1.33),
    },
    effect: '食物产量 +3%（风车时代 +5%）',
  },

  // ---- 基础资源 ----
  // actions.js L2506-2590: lumber_yard
  {
    id: 'lumber_yard',
    name: '伐木场',
    description: '增加木材存储并提升产量。',
    category: 'resource',
    reqs: { axe: 1 },
    costs: {
      Lumber: scaleCost(6, 1.9),
      Stone: scaleCost(2, 1.95),
    },
    effect: '木材上限 +100，木材产量 +2',
  },
  // actions.js L2592-2665: rock_quarry
  {
    id: 'rock_quarry',
    name: '采石场',
    description: '增加石头存储并提升产量。',
    category: 'resource',
    reqs: { mining: 1 },
    costs: {
      Lumber: scaleCost(50, 1.36),
      Stone: scaleCost(10, 1.36),
    },
    effect: '石头上限 +100，石头产量 +2',
  },
  // actions.js L2960-3005: mine
  {
    id: 'mine',
    name: '矿井',
    description: '开采地下矿物。',
    category: 'resource',
    reqs: { mining: 2 },
    costs: {
      Money: scaleCost(60, 1.6),
      Lumber: scaleCost(175, 1.38),
    },
    effect: '解锁矿工岗位。',
    powered: true,
    powerCost: 1,
  },
  // actions.js L3007-3005: coal_mine
  {
    id: 'coal_mine',
    name: '煤矿',
    description: '开采煤炭资源。',
    category: 'resource',
    reqs: { mining: 4 },
    costs: {
      Money: scaleCost(480, 1.4),
      Lumber: scaleCost(250, 1.36),
      Wrought_Iron: scaleCost(18, 1.36),
    },
    effect: '解锁煤矿工人岗位。',
    powered: true,
    powerCost: 1,
  },
  // actions.js L2667-2712: cement_plant
  {
    id: 'cement_plant',
    name: '水泥厂',
    description: '生产水泥。',
    category: 'resource',
    reqs: { cement: 1 },
    costs: {
      Money: scaleCost(3000, 1.5),
      Lumber: scaleCost(1800, 1.36),
      Stone: scaleCost(2000, 1.32),
    },
    effect: '解锁水泥工人岗位（每座+2工人位）。',
  },

  // ---- 存储 ----
  // actions.js L1928-1959: silo
  {
    id: 'silo',
    name: '粮仓',
    description: '增加食物存储上限。',
    category: 'storage',
    reqs: { agriculture: 3 },
    costs: {
      Money: scaleCost(85, 1.32),
      Lumber: scaleCost(65, 1.36),
      Stone: scaleCost(50, 1.36),
    },
    effect: '食物上限 +500',
  },
  // actions.js L2104-2200: shed
  {
    id: 'shed',
    name: '仓库',
    description: '增加多种资源存储上限。',
    category: 'storage',
    reqs: { storage: 1 },
    costs: {
      Money: scaleCost(75, 1.22),
      Lumber: scaleCost(55, 1.32),
      Stone: scaleCost(45, 1.32),
    },
    effect: '木材/石头等上限增加，提供板条箱位。',
  },

  // ---- 商业 ----
  // actions.js L2352-2505: bank
  {
    id: 'bank',
    name: '银行',
    description: '管理金钱与税收。',
    category: 'commerce',
    reqs: { banking: 1 },
    costs: {
      Money: scaleCost(250, 1.35),
      Lumber: scaleCost(75, 1.32),
      Stone: scaleCost(100, 1.35),
    },
    effect: '金钱上限增加。',
  },
  // actions.js L3147-3190: trade (贸易站)
  {
    id: 'trade_post',
    name: '贸易站',
    description: '与商人交易资源。',
    category: 'commerce',
    reqs: { trade: 1 },
    costs: {
      Money: scaleCost(500, 1.36),
      Lumber: scaleCost(125, 1.36),
      Stone: scaleCost(50, 1.36),
      Furs: scaleCost(65, 1.36),
    },
    effect: '贸易路线 +2。',
  },

  // ---- 科学 ----
  // actions.js L3643-3745: university
  // 注意：原版 science:1 解锁的是 university，不是 library
  {
    id: 'university',
    name: '大学',
    description: '高等学府，增加知识上限并提供教授岗位。',
    category: 'science',
    reqs: { science: 1 },
    costs: {
      Money: scaleCost(900, 1.5),
      Lumber: scaleCost(500, 1.36),
      Stone: scaleCost(750, 1.36),
    },
    effect: '知识上限 +500，教授上限 +1。',
  },
  // actions.js L3748-3835: library
  // 注意：原版 library 需要 science:2（图书馆学科技），并需要合成材料
  {
    id: 'library',
    name: '图书馆',
    description: '存储知识，提供研究能力。',
    category: 'science',
    reqs: { science: 2 },
    costs: {
      Money: scaleCost(45, 1.2),
      Furs: scaleCost(22, 1.2),
      Plywood: scaleCost(20, 1.2),
      Brick: scaleCost(15, 1.2),
    },
    effect: '知识上限 +125。',
  },

  // ---- 军事 ----
  // actions.js L1961-2010: garrison
  {
    id: 'garrison',
    name: '兵营',
    description: '训练和驻扎士兵。',
    category: 'military',
    reqs: { military: 1 },
    costs: {
      Money: scaleCost(240, 1.5),
      Stone: scaleCost(260, 1.46),
    },
    effect: '士兵上限 +2。',
  },

  // ---- 制造 ----
  // actions.js L2714-2770: foundry
  {
    id: 'foundry',
    name: '铸造厂',
    description: '分配工匠制造高级材料。',
    category: 'craft',
    reqs: { foundry: 1 },
    costs: {
      Money: scaleCost(750, 1.36),
      Copper: scaleCost(250, 1.36),
      Stone: scaleCost(100, 1.36),
    },
    effect: '工匠岗位上限 +1。',
  },
];
