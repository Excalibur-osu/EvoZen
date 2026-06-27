/**
 * 进化阶段纯函数引擎
 *
 * 对标来源：
 *  - legacy/src/actions.js  — evolution 节点（membrane/organelles/nucleus/...）
 *  - legacy/src/main.js L1216-1282 — 进化阶段 tick 逻辑
 *
 * evolveCosts(molecule, base, mult, offset) = count * mult + base
 * （legacy/src/actions.js L5669-5672）
 *
 * 解锁触发规则（legacy main.js L1249-1281）：
 *  RNA >= 2   → DNA 解锁显示
 *  RNA >= 10  → membrane 解锁
 *  DNA >= 4   → organelles 解锁
 *  organelles.count >= 2 → nucleus 解锁
 *  nucleus.count >= 1    → eukaryotic_cell 解锁
 *  eukaryotic_cell.count >= 1 → mitochondria 解锁
 *  mitochondria 存在 且 evo 未设 → evo = 1（解锁 sexual_reproduction）
 */

import type { GameState } from '@evozen/shared-types';
import { GENUS_DEFS, RACES, type GenusId, type RaceDefinition, type RaceId } from './races';
import { loadCustomRace } from './custom-race';
import { getAchievementLevel } from './achievements';

// ============================================================
// 类型定义
// ============================================================

/** 进化升级（可重复购买的细胞升级） */
export interface EvoUpgrade {
  /** 升级 ID，对应 state.evolution[id].count */
  id: string;
  name: string;
  desc: string;
  /** RNA 费用函数：接收当前 count 和 evo 等级，返回费用 */
  rnaCost?: (count: number, evoLevel?: number) => number;
  /** DNA 费用函数：接收当前 count 和 evo 等级，返回费用 */
  dnaCost?: (count: number, evoLevel?: number) => number;
  /** effect 文本（函数以便动态计算）
   * @param count 该升级当前已购次数
   * @param ctx   相关升级的 count 映射（如 mitochondria），供需要上下文的升级使用
   */
  effectText: (count: number, ctx?: Record<string, number>) => string;
  /** 显示条件 */
  isAvailable: (evo: Record<string, { count: number } | number>) => boolean;
}

/** 进化步骤（单次触发，推进 tech.evo 等级） */
export interface EvoStep {
  id: string;
  name: string;
  desc: string;
  /** 额外前置 tech 要求（除 reqEvo 外） */
  reqs?: Record<string, number>;
  /** DNA 费用 */
  dnaCost: number;
  /** 触发条件（基于 tech.evo） */
  reqEvo: number;
  /** 触发后 evo 变为多少（grant） */
  grantEvo: number;
  /** 额外 tech 标志（触发后设置） */
  grants?: Record<string, number>;
  /** 额外显示/执行条件（用于 biome、OR 前置等分支） */
  condition?: (state: GameState) => boolean;
  /** 完成步骤后的额外状态写入 */
  apply?: (state: GameState) => void;
  effectText: string;
}

/** 种族选择步骤（最终步骤，需要 evo=7） */
export interface EvoRace {
  id: string;
  name: string;
  emoji: string;
  /** 允许条件：需要对应的 evo_xxx tech >= 2 */
  requiredEvoTech: string;
  desc: string;
  rnaCost: number;
  dnaCost: number;
}

export interface SentienceResult {
  state: GameState;
  speciesId: string;
  mainType?: GenusId;
  imitationTarget?: RaceId;
}

const EVO_RACE_IDS: RaceId[] = [
  'human', 'orc', 'elven',
  'troll', 'ogre', 'cyclops',
  'kobold', 'goblin', 'gnome',
  'cath', 'wolven', 'vulpine',
  'centaur', 'rhinotaur', 'capybara',
  'tortoisan', 'gecko', 'slitheryn',
  'arraak', 'pterodacti', 'dracnid',
  'sporgar', 'shroomi', 'moldling',
  'mantis', 'scorpid', 'antid',
  'entish', 'cacti', 'pinguicula',
  'sharkin', 'octigoran',
  'dryad', 'satyr',
  'phoenix', 'salamander',
  'yeti', 'wendigo',
  'tuskin', 'kamel',
  'imp', 'balorg',
  'seraph', 'unicorn',
  'synth', 'nano',
  'ghast', 'shoggoth',
  'dwarf', 'raccoon', 'lichen', 'wyvern', 'beholder', 'djinn', 'narwhal', 'bombardier', 'nephilim',
];

const GENUS_EMOJIS: Record<string, string> = {
  humanoid: '🧑',
  giant: '🗿',
  small: '🧩',
  carnivore: '🐾',
  herbivore: '🌿',
  omnivore: '🍽️',
  reptilian: '🦎',
  avian: '🪽',
  fungi: '🍄',
  insectoid: '🐜',
  plant: '🌱',
  aquatic: '🌊',
  fey: '✨',
  heat: '🔥',
  polar: '❄️',
  sand: '🏜️',
  demonic: '🔥',
  angelic: '🪽',
  synthetic: '⚙️',
  eldritch: '☄️',
  hybrid: '🧬',
};

// ============================================================
// 可重复购买升级列表
// legacy/src/actions.js: membrane / organelles / nucleus / eukaryotic_cell / mitochondria
// ============================================================

