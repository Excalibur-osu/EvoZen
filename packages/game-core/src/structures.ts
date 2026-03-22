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

function hasCityTrait(state: GameState, trait: string): boolean {
  return state.city.ptrait === trait;
}

function scaleCostMinus(base: number, mult: number, subtract: number): CostFunction {
  return (state, count) => Math.max(0, scaleCost(base, mult)(state, count) - subtract);
}

function scaleConditionalCost(
  base: number,
  mult: number,
  predicate: (state: GameState, count: number) => boolean
): CostFunction {
  return (state, count) => {
    if (!predicate(state, count)) return 0;
    return scaleCost(base, mult)(state, count);
  };
}

// 原版 functions.js costMultiplier():
// housing_reduction 会让 basic_housing / cottage 的成本蠕变每级 -0.02
function scaleHousingCost(base: number, mult: number): CostFunction {
  return (state, count) => {
    const reduction = state.tech['housing_reduction'] ?? 0;
    const effectiveMult = Math.max(mult - reduction * 0.02, 1.01);
    return Math.ceil(base * Math.pow(effectiveMult, count));
  };
}

// 原版 functions.js rebarAdjust():
// cement >= 2 时建筑 Cement 成本 ×0.9，cement >= 3 时 ×0.8
function scaleCementCost(base: number, mult: number): CostFunction {
  const rawCost = scaleCost(base, mult);
  return (state, count) => {
    const cost = rawCost(state, count);
    const cementTech = state.tech['cement'] ?? 0;
    if (cementTech >= 3) return Math.round(cost * 0.8);
    if (cementTech >= 2) return Math.round(cost * 0.9);
    return cost;
  };
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
      Lumber: scaleHousingCost(10, 1.23),
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
      Money: scaleHousingCost(900, 1.15),
      Plywood: scaleHousingCost(25, 1.25),
      Brick: scaleHousingCost(20, 1.25),
      Wrought_Iron: scaleHousingCost(15, 1.25),
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
      Cement: scaleCementCost(125, 1.33),
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
      Iron: scaleConditionalCost(28, 1.36, (state) => hasCityTrait(state, 'unstable')),
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
  // actions.js L1587-1615: smokehouse
  {
    id: 'smokehouse',
    name: '烟房',
    description: '用于熏制与保存食物，延长肉类储存时间。',
    category: 'storage',
    reqs: { hunting: 1 },
    costs: {
      Money: scaleCost(85, 1.32),
      Lumber: scaleCost(65, 1.36),
      Stone: scaleCost(50, 1.36),
    },
    effect: '食物上限 +100，降低腐坏（待接入）。',
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
      Iron: scaleConditionalCost(30, 1.3, (state, count) => hasCityTrait(state, 'unstable') && count >= 2),
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
      Iron: scaleConditionalCost(15, 1.36, (state) => hasCityTrait(state, 'unstable')),
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
      Money: scaleCostMinus(900, 1.5, 500),
      Lumber: scaleCostMinus(500, 1.36, 200),
      Stone: scaleCostMinus(750, 1.36, 350),
      Iron: scaleConditionalCost(25, 1.36, (state, count) => hasCityTrait(state, 'unstable') && count >= 3),
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
      Iron: scaleConditionalCost(4, 1.2, (state) => hasCityTrait(state, 'unstable')),
      Furs: scaleCost(22, 1.2),
      Plywood: scaleCost(20, 1.2),
      Brick: scaleCost(15, 1.2),
    },
    effect: '知识上限 +125。',
  },
  // actions.js city.wardenclyffe
  {
    id: 'wardenclyffe',
    name: '沃登克里弗塔',
    description: '先进的科学设备，为科学家提供实验环境并提升知识容量。',
    category: 'science',
    reqs: { high_tech: 1 },
    costs: {
      Money: scaleCost(5000, 1.22),
      Knowledge: scaleCost(1000, 1.22),
      Copper: scaleCost(500, 1.22),
      Cement: scaleCementCost(350, 1.22),
      Sheet_Metal: scaleCost(125, 1.2),
    },
    effect: '科学家上限 +1，知识上限 +1000。',
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
  // actions.js L2021-2055: hospital
  {
    id: 'hospital',
    name: '医院',
    description: '提供基础医疗设施，改善伤病恢复能力。',
    category: 'military',
    reqs: { medic: 1 },
    costs: {
      Money: scaleCost(22000, 1.32),
      Furs: scaleCost(4000, 1.32),
      Iron: scaleConditionalCost(500, 1.32, (state) => hasCityTrait(state, 'unstable')),
      Aluminium: scaleCost(10000, 1.32),
    },
    effect: '伤兵治愈待军事系统接入；后续生育科技可使医院提高人口增长速率。',
  },

  // ---- 制造与精炼设施 ----
  // actions.js L2843-2900: smelter
  {
    id: 'smelter',
    name: '熔炉',
    description: '通过燃烧燃料将铁提纯成少量钢材。',
    category: 'resource',
    reqs: { smelting: 1 },
    costs: {
      Money: scaleCost(1000, 1.32),
      Iron: scaleCost(500, 1.33),
    },
    effect: '初期提升铁产出；钢铁科技后转化铁与煤生产钢，高炉/转炉科技可进一步提高产线效率。',
  },
  // actions.js L2909-2950: metal_refinery
  {
    id: 'metal_refinery',
    name: '金属精炼厂',
    description: '通过耗电电解，开采和提炼铝。',
    category: 'resource',
    reqs: { alumina: 1 },
    costs: {
      Money: scaleCost(2500, 1.35),
      Iron: scaleConditionalCost(125, 1.35, (state) => hasCityTrait(state, 'unstable')),
      Steel: scaleCost(350, 1.35),
    },
    effect: '解锁和生产铝资源。',
    powered: true,
    powerCost: 2,
  },

  // ---- 制造（工匠） ----
  // actions.js L2714-2770: foundry
  {
    id: 'foundry',
    name: '铸造厂',
    description: '分配工匠制造高级材料。',
    category: 'craft',
    reqs: { foundry: 1 },
    costs: {
      Money: scaleCost(750, 1.36),
      Iron: scaleConditionalCost(40, 1.36, (state) => hasCityTrait(state, 'unstable')),
      Copper: scaleCost(250, 1.36),
      Stone: scaleCost(100, 1.36),
    },
    effect: '工匠岗位上限 +1。',
  },

  // ---- 仓储 ----
  // actions.js L2239-2297: storage_yard (装运站/货运码头)
  // 对标原版：reqs { container: 1 }，每座 +10 板条箱上限
  {
    id: 'storage_yard',
    name: '装运站',
    description: '标准化的货物装卸站，扩展板条箱容量。',
    category: 'storage',
    reqs: { container: 1 },
    costs: {
      Money: scaleCost(10, 1.36),
      Brick: scaleCost(3, 1.35),
      Wrought_Iron: scaleCost(5, 1.35),
    },
    effect: '板条箱上限 +10（起重机后提升到 +20）；货运列车后每座额外 +1 贸易路线。',
  },

  // actions.js L2299-2351: warehouse (集装箱港口)
  // 对标原版：reqs { steel_container: 1 }，每座 +10 集装箱上限
  {
    id: 'warehouse',
    name: '集装箱港口',
    description: '用钢制集装箱存储大量货物。',
    category: 'storage',
    reqs: { steel_container: 1 },
    costs: {
      Money: scaleCost(400, 1.26),
      Cement: scaleCementCost(75, 1.26),
      Sheet_Metal: scaleCost(25, 1.25),
    },
    effect: '集装箱上限 +10（门式起重机后提升到 +20）。',
  },

  // ---- 娱乐 ----
  // actions.js L3285-3337: amphitheatre (圆形剧场)
  // 对标原版：reqs { theatre: 1 }，每座 +1 娱乐者上限，+1 士气上限
  {
    id: 'amphitheatre',
    name: '圆形剧场',
    description: '举办演出和表演，提升市民士气。',
    category: 'commerce',
    reqs: { theatre: 1 },
    costs: {
      Money: scaleCost(500, 1.55),
      Lumber: scaleCost(50, 1.75),
      Stone: scaleCost(200, 1.75),
      Iron: scaleConditionalCost(18, 1.36, (state) => hasCityTrait(state, 'unstable')),
    },
    effect: '娱乐者上限 +1，士气上限 +1。',
  },

  // ---- 宗教 ----
  // actions.js L3379-3423: temple
  {
    id: 'temple',
    name: '寺庙',
    description: '市民们在此祈祷、祭祀，并传播共同的信仰。',
    category: 'commerce',
    reqs: { theology: 2 },
    costs: {
      Money: scaleCost(50, 1.36),
      Lumber: scaleCost(25, 1.36),
      Furs: scaleCost(15, 1.36),
      Cement: scaleCementCost(10, 1.36),
    },
    effect: '牧师上限 +1（后续接入士气/信仰加成）。',
  },
  // actions.js L2546-2578: sawmill
  {
    id: 'sawmill',
    name: '锯木厂',
    description: '以更高效的切割与加工流程提升木材产量和储备能力。',
    category: 'resource',
    reqs: { saw: 1 },
    costs: {
      Money: scaleCost(3000, 1.26),
      Iron: scaleCost(400, 1.26),
      Cement: scaleCementCost(420, 1.26),
    },
    effect: '木材上限 +200，伐木工木材产量 +5%。',
  },
];
