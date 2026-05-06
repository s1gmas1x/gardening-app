<template>
  <q-layout view="lHh Lpr lFf">
    <q-header class="app-header" elevated>
      <q-toolbar class="q-px-md q-px-lg-xl">
        <q-toolbar-title class="header-title">Gardening App</q-toolbar-title>
        <div class="text-caption text-weight-medium">Planner foundation on Quasar + Pinia</div>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
</script>

<style scoped>
.app-header {
  background: rgba(36, 51, 34, 0.92);
  color: #f7f3e6;
  backdrop-filter: blur(10px);
}

.header-title {
  font-weight: 700;
  letter-spacing: -0.02em;
}
</style>
