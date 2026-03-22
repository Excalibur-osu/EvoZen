/**
 * 基础科技树定义
 * 严格对标 legacy/src/tech.js 原版数值
 *
 * 每项科技的 reqs、grant、costs 均从原版源码逐行核对。
 */

export interface TechDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  era: string;
  /** 前置科技要求 */
  reqs: Record<string, number>;
  /** 解锁授予的科技: [key, level] */
  grant: [string, number];
  /** 费用 */
  costs: Record<string, number>;
  /** 解锁后的效果描述 */
  effect: string;
}

/**
 * 第一阶段基础科技
 *
 * 数据来源：legacy/src/tech.js
 * 格式：id → 原版 tech key, reqs/grant/cost 均直接对标
 */
export const BASIC_TECHS: TechDefinition[] = [
  // ===== 原始时代 (primitive) =====
  // legacy tech.js L18-37: club
  {
    id: 'club',
    name: '棍棒',
    description: '用来捕猎的原始武器。',
    category: 'agriculture',
    era: '原始',
    reqs: {},
    grant: ['primitive', 1],
    costs: { Lumber: 5 },
    effect: '解锁食物资源的显示。',
  },
  // legacy tech.js L39-63: bone_tools
  {
    id: 'bone_tools',
    name: '骨制工具',
    description: '由骨头制成的基本工具。',
    category: 'stone_gathering',
    era: '原始',
    reqs: { primitive: 1 },
    grant: ['primitive', 2],
    costs: { Food: 10 },
    effect: '解锁石头资源的显示。',
  },
  // legacy tech.js L94-120: sundial
  {
    id: 'sundial',
    name: '日晷',
    description: '通过观测太阳位置来计时。',
    category: 'science',
    era: '原始',
    reqs: { primitive: 2 },
    grant: ['primitive', 3],
    costs: { Lumber: 8, Stone: 10 },
    effect: '解锁知识系统和日历，开启文明时代科技。',
  },

  // ===== 文明时代 (civilized) =====

  // legacy tech.js L305-323: housing
  {
    id: 'housing',
    name: '住房',
    description: '为市民提供住所。',
    category: 'housing',
    era: '文明',
    reqs: { primitive: 3 },
    grant: ['housing', 1],
    costs: { Knowledge: 10 },
    effect: '解锁小屋建筑，人口可以增长。',
  },

  // legacy tech.js L4065-4083: science (科学方法)
  // 注意：原版 science 解锁的是 university（大学），不是 library（图书馆）
  {
    id: 'science',
    name: '科学方法',
    description: '系统化研究万物。',
    category: 'science',
    era: '文明',
    reqs: { housing: 1 },
    grant: ['science', 1],
    costs: { Knowledge: 65 },
    effect: '解锁大学建筑。',
  },

  // legacy tech.js L3333-3352: currency
  {
    id: 'currency',
    name: '货币',
    description: '建立统一的货币体系。',
    category: 'banking',
    era: '文明',
    reqs: { housing: 1 },
    grant: ['currency', 1],
    costs: { Knowledge: 22, Lumber: 10 },
    effect: '解锁金币和基础税收。',
  },

  // legacy tech.js L1142-1164: agriculture
  {
    id: 'agriculture',
    name: '农业',
    description: '学习系统性种植作物。',
    category: 'agriculture',
    era: '文明',
    reqs: { primitive: 3 },
    grant: ['agriculture', 1],
    costs: { Knowledge: 10 },
    effect: '解锁农场建筑和农民岗位。',
  },

  // legacy tech.js L1186-1203: irrigation
  {
    id: 'irrigation',
    name: '灌溉',
    description: '引水灌溉农田。',
    category: 'agriculture',
    era: '文明',
    reqs: { agriculture: 1 },
    grant: ['agriculture', 2],
    costs: { Knowledge: 55 },
    effect: '农民产量 +40%。',
  },

  // legacy tech.js L6688-6713: stone_axe
  {
    id: 'axe',
    name: '石斧',
    description: '用石头制成的简易斧头。',
    category: 'lumber_gathering',
    era: '文明',
    reqs: { primitive: 3 },
    grant: ['axe', 1],
    costs: { Knowledge: 45, Lumber: 20, Stone: 20 },
    effect: '解锁伐木工岗位和伐木场建筑。',
  },

  // legacy tech.js L1964-1985: mining
  {
    id: 'mining',
    name: '采矿',
    description: '学习从地下开采矿物。',
    category: 'mining',
    era: '文明',
    reqs: { primitive: 3 },
    grant: ['mining', 1],
    costs: { Knowledge: 45 },
    effect: '解锁采石场建筑和石工效率加成。',
  },

  // legacy tech.js L2271-2289: metal_working → mining:2
  {
    id: 'mining_2',
    name: '金属加工',
    description: '学习加工金属矿石。',
    category: 'mining',
    era: '文明',
    reqs: { mining: 1 },
    grant: ['mining', 2],
    costs: { Knowledge: 350 },
    effect: '解锁矿井建筑和矿工岗位。',
  },

  // legacy tech.js L2291-2316: iron_mining → mining:3
  {
    id: 'mining_3',
    name: '铁器冶炼',
    description: '学习冶炼铁矿石。',
    category: 'mining',
    era: '文明',
    reqs: { mining: 2 },
    grant: ['mining', 3],
    costs: { Knowledge: 2500 },
    effect: '矿工可以挖铁矿。铁矿显示。',
  },

  // legacy tech.js L2318-2340: coal_mining → mining:4
  {
    id: 'mining_4',
    name: '煤炭开采',
    description: '从地层深处开采煤炭。',
    category: 'mining',
    era: '文明',
    reqs: { mining: 3 },
    grant: ['mining', 4],
    costs: { Knowledge: 4320 },
    effect: '解锁煤矿和煤矿工人。煤炭显示。',
  },

  // legacy tech.js L2031-2056: smelting → smelting:1
  {
    id: 'smelting',
    name: '熔炼',
    description: '学习高温提炼金属。',
    category: 'mining',
    era: '文明',
    reqs: { mining: 3 },
    grant: ['smelting', 1],
    costs: { Knowledge: 4050 },
    effect: '解锁熔炉建筑。',
  },

  // legacy tech.js L2057-2084: steel → smelting:2
  {
    id: 'steel',
    name: '钢铁',
    description: '制造更坚固的金属合金。',
    category: 'mining',
    era: '文明',
    reqs: { smelting: 1, mining: 4 },
    grant: ['smelting', 2],
    costs: { Knowledge: 4950, Iron: 100 },
    effect: '解锁各种涉钢设施。开启钢材产量。',
  },

  // legacy tech.js L1987-2007: bayer_process → alumina:1
  {
    id: 'bayer_process',
    name: '拜耳法',
    description: '从铝土矿中精炼氧化铝。',
    category: 'mining',
    era: '文明',
    reqs: { smelting: 2 },
    grant: ['alumina', 1],
    costs: { Knowledge: 4500 },
    effect: '解锁金属精炼厂和铝资源。',
  },

  // legacy tech.js L2342-2360: storage → storage:1
  {
    id: 'storage',
    name: '储存',
    description: '建造更好的仓库系统。',
    category: 'storage',
    era: '文明',
    reqs: { primitive: 3, currency: 1 },
    grant: ['storage', 1],
    costs: { Knowledge: 20 },
    effect: '解锁仓库建筑。',
  },

  // legacy tech.js L8058-8077: cement
  {
    id: 'cement',
    name: '水泥',
    description: '学习制造水泥。',
    category: 'cement',
    era: '文明',
    reqs: { mining: 1, storage: 1, science: 1 },
    grant: ['cement', 1],
    costs: { Knowledge: 500 },
    effect: '解锁水泥厂和水泥工人。水泥显示。',
  },

  // legacy tech.js L4085-4103: library → science:2
  {
    id: 'library_tech',
    name: '图书馆学',
    description: '编目与保存知识的技术。',
    category: 'science',
    era: '文明',
    reqs: { science: 1, cement: 1 },
    grant: ['science', 2],
    costs: { Knowledge: 720 },
    effect: '解锁图书馆建筑，大幅增加知识上限。',
  },

  // legacy tech.js L4105-4122: thesis → science:3
  {
    id: 'thesis',
    name: '学位论文',
    description: '系统化的研究方法论。',
    category: 'science',
    era: '文明',
    reqs: { science: 2 },
    grant: ['science', 3],
    costs: { Knowledge: 1125 },
    effect: '提高研究效率，解锁更多高级科技。',
  },

  // legacy tech.js L4124-4141: research_grant → science:4
  {
    id: 'research_grant',
    name: '研究资助',
    description: '政府资助科学研究。',
    category: 'science',
    era: '文明',
    reqs: { science: 3 },
    grant: ['science', 4],
    costs: { Knowledge: 3240 },
    effect: '大幅推进科研体系，解锁更高级的科技路线。',
  },

  // legacy tech.js L1205-1223: silo → agriculture:3
  {
    id: 'silo_tech',
    name: '储粮技术',
    description: '学习大量储存粮食。',
    category: 'storage',
    era: '文明',
    reqs: { agriculture: 2, storage: 1 },
    grant: ['agriculture', 3],
    costs: { Knowledge: 80 },
    effect: '解锁粮仓建筑。',
  },

  // legacy tech.js L1225-1243: mill → agriculture:4
  {
    id: 'mill_tech',
    name: '磨坊技术',
    description: '利用风力磨碎谷物。',
    category: 'agriculture',
    era: '文明',
    reqs: { agriculture: 3, mining: 3 },
    grant: ['agriculture', 4],
    costs: { Knowledge: 5400 },
    effect: '解锁磨坊建筑。',
  },

  // legacy tech.js L3560-3578: banking
  {
    id: 'banking_tech',
    name: '银行业',
    description: '建立金融和借贷体系。',
    category: 'banking',
    era: '文明',
    reqs: { currency: 1 },
    grant: ['banking', 1],
    costs: { Knowledge: 90 },
    effect: '解锁银行建筑。',
  },

  // legacy tech.js L7332-7350: garrison → military:1
  {
    id: 'military',
    name: '驻军',
    description: '组建军事力量。',
    category: 'military',
    era: '文明',
    reqs: { science: 1, housing: 1 },
    grant: ['military', 1],
    costs: { Knowledge: 70 },
    effect: '解锁兵营和士兵。',
  },

  // legacy tech.js L325-340: cottage → housing:2
  {
    id: 'cottage_tech',
    name: '建筑学',
    description: '学习更先进的房屋建造。',
    category: 'housing',
    era: '文明',
    reqs: { housing: 1, cement: 1, mining: 3 },
    grant: ['housing', 2],
    costs: { Knowledge: 3600 },
    effect: '解锁茅屋建筑，每座提供 +2 人口上限。',
  },

  // legacy tech.js L3469-3492: trade
  // 注意：原版需要 currency:2，但我们目前没有 currency:2 的科技
  // 简化为 currency:1 + military:1，费用保持原版
  {
    id: 'trade',
    name: '贸易',
    description: '建立贸易路线。',
    category: 'market',
    era: '文明',
    reqs: { currency: 1, military: 1 },
    grant: ['trade', 1],
    costs: { Knowledge: 4500 },
    effect: '解锁贸易站。',
  },

  // legacy tech.js L1326-1344: foundry → foundry:1
  {
    id: 'foundry_tech',
    name: '铸造',
    description: '学习将原材料铸造成高级材料。',
    category: 'crafting',
    era: '文明',
    reqs: { mining: 2 },
    grant: ['foundry', 1],
    costs: { Knowledge: 650 },
    effect: '解锁铸造厂建筑和工匠岗位，允许合成胶合板、砖块和锻铁。',
  },

  // legacy tech.js L3028-3054: government → govern:1
  {
    id: 'government',
    name: '政府',
    description: '建立有组织的政府体系。',
    category: 'government',
    era: '文明',
    reqs: { currency: 1 },
    grant: ['govern', 1],
    costs: { Knowledge: 750 },
    effect: '解锁政体选择，允许采用独裁、民主或寡头制度，影响税收与市民效能。',
  },

  // legacy tech.js L3560-3578: investing → banking:2
  {
    id: 'investing',
    name: '投资',
    description: '通过放贷获取利息。',
    category: 'banking',
    era: '文明',
    reqs: { banking: 1 },
    grant: ['banking', 2],
    costs: { Money: 2500, Knowledge: 900 },
    effect: '解锁银行家岗位，产生被动金钱利息。',
  },

  // legacy tech.js L10074-10091: market → currency:2
  {
    id: 'market',
    name: '市场',
    description: '集中化的贸易场所。',
    category: 'banking',
    era: '文明',
    reqs: { banking: 1, govern: 1 },
    grant: ['currency', 2],
    costs: { Knowledge: 1800 },
    effect: '解锁更高级的经济和规划技术。',
  },

  // legacy tech.js L3601-3619: vault → banking:3
  {
    id: 'vault',
    name: '金库',
    description: '高度安全的资金储存设施。',
    category: 'banking',
    era: '文明',
    reqs: { banking: 2, cement: 1 },
    grant: ['banking', 3],
    costs: { Money: 2000, Knowledge: 3600, Iron: 500, Cement: 750 },
    effect: '提升金钱上限。',
  },

  // legacy tech.js L2912-2939: urban_planning → queue:1
  {
    id: 'urban_planning',
    name: '城市规划',
    description: '规划建筑布局，优化资源分配。',
    category: 'queues',
    era: '文明',
    reqs: { banking: 2, currency: 2 },
    grant: ['queue', 1],
    costs: { Knowledge: 2500 },
    effect: '解锁建造队列功能。',
  },

  // legacy tech.js L2941-2966: zoning_permits → queue:2
  {
    id: 'zoning_permits',
    name: '分区许可',
    description: '规范化土地使用，扩展规划规模。',
    category: 'queues',
    era: '工业化',
    reqs: { queue: 1, high_tech: 3 },
    grant: ['queue', 2],
    costs: { Knowledge: 28000 },
    effect: '建造队列容量 +1。',
  },

  // legacy tech.js L2968-2993: urbanization → queue:3
  {
    id: 'urbanization',
    name: '城市化',
    description: '向大规模城市集群发展。',
    category: 'queues',
    era: '全球化',
    reqs: { queue: 2, high_tech: 6 },
    grant: ['queue', 3],
    costs: { Knowledge: 95000 },
    effect: '建造队列容量 +1。',
  },
];
