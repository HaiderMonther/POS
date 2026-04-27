<script setup lang="ts">
import { X } from 'lucide-vue-next';

defineProps<{
  show: boolean;
  title?: string;
  maxWidth?: string;
}>();

const emit = defineEmits(['close']);

const close = () => {
  emit('close');
};
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-md" @click="close"></div>
        
        <!-- Modal Card -->
        <div 
          class="glass-card w-full relative z-10 bg-slate-800 border-teal-500/30 overflow-hidden flex flex-col max-h-[90vh]"
          :style="{ maxWidth: maxWidth || '500px' }"
          @click.stop
        >
          <!-- Header -->
          <div class="flex justify-between items-center mb-6 sticky top-0 bg-slate-800/80 backdrop-blur-sm z-10">
            <div>
              <h3 v-if="title" class="text-xl font-bold">{{ title }}</h3>
              <slot name="header"></slot>
            </div>
            <button @click="close" class="text-slate-400 hover:text-white transition-colors p-1 hover:bg-slate-700 rounded-lg">
              <X :size="20" />
            </button>
          </div>

          <!-- Content -->
          <div class="flex-1 overflow-y-auto">
            <slot></slot>
          </div>

          <!-- Footer -->
          <div v-if="$slots.footer" class="mt-6 pt-4 border-t border-slate-700/50">
            <slot name="footer"></slot>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .glass-card {
  transform: scale(0.9) translateY(20px);
  opacity: 0;
}

.modal-leave-to .glass-card {
  transform: scale(0.95);
  opacity: 0;
}

.glass-card {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
</style>
