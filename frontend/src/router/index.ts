import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import Layout from '../components/Layout.vue';
import Dashboard from '../views/Dashboard.vue';
import POS from '../views/POS.vue';
import Inventory from '../views/Inventory.vue';
import Debts from '../views/Debts.vue';
import Reports from '../views/Reports.vue';
import Users from '../views/Users.vue';
import Login from '../views/Login.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: Login,
      meta: { guest: true }
    },
    {
      path: '/',
      component: Layout,
      children: [
        { path: '', name: 'Dashboard', component: Dashboard },
        { path: 'pos', name: 'POS', component: POS },
        { path: 'inventory', name: 'Inventory', component: Inventory },
        { path: 'debts', name: 'Debts', component: Debts },
        { path: 'reports', name: 'Reports', component: Reports },
        { path: 'users', name: 'Users', component: Users }
      ],
      meta: { requiresAuth: true }
    }
  ]
});

router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore();
  
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login');
  } else if (to.meta.guest && authStore.isAuthenticated) {
    next('/');
  } else {
    next();
  }
});

export default router;
