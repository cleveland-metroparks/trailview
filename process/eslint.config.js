import globals from 'globals';
import pluginJs from '@eslint/js';
import ts from 'typescript-eslint';

/** @type {import('eslint').Linter.Config[]} */
export default [
    { files: ['**/*.{js,mjs,cjs,ts}'] },
    { languageOptions: { globals: globals.node } },
    pluginJs.configs.recommended,
    ...ts.configs.recommended,
    {
        ignores: ['scripts/', 'build/'],
    },
];
