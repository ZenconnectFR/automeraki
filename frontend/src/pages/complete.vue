<script setup lang="ts">
import { ref, onMounted } from 'vue'

import { useIdsStore } from '@/stores/ids'
import { useDevicesStore } from '@/stores/devices'
import { useConfigurationStore } from '@/stores/configuration'
import { storeToRefs } from 'pinia'

import { useRoute, useRouter } from 'vue-router'

import { getRoutePath } from '@/utils/PageRouter'

import { useBoolStates } from '@/utils/Decorators'

import Button from 'primevue/button'

import Card from 'primevue/card'

const router = useRouter()
const route = useRoute()

const ids = useIdsStore()
const devices = useDevicesStore()
const configStore = useConfigurationStore()

const { newNetworkId, orgId } = storeToRefs(ids)
const { currentPageConfig } = storeToRefs(configStore)
let config = currentPageConfig.value

const comments = ref([] as any[])

const populateComments = async () => {
    comments.value = config.comments
}

const redirectToRickroll = () => {
    window.location.href = 'https://youtu.be/dQw4w9WgXcQ'
}

onMounted(() => {
    populateComments()
})
</script>

<template>
    <div class="dark-overlay"></div>
    <div style="margin-top: 60px;">
        <h1>Comments</h1>
        <Card v-for="comment in comments" style="margin-bottom: 30px;">
            <template #title>
                <h2>{{ comment.title }}</h2>
            </template>
            <template #content>
                <p v-for="line in comment.content">{{ line }}</p>
            </template>
        </Card>

        <Button @click="router.push(getRoutePath(configStore.prevPage()))" style="margin-right: 20px;">Back</Button>
        <!-- redirect to rickroll once complete-->
        <Button @click="redirectToRickroll" class="eerie-button">Ç̸̢̢̡̡̛̛̬̟̘̩̤̪͔̤͓̰̪̱͎̖̟͚̣̣͖̺͙̠̱̩̟̮̦̺͙̝͔̭̪̝̞̗̹̘̱̙̥̤̖͈̘̤̞̯̘̱͇̗̤̣̮̣̞̠͔̦̞̰̘̺̞̗̣̰͈̮͈͙̼͙̘͇̬̖͉͉̳͒͆̏̔͊̍̋͆̎̽̋͊̀͆́̈̽̀̊̊̎̄̀͌͐̍͊̆̀͛͑̒̊̀̿̇̏̓̄͗̊̄̀͒̊̔̋̏̿̅̍͗́̄̐̑̿̿̏̐͑̓̾͂̒͒̀̾̾̉͗̿̍̇̓̈́̇̓̐̈́͊͑̋̍͆̌̕̕̚͘͘͜͝͝͝͝͝͝͝͠ͅǫ̷̢̢̧̡̧̢̡̧̢̧̢̧̢̡̨̡̨̢̧̨̨̧̧̡̢̛̛̛̛̛̛̱͍͇̞͎̺̙͍̮̘̯͇͎͙̱͕̼̣͉͇̳͙̙͔̯̻͍̼̟͍̣͖̹̖̫̠͔̲̰̱̟̝̤͉̬̬͎̗̪̰͙͇̣̱̙̰͖̦͔͖̘̬̦͇̮̜̟̺̲̪̘͕͚͕͚͖̝͖̭̲̱̜̻̟̩̩͚͔̲̜̺̙̹̮̤̦͙̘̞͎͓̠̬͙̬̲͈̝͖̪̞̰̘̟̘̥̗̖̪̗̳̺͇͈͖͓̫̥̗͍͕̣̫͔͕̬̘̠̤̼̻̱̘̬͇͎͙̮͇̦̞̳̳̟̗̥̻̠̺̱̮͍̰̼̝̟̮͓̪̮̣̠̬̺̠͙̪̳̤̤͖͖̮̩̣̣̰̯͕̮͚̙̤̻̖̳̣̲̦̬̬̭̜͔̙̪̥̪͚͇̙͔̥̤̥̹̭̞̜̣̦͎͈͔͇̙̟͎̙̗̻͍͎̖̤͓̗͍̹͇̲͕͔̥̼̀͒͆̿̊̔͗̔̎͋͛̄̍̉̽̈̂͒͗̾͆̃̑̑̓̉̋͒̃̔͆̓́̍͑͗̊́͐̈͗͐̋̓́͐͋̊̓̏̂̀̄̎͋͐̔̓̌̿̑͛̓̓̈́́̾̅̿̑͑́̈́͛̊̑͑̿̇̒̈͛͑̍̐͆̀͐̆̈̔̊̔͑̌̅͒̈́̆̆̄̏̎̊̓͛͊͊̔̓̂̈̀͛̏̾̈́̄̈́̎́̃͆͐͆͑̐̅̑̂̌͛̑̃̒̅̋̌̈́̓̉̌͋̅͆̈́͌̑̇̀́̀̏̓̒͛́̐̀̊͗̓̉̆̎͌̈́̉̋͂̇͋̃̐́̈́̈́͑̌̀̃̎̋̒̆̓̄̃̑̏̏͐͆̀́̉͆͊̾͂̓̐͑̉͌̎̂͂́̈́̎̏͒́́̇̓́͑͑̊͗͆͌́͐͐̚̚͘͘͘̚͘͘͘̕͘̕̕̚͘͘̚͘̕̚̕̕̚͜͜͜͜͜͜͜͠͠͝͝͠͝͠͝͠͠͠͝ͅͅͅͅͅͅͅͅͅͅm̵̛̛͚̪̝̋̈́̓͂͋͑̍̔̾̑̂̆̆̓̂̏́̋́͋̆͆͛͛̌̌̀̓̿̍̎̽̆̇̋̌̀̐͊̂͆͐͒̇̔̔́̊̍̽̂̄̓̒̀͌̾̀͊̆̀̈̈́̉̄̊́̂͊͊́͐̄̊̓̎̊̈́̓̔͑̈́̇̊́̿͗͋̒́̓̄́̍̆͂̓͑͑̍̾͂̈̊͒͐̄̽̿͋̌͐̊̇̋́͐̐̈́̽̈̈́̀̏̀̈͌̚̚̚̕̕̚͘̚̚̕͘̕̚̕͝͝͝͝͝͠p̶̢̨̨̢̡̧̨̨̡̢̢̡̡̛̛̛̛̛̛̲̤̱̞͇̰͚̩̦̜̥̰̫̩͍̙͈̦̹͓̗̳͇̤͍̩̱̯̼̪̖͚̱͚͚͈͍̥̯͔̭̥͓̟̝͈͈͓͔̳̬͙̞̱̳͙͍̻̭͇̝̩̼̹̺̲̫̰͚̮͍̺̫̦̙͉̗̯̖̫̦̜̦̤͈̻̞̜̤̣͔̮̳͇͓͍̰͙̼̠̭̲̼̹̟̳̱̜͖̦̟̪͓̞͎̠̩̳͓̦͙͚̺͖̳̹̥̣͙̲̖̼̝̦̼͈͙̩̼̗̥̭̟̩̺͉̰̤̦̬̏̑̍͊̍̇͋̀͗̄̈́̍͗̄̌̔͑́̆̅̆̓͌̏̓̀̾̈́́̅͌͋͐͗̈́̿̉̀̽́͌̓̉͊̇̉͗̐̓̈̈́͂̔̔͌́̆̍̒̎̈̀̉͋́͗̿̾̒̎̑͊̊̃̾̅̽͂͒̄̒̋̍̾͛͋̍͛̃͑̆̈́̉̐̈́̉̔͋̀̍̌̂͑̀̍̅̊̃̇͑́̈̓̈́͊̾͗̎̅̒̊̿̀͑̀̾͐̊̓͌̊̑̉͊́͐̋̂͐̑̌͒́̏̒̄͛̊̓̈͆̑͆̓͐̔͐̅̋̽̊̓͊͛̀̋̽̀̎͒͂̀̒̄͂͊̔̃̈́̂̍̀͗̈́̑͑͐̿̅̽͑̎̀̋͌̀̐̚͘͘̚̚̚̚̚͘̕̚̕̕̚͘̚̕͘̚̕̕͘͘̕̕̚͜͜͜͝͠͠͠͠͠͝͠͝͝͠͝͝͝͝͝ͅͅͅͅͅͅľ̶̨̢̨̧̢̨̧̡̧̧̧̛̜̼̯̜̰̰̹̫̜̠̝̰̹̩̥̲̘̭̺̖̤̘͈̪̲̯̟̮͙̺̯̫͇̺̳̟͓͓͔̬̘̜͎̟̫̯̜̗̤̬͔̹̹̮͖̫̙͖̠͙̰̩͕̣̦̘̮̬̰̰̖͓͔̗͉̪̱͔͍̠̟̠̹͍̣̯͕͕̆̂͑̎̍̓̅͊̍̾̎̈́̉̀̔̍̃̇̆̾́͊̀̋̅̀̆̈̃̃̾̆̈͆̈́͋̍̓̍̅̔̐͛͑̽͂̂̕̚͘̚͜͜͝͝͝ȩ̶̢̛̲̲̬̖͈̗͎̥̟̹̹̠̥̹̱̠̙̈̃̍̇̓̀͆̐̊͑̈́̈́̏̇̏́̅̀̀̓̎͐̈͊̋͆̐̿͗̐̎̑̋̃̈́͗̏̽̋̎̉̔̄̋̔̌̿̐̓́̆̋̔̿̈́̔͛͂̉́̂͋̌̋̅͑́́̔͂̅̓̏̒̾̍̈́̿͆̽̀̊̀̋̆͋͛̌͛͂̿͒̽͐̈́̆͛̽̍̓̌̋̇͂̋͛͐͗͗̅͛̋̉̎͋̎̈́̕̕̚̕͘̕̕͝͝͝͝͝͝͝͝͠ẗ̸̨̧̨̢̧̨̡̨̧̧̧̡̢̢̧̢̨̨̨̡̛̛̛̖̟̮̠͙̙̲̹̟͖̥̣͙̲̗̮̳͚͕̘̰̣̟͙͚̠̥̦̼͕̝̜̖̣̟̞̥̼̦̝̗͍͎̦͎͙̺̙̫̻̮͚͈̪̯̱̬̬͍͕̥̱̻̭̤̟̫̖̹̩̞̲̗̭̙͇͔̰̞̩̮̼̗͎͔͔͇͙̯̖̫͈͓̖̺̳͓̣͍̺̝͈̤̪̺̭̦̹̪̦̞̪͎͇̭͎̖̱̖͕̭̤͉̰̙̭̟̣̹͈̳̫̠͙͇̖̥̱̹͓̺̱̬͉̪̳̜̫̠͓̠͇͔͖̝̥̹͚̦͔̳͔͇̦̦̯̳̮̭̫̬̝̆̑́̓̓͗͗̆͊̇̉̅̅͋̒̎͒̃̇͌̍͑̈́̽́̎̉̔̀̿̋͐̀̽̍̉̈̅͒͊͐̂̓̒̆̆́͐́̾̏̆͗͆̍̄̌̐̃̍̎̃̄͌̃̈̅̏̈́̏̉̔͂͂̈́̌͊̑͗̇̄̀͆̋̈́̈́̋͌̎͆̌͑̇̅̌̉̅̅̅̂̀̓̿̈̊̇̈́̒́̒̄̃͋̂̃͐̄̈́́̈̈̅͛̔̐̈́̋̇̆̇̌́͆̾̍̒̾͋͑̉̑̈́̓̅͂̊̐́͛̓̉͋̔̾̕̚͘̕͘͘̕̚͘̚̚̕̕̕͘̕̚͜͜͠͝͠͠͝͝͠͝͝͝͝͝͝͠͝ͅͅͅe̸̡̢̧̧̧̢̧̧̢̧̧̢̢̡̛̛͚̞̲̖͉̬̱̹̥̪̬̦̲̩͖̯̠̱̥͇̳̩̖̣͖̟̘̠̟̟̱͖͕̹̥͔̦̦̦̮̲̭͓̮̗͙̤͖̰̬͓̩̝͖͚̤̝̫̩͔̤͕̣̼͍̰̪͔̱͇͈͎̜͖͍̞͇͓̹͎͕͚̜̝͙͔̫͖̣̜̹̟͖̖̞͚̱̬̙̪͚̹̤̥̣̰̱̱͓̺̬̣̦̥̺̪͍̤͍̠̹̥̥̮͔̤̠̦̝͉͓̰̮̰̱̰͉̙̤͕̣̝͓̘̝̥̘͉͕̪͎̭͇͇̞͖̠̘͚̳̞͕͉̱̟̯̯͙̜͓͖̦̘͖͍̗͙̮̙̯̪̟͍͍̰͈͉̻̘͇̗̩̻̺̣͖̰̗̹̳͍̮͓̙̹̯̠̲̰̞̟̞̜̻͙̰̮͙̻͈͓͙̙͔̪̳̣̘̲͈̗̬̗͎̟̘̖̞̪̪̠͔̳̯͎̖̖͕̳̪͋̀͑̅̒̏̿͗̊̅̈́͋̇̐͊̏̈́̽͌͐͆̒̂̄̓͆̔̿͒́̑͗̑̂̉̈́̋͂̊̂̊̈́̒͆̓̍̃̌́͆̈͗̑̾̓͐̒͒̂̂̌̐̆̾̎̒̾͊͗̓̂̀͂̎̄͐̆͗̑̑̿̀̄̉́̀̏͛̂͂̾͋͒̂̓̄͒̑͋̀̆̇́̿̎̉̍́̑̈́̓̔͊́̒́̒͗̎̄́̔̇͑̂͂̓̈̊̓̃̃̿̈́̄̂͛̽͂̍̂͛͐͌͛̇͋̈̀̉̈́̏̎̓̀͛͆̈́̔̇͆̆̐͒́̅̒̓́̅̍́̊̇͆̃͒͋̽̔͗̈̀̐͂̔̅͒̔̎̒́͑͌̍́̒̓̉̈̓̈́̇̀͊̈́͛͌̂̾́͂͘̕̚͘̕͜͜͜͜͜͜͜͜͜͝͝͝͝͝͠͠͝͠͝͠͠͝͝͝͠͝͝ͅͅͅͅͅͅͅͅͅͅ</Button>
    </div>
