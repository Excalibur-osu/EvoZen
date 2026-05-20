/**
 * 成就系统 — 对标 legacy/src/achieve.js
 *
 * 完整成就列表 + 解锁状态管理 + 等级 / 多宇宙变体计算
 *
 * 设计：
 *   - 每个成就有 5 级（rank 1-5），按 challenge_genes 数量决定
 *   - 每个宇宙(l/e/a/h/m/mg) 都有独立的 affix 等级
 *   - 总 aLevel = sum(min(5, achievement.l) for all achievements)
 *   - 总 uLevel = sum(min(5, achievement[currentAffix]) for all achievements)
 */

import type { GameState } from '@evozen/shared-types';

// ============================================================
// 成就类型与列表
// ============================================================

export type AchievementCategory = 'misc' | 'species' | 'genus' | 'planet' | 'universe' | 'challenge';

export interface AchievementDefinition {
  id: string;
  name: string;
  desc: string;
  flair: string;
  type: AchievementCategory;
}

export interface AchievementRecord {
  /** 等级（1-5），跨宇宙共享 */
  l: number;
  /** 各宇宙 affix 的等级（l = standard 默认） */
  e?: number;  // evil
  a?: number;  // antimatter
  h?: number;  // heavy
  m?: number;  // micro
  mg?: number; // magic
}

// ============================================================
// 完整成就清单 — 对标 legacy achieve_list L10-49
// ============================================================

export const ACHIEVE_LIST: Record<AchievementCategory, string[]> = {
  misc: [
    'apocalypse', 'ascended', 'dreaded', 'anarchist', 'second_evolution', 'blackhole', 'warmonger',
    'red_tactics', 'pacifist', 'neutralized', 'paradise', 'scrooge', 'madagascar_tree', 'godwin',
    'laser_shark', 'infested', 'mass_starvation', 'colonist', 'world_domination', 'illuminati',
    'syndicate', 'cult_of_personality', 'doomed', 'pandemonium', 'blood_war', 'landfill', 'seeder',
    'miners_dream', 'shaken', 'blacken_the_sun', 'trade', 'resonance', 'enlightenment', 'gladiator',
    'corrupted', 'red_dead', 'godslayer', 'traitor', 'doppelganger',
  ],
  species: [
    'mass_extinction', 'extinct_human', 'extinct_elven', 'extinct_orc', 'extinct_cath', 'extinct_wolven',
    'extinct_vulpine', 'extinct_centaur', 'extinct_rhinotaur', 'extinct_capybara', 'extinct_kobold',
    'extinct_goblin', 'extinct_gnome', 'extinct_ogre', 'extinct_cyclops', 'extinct_troll',
    'extinct_tortoisan', 'extinct_gecko', 'extinct_slitheryn', 'extinct_arraak', 'extinct_pterodacti',
    'extinct_dracnid', 'extinct_entish', 'extinct_cacti', 'extinct_pinguicula', 'extinct_sporgar',
    'extinct_shroomi', 'extinct_moldling', 'extinct_mantis', 'extinct_scorpid', 'extinct_antid',
    'extinct_sharkin', 'extinct_octigoran', 'extinct_dryad', 'extinct_satyr', 'extinct_phoenix',
    'extinct_salamander', 'extinct_yeti', 'extinct_wendigo', 'extinct_tuskin', 'extinct_kamel',
    'extinct_balorg', 'extinct_imp', 'extinct_seraph', 'extinct_unicorn', 'extinct_synth',
    'extinct_nano', 'extinct_ghast', 'extinct_shoggoth', 'extinct_dwarf', 'extinct_raccoon',
    'extinct_lichen', 'extinct_wyvern', 'extinct_beholder', 'extinct_djinn', 'extinct_narwhal',
    'extinct_bombardier', 'extinct_nephilim', 'extinct_junker', 'extinct_sludge', 'extinct_ultra_sludge',
    'extinct_custom', 'extinct_hybrid',
  ],
  genus: [
    'creator', 'genus_humanoid', 'genus_carnivore', 'genus_herbivore', 'genus_small', 'genus_giant',
    'genus_reptilian', 'genus_avian', 'genus_insectoid', 'genus_plant', 'genus_fungi', 'genus_aquatic',
    'genus_fey', 'genus_heat', 'genus_polar', 'genus_sand', 'genus_demonic', 'genus_angelic',
    'genus_synthetic', 'genus_eldritch',
  ],
  planet: [
    'explorer',
    'biome_grassland', 'biome_oceanic', 'biome_forest', 'biome_desert', 'biome_volcanic',
    'biome_tundra', 'biome_savanna', 'biome_swamp', 'biome_ashland', 'biome_taiga', 'biome_hellscape',
    'biome_eden',
    'atmo_toxic', 'atmo_mellow', 'atmo_rage', 'atmo_stormy', 'atmo_ozone', 'atmo_magnetic',
    'atmo_trashed', 'atmo_elliptical', 'atmo_flare', 'atmo_dense', 'atmo_unstable', 'atmo_permafrost',
    'atmo_retrograde', 'atmo_kamikaze',
  ],
  universe: [
    'vigilante', 'squished', 'double_density', 'cross', 'macro', 'marble', 'heavyweight',
    'whitehole', 'heavy', 'canceled', 'eviltwin', 'microbang', 'pw_apocalypse', 'fullmetal',
    'pass', 'soul_sponge', 'nightmare', 'escape_velocity', 'what_is_best',
  ],
  challenge: [
    'joyless', 'steelen', 'dissipated', 'technophobe', 'wheelbarrow', 'iron_will', 'failed_history',
    'banana', 'pathfinder', 'ashanddust', 'exodus', 'obsolete', 'bluepill', 'retired',
    'gross', 'lamentis', 'overlord', 'adam_eve', 'endless_hunger',
  ],
};

