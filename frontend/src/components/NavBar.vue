<template>
    <nav v-if="availablePages.length > 0">
        <ul>
            <li>
                <button @click="backHome()">Home</button>
            </li>
            <li v-for="(page, index) in availablePages" :key="index">
                <button @click="goToPage(index)" :class="{ active: isCurrentPage(index)}">{{ getPageLabel(page.type) }}</button>
            </li>
        </ul>
    </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useConfigurationStore } from '@/stores/configuration';
import { getRoutePath, getPageLabel } from '@/utils/PageRouter';

const configStore = useConfigurationStore();
const router = useRouter();

const { configuration, currentPageIndex, currentPageConfig } = storeToRefs(configStore);

const availablePages = computed(() => {
    return configuration.value?.actions?.filter((action: { type: string; }) => action.type !== 'setup' && action.type !== 'claim') || [];
});

const isCurrentPage = (index: number) => {
    return index === currentPageIndex.value;
};

const goToPage = (index: number) => {
    console.log('goToPage', index);
    console.log('availablePages', availablePages.value);
    configStore.setCurrentPageIndex(index);
    configStore.setCurrentPageConfig(availablePages.value[index].data);
    console.log('currentPageIndex', currentPageIndex.value);
    console.log('currentPageConfig', currentPageConfig.value);
    router.push(getRoutePath(availablePages.value[index].type));
};

const backHome = () => {
    // empty configuration
    configStore.setConfiguration(null);
    router.push('/');
};

</script>

<style scoped>
nav ul {
    display: flex;
    list-style-type: none;
    gap: 1rem;
    margin-bottom: 20px;
}

nav li {
    display: inline-block;
}

.active {
    font-weight: bold;
    text-decoration: underline;
}
</style>
