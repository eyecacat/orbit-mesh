// artifacts/orbit-mesh/src/services/apiClient.ts
import axios from 'axios';

// API Anahtarlarını doğrudan koda yazmak yerine process.env üzerinden güvenli bir şekilde çekiyoruz.
// Expo'da bu değişkenlerin okunabilmesi için başlarında "EXPO_PUBLIC_" eki bulunmalıdır.
const OPENROUTER_API_KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;
const NASA_API_KEY = process.env.EXPO_PUBLIC_NASA_API_KEY;

const apiClient = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
});

// İstek Interceptor'ı: İstek çıkmadan hemen önce çalışır ve kimlik bilgilerini dinamik olarak ekler.
apiClient.interceptors.request.use((config) => {
  // 1. İstek OpenRouter API'sine gidiyorsa Bearer Token ekle
  if (config.url?.includes('openrouter.ai')) {
    if (OPENROUTER_API_KEY) {
      config.headers.Authorization = `Bearer ${OPENROUTER_API_KEY}`;
    } else {
      console.warn("apiClient Uyarı: EXPO_PUBLIC_OPENROUTER_API_KEY bulunamadı!");
    }
  } 

  // 2. İstek NASA API'sine gidiyorsa api_key parametresini ekle
  else if (config.url?.includes('api.nasa.gov')) {
    if (NASA_API_KEY) {
      config.params = {
        ...config.params,
        api_key: NASA_API_KEY
      };
    } else {
      console.warn("apiClient Uyarı: EXPO_PUBLIC_NASA_API_KEY bulunamadı!");
    }
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

export default apiClient;