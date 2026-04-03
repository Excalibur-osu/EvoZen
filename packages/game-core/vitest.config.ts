import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // 纯 Node 环境，无 DOM，适合纯逻辑库
    environment: 'node',
    // 测试文件匹配模式
    include: ['src/**/*.test.ts'],
    // 覆盖率（可选）
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/index.ts'],
    },
  },
});
