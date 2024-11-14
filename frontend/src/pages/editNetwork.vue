<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { getRoutePath, getPageLabel } from '@/utils/PageRouter';

import Dropdown from '@/components/Dropdown.vue';

const __DEBUG__ = import.meta.env.VITE_APP_DEBUG === 'true';

const router = useRouter();

</script>

<template>
    <div class="container">
        <div class="row">
            <div class="col-12">
                <h1>Edit Network</h1>
            </div>
        </div>
        <div class="row">
            <div class="col-12">
                <Dropdown />
            </div>
        </div>
    </div>
