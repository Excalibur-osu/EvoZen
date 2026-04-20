# EvoZen

基于开源增量进化游戏 [Evolve](https://github.com/pmotschmann/Evolve) 进行重构与复刻的项目。

原版 Evolve 是一款优秀的单机网页增量游戏，玩家从原始汤中的原生质出发，经历 RNA → DNA → 物种选择 → 原始部落 → 科技发展 → 太空探索的完整进化链。EvoZen 当前优先目标是使用现代前端技术栈完成单机内容的逐步复刻与对齐；多人在线与云端能力仅作为后续长期方向，当前不在主要开发范围内。

## 与原版的区别

| | Evolve（原版） | EvoZen |
|------|------|------|
| 技术栈 | 原生 JS + jQuery | Vue 3 + TypeScript + Vite |
| 架构 | 单文件 + 全局变量 | Monorepo + Pinia 状态管理 |
| 游戏逻辑 | 与 UI 耦合 | 纯函数引擎，零 UI 依赖 |
| 语言 | 英文为主 | 中文优先 |
| 联机 | 无 | 远期方向 |
| 存档 | 仅本地 | 当前本地，云端同步为远期方向 |

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 开发检查
npm run lint
npm run typecheck
```

## 项目结构

```text
EvoZen/
├── apps/
│   └── web/                  # Vue 3 + Vite 前端
├── packages/
│   ├── shared-types/         # TypeScript 共享类型定义
│   └── game-core/            # 纯游戏逻辑引擎（零 UI 依赖）
├── scripts/                  # 项目维护脚本
├── legacy/                   # 原版源码归档（仅参考，不参与构建）
└── package.json              # npm workspaces 根配置
```

## 许可证

[MPL-2.0](LICENSE)（沿用原版 Evolve 许可证）