// ============================================================
// 简明文本（中文）— 对标 strings/loc_*.json
// 仅核心成就给出中文，其余沿用 id 作为占位
// ============================================================

const ACHIEVE_NAMES: Record<string, string> = {
  // misc
  apocalypse: '末日浩劫', ascended: '飞升', dreaded: '恐惧', anarchist: '无政府主义者',
  second_evolution: '二次进化', blackhole: '黑洞', warmonger: '战狂',
  red_tactics: '赤色战术', pacifist: '和平主义', neutralized: '中立化',
  paradise: '乐园', scrooge: '吝啬鬼', madagascar_tree: '马岛之树', godwin: '神圣',
  laser_shark: '激光鲨', infested: '感染', mass_starvation: '大饥荒', colonist: '殖民者',
  world_domination: '统治世界', illuminati: '光照会', syndicate: '辛迪加',
  cult_of_personality: '个人崇拜', doomed: '注定', pandemonium: '魔殿',
  blood_war: '血战', landfill: '垃圾场', seeder: '播种者', miners_dream: '矿工之梦',
  shaken: '震荡', blacken_the_sun: '黑日', trade: '贸易帝国', resonance: '共鸣',
  enlightenment: '启蒙', gladiator: '角斗士', corrupted: '腐化', red_dead: '红死',
  godslayer: '弑神者', traitor: '叛徒', doppelganger: '化身',
  // genus
  creator: '造物主',
  genus_humanoid: '人形之巅', genus_carnivore: '食肉之巅', genus_herbivore: '食草之巅',
  genus_small: '小型之巅', genus_giant: '巨型之巅', genus_reptilian: '爬行之巅',
  genus_avian: '飞翔之巅', genus_insectoid: '昆虫之巅', genus_plant: '植物之巅',
  genus_fungi: '真菌之巅', genus_aquatic: '深海之巅', genus_fey: '精灵之巅',
  genus_heat: '炎热之巅', genus_polar: '极地之巅', genus_sand: '沙漠之巅',
  genus_demonic: '恶魔之巅', genus_angelic: '天使之巅', genus_synthetic: '合成之巅',
  genus_eldritch: '远古之巅',
  // planet biomes
  explorer: '探险家',
  biome_grassland: '草原征服', biome_oceanic: '海洋征服', biome_forest: '森林征服',
  biome_desert: '沙漠征服', biome_volcanic: '火山征服', biome_tundra: '苔原征服',
  biome_savanna: '草原热带征服', biome_swamp: '沼泽征服', biome_ashland: '灰土征服',
  biome_taiga: '泰加征服', biome_hellscape: '地狱征服', biome_eden: '伊甸征服',
  // challenge
  joyless: '无欢挑战', steelen: '钢铁挑战', dissipated: '消散挑战',
  technophobe: '科技恐惧', wheelbarrow: '手推车', iron_will: '钢铁意志',
  failed_history: '历史失败', banana: '香蕉', pathfinder: '开拓者',
  ashanddust: '灰烬与尘', exodus: '出埃及', obsolete: '过时', bluepill: '蓝药丸',
  retired: '退休', gross: '极差', lamentis: '哀叹', overlord: '霸主',
  adam_eve: '亚当夏娃', endless_hunger: '无尽饥饿',
  // universe
  vigilante: '义警', squished: '压扁', double_density: '双倍密度',
  cross: '交叉', macro: '巨观', marble: '大理石', heavyweight: '重量级',
  whitehole: '白洞', heavy: '重力', canceled: '取消', eviltwin: '邪恶双子',
  microbang: '微观爆炸', pw_apocalypse: '魔法末日', fullmetal: '全金属',
  pass: '通过', soul_sponge: '灵魂海绵', nightmare: '噩梦',
  escape_velocity: '逃逸速度', what_is_best: '何为最佳',
};

