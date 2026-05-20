/**
 * 完整种族系统 — 对标 legacy/src/races.js
 *
 * 包含：
 *   - 19 个 genus（属类）与其默认特质
 *   - 60+ 种族定义（覆盖所有原版可选种族）
 *   - basic() 解锁条件（生物群落/biome 限制）
 *
 * 与原版差异：
 *   - 移除 alt skins（节日皮肤）
 *   - locale 文本统一中文化
 *   - 不依赖 global，所有数据为纯定义
 */

import type { GameState } from '@evozen/shared-types';

// ============================================================
// Genus（属类）定义
// ============================================================

export type GenusId =
  | 'humanoid'
  | 'carnivore'
  | 'herbivore'
  | 'omnivore'
  | 'small'
  | 'giant'
  | 'reptilian'
  | 'avian'
  | 'insectoid'
  | 'plant'
  | 'fungi'
  | 'aquatic'
  | 'fey'
  | 'heat'
  | 'polar'
  | 'sand'
  | 'demonic'
  | 'angelic'
  | 'synthetic'
  | 'eldritch'
  | 'hybrid'
  | 'organism';

export interface GenusDefinition {
  id: GenusId;
  name: string;
  traits: Record<string, number>;
  oppose: GenusId[];
}

/** 对标 legacy races.js L85-238 genus_def */
export const GENUS_DEFS: Record<GenusId, GenusDefinition> = {
  organism: { id: 'organism', name: '原生质', traits: {}, oppose: [] },
  humanoid: { id: 'humanoid', name: '人形',     traits: { adaptable: 1, wasteful: 1 },                                  oppose: ['fungi'] },
  carnivore: { id: 'carnivore', name: '食肉动物', traits: { carnivore: 1, beast: 1, cautious: 1 },                       oppose: ['herbivore'] },
  herbivore: { id: 'herbivore', name: '食草动物', traits: { herbivore: 1, instinct: 1 },                                 oppose: ['carnivore'] },
  omnivore:  { id: 'omnivore',  name: '杂食动物', traits: { forager: 1, beast: 1, cautious: 1, instinct: 1 },           oppose: [] },
  small:     { id: 'small',     name: '小型',     traits: { small: 1, weak: 1 },                                         oppose: ['giant'] },
  giant:     { id: 'giant',     name: '巨型',     traits: { large: 1, strong: 1 },                                       oppose: ['small'] },
  reptilian: { id: 'reptilian', name: '爬行类',   traits: { cold_blooded: 1, scales: 1 },                                oppose: ['avian'] },
  avian:     { id: 'avian',     name: '鸟类',     traits: { flier: 1, hollow_bones: 1, sky_lover: 1 },                   oppose: ['reptilian'] },
  insectoid: { id: 'insectoid', name: '昆虫类',   traits: { high_pop: 1, fast_growth: 1, high_metabolism: 1 },           oppose: ['plant'] },
  plant:     { id: 'plant',     name: '植物',     traits: { sappy: 1, asymmetrical: 1 },                                 oppose: ['insectoid'] },
  fungi:     { id: 'fungi',     name: '真菌',     traits: { detritivore: 1, spongy: 1 },                                 oppose: ['humanoid'] },
  aquatic:   { id: 'aquatic',   name: '水生',     traits: { submerged: 1, low_light: 1 },                                oppose: ['sand'] },
  fey:       { id: 'fey',       name: '精灵族',   traits: { elusive: 1, iron_allergy: 1 },                               oppose: ['eldritch', 'synthetic'] },
  heat:      { id: 'heat',      name: '热寒族',   traits: { smoldering: 1, cold_intolerance: 1 },                        oppose: ['polar'] },
  polar:     { id: 'polar',     name: '极地族',   traits: { chilled: 1, heat_intolerance: 1 },                           oppose: ['heat'] },
  sand:      { id: 'sand',      name: '沙漠族',   traits: { scavenger: 1, nomadic: 1 },                                  oppose: ['aquatic'] },
  demonic:   { id: 'demonic',   name: '恶魔族',   traits: { immoral: 1, evil: 1, soul_eater: 1 },                        oppose: ['angelic'] },
  angelic:   { id: 'angelic',   name: '天使族',   traits: { blissful: 1, pompous: 1, holy: 1 },                          oppose: ['demonic'] },
  synthetic: { id: 'synthetic', name: '合成体',   traits: { artifical: 1, powered: 1 },                                  oppose: ['eldritch', 'fey'] },
  eldritch:  { id: 'eldritch',  name: '远古族',   traits: { psychic: 1, tormented: 1, darkness: 1, unfathomable: 1 },    oppose: ['synthetic', 'fey'] },
  hybrid:    { id: 'hybrid',    name: '混血族',   traits: {},                                                            oppose: [] },
};

