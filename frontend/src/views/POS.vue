<script setup lang="ts">
import { ref, onMounted, nextTick, computed, watch } from 'vue';
import { toast } from 'vue3-toastify';
import { useCartStore } from '../stores/cart';
import api from '../api';
import BaseModal from '../components/BaseModal.vue';
import { 
  Search, 
  Trash2, 
  Plus, 
  Minus, 
  Package
} from 'lucide-vue-next';

const cartStore = useCartStore();
const searchQuery = ref('');
const searchInput = ref<HTMLInputElement | null>(null);
const isCheckoutModalOpen = ref(false);
const paymentType = ref('CASH');
const customerName = ref('');
const customerPhone = ref('');
const isProcessing = ref(false);

const lastSaleReceipt = ref<any>(null);
const allProducts = ref<any[]>([]);
const customers = ref<any[]>([]);

// Weight-based sale state
const isWeightModalOpen = ref(false);
const selectedProductForWeight = ref<any>(null);
const weightInput = ref(1);
const amountInput = ref(0);



// Multi-unit state
const isMultiModalOpen = ref(false);
const selectedProductForMulti = ref<any>(null);

const filteredProducts = computed(() => {
  if (!searchQuery.value) return allProducts.value;
  const q = searchQuery.value.toLowerCase();
  return allProducts.value.filter(p => p.name.toLowerCase().includes(q) || p.barcode.includes(q));
});

watch(customerName, (newName) => {
  const found = customers.value.find(c => c.personName === newName);
  if (found) {
    customerPhone.value = found.phone || '';
  }
});

watch(isCheckoutModalOpen, (isOpen) => {
  if (isOpen) {
    fetchCustomers();
  }
});

const fetchProducts = async () => {
  try {
    const res = await api.get('/products');
    allProducts.value = res.data;
  } catch (error) {
    console.error('Error fetching products', error);
  }
};

const fetchCustomers = async () => {
  try {
    const res = await api.get('/debts?type=CUSTOMER');
    customers.value = res.data;
  } catch (error) {
    console.error('Error fetching customers', error);
  }
};

const focusSearch = () => {
  nextTick(() => searchInput.value?.focus());
};

onMounted(() => {
  fetchProducts();
  fetchCustomers();
  focusSearch();
});

const handleSearch = async () => {
  const query = searchQuery.value.trim();
  if (!query) return;
  
  try {
    const res = await api.get(`/products/barcode/${query}`);
    const product = res.data;
    
    if (product.stockQuantity <= 0) {
      toast.error(`المنتج "${product.name}" نفد من المخزون`);
      searchQuery.value = '';
      return;
    }
    
    cartStore.addItem(product);
    searchQuery.value = '';
    focusSearch();
  } catch (error: any) {
    if (error.response?.status === 404) {
      toast.warning('عذراً، هذا المنتج غير مسجل في النظام');
    } else {
      toast.error('حدث خطأ أثناء البحث عن المنتج');
    }
    searchQuery.value = '';
    focusSearch();
  }
};

const addToCart = (product: any) => {
  if (product.stockQuantity <= 0) {
    toast.error(`المنتج "${product.name}" نفد من المخزون`);
    return;
  }
  
  if (product.unit === 'KG') {
    selectedProductForWeight.value = product;
    weightInput.value = 0;
    amountInput.value = 0;
    isWeightModalOpen.value = true;
  } else if (product.isMultiUnit && !product.saleType) {
    // Only open multi-unit modal if saleType wasn't already selected (e.g. from the new buttons)
    selectedProductForMulti.value = product;
    amountInput.value = 0;
    isMultiModalOpen.value = true;
  } else {
    cartStore.addItem(product);
  }
};

const confirmWeightAdd = () => {
  if (weightInput.value <= 0) {
    toast.warning('يرجى إدخال وزن صحيح');
    return;
  }
  cartStore.addItem({ ...selectedProductForWeight.value, quantity: weightInput.value });
  isWeightModalOpen.value = false;
  focusSearch();
};

const confirmAmountAdd = (amount?: number) => {
  const finalAmount = amount || amountInput.value;
  if (finalAmount <= 0) return;
  
  const product = selectedProductForWeight.value || selectedProductForMulti.value;
  const price = product.saleType === 'جملة' ? (product.wholesalePrice || product.sellingPrice) : product.sellingPrice;
  const calculatedQty = finalAmount / price;
  
  const roundedQty = Math.round(calculatedQty * 1000) / 1000;
  
  cartStore.addItem({ ...product, quantity: roundedQty });
  isWeightModalOpen.value = false;
  isMultiModalOpen.value = false;
  focusSearch();
};



const confirmMultiAdd = (factor: number) => {
  cartStore.addItem({ ...selectedProductForMulti.value, quantity: factor });
  isMultiModalOpen.value = false;
  focusSearch();
};

