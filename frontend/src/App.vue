<script setup lang="ts">
// App entry point simply renders the matched route component
</script>

<template>
  <router-view />
</template>

<style>
/* Global smooth scroll and transitions */
html {
  scroll-behavior: smooth;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
