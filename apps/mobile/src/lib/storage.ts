import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  ACCESS_TOKEN:  'nexus:access_token',
  REFRESH_TOKEN: 'nexus:refresh_token',
  USER:          'nexus:user',
  API_URL:       'nexus:api_url',
};

export const storage = {
  async getToken() {
    return AsyncStorage.getItem(KEYS.ACCESS_TOKEN);
  },
  async setTokens(access: string, refresh: string) {
    await AsyncStorage.multiSet([
      [KEYS.ACCESS_TOKEN, access],
      [KEYS.REFRESH_TOKEN, refresh],
    ]);
  },
  async getUser() {
    const raw = await AsyncStorage.getItem(KEYS.USER);
    return raw ? JSON.parse(raw) : null;
  },
  async setUser(user: any) {
    await AsyncStorage.setItem(KEYS.USER, JSON.stringify(user));
  },
  async clear() {
    await AsyncStorage.multiRemove(Object.values(KEYS));
  },
  async getApiUrl() {
    return (await AsyncStorage.getItem(KEYS.API_URL)) ?? 'http://192.168.1.100:4000/api/v1';
  },
  async setApiUrl(url: string) {
    await AsyncStorage.setItem(KEYS.API_URL, url);
  },
};
