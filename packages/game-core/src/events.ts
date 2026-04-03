/**
 * 随机事件系统
 * 对标 legacy/src/events.js
 *
 * 事件分为两类：
 *   major — 影响较大（资源损失/大型奖励），约每 200 tick 触发一次
 *   minor — 小事件（文字/天气/小量资源），约每 499 tick 触发一次
 *
 * 调度器：使用 state.event.t / state.m_event.t 倒计时
 * 触发后随机选取可用事件，执行效果，重置倒计时并产生消息
 */

import type { GameState, GameMessage } from '@evozen/shared-types';
import { armyRating, garrisonSize } from './military';

// ============================================================
// 类型定义
// ============================================================

export interface EventRequirements {
  /** 需要该科技已解锁（任意等级 ≥1） */
  tech?: string;
  /** 要求该科技未解锁 */
  notech?: string;
  /** 需要该资源显示 */
  resource?: string;
  /** 士气低于该值时才触发 */
  low_morale?: number;
}

export interface EventDefinition {
  id: string;
  type: 'major' | 'minor';
  reqs: EventRequirements;
  /** 额外条件检查，返回 true 时才加入候选池 */
  condition?: (state: GameState) => boolean;
  /** 事件效果，返回文字描述；允许直接修改传入的 state */
  effect: (state: GameState) => string;
}

// ============================================================
// 工具函数
// ============================================================

function techLevel(state: GameState, id: string): number {
  return state.tech[id] ?? 0;
}

function hasResource(state: GameState, id: string): boolean {
  return state.resource[id]?.display === true;
}

function rng(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min)) + min;
}

function clampResource(state: GameState, id: string, delta: number): number {
  const res = state.resource[id];
  if (!res) return 0;
  const newAmt = Math.max(0, Math.min(res.amount + delta, res.max >= 0 ? res.max : Infinity));
  const actual = newAmt - res.amount;
  res.amount = newAmt;
  return Math.abs(actual);
}

// ============================================================
// 事件列表
// ============================================================

