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
  ShoppingBag,
  X
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
  isMultiUnit: boolean;
  subUnitName: string;
  subUnitFactor: number;
  masterUnitName: string;
  masterUnitFactor: number;
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
    wholesaleUnit: '',
    stockQuantity: 0,
    alertQuantity: 5,
    unit: 'قطعة',
    isMultiUnit: false,
    subUnitName: 'طبقة',
    subUnitFactor: 30,
    masterUnitName: 'كارتون',
    masterUnitFactor: 360
  };
  calcCartons.value = 0;
  calcTrays.value = 0;
  calcPieces.value = 0;
  isModalOpen.value = true;
};

const calcCartons = ref(0);
const calcTrays = ref(0);
const calcPieces = ref(0);
const cartonPurchasePrice = ref(0);
const cartonSellingPrice = ref(0);

const updatePiecePrices = () => {
  const mFactor = editingProduct.value?.masterUnitFactor || 360;
  if (cartonPurchasePrice.value > 0) {
    editingProduct.value!.purchasePrice = cartonPurchasePrice.value / mFactor;
  }
  if (cartonSellingPrice.value > 0) {
    editingProduct.value!.sellingPrice = cartonSellingPrice.value / mFactor;
  }
};

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
              {{ products.filter(p => p.stockQuantity <= p.alertQuantity).length }}
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
                  :class="p.stockQuantity <= p.alertQuantity ? 'bg-red-500/10 text-red-400' : 'bg-teal-500/10 text-teal-400'"
                >
                  <AlertTriangle v-if="p.stockQuantity <= p.alertQuantity" :size="12" />
                  {{ p.stockQuantity }} {{ p.unit === 'KG' ? 'كغم' : 'قطعة' }}
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

    <!-- Add/Edit Modal -->
    <BaseModal 
      :show="isModalOpen" 
      :title="editingProduct?.id ? 'تعديل منتج' : 'إضافة منتج جديد'" 
      maxWidth="600px" 
      @close="isModalOpen = false"
    >
      <div class="grid grid-cols-4 gap-4">
        <div class="col-span-2">
          <label class="block text-sm text-slate-400 mb-1">اسم المادة</label>
          <input v-model="editingProduct!.name" type="text" class="input-field" placeholder="مثال: بيض، جكاير..." />
        </div>
        <div>
          <label class="block text-sm text-slate-400 mb-1">وحدة المفرد</label>
          <input v-model="editingProduct!.unit" type="text" class="input-field" placeholder="مثال: طبقة، تكة" />
        </div>
        <div>
          <label class="block text-sm text-slate-400 mb-1">سعر المفرد (د.ع)</label>
          <input v-model.number="editingProduct!.sellingPrice" type="number" class="input-field" />
        </div>
        
        <div class="col-span-1">
          <label class="block text-sm text-slate-400 mb-1">سعر الجملة (د.ع)</label>
          <input v-model.number="editingProduct!.wholesalePrice" type="number" class="input-field" />
        </div>
        <div class="col-span-3">
          <label class="block text-sm text-slate-400 mb-1">وحدة الجملة (اختياري)</label>
          <input v-model="editingProduct!.wholesaleUnit" type="text" class="input-field" placeholder="مثال: كارتون، علبة" />
        </div>
        <div class="flex items-end">
          <button @click="saveProduct" class="btn btn-primary w-full h-[42px] flex items-center justify-center gap-2">
            <Plus :size="18" />
            {{ editingProduct?.id ? 'تعديل' : 'إضافة المادة' }}
          </button>
        </div>

        <div class="col-span-2">
          <label class="block text-sm text-slate-400 mb-1">الباركود</label>
          <input v-model="editingProduct!.barcode" type="text" class="input-field" placeholder="123456789" />
        </div>
        <div>
          <label class="block text-sm text-slate-400 mb-1">الكمية الحالية</label>
          <input v-model.number="editingProduct!.stockQuantity" type="number" class="input-field" />
        </div>
        <div>
          <label class="block text-sm text-slate-400 mb-1">سعر الشراء</label>
          <input v-model.number="editingProduct!.purchasePrice" type="number" class="input-field" />
        </div>
        <div>
          <label class="block text-sm text-slate-400 mb-1">حد التنبيه</label>
          <input v-model.number="editingProduct!.alertQuantity" type="number" step="0.01" class="input-field" />
        </div>

        <!-- Stock Helper for Multi-Unit (Optional - keeping it for now but simplified) -->
        <div v-if="editingProduct!.isMultiUnit" class="col-span-4 bg-teal-500/5 p-4 rounded-xl border border-teal-500/20">
          <label class="block text-xs font-bold text-teal-400 mb-2">مساعد حساب المخزون</label>
          <div class="grid grid-cols-3 gap-2">
            <div>
              <label class="text-[10px] text-slate-500">عدد ال{{ editingProduct!.masterUnitName }}</label>
              <input type="number" @input="updateTotalStock" v-model="calcCartons" class="input-field text-xs" placeholder="0" />
            </div>
            <div>
              <label class="text-[10px] text-slate-500">عدد ال{{ editingProduct!.subUnitName }}</label>
              <input type="number" @input="updateTotalStock" v-model="calcTrays" class="input-field text-xs" placeholder="0" />
            </div>
            <div>
              <label class="text-[10px] text-slate-500">عدد المفرد</label>
              <input type="number" @input="updateTotalStock" v-model="calcPieces" class="input-field text-xs" placeholder="0" />
            </div>
          </div>
        </div>
      </div>

    </BaseModal>
  </div>
</template>
