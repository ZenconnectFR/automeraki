<script setup lang="ts">
import { ref, onMounted } from 'vue'

import { useIdsStore } from '@/stores/ids'
import { useDevicesStore } from '@/stores/devices'
import { useConfigurationStore } from '@/stores/configuration'
import { storeToRefs } from 'pinia'

import { updateNetwork } from '@/endpoints/networks/UpdateNetwork'
import { getNetwork } from '@/endpoints/networks/GetNetwork'

import { useRouter, useRoute } from 'vue-router'
import { useBoolStates } from '@/utils/Decorators'
import { getRoutePath } from '@/utils/PageRouter'

const router = useRouter()
const route = useRoute()

const ids = useIdsStore()
const devices = useDevicesStore()
const configStore = useConfigurationStore()

const { newNetworkId } = storeToRefs(ids)
const { currentPageConfig } = storeToRefs(configStore)
let config = currentPageConfig.value

const availableTags = ref([] as any[])
const filteredTags = ref([] as any[])
const selectedTags = ref([] as any[])

const savingChanges = ref(false)
const changesSaved = ref(false)

const filter = ref('')

const populateTags = async () => {
    availableTags.value = config.availableTags
    filteredTags.value = availableTags.value

    // sort the tags alphabetically
    availableTags.value.sort()
}

const getNetworkTags = async () => {
    const network = await getNetwork(newNetworkId.value)
    for (const tag of network.tags) {
        if (availableTags.value.find(t => t === tag)) {
            addTag(tag)
        }
    }
}

const addTag = (tag: any) => {
    selectedTags.value.push(tag)
    filteredTags.value = filteredTags.value.filter(t => t !== tag)

    // sort the tags alphabetically
    selectedTags.value.sort()
}

const removeTag = (tag: any) => {
    selectedTags.value = selectedTags.value.filter(t => t !== tag)
    filteredTags.value.push(tag)

    // sort the tags alphabetically
    filteredTags.value.sort()
}

const filterTags = () => {
    // filter tags based on the input, only show tags that contain the input and are not already selected
    filteredTags.value = availableTags.value.filter(tag => tag.toLowerCase().includes(filter.value.toLowerCase()) && !selectedTags.value.includes(tag))
}

const saveTags = useBoolStates([savingChanges],[changesSaved],async () => {
    console.log('Selected tags: ', selectedTags.value)
    // console.log('Available tags: ', availableTags.value)

    // save the selected tags
    const resp = await updateNetwork(newNetworkId.value, { tags: selectedTags.value })

    console.log('Tags saved : ', resp)
});

const nextPage = () => {
    router.push(getRoutePath(configStore.nextPage()))
}

const prevPage = () => {
    router.push(getRoutePath(configStore.prevPage()))
}

onMounted(() => {
    populateTags()
    getNetworkTags()
})
</script>

<template>
    <div class="tag-network">
        <h1>Tag Network</h1>

        <h2>Selected Tags</h2>
        <div class="tag-container">
            <div v-for="tag in selectedTags" :key="tag" @click="removeTag(tag)" class="tag">
                {{ tag }}
            </div>
        </div>

        <h2>Available Tags</h2>
        <div class="search-and-tags">
            <input type="text" v-model="filter" placeholder="Search tags..." @input="filterTags"/>
            <div class="tag-container">
                <div v-for="tag in filteredTags" :key="tag" @click="addTag(tag)" class="tag">
                    {{ tag }}
                </div>
            </div>
        </div>

        <p v-if="savingChanges">Saving changes...</p>
        <p v-if="changesSaved">Changes saved</p>
        <button @click="saveTags">Save Tags</button>
        <div class="col">
            <button @click="prevPage">Back</button>
            <button @click="nextPage">Next</button>
        </div>
    </div>
</template>

<style scoped>
    body {
        margin: 0;
        padding: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        font-family: Arial, sans-serif;
    }

    .tag-network {
        text-align: center;
        width: 40%;
    }

    .search-and-tags input {
        width: 100%;
        padding: 10px;
        margin-bottom: 0px;
        border: 2px solid #ccc;
        border-radius: 12px 12px 0 0;
        border-bottom: none;
        outline: none;
    }

    .search-and-tags .tag-container {
        border-top: 2px solid #ccc;
        padding: 10px;
        min-height: 37px;
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        width: 100%;
        min-width: 100%;
        border-radius: 0 0 12px 12px;
    }

    .tag-container {
        border: 2px solid #ccc;
        border-radius: 12px;
        padding: 10px;
        min-height: 37px;
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        margin-bottom: 20px;
        width: 100%;
        min-width: 100%;
    }

    .tag {
        background-color: #f0f0f0;
        padding: 5px 10px;
        margin: 5px;
        border-radius: 8px;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .tag:hover {
        background-color: #e0e0e0;
    }

    h1, h2 {
        margin-bottom: 10px;
    }

    button {
        padding: 10px 20px;
        background-color: #007bff;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        margin-top: 20px;
        margin-right: 10px;
        margin-left: 10px;
    }

    button:hover {
        background-color: #0056b3;
    }

    .row {
        display: flex;
        flex-direction: row;
        justify-content: center;
    }


    /* Optional: Add responsiveness for smaller screens */
    @media (max-width: 768px) {
        .tag-container {
            width: 100%; /* Full width on smaller screens */
        }
    }
</style>