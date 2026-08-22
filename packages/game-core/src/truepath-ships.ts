import type { GameState } from '@evozen/shared-types';
import { getTraitVar } from './trait-ranks';

export type TruepathShipLocation = 'spc_dwarf' | 'tauceti';

export interface TruepathShip {
  id: string;
  name: string;
  class: 'explorer';
  power: 'elerium';
  weapon: 'railgun';
  armor: 'neutronium';
  engine: 'emdrive';
  sensor: 'quantum';
  location: TruepathShipLocation;
  transit: number;
  dist: number;
  damage: number;
  fueled: boolean;
}

export interface TruepathShipyardState {
  count: number;
  on?: number;
  ships: Array<TruepathShip | Record<string, unknown>>;
}

export interface TruepathFleetFuelResult {
  drains: Record<string, number>;
  fueledShips: number;
  stalledShips: number;
}

export interface TruepathFleetTravelResult {
  arrivedShips: string[];
  tauDiscovered: boolean;
}

const TAU_CETI_DISTANCE_AU = 752_568.8;
const TRANSFER_WINDOW_SCALE = 225;
const EXPLORER_SPEED = 37_500;
export const EXPLORER_TAU_TRANSIT = Math.round(
  Math.ceil(TAU_CETI_DISTANCE_AU * TRANSFER_WINDOW_SCALE) / EXPLORER_SPEED,
);
export const EXPLORER_ELERIUM_PER_TICK = 25;

function raceRank(state: GameState, traitId: string): number {
  const value = state.race[traitId];
  return typeof value === 'number' && value > 0 ? value : value ? 1 : 0;
}

function jobScaleValue(state: GameState, value: number): number {
  const rank = raceRank(state, 'high_pop');
  return rank ? value * getTraitVar('high_pop', 0, rank) : value;
}

function shipyard(state: GameState): TruepathShipyardState | undefined {
  const value = state.space['shipyard'] as Partial<TruepathShipyardState> | undefined;
  if (!value || (value.count ?? 0) < 1) return undefined;
  value.ships ??= [];
  return value as TruepathShipyardState;
}

function isExplorerShip(candidate: TruepathShip | Record<string, unknown>): candidate is TruepathShip {
  return candidate.class === 'explorer';
}

export function getExplorerShips(state: GameState): TruepathShip[] {
  return normalizeTruepathShipyard(state)?.ships.filter(isExplorerShip) ?? [];
}

export function getTauExplorerForDismantle(state: GameState): TruepathShip | undefined {
  return getExplorerShips(state).find(
    (ship) => ship.location === 'tauceti' && ship.transit === 0,
  );
}

export function dismantleTauExplorer(state: GameState): TruepathShip | undefined {
  const yard = normalizeTruepathShipyard(state);
  if (!yard) return undefined;
  const index = yard.ships.findIndex(
    (ship) => isExplorerShip(ship) && ship.location === 'tauceti' && ship.transit === 0,
  );
  if (index < 0) return undefined;
  const [removed] = yard.ships.splice(index, 1);
  state.civic.garrison.crew = Math.max(0, state.civic.garrison.crew - getExplorerCrewSize(state));
  return removed as TruepathShip;
}

export function normalizeTruepathShipyard(state: GameState): TruepathShipyardState | undefined {
  const yard = shipyard(state);
  if (!yard) return undefined;
  yard.on ??= yard.count;
  yard.ships = Array.isArray(yard.ships) ? yard.ships : [];
  const explorers = yard.ships.filter(isExplorerShip);
  for (let index = 0; index < explorers.length; index++) {
    const ship = explorers[index];
    ship.id ||= `explorer-${index + 1}`;
    ship.name ||= `探索者 ${index + 1}`;
    ship.power = 'elerium';
    ship.weapon = 'railgun';
    ship.armor = 'neutronium';
    ship.engine = 'emdrive';
    ship.sensor = 'quantum';
    ship.location = ship.location === 'tauceti' ? 'tauceti' : 'spc_dwarf';
    ship.transit = Math.max(0, Math.round(Number(ship.transit) || 0));
    ship.dist = Math.max(ship.transit, Math.round(Number(ship.dist) || ship.transit));
    ship.damage = Math.max(0, Math.min(90, Number(ship.damage) || 0));
    ship.fueled = Boolean(ship.fueled);
  }
  return yard;
}

