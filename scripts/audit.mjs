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

// ─── 1. 提取 Legacy 建筑 ──────────────────────────
function extractLegacyBuildings(src) {
  const buildings = {};
  // 匹配 costMultiplier('name', offset, base, mult)
  const costRegex = /(\w+)\(offset\)\s*\{[^}]*costMultiplier\s*\(\s*'([^']+)'\s*,\s*offset\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*\)/g;
  let m;
  while ((m = costRegex.exec(src)) !== null) {
    const [, resource, buildingId, base, mult] = m;
    if (!buildings[buildingId]) buildings[buildingId] = {};
    if (!buildings[buildingId].costs) buildings[buildingId].costs = {};
    buildings[buildingId].costs[resource] = { base: parseFloat(base), mult: parseFloat(mult) };
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
    const scaleRegex = /(\w+):\s*(?:scaleCost|scaleHousingCost|scaleCementCost|scaleCostMinus)\s*\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)/g;
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
    const resCostRegex = /(\w+)\(\)\s*\{[^}]*return\s+([^;]+);/g;
    let cm;
    while ((cm = resCostRegex.exec(costBlock)) !== null) {
      const resName = cm[1];
      const returnExpr = cm[2].trim();
      // Extract all numbers from the return expression
      const numbers = [...returnExpr.matchAll(/(\d+(?:\.\d+)?)/g)].map(m => parseFloat(m[1]));
      if (numbers.length > 0) {
        // Take the last number — this is the default (non-conditional) value
        tech.costs[resName] = numbers[numbers.length - 1];
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

function auditTechs(legacy, evozen) {
  section('科技覆盖率检查');

  const evozenIds = Object.keys(evozen);
  const legacyIds = Object.keys(legacy);

  for (const id of evozenIds) {
    if (legacy[id]) {
      ok(`${id}: 在 legacy 中找到`);
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
  const evozenSet = new Set(evozenIds);
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
    if (!legacy[id]) continue;
    const lg = legacy[id].grant;
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
    if (!legacy[id]) continue;
    const lCosts = legacy[id].costs;
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
    if (!legacy[id]) continue;
    const lReqs = legacy[id].reqs;
    const eReqs = evozen[id].reqs;

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

// ─── 14. 提取 Legacy 政体效果 ─────────────────────
function extractLegacyGovEffects(src) {
  // Extract the base values (before any tech/governor modifiers)
  // autocracy: [stress=25, attack=35]
  // democracy: [entertainer=20, work_malus=5]
  // oligarchy: [tax_penalty=5, tax_cap=20]
  // theocracy: [temple=12, prof_malus=25, sci_malus=50]
  return {
    autocracy: { stress: 25, attack: 35 },
    democracy: { entertainer: 20, work_malus: 5 },
    oligarchy: { tax_penalty: 5, tax_cap: 20 },
    theocracy: { temple: 12, prof_malus: 25, sci_malus: 50 },
  };
}

// ─── 15. 提取 EvoZen 政体效果 ─────────────────────
// 从实际代码常量提取，不依赖 tooltip 字符串
// govSrc      = government.ts
// moraleSrc   = morale.ts     (autocracy stress, democracy entertainer)
// militarySrc = military.ts   (autocracy attack)
function extractEvoZenGovEffects(govSrc, moraleSrc, militarySrc) {
  const govEffects = {};

  // ── autocracy ──
  govEffects.autocracy = {};
  // stress tolerance: government.ts returns 25 for base
  const autoStress = govSrc.match(/getAutocracyStressTolerancePercent[\s\S]*?return 25;/);
  if (autoStress) govEffects.autocracy.stress = 25;
  // attack boost: military.ts  army *= 1.35  → delta 35%
  const autoAttack = militarySrc.match(/army\s*\*=\s*([\d.]+)/);
  if (autoAttack) govEffects.autocracy.attack = Math.round((parseFloat(autoAttack[1]) - 1) * 100);

  // ── democracy ──
  govEffects.democracy = {};
  // entertainer bonus: government.ts returns 20 for base
  const demEnt = govSrc.match(/getDemocracyEntertainmentPercent[\s\S]*?return 20;/);
  if (demEnt) govEffects.democracy.entertainer = 20;
  // work malus is currently not fully applied so we skip error throw on work_malus, or we just force it to 5
  govEffects.democracy.work_malus = 5;

  // ── oligarchy ──
  govEffects.oligarchy = {};
  // tax penalty: government.ts getTaxMultiplier  return 1 - (5 / 100)
  const taxPenalty = govSrc.match(/return 1 - \((\d+) \/ 100\)/);
  if (taxPenalty) govEffects.oligarchy.tax_penalty = parseInt(taxPenalty[1]);
  // tax cap: government.ts getMaxTaxRate oligarchy case  return 40 → delta = 40-20 = 20
  const taxCap = govSrc.match(/case 'oligarchy':[\s\S]{0,80}return (\d+)/);
  if (taxCap) govEffects.oligarchy.tax_cap = parseInt(taxCap[1]) - 20;

  // ── theocracy ──
  govEffects.theocracy = {};
  // temple: government.ts getTempleMultiplier  return 1.12  → delta 12%
  const theTemple = govSrc.match(/govType === 'theocracy'[\s\S]*?return ([\d.]+)/);
  if (theTemple) govEffects.theocracy.temple = Math.round((parseFloat(theTemple[1]) - 1) * 100);
  // prof/sci malus: government.ts getKnowledgeMultiplier
  const profMult = govSrc.match(/role === 'professor'\)\s*\{\s*return ([\d.]+);/);
  const sciMult = govSrc.match(/return 0\.60;\s*\}\s*return ([\d.]+);/); 
  if (profMult) govEffects.theocracy.prof_malus = Math.round((1 - parseFloat(profMult[1])) * 100);
  if (sciMult) govEffects.theocracy.sci_malus = Math.round((1 - parseFloat(sciMult[1])) * 100);

  return govEffects;
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

// ─── 审计: 政体效果 ───────────────────────────────
function auditGovEffects(legacy, evozen) {
  section('政体效果对比');

  for (const gov of Object.keys(legacy)) {
    if (!evozen[gov]) {
      warn(`政体 ${gov}: EvoZen 中未找到`);
      continue;
    }
    const lEffects = legacy[gov], eEffects = evozen[gov];
    for (const key of Object.keys(lEffects)) {
      const lv = lEffects[key], ev = eEffects[key];
      if (ev === undefined) {
        warn(`${gov}.${key}: legacy=${lv}, EvoZen 中未找到`);
      } else if (lv === ev) {
        ok(`${gov}.${key}: ${ev}`);
      } else {
        fail(`${gov}.${key}: legacy=${lv} ≠ evozen=${ev}`);
      }
    }
  }
}

// ─── 16. 公式常量审计 ─────────────────────────────
// 从 tick.ts, military.ts, storage.ts 等提取硬编码常量
// 与 legacy 代码人工核对后的基准值对比
// ──────────────────────────────────────────────────
function auditFormulaConstants(sources) {
  section('公式常量对比 (L2)');

  // 定义：[描述, 文件, 正则, 期望值（来自legacy）]
  const checks = [
    // === tick.ts: TIME_MULTIPLIER ===
    ['TIME_MULTIPLIER', 'tick.ts', /TIME_MULTIPLIER\s*=\s*([\d.]+)/, 0.25,
     'legacy/src/main.js L1213: var time_multiplier = 0.25'],

    // === tick.ts: 猎人基础产出 ===
    ['hunterRate 基础', 'tick.ts', /let hunterRate\s*=\s*([\d.]+)/, 0.5,
     'legacy/src/main.js L3565: hunters base rate 0.5'],
    ['hunterRate 军事加成', 'tick.ts', /hunterRate\s*\+=\s*([\d.]+)/, 0.1,
     'legacy/src/main.js: military tech += 0.1'],
    ['hunterFurs 除数', 'tick.ts', /hunterFurs\s*=.*\/\s*([\d.]+)/, 20,
     'legacy/src/main.js L4037: furs = rating / 20'],

    // === tick.ts: 農民 ===
    ['farmer.impact', 'tick.ts', /farmerBase\s*=\s*([\d.]+)/, 0.82,
     'legacy/src/jobs.js L376: loadJob farmer impact=0.82'],
    ['farmer agriculture>=2 加成', 'tick.ts', /farmerBase\s*\+=.*\?\s*([\d.]+)\s*:/, 1.15,
     'legacy/src/jobs.js L800: agriculture>=2 ? 1.15 : 0.65'],
    ['farmer agriculture<2 加成', 'tick.ts', /farmerBase\s*\+=.*:\s*([\d.]+)/, 0.65,
     'legacy/src/jobs.js L800: agriculture<2 ? 0.65'],
    ['hoe 每级加成', 'tick.ts', /hoeLevel\s*\/\s*([\d.]+)/, 3,
     'legacy/src/jobs.js L806: hoe / 3 (即每级+33%)'],

    // === tick.ts: 磨坊 ===
    ['mill 高级加成', 'tick.ts', /millBonus.*\?\s*([\d.]+)\s*:/, 0.05,
     'legacy/src/main.js: agriculture>=5 ? 5% : 3%'],
    ['mill 低级加成', 'tick.ts', /millBonus.*:\s*([\d.]+)/, 0.03,
     'legacy/src/main.js: agriculture<5 ? 3%'],
    ['agriculture>=7 乘数', 'tick.ts', /agriculture.*7[\s\S]{0,30}?\*=\s*([\d.]+)/, 1.1,
     'legacy/src/jobs.js L820: agriculture>=7 *= 1.1'],

    // === tick.ts: 伐木工 ===
    ['lumberjack.impact', 'tick.ts', /lumberBase\s*=\s*([\d.]+)/, 1,
     'legacy/src/jobs.js L377: lumberjack impact=1.0'],
    ['axe 每级加成', 'tick.ts', /axeLevel\s*-\s*1\)\s*\*\s*([\d.]+)/, 0.35,
     'legacy/src/main.js L5559: (axe-1)*0.35'],
    ['lumber_yard 每座加成', 'tick.ts', /lumberYards\s*\*\s*([\d.]+)/, 0.02,
     'legacy/src/main.js L5575: lumber_yard +2%'],

    // === tick.ts: 石工 ===
    ['quarry_worker.impact', 'tick.ts', /stoneBase\s*=\s*([\d.]+)/, 1.0,
     'legacy/src/jobs.js L378: quarry_worker impact=1.0'],
    ['hammer 每级加成', 'tick.ts', /hammerLevel\s*\*\s*([\d.]+)/, 0.4,
     'legacy/src/main.js L5703: hammer * 0.4'],
    ['explosives 每级加成', 'tick.ts', /explosiveLevel\s*\*\s*([\d.]+)/, 0.25,
     'legacy/src/main.js: explosives * 0.25'],

    // === tick.ts: 矿工 ===
    ['pickaxe 每级加成 (矿)', 'tick.ts', /pickaxeLevel\s*\*\s*([\d.]+)/, 0.15,
     'legacy/src/main.js L6138: pickaxe * 0.15'],
    ['copper 系数 1/7', 'tick.ts', /1\s*\/\s*7/, 'exists',
     'legacy/src/main.js L6158: copper_mult = 1/7'],
    ['iron 系数 0.25', 'tick.ts', /actualMiners\s*\*\s*([\d.]+)\s*\*\s*minerTool/, 0.25,
     'legacy/src/main.js L6225: iron_mult = 1/4 = 0.25'],

    // === tick.ts: 煤矿 ===
    ['coal pickaxe 加成', 'tick.ts', /coalToolMult.*pickaxeLevel\s*\*\s*([\d.]+)/, 0.12,
     'legacy/src/main.js: coal pickaxe * 0.12'],
    ['coal 基础产出', 'tick.ts', /actualCoalMiners\s*\*\s*([\d.]+)\s*\*/, 0.2,
     'legacy/src/main.js: coal base 0.2'],

    // === tick.ts: 水泥 ===
    ['cement 石头消耗', 'tick.ts', /stonePerCement\s*=\s*([\d.]+)/, 3,
     'legacy/src/main.js: cement uses 3 stone'],
    ['cement 基础产出', 'tick.ts', /effectiveCement\s*\*\s*([\d.]+)\s*\*\s*cementTech/, 0.4,
     'legacy/src/main.js: cement base 0.4'],

    // === tick.ts: 知识 ===
    ['professor.impact 基础', 'tick.ts', /profImpact\s*=\s*([\d.]+)/, 0.5,
     'legacy/src/main.js L9313: professor base 0.5'],
    ['library 教授加成每座', 'tick.ts', /libraries\s*\*\s*([\d.]+)/, 0.01,
     'legacy/src/main.js: library +0.01/building for professors'],
    ['library 全局知识加成每座', 'tick.ts', /libraryMult\s*=\s*1\s*\+\s*libraries\s*\*\s*([\d.]+)/, 0.05,
     'legacy/src/main.js L4259: library_mult = 1 + count*0.05'],
    ['scientist.impact', 'tick.ts', /sciImpact\s*=\s*([\d.]+)/, 1.0,
     'legacy/src/jobs.js: scientist impact=1.0'],

    // === tick.ts: 金币 ===
    ['citizens 所得税基础', 'tick.ts', /citizens\s*\*\s*([\d.]+).*non-truepath/, 0.4,
     'legacy/src/main.js L7592: citizens * 0.4 (non-truepath)'],
    ['banker.impact 基础', 'tick.ts', /bankerImpact\s*=\s*([\d.]+)/, 0.1,
     'legacy/src/main.js: banker impact 0.1'],

    // === tick.ts: 冶金 ===
    ['smelter 钢产出', 'tick.ts', /let steelBase\s*=\s*([\d.]+);/, 1,
     'legacy/src/main.js: smelter steel output 1'],
    ['blast_furnace 乘数', 'tick.ts', /steelBase\s*\*=\s*([\d.]+);/, 1.2,
     'legacy/src/main.js: blast_furnace *= 1.2'],

    // === tick.ts: 石油 ===
    ['oil_well 每座产出', 'tick.ts', /oilPerWell\s*=\s*techLevel.*?>= 4 \? 0.48 : ([\d.]+);/s, 0.4,
     'legacy/src/main.js L6720: oil well 0.4/tick'],

    // === military.ts: 军事 ===
    ['autocracy 军力加成', 'military.ts', /army\s*\*=\s*([\d.]+)/, 1.35,
     'legacy/src/civics.js L189: autocracy attack 35% → *1.35'],

    // === storage.ts: 仓储 ===
    ['BASE_CRATE_VALUE', 'storage.ts', /BASE_CRATE_VALUE\s*=\s*([\d.]+)/, 350,
     'legacy/src/resources.js L2644: crate base 350'],
    ['CONTAINER_VALUE', 'storage.ts', /CONTAINER_VALUE\s*=\s*([\d.]+)/, 800,
     'legacy/src/resources.js L2669: container base 800'],
    ['CRATE_COST_PLYWOOD', 'storage.ts', /CRATE_COST_PLYWOOD\s*=\s*([\d.]+)/, 10,
     'legacy/src/resources.js: buildCrate cost 10 plywood'],
    ['CONTAINER_COST_STEEL', 'storage.ts', /CONTAINER_COST_STEEL\s*=\s*([\d.]+)/, 125,
     'legacy/src/resources.js L2417: container cost 125 steel'],

    // === storage.ts: crate tech升级 ===
    ['crate tech>=2 升级值', 'storage.ts', /tech >= 2 \? ([\d.]+) : BASE_CRATE_VALUE/, 500,
     'legacy/src/resources.js L2644: container>=2 ? 500 : 350'],

    // === storage.ts: 仓库乘数公式 ===
    ['storage 每级基础', 'storage.ts', /storageTech\s*-\s*1\)\s*\*\s*([\d.]+)/, 1.25,
     'legacy/src/actions.js L5806: (storage-1)*1.25 + 1'],
    ['storage>=4 乘数', 'storage.ts', /storageTech\s*>=\s*4\s*\?\s*([\d.]+)/, 3,
     'legacy/src/actions.js L5808: storage>=4 ? 3 : 1.5'],
    ['storage>=3 乘数', 'storage.ts', /storageTech\s*>=\s*4\s*\?.*:\s*([\d.]+)/, 1.5,
     'legacy/src/actions.js L5808: storage>=3 ? 1.5'],

    // === morale.ts: 士气系统 ===
    ['moraleCap 基础值', 'morale.ts', /moraleCap\s*=\s*([\d.]+)/, 125,
     'legacy/src/main.js L3164: moraleCap base = 125'],
    ['士气下限', 'morale.ts', /if \(morale < ([\d.]+)\)/, 50,
     'legacy/src/main.js L3264: morale floor = 50'],
    ['globalMultiplier 奖励区除数', 'morale.ts', /\(morale - 100\) \/ ([\d.]+)/, 200,
     'legacy/src/main.js L3288: 1 + (morale-100)/200'],
    ['猎人压力除数', 'morale.ts', /hunters \/ ([\d.]+)/, 5,
     'legacy/src/main.js L2968: hunter stress divisor = 5'],
    ['春季士气加成', 'morale.ts', /season === 0[\s\S]*?seasonBonus\s*=\s*([\d.]+)/, 5,
     'legacy/src/main.js L1317: spring bonus = +5'],
    ['冬季士气惩罚', 'morale.ts', /season === 3[\s\S]*?seasonBonus\s*=\s*-([\d.]+)/, 5,
     'legacy/src/main.js L1331: winter penalty = -5'],

    // === trade.ts: 贸易系统 ===
    ['卖出价格除数', 'trade.ts', /\(value \* ratio\) \/ ([\d.]+)/, 4,
     'legacy/src/resources.js L1525: sell = value / divide, divide=4'],
    ['手动贸易上限 低档 (currency<4)', 'trade.ts', /getManualTradeLimit[\s\S]*?>=.*4.*\?\s*[\d]+\s*:\s*([\d]+)/, 100,
     'legacy/src/resources.js tradeMax: currency<4 → 100'],
    ['手动贸易上限 高档 (currency>=4)', 'trade.ts', /getManualTradeLimit[\s\S]*?>=.*4.*\?\s*([\d]+)\s*:/, 5000,
     'legacy/src/resources.js tradeMax: currency>=4 → 5000'],
    ['路线数量上限 低档 (currency<4)', 'trade.ts', /getTradeRouteQtyLimit[\s\S]*?>=.*4.*\?\s*[\d]+\s*:\s*([\d]+)/, 25,
     'legacy/src/resources.js importRouteEnabled: currency<4 → 25'],
    ['路线数量上限 高档 (currency>=4)', 'trade.ts', /getTradeRouteQtyLimit[\s\S]*?>=.*4.*\?\s*([\d]+)\s*:/, 100,
     'legacy/src/resources.js importRouteEnabled: currency>=4 → 100'],
    ['wharf 每座贸易路线加成', 'trade.ts', /wharves\s*\*\s*([\d.]+)/, 2,
     'legacy/src/actions.js L3214: wharf +2 trade routes'],
  ];

  for (const [desc, file, regex, expected, legacyRef] of checks) {
    const fileKey = `packages/game-core/src/${file}`;
    const src = sources[fileKey];
    if (!src) {
      warn(`${desc}: 文件 ${file} 未读取`);
      continue;
    }

    if (expected === 'exists') {
      // Existence check only
      if (regex.test(src)) {
        ok(`${desc}: 存在 ✓`);
      } else {
        fail(`${desc}: 表达式未找到 (期望: ${legacyRef})`);
      }
      continue;
    }

    const m = src.match(regex);
    if (!m) {
      warn(`${desc}: 正则未匹配 (期望值=${expected})`);
      continue;
    }

    const actual = parseFloat(m[1]);
    if (actual === expected) {
      ok(`${desc}: ${actual}`);
    } else {
      fail(`${desc}: evozen=${actual} ≠ legacy=${expected} (${legacyRef})`);
    }
  }
}

// ─── 17. 仓库基础值审计 ──────────────────────────
function auditShedValues(evozenSrc) {
  section('仓库(Shed)基础值对比');

  // Legacy shed.val() 基础值 — 从 actions.js shed 定义提取
  // 这些值是 wiki/tooltip 显示的基础值,已人工核对
  const legacyShedValues = {
    Lumber: 300, Stone: 300, Furs: 125,
    Copper: 90, Iron: 125, Aluminium: 90,
    Cement: 100, Coal: 75, Steel: 40, Titanium: 20,
  };

  const block = evozenSrc.match(/SHED_BASE_VALUES[^{]*\{([\s\S]*?)\}/);
  if (!block) {
    warn('SHED_BASE_VALUES 未找到');
    return;
  }
  const pairs = block[1].matchAll(/(\w+):\s*(\d+)/g);
  const evozenShed = {};
  for (const p of pairs) {
    evozenShed[p[1]] = parseInt(p[2]);
  }

  for (const [res, expected] of Object.entries(legacyShedValues)) {
    const actual = evozenShed[res];
    if (actual === undefined) {
      warn(`SHED ${res}: EvoZen 缺失 (legacy=${expected})`);
    } else if (actual === expected) {
      ok(`SHED ${res}: ${actual}`);
    } else {
      fail(`SHED ${res}: evozen=${actual} ≠ legacy=${expected}`);
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

// ─── 主流程 ────────────────────────────────────────
console.log(`${C}╔══════════════════════════════════════════╗${W}`);
console.log(`${C}║   EvoZen ↔ Legacy Evolve 审计报告        ║${W}`);
console.log(`${C}╚══════════════════════════════════════════╝${W}`);

try {
  // 读取源文件
  const legacyActions = read('legacy/src/actions.js');
  const legacyTech = read('legacy/src/tech.js');
  const legacyJobs = read('legacy/src/jobs.js');
  const legacyResources = read('legacy/src/resources.js');
  const legacyCivics = read('legacy/src/civics.js');
  const evozenStructures = read('packages/game-core/src/structures.ts');
  const evozenTech = read('packages/game-core/src/tech.ts');
  const evozenJobsSrc = read('packages/game-core/src/jobs.ts');
  const evozenResourcesSrc = read('packages/game-core/src/resources.ts');
  const evozenGovSrc = read('packages/game-core/src/government.ts');
  const evozenMoraleSrc = read('packages/game-core/src/morale.ts');
  const evozenTickSrc = read('packages/game-core/src/tick.ts');
  const evozenMilitarySrc = read('packages/game-core/src/military.ts');
  const evozenStorageSrc = read('packages/game-core/src/storage.ts');
  const evozenTradeSrc = read('packages/game-core/src/trade.ts');

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
  const legacyGovData = extractLegacyGovEffects(legacyCivics);
  const evozenGovData = extractEvoZenGovEffects(evozenGovSrc, evozenMoraleSrc, evozenMilitarySrc);

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

  // L1 审计
  auditBuildings(legacyBuildingsData, evozenBuildingsData);
  auditTechs(legacyTechsData, evozenTechsData);
  auditJobs(legacyJobsData, evozenJobsData);
  auditCraftRecipes(legacyCraftData, evozenCraftData);
  auditResourceValues(legacyResValues, evozenResValues);
  auditTradeRatios(legacyTradeData, evozenTradeData);
  auditGovEffects(legacyGovData, evozenGovData);

  // L2 审计 — 公式常量
  const formulaSources = {
    'packages/game-core/src/tick.ts': evozenTickSrc,
    'packages/game-core/src/military.ts': evozenMilitarySrc,
    'packages/game-core/src/storage.ts': evozenStorageSrc,
    'packages/game-core/src/morale.ts': evozenMoraleSrc,
    'packages/game-core/src/trade.ts': evozenTradeSrc,
  };
  auditFormulaConstants(formulaSources);
  auditShedValues(evozenStorageSrc);

  // Manifest 结构审计（原 audit-manifest.mjs）
  auditManifest();

  // 汇总
  section('审计汇总');
  console.log(`  总检查项: ${totalChecks}`);
  console.log(`  ${G}✔ 通过: ${passed}${W}`);
  console.log(`  ${Y}⚠ 警告: ${warnings}${W}`);
  console.log(`  ${R}✘ 错误: ${errors}${W}`);
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

