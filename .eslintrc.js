module.exports = {
  'env': {
      'browser': true,
      'es2022': true
  },
  'extends': [
      'eslint:recommended',
      'plugin:@typescript-eslint/recommended'
  ],
  'overrides': [
  ],
  'parser': '@typescript-eslint/parser',
  'parserOptions': {
      'ecmaVersion': 'latest',
      'sourceType': 'module'
  },
  'plugins': [
      '@typescript-eslint'
  ],
  'rules': {
      'indent': [
          'error',
          'tab'
      ],
      'linebreak-style': [
          'error',
          'unix'
      ],
      'quotes': [
          'error',
          'single'
      ],
      'semi': [
          'error',
          'always'
      ],
      "max-len": [
          "error",
          {
              "code": 127
          }
      ],
      "no-extend-native": 0,
      "@typescript-eslint/no-explicit-any": 0,
      "new-cap": 0,
      "require-jsdoc" : 0,
  }
};
