<!--
  Example1MyApp.vue - Demo component with basic functionality
  
  The component demonstrates various capabilities of working with Vue.js and Vuetify,
  including state management, event handling, and integration with Bitrix24 API.
  
  Main functionality:
  - Text input and display with reactive computations
  - Button click handling with loading animation
  - Integration with Bitrix24 API for user data retrieval
  - Demonstration of lifecycle hooks usage
  - Display of notifications and results
  
  Technologies used:
  - Vue.js 3 Composition API
  - Vuetify 3 for UI components
  - Integration with Bitrix24 via api().methods
-->
<template>
  <div>
    <!-- Main application header -->
    <h1 class="text-h4 text--primary ma-4">Test Form</h1>
    <!-- Card with main content -->
    <v-card variant="outlined" class="ma-4">
      <v-card-title>Results</v-card-title>
      <v-card-text>
        <!-- Text input field with two-way binding via v-model -->
        <v-text-field
            v-model="inputText"
            label="Enter text"
            placeholder="Start typing..."
            outlined
            clearable
            @input="onInput"
        ></v-text-field>

        <!-- Button with click handler -->
        <div>
          <v-btn
              color="primary"
              @click="onButtonClick"
              :loading="loading"
              class="mb-2"
          >
            Click me
          </v-btn>
        </div>
        <!-- Button with click handler -->
        <div>
          <v-btn
              color="primary"
              @click="onButtonToast"
              class="mb-2"
          >
            Show message
          </v-btn>
        </div>


        <!-- Button click counter indicator -->
        <v-chip class="ml-4" color="success" variant="outlined">
          Clicks: {{ clickCount }}
        </v-chip>

        <!-- Notification with entered text -->
        <v-alert
            v-if="displayText"
            color="info"
            variant="tonal"
            class="mt-2"
        >
          You entered: <strong>{{ displayText }}</strong>
        </v-alert>

        <!-- Notification with doubled text -->
        <v-alert
            v-if="doubledText"
            color="warning"
            variant="tonal"
            class="mt-2"
        >
          Doubled text: <strong>{{ doubledText }}</strong>
        </v-alert>

        <!-- Notification with click count -->
        <v-alert
            v-if="clickCount > 0"
            color="success"
            variant="tonal"
            class="mt-2"
        >
          Button was clicked {{ clickCount }} time(s)
        </v-alert>

        <!-- Button with click handler -->
        <div>
          <v-btn
              color="primary"
              @click="onButtonB24"
              class="mt-2"
              :loading="loadingB24"
          >
            About User
          </v-btn>
        </div>
        <div>B24 Result : {{ b24result }}</div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script>
import {api} from "../../../dev/api.js";

/**
 * Main demo application component
 *
 * @component
 * @example
 * <example1-my-app />
 */
export default {
  /**
   * Component reactive data declaration
   * @returns {Object} Component initial state
   */
  data() {
    return {
      /** @type {string} Text entered by user in the input field */
      inputText: "",

      /** @type {number} Click counter for "Click me" button */
      clickCount: 0,

      /** @type {boolean} Loading indicator flag for main button */
      loading: false,

      /** @type {boolean} Loading indicator flag for B24 button */
      loadingB24: false,

      /** @type {Object} Bitrix24 API query result */
      b24result: {},
    };
  },

  /**
   * Component computed properties
   */
  computed: {
    /**
     * Returns entered text or "nothing" if field is empty
     * @returns {string} Text to display
     */
    displayText() {
      return this.inputText || "nothing";
    },

    /**
     * Creates string with doubled entered text
     * @returns {string} Doubled entered text
     */
    doubledText() {
      return this.inputText + this.inputText;
    }
  },

  /**
   * Data change watchers
   */
  watch: {
    /**
     * Tracking input field changes
     * @param {string} newVal - New value
     * @param {string} oldVal - Previous value
     */
    inputText(newVal, oldVal) {
      console.log("Text changed from", oldVal, "to", newVal);
    },

    /**
     * Tracking button click count
     * @param {number} newVal - New click count
     */
    clickCount(newVal) {
      if (newVal > 5) {
        console.log("Already more than 5 clicks!");
      }
    }
  },

  /**
   * Component methods
   */
  methods: {
    /**
     * Text input handler
     * @fires console.log - Logs entered text
     */
    onInput() {
      console.log("Input:", this.inputText);
    },

    /**
     * Click handler for "Click me" button
     * Increases click counter and simulates async operation
     * @async
     */
    async onButtonClick() {
      this.loading = true;        // Enable loading indicator
      this.clickCount++;          // Increase click counter

      // Simulate async operation
      await new Promise(r => setTimeout(r, 500));

      console.log(`Button clicked ${this.clickCount} time(s)!`);
      this.loading = false;       // Disable loading indicator
    },

    /**
     * Shows toast notification with entered text
     * @fires api().methods.toast - Shows notification
     */
    onButtonToast() {
      api().methods.toast(this.inputText || "Enter text");
    },

    /**
     * Gets current user information via Bitrix24 API
     * @async
     * @fires api().methods.b24Call - Calls Bitrix24 API method
     */
    async onButtonB24() {
      this.loadingB24 = true;
      try {
        // Get current user data
        this.b24result = await api().methods.b24Call("user.current", {});
      } catch {
        console.error("Error getting user data");
        this.b24result = { error: "Failed to load user data" };
      } finally {
        this.loadingB24 = false;
      }
    }
  },

  /**
   * Lifecycle hook: executed after component is mounted to DOM
   * @lifecycle
   */
  mounted() {
    console.log("Component loaded! Hello World in console");
    console.log("api() object available:", api());
  }
};
</script>

<style>
/* Styles for B24 result display */
code {
  background-color: #f5f5f5;
  padding: 2px 4px;
  border-radius: 4px;
  font-family: monospace;
}
</style>
