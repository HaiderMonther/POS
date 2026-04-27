import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { clerkPlugin } from '@clerk/vue';
import App from './App.vue';
import router from './router';
import 'vue3-toastify/dist/index.css';
import './style.css';

import Vue3Toastify, { type ToastContainerOptions } from 'vue3-toastify';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.use(Vue3Toastify, {
  autoClose: 3000,
  position: 'top-left',
  theme: 'dark',
  rtl: true,
  transition: 'bounce',
} as ToastContainerOptions);

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
console.log('Clerk Publishable Key:', PUBLISHABLE_KEY);

if (!PUBLISHABLE_KEY) {
  console.warn('Clerk Publishable Key is missing! Check your .env file.');
}

app.use(clerkPlugin, {
  publishableKey: PUBLISHABLE_KEY
});

app.mount('#app');
