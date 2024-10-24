<template>
    <nav>
        <ul>
            <li>
                <router-link to="/">Home</router-link>
            </li>
            <li v-for="(page, index) in availablePages" :key="index">
                <router-link :to="getRoutePath(page.type)" :class="{ active: isCurrentPage(index)}">{{ getPageLabel(page.type) }}</router-link>
            </li>
        </ul>
    </nav>
</template>

<script setup lang="ts">
import 