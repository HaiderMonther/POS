<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { toast } from 'vue3-toastify';
import * as XLSX from 'xlsx';
import api from '../api';
import { 
  Calendar, 
  FileText, 
  TrendingUp, 
  PieChart, 
  Printer,
  Download,
  AlertTriangle,
  MessageCircle,
  Share2
} from 'lucide-vue-next';

const getLocalDate = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const startDate = ref(getLocalDate(new Date()));
const endDate = ref(getLocalDate(new Date()));
const report = ref<any>(null);
const sales = ref<any[]>([]);
const allProducts = ref<any[]>([]);
const isLoading = ref(false);

const shortages = computed(() => {
  return allProducts.value.filter(p => p.stockQuantity <= p.alertQuantity);
});

const generateReport = async () => {
  isLoading.value = true;
  try {
    const [reportRes, salesRes, productsRes] = await Promise.all([
      api.get(`/sales/reports?start=${startDate.value}T00:00:00Z&end=${endDate.value}T23:59:59Z`),
      api.get('/sales'),
      api.get('/products')
    ]);
    report.value = reportRes.data;
    sales.value = salesRes.data.filter((s: any) => {
      const sDate = getLocalDate(new Date(s.createdAt));
      return sDate >= startDate.value && sDate <= endDate.value;
    });
    allProducts.value = productsRes.data;
  } catch (error) {
    console.error('Error generating report');
  } finally {
    isLoading.value = false;
  }
};

onMounted(generateReport);

const printReport = () => {
  window.print();
};

const exportToExcel = () => {
  if (sales.value.length === 0) {
    toast.warning('لا توجد فواتير لتصديرها ضمن هذه الفترة');
    return;
  }

  const exportData = sales.value.map(sale => {
    const profit = sale.items?.reduce((sum: number, item: any) => {
      return sum + ((item.sellingPriceAtSale - item.purchasePriceAtSale) * item.quantity);
    }, 0) - (sale.discount || 0);

    return {
      'رقم الفاتورة': sale.id,
      'التاريخ': new Date(sale.createdAt).toLocaleDateString('ar-IQ'),
      'الوقت': new Date(sale.createdAt).toLocaleTimeString('ar-IQ'),
      'طريقة الدفع': sale.paymentType === 'CASH' ? 'كاش' : 'آجل',
      'الإجمالي (د.ع)': sale.totalAmount,
      'الخصم (د.ع)': sale.discount,
      'الربح الصافي (د.ع)': profit || 0
    };
  });

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "تفاصيل المبيعات");
  
  XLSX.writeFile(wb, `تقرير_المبيعات_${startDate.value}.xlsx`);
  toast.success('تم تصدير التقرير بنجاح');
};

const shareToWhatsApp = () => {
  if (shortages.value.length === 0) {
    toast.info('لا توجد نواقص لمشاركتها');
    return;
  }

  let message = `📋 *قائمة النواقص - ${new Date().toLocaleDateString('ar-IQ')}*\n\n`;
  
  shortages.value.forEach((p, index) => {
    message += `${index + 1}. *${p.name}*\n`;
  });

  message += `\n_تم الإرسال من نظام POS_`;

  const encodedMessage = encodeURIComponent(message);
  window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
};
</script>

