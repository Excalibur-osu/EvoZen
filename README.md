# EvoZen — 进化之禅

基于开源增量进化游戏 [Evolve](https://github.com/pmotschmann/Evolve) 进行**现代化重构**的项目。

原版 Evolve 是一款优秀的单机网页增量游戏，玩家从原始汤中的原生质出发，经历 RNA → DNA → 物种选择 → 原始部落 → 科技发展 → 太空探索的完整进化链。EvoZen 在保留核心玩法的基础上，使用现代前端技术栈重新构建，并计划加入**多人在线**内容，让进化不再孤独。

## 与原版的区别

| | Evolve（原版） | EvoZen |
|------|------|------|
| 技术栈 | 原生 JS + jQuery | Vue 3 + TypeScript + Vite |
| 架构 | 单文件 + 全局变量 | Monorepo + Pinia 状态管理 |
| 游戏逻辑 | 与 UI 耦合 | 纯函数引擎，零 UI 依赖 |
| 语言 | 英文为主 | 中文优先 |
| 联机 | 无 | 计划支持多人在线 |
| 存档 | 仅本地 | 本地 + 计划云端同步 |

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

## 项目结构

```text
EvoZen/
├── apps/
│   └── web/                  # Vue 3 + Vite 前端
├── packages/
│   ├── shared-types/         # TypeScript 共享类型定义
│   └── game-core/            # 纯游戏逻辑引擎（零 UI 依赖）
├── legacy/                   # 原版源码归档（仅参考，不参与构建）
└── package.json              # npm workspaces 根配置
```

## 技术栈

- **前端**：Vue 3 + Vite + TypeScript + Pinia
- **包管理**：npm workspaces（monorepo）
- **许可证**：MPL-2.0（沿用原版）

## 开发路线

### 第一阶段 A：文明时代核心（当前）

用现代技术栈复刻核心玩法，跑通完整的文明时代单机循环。

#### 已完成系统

| 系统 | 状态 | 说明 |
|------|------|------|
| 进化阶段 | ✅ 完成 | RNA/DNA 收集、物种选择、快速开始 |
| 资源系统 | ✅ 完成 | 18 种资源、产出/消耗引擎、建筑加成 |
| 科技树 | ✅ 完成 | 45 个科技（进化链 + 科学链 + 仓储/娱乐/宗教/工具/政府线） |
| 建造队列 | ✅ 完成 | 城市规划科技解锁建造队列 UI，逐 Tick 扣资源排队建造 |
| 建筑系统 | ✅ 完成 | 22 个建筑、费用递增、效果联动 |
| 岗位系统 | ✅ 完成 | 14 个岗位（含娱乐者、牧师）、工人分配、产量计算 |
| 本地存档 | ✅ 完成 | localStorage + base64 导入导出 |
| 贸易系统 | ✅ 完成 | 贸易站 + 资源买卖 + 自动贸易路线 |
| 工匠/铸造 | ✅ 完成 | 合成材料（胶合板/砖/锻铁/合金板）+ 工匠产线分配 |
| 冶金系统 | ✅ 完成 | 熔炉 + 钢铁生产 + 金属精炼厂 + 铝矿开采 |
| 政府系统 | ✅ 完成 | 5 种政体（无政府/独裁/民主/寡头/神权）+ 税率调节 + 250 tick 切换冷却 |
| 银行/金融 | ✅ 完成 | 银行建筑 + 银行家岗位 + Vault 科技扩展金钱上限 |
| 仓储系统 | ✅ 完成 | 板条箱/集装箱 + 装运站/集装箱港口 + 集装箱化/钢制集装箱科技 |
| 娱乐系统 | ✅ 完成 | 剧场/剧作家科技 + 圆形剧场建筑 + 娱乐者岗位 |
| 宗教系统 | ✅ 完成 | 信仰/神学科技 + 神庙建筑 + 牧师岗位 + 神权政体 |

#### 待完成系统

| 系统 | 状态 | 说明 |
|------|------|------|
| 日历/季节 | 🔲 待做 | 春夏秋冬循环 + 天气（晴/雨/雪/风）对农业和士气的影响 |
| 士气系统 | 🔲 待做 | morale/stress → 全局产出乘数 + 季节/天气/税率/政体联动 + entertainer/priest 产出挂载 |
| 补全建筑 | 🔲 待做 | hospital(+1人口) + sawmill(木材+5%/座) + smokehouse(食物上限+500) + oil_well + oil_depot + wardenclyffe(高级实验室) + biolab + casino + wharf(港口) + tourist_center + shrine |
| 补全资源 | 🔲 待做 | Oil(石油) + Titanium(钛) — 工业化和后续建筑的基础材料 |
| 补全科技 | 🔲 待做 | hospital/farm_house/carpentry/iron_saw/shovel/iron_shovel/dynamite/rebar/apprentices/artisans/aphrodisiac/large_trades/dowsing_rod/metal_detector 等 ~15 个文明时代科技 |
| 军事系统 | 🔲 待做 | garrison 兵营 + 士兵招募/战术/受伤 + boot_camp 训练营 + 武器护甲科技线(spear→armor) + mercs 雇佣兵 + spy 间谍 + 外交（3 个外国政府：占领/吞并/购买）|
| 事件系统 | 🔲 待做 | 随机事件：丰收/旱灾/瘟疫/贸易商队/灵感(知识×2)/火灾/外敌袭击/罢工 等 |

### 第一阶段 B：发现时代 / 工业化

在文明时代核心完成后，推进至电力和工业化阶段。

| 系统 | 状态 | 说明 |
|------|------|------|
| 电力系统 | 🔲 待做 | coal_power(燃煤) → oil_power(燃油) → fission_power(核能) + windmill(风车被动电力) |
| 工厂产线 | 🔲 待做 | factory 建筑生产 Alloy(合金)/Polymer(聚合物)/奢侈品；需电力驱动 |
| 高级建筑 | 🔲 待做 | apartment(高级住宅+5人口,需电力) + mass_driver(质量驱动器) |
| 冶金升级 | 🔲 待做 | blast_furnace(高炉)熔炉升级 + 更多工具科技(steel_saw/steel_shovel/steel_pickaxe 等) |
| 政体扩展 | 🔲 待做 | republic(共和国)政体 + socialist(社会主义)政体 |
| 科技扩展 | 🔲 待做 | electricity(电力)/diplomacy(外交)/espionage(谍报)/radio(无线电)/science:5+(科学期刊) 等发现时代科技 |
| ARPA 项目 | 🔲 待做 | 长线研究项目：基因组测序/超级对撞机等（可选） |

### 第二阶段：后端服务

搭建服务端，实现云端存档和反作弊。

- Node.js + Fastify
- Socket.IO 实时通信
- Prisma + PostgreSQL 持久化
- Redis 缓存

### 第三阶段：多人在线

核心目标：让玩家在同一个世界中共同进化、竞争与合作。

- 客户端只发指令，服务端负责所有计算
- 多文明并存，外交/贸易/战争
- 排行榜与赛季机制
- 公会/联盟系统

## 设计原则

1. **逻辑与 UI 分离** — `game-core` 是纯函数引擎，未来服务端可直接复用
2. **渐进式开发** — 先单机，再联机，逐步扩展
3. **中文优先** — 暂不做国际化
4. **legacy 只读** — 旧代码仅作参考，迁移完成后将移除

## 许可证

[MPL-2.0](LICENSE)（沿用原版 Evolve 许可证）

Copyright (c) 2024-2026 Excalibur-osu 及 EvoZen 贡献者。
