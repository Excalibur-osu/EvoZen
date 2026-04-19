/**
 * 太空支援池解算（Phase 1C MVP: spc_moon）
 *
 * 对标 legacy/src/main.js L2256-2381 的 "Moon Bases, Spaceports, Etc" 循环块，
 * 只实装 `moon` 池（spc_moon）。其他池（red/belt/...）留给后续 sprint。
 *
 * 支援池的语义：
 *   1. 某一池有一个 "区域供给者"（legacy: info.support 指向的建筑；此处为 moon_base）。
 *      - 每座 on 的供给者按 `support.amount` 提供 support 容量（s_max）。
 *      - 若供给者声明了 supportFuel，on 的座数还会受 Oil 等燃料制约，燃料不足则削减 p_on。
 *   2. 其他区域（例如 spc_home 的 nav_beacon）可以"跨区"向某池追加 s_max。
 *      - 通过 SpaceStructureDefinition.support 把 pool 指向目标池即可。
 *   3. 消耗者（legacy: support() 返回负数；此处 support.amount < 0）按"声明顺序"依次尝试激活：
 *      - 每座消耗 `-support.amount` 容量，直到池空或建筑 on 耗尽。
 *      - 最终得到 support_on[id]：实际有支援的座数（<= state.space[id].on）。
 *
 * 返回值：
 *   - `powerDraw[id]`: 每座 on 的供给者 / 消耗者为电网制造的"需要供电"数量（由调用方合入电力分配）。
 *     当前模块不修改电力，只返回应"尝试通电"的座数（= state.space[id].on），电力裁剪在 power.ts 完成。
 *   - `supportOn[id]`: 实际获得支援的消耗者座数，供 tick.ts 读取产出。
 *   - `fuelDrain[resource]`: 本 tick 因 supportFuel 被消耗的燃料总量（未乘 TIME_MULTIPLIER）。
 *
 * 写回：
 *   - 直接在 state.space[供给者].s_max 和 .support 上写入（legacy 风格）。
 */

import type { GameState } from '@evozen/shared-types';
import {
  SPACE_STRUCTURES,
  getSpaceSupplyDefs,
  getSpaceConsumerDefs,
  type SupportPool,
  type SpaceStructureDefinition,
} from './space';

/**
 * 支援解算输出结构。tick.ts 基于此计算产出 / 合并电力。
 */
export interface SpaceSupportResult {
  /** 按建筑 ID 区分的"实际获得支援"座数。提供者不出现在这里（提供者的 on 由燃料制约单独处理）。 */
  supportOn: Record<string, number>;
  /** 按资源 ID 聚合的燃料消耗总量（未乘 TIME_MULTIPLIER）。 */
  fuelDrain: Record<string, number>;
  /** 按建筑 ID 区分的"供给者 on 实际数"（可能因燃料不足被削减到 0~state.space[id].on）。 */
  supplierEffectiveOn: Record<string, number>;
}

function structOn(state: GameState, id: string): number {
  const s = state.space[id] as { count?: number; on?: number } | undefined;
  if (!s) return 0;
  return s.on ?? s.count ?? 0;
}

/**
 * 计算某座太空建筑在本 tick 的"通电有效 on"：
 *   - 若定义了 powerCost（如 moon_base / nav_beacon），以 power 分配结果为准；
 *   - 否则（如 iridium_mine / helium_mine），以 state.space[id].on 为准。
 */
function effectiveOnForSupport(
  state: GameState,
  def: SpaceStructureDefinition,
  powerOn: Record<string, number>,
): number {
  if ((def.powerCost ?? 0) > 0) {
    return powerOn[def.id] ?? 0;
  }
  return structOn(state, def.id);
}

/**
 * 针对单个支援池做解算。
 *
 * 对标 legacy main.js L2267-2380 的 forEach 块（在 sup.g === 池名 分支）。
 *
 * 关键差异（MVP 简化）：
 *   - 不处理 truepath / cataclysm / orbit_decayed / warlord 等特殊情形
 *   - 燃料消耗按"每座 supportFuel.amountPerTick"扣除；资源不足时逐座削减 supplier 的 on
 *   - 消耗者优先级 = `SPACE_STRUCTURES` 中的声明顺序（与 legacy 的 global.support[sup.g] 一致）
 */
