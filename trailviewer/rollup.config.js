import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import css from 'rollup-plugin-import-css';

export default [
    {
        input: './src/trailviewer-base.ts',
        external: ['events', 'url-join'],
        output: {
            file: './dist/trailviewer-base.mjs',
            format: 'es',
            sourcemap: true,
        },
        plugins: [
            resolve({ preferBuiltins: false }),
            commonjs(),
            typescript({ sourceMap: true }),
            terser(),
            css({ minify: true, output: 'trailviewer-base.css' }),
        ],
    },
    {
        input: './src/trailviewer.ts',
        external: ['mapbox-gl', 'events', 'url-join'],
        output: {
            file: './dist/trailviewer.mjs',
            format: 'es',
            sourcemap: true,
        },
        plugins: [
            resolve({ preferBuiltins: false }),
            commonjs(),
            typescript({ sourceMap: true }),
            terser(),
            css({ minify: true, output: 'trailviewer.css' }),
        ],
    },
    {
        input: './src/trailviewer-base.ts',
        output: {
            name: 'trailviewer',
            file: './dist/trailviewer-base.umd.js',
            format: 'umd',
            sourcemap: true,
        },
        plugins: [
            resolve({ preferBuiltins: false }),
            commonjs(),
            typescript({ sourceMap: true }),
            terser(),
            // I am aware that the css is built twice, but working
            // around that would be more complicated than it's worth
            css({ minify: true, output: 'trailviewer-base.css' }),
        ],
    },
    {
        input: './src/trailviewer.ts',
        output: {
            name: 'trailviewer',
            file: './dist/trailviewer.umd.js',
            format: 'umd',
            sourcemap: true,
        },
        plugins: [
            resolve({ preferBuiltins: false }),
            commonjs(),
            typescript({ sourceMap: true }),
            terser(),
            // I am aware that the css is built twice, but working
            // around that would be more complicated than it's worth
            css({ minify: true, output: 'trailviewer.css' }),
        ],
    },
];
