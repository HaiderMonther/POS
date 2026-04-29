<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { 
  UserPlus, 
  Shield, 
  Trash2, 
  Search, 
  CheckCircle2,
  UserCircle
} from 'lucide-vue-next';
import { toast } from 'vue3-toastify';
import api from '../api';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  role: 'ADMIN' | 'CASHIER' | 'MANAGER';
  active: boolean;
  lastActive: string;
}

const users = ref<User[]>([]);
const isLoading = ref(true);
const searchQuery = ref('');
const isModalOpen = ref(false);

const newUser = ref({
  firstName: '',
  lastName: '',
  username: '',
  password: '',
  role: 'CASHIER' as const
});

const fetchUsers = async () => {
  isLoading.value = true;
  try {
    // In a real implementation, this would call your backend which uses Clerk Backend SDK
    const response = await api.get('/users');
    users.value = response.data;
  } catch (error) {
    console.error('Failed to fetch users:', error);
    toast.error('فشل في تحميل قائمة المستخدمين');
    // Mock data for demonstration
    users.value = [
      { id: '1', firstName: 'أحمد', lastName: 'محمد', username: 'ahmed_1', email: 'ahmed@example.com', role: 'ADMIN', active: true, lastActive: 'منذ ساعتين' },
      { id: '2', firstName: 'سارة', lastName: 'علي', username: 'sara_cash', email: 'sara@example.com', role: 'CASHIER', active: true, lastActive: 'الآن' },
      { id: '3', firstName: 'محمود', lastName: 'حسن', username: 'm_hassan', email: 'm@example.com', role: 'CASHIER', active: false, lastActive: 'منذ يومين' },
    ];
  } finally {
    isLoading.value = false;
  }
};

const translateError = (message: string) => {
  const msg = message.toLowerCase();
  if (msg.includes('found in an online data breach')) {
    return 'كلمة المرور هذه ضعيفة وتم العثور عليها في تسريبات سابقة. يرجى استخدام كلمة مرور أكثر تعقيداً.';
  }
  if (msg.includes('must be 8 characters or more')) {
    return 'يجب أن تكون كلمة المرور 8 أحرف أو أكثر.';
  }
  if (msg.includes('must be between 4 and 64 characters long')) {
    return 'يجب أن يكون اسم المستخدم بين 4 و 64 حرفاً.';
  }
  if (msg.includes('already exists')) {
    return 'اسم المستخدم هذا مستخدم بالفعل، يرجى اختيار اسم آخر.';
  }
  if (msg.includes('missing data')) {
    return 'يرجى ملء جميع البيانات المطلوبة.';
  }
  return message;
};

const addUser = async () => {
  // Client-side validation
  if (!newUser.value.firstName || !newUser.value.lastName || !newUser.value.username || !newUser.value.password) {
    toast.error('يرجى ملء جميع الحقول المطلوبة');
    return;
  }
  
  if (newUser.value.username.length < 4) {
    toast.error('يجب أن يكون اسم المستخدم 4 أحرف على الأقل');
    return;
  }
  if (newUser.value.password.length < 8) {
    toast.error('يجب أن تكون كلمة المرور 8 أحرف على الأقل');
    return;
  }

  try {
    await api.post('/users', newUser.value);
    toast.success('تم إضافة المستخدم بنجاح');
    isModalOpen.value = false;
    fetchUsers();
    newUser.value = { firstName: '', lastName: '', username: '', password: '', role: 'CASHIER' };
  } catch (error: any) {
    const rawMessage = error.response?.data?.message || 'فشل في إضافة المستخدم';
    toast.error(translateError(rawMessage));
  }
};

const toggleRole = async (user: User) => {
  const newRole = user.role === 'ADMIN' ? 'CASHIER' : 'ADMIN';
  try {
    await api.patch(`/users/${user.id}/role`, { role: newRole });
    user.role = newRole;
    toast.success(`تم تغيير صلاحية ${user.firstName} إلى ${newRole === 'ADMIN' ? 'مدير' : 'كاشير'}`);
  } catch (error) {
    toast.error('فشل في تغيير الصلاحيات');
  }
};

