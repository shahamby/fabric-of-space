// The receipt for a whole bug family: an identifier used but never declared.
// Taxonomy #1 (duplicate declarations), #6 (wrong scope), and the M12j
// anchor loss all show up here as no-undef, statically, in under a second.
// Style is NOT policed — this lab checks one thing and checks it hard.
import globals from 'globals';

export default [
  {
    files: ['**/*.js', '**/*.mjs'],
    ignores: ['dist/**', 'node_modules/**', 'lab/out/**'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    rules: { 'no-undef': 'error', 'no-unused-vars': 'off' },
  },
];