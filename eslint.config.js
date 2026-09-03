// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
    rules: {
      // En React Native, les apostrophes françaises dans <Text> sont sûres et
      // omniprésentes. Garder l'interdiction sur les caractères qui peuvent
      // réellement fermer/ambiguïser une expression JSX, sans 84 faux positifs.
      'react/no-unescaped-entities': ['error', { forbid: ['>', '}'] }],
    },
  },
]);
