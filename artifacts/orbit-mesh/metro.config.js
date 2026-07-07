const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// ── pnpm UYUMLULUK AYARLARI ──────────────────────────────────────────────────
// pnpm sembolik bağlarını ve alt klasörleri Metro'nun görebilmesi için:
config.resolver.disableHierarchicalLookup = false;

// Eğer projenizde SVG veya ek bir transformer ayarı YOKSA dosyanız sadece bu kadar olmalıdır.
// Eğer özel bir asset transformer (örn: react-native-svg-transformer) kullanıyorsanız, 
// config.transformer ve config.resolver.assetExts ayarlarını bunun altına ekleyebilirsiniz.

module.exports = config;