export const EVO_UPGRADES: EvoUpgrade[] = [
  // membrane: RNA×(2 + count×2)  → RNA上限 +5（有线粒体时 +5×mito_count+5）
  {
    id: 'membrane',
    name: '细胞膜',
    desc: '建造更多细胞膜，扩展 RNA 储量。',
    rnaCost: (count) => count * 2 + 2,   // evolveCosts('membrane', 2, 2, offset)
    // legacy L61-63: effect = mito ? mito.count*5+5 : 5  ← 每次购买的固定增量
    effectText: (_count, ctx) => {
      const mitoCount = ctx?.['mitochondria'] ?? 0;
      const gain = mitoCount > 0 ? mitoCount * 5 + 5 : 5;
      return `RNA 储量上限 +${gain}（购买后生效）。`;
    },
    isAvailable: (evo) => 'membrane' in evo,
  },

  // organelles: RNA×(12 + count×8) + DNA×(4 + count×4)
  {
    id: 'organelles',
    name: '细胞器',
    desc: '进化出更多细胞器，自动产生 RNA。',
    rnaCost: (count) => count * 8 + 12,
    dnaCost: (count) => count * 4 + 4,
    // legacy L84-88: 每个细胞器每秒产生 1 RNA（固定值，与已购数无关）
    effectText: (_count) => '每秒自动产生 1 RNA（购买后生效）。',
    isAvailable: (evo) => 'organelles' in evo,
  },

  // nucleus: RNA×(38 + count×mult) + DNA×(18 + count×mult)
  // legacy L104-105: evo >= 4 时 RNA 乘数 32→16, DNA 乘数 16→12
  {
    id: 'nucleus',
    name: '细胞核',
    desc: '强化细胞核，自动将 RNA 转化为 DNA。',
    rnaCost: (count, evoLevel) => count * ((evoLevel ?? 0) >= 4 ? 16 : 32) + 38,
    dnaCost: (count, evoLevel) => count * ((evoLevel ?? 0) >= 4 ? 12 : 16) + 18,
    effectText: (_count) => '每秒自动消耗 2 RNA，产生 1 DNA（购买后生效）。',
    isAvailable: (evo) => 'nucleus' in evo,
  },

  // eukaryotic_cell: RNA×(20 + count×20) + DNA×(40 + count×12) → DNA上限 +10
  {
    id: 'eukaryotic_cell',
    name: '真核细胞',
    desc: '进化出完整的真核细胞，扩展 DNA 储量。',
    rnaCost: (count) => count * 20 + 20,
    dnaCost: (count) => count * 12 + 40,
    // legacy L129-130: effect = mito ? mito.count*10+10 : 10  ← 每次购买的固定增量
    effectText: (_count, ctx) => {
      const mitoCount = ctx?.['mitochondria'] ?? 0;
      const gain = mitoCount > 0 ? mitoCount * 10 + 10 : 10;
      return `DNA 储量上限 +${gain}（购买后生效）。`;
    },
    isAvailable: (evo) => 'eukaryotic_cell' in evo,
  },

  // mitochondria: RNA×(75 + count×50) + DNA×(65 + count×35)
  // → 影响 membrane 和 eukaryotic_cell 的上限加成（each +5 per mito）
  {
    id: 'mitochondria',
    name: '线粒体',
    desc: '增殖线粒体，增强上限加成并为细胞提供更多能量。',
    rnaCost: (count) => count * 50 + 75,
    dnaCost: (count) => count * 35 + 65,
    effectText: (_count) =>
      '每个额外提供：细胞膜 +5 RNA上限，真核细胞 +10 DNA上限。',
    isAvailable: (evo) => 'mitochondria' in evo,
  },
];

// ============================================================
// 进化步骤（线性，单次）
// legacy/src/actions.js: sexual_reproduction → phagocytosis → multicellular
//   → bilateral_symmetry → mammals → humanoid
// ============================================================

