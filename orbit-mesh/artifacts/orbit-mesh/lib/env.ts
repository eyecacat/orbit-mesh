/**
 * ORBIT-MESH Global Environment Configuration
 *
 * Lokal geliştirme sırasında aynı Replit domain'i üzerinde çalışan API server
 * kullanılır; üretimde Vercel domain'e düşer. Bu sayede ön-yüz (web preview) ve
 * backend aynı origin'de kalır ve CORS sorunu oluşmaz.
 */

export const BACKEND_URL = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "https://orbit-mesh.vercel.app";

/**
 * Geriye Dönük Uyum Koruması (Fallback)
 * Uygulamanın diğer dosyalarında eski değişken isimleri (NASA_API_KEY vb.) kalmışsa,
 * projenin derlenirken hata verip çökmesini önlemek için boş string olarak bırakılmıştır.
 */
export const NASA_API_KEY = "";
export const OPENROUTER_API_KEY = "";