const ACHIEVE_DESCS: Record<string, string> = {
  apocalypse: '触发 MAD 核灭，结束一个时代。',
  ascended: '完成飞升流程。',
  blackhole: '建造黑洞引擎并播种新宇宙。',
  seeder: '生物播种到新星球。',
  trade: '同时拥有 750 个贸易路线总值或 50 个商队。',
  creator: '解锁所有 60+ 物种。',
  pathfinder: '完成开拓者挑战。',
  banana: '在 500x500 香蕉共和国挑战获胜。',
  explorer: '探索发现五种以上不同星球。',
};

const ACHIEVE_FLAIR: Record<string, string> = {
  apocalypse: '世界在火焰中终结。',
  ascended: '尘归尘，土归土。',
  trade: '一手交钱一手交货。',
};

// ============================================================
// 完整成就字典（按 ACHIEVE_LIST 平铺生成）
// ============================================================

export const ACHIEVEMENTS: Record<string, AchievementDefinition> = (() => {
  const out: Record<string, AchievementDefinition> = {};
  for (const [type, ids] of Object.entries(ACHIEVE_LIST) as [AchievementCategory, string[]][]) {
    for (const id of ids) {
      out[id] = {
        id,
        name: ACHIEVE_NAMES[id] ?? id,
        desc: ACHIEVE_DESCS[id] ?? '',
        flair: ACHIEVE_FLAIR[id] ?? '',
        type,
      };
    }
  }
  return out;
})();

// ============================================================
// Feats（功绩）— 一次性达成的特殊成就
// 对标 legacy achieve.js feats 对象 L70-286
// ============================================================

export interface FeatDefinition {
  id: string;
  name: string;
  desc: string;
  flair: string;
}

