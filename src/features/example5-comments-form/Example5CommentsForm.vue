<template>
  <!-- Main component container -->
  <div class="comments-form-container">
    <!-- Loading indicator for initial data loading -->
    <AppLoader v-if="isInitialLoading"/>

    <!-- Error display block -->
    <div v-else-if="errorMessage" class="error-message pa-4">
      <v-alert type="error" prominent>
        {{ errorMessage }}
        <!-- Button to retry data loading -->
        <v-btn color="primary" class="ml-2" @click="retryLoad">Retry</v-btn>
      </v-alert>
    </div>

    <!-- Main content after loading -->
    <div v-else>
      <!-- New comment input component -->
      <CommentInput
          :avatar="commentManager.currentUserAvatar"
          :loading="isAddingComment"
          :current-user="commentManager.currentUserName"
          @submit="onSubmit"
          :reset="resetText"
      />

      <!-- Comments list display component -->
      <CommentsList
          :comments="commentManager.comments"
          :items-per-page="5"
          :loading="isLoadingComments"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import {onMounted, ref} from "vue";
import AppLoader from "@/shared/components/AppLoader.vue";
import CommentsList from "@/features/example5-comments-form/components/CommentsList.vue";
import CommentInput from "@/features/example5-comments-form/components/CommentInput.vue";
import CommentManager from "@/features/example5-comments-form/managers/CommentManager.ts";

// Component states
const isInitialLoading = ref(true); // Initial data loading flag
const isAddingComment = ref(false); // Comment addition process flag
const isLoadingComments = ref(false); // Comments list loading flag
const resetText = ref(false); // Input field reset flag
const errorMessage = ref<string | null>(null); // Error message

/**
 * Comment manager - main class for working with comments
 * Encapsulates API interaction logic and comment state management
 */
// Component configuration
const config = {
  // CRM entity type ID
  entityTypeId: 1288,
  // Business process template ID
  bizprocTemplateId: 1915
}


// Initialize comment manager with passed parameters
const commentManager = new CommentManager(config.entityTypeId, config.bizprocTemplateId);

/**
 * Loads data for comments form
 */
const loadData = async () => {
  try {
    errorMessage.value = null;
    isInitialLoading.value = true;
    isLoadingComments.value = true;

    await commentManager.initialize();
  } catch  {
    console.error('Error loading data');
    errorMessage.value = 'Failed to load comments. Please try again later.';
  } finally {
    isInitialLoading.value = false;
    isLoadingComments.value = false;
  }
};

/**
 * Retry data loading
 */
const retryLoad = () => {
  loadData();
};

/**
 * New comment submission handler
 * @param {string} text - Comment text
 */
const onSubmit = async (text: string) => {
  if (!text.trim()) return;

  isAddingComment.value = true;

  try {
    const success = await commentManager.addComment(text);
    if (success) {
      // Invert reset flag to clear input field
      resetText.value = !resetText.value;
    } else {
      errorMessage.value = 'Failed to add comment. Please try again.';
    }
  } catch {
    console.error('Error submitting comment');
    errorMessage.value = 'An error occurred while submitting the comment.';
  } finally {
    isAddingComment.value = false;
  }
};

/**
 * Lifecycle hook: called when component is mounted
 * Initiates data loading on first render
 */
onMounted(() => {
  loadData();
});
</script>

<style scoped>
.comments-form-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.error-message {
  background-color: #ffebee;
  border-radius: 8px;
  margin-bottom: 20px;
}
</style>