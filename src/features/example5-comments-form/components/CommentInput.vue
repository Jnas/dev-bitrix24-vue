<!-- components/CommentInput.vue -->
<!--
  CommentInput.vue - Component for new comment input

  The component provides a text field for entering a comment with the ability
  to send by pressing a button or the Ctrl+Enter key combination.

  Props:
  - avatar: string - URL of the current user's avatar
  - loading?: boolean - loading flag (optional)
  - currentUser?: string - current user's name (optional)
  - reset: boolean - comment text reset flag

  Events:
  - submit - triggered when comment is submitted
-->
<template>
  <div class="comment-input-container pa-4">
    <v-sheet rounded="lg" elevation="1" class="pa-3">
      <v-row align="start" no-gutters>
        <!-- User avatar -->
        <v-col cols="auto" class="pr-3">
          <v-avatar size="40">
            <v-img :src="avatar" :alt="currentUser"></v-img>
          </v-avatar>
        </v-col>

        <!-- Input field and submit button -->
        <v-col>
          <!-- Field for entering comment text -->
          <v-textarea
              v-model="commentText"
              :disabled="loading"
              label="Write a comment..."
              placeholder="Enter your comment here"
              rows="3"
              auto-grow
              clearable
              hide-details="auto"
              :class="{ 'loading-overlay': loading }"
              @keydown.enter.ctrl="handleSubmit"
          ></v-textarea>

          <!-- Panel with submit button -->
          <div class="d-flex justify-end mt-2">
            <!-- Loading indicator -->
            <v-progress-linear
                v-if="loading"
                indeterminate
                color="primary"
                class="loading-indicator"
            ></v-progress-linear>

            <!-- Comment submit button -->
            <v-btn
                color="primary"
                :loading="loading"
                :disabled="loading || !commentText.trim()"
                @click="handleSubmit"
            >
              <v-icon start icon="mdi-send"></v-icon>
              Send
            </v-btn>
          </div>

          <!-- Hotkey hint -->
          <div v-if="!loading" class="text-caption text-grey mt-1 d-flex justify-end">
            Press Ctrl+Enter to send
          </div>
        </v-col>
      </v-row>
    </v-sheet>
  </div>
</template>

<script setup lang="ts">
import {computed, ref, watch} from 'vue';

// Component props definition
const props = defineProps<{
  avatar: string;       // URL of user's avatar
  loading?: boolean;    // Loading flag (optional)
  currentUser?: string; // Current user's name (optional)
  reset: boolean        // Comment text reset flag
}>();

// Watch for reset flag changes and clear input field
watch(() => props.reset, () => {
  commentText.value = ''
})

// Component events definition
const emit = defineEmits<{
  (e: 'submit', text: string): void;  // Comment submission event
}>();

// Reactive reference to comment text
const commentText = ref('');

// Computed property for comment validity check
const isValid = computed(() => {
  return commentText.value.trim().length > 0;
});

/**
 * Comment submission handler
 * Emits submit event with comment text if it's not empty
 */
const handleSubmit = () => {
  if (isValid.value && !props.loading) {
    const trimmedText = commentText.value.trim();
    emit('submit', trimmedText);
  }
};
</script>

<style scoped>
/* Component container */
.comment-input-container {
  max-width: 800px;
  margin: 0 auto;
}

/* Style for loading state */
.loading-overlay {
  opacity: 0.7;
  pointer-events: none;
  user-select: none;
}

/* Style for loading indicator */
.loading-indicator {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1;
  border-radius: 4px;
}
</style>