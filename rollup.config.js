import buble from 'rollup-plugin-buble';
import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';

export default {
    input: 'src/index.js',
    plugins: [
        nodeResolve(),
        commonjs(),
        buble(),
    ],
    output: {
        format: 'cjs',
        file: 'dist/index.js',
        name: 'AjaxModuleLoader',
        exports: 'named',
    },
};