export function initializeTruepathShipyard(state: GameState): TruepathShipyardState | undefined {
  const yard = normalizeTruepathShipyard(state);
  if (!yard) return undefined;
  state.tech['syard_class'] = Math.max(state.tech['syard_class'] ?? 0, 2);
  state.tech['syard_armor'] = Math.max(state.tech['syard_armor'] ?? 0, 3);
  state.tech['syard_weapon'] = Math.max(state.tech['syard_weapon'] ?? 0, 1);
  state.tech['syard_engine'] = Math.max(state.tech['syard_engine'] ?? 0, 2);
  state.tech['syard_power'] = Math.max(state.tech['syard_power'] ?? 0, 3);
  state.tech['syard_sensor'] = Math.max(state.tech['syard_sensor'] ?? 0, 3);
  state.settings['showShipYard'] = true;
  return yard;
}

export function isTruepathShipyardPowered(state: GameState): boolean {
  const yard = normalizeTruepathShipyard(state);
  return Boolean(yard && (yard.on ?? yard.count) >= 1 && (state.city.power?.activeConsumers?.['shipyard'] ?? 0) >= 1);
}

export function getExplorerCrewSize(state: GameState): number {
  return jobScaleValue(state, state.race['grenadier'] ? 6 : 10);
}

export function getTruepathFleetCrew(state: GameState): number {
  const yard = normalizeTruepathShipyard(state);
  if (!yard) return 0;
  return yard.ships.filter(isExplorerShip).reduce(
    (total, current) => total + (current.location !== 'spc_dwarf' || current.transit > 0 ? getExplorerCrewSize(state) : 0),
    0,
  );
}

/** 原版 explorer 船体固定配置的逐艘成本。 */
export function getExplorerShipCost(state: GameState): Record<string, number> {
  const explorerCount = getExplorerShips(state).length;
  const multiplier = (explorerCount + 1) * 3;
  const raw: Record<string, number> = {
    Money: 800_000_000,
    Adamantite: 9_500_000,
    Neutronium: Math.round(10_000 ** 1.45),
    Titanium: Math.round(1_250_000) * 5,
    Orichalcum: Math.round(60_000 ** 1.45),
    Iridium: Math.round(55_000) * 50,
    Iron: Math.round(25_000 ** 1.45) * 10,
  };
  return Object.fromEntries(
    Object.entries(raw).map(([resource, amount]) => [resource, Math.ceil(amount * multiplier)]),
  );
}

export function canBuildExplorerShip(state: GameState): boolean {
  const yard = normalizeTruepathShipyard(state);
  if (!state.race['truepath'] || !yard || !isTruepathShipyardPowered(state)) return false;
  if ((state.tech['tauceti'] ?? 0) < 1) return false;
  if ((state.tech['syard_armor'] ?? 0) < 3 || (state.tech['syard_sensor'] ?? 0) < 4) return false;
  // legacy 在 syard_power:4 时自动为 explorer 选择 elerium 动力。
  if ((state.tech['syard_power'] ?? 0) < 4) return false;
  return Object.entries(getExplorerShipCost(state)).every(
    ([resource, amount]) => (state.resource[resource]?.amount ?? 0) >= amount,
  );
}

export function buildExplorerShip(state: GameState, requestedName?: string): TruepathShip | null {
  if (!canBuildExplorerShip(state)) return null;
  const yard = normalizeTruepathShipyard(state)!;
  const explorers = yard.ships.filter(isExplorerShip);
  const cost = getExplorerShipCost(state);
  for (const [resource, amount] of Object.entries(cost)) {
    state.resource[resource].amount -= amount;
  }

  const serial = explorers.length + 1;
  const baseName = requestedName?.trim().slice(0, 40) || `探索者 ${serial}`;
  let name = baseName;
  let suffix = 2;
  while (explorers.some((candidate) => candidate.name === name)) name = `${baseName} ${suffix++}`;
  const ship: TruepathShip = {
    id: `explorer-${serial}`,
    name,
    class: 'explorer',
    power: 'elerium',
    weapon: 'railgun',
    armor: 'neutronium',
    engine: 'emdrive',
    sensor: 'quantum',
    location: 'spc_dwarf',
    transit: 0,
    dist: 0,
    damage: 0,
    fueled: false,
  };
  yard.ships.push(ship);
  return ship;
}

