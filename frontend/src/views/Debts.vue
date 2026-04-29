<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { toast } from 'vue3-toastify';
import api from '../api';
import BaseModal from '../components/BaseModal.vue';
import html2canvas from 'html2canvas';
import { 
  Users, 
  Truck, 
  Plus, 
  Search,
  Edit2,
  Trash2,
  Share2,
  CheckCircle2,
  QrCode
} from 'lucide-vue-next';

interface Debt {
  id: number;
  type: 'CUSTOMER' | 'SUPPLIER';
  personName: string;
  phone: string;
  amount: number;
  paidAmount: number;
  dueDate: string;
}

const debts = ref<Debt[]>([]);
const activeTab = ref<'CUSTOMER' | 'SUPPLIER'>('CUSTOMER');
const searchQuery = ref('');
const isModalOpen = ref(false);
const isPaymentModalOpen = ref(false);
const isIncreaseModalOpen = ref(false);
const selectedDebt = ref<Debt | null>(null);
const paymentAmount = ref(0);
const increaseAmount = ref(0);

const editingDebt = ref<Partial<Debt> | null>(null);

// Receipt States
const isReceiptModalOpen = ref(false);
const receiptRef = ref<HTMLElement | null>(null);
const generatedReceiptImage = ref<string | null>(null);
const lastPaymentDetails = ref<{
  personName: string;
  amount: number;
  date: string;
  remaining: number;
} | null>(null);

const openAddModal = () => {
  editingDebt.value = {
    type: activeTab.value,
    personName: '',
    phone: '',
    amount: 0,
    paidAmount: 0,
    dueDate: ''
  };
  isModalOpen.value = true;
};

const openEditModal = (debt: Debt) => {
  editingDebt.value = { 
    ...debt, 
    dueDate: debt.dueDate ? new Date(debt.dueDate).toISOString().split('T')[0] : ''
  };
  isModalOpen.value = true;
};

const fetchDebts = async () => {
  try {
    const res = await api.get(`/debts?type=${activeTab.value}`);
    debts.value = res.data;
  } catch (error) {
    console.error('Error fetching debts', error);
  }
};

onMounted(fetchDebts);

const filteredDebts = computed(() => {
  return debts.value.filter(d => d.personName.includes(searchQuery.value));
});

const totalBalance = computed(() => {
  return debts.value.reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);
});

const handleSaveDebt = async () => {
  try {
    const { id, createdAt, updatedAt, ...payload } = editingDebt.value as any;
    if (payload.dueDate === '') delete payload.dueDate; // cleanup empty date
    
    if (id) {
      await api.patch(`/debts/${id}`, payload);
      toast.success('تم تعديل السجل بنجاح');
    } else {
      await api.post('/debts', payload);
      toast.success('تمت إضافة السجل بنجاح');
    }
    await fetchDebts();
    isModalOpen.value = false;
  } catch (error: any) {
    toast.error(error.response?.data?.message || 'خطأ أثناء حفظ البيانات');
  }
};

const handlePayment = async () => {
  if (!selectedDebt.value || paymentAmount.value <= 0) {
    toast.warning('يرجى كتابة مبلغ صحيح');
    return;
  }
  try {
    const amountPaid = paymentAmount.value;
    const debtCopy = { ...selectedDebt.value };
    
    await api.patch(`/debts/${selectedDebt.value.id}/payment`, { amount: amountPaid });
    
    // If it's a customer, prepare receipt
    if (debtCopy.type === 'CUSTOMER') {
      lastPaymentDetails.value = {
        personName: debtCopy.personName,
        amount: amountPaid,
        date: new Date().toLocaleString('ar-IQ'),
        remaining: (debtCopy.amount - debtCopy.paidAmount) - amountPaid
      };
      isReceiptModalOpen.value = true;
    }

    await fetchDebts();
    isPaymentModalOpen.value = false;
    paymentAmount.value = 0;
    toast.success('تم تسجيل التسديد بنجاح');
  } catch (error: any) {
    toast.error(error.response?.data?.message || 'خطأ أثناء تسجيل التسديد');
  }
};

const captureAndShare = async () => {
  if (!receiptRef.value) return;
  
  try {
    const canvas = await html2canvas(receiptRef.value, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true
    });
    
    const dataUrl = canvas.toDataURL('image/png');
    generatedReceiptImage.value = dataUrl;

    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], `receipt_${Date.now()}.png`, { type: 'image/png' });

    if (navigator.share) {
      await navigator.share({
        files: [file],
        title: 'سند قبض',
        text: `وصل تسديد مبلغ ${lastPaymentDetails.value?.amount.toLocaleString()} د.ع من ${lastPaymentDetails.value?.personName}`
      });
    } else {
      // Fallback for desktop: download and copy link or just download
      const link = document.createElement('a');
      link.download = `receipt_${lastPaymentDetails.value?.personName}.png`;
      link.href = dataUrl;
      link.click();
      toast.info('تم تحميل الصورة، يمكنك إرسالها يدوياً عبر الواتساب');
    }
  } catch (error) {
    console.error('Error sharing receipt:', error);
    toast.error('حدث خطأ أثناء محاولة مشاركة الوصل');
  }
};

