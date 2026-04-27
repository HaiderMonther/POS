<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import api from '../api';
import { Lock, User, LogIn, AlertCircle } from 'lucide-vue-next';

const authStore = useAuthStore();
const router = useRouter();
const username = ref('');
const password = ref('');
const error = ref('');
const isLoading = ref(false);

const handleLogin = async () => {
  error.value = '';
  isLoading.value = true;
  try {
    const res = await api.post('/auth/login', {
      username: username.value,
      password: password.value,
    });
    authStore.setAuth(res.data.user, res.data.access_token);
    router.push('/');
  } catch (err: any) {
    error.value = err.response?.data?.message || 'اسم المستخدم أو كلمة المرور غير صحيحة';
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-slate-950 p-6 relative overflow-hidden">
    <!-- Abstract Background Effects -->
    <div class="absolute -top-24 -left-24 w-96 h-96 bg-teal-500/10 blur-[120px] rounded-full"></div>
    <div class="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-500/10 blur-[120px] rounded-full"></div>

    <div class="glass-card w-full max-w-md bg-slate-900/60 border-slate-800 shadow-2xl relative z-10 animate-in">
      <div class="flex flex-col items-center mb-8">
        <div class="w-16 h-16 bg-gradient-to-br from-teal-400 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/20 mb-4 scale-110">
          <Lock class="text-white" :size="32" />
        </div>
        <h1 class="text-3xl font-black text-white tracking-tight">تسجيل الدخول</h1>
        <p class="text-slate-500 text-sm mt-2">مرحباً بك في نظام إدارة المبيعات</p>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-6">
        <div class="space-y-4">
          <div class="relative group">
            <User class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-teal-400 transition-colors" :size="20" />
            <input 
              v-model="username"
              type="text" 
              placeholder="اسم المستخدم"
              required
              class="input-field pr-12 h-14 text-lg bg-slate-800/50 border-slate-700 focus:border-teal-500 focus:bg-slate-800/80 transition-all font-medium"
            />
          </div>
          <div class="relative group">
            <Lock class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-teal-400 transition-colors" :size="20" />
            <input 
              v-model="password"
              type="password" 
              placeholder="كلمة المرور"
              required
              class="input-field pr-12 h-14 text-lg bg-slate-800/50 border-slate-700 focus:border-teal-500 focus:bg-slate-800/80 transition-all font-medium"
            />
          </div>
        </div>

        <div v-if="error" class="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3 text-red-400 text-sm font-bold animate-in">
          <AlertCircle :size="18" />
          {{ error }}
        </div>

        <button 
          type="submit" 
          :disabled="isLoading"
          class="w-full h-14 bg-teal-600 hover:bg-teal-500 text-white font-bold text-lg rounded-2xl shadow-xl shadow-teal-900/40 transform active:scale-95 transition-all flex items-center justify-center gap-3"
        >
          <span v-if="isLoading">جاري التحقق...</span>
          <template v-else>
            <span>دخول للنظام</span>
            <LogIn :size="20" />
          </template>
        </button>
      </form>

      <div class="mt-8 text-center">
        <p class="text-xs text-slate-600">جميع الحقوق محفوظة &copy; {{ new Date().getFullYear() }}</p>
      </div>
    </div>
  </div>
</template>