function resolvePool(
  state: GameState,
  pool: SupportPool,
  powerOn: Record<string, number>,
  result: SpaceSupportResult,
): void {
  // --- (1) 计算供给者 on 数（powered + 燃料双重裁剪） ---
  const supplyDefs = getSpaceSupplyDefs(pool);
  // 区分"本池主供给者"（与 region 名约定对应：pool 'moon' 主供给者在 region 'spc_moon'）
  // 以及"跨区供给者"（例如 nav_beacon 在 spc_home 向 moon 池 +1 s_max）。
  // 两者在 legacy 的差异只在于：主供给者会消耗 supportFuel 并按 p_on 计算 s_max；跨区供给者
  // 只贡献 s_max，不自带燃料。
  const primaryRegion = pool === 'moon' ? 'spc_moon' : null;

  let sMax = 0;

  for (const def of supplyDefs) {
    // 供给者通常需要电力，先取电力分配后的 on 数
    const poweredOn = effectiveOnForSupport(state, def, powerOn);
    if (poweredOn === 0) {
      result.supplierEffectiveOn[def.id] = 0;
      continue;
    }

    let effectiveOn = poweredOn;

    // 主供给者燃料消耗：逐座尝试，不足则进一步削减
    if (def.region === primaryRegion && def.supportFuel) {
      const { resource: fuelRes, amountPerTick } = def.supportFuel;
      const res = state.resource[fuelRes];
      if (!res || res.amount <= 0) {
        effectiveOn = 0;
      } else {
        // 与 tick.ts 统一使用 TIME_MULTIPLIER = 0.25
        const perUnit = amountPerTick * 0.25;
        let available = res.amount;
        let supported = 0;
        for (let i = 0; i < poweredOn; i++) {
          if (available >= perUnit) {
            available -= perUnit;
            supported++;
          } else {
            break;
          }
        }
        effectiveOn = supported;
        const consumed = supported * amountPerTick;
        if (consumed > 0) {
          result.fuelDrain[fuelRes] = (result.fuelDrain[fuelRes] ?? 0) + consumed;
        }
      }
    }

    result.supplierEffectiveOn[def.id] = effectiveOn;
    sMax += effectiveOn * def.support!.amount;
  }

  // --- (2) 对消耗者按声明顺序分配支援 ---
  const consumerDefs = getSpaceConsumerDefs(pool);
  let remaining = sMax;
  let usedSupport = 0;

  for (const def of consumerDefs) {
    const declaredOn = effectiveOnForSupport(state, def, powerOn);
    if (declaredOn === 0) {
      result.supportOn[def.id] = 0;
      continue;
    }
    const costPer = -def.support!.amount; // 正数
    const maxByPool = Math.max(0, Math.floor(remaining / costPer));
    const operating = Math.min(declaredOn, maxByPool);
    result.supportOn[def.id] = operating;
    remaining -= operating * costPer;
    usedSupport += operating * costPer;
  }

  // --- (3) 写回主供给者 state.space[...].s_max / .support（legacy 风格，UI 可读） ---
  if (primaryRegion) {
    const mainDef = supplyDefs.find((d) => d.region === primaryRegion);
    if (mainDef) {
      const struct = state.space[mainDef.id] as
        | { count: number; on?: number; support?: number; s_max?: number }
        | undefined;
      if (struct) {
        struct.s_max = sMax;
        struct.support = usedSupport;
      }
    }
  }
}

/**
 * 一次性解算所有支援池。tick.ts 在电力分配之后调用。
 * 当前只处理 `moon` 池。
 *
 * @param state - 当前游戏状态（主供给者的 s_max / support 会被直接回写）
 * @param powerOn - powerTick 产出的 activeConsumers（太空建筑仅当 powerCost>0 时读这里）
 */
export function resolveSpaceSupport(
  state: GameState,
  powerOn: Record<string, number> = {},
): SpaceSupportResult {
  const result: SpaceSupportResult = {
    supportOn: {},
    fuelDrain: {},
    supplierEffectiveOn: {},
  };
  resolvePool(state, 'moon', powerOn, result);
  return result;
}

/** 列出所有需要电力的太空建筑（用于 power.ts 的太空消费者枚举）。 */
export function listSpacePowerConsumers(): SpaceStructureDefinition[] {
  return SPACE_STRUCTURES.filter((d) => (d.powerCost ?? 0) > 0);
}
