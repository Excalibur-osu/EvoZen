/**
 * 特质完整数据 — 对标 legacy races.js L240-4990
 *
 * 包含所有 165 个特质的元信息：
 *   - type: genus / major / minor / special
 *   - origin: 来源种族 / genus
 *   - taxonomy: utility / resource / combat / production
 *   - val: 平衡分值（用于自定义种族计分）
 *   - desc: 描述（中文）
 *   - vars: 各 rank 的数值表（部分特质有）
 *
 * 实际效果实装散布在各模块（traits.ts, military.ts, morale.ts, tick.ts 等）。
 */

export type TraitType = 'genus' | 'major' | 'minor' | 'special';
export type TraitTaxonomy = 'utility' | 'resource' | 'combat' | 'production' | '';

export interface TraitDefinition {
  name: string;
  type: TraitType;
  /** 来源 genus 或种族 */
  origin: string;
  taxonomy: TraitTaxonomy;
  /** 平衡分值，用于自定义种族 */
  val: number;
  /** 中文描述 */
  desc: string;
  /** 各 rank 的数值表（rank 1 = 默认） */
  ranks?: Record<number, number[]>;
}

/**
 * 完整特质数据表（对标 legacy races.js traits 对象）
 * rank 表只记录 rank=1 默认值，更多 rank（0.1/0.25/0.5/2/3/4）按需扩充
 */