export const EVO_STEPS: EvoStep[] = [
  // legacy L159-178: sexual_reproduction, reqs:{evo:1}, grant:[evo,2], cost DNA 150
  {
    id: 'sexual_reproduction',
    name: '有性生殖',
    desc: '发展出有性生殖，大幅加速进化速率。',
    dnaCost: 150,
    reqEvo: 1,
    grantEvo: 2,
    effectText: '进化速率大幅提升，解锁多细胞生物路径。',
  },

  // legacy L179-198: phagocytosis, reqs:{evo:2}, grant:[evo,3], cost DNA 175
  // EvoZen 只走动物路线，故 phagocytosis = 唯一选择
  {
    id: 'phagocytosis',
    name: '吞噬作用',
    desc: '进化出吞噬能力，走向动物路线。',
    dnaCost: 175,
    reqEvo: 2,
    grantEvo: 3,
    grants: { evo_animal: 1 },
    effectText: '选择动物路线，解锁多细胞生物。',
  },

  {
    id: 'chloroplasts',
    name: '叶绿体',
    desc: '发展光合作用，走向植物路线。',
    dnaCost: 175,
    reqEvo: 2,
    grantEvo: 3,
    grants: { evo_plant: 1 },
    effectText: '选择植物路线，后续可进化为植物属类。',
  },

  {
    id: 'chitin',
    name: '几丁质',
    desc: '构筑坚韧的细胞壁，走向真菌路线。',
    dnaCost: 175,
    reqEvo: 2,
    grantEvo: 3,
    grants: { evo_fungi: 1 },
    effectText: '选择真菌路线，后续可进化为真菌属类。',
  },

  {
    id: 'exterminate',
    name: '灭绝指令',
    desc: '抛弃有机演化，转向合成生命形态。',
    dnaCost: 200,
    reqEvo: 2,
    grantEvo: 7,
    condition: (state) => getAchievementLevel(state, 'obsolete') >= 5,
    grants: { evo_synthetic: 2 },
    effectText: '完成合成体进化，解锁合成体种族选择。',
  },

  // legacy L282-300: multicellular, reqs:{evo:3}, grant:[evo,4], cost DNA 200
  {
    id: 'multicellular',
    name: '多细胞生物',
    desc: '进化成由多个细胞构成的生命体。',
    dnaCost: 200,
    reqEvo: 3,
    grantEvo: 4,
    effectText: '细胞分化，解锁更复杂的生命结构。',
  },

  // legacy L342-369: bilateral_symmetry, reqs:{evo:4,evo_animal:1}, grant:[evo,5], cost DNA 230
  // unlocks insectoid / mammal / eggshell / biome-gated animal-adjacent branches
  {
    id: 'bilateral_symmetry',
    name: '两侧对称',
    desc: '演化出两侧对称的身体结构，奠定脊椎动物基础。',
    dnaCost: 230,
    reqEvo: 4,
    grantEvo: 5,
    reqs: { evo_animal: 1 },
    grants: {
      evo_insectoid: 1,
      evo_mammals: 1,
      evo_eggshell: 1,
      evo_eldritch: 1,
      evo_aquatic: 1,
      evo_fey: 1,
      evo_sand: 1,
      evo_heat: 1,
      evo_polar: 1,
    },
    effectText: '为哺乳动物的出现奠定基础。',
  },

  {
    id: 'spores',
    name: '孢子',
    desc: '形成能传播和休眠的孢子结构。',
    dnaCost: 230,
    reqEvo: 4,
    grantEvo: 5,
    reqs: { evo_fungi: 1 },
    effectText: '增强真菌传播能力，接近最终属类选择。',
  },

  {
    id: 'poikilohydric',
    name: '变水性',
    desc: '适应水分波动，强化植物生存能力。',
    dnaCost: 230,
    reqEvo: 4,
    grantEvo: 5,
    reqs: { evo_plant: 1 },
    effectText: '植物体结构更加稳定，接近最终属类选择。',
  },

  {
    id: 'bryophyte',
    name: '苔藓植物',
    desc: '完成植物或真菌路线的智慧化跃迁。',
    dnaCost: 260,
    reqEvo: 5,
    grantEvo: 7,
    condition: (state) => techLevel(state, 'evo_plant') >= 1 || techLevel(state, 'evo_fungi') >= 1,
    apply: (state) => {
      if (techLevel(state, 'evo_plant') >= 1) state.tech['evo_plant'] = 2;
      if (techLevel(state, 'evo_fungi') >= 1) state.tech['evo_fungi'] = 2;
    },
    effectText: '完成植物/真菌属类进化，解锁对应种族选择。',
  },

  {
    id: 'athropods',
    name: '节肢动物',
    desc: '外骨骼、分节肢体和高效感知推动昆虫类智慧出现。',
    dnaCost: 260,
    reqEvo: 5,
    grantEvo: 7,
    reqs: { evo_insectoid: 1 },
    grants: { evo_insectoid: 2 },
    effectText: '完成昆虫类进化，解锁昆虫类种族选择。',
  },

  // legacy L422-446: mammals, reqs:{evo:5,evo_mammals:1}, grant:[evo,6], cost DNA 245
  // grants: evo_humanoid/evo_giant/evo_small/evo_animalism/evo_demonic/evo_angelic
  {
    id: 'mammals',
    name: '哺乳动物',
    desc: '进化成温血哺乳动物，具有大脑和复杂的社会行为。',
    dnaCost: 245,
    reqEvo: 5,
    grantEvo: 6,
    reqs: { evo_mammals: 1 },
    grants: {
      evo_humanoid: 1,
      evo_giant: 1,
      evo_small: 1,
      evo_animalism: 1,
      evo_demonic: 1,
      evo_angelic: 1,
    },
    effectText: '解锁人形化、巨型化、小型化等进化方向。',
  },

  // legacy L448-468: humanoid, reqs:{evo:6,evo_humanoid:1}, grant:[evo,7], cost DNA 260
  // EvoZen 只走 humanoid 路线，故此为唯一可选项
  {
    id: 'humanoid',
    name: '人形化',
    desc: '站立行走，解放双手，开启智慧的大门。',
    dnaCost: 260,
    reqEvo: 6,
    grantEvo: 7,
    reqs: { evo_humanoid: 1 },
    grants: { evo_humanoid: 2 },
    effectText: '解锁种族选择，即将踏上文明之路！',
  },

  {
    id: 'gigantism',
    name: '巨型化',
    desc: '将体型优势推向极限，走向巨型属类。',
    dnaCost: 260,
    reqEvo: 6,
    grantEvo: 7,
    reqs: { evo_giant: 1 },
    grants: { evo_giant: 2 },
    effectText: '完成巨型属类进化，解锁巨型种族选择。',
  },

  {
    id: 'dwarfism',
    name: '小型化',
    desc: '以小巧体型换取更高适应性，走向小型属类。',
    dnaCost: 260,
    reqEvo: 6,
    grantEvo: 7,
    reqs: { evo_small: 1 },
    grants: { evo_small: 2 },
    effectText: '完成小型属类进化，解锁小型种族选择。',
  },

  {
    id: 'animalism',
    name: '兽性',
    desc: '保留原始动物本能，为食性分化奠定基础。',
    dnaCost: 250,
    reqEvo: 6,
    grantEvo: 7,
    reqs: { evo_animalism: 1 },
    grants: { evo_animalism: 2 },
    effectText: '继续分化为食肉、食草或杂食路线。',
  },

  {
    id: 'celestial',
    name: '天界化',
    desc: '在伊甸环境中发展神圣形态。',
    dnaCost: 260,
    reqEvo: 6,
    grantEvo: 7,
    reqs: { evo_angelic: 1 },
    condition: (state) => state.city.biome === 'eden',
    grants: { evo_angelic: 2 },
    effectText: '完成天使属类进化，解锁天使种族选择。',
  },

  {
    id: 'demonic',
    name: '恶魔化',
    desc: '在地狱环境中发展恶魔形态。',
    dnaCost: 260,
    reqEvo: 6,
    grantEvo: 7,
    reqs: { evo_demonic: 1 },
    condition: (state) => state.city.biome === 'hellscape',
    grants: { evo_demonic: 2 },
    effectText: '完成恶魔属类进化，解锁恶魔种族选择。',
  },

  {
    id: 'eldritch',
    name: '远古化',
    desc: '在噩梦般的知识中蜕变为远古生命。',
    dnaCost: 260,
    reqEvo: 5,
    grantEvo: 7,
    reqs: { evo_eldritch: 1 },
    condition: (state) => getAchievementLevel(state, 'nightmare', 'mg') > 0,
    grants: { evo_eldritch: 2 },
    effectText: '完成远古属类进化，解锁远古种族选择。',
  },

  {
    id: 'eggshell',
    name: '卵壳',
    desc: '发展卵生保护结构，进入爬行或鸟类分支。',
    dnaCost: 245,
    reqEvo: 5,
    grantEvo: 6,
    reqs: { evo_eggshell: 1 },
    grants: { evo_eggshell: 2 },
    effectText: '解锁鸟类和爬行类分支。',
  },

  {
    id: 'endothermic',
    name: '恒温',
    desc: '发展恒温调节，走向鸟类属类。',
    dnaCost: 260,
    reqEvo: 6,
    grantEvo: 7,
    reqs: { evo_eggshell: 2 },
    grants: { evo_avian: 2 },
    effectText: '完成鸟类进化，解锁鸟类种族选择。',
  },

  {
    id: 'ectothermic',
    name: '变温',
    desc: '保留变温代谢，走向爬行类属类。',
    dnaCost: 260,
    reqEvo: 6,
    grantEvo: 7,
    reqs: { evo_eggshell: 2 },
    grants: { evo_reptilian: 2 },
    effectText: '完成爬行类进化，解锁爬行类种族选择。',
  },

  {
    id: 'aquatic',
    name: '水生化',
    desc: '适应海洋或沼泽生态，走向水生属类。',
    dnaCost: 260,
    reqEvo: 5,
    grantEvo: 7,
    reqs: { evo_aquatic: 1 },
    condition: (state) => ['oceanic', 'swamp'].includes(state.city.biome),
    grants: { evo_aquatic: 2 },
    effectText: '完成水生进化，解锁水生种族选择。',
  },

  {
    id: 'fey',
    name: '精灵化',
    desc: '与森林、沼泽或泰加生态共鸣，走向精灵族属类。',
    dnaCost: 260,
    reqEvo: 5,
    grantEvo: 7,
    reqs: { evo_fey: 1 },
    condition: (state) => ['forest', 'swamp', 'taiga'].includes(state.city.biome),
    grants: { evo_fey: 2 },
    effectText: '完成精灵族进化，解锁精灵族种族选择。',
  },

  {
    id: 'heat',
    name: '耐热化',
    desc: '适应火山或灰土环境，走向热寒族属类。',
    dnaCost: 260,
    reqEvo: 5,
    grantEvo: 7,
    reqs: { evo_heat: 1 },
    condition: (state) => ['volcanic', 'ashland'].includes(state.city.biome),
    grants: { evo_heat: 2 },
    effectText: '完成热寒族进化，解锁耐热种族选择。',
  },

  {
    id: 'polar',
    name: '极地化',
    desc: '适应苔原或泰加严寒，走向极地族属类。',
    dnaCost: 260,
    reqEvo: 5,
    grantEvo: 7,
    reqs: { evo_polar: 1 },
    condition: (state) => ['tundra', 'taiga'].includes(state.city.biome),
    grants: { evo_polar: 2 },
    effectText: '完成极地族进化，解锁极地种族选择。',
  },

  {
    id: 'sand',
    name: '沙漠化',
    desc: '适应沙漠或灰土荒原，走向沙漠族属类。',
    dnaCost: 260,
    reqEvo: 5,
    grantEvo: 7,
    reqs: { evo_sand: 1 },
    condition: (state) => ['desert', 'ashland'].includes(state.city.biome),
    grants: { evo_sand: 2 },
    effectText: '完成沙漠族进化，解锁沙漠种族选择。',
  },

  {
    id: 'carnivore',
    name: '食肉化',
    desc: '将狩猎本能推向顶峰，形成食肉动物属类。',
    dnaCost: 255,
    reqEvo: 7,
    grantEvo: 7,
    reqs: { evo_animalism: 2 },
    grants: { evo_carnivore: 2, evo_animalism: 3 },
    effectText: '完成食肉动物进化，解锁食肉种族选择。',
  },

  {
    id: 'herbivore',
    name: '食草化',
    desc: '发展稳定的食草生态，形成食草动物属类。',
    dnaCost: 255,
    reqEvo: 7,
    grantEvo: 7,
    reqs: { evo_animalism: 2 },
    grants: { evo_herbivore: 2, evo_animalism: 3 },
    effectText: '完成食草动物进化，解锁食草种族选择。',
  },

  {
    id: 'omnivore',
    name: '杂食化',
    desc: '保留灵活食性，形成杂食动物属类。',
    dnaCost: 255,
    reqEvo: 7,
    grantEvo: 7,
    reqs: { evo_animalism: 2 },
    grants: { evo_omnivore: 2, evo_animalism: 3 },
    effectText: '完成杂食动物进化，解锁杂食种族选择。',
  },
];