const handleCheckout = async () => {
  if (cartStore.items.length === 0) return;
  
  isProcessing.value = true;
  try {
    const saleData = {
      items: cartStore.items.map(i => ({ 
        productId: i.id, 
        quantity: i.quantity,
        price: i.sellingPrice,
        saleUnit: i.unit,
        saleType: i.saleType
      })),
      discount: cartStore.discount,
      paymentType: paymentType.value,
      customerName: paymentType.value === 'DEFERRED' ? customerName.value : undefined,
      customerPhone: paymentType.value === 'DEFERRED' ? customerPhone.value : undefined,
    };
    
    const res = await api.post('/sales', saleData);
    
    lastSaleReceipt.value = {
      id: res.data.id,
      date: new Date().toLocaleString('ar-IQ'),
      items: cartStore.items.map(i => ({ ...i })),
      subtotal: cartStore.subtotal,
      discount: cartStore.discount,
      total: cartStore.total,
      paymentType: paymentType.value,
      customerName: customerName.value
    };
    
    cartStore.clear();
    isCheckoutModalOpen.value = false;
    toast.success('تمت عملية البيع بنجاح');
  } catch (error: any) {
    toast.error(error.response?.data?.message || 'حدث خطأ أثناء البيع');
  } finally {
    isProcessing.value = false;
  }
};


</script>

