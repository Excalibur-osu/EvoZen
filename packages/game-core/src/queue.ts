import type { GameState } from '@evozen/shared-types';

export function getQueueMax(state: GameState): number {
  return state.tech['queue'] || 0;
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