// ============================================================
// 种族选择（evo=7, final=100）
// legacy L5136-5212: raceList → 每个种族需要 evo_xxx >= 2
// ============================================================

export const EVO_RACES: EvoRace[] = EVO_RACE_IDS.map((raceId) => raceToEvoRace(RACES[raceId]));

// ============================================================
// 辅助函数
// ============================================================

/** 读取 evolution 中某 key 的 count（0 if 不存在） */
function evoCount(state: GameState, key: string): number {
  const entry = state.evolution[key];
  if (!entry) return 0;
  if (typeof entry === 'number') return entry;
  return (entry as { count: number }).count ?? 0;
}

/** 读取 evolution 中某 key 是否存在（已解锁） */
function evoHas(state: GameState, key: string): boolean {
  return state.evolution[key] !== undefined && state.evolution[key] !== null;
}

/** 设置 evolution count */
function evoSetCount(state: GameState, key: string, count: number): void {
  const existing = state.evolution[key];
  if (!existing || typeof existing === 'number' || typeof existing === 'boolean') {
    state.evolution[key] = { count };
  } else {
    existing.count = count;
  }
}

/** 读取 tech 等级 */
function techLevel(state: GameState, id: string): number {
  return (state.tech[id] as number | undefined) ?? 0;
}

// ============================================================
// 进化 Tick（在 species === 'protoplasm' 时调用）
// 对标 legacy/src/main.js L1216-1282
// ============================================================

