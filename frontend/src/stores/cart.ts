import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export interface CartItem {
  id: number;
  name: string;
  barcode: string;
  sellingPrice: number;
  quantity: number;
  stockQuantity: number;
  unit: string;
  saleType: string; // 'مفرد' or 'جملة'
  type: 'SALE' | 'RETURN';
}

export const useCartStore = defineStore('cart', () => {
  const items = ref<CartItem[]>([]);
  const discount = ref(0);

  const subtotal = computed(() => {
    return Math.round(items.value.reduce((sum, item) => {
      const itemTotal = item.sellingPrice * item.quantity;
      return item.type === 'RETURN' ? sum - itemTotal : sum + itemTotal;
    }, 0));
  });

  const total = computed(() => {
    return subtotal.value - discount.value;
  });

  function addItem(product: any) {
    const saleType = product.saleType || 'مفرد';
    const itemType = product.type || 'SALE';
    const salePrice = product.customPrice || (saleType === 'جملة' ? (product.wholesalePrice || product.sellingPrice) : product.sellingPrice);
    const saleUnit = product.customUnit || (saleType === 'جملة' ? (product.wholesaleUnit || product.unit) : product.unit);
    
    const existing = items.value.find((i) => i.id === product.id && i.saleType === saleType && i.type === itemType);
    const addQty = product.quantity || 1;
    
    if (existing) {
      existing.quantity += addQty;
    } else {
      items.value.push({
        id: product.id,
        name: product.name,
        barcode: product.barcode,
        sellingPrice: Number(String(salePrice).replace(/[.,]/g, '')) || 0,
        quantity: addQty,
        stockQuantity: product.stockQuantity,
        unit: saleUnit || 'قطعة',
        saleType: saleType,
        type: itemType,
      });
    }
  }

  function updateQuantity(id: number, saleType: string, type: 'SALE' | 'RETURN', qty: number) {
    const item = items.value.find((i) => i.id === id && i.saleType === saleType && i.type === type);
    if (item) {
      if (qty < 1) qty = 1;
      item.quantity = qty;
    }
  }

  function removeItem(id: number, saleType: string, type: 'SALE' | 'RETURN') {
    items.value = items.value.filter((i) => !(i.id === id && i.saleType === saleType && i.type === type));
  }

  function clear() {
    items.value = [];
    discount.value = 0;
  }

  return {
    items,
    discount,
    subtotal,
    total,
    addItem,
    updateQuantity,
    removeItem,
    clear,
  };
});
