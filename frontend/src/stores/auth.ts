import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<any>(JSON.parse(localStorage.getItem('user') || 'null'));
  const token = ref<string | null>(localStorage.getItem('token'));

  const isAuthenticated = computed(() => !!token.value);
  const isAdmin = computed(() => user.value?.role === 'ADMIN');

  function setAuth(u: any, t: string) {
    user.value = u;
    token.value = t;
    localStorage.setItem('user', JSON.stringify(u));
    localStorage.setItem('token', t);
  }

  function logout() {
    user.value = null;
    token.value = null;
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  }

  return {
    user,
    token,
    isAuthenticated,
    isAdmin,
    setAuth,
    logout,
  };
});