/**
 * 进化阶段 tick：自动产出 RNA/DNA + 触发新解锁
 * 由 tick.ts 在 species === 'protoplasm' 时调用
 *
 * @returns 是否有新解锁（可用于触发 UI 消息）
 */
export function evolutionTick(state: GameState, timeMul: number): boolean {
  let newUnlock = false;

  const rna = state.resource['RNA'];
  const dna = state.resource['DNA'];
  if (!rna) return false;

  // ----------------------------------------------------------
  // 1. nucleus 自动将 RNA → DNA
  //    legacy main.js L1220-1231:
  //    increment = nucleus.count
  //    while (RNA.amount < increment * 2) increment--
  //    DNA += increment * time_multiplier
  //    RNA -= increment * 2 * time_multiplier
  // ----------------------------------------------------------
  if (evoHas(state, 'nucleus') && dna && dna.amount < dna.max) {
    let increment = evoCount(state, 'nucleus');
    // 下调至 RNA 可负担的量
    while (rna.amount < increment * 2 * timeMul) {
      increment--;
      if (increment <= 0) break;
    }
    if (increment > 0) {
      // evo >= 5 时 DNA 产出翻倍（legacy L1227-1228），EvoZen Phase1 保留接口
      const dnaIncrement =
        techLevel(state, 'evo') >= 5 ? increment * 2 : increment;
      dna.amount = Math.min(dna.max, dna.amount + dnaIncrement * timeMul);
      rna.amount = Math.max(0, rna.amount - increment * 2 * timeMul);
    }
  }

  // ----------------------------------------------------------
  // 2. organelles 自动产出 RNA
  //    legacy main.js L1233-1238:
  //    rna_multiplier = 1 (evo >= 2 则 +1)
  //    RNA += organelles.count * rna_multiplier * time_multiplier
  // ----------------------------------------------------------
  if (evoHas(state, 'organelles')) {
    const orgCount = evoCount(state, 'organelles');
    if (orgCount > 0) {
      let rnaMult = 1;
      if (techLevel(state, 'evo') >= 2) rnaMult++;
      rna.amount = Math.min(rna.max, rna.amount + orgCount * rnaMult * timeMul);
    }
  }

  // ----------------------------------------------------------
  // 3. 解锁触发（有序检查，每次只触发一个）
  //    legacy main.js L1249-1281
  // ----------------------------------------------------------
  if (rna.amount >= 2 && !evoHas(state, 'dna')) {
    // DNA 解锁显示
    state.evolution['dna'] = 1;
    if (dna) dna.display = true;
    newUnlock = true;
  } else if (rna.amount >= 10 && !evoHas(state, 'membrane')) {
    state.evolution['membrane'] = { count: 0 };
    newUnlock = true;
  } else if (dna && dna.amount >= 4 && !evoHas(state, 'organelles')) {
    state.evolution['organelles'] = { count: 0 };
    newUnlock = true;
  } else if (
    evoHas(state, 'organelles') &&
    evoCount(state, 'organelles') >= 2 &&
    !evoHas(state, 'nucleus')
  ) {
    state.evolution['nucleus'] = { count: 0 };
    newUnlock = true;
  } else if (
    evoHas(state, 'nucleus') &&
    evoCount(state, 'nucleus') >= 1 &&
    !evoHas(state, 'eukaryotic_cell')
  ) {
    state.evolution['eukaryotic_cell'] = { count: 0 };
    newUnlock = true;
  } else if (
    evoHas(state, 'eukaryotic_cell') &&
    evoCount(state, 'eukaryotic_cell') >= 1 &&
    !evoHas(state, 'mitochondria')
  ) {
    state.evolution['mitochondria'] = { count: 0 };
    newUnlock = true;
  } else if (evoHas(state, 'mitochondria') && !techLevel(state, 'evo')) {
    // evo:1 解锁 → 可以研究 sexual_reproduction
    state.tech['evo'] = 1;
    newUnlock = true;
  }

  return newUnlock;
}

// ============================================================
// 购买进化升级
// ============================================================

/**
 * 购买一次可重复升级（如 membrane、organelles 等）
 * 对标 legacy/src/actions.js 各升级的 action()
 * @returns 新状态，或 null（资源不足）
 */
