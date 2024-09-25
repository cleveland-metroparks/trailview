import globals from 'globals';
import pluginJs from '@eslint/js';
import ts from 'typescript-eslint';

export default [
    { files: ['**/*.{js,mjs,cjs,ts}'] },
    { languageOptions: { globals: globals.browser } },
    pluginJs.configs.recommended,
    ...ts.configs.recommended,
    {
        ignores: ['dist/'],
    },
];