export const TRAITS: Record<string, TraitDefinition> = {
  // ========== genus 特质 ==========
  adaptable: { name: '适应性', type: 'genus', origin: 'humanoid', taxonomy: 'utility', val: 3, desc: '基因突变更快。', ranks: { 1: [10] } },
  wasteful: { name: '浪费', type: 'genus', origin: 'humanoid', taxonomy: 'resource', val: -3, desc: '制造产线消耗更多材料。', ranks: { 1: [10] } },
  xenophobic: { name: '排外', type: 'genus', origin: '', taxonomy: 'resource', val: -5, desc: '贸易站每座 -1 贸易额度。' },
  carnivore: { name: '肉食', type: 'genus', origin: 'carnivore', taxonomy: 'resource', val: 3, desc: '没有农业科技路径，失业者自动成为猎人。', ranks: { 1: [50] } },
  beast: { name: '野兽', type: 'genus', origin: 'carnivore', taxonomy: 'resource', val: 2, desc: '狩猎与士兵训练改善。', ranks: { 1: [8, 15, 10] } },
  cautious: { name: '谨慎', type: 'genus', origin: 'carnivore', taxonomy: 'combat', val: -2, desc: '雨天降低战斗力。', ranks: { 1: [10] } },
  herbivore: { name: '草食', type: 'genus', origin: 'herbivore', taxonomy: 'resource', val: -7, desc: '狩猎不产生食物。' },
  instinct: { name: '本能', type: 'genus', origin: '', taxonomy: 'utility', val: 5, desc: '回避危险。', ranks: { 1: [10, 50] } },
  forager: { name: '采集', type: 'genus', origin: 'hybrid', taxonomy: 'resource', val: 4, desc: '什么都吃。', ranks: { 1: [100] } },
  small: { name: '小型', type: 'genus', origin: 'small', taxonomy: 'utility', val: 6, desc: '减少成本递增系数 0.01。' },
  weak: { name: '虚弱', type: 'genus', origin: 'small', taxonomy: 'resource', val: -3, desc: '伐木工、矿工、采石工产出 -10%。' },
  large: { name: '大型', type: 'genus', origin: 'giant', taxonomy: 'utility', val: -5, desc: '增加成本递增系数 0.005。' },
  strong: { name: '强壮', type: 'genus', origin: 'giant', taxonomy: 'resource', val: 5, desc: '手动收集产出增加。' },
  cold_blooded: { name: '冷血', type: 'genus', origin: 'reptilian', taxonomy: 'production', val: -2, desc: '天气影响产出。' },
  scales: { name: '鳞甲', type: 'genus', origin: 'reptilian', taxonomy: 'combat', val: 5, desc: '战斗中士兵阵亡减少。' },
  flier: { name: '飞行', type: 'genus', origin: 'avian', taxonomy: 'resource', val: 3, desc: '使用粘土代替石头/水泥。' },
  hollow_bones: { name: '空骨', type: 'genus', origin: 'avian', taxonomy: 'resource', val: 2, desc: '建筑需要更少合成材料。' },
  sky_lover: { name: '爱天', type: 'genus', origin: 'avian', taxonomy: 'utility', val: -2, desc: '采矿类工作压力增加。' },
  rigid: { name: '僵硬', type: 'genus', origin: 'avian', taxonomy: 'resource', val: -2, desc: '工匠产出略降。' },
  high_pop: { name: '高人口', type: 'genus', origin: 'insectoid', taxonomy: 'utility', val: 3, desc: '人口更多但每个人产出更低。', ranks: { 1: [4, 100] } },
  fast_growth: { name: '快速繁殖', type: 'genus', origin: 'insectoid', taxonomy: 'utility', val: 2, desc: '人口增长几率大幅提升。' },
  high_metabolism: { name: '高代谢', type: 'genus', origin: 'insectoid', taxonomy: 'utility', val: -1, desc: '食物需求 +5%。' },
  photosynth: { name: '光合', type: 'genus', origin: 'plant', taxonomy: 'utility', val: 3, desc: '阳光下减少食物消耗。' },
  sappy: { name: '树液', type: 'genus', origin: 'plant', taxonomy: 'resource', val: 4, desc: '石头被琥珀取代。' },
  asymmetrical: { name: '不对称', type: 'genus', origin: 'plant', taxonomy: 'utility', val: -3, desc: '贸易卖价更差。' },
  detritivore: { name: '碎屑食', type: 'genus', origin: 'fungi', taxonomy: 'utility', val: 2, desc: '以腐败物质为食。' },
  spores: { name: '孢子', type: 'genus', origin: 'fungi', taxonomy: 'utility', val: 2, desc: '风天增加生育率。' },
  spongy: { name: '海绵', type: 'genus', origin: 'fungi', taxonomy: 'utility', val: -2, desc: '雨天降低生育率。' },
  submerged: { name: '水下', type: 'genus', origin: 'aquatic', taxonomy: 'utility', val: 3, desc: '免疫天气效应。' },
  low_light: { name: '低光', type: 'genus', origin: 'aquatic', taxonomy: 'resource', val: -2, desc: '农业效率降低。' },
  elusive: { name: '难捉', type: 'genus', origin: 'fey', taxonomy: 'utility', val: 7, desc: '间谍永不被抓。' },
  iron_allergy: { name: '铁过敏', type: 'genus', origin: 'fey', taxonomy: 'resource', val: -4, desc: '铁矿产出减少。' },
  smoldering: { name: '炽热', type: 'genus', origin: 'heat', taxonomy: 'production', val: 7, desc: '热天加成。' },
  cold_intolerance: { name: '畏寒', type: 'genus', origin: 'heat', taxonomy: 'production', val: -4, desc: '冷天产出降低。' },
  chilled: { name: '寒冷', type: 'genus', origin: 'polar', taxonomy: 'production', val: 7, desc: '冷天加成。' },
  heat_intolerance: { name: '畏热', type: 'genus', origin: 'polar', taxonomy: 'production', val: -4, desc: '热天产出降低。' },
  scavenger: { name: '拾荒', type: 'genus', origin: 'sand', taxonomy: 'production', val: 3, desc: '总是有拾荒者岗位。' },
  nomadic: { name: '游牧', type: 'genus', origin: 'sand', taxonomy: 'utility', val: -5, desc: '贸易站 -1 贸易额度。' },
  immoral: { name: '不道德', type: 'genus', origin: 'demonic', taxonomy: 'utility', val: 4, desc: '战狂改为加成。' },
  evil: { name: '邪恶', type: 'genus', origin: 'demonic', taxonomy: 'utility', val: 0, desc: '你是纯粹的邪恶。' },
  blissful: { name: '极乐', type: 'genus', origin: 'angelic', taxonomy: 'utility', val: 3, desc: '低士气惩罚减半，市民从不暴动。' },
  pompous: { name: '自大', type: 'genus', origin: 'angelic', taxonomy: 'utility', val: -6, desc: '教授效率降低。' },
  holy: { name: '圣洁', type: 'genus', origin: 'angelic', taxonomy: 'combat', val: 4, desc: '地狱中战斗加成。' },

  // ========== major 特质（每种族 2-3 个）==========
  creative: { name: '创造力', type: 'major', origin: 'human', taxonomy: 'resource', val: 8, desc: 'ARPA 项目更便宜。', ranks: { 1: [0.005, 20] } },
  diverse: { name: '多样性', type: 'major', origin: 'human', taxonomy: 'combat', val: -4, desc: '训练士兵耗时更长。', ranks: { 1: [25] } },
  studious: { name: '好学', type: 'major', origin: 'elven', taxonomy: 'utility', val: 2, desc: '教授额外 +0.25 知识/秒，图书馆 +10% 知识上限。', ranks: { 1: [0.25, 10] } },
  arrogant: { name: '傲慢', type: 'major', origin: 'elven', taxonomy: 'resource', val: -2, desc: '市场价格更高。', ranks: { 1: [10] } },
  brute: { name: '野蛮', type: 'major', origin: 'orc', taxonomy: 'combat', val: 7, desc: '征兵费用减半。', ranks: { 1: [50, 100] } },
  angry: { name: '易怒', type: 'major', origin: 'orc', taxonomy: 'production', val: -1, desc: '饥饿时产出惩罚更严重。', ranks: { 1: [25] } },
  lazy: { name: '懒惰', type: 'major', origin: 'cath', taxonomy: 'production', val: -4, desc: '热天所有产出降低。', ranks: { 1: [10] } },
  curious: { name: '好奇', type: 'major', origin: 'cath', taxonomy: 'utility', val: 4, desc: '大学上限随人口增加，好奇随机事件。', ranks: { 1: [0.1] } },
  pack_mentality: { name: '群居心态', type: 'major', origin: 'wolven', taxonomy: 'utility', val: 4, desc: '小屋更贵，村舍更便宜。', ranks: { 1: [0.03, 0.02] } },
  tracker: { name: '追踪者', type: 'major', origin: 'wolven', taxonomy: 'resource', val: 2, desc: '狩猎收益 +20%。', ranks: { 1: [20] } },
  playful: { name: '玩乐', type: 'major', origin: 'vulpine', taxonomy: 'production', val: 5, desc: '猎人开心。', ranks: { 1: [0.5] } },
  freespirit: { name: '自由灵魂', type: 'major', origin: 'vulpine', taxonomy: 'production', val: -3, desc: '常规工作压力更大。', ranks: { 1: [50] } },
  beast_of_burden: { name: '驮兽', type: 'major', origin: 'centaur', taxonomy: 'combat', val: 3, desc: '袭击战利品更多。' },
  sniper: { name: '神射手', type: 'major', origin: 'centaur', taxonomy: 'combat', val: 6, desc: '武器升级更强效。', ranks: { 1: [8] } },
  hooved: { name: '蹄足', type: 'major', origin: 'centaur', taxonomy: 'utility', val: -4, desc: '需要特殊鞋具。', ranks: { 1: [100] } },
  rage: { name: '狂暴', type: 'major', origin: 'rhinotaur', taxonomy: 'combat', val: 4, desc: '受伤士兵爆发额外威力。', ranks: { 1: [1, 50] } },
  heavy: { name: '沉重', type: 'major', origin: 'rhinotaur', taxonomy: 'utility', val: -4, desc: '部分成本上升。' },
  gnawer: { name: '啃咬', type: 'major', origin: 'capybara', taxonomy: 'resource', val: -1, desc: '人口啃咬消耗木材。' },
  calm: { name: '平静', type: 'major', origin: 'capybara', taxonomy: 'production', val: 6, desc: '内心如禅般平和。' },
  pack_rat: { name: '囤积癖', type: 'major', origin: 'kobold', taxonomy: 'resource', val: 3, desc: '储存空间增加。', ranks: { 1: [10] } },
  paranoid: { name: '偏执', type: 'major', origin: 'kobold', taxonomy: 'resource', val: -3, desc: '银行容量 -10%。', ranks: { 1: [10] } },
  greedy: { name: '贪婪', type: 'major', origin: 'goblin', taxonomy: 'resource', val: -5, desc: '税收收入降低。', ranks: { 1: [12.5] } },
  merchant: { name: '商人', type: 'major', origin: 'goblin', taxonomy: 'resource', val: 3, desc: '商品卖价更好。', ranks: { 1: [25] } },
  smart: { name: '聪明', type: 'major', origin: 'gnome', taxonomy: 'utility', val: 6, desc: '知识成本 -10%。', ranks: { 1: [10] } },
  puny: { name: '弱小', type: 'major', origin: 'gnome', taxonomy: 'combat', val: -4, desc: '军队评分下界降低。', ranks: { 1: [60] } },
  dumb: { name: '愚钝', type: 'major', origin: 'ogre', taxonomy: 'utility', val: -5, desc: '知识成本 +5%。', ranks: { 1: [5] } },
  tough: { name: '强韧', type: 'major', origin: 'ogre', taxonomy: 'resource', val: 4, desc: '采矿产出 +25%。', ranks: { 1: [25] } },
  nearsighted: { name: '近视', type: 'major', origin: 'cyclops', taxonomy: 'utility', val: -4, desc: '图书馆效率降低。', ranks: { 1: [25] } },
  intelligent: { name: '聪慧', type: 'major', origin: 'cyclops', taxonomy: 'production', val: 7, desc: '教授和科学家提供全球产出加成。', ranks: { 1: [0.25, 0.125] } },
  regenerative: { name: '再生', type: 'major', origin: 'troll', taxonomy: 'combat', val: 8, desc: '伤员愈合速度 ×4。', ranks: { 1: [4] } },
  gluttony: { name: '暴食', type: 'major', origin: 'troll', taxonomy: 'resource', val: -2, desc: '食物消耗 +10%。' },
  slow: { name: '迟缓', type: 'major', origin: 'tortoisan', taxonomy: 'utility', val: -6, desc: '游戏节奏慢 10%。', ranks: { 1: [10] } },
  armored: { name: '装甲', type: 'major', origin: 'tortoisan', taxonomy: 'combat', val: 4, desc: '战斗中士兵阵亡减少。', ranks: { 1: [25] } },
  optimistic: { name: '乐观', type: 'major', origin: 'gecko', taxonomy: 'production', val: 3, desc: '小幅减压。', ranks: { 1: [0.5] } },
  chameleon: { name: '变色', type: 'major', origin: 'gecko', taxonomy: 'combat', val: 6, desc: '兵营容纳更少士兵但更隐蔽。' },
  slow_digestion: { name: '缓慢消化', type: 'major', origin: 'slitheryn', taxonomy: 'production', val: 1, desc: '抗饥饿能力增强。' },
  astrologer: { name: '占星师', type: 'major', origin: 'slitheryn', taxonomy: 'utility', val: 3, desc: '占星效应增强。', ranks: { 1: [2] } },
  hard_of_hearing: { name: '耳背', type: 'major', origin: 'slitheryn', taxonomy: 'utility', val: -3, desc: '大学科学上限 -5%。', ranks: { 1: [5] } },
  resourceful: { name: '机智', type: 'major', origin: 'arraak', taxonomy: 'resource', val: 4, desc: '工匠成本略减。', ranks: { 1: [5] } },
  selenophobia: { name: '惧月', type: 'major', origin: 'arraak', taxonomy: 'production', val: -6, desc: '月相直接影响生产。' },
  leathery: { name: '皮革', type: 'major', origin: 'pterodacti', taxonomy: 'production', val: 2, desc: '部分天气士气惩罚减少。' },
  pessimistic: { name: '悲观', type: 'major', origin: 'pterodacti', taxonomy: 'production', val: -1, desc: '小幅增压。' },
  hoarder: { name: '囤积者', type: 'major', origin: 'dracnid', taxonomy: 'resource', val: 4, desc: '银行存款 +20%。', ranks: { 1: [20] } },
  solitary: { name: '独居', type: 'major', origin: 'dracnid', taxonomy: 'utility', val: -1, desc: '小屋便宜，村舍变贵。' },
  kindling_kindred: { name: '取暖者', type: 'major', origin: 'entish', taxonomy: 'resource', val: 8, desc: '木材不再是资源，其他建筑成本增加补偿。' },
  iron_wood: { name: '铁木', type: 'major', origin: 'entish', taxonomy: 'resource', val: 4, desc: '移除胶合板资源，获得攻击加成。' },
  pyrophobia: { name: '惧火', type: 'major', origin: 'entish', taxonomy: 'resource', val: -4, desc: '熔炉产出减少。' },
  catnip: { name: '猫薄荷', type: 'major', origin: 'entish', taxonomy: 'production', val: 1, desc: '吸引猫科。' },
  hyper: { name: '亢奋', type: 'major', origin: 'cacti', taxonomy: 'utility', val: 4, desc: '游戏节奏快 5%。' },
  skittish: { name: '惊慌', type: 'major', origin: 'cacti', taxonomy: 'production', val: -4, desc: '雷暴降低所有产出。' },
  fragrant: { name: '芳香', type: 'major', origin: 'pinguicula', taxonomy: 'resource', val: -3, desc: '狩猎效率降低。' },
  sticky: { name: '黏', type: 'major', origin: 'pinguicula', taxonomy: 'combat', val: 3, desc: '食物需求降低，战斗力提升。' },
  anise: { name: '茴香', type: 'major', origin: 'pinguicula', taxonomy: 'production', val: 1, desc: '吸引狗类。' },
  infectious: { name: '传染', type: 'major', origin: 'sporgar', taxonomy: 'combat', val: 4, desc: '攻击有几率感染敌方扩张人口。' },
  parasite: { name: '寄生', type: 'major', origin: 'sporgar', taxonomy: 'combat', val: -4, desc: '只能通过感染受害者繁殖。' },
  toxic: { name: '剧毒', type: 'major', origin: 'shroomi', taxonomy: 'resource', val: 5, desc: '工厂工作产出更高。', ranks: { 1: [20] } },
  nyctophilia: { name: '喜暗', type: 'major', origin: 'shroomi', taxonomy: 'production', val: -3, desc: '晴天损失产出。' },
  infiltrator: { name: '渗透者', type: 'major', origin: 'moldling', taxonomy: 'utility', val: 4, desc: '间谍便宜，有时窃取敌国科技。' },
  hibernator: { name: '冬眠者', type: 'major', origin: 'moldling', taxonomy: 'production', val: -3, desc: '冬季活动量降低。' },
  cannibalize: { name: '同类相食', type: 'major', origin: 'mantis', taxonomy: 'utility', val: 5, desc: '吃同类获得增益。' },
  frail: { name: '脆弱', type: 'major', origin: 'mantis', taxonomy: 'combat', val: -2, desc: '战斗中士兵阵亡增加。' },
  malnutrition: { name: '营养不良', type: 'major', origin: 'mantis', taxonomy: 'production', val: 1, desc: '配给惩罚减弱。' },
  claws: { name: '钳爪', type: 'major', origin: 'scorpid', taxonomy: 'combat', val: 5, desc: '军队评分上界提升。' },
  atrophy: { name: '萎缩', type: 'major', origin: 'scorpid', taxonomy: 'production', val: -1, desc: '更容易饿死。' },
  hivemind: { name: '蜂群意志', type: 'major', origin: 'antid', taxonomy: 'production', val: 9, desc: '岗位人数少则产出降低，多则提升。' },
  tunneler: { name: '挖掘者', type: 'major', origin: 'antid', taxonomy: 'utility', val: 2, desc: '矿洞和煤矿更便宜。' },
  blood_thirst: { name: '嗜血', type: 'major', origin: 'sharkin', taxonomy: 'combat', val: 5, desc: '战斗带来临时士气提升。' },
  apex_predator: { name: '顶级掠食者', type: 'major', origin: 'sharkin', taxonomy: 'combat', val: 6, desc: '狩猎和战斗评分显著提升，但不能用护甲。' },
  invertebrate: { name: '无脊椎', type: 'major', origin: 'octigoran', taxonomy: 'combat', val: -2, desc: '你没有骨骼。' },
  suction_grip: { name: '吸盘抓握', type: 'major', origin: 'octigoran', taxonomy: 'production', val: 4, desc: '全球生产加成。' },
  befuddle: { name: '迷惑', type: 'major', origin: 'dryad', taxonomy: 'utility', val: 4, desc: '间谍行动耗时减半。' },
  environmentalist: { name: '环保主义', type: 'major', origin: 'dryad', taxonomy: 'utility', val: -5, desc: '使用可再生能源代替煤油电厂。' },
  unorganized: { name: '无组织', type: 'major', origin: 'satyr', taxonomy: 'utility', val: -2, desc: '革命间隔时间增加。' },
  musical: { name: '音乐家', type: 'major', origin: 'satyr', taxonomy: 'production', val: 5, desc: '艺人效率提升。' },
  revive: { name: '复活', type: 'major', origin: 'phoenix', taxonomy: 'combat', val: 4, desc: '士兵有时自我复活。' },
  slow_regen: { name: '缓慢再生', type: 'major', origin: 'phoenix', taxonomy: 'combat', val: -4, desc: '士兵伤口愈合较慢。' },
  forge: { name: '锻造', type: 'major', origin: 'salamander', taxonomy: 'utility', val: 4, desc: '熔炉不需要燃料，提升地热能。' },
  autoignition: { name: '自燃', type: 'major', origin: 'salamander', taxonomy: 'utility', val: -4, desc: '图书馆知识加成降低。' },
  blurry: { name: '模糊', type: 'major', origin: 'yeti', taxonomy: 'utility', val: 5, desc: '间谍成功率提升。' },
  snowy: { name: '雪天', type: 'major', origin: 'yeti', taxonomy: 'production', val: -3, desc: '非雪天损失士气。' },
  ravenous: { name: '饕餮', type: 'major', origin: 'wendigo', taxonomy: 'resource', val: -5, desc: '极大增加食物消耗。' },
  ghostly: { name: '幽灵', type: 'major', origin: 'wendigo', taxonomy: 'utility', val: 5, desc: '狩猎和灵魂井获得更多灵魂，灵魂宝石掉率提升。' },
  lawless: { name: '无法', type: 'major', origin: 'tuskin', taxonomy: 'utility', val: 3, desc: '政府切换冷却 -90%。' },
  mistrustful: { name: '多疑', type: 'major', origin: 'tuskin', taxonomy: 'utility', val: -1, desc: '与敌国关系恶化更快。' },
  humpback: { name: '驼峰', type: 'major', origin: 'kamel', taxonomy: 'resource', val: 4, desc: '抗饥饿，矿工/伐木工加成。' },
  thalassophobia: { name: '惧海', type: 'major', origin: 'kamel', taxonomy: 'utility', val: -4, desc: '码头不可用。' },
  unfavored: { name: '不利', type: 'major', origin: 'kamel', taxonomy: 'utility', val: -4, desc: '黄道带给予负效。' },
  fiery: { name: '炽焰', type: 'major', origin: 'balorg', taxonomy: 'combat', val: 10, desc: '巨大战争加成。' },
  terrifying: { name: '恐怖', type: 'major', origin: 'balorg', taxonomy: 'resource', val: 6, desc: '无人愿意与你贸易。' },
  slaver: { name: '奴隶主', type: 'major', origin: 'balorg', taxonomy: 'production', val: 12, desc: '俘虏受害者强制劳动。' },
  compact: { name: '紧凑', type: 'major', origin: 'imp', taxonomy: 'utility', val: 10, desc: '占地极小。' },
  conniving: { name: '阴谋', type: 'major', origin: 'imp', taxonomy: 'resource', val: 4, desc: '更好的贸易协议。' },
  pathetic: { name: '可怜', type: 'major', origin: 'imp', taxonomy: 'combat', val: -5, desc: '战斗极差。' },
  spiritual: { name: '虔诚', type: 'major', origin: 'seraph', taxonomy: 'production', val: 4, desc: '神殿效率 +13%。' },
  truthful: { name: '诚实', type: 'major', origin: 'seraph', taxonomy: 'resource', val: -7, desc: '银行家效率较低。' },
  unified: { name: '统一', type: 'major', origin: 'seraph', taxonomy: 'production', val: 4, desc: '起始即统一。' },
  rainbow: { name: '彩虹', type: 'major', origin: 'unicorn', taxonomy: 'production', val: 3, desc: '雨后晴天加成。' },
  gloomy: { name: '阴郁', type: 'major', origin: 'unicorn', taxonomy: 'production', val: 3, desc: '阴天加成。' },
  magnificent: { name: '华丽', type: 'major', origin: 'unicorn', taxonomy: 'utility', val: 6, desc: '建造神龛获得恩赐。' },
  noble: { name: '高贵', type: 'major', origin: 'unicorn', taxonomy: 'resource', val: -3, desc: '无法调高或调低税率。' },
  imitation: { name: '模仿', type: 'major', origin: 'synth', taxonomy: 'utility', val: 6, desc: '你是某种族的模仿体。' },
  emotionless: { name: '无情', type: 'major', origin: 'synth', taxonomy: 'production', val: -4, desc: '冷冰逻辑决定行动。' },
  logical: { name: '逻辑', type: 'major', origin: 'synth', taxonomy: 'utility', val: 6, desc: '市民产生知识。', ranks: { 1: [100, 25] } },
  shapeshifter: { name: '变形', type: 'major', origin: 'nano', taxonomy: 'utility', val: 10, desc: '正/负特质均可重塑。' },
  deconstructor: { name: '拆解者', type: 'major', origin: 'nano', taxonomy: 'utility', val: -4, desc: '部分建筑成本提高。' },
  linked: { name: '联结', type: 'major', origin: 'nano', taxonomy: 'utility', val: 4, desc: '每市民量子加成。' },
  dark_dweller: { name: '暗居', type: 'major', origin: 'ghast', taxonomy: 'resource', val: -3, desc: '部分白天产出减少。' },
  swift: { name: '迅捷', type: 'major', origin: 'ghast', taxonomy: 'combat', val: 10, desc: '战斗与捕奴加成。' },
  anthropophagite: { name: '食人', type: 'major', origin: 'ghast', taxonomy: 'utility', val: -2, desc: '食人加成。' },
  living_tool: { name: '活体工具', type: 'major', origin: 'shoggoth', taxonomy: 'resource', val: 12, desc: '工具/工匠加成。', ranks: { 1: [1, 25] } },
  bloated: { name: '臃肿', type: 'major', origin: 'shoggoth', taxonomy: 'utility', val: -10, desc: '建筑成本上升。' },
  artisan: { name: '工匠大师', type: 'major', origin: 'dwarf', taxonomy: 'resource', val: 9, desc: '自动合成 +50%。', ranks: { 1: [50, 20, 0.5] } },
  stubborn: { name: '顽固', type: 'major', origin: 'dwarf', taxonomy: 'utility', val: -5, desc: '科学类知识成本 +10%。', ranks: { 1: [10] } },
  rogue: { name: '盗贼', type: 'major', origin: 'raccoon', taxonomy: 'resource', val: 6, desc: '偶尔偷窃。' },
  untrustworthy: { name: '不可信', type: 'major', origin: 'raccoon', taxonomy: 'utility', val: -4, desc: '金融建筑额外费用。' },
  living_materials: { name: '活体材料', type: 'major', origin: 'lichen', taxonomy: 'resource', val: 6, desc: '部分材料自我复制减少下次成本。' },
  unstable: { name: '不稳定', type: 'major', origin: 'lichen', taxonomy: 'utility', val: -5, desc: '随机死亡。' },
  elemental: { name: '元素', type: 'major', origin: 'wyvern', taxonomy: 'utility', val: 5, desc: '元素亲和力。' },
  chicken: { name: '懦弱', type: 'major', origin: 'wyvern', taxonomy: 'combat', val: -8, desc: '地狱/海盗/事件更糟。' },
  tusk: { name: '尖牙', type: 'major', origin: 'narwhal', taxonomy: 'resource', val: 6, desc: '基于攻击的采矿。' },
  blubber: { name: '鲸脂', type: 'major', origin: 'narwhal', taxonomy: 'resource', val: -3, desc: '把死亡精炼为石油。' },
  ocular_power: { name: '眼能', type: 'major', origin: 'beholder', taxonomy: 'utility', val: 9, desc: '激活眼球能量。' },
  floating: { name: '漂浮', type: 'major', origin: 'beholder', taxonomy: 'production', val: -3, desc: '风天降低产出。' },
  wish: { name: '愿望', type: 'major', origin: 'djinn', taxonomy: 'utility', val: 13, desc: '可许愿。' },
  devious: { name: '狡猾', type: 'major', origin: 'djinn', taxonomy: 'resource', val: -4, desc: '贸易效率降低。' },
  grenadier: { name: '掷弹兵', type: 'major', origin: 'bombardier', taxonomy: 'combat', val: 6, desc: '士兵更强但更少。' },
  aggressive: { name: '好战', type: 'major', origin: 'bombardier', taxonomy: 'combat', val: -3, desc: '士兵自杀冲锋。' },
  blasphemous: { name: '亵渎', type: 'major', origin: 'nephilim', taxonomy: 'utility', val: -4, desc: '神殿加成被减。' },
  empowered: { name: '强化', type: 'major', origin: 'nephilim', taxonomy: 'utility', val: 8, desc: '所有特质同时激活。' },
  ooze: { name: '黏液', type: 'major', origin: 'sludge', taxonomy: 'production', val: -50, desc: '你是某种黏液，一切皆糟。' },

  // ========== special 特质 ==========
  soul_eater: { name: '食魂者', type: 'special', origin: '', taxonomy: '', val: 0, desc: '早午晚三餐都吃灵魂。' },
  untapped: { name: '未开发', type: 'special', origin: '', taxonomy: '', val: 0, desc: '未开发潜力。' },
  emfield: { name: '电磁场', type: 'special', origin: '', taxonomy: '', val: -20, desc: '身体产生扰乱电力的电磁场。' },
  fortify: { name: '强化', type: 'special', origin: '', taxonomy: '', val: 0, desc: '基因强化。' },
  mastery: { name: '掌握', type: 'special', origin: '', taxonomy: '', val: 0, desc: '掌握加速。' },

  // ========== minor 特质（轻微加成）==========
  tactical: { name: '战术', type: 'minor', origin: '', taxonomy: '', val: 0, desc: '战争加成。' },
  analytical: { name: '分析', type: 'minor', origin: '', taxonomy: '', val: 0, desc: '科学加成。' },
  promiscuous: { name: '繁殖力', type: 'minor', origin: '', taxonomy: '', val: 0, desc: '有机生物增长加成 / 合成体人口折扣。' },
  resilient: { name: '坚韧', type: 'minor', origin: '', taxonomy: '', val: 0, desc: '采煤加成。' },
  cunning: { name: '狡黠', type: 'minor', origin: '', taxonomy: '', val: 0, desc: '狩猎加成。' },
  hardy: { name: '耐劳', type: 'minor', origin: '', taxonomy: '', val: 0, desc: '工厂工人加成。' },
  ambidextrous: { name: '双手并用', type: 'minor', origin: '', taxonomy: '', val: 0, desc: '工匠加成。' },
  industrious: { name: '勤勉', type: 'minor', origin: '', taxonomy: '', val: 0, desc: '矿工加成。' },
  content: { name: '满足', type: 'minor', origin: '', taxonomy: '', val: 0, desc: '士气加成。' },
  fibroblast: { name: '愈合细胞', type: 'minor', origin: '', taxonomy: '', val: 0, desc: '愈合加成。' },
  metallurgist: { name: '冶金', type: 'minor', origin: '', taxonomy: '', val: 0, desc: '合金加成。' },
  gambler: { name: '赌徒', type: 'minor', origin: '', taxonomy: '', val: 0, desc: '赌场加成。' },
  persuasive: { name: '说服', type: 'minor', origin: '', taxonomy: '', val: 0, desc: '贸易加成。' },
};