export function purchaseEvoUpgrade(
  state: GameState,
  upgradeId: string
): GameState | null {
  const upgrade = EVO_UPGRADES.find((u) => u.id === upgradeId);
  if (!upgrade) return null;

  const evoMap = state.evolution as unknown as Record<string, { count: number }>;
  if (!upgrade.isAvailable(evoMap as unknown as Record<string, { count: number } | number>))
    return null;

  const count = evoCount(state, upgradeId);
  const evoLevel = techLevel(state, 'evo');
  const rnaCost = upgrade.rnaCost ? upgrade.rnaCost(count, evoLevel) : 0;
  const dnaCost = upgrade.dnaCost ? upgrade.dnaCost(count, evoLevel) : 0;

  const rna = state.resource['RNA'];
  const dna = state.resource['DNA'];

  if (rnaCost > 0 && (!rna || rna.amount < rnaCost)) return null;
  if (dnaCost > 0 && (!dna || dna.amount < dnaCost)) return null;

  // 扣费
  const newState: GameState = JSON.parse(JSON.stringify(state));
  if (rnaCost > 0) newState.resource['RNA'].amount -= rnaCost;
  if (dnaCost > 0 && newState.resource['DNA']) {
    newState.resource['DNA'].amount -= dnaCost;
  }

  // 计算线粒体数（影响 membrane/eukaryotic_cell 的上限加成）
  const mitoCount = evoCount(newState, 'mitochondria');

  // 增加 count
  const prevCount = evoCount(newState, upgradeId);
  evoSetCount(newState as GameState, upgradeId, prevCount + 1);

  // 应用效果
  switch (upgradeId) {
    case 'membrane': {
      // RNA 上限 +5 (有线粒体时 +5×mito_count+5)
      // legacy L62-68: effect = mitochondria ? mito.count*5+5 : 5
      const gain = mitoCount > 0 ? mitoCount * 5 + 5 : 5;
      newState.resource['RNA'].max += gain;
      break;
    }
    case 'eukaryotic_cell': {
      // DNA 上限 +10 (有线粒体时 +10×mito_count+10)
      // legacy L129-135: effect = mito ? mito.count*10+10 : 10
      if (newState.resource['DNA']) {
        const gain = mitoCount > 0 ? mitoCount * 10 + 10 : 10;
        newState.resource['DNA'].max += gain;
      }
      break;
    }
    case 'mitochondria': {
      const memCount = evoCount(newState, 'membrane');
      const eukCount = evoCount(newState, 'eukaryotic_cell');
      if (memCount > 0) newState.resource['RNA'].max += memCount * 5;
      if (eukCount > 0 && newState.resource['DNA']) newState.resource['DNA'].max += eukCount * 10;
      break;
    }
    // organelles / nucleus：效果在 evolutionTick 中动态计算
  }

  return newState;
}

// ============================================================
// 推进进化步骤
// ============================================================

/**
 * 执行一个进化步骤（有性生殖/吞噬/多细胞等）
 * 消耗 DNA，推进 tech.evo 等级，解锁后续路径
 * @returns 新状态，或 null（条件不满足或资源不足）
 */
export function advanceEvoStep(
  state: GameState,
  stepId: string
): GameState | null {
  const step = EVO_STEPS.find((s) => s.id === stepId);
  if (!step) return null;

  if (!isEvoStepAvailable(state, step)) return null;

  // 检查 DNA
  const dna = state.resource['DNA'];
  if (!dna || dna.amount < step.dnaCost) return null;

  const newState: GameState = JSON.parse(JSON.stringify(state));
  newState.resource['DNA'].amount -= step.dnaCost;

  // 推进 evo 等级
  newState.tech['evo'] = step.grantEvo;

  // 附加 tech grants
  if (step.grants) {
    for (const [key, val] of Object.entries(step.grants)) {
      newState.tech[key] = val;
    }
  }
  step.apply?.(newState);

  // 更新 evolution.final（用于 UI 状态判断）
  // legacy L172/193/295/356/441/462: 各步骤设置 final 值
  const finalMap: Record<string, number> = {
    sexual_reproduction: 20,
    phagocytosis: 40,
    chloroplasts: 40,
    chitin: 40,
    exterminate: 100,
    multicellular: 60,
    bilateral_symmetry: 80,
    spores: 80,
    poikilohydric: 80,
    mammals: 90,
    eggshell: 90,
    animalism: 95,
    carnivore: 100,
    herbivore: 100,
    omnivore: 100,
    bryophyte: 100,
    athropods: 100,
    humanoid: 100,
    gigantism: 100,
    dwarfism: 100,
    celestial: 100,
    demonic: 100,
    eldritch: 100,
    endothermic: 100,
    ectothermic: 100,
    aquatic: 100,
    fey: 100,
    heat: 100,
    polar: 100,
    sand: 100,
  };
  if (stepId in finalMap) {
    newState.evolution['final'] = finalMap[stepId];
  }

  return newState;
}

// ============================================================
// 选择种族 → 触发 sentience（进入文明）
// 对标 legacy/src/actions.js L5195-5212 action() + sentience()
// ============================================================

/**
 * 选择种族并过渡到文明阶段
 * 相当于 legacy sentience() 的核心部分
 *
 * @returns 新状态，或 null（条件不满足或资源不足）
 */
export function evolveSentience(
  state: GameState,
  speciesId: string,
  options: { imitationTarget?: string } = {}
): SentienceResult | null {
  const raceDef = getEvoRaceDef(state, speciesId);
  if (!raceDef) return null;
  const imitationTarget = resolveImitationTarget(state, speciesId, options.imitationTarget);
  if (requiresImitationTarget(state, speciesId) && !imitationTarget) return null;

  // 检查 evo=7 且 final=100
  const evoLevel = techLevel(state, 'evo');
  const evoFinal = (state.evolution as unknown as Record<string, number>)['final'] ?? 0;
  if (evoLevel < 7 || evoFinal < 100) return null;

  // 检查所需的 evo_xxx tech（humanoid 类需要 evo_humanoid >= 2）
  const requiredTech = raceDef.requiredEvoTech;
  if (techLevel(state, requiredTech) < 2) return null;

  // 检查 RNA + DNA 费用
  const rna = state.resource['RNA'];
  const dna = state.resource['DNA'];
  if (!rna || rna.amount < raceDef.rnaCost) return null;
  if (!dna || dna.amount < raceDef.dnaCost) return null;

  const mainType = resolveSentienceMainType(state, speciesId);
  const newState: GameState = JSON.parse(JSON.stringify(state));
  newState.resource['RNA'].amount -= raceDef.rnaCost;
  newState.resource['DNA'].amount -= raceDef.dnaCost;

  // 隐藏 RNA/DNA — legacy sentience() L8354-8359
  if (newState.resource['RNA']) newState.resource['RNA'].display = false;
  if (newState.resource['DNA']) newState.resource['DNA'].display = false;

  // 清理 evolution 和 evo_xxx tech — legacy sentience() L8426-8432
  newState.evolution = {};
  const techKeys = Object.keys(newState.tech);
  for (const k of techKeys) {
    if (k.startsWith('evo_') || k === 'evo') {
      delete newState.tech[k];
    }
  }

  return { state: newState, speciesId, mainType, imitationTarget };
}

