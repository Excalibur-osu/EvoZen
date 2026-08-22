import type { GameState } from '@evozen/shared-types';

export const TAUCETI_JUMP_GATE_SEGMENTS = 100;

/** 对标 legacy main.js：普通 Truepath 的两端跃迁门均完工后才开启 Tau 资源阶段。 */
export function checkTaucetiJumpGateCompletion(state: GameState): boolean {
  if (!state.race['truepath'] || state.race['lone_survivor']) return false;
  if ((state.tech['tauceti'] ?? 0) !== 3) return false;
  if ((state.space['jump_gate']?.count ?? 0) < TAUCETI_JUMP_GATE_SEGMENTS) return false;
  if ((state.tauceti['jump_gate']?.count ?? 0) < TAUCETI_JUMP_GATE_SEGMENTS) return false;

  state.tech['tauceti'] = 4;
  state.resource['Materials'].display = false;
  state.resource['Bolognium'].display = true;
  return true;
}
