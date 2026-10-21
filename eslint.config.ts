import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
    globalIgnores(['**/dist/**', '**/dist-ssr/**', '**/coverage/**', '**/node_modules/**']),

    {
        name: 'backend',
        files: ['backend/**/*.{ts,mts}'],
        extends: [js.configs.recommended, tseslint.configs.recommended, eslintConfigPrettier],
        languageOptions: {
            ecmaVersion: 2022,
            globals: globals.node,
        },
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
        },
    },
]);
