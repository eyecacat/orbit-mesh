const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
// SADECE projenin kendi dizinini ve varsa içindeki node_modules'u izle
// Workspace kök dizinini izlemekten vazgeçtik (ENOSPC hatasını önlemek için)
const config = getDefaultConfig(projectRoot);

// Sadece proje içi klasörleri izle, üst dizinleri sınırla
config.watchFolders = [projectRoot];

// Modül çözünürlüğünde hiyerarşik aramayı kapat (üst klasörlere çıkmasın)
config.resolver.disableHierarchicalLookup = true;

// Paketlerin sadece projenin kendi node_modules klasöründen okunmasını zorla
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
];

module.exports = config;