import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

export default {
    input: 'js/src/trailviewer.ts',
    output: {
        name: "TrailViewer",
        file: 'js/dist/bundle.js',
        format: 'iife',
    },
    plugins: [resolve(), commonjs(), typescript({
        compilerOptions: { "target": "ES2022", "strict": true, "moduleResolution": "nodenext" }
    }), terser()]
};