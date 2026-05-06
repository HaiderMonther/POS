<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { toast } from 'vue3-toastify';
import api from '../api';
import BaseModal from '../components/BaseModal.vue';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  AlertTriangle,
  ShoppingBag
} from 'lucide-vue-next';

interface Product {
  id: number;
  name: string;
  barcode: string;
  purchasePrice: number;
  sellingPrice: number;
  wholesalePrice: number;
  wholesaleUnit: string;
  stockQuantity: number;
  alertQuantity: number;
  unit: string;
  unitType: 'numeric' | 'weight' | 'volume';
  isMultiUnit: boolean;
  subUnitName: string;
  subUnitFactor: number;
  masterUnitName: string;
  masterUnitFactor: number;
  conversionFactor: number;
  purchasePriceUnit: 'retail' | 'wholesale';
  alertQuantityUnit: 'retail' | 'wholesale';
}

const products = ref<Product[]>([]);
const searchQuery = ref('');
const isModalOpen = ref(false);
const editingProduct = ref<Partial<Product> | null>(null);
const isLoading = ref(true);

const fetchProducts = async () => {
  isLoading.value = true;
  try {
    const res = await api.get('/products');
    products.value = res.data;
  } catch (error) {
    console.error('Error fetching products');
  } finally {
    isLoading.value = false;
  }
};

onMounted(fetchProducts);

const filteredProducts = computed(() => {
  return products.value.filter(p => 
    p.name.toLowerCase().includes(searchQuery.value.toLowerCase()) || 
    p.barcode.includes(searchQuery.value)
  );
});

const openModal = (product?: Product) => {
  editingProduct.value = product ? { ...product } : {
    name: '',
    barcode: '',
    purchasePrice: 0,
    sellingPrice: 0,
    wholesalePrice: 0,
    wholesaleUnit: 'علبة',
    stockQuantity: 0,
    alertQuantity: 5,
    unit: 'قطعة',
    unitType: 'numeric',
    isMultiUnit: false,
    subUnitName: 'طبقة',
    subUnitFactor: 30,
    masterUnitName: 'كارتون',
    masterUnitFactor: 360,
    conversionFactor: 12,
    purchasePriceUnit: 'retail',
    alertQuantityUnit: 'retail'
  };
  calcCartons.value = 0;
  calcTrays.value = 0;
  calcPieces.value = 0;
  isModalOpen.value = true;
};

const parsePrice = (val: any): number => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  const clean = String(val).replace(/[.,]/g, '');
  return parseInt(clean) || 0;
};

const costPerPiece = computed(() => {
  if (!editingProduct.value) return 0;
  const price = parsePrice(editingProduct.value.purchasePrice);
  if (editingProduct.value.purchasePriceUnit === 'wholesale') {
    return price / (editingProduct.value.conversionFactor || 1);
  }
  return price;
});

const costOfWholesaleUnit = computed(() => {
  if (!editingProduct.value) return 0;
  const price = parsePrice(editingProduct.value.purchasePrice);
  if (editingProduct.value.purchasePriceUnit === 'retail') {
    return price * (editingProduct.value.conversionFactor || 1);
  }
  return price;
});

const profitMargin = computed(() => {
  if (!editingProduct.value || costPerPiece.value === 0) return 0;
  const sellingPrice = parsePrice(editingProduct.value.sellingPrice);
  const margin = ((sellingPrice - costPerPiece.value) / costPerPiece.value) * 100;
  return isNaN(margin) ? 0 : Math.round(margin);
});

const wholesaleProfitMargin = computed(() => {
  if (!editingProduct.value || costOfWholesaleUnit.value === 0 || !editingProduct.value.wholesalePrice) return 0;
  const sellingPrice = parsePrice(editingProduct.value.wholesalePrice);
  const margin = ((sellingPrice - costOfWholesaleUnit.value) / costOfWholesaleUnit.value) * 100;
  return isNaN(margin) ? 0 : Math.round(margin);
});