export const FEATS: Record<string, FeatDefinition> = {
  utopia: { id: 'utopia', name: '乌托邦', desc: '建立完美社会。', flair: '理想之地。' },
  take_no_advice: { id: 'take_no_advice', name: '不听劝告', desc: '完全无视所有提示。', flair: '走自己的路。' },
  ill_advised: { id: 'ill_advised', name: '糟糕建议', desc: '采纳了糟糕的建议。', flair: '事后诸葛亮。' },
  organ_harvester: { id: 'organ_harvester', name: '器官收割者', desc: '收割大量器官。', flair: '一身好器官。' },
  the_misery: { id: 'the_misery', name: '苦难', desc: '体验极端苦难。', flair: '苦难即美。' },
  energetic: { id: 'energetic', name: '充满活力', desc: '产生大量电力。', flair: '永动机不是梦。' },
  garbage_pie: { id: 'garbage_pie', name: '垃圾派', desc: '获得垃圾派食谱。', flair: '味道难以言喻。' },
  finish_line: { id: 'finish_line', name: '终点线', desc: '冲过终点。', flair: '终于完成了！' },
  blank_slate: { id: 'blank_slate', name: '空白石板', desc: '从零开始。', flair: '一无所有。' },
  supermassive: { id: 'supermassive', name: '超大质量', desc: '极大质量黑洞。', flair: '太巨大了。' },
  steelem: { id: 'steelem', name: '偷走它们', desc: '在钢铁挑战中获胜。', flair: '钢铁意志。' },
  banana: { id: 'banana', name: '香蕉共和国', desc: '500x500 香蕉获胜。', flair: '香蕉万岁。' },
  rocky_road: { id: 'rocky_road', name: '崎岖之路', desc: '艰难旅程。', flair: '一路坎坷。' },
  demon_slayer: { id: 'demon_slayer', name: '屠魔者', desc: '击败大量恶魔。', flair: '魔界征服者。' },
  equilibrium: { id: 'equilibrium', name: '平衡', desc: '保持完美平衡。', flair: '中庸之道。' },
  planned_obsolescence: { id: 'planned_obsolescence', name: '计划报废', desc: '触发淘汰流程。', flair: '换代时刻。' },
  digital_ascension: { id: 'digital_ascension', name: '数字飞升', desc: '电子升天。', flair: '数据永存。' },
  grand_death_tour: { id: 'grand_death_tour', name: '死亡巡演', desc: '一次旅行经历多次死亡。', flair: '不死之旅。' },
  novice: { id: 'novice', name: '新手', desc: '解锁 10 个成就。', flair: '从此开始。' },
  journeyman: { id: 'journeyman', name: '熟手', desc: '解锁 25 个成就。', flair: '渐入佳境。' },
  adept: { id: 'adept', name: '高手', desc: '解锁 50 个成就。', flair: '渐近完美。' },
  master: { id: 'master', name: '大师', desc: '解锁 75 个成就。', flair: '游刃有余。' },
  grandmaster: { id: 'grandmaster', name: '宗师', desc: '解锁 100 个成就。', flair: '已成传奇。' },
  god: { id: 'god', name: '神', desc: '解锁 150 个成就。', flair: '神也不过如此。' },
  nephilim: { id: 'nephilim', name: '拿非利人', desc: '解锁拿非利人。', flair: '神魔之子。' },
  twisted: { id: 'twisted', name: '扭曲', desc: '触发极端扭曲事件。', flair: '一切都不对劲。' },
  slime_lord: { id: 'slime_lord', name: '黏液领主', desc: '污泥族征服。', flair: '黏液万岁。' },
  annihilation: { id: 'annihilation', name: '湮灭', desc: '全面消灭。', flair: '一切归零。' },
  immortal: { id: 'immortal', name: '不朽', desc: '获得永生。', flair: '永不消逝。' },
  wish: { id: 'wish', name: '愿望', desc: '许下愿望。', flair: '许愿必灵。' },
  friday: { id: 'friday', name: '黑色星期五', desc: '在 13 号星期五触发。', flair: '不祥之日。' },
  valentine: { id: 'valentine', name: '情人节', desc: '在情人节获得。', flair: '爱在心中。' },
  leprechaun: { id: 'leprechaun', name: '矮妖精', desc: '圣帕特里克节获得。', flair: '彩虹之底。' },
  easter: { id: 'easter', name: '复活节', desc: '复活节获得。', flair: '彩蛋时刻。' },
  egghunt: { id: 'egghunt', name: '寻蛋', desc: '找到所有彩蛋。', flair: '搜寻完成。' },
  launch_day: { id: 'launch_day', name: '发射日', desc: '首次太空发射。', flair: '冲向星空。' },
  solstice: { id: 'solstice', name: '至日', desc: '在至日获得。', flair: '日月交替。' },
  firework: { id: 'firework', name: '烟火', desc: '燃放节日烟花。', flair: '光彩夺目。' },
  halloween: { id: 'halloween', name: '万圣节', desc: '万圣节获得。', flair: '不给糖就捣蛋。' },
  trickortreat: { id: 'trickortreat', name: '不给糖就捣蛋', desc: '收集足够糖果。', flair: '糖果之王。' },
  thanksgiving: { id: 'thanksgiving', name: '感恩节', desc: '感恩节获得。', flair: '感恩生活。' },
  xmas: { id: 'xmas', name: '圣诞节', desc: '圣诞节获得。', flair: '圣诞快乐。' },
  fool: { id: 'fool', name: '愚人节', desc: '愚人节恶作剧。', flair: '哈哈被骗了。' },
};