export const EVENTS: EventDefinition[] = [

  // ---- MAJOR 事件 ----

  // legacy events.js L43-51: inspiration
  {
    id: 'inspiration',
    type: 'major',
    reqs: { resource: 'Knowledge' },
    effect(state) {
      const ticks = rng(300, 600);
      (state.race as any)['inspired'] = ticks;
      return `💡 灵感迸发！一位市民灵光一闪，未来 ${ticks} tick 的知识产出提升 50%。`;
    },
  },

  // legacy events.js L53-61: motivation
  {
    id: 'motivation',
    type: 'major',
    reqs: { tech: 'primitive' },
    effect(state) {
      const ticks = rng(300, 600);
      (state.race as any)['motivated'] = ticks;
      return `💪 士气高涨！市民们干劲十足，未来 ${ticks} tick 所有产出 +5%。`;
    },
  },

  // legacy events.js L62-76: fire
  {
    id: 'fire',
    type: 'major',
    reqs: { resource: 'Lumber' },
    effect(state) {
      const lumber = state.resource['Lumber'];
      if (!lumber || lumber.amount <= 0) return '🔥 一场小火灾扑灭了，这次没有损失。';
      const loss = rng(1, Math.max(1, Math.floor(lumber.amount / 4)));
      clampResource(state, 'Lumber', -loss);
      return `🔥 火灾！木材仓库起火，损失了 ${loss} 木材！`;
    },
  },

  // legacy events.js L133-186: raid
  {
    id: 'raid',
    type: 'major',
    reqs: { tech: 'military', notech: 'world_control' },
    condition(state) {
      const foreign = state.civic.foreign;
      if (!foreign) return false;
      return (
        foreign.gov0.hstl > 60 ||
        foreign.gov1.hstl > 60 ||
        foreign.gov2.hstl > 60
      );
    },
    effect(state) {
      const garrison = state.civic.garrison as any;
      const gSize = garrisonSize(state);
      const army = armyRating(gSize, state);
      const htLevel = techLevel(state, 'high_tech');
      const eAdv = htLevel > 0 ? htLevel + 1 : 1;
      const enemy = rng(25, 50) * eAdv;

      // 士兵伤亡
      const injured = Math.min(garrison.wounded, gSize);
      const killed = Math.floor(Math.random() * (injured + 1));
      const wounded = Math.floor(Math.random() * Math.max(1, gSize - injured));

      // 扣除士兵
      if (killed > 0) {
        garrison.workers = Math.max(0, garrison.workers - killed);
        const species = state.race.species;
        const pop = state.resource[species];
        if (pop) pop.amount = Math.max(0, pop.amount - killed);
        (state.stats as any).died = ((state.stats as any).died ?? 0) + killed;
      }
      garrison.wounded = Math.min(garrison.workers, garrison.wounded + wounded);
      if (garrison.protest !== undefined) {
        garrison.protest = Math.min(100, (garrison.protest ?? 0) + 5);
      }

      if (army > enemy) {
        return `⚔️ 外敌来袭！守军成功击退入侵者。${killed > 0 ? `我方阵亡 ${killed} 人，` : ''}受伤 ${wounded} 人。`;
      } else {
        const loss = rng(1, Math.max(1, Math.floor((state.resource['Money']?.amount ?? 0) / 4)));
        clampResource(state, 'Money', -loss);
        return `⚔️ 外敌来袭！守军寡不敌众，损失金钱 ${loss}，${killed > 0 ? `阵亡 ${killed} 人，` : ''}受伤 ${wounded} 人。`;
      }
    },
  },

  // legacy events.js L529-545: mine_collapse
  {
    id: 'mine_collapse',
    type: 'major',
    reqs: { tech: 'mining' },
    condition(state) {
      const miner = state.civic['miner'] as { workers: number } | undefined;
      const species = state.race.species;
      return (miner?.workers ?? 0) > 0 && (state.resource[species]?.amount ?? 0) > 0;
    },
    effect(state) {
      const species = state.race.species;
      const pop = state.resource[species];
      if (pop) pop.amount = Math.max(0, pop.amount - 1);
      const miner = state.civic['miner'] as { workers: number } | undefined;
      if (miner && miner.workers > 0) miner.workers--;
      const unemployed = state.civic['unemployed'] as { workers: number } | undefined;
      if (unemployed) unemployed.workers = Math.max(0, unemployed.workers - 1);
      return `⛏️ 矿井坍塌！一名矿工在事故中遇难。`;
    },
  },

  // legacy events.js L398-416: tax_revolt
  {
    id: 'tax_revolt',
    type: 'major',
    reqs: { tech: 'primitive', low_morale: 99 },
    condition(state) {
      const threshold = state.civic.govern?.type === 'oligarchy' ? 45 : 25;
      return (state.civic.taxes?.tax_rate ?? 20) > threshold;
    },
    effect(state) {
      const govType = state.civic.govern?.type ?? 'anarchy';
      const ramp = govType === 'oligarchy' ? 45 : 25;
      const taxRate = state.civic.taxes?.tax_rate ?? 20;
      const risk = (taxRate - ramp) * 0.04;
      const specialRes = new Set(['Soul_Gem', 'Corrupt_Gem', 'Codex', 'Demonic_Essence']);
      for (const [resId, res] of Object.entries(state.resource)) {
        if (specialRes.has(resId) || !res.display || res.amount <= 0) continue;
        const loss = rng(1, Math.max(1, Math.round(res.amount * risk)));
        res.amount = Math.max(0, res.amount - loss);
      }
      return `🗡️ 税收起义！过高的税率激起了民众抗议，资源遭受损失！`;
    },
  },

  // ---- MINOR 事件 ----

  // legacy events.js L804-826: heatwave（热浪）
  {
    id: 'heatwave',
    type: 'minor',
    reqs: { tech: 'primitive' },
    condition(state) {
      return (state.city.calendar?.temp ?? 1) !== 2;
    },
    effect(state) {
      if (state.city.calendar) state.city.calendar.temp = 2;
      return `☀️ 热浪来袭！气温急剧升高，田间作物受到轻微影响。`;
    },
  },

  // legacy events.js L828-854: coldsnap（寒流）
  {
    id: 'coldsnap',
    type: 'minor',
    reqs: { tech: 'primitive' },
    condition(state) {
      return (state.city.calendar?.temp ?? 1) !== 0;
    },
    effect(state) {
      if (state.city.calendar) state.city.calendar.temp = 0;
      return `❄️ 寒流突袭！气温骤降，请注意保障供暖。`;
    },
  },

  // legacy events.js L897-911: dark_cloud（乌云）
  {
    id: 'dark_cloud',
    type: 'minor',
    reqs: { tech: 'primitive' },
    condition(state) {
      return (state.city.calendar?.weather ?? 2) !== 0;
    },
    effect(state) {
      if (state.city.calendar) state.city.calendar.weather = 0;
      return `🌧️ 乌云密布，阴雨天气笼罩了城市。`;
    },
  },

  // legacy events.js L913-927: gloom（阴天）
  {
    id: 'gloom',
    type: 'minor',
    reqs: { tech: 'primitive' },
    condition(state) {
      return (state.city.calendar?.weather ?? 2) !== 1;
    },
    effect(state) {
      if (state.city.calendar) state.city.calendar.weather = 1;
      return `☁️ 天空布满积云，阴沉的天气让人提不起劲来。`;
    },
  },

  // legacy events.js dollar basicEvent
  {
    id: 'dollar',
    type: 'minor',
    reqs: { tech: 'currency' },
    effect(state) {
      const cash = rng(1, 10);
      clampResource(state, 'Money', cash);
      return `💰 路边发现了一笔意外之财，获得 ${cash} 金币！`;
    },
  },

  // legacy events.js pickpocket basicEvent
  {
    id: 'pickpocket',
    type: 'minor',
    reqs: { resource: 'Money' },
    effect(state) {
      const cash = rng(1, 10);
      clampResource(state, 'Money', -cash);
      return `🦹 有小偷！钱包里少了 ${cash} 金币。`;
    },
  },

  // legacy events.js shooting_star basicEvent
  {
    id: 'shooting_star',
    type: 'minor',
    reqs: { tech: 'primitive' },
    effect(_state) {
      const quotes = [
        '🌠 夜空中划过一颗流星，让人不禁许下心愿。',
        '🌠 一道亮光划破夜空，消失在远方的地平线。',
        '🌠 流星雨！市民们仰头望天，欢呼雀跃。',
      ];
      return quotes[rng(0, quotes.length)];
    },
  },

  // legacy events.js meteor_shower basicEvent
  {
    id: 'meteor_shower',
    type: 'minor',
    reqs: { tech: 'primitive' },
    effect(_state) {
      return `☄️ 壮观的流星雨划过星空，市民们驻足仰望，士气略有提升。`;
    },
  },

  // legacy events.js tumbleweed basicEvent
  {
    id: 'tumbleweed',
    type: 'minor',
    reqs: { tech: 'primitive' },
    effect(_state) {
      return `🌵 一团枯草随风滚过，什么都没有发生。`;
    },
  },

  // legacy events.js contest
  {
    id: 'contest',
    type: 'minor',
    reqs: { tech: 'science' },
    effect(_state) {
      const places = ['第一名', '第二名', '第三名'];
      const types = ['绘画比赛', '诗歌朗诵', '烹饪大赛', '数学竞赛', '体育运动会', '发明展览'];
      const place = places[rng(0, places.length)];
      const type = types[rng(0, types.length)];
      return `🏆 城市举办了${type}，我们的代表荣获${place}！`;
    },
  },

  // legacy events.js crop_circle
  {
    id: 'crop_circle',
    type: 'minor',
    reqs: { tech: 'agriculture' },
    effect(_state) {
      return `🌀 田野里出现了神秘的麦田怪圈，引发了市民的广泛猜测。`;
    },
  },

  // legacy events.js compass
  {
    id: 'compass',
    type: 'minor',
    reqs: { tech: 'mining' },
    effect(_state) {
      return `🧭 工人在矿场发现了一枚古老的指南针，正试图弄清楚它的来历。`;
    },
  },

  // legacy events.js tremor
  {
    id: 'tremor',
    type: 'minor',
    reqs: { tech: 'primitive' },
    effect(_state) {
      return `🌍 城市感受到轻微的地面震动，但没有造成损失。`;
    },
  },

  // legacy events.js bird
  {
    id: 'bird',
    type: 'minor',
    reqs: { tech: 'primitive' },
    effect(_state) {
      const msgs = [
        '🐦 一只鸟在城门上停留片刻，好像在审视着我们。',
        '🦅 一只雄鹰在城市上空盘旋，象征着力量与自由。',
        '🐧 一只奇怪的鸟从北方飞来，市民们议论纷纷。',
      ];
      return msgs[rng(0, msgs.length)];
    },
  },

  // legacy events.js omen
  {
    id: 'omen',
    type: 'minor',
    reqs: { tech: 'primitive' },
    effect(_state) {
      const omens = [
        '🔮 夜晚星象异常，占星师预言即将有大事发生。',
        '🌑 月食出现，城中老人说这是不祥之兆。',
        '🌅 日出时天空呈现罕见的红色，令人心生敬畏。',
      ];
      return omens[rng(0, omens.length)];
    },
  },
];

