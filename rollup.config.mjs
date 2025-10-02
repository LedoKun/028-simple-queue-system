import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import babel from '@rollup/plugin-babel';

const extensions = ['.js'];

const legacyTargets = {
  ie: '11',
  chrome: '38',
  safari: '9',
};

const basePlugins = [
  nodeResolve({ extensions }),
  commonjs(),
  babel({
    babelHelpers: 'bundled',
    extensions,
    include: ['public/js/**'],
    presets: [
      [
        '@babel/preset-env',
        {
          targets: legacyTargets,
          modules: false,
          bugfixes: true,
          loose: true,
        },
      ],
    ],
  }),
];

const createConfig = (input, file, name, extraPlugins = []) => ({
  input,
  output: {
    file,
    format: 'iife',
    sourcemap: true,
    name,
  },
  plugins: [...basePlugins, ...extraPlugins],
});

export default [
  createConfig('public/js/polyfills/index.js', 'public/dist/polyfills.legacy.js', 'QueuePolyfills'),
  createConfig('public/js/pages/operator/index.js', 'public/dist/operator.legacy.js', 'QueueOperatorApp'),
  createConfig('public/js/pages/signage/index.js', 'public/dist/signage.legacy.js', 'QueueSignageApp'),
];