const deleteUser = async (id: string) => {
  if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;
  try {
    await api.delete(`/users/${id}`);
    users.value = users.value.filter(u => u.id !== id);
    toast.success('تم حذف المستخدم');
  } catch (error) {
    toast.error('فشل في حذف المستخدم');
  }
};

onMounted(fetchUsers);

const getRoleBadgeClass = (role: string) => {
  switch (role) {
    case 'ADMIN': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    case 'MANAGER': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    default: return 'bg-teal-500/20 text-teal-400 border-teal-500/30';
  }
};

const getRoleName = (role: string) => {
  switch (role) {
    case 'ADMIN': return 'مدير النظام';
    case 'MANAGER': return 'مشرف';
    default: return 'كاشير';
  }
};
</script>

<template>
  <div class="space-y-6 animate-in fade-in duration-500">
    <!-- Header Actions -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold text-white tracking-tight text-right">إدارة المستخدمين</h1>
        <p class="text-slate-400 mt-1 text-right">إدارة طاقم العمل والصلاحيات والوصول للنظام</p>
      </div>
      
      <button 
        @click="isModalOpen = true"
        class="flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 text-white px-6 py-3 rounded-xl font-bold transition-all duration-200 shadow-lg shadow-teal-600/20 group"
      >
        <UserPlus :size="20" class="group-hover:scale-110 transition-transform" />
        إضافة مستخدم جديد
      </button>
    </div>

    <!-- Stats Summary -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="glass-card p-6 flex items-center gap-4 border border-white/5 rounded-2xl bg-white/5 backdrop-blur-xl">
        <div class="w-12 h-12 rounded-xl bg-teal-500/20 flex items-center justify-center text-teal-400">
          <UserCircle :size="24" />
        </div>
        <div class="text-right">
          <p class="text-slate-400 text-sm">إجمالي المستخدمين</p>
          <p class="text-2xl font-bold text-white">{{ users.length }}</p>
        </div>
      </div>
      
      <div class="glass-card p-6 flex items-center gap-4 border border-white/5 rounded-2xl bg-white/5 backdrop-blur-xl">
        <div class="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
          <Shield :size="24" />
        </div>
        <div class="text-right">
          <p class="text-slate-400 text-sm">مديرين</p>
          <p class="text-2xl font-bold text-white">{{ users.filter(u => u.role === 'ADMIN').length }}</p>
        </div>
      </div>

      <div class="glass-card p-6 flex items-center gap-4 border border-white/5 rounded-2xl bg-white/5 backdrop-blur-xl">
        <div class="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center text-green-400">
          <CheckCircle2 :size="24" />
        </div>
        <div class="text-right">
          <p class="text-slate-400 text-sm">متصلون الآن</p>
          <p class="text-2xl font-bold text-white">{{ users.filter(u => u.active).length }}</p>
        </div>
      </div>
    </div>

    <!-- Users Table -->
    <div class="glass-card overflow-hidden border border-white/5 rounded-2xl bg-white/5 backdrop-blur-xl">
      <div class="p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="relative flex-1 max-w-md">
          <Search class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" :size="18" />
          <input 
            v-model="searchQuery"
            type="text" 
            placeholder="بحث عن مستخدم..."
            class="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-2 pr-10 pl-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all text-right"
          />
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-right border-collapse">
          <thead>
            <tr class="bg-white/5 text-slate-400 text-sm uppercase tracking-wider">
              <th class="px-6 py-4 font-semibold">المستخدم</th>
              <th class="px-6 py-4 font-semibold">اسم المستخدم</th>
              <th class="px-6 py-4 font-semibold">الصلاحية</th>
              <th class="px-6 py-4 font-semibold">الحالة</th>
              <th class="px-6 py-4 font-semibold text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5">
            <tr v-for="user in users" :key="user.id" class="hover:bg-white/5 transition-colors group">
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold">
                    {{ user.firstName[0] }}{{ user.lastName[0] }}
                  </div>
                  <div>
                    <div class="font-medium text-white">{{ user.firstName }} {{ user.lastName }}</div>
                    <div class="text-xs text-slate-500">{{ user.email }}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 text-slate-300">
                @{{ user.username }}
              </td>
              <td class="px-6 py-4">
                <span 
                  class="px-3 py-1 rounded-full text-xs font-bold border"
                  :class="getRoleBadgeClass(user.role)"
                >
                  {{ getRoleName(user.role) }}
                </span>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-2">
                  <div class="w-2 h-2 rounded-full" :class="user.active ? 'bg-green-500' : 'bg-slate-500'"></div>
                  <span class="text-sm" :class="user.active ? 'text-green-400' : 'text-slate-500'">
                    {{ user.active ? 'نشط' : 'غير متصل' }}
                  </span>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center justify-center gap-2">
                  <button 
                    @click="toggleRole(user)"
                    class="p-2 text-slate-400 hover:text-teal-400 hover:bg-teal-400/10 rounded-lg transition-all"
                    title="تغيير الصلاحية"
                  >
                    <Shield :size="18" />
                  </button>
                  <button 
                    @click="deleteUser(user.id)"
                    class="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                    title="حذف"
                  >
                    <Trash2 :size="18" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Add User Modal -->
    <div v-if="isModalOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" @click="isModalOpen = false"></div>
      <div class="relative bg-slate-900 border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in duration-300">
        <div class="p-6 border-b border-white/5 text-right">
          <h2 class="text-xl font-bold text-white flex items-center justify-end gap-2">
            إضافة مستخدم جديد
            <UserPlus class="text-teal-400" />
          </h2>
        </div>
        
        <form @submit.prevent="addUser" class="p-6 space-y-4 text-right">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm text-slate-400 mb-1">اسم العائلة</label>
              <input v-model="newUser.lastName" required type="text" class="form-input" placeholder="مثلاً: علي" />
            </div>
            <div>
              <label class="block text-sm text-slate-400 mb-1">الاسم الأول</label>
              <input v-model="newUser.firstName" required type="text" class="form-input" placeholder="مثلاً: أحمد" />
            </div>
          </div>
          
          <div>
            <label class="block text-sm text-slate-400 mb-1">اسم المستخدم</label>
            <input v-model="newUser.username" required type="text" class="form-input" placeholder="ahmed_123" />
          </div>

          <div>
            <label class="block text-sm text-slate-400 mb-1">كلمة المرور</label>
            <input v-model="newUser.password" required type="password" class="form-input" placeholder="••••••••" />
          </div>

          <div>
            <label class="block text-sm text-slate-400 mb-1">الصلاحية</label>
            <select v-model="newUser.role" class="form-input">
              <option value="CASHIER">كاشير</option>
              <option value="MANAGER">مشرف</option>
              <option value="ADMIN">مدير النظام</option>
            </select>
          </div>

          <div class="pt-4 flex gap-3">
            <button 
              type="submit"
              class="flex-1 bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-teal-600/20"
            >
              حفظ المستخدم
            </button>
            <button 
              type="button"
              @click="isModalOpen = false"
              class="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-all"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.form-input {
  @apply w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all text-right;
}

.glass-card {
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
}

/* RTL Adjustments for table */
th, td {
  text-align: right;
}

/* Animation for the list */
tr {
  animation: slide-up 0.4s ease forwards;
  opacity: 0;
}

@keyframes slide-up {
  from { transform: translateY(10px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

/* Loop for staggered animation */
tr:nth-child(1) { animation-delay: 0.1s; }
tr:nth-child(2) { animation-delay: 0.15s; }
tr:nth-child(3) { animation-delay: 0.2s; }
tr:nth-child(4) { animation-delay: 0.25s; }
tr:nth-child(5) { animation-delay: 0.3s; }
</style>
