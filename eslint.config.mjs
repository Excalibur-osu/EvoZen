/**
 * ESLint flat config（ESLint 9+）
 *
 * 只做 lint，不做 format——配合项目已有的 typecheck / build 流程。
 * 策略：
 *   1. 关闭 eslint-plugin-vue 里所有"样式/格式化"规则（因不使用 Prettier / Biome）。
 *   2. 未用参数 / 变量使用 `_` 前缀忽略（TS 生态通用约定）。
 *   3. scripts/ 下的 .mjs 切换到 Node 环境 globals（允许 console / process / URL 等）。
 */

import js from '@eslint/js';
import ts from 'typescript-eslint';
import vue from 'eslint-plugin-vue';
import globals from 'globals';

/** 关闭 eslint-plugin-vue 中与格式化相关的规则。 */
const VUE_FORMATTING_RULES_OFF = {
  'vue/max-attributes-per-line': 'off',
  'vue/singleline-html-element-content-newline': 'off',
  'vue/multiline-html-element-content-newline': 'off',
  'vue/html-indent': 'off',
  'vue/html-closing-bracket-spacing': 'off',
  'vue/html-closing-bracket-newline': 'off',
  'vue/html-self-closing': 'off',
  'vue/attributes-order': 'off',
  'vue/first-attribute-linebreak': 'off',
  'vue/mustache-interpolation-spacing': 'off',
  'vue/no-multi-spaces': 'off',
  'vue/html-quotes': 'off',
};

export default [
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      'legacy/**',
      '**/*.tsbuildinfo',
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  ...vue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: ts.parser,
        extraFileExtensions: ['.vue'],
      },
    },
  },
  {
    // TS / Vue 通用覆盖：未用参数 / 变量以 `_` 前缀标注时放行。
    files: ['**/*.{ts,vue}'],
    rules: {
      ...VUE_FORMATTING_RULES_OFF,
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    // Node 脚本：启用 Node 全局。
    files: ['scripts/**/*.{js,mjs,cjs}'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    // 前端：启用浏览器全局，并声明 Vite 注入的编译期常量。
    files: ['apps/web/**/*.{ts,vue}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        __APP_VERSION__: 'readonly',
      },
    },
  },
];
