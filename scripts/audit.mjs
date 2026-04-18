#!/usr/bin/env node
/**
 * EvoZen ↔ Legacy Evolve 审计脚本
 *
 * 自动对比:
 *   1. 建筑覆盖率 + 费用数值
 *   2. 科技覆盖率 + 费用/grant/reqs
 *
 * 用法: node scripts/audit.mjs
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ─── 工具函数 ─────────────────────────────────────
const read = (rel) => readFileSync(resolve(ROOT, rel), 'utf-8');

// ANSI 颜色
const R = '\x1b[31m', G = '\x1b[32m', Y = '\x1b[33m', C = '\x1b[36m', W = '\x1b[0m';

let totalChecks = 0, passed = 0, warnings = 0, errors = 0;

function ok(msg) { totalChecks++; passed++; }
function warn(msg) { totalChecks++; warnings++; console.log(`  ${Y}⚠ ${msg}${W}`); }
function fail(msg) { totalChecks++; errors++; console.log(`  ${R}✘ ${msg}${W}`); }
function info(msg) { console.log(`  ${C}ℹ ${msg}${W}`); }
function section(title) { console.log(`\n${G}━━━ ${title} ━━━${W}`); }
function lastNumber(expr) {
  const numbers = [...expr.matchAll(/(\d+(?:\.\d+)?)/g)].map((m) => parseFloat(m[1]));
  return numbers.length > 0 ? numbers[numbers.length - 1] : null;
}

// ─── 1. 提取 Legacy 建筑 ──────────────────────────
function extractLegacyBuildings(src) {
  const buildings = {};
  // 匹配 costMultiplier('name', offset, baseExpr, mult)
  // baseExpr 可能是条件表达式；取最后一个数字作为默认/常规基础值。
  const costRegex = /(\w+)\(offset\)\s*\{[^}]*costMultiplier\s*\(\s*'([^']+)'\s*,\s*offset\s*,\s*([^,]+?)\s*,\s*(\d+(?:\.\d+)?)\s*\)/g;
  let m;
  while ((m = costRegex.exec(src)) !== null) {
    const [, resource, buildingId, baseExpr, mult] = m;
    const base = lastNumber(baseExpr);
    if (base === null) continue;
    if (!buildings[buildingId]) buildings[buildingId] = {};
    if (!buildings[buildingId].costs) buildings[buildingId].costs = {};
    buildings[buildingId].costs[resource] = { base, mult: parseFloat(mult) };
  }

  // 匹配 reqs: { key: num, ... }
  // 先找每个建筑块: key: { ... reqs: { ... } ... }
  const blockRegex = /(\w+):\s*\{[^]*?id:\s*'city-\1'[^]*?reqs:\s*\{([^}]*)\}/g;
  while ((m = blockRegex.exec(src)) !== null) {
    const [, buildingId, reqsStr] = m;
    if (!buildings[buildingId]) buildings[buildingId] = {};
    buildings[buildingId].reqs = {};
    const reqPairs = reqsStr.matchAll(/(\w+):\s*(\d+)/g);
    for (const rp of reqPairs) {
      buildings[buildingId].reqs[rp[1]] = parseInt(rp[2]);
    }
  }

  return buildings;
}

// ─── 2. 提取 EvoZen 建筑 ──────────────────────────
function extractEvoZenBuildings(src) {
  const buildings = {};

  // 提取每个建筑的 id
  const idRegex = /id:\s*'(\w+)'/g;
  let m;
  const ids = [];
  while ((m = idRegex.exec(src)) !== null) {
    ids.push({ id: m[1], pos: m.index });
  }

  for (let i = 0; i < ids.length; i++) {
    const { id, pos } = ids[i];
    const endPos = i + 1 < ids.length ? ids[i + 1].pos : src.length;
    const block = src.substring(pos, endPos);

    buildings[id] = { costs: {}, reqs: {} };

    // 提取 scaleCost(base, mult) 调用
    // 模式: Resource: scaleCost(base, mult)
    const scaleRegex = /(\w+):\s*(?:scaleCost|scaleHousingCost|scaleCementCost|scaleCostMinus|scaleConditionalCost|scaleConditionalHousingCost|scaleAfterCount|scaleUntilTech|scaleFromTech)\s*\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)/g;
    let cm;
    while ((cm = scaleRegex.exec(block)) !== null) {
      buildings[id].costs[cm[1]] = { base: parseFloat(cm[2]), mult: parseFloat(cm[3]) };
    }

    // 提取简单 reqs: { key: num }
    const reqsMatch = block.match(/reqs:\s*\{([^}]*)\}/);
    if (reqsMatch) {
      const reqPairs = reqsMatch[1].matchAll(/(\w+):\s*(\d+)/g);
      for (const rp of reqPairs) {
        buildings[id].reqs[rp[1]] = parseInt(rp[2]);
      }
    }
  }

  return buildings;
}

// ─── 3. 提取 Legacy 科技 ──────────────────────────
function extractLegacyTechs(src) {
  const techs = {};

  // The tech file has pattern: techKey: { id: 'tech-techKey', ... grant: ['key', level], ... cost: { Resource(){ return N; } } }
  // We'll use a simpler line-based approach

  const lines = src.split('\n');
  let currentTech = null;
  let braceDepth = 0;
  let inCost = false;
  let techContent = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Detect tech start: "    techKey: {"  (exactly 4 spaces indent)
    const techStart = line.match(/^    (\w+):\s*\{/);
    if (techStart && !currentTech && braceDepth === 0) {
      currentTech = techStart[1];
      braceDepth = 1;
      techContent = line + '\n';
      continue;
    }

    if (currentTech) {
      techContent += line + '\n';
      braceDepth += (line.match(/\{/g) || []).length;
      braceDepth -= (line.match(/\}/g) || []).length;

      if (braceDepth <= 0) {
        // Parse this tech block
        const tech = parseLegacyTechBlock(currentTech, techContent);
        if (tech) {
          techs[currentTech] = tech;
        }
        currentTech = null;
        braceDepth = 0;
        techContent = '';
      }
    }
  }

  return techs;
}

function parseLegacyTechBlock(id, content) {
  const tech = { id, costs: {}, reqs: {}, grant: null, category: '', era: '' };

  // category
  const catMatch = content.match(/category:\s*'(\w+)'/);
  if (catMatch) tech.category = catMatch[1];

  // era
  const eraMatch = content.match(/era:\s*'(\w+)'/);
  if (eraMatch) tech.era = eraMatch[1];

  // grant: ['key', level]
  const grantMatch = content.match(/grant:\s*\[\s*'(\w+)'\s*,\s*(\d+)\s*\]/);
  if (grantMatch) tech.grant = [grantMatch[1], parseInt(grantMatch[2])];

  // reqs: { key: num, ... }
  const reqsMatch = content.match(/reqs:\s*\{([^}]*)\}/);
  if (reqsMatch) {
    const pairs = reqsMatch[1].matchAll(/(\w+):\s*(\d+)/g);
    for (const p of pairs) {
      tech.reqs[p[1]] = parseInt(p[2]);
    }
  }

  // costs: { Resource(){ return N; } }
  // Legacy patterns:
  //   Simple:    Resource(){ return 3200; }
  //   Ternary:   Resource(){ return global.race['banana'] ? 1200 : 4500; }
  //   Nested:    Resource(){ return global.race.universe === 'magic' ? 0 : 750; }
  // Strategy: extract ALL numbers from each return statement, take the LAST one
  // (which is the default/else value in ternary expressions)
  const costBlockMatch = content.match(/cost:\s*\{([\s\S]*?)\n\s{8}\}/);
  if (costBlockMatch) {
    const costBlock = costBlockMatch[1];
    // Match each resource cost function: ResourceName(){ return ...; }
    const resCostRegex = /(\w+)\(\)\s*\{[^}]*return\s+([^;}]+)\s*;?/g;
    let cm;
    while ((cm = resCostRegex.exec(costBlock)) !== null) {
      const resName = cm[1];
      const returnExpr = cm[2].trim();
      const value = lastNumber(returnExpr);
      if (value !== null) {
        // Take the last number — this is the default (non-conditional) value.
        tech.costs[resName] = value;
      }
    }
  }

  return tech;
}

// ─── 4. 提取 EvoZen 科技 ──────────────────────────
function extractEvoZenTechs(src) {
  const techs = {};

  // 每个科技是 { id: 'xxx', ... } 的对象
  // 先按 id 分块
  const techRegex = /\{\s*\n\s*id:\s*'(\w+)'/g;
  let m;
  const starts = [];
  while ((m = techRegex.exec(src)) !== null) {
    starts.push({ id: m[1], pos: m.index });
  }

  for (let i = 0; i < starts.length; i++) {
    const { id, pos } = starts[i];
    const endPos = i + 1 < starts.length ? starts[i + 1].pos : src.length;
    const block = src.substring(pos, endPos);

    const tech = { id, costs: {}, reqs: {}, grant: null, category: '', era: '' };

    // grant: ['key', num]
    const grantMatch = block.match(/grant:\s*\[\s*'(\w+)'\s*,\s*(\d+)\s*\]/);
    if (grantMatch) tech.grant = [grantMatch[1], parseInt(grantMatch[2])];

    // reqs: { key: num }
    const reqsMatch = block.match(/reqs:\s*\{([^}]*)\}/);
    if (reqsMatch) {
      const pairs = reqsMatch[1].matchAll(/'?(\w+)'?:\s*(\d+)/g);
      for (const p of pairs) {
        tech.reqs[p[1]] = parseInt(p[2]);
      }
    }

    // costs: { Resource: num }
    const costsMatch = block.match(/costs:\s*\{([^}]*)\}/);
    if (costsMatch) {
      const pairs = costsMatch[1].matchAll(/(\w+):\s*(\d+(?:\.\d+)?)/g);
      for (const p of pairs) {
        tech.costs[p[1]] = parseFloat(p[2]);
      }
    }

    // category
    const catMatch = block.match(/category:\s*'([^']+)'/);
    if (catMatch) tech.category = catMatch[1];

    techs[id] = tech;
  }

  return techs;
}

// ─── Phase 1 建筑白名单 ───────────────────────────
// 凡是列在这里的建筑，EvoZen 必须实现，缺失则报 error。
// 仅包含文明时代/发现时代可获取的 city 建筑，不含 space/portal。
const PHASE1_BUILDINGS = [
  // 住宅
  'basic_housing', 'cottage',
  // 农业/食物
  'farm', 'silo', 'smokehouse', 'mill',
  // 林业/采矿
  'lumber_yard', 'sawmill', 'rock_quarry', 'mine', 'coal_mine',
  // 工业
  'cement_plant', 'smelter', 'metal_refinery', 'foundry', 'factory',
  // 仓储
  'shed', 'storage_yard', 'warehouse',
  // 能源
  'coal_power', 'oil_power', 'oil_well', 'oil_depot',
  // 金融/贸易
  'bank', 'trade_post',
  // 科研
  'library', 'university', 'wardenclyffe',
  // 军事
  'garrison', 'hospital', 'boot_camp',
  // 文娱/宗教
  'amphitheatre', 'temple', 'shrine',
  // 高级
  'biolab', 'casino', 'wharf', 'tourist_center',
];

// ─── 5. 比对逻辑 ──────────────────────────────────
function auditBuildings(legacy, evozen) {
  section('建筑覆盖率检查');

  const legacyIds = Object.keys(legacy);
  const evozenIds = Object.keys(evozen);

  // 覆盖率
  for (const id of evozenIds) {
    if (legacy[id]) {
      ok(`${id}: 在 legacy 中找到`);
    } else {
      info(`${id}: legacy 中无对应（可能是 EvoZen 新增或 ID 不同）`);
    }
  }

  // Phase 1 白名单检查：缺失建筑报 error
  section('Phase 1 建筑白名单检查');
  const evozenSet = new Set(evozenIds);
  for (const id of PHASE1_BUILDINGS) {
    if (evozenSet.has(id)) {
      ok(`${id}: 已实现`);
    } else {
      fail(`${id}: Phase 1 必须实现，但 EvoZen 中缺失`);
    }
  }

  // 列出 legacy 有但不在白名单、且 EvoZen 也无的建筑（仅供参考）
  const phase1Set = new Set(PHASE1_BUILDINGS);
  const missingInEvozen = legacyIds.filter(id => !evozenSet.has(id) && !phase1Set.has(id));
  if (missingInEvozen.length > 0) {
    console.log(`\n  Legacy 有但 EvoZen 尚无（非 Phase 1，暂不要求，${missingInEvozen.length} 个）:`);
    for (const id of missingInEvozen) {
      info(`  ${id}`);
    }
  }

  section('建筑费用对比');
  for (const id of evozenIds) {
    if (!legacy[id] || !legacy[id].costs) continue;
    const lCosts = legacy[id].costs;
    const eCosts = evozen[id].costs;

    for (const res of Object.keys(eCosts)) {
      if (!lCosts[res]) {
        warn(`${id}.${res}: EvoZen 有这个费用，legacy 中未检测到 (可能是条件费用)`);
        continue;
      }
      const lb = lCosts[res].base, lm = lCosts[res].mult;
      const eb = eCosts[res].base, em = eCosts[res].mult;
      if (lb === eb && lm === em) {
        ok(`${id}.${res}: (${eb}, ${em})`);
      } else {
        fail(`${id}.${res}: legacy(${lb}, ${lm}) ≠ evozen(${eb}, ${em})`);
      }
    }

    // 检查 legacy 有但 EvoZen 缺少的费用资源
    for (const res of Object.keys(lCosts)) {
      if (!eCosts[res]) {
        warn(`${id}.${res}: legacy 有此费用 (${lCosts[res].base}, ${lCosts[res].mult}), EvoZen 缺失`);
      }
    }
  }

  section('建筑前置需求对比');
  for (const id of evozenIds) {
    if (!legacy[id] || !legacy[id].reqs) continue;
    const lReqs = legacy[id].reqs;
    const eReqs = evozen[id].reqs;

    const allKeys = new Set([...Object.keys(lReqs), ...Object.keys(eReqs)]);
    for (const key of allKeys) {
      const lv = lReqs[key], ev = eReqs[key];
      if (lv === ev) {
        ok(`${id} reqs.${key}: ${ev}`);
      } else if (lv === undefined) {
        warn(`${id} reqs.${key}: EvoZen 要求 ${ev}, legacy 中未检测到`);
      } else if (ev === undefined) {
        warn(`${id} reqs.${key}: legacy 要求 ${lv}, EvoZen 缺失`);
      } else {
        fail(`${id} reqs.${key}: legacy=${lv} ≠ evozen=${ev}`);
      }
    }
  }
}

// ─── Phase 1 科技白名单 ──────────────────────────
// 已实装的所有科技 ID。缺失时报 error（防止回归）。
const PHASE1_TECHS = [
  // 原始阶段
  'club','bone_tools','sundial','science',
  // 农业
  'agriculture','farm_house','irrigation','barns','smokehouse',
  'copper_hoe','iron_hoe','steel_hoe',
  // 林业
  'axe','carpentry','copper_axes','iron_axes','steel_axes',
  'iron_saw',
  // 采矿
  'mining','mining_2','mining_3','mining_4',
  'shovel','iron_shovel','dowsing_rod','metal_detector',
  'copper_pickaxe','iron_pickaxe','steel_pickaxe','dynamite','jackhammer',
  // 建筑/住房
  'housing','cottage_tech','urban_planning','urbanization','zoning_permits',
  'cranes','gantry_crane','rebar','steel_beams','steel_rebar',
  // 生产
  'smelting','bessemer_process','blast_furnace','oxygen_converter',
  'bayer_process','steel','reinforced_crates','steel_containers','containerization',
  'cement','mill_tech','foundry_tech',
  // 仓储
  'storage','silo_tech','reinforced_shed',
  // 科研/知识
  'library_tech','thesis','research_grant','scientific_journal',
  'apprentices','artisans',
  // 政府/政治
  'government','theocracy',
  // 金融/贸易
  'banking_tech','market','currency','investing','vault','tax_rates',
  'trade','freight','large_trades',
  // 娱乐/文化
  'theatre','playwright','monument',
  // 宗教
  'faith','theology_tech',
  // 军事
  'military','armor','plate_armor','bows','flintlock_rifle','black_powder',
  'mercs_tech','boot_camp_tech','hospital','hunter_process',
  // 电力/工业
  'electricity','industrialization','oil_well','oil_depot','oil_powerplant',
  // 高级
  'steel_hammer','copper_hammer','iron_hammer',
  'mad_science','genetics','bioscience',
  'casino','wharf','tourism',
  'diplomacy','aphrodisiac',
];

const LEGACY_TECH_ALIASES = {
  axe: 'stone_axe',
  mining_2: 'metal_working',
  mining_3: 'iron_mining',
  mining_4: 'coal_mining',
  library_tech: 'library',
  silo_tech: 'silo',
  mill_tech: 'mill',
  banking_tech: 'banking',
  military: 'garrison',
  mercs_tech: 'mercs',
  boot_camp_tech: 'boot_camp',
  cottage_tech: 'cottage',
  foundry_tech: 'foundry',
  theology_tech: 'theology',
  copper_hammer: 'copper_sledgehammer',
  iron_hammer: 'iron_sledgehammer',
  steel_hammer: 'steel_sledgehammer',
  oil_powerplant: 'oil_power',
  warehouse_tech: 'warehouse',
  uranium_tech: 'uranium',
};

const SYNTHETIC_TECHS = new Set([
  // legacy 的 theology:1 由重置流程赋予；EvoZen 将其显式化为科技入口。
  'faith',
]);

const TECH_REQ_KEY_ALIASES = {
  casino_vault: {
    space_explore: 'space',
  },
};

function getLegacyTechId(evozenId) {
  return LEGACY_TECH_ALIASES[evozenId] ?? evozenId;
}

function getLegacyTech(legacy, evozenId) {
  return legacy[getLegacyTechId(evozenId)];
}

function normalizeTechReqs(id, reqs) {
  const aliases = TECH_REQ_KEY_ALIASES[id];
  if (!aliases) return reqs;

  const normalized = {};
  for (const [key, value] of Object.entries(reqs)) {
    normalized[aliases[key] ?? key] = value;
  }
  return normalized;
}

function auditTechs(legacy, evozen) {
  section('科技覆盖率检查');

  const evozenIds = Object.keys(evozen);
  const legacyIds = Object.keys(legacy);

  for (const id of evozenIds) {
    const legacyId = getLegacyTechId(id);
    if (legacy[legacyId]) {
      ok(id === legacyId ? `${id}: 在 legacy 中找到` : `${id}: 对应 legacy.${legacyId}`);
    } else if (SYNTHETIC_TECHS.has(id)) {
      info(`${id}: EvoZen 的显式入口科技，legacy 中由其他系统授予`);
    } else {
      warn(`${id}: legacy 中无对应（可能 ID 不同）`);
    }
  }

  // Phase 1 白名单检查：已实装科技缺失时报 error
  section('Phase 1 科技白名单检查');
  const evozenTechSet = new Set(evozenIds);
  for (const id of PHASE1_TECHS) {
    if (evozenTechSet.has(id)) {
      ok(`${id}: 已实现`);
    } else {
      fail(`${id}: Phase 1 科技缺失`);
    }
  }

  // 列出 legacy 有但 EvoZen 无的科技
  const evozenSet = new Set(evozenIds.map(getLegacyTechId));
  const civilizedEras = new Set(['civilized', 'discovery', 'industrialized', 'globalized', 'early_space']);
  const missingInEvozen = legacyIds.filter(id => {
    if (evozenSet.has(id)) return false;
    // 只报告 Phase 1 相关的 era
    return civilizedEras.has(legacy[id].era);
  });

  if (missingInEvozen.length > 0) {
    console.log(`\n  Legacy 有但 EvoZen 尚无的科技 (仅限 Phase 1 era, ${missingInEvozen.length} 个):`);
    for (const id of missingInEvozen) {
      const t = legacy[id];
      info(`  ${id} [${t.era}/${t.category}] grant:[${t.grant}]`);
    }
  }

  section('科技 Grant 对比');
  for (const id of evozenIds) {
    const legacyTech = getLegacyTech(legacy, id);
    if (!legacyTech) continue;
    const lg = legacyTech.grant;
    const eg = evozen[id].grant;
    if (!lg || !eg) {
      if (!lg && !eg) ok(`${id}: 都无 grant`);
      else warn(`${id} grant: legacy=${JSON.stringify(lg)} vs evozen=${JSON.stringify(eg)}`);
      continue;
    }
    if (lg[0] === eg[0] && lg[1] === eg[1]) {
      ok(`${id} grant: [${eg[0]}, ${eg[1]}]`);
    } else {
      fail(`${id} grant: legacy=[${lg}] ≠ evozen=[${eg}]`);
    }
  }

  section('科技费用对比');
  for (const id of evozenIds) {
    const legacyTech = getLegacyTech(legacy, id);
    if (!legacyTech) continue;
    const lCosts = legacyTech.costs;
    const eCosts = evozen[id].costs;

    const allRes = new Set([...Object.keys(lCosts), ...Object.keys(eCosts)]);
    for (const res of allRes) {
      const lv = lCosts[res], ev = eCosts[res];
      if (lv === ev) {
        ok(`${id}.${res}: ${ev}`);
      } else if (lv === undefined) {
        if (['rover', 'probes'].includes(id)) continue;
        warn(`${id}.${res}: EvoZen 有 ${ev}, legacy 未检测到 (可能是条件费用)`);
      } else if (ev === undefined) {
        if (lv === 0) continue;
        warn(`${id}.${res}: legacy 有 ${lv}, EvoZen 缺失`);
      } else {
        fail(`${id}.${res}: legacy=${lv} ≠ evozen=${ev}`);
      }
    }
  }

  section('科技前置需求对比');
  for (const id of evozenIds) {
    const legacyTech = getLegacyTech(legacy, id);
    if (!legacyTech) continue;
    const lReqs = normalizeTechReqs(id, legacyTech.reqs);
    const eReqs = normalizeTechReqs(id, evozen[id].reqs);

    const allKeys = new Set([...Object.keys(lReqs), ...Object.keys(eReqs)]);
    for (const key of allKeys) {
      const lv = lReqs[key], ev = eReqs[key];
      if (lv === ev) {
        ok(`${id} reqs.${key}: ${ev}`);
      } else if (lv === undefined) {
        if (['republic', 'socialist'].includes(id) && key === 'trade') continue;
        warn(`${id} reqs.${key}: EvoZen 要求 ${ev}, legacy 未检测到`);
      } else if (ev === undefined) {
        warn(`${id} reqs.${key}: legacy 要求 ${lv}, EvoZen 缺失`);
      } else {
        fail(`${id} reqs.${key}: legacy=${lv} ≠ evozen=${ev}`);
      }
    }
  }
}

// ─── 6. 提取 Legacy 岗位 ──────────────────────────
function extractLegacyJobs(src) {
  const jobs = {};
  // Pattern: loadJob('jobName', define, impact, stress)
  const regex = /loadJob\('(\w+)',\s*define,\s*([\d.]+),\s*([\d.]+)/g;
  let m;
  while ((m = regex.exec(src)) !== null) {
    jobs[m[1]] = { impact: parseFloat(m[2]), stress: parseFloat(m[3]) };
  }
  return jobs;
}

// ─── 7. 提取 EvoZen 岗位 ──────────────────────────
function extractEvoZenJobs(src) {
  const jobs = {};
  // Pattern: { id: 'xxx', ... impact: N, stress: N ... }
  const blockRegex = /\{\s*\n\s*id:\s*'(\w+)'([\s\S]*?)\n\s*\}/g;
  let m;
  while ((m = blockRegex.exec(src)) !== null) {
    const id = m[1];
    const block = m[2];
    const impactMatch = block.match(/impact:\s*([\d.]+)/);
    const stressMatch = block.match(/stress:\s*([\d.]+)/);
    if (impactMatch && stressMatch) {
      jobs[id] = {
        impact: parseFloat(impactMatch[1]),
        stress: parseFloat(stressMatch[1]),
      };
    }
  }
  return jobs;
}

// ─── 8. 提取 Legacy 合成配方 ──────────────────────
function extractLegacyCraftCosts(src) {
  const recipes = {};
  // Pattern inside craftCost():  ItemName: [{ r: 'Res', a: N }, ...]
  // We extract the simple cases (no global.race conditions)
  const craftBlock = src.match(/function craftCost\(manual[^)]*\)\{([\s\S]*?)return costs;/);
  if (!craftBlock) return recipes;
  const content = craftBlock[1];

  // Match: CraftName: [{ r: 'Resource', a: Amount }]
  // Also handles: CraftName: [{ r: 'Res1', a: N1 },{ r: 'Res2', a: N2 }]
  const lineRegex = /(\w+):\s*\[\{([^\]]+)\]\}/g;
  let m;
  while ((m = lineRegex.exec(content)) !== null) {
    const craftId = m[1];
    const inner = m[2];
    // Skip conditional ones (contain 'global.race')
    if (inner.includes('global.race')) continue;
    const ingredients = [];
    const ingRegex = /r:\s*'(\w+)',\s*a:\s*(\d+)/g;
    let im;
    while ((im = ingRegex.exec(inner)) !== null) {
      ingredients.push({ resource: im[1], amount: parseInt(im[2]) });
    }
    if (ingredients.length > 0) {
      recipes[craftId] = ingredients;
    }
  }
  return recipes;
}

// ─── 9. 提取 EvoZen 合成配方 ──────────────────────
function extractEvoZenCraftCosts(src) {
  const recipes = {};
  const blockMatch = src.match(/CRAFT_COSTS[^{]*\{([\s\S]*?)\};/);
  if (!blockMatch) return recipes;
  const content = blockMatch[1];

  // Pattern: CraftName: [{ resource: 'Res', amount: N }]
  const lineRegex = /(\w+):\s*\[\{([^\]]+)\]\]/g;
  let m;
  while ((m = lineRegex.exec(content)) !== null) {
    const craftId = m[1];
    const inner = m[2];
    const ingredients = [];
    const ingRegex = /resource:\s*'(\w+)',\s*amount:\s*(\d+)/g;
    let im;
    while ((im = ingRegex.exec(inner)) !== null) {
      ingredients.push({ resource: im[1], amount: parseInt(im[2]) });
    }
    if (ingredients.length > 0) {
      recipes[craftId] = ingredients;
    }
  }
  return recipes;
}

// ─── 10. 提取 Legacy 资源价值 ─────────────────────
function extractLegacyResourceValues(src) {
  const values = {};
  const block = src.match(/resource_values\s*=\s*\{([\s\S]*?)\};/);
  if (!block) return values;
  const pairs = block[1].matchAll(/(\w+):\s*([\d.]+)/g);
  for (const p of pairs) {
    values[p[1]] = parseFloat(p[2]);
  }
  return values;
}

// ─── 11. 提取 EvoZen 资源价值 ─────────────────────
function extractEvoZenResourceValues(src) {
  const values = {};
  const block = src.match(/RESOURCE_VALUES[^{]*\{([\s\S]*?)\};/);
  if (!block) return values;
  const pairs = block[1].matchAll(/(\w+):\s*([\d.]+)/g);
  for (const p of pairs) {
    values[p[1]] = parseFloat(p[2]);
  }
  return values;
}

// ─── 12. 提取 Legacy 贸易比率 ─────────────────────
function extractLegacyTradeRatios(src) {
  const values = {};
  const block = src.match(/tradeRatio\s*=\s*\{([\s\S]*?)\}/);
  if (!block) return values;
  const pairs = block[1].matchAll(/(\w+):\s*([\d.]+)/g);
  for (const p of pairs) {
    values[p[1]] = parseFloat(p[2]);
  }
  return values;
}

// ─── 13. 提取 EvoZen 贸易比率 ─────────────────────
function extractEvoZenTradeRatios(src) {
  const values = {};
  const block = src.match(/TRADE_RATIOS[^{]*\{([\s\S]*?)\};/);
  if (!block) return values;
  const pairs = block[1].matchAll(/(\w+):\s*([\d.]+)/g);
  for (const p of pairs) {
    values[p[1]] = parseFloat(p[2]);
  }
  return values;
}


// ─── 审计: 岗位 ───────────────────────────────────
function auditJobs(legacy, evozen) {
  section('岗位数据对比');

  const evozenIds = Object.keys(evozen);
  for (const id of evozenIds) {
    if (!legacy[id]) {
      warn(`${id}: legacy 中无对应岗位`);
      continue;
    }
    const l = legacy[id], e = evozen[id];

    if (l.impact === e.impact) {
      ok(`${id}.impact: ${e.impact}`);
    } else {
      fail(`${id}.impact: legacy=${l.impact} ≠ evozen=${e.impact}`);
    }

    if (l.stress === e.stress) {
      ok(`${id}.stress: ${e.stress}`);
    } else {
      fail(`${id}.stress: legacy=${l.stress} ≠ evozen=${e.stress}`);
    }
  }

  // Check legacy jobs missing in EvoZen (first-phase only)
  const evozenSet = new Set(evozenIds);
  const phase1Jobs = ['unemployed','hunter','farmer','lumberjack','quarry_worker',
    'miner','coal_miner','craftsman','cement_worker','banker',
    'entertainer','priest','professor','scientist'];
  const missing = phase1Jobs.filter(j => !evozenSet.has(j));
  if (missing.length > 0) {
    for (const id of missing) {
      warn(`岗位 ${id}: legacy 有，EvoZen 缺失`);
    }
  }
}

// ─── 审计: 合成配方 ───────────────────────────────
function auditCraftRecipes(legacy, evozen) {
  section('合成配方对比');

  const evozenIds = Object.keys(evozen);
  for (const id of evozenIds) {
    if (!legacy[id]) {
      warn(`${id}: legacy 中无对应配方`);
      continue;
    }
    const lRecipe = legacy[id], eRecipe = evozen[id];

    // Compare ingredient count
    if (lRecipe.length !== eRecipe.length) {
      fail(`${id}: 原料数量不同 legacy=${lRecipe.length} vs evozen=${eRecipe.length}`);
      continue;
    }

    for (let i = 0; i < eRecipe.length; i++) {
      const le = lRecipe[i], ee = eRecipe[i];
      if (le.resource === ee.resource && le.amount === ee.amount) {
        ok(`${id}: ${ee.resource}=${ee.amount}`);
      } else if (le.resource !== ee.resource) {
        fail(`${id}[${i}]: 原料不同 legacy=${le.resource} ≠ evozen=${ee.resource}`);
      } else {
        fail(`${id}.${ee.resource}: legacy=${le.amount} ≠ evozen=${ee.amount}`);
      }
    }
  }
}

// ─── 审计: 资源价值 ───────────────────────────────
function auditResourceValues(legacy, evozen) {
  section('资源价值对比');

  const evozenIds = Object.keys(evozen);
  for (const res of evozenIds) {
    if (legacy[res] === undefined) {
      warn(`${res}: legacy 中无对应价值`);
      continue;
    }
    if (legacy[res] === evozen[res]) {
      ok(`${res}: ${evozen[res]}`);
    } else {
      fail(`${res}: legacy=${legacy[res]} ≠ evozen=${evozen[res]}`);
    }
  }
}

// ─── 审计: 贸易比率 ───────────────────────────────
function auditTradeRatios(legacy, evozen) {
  section('贸易比率对比');

  const evozenIds = Object.keys(evozen);
  for (const res of evozenIds) {
    if (legacy[res] === undefined) {
      warn(`${res}: legacy 中无对应比率`);
      continue;
    }
    if (legacy[res] === evozen[res]) {
      ok(`${res}: ${evozen[res]}`);
    } else {
      fail(`${res}: legacy=${legacy[res]} ≠ evozen=${evozen[res]}`);
    }
  }
}


// ─── 18. Manifest 结构审计 ────────────────────────
// 原 scripts/audit-manifest.mjs 合并至此
// ──────────────────────────────────────────────────
function auditManifest() {
  section('Parity Manifest 结构校验');

  const MANIFEST_PATH = resolve(ROOT, 'parity/manifest.json');
  const VALID_STATUSES = new Set(['exact', 'partial', 'intentional_diff', 'not_started']);

  let manifest;
  try {
    manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'));
  } catch (e) {
    fail(`无法读取 manifest.json: ${e.message}`);
    return;
  }

  if (!manifest.version) {
    fail('manifest.version 缺失');
  } else {
    ok(`manifest.version: ${manifest.version}`);
  }

  if (!Array.isArray(manifest.systems) || manifest.systems.length === 0) {
    fail('manifest.systems 必须是非空数组');
  } else {
    const seenIds = new Set();
    for (const system of manifest.systems) {
      if (!system.id || typeof system.id !== 'string') {
        fail('system 条目缺少有效 id');
        continue;
      }
      if (seenIds.has(system.id)) {
        fail(`system id 重复: ${system.id}`);
      }
      seenIds.add(system.id);

      if (!VALID_STATUSES.has(system.status)) {
        fail(`system ${system.id} 状态无效: ${system.status}`);
      } else {
        ok(`system ${system.id}: status=${system.status}`);
      }

      // 检查引用路径是否存在
      for (const ref of system.refs ?? []) {
        if (!ref.path || typeof ref.path !== 'string') {
          fail(`system ${system.id} 有无效的 ref.path`);
          continue;
        }
        const fullPath = resolve(ROOT, ref.path);
        if (!existsSync(fullPath)) {
          fail(`system ${system.id} 引用了不存在的路径: ${ref.path}`);
        } else {
          ok(`system ${system.id} ref: ${ref.path}`);
        }
      }
    }
  }

  if (!Array.isArray(manifest.intentionalDiffs)) {
    fail('manifest.intentionalDiffs 必须是数组');
  } else {
    const seenIds = new Set();
    for (const diff of manifest.intentionalDiffs) {
      if (!diff.id || typeof diff.id !== 'string') {
        fail('intentionalDiff 条目缺少有效 id');
        continue;
      }
      if (seenIds.has(diff.id)) {
        fail(`intentionalDiff id 重复: ${diff.id}`);
      }
      seenIds.add(diff.id);

      if (diff.status !== 'intentional_diff') {
        fail(`intentionalDiff ${diff.id} 状态必须为 "intentional_diff"`);
      } else {
        ok(`intentionalDiff ${diff.id}: status valid`);
      }

      for (const ref of diff.refs ?? []) {
        if (!ref.path || typeof ref.path !== 'string') {
          fail(`intentionalDiff ${diff.id} 有无效的 ref.path`);
          continue;
        }
        const fullPath = resolve(ROOT, ref.path);
        if (!existsSync(fullPath)) {
          fail(`intentionalDiff ${diff.id} 引用了不存在的路径: ${ref.path}`);
        } else {
          ok(`intentionalDiff ${diff.id} ref: ${ref.path}`);
        }
      }
    }
  }
}

// ─── 14. Tick 公式常量审计 ────────────────────────
// 从 legacy/src/jobs.js 提取 loadJob impact 值，
// 从 legacy/src/main.js 提取关键系数，
// 与 packages/game-core/src/tick.ts 中硬编码常量逐项对比。
// 覆盖约 25 个核心公式系数，捕获因手误或重构导致的数值漂移。
function auditTickFormulas(jobsSrc, mainSrc, tickSrc) {
  section('Tick 公式常量审计 (tick.ts ↔ legacy)');

  // 从 jobs.js 提取 loadJob impact（第三个参数）
  const jobImpacts = {};
  const loadJobRegex = /loadJob\('(\w+)',\s*define,\s*([\d.]+)/g;
  let m;
  while ((m = loadJobRegex.exec(jobsSrc)) !== null) {
    jobImpacts[m[1]] = parseFloat(m[2]);
  }

  // 通用提取函数：从源码中匹配正则，返回指定捕获组的浮点数
  function x(src, pattern, group = 1) {
    const mm = src.match(pattern);
    return mm ? parseFloat(mm[group]) : null;
  }

  const legacyTimeMult = x(mainSrc, /var time_multiplier\s*=\s*([\d.]+)/);

  // 检查表：[标签, legacy来源说明, legacy期望值, tick.ts实际值]
  const checks = [
    // ── 全局时间因子 ──────────────────────────────────────────────
    ['TIME_MULTIPLIER',
      'main.js L1213',
      legacyTimeMult ?? 0.25,
      x(tickSrc, /const TIME_MULTIPLIER\s*=\s*([\d.]+)/)],

    // ── 猎人 ──────────────────────────────────────────────────────
    ['hunter.base_rate',
      'main.js: hunterRate 初始值',
      0.5,
      x(tickSrc, /let hunterRate\s*=\s*([\d.]+)/)],
    ['hunter.military_bonus',
      'main.js: military>=1 时 hunterRate +=',
      0.1,
      x(tickSrc, /hunterRate \+= ([\d.]+)/)],

    // ── 农民 ──────────────────────────────────────────────────────
    ['farmer.impact',
      `jobs.js loadJob: ${jobImpacts['farmer']}`,
      jobImpacts['farmer'] ?? 0.82,
      x(tickSrc, /let farmerBase\s*=\s*([\d.]+)/)],
    ['farmer.agri_high_bonus (agri>=2)',
      'jobs.js L800: +1.15',
      1.15,
      x(tickSrc, /farmerBase \+= techLevel\('agriculture'\) >= 2 \? ([\d.]+)/)],
    ['farmer.agri_low_bonus (agri<2)',
      'jobs.js L800: +0.65',
      0.65,
      x(tickSrc, /farmerBase \+= techLevel\('agriculture'\) >= 2 \? [\d.]+ : ([\d.]+)/)],

    // ── 磨坊加成 ──────────────────────────────────────────────────
    ['mill.bonus_agri5 (agri>=5)',
      'main.js L3590: +0.05/座',
      0.05,
      x(tickSrc, /millBonus = techLevel\('agriculture'\) >= 5 \? ([\d.]+)/)],
    ['mill.bonus_base (agri<5)',
      'main.js L3590: +0.03/座',
      0.03,
      x(tickSrc, /millBonus = techLevel\('agriculture'\) >= 5 \? [\d.]+ : ([\d.]+)/)],

    // ── 伐木工 ────────────────────────────────────────────────────
    ['lumberjack.impact',
      `jobs.js loadJob: ${jobImpacts['lumberjack']}`,
      jobImpacts['lumberjack'] ?? 1,
      x(tickSrc, /let lumberBase\s*=\s*(\d+(?:\.\d+)?)/)],
    ['axe.bonus_per_level',
      'main.js L5559: (axeLevel-1) × 0.35',
      0.35,
      x(tickSrc, /\(axeLevel - 1\) \* ([\d.]+)/)],
    ['lumber_yard.bonus_per_building',
      'main.js L5575: lumberYards × 0.02',
      0.02,
      x(tickSrc, /\(1 \+ lumberYards \* ([\d.]+)\)/)],

    // ── 石工 ──────────────────────────────────────────────────────
    ['quarry_worker.impact',
      `jobs.js loadJob: ${jobImpacts['quarry_worker']}`,
      jobImpacts['quarry_worker'] ?? 1,
      x(tickSrc, /let stoneBase\s*=\s*([\d.]+)/)],
    ['hammer.bonus_per_level',
      'jobs.js L119: hammerLevel × 0.4',
      0.4,
      x(tickSrc, /stoneBase \*= 1 \+ hammerLevel \* ([\d.]+)/)],
    ['rock_quarry.bonus_per_building',
      'main.js L5744: quarries × 0.02',
      0.02,
      x(tickSrc, /let stoneMult = 1 \+ quarries \* ([\d.]+)/)],

    // ── 矿工 ──────────────────────────────────────────────────────
    ['pickaxe.bonus_per_level (miner)',
      'main.js L6138: pickaxeLevel × 0.15',
      0.15,
      x(tickSrc, /const minerToolMult = 1 \+ pickaxeLevel \* ([\d.]+)/)],

    // ── 煤矿工 ────────────────────────────────────────────────────
    ['coal_miner.base_rate',
      `jobs.js loadJob: ${jobImpacts['coal_miner']}`,
      jobImpacts['coal_miner'] ?? 0.2,
      x(tickSrc, /deltas\['Coal'\] = actualCoalMiners \* ([\d.]+)/)],
    ['coal.pickaxe_bonus_per_level',
      'main.js: coalToolMult = 1 + pickaxe × 0.12',
      0.12,
      x(tickSrc, /const coalToolMult = 1 \+ pickaxeLevel \* ([\d.]+)/)],

    // ── 水泥工 ────────────────────────────────────────────────────
    ['cement_worker.output_rate',
      `jobs.js loadJob: ${jobImpacts['cement_worker']}`,
      jobImpacts['cement_worker'] ?? 0.4,
      x(tickSrc, /deltas\['Cement'\] = effectiveCement \* ([\d.]+)/)],
    ['cement.stone_cost_per_worker',
      'main.js: stonePerCement = 3',
      3,
      x(tickSrc, /const stonePerCement\s*=\s*(\d+)/)],

    // ── 知识（教授 / 图书馆）────────────────────────────────────
    ['professor.impact',
      `jobs.js loadJob: ${jobImpacts['professor']}`,
      jobImpacts['professor'] ?? 0.5,
      x(tickSrc, /let profImpact\s*=\s*([\d.]+)/)],
    ['library.prof_impact_bonus_per_lib',
      'main.js L9313: libraries × 0.01',
      0.01,
      x(tickSrc, /profImpact = [\d.]+ \+ getProfessorTraitBonus\(state\) \+ libraries \* ([\d.]+)/)],
    ['library.knowledge_mult_per_lib',
      'main.js L4259: 1 + libraries × 0.05',
      0.05,
      x(tickSrc, /const libraryMult = 1 \+ libraries \* ([\d.]+)/)],

    // ── 牧师信仰 ──────────────────────────────────────────────────
    ['priest.faith_rate',
      'main.js: priests × 0.5',
      0.5,
      x(tickSrc, /priests \* ([\d.]+) \* effectiveProdMult/)],

    // ── 税收 / 银行 ───────────────────────────────────────────────
    ['tax.citizen_income_rate',
      'main.js L7592: citizens × 0.4',
      0.4,
      x(tickSrc, /let incomeBase = citizens \* ([\d.]+)/)],
    ['banker.impact',
      `jobs.js loadJob: ${jobImpacts['banker']}`,
      jobImpacts['banker'] ?? 0.1,
      x(tickSrc, /let bankerImpact\s*=\s*([\d.]+)/)],

    // ── 铀副产物 ──────────────────────────────────────────────────
    ['uranium.coal_divisor',
      'main.js L6595: coal / 115 = uranium',
      115,
      x(tickSrc, /let uraniumDelta = deltas\['Coal'\] \/ (\d+)/)],
  ];

  for (const [label, legacyRef, expected, actual] of checks) {
    if (expected === null || expected === undefined) {
      warn(`${label}: legacy 值提取失败 — ${legacyRef}`);
      continue;
    }
    if (actual === null || actual === undefined) {
      fail(`${label}: tick.ts 中未找到对应常量 — 期望 ${expected} (${legacyRef})`);
      continue;
    }
    if (Math.abs(expected - actual) < 1e-9) {
      ok(`${label}: ${actual}  (${legacyRef})`);
    } else {
      fail(`${label}: legacy 期望 ${expected}，tick.ts 实际 ${actual}  (${legacyRef})`);
    }
  }
}

// ─── 主流程 ────────────────────────────────────────
console.log(`${C}╔══════════════════════════════════════════════════════════════╗${W}`);
console.log(`${C}║          EvoZen ↔ Legacy Evolve 全量审计报告                 ║${W}`);
console.log(`${C}╠══════════════════════════════════════════════════════════════╣${W}`);
console.log(`${C}║  验证层级（Coverage Map）                                    ║${W}`);
console.log(`${C}║  L1 静态数据   建筑/科技/岗位/配方/资源价值/贸易比率          ║${W}`);
console.log(`${C}║  L2 Tick公式   ~25 个核心生产系数 vs legacy 硬编码值          ║${W}`);
console.log(`${C}║  L3 Manifest  系统覆盖状态结构校验                           ║${W}`);
console.log(`${C}║  L4 单元测试   各模块逻辑正确性（npm test）                   ║${W}`);
console.log(`${C}║  L5 公式比值   运行时增量比验证（formula.audit.test.ts）      ║${W}`);
console.log(`${C}║  L6 系统集成   政府/军事/事件/电力等（systems.audit.test.ts）  ║${W}`);
console.log(`${C}║  L7 进度流     科技→建筑→人口（progression.audit.test.ts）    ║${W}`);
console.log(`${C}║  L8 回放快照   确定性 N-tick 全状态快照（replay.audit.test.ts）║${W}`);
console.log(`${C}║                                                              ║${W}`);
console.log(`${C}║  运行全部：npm run check                                     ║${W}`);
console.log(`${C}╚══════════════════════════════════════════════════════════════╝${W}`);

try {
  // 读取源文件
  const legacyActions = read('legacy/src/actions.js');
  const legacyTech = read('legacy/src/tech.js');
  const legacyJobs = read('legacy/src/jobs.js');
  const legacyMain = read('legacy/src/main.js');
  const legacyResources = read('legacy/src/resources.js');
  const evozenStructures = read('packages/game-core/src/structures.ts');
  const evozenTech = read('packages/game-core/src/tech.ts');
  const evozenJobsSrc = read('packages/game-core/src/jobs.ts');
  const evozenResourcesSrc = read('packages/game-core/src/resources.ts');
  const evozenTickSrc = read('packages/game-core/src/tick.ts');

  // 提取数据
  const legacyBuildingsData = extractLegacyBuildings(legacyActions);
  const evozenBuildingsData = extractEvoZenBuildings(evozenStructures);
  const legacyTechsData = extractLegacyTechs(legacyTech);
  const evozenTechsData = extractEvoZenTechs(evozenTech);
  const legacyJobsData = extractLegacyJobs(legacyJobs);
  const evozenJobsData = extractEvoZenJobs(evozenJobsSrc);
  const legacyCraftData = extractLegacyCraftCosts(legacyResources);
  const evozenCraftData = extractEvoZenCraftCosts(evozenResourcesSrc);
  const legacyResValues = extractLegacyResourceValues(legacyResources);
  const evozenResValues = extractEvoZenResourceValues(evozenResourcesSrc);
  const legacyTradeData = extractLegacyTradeRatios(legacyResources);
  const evozenTradeData = extractEvoZenTradeRatios(evozenResourcesSrc);

  info(`Legacy 建筑: ${Object.keys(legacyBuildingsData).length} 个`);
  info(`EvoZen 建筑: ${Object.keys(evozenBuildingsData).length} 个`);
  info(`Legacy 科技: ${Object.keys(legacyTechsData).length} 个`);
  info(`EvoZen 科技: ${Object.keys(evozenTechsData).length} 个`);
  info(`Legacy 岗位: ${Object.keys(legacyJobsData).length} 个`);
  info(`EvoZen 岗位: ${Object.keys(evozenJobsData).length} 个`);
  info(`Legacy 合成配方: ${Object.keys(legacyCraftData).length} 个`);
  info(`EvoZen 合成配方: ${Object.keys(evozenCraftData).length} 个`);
  info(`Legacy 资源价值: ${Object.keys(legacyResValues).length} 个`);
  info(`EvoZen 资源价值: ${Object.keys(evozenResValues).length} 个`);

  // L1 静态数据审计
  auditBuildings(legacyBuildingsData, evozenBuildingsData);
  auditTechs(legacyTechsData, evozenTechsData);
  auditJobs(legacyJobsData, evozenJobsData);
  auditCraftRecipes(legacyCraftData, evozenCraftData);
  auditResourceValues(legacyResValues, evozenResValues);
  auditTradeRatios(legacyTradeData, evozenTradeData);

  // L2 Tick 公式常量审计
  auditTickFormulas(legacyJobs, legacyMain, evozenTickSrc);

  // L3 Manifest 结构审计
  auditManifest();

  // 汇总
  section('审计汇总（L1 静态数据 + L2 Tick公式 + L3 Manifest）');
  console.log(`  总检查项: ${totalChecks}`);
  console.log(`  ${G}✔ 通过: ${passed}${W}`);
  console.log(`  ${Y}⚠ 警告: ${warnings}${W}`);
  console.log(`  ${R}✘ 错误: ${errors}${W}`);
  console.log();
  console.log(`  ${C}提示：L4-L8（运行时公式比值 / 系统集成 / 进度流 / 回放快照）由 npm test 覆盖${W}`);
  console.log();

  if (errors > 0) {
    console.log(`  ${R}审计未通过 — 有 ${errors} 个错误需要修复${W}`);
    process.exit(1);
  } else if (warnings > 0) {
    console.log(`  ${Y}审计通过 (有 ${warnings} 个警告需注意)${W}`);
  } else {
    console.log(`  ${G}审计全部通过 ✓${W}`);
  }
} catch (e) {
  console.error(`${R}审计脚本执行失败: ${e.message}${W}`);
  console.error(e.stack);
  process.exit(2);
}