// ============================================================
// 工具函数
// ============================================================

/** 返回当前 challenge_genes 数量决定的成就等级（rank 1-5）
 *  对标 legacy achieve.js alevel() L542-555 */
export function getChallengeLevel(state: GameState): number {
  let level = 1;
  const race = state.race as Record<string, unknown>;
  if (race['no_plasmid']) level++;
  if (race['no_trade']) level++;
  if (race['no_craft']) level++;
  if (race['no_crispr']) level++;
  if (race['weak_mastery']) level++;
  if (race['nerfed']) level++;
  if (race['badgenes']) level++;
  return Math.min(5, level);
}

/** 宇宙类型 → affix 字母（对标 universeAffix L310-326）*/
export function getUniverseAffix(universe: string | undefined): keyof AchievementRecord {
  switch (universe) {
    case 'evil':       return 'e';
    case 'antimatter': return 'a';
    case 'heavy':      return 'h';
    case 'micro':      return 'm';
    case 'magic':      return 'mg';
    default:           return 'l';
  }
}

/** 当前宇宙总等级（aLvl + uLvl）— 对标 universeLevel() L294-308 */
export function calcUniverseLevel(state: GameState): { aLvl: number; uLvl: number } {
  const achieve = (state.stats?.['achieve'] as Record<string, AchievementRecord>) ?? {};
  const affix = getUniverseAffix(state.race.universe as string);
  let aLvl = 0;
  let uLvl = 0;
  for (const id of Object.keys(ACHIEVEMENTS)) {
    const rec = achieve[id];
    if (!rec) continue;
    aLvl += Math.min(5, rec.l);
    const variant = rec[affix] as number | undefined;
    if (variant) uLvl += Math.min(5, variant);
  }
  return { aLvl, uLvl };
}

/** 触发解锁某成就（小宇宙模式 small=true 时只算 micro 变体）
 *  对标 unlockAchieve L328-373 */
