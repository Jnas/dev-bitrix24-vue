<!-- 
  Button3BusinessProcess.vue - Business process management component

  The component provides a button for interacting with Bitrix24 business processes.
  Tracks the state of the business process and displays the corresponding button state.

  Main functionality:
  - Displaying business process status
  - Periodic polling of business process status

  Technologies used:
  - Vue.js 3 Composition API
  - Vuetify 3 for UI components
  - Integration with Bitrix24 API
-->
<template>
  <v-app style="background-color: #f9fafb">
    <v-main fluid class="d-flex justify-center align-center">
      <v-btn
          :color="hasError ? 'error' : 'primary'"
          :disabled="isProcessing || hasError"
          class="d-inline-flex align-center"
          @click="onClick"
      >
        <span v-if="hasError">Error</span>
        <template v-else>
          <v-progress-circular
              v-if="isProcessing"
              indeterminate
              size="16"
              width="2"
              class="me-2"
          />
          Business process
        </template>
      </v-btn>
    </v-main>
  </v-app>
</template>

<script>
import {api} from "../../../dev/api.js";

// Component configuration
const config = {
  pollIntervalMs: 2000, // Polling interval for business process status in milliseconds
  templateId: 1927,     // Business process template ID
};

export default {
  name: 'BusinessProcessButton',

  /**
   * Component state initialization
   * @returns {Object} Component initial state
   */
  data() {
    return {
      isProcessing: true,  // Business process execution flag
      hasError: false,     // Error flag
      pollTimerId: null,   // Polling timer identifier
      isPolling: false,    // Polling execution flag (to prevent overlaps)
    };
  },
  computed: {
    /**
     * Generates document identifier for business process
     * based on placement context data
     * @returns {string|null} Document identifier or null if data is unavailable
     */
    documentId() {
      // Get entity type and ID from placement context
      const entityTypeId = api().fields.placement?.options?.ENTITY_DATA?.entityTypeId;
      const entityId = api().fields.placement?.options?.ENTITY_DATA?.entityId;

      // Form document identifier in format DYNAMIC_{entityTypeId}_{entityId}
      if (entityTypeId && entityId) {
        return `DYNAMIC_${entityTypeId}_${entityId}`;
      }
      return null;
    },
  },
  /**
   * Lifecycle hook: executed after component mounting
   * Starts periodic polling of business process status
   * @lifecycle
   */
  mounted() {
    this.startPolling();
  },

  /**
   * Lifecycle hook: executed before component destruction
   * Stops polling timer to prevent memory leaks
   * @lifecycle
   */
  beforeUnmount() {
    this.stopPolling();
  },
  methods: {
    /**
     * Button click handler
     * Activates processing state if there are no errors and process is not executing
     */
    onClick() {
      if (!this.isProcessing && !this.hasError) {
        this.isProcessing = true;
      }
    },
    /**
     * Starts periodic polling of business process status
     * @returns {void}
     */
    startPolling() {
      // Check for documentId availability
      if (!this.documentId) {
        this.stopPolling();
        this.hasError = true;
        return;
      }

      // Execute immediate first poll
      this.pollWorkflowState();

      // Set interval for periodic polling
      this.pollTimerId = setInterval(
          this.pollWorkflowState,
          config.pollIntervalMs
      );
    },
    /**
     * Stops periodic polling of business process status
     */
    stopPolling() {
      if (this.pollTimerId) {
        clearInterval(this.pollTimerId);
        this.pollTimerId = null;
      }
    },
    /**
     * Polls business process status via Bitrix24 API
     * @async
     * @returns {Promise<void>}
     */
    async pollWorkflowState() {
      // Check if polling is already in progress and documentId is available
      if (this.isPolling || !this.documentId) return;
      this.isPolling = true;

      try {
        // Make request to Bitrix24 API to get business process information
        const response = await api().methods.b24Call(
            "bizproc.workflow.instances",
            {
              FILTER: {
                DOCUMENT_ID: this.documentId,
                TEMPLATE_ID: config.templateId
              },
            }
        );

        // Process API response
        const total = Number(response?.total);

        if (Number.isFinite(total)) {
          // Update state based on number of active business process instances
          this.hasError = false;
          this.isProcessing = total > 0;
        } else {
          // In case of invalid response, mark error and stop polling
          this.hasError = true;
          this.stopPolling();
        }
      } catch {
        this.hasError = true;
        this.stopPolling(); // stop on request error
      } finally {
        this.isPolling = false;
      }
    },
  },
};
</script>