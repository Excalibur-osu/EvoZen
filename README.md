# EvoZen

基于开源增量进化游戏 [Evolve](https://github.com/pmotschmann/Evolve) 进行重构与复刻的项目。

原版 Evolve 是单机网页增量游戏，玩家从原始汤中的原生质出发，经历 RNA、DNA、物种选择、原始部落、科技发展、太空探索与多种重置路线。EvoZen 当前目标是用现代前端技术栈完成单机内容的逐步复刻与机制对齐；多人在线与云端能力仅作为远期方向。

## 当前状态

EvoZen 已完成现代化架构和主要数据框架，早中期主循环可玩，后期内容正在逐步对齐原版。

## 与原版的主要差距

| | Evolve（原版） | EvoZen 当前 |
|------|------|------|
| 技术栈 | 原生 JS + jQuery | Vue 3 + TypeScript + Vite |
| 架构 | 全局状态与 UI 深度耦合 | Monorepo + Pinia + 纯逻辑核心 |
| 内容覆盖 | 完整正式游戏 | 复刻开发中 |
| UI 体验 | 完整成熟 | 核心可用，持续打磨 |
| 存档 | 本地存档 | 本地存档，云端同步为远期方向 |

## 快速开始

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm run build
```

## 项目结构

```text
EvoZen/
├── apps/
│   └── web/                  # Vue 3 + Vite 前端
├── packages/
│   ├── shared-types/         # TypeScript 共享类型定义
│   └── game-core/            # 纯游戏逻辑引擎
├── scripts/                  # 项目维护脚本
├── legacy/                   # 原版源码归档，仅参考，不参与构建
└── package.json              # npm workspaces 根配置
```

## 许可证

[MPL-2.0](LICENSE)（沿用原版 Evolve 许可证）
