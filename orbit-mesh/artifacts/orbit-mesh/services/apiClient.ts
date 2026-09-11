// ORBIT-MESH Merkezi API İstemcisi
const BASE_URL = 'http://localhost:3000/api';

class ApiClient {
  async get(endpoint: string) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`);
      if (!response.ok) throw new Error('Ağ yanıtı sorunlu');
      return await response.json();
    } catch (error) {
      console.warn(`[API GET Hatası] ${endpoint}:`, error);
      return null;
    }
  }

  async post(endpoint: string, data: any) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Veri gönderilemedi');
      return await response.json();
    } catch (error) {
      console.warn(`[API POST Hatası] ${endpoint}:`, error);
      return null;
    }
  }
}

const apiClient = new ApiClient();
export default apiClient;