import { describe, expect, it } from 'vitest';
import type { GameState } from '@evozen/shared-types';
import { createNewGame } from './state';
import {
  ARPA_PROJECTS,
  arpaCost,
  arpaTick,
  getArpaProjectState,
  getAvailableArpaProjects,
  startArpaProject,
} from './arpa';

function makeState(): GameState {
  const s = createNewGame();
  s.race.species = 'human';
  for (const r of ['Money', 'Knowledge', 'Cement', 'Oil', 'Sheet_Metal', 'Alloy']) {
    if (!s.resource[r]) {
      s.resource[r] = {
        name: r,
        display: true,
        value: 0,
        amount: 0,
        max: 5_000_000,
        rate: 0,
        crates: 0,
        diff: 0,
        delta: 0,
      };
    }
    s.resource[r].display = true;
    s.resource[r].amount = 5_000_000;
    s.resource[r].max = 5_000_000;
  }
  return s;
}

describe('ARPA — launch_facility', () => {
  it('项目已注册，且为一次性项目', () => {
    const project = ARPA_PROJECTS.find((p) => p.id === 'launch_facility');
    expect(project).toBeTruthy();
    expect(project?.maxRank).toBe(1);
  });

  it('费用与 legacy arpa.js 对齐', () => {
    const s = makeState();
    expect(arpaCost(s, 'launch_facility')).toEqual({
      Money: 2_000_000,
      Knowledge: 500_000,
      Cement: 150_000,
      Oil: 20_000,
      Sheet_Metal: 15_000,
      Alloy: 25_000,
    });
  });

  it('high_tech:7 后可用', () => {
    const s = makeState();
    s.tech['high_tech'] = 6;
    expect(getAvailableArpaProjects(s).some((p) => p.id === 'launch_facility')).toBe(false);

    s.tech['high_tech'] = 7;
    expect(getAvailableArpaProjects(s).some((p) => p.id === 'launch_facility')).toBe(true);
  });

  it('完成后授予 launch_facility:1 与 space:1', () => {
    const s = makeState();
    s.tech['high_tech'] = 7;
    const started = startArpaProject(s, 'launch_facility');
    expect(started).not.toBeNull();

    const next = started as GameState;
    const arpa = next.arpa as Record<string, { rank: number; progress: number; active: boolean }>;
    arpa.launch_facility.progress = 99;
    arpa.launch_facility.active = true;

    const done = arpaTick(next, 1);
    expect(done).toEqual(['launch_facility']);
    expect(next.tech['launch_facility']).toBe(1);
    expect(next.tech['space']).toBe(1);
    expect(next.settings.showSpace).toBe(true);
    expect(getArpaProjectState(next, 'launch_facility')).toEqual({
      rank: 1,
      progress: 0,
      active: false,
    });
  });

  it('完成后不再出现在可用项目列表中', () => {
    const s = makeState();
    s.tech['high_tech'] = 7;
    const started = startArpaProject(s, 'launch_facility') as GameState;
    const arpa = started.arpa as Record<string, { rank: number; progress: number; active: boolean }>;
    arpa.launch_facility.progress = 99;
    arpa.launch_facility.active = true;
    arpaTick(started, 1);

    expect(getAvailableArpaProjects(started).some((p) => p.id === 'launch_facility')).toBe(false);
  });
});