<template>
  <div>
  <div class="space-y-8 animate-in no-print">
    <!-- Filter Bar -->
    <div class="glass-card flex flex-wrap items-end gap-6 bg-slate-800/40">
      <div class="flex-1 min-w-[200px]">
        <label class="block text-sm text-slate-400 mb-2">من تاريخ</label>
        <div class="relative">
          <Calendar class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" :size="18" />
          <input v-model="startDate" type="date" class="input-field pr-10" />
        </div>
      </div>
      <div class="flex-1 min-w-[200px]">
        <label class="block text-sm text-slate-400 mb-2">إلى تاريخ</label>
        <div class="relative">
          <Calendar class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" :size="18" />
          <input v-model="endDate" type="date" class="input-field pr-10" />
        </div>
      </div>
      <div class="flex gap-4 min-w-[200px]">
        <button @click="generateReport" :disabled="isLoading" class="flex-1 btn btn-primary h-12 px-6 shadow-lg shadow-teal-900/20">
          تحديث
        </button>
        <button @click="printReport" class="btn bg-slate-700 hover:bg-slate-600 h-12 px-6 flex items-center gap-2">
          <Printer :size="20" />
          <span>طباعة التقرير</span>
        </button>
        <button @click="exportToExcel" class="btn bg-emerald-700 hover:bg-emerald-600 h-12 px-6 flex items-center gap-2" title="تصدير كملف Excel">
          <Download :size="20" />
          <span>تصدير إكسل</span>
        </button>
      </div>
    </div>

    <!-- Metrics Grid -->
    <div v-if="report" class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="glass-card bg-slate-800/30 p-6 flex items-center justify-between border-b-4 border-teal-500">
        <div>
          <p class="text-slate-400 text-sm mb-1">إجمالي المبيعات</p>
          <h3 class="text-3xl font-extrabold">{{ report.totalSales.toLocaleString() }} د.ع</h3>
        </div>
        <TrendingUp class="text-teal-400 opacity-20" :size="48" />
      </div>
      <div class="glass-card bg-slate-800/30 p-6 flex items-center justify-between border-b-4 border-teal-400">
        <div>
          <p class="text-slate-400 text-sm mb-1">إجمالي الأرباح</p>
          <h3 class="text-3xl font-extrabold text-teal-400">{{ report.totalProfit.toLocaleString() }} د.ع</h3>
        </div>
        <PieChart class="text-teal-400 opacity-20" :size="48" />
      </div>
      <div class="glass-card bg-slate-800/30 p-6 flex items-center justify-between border-b-4 border-slate-500">
        <div>
          <p class="text-slate-400 text-sm mb-1">عدد الفواتير</p>
          <h3 class="text-3xl font-extrabold">{{ report.count }}</h3>
        </div>
        <FileText class="text-slate-500 opacity-20" :size="48" />
      </div>
    </div>

    <!-- Shortages Section -->
    <div class="glass-card bg-red-900/10 border-red-500/30 p-0 overflow-hidden">
      <div class="p-4 bg-red-950/20 flex items-center justify-between border-b border-red-500/20">
        <div class="flex items-center gap-2">
          <AlertTriangle class="text-red-400" :size="20" />
          <h4 class="font-bold text-red-100">قائمة النواقص (المواد التي أوشكت على النفاد)</h4>
        </div>
        <button 
          v-if="shortages.length > 0"
          @click="shareToWhatsApp" 
          class="btn bg-green-600 hover:bg-green-500 text-white text-xs px-3 py-1.5 flex items-center gap-2 rounded-lg transition-all"
        >
          <MessageCircle :size="16" />
          <span>إرسال عبر واتساب</span>
        </button>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-right text-sm">
          <thead class="bg-red-950/40 text-red-300">
            <tr>
              <th class="py-3 px-6">اسم المادة</th>
              <th class="py-3 px-6 text-center">الكمية الحالية</th>
              <th class="py-3 px-6 text-center">حد التنبيه</th>
              <th class="py-3 px-6 text-center">الحالة</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-red-500/10">
            <tr v-for="p in shortages" :key="p.id" class="hover:bg-red-500/5 transition-all">
              <td class="py-3 px-6 font-bold text-white">{{ p.name }}</td>
              <td class="py-3 px-6 text-center font-mono" :class="p.stockQuantity === 0 ? 'text-red-500' : 'text-amber-500'">
                {{ p.stockQuantity }} {{ p.unit === 'KG' ? 'كغم' : 'قطعة' }}
              </td>
              <td class="py-3 px-6 text-center text-slate-400">{{ p.alertQuantity }}</td>
              <td class="py-3 px-6 text-center">
                <span v-if="p.stockQuantity === 0" class="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">نافد</span>
                <span v-else class="bg-amber-600/20 text-amber-500 text-[10px] px-2 py-0.5 rounded-full font-bold">منخفض</span>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="shortages.length === 0" class="p-6 text-center text-slate-500 italic">لا توجد نواقص حالياً</div>
      </div>
    </div>

    <!-- Sales Table -->
    <div class="glass-card bg-slate-800/30 p-0 border-slate-700/50">
      <div class="p-6 border-b border-slate-700">
        <h4 class="text-xl font-bold">تفاصيل الفواتير</h4>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-right">
          <thead class="bg-slate-900/50 text-slate-400 text-sm uppercase tracking-wider border-b border-slate-700">
            <tr>
              <th class="py-4 px-6 font-semibold">رقم الفاتورة</th>
              <th class="py-4 px-6 font-semibold">التاريخ والوقت</th>
              <th class="py-4 px-6 font-semibold">طريقة الدفع</th>
              <th class="py-4 px-6 font-semibold">الإجمالي</th>
              <th class="py-4 px-6 font-semibold">الخصم</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-700/50">
            <tr v-for="sale in sales" :key="sale.id" class="hover:bg-slate-700/20 transition-all">
              <td class="py-4 px-6 font-bold text-teal-400">#{{ sale.id }}</td>
              <td class="py-4 px-6 text-sm">{{ new Date(sale.createdAt).toLocaleString('ar-IQ') }}</td>
              <td class="py-4 px-6">
                <span class="px-2 py-1 rounded-md text-xs font-bold bg-slate-700">
                  {{ sale.paymentType === 'CASH' ? 'كاش' : 'آجل' }}
                </span>
              </td>
              <td class="py-4 px-6 font-bold text-white">{{ sale.totalAmount.toLocaleString() }} د.ع</td>
              <td class="py-4 px-6 text-sm text-red-400">{{ sale.discount.toLocaleString() }} د.ع</td>
            </tr>
          </tbody>
        </table>
        <div v-if="sales.length === 0" class="p-12 text-center text-slate-500 italic">لا توجد سجلات لهذه الفترة</div>
      </div>
    </div>
  </div>

  <!-- Print Only Section -->
  <div class="hidden print:block text-black p-4 w-full h-full bg-white print-page border-0">
    <div class="text-center mb-6 pb-4 border-b-2 border-black">
      <h1 class="text-3xl font-bold mb-2">تقرير المبيعات والأرباح الشامل</h1>
      <p class="text-md text-gray-700">الفترة من: <span class="font-bold">{{ startDate }}</span> إلى <span class="font-bold">{{ endDate }}</span></p>
    </div>
    
    <div class="grid grid-cols-3 gap-4 mb-8 bg-gray-100 p-4 border border-gray-300 rounded-lg shadow-sm">
      <div class="text-center">
        <p class="text-sm text-gray-600 mb-1">إجمالي المبيعات</p>
        <p class="text-xl font-bold">{{ report?.totalSales?.toLocaleString() }} د.ع</p>
      </div>
      <div class="text-center border-x border-gray-300">
        <p class="text-sm text-gray-600 mb-1">إجمالي الأرباح</p>
        <p class="text-xl font-bold">{{ report?.totalProfit?.toLocaleString() }} د.ع</p>
      </div>
      <div class="text-center">
        <p class="text-sm text-gray-600 mb-1">عدد الفواتير</p>
        <p class="text-xl font-bold">{{ report?.count }}</p>
      </div>
    </div>

    <table class="w-full border-collapse border border-gray-400 text-sm">
      <thead class="bg-gray-200">
        <tr>
          <th class="border border-gray-400 px-3 py-2 text-right">رقم الفاتورة</th>
          <th class="border border-gray-400 px-3 py-2 text-right">التاريخ</th>
          <th class="border border-gray-400 px-3 py-2 text-right">طريقة الدفع</th>
          <th class="border border-gray-400 px-3 py-2 text-right">الإجمالي</th>
          <th class="border border-gray-400 px-3 py-2 text-right">الخصم</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="sale in sales" :key="sale.id" class="border-b border-gray-300">
          <td class="border border-gray-400 px-3 py-2 font-bold">#{{ sale.id }}</td>
          <td class="border border-gray-400 px-3 py-2">{{ new Date(sale.createdAt).toLocaleString('ar-IQ') }}</td>
          <td class="border border-gray-400 px-3 py-2">{{ sale.paymentType === 'CASH' ? 'كاش' : 'آجل' }}</td>
          <td class="border border-gray-400 px-3 py-2 font-bold">{{ sale.totalAmount.toLocaleString() }} د.ع</td>
          <td class="border border-gray-400 px-3 py-2">{{ sale.discount > 0 ? sale.discount.toLocaleString() : '-' }}</td>
        </tr>
      </tbody>
    </table>

    <!-- Shortages Section in Print -->
    <div v-if="shortages.length > 0" class="mt-10">
      <h2 class="text-xl font-bold mb-4 border-b-2 border-black pb-1">قائمة النواقص الاحتياجية</h2>
      <table class="w-full border-collapse border border-gray-400 text-sm">
        <thead class="bg-gray-200">
          <tr>
            <th class="border border-gray-400 px-3 py-2 text-right">اسم المادة</th>
            <th class="border border-gray-400 px-3 py-2 text-center">الكمية المتوفرة</th>
            <th class="border border-gray-400 px-3 py-2 text-center">الحالة</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in shortages" :key="p.id">
            <td class="border border-gray-400 px-3 py-2 font-bold">{{ p.name }}</td>
            <td class="border border-gray-400 px-3 py-2 text-center">{{ p.stockQuantity }}</td>
            <td class="border border-gray-400 px-3 py-2 text-center">{{ p.stockQuantity === 0 ? 'نافد' : 'منخفض' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="mt-8 text-center text-gray-500 text-xs">
      <p>تمت الطباعة بواسطة نظام الـ POS - {{ new Date().toLocaleString('ar-IQ') }}</p>
    </div>
  </div>
  </div>
</template>

<style scoped>
/* No extra styles needed here as print logic is global */
</style>