export function canDispatchExplorerToTau(state: GameState, shipId: string): boolean {
  const yard = normalizeTruepathShipyard(state);
  const target = yard?.ships.filter(isExplorerShip).find((candidate) => candidate.id === shipId);
  if (!target || target.location !== 'spc_dwarf' || target.transit > 0) return false;
  if ((state.tech['tauceti'] ?? 0) < 1 || !isTruepathShipyardPowered(state)) return false;
  return state.civic.garrison.workers - state.civic.garrison.crew >= getExplorerCrewSize(state);
}

export function dispatchExplorerToTau(state: GameState, shipId: string): boolean {
  if (!canDispatchExplorerToTau(state, shipId)) return false;
  const target = normalizeTruepathShipyard(state)!.ships.filter(isExplorerShip).find((candidate) => candidate.id === shipId)!;
  target.location = 'tauceti';
  target.transit = EXPLORER_TAU_TRANSIT;
  target.dist = EXPLORER_TAU_TRANSIT;
  target.fueled = false;
  state.civic.garrison.crew += getExplorerCrewSize(state);
  return true;
}

export function truepathFleetFuelTick(
  state: GameState,
  timeMul: number,
  deltas: Record<string, number>,
  availableFuelDeltas: Record<string, number> = {},
): TruepathFleetFuelResult {
  const result: TruepathFleetFuelResult = { drains: {}, fueledShips: 0, stalledShips: 0 };
  const yard = normalizeTruepathShipyard(state);
  if (!yard) return result;
  const remaining: Record<string, number> = {};

  for (const current of yard.ships.filter(isExplorerShip)) {
    if (current.location === 'spc_dwarf' && current.transit === 0) {
      current.fueled = false;
      continue;
    }
    const resource = 'Elerium';
    const consumption = EXPLORER_ELERIUM_PER_TICK * timeMul;
    remaining[resource] ??= Math.max(
      0,
      (state.resource[resource]?.amount ?? 0) + Math.max(0, availableFuelDeltas[resource] ?? 0),
    );
    if (remaining[resource] + 1e-12 >= consumption) {
      remaining[resource] -= consumption;
      deltas[resource] = (deltas[resource] ?? 0) - consumption;
      result.drains[resource] = (result.drains[resource] ?? 0) + consumption;
      current.fueled = true;
      result.fueledShips++;
    } else {
      current.fueled = false;
      result.stalledShips++;
    }
  }
  return result;
}

/** 原版 long-loop 航行与 Tau 传感器扫描。 */
export function advanceTruepathFleet(state: GameState): TruepathFleetTravelResult {
  const result: TruepathFleetTravelResult = { arrivedShips: [], tauDiscovered: false };
  const yard = normalizeTruepathShipyard(state);
  if (!yard) return result;
  for (const current of yard.ships.filter(isExplorerShip)) {
    if (current.transit <= 0 || !current.fueled) continue;
    current.transit--;
    if (current.transit === 0) result.arrivedShips.push(current.name);
  }

  const tauScan = yard.ships.filter(isExplorerShip)
    .filter((current) => current.location === 'tauceti' && current.transit === 0)
    .reduce((total) => total + 160, 0);
  if ((state.tech['tauceti'] ?? 0) === 1 && tauScan >= 1) {
    state.tech['tauceti'] = 2;
    state.tauceti['orbital_station'] ??= { count: 0, on: 0, support: 0, s_max: 0 };
    state.tauceti['orbital_platform'] ??= { count: 0, on: 0, support: 0, s_max: 0 };
    state.settings['showTau'] = true;
    state.settings['tau'] = { home: true, red: true, gas: false, roid: false };
    result.tauDiscovered = true;
  }
  return result;
}