const handleIncreaseDebt = async () => {
  if (!selectedDebt.value || increaseAmount.value <= 0) {
    toast.warning('يرجى كتابة مبلغ صحيح');
    return;
  }
  try {
    const newTotal = selectedDebt.value.amount + increaseAmount.value;
    await api.patch(`/debts/${selectedDebt.value.id}`, { amount: newTotal });
    await fetchDebts();
    isIncreaseModalOpen.value = false;
    increaseAmount.value = 0;
    toast.success('تمت زيادة الدين بنجاح');
  } catch (error: any) {
    toast.error(error.response?.data?.message || 'خطأ أثناء زيادة الدين');
  }
};

const deleteDebt = async (id: number) => {
  if (!confirm('هل أنت متأكد من حذف هذا السجل نهائياً؟')) return;
  try {
    await api.delete(`/debts/${id}`);
    await fetchDebts();
    toast.success('تم الحذف بنجاح');
  } catch (error) {
    toast.error('حدث خطأ أثناء الحذف');
  }
};
</script>

<template>
  <div class="space-y-6 animate-in">
    <!-- Summary Header -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div 
        class="glass-card flex items-center justify-between p-6 bg-slate-800/40 border-l-4"
        :class="activeTab === 'CUSTOMER' ? 'border-amber-500' : 'border-red-500'"
      >
        <div>
          <p class="text-slate-400 text-sm mb-1">{{ activeTab === 'CUSTOMER' ? 'إجمالي مستحقات العملاء' : 'إجمالي مستحقات الموردين' }}</p>
          <h3 class="text-3xl font-extrabold">{{ totalBalance.toLocaleString() }} <span class="text-sm font-normal text-slate-500">د.ع</span></h3>
        </div>
        <div class="p-3 rounded-2xl" :class="activeTab === 'CUSTOMER' ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'">
          <component :is="activeTab === 'CUSTOMER' ? Users : Truck" :size="32" />
        </div>
      </div>
      
      <div class="md:col-span-2 glass-card flex items-center gap-4 bg-slate-800/20">
        <div class="flex-1 relative">
          <Search class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" :size="20" />
          <input v-model="searchQuery" type="text" placeholder="البحث بالاسم..." class="input-field pr-12" />
        </div>
        <button @click="openAddModal" class="btn btn-primary bg-teal-600 hover:bg-teal-500 gap-2 h-12 shadow-lg shadow-teal-900/20">
          <Plus :size="20" />
          {{ activeTab === 'CUSTOMER' ? 'إضافة دين جديد' : 'إضافة مستحق جديد' }}
        </button>
      </div>
    </div>

    <!-- TABS -->
    <div class="flex p-1 bg-slate-800/50 w-fit rounded-xl border border-slate-700">
      <button 
        @click="activeTab = 'CUSTOMER'; fetchDebts()"
        class="px-8 py-2 rounded-lg font-bold transition-all text-sm"
        :class="activeTab === 'CUSTOMER' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'"
      >العملاء (Receivables)</button>
      <button 
        @click="activeTab = 'SUPPLIER'; fetchDebts()"
        class="px-8 py-2 rounded-lg font-bold transition-all text-sm"
        :class="activeTab === 'SUPPLIER' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'"
      >الموردين (Payables)</button>
    </div>

    <!-- Debts Table -->
    <div class="glass-card bg-slate-800/30 p-0 border-slate-700/50">
      <div class="overflow-x-auto">
        <table class="w-full text-right">
          <thead class="bg-slate-900/50 text-slate-400 text-sm uppercase tracking-wider border-b border-slate-700">
            <tr>
              <th class="py-4 px-6 font-semibold">الاسم</th>
              <th class="py-4 px-6 font-semibold">المبلغ الكلي</th>
              <th class="py-4 px-6 font-semibold">المسدد</th>
              <th class="py-4 px-6 font-semibold">المتبقي</th>
              <th class="py-4 px-6 font-semibold">تاريخ الاستحقاق</th>
              <th class="py-4 px-6 font-semibold text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-700/50">
            <tr v-for="d in filteredDebts" :key="d.id" class="hover:bg-slate-700/20 transition-all">
              <td class="py-4 px-6">
                <div class="flex flex-col">
                  <span class="font-bold text-white">{{ d.personName }}</span>
                  <span class="text-xs text-slate-500">{{ d.phone || '-' }}</span>
                </div>
              </td>
              <td class="py-4 px-6 font-medium">{{ d.amount.toLocaleString() }} د.ع</td>
              <td class="py-4 px-6 text-teal-400 font-medium">{{ d.paidAmount.toLocaleString() }} د.ع</td>
              <td class="py-4 px-6">
                <span class="font-extrabold" :class="(d.amount - d.paidAmount) > 0 ? 'text-red-400' : 'text-teal-400'">
                  {{ (d.amount - d.paidAmount).toLocaleString() }} د.ع
                </span>
              </td>
              <td class="py-4 px-6 text-sm text-slate-400">
                {{ d.dueDate ? new Date(d.dueDate).toLocaleDateString('ar-IQ') : 'غير محدد' }}
              </td>
              <td class="py-4 px-6 text-center">
                <div class="flex justify-center items-center gap-2">
                  <button 
                    @click="selectedDebt = d; paymentAmount = 0; isPaymentModalOpen = true"
                    class="btn btn-primary bg-teal-600/20 text-teal-400 hover:bg-teal-600 hover:text-white px-3 py-1 rounded-lg text-xs"
                    :disabled="(d.amount - d.paidAmount) <= 0"
                  >تسديد</button>
                  <button 
                    @click="selectedDebt = d; increaseAmount = 0; isIncreaseModalOpen = true"
                    class="btn btn-primary bg-amber-600/20 text-amber-500 hover:bg-amber-600 hover:text-white px-3 py-1 rounded-lg text-xs font-bold"
                  >زيادة</button>
                  <button @click="openEditModal(d)" class="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-colors" title="تعديل السجل">
                    <Edit2 :size="16" />
                  </button>
                  <button @click="deleteDebt(d.id)" class="p-2 bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition-colors" title="حذف السجل">
                    <Trash2 :size="16" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modals -->
    <BaseModal 
      :show="isModalOpen" 
      :title="editingDebt?.id ? 'تعديل السجل' : 'إضافة مستحق جديد'" 
      maxWidth="450px" 
      @close="isModalOpen = false"
    >
      <div class="space-y-4" v-if="editingDebt">
        <label class="block text-sm text-slate-400">اسم الشخص</label>
        <input v-model="editingDebt.personName" class="input-field" placeholder="اسم الشخص" />
        
        <label class="block text-sm text-slate-400">رقم الهاتف</label>
        <input v-model="editingDebt.phone" class="input-field" placeholder="رقم الهاتف (اختياري)" />
        
        <label class="block text-sm text-slate-400">المبلغ الكلي</label>
        <input v-model.number="editingDebt.amount" type="number" class="input-field" placeholder="المبلغ" />
        
        <div v-if="editingDebt.id">
           <label class="block text-sm text-slate-400">المبلغ المسدد (إذا أردت تعديله يدوياً)</label>
           <input v-model.number="editingDebt.paidAmount" type="number" class="input-field" />
        </div>

        <label class="block text-sm text-slate-400">تاريخ الاستحقاق أو الموعد (اختياري)</label>
        <input v-model="editingDebt.dueDate" type="date" class="input-field" />
        
        <div class="pt-4 flex gap-4">
          <button @click="handleSaveDebt" class="flex-1 btn btn-primary py-3 rounded-xl font-bold border-none justify-center">حفظ</button>
          <button @click="isModalOpen = false" class="flex-1 bg-slate-700 hover:bg-slate-600 text-white border-none py-3 rounded-xl font-bold">إلغاء</button>
        </div>
      </div>
    </BaseModal>

    <BaseModal 
      :show="isPaymentModalOpen" 
      title="تسجيل تسديد مبلغ" 
      maxWidth="450px" 
      @close="isPaymentModalOpen = false"
    >
      <div class="space-y-4" v-if="selectedDebt">
        <div class="bg-slate-900/50 p-4 rounded-xl mb-4">
          <span class="text-slate-400 text-sm">للشخص:</span>
          <div class="text-lg font-bold">{{ selectedDebt.personName }}</div>
          <div class="text-xs text-red-400 mt-1">المتبقي: {{ (selectedDebt.amount - selectedDebt.paidAmount).toLocaleString() }} د.ع</div>
        </div>
        <label class="text-sm text-slate-400">المبلغ المدفوع حالياً:</label>
        <input v-model.number="paymentAmount" type="number" class="w-full bg-slate-900 border border-slate-700 py-3 rounded-xl px-4 text-2xl font-bold text-teal-400 text-center outline-none focus:border-teal-500" />
        <button @click="handlePayment" class="w-full btn btn-primary py-3 rounded-xl font-bold mt-4 justify-center">تأكيد التسديد</button>
      </div>
    </BaseModal>

    <BaseModal 
      :show="isIncreaseModalOpen" 
      title="إضافة دين جديد (للعميل الحالي)" 
      maxWidth="450px" 
      @close="isIncreaseModalOpen = false"
    >
      <div class="space-y-4" v-if="selectedDebt">
        <div class="bg-slate-900/50 p-4 rounded-xl mb-4 border border-slate-700 border-r-4 border-r-amber-500">
          <span class="text-slate-400 text-sm">للشخص:</span>
          <div class="text-lg font-bold text-white">{{ selectedDebt.personName }}</div>
          <div class="text-xs text-amber-500 mt-1">الدين المتبقي حالياً: {{ (selectedDebt.amount - selectedDebt.paidAmount).toLocaleString() }} د.ع</div>
        </div>
        <label class="text-sm text-slate-400">المبلغ الإضافي الجديد:</label>
        <input v-model.number="increaseAmount" type="number" class="w-full bg-slate-900 border border-slate-700 py-3 rounded-xl px-4 text-2xl font-bold text-amber-500 text-center outline-none focus:border-amber-500" />
        <button @click="handleIncreaseDebt" class="w-full btn btn-primary bg-amber-600 hover:bg-amber-500 py-3 rounded-xl font-bold mt-4 shadow-lg shadow-amber-900/20 justify-center">إضافة للمطلوبات</button>
      </div>
    </BaseModal>

    <!-- Receipt Preview and Capture Modal -->
    <BaseModal 
      :show="isReceiptModalOpen" 
      title="سند قبض" 
      maxWidth="500px" 
      @close="isReceiptModalOpen = false"
    >
      <div class="flex flex-col items-center">
        <!-- Hidden Receipt for capturing -->
        <div class="overflow-hidden h-0 w-0 absolute -z-10">
          <div ref="receiptRef" class="w-[400px] bg-white text-slate-900 p-8 flex flex-col font-sans" dir="rtl">
            <div class="flex justify-between items-center border-b-2 border-teal-600 pb-4 mb-6">
              <div>
                <h1 class="text-2xl font-black text-teal-700">سند قبض</h1>
                <p class="text-xs text-slate-500">نظام المبيعات المتطور</p>
              </div>
              <div class="bg-teal-600 text-white p-2 rounded-lg">
                <QrCode :size="32" />
              </div>
            </div>

            <div class="space-y-4 flex-1">
              <div class="flex justify-between border-b border-slate-100 pb-2">
                <span class="text-slate-500">التاريخ:</span>
                <span class="font-bold">{{ lastPaymentDetails?.date }}</span>
              </div>
              <div class="flex justify-between border-b border-slate-100 pb-2">
                <span class="text-slate-500">وصلنا من السيد/ة:</span>
                <span class="font-bold text-lg text-teal-800">{{ lastPaymentDetails?.personName }}</span>
              </div>
              <div class="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                <p class="text-sm text-slate-500 mb-1">مبلغ وقدره</p>
                <h2 class="text-3xl font-black text-slate-900">{{ lastPaymentDetails?.amount.toLocaleString() }} <span class="text-sm">د.ع</span></h2>
              </div>
              <div class="flex justify-between items-center pt-2">
                <span class="text-slate-500">المتبقي في الذمة:</span>
                <span class="font-bold text-red-600">{{ lastPaymentDetails?.remaining.toLocaleString() }} د.ع</span>
              </div>
            </div>

            <div class="mt-8 pt-6 border-t border-dashed border-slate-200 flex justify-between items-end">
              <div class="text-center">
                <div class="w-24 h-px bg-slate-300 mb-2"></div>
                <p class="text-[10px] text-slate-400">توقيع المحاسب</p>
              </div>
              <div class="text-left">
                <p class="text-[10px] text-slate-400 italic">شكراً لتعاملكم معنا</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Visual Preview in Modal -->
        <div class="w-full bg-slate-900/50 p-6 rounded-2xl border border-slate-700 flex flex-col items-center gap-4">
          <div class="w-20 h-20 bg-teal-500/20 rounded-full flex items-center justify-center text-teal-400 mb-2">
            <CheckCircle2 :size="48" />
          </div>
          <h3 class="text-xl font-bold">تم تسجيل التسديد!</h3>
          <p class="text-slate-400 text-center text-sm">يمكنك الآن مشاركة وصل القبض مع العميل عبر الواتساب كصورة</p>
          
          <div class="grid grid-cols-2 gap-4 w-full mt-4">
            <button 
              @click="captureAndShare" 
              class="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white py-3 rounded-xl font-bold transition-all"
            >
              <Share2 :size="18" />
              مشاركة واتساب
            </button>
            <button 
              @click="isReceiptModalOpen = false" 
              class="bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl font-bold transition-all"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </BaseModal>
  </div>
</template>
