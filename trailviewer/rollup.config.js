import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import css from 'rollup-plugin-import-css';

export default {
    input: './src/index.ts',
    output: {
        name: 'TrailViewer',
        dir: './dist',
        format: 'umd',
    },
    plugins: [
        resolve({ preferBuiltins: false }),
        commonjs(),
        typescript(),
        terser(),
        css({ minify: true, output: './dist/styles.css' }),
    ],
};
