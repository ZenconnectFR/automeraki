<script setup lang="ts">
import { ref, onMounted } from 'vue'

import { useIdsStore } from '@/stores/ids'
import { useConfigurationStore } from '@/stores/configuration';

import { useRouter, useRoute } from 'vue-router'

import Button from 'primevue/button'
import { Divider } from 'primevue';

const router = useRouter()
const route = useRoute()

const ids = useIdsStore()
const configuration = useConfigurationStore()

const goToManage = () => {
    router.push('/manage')
}

const goToConfig = () => {
    router.push('/setup')
}

const goToEdit = () => {
    router.push('/edit-network')
}

</script>

<template>
    <div class="col home">
        <h1>Home</h1>
        <Divider />
        <!-- Button @click="goToManage" label="Manage templates" /-->
        <Button class="button" @click="goToConfig" label="Configure a network" />
    </div>
</template>

<style scoped>
.button {
    margin: 10px;
}

.home {
    display: flex;
    flex-direction: column;
    height: 100%;
    position: fixed;
    top: 100px;
}
</style>
