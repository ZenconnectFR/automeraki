<template>
    <Button id="homebtn" @click="backHome">Home</Button>
    <div class="stepper-container">
        <div v-for="(page, index) in availablePages" :key="index" class="stepper-item col">
            <div class="stepper-content col">
                <div class="stepper-label">
                    {{ getPageLabel(page.type) }}
                </div>
                <div :class="['step-circle', getCircleClass(index)]" @click="(/*__DEBUG__ || */(lastIndexTrue >= index - 1)) ? goToPage(index) : null"
                    :style="{ cursor: (/*__DEBUG__ || */(lastIndexTrue >= index - 1))? 'pointer': 'default'}"
                >
                    <span class="nb" v-if="lastIndexTrue < index">{{ index + 1 }}</span>
                    <span v-else>
                        <i class="pi pi-check" style="color: #ffffff;"></i>
                    </span>
                </div>
            </div>
            <div v-if="index < availablePages.length - 1" :class="['step-line', getLineClass(index)]"></div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useConfigurationStore } from '@/stores/configuration';
import { useNextStatesStore } from '@/stores/nextStates';
import { getRoutePath, getPageLabel } from '@/utils/PageRouter';

import Button from 'primevue/button';

// const __DEBUG__ = import.meta.env.VITE_APP_DEBUG === 'true';
const configStore = useConfigurationStore();
const nextStatesStore = useNextStatesStore();
const router = useRouter();

const { configuration, currentPageIndex, currentPageConfig } = storeToRefs(configStore);
const { nextStates } = storeToRefs(nextStatesStore);

watch(nextStates, (value) => {
    console.log('nextStates', value);
});

const availablePages = computed(() => {
    return configuration.value?.actions?.filter((action: { type: string; }) => action.type !== 'setup') || [];
});

const isClickable = computed(() => {
    return /*__DEBUG__ || */(nextStates.value.lastIndexOf(true) > currentPageIndex.value);
});

const isChecked = computed(() => {
    return currentPageIndex.value <= nextStates.value.lastIndexOf(true);
});

const lastIndexTrue = computed(() => {
    return nextStates.value.lastIndexOf(true);
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

    console.log('nextStates', nextStates.value);
};

const backHome = () => {
    // empty configuration
    configStore.setConfiguration(null);
    router.push('/');
};

const getCircleClass = (index: number) => {

    if (currentPageIndex.value === index && index <= nextStates.value.lastIndexOf(true)) {
        return 'step-circle-active step-circle-done';
    } else if (currentPageIndex.value === index) {
        return 'step-circle-active';
    } else if (index <= nextStates.value.lastIndexOf(true)) {
        return 'step-circle-done';
    } else {
        return 'step-circle';
    }
};

const getLineClass = (index: number) => {
    if (index < nextStates.value.lastIndexOf(true)) {
        return 'step-line-done';
    } else {
        return 'step-line';
    }
};

</script>

<style scoped>

#homebtn {
    position: fixed;
    top: 20px;
    left: 20px;
    height: 40px;
    padding: 0 20px;
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
    width: 100px;
}

.stepper-label {
    font-size: 14px;
    margin-bottom: 8px;
    justify-content: center;
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
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background-color: #ffffff;
    display: flex;
    justify-content: center;
    align-items: center;
    color: #000000;
    font-size: 14px;
    font-weight: bold;
    border: 2px solid #bbbbbb;
}

.step-circle-done {
    background-color: var(--p-indigo-500) !important;
    color: #ffffff !important;
    border: 1px solid var(--p-indigo-500);
}

.step-circle-active {
    border: 2px solid #000000 !important;
}

.step-line {
    width: 60px;
    height: 2px;
    background-color: #bbbbbb;
    transform: translate(50px, -20px);
}

.step-line-done {
    background-color: var(--p-indigo-500);
}

.nb {
    margin-bottom: 2px;
}
</style>