export function evolveRandomSentience(state: GameState): SentienceResult | null {
  const speciesId = chooseRandomSentienceSpecies(state);
  if (!speciesId) return null;

  const evoLevel = techLevel(state, 'evo');
  const evoFinal = (state.evolution as unknown as Record<string, number>)['final'] ?? 0;
  if (evoLevel < 7 || evoFinal < 100) return null;

  const rna = state.resource['RNA'];
  const dna = state.resource['DNA'];
  if (!rna || rna.amount < 300) return null;
  if (!dna || dna.amount < 300) return null;

  const mainType = resolveSentienceMainType(state, speciesId);
  const newState: GameState = JSON.parse(JSON.stringify(state));
  newState.resource['RNA'].amount -= 300;
  newState.resource['DNA'].amount -= 300;

  if (newState.resource['RNA']) newState.resource['RNA'].display = false;
  if (newState.resource['DNA']) newState.resource['DNA'].display = false;

  newState.evolution = {};
  const techKeys = Object.keys(newState.tech);
  for (const k of techKeys) {
    if (k.startsWith('evo_') || k === 'evo') {
      delete newState.tech[k];
    }
  }

  return { state: newState, speciesId, mainType };
}

function resolveSentienceMainType(state: GameState, speciesId: string): GenusId | undefined {
  const race = RACES[speciesId as RaceId];
  if (speciesId === 'custom' || speciesId === 'hybrid') {
    const config = loadCustomRace(state, speciesId === 'hybrid');
    if (!config) return undefined;
    const typeList = config.genus === 'hybrid' ? (config.hybrid ?? ['humanoid']) : [config.genus];
    return typeList.find((type) => techLevel(state, `evo_${type}`) >= 2) ?? typeList[0];
  }
  if (!race) return undefined;
  const typeList = getAchievementLevel(state, 'godslayer') > 0 && race.type === 'hybrid' && race.hybrid
    ? race.hybrid
    : [race.type];
  return typeList.find((type) => techLevel(state, `evo_${type}`) >= 2) ?? typeList[0];
}

function requiresImitationTarget(state: GameState, speciesId: string): boolean {
  if (speciesId === 'synth') return getSynthImitationTargets(state).length > 0;
  if (speciesId === 'custom' || speciesId === 'hybrid') {
    const config = loadCustomRace(state, speciesId === 'hybrid');
    return Boolean(config?.traits.includes('imitation') && getSynthImitationTargets(state).length > 0);
  }
  return false;
}

function resolveImitationTarget(
  state: GameState,
  speciesId: string,
  target?: string
): RaceId | undefined {
  if (!requiresImitationTarget(state, speciesId)) return undefined;
  const targets = getSynthImitationTargets(state);
  return targets.find((race) => race.id === target)?.id;
}

// ============================================================
// 查询辅助
// ============================================================

/** 获取当前可购买的升级列表（已解锁） */
export function getAvailableUpgrades(state: GameState): EvoUpgrade[] {
  const evoMap = state.evolution as unknown as Record<
    string,
    { count: number } | number
  >;
  return EVO_UPGRADES.filter((u) => u.isAvailable(evoMap));
}

/** 获取当前可触发的进化步骤（reqEvo 匹配） */
export function getAvailableSteps(state: GameState): EvoStep[] {
  return EVO_STEPS.filter((s) => isEvoStepAvailable(state, s));
}

/** 获取当前可选的种族（evo=7 且 final=100 后） */
export function getAvailableRaces(state: GameState): EvoRace[] {
  const evoLevel = techLevel(state, 'evo');
  const evoFinal = (state.evolution as unknown as Record<string, number>)['final'] ?? 0;
  if (evoLevel < 7 || evoFinal < 100) return [];
  const races = EVO_RACES.filter((r) => isEvoRaceAvailable(state, r));
  const customRace = getCustomEvoRace(state, false);
  if (customRace) races.push(customRace);
  const hybridRace = getCustomEvoRace(state, true);
  if (hybridRace) races.push(hybridRace);
  return races;
}

export function getSynthImitationTargets(state: GameState): RaceDefinition[] {
  const statsSynth = state.stats.synth ?? {};
  const savedTarget = typeof state.race['srace'] === 'string' ? state.race['srace'] : undefined;
  const ids = new Set<string>([
    ...Object.keys(statsSynth),
    ...(savedTarget ? [savedTarget] : []),
  ]);
  const targets = EVO_RACE_IDS
    .filter((raceId) => raceId !== 'synth' && raceId !== 'nano' && ids.has(raceId))
    .map((raceId) => RACES[raceId])
    .filter(Boolean);
  if (ids.has('custom') && loadCustomRace(state, false)) targets.push(RACES.custom);
  if (ids.has('hybrid') && loadCustomRace(state, true)) targets.push(RACES.hybrid);
  return targets;
}

/** 获取升级当前 count */
export function getUpgradeCount(state: GameState, upgradeId: string): number {
  return evoCount(state, upgradeId);
}

/** 获取升级当前费用（考虑已购买次数） */
export function getUpgradeCost(
  state: GameState,
  upgradeId: string
): { rna: number; dna: number } {
  const upgrade = EVO_UPGRADES.find((u) => u.id === upgradeId);
  if (!upgrade) return { rna: 0, dna: 0 };
  const count = evoCount(state, upgradeId);
  const evoLevel = techLevel(state, 'evo');
  return {
    rna: upgrade.rnaCost ? upgrade.rnaCost(count, evoLevel) : 0,
    dna: upgrade.dnaCost ? upgrade.dnaCost(count, evoLevel) : 0,
  };
}

