<!--
  Example4MeowFact.vue - Component for displaying random cat facts

  The component displays a random cat fact loaded from an external API.
  Provides a button to update the fact.

  Functionality:
  - Loading a fact when the component is mounted
  - Updating the fact on button click
  - Displaying loading state
  - Handling and displaying errors

  Uses:
  - External API: https://meowfacts.herokuapp.com/
  - AppLoader component for displaying loading state
  - Vuetify components for UI
-->
<template>
  <v-card class="ma-4 pa-4" elevation="2">
    <v-card-title>Cat Fact</v-card-title>
    <v-card-text>
      <AppLoader isclass v-if="loading"/>
      <template v-else>
        <div v-if="fact">{{ fact }}</div>
        <div v-else class="text-error">{{ error }}</div>
      </template>
    </v-card-text>
    <v-card-actions>
      <v-btn color="primary" @click="fetchFact">Update Fact</v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import {ref} from 'vue';
import {api} from "../../../dev/api.ts";
import AppLoader from "@/shared/components/AppLoader.vue";

// Interface for typing the response from the cat facts API
interface MeowApiResponse {
  data: {
    data: string[];
  }
}

// Component states
const loading = ref(false);      // Loading state flag
const fact = ref<string | null>(null);  // Currently displayed fact
const error = ref<string | null>(null); // Error message if loading failed

/**
 * Loads a random cat fact from external API
 * Updates component state based on request result
 */
async function fetchFact() {
  loading.value = true;
  try {
    // Make request to API to get a fact
    const response = await api().methods.axios.get<MeowApiResponse>(
        'https://meowfacts.herokuapp.com/'
    );

    const facts = response.data.data;
    fact.value = facts.length > 0 ? facts[0] : null;

    // Handle case when fact was not received
    if (!fact.value) {
      error.value = 'Failed to get cat fact';
    } else {
      error.value = null;
    }
  } catch {
    // Handle loading errors
    error.value = 'Error loading fact';
    fact.value = null;
  } finally {
    loading.value = false;
  }
}

// Load fact when component is mounted
fetchFact();
</script>