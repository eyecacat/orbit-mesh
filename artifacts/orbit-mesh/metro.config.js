const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..'); // Monorepo kök dizini

const config = getDefaultConfig(projectRoot);

// Monorepo watchFolders — Expo'nun varsayılanlarını KORUYARAK genişlet
// (= yerine [...spread] ile birleştir, yoksa Expo'nun kendi entry'leri
// silinir ve "watchFolders does not contain all entries" hatası oluşur)
config.watchFolders = [...(config.watchFolders ?? []), workspaceRoot];

// Paketlerin çözümleneceği node_modules öncelik sırası
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