</template>

<style scoped>
    @import url('https://fonts.googleapis.com/css2?family=Nosifer&display=swap');

    .dark-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5); /* Adjust transparency */
        z-index: 5;
        opacity: 0; /* Initially hidden */
        pointer-events: none; /* Allow clicking only on visible elements */
        transition: opacity 0.3s ease;
    }

    body {
        background: black;
        color: white;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        margin: 0;
        overflow: hidden;
        font-family: 'Courier New', Courier, monospace;
        transition: background 0.5s, color 0.5s;
    }

    .eerie-button {
        font-family: 'Nosifer', cursive;
        position: relative;
        background: none;
        border: 2px solid #800000;
        color: #800000;
        font-size: rem;
        padding: 10px 30px;
        cursor: pointer;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        transition: all 0.3s ease;
        box-shadow: 0 0 15px rgba(128, 0, 0, 0.6), 0 0 30px rgba(128, 0, 0, 0.4) inset;
    }

    .eerie-button::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 120%;
        height: 120%;
        background: radial-gradient(circle, rgba(128, 0, 0, 0.6), transparent);
        transform: translate(-50%, -50%);
        filter: blur(10px);
        animation: aura-pulse 2s infinite;
        z-index: -1;
    }

    @keyframes aura-pulse {
        0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.6;
        }
        50% {
            transform: translate(-50%, -50%) scale(1.1);
            opacity: 0.9;
        }
        100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.6;
        }
    }

    .eerie-button:hover {
        color: #ff0000;
        border-color: #ff0000;
        transform: scale(1.2);
        text-shadow: 0 0 10px red, 0 0 20px crimson, 0 0 30px darkred;
        box-shadow: 0 0 50px red, inset 0 0 30px crimson;
        /* also make the text overflow outside the button */
        overflow: visible;
    }

    .eerie-button:hover::before {
        content: '';
        background: radial-gradient(circle, rgba(255, 0, 0, 0.8), transparent);
        animation: aura-pulse-hover 1.5s infinite;
    }

    @keyframes aura-pulse-hover {
        0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.8;
        }
        100% {
            transform: translate(-50%, -50%) scale(1.3);
            opacity: 0.5;
        }
    }

    .eerie-button:hover::after {
        content: "DON'T CLICK!";
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-family: 'Nosifer', cursive;
        font-size: 4rem;
        color: crimson;
        text-shadow: 0 0 20px rgb(0, 0, 0), 0 0 40px crimson, 0 0 60px darkred;
        animation: scream 1s ease infinite alternate;
        z-index: 2;
    }

    @keyframes scream {
        0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.7;
        }
        100% {
            transform: translate(-50%, -50%) scale(1.1);
            opacity: 1;
        }
    }
</style>