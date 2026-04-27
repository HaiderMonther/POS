<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Receipt, 
  Users, 
  LogOut,
  Menu,
  X
} from 'lucide-vue-next';

const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();
const isSidebarOpen = ref(true);

import { computed } from 'vue';

const navItems = computed(() => {
  const items = [
    { name: 'لوحة التحكم', path: '/', icon: LayoutDashboard },
    { name: 'نقطة البيع', path: '/pos', icon: ShoppingCart },
    { name: 'المخزن', path: '/inventory', icon: Package },
  ];

  if (authStore.user?.role === 'ADMIN') {
    items.push(
      { name: 'الديون', path: '/debts', icon: Users },
      { name: 'المستخدمين', path: '/users', icon: Users },
      { name: 'التقارير', path: '/reports', icon: Receipt }
    );
  }

  return items;
});

const handleLogout = () => {
  authStore.logout();
  router.push('/login');
};

const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value;
};

// PWA Install Logic
const deferredPrompt = ref<any>(null);
const showInstallButton = ref(false);

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt.value = e;
  showInstallButton.value = true;
});

const installApp = async () => {
  if (!deferredPrompt.value) return;
  deferredPrompt.value.prompt();
  const { outcome } = await deferredPrompt.value.userChoice;
  if (outcome === 'accepted') {
    showInstallButton.value = false;
  }
  deferredPrompt.value = null;
};
</script>

<template>
  <div class="flex h-screen bg-slate-900 text-white font-sans overflow-hidden">
    <!-- Sidebar -->
    <aside 
      class="sidebar no-print fixed inset-y-0 right-0 z-50 w-64 bg-slate-800 border-l border-slate-700 transition-transform duration-300 transform md:relative md:translate-x-0"
      :class="{ 'translate-x-full': !isSidebarOpen }"
    >
      <div class="flex flex-col h-full">
        <div class="p-6 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center font-bold text-white">POS</div>
            <span class="text-xl font-bold tracking-tight">نظام المبيعات</span>
          </div>
          <button @click="toggleSidebar" class="md:hidden text-slate-400 hover:text-white">
            <X :size="24" />
          </button>
        </div>

        <nav class="flex-1 px-4 space-y-2 py-4">
          <router-link 
            v-for="item in navItems" 
            :key="item.path" 
            :to="item.path"
            class="nav-link flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group"
            :class="route.path === item.path ? 'bg-teal-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'"
          >
            <component :is="item.icon" :size="20" :class="route.path === item.path ? 'text-white' : 'group-hover:text-teal-400'" />
            <span class="font-medium">{{ item.name }}</span>
          </router-link>
        </nav>

        <div class="p-4 border-t border-slate-700">
          <div class="flex items-center justify-between px-4 py-3 bg-slate-900/50 rounded-xl mb-4">
            <div class="flex flex-col">
              <span class="text-sm font-semibold truncate">{{ authStore.user?.username }}</span>
              <span class="text-xs text-slate-500">{{ authStore.user?.role === 'ADMIN' ? 'مدير' : 'كاشير' }}</span>
            </div>
            <button @click="handleLogout" class="text-slate-400 hover:text-red-400 transition-colors">
              <LogOut :size="20" />
            </button>
          </div>

          <!-- PWA Install Button -->
          <button 
            v-if="showInstallButton" 
            @click="installApp"
            class="w-full flex items-center justify-center gap-2 bg-teal-600/20 hover:bg-teal-600 text-teal-400 hover:text-white py-3 rounded-xl font-bold transition-all border border-teal-500/30 mb-2"
          >
            <LayoutDashboard :size="18" />
            <span>تثبيت التطبيق</span>
          </button>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 flex flex-col min-w-0 overflow-hidden relative">
      <!-- Header -->
      <header class="h-16 no-print bg-slate-800/50 backdrop-blur-md border-b border-slate-700 flex items-center justify-between px-6 z-40">
        <button @click="toggleSidebar" class="text-slate-400 hover:text-white md:hidden">
          <Menu :size="24" />
        </button>
        <div class="text-lg font-semibold text-slate-100 mr-auto">
          {{ navItems.find(i => i.path === route.path)?.name || 'النظام' }}
        </div>
      </header>

      <!-- Page Content -->
      <div class="flex-1 overflow-y-auto p-6 scroll-smooth">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" :key="route.fullPath" />
          </transition>
        </router-view>
      </div>
    </main>
    
    <!-- Mobile Overlay -->
    <div 
      v-if="isSidebarOpen" 
      @click="toggleSidebar" 
      class="fixed no-print inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden transition-opacity"
    ></div>
  </div>
</template>

<style scoped>
.sidebar {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.nav-link {
  position: relative;
  overflow: hidden;
}

/* Subtle Glass effect for active link */
.nav-link.bg-teal-600 {
  box-shadow: 0 4px 12px -2px rgba(13, 148, 136, 0.4);
}
</style>
