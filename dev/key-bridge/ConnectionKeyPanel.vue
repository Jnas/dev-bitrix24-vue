<template>
  <div>
    <!-- Main connection control panel -->
    <v-card
        v-if="showPanel"
        class="connection-key-panel"
        elevation="2"
        style="position: fixed; bottom: 16px; right: 16px; z-index: 1000; max-width: 400px;"
    >
      <v-card-title class="d-flex align-center justify-space-between">
        <span>KeyBridge Connection</span>
        <!-- Panel close button -->
        <v-btn
            icon="mdi-close"
            variant="text"
            size="small"
            @click="closePanel"
            :disabled="isLoading"
        />
      </v-card-title>

      <v-card-text>
        <!-- Connection key input field -->
        <v-text-field
            v-model="keyInput"
            label="Connection Key"
            placeholder="Enter connection key"
            variant="outlined"
            density="compact"
            :error-messages="displayError"
            :loading="isLoading"
            @keyup.enter="saveKey"
            @input="clearTemporaryError"
        />

        <!-- Additional information when connection is active -->
        <template v-if="isConnected || isLoading">
          <v-divider class="my-4"/>

          <!-- Connection status -->
          <v-alert
              :type="connectionStatus.type"
              variant="tonal"
              class="mt-3"
          >
            <div class="d-flex align-center">
              <v-icon
                  size="20"
                  :color="connectionStatus.color"
                  class="mr-2"
                  :class="{ 'rotating-icon': connectionStatus.isRunning }"
              >
                {{ connectionStatus.icon }}
              </v-icon>
              <div>
                <div class="text-caption font-weight-medium">
                  {{ connectionStatus.text }}
                </div>
                <div v-if="isConnected" class="text-caption">
                  Polling interval: {{ pollRate }}ms
                </div>
                <div v-if="hasActiveOperations" class="text-caption mt-1">
                  Active requests: {{ activeCount }}
                </div>
              </div>
            </div>
          </v-alert>
        </template>

        <!-- Display temporary errors (current session only) -->
        <v-alert v-if="temporaryError" type="error" variant="tonal" class="mt-3">
          {{ temporaryError }}
        </v-alert>
      </v-card-text>

      <!-- Action buttons -->
      <v-card-actions>
        <v-spacer/>
        <v-btn
            variant="text"
            @click="clearKey"
            :disabled="isLoading"
        >
          Clear
        </v-btn>
        <v-btn
            color="primary"
            @click="saveKey"
            :disabled="!keyInput.trim() || isLoading"
            :loading="isLoading"
        >
          {{ isConnected ? 'Update Key' : 'Connect' }}
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- Compact status button (displayed when panel is hidden) -->
    <v-btn
        v-else
        :color="statusColor"
        fab
        icon
        size="small"
        class="status-fab"
        @click="openPanel"
    >
      <!-- Dynamic status icon -->
      <v-icon
          :icon="statusIcon"
          size="x-large"
          :class="{ 'rotating-icon': shouldRotate }"
      />
      <!-- Tooltip with detailed information -->
      <v-tooltip activator="parent" location="top">
        {{ tooltipText }}
      </v-tooltip>
    </v-btn>
  </div>
</template>

<script setup lang="ts">
import {computed, onMounted, onUnmounted, ref } from 'vue';
import {keyBridgeClient} from './KeyBridgeClient.ts';

// Reactive state variables
const showPanel = ref(false);        // Main panel visibility
const keyInput = ref('');            // Entered connection key
const isLoading = ref(false);        // Loading state (connecting)
const temporaryError = ref<string | null>(null); // Temporary error (current session only)
const clientState = ref(keyBridgeClient.getState()); // Current client state
const hasRecentActivity = ref(false); // Recent activity flag (for orange color)

/**
 * Component initialization on mount
 * Restores saved key and connects automatically
 */
onMounted(() => {
  // Check for saved key in localStorage
  const savedKey = localStorage.getItem('keybridge_connection_key');
  if (savedKey) {
    keyInput.value = savedKey;
    // Automatically connect after a short timeout
    setTimeout(() => {
      if (!clientState.value.connected && savedKey) {
        saveKey();
      }
    }, 500);
  }

// Subscribe to client state changes
  const unsubscribe = keyBridgeClient.onStateChange((newState) => {
    const hadActiveOperations = hasActiveOperations.value;
    clientState.value = newState;

    // If active operations appeared, enable orange indicator
    if (!hadActiveOperations && hasActiveOperations.value) {
      hasRecentActivity.value = true;
      // Automatically disable orange indicator after 1 second
      setTimeout(() => {
        hasRecentActivity.value = false;
      }, 1000);
    }

    // Automatically clear temporary error on successful connection
    if (newState.connected && temporaryError.value) {
      temporaryError.value = null;
    }

    // Handle case when server returned 404 error
    if (newState.error?.includes('Session not found')) {
      // Clear invalid key
      keyInput.value = '';
      localStorage.removeItem('keybridge_connection_key');
      temporaryError.value = newState.error;
    }
  });

  // Unsubscribe on component unmount
  onUnmounted(() => {
    unsubscribe();
  });
});

// Computed properties for convenient state usage

/**
 * Active connection flag to KeyBridge server
 */
const isConnected = computed(() => clientState.value.connected);

/**
 * Current polling interval in milliseconds
 */
const pollRate = computed(() => clientState.value.pollRate);

/**
 * Last connection error text (from client)
 */
const clientError = computed(() => clientState.value.error);

/**
 * Displayed error (temporary error has priority)
 */
const displayError = computed(() => temporaryError.value || clientError.value);