// ============================================================
// 种族定义
// ============================================================

export type RaceId =
  | 'protoplasm'
  | 'human' | 'elven' | 'orc'
  | 'cath' | 'wolven' | 'vulpine'
  | 'centaur' | 'rhinotaur' | 'capybara'
  | 'kobold' | 'goblin' | 'gnome'
  | 'ogre' | 'cyclops' | 'troll'
  | 'tortoisan' | 'gecko' | 'slitheryn'
  | 'arraak' | 'pterodacti' | 'dracnid'
  | 'entish' | 'cacti' | 'pinguicula'
  | 'sporgar' | 'shroomi' | 'moldling'
  | 'mantis' | 'scorpid' | 'antid'
  | 'sharkin' | 'octigoran'
  | 'dryad' | 'satyr'
  | 'phoenix' | 'salamander'
  | 'yeti' | 'wendigo'
  | 'tuskin' | 'kamel'
  | 'balorg' | 'imp'
  | 'seraph' | 'unicorn'
  | 'synth' | 'nano'
  | 'ghast' | 'shoggoth'
  | 'dwarf' | 'raccoon' | 'lichen' | 'wyvern' | 'beholder' | 'djinn' | 'narwhal' | 'bombardier' | 'nephilim'
  | 'hellspawn' | 'junker' | 'sludge' | 'ultra_sludge'
  | 'custom' | 'hybrid';

export interface RaceDefinition {
  id: RaceId;
  name: string;
  desc: string;
  /** 所属 genus（type）*/
  type: GenusId;
  /** 混血种族对应的 2 个 parent genus */
  hybrid?: GenusId[];
  /** 起源世界名称 */
  home: string;
  /** 种群体描述 */
  entity: string;
  /** 种族特质 → 等级（默认 1，Sludge 0.25，Hellspawn 4 等） */
  traits: Record<string, number>;
  /** 狂热信仰指向的特质（影响神殿加成） */
  fanaticism: string;
  /** 在基础种族选择列表中可见的条件函数 */
  basic: (state: GameState) => boolean;
}

const TRUE = () => true;
const FALSE = () => false;
const biomeRequires = (...biomes: string[]) => (state: GameState) => {
  const biome = (state.city as { biome?: string }).biome;
  return biome ? biomes.includes(biome) : false;
};

