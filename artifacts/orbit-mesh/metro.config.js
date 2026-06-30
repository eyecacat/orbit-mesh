const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..'); // Monorepo kök dizini

const config = getDefaultConfig(projectRoot);

// 1. Metro'nun tüm monorepo dosyalarını izlemesini sağla
config.watchFolders = [workspaceRoot];

// 2. Paketlerin çözümleneceği node_modules öncelik sırasını belirle
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;