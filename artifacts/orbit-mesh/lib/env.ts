/**
 * ORBIT-MESH Global Environment Configuration
 * * Vercel Canlı Sunucu Bağlantısı (V2)
 * Hassas API anahtarları (NASA & OpenRouter) Vercel Environment Variables 
 * üzerinde gizlenmiştir. Mobil uygulama tüm istekleri bu güvenli tünelden yapar.
 */

// Çalışan gerçek Vercel backend proxy adresin:
export const BACKEND_URL = "https://orbit-eta-orpin.vercel.app";

/**
 * Geriye Dönük Uyum Koruması (Fallback)
 * Uygulamanın diğer dosyalarında eski değişken isimleri (NASA_API_KEY vb.) kalmışsa,
 * projenin derlenirken hata verip çökmesini önlemek için boş string olarak bırakılmıştır.
 */
export const NASA_API_KEY = "";
export const OPENROUTER_API_KEY = "";