/** 完整种族表，对标 legacy races.js L4997-6417 */
export const RACES: Record<RaceId, RaceDefinition> = {
  protoplasm: { id: 'protoplasm', name: '原生质', desc: '在远古汤中蠕动的最初生命形态。', type: 'organism', home: '原始海洋', entity: '细胞', traits: {}, fanaticism: 'none', basic: FALSE },

  // humanoid
  human: { id: 'human', name: '人类', desc: '富有创造力的杂家，能制造工具、艺术与战争。', type: 'humanoid', home: '地球', entity: '人', traits: { creative: 1, diverse: 1 }, fanaticism: 'creative', basic: TRUE },
  elven: { id: 'elven', name: '精灵', desc: '长寿博学的森林子民，沉迷于知识与魔法。', type: 'humanoid', home: '青翠之地', entity: '精灵', traits: { studious: 1, arrogant: 1 }, fanaticism: 'studious', basic: TRUE },
  orc:   { id: 'orc',   name: '兽人', desc: '强壮易怒的战斗种族，以力量为荣耀。', type: 'humanoid', home: '荒野部落', entity: '兽人', traits: { brute: 1, angry: 1 }, fanaticism: 'brute', basic: TRUE },

  // carnivore
  cath:    { id: 'cath',    name: '猫族',   desc: '慵懒好奇的猫科文明，热爱研究与小憩。', type: 'carnivore', home: '阳光之地', entity: '猫人', traits: { lazy: 1, curious: 1 }, fanaticism: 'curious', basic: TRUE },
  wolven:  { id: 'wolven',  name: '狼族',   desc: '群居狩猎的狼族战士。', type: 'carnivore', home: '林海狼乡', entity: '狼人', traits: { pack_mentality: 1, tracker: 1 }, fanaticism: 'tracker', basic: TRUE },
  vulpine: { id: 'vulpine', name: '狐族',   desc: '机敏狡黠的狐狸文明，自由不羁。', type: 'carnivore', home: '迷雾森林', entity: '狐人', traits: { playful: 1, freespirit: 1 }, fanaticism: 'playful', basic: TRUE },

  // herbivore
  centaur:   { id: 'centaur',   name: '半人马', desc: '人马一体的弓箭手，奔驰如风。', type: 'herbivore', home: '平原牧场', entity: '半人马', traits: { sniper: 1, hooved: 1 }, fanaticism: 'sniper', basic: TRUE },
  rhinotaur: { id: 'rhinotaur', name: '犀牛人', desc: '愤怒时如狂风，重甲冲锋无可阻挡。', type: 'herbivore', home: '尘暴大地', entity: '犀牛人', traits: { rage: 1, heavy: 1 }, fanaticism: 'rage', basic: TRUE },
  capybara:  { id: 'capybara',  name: '水豚族', desc: '冷静而坚定的啮齿文明。', type: 'herbivore', home: '河岸水草', entity: '水豚', traits: { gnawer: 1, calm: 1 }, fanaticism: 'calm', basic: TRUE },

  // small
  kobold: { id: 'kobold', name: '狗头人', desc: '狡猾胆小的小型种族，囤积成癖。', type: 'small', home: '岩穴深处', entity: '狗头人', traits: { pack_rat: 1, paranoid: 1 }, fanaticism: 'pack_rat', basic: TRUE },
  goblin: { id: 'goblin', name: '哥布林', desc: '贪婪精明的商业奇才。', type: 'small', home: '集市废墟', entity: '哥布林', traits: { greedy: 1, merchant: 1 }, fanaticism: 'merchant', basic: TRUE },
  gnome:  { id: 'gnome',  name: '侏儒',   desc: '聪明发明家，体格弱小。', type: 'small', home: '齿轮之城', entity: '侏儒', traits: { smart: 1, puny: 1 }, fanaticism: 'smart', basic: TRUE },

  // giant
  ogre:    { id: 'ogre',    name: '食人魔', desc: '迟钝粗壮的庞然大物。', type: 'giant', home: '荒野巨穴', entity: '食人魔', traits: { dumb: 1, tough: 1 }, fanaticism: 'tough', basic: TRUE },
  cyclops: { id: 'cyclops', name: '独眼巨人', desc: '一只眼睛但充满智慧。', type: 'giant', home: '火山岛屿', entity: '独眼巨人', traits: { nearsighted: 1, intelligent: 1 }, fanaticism: 'intelligent', basic: TRUE },
  troll:   { id: 'troll',   name: '巨魔',   desc: '不死的巨大食客，再生能力惊人。', type: 'giant', home: '桥下森林', entity: '巨魔', traits: { regenerative: 1, gluttony: 1 }, fanaticism: 'regenerative', basic: TRUE },

  // reptilian
  tortoisan: { id: 'tortoisan', name: '陆龟人', desc: '披甲的缓步思考者。', type: 'reptilian', home: '苔藓平原', entity: '陆龟人', traits: { slow: 1, armored: 1 }, fanaticism: 'armored', basic: TRUE },
  gecko:     { id: 'gecko',     name: '壁虎人', desc: '乐观变色的小型爬虫。', type: 'reptilian', home: '阳光岛屿', entity: '壁虎人', traits: { optimistic: 1, chameleon: 1 }, fanaticism: 'optimistic', basic: TRUE },
  slitheryn: { id: 'slitheryn', name: '蛇人',   desc: '占星师与缓慢消化者。', type: 'reptilian', home: '沙海绿洲', entity: '蛇人', traits: { astrologer: 1, hard_of_hearing: 1, slow_digestion: 1 }, fanaticism: 'astrologer', basic: TRUE },

  // avian
  arraak:     { id: 'arraak',     name: '鸦人',     desc: '机智灵巧的鸟人。', type: 'avian', home: '巉岩巢穴', entity: '鸦人', traits: { resourceful: 1, selenophobia: 1 }, fanaticism: 'resourceful', basic: TRUE },
  pterodacti: { id: 'pterodacti', name: '翼龙人',   desc: '古老的悲观皮翼飞行者。', type: 'avian', home: '雷云之巅', entity: '翼龙人', traits: { leathery: 1, pessimistic: 1 }, fanaticism: 'leathery', basic: TRUE },
  dracnid:    { id: 'dracnid',    name: '龙裔',     desc: '独居的囤积者。', type: 'avian', home: '高山堡垒', entity: '龙裔', traits: { hoarder: 1, solitary: 1 }, fanaticism: 'hoarder', basic: TRUE },

  // plant
  entish:     { id: 'entish',     name: '树灵',     desc: '慢条斯理的会动古树。', type: 'plant', home: '远古森林', entity: '树灵', traits: { kindling_kindred: 1, pyrophobia: 1, catnip: 1 }, fanaticism: 'kindling_kindred', basic: TRUE },
  cacti:      { id: 'cacti',      name: '仙人掌人', desc: '亢奋胆怯的沙漠植物。', type: 'plant', home: '焦土荒野', entity: '仙人掌人', traits: { hyper: 1, skittish: 1 }, fanaticism: 'hyper', basic: TRUE },
  pinguicula: { id: 'pinguicula', name: '捕虫堇',   desc: '黏液与花香诱惑。', type: 'plant', home: '湿地花丛', entity: '捕虫堇', traits: { fragrant: 1, sticky: 1, anise: 1 }, fanaticism: 'sticky', basic: TRUE },

  // fungi
  sporgar:  { id: 'sporgar',  name: '孢子人', desc: '传染寄生的菌类殖民者。', type: 'fungi', home: '腐臭洞穴', entity: '孢子人', traits: { infectious: 1, parasite: 1 }, fanaticism: 'infectious', basic: FALSE },
  shroomi:  { id: 'shroomi',  name: '蘑菇人', desc: '喜爱黑暗的有毒蘑菇。', type: 'fungi', home: '地下穹顶', entity: '蘑菇人', traits: { toxic: 1, nyctophilia: 1 }, fanaticism: 'toxic', basic: TRUE },
  moldling: { id: 'moldling', name: '霉菌人', desc: '渗透潜伏的霉菌细胞群。', type: 'fungi', home: '潮湿地窖', entity: '霉菌人', traits: { infiltrator: 1, hibernator: 1 }, fanaticism: 'infiltrator', basic: TRUE },

  // insectoid
  mantis:  { id: 'mantis',  name: '螳螂人', desc: '同类相食的高速进化者。', type: 'insectoid', home: '蜂巢平原', entity: '螳螂人', traits: { cannibalize: 1, malnutrition: 1 }, fanaticism: 'cannibalize', basic: TRUE },
  scorpid: { id: 'scorpid', name: '蝎人',   desc: '钳形战士。', type: 'insectoid', home: '沙暴绿洲', entity: '蝎人', traits: { claws: 1, atrophy: 1 }, fanaticism: 'claws', basic: TRUE },
  antid:   { id: 'antid',   name: '蚁人',   desc: '蜂群心智的地下挖掘者。', type: 'insectoid', home: '巨型蚁穴', entity: '蚁人', traits: { hivemind: 1, tunneler: 1 }, fanaticism: 'hivemind', basic: TRUE },

  // aquatic
  sharkin:   { id: 'sharkin',   name: '鲨人',     desc: '嗜血的顶级海洋掠食者。', type: 'aquatic', home: '深海王座', entity: '鲨人', traits: { blood_thirst: 1, apex_predator: 1 }, fanaticism: 'blood_thirst', basic: biomeRequires('oceanic', 'swamp') },
  octigoran: { id: 'octigoran', name: '章鱼人',   desc: '柔软多腕的智慧软体动物。', type: 'aquatic', home: '深渊湾', entity: '章鱼人', traits: { invertebrate: 1, suction_grip: 1 }, fanaticism: 'suction_grip', basic: biomeRequires('oceanic', 'swamp') },

  // fey
  dryad: { id: 'dryad', name: '树精', desc: '森林守护者，迷惑入侵者。', type: 'fey', home: '永恒林谷', entity: '树精', traits: { befuddle: 1, environmentalist: 1, kindling_kindred: 1 }, fanaticism: 'befuddle', basic: biomeRequires('forest', 'swamp', 'taiga') },
  satyr: { id: 'satyr', name: '萨堤尔', desc: '酗酒奏乐的山林精灵。', type: 'fey', home: '丰收山谷', entity: '萨堤尔', traits: { unorganized: 1, musical: 1 }, fanaticism: 'musical', basic: biomeRequires('forest', 'swamp', 'taiga') },

  // heat
  phoenix:    { id: 'phoenix',    name: '凤凰族',   desc: '焚而复生的不死火鸟。', type: 'heat', home: '熔岩山脉', entity: '凤凰人', traits: { revive: 1, slow_regen: 1 }, fanaticism: 'revive', basic: biomeRequires('volcanic', 'ashland') },
  salamander: { id: 'salamander', name: '火蜥蜴族', desc: '锻造大师，自燃护身。', type: 'heat', home: '熔岩裂谷', entity: '火蜥蜴人', traits: { forge: 1, autoignition: 1 }, fanaticism: 'forge', basic: biomeRequires('volcanic', 'ashland') },

  // polar
  yeti:    { id: 'yeti',    name: '雪人',   desc: '皑皑雪山中的模糊巨人。', type: 'polar', home: '极地雪冠', entity: '雪人', traits: { blurry: 1, snowy: 1 }, fanaticism: 'blurry', basic: biomeRequires('tundra', 'taiga') },
  wendigo: { id: 'wendigo', name: '温迪戈', desc: '永不饱足的食魂幽灵。', type: 'polar', home: '冻土森林', entity: '温迪戈', traits: { ravenous: 1, ghostly: 1, soul_eater: 1 }, fanaticism: 'ghostly', basic: biomeRequires('tundra', 'taiga') },

  // sand
  tuskin: { id: 'tuskin', name: '塔斯肯人', desc: '无法无天的沙漠掠夺者。', type: 'sand', home: '沙海部落', entity: '塔斯肯人', traits: { lawless: 1, mistrustful: 1 }, fanaticism: 'lawless', basic: biomeRequires('desert', 'ashland') },
  kamel:  { id: 'kamel',  name: '骆驼人',   desc: '驼背储水的沙漠行者。', type: 'sand', home: '沙丘绿洲', entity: '骆驼人', traits: { humpback: 1, unfavored: 1 }, fanaticism: 'humpback', basic: biomeRequires('desert', 'ashland') },

  // demonic
  balorg: { id: 'balorg', name: '炎魔', desc: '燃烧的奴隶主，恐惧的化身。', type: 'demonic', home: '熔火地狱', entity: '炎魔', traits: { fiery: 1, terrifying: 1, slaver: 1 }, fanaticism: 'fiery', basic: biomeRequires('hellscape') },
  imp:    { id: 'imp',    name: '小恶魔', desc: '诡计多端的卑劣灵体。', type: 'demonic', home: '硫磺裂隙', entity: '小恶魔', traits: { compact: 1, conniving: 1, pathetic: 1 }, fanaticism: 'conniving', basic: biomeRequires('hellscape') },

  // angelic
  seraph:  { id: 'seraph',  name: '炽天使', desc: '虔诚统一的高阶天使。', type: 'angelic', home: '伊甸圣域', entity: '炽天使', traits: { unified: 1, spiritual: 1, truthful: 1 }, fanaticism: 'spiritual', basic: biomeRequires('eden') },
  unicorn: { id: 'unicorn', name: '独角兽', desc: '高贵华丽的彩虹之灵。', type: 'angelic', home: '极光草原', entity: '独角兽', traits: { rainbow: 1, magnificent: 1, noble: 1 }, fanaticism: 'magnificent', basic: biomeRequires('eden') },

  // synthetic
  synth: { id: 'synth', name: '合成人', desc: '模仿肉体的精密机械人格。', type: 'synthetic', home: '工业要塞', entity: '合成人', traits: { imitation: 1, emotionless: 1, logical: 1 }, fanaticism: 'logical', basic: FALSE },
  nano:  { id: 'nano',  name: '纳米群', desc: '可塑形的工业纳米机器。', type: 'synthetic', home: '纳米巢穴', entity: '纳米群', traits: { deconstructor: 1, linked: 1, shapeshifter: 1 }, fanaticism: 'shapeshifter', basic: FALSE },

  // eldritch
  ghast:    { id: 'ghast',    name: '食尸鬼', desc: '在暗影中疾驰的食人怪物。', type: 'eldritch', home: '虚空裂隙', entity: '食尸鬼', traits: { dark_dweller: 1, swift: 1, anthropophagite: 1 }, fanaticism: 'swift', basic: FALSE },
  shoggoth: { id: 'shoggoth', name: '修格斯', desc: '生体工具的不定形巨怪。', type: 'eldritch', home: '深渊深处', entity: '修格斯', traits: { living_tool: 1, bloated: 1 }, fanaticism: 'living_tool', basic: FALSE },

  // hybrid
  dwarf:      { id: 'dwarf',      name: '矮人',     desc: '工匠大师，顽固坚韧。', type: 'hybrid', hybrid: ['humanoid', 'small'], home: '深山熔炉', entity: '矮人', traits: { artisan: 1, stubborn: 1 }, fanaticism: 'artisan', basic: FALSE },
  raccoon:    { id: 'raccoon',    name: '浣熊人',   desc: '盗贼之路的全能机会主义者。', type: 'hybrid', hybrid: ['carnivore', 'herbivore'], home: '迷彩小镇', entity: '浣熊人', traits: { rogue: 1, untrustworthy: 1 }, fanaticism: 'rogue', basic: FALSE },
  lichen:     { id: 'lichen',     name: '地衣族',   desc: '不稳定的活体材料造物。', type: 'hybrid', hybrid: ['plant', 'fungi'], home: '岩生花园', entity: '地衣', traits: { living_materials: 1, unstable: 1 }, fanaticism: 'living_materials', basic: FALSE },
  wyvern:     { id: 'wyvern',     name: '飞龙',     desc: '元素亲和的飞行爬虫。', type: 'hybrid', hybrid: ['avian', 'reptilian'], home: '云端要塞', entity: '飞龙', traits: { elemental: 1, chicken: 1 }, fanaticism: 'elemental', basic: FALSE },
  beholder:   { id: 'beholder',   name: '眼魔',     desc: '漂浮的眼球，目光即魔法。', type: 'hybrid', hybrid: ['eldritch', 'giant'], home: '禁忌洞穴', entity: '眼魔', traits: { ocular_power: 1, floating: 1 }, fanaticism: 'ocular_power', basic: FALSE },
  djinn:      { id: 'djinn',      name: '神灯精灵', desc: '阴险狡诈的愿望贩子。', type: 'hybrid', hybrid: ['sand', 'fey'], home: '神灯之内', entity: '精灵', traits: { wish: 1, devious: 1 }, fanaticism: 'wish', basic: FALSE },
  narwhal:    { id: 'narwhal',    name: '一角鲸人', desc: '极地海洋的尖牙战士。', type: 'hybrid', hybrid: ['aquatic', 'polar'], home: '极地冰洋', entity: '独角鲸人', traits: { tusk: 1, blubber: 1 }, fanaticism: 'tusk', basic: FALSE },
  bombardier: { id: 'bombardier', name: '爆甲虫人', desc: '攻击型甲虫掷弹兵。', type: 'hybrid', hybrid: ['insectoid', 'heat'], home: '军用蜂巢', entity: '甲虫人', traits: { grenadier: 1, aggressive: 1 }, fanaticism: 'grenadier', basic: FALSE },
  nephilim:   { id: 'nephilim',   name: '拿非利人', desc: '半神半魔的亵渎杂交。', type: 'hybrid', hybrid: ['demonic', 'angelic'], home: '禁忌神殿', entity: '拿非利人', traits: { empowered: 2, blasphemous: 1 }, fanaticism: 'empowered', basic: FALSE },

  // 特殊种族
  hellspawn:    { id: 'hellspawn',    name: '地狱裔', desc: '极度邪恶的炼狱后裔。', type: 'demonic', home: '深渊王座', entity: '地狱裔', traits: { immoral: 4 }, fanaticism: 'immoral', basic: FALSE },
  junker:       { id: 'junker',       name: '废物种', desc: '负面特质合体的失败造物。', type: 'humanoid', home: '废墟之中', entity: '废物', traits: { diverse: 1, arrogant: 1, angry: 1, lazy: 1, paranoid: 1, greedy: 1, puny: 1, dumb: 1, nearsighted: 1, gluttony: 1, slow: 1, hard_of_hearing: 1, pessimistic: 1, solitary: 1, pyrophobia: 1, skittish: 1, nyctophilia: 1, frail: 1, atrophy: 1, invertebrate: 1, pathetic: 1, hibernator: 1, freespirit: 1, heavy: 1, gnawer: 1, hooved: 1 }, fanaticism: 'none', basic: FALSE },
  sludge:       { id: 'sludge',       name: '污泥族', desc: '不定形液态生命的随机集合。', type: 'humanoid', home: '焦油坑', entity: '污泥', traits: { ooze: 0.25, diverse: 0.25, arrogant: 0.25, angry: 0.25, lazy: 0.25, hooved: 0.25, freespirit: 0.25, heavy: 0.25, gnawer: 0.25, paranoid: 0.25, greedy: 0.25, puny: 0.25, dumb: 0.25, nearsighted: 0.25, gluttony: 0.25, slow: 0.25, hard_of_hearing: 0.25, selenophobia: 0.25, pessimistic: 0.25, solitary: 0.25, pyrophobia: 0.25, skittish: 0.25, fragrant: 0.25, nyctophilia: 0.25, hibernator: 0.25, frail: 0.25, atrophy: 0.25, invertebrate: 0.25, unorganized: 0.25, slow_regen: 0.25, autoignition: 0.25, snowy: 0.25, mistrustful: 0.25, thalassophobia: 0.25, pathetic: 0.25, truthful: 0.25 }, fanaticism: 'ooze', basic: FALSE },
  ultra_sludge: { id: 'ultra_sludge', name: '超级污泥族', desc: '污泥族进化至更随机不稳的形态。', type: 'humanoid', home: '焦油坑', entity: '超级污泥', traits: { ooze: 0.1, diverse: 0.1, arrogant: 0.1, angry: 0.1, lazy: 0.1, hooved: 0.1, freespirit: 0.1, heavy: 0.1, gnawer: 0.1, paranoid: 0.1, greedy: 0.1, puny: 0.1, dumb: 0.1, nearsighted: 0.1, gluttony: 0.1, slow: 0.1, hard_of_hearing: 0.1, selenophobia: 0.1, pessimistic: 0.1, solitary: 0.1, pyrophobia: 0.1, skittish: 0.1, fragrant: 0.1, nyctophilia: 0.1, hibernator: 0.1, frail: 0.1, atrophy: 0.1, invertebrate: 0.1, unorganized: 0.1, slow_regen: 0.1, autoignition: 0.1, snowy: 0.1, mistrustful: 0.1, thalassophobia: 0.1, pathetic: 0.1, truthful: 0.1, blubber: 0.25, aggressive: 0.25, devious: 0.25, floating: 0.25, blasphemous: 0.25, chicken: 0.25, unstable: 0.25, stubborn: 0.25, untrustworthy: 0.25, bloated: 0.25, dark_dweller: 0.25 }, fanaticism: 'ooze', basic: FALSE },

  // 自定义占位（实际形态由 customRace() 在 legacy 中动态生成）
  custom: { id: 'custom', name: '自定义种族', desc: '玩家自定义的种族。', type: 'humanoid', home: '故乡', entity: '居民', traits: {}, fanaticism: 'none', basic: FALSE },
  hybrid: { id: 'hybrid', name: '混血自定义', desc: '混血自定义种族。', type: 'hybrid', home: '故乡', entity: '居民', traits: {}, fanaticism: 'none', basic: FALSE },
};

