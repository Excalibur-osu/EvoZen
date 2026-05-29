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
const RAW_BASIC_TECHS: TechDefinition[] = [
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
  // legacy tech.js L350-369: apartment → housing:3
  {
    id: 'apartment_tech',
    name: '城市化',
    description: '通过建造高密度的公寓楼来容纳更多人口。',
    category: 'housing',
    era: '发现',
    reqs: { housing: 2, high_tech: 2 },
    grant: ['housing', 3],
    costs: { Knowledge: 15750 },
    effect: '解锁公寓建筑，提供大量人口上限。',
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
  // legacy lasers 原本还要求 supercollider:1。
  // 当前 supercollider / particles 支线尚未恢复，先挂在已接通的深空主线后面，
  // 避免 high_tech 8→10 完全断档，后续回补 supercollider 时再替换为原版入口。
  {
    id: 'lasers',
    name: '激光技术',
    description: '将高能定向光束应用到深空工业与后续高科技设备中。',
    category: 'progress',
    era: '深空',
    reqs: { high_tech: 8, space: 3, elerium: 1 },
    grant: ['high_tech', 9],
    costs: { Knowledge: 280000, Elerium: 100 },
    effect: '推进高科技到 Lv.9，为人工智能与更深工业链提供前置。',
  },
  {
    id: 'artificial_intelligence',
    name: '人工智能',
    description: '将自动化控制推进到更高层级，为纳米材料与后续量子计算奠定基础。',
    category: 'progress',
    era: '深空',
    reqs: { high_tech: 9 },
    grant: ['high_tech', 10],
    costs: { Knowledge: 325000 },
    effect: '推进高科技到 Lv.10，解锁纳米管科技入口。',
  },
  {
    id: 'nano_tubes',
    name: '纳米管',
    description: '开发碳纳米管制造工艺，并将其纳入工厂产线。',
    category: 'crafting',
    era: '深空',
    reqs: { high_tech: 10 },
    grant: ['nano', 1],
    costs: { Knowledge: 375000, Coal: 100000, Neutronium: 1000 },
    effect: '解锁 Nano_Tube 资源与工厂纳米管产线，为 Alpha 采矿无人机提供材料。',
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
  {
    id: 'world_collider',
    name: '世界对撞机',
    description: '在矮行星表面规划超大型对撞机，用于突破 science:10 的最终门槛。',
    category: 'science',
    era: '深空',
    reqs: { science: 9, elerium: 2 },
    condition: (state) => state.race['warlord'] === undefined,
    grant: ['science', 10],
    costs: { Knowledge: 350000 },
    effect: '解锁矮行星世界对撞机建造链，并预注册世界控制器槽位。',
  },
  {
    id: 'tachyon',
    name: '快子理论',
    description: '基于世界控制器的突破，重新审视超光速通信与航行的可能性。',
    category: 'progress',
    era: '星际',
    reqs: { wsc: 1 },
    grant: ['ftl', 1],
    costs: { Knowledge: 435000 },
    effect: '开启超光速理论，为曲速引擎提供前置。',
  },
  {
    id: 'warp_drive',
    name: '曲速引擎',
    description: '将快子理论转化为实际星际航行技术，并建立半人马座 Alpha 前线入口。',
    category: 'space_exploration',
    era: '星际',
    reqs: { ftl: 1 },
    grant: ['ftl', 2],
    costs: { Knowledge: 450000 },
    effect: '建立 interstellar 入口，注册 Alpha 星港槽位。',
  },
  {
    id: 'habitat',
    name: '定居点',
    description: '在半人马座 Alpha 四号行星建立永久定居点，使星际殖民真正具备人口承载能力。',
    category: 'housing',
    era: '星际',
    reqs: { alpha: 2, droids: 1 },
    grant: ['alpha', 3],
    costs: { Knowledge: 480000 },
    effect: '推进 alpha 到 Lv.3，并注册 Habitat 建筑槽位。',
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

  // ===== 政府类型补充 (Government) =====

  // legacy tech.js L3137-3155: technocracy → govern:3
  {
    id: 'technocracy',
    name: '技术官僚',
    description: '由技术专家主导的理性治理体系。',
    category: 'government',
    era: '工业化',
    reqs: { govern: 2, high_tech: 3 },
    grant: ['govern', 3],
    costs: { Knowledge: 26000 },
    effect: '解锁技术官僚政体。科学家产出 +50%，教授产出 +25%，但税收 -10%。',
  },

  // legacy tech.js L3156-3177: federation → gov_fed:1
  {
    id: 'federation',
    name: '联邦制',
    description: '多区域联合的联邦政体。',
    category: 'government',
    era: '早期太空',
    reqs: { govern: 2 },
    condition: (state) => (state.tech['unify'] ?? 0) >= 2,
    grant: ['gov_fed', 1],
    costs: { Knowledge: 30000 },
    effect: '解锁联邦政体。士气 +10%，税收 +10%，但维护费 +15%。',
  },

  // legacy tech.js L3178-3199: magocracy → gov_mage:1
  {
    id: 'magocracy',
    name: '法师统治',
    description: '由法师议会主导的魔法政体。',
    category: 'government',
    era: '工业化',
    reqs: { govern: 2, high_tech: 3 },
    condition: (state) => state.race.universe === 'magic',
    grant: ['gov_mage', 1],
    costs: { Knowledge: 26000 },
    effect: '解锁法师统治政体（仅魔法宇宙）。法师产出 +50%，研究效率 +25%。',
  },

  // legacy tech.js L3200-3225: governor → governor:1
  {
    id: 'governor_tech',
    name: '总督系统',
    description: '任命总督自动管理城市事务。',
    category: 'government',
    era: '文明',
    reqs: { govern: 1 },
    condition: (state) => state.genes?.governor !== undefined && state.civic?.govern?.type !== 'anarchy',
    grant: ['governor', 1],
    costs: { Knowledge: 1000 },
    effect: '解锁总督面板，可任命总督自动执行日常任务。',
  },

  // ===== 基因科技 (Genes) =====

  // legacy tech.js L4671-4695: crispr → genetics:4
  {
    id: 'crispr',
    name: 'CRISPR',
    description: '基因编辑技术，解锁 CRISPR 升级系统。',
    category: 'genes',
    era: '全球化',
    reqs: { genetics: 3 },
    grant: ['genetics', 4],
    costs: { Knowledge: 125000 },
    effect: '解锁 CRISPR 面板，可使用基因点进行永久升级。',
  },

  // legacy tech.js L4696-4718: shotgun_sequencing → genetics:5
  {
    id: 'shotgun_sequencing',
    name: '鸟枪法测序',
    description: '快速基因测序技术。',
    category: 'genes',
    era: '早期太空',
    reqs: { genetics: 4 },
    grant: ['genetics', 5],
    costs: { Knowledge: 165000 },
    effect: '基因序列项目获得加速。',
  },

  // legacy tech.js L4719-4741: de_novo_sequencing → genetics:6
  {
    id: 'de_novo_sequencing',
    name: '从头测序',
    description: '无需参考基因组的全新测序方法。',
    category: 'genes',
    era: '早期太空',
    reqs: { genetics: 5 },
    grant: ['genetics', 6],
    costs: { Knowledge: 220000 },
    effect: '解锁基因资源显示。',
  },

  // legacy tech.js L4742-4764: dna_sequencer → genetics:7
  {
    id: 'dna_sequencer',
    name: 'DNA 测序仪',
    description: '自动化 DNA 测序设备。',
    category: 'genes',
    era: '深空',
    reqs: { genetics: 6 },
    grant: ['genetics', 7],
    costs: { Knowledge: 300000 },
    effect: '基因序列项目自动推进。',
  },

  // legacy tech.js L4765-4784: rapid_sequencing → genetics:8
  {
    id: 'rapid_sequencing',
    name: '快速测序',
    description: '高通量快速测序技术。',
    category: 'genes',
    era: '星际',
    reqs: { genetics: 7, high_tech: 12 },
    grant: ['genetics', 8],
    costs: { Knowledge: 800000 },
    effect: '基因序列速度大幅提升。',
  },

  // legacy tech.js L9769-9786: genetic_decay → decay:2
  {
    id: 'genetic_decay',
    name: '基因衰变',
    description: '研究基因衰变现象。',
    category: 'genes',
    era: '早期太空',
    reqs: { decay: 1 },
    grant: ['decay', 2],
    costs: { Knowledge: 200000 },
    effect: '减缓基因衰变速度。',
  },

  // legacy tech.js L9787-9806: stabilize_decay → decay:3
  {
    id: 'stabilize_decay',
    name: '稳定衰变',
    description: '使用血石稳定基因衰变。',
    category: 'genes',
    era: '维度',
    reqs: { decay: 2, high_tech: 18 },
    grant: ['decay', 3],
    costs: { Knowledge: 50000000, Blood_Stone: 1 },
    effect: '彻底稳定基因衰变。',
  },

  // ===== 觅食科技 (Foraging) — 仅 forager 种族可用 =====

  // legacy tech.js L819-838: spear → foraging:1
  {
    id: 'spear',
    name: '长矛',
    description: '用于狩猎的长矛武器。',
    category: 'foraging',
    era: '文明',
    reqs: { primitive: 3, storage: 1 },
    condition: (state) => state.race.forager !== undefined,
    grant: ['foraging', 1],
    costs: { Knowledge: 110, Stone: 75 },
    effect: '提升觅食效率。',
  },

  // legacy tech.js L839-859: bronze_spear → foraging:2
  {
    id: 'bronze_spear',
    name: '青铜矛',
    description: '更坚固的青铜矛头。',
    category: 'foraging',
    era: '文明',
    reqs: { foraging: 1, mining: 2 },
    condition: (state) => state.race.forager !== undefined,
    grant: ['foraging', 2],
    costs: { Knowledge: 525, Copper: 50 },
    effect: '进一步提升觅食效率。',
  },

  // legacy tech.js L860-880: iron_spear → foraging:3
  {
    id: 'iron_spear',
    name: '铁矛',
    description: '锻造的铁制矛头。',
    category: 'foraging',
    era: '文明',
    reqs: { foraging: 2, mining: 3 },
    condition: (state) => state.race.forager !== undefined,
    grant: ['foraging', 3],
    costs: { Knowledge: 3300, Iron: 375 },
    effect: '进一步提升觅食效率。',
  },

  // legacy tech.js L881-901: steel_spear → foraging:4
  {
    id: 'steel_spear',
    name: '钢矛',
    description: '优质钢材锻造的矛。',
    category: 'foraging',
    era: '文明',
    reqs: { foraging: 3, smelting: 2 },
    condition: (state) => state.race.forager !== undefined,
    grant: ['foraging', 4],
    costs: { Knowledge: 10500, Iron: 750 },
    effect: '进一步提升觅食效率。',
  },

  // legacy tech.js L902-922: titanium_spear → foraging:5
  {
    id: 'titanium_spear',
    name: '钛合金矛',
    description: '高科技钛合金矛。',
    category: 'foraging',
    era: '文明',
    reqs: { foraging: 4, high_tech: 3 },
    condition: (state) => state.race.forager !== undefined,
    grant: ['foraging', 5],
    costs: { Knowledge: 39500, Titanium: 475 },
    effect: '进一步提升觅食效率。',
  },

  // legacy tech.js L923-943: dowsing_rod → dowsing:1
  {
    id: 'dowsing_rod',
    name: '探测杖',
    description: '用于探测地下资源的分叉木杖。',
    category: 'foraging',
    era: '文明',
    reqs: { foraging: 1, mining: 2 },
    condition: (state) => state.race.forager !== undefined,
    grant: ['dowsing', 1],
    costs: { Knowledge: 450, Lumber: 750 },
    effect: '提升资源探测能力。',
  },

  // legacy tech.js L944-963: metal_detector → dowsing:2
  {
    id: 'metal_detector',
    name: '金属探测器',
    description: '电子金属探测设备。',
    category: 'foraging',
    era: '文明',
    reqs: { dowsing: 1, high_tech: 4 },
    condition: (state) => state.race.forager !== undefined,
    grant: ['dowsing', 2],
    costs: { Knowledge: 65000 },
    effect: '大幅提升资源探测能力。',
  },

  // ===== 运输科技 (Transport) — 仅 gravity_well 种族可用 =====

  // legacy tech.js L139-160: wheel → transport:1
  {
    id: 'wheel',
    name: '轮子',
    description: '发明轮式运输工具。',
    category: 'transport',
    era: '原始',
    reqs: { primitive: 2 },
    condition: (state) => state.race.gravity_well !== undefined,
    grant: ['transport', 1],
    costs: { Lumber: 50, Stone: 25 },
    effect: '解锁运输工人岗位。',
  },

  // legacy tech.js L161-183: wagon → transport:2
  {
    id: 'wagon',
    name: '马车',
    description: '更高效的陆路运输工具。',
    category: 'transport',
    era: '文明',
    reqs: { transport: 1 },
    condition: (state) => state.race.gravity_well !== undefined && ((state.tech['farm'] ?? 0) > 0 || (state.tech['s_lodge'] ?? 0) > 0 || (state.tech['hunting'] ?? 0) >= 2),
    grant: ['transport', 2],
    costs: { Knowledge: 195 },
    effect: '提升运输效率。',
  },

  // legacy tech.js L184-203: steam_engine → transport:3
  {
    id: 'steam_engine_transport',
    name: '蒸汽机',
    description: '蒸汽动力运输工具。',
    category: 'transport',
    era: '发现',
    reqs: { transport: 2, smelting: 3 },
    condition: (state) => state.race.gravity_well !== undefined,
    grant: ['transport', 3],
    costs: { Knowledge: 14345 },
    effect: '大幅提升运输效率。',
  },

  // legacy tech.js L204-223: combustion_engine → transport:4
  {
    id: 'combustion_engine',
    name: '内燃机',
    description: '燃油驱动的内燃机车。',
    category: 'transport',
    era: '工业化',
    reqs: { transport: 3, oil: 3 },
    condition: (state) => state.race.gravity_well !== undefined,
    grant: ['transport', 4],
    costs: { Knowledge: 46777 },
    effect: '进一步提升运输效率。',
  },

  // legacy tech.js L224-243: hover_cart → transport:5
  {
    id: 'hover_cart',
    name: '悬浮车',
    description: '使用埃勒里悬浮技术的运输工具。',
    category: 'transport',
    era: '深空',
    reqs: { transport: 4, elerium: 1 },
    condition: (state) => state.race.gravity_well !== undefined,
    grant: ['transport', 5],
    costs: { Knowledge: 284000 },
    effect: '大幅提升运输效率。',
  },

  // legacy tech.js L244-264: osha → teamster:1
  {
    id: 'osha',
    name: '安全标准',
    description: '制定运输安全操作规范。',
    category: 'transport',
    era: '工业化',
    reqs: { transport: 3, high_tech: 3 },
    condition: (state) => state.race.gravity_well !== undefined,
    grant: ['teamster', 1],
    costs: { Knowledge: 28262 },
    effect: '降低运输工人压力。',
  },

  // legacy tech.js L265-284: blackmarket → teamster:2
  {
    id: 'blackmarket',
    name: '黑市',
    description: '利用运输网络进行地下交易。',
    category: 'transport',
    era: '工业化',
    reqs: { teamster: 1, currency: 5 },
    condition: (state) => state.race.gravity_well !== undefined,
    grant: ['teamster', 2],
    costs: { Knowledge: 40666 },
    effect: '运输工人产生额外金钱收入。',
  },

  // legacy tech.js L285-304: pipelines → teamster:3
  {
    id: 'pipelines',
    name: '管道运输',
    description: '建设油气管道运输网络。',
    category: 'transport',
    era: '全球化',
    reqs: { teamster: 2, high_tech: 6 },
    condition: (state) => state.race.gravity_well !== undefined,
    grant: ['teamster', 3],
    costs: { Knowledge: 95000 },
    effect: '大幅提升运输网络效率。',
  },

  // ===== 间谍科技 (Spies) =====

  // legacy tech.js L3226-3248: spy → spy:1
  {
    id: 'spy',
    name: '间谍',
    description: '建立间谍网络。',
    category: 'spies',
    era: '文明',
    reqs: { govern: 1 },
    grant: ['spy', 1],
    costs: { Knowledge: 1250 },
    effect: '解锁间谍系统，可派遣间谍到其他国家。',
  },

  // legacy tech.js L3249-3275: espionage → spy:2
  {
    id: 'espionage',
    name: '谍报术',
    description: '专业的间谍行动技术。',
    category: 'spies',
    era: '发现',
    reqs: { spy: 1, high_tech: 1 },
    grant: ['spy', 2],
    costs: { Knowledge: 7500 },
    effect: '间谍成功率提升，解锁更多间谍行动选项。',
  },

  // legacy tech.js L3276-3294: spy_training → spy:3
  {
    id: 'spy_training',
    name: '间谍训练',
    description: '系统化的间谍训练课程。',
    category: 'spies',
    era: '发现',
    reqs: { spy: 2, boot_camp: 1 },
    grant: ['spy', 3],
    costs: { Knowledge: 10000 },
    effect: '间谍等级上限提升。',
  },

  // legacy tech.js L3295-3313: spy_gadgets → spy:4
  {
    id: 'spy_gadgets',
    name: '间谍装备',
    description: '先进的间谍工具与装备。',
    category: 'spies',
    era: '发现',
    reqs: { spy: 3, high_tech: 2 },
    grant: ['spy', 4],
    costs: { Knowledge: 15000 },
    effect: '间谍行动效率大幅提升。',
  },

  // legacy tech.js L3314-3332: code_breakers → spy:5
  {
    id: 'code_breakers',
    name: '密码破译',
    description: '破译敌方通讯密码。',
    category: 'spies',
    era: '工业化',
    reqs: { spy: 4, high_tech: 4 },
    grant: ['spy', 5],
    costs: { Knowledge: 55000 },
    effect: '间谍获取情报能力大幅提升。',
  },

  // ===== 堆肥科技 (Compost) — 仅 detritivore 种族可用 =====

  // legacy tech.js L1060-1081: compost → compost:1
  {
    id: 'compost',
    name: '堆肥',
    description: '利用有机废物制作堆肥。',
    category: 'compost',
    era: '文明',
    reqs: { primitive: 3 },
    condition: (state) => state.race.detritivore !== undefined,
    grant: ['compost', 1],
    costs: { Knowledge: 10 },
    effect: '解锁堆肥建筑。',
  },

  // legacy tech.js L1082-1101: hot_compost → compost:2
  {
    id: 'hot_compost',
    name: '高温堆肥',
    description: '使用高温加速堆肥分解。',
    category: 'compost',
    era: '文明',
    reqs: { compost: 1 },
    condition: (state) => state.race.detritivore !== undefined,
    grant: ['compost', 2],
    costs: { Knowledge: 100 },
    effect: '提升堆肥效率。',
  },

  // legacy tech.js L1102-1121: mulching → compost:3
  {
    id: 'mulching',
    name: '覆盖堆肥',
    description: '使用覆盖物改善土壤。',
    category: 'compost',
    era: '文明',
    reqs: { compost: 2, mining: 3 },
    condition: (state) => state.race.detritivore !== undefined,
    grant: ['compost', 3],
    costs: { Knowledge: 3200 },
    effect: '进一步提升堆肥效率。',
  },

  // legacy tech.js L1122-1140: adv_mulching → compost:4
  {
    id: 'adv_mulching',
    name: '高级覆盖堆肥',
    description: '先进的土壤改良技术。',
    category: 'compost',
    era: '发现',
    reqs: { compost: 3, high_tech: 2 },
    condition: (state) => state.race.detritivore !== undefined,
    grant: ['compost', 4],
    costs: { Knowledge: 16000 },
    effect: '大幅提升堆肥效率。',
  },

  // ===== 禁食科技 (Fasting) — 仅 fasting 种族可用 =====

  // legacy tech.js L4526-4548: devilish_dish → dish:1
  {
    id: 'devilish_dish',
    name: '恶魔料理',
    description: '用地狱材料制作的禁忌料理。',
    category: 'fasting',
    era: '维度',
    reqs: { hell_ruins: 4 },
    condition: (state) => state.race.fasting !== undefined,
    grant: ['dish', 1],
    costs: { Knowledge: 29000000 },
    effect: '解锁恶魔料理研究。',
  },

  // legacy tech.js L4549-4569: hell_oven → dish:2
  {
    id: 'hell_oven',
    name: '地狱烤炉',
    description: '在地狱熔岩上建造的烤炉。',
    category: 'fasting',
    era: '维度',
    reqs: { hell_lake: 3, dish: 1 },
    condition: (state) => state.race.fasting !== undefined,
    grant: ['dish', 2],
    costs: { Knowledge: 32000000 },
    effect: '解锁地狱烤炉建筑。',
  },

  // legacy tech.js L4570-4591: preparation_methods → dish:5
  {
    id: 'preparation_methods',
    name: '料理技法',
    description: '高级灵魂料理制作方法。',
    category: 'fasting',
    era: '维度',
    reqs: { science: 21, dish: 4 },
    condition: (state) => state.race.fasting !== undefined,
    grant: ['dish', 5],
    costs: { Knowledge: 62000000 },
    effect: '解锁灵魂浸泡器和生命注入器建筑。',
  },

  // legacy tech.js L4592-4615: final_ingredient → dish_reset:2
  {
    id: 'final_ingredient',
    name: '最终食材',
    description: '完成恶魔料理的最后关键。',
    category: 'fasting',
    era: '维度',
    reqs: { dish_reset: 1 },
    condition: (state) => state.race.fasting !== undefined,
    grant: ['dish_reset', 2],
    costs: { Bolognium: 50000000, Demonic_Essence: 1 },
    effect: '完成恶魔料理，可触发下降转生。',
  },

  // ===== 献祭科技 (Sacrifice) — 仅 cannibalize 种族可用 =====

  // legacy tech.js L7271-7291: ceremonial_dagger → sacrifice:1
  {
    id: 'ceremonial_dagger',
    name: '仪式匕首',
    description: '用于献祭仪式的神圣匕首。',
    category: 'sacrifice',
    era: '文明',
    reqs: { mining: 1 },
    condition: (state) => state.race.cannibalize !== undefined,
    grant: ['sacrifice', 1],
    costs: { Knowledge: 60 },
    effect: '解锁献祭系统。',
  },

  // legacy tech.js L7292-7311: last_rites → sacrifice:2
  {
    id: 'last_rites',
    name: '临终仪式',
    description: '为献祭者举行的神圣仪式。',
    category: 'sacrifice',
    era: '文明',
    reqs: { sacrifice: 1, theology: 2 },
    condition: (state) => state.race.cannibalize !== undefined,
    grant: ['sacrifice', 2],
    costs: { Knowledge: 1000 },
    effect: '献祭效果提升。',
  },

  // legacy tech.js L7312-7331: ancient_infusion → sacrifice:3
  {
    id: 'ancient_infusion',
    name: '古老灌注',
    description: '利用献祭能量进行古老灌注仪式。',
    category: 'sacrifice',
    era: '早期太空',
    reqs: { sacrifice: 2, theology: 4 },
    condition: (state) => state.race.cannibalize !== undefined,
    grant: ['sacrifice', 3],
    costs: { Knowledge: 182000 },
    effect: '献祭效果大幅提升。',
  },

  // ===== 奴隶科技 (Slaves) — 仅 slaver 种族可用 =====

  // legacy tech.js L7221-7245: slave_pens → slaves:1
  {
    id: 'slave_pens',
    name: '奴隶围栏',
    description: '关押奴隶的简陋围栏。',
    category: 'slaves',
    era: '文明',
    reqs: { military: 1, mining: 1 },
    condition: (state) => state.race.slaver !== undefined,
    grant: ['slaves', 1],
    costs: { Knowledge: 150 },
    effect: '解锁奴隶围栏建筑，可俘获奴隶。',
  },

  // legacy tech.js L7246-7269: slave_market → slaves:2
  {
    id: 'slave_market',
    name: '奴隶市场',
    description: '买卖奴隶的交易市场。',
    category: 'slaves',
    era: '发现',
    reqs: { slaves: 1, high_tech: 1 },
    condition: (state) => state.race.slaver !== undefined,
    grant: ['slaves', 2],
    costs: { Knowledge: 8000 },
    effect: '奴隶可通过市场交易获得。',
  },

  // ===== 超自然科技 (Paranormal) — 仅 wish 种族可用 =====

  // legacy tech.js L595-624: minor_wish → wish:1
  {
    id: 'minor_wish',
    name: '小愿望',
    description: '实现一个小的愿望。',
    category: 'paranormal',
    era: '文明',
    reqs: { housing: 1 },
    condition: (state) => state.race.wish !== undefined,
    grant: ['wish', 1],
    costs: { Knowledge: 50 },
    effect: '解锁愿望系统。',
  },

  // legacy tech.js L625-645: major_wish → wish:2
  {
    id: 'major_wish',
    name: '大愿望',
    description: '实现一个更大的愿望。',
    category: 'paranormal',
    era: '文明',
    reqs: { wish: 1, high_tech: 7 },
    condition: (state) => state.race.wish !== undefined,
    grant: ['wish', 2],
    costs: { Knowledge: 110000 },
    effect: '愿望效果提升。',
  },

  // ===== 灵魂科技 (Souls) — 仅 soul_eater 种族可用 =====

  // legacy tech.js L1038-1059: soul_well → soul_eater:1
  {
    id: 'soul_well',
    name: '灵魂之井',
    description: '收集灵魂能量的神秘之井。',
    category: 'souls',
    era: '文明',
    reqs: { primitive: 3 },
    condition: (state) => state.race.soul_eater !== undefined,
    grant: ['soul_eater', 1],
    costs: { Knowledge: 10 },
    effect: '解锁灵魂之井建筑，可收集灵魂。',
  },

  // ===== 回收科技 (Reclaimer) — 仅 evil 种族可用 =====

  // legacy tech.js L6485-6512: reclaimer → reclaimer:1
  {
    id: 'reclaimer',
    name: '回收者',
    description: '从死者身上回收资源的技术。',
    category: 'reclaimer',
    era: '文明',
    reqs: { primitive: 3 },
    condition: (state) => state.race.evil !== undefined,
    grant: ['reclaimer', 1],
    costs: { Knowledge: 45, Lumber: 20, Stone: 20 },
    effect: '解锁回收者岗位和墓地建筑。',
  },

  // legacy tech.js L6513-6537: shovel → reclaimer:2
  {
    id: 'shovel',
    name: '铲子',
    description: '用于挖掘的铲子工具。',
    category: 'reclaimer',
    era: '文明',
    reqs: { reclaimer: 1, mining: 2 },
    condition: (state) => state.race.evil !== undefined && !state.race.living_tool,
    grant: ['reclaimer', 2],
    costs: { Knowledge: 540, Copper: 25 },
    effect: '提升回收效率。',
  },

  // legacy tech.js L6538-6562: iron_shovel → reclaimer:3
  {
    id: 'iron_shovel',
    name: '铁铲',
    description: '更坚固的铁制铲子。',
    category: 'reclaimer',
    era: '文明',
    reqs: { reclaimer: 2, mining: 3 },
    condition: (state) => state.race.evil !== undefined && !state.race.living_tool,
    grant: ['reclaimer', 3],
    costs: { Knowledge: 2700, Iron: 250 },
    effect: '进一步提升回收效率。',
  },

  // legacy tech.js L6563-6587: steel_shovel → reclaimer:4
  {
    id: 'steel_shovel',
    name: '钢铲',
    description: '优质钢材锻造的铲子。',
    category: 'reclaimer',
    era: '发现',
    reqs: { reclaimer: 3, smelting: 2 },
    condition: (state) => state.race.evil !== undefined && !state.race.living_tool,
    grant: ['reclaimer', 4],
    costs: { Knowledge: 9000, Steel: 250 },
    effect: '进一步提升回收效率。',
  },

  // legacy tech.js L6588-6612: titanium_shovel → reclaimer:5
  {
    id: 'titanium_shovel',
    name: '钛铲',
    description: '高科技钛合金铲子。',
    category: 'reclaimer',
    era: '工业化',
    reqs: { reclaimer: 4, high_tech: 3 },
    condition: (state) => state.race.evil !== undefined && !state.race.living_tool,
    grant: ['reclaimer', 5],
    costs: { Knowledge: 38000, Titanium: 350 },
    effect: '进一步提升回收效率。',
  },

  // legacy tech.js L6613-6637: alloy_shovel → reclaimer:6
  {
    id: 'alloy_shovel',
    name: '合金铲',
    description: '高强度合金铲子。',
    category: 'reclaimer',
    era: '全球化',
    reqs: { reclaimer: 5, high_tech: 4 },
    condition: (state) => state.race.evil !== undefined && !state.race.living_tool,
    grant: ['reclaimer', 6],
    costs: { Knowledge: 67500, Alloy: 750 },
    effect: '进一步提升回收效率。',
  },

  // legacy tech.js L6638-6662: mythril_shovel → reclaimer:7
  {
    id: 'mythril_shovel',
    name: '秘银铲',
    description: '魔法秘银锻造的铲子。',
    category: 'reclaimer',
    era: '早期太空',
    reqs: { reclaimer: 6, space: 3 },
    condition: (state) => state.race.evil !== undefined && !state.race.living_tool,
    grant: ['reclaimer', 7],
    costs: { Knowledge: 160000, Mythril: 880 },
    effect: '进一步提升回收效率。',
  },

  // legacy tech.js L6663-6688: adamantite_shovel → reclaimer:8
  {
    id: 'adamantite_shovel',
    name: '精金铲',
    description: '最坚硬的精金铲子。',
    category: 'reclaimer',
    era: '星际',
    reqs: { reclaimer: 7, alpha: 2 },
    condition: (state) => state.race.evil !== undefined && !state.race.living_tool,
    grant: ['reclaimer', 8],
    costs: { Knowledge: 525000, Adamantite: 10000 },
    effect: '大幅提升回收效率。',
  },

  // ===== 恒星引擎科技 (Stellar Engine) =====

  // legacy tech.js L5145-5165: shields → high_tech:14
  {
    id: 'shields',
    name: '护盾',
    description: '能量护盾技术。',
    category: 'stellar_engine',
    era: '星际',
    reqs: { high_tech: 13 },
    grant: ['high_tech', 14],
    costs: { Knowledge: 850000 },
    effect: '解锁中子星和黑洞区域。',
  },

  // legacy tech.js L9955-9974: stellar_engine → blackhole:3
  {
    id: 'stellar_engine',
    name: '恒星引擎',
    description: '利用黑洞能量的巨型引擎。',
    category: 'stellar_engine',
    era: '星际',
    reqs: { blackhole: 2 },
    grant: ['blackhole', 3],
    costs: { Knowledge: 1000000 },
    effect: '解锁恒星引擎建筑。',
  },

  // legacy tech.js L9975-9994: mass_ejector → blackhole:5
  {
    id: 'mass_ejector',
    name: '质量弹射器',
    description: '将物质弹射进黑洞的设备。',
    category: 'stellar_engine',
    era: '星际',
    reqs: { blackhole: 4 },
    grant: ['blackhole', 5],
    costs: { Knowledge: 1100000 },
    effect: '解锁质量弹射器建筑。',
  },

  // legacy tech.js L9995-10016: asteroid_redirect → blackhole:6
  {
    id: 'asteroid_redirect',
    name: '小行星重定向',
    description: '将小行星引导至黑洞的技术。',
    category: 'stellar_engine',
    era: '星系际',
    reqs: { blackhole: 5, gateway: 3 },
    grant: ['blackhole', 6],
    costs: { Knowledge: 3500000 },
    effect: '解锁小行星重定向项目。',
  },

  // legacy tech.js L10017-10037: exotic_infusion → whitehole:2
  {
    id: 'exotic_infusion',
    name: '奇异物质灌注',
    description: '将奇异物质注入黑洞的技术。',
    category: 'stellar_engine',
    era: '星际',
    reqs: { whitehole: 1 },
    grant: ['whitehole', 2],
    costs: { Knowledge: 1500000, Soul_Gem: 10 },
    effect: '准备黑洞转生。',
  },

  // legacy tech.js L10038-10058: infusion_check → whitehole:3
  {
    id: 'infusion_check',
    name: '灌注检查',
    description: '检查奇异物质灌注状态。',
    category: 'stellar_engine',
    era: '星际',
    reqs: { whitehole: 2 },
    grant: ['whitehole', 3],
    costs: { Knowledge: 1500000, Soul_Gem: 10 },
    effect: '确认黑洞转生准备。',
  },

  // legacy tech.js L10059-10102: infusion_confirm → whitehole:4
  {
    id: 'infusion_confirm',
    name: '灌注确认',
    description: '确认执行黑洞转生。',
    category: 'stellar_engine',
    era: '星际',
    reqs: { whitehole: 3 },
    grant: ['whitehole', 4],
    costs: { Knowledge: 1500000, Soul_Gem: 10 },
    effect: '触发黑洞转生（大爆炸）。',
  },

  // legacy tech.js L10103-10133: stabilize_blackhole → stablized:1
  {
    id: 'stabilize_blackhole',
    name: '稳定黑洞',
    description: '使用中子星物质稳定黑洞。',
    category: 'stellar_engine',
    era: '星际',
    reqs: { whitehole: 1 },
    grant: ['stablized', 1],
    costs: { Knowledge: 1500000, Neutronium: 20000 },
    effect: '稳定黑洞，防止其不稳定增长。',
  },

  // ===== AI 核心科技 (AI Core) =====

  // legacy tech.js L5166-5185: ai_core → high_tech:15
  {
    id: 'ai_core',
    name: 'AI 核心',
    description: '人工智能核心处理器。',
    category: 'ai_core',
    era: '星际',
    reqs: { high_tech: 14, science: 15, blackhole: 3 },
    grant: ['high_tech', 15],
    costs: { Knowledge: 1500000 },
    effect: '解锁城堡建筑和 AI 核心技术。',
  },

  // legacy tech.js L5785-5803: cement_processing → ai_core:1
  {
    id: 'cement_processing',
    name: '水泥加工',
    description: 'AI 辅助的水泥加工技术。',
    category: 'ai_core',
    era: '星际',
    reqs: { high_tech: 15 },
    condition: (state) => !state.race.flier && !state.race.warlord,
    grant: ['ai_core', 1],
    costs: { Knowledge: 1750000 },
    effect: '提升水泥生产效率。',
  },

  // legacy tech.js L5804-5823: adamantite_processing_flier → ai_core:2
  {
    id: 'adamantite_processing_flier',
    name: '精金加工（飞行种族）',
    description: '飞行种族的精金加工技术。',
    category: 'ai_core',
    era: '星际',
    reqs: { high_tech: 15 },
    condition: (state) => state.race.flier !== undefined,
    grant: ['ai_core', 2],
    costs: { Knowledge: 2000000 },
    effect: '提升精金生产效率。',
  },

  // legacy tech.js L5824-5843: adamantite_processing → ai_core:2
  {
    id: 'adamantite_processing',
    name: '精金加工',
    description: 'AI 辅助的精金加工技术。',
    category: 'ai_core',
    era: '星际',
    reqs: { ai_core: 1 },
    condition: (state) => !state.race.flier,
    grant: ['ai_core', 2],
    costs: { Knowledge: 2000000 },
    effect: '提升精金生产效率。',
  },

  // legacy tech.js L5844-5862: graphene_processing → ai_core:3
  {
    id: 'graphene_processing',
    name: '石墨烯加工',
    description: 'AI 辅助的石墨烯加工技术。',
    category: 'ai_core',
    era: '星系际',
    reqs: { ai_core: 2 },
    grant: ['ai_core', 3],
    costs: { Knowledge: 2500000 },
    effect: '提升石墨烯生产效率。',
  },

  // legacy tech.js L5863-5883: crypto_mining → ai_core:4
  {
    id: 'crypto_mining',
    name: '加密挖矿',
    description: '使用 AI 核心进行加密货币挖矿。',
    category: 'ai_core',
    era: '存在',
    reqs: { ai_core: 3, banking: 14 },
    grant: ['ai_core', 4],
    costs: { Money: 30000000000, Knowledge: 135000000, Omniscience: 45000 },
    effect: 'AI 核心可产生金钱收入。',
  },

  // ===== 伊甸科技 (Edenic) =====

  // legacy tech.js L14400-14421: asphodel_flowers → asphodel:1
  {
    id: 'asphodel_flowers',
    name: '阿斯福德尔花',
    description: '采集冥界的阿斯福德尔花。',
    category: 'edenic',
    era: '存在',
    reqs: { edenic: 4 },
    grant: ['asphodel', 1],
    costs: { Knowledge: 61000000 },
    effect: '解锁阿斯福德尔收割机和阿斯福德尔粉末资源。',
  },

  // legacy tech.js L14422-14442: ghost_traps → asphodel:2
  {
    id: 'ghost_traps',
    name: '幽灵陷阱',
    description: '捕捉幽灵的神秘装置。',
    category: 'edenic',
    era: '存在',
    reqs: { asphodel: 1 },
    grant: ['asphodel', 2],
    costs: { Knowledge: 61250000, Asphodel_Powder: 2500 },
    effect: '解锁灵质处理器建筑。',
  },

  // legacy tech.js L15065-15086: spirit_syphon → isle:4
  {
    id: 'spirit_syphon',
    name: '灵魂虹吸',
    description: '从灵魂中提取能量的技术。',
    category: 'edenic',
    era: '存在',
    reqs: { high_tech: 19, isle: 3 },
    grant: ['isle', 4],
    costs: { Knowledge: 125000000, Omniscience: 35000 },
    effect: '解锁灵魂真空建筑。',
  },

  // legacy tech.js L15087-15107: spirit_capacitor → isle:5
  {
    id: 'spirit_capacitor',
    name: '灵魂电容器',
    description: '储存灵魂能量的装置。',
    category: 'edenic',
    era: '存在',
    reqs: { isle: 4 },
    grant: ['isle', 5],
    costs: { Knowledge: 128000000, Omniscience: 37500 },
    effect: '解锁灵魂电池建筑。',
  },

  // legacy tech.js L15108-15127: suction_force → isle:6
  {
    id: 'suction_force',
    name: '吸力',
    description: '增强灵魂吸取的力量。',
    category: 'edenic',
    era: '存在',
    reqs: { isle: 5 },
    grant: ['isle', 6],
    costs: { Knowledge: 130000000, Omniscience: 40000 },
    effect: '提升灵魂吸取效率。',
  },

  // legacy tech.js L15128-15148: soul_compactor → isle:7
  {
    id: 'soul_compactor',
    name: '灵魂压缩机',
    description: '将灵魂压缩成实体的装置。',
    category: 'edenic',
    era: '存在',
    reqs: { isle: 6 },
    grant: ['isle', 7],
    costs: { Knowledge: 135000000, Omniscience: 42500 },
    effect: '解锁灵魂压缩机建筑。',
  },

  // legacy tech.js L15149-15169: tomb → palace:3
  {
    id: 'tomb',
    name: '陵墓',
    description: '建造神圣的陵墓。',
    category: 'edenic',
    era: '存在',
    reqs: { palace: 2 },
    grant: ['palace', 3],
    costs: { Knowledge: 140000000, Omniscience: 45000 },
    effect: '解锁陵墓建筑。',
  },

  // legacy tech.js L15170-15190: energy_drain → palace:5
  {
    id: 'energy_drain',
    name: '能量汲取',
    description: '从宫殿中汲取能量。',
    category: 'edenic',
    era: '存在',
    reqs: { palace: 4 },
    grant: ['palace', 5],
    costs: { Knowledge: 145000000, Omniscience: 47500 },
    effect: '解锁导管建筑。',
  },

  // legacy tech.js L15191-15211: divine_infuser → palace:6
  {
    id: 'divine_infuser',
    name: '神圣注入器',
    description: '注入神圣能量的装置。',
    category: 'edenic',
    era: '存在',
    reqs: { palace: 5 },
    grant: ['palace', 6],
    costs: { Knowledge: 150000000, Omniscience: 50000 },
    effect: '解锁注入器建筑。',
  },

  // ===== 远古科技 (Eldritch) — 仅 unfathomable/psychic 种族可用 =====

  // legacy tech.js L530-550: captive_housing → unfathomable:1
  {
    id: 'captive_housing',
    name: '俘虏住房',
    description: '关押俘虏的特殊住所。',
    category: 'eldritch',
    era: '文明',
    reqs: { housing: 1 },
    condition: (state) => state.race.unfathomable !== undefined,
    grant: ['unfathomable', 1],
    costs: { Knowledge: 12 },
    effect: '解锁俘虏住房建筑。',
  },

  // legacy tech.js L551-571: torture → unfathomable:2
  {
    id: 'torture',
    name: '酷刑',
    description: '对俘虏进行酷刑审讯。',
    category: 'eldritch',
    era: '文明',
    reqs: { unfathomable: 1 },
    condition: (state) => state.race.unfathomable !== undefined,
    grant: ['unfathomable', 2],
    costs: { Knowledge: 25 },
    effect: '解锁酷刑师岗位。',
  },

  // legacy tech.js L572-594: thrall_quarters → unfathomable:3
  {
    id: 'thrall_quarters',
    name: '奴仆宿舍',
    description: '为奴仆提供的住所。',
    category: 'eldritch',
    era: '文明',
    reqs: { unfathomable: 2, high_tech: 6 },
    condition: (state) => state.race.unfathomable !== undefined,
    grant: ['unfathomable', 3],
    costs: { Knowledge: 95000, Cement: 50000, Wrought_Iron: 12500 },
    effect: '提升奴仆容量。',
  },

  // legacy tech.js L649-675: psychic_energy → psychic:1
  {
    id: 'psychic_energy',
    name: '心灵能量',
    description: '觉醒心灵能量。',
    category: 'eldritch',
    era: '文明',
    reqs: { housing: 1 },
    condition: (state) => state.race.psychic !== undefined,
    grant: ['psychic', 1],
    costs: { Knowledge: 15 },
    effect: '解锁心灵能量系统。',
  },

  // legacy tech.js L676-700: psychic_attack → psychic:2
  {
    id: 'psychic_attack',
    name: '心灵攻击',
    description: '使用心灵力量进行攻击。',
    category: 'eldritch',
    era: '文明',
    reqs: { psychic: 1, military: 1 },
    condition: (state) => state.race.psychic !== undefined,
    grant: ['psychic', 2],
    costs: { Knowledge: 100 },
    effect: '解锁心灵攻击能力。',
  },

  // legacy tech.js L701-724: psychic_finance → psychic:3
  {
    id: 'psychic_finance',
    name: '心灵金融',
    description: '使用心灵力量影响经济。',
    category: 'eldritch',
    era: '文明',
    reqs: { psychic: 2, high_tech: 4 },
    condition: (state) => state.race.psychic !== undefined,
    grant: ['psychic', 3],
    costs: { Knowledge: 65000 },
    effect: '解锁心灵金融能力。',
  },

  // legacy tech.js L725-753: psychic_channeling → psychic:4
  {
    id: 'psychic_channeling',
    name: '心灵引导',
    description: '引导心灵能量进行更复杂的操作。',
    category: 'eldritch',
    era: '文明',
    reqs: { psychic: 3, science: 12 },
    condition: (state) => state.race.psychic !== undefined,
    grant: ['psychic', 4],
    costs: { Knowledge: 375000 },
    effect: '提升心灵能量效率。',
  },

  // legacy tech.js L753-776: psychic_mastery → psychic:5
  {
    id: 'psychic_mastery',
    name: '心灵精通',
    description: '精通心灵力量的使用。',
    category: 'eldritch',
    era: '文明',
    reqs: { psychic: 4, high_tech: 10 },
    condition: (state) => state.race.psychic !== undefined,
    grant: ['psychic', 5],
    costs: { Knowledge: 500000 },
    effect: '大幅提升心灵能量效率。',
  },

  // legacy tech.js L776-799: psychic_ascension → psychic:6
  {
    id: 'psychic_ascension',
    name: '心灵升华',
    description: '将心灵力量升华到更高层次。',
    category: 'eldritch',
    era: '文明',
    reqs: { psychic: 5, science: 17 },
    condition: (state) => state.race.psychic !== undefined,
    grant: ['psychic', 6],
    costs: { Knowledge: 8000000, Phage: 25 },
    effect: '解锁心灵升华能力。',
  },

  // legacy tech.js L799-820: psychic_potential → psychic:7
  {
    id: 'psychic_potential',
    name: '心灵潜能',
    description: '释放心灵的全部潜能。',
    category: 'eldritch',
    era: '文明',
    reqs: { psychic: 6, ascension: 1 },
    condition: (state) => state.race.psychic !== undefined,
    grant: ['psychic', 7],
    costs: { Knowledge: 10000000 },
    effect: '解锁心灵的最终潜能。',
  },

  // ===== 仙女座科技 (Andromeda) =====

  // legacy tech.js L10590-10609: xeno_linguistics → xeno:2
  {
    id: 'xeno_linguistics',
    name: '异星语言学',
    description: '研究外星文明的语言。',
    category: 'andromeda',
    era: '星系际',
    reqs: { xeno: 1 },
    grant: ['xeno', 2],
    costs: { Knowledge: 3000000 },
    effect: '解锁戈登区域。',
  },

  // legacy tech.js L10634-10657: cultural_exchange → xeno:6
  {
    id: 'cultural_exchange',
    name: '文化交流',
    description: '与外星文明进行文化交流。',
    category: 'andromeda',
    era: '星系际',
    reqs: { xeno: 5 },
    grant: ['xeno', 6],
    costs: { Knowledge: 3550000 },
    effect: '解锁宿舍和研讨会建筑。',
  },

  // legacy tech.js L10677-10699: xeno_gift → xeno:8
  {
    id: 'xeno_gift',
    name: '异星礼物',
    description: '向外星文明赠送礼物。',
    category: 'andromeda',
    era: '星系际',
    reqs: { high_tech: 16, xeno: 7 },
    grant: ['xeno', 8],
    costs: { Knowledge: 6500000, Infernite: 125000 },
    effect: '解锁领事馆建筑和外星区域。',
  },

  // legacy tech.js L10700-10719: industrial_partnership → xeno:10
  {
    id: 'industrial_partnership',
    name: '工业合作',
    description: '与外星文明进行工业合作。',
    category: 'andromeda',
    era: '星系际',
    reqs: { xeno: 9 },
    grant: ['xeno', 10],
    costs: { Knowledge: 7250000 },
    effect: '解锁玻璃合金工厂建筑。',
  },

  // legacy tech.js L10720-10738: embassy_housing → xeno:11
  {
    id: 'embassy_housing',
    name: '大使馆住房',
    description: '在大使馆中建造住房。',
    category: 'andromeda',
    era: '星系际',
    reqs: { xeno: 10, science: 18 },
    grant: ['xeno', 11],
    costs: { Knowledge: 10750000 },
    effect: '提升大使馆住房容量。',
  },

  // legacy tech.js L10761-10780: defense_platform → stargate:6
  {
    id: 'defense_platform',
    name: '防御平台',
    description: '建造星际防御平台。',
    category: 'andromeda',
    era: '星系际',
    reqs: { stargate: 5, piracy: 1 },
    grant: ['stargate', 6],
    costs: { Knowledge: 4850000 },
    effect: '解锁防御平台建筑。',
  },

  // ===== 仙女座舰船科技 (Andromeda Ships) =====

  // legacy tech.js L10781-10800: scout_ship → andromeda:1
  {
    id: 'scout_ship',
    name: '侦察舰',
    description: '用于探索仙女座的侦察舰。',
    category: 'andromeda_ships',
    era: '星系际',
    reqs: { gateway: 3 },
    grant: ['andromeda', 1],
    costs: { Knowledge: 2600000 },
    effect: '解锁侦察舰建筑。',
  },

  // legacy tech.js L10801-10820: corvette_ship → andromeda:2
  {
    id: 'corvette_ship',
    name: '护卫舰',
    description: '用于战斗的护卫舰。',
    category: 'andromeda_ships',
    era: '星系际',
    reqs: { andromeda: 1, xeno: 1 },
    grant: ['andromeda', 2],
    costs: { Knowledge: 3200000 },
    effect: '解锁护卫舰建筑。',
  },

  // legacy tech.js L10821-10841: frigate_ship → andromeda:3
  {
    id: 'frigate_ship',
    name: '驱逐舰',
    description: '更强大的驱逐舰。',
    category: 'andromeda_ships',
    era: '星系际',
    reqs: { andromeda: 2, xeno: 6 },
    grant: ['andromeda', 3],
    costs: { Knowledge: 4000000 },
    effect: '解锁驱逐舰建筑。',
  },

  // legacy tech.js L10842-10864: cruiser_ship → andromeda:4
  {
    id: 'cruiser_ship',
    name: '巡洋舰',
    description: '重型巡洋舰。',
    category: 'andromeda_ships',
    era: '星系际',
    reqs: { andromeda: 3, xeno: 10 },
    grant: ['andromeda', 4],
    costs: { Knowledge: 7500000 },
    effect: '解锁巡洋舰建筑和外星区域。',
  },

  // legacy tech.js L10865-10885: dreadnought → andromeda:5
  {
    id: 'dreadnought',
    name: '无畏舰',
    description: '最强大的无畏舰。',
    category: 'andromeda_ships',
    era: '星系际',
    reqs: { andromeda: 4, science: 18 },
    grant: ['andromeda', 5],
    costs: { Knowledge: 10000000 },
    effect: '解锁无畏舰建筑。',
  },

  // legacy tech.js L10886-10905: ship_dock → gateway:4
  {
    id: 'ship_dock',
    name: '船坞',
    description: '用于维修和补给的船坞。',
    category: 'andromeda_ships',
    era: '星系际',
    reqs: { gateway: 3, xeno: 6 },
    grant: ['gateway', 4],
    costs: { Knowledge: 3900000 },
    effect: '解锁船坞建筑。',
  },

  // ===== 太空军事化科技 (Space Militarization) =====

  // legacy tech.js L11816-11836: operating_base → enceladus:4
  {
    id: 'operating_base',
    name: '作战基地',
    description: '在土卫二建立作战基地。',
    category: 'space_militarization',
    era: '太阳系',
    condition: (state) => state.race.truepath !== undefined,
    reqs: { enceladus: 3, triton: 1 },
    grant: ['enceladus', 4],
    costs: { Knowledge: 1400000 },
    effect: '解锁作战基地建筑。',
  },

  // legacy tech.js L11837-11857: munitions_depot → enceladus:5
  {
    id: 'munitions_depot',
    name: '弹药库',
    description: '储存军事弹药的仓库。',
    category: 'space_militarization',
    era: '太阳系',
    condition: (state) => state.race.truepath !== undefined,
    reqs: { enceladus: 4 },
    grant: ['enceladus', 5],
    costs: { Knowledge: 1500000 },
    effect: '解锁弹药库建筑。',
  },

  // legacy tech.js L11858-11880: fob → triton:2
  {
    id: 'fob',
    name: '前沿作战基地',
    description: '在海卫一建立前沿作战基地。',
    category: 'space_militarization',
    era: '太阳系',
    condition: (state) => state.race.truepath !== undefined,
    reqs: { triton: 1 },
    grant: ['triton', 2],
    costs: { Knowledge: 1450000 },
    effect: '解锁前沿作战基地建筑。',
  },

  // legacy tech.js L12860-12879: shipyard → shipyard:1
  {
    id: 'shipyard',
    name: '船坞',
    description: '建造太空船坞。',
    category: 'space_militarization',
    era: '太阳系',
    condition: (state) => state.race.truepath !== undefined,
    reqs: { outer: 1, syndicate: 1 },
    grant: ['shipyard', 1],
    costs: { Knowledge: 420000 },
    effect: '解锁船坞建筑。',
  },

  // legacy tech.js L12880-12900: ship_lasers → syard_weapon:2
  {
    id: 'ship_lasers',
    name: '舰载激光',
    description: '为舰船安装激光武器。',
    category: 'space_militarization',
    era: '太阳系',
    condition: (state) => state.race.truepath !== undefined,
    reqs: { military: 7, syard_weapon: 1 },
    grant: ['syard_weapon', 2],
    costs: { Knowledge: 425000, Elerium: 500 },
    effect: '提升舰船武器威力。',
  },

  // legacy tech.js L12901-12921: pulse_lasers → syard_weapon:3
  {
    id: 'pulse_lasers',
    name: '脉冲激光',
    description: '更强大的脉冲激光武器。',
    category: 'space_militarization',
    era: '太阳系',
    condition: (state) => state.race.truepath !== undefined,
    reqs: { syard_weapon: 2 },
    grant: ['syard_weapon', 3],
    costs: { Knowledge: 500000, Elerium: 750 },
    effect: '进一步提升舰船武器威力。',
  },

  // legacy tech.js L12922-12942: ship_plasma → syard_weapon:4
  {
    id: 'ship_plasma',
    name: '舰载等离子',
    description: '为舰船安装等离子武器。',
    category: 'space_militarization',
    era: '太阳系',
    condition: (state) => state.race.truepath !== undefined,
    reqs: { high_tech: 13, syard_weapon: 3 },
    grant: ['syard_weapon', 4],
    costs: { Knowledge: 880000, Elerium: 2500 },
    effect: '大幅提升舰船武器威力。',
  },

  // legacy tech.js L12943-12963: ship_phaser → syard_weapon:5
  {
    id: 'ship_phaser',
    name: '舰载相位器',
    description: '为舰船安装相位武器。',
    category: 'space_militarization',
    era: '太阳系',
    condition: (state) => state.race.truepath !== undefined,
    reqs: { syard_weapon: 4, quantium: 1 },
    grant: ['syard_weapon', 5],
    costs: { Knowledge: 1225000, Quantium: 75000 },
    effect: '进一步提升舰船武器威力。',
  },

  // legacy tech.js L12964-12984: ship_disruptor → syard_weapon:6
  {
    id: 'ship_disruptor',
    name: '舰载干扰器',
    description: '为舰船安装干扰武器。',
    category: 'space_militarization',
    era: '太阳系',
    condition: (state) => state.race.truepath !== undefined,
    reqs: { syard_weapon: 5, outer: 4 },
    grant: ['syard_weapon', 6],
    costs: { Knowledge: 2000000, Cipher: 25000 },
    effect: '大幅提升舰船武器威力。',
  },

  // legacy tech.js L12985-13004: destroyer_ship → syard_class:3
  {
    id: 'destroyer_ship',
    name: '驱逐舰',
    description: '建造驱逐舰。',
    category: 'space_militarization',
    era: '太阳系',
    condition: (state) => state.race.truepath !== undefined,
    reqs: { syard_class: 2 },
    grant: ['syard_class', 3],
    costs: { Knowledge: 465000 },
    effect: '解锁驱逐舰建造。',
  },

  // legacy tech.js L13005-13025: cruiser_ship_tp → syard_class:4
  {
    id: 'cruiser_ship_tp',
    name: '巡洋舰',
    description: '建造巡洋舰。',
    category: 'space_militarization',
    era: '太阳系',
    condition: (state) => state.race.truepath !== undefined,
    reqs: { syard_class: 3, titan: 4 },
    grant: ['syard_class', 4],
    costs: { Knowledge: 750000, Adamantite: 50000 },
    effect: '解锁巡洋舰建造。',
  },

  // legacy tech.js L13026-13045: h_cruiser_ship → syard_class:5
  {
    id: 'h_cruiser_ship',
    name: '重巡洋舰',
    description: '建造重巡洋舰。',
    category: 'space_militarization',
    era: '太阳系',
    condition: (state) => state.race.truepath !== undefined,
    reqs: { syard_class: 4, triton: 1 },
    grant: ['syard_class', 5],
    costs: { Knowledge: 1500000 },
    effect: '解锁重巡洋舰建造。',
  },

  // legacy tech.js L13046-13060: dreadnought_ship → syard_class:6
  {
    id: 'dreadnought_ship',
    name: '无畏舰',
    description: '建造无畏舰。',
    category: 'space_militarization',
    era: '太阳系',
    condition: (state) => state.race.truepath !== undefined,
    reqs: { syard_class: 5, kuiper: 1 },
    grant: ['syard_class', 6],
    costs: { Knowledge: 2500000, Cipher: 10000 },
    effect: '解锁无畏舰建造。',
  },

  // ===== 地狱维度科技 (Hell Dimension) =====

  // --- Portal 基础 ---
  { id: 'portal', name: '传送门', description: '打开通往地狱维度的传送门。', category: 'hell_dimension', era: '星际', reqs: { wsc: 1 }, grant: ['portal', 1], costs: { Knowledge: 500000 }, effect: '研究地狱传送门技术。' },
  { id: 'fortifications', name: '要塞化', description: '在地狱入口建造防御要塞。', category: 'hell_dimension', era: '星际', reqs: { portal: 1 }, grant: ['portal', 2], costs: { Knowledge: 550000, Stone: 1000000 }, effect: '解锁地狱门区域和要塞防御系统。' },
  { id: 'war_drones', name: '战争无人机', description: '部署地狱作战无人机。', category: 'hell_dimension', era: '星际', reqs: { portal: 2, graphene: 1 }, grant: ['portal', 3], costs: { Knowledge: 700000 }, effect: '解锁荒地区域和战争无人机。' },
  { id: 'demon_attractor', name: '恶魔吸引器', description: '建造吸引恶魔的装置。', category: 'hell_dimension', era: '星际', reqs: { portal: 3, stanene: 1 }, grant: ['portal', 4], costs: { Knowledge: 745000 }, effect: '解锁恶魔吸引器建筑。' },
  { id: 'combat_droids', name: '战斗机器人', description: '部署地狱战斗机器人。', category: 'hell_dimension', era: '星际', reqs: { portal: 5 }, grant: ['portal', 6], costs: { Knowledge: 762000, Soul_Gem: 1 }, effect: '解锁战斗机器人。' },
  { id: 'repair_droids', name: '维修机器人', description: '部署地狱维修机器人。', category: 'hell_dimension', era: '星际', reqs: { portal: 5 }, grant: ['portal', 6], costs: { Knowledge: 794000, Soul_Gem: 1 }, effect: '解锁维修机器人。' },
  { id: 'advanced_predators', name: '高级掠食者', description: '升级地狱防御系统。', category: 'hell_dimension', era: '星系际', reqs: { portal: 6, xeno: 4 }, grant: ['portal', 7], costs: { Knowledge: 5000000, Bolognium: 500000, Vitreloy: 250000 }, effect: '大幅提升地狱防御能力。' },
  { id: 'enhanced_droids', name: '增强机器人', description: '增强地狱战斗机器人的能力。', category: 'hell_dimension', era: '星际', reqs: { portal: 5, military: 9 }, grant: ['hdroid', 1], costs: { Knowledge: 1050000 }, effect: '提升机器人战斗效能。' },

  // --- 地狱门 (Gate) ---
  { id: 'gate_key', name: '地狱钥匙', description: '获得进入地狱深层的钥匙。', category: 'hell_dimension', era: '维度', reqs: { hell_gate: 1 }, grant: ['hell_gate', 2], costs: { Knowledge: 30000000 }, effect: '解锁地狱门塔楼建筑。' },
  { id: 'gate_turret', name: '地狱门炮塔', description: '在地狱门建造防御炮塔。', category: 'hell_dimension', era: '维度', reqs: { hell_gate: 2 }, grant: ['hell_gate', 3], costs: { Knowledge: 32000000 }, effect: '解锁地狱门炮塔建筑。' },
  { id: 'infernite_mine', name: '地狱火矿', description: '开采地狱火矿石。', category: 'hell_dimension', era: '维度', reqs: { hell_gate: 3 }, grant: ['hell_gate', 4], costs: { Knowledge: 32500000 }, effect: '解锁地狱火矿建筑。' },

  // --- 炮塔 (Turret) ---
  { id: 'laser_turret', name: '激光炮塔', description: '建造激光防御炮塔。', category: 'hell_dimension', era: '星际', reqs: { high_tech: 9, portal: 2 }, grant: ['turret', 1], costs: { Knowledge: 600000, Elerium: 100 }, effect: '解锁激光炮塔。' },
  { id: 'plasma_turret', name: '等离子炮塔', description: '建造等离子防御炮塔。', category: 'hell_dimension', era: '星际', reqs: { high_tech: 13, turret: 1 }, grant: ['turret', 2], costs: { Knowledge: 760000, Elerium: 350 }, effect: '解锁等离子炮塔。' },

  // --- 地狱传感器 ---
  { id: 'sensor_drone', name: '传感器无人机', description: '部署地狱传感器无人机。', category: 'hell_dimension', era: '星际', reqs: { portal: 3, infernite: 1, stanene: 1, graphene: 1 }, grant: ['infernite', 2], costs: { Knowledge: 725000 }, effect: '解锁传感器无人机建筑。' },
  { id: 'map_terrain', name: '地形测绘', description: '测绘地狱地形。', category: 'hell_dimension', era: '星际', reqs: { infernite: 2 }, grant: ['infernite', 3], costs: { Knowledge: 948000 }, effect: '提升传感器精度。' },
  { id: 'calibrated_sensors', name: '校准传感器', description: '校准地狱传感器精度。', category: 'hell_dimension', era: '星际', reqs: { infernite: 3 }, grant: ['infernite', 4], costs: { Knowledge: 1125000, Infernite: 3500 }, effect: '大幅提升传感器精度。' },
  { id: 'shield_generator', name: '护盾发生器', description: '建造地狱护盾发生器。', category: 'hell_dimension', era: '星系际', reqs: { high_tech: 14, gateway: 3, infernite: 4 }, grant: ['infernite', 5], costs: { Knowledge: 2680000, Bolognium: 75000 }, effect: '解锁护盾发生器。' },
  { id: 'enhanced_sensors', name: '增强传感器', description: '使用外星技术增强传感器。', category: 'hell_dimension', era: '星系际', reqs: { infernite: 5, xeno: 4 }, grant: ['infernite', 6], costs: { Knowledge: 4750000, Vitreloy: 25000 }, effect: '大幅增强传感器能力。' },

  // --- 湖泊 (Lake) ---
  { id: 'lake_analysis', name: '湖泊分析', description: '分析地狱湖泊的成分。', category: 'hell_dimension', era: '维度', reqs: { hell_lake: 2 }, grant: ['hell_lake', 3], costs: { Knowledge: 34000000 }, effect: '分析地狱湖水。' },
  { id: 'lake_threat', name: '湖泊威胁', description: '应对地狱湖泊的威胁。', category: 'hell_dimension', era: '维度', reqs: { hell_lake: 3 }, grant: ['hell_lake', 4], costs: { Knowledge: 34500000 }, effect: '解锁双体船建筑。' },
  { id: 'lake_transport', name: '湖泊运输', description: '建立地狱湖泊运输系统。', category: 'hell_dimension', era: '维度', reqs: { hell_lake: 4 }, grant: ['hell_lake', 5], costs: { Knowledge: 35000000 }, effect: '解锁运输船建筑。' },
  { id: 'cooling_tower', name: '冷却塔', description: '建造冷却塔降低湖温。', category: 'hell_dimension', era: '维度', reqs: { hell_lake: 5 }, grant: ['hell_lake', 6], costs: { Knowledge: 37500000 }, effect: '解锁冷却塔建筑。' },
  { id: 'railway_to_hell', name: '地狱铁路', description: '建造通往地狱的铁路。', category: 'hell_dimension', era: '存在', reqs: { asphodel: 4, hell_lake: 6 }, grant: ['hell_lake', 7], costs: { Knowledge: 71250000, Omniscience: 5000, Asphodel_Powder: 15000 }, effect: '提升地狱运输效率。' },

  // --- 尖塔 (Spire) ---
  { id: 'miasma', name: '瘴气', description: '研究地狱瘴气。', category: 'hell_dimension', era: '维度', reqs: { hell_spire: 2 }, grant: ['hell_spire', 3], costs: { Knowledge: 38250000 }, effect: '解锁尖塔港口建筑。' },
  { id: 'blood_pact', name: '血契', description: '签订血之契约。', category: 'hell_dimension', era: '维度', reqs: { high_tech: 18, b_stone: 1 }, grant: ['b_stone', 2], costs: { Knowledge: 52000000, Blood_Stone: 1 }, effect: '解锁血石 ARPA 面板。' },
  { id: 'purify', name: '净化', description: '净化地狱能量。', category: 'hell_dimension', era: '维度', reqs: { hell_spire: 3, b_stone: 2 }, grant: ['b_stone', 3], costs: { Knowledge: 52500000, Blood_Stone: 1 }, effect: '净化地狱污染。' },
  { id: 'waygate', name: '传送门', description: '建造跨维度传送门。', category: 'hell_dimension', era: '维度', reqs: { hell_spire: 10, b_stone: 2 }, grant: ['waygate', 1], costs: { Knowledge: 55000000 }, effect: '解锁传送门建筑。' },
  { id: 'demonic_infusion', name: '恶魔灌注', description: '灌注恶魔精华。', category: 'hell_dimension', era: '维度', reqs: { hell_spire: 10, b_stone: 2, waygate: 3 }, grant: ['waygate', 4], costs: { Knowledge: 55000000, Demonic_Essence: 1 }, effect: '触发下降转生。' },
  { id: 'purify_essence', name: '净化精华', description: '将恶魔精华净化为神圣精华。', category: 'hell_dimension', era: '存在', reqs: { b_stone: 2, waygate: 3, edenic: 1 }, grant: ['edenic', 2], costs: { Knowledge: 60000000, Artifact: 1, Demonic_Essence: 1 }, effect: '将恶魔精华转化为祝福精华。' },
  { id: 'bribe_sphinx', name: '贿赂斯芬克斯', description: '贿赂斯芬克斯获取禁忌知识。', category: 'hell_dimension', era: '维度', reqs: { hell_spire: 8 }, grant: ['sphinx_bribe', 1], costs: { Soul_Gem: 250, Supply: 500000 }, effect: '获取法典资源。' },
  { id: 'dark_bomb', name: '暗物质炸弹', description: '使用暗物质炸弹打开传送门。', category: 'hell_dimension', era: '维度', reqs: { hell_spire: 10, b_stone: 2, waygate: 2, sphinx_bribe: 1 }, grant: ['dl_reset', 1], costs: { Knowledge: 65000000, Soul_Gem: 5000, Blood_Stone: 25, Dark: 1, Supply: 1000000 }, effect: '完成传送门充能，获得恶魔精华。' },
  { id: 'purification', name: '净化术', description: '大范围净化地狱区域。', category: 'hell_dimension', era: '存在', reqs: { asphodel: 4, hell_spire: 10 }, grant: ['hell_spire', 11], costs: { Knowledge: 71250000, Omniscience: 5000, Asphodel_Powder: 17500 }, effect: '净化尖塔区域。' },

  // --- 深坑 (Pit) ---
  { id: 'soul_forge', name: '灵魂熔炉', description: '建造灵魂熔炉。', category: 'hell_dimension', era: '星系际', reqs: { hell_pit: 3 }, grant: ['hell_pit', 4], costs: { Knowledge: 2750000 }, effect: '解锁灵魂熔炉建筑。' },
  { id: 'soul_attractor', name: '灵魂吸引器', description: '建造吸引灵魂的装置。', category: 'hell_dimension', era: '星系际', reqs: { hell_pit: 4, high_tech: 16 }, grant: ['hell_pit', 5], costs: { Knowledge: 5500000 }, effect: '解锁灵魂吸引器建筑。' },
  { id: 'soul_absorption', name: '灵魂吸收', description: '研究灵魂吸收技术。', category: 'hell_dimension', era: '星系际', reqs: { hell_pit: 5 }, grant: ['hell_pit', 6], costs: { Knowledge: 6000000, Infernite: 250000 }, effect: '提升灵魂吸收效率。' },
  { id: 'soul_link', name: '灵魂链接', description: '建立灵魂链接网络。', category: 'hell_dimension', era: '星系际', reqs: { hell_pit: 6 }, grant: ['hell_pit', 7], costs: { Knowledge: 7500000, Vitreloy: 250000 }, effect: '解锁灵魂链接系统。' },
  { id: 'soul_bait', name: '灵魂诱饵', description: '使用阿斯福德尔粉末作为灵魂诱饵。', category: 'hell_dimension', era: '存在', reqs: { hell_pit: 7, asphodel: 3 }, grant: ['hell_pit', 8], costs: { Knowledge: 65000000, Asphodel_Powder: 10000 }, effect: '提升灵魂捕获效率。' },
  { id: 'gun_emplacement', name: '火炮阵地', description: '在地狱建造火炮阵地。', category: 'hell_dimension', era: '星系际', reqs: { hell_pit: 4 }, grant: ['hell_gun', 1], costs: { Knowledge: 3000000 }, effect: '解锁火炮阵地建筑。' },
  { id: 'advanced_emplacement', name: '高级火炮阵地', description: '升级火炮阵地。', category: 'hell_dimension', era: '星系际', reqs: { hell_gun: 1, high_tech: 17 }, grant: ['hell_gun', 2], costs: { Knowledge: 12500000, Orichalcum: 180000 }, effect: '升级火炮威力。' },

  // --- 巫猎人 (Witch Hunter) ---
  { id: 'study_corrupt_gem', name: '研究腐化宝石', description: '研究腐化宝石的性质。', category: 'hell_dimension', era: '星系际', reqs: { high_tech: 16, corrupt: 1 }, condition: (state) => state.race.witch_hunter !== undefined, grant: ['corrupt', 2], costs: { Knowledge: 18500000, Corrupt_Gem: 1 }, effect: '研究腐化宝石。' },
  { id: 'soul_binding', name: '灵魂束缚', description: '研究灵魂束缚技术。', category: 'hell_dimension', era: '星系际', reqs: { corrupt: 2, science: 19 }, condition: (state) => state.race.witch_hunter !== undefined, grant: ['forbidden', 1], costs: { Knowledge: 19000000 }, effect: '解锁灵魂束缚技术。' },
  { id: 'soul_capacitor', name: '灵魂电容器', description: '建造灵魂电容器。', category: 'hell_dimension', era: '星系际', reqs: { forbidden: 1 }, condition: (state) => state.race.witch_hunter !== undefined, grant: ['forbidden', 2], costs: { Knowledge: 19500000 }, effect: '解锁灵魂电容器建筑。' },
  { id: 'absorption_chamber', name: '吸收室', description: '建造灵魂吸收室。', category: 'hell_dimension', era: '星系际', reqs: { forbidden: 2 }, condition: (state) => state.race.witch_hunter !== undefined, grant: ['forbidden', 3], costs: { Knowledge: 20000000 }, effect: '解锁吸收室建筑。' },
  { id: 'corrupt_gem_analysis', name: '腐化宝石分析', description: '分析腐化宝石的成分。', category: 'hell_dimension', era: '维度', reqs: { high_tech: 16, corrupt: 1 }, grant: ['corrupt', 2], costs: { Knowledge: 22000000, Corrupt_Gem: 1 }, effect: '分析腐化宝石。' },
  { id: 'hell_search', name: '地狱搜索', description: '搜索地狱废墟。', category: 'hell_dimension', era: '维度', reqs: { corrupt: 2 }, grant: ['hell_ruins', 1], costs: { Knowledge: 22100000 }, effect: '解锁废墟和地狱门区域。' },

  // --- 柱子 (Pillars) ---
  { id: 'pillars', name: '支柱', description: '建造地狱支柱。', category: 'hell_dimension', era: '维度', reqs: { scarletite: 1, fusable: 1 }, grant: ['pillars', 1], costs: { Knowledge: 30000000 }, effect: '建造地狱支柱。' },

  // ===== 魔法宇宙科技 (Magic) — 仅 magic 宇宙可用 =====

  { id: 'mana', name: '魔力', description: '觉醒魔力能量。', category: 'magic', era: '文明', reqs: { primitive: 3 }, condition: (state) => state.race.universe === 'magic', grant: ['magic', 1], costs: { Knowledge: 25 }, effect: '解锁魔力和水晶资源，以及水晶矿工岗位。' },
  { id: 'ley_lines', name: '灵脉', description: '发现并利用灵脉能量。', category: 'magic', era: '文明', reqs: { magic: 1 }, condition: (state) => state.race.universe === 'magic', grant: ['magic', 2], costs: { Knowledge: 40 }, effect: '解锁尖塔建筑。' },
  { id: 'rituals', name: '仪式', description: '研究魔法仪式。', category: 'magic', era: '文明', reqs: { magic: 2 }, condition: (state) => state.race.universe === 'magic', grant: ['magic', 3], costs: { Mana: 25, Knowledge: 750, Crystal: 50 }, effect: '解锁仪式系统。' },
  { id: 'crafting_ritual', name: '工艺仪式', description: '通过仪式提升锻造效率。', category: 'magic', era: '发现', reqs: { magic: 3, foundry: 5 }, condition: (state) => state.race.universe === 'magic', grant: ['magic', 4], costs: { Mana: 100, Knowledge: 15000, Crystal: 2500 }, effect: '解锁工艺施法槽位。' },
  { id: 'mana_nexus', name: '魔力枢纽', description: '建造魔力枢纽增强魔力流动。', category: 'magic', era: '早期太空', reqs: { magic: 4, space: 3, luna: 1 }, condition: (state) => state.race.universe === 'magic', grant: ['magic', 5], costs: { Mana: 500, Knowledge: 160000, Crystal: 2500 }, effect: '解锁魔力枢纽 ARPA 项目。' },
  { id: 'clerics', name: '牧师', description: '培训牧师使用神圣魔法。', category: 'magic', era: '文明', reqs: { magic: 3 }, condition: (state) => state.race.universe === 'magic', grant: ['cleric', 1], costs: { Mana: 100, Knowledge: 2000, Crystal: 100 }, effect: '解锁牧师相关功能。' },
  { id: 'conjuring', name: '召唤术', description: '学习召唤物品的魔法。', category: 'magic', era: '文明', reqs: { magic: 1 }, condition: (state) => state.race.universe === 'magic', grant: ['conjuring', 1], costs: { Mana: 2, Crystal: 5 }, effect: '解锁物品召唤能力。' },
  { id: 'res_conjuring', name: '资源召唤', description: '召唤资源的高级魔法。', category: 'magic', era: '文明', reqs: { conjuring: 1 }, condition: (state) => state.race.universe === 'magic', grant: ['conjuring', 2], costs: { Mana: 5, Crystal: 10 }, effect: '提升资源召唤效率。' },
  { id: 'alchemy', name: '炼金术', description: '研究炼金术转化物质。', category: 'magic', era: '发现', reqs: { magic: 3, high_tech: 1 }, condition: (state) => state.race.universe === 'magic', grant: ['alchemy', 1], costs: { Mana: 100, Knowledge: 10000, Crystal: 250 }, effect: '解锁炼金术面板，可将资源互相转化。' },
  { id: 'transmutation', name: '嬗变术', description: '高级物质嬗变技术。', category: 'magic', era: '星系际', reqs: { alchemy: 1, high_tech: 16 }, condition: (state) => state.race.universe === 'magic', grant: ['alchemy', 2], costs: { Mana: 1250, Knowledge: 5500000, Crystal: 1000000 }, effect: '解锁高级嬗变配方。' },
  { id: 'veil', name: '魔法帷幕', description: '建造魔法帷幕保护恒星引擎。', category: 'magic', era: '星际', reqs: { blackhole: 2 }, condition: (state) => state.race.universe === 'magic', grant: ['veil', 1], costs: { Knowledge: 1250000 }, effect: '保护恒星引擎免受干扰。' },
  { id: 'mana_syphon', name: '魔力虹吸', description: '从虚空中虹吸魔力。', category: 'magic', era: '星际', reqs: { veil: 1 }, condition: (state) => state.race.universe === 'magic', grant: ['veil', 2], costs: { Knowledge: 1500000 }, effect: '大幅提升魔力获取。' },

  // --- 巫猎人魔法线 ---
  { id: 'secret_society', name: '秘密结社', description: '建立秘密魔法结社。', category: 'magic', era: '文明', reqs: { magic: 1 }, condition: (state) => state.race.universe === 'magic' && state.race.witch_hunter !== undefined, grant: ['roguemagic', 1], costs: { Mana: 10, Knowledge: 45 }, effect: '解锁秘密结社功能。' },
  { id: 'cultists', name: '邪教徒', description: '招募邪教徒。', category: 'magic', era: '文明', reqs: { roguemagic: 1, cleric: 1 }, condition: (state) => state.race.universe === 'magic' && state.race.witch_hunter !== undefined, grant: ['roguemagic', 2], costs: { Mana: 250, Knowledge: 2125 }, effect: '解锁邪教徒功能。' },
  { id: 'conceal_ward', name: '隐蔽结界', description: '建造隐蔽结界隐藏活动。', category: 'magic', era: '发现', reqs: { roguemagic: 2, theatre: 3 }, condition: (state) => state.race.universe === 'magic' && state.race.witch_hunter !== undefined, grant: ['roguemagic', 3], costs: { Mana: 500, Knowledge: 8200, Crystal: 1000 }, effect: '解锁隐蔽结界建筑。' },
  { id: 'subtle_rituals', name: '隐秘仪式', description: '学习隐秘施法技巧。', category: 'magic', era: '发现', reqs: { roguemagic: 3, magic: 4 }, condition: (state) => state.race.universe === 'magic' && state.race.witch_hunter !== undefined, grant: ['roguemagic', 4], costs: { Mana: 100, Knowledge: 15000, Crystal: 2500 }, effect: '降低被发现的风险。' },
  { id: 'pylon_camouflage', name: '尖塔伪装', description: '伪装魔法尖塔。', category: 'magic', era: '工业化', reqs: { roguemagic: 4, high_tech: 3 }, condition: (state) => state.race.universe === 'magic' && state.race.witch_hunter !== undefined, grant: ['roguemagic', 5], costs: { Mana: 1000, Knowledge: 30000, Crystal: 3750 }, effect: '进一步降低被发现的风险。' },
  { id: 'fake_tech', name: '伪科技', description: '将魔法装置伪装成科技产品。', category: 'magic', era: '工业化', reqs: { roguemagic: 5, high_tech: 4 }, condition: (state) => state.race.universe === 'magic' && state.race.witch_hunter !== undefined, grant: ['roguemagic', 6], costs: { Mana: 2250, Knowledge: 60000 }, effect: '将魔法装置完美伪装。' },
  { id: 'concealment', name: '隐匿术', description: '高级隐匿魔法。', category: 'magic', era: '早期太空', reqs: { roguemagic: 6, magic: 5 }, condition: (state) => state.race.universe === 'magic' && state.race.witch_hunter !== undefined, grant: ['roguemagic', 7], costs: { Mana: 3000, Knowledge: 185000 }, effect: '大幅提升隐匿效果。' },
  { id: 'improved_concealment', name: '改良隐匿术', description: '进一步改良隐匿魔法。', category: 'magic', era: '星系际', reqs: { roguemagic: 7, forbidden: 1 }, condition: (state) => state.race.universe === 'magic' && state.race.witch_hunter !== undefined, grant: ['roguemagic', 8], costs: { Knowledge: 20000000 }, effect: '终极隐匿效果。' },
  { id: 'outerplane_summon', name: '异界召唤', description: '召唤异界生物。', category: 'magic', era: '维度', reqs: { roguemagic: 8, forbidden: 4, hell_spire: 10, b_stone: 2, waygate: 3 }, condition: (state) => state.race.universe === 'magic' && state.race.witch_hunter !== undefined, grant: ['forbidden', 5], costs: { Knowledge: 60000000, Demonic_Essence: 1 }, effect: '触发下降转生。' },

  // ===== 邪恶宇宙科技 (Evil) — 仅 evil 宇宙可用 =====

  { id: 'might', name: '力量', description: '邪恶力量的觉醒。', category: 'evil', era: '文明', reqs: { military: 1 }, condition: (state) => state.race.universe === 'evil', grant: ['evil', 1], costs: { Knowledge: 100 }, effect: '解锁邪恶宇宙特殊能力。' },
  { id: 'executions', name: '处决', description: '公开处决以震慑民众。', category: 'evil', era: '工业化', reqs: { evil: 1, high_tech: 3 }, condition: (state) => state.race.universe === 'evil', grant: ['evil', 2], costs: { Knowledge: 35000 }, effect: '通过处决提升统治力。' },
  { id: 'secret_police', name: '秘密警察', description: '建立秘密警察网络。', category: 'evil', era: '全球化', reqs: { evil: 2, high_tech: 6 }, condition: (state) => state.race.universe === 'evil', grant: ['evil', 3], costs: { Knowledge: 112000 }, effect: '解锁秘密警察系统。' },
  { id: 'ai_tracking', name: 'AI 追踪', description: '使用 AI 追踪异见人士。', category: 'evil', era: '深空', reqs: { evil: 3, high_tech: 10 }, condition: (state) => state.race.universe === 'evil', grant: ['evil', 4], costs: { Knowledge: 345000 }, effect: 'AI 辅助追踪和镇压。' },
  { id: 'predictive_arrests', name: '预测性逮捕', description: '在犯罪发生前逮捕嫌疑人。', category: 'evil', era: '星系际', reqs: { evil: 4, high_tech: 16 }, condition: (state) => state.race.universe === 'evil', grant: ['evil', 5], costs: { Knowledge: 5123450 }, effect: '预测性执法系统。' },

  // --- 战争领主线 (Warlord) ---
  { id: 'hellspawn_tunnelers', name: '地狱裔掘地者', description: '训练地狱裔掘地者。', category: 'evil', era: '维度', reqs: { evil: 1, hellspawn: 1 }, condition: (state) => state.race.universe === 'evil' && state.race.warlord !== undefined, grant: ['hellspawn', 2], costs: { Knowledge: 250000 }, effect: '解锁掘地者建筑。' },
  { id: 'hell_minions', name: '地狱仆从', description: '召唤地狱仆从。', category: 'evil', era: '维度', reqs: { hellspawn: 2 }, condition: (state) => state.race.universe === 'evil' && state.race.warlord !== undefined, grant: ['hellspawn', 3], costs: { Knowledge: 500000 }, effect: '解锁仆从建筑。' },
  { id: 'reapers', name: '收割者', description: '训练收割者部队。', category: 'evil', era: '维度', reqs: { hellspawn: 3 }, condition: (state) => state.race.universe === 'evil' && state.race.warlord !== undefined, grant: ['hellspawn', 4], costs: { Knowledge: 1750000 }, effect: '解锁收割者建筑。' },
  { id: 'hellfire', name: '地狱火', description: '掌控地狱之火。', category: 'evil', era: '维度', reqs: { hellspawn: 5 }, condition: (state) => state.race.universe === 'evil' && state.race.warlord !== undefined, grant: ['hellspawn', 6], costs: { Knowledge: 90000000 }, effect: '解锁地狱火能力。' },
  { id: 'corpse_retrieval', name: '尸体回收', description: '从战场上回收尸体。', category: 'evil', era: '维度', reqs: { hellspawn: 6 }, condition: (state) => state.race.universe === 'evil' && state.race.warlord !== undefined, grant: ['hellspawn', 7], costs: { Knowledge: 125000000 }, effect: '解锁尸体堆建筑。' },
  { id: 'spire_bazaar', name: '尖塔集市', description: '在尖塔建立集市。', category: 'evil', era: '维度', reqs: { hellspawn: 7, hell_spire: 10 }, condition: (state) => state.race.universe === 'evil' && state.race.warlord !== undefined, grant: ['hellspawn', 8], costs: { Knowledge: 148000000 }, effect: '解锁尖塔集市建筑。' },
  { id: 'mortuary', name: '太平间', description: '建造太平间处理尸体。', category: 'evil', era: '存在', reqs: { hellspawn: 8, asphodel: 3 }, condition: (state) => state.race.universe === 'evil' && state.race.warlord !== undefined, grant: ['hellspawn', 9], costs: { Knowledge: 175000000, Omniscience: 5000 }, effect: '解锁太平间建筑。' },
  { id: 'ghost_miners', name: '幽灵矿工', description: '训练幽灵矿工。', category: 'evil', era: '维度', reqs: { hellspawn: 2, hell_pit: 5 }, condition: (state) => state.race.universe === 'evil' && state.race.warlord !== undefined, grant: ['pitspawn', 1], costs: { Knowledge: 1900000 }, effect: '解锁暗影矿井建筑。' },
  { id: 'tavern', name: '酒馆', description: '在地狱建造酒馆。', category: 'evil', era: '维度', reqs: { pitspawn: 1 }, condition: (state) => state.race.universe === 'evil' && state.race.warlord !== undefined, grant: ['pitspawn', 2], costs: { Knowledge: 2500000 }, effect: '解锁酒馆建筑。' },
  { id: 'energized_dead', name: '充能亡灵', description: '用阿斯福德尔粉末为亡灵充能。', category: 'evil', era: '存在', reqs: { pitspawn: 2, asphodel: 3 }, condition: (state) => state.race.universe === 'evil' && state.race.warlord !== undefined, grant: ['pitspawn', 3], costs: { Knowledge: 12500000, Asphodel_Powder: 2500 }, effect: '提升暗影矿井效率。' },
  { id: 'corruptor', name: '腐蚀者', description: '建造腐蚀者装置。', category: 'evil', era: '存在', reqs: { asphodel: 10, theology: 2 }, condition: (state) => state.race.universe === 'evil' && state.race.warlord !== undefined, grant: ['asphodel', 11], costs: { Knowledge: 135000000, Omniscience: 19500 }, effect: '解锁腐蚀者建筑。' },
  { id: 'seeping_corruption', name: '渗透腐蚀', description: '让腐蚀渗透到更深层。', category: 'evil', era: '存在', reqs: { elysium: 18, asphodel: 11 }, condition: (state) => state.race.universe === 'evil' && state.race.warlord !== undefined, grant: ['asphodel', 12], costs: { Knowledge: 200000000, Omniscience: 47500, Elysanite: 100000000 }, effect: '提升腐蚀效率。' },
  { id: 'ultimate_corruption', name: '终极腐蚀', description: '释放终极腐蚀力量。', category: 'evil', era: '存在', reqs: { isle: 5, asphodel: 12 }, condition: (state) => state.race.universe === 'evil' && state.race.warlord !== undefined, grant: ['asphodel', 13], costs: { Knowledge: 325000000, Omniscience: 50000, Asphodel_Powder: 900000 }, effect: '终极腐蚀效果。' },

  // ===== 特殊科技 (Special) =====

  { id: 'banquet', name: '宴会', description: '举办盛大宴会。', category: 'special', era: '发现', reqs: { high_tech: 2 }, grant: ['banquet', 1], costs: { Knowledge: 18500 }, effect: '解锁宴会建筑（需要无尽饥饿成就）。' },
  { id: 'matter_replicator', name: '物质复制器', description: '建造物质复制器。', category: 'special', era: '发现', reqs: { high_tech: 2 }, grant: ['replicator', 1], costs: { Knowledge: 25000 }, effect: '解锁物质复制器（需要亚当夏娃成就）。' },
  { id: 'incorporeal', name: '无形体', description: '研究无形体状态。', category: 'special', era: '星系际', reqs: { science: 19 }, grant: ['ascension', 1], costs: { Knowledge: 17500000, Phage: 25 }, effect: '解锁飞升路径。' },
  { id: 'tech_ascension', name: '技术飞升', description: '通过技术实现飞升。', category: 'special', era: '星系际', reqs: { ascension: 1 }, grant: ['ascension', 2], costs: { Knowledge: 18500000, Plasmid: 100 }, effect: '解锁天狼星区域。' },
  { id: 'terraforming', name: '地球化', description: '改造行星环境。', category: 'special', era: '星系际', reqs: { science: 19 }, grant: ['terraforming', 1], costs: { Knowledge: 18000000 }, effect: '解锁地球化项目。' },
  { id: 'mad', name: 'MAD', description: '相互保证毁灭武器系统。', category: 'special', era: '全球化', reqs: { uranium: 1, explosives: 3, high_tech: 7 }, grant: ['mad', 1], costs: { Knowledge: 120000, Oil: 8500, Uranium: 1250 }, effect: '解锁 MAD 转生路径。' },
  { id: 'unification', name: '统一', description: '统一全球政权。', category: 'special', era: '早期太空', reqs: { mars: 2 }, grant: ['unify', 1], costs: { Knowledge: 200000 }, effect: '开始全球统一进程。' },
  { id: 'unification2', name: '统一完成', description: '完成全球统一。', category: 'special', era: '早期太空', reqs: { unify: 1 }, grant: ['unify', 2], costs: { Knowledge: 200000 }, effect: '完成全球统一，解锁联邦政体。' },
  { id: 'unite', name: '联合', description: '联合全球政权（真相之路）。', category: 'special', era: '全球化', reqs: { unify: 1 }, grant: ['unify', 2], costs: { Knowledge: 200000 }, effect: '完成全球统一。' },
  { id: 'genesis', name: '创世纪', description: '创世纪计划。', category: 'special', era: '深空', reqs: { high_tech: 10, genesis: 1 }, grant: ['genesis', 2], costs: { Knowledge: 350000 }, effect: '推进创世纪计划。' },
  { id: 'star_dock', name: '星港', description: '建造星港。', category: 'special', era: '深空', reqs: { genesis: 2, space: 5, high_tech: 10 }, grant: ['genesis', 3], costs: { Knowledge: 380000 }, effect: '解锁星港建筑。' },
  { id: 'genesis_ship', name: '创世飞船', description: '建造创世飞船。', category: 'special', era: '深空', reqs: { genesis: 4 }, grant: ['genesis', 5], costs: { Knowledge: 425000 }, effect: '建造创世飞船进行播种。' },
  { id: 'geck', name: 'GECK', description: '基因工程创造工具包。', category: 'special', era: '深空', reqs: { genesis: 5 }, grant: ['geck', 1], costs: { Knowledge: 500000 }, effect: '解锁 GECK 工具包（需要拉米蒂斯成就）。' },
  { id: 'terraforming_tp', name: '地球化（真相之路）', description: '真相之路地球化改造。', category: 'special', era: '太阳系', reqs: { dig_control: 1, eris: 2, titan_ai_core: 2 }, grant: ['terraforming', 1], costs: { Knowledge: 5000000 }, effect: '解锁地球化改造器。' },
  { id: 'replicator_tp', name: '复制器（真相之路）', description: '真相之路物质复制器。', category: 'special', era: 'Tauceti', reqs: { tau_home: 4, isolation: 1 }, grant: ['replicator', 1], costs: { Knowledge: 6250000 }, effect: '解锁物质复制器。' },
  { id: 'outpost_boost', name: '前哨站升级', description: '升级前哨站效率。', category: 'special', era: 'Tauceti', reqs: { tau_home: 4, isolation: 1 }, grant: ['outpost_boost', 1], costs: { Knowledge: 8900000 }, effect: '提升前哨站效率。' },
  { id: 'garden_of_eden', name: '伊甸园', description: '建造伊甸园设施。', category: 'special', era: 'Tauceti', reqs: { eden: 1 }, grant: ['eden', 2], costs: { Knowledge: 10000000 }, effect: '解锁伊甸园设施建筑。' },

  // ===== 存储科技 (Storage) =====

  // storage 链
  { id: 'storage', name: '存储', description: '建造棚屋存储资源。', category: 'storage', era: '文明', reqs: { primitive: 3, currency: 1 }, grant: ['storage', 1], costs: { Knowledge: 20 }, effect: '解锁棚屋建筑。' },
  { id: 'reinforced_shed', name: '加固棚屋', description: '用铁和水泥加固棚屋。', category: 'storage', era: '文明', reqs: { storage: 1, cement: 1, mining: 3 }, grant: ['storage', 2], costs: { Money: 3750, Knowledge: 2550, Iron: 750, Cement: 500 }, effect: '提升棚屋容量。' },
  { id: 'barns', name: '谷仓', description: '建造大型谷仓。', category: 'storage', era: '发现', reqs: { storage: 2, smelting: 2, alumina: 1 }, grant: ['storage', 3], costs: { Knowledge: 15750, Aluminium: 3000, Steel: 3000 }, effect: '进一步提升存储容量。' },
  { id: 'warehouse', name: '仓库', description: '建造现代仓库。', category: 'storage', era: '工业化', reqs: { storage: 3, high_tech: 3, smelting: 2 }, grant: ['storage', 4], costs: { Knowledge: 40500, Titanium: 3000 }, effect: '大幅提升存储容量。' },
  { id: 'cameras', name: '监控摄像头', description: '安装监控系统提升安全性。', category: 'storage', era: '全球化', reqs: { storage: 4, high_tech: 4 }, grant: ['storage', 5], costs: { Money: 90000, Knowledge: 65000 }, effect: '提升存储安全性。' },
  { id: 'pocket_dimensions', name: '口袋维度', description: '利用粒子物理开辟额外存储空间。', category: 'storage', era: '早期太空', reqs: { particles: 1, storage: 5 }, grant: ['storage', 6], costs: { Knowledge: 108000 }, effect: '大幅提升存储容量。' },
  { id: 'ai_logistics', name: 'AI 物流', description: '使用 AI 优化物流管理。', category: 'storage', era: '星际', reqs: { storage: 6, proxima: 2, science: 13 }, grant: ['storage', 7], costs: { Knowledge: 650000 }, effect: 'AI 优化存储管理。' },

  // container 链
  { id: 'containerization', name: '集装箱化', description: '使用集装箱标准化存储。', category: 'storage', era: '文明', reqs: { cement: 1, mining: 1, storage: 1, science: 1 }, grant: ['container', 1], costs: { Knowledge: 2700 }, effect: '解锁存储场建筑。' },
  { id: 'reinforced_crates', name: '加固箱', description: '制造加固集装箱。', category: 'storage', era: '文明', reqs: { container: 1, smelting: 2 }, grant: ['container', 2], costs: { Knowledge: 6750, Sheet_Metal: 100 }, effect: '提升集装箱容量。' },
  { id: 'cranes', name: '起重机', description: '使用起重机提升装卸效率。', category: 'storage', era: '发现', reqs: { container: 2, high_tech: 2 }, grant: ['container', 3], costs: { Knowledge: 18000, Copper: 1000, Steel: 2500 }, effect: '提升装卸效率。' },
  { id: 'titanium_crates', name: '钛箱', description: '制造钛合金集装箱。', category: 'storage', era: '全球化', reqs: { container: 3, titanium: 1 }, grant: ['container', 4], costs: { Knowledge: 67500, Titanium: 1000 }, effect: '提升集装箱容量。' },
  { id: 'mythril_crates', name: '秘银箱', description: '制造秘银集装箱。', category: 'storage', era: '早期太空', reqs: { container: 4, space: 3 }, grant: ['container', 5], costs: { Knowledge: 145000, Mythril: 350 }, effect: '提升集装箱容量。' },
  { id: 'infernite_crates', name: '地狱火箱', description: '制造地狱火集装箱。', category: 'storage', era: '星际', reqs: { container: 5, infernite: 1 }, grant: ['container', 6], costs: { Knowledge: 575000, Infernite: 1000 }, effect: '提升集装箱容量。' },
  { id: 'graphene_crates', name: '石墨烯箱', description: '制造石墨烯集装箱。', category: 'storage', era: '星际', reqs: { container: 6, graphene: 1 }, grant: ['container', 7], costs: { Knowledge: 725000, Graphene: 75000 }, effect: '提升集装箱容量。' },
  { id: 'bolognium_crates', name: '博洛尼乌姆箱', description: '制造博洛尼乌姆集装箱。', category: 'storage', era: '星系际', reqs: { container: 7, gateway: 3 }, grant: ['container', 8], costs: { Knowledge: 3420000, Bolognium: 90000 }, effect: '提升集装箱容量。' },

  // steel_container 链
  { id: 'steel_containers', name: '钢制集装箱', description: '制造钢制集装箱。', category: 'storage', era: '发现', reqs: { smelting: 2, container: 1 }, grant: ['steel_container', 1], costs: { Knowledge: 9000, Steel: 250 }, effect: '解锁仓库建筑。' },
  { id: 'gantry_crane', name: '龙门吊', description: '建造龙门吊提升效率。', category: 'storage', era: '发现', reqs: { steel_container: 1, high_tech: 2 }, grant: ['steel_container', 2], costs: { Knowledge: 22500, Steel: 5000 }, effect: '提升仓库效率。' },
  { id: 'alloy_containers', name: '合金集装箱', description: '制造合金集装箱。', category: 'storage', era: '工业化', reqs: { steel_container: 2, storage: 4 }, grant: ['steel_container', 3], costs: { Knowledge: 49500, Alloy: 2500 }, effect: '提升集装箱容量。' },
  { id: 'mythril_containers', name: '秘银集装箱', description: '制造秘银集装箱。', category: 'storage', era: '早期太空', reqs: { steel_container: 3, space: 3 }, grant: ['steel_container', 4], costs: { Knowledge: 165000, Mythril: 500 }, effect: '提升集装箱容量。' },
  { id: 'adamantite_containers', name: '精金集装箱', description: '制造精金集装箱。', category: 'storage', era: '星际', reqs: { steel_container: 4, alpha: 2 }, grant: ['steel_container', 5], costs: { Knowledge: 525000, Adamantite: 17500 }, effect: '提升集装箱容量。' },
  { id: 'aerogel_containers', name: '气凝胶集装箱', description: '制造气凝胶集装箱。', category: 'storage', era: '星际', reqs: { steel_container: 5, aerogel: 1 }, grant: ['steel_container', 6], costs: { Knowledge: 775000, Aerogel: 500 }, effect: '提升集装箱容量。' },
  { id: 'bolognium_containers', name: '博洛尼乌姆集装箱', description: '制造博洛尼乌姆集装箱。', category: 'storage', era: '星系际', reqs: { steel_container: 6, gateway: 3 }, grant: ['steel_container', 7], costs: { Knowledge: 3500000, Bolognium: 125000 }, effect: '提升集装箱容量。' },
  { id: 'nanoweave_containers', name: '纳米织物集装箱', description: '制造纳米织物集装箱。', category: 'storage', era: '星系际', reqs: { steel_container: 7, nanoweave: 1 }, grant: ['steel_container', 8], costs: { Knowledge: 9000000, Nanoweave: 50000 }, effect: '提升集装箱容量。' },

  // 油库
  { id: 'oil_depot', name: '油库', description: '建造油库存储石油。', category: 'storage', era: '工业化', reqs: { oil: 1 }, grant: ['oil', 2], costs: { Knowledge: 32000 }, effect: '解锁油库建筑。' },
  { id: 'uranium_storage', name: '铀存储', description: '建造铀存储设施。', category: 'storage', era: '全球化', reqs: { uranium: 1 }, grant: ['uranium', 2], costs: { Knowledge: 75600, Alloy: 2500 }, effect: '提升铀存储容量。' },

  // ===== 电力科技 (Power Generation) =====

  { id: 'oil_well', name: '油井', description: '钻探石油。', category: 'power_generation', era: '工业化', reqs: { high_tech: 3 }, grant: ['oil', 1], costs: { Knowledge: 27000 }, effect: '解锁油井建筑。' },
  { id: 'oil_power', name: '燃油发电', description: '使用石油发电。', category: 'power_generation', era: '工业化', reqs: { oil: 2 }, grant: ['oil', 3], costs: { Knowledge: 44000 }, effect: '解锁燃油发电厂。' },
  { id: 'titanium_drills', name: '钛钻头', description: '使用钛合金钻头提升采油效率。', category: 'power_generation', era: '工业化', reqs: { oil: 3 }, grant: ['oil', 4], costs: { Knowledge: 54000, Titanium: 3500 }, effect: '提升采油效率。' },
  { id: 'alloy_drills', name: '合金钻头', description: '使用合金钻头。', category: 'power_generation', era: '全球化', reqs: { oil: 4 }, grant: ['oil', 5], costs: { Knowledge: 77000, Alloy: 1000 }, effect: '进一步提升采油效率。' },
  { id: 'fracking', name: '水力压裂', description: '使用水力压裂技术采油。', category: 'power_generation', era: '全球化', reqs: { oil: 5, high_tech: 6 }, grant: ['oil', 6], costs: { Knowledge: 132000 }, effect: '大幅提升采油效率。' },
  { id: 'uranium_ash', name: '铀灰', description: '从铀灰中提取能量。', category: 'power_generation', era: '全球化', reqs: { uranium: 2 }, grant: ['uranium', 3], costs: { Knowledge: 122000 }, effect: '提升铀利用效率。' },
  { id: 'breeder_reactor', name: '增殖反应堆', description: '建造增殖反应堆。', category: 'power_generation', era: '早期太空', reqs: { high_tech: 5, uranium: 3, space: 3 }, grant: ['uranium', 4], costs: { Knowledge: 160000, Uranium: 250, Iridium: 1000 }, effect: '大幅提升核电效率。' },

  // ===== 锻造科技 (Crafting) =====

  { id: 'foundry', name: '锻造', description: '建造锻造炉。', category: 'crafting', era: '文明', reqs: { mining: 2, smelting: 1 }, grant: ['foundry', 1], costs: { Knowledge: 450 }, effect: '解锁锻造炉建筑。' },
  { id: 'brick_foundry', name: '砖砌锻造', description: '用砖砌建造更好的锻造炉。', category: 'crafting', era: '文明', reqs: { foundry: 1, cement: 1 }, grant: ['foundry', 2], costs: { Knowledge: 1200, Cement: 200 }, effect: '提升锻造效率。' },
  { id: 'foundry_automation', name: '锻造自动化', description: '自动化锻造流程。', category: 'crafting', era: '发现', reqs: { foundry: 3, high_tech: 2 }, grant: ['foundry', 4], costs: { Knowledge: 18000 }, effect: '大幅提升锻造效率。' },
  { id: 'advanced_foundry', name: '高级锻造', description: '建造高级锻造设施。', category: 'crafting', era: '工业化', reqs: { foundry: 4, high_tech: 3 }, grant: ['foundry', 5], costs: { Knowledge: 40000 }, effect: '进一步提升锻造效率。' },
  { id: 'nanotech_foundry', name: '纳米锻造', description: '使用纳米技术的锻造设施。', category: 'crafting', era: '星际', reqs: { foundry: 5, high_tech: 12 }, grant: ['foundry', 6], costs: { Knowledge: 750000 }, effect: '大幅提升锻造效率。' },
  { id: 'assembly_line', name: '流水线', description: '建立生产流水线。', category: 'crafting', era: '工业化', reqs: { high_tech: 3, mass: 1 }, grant: ['factory', 1], costs: { Knowledge: 38000 }, effect: '解锁工厂建筑。' },
  { id: 'robotic_assembly', name: '机器人装配', description: '使用机器人进行装配。', category: 'crafting', era: '全球化', reqs: { factory: 1, high_tech: 6 }, grant: ['factory', 2], costs: { Knowledge: 95000 }, effect: '提升工厂效率。' },
  { id: 'factory_optimization', name: '工厂优化', description: '优化生产流程。', category: 'crafting', era: '深空', reqs: { factory: 2, high_tech: 10 }, grant: ['factory', 3], costs: { Knowledge: 320000 }, effect: '大幅提升工厂效率。' },

  // ===== 军事科技 (Military) =====

  { id: 'boot_camp', name: '训练营', description: '建造士兵训练营。', category: 'military', era: '文明', reqs: { science: 1, housing: 1 }, grant: ['military', 1], costs: { Knowledge: 350 }, effect: '解锁训练营建筑。' },
  { id: 'barracks', name: '兵营', description: '建造兵营。', category: 'military', era: '文明', reqs: { military: 1 }, grant: ['military', 2], costs: { Knowledge: 500 }, effect: '提升军队容量。' },
  { id: 'medic', name: '医疗兵', description: '培训医疗兵。', category: 'military', era: '发现', reqs: { military: 2, high_tech: 2 }, grant: ['medic', 1], costs: { Knowledge: 15000 }, effect: '降低战斗伤亡。' },
  { id: 'armor', name: '盔甲', description: '制造战斗盔甲。', category: 'military', era: '文明', reqs: { military: 2, smelting: 1 }, grant: ['armor', 1], costs: { Knowledge: 750, Iron: 250 }, effect: '提升军队防御力。' },
  { id: 'iron_armor', name: '铁甲', description: '制造铁制盔甲。', category: 'military', era: '文明', reqs: { armor: 1, mining: 3 }, grant: ['armor', 2], costs: { Knowledge: 3000, Iron: 500 }, effect: '进一步提升防御力。' },
  { id: 'steel_armor', name: '钢甲', description: '制造钢制盔甲。', category: 'military', era: '发现', reqs: { armor: 2, smelting: 3 }, grant: ['armor', 3], costs: { Knowledge: 12000, Steel: 750 }, effect: '大幅提升防御力。' },
  { id: 'titanium_armor', name: '钛甲', description: '制造钛合金盔甲。', category: 'military', era: '工业化', reqs: { armor: 3, high_tech: 3 }, grant: ['armor', 4], costs: { Knowledge: 42000, Titanium: 500 }, effect: '进一步提升防御力。' },
  { id: 'alloy_armor', name: '合金甲', description: '制造合金盔甲。', category: 'military', era: '全球化', reqs: { armor: 4, high_tech: 5 }, grant: ['armor', 5], costs: { Knowledge: 85000, Alloy: 750 }, effect: '大幅提升防御力。' },
  { id: 'bunk_beds', name: '双层床', description: '在兵营安装双层床。', category: 'military', era: '文明', reqs: { military: 2 }, grant: ['morale', 1], costs: { Knowledge: 450, Lumber: 200 }, effect: '提升兵营容量。' },
  { id: 'mercs', name: '雇佣兵', description: '招募雇佣兵。', category: 'military', era: '发现', reqs: { military: 3, currency: 3 }, grant: ['mercs', 1], costs: { Knowledge: 12000 }, effect: '解锁雇佣兵系统。' },
  { id: 'spy_gadgets_mil', name: '军事装备', description: '研发先进军事装备。', category: 'military', era: '全球化', reqs: { military: 5, high_tech: 6 }, grant: ['military', 6], costs: { Knowledge: 110000 }, effect: '提升军队战斗力。' },
  { id: 'laser_rifles', name: '激光步枪', description: '装备激光步枪。', category: 'military', era: '深空', reqs: { military: 7, high_tech: 10 }, grant: ['military', 8], costs: { Knowledge: 350000, Elerium: 250 }, effect: '大幅提升军队战斗力。' },
  { id: 'rail_gun', name: '电磁炮', description: '研发电磁炮武器。', category: 'military', era: '星际', reqs: { military: 8, high_tech: 13 }, grant: ['military', 9], costs: { Knowledge: 800000, Elerium: 500 }, effect: '大幅提升军队火力。' },
  { id: 'xeno_laser', name: '异星激光', description: '使用外星技术的激光武器。', category: 'military', era: '星系际', reqs: { military: 9, xeno: 5 }, grant: ['military', 10], costs: { Knowledge: 5000000 }, effect: '进一步提升军队火力。' },

  // ===== 科学科技 (Science) =====

  { id: 'science', name: '科学', description: '建立科学研究体系。', category: 'science', era: '文明', reqs: { primitive: 3 }, grant: ['science', 1], costs: { Knowledge: 20 }, effect: '解锁科学家岗位。' },
  { id: 'scientific_journal', name: '科学期刊', description: '创办科学期刊。', category: 'science', era: '文明', reqs: { science: 1 }, grant: ['science', 2], costs: { Knowledge: 50 }, effect: '提升知识获取。' },
  { id: 'electricity', name: '电力', description: '发现电力。', category: 'science', era: '发现', reqs: { science: 3, high_tech: 1 }, grant: ['high_tech', 2], costs: { Knowledge: 12000 }, effect: '解锁电力系统。' },
  { id: 'superconductors', name: '超导体', description: '研究超导材料。', category: 'science', era: '全球化', reqs: { high_tech: 5 }, grant: ['high_tech', 6], costs: { Knowledge: 90000 }, effect: '提升电力传输效率。' },
  { id: 'quantum_computing', name: '量子计算', description: '研发量子计算机。', category: 'science', era: '深空', reqs: { high_tech: 8 }, grant: ['high_tech', 9], costs: { Knowledge: 260000 }, effect: '大幅提升计算能力。' },
  { id: 'virtual_reality', name: '虚拟现实', description: '开发虚拟现实技术。', category: 'science', era: '全球化', reqs: { high_tech: 6 }, grant: ['high_tech', 7], costs: { Knowledge: 120000 }, effect: '解锁虚拟现实系统。' },
  { id: 'automation', name: '自动化', description: '研发自动化技术。', category: 'science', era: '全球化', reqs: { high_tech: 5 }, grant: ['mass', 1], costs: { Knowledge: 85000 }, effect: '解锁自动化系统。' },
  { id: 'nano_tubes', name: '纳米管', description: '制造碳纳米管。', category: 'science', era: '深空', reqs: { high_tech: 9 }, grant: ['nano', 1], costs: { Knowledge: 280000 }, effect: '解锁纳米管制造。' },
  { id: 'supercollider', name: '超级对撞机', description: '建造粒子超级对撞机。', category: 'science', era: '深空', reqs: { high_tech: 9 }, grant: ['particles', 1], costs: { Knowledge: 250000 }, effect: '解锁粒子物理研究。' },
  { id: 'grand_unified_theory', name: '大统一理论', description: '研究大统一理论。', category: 'science', era: '星际', reqs: { high_tech: 12 }, grant: ['high_tech', 13], costs: { Knowledge: 800000 }, effect: '推进物理学前沿。' },
  { id: 'theory_of_everything', name: '万有理论', description: '研究万有理论。', category: 'science', era: '星系际', reqs: { high_tech: 15 }, grant: ['high_tech', 16], costs: { Knowledge: 5000000 }, effect: '统一所有物理理论。' },

  // ===== 银行科技 (Banking) =====

  { id: 'currency', name: '货币', description: '建立货币体系。', category: 'banking', era: '文明', reqs: { housing: 1 }, grant: ['currency', 1], costs: { Knowledge: 22, Lumber: 10 }, effect: '解锁货币系统。' },
  { id: 'investing', name: '投资', description: '通过放贷获取利息。', category: 'banking', era: '文明', reqs: { banking: 1 }, grant: ['banking', 2], costs: { Money: 2500, Knowledge: 900 }, effect: '解锁银行家岗位。' },
  { id: 'vault', name: '金库', description: '建造金库。', category: 'banking', era: '文明', reqs: { banking: 2, cement: 1 }, grant: ['banking', 3], costs: { Money: 2000, Knowledge: 3600, Iron: 500, Cement: 750 }, effect: '提升金钱上限。' },
  { id: 'bonds', name: '债券', description: '发行债券。', category: 'banking', era: '文明', reqs: { banking: 3 }, grant: ['banking', 4], costs: { Money: 20000, Knowledge: 5000 }, effect: '推进银行业。' },
  { id: 'steel_vault', name: '钢制金库', description: '建造钢制金库。', category: 'banking', era: '发现', reqs: { banking: 4, smelting: 2 }, grant: ['banking', 5], costs: { Money: 75000, Knowledge: 16000, Steel: 2500 }, effect: '大幅提升金钱上限。' },
  { id: 'stock_market', name: '股票市场', description: '建立股票市场。', category: 'banking', era: '工业化', reqs: { banking: 5, high_tech: 3 }, grant: ['banking', 6], costs: { Money: 250000, Knowledge: 42000 }, effect: '解锁股票交易。' },
  { id: 'tax_rates', name: '税率', description: '启用税率调节。', category: 'banking', era: '文明', reqs: { banking: 2, currency: 2, queue: 1 }, grant: ['currency', 3], costs: { Knowledge: 3375 }, effect: '完善财政体系。' },
  { id: 'large_trades', name: '大宗交易', description: '处理大宗交易。', category: 'banking', era: '文明', reqs: { currency: 3 }, grant: ['currency', 4], costs: { Knowledge: 6750 }, effect: '提升交易上限。' },
  { id: 'tax_mining', name: '矿业税', description: '对矿业征税。', category: 'banking', era: '发现', reqs: { currency: 4, mining: 5 }, grant: ['currency', 5], costs: { Knowledge: 25000 }, effect: '矿业产生额外税收。' },
  { id: 'gambling', name: '赌博', description: '开设赌场。', category: 'banking', era: '全球化', reqs: { banking: 6, high_tech: 6 }, grant: ['gambling', 1], costs: { Knowledge: 110000 }, effect: '解锁赌场建筑。' },
  { id: 'q_level', name: '量子级金库', description: '使用量子技术的金库。', category: 'banking', era: '深空', reqs: { banking: 8, particles: 1 }, grant: ['banking', 9], costs: { Money: 5000000, Knowledge: 300000 }, effect: '大幅提升金钱上限。' },
  { id: 'spiracy', name: '超级对撞机银行', description: '使用超级对撞机的银行系统。', category: 'banking', era: '星际', reqs: { banking: 10, high_tech: 13 }, grant: ['banking', 11], costs: { Money: 50000000, Knowledge: 850000 }, effect: '大幅提升金融能力。' },
  { id: 'virt_trade', name: '虚拟贸易', description: '建立虚拟贸易系统。', category: 'banking', era: '星系际', reqs: { banking: 12, xeno: 6 }, grant: ['banking', 13], costs: { Money: 100000000, Knowledge: 5000000 }, effect: '解锁跨星际贸易。' },
  { id: 'omen_occur', name: '预兆出现', description: '神秘预兆出现。', category: 'banking', era: '存在', reqs: { banking: 14, asphodel: 5 }, grant: ['banking', 15], costs: { Knowledge: 80000000, Omniscience: 12000 }, effect: '解锁高级金融系统。' },

  // ===== 其他缺失科技 =====

  // housing
  { id: 'housing', name: '住房', description: '建造基本住房。', category: 'housing', era: '文明', reqs: { primitive: 3 }, grant: ['housing', 1], costs: { Knowledge: 10, Lumber: 10 }, effect: '解锁棚屋建筑。' },
  { id: 'cottages', name: '村舍', description: '建造村舍。', category: 'housing', era: '文明', reqs: { housing: 1, cement: 1 }, grant: ['housing', 2], costs: { Knowledge: 500, Stone: 200 }, effect: '解锁村舍建筑。' },
  { id: 'apartments', name: '公寓', description: '建造公寓楼。', category: 'housing', era: '工业化', reqs: { housing: 2, high_tech: 3 }, grant: ['housing', 3], costs: { Knowledge: 35000 }, effect: '解锁公寓建筑。' },
  { id: 'smart_housing', name: '智能住房', description: '建造智能家居。', category: 'housing', era: '全球化', reqs: { housing: 3, high_tech: 6 }, grant: ['housing', 4], costs: { Knowledge: 95000 }, effect: '提升住房效率。' },

  // religion
  { id: 'theology', name: '神学', description: '研究神学。', category: 'religion', era: '文明', reqs: { housing: 1 }, grant: ['theology', 1], costs: { Knowledge: 45 }, effect: '解锁神庙建筑。' },
  { id: 'study_theology', name: '神学研究', description: '深入研究神学。', category: 'religion', era: '文明', reqs: { theology: 1 }, grant: ['theology', 2], costs: { Knowledge: 200 }, effect: '提升神庙效果。' },
  { id: 'priests', name: '牧师', description: '培训牧师。', category: 'religion', era: '发现', reqs: { theology: 3 }, grant: ['theology', 4], costs: { Knowledge: 12000 }, effect: '解锁牧师岗位。' },
  { id: 'cult_of_personality', name: '个人崇拜', description: '建立个人崇拜。', category: 'religion', era: '工业化', reqs: { theology: 5, high_tech: 3 }, grant: ['theology', 6], costs: { Knowledge: 35000 }, effect: '提升士气和统治力。' },

  // space_exploration
  { id: 'space', name: '太空', description: '开始太空探索。', category: 'space_exploration', era: '早期太空', reqs: { high_tech: 5, elerium: 1 }, grant: ['space', 3], costs: { Knowledge: 160000 }, effect: '解锁太空区域。' },
  { id: 'luna', name: '月球', description: '探索月球。', category: 'space_exploration', era: '早期太空', reqs: { space: 3 }, grant: ['luna', 1], costs: { Knowledge: 175000 }, effect: '解锁月球区域。' },
  { id: 'mars', name: '火星', description: '探索火星。', category: 'space_exploration', era: '早期太空', reqs: { space: 3, luna: 1 }, grant: ['mars', 1], costs: { Knowledge: 190000 }, effect: '解锁火星区域。' },
  { id: 'hell_planet', name: '地狱行星', description: '探索地狱行星。', category: 'space_exploration', era: '早期太空', reqs: { mars: 1 }, grant: ['hell', 1], costs: { Knowledge: 210000 }, effect: '解锁地狱行星区域。' },
  { id: 'sun', name: '太阳', description: '探索太阳。', category: 'space_exploration', era: '早期太空', reqs: { hell: 1 }, grant: ['sun', 1], costs: { Knowledge: 225000 }, effect: '解锁太阳区域。' },
  { id: 'gas_giant', name: '气态巨行星', description: '探索气态巨行星。', category: 'space_exploration', era: '深空', reqs: { sun: 1 }, grant: ['gas_giant', 1], costs: { Knowledge: 250000 }, effect: '解锁气态巨行星区域。' },
  { id: 'gas_moon', name: '气态巨行星卫星', description: '探索气态巨行星的卫星。', category: 'space_exploration', era: '深空', reqs: { gas_giant: 1 }, grant: ['gas_moon', 1], costs: { Knowledge: 275000 }, effect: '解锁气态巨行星卫星区域。' },
  { id: 'dwarf_planet', name: '矮行星', description: '探索矮行星。', category: 'space_exploration', era: '深空', reqs: { gas_moon: 1 }, grant: ['dwarf', 1], costs: { Knowledge: 300000 }, effect: '解锁矮行星区域。' },

  // entertainment
  { id: 'theatre', name: '剧院', description: '建造剧院。', category: 'entertainment', era: '文明', reqs: { housing: 1, currency: 1, cement: 1 }, grant: ['theatre', 1], costs: { Knowledge: 750 }, effect: '解锁剧院建筑。' },
  { id: 'tourism', name: '旅游业', description: '发展旅游业。', category: 'entertainment', era: '全球化', reqs: { theatre: 2, high_tech: 5 }, grant: ['tourism', 1], costs: { Knowledge: 85000 }, effect: '解锁旅游建筑。' },
  { id: 'vr_tourism', name: 'VR 旅游', description: '虚拟现实旅游。', category: 'entertainment', era: '深空', reqs: { tourism: 1, high_tech: 10 }, grant: ['tourism', 2], costs: { Knowledge: 350000 }, effect: '提升旅游收入。' },

  // agriculture
  { id: 'farm', name: '农场', description: '建造农场。', category: 'agriculture', era: '文明', reqs: { primitive: 3 }, grant: ['farm', 1], costs: { Knowledge: 45 }, effect: '解锁农场建筑。' },
  { id: 'irrigation', name: '灌溉', description: '建设灌溉系统。', category: 'agriculture', era: '文明', reqs: { farm: 1 }, grant: ['farm', 2], costs: { Knowledge: 250 }, effect: '提升农场效率。' },
  { id: 'silos', name: '粮仓', description: '建造粮仓。', category: 'agriculture', era: '文明', reqs: { farm: 2 }, grant: ['farm', 3], costs: { Knowledge: 650 }, effect: '提升粮食存储。' },
  { id: 'mills', name: '磨坊', description: '建造磨坊。', category: 'agriculture', era: '文明', reqs: { farm: 3, smelting: 1 }, grant: ['farm', 4], costs: { Knowledge: 1800 }, effect: '提升粮食加工效率。' },
  { id: 'hydroponics', name: '水培', description: '发展水培技术。', category: 'agriculture', era: '深空', reqs: { farm: 5, high_tech: 9 }, grant: ['farm', 6], costs: { Knowledge: 280000 }, effect: '在太空中种植食物。' },

  // mining
  { id: 'mining', name: '采矿', description: '学习采矿技术。', category: 'mining', era: '文明', reqs: { primitive: 3 }, grant: ['mining', 1], costs: { Knowledge: 15 }, effect: '解锁矿工岗位。' },
  { id: 'copper_sledgehammer', name: '铜锤', description: '制造铜锤。', category: 'mining', era: '文明', reqs: { mining: 1 }, grant: ['mining', 2], costs: { Knowledge: 45, Copper: 25 }, effect: '提升采矿效率。' },
  { id: 'iron_sledgehammer', name: '铁锤', description: '制造铁锤。', category: 'mining', era: '文明', reqs: { mining: 2 }, grant: ['mining', 3], costs: { Knowledge: 350, Iron: 100 }, effect: '进一步提升采矿效率。' },
  { id: 'steel_sledgehammer', name: '钢锤', description: '制造钢锤。', category: 'mining', era: '发现', reqs: { mining: 3, smelting: 2 }, grant: ['mining', 4], costs: { Knowledge: 8000, Steel: 200 }, effect: '大幅提升采矿效率。' },
  { id: 'titanium_sledgehammer', name: '钛锤', description: '制造钛锤。', category: 'mining', era: '工业化', reqs: { mining: 4, high_tech: 3 }, grant: ['mining', 5], costs: { Knowledge: 35000, Titanium: 250 }, effect: '进一步提升采矿效率。' },
  { id: 'alloy_sledgehammer', name: '合金锤', description: '制造合金锤。', category: 'mining', era: '全球化', reqs: { mining: 5, high_tech: 5 }, grant: ['mining', 6], costs: { Knowledge: 80000, Alloy: 500 }, effect: '大幅提升采矿效率。' },
  { id: 'mythril_sledgehammer', name: '秘银锤', description: '制造秘银锤。', category: 'mining', era: '早期太空', reqs: { mining: 6, space: 3 }, grant: ['mining', 7], costs: { Knowledge: 150000, Mythril: 350 }, effect: '进一步提升采矿效率。' },
  { id: 'adamantite_sledgehammer', name: '精金锤', description: '制造精金锤。', category: 'mining', era: '星际', reqs: { mining: 7, alpha: 2 }, grant: ['mining', 8], costs: { Knowledge: 500000, Adamantite: 10000 }, effect: '大幅提升采矿效率。' },
  { id: 'mine_conveyor', name: '矿场传送带', description: '在矿场安装传送带。', category: 'mining', era: '发现', reqs: { high_tech: 2 }, grant: ['mine_conveyor', 1], costs: { Knowledge: 16200, Copper: 2250, Steel: 1750 }, effect: '提升矿场效率。' },

  // cement
  { id: 'cement', name: '水泥', description: '发明水泥。', category: 'cement', era: '文明', reqs: { mining: 1, storage: 1, science: 1 }, grant: ['cement', 1], costs: { Knowledge: 500 }, effect: '解锁水泥厂建筑。' },
  { id: 'rebar', name: '钢筋', description: '在水泥中加入钢筋。', category: 'cement', era: '文明', reqs: { mining: 3, cement: 1 }, grant: ['cement', 2], costs: { Knowledge: 3200 }, effect: '提升水泥强度。' },
  { id: 'cement_batch', name: '批量水泥', description: '批量生产水泥。', category: 'cement', era: '发现', reqs: { cement: 2, high_tech: 2 }, grant: ['cement', 3], costs: { Knowledge: 16000 }, effect: '大幅提升水泥产量。' },
  { id: 'cement_plant', name: '现代水泥厂', description: '建造现代水泥厂。', category: 'cement', era: '工业化', reqs: { cement: 3, high_tech: 4 }, grant: ['cement', 4], costs: { Knowledge: 55000 }, effect: '进一步提升水泥产量。' },
  { id: 'cement_formula', name: '改良配方', description: '改良水泥配方。', category: 'cement', era: '全球化', reqs: { cement: 4, high_tech: 6 }, grant: ['cement', 5], costs: { Knowledge: 100000 }, effect: '大幅提升水泥质量。' },
  { id: 'nano_cement', name: '纳米水泥', description: '使用纳米技术的水泥。', category: 'cement', era: '深空', reqs: { cement: 5, high_tech: 10 }, grant: ['cement', 6], costs: { Knowledge: 350000 }, effect: '顶级水泥质量。' },

  // market
  { id: 'market', name: '市场', description: '建立市场。', category: 'market', era: '文明', reqs: { banking: 1, govern: 1 }, grant: ['currency', 2], costs: { Knowledge: 1800 }, effect: '解锁市场功能。' },
  { id: 'advertising', name: '广告', description: '发展广告业。', category: 'market', era: '工业化', reqs: { currency: 5, high_tech: 3 }, grant: ['currency', 6], costs: { Knowledge: 40000 }, effect: '提升市场效率。' },
  { id: 'e_marketing', name: '电子营销', description: '发展电子营销。', category: 'market', era: '全球化', reqs: { currency: 6, high_tech: 6 }, grant: ['currency', 7], costs: { Knowledge: 100000 }, effect: '大幅提升市场效率。' },

  // stone_gathering
  { id: 'stone_axe', name: '石斧', description: '制造石斧。', category: 'stone_gathering', era: '原始', reqs: { primitive: 1 }, grant: ['stone', 1], costs: { Knowledge: 5 }, effect: '提升采石效率。' },
  { id: 'copper_axes', name: '铜斧', description: '制造铜斧。', category: 'stone_gathering', era: '文明', reqs: { stone: 1, mining: 1 }, grant: ['stone', 2], costs: { Knowledge: 25, Copper: 15 }, effect: '进一步提升采石效率。' },
  { id: 'iron_axes', name: '铁斧', description: '制造铁斧。', category: 'stone_gathering', era: '文明', reqs: { stone: 2, mining: 2 }, grant: ['stone', 3], costs: { Knowledge: 250, Iron: 50 }, effect: '大幅提升采石效率。' },
  { id: 'steel_axes', name: '钢斧', description: '制造钢斧。', category: 'stone_gathering', era: '发现', reqs: { stone: 3, smelting: 2 }, grant: ['stone', 4], costs: { Knowledge: 8000, Steel: 150 }, effect: '进一步提升采石效率。' },
  { id: 'titanium_axes', name: '钛斧', description: '制造钛斧。', category: 'stone_gathering', era: '工业化', reqs: { stone: 4, high_tech: 3 }, grant: ['stone', 5], costs: { Knowledge: 35000, Titanium: 250 }, effect: '大幅提升采石效率。' },

  // lumber_gathering
  { id: 'copper_axes_lumber', name: '铜伐木斧', description: '制造铜伐木斧。', category: 'lumber_gathering', era: '文明', reqs: { lumber: 1, mining: 1 }, grant: ['lumber', 2], costs: { Knowledge: 25, Copper: 15 }, effect: '提升伐木效率。' },
  { id: 'iron_axes_lumber', name: '铁伐木斧', description: '制造铁伐木斧。', category: 'lumber_gathering', era: '文明', reqs: { lumber: 2, mining: 2 }, grant: ['lumber', 3], costs: { Knowledge: 250, Iron: 50 }, effect: '进一步提升伐木效率。' },

  // arpa
  { id: 'arpa', name: 'ARPA', description: '建立高级研究项目局。', category: 'arpa', era: '全球化', reqs: { high_tech: 6 }, grant: ['arpa', 1], costs: { Knowledge: 100000 }, effect: '解锁 ARPA 面板。' },
  { id: 'stock_exchange', name: '证券交易所', description: '建立证券交易所。', category: 'arpa', era: '全球化', reqs: { arpa: 1, banking: 7 }, grant: ['arpa', 2], costs: { Money: 500000, Knowledge: 120000 }, effect: '解锁证券交易所项目。' },

  // queues
  { id: 'urban_planning', name: '城市规划', description: '建立城市规划体系。', category: 'queues', era: '文明', reqs: { banking: 2, currency: 2 }, grant: ['queue', 1], costs: { Knowledge: 2500 }, effect: '解锁建造队列。' },
  { id: 'zoning_permits', name: '分区许可', description: '发放分区许可。', category: 'queues', era: '工业化', reqs: { queue: 1, high_tech: 3 }, grant: ['queue', 2], costs: { Knowledge: 28000 }, effect: '提升队列容量。' },
  { id: 'urbanization', name: '城市化', description: '推进城市化进程。', category: 'queues', era: '全球化', reqs: { queue: 2, high_tech: 6 }, grant: ['queue', 3], costs: { Knowledge: 95000 }, effect: '进一步提升队列容量。' },
  { id: 'assistant', name: '助手', description: '研发研究助手。', category: 'queues', era: '文明', reqs: { queue: 1, science: 4 }, grant: ['r_queue', 1], costs: { Knowledge: 5000 }, effect: '解锁研究队列。' },

  // ===== 宗教补充科技 (Religion Extended) =====

  { id: 'theology2', name: '神学研究', description: '深入研究神学。', category: 'religion', era: '文明', reqs: { theology: 1, housing: 1, cement: 1 }, grant: ['theology', 2], costs: { Knowledge: 900 }, effect: '解锁神庙建筑。' },
  { id: 'fanaticism', name: '狂热信仰', description: '建立狂热信仰体系。', category: 'religion', era: '文明', reqs: { theology: 2 }, grant: ['theology', 3], costs: { Knowledge: 2500 }, effect: '解锁狂热信仰效果。' },
  { id: 'anthropology', name: '人类学', description: '研究种族文化。', category: 'religion', era: '文明', reqs: { theology: 2 }, grant: ['theology', 3], costs: { Knowledge: 2500 }, effect: '解锁人类学研究。' },
  { id: 'mythology', name: '神话学', description: '研究古老神话。', category: 'religion', era: '文明', reqs: { anthropology: 1 }, grant: ['anthropology', 2], costs: { Knowledge: 5000 }, effect: '提升文化理解。' },
  { id: 'indoctrination', name: '教化', description: '进行宗教教化。', category: 'religion', era: '文明', reqs: { fanaticism: 1 }, grant: ['fanaticism', 2], costs: { Knowledge: 5000 }, effect: '提升信仰传播。' },
  { id: 'missionary', name: '传教', description: '派遣传教士。', category: 'religion', era: '发现', reqs: { fanaticism: 2 }, grant: ['fanaticism', 3], costs: { Knowledge: 10000 }, effect: '扩大信仰范围。' },
  { id: 'zealotry', name: '狂热', description: '激发宗教狂热。', category: 'religion', era: '发现', reqs: { fanaticism: 3 }, grant: ['fanaticism', 4], costs: { Knowledge: 25000 }, effect: '大幅提升信仰效果。' },
  { id: 'ancient_theology', name: '古代神学', description: '研究古代神学。', category: 'religion', era: '早期太空', reqs: { theology: 3, mars: 2 }, grant: ['theology', 4], costs: { Knowledge: 180000 }, effect: '解锁金字塔建筑。' },
  { id: 'study', name: '研习', description: '研习古代知识。', category: 'religion', era: '早期太空', reqs: { theology: 4 }, grant: ['theology', 5], costs: { Knowledge: 195000 }, effect: '深入理解古代文明。' },
  { id: 'deify', name: '神化', description: '将古代神灵神化。', category: 'religion', era: '早期太空', reqs: { theology: 4 }, grant: ['theology', 5], costs: { Knowledge: 195000 }, effect: '神化古代神灵。' },
  { id: 'encoding', name: '编码', description: '编码古代知识。', category: 'religion', era: '深空', reqs: { ancient_study: 1, mars: 5 }, grant: ['ancient_study', 2], costs: { Knowledge: 268000 }, effect: '保存古代知识。' },
  { id: 'infusion', name: '灌注', description: '灌注古代力量。', category: 'religion', era: '深空', reqs: { ancient_deify: 1, mars: 5 }, grant: ['ancient_deify', 2], costs: { Knowledge: 268000 }, effect: '获得古代力量。' },

  // ===== 太空探索补充 (Space Exploration Extended) =====

  { id: 'astrophysics', name: '天体物理学', description: '研究天体物理学。', category: 'space_exploration', era: '早期太空', reqs: { space: 2 }, grant: ['space_explore', 1], costs: { Knowledge: 125000 }, effect: '解锁推进剂仓库。' },
  { id: 'rover', name: '探测车', description: '建造行星探测车。', category: 'space_exploration', era: '早期太空', reqs: { space_explore: 1 }, grant: ['space_explore', 2], costs: { Knowledge: 135000, Alloy: 22000, Polymer: 18000, Uranium: 750 }, effect: '解锁月球区域。' },
  { id: 'probes', name: '探测器', description: '发射深空探测器。', category: 'space_exploration', era: '早期太空', reqs: { space_explore: 2 }, grant: ['space_explore', 3], costs: { Knowledge: 168000, Steel: 100000, Iridium: 5000, Uranium: 2250, Helium_3: 3500 }, effect: '解锁火星和地狱行星区域。' },
  { id: 'starcharts', name: '星图', description: '绘制详细星图。', category: 'space_exploration', era: '早期太空', reqs: { space_explore: 3, science: 9 }, grant: ['space_explore', 4], costs: { Knowledge: 185000 }, effect: '解锁气态巨行星和太阳区域。' },
  { id: 'red_tower', name: '红色塔楼', description: '在火星建造通讯塔。', category: 'space_exploration', era: '早期太空', reqs: { mars: 2 }, grant: ['mars', 3], costs: { Knowledge: 195000 }, effect: '提升火星通讯能力。' },
  { id: 'nav_beacon', name: '导航信标', description: '在月球建造导航信标。', category: 'space_exploration', era: '早期太空', reqs: { luna: 1 }, grant: ['luna', 2], costs: { Knowledge: 180000 }, effect: '提升太空导航精度。' },
  { id: 'subspace_signal', name: '亚空间信号', description: '探测亚空间信号。', category: 'space_exploration', era: '星际', reqs: { science: 13, luna: 2, stanene: 1 }, grant: ['luna', 3], costs: { Knowledge: 700000, Stanene: 125000 }, effect: '解锁深层太空探索。' },

  // ===== 太阳能/戴森球科技 (Solar/Dyson) =====

  { id: 'dyson_sphere', name: '戴森球', description: '设计戴森球。', category: 'power_generation', era: '早期太空', reqs: { solar: 1 }, grant: ['solar', 2], costs: { Knowledge: 195000 }, effect: '设计戴森球结构。' },
  { id: 'dyson_swarm', name: '戴森群', description: '建造戴森卫星群。', category: 'power_generation', era: '早期太空', reqs: { solar: 2 }, grant: ['solar', 3], costs: { Knowledge: 210000 }, effect: '解锁戴森卫星建筑。' },
  { id: 'swarm_plant', name: '群卫星工厂', description: '建造戴森卫星工厂。', category: 'power_generation', era: '深空', reqs: { solar: 3, hell: 1, gas_moon: 1 }, grant: ['solar', 4], costs: { Knowledge: 250000 }, effect: '解锁群卫星工厂。' },
  { id: 'swarm_plant_ai', name: '群卫星 AI', description: '使用 AI 控制群卫星。', category: 'power_generation', era: '深空', reqs: { solar: 4, high_tech: 10 }, grant: ['swarm', 1], costs: { Knowledge: 335000 }, effect: 'AI 控制群卫星。' },
  { id: 'swarm_control_ai', name: '群控制 AI', description: '高级群控制 AI。', category: 'power_generation', era: '深空', reqs: { swarm: 1 }, grant: ['swarm', 2], costs: { Knowledge: 360000 }, effect: '提升群卫星效率。' },
  { id: 'quantum_swarm', name: '量子群', description: '量子化的群卫星。', category: 'power_generation', era: '深空', reqs: { swarm: 2, high_tech: 11 }, grant: ['swarm', 3], costs: { Knowledge: 450000 }, effect: '大幅提升群卫星效率。' },
  { id: 'perovskite_cell', name: '钙钛矿电池', description: '使用钙钛矿太阳能电池。', category: 'power_generation', era: '星际', reqs: { swarm: 3 }, grant: ['swarm', 4], costs: { Knowledge: 525000, Titanium: 100000 }, effect: '提升太阳能效率。' },
  { id: 'swarm_convection', name: '群对流', description: '优化群卫星热对流。', category: 'power_generation', era: '星际', reqs: { swarm: 4, stanene: 1 }, grant: ['swarm', 5], costs: { Knowledge: 725000, Stanene: 100000 }, effect: '进一步提升太阳能效率。' },
  { id: 'orichalcum_panels', name: '奥利哈康面板', description: '使用奥利哈康的太阳能面板。', category: 'power_generation', era: '星系际', reqs: { high_tech: 17, swarm: 5 }, grant: ['swarm', 6], costs: { Knowledge: 14000000, Orichalcum: 125000 }, effect: '顶级太阳能效率。' },
  { id: 'dyson_net', name: '戴森网', description: '建造戴森网。', category: 'power_generation', era: '星际', reqs: { solar: 3, proxima: 2, stanene: 1 }, grant: ['proxima', 3], costs: { Knowledge: 800000 }, effect: '解锁戴森网建筑。' },
  { id: 'dyson_sphere2', name: '完整戴森球', description: '建造完整戴森球。', category: 'power_generation', era: '星系际', reqs: { proxima: 3, piracy: 1 }, grant: ['dyson', 1], costs: { Knowledge: 5000000 }, effect: '解锁完整戴森球。' },
  { id: 'orichalcum_sphere', name: '奥利哈康球', description: '用奥利哈康强化戴森球。', category: 'power_generation', era: '星系际', reqs: { dyson: 1, science: 19 }, grant: ['dyson', 2], costs: { Knowledge: 17500000, Orichalcum: 250000 }, effect: '大幅提升戴森球效率。' },
  { id: 'elysanite_sphere', name: '伊利桑奈特球', description: '用伊利桑奈特强化戴森球。', category: 'power_generation', era: '存在', reqs: { high_tech: 19, dyson: 2 }, grant: ['dyson', 3], costs: { Knowledge: 122500000, Omniscience: 36500 }, effect: '终极戴森球效率。' },

  // ===== 氦-3/核聚变科技 =====

  { id: 'atmospheric_mining', name: '大气采矿', description: '从气态巨行星大气中采矿。', category: 'power_generation', era: '早期太空', reqs: { space: 5 }, grant: ['gas_giant', 1], costs: { Knowledge: 190000 }, effect: '解锁气态巨行星采矿。' },
  { id: 'ram_scoops', name: '冲压发动机', description: '建造冲压发动机。', category: 'power_generation', era: '星际', reqs: { nebula: 2 }, grant: ['ram_scoop', 1], costs: { Knowledge: 580000 }, effect: '解锁冲压发动机。' },
  { id: 'fusion_power', name: '核聚变', description: '掌握核聚变技术。', category: 'power_generation', era: '星际', reqs: { ram_scoop: 1 }, grant: ['fusion', 1], costs: { Knowledge: 640000 }, effect: '解锁聚变发电厂。' },

  // ===== 粒子物理/存储补充 =====

  { id: 'matter_compression', name: '物质压缩', description: '使用粒子物理压缩物质。', category: 'storage', era: '早期太空', reqs: { particles: 1 }, grant: ['particles', 2], costs: { Knowledge: 112500 }, effect: '提升存储容量。' },
  { id: 'higgs_boson', name: '希格斯玻色子', description: '研究希格斯玻色子。', category: 'science', era: '早期太空', reqs: { particles: 2, supercollider: 2 }, grant: ['particles', 3], costs: { Knowledge: 125000 }, effect: '推进粒子物理学。' },
  { id: 'dimensional_compression', name: '维度压缩', description: '使用维度压缩技术。', category: 'storage', era: '星际', reqs: { particles: 3, science: 11, supercollider: 3 }, grant: ['particles', 4], costs: { Knowledge: 425000 }, effect: '大幅提升存储容量。' },

  // ===== 考古学/商品化 =====

  { id: 'archaeology', name: '考古学', description: '开展考古研究。', category: 'science', era: '发现', reqs: { anthropology: 2 }, grant: ['anthropology', 3], costs: { Knowledge: 10000 }, effect: '发掘古代遗迹。' },
  { id: 'merchandising', name: '商品化', description: '将文化产品商品化。', category: 'banking', era: '发现', reqs: { anthropology: 3 }, grant: ['anthropology', 4], costs: { Knowledge: 25000 }, effect: '文化产品产生收入。' },

  // ===== GPS/卫星 =====

  { id: 'gps', name: 'GPS', description: '建立全球定位系统。', category: 'market', era: '早期太空', reqs: { space_explore: 1 }, grant: ['satellite', 1], costs: { Knowledge: 150000 }, effect: '解锁 GPS 卫星建筑。' },

  // ===== 太空制造/殖民 =====

  { id: 'colonization', name: '殖民', description: '开始太空殖民。', category: 'agriculture', era: '早期太空', reqs: { space: 4, mars: 1 }, grant: ['mars', 2], costs: { Knowledge: 172000 }, effect: '解锁火星生物群落。' },
  { id: 'space_manufacturing', name: '太空制造', description: '在太空中建立工厂。', category: 'crafting', era: '早期太空', reqs: { mars: 3 }, grant: ['mars', 4], costs: { Knowledge: 220000 }, effect: '解锁火星工厂。' },
  { id: 'exotic_lab', name: '异域实验室', description: '建造异域材料实验室。', category: 'science', era: '深空', reqs: { mars: 4, asteroid: 5 }, grant: ['mars', 5], costs: { Knowledge: 250000 }, effect: '解锁异域实验室。' },
  { id: 'hydroponics_space', name: '太空水培', description: '在太空中建立水培农场。', category: 'agriculture', era: '星系际', reqs: { mars: 5, gateway: 3 }, grant: ['mars', 6], costs: { Knowledge: 3000000, Bolognium: 500000 }, effect: '在太空中种植食物。' },

  // ===== 星际科技补充 =====

  { id: 'graphene', name: '石墨烯', description: '大规模生产石墨烯。', category: 'crafting', era: '星际', reqs: { high_tech: 12, proxima: 2 }, grant: ['graphene', 1], costs: { Knowledge: 650000 }, effect: '解锁石墨烯生产。' },
  { id: 'stanene', name: '斯坦烯', description: '研发斯坦烯材料。', category: 'crafting', era: '星际', reqs: { high_tech: 12, graphene: 1 }, grant: ['stanene', 1], costs: { Knowledge: 700000 }, effect: '解锁斯坦烯生产。' },
  { id: 'plasma', name: '等离子', description: '掌握等离子技术。', category: 'science', era: '星际', reqs: { high_tech: 13 }, grant: ['high_tech', 14], costs: { Knowledge: 850000 }, effect: '解锁等离子应用。' },

  // ===== 星系际科技补充 =====

  { id: 'wormholes', name: '虫洞', description: '研究虫洞技术。', category: 'science', era: '星系际', reqs: { high_tech: 15 }, grant: ['high_tech', 16], costs: { Knowledge: 5000000 }, effect: '解锁虫洞旅行。' },
  { id: 'xeno_culture', name: '异星文化', description: '研究异星文化。', category: 'progress', era: '星系际', reqs: { xeno: 3 }, grant: ['xeno', 4], costs: { Knowledge: 3400000 }, effect: '理解异星文明。' },
  { id: 'stellar_forge', name: '恒星锻造', description: '建造恒星锻造设施。', category: 'crafting', era: '星系际', reqs: { high_tech: 16, xeno: 5 }, grant: ['stellar_forge', 1], costs: { Knowledge: 6000000 }, effect: '解锁恒星锻造。' },

  // ===== 维度科技补充 =====

  { id: 'arcology', name: '生态建筑', description: '建造自给自足的生态建筑。', category: 'housing', era: '维度', reqs: { high_tech: 18 }, grant: ['arcology', 1], costs: { Knowledge: 25000000 }, effect: '解锁生态建筑。' },
  { id: 'cybernetics', name: '控制论', description: '研究人机融合技术。', category: 'science', era: '维度', reqs: { high_tech: 18 }, grant: ['cybernetics', 1], costs: { Knowledge: 28000000 }, effect: '解锁控制论升级。' },
  { id: 'scarletite', name: '猩红石', description: '研究猩红石材料。', category: 'crafting', era: '维度', reqs: { high_tech: 18, hell_gate: 4 }, grant: ['scarletite', 1], costs: { Knowledge: 33000000 }, effect: '解锁猩红石生产。' },

  // ===== 存在时代科技补充 =====

  { id: 'divinity', name: '神性', description: '追求神性。', category: 'religion', era: '存在', reqs: { theology: 5, science: 20 }, grant: ['divinity', 1], costs: { Knowledge: 80000000, Omniscience: 20000 }, effect: '接近神性。' },
  { id: 'reincarnation', name: '轮回', description: '研究轮回转世。', category: 'religion', era: '存在', reqs: { divinity: 1, elysium: 16 }, grant: ['reincarnation', 1], costs: { Knowledge: 130000000, Omniscience: 40000 }, effect: '解锁轮回系统。' },

  // ===== 锻造补充科技 (Crafting Extended) =====

  { id: 'artisans', name: '工匠', description: '培训专业工匠。', category: 'crafting', era: '文明', reqs: { foundry: 1 }, grant: ['foundry', 2], costs: { Knowledge: 1500 }, effect: '提升锻造效率。' },
  { id: 'apprentices', name: '学徒', description: '建立学徒制度。', category: 'crafting', era: '文明', reqs: { foundry: 2 }, grant: ['foundry', 3], costs: { Knowledge: 3200 }, effect: '进一步提升锻造效率。' },
  { id: 'carpentry', name: '木工', description: '发展木工技术。', category: 'crafting', era: '文明', reqs: { foundry: 3, saw: 1 }, grant: ['foundry', 4], costs: { Knowledge: 5200 }, effect: '解锁木制品锻造。' },
  { id: 'master_craftsman', name: '大师工匠', description: '培养大师级工匠。', category: 'crafting', era: '发现', reqs: { foundry: 4 }, grant: ['foundry', 5], costs: { Knowledge: 12000 }, effect: '大幅提升锻造效率。' },
  { id: 'brickworks', name: '砖厂', description: '建造砖厂。', category: 'crafting', era: '发现', reqs: { foundry: 5 }, grant: ['foundry', 6], costs: { Knowledge: 18500 }, effect: '解锁砖制品锻造。' },
  { id: 'machinery', name: '机械', description: '发展机械制造。', category: 'crafting', era: '全球化', reqs: { foundry: 6, high_tech: 4 }, grant: ['foundry', 7], costs: { Knowledge: 66000 }, effect: '大幅提升锻造效率。' },
  { id: 'cnc_machine', name: '数控机床', description: '建造数控机床。', category: 'crafting', era: '全球化', reqs: { foundry: 7, high_tech: 8 }, grant: ['foundry', 8], costs: { Knowledge: 132000 }, effect: '顶级锻造效率。' },
  { id: 'vocational_training', name: '职业培训', description: '建立职业培训体系。', category: 'crafting', era: '工业化', reqs: { foundry: 1, high_tech: 3 }, grant: ['v_train', 1], costs: { Knowledge: 30000 }, effect: '提升工匠技能。' },
  { id: 'stellar_forge', name: '恒星锻造', description: '建造恒星锻造设施。', category: 'crafting', era: '星系际', reqs: { foundry: 8, high_tech: 15, gateway: 3, neutron: 1 }, grant: ['star_forge', 1], costs: { Knowledge: 4500000 }, effect: '解锁恒星锻造建筑。' },
  { id: 'stellar_smelting', name: '恒星冶炼', description: '使用恒星锻造进行冶炼。', category: 'crafting', era: '星系际', reqs: { star_forge: 1, xeno: 4 }, grant: ['star_forge', 2], costs: { Knowledge: 5000000, Vitreloy: 10000 }, effect: '恒星锻造可冶炼金属。' },

  // --- 工厂链 ---
  { id: 'assembly_line', name: '流水线', description: '建立生产流水线。', category: 'crafting', era: '全球化', reqs: { high_tech: 4 }, grant: ['factory', 1], costs: { Knowledge: 72000, Copper: 125000 }, effect: '解锁工厂建筑。' },
  { id: 'automation', name: '自动化', description: '实现工厂自动化。', category: 'crafting', era: '早期太空', reqs: { high_tech: 8, factory: 1 }, grant: ['factory', 2], costs: { Knowledge: 165000 }, effect: '提升工厂效率。' },
  { id: 'laser_cutters', name: '激光切割机', description: '使用激光切割技术。', category: 'crafting', era: '深空', reqs: { high_tech: 9, factory: 2 }, grant: ['factory', 3], costs: { Knowledge: 300000, Elerium: 200 }, effect: '大幅提升工厂效率。' },
  { id: 'high_tech_factories', name: '高科技工厂', description: '建造高科技工厂。', category: 'crafting', era: '星系际', reqs: { high_tech: 17, alpha: 4, factory: 3 }, grant: ['factory', 4], costs: { Knowledge: 13500000, Vitreloy: 500000, Orichalcum: 300000 }, effect: '顶级工厂效率。' },

  // --- 材料科技 ---
  { id: 'thermomechanics', name: '热力学', description: '研究热力学。', category: 'crafting', era: '工业化', reqs: { high_tech: 4 }, grant: ['alloy', 1], costs: { Knowledge: 60000 }, effect: '解锁合金生产。' },
  { id: 'polymer', name: '聚合物', description: '研发聚合物材料。', category: 'crafting', era: '全球化', reqs: { genetics: 1 }, grant: ['polymer', 1], costs: { Knowledge: 80000, Oil: 5000, Alloy: 450 }, effect: '解锁聚合物生产。' },
  { id: 'fluidized_bed_reactor', name: '流化床反应器', description: '建造流化床反应器。', category: 'crafting', era: '全球化', reqs: { polymer: 1, high_tech: 6 }, grant: ['polymer', 2], costs: { Knowledge: 99000 }, effect: '提升聚合物产量。' },
  { id: 'synthetic_fur', name: '合成皮毛', description: '制造合成皮毛。', category: 'crafting', era: '全球化', reqs: { polymer: 1 }, grant: ['synthetic_fur', 1], costs: { Knowledge: 100000, Polymer: 2500 }, effect: '解锁合成皮毛生产。' },
  { id: 'nanoweave', name: '纳米织物', description: '制造纳米织物。', category: 'crafting', era: '星系际', reqs: { science: 18 }, grant: ['nanoweave', 1], costs: { Knowledge: 8500000, Nano_Tube: 5000000, Vitreloy: 250000 }, effect: '解锁纳米织物生产。' },
  { id: 'stanene', name: '斯坦烯', description: '研发斯坦烯材料。', category: 'crafting', era: '星际', reqs: { infernite: 1 }, grant: ['stanene', 1], costs: { Knowledge: 590000, Aluminium: 500000, Infernite: 1000 }, effect: '解锁斯坦烯生产。' },
  { id: 'nano_tubes', name: '纳米管', description: '制造碳纳米管。', category: 'crafting', era: '深空', reqs: { high_tech: 10 }, grant: ['nano', 1], costs: { Knowledge: 375000, Coal: 100000, Neutronium: 1000 }, effect: '解锁纳米管生产。' },
  { id: 'scarletite_craft', name: '猩红石', description: '制造猩红石材料。', category: 'crafting', era: '维度', reqs: { hell_ruins: 4 }, grant: ['scarletite', 1], costs: { Knowledge: 26750000, Iron: 100000000, Adamantite: 15000000, Orichalcum: 8000000 }, effect: '解锁猩红石生产。' },
  { id: 'quantum_manufacturing', name: '量子制造', description: '使用量子技术制造。', category: 'crafting', era: '深空', reqs: { high_tech: 11 }, grant: ['q_factory', 1], costs: { Knowledge: 465000 }, effect: '解锁量子制造。' },

  // ===== 军事补充科技 (Military Extended) =====

  { id: 'garrison', name: '驻军', description: '建立驻军系统。', category: 'military', era: '文明', reqs: { science: 1, housing: 1 }, grant: ['military', 1], costs: { Knowledge: 350 }, effect: '解锁驻军建筑。' },
  { id: 'bunk_beds', name: '双层床', description: '在兵营安装双层床。', category: 'military', era: '文明', reqs: { military: 2 }, grant: ['morale', 1], costs: { Knowledge: 450, Lumber: 200 }, effect: '提升兵营容量。' },
  { id: 'mercs', name: '雇佣兵', description: '招募雇佣兵。', category: 'military', era: '发现', reqs: { military: 3, currency: 3 }, grant: ['mercs', 1], costs: { Knowledge: 12000 }, effect: '解锁雇佣兵系统。' },
  { id: 'machine_gun', name: '机枪', description: '研发机枪武器。', category: 'military', era: '工业化', reqs: { military: 4, high_tech: 3 }, grant: ['military', 5], costs: { Knowledge: 38000 }, effect: '大幅提升军队火力。' },
  { id: 'kevlar', name: '凯夫拉', description: '研发凯夫拉防弹衣。', category: 'military', era: '全球化', reqs: { military: 5, high_tech: 5 }, grant: ['armor', 6], costs: { Knowledge: 85000, Polymer: 5000 }, effect: '大幅提升军队防御力。' },
  { id: 'rail_guns_mil', name: '电磁炮', description: '研发电磁炮武器。', category: 'military', era: '星际', reqs: { military: 8, high_tech: 13 }, grant: ['military', 9], costs: { Knowledge: 800000, Elerium: 500 }, effect: '大幅提升军队火力。' },
  { id: 'disruptor_rifles', name: '干扰步枪', description: '装备干扰步枪。', category: 'military', era: '星系际', reqs: { military: 9, xeno: 5 }, grant: ['military', 10], costs: { Knowledge: 5000000 }, effect: '进一步提升军队火力。' },
  { id: 'plasma_rifles', name: '等离子步枪', description: '装备等离子步枪。', category: 'military', era: '星系际', reqs: { military: 10, high_tech: 16 }, grant: ['military', 11], costs: { Knowledge: 6000000, Vitreloy: 100000 }, effect: '大幅提升军队火力。' },
  { id: 'gauss_rifles', name: '高斯步枪', description: '装备高斯步枪。', category: 'military', era: '维度', reqs: { military: 11, high_tech: 18 }, grant: ['military', 12], costs: { Knowledge: 25000000, Orichalcum: 200000 }, effect: '顶级军队火力。' },
  { id: 'nanoweave_vest', name: '纳米织物背心', description: '制造纳米织物防弹背心。', category: 'military', era: '星系际', reqs: { armor: 5, nanoweave: 1 }, grant: ['armor', 7], costs: { Knowledge: 9000000, Nanoweave: 50000 }, effect: '顶级军队防御力。' },

  // ===== 娱乐补充科技 (Entertainment Extended) =====

  { id: 'playwright', name: '剧作家', description: '培养剧作家。', category: 'entertainment', era: '文明', reqs: { theatre: 1, science: 2 }, grant: ['theatre', 2], costs: { Knowledge: 1080 }, effect: '提升剧院效果。' },
  { id: 'magic_ent', name: '魔术', description: '发展魔术表演。', category: 'entertainment', era: '发现', reqs: { theatre: 2 }, grant: ['theatre', 3], costs: { Knowledge: 15000 }, effect: '进一步提升剧院效果。' },
  { id: 'radio', name: '广播', description: '建立广播系统。', category: 'entertainment', era: '工业化', reqs: { theatre: 3, high_tech: 3 }, grant: ['broadcast', 1], costs: { Knowledge: 35000 }, effect: '解锁广播站。' },
  { id: 'tv', name: '电视', description: '发展电视技术。', category: 'entertainment', era: '全球化', reqs: { broadcast: 1, high_tech: 5 }, grant: ['broadcast', 2], costs: { Knowledge: 85000 }, effect: '解锁电视台。' },
  { id: 'superstars', name: '超级明星', description: '培养超级明星。', category: 'entertainment', era: '全球化', reqs: { broadcast: 2 }, grant: ['broadcast', 3], costs: { Knowledge: 120000 }, effect: '大幅提升娱乐效果。' },
  { id: 'zoo', name: '动物园', description: '建造动物园。', category: 'entertainment', era: '星系际', reqs: { gateway: 3, xeno: 6 }, grant: ['zoo', 1], costs: { Knowledge: 4500000, Bolognium: 500000 }, effect: '解锁动物园建筑。' },

  // ===== 住房补充科技 (Housing Extended) =====

  { id: 'cottages', name: '村舍', description: '建造村舍。', category: 'housing', era: '文明', reqs: { housing: 1, cement: 1 }, grant: ['housing', 2], costs: { Knowledge: 500, Stone: 200 }, effect: '解锁村舍建筑。' },
  { id: 'apartment', name: '公寓', description: '建造公寓楼。', category: 'housing', era: '工业化', reqs: { housing: 2, high_tech: 3 }, grant: ['housing', 3], costs: { Knowledge: 35000 }, effect: '解锁公寓建筑。' },
  { id: 'smart_housing', name: '智能住房', description: '建造智能家居。', category: 'housing', era: '全球化', reqs: { housing: 3, high_tech: 6 }, grant: ['housing', 4], costs: { Knowledge: 95000 }, effect: '提升住房效率。' },
  { id: 'mythril_beams', name: '秘银梁', description: '使用秘银加固建筑。', category: 'housing', era: '早期太空', reqs: { housing: 4, space: 3 }, grant: ['housing', 5], costs: { Knowledge: 160000, Mythril: 500 }, effect: '提升住房容量。' },
  { id: 'neutronium_housing', name: '中子星住房', description: '使用中子星材料建造住房。', category: 'housing', era: '星际', reqs: { housing: 5, neutron: 1 }, grant: ['housing', 6], costs: { Knowledge: 600000, Neutronium: 5000 }, effect: '大幅提升住房容量。' },
  { id: 'arcology', name: '生态建筑', description: '建造自给自足的生态建筑。', category: 'housing', era: '维度', reqs: { high_tech: 18 }, grant: ['arcology', 1], costs: { Knowledge: 25000000 }, effect: '解锁生态建筑。' },
  { id: 'luxury_condo', name: '豪华公寓', description: '建造豪华公寓。', category: 'housing', era: '星系际', reqs: { housing: 6, gateway: 3 }, grant: ['housing', 7], costs: { Knowledge: 5000000, Orichalcum: 100000 }, effect: '顶级住房容量。' },
  { id: 'fertility_clinic', name: '生育诊所', description: '建立生育诊所。', category: 'housing', era: '星系际', reqs: { housing: 7, xeno: 6 }, grant: ['housing', 8], costs: { Knowledge: 6000000, Vitreloy: 200000 }, effect: '提升人口增长。' },
  { id: 'hallowed_housing', name: '神圣住房', description: '建造神圣住房。', category: 'housing', era: '存在', reqs: { asphodel: 10, theology: 2 }, grant: ['asphodel', 11], costs: { Knowledge: 95000000, Omniscience: 19500 }, effect: '解锁神圣住房。' },

  // ===== 农业补充科技 (Agriculture Extended) =====

  { id: 'lodge', name: '小屋', description: '建造猎人小屋。', category: 'agriculture', era: '文明', reqs: { housing: 1 }, grant: ['hunting', 1], costs: { Knowledge: 45, Lumber: 20 }, effect: '解锁猎人岗位。' },
  { id: 'mill', name: '磨坊', description: '建造磨坊。', category: 'agriculture', era: '文明', reqs: { farm: 3, smelting: 1 }, grant: ['farm', 4], costs: { Knowledge: 1800 }, effect: '提升粮食加工效率。' },
  { id: 'windmill', name: '风车', description: '建造风车。', category: 'agriculture', era: '发现', reqs: { farm: 4, high_tech: 1 }, grant: ['farm', 5], costs: { Knowledge: 12000 }, effect: '进一步提升粮食产量。' },
  { id: 'gmfood', name: '转基因食品', description: '研发转基因食品。', category: 'agriculture', era: '全球化', reqs: { farm: 5, genetics: 3 }, grant: ['farm', 6], costs: { Knowledge: 120000 }, effect: '大幅提升粮食产量。' },
  { id: 'titanium_hoe', name: '钛锄', description: '制造钛合金锄头。', category: 'agriculture', era: '工业化', reqs: { farm: 4, high_tech: 3 }, grant: ['farm', 5], costs: { Knowledge: 40000, Titanium: 500 }, effect: '提升耕作效率。' },
  { id: 'adamantite_hoe', name: '精金锄', description: '制造精金锄头。', category: 'agriculture', era: '星际', reqs: { farm: 6, alpha: 2 }, grant: ['farm', 7], costs: { Knowledge: 550000, Adamantite: 10000 }, effect: '进一步提升耕作效率。' },

  // ===== 科学补充科技 (Science Extended) =====

  { id: 'library', name: '图书馆', description: '建造图书馆。', category: 'science', era: '文明', reqs: { science: 1 }, grant: ['science', 2], costs: { Knowledge: 50 }, effect: '提升知识获取。' },
  { id: 'laboratory', name: '实验室', description: '建造实验室。', category: 'science', era: '发现', reqs: { science: 3, high_tech: 1 }, grant: ['science', 4], costs: { Knowledge: 12000 }, effect: '解锁实验室建筑。' },
  { id: 'advanced_biotech', name: '高级生物技术', description: '研发高级生物技术。', category: 'science', era: '星际', reqs: { genetics: 8, kuiper: 1 }, grant: ['biotech', 1], costs: { Knowledge: 2400000, Orichalcum: 125000, Cipher: 15000 }, effect: '解锁高级生物技术。' },
  { id: 'quantum_entanglement', name: '量子纠缠', description: '研究量子纠缠现象。', category: 'science', era: '星系际', reqs: { high_tech: 16 }, grant: ['high_tech', 17], costs: { Knowledge: 8000000 }, effect: '推进量子物理学。' },
  { id: 'spirit_box', name: '灵魂盒', description: '研究灵魂存储技术。', category: 'science', era: '存在', reqs: { high_tech: 19, isle: 3 }, grant: ['spirit_box', 1], costs: { Knowledge: 125000000, Omniscience: 35000 }, effect: '解锁灵魂存储。' },
  { id: 'wisdom', name: '智慧', description: '追求终极智慧。', category: 'science', era: '存在', reqs: { elysium: 13 }, grant: ['elysium', 14], costs: { Knowledge: 118000000, Omniscience: 32000 }, effect: '解锁智慧档案馆。' },

  // ===== 银行补充科技 (Banking Extended) =====

  { id: 'banking', name: '银行业', description: '建立银行系统。', category: 'banking', era: '文明', reqs: { currency: 1 }, grant: ['banking', 1], costs: { Knowledge: 250 }, effect: '解锁银行建筑。' },
  { id: 'home_safe', name: '家用保险箱', description: '制造家用保险箱。', category: 'banking', era: '文明', reqs: { banking: 1 }, grant: ['banking', 2], costs: { Knowledge: 500, Iron: 100 }, effect: '提升金钱存储。' },
  { id: 'fire_proof_safe', name: '防火保险箱', description: '制造防火保险箱。', category: 'banking', era: '发现', reqs: { banking: 3, smelting: 2 }, grant: ['banking', 4], costs: { Knowledge: 8000, Steel: 500 }, effect: '大幅提升金钱存储。' },
  { id: 'mythril_vault', name: '秘银金库', description: '建造秘银金库。', category: 'banking', era: '早期太空', reqs: { banking: 5, space: 3 }, grant: ['banking', 6], costs: { Knowledge: 160000, Mythril: 500 }, effect: '进一步提升金钱存储。' },
  { id: 'adamantite_vault', name: '精金金库', description: '建造精金金库。', category: 'banking', era: '星际', reqs: { banking: 7, alpha: 2 }, grant: ['banking', 8], costs: { Knowledge: 550000, Adamantite: 15000 }, effect: '大幅提升金钱存储。' },
  { id: 'bolognium_vaults', name: '博洛尼乌姆金库', description: '建造博洛尼乌姆金库。', category: 'banking', era: '星系际', reqs: { banking: 9, gateway: 3 }, grant: ['banking', 10], costs: { Knowledge: 4000000, Bolognium: 100000 }, effect: '顶级金钱存储。' },
  { id: 'online_gambling', name: '在线赌博', description: '发展在线赌博业。', category: 'banking', era: '深空', reqs: { gambling: 1, high_tech: 10 }, grant: ['gambling', 2], costs: { Knowledge: 350000 }, effect: '提升赌博收入。' },
  { id: 'crypto_currency', name: '加密货币', description: '发展加密货币。', category: 'banking', era: '星际', reqs: { banking: 10, high_tech: 13 }, grant: ['banking', 11], costs: { Knowledge: 850000 }, effect: '解锁加密货币系统。' },
  { id: 'eternal_bank', name: '永恒银行', description: '建造永恒银行。', category: 'banking', era: '存在', reqs: { elysium: 12 }, grant: ['elysium', 13], costs: { Knowledge: 115000000, Omniscience: 30000 }, effect: '解锁永恒银行。' },

  // ===== 更多补充科技 =====

  // 煤炭/电力
  { id: 'coal_mining', name: '采煤', description: '开发煤矿资源。', category: 'power_generation', era: '发现', reqs: { high_tech: 1 }, grant: ['coal', 1], costs: { Knowledge: 8000 }, effect: '解锁煤矿建筑。' },
  { id: 'coal_power', name: '燃煤发电', description: '使用煤炭发电。', category: 'power_generation', era: '发现', reqs: { coal: 1 }, grant: ['coal', 2], costs: { Knowledge: 12000 }, effect: '解锁燃煤发电厂。' },
  { id: 'wind_plant', name: '风力发电', description: '建造风力发电站。', category: 'power_generation', era: '全球化', reqs: { high_tech: 6 }, grant: ['wind', 1], costs: { Knowledge: 95000 }, effect: '解锁风力发电站。' },
  { id: 'windturbine', name: '风力涡轮', description: '升级风力涡轮机。', category: 'power_generation', era: '全球化', reqs: { wind: 1 }, grant: ['wind', 2], costs: { Knowledge: 110000 }, effect: '提升风力发电效率。' },
  { id: 'hydrogen_plant', name: '氢能发电', description: '建造氢能发电站。', category: 'power_generation', era: '星际', reqs: { high_tech: 12 }, grant: ['hydrogen', 1], costs: { Knowledge: 700000 }, effect: '解锁氢能发电。' },
  { id: 'infernium_power', name: '地狱火发电', description: '使用地狱火发电。', category: 'power_generation', era: '维度', reqs: { infernite: 2, high_tech: 18 }, grant: ['infernium', 1], costs: { Knowledge: 30000000, Infernite: 50000 }, effect: '解锁地狱火发电。' },

  // 更多军事科技
  { id: 'cyborg_soldiers', name: '生化战士', description: '开发生化战士技术。', category: 'military', era: '维度', reqs: { military: 12, cybernetics: 1 }, grant: ['military', 13], costs: { Knowledge: 30000000, Orichalcum: 300000 }, effect: '解锁生化战士。' },
  { id: 'war_drones', name: '战争无人机', description: '部署战争无人机。', category: 'military', era: '星际', reqs: { portal: 3 }, grant: ['portal', 4], costs: { Knowledge: 700000 }, effect: '解锁战争无人机。' },
  { id: 'combat_droids', name: '战斗机器人', description: '部署战斗机器人。', category: 'military', era: '星际', reqs: { portal: 5 }, grant: ['portal', 6], costs: { Knowledge: 762000, Soul_Gem: 1 }, effect: '解锁战斗机器人。' },

  // 更多锻造科技
  { id: 'aerogel', name: '气凝胶', description: '研发气凝胶材料。', category: 'crafting', era: '星际', reqs: { high_tech: 12 }, grant: ['aerogel', 1], costs: { Knowledge: 600000 }, effect: '解锁气凝胶生产。' },
  { id: 'graphene_craft', name: '石墨烯', description: '大规模生产石墨烯。', category: 'crafting', era: '星际', reqs: { high_tech: 12, proxima: 2 }, grant: ['graphene', 1], costs: { Knowledge: 650000 }, effect: '解锁石墨烯生产。' },

  // 更多存储科技
  { id: 'adamantite_crates', name: '精金箱', description: '制造精金集装箱。', category: 'storage', era: '星际', reqs: { container: 5, alpha: 2 }, grant: ['container', 6], costs: { Knowledge: 525000, Adamantite: 17500 }, effect: '提升集装箱容量。' },
  { id: 'aerogel_containers', name: '气凝胶集装箱', description: '制造气凝胶集装箱。', category: 'storage', era: '星际', reqs: { steel_container: 5, aerogel: 1 }, grant: ['steel_container', 6], costs: { Knowledge: 775000, Aerogel: 500 }, effect: '提升集装箱容量。' },

  // 更多科学科技
  { id: 'artifical_intelligence', name: '人工智能', description: '研发人工智能。', category: 'science', era: '深空', reqs: { high_tech: 10 }, grant: ['high_tech', 11], costs: { Knowledge: 350000 }, effect: '解锁 AI 技术。' },
  { id: 'quantum_computing', name: '量子计算', description: '研发量子计算机。', category: 'science', era: '深空', reqs: { high_tech: 9 }, grant: ['high_tech', 10], costs: { Knowledge: 260000 }, effect: '大幅提升计算能力。' },
  { id: 'virtual_reality', name: '虚拟现实', description: '开发虚拟现实技术。', category: 'science', era: '全球化', reqs: { high_tech: 6 }, grant: ['high_tech', 7], costs: { Knowledge: 120000 }, effect: '解锁虚拟现实系统。' },

  // 更多太空探索科技
  { id: 'mass_driver', name: '质量驱动器', description: '建造质量驱动器。', category: 'space_exploration', era: '早期太空', reqs: { mars: 3 }, grant: ['mars', 4], costs: { Knowledge: 220000 }, effect: '解锁质量驱动器建筑。' },
  { id: 'higgs_boson', name: '希格斯玻色子', description: '研究希格斯玻色子。', category: 'science', era: '早期太空', reqs: { particles: 2, supercollider: 2 }, grant: ['particles', 3], costs: { Knowledge: 125000 }, effect: '推进粒子物理学。' },

  // 更多 portal 科技
  { id: 'portal_tech', name: '传送门技术', description: '研究传送门技术。', category: 'hell_dimension', era: '星际', reqs: { wsc: 1 }, grant: ['portal', 1], costs: { Knowledge: 500000 }, effect: '解锁传送门技术。' },
  { id: 'fortifications', name: '要塞化', description: '在地狱入口建造防御要塞。', category: 'hell_dimension', era: '星际', reqs: { portal: 1 }, grant: ['portal', 2], costs: { Knowledge: 550000, Stone: 1000000 }, effect: '解锁地狱门区域和要塞防御系统。' },
  { id: 'demon_attractor', name: '恶魔吸引器', description: '建造吸引恶魔的装置。', category: 'hell_dimension', era: '星际', reqs: { portal: 3, stanene: 1 }, grant: ['portal', 4], costs: { Knowledge: 745000 }, effect: '解锁恶魔吸引器建筑。' },
  { id: 'repair_droids', name: '维修机器人', description: '部署地狱维修机器人。', category: 'hell_dimension', era: '星际', reqs: { portal: 5 }, grant: ['portal', 6], costs: { Knowledge: 794000, Soul_Gem: 1 }, effect: '解锁维修机器人。' },
  { id: 'advanced_predators', name: '高级掠食者', description: '升级地狱防御系统。', category: 'hell_dimension', era: '星系际', reqs: { portal: 6, xeno: 4 }, grant: ['portal', 7], costs: { Knowledge: 5000000, Bolognium: 500000, Vitreloy: 250000 }, effect: '大幅提升地狱防御能力。' },

  // 更多维度科技
  { id: 'arcology_tech', name: '生态建筑技术', description: '研发生态建筑技术。', category: 'housing', era: '维度', reqs: { high_tech: 18 }, grant: ['arcology', 1], costs: { Knowledge: 25000000 }, effect: '解锁生态建筑。' },
  { id: 'cybernetics_tech', name: '控制论', description: '研究人机融合技术。', category: 'science', era: '维度', reqs: { high_tech: 18 }, grant: ['cybernetics', 1], costs: { Knowledge: 28000000 }, effect: '解锁控制论升级。' },

  // 更多存在时代科技
  { id: 'divinity_tech', name: '神性', description: '追求神性。', category: 'religion', era: '存在', reqs: { theology: 5, science: 20 }, grant: ['divinity', 1], costs: { Knowledge: 80000000, Omniscience: 20000 }, effect: '接近神性。' },
  { id: 'reincarnation_tech', name: '轮回', description: '研究轮回转世。', category: 'religion', era: '存在', reqs: { divinity: 1, elysium: 16 }, grant: ['reincarnation', 1], costs: { Knowledge: 130000000, Omniscience: 40000 }, effect: '解锁轮回系统。' },

  // ===== 最后一批补充科技 =====

  // 农业链补充
  { id: 'lodge', name: '小屋', description: '建造猎人小屋。', category: 'agriculture', era: '文明', reqs: { housing: 1 }, grant: ['hunting', 2], costs: { Knowledge: 45, Lumber: 20 }, effect: '解锁猎人岗位。' },
  { id: 'windmill', name: '风车', description: '建造风车。', category: 'agriculture', era: '发现', reqs: { farm: 4, high_tech: 1 }, grant: ['farm', 5], costs: { Knowledge: 12000 }, effect: '进一步提升粮食产量。' },
  { id: 'gmfood', name: '转基因食品', description: '研发转基因食品。', category: 'agriculture', era: '全球化', reqs: { farm: 5, genetics: 3 }, grant: ['farm', 6], costs: { Knowledge: 120000 }, effect: '大幅提升粮食产量。' },
  { id: 'titanium_hoe', name: '钛锄', description: '制造钛合金锄头。', category: 'agriculture', era: '工业化', reqs: { farm: 4, high_tech: 3 }, grant: ['hoe', 4], costs: { Knowledge: 40000, Titanium: 500 }, effect: '提升耕作效率。' },

  // 远古族科技
  { id: 'mind_break', name: '心灵破碎', description: '破碎敌人的心灵。', category: 'eldritch', era: '文明', reqs: { psychic: 3 }, condition: (state) => state.race.unfathomable !== undefined, grant: ['psychicthrall', 1], costs: { Knowledge: 5000 }, effect: '解锁心灵破碎能力。' },
  { id: 'psychic_stun', name: '心灵震慑', description: '用心灵力量震慑敌人。', category: 'eldritch', era: '文明', reqs: { psychicthrall: 1 }, condition: (state) => state.race.unfathomable !== undefined, grant: ['psychicthrall', 2], costs: { Knowledge: 10000 }, effect: '解锁心灵震慑能力。' },

  // 冶炼科技
  { id: 'electric_arc_furnace', name: '电弧炉', description: '建造电弧炉。', category: 'mining', era: '全球化', reqs: { smelting: 5, high_tech: 6 }, grant: ['smelting', 6], costs: { Knowledge: 95000 }, effect: '解锁电弧炉冶炼。' },
  { id: 'rotary_kiln', name: '回转窑', description: '建造回转窑。', category: 'mining', era: '工业化', reqs: { copper: 1 }, grant: ['copper', 2], costs: { Knowledge: 25000 }, effect: '提升铜矿冶炼效率。' },

  // 科学补充
  { id: 'quantum_entanglement', name: '量子纠缠', description: '研究量子纠缠现象。', category: 'science', era: '星际', reqs: { science: 15 }, grant: ['science', 16], costs: { Knowledge: 1500000 }, effect: '推进量子物理学。' },
  { id: 'subspace_sensors', name: '亚空间传感器', description: '研发亚空间传感器。', category: 'science', era: '星系际', reqs: { science: 17 }, grant: ['science', 18], costs: { Knowledge: 8000000 }, effect: '解锁亚空间探测。' },

  // 娱乐补充
  { id: 'ambrosia', name: '仙馔', description: '制作仙馔。', category: 'entertainment', era: '存在', reqs: { elysium: 12 }, grant: ['elysium', 13], costs: { Knowledge: 112000000, Omniscience: 28000 }, effect: '解锁仙馔餐厅。' },
  { id: 'rushmore', name: '总统山', description: '建造总统山雕像。', category: 'entertainment', era: '存在', reqs: { high_tech: 19, elysium: 15 }, grant: ['elysium', 16], costs: { Knowledge: 125000000, Omniscience: 37250 }, effect: '解锁总统山建筑。' },

  // 住房补充
  { id: 'neutronium_walls', name: '中子星墙壁', description: '使用中子星材料加固墙壁。', category: 'housing', era: '星际', reqs: { housing: 5, neutron: 1 }, grant: ['housing_reduction', 3], costs: { Knowledge: 600000, Neutronium: 5000 }, effect: '提升住房容量。' },

  // 伐木补充
  { id: 'titanium_axes', name: '钛斧', description: '制造钛斧。', category: 'lumber_gathering', era: '工业化', reqs: { lumber: 4, high_tech: 3 }, grant: ['axe', 5], costs: { Knowledge: 35000, Titanium: 250 }, effect: '大幅提升伐木效率。' },

  // 军事补充
  { id: 'machine_gun', name: '机枪', description: '研发机枪武器。', category: 'military', era: '工业化', reqs: { military: 4, high_tech: 3 }, grant: ['military', 5], costs: { Knowledge: 38000 }, effect: '大幅提升军队火力。' },

  // 人类学补充
  { id: 'alt_anthropology', name: '人类学（替代）', description: '研究种族文化。', category: 'religion', era: '文明', reqs: { theology: 2 }, grant: ['anthropology', 1], costs: { Knowledge: 2500 }, effect: '解锁人类学研究。' },

  // 量子材料
  { id: 'quantium', name: '量子材料', description: '研发量子材料。', category: 'crafting', era: '太阳系', reqs: { supercollider: 10, enceladus: 3 }, grant: ['quantium', 1], costs: { Knowledge: 2400000, Orichalcum: 125000, Cipher: 15000 }, effect: '解锁量子材料生产。' },

  // 外层太空
  { id: 'strange_signal', name: '奇怪信号', description: '探测到奇怪信号。', category: 'space_exploration', era: '太阳系', reqs: { outer: 2 }, grant: ['outer', 3], costs: { Knowledge: 1500000 }, effect: '解锁外层太空探索。' },

  // 船坞传感器
  { id: 'quantum_signatures', name: '量子签名', description: '检测量子签名。', category: 'space_militarization', era: '太阳系', reqs: { syard_sensor: 3 }, grant: ['syard_sensor', 4], costs: { Knowledge: 800000 }, effect: '提升船坞传感器精度。' },

  // 钛锤
  { id: 'titanium_sledgehammer', name: '钛锤', description: '制造钛锤。', category: 'mining', era: '工业化', reqs: { mining: 4, high_tech: 3 }, grant: ['hammer', 4], costs: { Knowledge: 35000, Titanium: 250 }, effect: '进一步提升采矿效率。' },

  // Womling
  { id: 'weasels', name: '鼬鼠', description: '与鼬鼠建立联系。', category: 'womling', era: 'Tauceti', reqs: { tau_red: 2 }, grant: ['tau_red', 3], costs: { Knowledge: 6250000 }, effect: '与鼬鼠建立外交关系。' },

  // 外星旅游
  { id: 'xeno_tourism', name: '异星旅游', description: '发展异星旅游业。', category: 'banking', era: '星系际', reqs: { gateway: 3, xeno: 6 }, grant: ['monument', 3], costs: { Knowledge: 4500000, Bolognium: 500000 }, effect: '解锁异星旅游收入。' },

  // ===== Solar/True Path 科技 =====

  { id: 'adamantite_containers_tp', name: '精金集装箱（真相之路）', description: '制造精金集装箱。', category: 'storage', era: '太阳系', reqs: { steel_container: 4, alpha: 2 }, grant: ['steel_container', 5], costs: { Knowledge: 525000, Adamantite: 17500 }, effect: '提升集装箱容量。' },
  { id: 'adamantite_vault_tp', name: '精金金库（真相之路）', description: '建造精金金库。', category: 'banking', era: '太阳系', reqs: { banking: 7, alpha: 2 }, grant: ['banking', 8], costs: { Knowledge: 550000, Adamantite: 15000 }, effect: '大幅提升金钱存储。' },
  { id: 'ai_core_tp', name: 'AI 核心（真相之路）', description: '建造 AI 核心。', category: 'ai_core', era: '太阳系', reqs: { high_tech: 14, science: 15, blackhole: 3 }, grant: ['high_tech', 15], costs: { Knowledge: 1500000 }, effect: '解锁 AI 核心技术。' },
  { id: 'ai_optimizations', name: 'AI 优化', description: '使用 AI 优化系统。', category: 'science', era: '太阳系', reqs: { high_tech: 15 }, grant: ['high_tech', 16], costs: { Knowledge: 5000000 }, effect: 'AI 优化各项系统。' },
  { id: 'bac_tanks_tp', name: 'BAC 坦克（真相之路）', description: '建造 BAC 坦克。', category: 'military', era: '太阳系', reqs: { medic: 1, triton: 2 }, grant: ['medic', 2], costs: { Knowledge: 1750000 }, effect: '提升医疗能力。' },
  { id: 'data_analysis', name: '数据分析', description: '进行数据分析。', category: 'science', era: '太阳系', reqs: { outer: 3 }, grant: ['outer', 4], costs: { Knowledge: 2000000 }, effect: '提升数据处理能力。' },
  { id: 'data_cracker', name: '数据破解', description: '破解加密数据。', category: 'science', era: '太阳系', reqs: { outer: 4 }, grant: ['outer', 5], costs: { Knowledge: 2500000 }, effect: '解锁加密数据。' },
  { id: 'elerium_extraction', name: '埃勒里提取', description: '提取埃勒里资源。', category: 'mining', era: '太阳系', reqs: { elerium: 1 }, grant: ['elerium', 2], costs: { Knowledge: 300000 }, effect: '提升埃勒里提取效率。' },
  { id: 'graphene_tp', name: '石墨烯（真相之路）', description: '生产石墨烯。', category: 'crafting', era: '太阳系', reqs: { high_tech: 12, proxima: 2 }, grant: ['graphene', 1], costs: { Knowledge: 650000 }, effect: '解锁石墨烯生产。' },
  { id: 'iridium_smelting', name: '铱冶炼', description: '冶炼铱金属。', category: 'mining', era: '太阳系', reqs: { smelting: 5 }, grant: ['smelting', 6], costs: { Knowledge: 200000 }, effect: '解锁铱冶炼。' },
  { id: 'long_range_probes', name: '远程探测器', description: '发射远程探测器。', category: 'space_exploration', era: '太阳系', reqs: { outer: 5 }, grant: ['outer', 6], costs: { Knowledge: 3000000 }, effect: '解锁远程探测。' },
  { id: 'mass_relay', name: '质量中继器', description: '建造质量中继器。', category: 'space_exploration', era: '太阳系', reqs: { outer: 6 }, grant: ['outer', 7], costs: { Knowledge: 4000000 }, effect: '解锁质量中继器。' },
  { id: 'photon_engine', name: '光子引擎', description: '研发光子引擎。', category: 'space_militarization', era: '太阳系', reqs: { syard_engine: 1 }, grant: ['syard_engine', 2], costs: { Knowledge: 500000 }, effect: '解锁光子引擎。' },
  { id: 'pulse_engine', name: '脉冲引擎', description: '研发脉冲引擎。', category: 'space_militarization', era: '太阳系', reqs: { syard_engine: 2 }, grant: ['syard_engine', 3], costs: { Knowledge: 800000 }, effect: '解锁脉冲引擎。' },
  { id: 'quantium_containers', name: '量子集装箱', description: '制造量子集装箱。', category: 'storage', era: '太阳系', reqs: { steel_container: 6, quantium: 1 }, grant: ['steel_container', 7], costs: { Knowledge: 2500000, Quantium: 50000 }, effect: '提升集装箱容量。' },
  { id: 'ship_elerium', name: '舰船埃勒里', description: '为舰船装备埃勒里。', category: 'space_militarization', era: '太阳系', reqs: { syard_weapon: 3 }, grant: ['syard_weapon', 4], costs: { Knowledge: 880000, Elerium: 2500 }, effect: '提升舰船武器威力。' },
  { id: 'ship_fusion', name: '舰船聚变', description: '为舰船装备聚变引擎。', category: 'space_militarization', era: '太阳系', reqs: { syard_engine: 1 }, grant: ['syard_engine', 2], costs: { Knowledge: 500000 }, effect: '提升舰船速度。' },
  { id: 'stanene_tp', name: '斯坦烯（真相之路）', description: '生产斯坦烯。', category: 'crafting', era: '太阳系', reqs: { infernite: 1 }, grant: ['stanene', 1], costs: { Knowledge: 590000, Aluminium: 500000, Infernite: 1000 }, effect: '解锁斯坦烯生产。' },
  { id: 'zero_g_lab', name: '零重力实验室', description: '建造零重力实验室。', category: 'science', era: '太阳系', reqs: { high_tech: 13, graphene: 1, enceladus: 2 }, grant: ['enceladus', 3], costs: { Knowledge: 900000 }, effect: '解锁零重力实验室。' },

  // ===== Interstellar 补充科技 =====

  { id: 'adamantite_hammer', name: '精金锤', description: '制造精金锤。', category: 'mining', era: '星际', reqs: { mining: 7, alpha: 2 }, grant: ['mining', 8], costs: { Knowledge: 500000, Adamantite: 10000 }, effect: '大幅提升采矿效率。' },
  { id: 'chainsaws', name: '电锯', description: '制造电锯。', category: 'lumber_gathering', era: '星际', reqs: { lumber: 6, high_tech: 12 }, grant: ['lumber', 7], costs: { Knowledge: 600000, Elerium: 100 }, effect: '大幅提升伐木效率。' },
  { id: 'cruiser', name: '巡洋舰', description: '建造巡洋舰。', category: 'military', era: '星际', reqs: { military: 9, alpha: 4 }, grant: ['military', 10], costs: { Knowledge: 5000000 }, effect: '解锁巡洋舰。' },
  { id: 'elerium_prospecting', name: '埃勒里勘探', description: '勘探埃勒里资源。', category: 'space_mining', era: '星际', reqs: { elerium: 2 }, grant: ['elerium', 3], costs: { Knowledge: 400000 }, effect: '提升埃勒里勘探效率。' },
  { id: 'exchange', name: '交易所', description: '建造星际交易所。', category: 'banking', era: '星际', reqs: { banking: 10, alpha: 2 }, grant: ['banking', 11], costs: { Knowledge: 800000 }, effect: '解锁星际交易所。' },
  { id: 'graphene_vault', name: '石墨烯金库', description: '建造石墨烯金库。', category: 'banking', era: '星际', reqs: { banking: 8, graphene: 1 }, grant: ['banking', 9], costs: { Knowledge: 700000, Graphene: 75000 }, effect: '提升金钱存储。' },
  { id: 'virtual_assistant', name: '虚拟助手', description: '开发虚拟助手。', category: 'science', era: '星际', reqs: { high_tech: 13 }, grant: ['high_tech', 14], costs: { Knowledge: 850000 }, effect: '提升效率。' },
  { id: 'vr_training', name: 'VR 训练', description: '使用 VR 进行训练。', category: 'military', era: '星际', reqs: { military: 9, high_tech: 13 }, grant: ['military', 10], costs: { Knowledge: 800000 }, effect: '提升训练效率。' },

  // ===== Intergalactic 补充科技 =====

  { id: 'advanced_telemetry', name: '高级遥测', description: '研发高级遥测技术。', category: 'science', era: '星系际', reqs: { xeno: 5 }, grant: ['telemetry', 1], costs: { Knowledge: 4200000, Vitreloy: 10000 }, effect: '提升遥测精度。' },
  { id: 'coordinates', name: '坐标', description: '获取星际坐标。', category: 'space_exploration', era: '星系际', reqs: { xeno: 4 }, grant: ['xeno', 5], costs: { Knowledge: 3500000 }, effect: '解锁星际导航。' },
  { id: 'expedition', name: '远征', description: '组织星际远征。', category: 'space_exploration', era: '星系际', reqs: { xeno: 6 }, grant: ['xeno', 7], costs: { Knowledge: 4600000 }, effect: '解锁远征行动。' },
  { id: 'foreign_investment', name: '外星投资', description: '进行外星投资。', category: 'banking', era: '星系际', reqs: { xeno: 7 }, grant: ['xeno', 8], costs: { Knowledge: 5500000, Infernite: 125000 }, effect: '解锁外星投资。' },
  { id: 'gateway_depot', name: '网关仓库', description: '建造网关仓库。', category: 'storage', era: '星系际', reqs: { gateway: 5 }, grant: ['gateway', 6], costs: { Knowledge: 4000000, Neutronium: 80000, Stanene: 500000 }, effect: '提供大量存储容量。' },
  { id: 'mega_manufacturing', name: '超级制造', description: '发展超级制造技术。', category: 'crafting', era: '星系际', reqs: { high_tech: 17, alpha: 4, factory: 3 }, grant: ['factory', 4], costs: { Knowledge: 13500000, Vitreloy: 500000, Orichalcum: 300000 }, effect: '解锁超级制造。' },
  { id: 'metaphysics', name: '形而上学', description: '研究形而上学。', category: 'science', era: '星系际', reqs: { high_tech: 15, xeno: 5 }, grant: ['high_tech', 16], costs: { Knowledge: 5000000, Vitreloy: 10000, Soul_Gem: 10 }, effect: '推进科学前沿。' },
  { id: 'ore_processor', name: '矿石处理器', description: '建造矿石处理器。', category: 'mining', era: '星系际', reqs: { gateway: 3 }, grant: ['gateway', 4], costs: { Knowledge: 3900000 }, effect: '提升矿石处理效率。' },
  { id: 'orichalcum_analysis', name: '奥利哈康分析', description: '分析奥利哈康材料。', category: 'science', era: '星系际', reqs: { high_tech: 16, chthonian: 3 }, grant: ['high_tech', 17], costs: { Knowledge: 8000000, Orichalcum: 200000 }, effect: '解锁奥利哈康应用。' },

  // ===== Existential 补充科技 =====

  { id: 'active_camouflage', name: '主动伪装', description: '研发主动伪装技术。', category: 'military', era: '存在', reqs: { celestial_warfare: 2 }, grant: ['celestial_warfare', 3], costs: { Knowledge: 89000000, Omniscience: 18750 }, effect: '提升军队隐蔽能力。' },
  { id: 'ancient_crafters', name: '古代工匠', description: '研究古代工匠技术。', category: 'crafting', era: '存在', reqs: { elysium: 17 }, grant: ['elysium', 18], costs: { Knowledge: 140000000, Omniscience: 44000 }, effect: '解锁古代工匠技术。' },
  { id: 'bliss_den', name: '极乐窝', description: '建造极乐窝。', category: 'entertainment', era: '存在', reqs: { asphodel: 9 }, grant: ['asphodel', 10], costs: { Knowledge: 90000000, Omniscience: 16666 }, effect: '解锁极乐窝建筑。' },
  { id: 'camouflage', name: '伪装', description: '研发伪装技术。', category: 'military', era: '存在', reqs: { elysium: 3 }, grant: ['celestial_warfare', 1], costs: { Knowledge: 83000000, Omniscience: 15000, Asphodel_Powder: 100000 }, effect: '解锁伪装技术。' },
  { id: 'celestial_tactics', name: '天界战术', description: '研发天界战术。', category: 'military', era: '存在', reqs: { celestial_warfare: 1 }, grant: ['celestial_warfare', 2], costs: { Knowledge: 86000000, Omniscience: 17500 }, effect: '提升天界战斗能力。' },
  { id: 'dimensional_tap', name: '维度抽取', description: '从维度中抽取能量。', category: 'power_generation', era: '存在', reqs: { high_tech: 19 }, grant: ['dimensional_tap', 1], costs: { Knowledge: 150000000, Omniscience: 50000 }, effect: '解锁维度能量抽取。' },
  { id: 'elerium_cannon', name: '埃勒里炮', description: '建造埃勒里炮。', category: 'military', era: '存在', reqs: { elysium: 9, isle: 1 }, grant: ['elysium', 10], costs: { Knowledge: 105000000, Omniscience: 25000, Steel: 1000000000, Nano_Tube: 500000000 }, effect: '解锁埃勒里炮。' },
  { id: 'elerium_containment', name: '埃勒里收容', description: '建造埃勒里收容设施。', category: 'storage', era: '存在', reqs: { elysium: 10 }, grant: ['elysium', 11], costs: { Knowledge: 106500000, Omniscience: 26500 }, effect: '提升埃勒里存储容量。' },
  { id: 'elysanite_mining', name: '伊利桑奈特采矿', description: '开采伊利桑奈特。', category: 'mining', era: '存在', reqs: { elysium: 5 }, grant: ['elysium', 6], costs: { Knowledge: 93000000, Omniscience: 18500 }, effect: '解锁伊利桑奈特采矿。' },
  { id: 'sacred_smelter', name: '神圣冶炼', description: '建造神圣冶炼炉。', category: 'mining', era: '存在', reqs: { elysium: 6 }, grant: ['elysium', 7], costs: { Knowledge: 96000000, Omniscience: 19425 }, effect: '解锁神圣冶炼。' },
  { id: 'spectral_training', name: '光谱训练', description: '进行光谱训练。', category: 'military', era: '存在', reqs: { celestial_warfare: 4 }, grant: ['celestial_warfare', 5], costs: { Knowledge: 94500000, Omniscience: 21000 }, effect: '提升军队光谱战斗能力。' },
  { id: 'super_tnt', name: '超级炸药', description: '研发超级炸药。', category: 'mining', era: '存在', reqs: { explosives: 3, science: 23 }, grant: ['explosives', 4], costs: { Knowledge: 85000000, Omniscience: 14500, Asphodel_Powder: 66777 }, effect: '解锁超级炸药。' },

  // ===== 其他补充科技 =====

  { id: 'wooden_tools', name: '木制工具', description: '制造木制工具。', category: 'stone_gathering', era: '原始', reqs: { primitive: 1 }, grant: ['stone', 1], costs: { Knowledge: 5 }, effect: '提升采石效率。' },
  { id: 'metal_working', name: '金属加工', description: '学习金属加工技术。', category: 'mining', era: '文明', reqs: { mining: 2 }, grant: ['mining', 3], costs: { Knowledge: 250 }, effect: '解锁金属加工。' },
  { id: 'iron_mining', name: '铁矿开采', description: '开采铁矿资源。', category: 'mining', era: '文明', reqs: { mining: 3 }, grant: ['mining', 4], costs: { Knowledge: 500 }, effect: '解锁铁矿开采。' },
  { id: 'silo', name: '粮仓', description: '建造粮仓。', category: 'agriculture', era: '文明', reqs: { farm: 2 }, grant: ['farm', 3], costs: { Knowledge: 650 }, effect: '提升粮食存储。' },
  { id: 'cottage', name: '村舍', description: '建造村舍。', category: 'housing', era: '文明', reqs: { housing: 1, cement: 1 }, grant: ['housing', 2], costs: { Knowledge: 500, Stone: 200 }, effect: '解锁村舍建筑。' },
  { id: 'portland_cement', name: '波特兰水泥', description: '发明波特兰水泥。', category: 'cement', era: '工业化', reqs: { cement: 3, high_tech: 3 }, grant: ['cement', 4], costs: { Knowledge: 45000 }, effect: '提升水泥质量。' },
  { id: 'anfo', name: '铵油炸药', description: '研发铵油炸药。', category: 'mining', era: '工业化', reqs: { explosives: 2, oil: 1 }, grant: ['explosives', 3], costs: { Knowledge: 42000, Oil: 2500 }, effect: '提升爆破效率。' },
  { id: 'uranium', name: '铀', description: '发现铀资源。', category: 'power_generation', era: '全球化', reqs: { high_tech: 4 }, grant: ['uranium', 1], costs: { Knowledge: 72000 }, effect: '解锁铀资源。' },
  { id: 'massive_trades', name: '大规模交易', description: '进行大规模交易。', category: 'banking', era: '全球化', reqs: { currency: 4 }, grant: ['currency', 5], costs: { Knowledge: 6750 }, effect: '提升交易规模。' },

  // ===== 农业链补充 =====

  { id: 'windturbine', name: '风力涡轮', description: '升级风力涡轮机。', category: 'agriculture', era: '全球化', reqs: { farm: 5, high_tech: 6 }, grant: ['farm', 6], costs: { Knowledge: 95000 }, effect: '进一步提升粮食产量。' },

  // ===== 冶炼链补充 =====

  { id: 'hellfire_furnace', name: '地狱火熔炉', description: '建造地狱火熔炉。', category: 'mining', era: '维度', reqs: { smelting: 6, hell_gate: 4 }, grant: ['smelting', 7], costs: { Knowledge: 33000000, Infernite: 50000 }, effect: '解锁地狱火熔炉冶炼。' },
  { id: 'infernium_fuel', name: '地狱火燃料', description: '使用地狱火作为燃料。', category: 'power_generation', era: '维度', reqs: { smelting: 7 }, grant: ['smelting', 8], costs: { Knowledge: 35000000, Infernite: 100000 }, effect: '解锁地狱火燃料发电。' },

  // ===== 科学链补充 =====

  { id: 'laboratory', name: '实验室', description: '建造实验室。', category: 'science', era: '发现', reqs: { science: 3, high_tech: 1 }, grant: ['science', 4], costs: { Knowledge: 12000 }, effect: '解锁实验室建筑。' },
  { id: 'science_12', name: '高级科学', description: '推进科学研究。', category: 'science', era: '星际', reqs: { science: 11 }, grant: ['science', 12], costs: { Knowledge: 700000 }, effect: '推进科学前沿。' },
  { id: 'science_13', name: '星际科学', description: '星际科学研究。', category: 'science', era: '星际', reqs: { science: 12 }, grant: ['science', 13], costs: { Knowledge: 850000 }, effect: '推进星际科学。' },
  { id: 'science_14', name: '高级星际科学', description: '高级星际科学研究。', category: 'science', era: '星际', reqs: { science: 13 }, grant: ['science', 14], costs: { Knowledge: 1000000 }, effect: '推进高级星际科学。' },
  { id: 'science_15', name: '深空科学', description: '深空科学研究。', category: 'science', era: '深空', reqs: { science: 14 }, grant: ['science', 15], costs: { Knowledge: 1500000 }, effect: '推进深空科学。' },
  { id: 'science_16', name: '高级深空科学', description: '高级深空科学研究。', category: 'science', era: '深空', reqs: { science: 15 }, grant: ['science', 16], costs: { Knowledge: 2000000 }, effect: '推进高级深空科学。' },
  { id: 'science_17', name: '星系际科学', description: '星系际科学研究。', category: 'science', era: '星系际', reqs: { science: 16 }, grant: ['science', 17], costs: { Knowledge: 5000000 }, effect: '推进星系际科学。' },
  { id: 'science_18', name: '高级星系际科学', description: '高级星系际科学研究。', category: 'science', era: '星系际', reqs: { science: 17 }, grant: ['science', 18], costs: { Knowledge: 8000000 }, effect: '推进高级星系际科学。' },
  { id: 'science_19', name: '维度科学', description: '维度科学研究。', category: 'science', era: '维度', reqs: { science: 18 }, grant: ['science', 19], costs: { Knowledge: 20000000 }, effect: '推进维度科学。' },
  { id: 'science_20', name: '高级维度科学', description: '高级维度科学研究。', category: 'science', era: '维度', reqs: { science: 19 }, grant: ['science', 20], costs: { Knowledge: 30000000 }, effect: '推进高级维度科学。' },
  { id: 'science_21', name: '存在科学', description: '存在科学研究。', category: 'science', era: '存在', reqs: { science: 20 }, grant: ['science', 21], costs: { Knowledge: 80000000, Omniscience: 20000 }, effect: '推进存在科学。' },
  { id: 'science_22', name: '高级存在科学', description: '高级存在科学研究。', category: 'science', era: '存在', reqs: { science: 21 }, grant: ['science', 22], costs: { Knowledge: 100000000, Omniscience: 30000 }, effect: '推进高级存在科学。' },
  { id: 'science_23', name: '终极科学', description: '终极科学研究。', category: 'science', era: '存在', reqs: { science: 22 }, grant: ['science', 23], costs: { Knowledge: 120000000, Omniscience: 40000 }, effect: '推进终极科学。' },
  { id: 'science_24', name: '维度抽取', description: '从维度中抽取知识。', category: 'science', era: '存在', reqs: { science: 23 }, grant: ['science', 24], costs: { Knowledge: 150000000, Omniscience: 50000 }, effect: '解锁维度知识抽取。' },

  // ===== 金库链补充 =====

  { id: 'mythril_vault', name: '秘银金库', description: '建造秘银金库。', category: 'banking', era: '早期太空', reqs: { banking: 5, space: 3 }, grant: ['banking', 6], costs: { Knowledge: 160000, Mythril: 500 }, effect: '提升金钱存储。' },
  { id: 'neutronium_vault', name: '中子星金库', description: '建造中子星金库。', category: 'banking', era: '星际', reqs: { banking: 8, neutron: 1 }, grant: ['banking', 9], costs: { Knowledge: 600000, Neutronium: 5000 }, effect: '大幅提升金钱存储。' },
  { id: 'adamantite_vault', name: '精金金库', description: '建造精金金库。', category: 'banking', era: '星际', reqs: { banking: 7, alpha: 2 }, grant: ['banking', 8], costs: { Knowledge: 550000, Adamantite: 15000 }, effect: '提升金钱存储。' },
  { id: 'graphene_vault', name: '石墨烯金库', description: '建造石墨烯金库。', category: 'banking', era: '星际', reqs: { banking: 8, graphene: 1 }, grant: ['banking', 9], costs: { Knowledge: 700000, Graphene: 75000 }, effect: '提升金钱存储。' },

  // ===== 集装箱链补充 =====

  { id: 'elysanite_crates', name: '伊利桑奈特箱', description: '制造伊利桑奈特集装箱。', category: 'storage', era: '存在', reqs: { container: 8, elysium: 6 }, grant: ['container', 9], costs: { Knowledge: 95500000, Omniscience: 20250, Asphodel_Powder: 175000, Elysanite: 75000000 }, effect: '提升集装箱容量。' },
  { id: 'elysanite_containers', name: '伊利桑奈特集装箱', description: '制造伊利桑奈特集装箱。', category: 'storage', era: '存在', reqs: { steel_container: 8, elysium: 6 }, grant: ['steel_container', 9], costs: { Knowledge: 100000000, Omniscience: 22500, Elysanite: 100000000 }, effect: '提升集装箱容量。' },

  // ===== 军事链补充 =====

  { id: 'laser_rifles', name: '激光步枪', description: '装备激光步枪。', category: 'military', era: '深空', reqs: { military: 7, high_tech: 10 }, grant: ['military', 8], costs: { Knowledge: 350000, Elerium: 250 }, effect: '大幅提升军队战斗力。' },
  { id: 'hammocks', name: '吊床', description: '在兵营安装吊床。', category: 'military', era: '文明', reqs: { military: 2 }, grant: ['morale', 1], costs: { Knowledge: 450, Lumber: 200 }, effect: '提升兵营容量。' },
  { id: 'anitgrav_bunk', name: '反重力床', description: '安装反重力床。', category: 'military', era: '星际', reqs: { military: 9, high_tech: 13 }, grant: ['morale', 2], costs: { Knowledge: 800000 }, effect: '提升兵营容量。' },

  // ===== 赌博链补充 =====

  { id: 'online_gambling', name: '在线赌博', description: '发展在线赌博业。', category: 'banking', era: '深空', reqs: { gambling: 1, high_tech: 10 }, grant: ['gambling', 2], costs: { Knowledge: 350000 }, effect: '提升赌博收入。' },
  { id: 'iso_gambling', name: '异星赌博', description: '发展异星赌博业。', category: 'banking', era: '星系际', reqs: { gambling: 2, xeno: 6 }, grant: ['gambling', 3], costs: { Knowledge: 5000000, Bolognium: 500000 }, effect: '提升异星赌博收入。' },

  // ===== 住房链补充 =====

  { id: 'mythril_beams', name: '秘银梁', description: '使用秘银加固建筑。', category: 'housing', era: '早期太空', reqs: { housing: 4, space: 3 }, grant: ['housing', 5], costs: { Knowledge: 160000, Mythril: 500 }, effect: '提升住房容量。' },
  { id: 'bolognium_alloy_beams', name: '博洛尼乌姆合金梁', description: '使用博洛尼乌姆合金加固建筑。', category: 'housing', era: '星系际', reqs: { housing: 6, gateway: 3 }, grant: ['housing', 7], costs: { Knowledge: 5000000, Orichalcum: 100000 }, effect: '提升住房容量。' },
  { id: 'neutronium_housing', name: '中子星住房', description: '使用中子星材料建造住房。', category: 'housing', era: '星际', reqs: { housing: 5, neutron: 1 }, grant: ['housing', 6], costs: { Knowledge: 600000, Neutronium: 5000 }, effect: '大幅提升住房容量。' },
  { id: 'fertility_clinic', name: '生育诊所', description: '建立生育诊所。', category: 'housing', era: '星系际', reqs: { housing: 7, xeno: 6 }, grant: ['housing', 8], costs: { Knowledge: 6000000, Vitreloy: 200000 }, effect: '提升人口增长。' },

  // ===== 太空船坞补充 =====

  { id: 'ship_fusion', name: '舰船聚变', description: '为舰船装备聚变引擎。', category: 'space_militarization', era: '太阳系', reqs: { syard_engine: 1 }, grant: ['syard_engine', 2], costs: { Knowledge: 500000 }, effect: '提升舰船速度。' },
  { id: 'ship_elerium', name: '舰船埃勒里', description: '为舰船装备埃勒里。', category: 'space_militarization', era: '太阳系', reqs: { syard_weapon: 3 }, grant: ['syard_weapon', 4], costs: { Knowledge: 880000, Elerium: 2500 }, effect: '提升舰船武器威力。' },
  { id: 'photon_engine', name: '光子引擎', description: '研发光子引擎。', category: 'space_militarization', era: '太阳系', reqs: { syard_engine: 1 }, grant: ['syard_engine', 2], costs: { Knowledge: 500000 }, effect: '解锁光子引擎。' },
  { id: 'vacuum_drive', name: '真空驱动', description: '研发真空驱动。', category: 'space_militarization', era: '太阳系', reqs: { syard_engine: 3 }, grant: ['syard_engine', 4], costs: { Knowledge: 1200000 }, effect: '解锁真空驱动。' },
  { id: 'elerium_extraction', name: '埃勒里提取', description: '提取埃勒里资源。', category: 'mining', era: '太阳系', reqs: { elerium: 1 }, grant: ['elerium', 2], costs: { Knowledge: 300000 }, effect: '提升埃勒里提取效率。' },
  { id: 'elerium_prospecting', name: '埃勒里勘探', description: '勘探埃勒里资源。', category: 'space_mining', era: '星际', reqs: { elerium: 2 }, grant: ['elerium', 3], costs: { Knowledge: 400000 }, effect: '提升埃勒里勘探效率。' },

  // ===== Edenic/Asphodel 补充 =====

  { id: 'research_station', name: '研究站', description: '建造研究站。', category: 'science', era: '存在', reqs: { asphodel: 2 }, grant: ['asphodel', 3], costs: { Knowledge: 61250000, Asphodel_Powder: 2500 }, effect: '解锁研究站建筑。' },
  { id: 'edenic_bunker', name: '伊甸地堡', description: '建造伊甸地堡。', category: 'military', era: '存在', reqs: { asphodel: 8 }, grant: ['asphodel', 9], costs: { Knowledge: 77500000, Omniscience: 12000 }, effect: '解锁伊甸地堡建筑。' },

  // ===== Elysium 补充 =====

  { id: 'outer_plane_study', name: '外层位面研究', description: '研究外层位面。', category: 'science', era: '存在', reqs: { asphodel: 3, science: 22 }, grant: ['elysium', 1], costs: { Knowledge: 75000000, Omniscience: 11655 }, effect: '解锁外层位面研究。' },
  { id: 'fire_support_base', name: '火力支援基地', description: '建造火力支援基地。', category: 'military', era: '存在', reqs: { elysium: 7 }, grant: ['elysium', 8], costs: { Knowledge: 100000000, Omniscience: 22500 }, effect: '解锁火力支援基地。' },
  { id: 'pillbox', name: '碉堡', description: '建造碉堡。', category: 'military', era: '存在', reqs: { elysium: 8 }, grant: ['elysium', 9], costs: { Knowledge: 102500000, Omniscience: 23500 }, effect: '解锁碉堡建筑。' },
  { id: 'reincarnation', name: '轮回', description: '研究轮回转世。', category: 'housing', era: '存在', reqs: { elysium: 16 }, grant: ['elysium', 17], costs: { Knowledge: 130000000, Omniscience: 40000 }, effect: '解锁轮回系统。' },

  // ===== 地狱/Portal 补充 =====

  { id: 'codex_infernium', name: '地狱法典', description: '研究地狱法典。', category: 'progress', era: '维度', reqs: { hell_ruins: 3 }, grant: ['hell_ruins', 4], costs: { Knowledge: 23500000, Codex: 1 }, effect: '解锁地狱知识。' },
  { id: 'infernium_power', name: '地狱火发电', description: '使用地狱火发电。', category: 'power_generation', era: '维度', reqs: { infernite: 2, high_tech: 18 }, grant: ['infernium', 1], costs: { Knowledge: 30000000, Infernite: 50000 }, effect: '解锁地狱火发电。' },

  // ===== 镐链补充 =====

  { id: 'jackhammer_mk2', name: '风镐 Mk2', description: '升级风镐。', category: 'mining', era: '全球化', reqs: { mining: 5, high_tech: 5 }, grant: ['mining', 6], costs: { Knowledge: 80000, Alloy: 500 }, effect: '提升采矿效率。' },
  { id: 'adamantite_hammer', name: '精金锤', description: '制造精金锤。', category: 'mining', era: '星际', reqs: { mining: 7, alpha: 2 }, grant: ['mining', 8], costs: { Knowledge: 500000, Adamantite: 10000 }, effect: '大幅提升采矿效率。' },
  { id: 'elysanite_hammer', name: '伊利桑奈特锤', description: '制造伊利桑奈特锤。', category: 'mining', era: '存在', reqs: { mining: 8, elysium: 6 }, grant: ['mining', 9], costs: { Knowledge: 95000000, Omniscience: 20000, Elysanite: 50000000 }, effect: '顶级采矿效率。' },

  // ===== 锄头补充 =====

  { id: 'adamantite_hoe', name: '精金锄', description: '制造精金锄头。', category: 'agriculture', era: '星际', reqs: { hoe: 4, alpha: 2 }, grant: ['hoe', 5], costs: { Knowledge: 550000, Adamantite: 10000 }, effect: '进一步提升耕作效率。' },

  // ===== 斧头补充 =====

  { id: 'chainsaws', name: '电锯', description: '制造电锯。', category: 'lumber_gathering', era: '星际', reqs: { axe: 5, high_tech: 12 }, grant: ['axe', 6], costs: { Knowledge: 600000, Elerium: 100 }, effect: '大幅提升伐木效率。' },

  // ===== 冶炼补充 =====

  { id: 'rotary_kiln', name: '回转窑', description: '建造回转窑。', category: 'mining', era: '工业化', reqs: { smelting: 4 }, grant: ['smelting', 5], costs: { Knowledge: 50000 }, effect: '提升冶炼效率。' },
  { id: 'kroll_process', name: '克罗尔法', description: '使用克罗尔法冶炼。', category: 'mining', era: '全球化', reqs: { smelting: 5, high_tech: 6 }, grant: ['smelting', 6], costs: { Knowledge: 95000 }, effect: '解锁克罗尔法冶炼。' },
  { id: 'cambridge_process', name: '剑桥法', description: '使用剑桥法冶炼。', category: 'mining', era: '早期太空', reqs: { smelting: 6, space: 3 }, grant: ['smelting', 7], costs: { Knowledge: 160000 }, effect: '解锁剑桥法冶炼。' },
  { id: 'mercury_smelting', name: '汞冶炼', description: '冶炼汞金属。', category: 'mining', era: '早期太空', reqs: { smelting: 6 }, grant: ['smelting', 7], costs: { Knowledge: 180000 }, effect: '解锁汞冶炼。' },
  { id: 'iridium_smelting', name: '铱冶炼', description: '冶炼铱金属。', category: 'mining', era: '早期太空', reqs: { smelting: 6 }, grant: ['smelting', 7], costs: { Knowledge: 200000 }, effect: '解锁铱冶炼。' },

  // ===== 疾病系统补充 =====

  { id: 'infectious_disease_lab', name: '传染病实验室', description: '建造传染病实验室。', category: 'science', era: 'Tauceti', reqs: { disease: 1 }, grant: ['disease', 2], costs: { Knowledge: 8000000 }, effect: '解锁传染病实验室。' },
  { id: 'isolation_protocol', name: '隔离协议', description: '实施隔离协议。', category: 'plague', era: 'Tauceti', reqs: { disease: 2 }, grant: ['disease', 3], costs: { Knowledge: 8500000 }, effect: '实施隔离措施。' },
  { id: 'focus_cure', name: '集中治疗', description: '集中力量研发治疗方法。', category: 'plague', era: 'Tauceti', reqs: { disease: 2 }, grant: ['disease', 3], costs: { Knowledge: 8500000 }, effect: '加速疾病研究。' },

  // ===== AI/Tech 补充 =====

  { id: 'ai_optimizations', name: 'AI 优化', description: '使用 AI 优化系统。', category: 'science', era: '太阳系', reqs: { high_tech: 15 }, grant: ['high_tech', 16], costs: { Knowledge: 5000000 }, effect: 'AI 优化各项系统。' },
  { id: 'synthetic_life', name: '合成生命', description: '创造合成生命。', category: 'science', era: '太阳系', reqs: { high_tech: 16 }, grant: ['high_tech', 17], costs: { Knowledge: 8000000 }, effect: '解锁合成生命技术。' },
  { id: 'cybernetics', name: '控制论', description: '研究人机融合技术。', category: 'science', era: '维度', reqs: { high_tech: 18 }, grant: ['cybernetics', 1], costs: { Knowledge: 28000000 }, effect: '解锁控制论升级。' },
  { id: 'divinity', name: '神性', description: '追求神性。', category: 'religion', era: '存在', reqs: { theology: 5, science: 20 }, grant: ['divinity', 1], costs: { Knowledge: 80000000, Omniscience: 20000 }, effect: '接近神性。' },
  { id: 'virtual_reality', name: '虚拟现实', description: '开发虚拟现实技术。', category: 'science', era: '全球化', reqs: { high_tech: 6 }, grant: ['high_tech', 7], costs: { Knowledge: 120000 }, effect: '解锁虚拟现实系统。' },
  { id: 'digital_paradise', name: '数字天堂', description: '创造数字天堂。', category: 'science', era: '存在', reqs: { high_tech: 19, elysium: 15 }, grant: ['elysium', 16], costs: { Knowledge: 125000000, Omniscience: 37250 }, effect: '解锁数字天堂。' },

  // ===== 星际补充 =====

  { id: 'interstellar', name: '星际', description: '开始星际探索。', category: 'space_exploration', era: '深空', reqs: { genesis: 3 }, grant: ['genesis', 4], costs: { Knowledge: 400000 }, effect: '解锁星际探索。' },
  { id: 'wormholes', name: '虫洞', description: '研究虫洞技术。', category: 'science', era: '星系际', reqs: { high_tech: 15 }, grant: ['high_tech', 16], costs: { Knowledge: 5000000 }, effect: '解锁虫洞旅行。' },
  { id: 'gateway_depot', name: '网关仓库', description: '建造网关仓库。', category: 'storage', era: '星系际', reqs: { gateway: 5 }, grant: ['gateway', 6], costs: { Knowledge: 4000000, Neutronium: 80000, Stanene: 500000 }, effect: '提供大量存储容量。' },
];

function dedupeTechDefinitions(techs: TechDefinition[]): TechDefinition[] {
  const seen = new Set<string>();
  const result: TechDefinition[] = [];

  for (const tech of techs) {
    if (seen.has(tech.id)) continue;
    seen.add(tech.id);
    result.push(tech);
  }

  return result;
}

export const BASIC_TECHS: TechDefinition[] = dedupeTechDefinitions(RAW_BASIC_TECHS);
