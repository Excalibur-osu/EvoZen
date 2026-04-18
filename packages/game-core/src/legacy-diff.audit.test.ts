import { describe, expect, it } from 'vitest';
import {
  assertSlicesMatch,
  legacyCoreDifferentialScenarios,
  loadLegacyCoreModel,
  runDifferentialScenario,
} from './legacy-diff';

describe('legacy differential parity harness', () => {
  const model = loadLegacyCoreModel();

  for (const scenario of legacyCoreDifferentialScenarios) {
    it(`${scenario.id}: ${scenario.description}`, () => {
      const { actual, expected } = runDifferentialScenario(scenario, model);

      expect(() => {
        assertSlicesMatch(actual, expected, scenario.tolerance ?? 1e-6);
      }).not.toThrow();
    });
  }
});