<template>
  <div class="flex flex-col h-full gap-6">
    <!-- Top Search Bar -->
    <div class="glass-card flex items-center gap-4 bg-slate-800/80">
      <div class="relative flex-1">
        <Search class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" :size="20" />
        <input 
          ref="searchInput"
          v-model="searchQuery"
          @keyup.enter="handleSearch"
          type="text" 
          placeholder="امسح الباركود أو ابحث عن منتج..."
          class="w-full bg-slate-900 border border-slate-700 text-white rounded-xl py-3 pr-14 pl-4 focus:ring-2 focus:ring-teal-500/50 outline-none transition-all"
        />
      </div>
    </div>

    <div class="flex flex-1 gap-6 overflow-hidden flex-col lg:flex-row">
      <div class="flex-1 glass-card overflow-hidden flex flex-col bg-slate-800/40">
        <div class="text-xl font-bold mb-4 flex items-center gap-2">
          <Package class="text-teal-400" :size="24" />
          <span>المنتجات المتاحة</span>
        </div>
        <div class="flex-1 overflow-y-auto pr-2 pb-2">
          <div class="grid grid-cols-2 xl:grid-cols-3 gap-4">
            <div 
              v-for="p in filteredProducts" 
              :key="p.id"
              class="bg-slate-800/80 border border-slate-700 p-3 rounded-2xl text-right transition-all flex flex-col justify-between min-h-[140px] group relative"
              :class="{'opacity-50 cursor-not-allowed': p.stockQuantity <= 0}"
            >
              <div class="mb-2">
                <h4 class="font-bold text-white transition-colors line-clamp-1 text-sm">{{ p.name }}</h4>
                <div class="flex items-center gap-1 mt-1">
                  <span class="text-[10px] text-slate-500 font-mono">{{ p.barcode }}</span>
                </div>
              </div>

              <div class="flex flex-col gap-2">
                <!-- Retail Button -->
                <button 
                  @click="addToCart({ ...p, saleType: 'مفرد' })"
                  class="flex items-center justify-between bg-teal-500/10 hover:bg-teal-500 text-teal-400 hover:text-white px-2 py-1.5 rounded-lg transition-all text-xs border border-teal-500/20"
                  :disabled="p.stockQuantity <= 0"
                >
                  <span class="font-medium">{{ p.unit }}:</span>
                  <span class="font-bold">{{ p.sellingPrice.toLocaleString() }}</span>
                </button>

                <!-- Wholesale Button -->
                <button 
                  v-if="p.wholesalePrice"
                  @click="addToCart({ ...p, saleType: 'جملة' })"
                  class="flex items-center justify-between bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-white px-2 py-1.5 rounded-lg transition-all text-xs border border-amber-500/20"
                  :disabled="p.stockQuantity <= 0"
                >
                  <span class="font-medium">{{ p.wholesaleUnit || 'جملة' }}:</span>
                  <span class="font-bold">{{ p.wholesalePrice.toLocaleString() }}</span>
                </button>
              </div>

              <div class="mt-2 text-left">
                <span class="text-[9px] text-slate-500">
                  المخزون: {{ p.stockQuantity }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="w-full lg:w-[450px] flex flex-col gap-6">
        <div class="flex-[3] glass-card overflow-hidden flex flex-col bg-slate-800/40">
          <div class="text-xl font-bold mb-4 flex items-center justify-between">
            <span>سلة المشتريات</span>
            <button @click="cartStore.clear()" class="text-sm text-red-400 hover:text-red-300">مسح السلة</button>
          </div>
          <div class="flex-1 overflow-y-auto">
            <table class="w-full text-right">
              <thead class="sticky top-0 bg-slate-800 text-slate-400 text-sm border-b border-slate-700">
                <tr>
                  <th class="py-4 px-4 text-right">المنتج</th>
                  <th class="py-4 px-4 text-center">الكمية</th>
                  <th class="py-4 px-4 text-center">الإجمالي</th>
                  <th class="py-4 px-4"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-700/50">
                <tr v-for="item in cartStore.items" :key="item.id + item.saleType">
                  <td class="py-4 px-4">
                    <div class="flex flex-col">
                      <span class="font-bold">{{ item.name }}</span>
                      <span class="text-[10px] text-slate-500">{{ item.saleType }} — {{ item.unit }}</span>
                    </div>
                  </td>
                  <td class="py-4 px-4 text-center">
                    <div class="flex items-center justify-center gap-2">
                      <button @click="cartStore.updateQuantity(item.id, item.saleType, item.quantity + 1)" class="p-1 hover:bg-slate-700 rounded"><Plus :size="12"/></button>
                      <span>{{ item.quantity }}</span>
                      <button @click="cartStore.updateQuantity(item.id, item.saleType, item.quantity - 1)" class="p-1 hover:bg-slate-700 rounded"><Minus :size="12"/></button>
                    </div>
                  </td>
                  <td class="py-4 px-4 text-center font-bold">{{ (item.sellingPrice * item.quantity).toLocaleString() }}</td>
                  <td class="py-4 px-4 text-center">
                    <button @click="cartStore.removeItem(item.id, item.saleType)" class="text-red-400 hover:text-red-300 transition-colors">
                      <Trash2 :size="18" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="flex-[2] glass-card flex flex-col gap-4 bg-slate-800/60 border-teal-500/20">
          <h2 class="text-xl font-bold">ملخص الفاتورة</h2>
          <div class="flex justify-between items-end">
            <span class="text-base font-semibold text-slate-400">الإجمالي الكلي</span>
            <span class="text-2xl font-extrabold text-teal-400">{{ cartStore.total.toLocaleString() }} د.ع</span>
          </div>
          <button @click="isCheckoutModalOpen = true" :disabled="cartStore.items.length === 0" class="w-full bg-teal-600 py-3 rounded-xl font-bold">دفع</button>
        </div>
      </div>
    </div>

    <!-- Checkout Modal -->
    <BaseModal :show="isCheckoutModalOpen" title="تأكيد البيع" maxWidth="450px" @close="isCheckoutModalOpen = false">
      <div class="space-y-6">
        <div class="flex p-1 bg-slate-900 rounded-xl">
          <button @click="paymentType = 'CASH'" class="flex-1 py-2 rounded-lg transition-all" :class="paymentType === 'CASH' ? 'bg-teal-600' : 'hover:bg-slate-800'">كاش</button>
          <button @click="paymentType = 'DEFERRED'" class="flex-1 py-2 rounded-lg transition-all" :class="paymentType === 'DEFERRED' ? 'bg-amber-600' : 'hover:bg-slate-800'">آجل</button>
        </div>
        <div v-if="paymentType === 'DEFERRED'" class="space-y-4">
          <div class="space-y-1">
            <label class="text-xs text-slate-400 px-1">اختر العميل</label>
            <select v-model="customerName" class="input-field">
              <option value="">-- اختر عميل من القائمة --</option>
              <option v-for="c in customers" :key="c.id" :value="c.personName">
                {{ c.personName }}
              </option>
            </select>
          </div>
          <div class="space-y-1">
            <label class="text-xs text-slate-400 px-1">رقم الهاتف</label>
            <input v-model="customerPhone" type="text" placeholder="رقم الهاتف (تلقائي)" class="input-field" />
          </div>
        </div>
        <button 
          @click="handleCheckout" 
          :disabled="isProcessing"
          class="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-50 py-3 rounded-xl font-bold transition-all transform active:scale-[0.98]"
        >
          {{ isProcessing ? 'جاري المعالجة...' : 'تأكيد العمليّة' }}
        </button>
      </div>
    </BaseModal>

    <!-- Weight Input Modal -->
    <BaseModal :show="isWeightModalOpen" title="إدخال الكمية/المبلغ" maxWidth="400px" @close="isWeightModalOpen = false">
      <div class="text-center mb-4">
        <p class="text-teal-400 font-bold text-lg">{{ selectedProductForWeight?.name }}</p>
      </div>
      <div class="flex p-1 bg-slate-900 rounded-xl mb-6">
        <button @click="amountInput = 0" class="flex-1 py-2 rounded-lg transition-all" :class="amountInput === 0 ? 'bg-teal-600' : 'hover:bg-slate-800'">بالوزن</button>
        <button @click="amountInput = 1000" class="flex-1 py-2 rounded-lg transition-all" :class="amountInput > 0 ? 'bg-teal-600' : 'hover:bg-slate-800'">بالمبلغ</button>
      </div>
      <div v-if="amountInput === 0">
        <input v-model.number="weightInput" type="number" step="0.001" class="w-full bg-slate-900 border-2 border-teal-500/50 text-white text-4xl rounded-2xl py-6 text-center outline-none focus:border-teal-500" autofocus />
        <button @click="confirmWeightAdd" class="w-full mt-4 bg-teal-600 hover:bg-teal-700 py-4 rounded-2xl font-bold text-xl transition-all">إضافة</button>
      </div>
      <div v-else>
        <input v-model.number="amountInput" type="number" class="w-full bg-slate-900 border-2 border-amber-500/50 text-white text-4xl rounded-2xl py-6 text-center outline-none focus:border-amber-500" autofocus />
        <div class="grid grid-cols-3 gap-2 mt-4">
          <button v-for="a in [250, 500, 1000, 1500, 2000, 5000]" :key="a" @click="confirmAmountAdd(a)" class="bg-slate-700 hover:bg-slate-600 py-3 rounded-lg font-bold transition-colors">{{ a }}</button>
        </div>
        <button @click="confirmAmountAdd()" class="w-full mt-4 bg-amber-600 hover:bg-amber-700 py-4 rounded-2xl font-bold text-xl transition-all">إضافة</button>
      </div>
    </BaseModal>

    <!-- Multi-Unit Modal -->
    <BaseModal :show="isMultiModalOpen" title="اختيار وحدة البيع" maxWidth="400px" @close="isMultiModalOpen = false">
      <div class="text-center mb-4">
        <p class="text-teal-400 font-bold text-lg">{{ selectedProductForMulti?.name }}</p>
      </div>
      <div class="flex p-1 bg-slate-900 rounded-xl mb-6">
        <button @click="amountInput = 0" class="flex-1 py-2 rounded-lg transition-all" :class="amountInput === 0 ? 'bg-indigo-600' : 'hover:bg-slate-800'">بالوحدات</button>
        <button @click="amountInput = 1000" class="flex-1 py-2 rounded-lg transition-all" :class="amountInput > 0 ? 'bg-indigo-600' : 'hover:bg-slate-800'">بالمبلغ</button>
      </div>
      <div v-if="amountInput === 0" class="grid gap-4">
        <button v-if="selectedProductForMulti?.masterUnitName" @click="confirmMultiAdd(selectedProductForMulti.masterUnitFactor)" class="bg-slate-700 hover:bg-slate-600 p-4 rounded-xl flex justify-between items-center transition-all group">
          <span class="group-hover:text-teal-400">{{ selectedProductForMulti.masterUnitName }}</span>
          <span class="font-bold text-teal-400">{{ (selectedProductForMulti.sellingPrice * selectedProductForMulti.masterUnitFactor).toLocaleString() }}</span>
        </button>
        <button v-if="selectedProductForMulti?.subUnitName" @click="confirmMultiAdd(selectedProductForMulti.subUnitFactor)" class="bg-slate-700 hover:bg-slate-600 p-4 rounded-xl flex justify-between items-center transition-all group">
          <span class="group-hover:text-teal-400">{{ selectedProductForMulti.subUnitName }}</span>
          <span class="font-bold text-teal-400">{{ (selectedProductForMulti.sellingPrice * selectedProductForMulti.subUnitFactor).toLocaleString() }}</span>
        </button>
        <button @click="confirmMultiAdd(1)" class="bg-slate-700 hover:bg-slate-600 p-4 rounded-xl flex justify-between items-center transition-all group">
          <span class="group-hover:text-teal-400">قطعة مفرد</span>
          <span class="font-bold text-teal-400">{{ selectedProductForMulti?.sellingPrice.toLocaleString() }}</span>
        </button>
      </div>
      <div v-else>
        <input v-model.number="amountInput" type="number" class="w-full bg-slate-900 border-2 border-indigo-500/50 text-white text-4xl rounded-2xl py-6 text-center outline-none focus:border-indigo-500" />
        <div class="grid grid-cols-3 gap-2 mt-4">
          <button v-for="a in [250, 500, 1000, 2000, 5000]" :key="a" @click="confirmAmountAdd(a)" class="bg-slate-700 hover:bg-slate-600 py-3 rounded-lg font-bold transition-colors">{{ a }}</button>
        </div>
      </div>
    </BaseModal>
  </div>
</template>

<style scoped>
@media print {
  * { visibility: hidden; }
  .receipt-print-area, .receipt-print-area * { visibility: visible; }
  .receipt-print-area { position: absolute; left: 0; top: 0; width: 80mm; background: white; }
}
</style>