// ============================================================
// 事件池筛选
// ============================================================

function filterEvents(state: GameState, type: 'major' | 'minor', lastEventId: string | false): EventDefinition[] {
  return EVENTS.filter(ev => {
    if (ev.type !== type) return false;
    // 不连续触发同一事件
    if (ev.id === lastEventId) return false;

    const reqs = ev.reqs;
    if (reqs.tech && !techLevel(state, reqs.tech)) return false;
    if (reqs.notech && techLevel(state, reqs.notech) > 0) return false;
    if (reqs.resource && !hasResource(state, reqs.resource)) return false;
    if (reqs.low_morale !== undefined) {
      const currentMorale = (state.city.morale as { current?: number } | undefined)?.current ?? 100;
      if (currentMorale >= reqs.low_morale) return false;
    }

    if (ev.condition && !ev.condition(state)) return false;
    return true;
  });
}

// ============================================================
// 主调度函数 — 在 tick.ts 中每 tick 调用
// ============================================================

/**
 * 推进事件计时器，到期时触发随机事件
 * @returns 本次触发的消息列表（0~1 条）
 */
export function tickEvents(state: GameState): GameMessage[] {
  const msgs: GameMessage[] = [];

  // --- Major 事件 ---
  state.event.t = (state.event.t ?? 200) - 1;
  if (state.event.t <= 0) {
    // 重置倒计时（200 ± 100）
    state.event.t = rng(100, 300);
    const pool = filterEvents(state, 'major', state.event.l as string | false);
    if (pool.length > 0) {
      const ev = pool[rng(0, pool.length)];
      (state.event as any).l = ev.id;
      const text = ev.effect(state);
      msgs.push({ text, type: 'warning', category: 'event' });
    }
  }

  // --- Minor 事件 ---
  state.m_event.t = (state.m_event.t ?? 499) - 1;
  if (state.m_event.t <= 0) {
    // 重置倒计时（300 ± 200）
    state.m_event.t = rng(200, 500);
    const pool = filterEvents(state, 'minor', state.m_event.l as string | false);
    if (pool.length > 0) {
      const ev = pool[rng(0, pool.length)];
      (state.m_event as any).l = ev.id;
      const text = ev.effect(state);
      msgs.push({ text, type: 'info', category: 'event' });
    }
  }

  return msgs;
}
