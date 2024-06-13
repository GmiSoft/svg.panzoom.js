import fs from 'fs';
import babel from '@rollup/plugin-babel'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import filesize from 'rollup-plugin-filesize'
import terser from '@rollup/plugin-terser'

const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

const buildDate = Date()

const headerLong = `/*!
* ${pkg.name} - ${pkg.description}
* @version ${pkg.version}
* ${pkg.homepage}
*
* @copyright ${pkg.author.name}
* @license ${pkg.license}
*
* BUILT: ${buildDate}
*/;`

const headerShort = `/*! ${pkg.name} v${pkg.version} ${pkg.license}*/;`

const getBabelConfig = (targets, corejs = false) =>
  babel({
    include: 'src/**',
    babelHelpers: 'runtime',
    babelrc: false,
    presets: [
      [
        '@babel/preset-env',
        {
          modules: false,
          targets: targets || pkg.browserslist
          // useBuiltIns: 'usage'
          // corejs: 3
        }
      ]
    ],
    plugins: [
      ['@babel/plugin-proposal-optional-chaining'],
      [
        '@babel/plugin-proposal-nullish-coalescing-operator',
        {
          loose: true
        }
      ],
      [
        '@babel/plugin-transform-runtime',
        {
          corejs: corejs,
          helpers: true,
          useESModules: true
        }
      ]
    ]
  })

// When few of these get mangled nothing works anymore
// We loose literally nothing by let these unmangled
const classes = []

const config = (node, min, esm = false) => ({
  external: ['@svgdotjs/svg.js'],
  input: 'src/svg.panzoom.js',
  output: {
    file: esm
      ? './dist/svg.panzoom.esm.js'
      : node
      ? './dist/svg.panzoom.node.js'
      : min
      ? './dist/svg.panzoom.min.js'
      : './dist/svg.panzoom.js',
    format: esm ? 'esm' : node ? 'cjs' : 'iife',
    sourcemap: true,
    banner: headerLong,
    // remove Object.freeze
    freeze: false,
    globals: {
      '@svgdotjs/svg.js': 'SVG'
    }
  },
  treeshake: {
    // property getter have no sideeffects
    propertyReadSideEffects: false
  },
  plugins: [
    resolve(),
    getBabelConfig(node && 'maintained node versions'),
    commonjs(),
    filesize(),
    !min
      ? {}
      : terser({
          mangle: {
            reserved: classes
          },
          output: {
            preamble: headerShort
          }
        })
  ]
})

// [node, minified]
const modes = [[false], [false, true], [false, false, true]]

export default modes.map(m => config(...m))