export function unlockAchievement(state: GameState, id: string, small: boolean = false, rank?: number): boolean {
  const universe = state.race.universe as string | undefined;
  if (universe !== 'micro' && small === true) return false;
  if (!ACHIEVEMENTS[id]) return false;

  const stats = state.stats as Record<string, unknown>;
  const achieve = (stats['achieve'] ??= {}) as Record<string, AchievementRecord>;

  const aLevel = getChallengeLevel(state);
  let realRank = rank ?? aLevel;
  if (realRank > aLevel) realRank = aLevel;

  if (!achieve[id]) achieve[id] = { l: 0 };

  let unlocked = false;
  const isMicroSmall = (universe === 'micro' && small);
  const isStandardLarge = (universe !== 'micro' && !small);

  if ((isMicroSmall || isStandardLarge) && achieve[id].l < realRank) {
    achieve[id].l = realRank;
    unlocked = true;
  }

  if (universe !== 'standard') {
    const affix = getUniverseAffix(universe);
    if (affix !== 'l') {
      const prev = (achieve[id][affix] as number | undefined) ?? 0;
      if (prev < realRank) {
        achieve[id][affix] = realRank;
        if (!unlocked) unlocked = true;
      }
    }
  }

  return unlocked;
}

/** 解锁 feat — 对标 unlockFeat L375-397 */
export function unlockFeat(state: GameState, id: string, small: boolean = false, rank?: number): boolean {
  const universe = state.race.universe as string | undefined;
  if ((universe === 'micro' && !small) || (universe !== 'micro' && small)) return false;
  if (!FEATS[id]) return false;

  const stats = state.stats as Record<string, unknown>;
  const feat = (stats['feat'] ??= {}) as Record<string, number>;

  const aLevel = getChallengeLevel(state);
  const realRank = rank ?? aLevel;

  const prev = feat[id] ?? 0;
  if (prev < realRank) {
    feat[id] = realRank;
    return true;
  }
  return false;
}

/** 检查某成就当前是否已达到指定等级 */
export function hasAchievement(state: GameState, id: string, minRank: number = 1): boolean {
  const achieve = (state.stats?.['achieve'] as Record<string, AchievementRecord>) ?? {};
  return (achieve[id]?.l ?? 0) >= minRank;
}

/** 获取某成就在指定宇宙的等级 */
export function getAchievementLevel(
  state: GameState,
  id: string,
  affix?: keyof AchievementRecord
): number {
  const achieve = (state.stats?.['achieve'] as Record<string, AchievementRecord>) ?? {};
  const rec = achieve[id];
  if (!rec) return 0;
  if (!affix || affix === 'l') return rec.l;
  return (rec[affix] as number | undefined) ?? 0;
}

/** 统计当前已解锁的成就/feat 数量 */
export function countAchievements(state: GameState): { achievements: number; feats: number; total: number } {
  const achieve = (state.stats?.['achieve'] as Record<string, AchievementRecord>) ?? {};
  const feat = (state.stats?.['feat'] as Record<string, number>) ?? {};
  const achievements = Object.values(achieve).filter((a) => a.l > 0).length;
  const feats = Object.values(feat).filter((f) => f > 0).length;
  return { achievements, feats, total: achievements + feats };
}

/** 计算成就掌握度乘数（对标 calc_mastery）
 *  原版 mastery = aLvl * 0.001（每 1 level = 0.1% 全局加成），最高 0.25 (250 lvl) */
export function calcMastery(state: GameState): number {
  const { aLvl } = calcUniverseLevel(state);
  const mastery = Math.min(0.25, aLvl * 0.001);

  // weak_mastery 挑战：减半
  if (state.race['weak_mastery']) return mastery * 0.5;
  return mastery;
}

/** 检查并自动解锁基于阈值的 feat（成就数）—对标 novice/journeyman/.../god */
export function checkAchievementHunterFeats(state: GameState): string[] {
  const { achievements } = countAchievements(state);
  const unlocked: string[] = [];
  const tiers: Array<{ id: string; threshold: number }> = [
    { id: 'novice', threshold: 10 },
    { id: 'journeyman', threshold: 25 },
    { id: 'adept', threshold: 50 },
    { id: 'master', threshold: 75 },
    { id: 'grandmaster', threshold: 100 },
    { id: 'god', threshold: 150 },
  ];
  for (const tier of tiers) {
    if (achievements >= tier.threshold && unlockFeat(state, tier.id)) {
      unlocked.push(tier.id);
    }
  }
  return unlocked;
}
