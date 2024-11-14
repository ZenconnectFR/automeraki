<template>
    <button v-if="availablePages.length > 0" id="homebtn" @click="backHome">Home</button>
    <div class="stepper-container">
        <div v-for="(page, index) in availablePages" :key="index" class="stepper-item">
            <div class="stepper-label">
                {{ getPageLabel(page.type) }}
            </div>
            <div class="stepper-content">
                <div :class="['step-circle', getCircleClass(index)]" @click="__DEBUG__ ? goToPage(index) : null"
                 :style="{ cursor: __DEBUG__ ? 'pointer': 'default'}">
                    {{ index + 1 }}
                </div>
                <div v-if="index < availablePages.length - 1" :class="['step-line', getLineClass(index)]"></div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useConfigurationStore } from '@/stores/configuration';
import { getRoutePath, getPageLabel } from '@/utils/PageRouter';

const __DEBUG__ = import.meta.env.VITE_APP_DEBUG === 'true';
const configStore = useConfigurationStore();
const router = useRouter();

const { configuration, currentPageIndex, currentPageConfig } = storeToRefs(configStore);

const availablePages = computed(() => {
    return configuration.value?.actions?.filter((action: { type: string; }) => action.type !== 'setup' && action.type !== 'claim') || [];
});

const isCurrentPage = (index: number) => {
    return index <= currentPageIndex.value;
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

const getCircleClass = (index: number) => {
    if (currentPageIndex.value === index) {
        return 'step-circle-active';
    } else if (index < currentPageIndex.value) {
        return 'step-circle-done';
    } else {
        return 'step-circle';
    }
};

const getLineClass = (index: number) => {
    if (index < currentPageIndex.value) {
        return 'step-line-done';
    } else {
        return 'step-line';
    }
};

</script>

<style scoped>

#homebtn {
    background-color: rgb(224, 224, 224);
    border: none;
    padding: 5px 10px;
    text-align: center;
    text-decoration: none;
    display: inline-block;
    font-size: 16px;
    cursor: pointer;
    border-radius: 5px;
}

#homebtn:hover {
    background-color: #9aacff;
}

.stepper-container {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-top: 20px;
}

.stepper-item {
    display: flex;
    align-items: center;
    flex-direction: column;
}

.stepper-label {
    font-size: 14px;
    margin-bottom: 8px;
    align-self: flex-start;
    text-align: start;
}

.stepper-content {
  display: flex;
  align-items: center;
}

.make-column {
    display: flex;
    flex-direction: column;
}

.step-circle {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background-color: #ffffff;
    display: flex;
    justify-content: center;
    align-items: center;
    color: #000;
    font-size: 14px;
    font-weight: bold;
    border: 1px solid #000000;
}

.step-circle-done {
    background-color: #87c9ff;
}

.step-circle-active {
    border-color: #ffffff;
    border: 2px solid #000000;
}

.step-line {
    width: 50px;
    height: 2px;
    background-color: #bbbbbb;
}

.step-line-done {
    background-color: #9aacff;
}
</style>
