import copy from 'rollup-plugin-copy';
import babel from '@rollup/plugin-babel';

let copyVim = copy({
  targets: [
    { 
      src: require.resolve("cm5-vim/vim.js").replace(/\\/g,  "/"), 
      dest: "./keymap" 
    }
  ]
});

export default [
  {
    input: "src/codemirror.js",
    output: {
      banner: `// CodeMirror5 by Marijn Haverbeke and others × Nester - copyright (c) by Adrian Hoefflin
// Distributed under an MIT license: https://github.com/srccircumflex/codemirror5-nester/blob/master/LICENSE

// This is CodeMirror5 (https://codemirror.net/5), a code editor
// implemented in JavaScript on top of the browser's DOM.
// With the Nester extension (https://github.com/srccircumflex/codemirror5).
`,
      format: "umd",
      file: "lib/codemirror.js",
      name: "CodeMirror"
    },
    plugins: [ 
      babel({
        babelHelpers: 'bundled',
        presets: [
          ['@babel/preset-env', { targets: "defaults" }]
        ],
        plugins: [
          '@babel/plugin-proposal-optional-chaining',
          '@babel/plugin-proposal-logical-assignment-operators',
          '@babel/plugin-transform-class-properties',
          '@babel/plugin-proposal-class-properties',
        ]
      }),
      copyVim 
    ]
  },
];