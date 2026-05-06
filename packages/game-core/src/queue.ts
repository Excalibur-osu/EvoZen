import type { GameState } from '@evozen/shared-types';

/**
 * 计算当前最大队列槽位数
 * 对标 legacy/src/functions.js calcQueueMax() L414-429:
 *   queue:1 → 3 slots
 *   queue:2 → 5 slots
 *   queue:3+ → 8 slots
 * (成就/基因/政体加成 Phase 1 未实装，后续补充)
 */
export function getQueueMax(state: GameState): number {
  const queueLevel = state.tech['queue'] ?? 0;
  if (queueLevel <= 0) return 0;
  return queueLevel >= 3 ? 8 : (queueLevel >= 2 ? 5 : 3);
}

export function isQueueUnlocked(state: GameState): boolean {
  return (state.tech['queue'] ?? 0) > 0;
}

export function canEnqueue(state: GameState): boolean {
  if (!isQueueUnlocked(state)) return false;
  const currentCount = state.queue.queue?.length ?? 0;
  return currentCount < getQueueMax(state);
}

export function toggleQueueMode(state: GameState) {
  state.queue.display = !state.queue.display;
}