function isEvoStepAvailable(state: GameState, step: EvoStep): boolean {
  if (techLevel(state, 'evo') !== step.reqEvo) return false;
  if (step.reqs) {
    for (const [techId, lvl] of Object.entries(step.reqs)) {
      if (techLevel(state, techId) < lvl) return false;
    }
  }
  return step.condition ? step.condition(state) : true;
}

function getEvoRaceDef(state: GameState, speciesId: string): EvoRace | null {
  const race = EVO_RACES.find((r) => r.id === speciesId);
  if (race) return isEvoRaceAvailable(state, race) ? race : null;
  if (speciesId === 'custom') return getCustomEvoRace(state, false);
  if (speciesId === 'hybrid') return getCustomEvoRace(state, true);
  return null;
}

function chooseRandomSentienceSpecies(state: GameState): string | null {
  const genus = getCompletedGenus(state);
  if (!genus) return null;
  const candidates = getRandomSentienceCandidates(state, genus);
  if (candidates.length === 0) return null;

  const freshCandidates = candidates.filter((race) => getAchievementLevel(state, `extinct_${race.id}`) <= 0);
  const pool = freshCandidates.length > 0 ? freshCandidates : candidates;
  return pool[Math.floor(Math.random() * pool.length)]?.id ?? null;
}

function getRandomSentienceCandidates(state: GameState, genus: GenusId): RaceDefinition[] {
  return EVO_RACE_IDS
    .map((raceId) => RACES[raceId])
    .filter((race) => race.type === genus && (race.basic(state) || isRandomOnlyGenusRace(race)));
}

function isRandomOnlyGenusRace(race: RaceDefinition): boolean {
  return ['synthetic', 'eldritch'].includes(race.type) && !['custom', 'hybrid'].includes(race.id);
}

function getCompletedGenus(state: GameState): GenusId | null {
  for (const genus of Object.keys(GENUS_DEFS) as GenusId[]) {
    if (genus === 'organism' || genus === 'hybrid') continue;
    if (techLevel(state, `evo_${genus}`) >= 2) return genus;
  }
  return null;
}

function isEvoRaceAvailable(state: GameState, race: EvoRace): boolean {
  const raceDef = RACES[race.id as RaceId];
  if (!raceDef) return false;
  if (!isRaceGenusAvailable(state, raceDef, race.requiredEvoTech)) return false;
  return isRaceUnlockedForSelection(state, raceDef);
}

function isRaceGenusAvailable(state: GameState, race: RaceDefinition, fallbackTech: string): boolean {
  if (race.type !== 'hybrid') return techLevel(state, fallbackTech) >= 2;
  if (!race.hybrid || race.hybrid.length === 0) return false;
  if (getAchievementLevel(state, 'godslayer') <= 0) return false;
  return race.hybrid.some((genus) => techLevel(state, `evo_${genus}`) >= 2);
}

function isRaceUnlockedForSelection(state: GameState, race: RaceDefinition): boolean {
  const raceState = state.race as Record<string, unknown>;
  if (raceState['seeded']) return true;
  if (getAchievementLevel(state, 'mass_extinction') > 0) return true;
  return getAchievementLevel(state, `extinct_${race.id}`) > 0;
}

function getCustomEvoRace(state: GameState, hybrid: boolean): EvoRace | null {
  const speciesId = hybrid ? 'hybrid' : 'custom';
  const config = loadCustomRace(state, hybrid);
  if (!config) return null;
  const requiredEvoTech = getCustomRaceRequiredEvoTech(state, config.genus, config.hybrid);
  if (!requiredEvoTech) return null;
  if (!isCustomRaceUnlockedForSelection(state, hybrid)) return null;
  return {
    id: speciesId,
    name: config.name || RACES[speciesId].name,
    emoji: hybrid ? '🧬' : '⚙️',
    requiredEvoTech,
    desc: config.desc || RACES[speciesId].desc,
    rnaCost: 320,
    dnaCost: 320,
  };
}

function isCustomRaceUnlockedForSelection(state: GameState, hybrid: boolean): boolean {
  const raceState = state.race as Record<string, unknown>;
  if (raceState['seeded']) return true;
  if (getAchievementLevel(state, 'mass_extinction') > 0) return true;
  return getAchievementLevel(state, hybrid ? 'extinct_hybrid' : 'extinct_custom') > 0;
}

function getGenusEvoTech(genus: GenusId): string | null {
  if (!GENUS_DEFS[genus]) return null;
  if (genus === 'hybrid') return 'evo_humanoid';
  return `evo_${genus}`;
}

function getCustomRaceRequiredEvoTech(state: GameState, genus: GenusId, hybridGenus?: GenusId[]): string | null {
  if (genus !== 'hybrid') {
    const tech = getGenusEvoTech(genus);
    return tech && techLevel(state, tech) >= 2 ? tech : null;
  }
  for (const parentGenus of hybridGenus ?? ['humanoid']) {
    const tech = getGenusEvoTech(parentGenus);
    if (tech && techLevel(state, tech) >= 2) return tech;
  }
  return null;
}

function raceToEvoRace(race: RaceDefinition): EvoRace {
  return {
    id: race.id,
    name: race.name,
    emoji: GENUS_EMOJIS[race.type] ?? '•',
    requiredEvoTech: getRaceRequiredEvoTech(race),
    desc: race.desc,
    rnaCost: 320,
    dnaCost: 320,
  };
}

function getRaceRequiredEvoTech(race: RaceDefinition): string {
  if (race.type !== 'hybrid') return `evo_${race.type}`;
  return `evo_${race.hybrid?.[0] ?? 'humanoid'}`;
}