/**
 * Flag indicating presence of active operations in queues
 */
const hasActiveOperations = computed(() =>
    clientState.value.queues.pending > 0 ||
    clientState.value.queues.active > 0
);

/**
 * Total count of active requests (pending + executing)
 */
const activeCount = computed(() =>
    clientState.value.queues.pending + clientState.value.queues.active
);

/**
 * Should the icon rotate (when there are active operations)
 */
const shouldRotate = computed(() =>
    hasActiveOperations.value
);

// ===== UNIFIED STATUSES =====

/**
 * Determines status icon based on connection state
 */
const statusIcon = computed(() => {
  if (isLoading.value) return 'mdi-timer-sand';                     // Loading/connecting
  if (hasActiveOperations.value) return 'mdi-timer-sand';           // Active requests
  if (isConnected.value) return 'mdi-connection';                   // Simply connected
  if (displayError.value) return 'mdi-alert-circle';                // Error
  if (keyInput.value && !isConnected.value) return 'mdi-link-off';  // Key exists but no connection
  return 'mdi-key-remove';                                          // No key
});

/**
 * Determines status indicator color
 */
const statusColor = computed(() => {
  if (hasRecentActivity.value) return 'warning';                    // Orange (recent activity)
  if (isLoading.value) return 'primary';                            // Blue (loading)
  if (hasActiveOperations.value) return 'primary';                  // Blue (active requests)
  if (isConnected.value) return 'success';                          // Green (simply connected)
  if (displayError.value) return 'error';                           // Red (error)
  if (keyInput.value && !isConnected.value) return 'error';         // Red (no connection)
  return 'grey';                                                    // Grey (no key)
});

/**
 * Forms tooltip text based on state
 */
const tooltipText = computed(() => {
  if (isLoading.value) return 'Connecting...';
  if (hasActiveOperations.value) return `Exchanging data... (${activeCount.value} active)`;
  if (isConnected.value) return `Connected • Interval: ${pollRate.value}ms`;
  if (displayError.value) return `Error: ${displayError.value}`;
  if (keyInput.value && !isConnected.value) return 'Connection inactive';
  return 'KeyBridge disconnected';
});

/**
 * Detailed connection status for display in panel
 */
const connectionStatus = computed(() => {
  if (isLoading.value) {
    return {
      type: "warning" as const,
      color: "warning",
      icon: "mdi-timer-sand",
      text: "Connecting...",
      isRunning: true,
    };
  }

  if (hasActiveOperations.value) {
    return {
      type: "info" as const,
      color: "primary",
      icon: "mdi-timer-sand",
      text: `Exchanging data (${activeCount.value} active)`,
      isRunning: true,
    };
  }

  if (isConnected.value) {
    return {
      type: "success" as const,
      color: "success",
      icon: "mdi-connection",
      text: "Connection active",
      isRunning: false,
    };
  }

  if (displayError.value) {
    return {
      type: "error" as const,
      color: "error",
      icon: "mdi-alert-circle",
      text: `Error: ${displayError.value}`,
      isRunning: false,
    };
  }

  if (keyInput.value && !isConnected.value) {
    return {
      type: "error" as const,
      color: "error",
      icon: "mdi-link-off",
      text: "Connection inactive",
      isRunning: false,
    };
  }

  return {
    type: "info" as const,
    color: "grey",
    icon: "mdi-key-remove",
    text: "KeyBridge disconnected",
    isRunning: false,
  };
});

/**
 * Opens panel and clears temporary states
 */
const openPanel = () => {
  showPanel.value = true;
  temporaryError.value = null;
};

/**
 * Closes panel and clears temporary errors
 */
const closePanel = () => {
  showPanel.value = false;
  temporaryError.value = null;
};

/**
 * Clears temporary error when entering new key
 */
const clearTemporaryError = () => {
  temporaryError.value = null;
};

/**
 * Saves connection key and establishes connection
 * Called when clicking "Connect" button or Enter in input field
 */
/**
 * Saves connection key and establishes connection
 */
const saveKey = async () => {
  const key = keyInput.value.trim();
  if (!key) return;

  isLoading.value = true;
  temporaryError.value = null;

  try {
    // Set key in KeyBridge client
    await keyBridgeClient.setKey(key);

    // Save key to localStorage for automatic connection
    localStorage.setItem('keybridge_connection_key', key);

    // If connection successful, hide panel after short delay
    if (clientState.value.connected) {
      setTimeout(() => {
        showPanel.value = false;
      }, 1000);
    }
  } catch (err: unknown) {
    console.error('Connection error:', err);

    // Handle case when key not found on server
    if (err instanceof Error && err?.message === 'KEY_NOT_FOUND') {
      // Clear invalid key
      keyInput.value = '';
      localStorage.removeItem('keybridge_connection_key');
      temporaryError.value = 'Session not found. Create key again.';
    } else {
      temporaryError.value = 'Connection error';
    }
  } finally {
    isLoading.value = false;
  }
};

/**
 * Clears connection key and disconnects
 */
const clearKey = () => {
  keyInput.value = '';
  temporaryError.value = null;
  keyBridgeClient.setKey(null);
  localStorage.removeItem('keybridge_connection_key');
};
</script>

<style scoped>
/* Styles for compact status button */
.status-fab {
  position: fixed;
  bottom: 16px;
  right: 16px;
  z-index: 1000;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
}

.status-fab:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
}

/* Rotation animation for synchronization icon */
.rotating-icon {
  animation: rotate 1s linear infinite;
}

/* Keyframes for rotation animation */
@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>