// ============================================================
// 工具函数
// ============================================================

/** 按 genus 类型分组返回所有种族 */
export function getRacesByGenus(genus: GenusId): RaceDefinition[] {
  return Object.values(RACES).filter((r) => r.type === genus);
}

/** 返回当前 biome / 解锁条件允许的基础种族 */
export function getAvailableBasicRaces(state: GameState): RaceDefinition[] {
  return Object.values(RACES).filter((r) => r.basic(state));
}

/** 给定种族 ID 返回其完整特质列表（包括 genus 默认特质 + 种族特质） */
export function getRaceFullTraits(raceId: RaceId): Record<string, number> {
  const race = RACES[raceId];
  if (!race) return {};

  const genus = GENUS_DEFS[race.type];
  const traits: Record<string, number> = { ...genus.traits };

  // 混血种族：附加 hybrid 父属性
  if (race.hybrid) {
    for (const parentGenus of race.hybrid) {
      Object.assign(traits, GENUS_DEFS[parentGenus].traits);
    }
  }

  // 种族特有特质（覆盖 genus 默认）
  Object.assign(traits, race.traits);

  return traits;
}

/** 将种族特质应用到 state.race */
export function applyRaceTraits(state: GameState, raceId: RaceId): void {
  const traits = getRaceFullTraits(raceId);
  for (const [trait, level] of Object.entries(traits)) {
    state.race[trait] = level;
  }
  state.race.species = raceId;
}

/** 判断某 trait 是否为负面特质 */
export const NEGATIVE_TRAITS = new Set<string>([
  'angry', 'arrogant', 'atrophy', 'diverse', 'dumb', 'fragrant', 'frail', 'freespirit',
  'gluttony', 'gnawer', 'greedy', 'hard_of_hearing', 'heavy', 'hooved', 'invertebrate',
  'lazy', 'mistrustful', 'nearsighted', 'nyctophilia', 'paranoid', 'pathetic', 'pessimistic',
  'puny', 'pyrophobia', 'skittish', 'slow', 'slow_regen', 'snowy', 'solitary',
  'unorganized', 'unfavored',
]);

export function isNegativeTrait(traitId: string): boolean {
  return NEGATIVE_TRAITS.has(traitId);
}
