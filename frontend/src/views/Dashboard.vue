<script setup lang="ts">
import { ref, onMounted } from 'vue';
import api from '../api';
import { useAuthStore } from '../stores/auth';
import { 
  TrendingUp, 
  AlertCircle, 
  ArrowUpRight, 
  ArrowDownRight,
  Activity,
  History
} from 'lucide-vue-next';

const authStore = useAuthStore();
const stats = ref<any>({
  totalSales: 0,
  totalProfit: 0,
  receivables: 0,
  payables: 0,
  count: 0
});

const recentSales = ref<any[]>([]);
const lowStockProducts = ref<any[]>([]);
const isLoading = ref(true);

const fetchDashboardData = async () => {
  isLoading.value = true;
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const requests = [
      api.get(`/sales/reports?start=${today.toISOString()}`),
      api.get('/products'),
      api.get('/sales'),
    ];

    if (authStore.isAdmin) {
      requests.push(api.get('/debts/summary'));
    }

    const responses = await Promise.all(requests);
    const salesReport = responses[0];
    const allProducts = responses[1];
    const allSales = responses[2];
    const financialSummary = authStore.isAdmin ? responses[3] : { data: { receivables: 0, payables: 0 } };

    stats.value = {
      ...salesReport.data,
      ...financialSummary.data
    };
    
    lowStockProducts.value = allProducts.data.filter((p: any) => p.stockQuantity <= p.alertQuantity);
    recentSales.value = allSales.data.slice(0, 5);
  } catch (error) {
    console.error('Error fetching dashboard data');
  } finally {
    isLoading.value = false;
  }
};

onMounted(fetchDashboardData);
</script>

<template>
  <div class="space-y-8 animate-in">
    <!-- Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <!-- Sales Today -->
      <div class="glass-card bg-slate-800/40 p-6 flex items-center justify-between group hover:border-teal-500/30 transition-all">
        <div>
          <p class="text-slate-400 text-sm font-medium mb-1">مبيعات اليوم</p>
          <h3 class="text-3xl font-extrabold text-white">{{ stats.totalSales.toLocaleString() }} <span class="text-sm font-normal text-slate-500">د.ع</span></h3>
        </div>
        <div class="p-3 bg-teal-500/10 rounded-2xl text-teal-400 group-hover:scale-110 transition-transform">
          <TrendingUp :size="28" />
        </div>
      </div>

      <!-- Profit Today -->
      <div class="glass-card bg-slate-800/40 p-6 flex items-center justify-between group hover:border-teal-500/30 transition-all">
        <div>
          <p class="text-slate-400 text-sm font-medium mb-1">أرباح اليوم</p>
          <h3 class="text-3xl font-extrabold text-teal-400">
            {{ stats.totalProfit.toLocaleString() }} <span class="text-sm font-normal text-slate-500">د.ع</span>
          </h3>
        </div>
        <div class="p-3 bg-teal-500/10 rounded-2xl text-teal-300 group-hover:scale-110 transition-transform">
          <Activity :size="28" />
        </div>
      </div>

      <!-- Receivables -->
      <div v-if="authStore.isAdmin" class="glass-card bg-slate-800/40 p-6 flex items-center justify-between group hover:border-amber-500/30 transition-all">
        <div>
          <p class="text-slate-400 text-sm font-medium mb-1">ديون العملاء (لنا)</p>
          <h3 class="text-3xl font-extrabold text-amber-500">{{ stats.receivables.toLocaleString() }} <span class="text-sm font-normal text-slate-500">د.ع</span></h3>
        </div>
        <div class="p-3 bg-amber-500/10 rounded-2xl text-amber-500 group-hover:scale-110 transition-transform">
          <ArrowUpRight :size="28" />
        </div>
      </div>

      <!-- Payables -->
      <div v-if="authStore.isAdmin" class="glass-card bg-slate-800/40 p-6 flex items-center justify-between group hover:border-red-500/30 transition-all">
        <div>
          <p class="text-slate-400 text-sm font-medium mb-1">ديون الموردين (علينا)</p>
          <h3 class="text-3xl font-extrabold text-red-500">{{ stats.payables.toLocaleString() }} <span class="text-sm font-normal text-slate-500">د.ع</span></h3>
        </div>
        <div class="p-3 bg-red-500/10 rounded-2xl text-red-500 group-hover:scale-110 transition-transform">
          <ArrowDownRight :size="28" />
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Recent Transactions -->
      <div class="lg:col-span-2 glass-card bg-slate-800/30 p-0 border-slate-700/50">
        <div class="p-6 border-b border-slate-700 flex justify-between items-center">
          <h4 class="text-xl font-bold flex items-center gap-2">
            <History :size="20" class="text-teal-400" /> آخر العمليات
          </h4>
          <button class="text-xs text-teal-400 font-bold hover:underline">عرض الكل</button>
        </div>
        <div class="p-0 overflow-x-auto">
          <table class="w-full text-right">
            <tbody class="divide-y divide-slate-700/50">
              <tr v-for="sale in recentSales" :key="sale.id" class="hover:bg-slate-700/20 transition-all">
                <td class="py-4 px-6 text-sm font-medium text-white">فاتورة #{{ sale.id }}</td>
                <td class="py-4 px-6 text-sm text-slate-400">{{ new Date(sale.createdAt).toLocaleTimeString('ar-IQ') }}</td>
                <td class="py-4 px-6 text-sm">
                  <span 
                    class="px-2 py-1 rounded-md text-xs font-bold"
                    :class="sale.paymentType === 'CASH' ? 'bg-teal-500/10 text-teal-400' : 'bg-amber-500/10 text-amber-500'"
                  >
                    {{ sale.paymentType === 'CASH' ? 'كاش' : 'آجل' }}
                  </span>
                </td>
                <td class="py-4 px-6 text-sm font-bold text-white">{{ sale.totalAmount.toLocaleString() }} د.ع</td>
              </tr>
            </tbody>
          </table>
          <div v-if="recentSales.length === 0" class="p-12 text-center text-slate-500">لا توجد عمليات مبيعات اليوم</div>
        </div>
      </div>

      <!-- Low Stock Alerts -->
      <div class="glass-card bg-slate-800/30 p-0 border-slate-700/50">
        <div class="p-6 border-b border-slate-700">
          <h4 class="text-xl font-bold flex items-center gap-2">
            <AlertCircle :size="20" class="text-amber-500" /> تنبيهات النواقص
          </h4>
        </div>
        <div class="p-4 space-y-4">
          <div 
            v-for="p in lowStockProducts" 
            :key="p.id" 
            class="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-amber-500/10"
          >
            <div class="flex flex-col">
              <span class="text-sm font-bold">{{ p.name }}</span>
              <span class="text-xs text-slate-500">الباركود: {{ p.barcode }}</span>
            </div>
            <div class="text-red-400 text-sm font-bold bg-red-400/10 px-2 py-1 rounded-lg">
              بقيت {{ p.stockQuantity }}
            </div>
          </div>
          <div v-if="lowStockProducts.length === 0" class="p-8 text-center text-slate-500 italic">المخزون مكتمل ولا توجد نواقص</div>
        </div>
      </div>
    </div>
  </div>
</template>