const transferToStock = () => {
  if (!editingProduct.value) return;
  const total = (Number(calcCartons.value) * (editingProduct.value.conversionFactor || 1)) + 
                (Number(calcTrays.value) * (editingProduct.value.subUnitFactor || 1)) + 
                Number(calcPieces.value);
  editingProduct.value.stockQuantity = total;
};

const calcCartons = ref(0);
const calcTrays = ref(0);
const calcPieces = ref(0);




const updateTotalStock = () => {
  const mFactor = editingProduct.value?.masterUnitFactor || 1;
  const sFactor = editingProduct.value?.subUnitFactor || 1;
  editingProduct.value!.stockQuantity = 
    (Number(calcCartons.value) * mFactor) + 
    (Number(calcTrays.value) * sFactor) + 
    Number(calcPieces.value);
};

const saveProduct = async () => {
  try {
    const { id, createdAt, updatedAt, ...payload } = editingProduct.value as any;
    
    payload.purchasePrice = parsePrice(payload.purchasePrice);
    payload.sellingPrice = parsePrice(payload.sellingPrice);
    if (payload.wholesalePrice) {
      payload.wholesalePrice = parsePrice(payload.wholesalePrice);
    }

    if (editingProduct.value?.id) {
      await api.patch(`/products/${editingProduct.value.id}`, payload);
    } else {
      await api.post('/products', payload);
    }
    await fetchProducts();
    isModalOpen.value = false;
    toast.success('تم حفظ المنتج بنجاح');
  } catch (error: any) {
    toast.error(error.response?.data?.message || 'خطأ في حفظ المنتج');
  }
};

const deleteProduct = async (id: number) => {
  if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
  try {
    await api.delete(`/products/${id}`);
    await fetchProducts();
    toast.success('تم حذف المنتج');
  } catch (error) {
    toast.error('حدث خطأ أثناء الحذف');
    console.error('Error deleting product');
  }
};
</script>

