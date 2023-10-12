module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: 'airbnb-base',
  overrides: [],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'no-param-reassign': ['error', { props: false }],
    'consistent-return': 'off',
    'no-use-before-define': 'warn',
    'no-continue': 'off',
    'no-plusplus': 'off',
    'no-unused-vars': 'warn',
    'import/extensions': 'off',
    'import/prefer-default-export': 'off',
  },
};
