import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

export default {
    input: './src/index.ts',
    output: {
        name: "TrailViewer",
        file: './dist/index.js',
        format: 'es',
    },
    plugins: [resolve(), commonjs(), typescript(), terser()]
};