<template>
  <div class="flex flex-col gap-6 animate-in">
    <!-- Header Actions -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div class="relative max-w-sm w-full">
        <Search class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" :size="18" />
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="إبحث عن منتج برمز الباركود أو الإسم..."
          class="input-field pr-12"
        />
      </div>
      <button @click="openModal()" class="btn btn-primary flex items-center gap-2 px-6 shadow-lg shadow-teal-900/20">
        <Plus :size="20" />
        إضافة منتج جديد
      </button>
    </div>

    <!-- Product Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="glass-card bg-slate-800/40 p-4 border-l-4 border-teal-500">
        <div class="flex items-center gap-3">
          <ShoppingBag class="text-teal-400" :size="24" />
          <div>
            <div class="text-slate-400 text-sm">إجمالي الأصناف</div>
            <div class="text-2xl font-bold">{{ products.length }}</div>
          </div>
        </div>
      </div>
      <div class="glass-card bg-slate-800/40 p-4 border-l-4 border-amber-500">
        <div class="flex items-center gap-3">
          <AlertTriangle class="text-amber-500" :size="24" />
          <div>
            <div class="text-slate-400 text-sm">نواقص المخزون</div>
            <div class="text-2xl font-bold text-amber-500">
              {{ products.filter(p => {
                const limit = p.alertQuantityUnit === 'wholesale' ? p.alertQuantity * (p.conversionFactor || 1) : p.alertQuantity;
                return p.stockQuantity <= limit;
              }).length }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Products Table -->
    <div class="glass-card overflow-hidden bg-slate-800/30 p-0 border-slate-700/50">
      <div class="overflow-x-auto">
        <table class="w-full text-right">
          <thead class="bg-slate-900/50 text-slate-400 text-sm uppercase tracking-wider border-b border-slate-700">
            <tr>
              <th class="py-4 px-6 font-semibold">المعلومات</th>
              <th class="py-4 px-6 font-semibold">الباركود</th>
              <th class="py-4 px-6 font-semibold">سعر الشراء</th>
              <th class="py-4 px-6 font-semibold">سعر البيع</th>
              <th class="py-4 px-6 font-semibold">الكمية</th>
              <th class="py-4 px-6 font-semibold text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-700/50">
            <tr 
              v-for="p in filteredProducts" 
              :key="p.id" 
              class="hover:bg-slate-700/20 transition-all group"
            >
              <td class="py-4 px-6">
                <div class="flex flex-col">
                  <span class="font-bold text-white group-hover:text-teal-400 transition-colors">{{ p.name }}</span>
                  <span class="text-[10px] text-slate-500">مفرد: {{ p.unit }} | جملة: {{ p.wholesaleUnit || '-' }}</span>
                </div>
              </td>
              <td class="py-4 px-6 font-mono text-sm text-slate-400">{{ p.barcode }}</td>
              <td class="py-4 px-6 text-slate-300">{{ p.purchasePrice.toLocaleString() }} د.ع</td>
              <td class="py-4 px-6">
                <div class="flex flex-col gap-1">
                  <span class="font-bold text-teal-400 text-sm">مفرد: {{ p.sellingPrice.toLocaleString() }} د.ع</span>
                  <span v-if="p.wholesalePrice" class="font-bold text-amber-500 text-[11px]">جملة: {{ p.wholesalePrice.toLocaleString() }} د.ع</span>
                </div>
              </td>
              <td class="py-4 px-6">
                <div 
                  class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold"
                  :class="p.stockQuantity <= (p.alertQuantityUnit === 'wholesale' ? p.alertQuantity * (p.conversionFactor || 1) : p.alertQuantity) ? 'bg-red-500/10 text-red-400' : 'bg-teal-500/10 text-teal-400'"
                >
                  <AlertTriangle v-if="p.stockQuantity <= (p.alertQuantityUnit === 'wholesale' ? p.alertQuantity * (p.conversionFactor || 1) : p.alertQuantity)" :size="12" />
                  {{ p.stockQuantity }} {{ p.unitType === 'weight' ? 'كغم' : (p.unitType === 'volume' ? 'لتر' : 'قطعة') }}
                </div>
              </td>
              <td class="py-4 px-6">
                <div class="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button @click="openModal(p)" class="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300">
                    <Edit2 :size="16" />
                  </button>
                  <button @click="deleteProduct(p.id)" class="p-2 bg-red-900/20 hover:bg-red-900/40 rounded-lg text-red-400">
                    <Trash2 :size="16" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="filteredProducts.length === 0" class="p-12 text-center text-slate-500">
          لا توجد بيانات متاحة
        </div>
      </div>
    </div>

    <!-- Add/Edit Modal (Enhanced) -->
    <BaseModal 
      :show="isModalOpen" 
      :title="editingProduct?.id ? 'تعديل منتج' : 'إضافة منتج جديد'" 
      maxWidth="650px" 
      @close="isModalOpen = false"
    >
      <div class="space-y-6 max-h-[85vh] overflow-y-auto px-2 custom-scrollbar">
        <!-- Section 1: Identification -->
        <div class="space-y-3">
          <div class="flex items-center gap-2 mb-1">
            <span class="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold">1</span>
            <h3 class="text-sm font-bold text-slate-300">المعلومات التعريفية</h3>
            <span class="text-[10px] bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded-full">أساسي</span>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs text-slate-400 mb-1.5">اسم المادة</label>
              <input v-model="editingProduct!.name" type="text" class="input-field" placeholder="مثال: علبة حليب، كيس رز..." />
            </div>
            <div>
              <label class="block text-xs text-slate-400 mb-1.5">الباركود</label>
              <input v-model="editingProduct!.barcode" type="text" class="input-field" placeholder="123456789" />
              <p class="text-[10px] text-slate-500 mt-1">إذا لا يوجد باركود، اكتب رقماً تسلسلياً</p>
            </div>
          </div>
        </div>

        <!-- Section 2: Unit Type -->
        <div class="space-y-3">
          <div class="flex items-center gap-2 mb-1">
            <span class="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold">2</span>
            <h3 class="text-sm font-bold text-slate-300">نوع الوحدة</h3>
            <span class="text-[10px] bg-indigo-500/20 text-indigo-500 px-2 py-0.5 rounded-full">جديد — يحدد طريقة الحساب</span>
          </div>
          <div class="grid grid-cols-3 gap-2">
            <button 
              @click="editingProduct!.unitType = 'numeric'"
              :class="editingProduct!.unitType === 'numeric' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'"
              class="py-2.5 rounded-xl text-xs font-bold transition-all border border-slate-700/50"
            >
              عددي (قطعة، كيس، علبة)
            </button>
            <button 
              @click="editingProduct!.unitType = 'weight'"
              :class="editingProduct!.unitType === 'weight' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'"
              class="py-2.5 rounded-xl text-xs font-bold transition-all border border-slate-700/50"
            >
              وزن (كيلو، غرام)
            </button>
            <button 
              @click="editingProduct!.unitType = 'volume'"
              :class="editingProduct!.unitType === 'volume' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'"
              class="py-2.5 rounded-xl text-xs font-bold transition-all border border-slate-700/50"
            >
              حجم (لتر، مل)
            </button>
          </div>
          <p class="text-[11px] text-slate-400 italic">
            {{ editingProduct!.unitType === 'numeric' ? 'المواد العددية تُحسب بعدد القطع الصحيح فقط — لا يمكن بيع نصف قطعة' : 'المواد الوزنية/الحجمية تسمح بالكسور عند البيع' }}
          </p>
        </div>

        <!-- Section 3: Prices and Units -->
        <div class="space-y-3">
          <div class="flex items-center gap-2 mb-1">
            <span class="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold">3</span>
            <h3 class="text-sm font-bold text-slate-300">الأسعار والوحدات</h3>
            <span class="text-[10px] bg-emerald-500/20 text-emerald-500 px-2 py-0.5 rounded-full">أساسي</span>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-3">
              <div>
                <label class="block text-xs text-slate-400 mb-1.5">سعر المفرد (د.ع)</label>
                <input v-model="editingProduct!.sellingPrice" type="text" class="input-field" placeholder="62500" />
                <p class="text-[10px] text-slate-500 mt-1">السعر الذي تبيعه للزبون بالقطعة</p>
              </div>
              <div>
                <label class="block text-xs text-slate-400 mb-1.5">وحدة المفرد</label>
                <input v-model="editingProduct!.unit" type="text" class="input-field" placeholder="قطعة" />
              </div>
            </div>
            <div class="space-y-3">
              <div>
                <label class="block text-xs text-slate-400 mb-1.5">سعر الجملة (د.ع) (اختياري)</label>
                <input v-model="editingProduct!.wholesalePrice" type="text" class="input-field" placeholder="3000" />
              </div>
              <div>
                <label class="block text-xs text-slate-400 mb-1.5">وحدة الجملة (اختياري)</label>
                <input v-model="editingProduct!.wholesaleUnit" type="text" class="input-field" placeholder="علبة" />
              </div>
            </div>
          </div>

          <!-- Conversion Factor Box -->
          <div class="bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-4 flex items-center justify-between">
            <div class="space-y-1">
              <h4 class="text-[11px] font-bold text-indigo-400">معامل التحويل بين المفرد والجملة</h4>
              <p class="text-[10px] text-indigo-300/70">النظام يستخدم هذا الرقم لتحديث المخزون تلقائياً عند البيع بالجملة</p>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-xs text-slate-300">1 {{ editingProduct!.wholesaleUnit || 'جملة' }}</span>
              <div class="relative">
                <input v-model.number="editingProduct!.conversionFactor" type="number" class="w-16 bg-slate-900 border border-indigo-500/50 rounded-lg py-1 text-center text-sm font-bold text-white focus:ring-1 focus:ring-indigo-500 outline-none" />
              </div>
              <span class="text-xs text-slate-300">{{ editingProduct!.unit || 'مفرد' }}</span>
            </div>
          </div>
        </div>

        <!-- Section 4: Purchase and Stock -->
        <div class="space-y-4">
          <div class="flex items-center gap-2 mb-1">
            <span class="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold">4</span>
            <h3 class="text-sm font-bold text-slate-300">الشراء والمخزون</h3>
            <span class="text-[10px] bg-rose-500/20 text-rose-500 px-2 py-0.5 rounded-full">أساسي</span>
          </div>

          <div class="grid grid-cols-1 gap-4">
            <div>
              <label class="block text-xs text-slate-400 mb-1.5">سعر الشراء (د.ع)</label>
              <div class="flex gap-2">
                <select v-model="editingProduct!.purchasePriceUnit" class="bg-slate-800 border border-slate-700 rounded-xl px-2 text-xs text-slate-300 outline-none focus:ring-1 focus:ring-indigo-500">
                  <option value="retail">{{ editingProduct!.unit }} (مفرد)</option>
                  <option value="wholesale">{{ editingProduct!.wholesaleUnit }} (جملة)</option>
                </select>
                <input v-model="editingProduct!.purchasePrice" type="text" class="input-field flex-1" placeholder="60000" />
              </div>
              <p class="text-[11px] font-bold text-slate-500 mt-2">سعر الشراء — يُستخدم لحساب الأرباح</p>
            </div>

            <!-- Margin Info Box -->
            <div class="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 space-y-4">
              <div class="flex items-center justify-between text-[11px] text-slate-400">
                <span class="font-bold text-indigo-400">تحليل الأرباح المتوقعة</span>
              </div>
              
              <!-- Retail Margin -->
              <div class="flex items-end justify-between border-b border-slate-800 pb-3">
                <div class="flex gap-6">
                  <div>
                    <div class="text-[10px] text-slate-500 mb-1">تكلفة القطعة:</div>
                    <div class="text-sm font-bold text-emerald-400">{{ costPerPiece.toLocaleString() }} د.ع</div>
                  </div>
                  <div>
                    <div class="text-[10px] text-slate-500 mb-1">ربح المفرد:</div>
                    <div class="text-sm font-bold text-emerald-400">{{ (parsePrice(editingProduct?.sellingPrice) - costPerPiece).toLocaleString() }} د.ع</div>
                  </div>
                </div>
                <div class="flex flex-col items-end">
                  <span class="text-[9px] text-slate-500 mb-1">هامش المفرد</span>
                  <div class="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-xs font-bold">
                    {{ profitMargin }}%
                  </div>
                </div>
              </div>

              <!-- Wholesale Margin -->
              <div v-if="editingProduct?.wholesalePrice" class="flex items-end justify-between pt-1">
                <div class="flex gap-6">
                  <div>
                    <div class="text-[10px] text-slate-500 mb-1">تكلفة الجملة ({{ editingProduct.wholesaleUnit }}):</div>
                    <div class="text-sm font-bold text-amber-500">{{ costOfWholesaleUnit.toLocaleString() }} د.ع</div>
                  </div>
                  <div>
                    <div class="text-[10px] text-slate-500 mb-1">ربح الجملة:</div>
                    <div class="text-sm font-bold text-amber-500">{{ (parsePrice(editingProduct?.wholesalePrice) - costOfWholesaleUnit).toLocaleString() }} د.ع</div>
                  </div>
                </div>
                <div class="flex flex-col items-end">
                  <span class="text-[9px] text-slate-500 mb-1">هامش الجملة</span>
                  <div class="px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-500 text-xs font-bold">
                    {{ wholesaleProfitMargin }}%
                  </div>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs text-slate-400 mb-1.5">الكمية الحالية</label>
                <input v-model.number="editingProduct!.stockQuantity" type="number" class="input-field" placeholder="150" />
              </div>
              <div>
                <label class="block text-xs text-slate-400 mb-1.5">حد التنبيه</label>
                <div class="flex gap-2">
                  <select v-model="editingProduct!.alertQuantityUnit" class="bg-slate-800 border border-slate-700 rounded-xl px-2 text-xs text-slate-300 outline-none focus:ring-1 focus:ring-indigo-500">
                    <option value="retail">مفرد</option>
                    <option value="wholesale">جملة</option>
                  </select>
                  <input v-model.number="editingProduct!.alertQuantity" type="number" class="input-field flex-1" placeholder="5" />
                </div>
              </div>
            </div>
            <p class="text-[11px] text-slate-400 italic text-center">
              يتحول لون الكمية للأحمر عند الوصول لحد التنبيه — تأكد من اختيار الوحدة الصحيحة (مفرد أو جملة)
            </p>
          </div>
        </div>

        <!-- Section 5: Calculator -->
        <div class="space-y-4">
          <div class="flex items-center gap-2 mb-1">
            <span class="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold">5</span>
            <h3 class="text-sm font-bold text-slate-300">حاسبة الكميات</h3>
            <span class="text-[10px] bg-teal-500/20 text-teal-500 px-2 py-0.5 rounded-full">اختياري</span>
          </div>

          <div class="bg-slate-900/50 border border-slate-700/50 rounded-2xl p-5 space-y-4">
            <p class="text-[11px] text-slate-400">إذا وصلت بضاعة جديدة، اكتب الكميات وسيحسب النظام الإجمالي</p>
            <div class="grid grid-cols-7 items-center gap-2 text-center">
              <div class="col-span-2">
                <label class="text-[10px] text-slate-500 block mb-1">كراتين</label>
                <input v-model.number="calcCartons" type="number" class="input-field text-center text-sm" />
              </div>
              <div class="text-slate-500">×</div>
              <div class="col-span-1">
                <label class="text-[10px] text-slate-500 block mb-1">{{ editingProduct!.unit }}/{{ editingProduct!.wholesaleUnit }}</label>
                <input v-model.number="editingProduct!.conversionFactor" type="number" class="input-field text-center text-sm" />
              </div>
              <div class="text-slate-500">+</div>
              <div class="col-span-2">
                <label class="text-[10px] text-slate-500 block mb-1">قطع مفردة</label>
                <input v-model.number="calcPieces" type="number" class="input-field text-center text-sm" />
              </div>
            </div>

            <div class="flex items-center justify-between pt-2">
              <div class="flex items-center gap-4">
                <span class="text-xs text-slate-400">الإجمالي:</span>
                <div class="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 font-bold">
                  {{ (calcCartons * editingProduct!.conversionFactor) + calcPieces }} قطعة
                </div>
              </div>
              <button @click="transferToStock" class="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-[11px] font-bold text-slate-200 transition-colors">
                نقل للكمية الحالية
              </button>
            </div>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="flex gap-3 pt-4 sticky bottom-0 bg-slate-900 py-4 border-t border-slate-800">
          <button @click="saveProduct" class="btn btn-primary flex-1 py-3 shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2">
            <Plus v-if="!editingProduct?.id" :size="20" />
            <Edit2 v-else :size="20" />
            {{ editingProduct?.id ? 'تعديل المادة' : 'إضافة المادة للمخزن' }}
          </button>
          <button @click="isModalOpen = false" class="px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 font-bold transition-all">
            إلغاء
          </button>
        </div>
      </div>
    </BaseModal>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(15, 23, 42, 0.1);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(71, 85, 105, 0.4);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(99, 102, 241, 0.5);
}

.input-field {
  @apply w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all;
}

.animate-in {
  animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: left 0.75rem center;
  background-size: 1rem;
  padding-left: 2.5rem !important;
}
</style>
