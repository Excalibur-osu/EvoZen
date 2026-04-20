/**
 * 基础科技树定义
 * 严格对标 legacy/src/tech.js 原版数值
 *
 * 每项科技的 reqs、grant、costs 均从原版源码逐行核对。
 */

import type { GameState } from '@evozen/shared-types';

export interface TechDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  era: string;
  /** 前置科技要求 */
  reqs: Record<string, number>;
  /** 自定义额外前置判断条件 */
  condition?: (state: GameState) => boolean;
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
  // legacy tech.js L1166-1184: farm_house → farm:1
  {
    id: 'farm_house',
    name: '农舍',
    description: '使农场可供一位市民居住。',
    category: 'housing',
    era: '文明',
    reqs: { agriculture: 1, housing: 1, currency: 1 },
    grant: ['farm', 1],
    costs: { Money: 50, Knowledge: 180 },
    effect: '每个农场使市民上限 +1。',
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
  // legacy tech.js L6948-6967: copper_pickaxe → pickaxe:1
  {
    id: 'copper_pickaxe',
    name: '青铜镐',
    description: '使用青铜制造青铜镐。',
    category: 'mining',
    era: '文明',
    reqs: { mining: 2 },
    grant: ['pickaxe', 1],
    costs: { Knowledge: 675, Copper: 25 },
    effect: '矿工产量 +15%，煤矿工人产量 +12%。',
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
  // legacy tech.js L6969-6988: iron_pickaxe → pickaxe:2
  {
    id: 'iron_pickaxe',
    name: '铁镐',
    description: '使用铁制造铁镐。',
    category: 'mining',
    era: '文明',
    reqs: { pickaxe: 1, mining: 3 },
    grant: ['pickaxe', 2],
    costs: { Knowledge: 3200, Iron: 250 },
    effect: '矿工产量加成由 +15% 提升到 +30%，煤矿工人产量加成由 +12% 提升到 +24%。',
  },
  // legacy tech.js L6990-7009: steel_pickaxe → pickaxe:3
  {
    id: 'steel_pickaxe',
    name: '钢镐',
    description: '使用钢制造钢镐。',
    category: 'mining',
    era: '发现',
    reqs: { pickaxe: 2, smelting: 2 },
    grant: ['pickaxe', 3],
    costs: { Knowledge: 9000, Steel: 250 },
    effect: '矿工产量加成由 +30% 提升到 +45%，煤矿工人产量加成由 +24% 提升到 +36%。',
  },
  // legacy tech.js L7011-7030: jackhammer → pickaxe:4
  {
    id: 'jackhammer',
    name: '手提钻',
    description: '发明手提钻。',
    category: 'mining',
    era: '发现',
    reqs: { pickaxe: 3, high_tech: 2 },
    grant: ['pickaxe', 4],
    costs: { Knowledge: 22500, Copper: 5000 },
    effect: '用手提钻取代老式的镐子，矿工产量加成由 +45% 提升到 +60%，煤矿工人产量加成由 +36% 提升到 +48%。',
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
  // legacy tech.js L7097-7116: copper_hoe → hoe:1
  {
    id: 'copper_hoe',
    name: '青铜锄',
    description: '使用青铜制造青铜锄。',
    category: 'agriculture',
    era: '文明',
    reqs: { mining: 2, agriculture: 1 },
    grant: ['hoe', 1],
    costs: { Knowledge: 720, Copper: 50 },
    effect: '农民产量 +33%。',
  },
  // legacy tech.js L7118-7137: iron_hoe → hoe:2
  {
    id: 'iron_hoe',
    name: '铁锄',
    description: '使用铁制造铁锄。',
    category: 'agriculture',
    era: '文明',
    reqs: { hoe: 1, mining: 3, agriculture: 1 },
    grant: ['hoe', 2],
    costs: { Knowledge: 3600, Iron: 500 },
    effect: '农民产量加成由 +33% 提升到 +66%。',
  },
  // legacy tech.js L7139-7158: steel_hoe → hoe:3
  {
    id: 'steel_hoe',
    name: '钢锄',
    description: '使用钢制造更好的钢锄。',
    category: 'agriculture',
    era: '发现',
    reqs: { hoe: 2, smelting: 2, agriculture: 1 },
    grant: ['hoe', 3],
    costs: { Knowledge: 12600, Steel: 500 },
    effect: '农民产量加成由 +66% 提升到 +100%。',
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
    costs: { Knowledge: 4950, Steel: 25 },
    effect: '解锁各种涉钢设施。开启钢材产量。',
  },
  // legacy tech.js L2086-2104: blast_furnace → smelting:3
  {
    id: 'blast_furnace',
    name: '高炉',
    description: '改良冶炼设备，提高熔炉产线效率。',
    category: 'mining',
    era: '发现',
    reqs: { smelting: 2 },
    grant: ['smelting', 3],
    costs: { Knowledge: 13500, Coal: 2000 },
    effect: '熔炉产线效率 +20%。',
  },
  // legacy tech.js L2111-2129: bessemer_process → smelting:4
  {
    id: 'bessemer_process',
    name: '转炉炼钢法',
    description: '利用更先进的炼钢工艺提高钢材产量。',
    category: 'mining',
    era: '发现',
    reqs: { smelting: 3 },
    grant: ['smelting', 4],
    costs: { Knowledge: 19800, Coal: 5000 },
    effect: '熔炉的钢材产量额外 +20%。',
  },
  // legacy tech.js L2134-2153: oxygen_converter → smelting:5
  {
    id: 'oxygen_converter',
    name: '氧气转炉',
    description: '向炼钢过程中引入氧气，进一步提高钢材产量。',
    category: 'mining',
    era: '工业化',
    reqs: { smelting: 4, high_tech: 3 },
    grant: ['smelting', 5],
    costs: { Knowledge: 46800, Coal: 10000 },
    effect: '冶炼厂的钢产量再次 +20%。',
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
  // legacy tech.js L2362-2382: reinforced_shed → storage:2
  {
    id: 'reinforced_shed',
    name: '加强窝棚',
    description: '升级窝棚。',
    category: 'storage',
    era: '文明',
    reqs: { storage: 1, cement: 1, mining: 3 },
    grant: ['storage', 2],
    costs: { Money: 3750, Knowledge: 2550, Iron: 750, Cement: 500 },
    effect: '用新材料加固窝棚，资源储量上限 +125%。',
  },
  // legacy tech.js L2384-2406: barns → storage:3
  {
    id: 'barns',
    name: '谷仓',
    description: '将窝棚替换成谷仓。',
    category: 'storage',
    era: '发现',
    reqs: { storage: 2, smelting: 2, alumina: 1 },
    grant: ['storage', 3],
    costs: { Knowledge: 15750, Aluminium: 3000, Steel: 3000 },
    effect: '将窝棚替换成更大的谷仓，显著提升储量上限。建造谷仓的材料由石头改为水泥，资源储量上限 +133%。',
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
  // legacy tech.js L8079-8098: rebar → cement:2
  {
    id: 'rebar',
    name: '支撑柱',
    description: '在混凝土中加入支撑柱，提高强度并降低建筑的水泥消耗。',
    category: 'cement',
    era: '文明',
    reqs: { mining: 3, cement: 1 },
    grant: ['cement', 2],
    costs: { Knowledge: 3200, Iron: 750 },
    effect: '建筑的 Cement 基础成本 -10%。',
  },
  // legacy tech.js L8100-8119: steel_rebar → cement:3
  {
    id: 'steel_rebar',
    name: '钢筋',
    description: '使用钢筋作为支撑结构，进一步降低建筑的水泥消耗。',
    category: 'cement',
    era: '文明',
    reqs: { smelting: 2, cement: 2 },
    grant: ['cement', 3],
    costs: { Knowledge: 6750, Steel: 750 },
    effect: '建筑的 Cement 基础成本加成为 -20%。',
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
  // legacy tech.js L6715-6734: copper_axes → axe:2
  {
    id: 'copper_axes',
    name: '青铜斧',
    description: '使用青铜制造青铜斧。',
    category: 'lumber_gathering',
    era: '文明',
    reqs: { axe: 1, mining: 2 },
    grant: ['axe', 2],
    costs: { Knowledge: 540, Copper: 25 },
    effect: '将原始斧头升级为青铜斧，伐木场木材产量 +35%。',
  },
  // legacy tech.js L6736-6756: iron_saw → saw:1
  {
    id: 'iron_saw',
    name: '锯木厂',
    description: '将金属锯片引入伐木业，显著提高木材加工效率。',
    category: 'lumber_gathering',
    era: '文明',
    reqs: { axe: 1, mining: 3 },
    grant: ['saw', 1],
    costs: { Knowledge: 3375, Iron: 400 },
    effect: '解锁锯木厂建筑；每座锯木厂使伐木工木材产量 +5%。',
  },
  // legacy tech.js L6758-6776: steel_saw → saw:2
  {
    id: 'steel_saw',
    name: '钢锯',
    description: '发明更坚固耐用的钢锯。',
    category: 'lumber_gathering',
    era: '发现',
    reqs: { smelting: 2, saw: 1 },
    grant: ['saw', 2],
    costs: { Knowledge: 10800, Steel: 400 },
    effect: '锯木厂对伐木工的产量加成由 +5% 提升到 +8%。',
  },

  // legacy tech.js L6778-6797: iron_axes → axe:3
  {
    id: 'iron_axes',
    name: '铁斧',
    description: '使用铁制造坚固的铁斧。',
    category: 'lumber_gathering',
    era: '文明',
    reqs: { axe: 2, mining: 3 },
    grant: ['axe', 3],
    costs: { Knowledge: 2700, Iron: 250 },
    effect: '将青铜斧升级为铁斧，伐木场木材产量加成由 +35% 提升到 +70%。',
  },
  // legacy tech.js L6799-6818: steel_axes → axe:4
  {
    id: 'steel_axes',
    name: '钢斧',
    description: '使用钢制造更好的钢斧。',
    category: 'lumber_gathering',
    era: '发现',
    reqs: { axe: 3, smelting: 2 },
    grant: ['axe', 4],
    costs: { Knowledge: 9000, Steel: 250 },
    effect: '将铁斧升级为钢斧，伐木场木材产量加成由 +70% 提升到 +105%。',
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
  // legacy tech.js L964-983: smokehouse → hunting:1
  {
    id: 'smokehouse',
    name: '烟熏屋',
    description: '发明保存肉类的方法。',
    category: 'storage',
    era: '文明',
    reqs: { primitive: 3, storage: 1 },
    grant: ['hunting', 1],
    costs: { Knowledge: 80 },
    effect: '解锁烟房，可用于长期储存肉类。',
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
  // legacy tech.js L7479-7501: bows → military:2
  {
    id: 'bows',
    name: '弓箭',
    description: '为士兵装备弓箭，提升战斗力。',
    category: 'military',
    era: '文明',
    reqs: { military: 1 },
    grant: ['military', 2],
    costs: { Knowledge: 225, Lumber: 250 },
    effect: '士兵战斗力提升。',
  },
  // legacy tech.js L7503-7526: flintlock_rifle → military:3
  {
    id: 'flintlock_rifle',
    name: '燧发枪',
    description: '用火药驱动的远程武器。',
    category: 'military',
    era: '文明',
    reqs: { military: 2, explosives: 1 },
    grant: ['military', 3],
    costs: { Knowledge: 5400, Coal: 750 },
    effect: '士兵战斗力再次提升。',
  },
  // legacy tech.js L7352-7375: mercs → mercs:1
  {
    id: 'mercs_tech',
    name: '雇佣兵',
    description: '允许花钱雇佣佣兵。',
    category: 'military',
    era: '文明',
    reqs: { military: 1 },
    grant: ['mercs', 1],
    costs: { Money: 10000, Knowledge: 4500 },
    effect: '解锁雇佣兵功能，可以花费金币征募额外士兵。',
  },
  // legacy tech.js L7438-7457: boot_camp → boot_camp:1
  {
    id: 'boot_camp_tech',
    name: '训练营',
    description: '建造专门的训练设施加速新兵训练。',
    category: 'military',
    era: '发现',
    reqs: { high_tech: 1 },
    grant: ['boot_camp', 1],
    costs: { Knowledge: 8000 },
    effect: '解锁训练营建筑。',
  },
  // legacy tech.js L7811-7850: armor → armor:1
  {
    id: 'armor',
    name: '护甲',
    description: '为士兵配备护甲，减少战损。',
    category: 'military',
    era: '文明',
    reqs: { military: 1 },
    grant: ['armor', 1],
    costs: { Money: 250, Knowledge: 225, Furs: 250 },
    effect: '士兵死亡率降低（护甲提供战斗减伤）。',
  },

  // legacy tech.js L7942-7962: black_powder → explosives:1
  {
    id: 'black_powder',
    name: '黑火药',
    description: '发现黑火药。',
    category: 'mining',
    era: '文明',
    reqs: { mining: 4 },
    grant: ['explosives', 1],
    costs: { Knowledge: 4500, Coal: 500 },
    effect: '迎来万物爆炸式发展的新时代，并解锁后续炸药科技。',
  },
  // legacy tech.js L7964-7983: dynamite → explosives:2
  {
    id: 'dynamite',
    name: '炸药',
    description: '使用炸药提高采矿效率。',
    category: 'mining',
    era: '文明',
    reqs: { explosives: 1 },
    grant: ['explosives', 2],
    costs: { Knowledge: 4800, Coal: 750 },
    effect: '采石场/铝精炼基础产量 +50%，矿工与煤矿工人基础产量 +25%。',
  },
  // legacy tech.js L7397-7416: hospital → medic:1
  {
    id: 'hospital',
    name: '医院',
    description: '建立基础医疗体系，为更复杂的社会结构提供保障。',
    category: 'military',
    era: '文明',
    reqs: { military: 1, alumina: 1 },
    grant: ['medic', 1],
    costs: { Knowledge: 5000 },
    effect: '解锁医院建筑；伤兵治愈待军事系统接入，后续生育科技可使医院提高人口增长速率。',
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
  // legacy tech.js L490-502: aphrodisiac → reproduction:1
  {
    id: 'aphrodisiac',
    name: '催欲剂',
    description: '研究如何促进人口增长。',
    category: 'housing',
    era: '文明',
    reqs: { housing: 2 },
    grant: ['reproduction', 1],
    costs: { Knowledge: 4500 },
    effect: '研制有助于人口增长的药剂。',
  },
  // legacy tech.js L392-408: steel_beams → housing_reduction:1
  {
    id: 'steel_beams',
    name: '钢梁',
    description: '引入坚固的钢梁，降低住房的建材需求。',
    category: 'housing',
    era: '发现',
    reqs: { housing: 2, smelting: 2 },
    grant: ['housing_reduction', 1],
    costs: { Knowledge: 11250, Steel: 2500 },
    effect: '小屋与茅屋的成本蠕变 -2%。',
  },

  // legacy tech.js L3469-3492: trade
  {
    id: 'trade',
    name: '贸易',
    description: '建立贸易路线。',
    category: 'market',
    era: '文明',
    reqs: { currency: 2, military: 1 },
    grant: ['trade', 1],
    costs: { Knowledge: 4500 },
    effect: '解锁贸易站。',
  },
  // legacy tech.js L3494-3511: diplomacy → trade:2
  {
    id: 'diplomacy',
    name: '外交',
    description: '协商建立新的贸易路线。',
    category: 'market',
    era: '发现',
    reqs: { trade: 1, high_tech: 1 },
    grant: ['trade', 2],
    costs: { Knowledge: 16200 },
    effect: '贸易站的贸易路线 +1。',
  },
  // legacy tech.js L3513-3536: freight → trade:3
  {
    id: 'freight',
    name: '货运列车',
    description: '利用列车增加贸易量。',
    category: 'market',
    era: '工业化',
    reqs: { trade: 2, high_tech: 3 },
    grant: ['trade', 3],
    costs: { Knowledge: 37800 },
    effect: '贸易站的贸易路线再 +1。',
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
  // legacy tech.js L1346-1363: artisans → foundry:2
  {
    id: 'artisans',
    name: '工匠',
    description: '总结工匠们的经验，提高自动锻造效率。',
    category: 'crafting',
    era: '文明',
    reqs: { foundry: 1 },
    grant: ['foundry', 2],
    costs: { Knowledge: 1500 },
    effect: '每座铸造厂使自动锻造产量 +3%。',
  },
  // legacy tech.js L1365-1382: apprentices → foundry:3
  {
    id: 'apprentices',
    name: '学徒',
    description: '让资深工匠带领学徒协作，提高同产线协同效率。',
    category: 'crafting',
    era: '文明',
    reqs: { foundry: 2 },
    grant: ['foundry', 3],
    costs: { Knowledge: 3200 },
    effect: '同一种锻造物在指派超过一位工匠时，每位额外工匠使该产线产量 +3%。',
  },
  // legacy tech.js L1384-1402: carpentry → foundry:4
  {
    id: 'carpentry',
    name: '木工',
    description: '优化木材切割与拼接工艺，提升胶合板制作效率。',
    category: 'crafting',
    era: '文明',
    reqs: { foundry: 3, saw: 1 },
    grant: ['foundry', 4],
    costs: { Knowledge: 5200 },
    effect: '每座锯木厂使胶合板自动锻造产量额外 +2%。',
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
  // legacy tech.js L3368-3385: tax_rates → currency:3
  {
    id: 'tax_rates',
    name: '税率',
    description: '启用税率调节。',
    category: 'banking',
    era: '文明',
    reqs: { banking: 2, currency: 2, queue: 1 },
    grant: ['currency', 3],
    costs: { Knowledge: 3375 },
    effect: '完善财政体系，并为大宗交易提供前置。',
  },
  // legacy tech.js L3403-3422: large_trades → currency:4
  {
    id: 'large_trades',
    name: '大宗交易',
    description: '市场可以处理更大的订单。',
    category: 'market',
    era: '文明',
    reqs: { currency: 3 },
    grant: ['currency', 4],
    costs: { Knowledge: 6750 },
    effect: '手动市场单次交易上限提升至 5000，单条贸易路线数量上限提升至 100。',
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
  {
    id: 'bonds',
    name: '债券',
    description: '发行长期债券，扩大金融市场规模。',
    category: 'banking',
    era: '文明',
    reqs: { banking: 3 },
    grant: ['banking', 4],
    costs: { Money: 20000, Knowledge: 5000 },
    effect: '推进银行业到 Lv.4，为更大的金库体系提供前置。',
  },
  {
    id: 'steel_vault',
    name: '钢制金库',
    description: '用钢材建造更坚固、更庞大的保险库。',
    category: 'banking',
    era: '文明',
    reqs: { banking: 4, smelting: 2 },
    grant: ['banking', 5],
    costs: { Money: 30000, Knowledge: 6750, Steel: 3000 },
    effect: '单座银行资金库上限提高到 9000。',
  },
  {
    id: 'eebonds',
    name: '电子债券',
    description: '将债券登记和交易流程电子化。',
    category: 'banking',
    era: '发现',
    reqs: { banking: 5, high_tech: 1 },
    grant: ['banking', 6],
    costs: { Money: 75000, Knowledge: 18000 },
    effect: '推进银行业到 Lv.6，为现代金融体系提供前置。',
  },
  {
    id: 'swiss_banking',
    name: '瑞士银行业',
    description: '以高度保密和复杂账户体系扩大金融承载力。',
    category: 'banking',
    era: '工业化',
    reqs: { banking: 6 },
    grant: ['banking', 7],
    costs: { Money: 125000, Knowledge: 45000 },
    effect: '单座银行资金库额外受到银行家人数加成。',
  },
  {
    id: 'safety_deposit',
    name: '保险箱业务',
    description: '将个人财富寄存业务纳入银行体系。',
    category: 'banking',
    era: '全球化',
    reqs: { banking: 7, high_tech: 4 },
    grant: ['banking', 8],
    costs: { Money: 250000, Knowledge: 67500 },
    effect: '单座银行资金库额外获得基于人口的固定加成。',
  },
  {
    id: 'stock_market',
    name: '股票市场',
    description: '建立全国性的证券市场，连接 ARPA 证券交易所项目。',
    category: 'arpa',
    era: '全球化',
    reqs: { banking: 8, high_tech: 6 },
    grant: ['banking', 9],
    costs: { Money: 325000, Knowledge: 108000 },
    effect: '银行业达到 Lv.9，并解锁 ARPA「证券交易所」项目。',
  },
  {
    id: 'hedge_funds',
    name: '对冲基金',
    description: '引入更激进的高端资本运作方式。',
    category: 'banking',
    era: '早期太空',
    reqs: { banking: 9, stock_exchange: 1 },
    grant: ['banking', 10],
    costs: { Money: 375000, Knowledge: 126000 },
    effect: '银行业达到 Lv.10，证券交易所可进一步强化银行家收益。',
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

  // ===== 仓储系统 (Storage) =====

  // 对标原版 actions.js storage_yard reqs: { container: 1 }
  // 简化：将原版多个科技合并为一个 containerization 入口
  {
    id: 'containerization',
    name: '集装箱化',
    description: '标准化的货物装载系统。',
    category: 'storage',
    era: '文明',
    reqs: { cement: 1, mining: 1, storage: 1, science: 1 },
    grant: ['container', 1],
    costs: { Knowledge: 2700 },
    effect: '解锁装运站建筑，可使用板条箱扩展资源上限。',
  },
  // legacy tech.js L2509-2534: reinforced_crates → container:2
  {
    id: 'reinforced_crates',
    name: '加固板条箱',
    description: '用金属板加固木质板条箱，提升单个板条箱的储量。',
    category: 'storage',
    era: '文明',
    reqs: { container: 1, smelting: 2 },
    grant: ['container', 2],
    costs: { Knowledge: 6750, Sheet_Metal: 100 },
    effect: '每个板条箱的基础储量由 350 提升到 500。',
  },
  // legacy tech.js L2536-2558: cranes → container:3
  {
    id: 'cranes',
    name: '起重机',
    description: '给货场配备货运起重机，提升板条箱槽位。',
    category: 'storage',
    era: '发现',
    reqs: { container: 2, high_tech: 2 },
    grant: ['container', 3],
    costs: { Knowledge: 18000, Copper: 1000, Steel: 2500 },
    effect: '每个货场的板条箱上限由 10 提升到 20。',
  },

  // 对标原版 actions.js warehouse reqs: { steel_container: 1 }
  {
    id: 'steel_containers',
    name: '钢制集装箱',
    description: '用钢制造更坚固的集装箱。',
    category: 'storage',
    era: '发现',
    reqs: { smelting: 2, container: 1 },
    grant: ['steel_container', 1],
    costs: { Knowledge: 9000, Steel: 250 },
    effect: '解锁集装箱港口建筑，可使用集装箱进一步扩展资源上限。',
  },
  // legacy tech.js L2718-2740: gantry_crane → steel_container:2
  {
    id: 'gantry_crane',
    name: '门式起重机',
    description: '在集装箱港口增设门式起重机，提升集装箱槽位。',
    category: 'storage',
    era: '发现',
    reqs: { steel_container: 1, high_tech: 2 },
    grant: ['steel_container', 2],
    costs: { Knowledge: 22500, Steel: 5000 },
    effect: '每个集装箱港口的集装箱上限由 10 提升到 20。',
  },

  // ===== 娱乐系统 (Entertainment) =====

  // legacy tech.js L1670-1689: theatre → theatre:1
  {
    id: 'theatre',
    name: '剧场',
    description: '市民们可以在此观看演出，提振他们的精神。',
    category: 'entertainment',
    era: '文明',
    reqs: { housing: 1, currency: 1, cement: 1 },
    grant: ['theatre', 1],
    costs: { Knowledge: 750 },
    effect: '解锁圆形剧场建筑和娱乐者岗位。',
  },

  // legacy tech.js L1691-1708: playwright → theatre:2
  {
    id: 'playwright',
    name: '剧作家',
    description: '创作感人至深的戏剧作品。',
    category: 'entertainment',
    era: '文明',
    reqs: { theatre: 1, science: 2 },
    grant: ['theatre', 2],
    costs: { Knowledge: 1080 },
    effect: '每座圆形剧场的效果提升。',
  },

  // legacy tech.js L4208-4226: mad_science → high_tech:1
  {
    id: 'mad_science',
    name: '疯狂科学',
    description: '推动非常规实验与跨学科研究。',
    category: 'science',
    era: '发现',
    reqs: { science: 2, smelting: 2 },
    grant: ['high_tech', 1],
    costs: { Money: 10000, Knowledge: 6750, Aluminium: 750 },
    effect: '解锁沃登克里弗塔，并开启高科技研究线。',
  },
  // legacy tech.js L4230-4250: electricity → high_tech:2
  {
    id: 'electricity',
    name: '电力',
    description: '发现并利用稳定的电力。',
    category: 'science',
    era: '发现',
    reqs: { high_tech: 1 },
    grant: ['high_tech', 2],
    costs: { Knowledge: 13500, Copper: 1000 },
    effect: '为后续电力系统与工业化科技提供前置。',
  },
  // legacy tech.js L4252-4271: industrialization → high_tech:3
  {
    id: 'industrialization',
    name: '工业化',
    description: '以标准化与机械化推动社会进入工业时代。',
    category: 'science',
    era: '工业化',
    reqs: { high_tech: 2, cement: 2, steel_container: 1 },
    grant: ['high_tech', 3],
    costs: { Knowledge: 25200 },
    effect: '为工厂、钛与学术期刊等后续工业科技提供前置。',
  },
  // legacy tech.js L6086-6104: oil_well → oil:1
  {
    id: 'oil_well',
    name: '油井',
    description: '开采地下石油资源。',
    category: 'power_generation',
    era: '工业化',
    reqs: { high_tech: 3 },
    grant: ['oil', 1],
    costs: { Knowledge: 27000 },
    effect: '解锁油井建筑，开始开采石油。',
  },
  // legacy tech.js L6106-6124: oil_depot → oil:2
  {
    id: 'oil_depot',
    name: '石油仓库',
    description: '建造专用石油储存设施。',
    category: 'storage',
    era: '工业化',
    reqs: { oil: 1 },
    grant: ['oil', 2],
    costs: { Knowledge: 32000 },
    effect: '解锁石油仓库建筑，增加石油储存上限。',
  },
  // legacy tech.js L8204-8223: hunter_process → titanium:1
  {
    id: 'hunter_process',
    name: '亨特法',
    description: '一种从钢中提取钛的冶炼工艺。',
    category: 'mining',
    era: '工业化',
    reqs: { high_tech: 3, smelting: 2 },
    grant: ['titanium', 1],
    costs: { Knowledge: 45000, Titanium: 1000 },
    effect: '冶炼厂生产钢时同时产出钛作为副产物。',
  },

  // legacy tech.js L4273-4291: scientific_journal → science:5
  {
    id: 'scientific_journal',
    name: '学术期刊',
    description: '出版学术期刊。',
    category: 'science',
    era: '工业化',
    reqs: { science: 4, high_tech: 3 },
    grant: ['science', 5],
    costs: { Knowledge: 27000 },
    effect: '解锁科学家岗位；每位科学家使图书馆知识上限 +12%。',
  },

  // ===== 宗教系统 (Religion) =====

  // 原版 theology:1 由重置系统给予，EvoZen 简化为可研究科技
  {
    id: 'faith',
    name: '信仰',
    description: '部落开始对宇宙产生敬畏。',
    category: 'religion',
    era: '文明',
    reqs: { science: 1, housing: 1 },
    grant: ['theology', 1],
    costs: { Knowledge: 300 },
    effect: '开启宗教科技线，解锁进一步的神学研究。',
  },

  // legacy tech.js L8345-8369: theology → theology:2
  {
    id: 'theology_tech',
    name: '神学',
    description: '系统化研究宗教信仰与超自然力量。',
    category: 'religion',
    era: '文明',
    reqs: { theology: 1, housing: 1, cement: 1 },
    grant: ['theology', 2],
    costs: { Knowledge: 900 },
    effect: '解锁神庙建筑和牧师岗位。',
  },

  // ===== 工具科技 (Hammer) =====

  // legacy tech.js L6866-6884: copper_sledgehammer → hammer:1
  {
    id: 'copper_hammer',
    name: '青铜大锤',
    description: '使用青铜制造锤头。',
    category: 'mining',
    era: '文明',
    reqs: { mining: 2 },
    grant: ['hammer', 1],
    costs: { Knowledge: 540, Copper: 25 },
    effect: '石工效率 +40%。',
  },

  // legacy tech.js L6887-6905: iron_sledgehammer → hammer:2
  {
    id: 'iron_hammer',
    name: '铁制大锤',
    description: '使用铁制造锤头。',
    category: 'mining',
    era: '文明',
    reqs: { hammer: 1, mining: 3 },
    grant: ['hammer', 2],
    costs: { Knowledge: 2700, Iron: 250 },
    effect: '将青铜锤升级为更耐用的铁锤，采石场产量加成由 +40% 提升到 +80%。',
  },

  // legacy tech.js L6908-6926: steel_sledgehammer → hammer:3
  {
    id: 'steel_hammer',
    name: '钢制大锤',
    description: '使用钢制造锤头。',
    category: 'mining',
    era: '发现',
    reqs: { hammer: 2, smelting: 2 },
    grant: ['hammer', 3],
    costs: { Knowledge: 7200, Steel: 250 },
    effect: '将铁锤升级为更坚固的钢锤，采石场产量加成由 +80% 提升到 +120%。',
  },

  // ===== 神权政体科技 (Theocracy) =====

  // 对标 legacy/src/tech.js L3055-3072
  // reqs: { govern: 1, theology: 2 }, grant: ['gov_theo', 1], cost: 1200 Knowledge
  {
    id: 'theocracy',
    name: '神权政体',
    description: '以宗教信仰为基础建立政权。',
    category: 'government',
    era: '文明',
    reqs: { govern: 1, theology: 2 },
    grant: ['gov_theo', 1],
    costs: { Knowledge: 1200 },
    effect: '解锁神权政体。神庙加成 +12%，但教授效率 -25%，科学家效率 -50%。',
  },
  {
    id: 'republic',
    name: '共和国',
    description: '通过代议制与法治重塑国家财政体系。',
    category: 'government',
    era: '发现',
    reqs: { govern: 1 },
    condition: (state) => (state.tech['trade'] ?? 0) >= 2 || state.race.terrifying !== undefined,
    grant: ['govern', 2],
    costs: { Knowledge: 17000 },
    effect: '解锁共和国。银行家收益 +25%，基础士气 +20。',
  },
  {
    id: 'socialist',
    name: '社会主义',
    description: '强调统一调配与集体化经济组织。',
    category: 'government',
    era: '发现',
    reqs: { govern: 1 },
    condition: (state) => (state.tech['trade'] ?? 0) >= 2 || state.race.terrifying !== undefined,
    grant: ['gov_soc', 1],
    costs: { Knowledge: 17000 },
    effect: '解锁社会主义。工厂效率 +10%，但金钱类收入 -20%。',
  },
  {
    id: 'corpocracy',
    name: '企业政体',
    description: '让企业资本直接主导国家决策与扩张。',
    category: 'government',
    era: '工业化',
    reqs: { govern: 2, high_tech: 3 },
    grant: ['gov_corp', 1],
    costs: { Knowledge: 26000 },
    effect: '解锁企业政体。赌场/旅游/工厂收益提高，但税收效率减半且士气下降。',
  },

  // ===== 电力系统 (Power) =====

  // legacy tech.js L6126-6150: oil_power → oil:3
  // reqs: { oil: 2 }, grant: ['oil',3], cost: Knowledge 44000
  {
    id: 'oil_powerplant',
    name: '石油发电',
    description: '利用石油驱动涡轮机发电。',
    category: 'power_generation',
    era: '工业化',
    reqs: { oil: 2 },
    grant: ['oil', 3],
    costs: { Knowledge: 44000 },
    effect: '解锁石油发电站建筑。',
  },

  // ===== 采掘工具 (Shovel) =====

  // ===== 垃圾回收 / 挖掘工具 (Reclaimer) =====
  // 注意：legacy 中 shovel/iron_shovel 属于 reclaimer 系列（垃圾回收科技链）
  // 作为过渡实现，先用 reclaimer 系统注册，tick 中可另外处理效果

  // legacy tech.js shovel → reclaimer:2（文明时代挖掘效率升级）
  {
    id: 'shovel',
    name: '铁锹',
    description: '使用铁锹加快挖掘速度。',
    category: 'mining',
    era: '文明',
    reqs: { reclaimer: 1, mining: 2 },
    grant: ['reclaimer', 2],
    costs: { Knowledge: 540, Copper: 25 },
    effect: '挖掘效率提升，石工和矿工基础产量 +5%。',
  },

  // legacy tech.js iron_shovel → reclaimer:3
  {
    id: 'iron_shovel',
    name: '铁铲',
    description: '用铁制造坚固的铁铲，比铁锹更高效。',
    category: 'mining',
    era: '文明',
    reqs: { reclaimer: 2, mining: 3 },
    grant: ['reclaimer', 3],
    costs: { Knowledge: 2700, Iron: 250 },
    effect: '挖掘效率提升至 +10%。',
  },

  // ===== 地质探测 (Dowsing) =====

  // legacy tech.js dowsing_rod → dowsing:1
  {
    id: 'dowsing_rod',
    name: '探矿杖',
    description: '用特殊的探矿杖寻找地下水脉和矿脉。',
    category: 'mining',
    era: '文明',
    reqs: { mining: 2, foraging: 1 },
    grant: ['dowsing', 1],
    costs: { Knowledge: 450, Lumber: 750 },
    effect: '解锁地质探测，矿工额外随机探测到更多矿脉（效果待接入）。',
  },

  // legacy tech.js metal_detector → dowsing:2
  {
    id: 'metal_detector',
    name: '金属探测器',
    description: '利用电磁原理探测地下金属矿藏。',
    category: 'mining',
    era: '发现',
    reqs: { dowsing: 1, high_tech: 4 },
    grant: ['dowsing', 2],
    costs: { Knowledge: 65000 },
    effect: '大幅提升矿脉探测精度，矿工和煤矿工人的产量 +8%。',
  },

  // ===== 军事护甲 (plate_armor) =====

  // legacy tech.js plate_armor → armor:2
  {
    id: 'plate_armor',
    name: '板甲',
    description: '全身覆盖的重型金属板甲，大幅提升士兵防御。',
    category: 'military',
    era: '文明',
    reqs: { armor: 1, mining: 3 },
    grant: ['armor', 2],
    costs: { Knowledge: 3400, Iron: 600 },
    effect: '士兵护甲等级提升至 armor:2，战斗死亡率进一步降低。',
  },

  // ===== Missing Buildings Sprint =====

  // legacy tech.js L4618: bioscience → genetics:1 → 解锁 biolab
  {
    id: 'bioscience',
    name: '生物科学',
    description: '将生物学提升为精确科学，开启基因研究与生物实验室建设。',
    category: 'science',
    era: '全球化',
    reqs: { science: 8 },
    grant: ['genetics', 1],
    costs: { Knowledge: 67500 },
    effect: '解锁生物实验室（Biolab）建筑，提供大量知识容量上限。',
  },

  // legacy tech.js L4637: genetics → genetics:2（后续 ARPA，暂只建 entry point）
  {
    id: 'genetics',
    name: '基因学',
    description: '深入研究遗传密码，为 ARPA 基因组项目奠定基础。',
    category: 'science',
    era: '全球化',
    reqs: { genetics: 1, high_tech: 6 },
    grant: ['genetics', 2],
    costs: { Knowledge: 108000 },
    effect: '推进基因学研究，解锁后续 ARPA 项目。',
  },

  // legacy tech.js L1846: casino → gambling:1 → 解锁 casino 建筑
  {
    id: 'casino',
    name: '赌场',
    description: '引入有组织的赌博业，建造豪华娱乐场所。',
    category: 'entertainment',
    era: '全球化',
    reqs: { high_tech: 4, currency: 5 },
    grant: ['gambling', 1],
    costs: { Knowledge: 95000 },
    effect: '解锁赌场建筑，提供娱乐收入与娱乐者岗位。',
  },

  // legacy tech.js L1869-1884: dazzle → gambling:2
  {
    id: 'dazzle',
    name: '炫目表演',
    description: '用更高级的表演与体验刺激赌客消费。',
    category: 'banking',
    era: '全球化',
    reqs: { gambling: 1 },
    grant: ['gambling', 2],
    costs: { Knowledge: 125000 },
    effect: '赌场收入提升 50%。',
  },
  {
    id: 'casino_vault',
    name: '赌场金库',
    description: '将赌场作为资金运转的中枢之一。',
    category: 'banking',
    era: '早期太空',
    reqs: { gambling: 2, space_explore: 3 },
    grant: ['gambling', 3],
    costs: { Knowledge: 145000, Iridium: 2500 },
    effect: '每个赌场提供更高的资金上限。',
  },
  {
    id: 'otb',
    name: '场外投注',
    description: '建立不受单一地理位置限制的投注网格体系。',
    category: 'banking',
    era: '深空',
    reqs: { gambling: 3, banking: 10, high_tech: 10 },
    grant: ['gambling', 4],
    costs: { Knowledge: 390000 },
    effect: '进一步巨幅提升每个赌场提供的资金上限。',
  },

  // legacy tech.js L3539: wharf → wharf:1 → 解锁 wharf 建筑
  {
    id: 'wharf',
    name: '码头',
    description: '建设深水港口设施，大幅提升海上贸易能力。',
    category: 'trade',
    era: '工业化',
    reqs: { trade: 1, high_tech: 3, oil: 1 },
    grant: ['wharf', 1],
    costs: { Knowledge: 44000 },
    effect: '解锁码头建筑，每座提供 2 条额外贸易路线及集装箱容量。',
  },

  // legacy tech.js L4001: monument → monument:1
  {
    id: 'monument',
    name: '纪念碑',
    description: '建造宏伟的永恒建筑，彰显文明的荣耀。',
    category: 'science',
    era: '全球化',
    reqs: { high_tech: 6 },
    grant: ['monument', 1],
    costs: { Knowledge: 120000 },
    effect: '解锁 ARPA 纪念碑项目，提升文明声望。',
  },

  // legacy tech.js L4024: tourism → monument:2 → 解锁 tourist_center
  {
    id: 'tourism',
    name: '旅游业',
    description: '将纪念碑与名胜古迹开发为旅游目的地，带动经济增长。',
    category: 'trade',
    era: '早期太空',
    reqs: { monument: 1, monuments: 2 },
    grant: ['monument', 2],
    costs: { Knowledge: 150000 },
    effect: '解锁旅游中心建筑，放大娱乐/宗教建筑的士气收入效益。',
  },

  // ===== Mid-Tech Gap Fill =====
  // 以下科技填补 high_tech 3→6、science 5→8、currency 4→5、storage 3→4 的断层
  // 使之前定义但不可达的科技（casino/monument/bioscience/genetics 等）成为可达

  // legacy tech.js L4911: electronics → high_tech:4
  // reqs: { high_tech: 3, titanium: 1 }, cost: Knowledge 50000
  {
    id: 'electronics',
    name: '电子学',
    description: '电子器件与线路的设计与制造。',
    category: 'science',
    era: '工业化',
    reqs: { high_tech: 3, titanium: 1 },
    grant: ['high_tech', 4],
    costs: { Knowledge: 50000 },
    effect: '开启电子时代，为赌场、高级采矿和核能科技提供前置。',
  },

  // legacy tech.js L5935: fission → high_tech:5
  // reqs: { high_tech: 4, uranium: 1 }, cost: Knowledge 77400, Uranium 10
  {
    id: 'fission',
    name: '核裂变',
    description: '通过可控的核裂变反应释放能量。',
    category: 'power_generation',
    era: '全球化',
    reqs: { high_tech: 4, uranium: 1 },
    grant: ['high_tech', 5],
    costs: { Knowledge: 77400, Uranium: 10 },
    effect: '解锁核电站建筑，提供大量稳定电力。',
  },

  // legacy tech.js L4957: arpa → high_tech:6
  // reqs: { high_tech: 5 }, cost: Knowledge 90000
  {
    id: 'arpa',
    name: 'ARPA',
    description: '高级研究计划局——推进尖端长线研究项目。',
    category: 'science',
    era: '全球化',
    reqs: { high_tech: 5 },
    grant: ['high_tech', 6],
    costs: { Knowledge: 90000 },
    effect: '开启 ARPA 长线研究系统，为纪念碑和遗传学提供前置。',
  },
  {
    id: 'rocketry',
    name: '火箭学',
    description: '将大型火箭推进技术用于近地轨道与行星际探索。',
    category: 'arpa',
    era: '全球化',
    reqs: { high_tech: 6 },
    grant: ['high_tech', 7],
    costs: { Knowledge: 112500, Oil: 6800 },
    effect: '开启早期太空探索入口，为天体物理学和轨道探索提供前置。',
  },
  {
    id: 'robotics',
    name: '机器人学',
    description: '用自动化与远程控制系统支撑更复杂的太空任务。',
    category: 'progress',
    era: '全球化',
    reqs: { high_tech: 7 },
    grant: ['high_tech', 8],
    costs: { Knowledge: 125000 },
    effect: '推进高科技到 Lv.8，为星图与火星殖民入口提供前置。',
  },
  {
    id: 'observatory',
    name: '天文台',
    description: '在月面建立更远程、更稳定的深空观测阵地。',
    category: 'science',
    era: '早期太空',
    reqs: { science: 8, space: 3, luna: 1 },
    grant: ['science', 9],
    costs: { Knowledge: 148000 },
    effect: '科学提升到 Lv.9，为星图研究提供前置。',
  },

  // legacy tech.js L4162: adjunct_professor → science:6
  // reqs: { science: 5 }, cost: Knowledge 36000
  {
    id: 'adjunct_professor',
    name: '副教授',
    description: '为研究机构增配副教授，提高教学科研水平。',
    category: 'science',
    era: '工业化',
    reqs: { science: 5 },
    grant: ['science', 6],
    costs: { Knowledge: 36000 },
    effect: '沃登克里弗塔为每位教授提供 +1% 知识上限。',
  },

  // legacy tech.js L4181: tesla_coil → science:7
  // reqs: { science: 6, high_tech: 3 }, cost: Knowledge 51750
  {
    id: 'tesla_coil',
    name: '特斯拉线圈',
    description: '利用高频共振为实验室供能。',
    category: 'science',
    era: '工业化',
    reqs: { science: 6, high_tech: 3 },
    grant: ['science', 7],
    costs: { Knowledge: 51750 },
    effect: '每座沃登克里弗塔知识上限 +1000 → +1500。',
  },

  // legacy tech.js L4200: internet → science:8
  // reqs: { science: 7, high_tech: 4 }, cost: Knowledge 61200
  {
    id: 'internet',
    name: '互联网',
    description: '全球计算机网络连接。',
    category: 'science',
    era: '全球化',
    reqs: { science: 7, high_tech: 4 },
    grant: ['science', 8],
    costs: { Knowledge: 61200 },
    effect: '大幅提升研究效率，大学知识上限由 500 提升到 700。',
  },

  // legacy tech.js L3429: corruption → currency:5
  // reqs: { currency: 4, high_tech: 3 }, cost: Knowledge 36000
  {
    id: 'corruption',
    name: '腐败',
    description: '见识到金钱的黑暗面，但也能从黑市获利。',
    category: 'banking',
    era: '工业化',
    reqs: { currency: 4, high_tech: 3 },
    grant: ['currency', 5],
    costs: { Knowledge: 36000 },
    effect: '解锁更高级的金融科技。',
  },

  // legacy tech.js L2408: warehouse_tech → storage:4
  // reqs: { storage: 3, high_tech: 3, smelting: 2 }, cost: Knowledge 40500, Titanium 3000
  {
    id: 'warehouse_tech',
    name: '仓储技术',
    description: '用先进材料和管理系统升级仓储设施。',
    category: 'storage',
    era: '工业化',
    reqs: { storage: 3, high_tech: 3, smelting: 2 },
    grant: ['storage', 4],
    costs: { Knowledge: 40500, Titanium: 3000 },
    effect: '仓库建材从木材升级为铁，资源储量上限进一步提升。',
  },

  // legacy tech.js L5982: uranium → uranium:1
  // reqs: { high_tech: 4 }, cost: Knowledge 72000
  {
    id: 'uranium_tech',
    name: '铀矿',
    description: '发现并开采放射性矿物——铀。',
    category: 'power_generation',
    era: '全球化',
    reqs: { high_tech: 4 },
    grant: ['uranium', 1],
    costs: { Knowledge: 72000 },
    effect: '解锁铀资源，为核裂变发电提供燃料。',
  },
  {
    id: 'astrophysics',
    name: '天体物理学',
    description: '通过更精确的轨道力学与天体观测规划太空任务。',
    category: 'space_exploration',
    era: '早期太空',
    reqs: { space: 2 },
    grant: ['space_explore', 1],
    costs: { Knowledge: 125000 },
    effect: '开启太空探索页与轨道探索入口。',
  },
  {
    id: 'rover',
    name: '探测车',
    description: '制造可远程部署的月表探测平台。',
    category: 'space_exploration',
    era: '早期太空',
    reqs: { space_explore: 1 },
    grant: ['space_explore', 2],
    costs: { Knowledge: 135000, Alloy: 22000, Polymer: 18000, Uranium: 750 },
    effect: '推进太空探索到 Lv.2，建立月面探索骨架。',
  },
  {
    id: 'probes',
    name: '深空探针',
    description: '向更远轨道发射自动探针，为火星与深空绘制航线。',
    category: 'space_exploration',
    era: '早期太空',
    reqs: { space_explore: 2 },
    grant: ['space_explore', 3],
    costs: { Knowledge: 168000, Steel: 100000, Iridium: 5000, Uranium: 2250, Helium_3: 3500 },
    effect: '推进太空探索到 Lv.3，建立火星航道入口骨架。',
  },
  {
    id: 'starcharts',
    name: '星图',
    description: '整理恒星航线与轨道窗口，准备更远的太空扩张。',
    category: 'space_exploration',
    era: '早期太空',
    reqs: { space_explore: 3, science: 9 },
    grant: ['space_explore', 4],
    costs: { Knowledge: 185000 },
    effect: '推进太空探索到 Lv.4，为后续太阳系扩张保留入口。',
  },
  {
    id: 'colonization',
    name: '殖民化',
    description: '将火星前哨转化为可持续扩张的殖民起点。',
    category: 'agriculture',
    era: '早期太空',
    reqs: { space: 4, mars: 1 },
    grant: ['mars', 2],
    costs: { Knowledge: 172000 },
    effect: '开启火星殖民入口。',
  },
  {
    id: 'red_tower',
    name: '火星高塔',
    description: '在红色星球上建立稳定的深空通信与观测塔。',
    category: 'space_exploration',
    era: '早期太空',
    reqs: { mars: 2 },
    grant: ['mars', 3],
    costs: { Knowledge: 195000 },
    effect: '火星殖民推进到 Lv.2，解锁更深的火星建设前置。',
  },
  {
    id: 'space_manufacturing',
    name: '太空制造',
    description: '将部分高端制造能力转移到火星和轨道设施。',
    category: 'crafting',
    era: '早期太空',
    reqs: { mars: 3 },
    grant: ['mars', 4],
    costs: { Knowledge: 220000 },
    effect: '火星殖民推进到 Lv.3，为后续太空工厂与重工业保留接口。',
  },
  {
    id: 'vr_center',
    name: 'VR 中心',
    description: '将高等级沉浸式娱乐系统引入火星殖民地，作为更后段士气链与广播链的延伸节点。',
    category: 'entertainment',
    era: '深空时代',
    reqs: { broadcast: 2, high_tech: 12, stanene: 1 },
    condition: (state) => state.race['warlord'] === undefined,
    grant: ['broadcast', 3],
    costs: { Knowledge: 620000 },
    effect: '推进广播到 Lv.3，并注册 VR 中心太空结构槽位。',
  },
  {
    id: 'exotic_lab',
    name: '异星实验室',
    description: '建立更高等级的火星实验设施，为异星资源与深空研究提供前置。',
    category: 'science',
    era: '深空时代',
    reqs: { mars: 4, asteroid: 5 },
    grant: ['mars', 5],
    costs: { Knowledge: 250000 },
    effect: '火星殖民推进到 Lv.5，并注册异星实验室槽位。',
  },
  // legacy tech.js L7750-7769: space_marines → marines:1
  {
    id: 'space_marines',
    name: '太空陆战队',
    description: '在火星殖民地部署专业军事力量，保障前线安全。',
    category: 'military',
    era: '早期太空',
    reqs: { space: 3, mars: 2 },
    grant: ['marines', 1],
    costs: { Knowledge: 210000 },
    effect: '解锁火星军营，可在红色行星驻扎太空陆战队以扩大驻军上限。',
  },

  // ===== 神学 / 宗教科技链 =====
  // theology:1 由 prestige 基因 'ancients' 自动授予，当前不可达。
  // 以下科技在 theology:1 就位后形成完整可达链。

  // legacy tech.js L8345-8369: theology → theology:2
  {
    id: 'theology',
    name: '神学',
    description: '研究信仰的力量。',
    category: 'religion',
    era: '文明',
    reqs: { theology: 1, housing: 1, cement: 1 },
    grant: ['theology', 2],
    costs: { Knowledge: 900 },
    effect: '解锁神殿建筑，为后续宗教科技奠定基础。',
  },
  // legacy tech.js L8371-8399: fanaticism → theology:3
  // 原版有 fanaticism / alt_fanaticism 两个分支（取决于 transcendence 基因），
  // 当前简化为单一 fanaticism。
  {
    id: 'fanaticism',
    name: '狂热信仰',
    description: '将信仰推向极致。',
    category: 'religion',
    era: '文明',
    reqs: { theology: 2 },
    grant: ['theology', 3],
    costs: { Knowledge: 2500 },
    effect: '推进神学到 Lv.3，为古代神学解锁前置。',
  },
  // legacy tech.js L8432-8457: ancient_theology → theology:4
  {
    id: 'ancient_theology',
    name: '古代神学',
    description: '在火星殖民地复兴远古信仰。',
    category: 'religion',
    era: '早期太空',
    reqs: { theology: 3, mars: 2 },
    // 原版 condition: global.genes['ancients']；当前 ancients 基因未实装，
    // 与 theology:1 来源相同，链路自然阻断。
    grant: ['theology', 4],
    costs: { Knowledge: 180000 },
    effect: '解锁火星古代神殿（ziggurat），赋予全局资源产出加成。',
  },
  // legacy tech.js L8459-8483: study → theology:5 + ancient_study:1
  {
    id: 'study',
    name: '远古研究',
    description: '深入研究远古文明遗迹。',
    category: 'religion',
    era: '早期太空',
    reqs: { theology: 4 },
    grant: ['theology', 5],
    costs: { Knowledge: 195000 },
    effect: '获得 ancient_study:1，提升神殿全局乘数基数（0.004 → 0.006）。',
  },

  // ===== 太阳能 / 戴森球科技链 =====

  // legacy tech.js L8968-8985: dyson_sphere → solar:2
  {
    id: 'dyson_sphere',
    name: '戴森球',
    description: '构思在恒星周围建造巨型能量采集结构。',
    category: 'power_generation',
    era: '早期太空',
    reqs: { solar: 1 },
    grant: ['solar', 2],
    costs: { Knowledge: 195000 },
    effect: '解锁戴森虫群技术路线。',
  },
  // legacy tech.js L8987-9005: dyson_swarm → solar:3
  {
    id: 'dyson_swarm',
    name: '戴森虫群',
    description: '以大量小型卫星替代单体球壳，更可行的恒星能量采集方案。',
    category: 'power_generation',
    era: '早期太空',
    reqs: { solar: 2 },
    grant: ['solar', 3],
    costs: { Knowledge: 210000 },
    effect: '解锁虫群控制站与虫群卫星建筑。',
  },
  // legacy tech.js L9007-9025: swarm_plant → solar:4
  {
    id: 'swarm_plant',
    name: '虫群工厂科技',
    description: '在地狱行星建造虫群卫星零件工厂。',
    category: 'power_generation',
    era: '深空',
    reqs: { solar: 3, hell: 1, gas_moon: 1 },
    grant: ['solar', 4],
    costs: { Knowledge: 250000 },
    effect: '解锁地狱行星虫群工厂，降低卫星成本。',
  },

  // ===== 大气采矿 → 气态巨行星 =====

  // legacy tech.js L9315-9334: atmospheric_mining → gas_giant:1
  {
    id: 'atmospheric_mining',
    name: '大气层采矿',
    description: '开发从气态巨行星大气中采集资源的技术。',
    category: 'power_generation',
    era: '早期太空',
    reqs: { space: 5 },
    grant: ['gas_giant', 1],
    costs: { Knowledge: 190000 },
    effect: '解锁气态巨行星的气体采集站与轨道储存站。',
  },

  // ===== 零重力采矿 → 小行星带 =====

  // legacy tech.js L9395-9415: zero_g_mining → asteroid:2
  {
    id: 'zero_g_mining',
    name: '零重力采矿',
    description: '在微重力环境中进行资源开采的技术。',
    category: 'space_mining',
    era: '早期太空',
    reqs: { asteroid: 1, high_tech: 8 },
    grant: ['asteroid', 2],
    costs: { Knowledge: 210000 },
    effect: '解锁小行星带太空站、铱矿采矿船与铁矿采矿船。',
  },

  // ===== 超铀开采 → asteroid:5 =====

  // legacy tech.js L9417-9439: elerium_mining → asteroid:5
  {
    id: 'elerium_mining',
    name: '超铀矿开采',
    description: '开发从小行星中提取超铀元素的技术。',
    category: 'space_mining',
    era: '深空',
    reqs: { asteroid: 4 },
    grant: ['asteroid', 5],
    costs: { Knowledge: 235000, Elerium: 1 },
    effect: '解锁超铀采矿船。',
  },

  // ===== 超铀科技 → elerium:1 =====

  // legacy tech.js L9480-9498: elerium_tech → elerium:1
  {
    id: 'elerium_tech',
    name: '超铀工程',
    description: '研究超铀元素的工程应用。',
    category: 'space_mining',
    era: '深空',
    reqs: { asteroid: 5 },
    grant: ['elerium', 1],
    costs: { Knowledge: 275000, Elerium: 20 },
    effect: '解锁矮行星探索任务与超铀容器。',
  },

  // ===== 超铀反应堆 → elerium:2 =====

  // legacy tech.js L9500-9519: elerium_reactor → elerium:2
  {
    id: 'elerium_reactor',
    name: '超铀反应堆科技',
    description: '利用超铀裂变产生大量电力。',
    category: 'power_generation',
    era: '深空',
    reqs: { dwarf: 1, elerium: 1 },
    grant: ['elerium', 2],
    costs: { Knowledge: 325000, Elerium: 180 },
    effect: '解锁矮行星超铀反应堆。',
  },

  // ===== 产出升级科技 =====

  // legacy tech.js L9441-9458: laser_mining → asteroid:6
  // 解锁后 iridium_ship 0.055→0.08, iron_ship 2→3, elerium_ship 0.005→0.0075
  {
    id: 'laser_mining',
    name: '激光采矿',
    description: '使用聚焦激光束提高小行星带采矿效率。',
    category: 'space_mining',
    era: '深空',
    reqs: { asteroid: 5, elerium: 1, high_tech: 9 },
    grant: ['asteroid', 6],
    costs: { Knowledge: 350000 },
    effect: '提升小行星带采矿船产出效率。',
  },
  // legacy tech.js L9460-9478: plasma_mining → asteroid:7
  // 解锁后 iridium_ship 0.08→0.1, iron_ship 3→4, elerium_ship 0.0075→0.009
  {
    id: 'plasma_mining',
    name: '等离子采矿',
    description: '使用等离子切割技术进一步提高采矿效率。',
    category: 'space_mining',
    era: '星际',
    reqs: { asteroid: 6, high_tech: 13 },
    grant: ['asteroid', 7],
    costs: { Knowledge: 825000 },
    effect: '进一步提升小行星带采矿船产出效率。',
  },
  // legacy tech.js L9336-9354: helium_attractor → helium:1
  // 解锁后 gas_mining He3 产出 0.5→0.65
  {
    id: 'helium_attractor',
    name: '氦吸引器',
    description: '改进气态巨行星大气采集技术，提高氦-3产出。',
    category: 'power_generation',
    era: '深空',
    reqs: { gas_giant: 1, elerium: 1 },
    grant: ['helium', 1],
    costs: { Knowledge: 290000, Elerium: 250 },
    effect: '气态巨行星氦-3采集效率提升 30%。',
  },
  // legacy tech.js L9027-9044: space_sourced → solar:5
  // 解锁 iron_ship 的附加 Swarm Satellite 组件效果
  {
    id: 'space_sourced',
    name: '太空资源化',
    description: '将太空采集的原材料直接用于虫群卫星生产。',
    category: 'power_generation',
    era: '深空',
    reqs: { solar: 4, asteroid: 3 },
    grant: ['solar', 5],
    costs: { Knowledge: 300000 },
    effect: '铁矿采矿船可为虫群卫星提供原材料。',
  },
];
