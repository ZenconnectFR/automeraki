<script setup lang="ts">
import { defineProps, PropType, ref, defineEmits, watch, onMounted} from 'vue';
import { OnClickOutside } from '@vueuse/components';

const search = ref('')
const showDropdown = ref(false)
// selected option is Option type or null
const selectedOption = ref(null as Option | string | null)

const arrowId = ref('')

const generateArrowId = () => {
    arrowId.value = `arrow-${Math.random().toString(36).substring(7)}`
}

interface Option {
    name: string;
    value: any;
}

const props = defineProps({
    options: {
        // type: Array of Option
        type: Array as PropType<(Option | string)[]>,
        required: true
    },
    modelValue: {
        type: [Object, String] as PropType<(Option | string | null)>,
        default: null
    },
    onSelect: {
        type: Function as PropType<(option: Option | string | null) => void>,
        default: () => {},
        required: false
    }
})

const emit = defineEmits(['update:modelValue'])

const selectOption = (option: Option | string) => {
    selectedOption.value = option
    console.log('selected option:', option)
    emit('update:modelValue', option)
    if (props.onSelect) {
        props.onSelect(option)
    }
    search.value = typeof option === 'string' ? option : option?.name || ''
    showDropdown.value = false
    turnArrowUpsideDown()
}

/*
watch(
    () => props.modelValue,
    (newOption) => {
        console.log('modelValue changed:', newOption)
        selectedOption.value = newOption
        // if the modelValue is a string, set the search value to it, else set it to the name of the option
        search.value = typeof newOption === 'string' ? newOption : newOption?.name || ''
        if (props.onSelect) {
            props.onSelect(newOption)
        }
    },
    {
        immediate: true
    }
)
*/


onMounted(() => {
    generateArrowId()
    if (props.modelValue) {
        console.log('modelValue:', props.modelValue)
        selectedOption.value = props.modelValue
        search.value = typeof props.modelValue === 'string' ? props.modelValue : props.modelValue?.name || ''
        if (props.onSelect) {
            props.onSelect(props.modelValue)
        }
    }
})

const optionsFiltered = ref(props.options)

const filterOptions = () => {
    const searchValue = search.value.toLowerCase()
    let filteredValues: (Option | string)[] = []
    for (const option of Object.values(props.options)) {
        // handle both Option and string types
        const name = typeof option === 'string' ? option : option.name
        if (name.toLowerCase().includes(searchValue)) {
            filteredValues.push(option)
        }
    }
    optionsFiltered.value = filteredValues
}

const turnArrowUpsideDown = () => {
    const arrow = document.getElementById(arrowId.value)
    if (arrow) {
        // if the dropdown is open, rotate the arrow 180 degrees to point upwards, else reset it
        arrow.style.transform = showDropdown.value ? 'rotate(180deg)' : 'rotate(0deg)'
    }
}

const openDropdown = () => {
    showDropdown.value = true
    turnArrowUpsideDown()
}

const closeDropdown = () => {
    showDropdown.value = false
    turnArrowUpsideDown()
}

const toggleDropdown = () => {
    showDropdown.value = !showDropdown.value
    turnArrowUpsideDown()
}

</script>

<template>
    <OnClickOutside @trigger="closeDropdown">
        <div class="dropdown-container">
            <div class="input-container">
                <input autocomplete="off" v-model="search" type="text" :placeholder="'Select or search'" @click="openDropdown" @input="filterOptions" id="dropdown-input">
                <img src="@/assets/dropdown-arrow.png" alt="arrow-down" @click="toggleDropdown" class="dropdown-arrow" :id="arrowId">
            </div>
            <div v-if="showDropdown" class="options-container">
                <div class="option" v-for="(option, index) in optionsFiltered" :key="index" @click="selectOption(option)">
                    {{ typeof option === 'string' ? option : option.name }}
                </div>
            </div>
        </div>
    </OnClickOutside>
</template>

<style scoped>
    .dropdown-container {
        position: relative;
        width: 100%;
    }

    #dropdown-input {
        width: 100%;
        padding: 0.5rem;
        border: 1px solid #ccc;
        border-radius: 0.25rem;
    }

    .options-container {
        position: absolute;
        top: 100%;
        left: 0;
        width: 100%;
        border: 1px solid #ccc;
        border-radius: 0.25rem;
        background-color: white;
        z-index: 1;
        overflow-y: auto;
        max-height: 200px;
    }

    .option {
        padding: 0.5rem;
        border-bottom: 1px solid #ccc;
        cursor: pointer;
    }

    .option:last-child {
        border-bottom: none;
    }

    .input-container {
        position: relative;
        display: inline-block;
    }

    .dropdown-arrow {
        position: absolute;
        right: 0px; /* Adjust based on arrow size */
        top: 50%;
        transform: translateY(-50%);
        cursor: pointer;
        width: 16px; /* Arrow width */
        height: 16px; /* Arrow height */
    }
</style>
