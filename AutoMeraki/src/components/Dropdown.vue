<script setup>
import { ref, watch } from 'vue'
import { onClickOutside } from '@vueuse/core'

const search = ref('')
const showDropdown = ref(false)
const filteredOptions = ref([])
const selectedOption = ref({})

const props = defineProps({
    options: {
        type: Array,
        required: true
    }
})

const openDropdown = () => {
    showDropdown.value = true
}

const closeDropdown = () => {
    showDropdown.value = false
}

onClickOutside(document.body, closeDropdown)

const filterOptions = () => {
    const searchValue = search.value.toLowerCase()
    let filteredValues = []
    for (const option of Object.values(props.options)) {
        if (option.name.toLowerCase().includes(searchValue)) {
            filteredValues.push(option)
        }
    }
    filteredOptions.value = filteredValues
}

const emit = defineEmits(['select-option'])

const selectOption = (option) => {
    selectedOption.value = option
    search.value = option.name
    showDropdown.value = false
    emit('select-option', option)
}

watch(
    () => props.options,
    (newOptions) => {
        filteredOptions.value = newOptions
    },
    {
        immediate: true
    }
);

</script>

<template>
    <div id="dropdown-container">
        <input v-model="search" type="text" placeholder="Select or search" @click="openDropdown" @input="filterOptions" id="dropdown-input">

        <ul v-if="showDropdown" id="dropdown-list">
            <li v-for="option in filteredOptions" :key="option.id" @click="selectOption(option)" class="dropdown-item">
                {{ option.name }}
            </li>
        </ul>
    </div>
</template>

<style scoped>
    #dropdown-container {
        position: relative;
        width: 200px;
    }

    #dropdown-list {
        list-style-type: none;
        padding: 0;
        margin: 0;
        border: 1px solid #ccc;
        border-radius: 8px;
        box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);
        position: absolute;
        width: 100%;
        background-color: white;
        top: 100%;
        left: 0;
        max-height: 250px;
        overflow-y: auto;
        z-index: 3;
    }

    .dropdown-item {
        padding: 10px;
        cursor: pointer;
        transition: background-color 0.3s;
    }

    .dropdown-item:hover {
        background-color: #f9f9f9;
    }

    .dropdown-list ul {
        list-style-type: none;
        padding: 0;
        margin: 0;
    }

    #dropdown-input {
        width: 100%;
        padding: 10px;
        font-size: 16px;
        border: 1px solid #ccc;
        border-radius: 8px;
        box-sizing: border-box;
    }
</style>
