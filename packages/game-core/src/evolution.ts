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
  // grants: evo_humanoid/evo_giant/evo_small/evo_animalism/evo_demonic/evo_angelic/...
  // EvoZen 仅解锁 evo_humanoid + evo_mammals
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
];

// ============================================================
// 种族选择（evo=7, final=100）
// legacy L5136-5212: raceList → 每个种族需要 evo_xxx >= 2
// EvoZen Phase 1：仅 humanoid 类型（human/orc/elven/dwarf/goblin）
// ============================================================

export const EVO_RACES: EvoRace[] = [
  {
    id: 'human',
    name: '人类',
    emoji: '🧑',
    requiredEvoTech: 'evo_humanoid',
    desc: '平衡发展的多面手，ARPA 项目扩张成本更低。',
    rnaCost: 320,
    dnaCost: 320,
  },
  {
    id: 'orc',
    name: '兽人',
    emoji: '👹',
    requiredEvoTech: 'evo_humanoid',
    desc: '强壮好战，训练速度翻倍，但饥饿时产出锐减。',
    rnaCost: 320,
    dnaCost: 320,
  },
  {
    id: 'elven',
    name: '精灵',
    emoji: '🧝',
    requiredEvoTech: 'evo_humanoid',
    desc: '博学多才，知识获取更快，但购买资源价格偏贵。',
    rnaCost: 320,
    dnaCost: 320,
  },
  {
    id: 'dwarf',
    name: '矮人',
    emoji: '⛏️',
    requiredEvoTech: 'evo_humanoid',
    desc: '能工巧匠，制造和科研成本更低。',
    rnaCost: 320,
    dnaCost: 320,
  },
  {
    id: 'goblin',
    name: '地精',
    emoji: '👺',
    requiredEvoTech: 'evo_humanoid',
    desc: '精明商人，税率与卖价优惠，天生的贸易好手。',
    rnaCost: 320,
    dnaCost: 320,
  },
];

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

  // 检查 evo 等级
  if (techLevel(state, 'evo') !== step.reqEvo) return null;

  // 检查额外前置 tech
  if (step.reqs) {
    for (const [techId, lvl] of Object.entries(step.reqs)) {
      if (techLevel(state, techId) < lvl) return null;
    }
  }

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

  // 更新 evolution.final（用于 UI 状态判断）
  // legacy L172/193/295/356/441/462: 各步骤设置 final 值
  const finalMap: Record<string, number> = {
    sexual_reproduction: 20,
    phagocytosis: 40,
    multicellular: 60,
    bilateral_symmetry: 80,
    mammals: 90,
    humanoid: 100,
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
  speciesId: string
): GameState | null {
  const raceDef = EVO_RACES.find((r) => r.id === speciesId);
  if (!raceDef) return null;

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

  return newState;
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
  const evoNow = techLevel(state, 'evo');
  return EVO_STEPS.filter((s) => s.reqEvo === evoNow);
}

/** 获取当前可选的种族（evo=7 且 final=100 后） */
export function getAvailableRaces(state: GameState): EvoRace[] {
  const evoLevel = techLevel(state, 'evo');
  const evoFinal = (state.evolution as unknown as Record<string, number>)['final'] ?? 0;
  if (evoLevel < 7 || evoFinal < 100) return [];
  return EVO_RACES.filter(
    (r) => techLevel(state, r.requiredEvoTech) >= 2
  );
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
