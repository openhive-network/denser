const hiveConfig = require('@hive/eslint-config-custom');

module.exports = [
  // Ignore patterns
  {
    ignores: [
      '.next/**',
      'dist/**',
      'build/**',
      'node_modules/**',
      'public/**',
      'playwright/**'
    ]
  },

  // Apply shared Hive config
  ...hiveConfig
];