// 自动加载完整 rank 表（覆盖 TRAITS 中仅有 rank=1 默认的 ranks）
import { attachAllRanks } from './trait-ranks';
attachAllRanks(TRAITS);

/** 获取特质的当前 rank 值数组 */
export function traitRank(traitId: string, rank: number = 1): number[] {
  const def = TRAITS[traitId];
  if (!def || !def.ranks) return [];
  return def.ranks[rank] ?? def.ranks[1] ?? [];
}

/** 判断 trait 是否为正面特质（val > 0） */
export function isPositiveTrait(traitId: string): boolean {
  const def = TRAITS[traitId];
  return def ? def.val > 0 : false;
}

/** 获取所有 genus 类型特质 */
export function getGenusTraits(): string[] {
  return Object.entries(TRAITS).filter(([, def]) => def.type === 'genus').map(([id]) => id);
}

/** 获取所有 major 类型特质 */
export function getMajorTraits(): string[] {
  return Object.entries(TRAITS).filter(([, def]) => def.type === 'major').map(([id]) => id);
}

/** 获取所有 minor 类型特质（基因技术解锁） */
export function getMinorTraits(): string[] {
  return Object.entries(TRAITS).filter(([, def]) => def.type === 'minor').map(([id]) => id);
}

/** 获取某起源的所有特质 */
export function getTraitsByOrigin(origin: string): string[] {
  return Object.entries(TRAITS).filter(([, def]) => def.origin === origin).map(([id]) => id);
}
