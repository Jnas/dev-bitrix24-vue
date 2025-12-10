<!-- components/CommentsList.vue -->
<!--
  CommentsList.vue - Component for displaying comments list with pagination

  The component displays a list of comments with the ability to view them page by page.
  Comments are sorted in descending order of time (newest at the top).

  Props:
  - comments: Ref<CommentType[]> - reactive reference to array of comments
  - itemsPerPage: number - number of comments per page
-->
<template>
  <div class="comments-container">
    <!-- Comments list -->
    <v-list class="comments-list">
      <!-- Display each comment -->
      <v-list-item
          v-for="comment in displayedComments"
          :key="comment.userId + comment.timestamp"
          class="comment-item"
      >
        <!-- User avatar -->
        <template v-slot:prepend>
          <v-avatar size="40">
            <v-img :src="comment.avatar" :alt="comment.username"></v-img>
          </v-avatar>
        </template>

        <!-- Comment content -->
        <div class="w-100">
          <!-- Comment header with name and time -->
          <div class="d-flex justify-space-between align-center">
            <div class="font-weight-bold">{{ comment.username }}</div>
            <div class="text-caption text-grey time-badge">
              {{ formatTime(comment.timestamp) }}
              <!-- Tooltip with full date -->
              <v-tooltip activator="parent" location="top">
                {{
                  new Date(comment.timestamp).toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                }}
              </v-tooltip>
            </div>
          </div>

          <!-- Comment text -->
          <div class="comment-text mt-1">{{ comment.text }}</div>
        </div>
      </v-list-item>

      <!-- Message if there are no comments -->
      <v-list-item v-if="reversedComments.length === 0" class="text-center py-8">
        <v-list-item-title class="text-grey">No comments</v-list-item-title>
      </v-list-item>
    </v-list>

    <!-- Pagination (displayed if more than one page) -->
    <div class="pagination-container mt-4" v-if="totalPages > 1">
      <v-pagination
          v-model="currentPage"
          :length="totalPages"
          :total-visible="7"
          rounded="circle"
          active-color="primary"
          @update:model-value="handlePageChange"
      ></v-pagination>

      <div class="text-center mt-2 text-grey">
        Page {{ currentPage }} of {{ totalPages }} • Total comments: {{ reversedComments.length }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed, type Ref, ref, watch} from 'vue';
import type { CommentType } from '../types/types';

// Component props
const props = defineProps<{
  comments: Ref<CommentType[]>;  // Reactive array of comments
  itemsPerPage: number;          // Number of comments per page
}>();

// Current pagination page
const currentPage = ref(1);

/**
 * Returns an array of comments sorted in descending order of time (newest at the top)
 */
const reversedComments = computed(() => {
  return [...props.comments.value].sort((a, b) => b.timestamp - a.timestamp);
});

/**
 * Calculates the total number of pages based on the number of comments
 */
const totalPages = computed(() => {
  return Math.ceil(reversedComments.value.length / props.itemsPerPage);
});

/**
 * Returns a subarray of comments for the current page
 */
const displayedComments = computed(() => {
  const start = (currentPage.value - 1) * props.itemsPerPage;
  const end = start + props.itemsPerPage;
  return reversedComments.value.slice(start, end);
});

/**
 * Formats a timestamp into a readable format (e.g., "2 hours ago")
 * @param {number} timestamp - Timestamp in milliseconds
 * @returns {string} Formatted time string
 */
const formatTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);

  if (seconds < 10) {
    return 'just now';
  } else if (seconds < 60) {
    return `${seconds} sec. ago`;
  } else if (minutes < 60) {
    return `${minutes} min. ago`;
  } else if (hours < 24) {
    return `${hours} hr. ago`;
  } else if (days < 7) {
    return `${days} days ago`;
  } else if (weeks < 4) {
    return `${weeks} weeks ago`;
  } else {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
};

// Reset to first page when comments list changes
watch(() => props.comments.value.length, () => {
  currentPage.value = 1;
});

// Page change handler
const handlePageChange = (newPage: number) => {
  currentPage.value = newPage;
  // Scroll to top of list when changing page
  const container = document.querySelector('.comments-container');
  container?.scrollTo({top: 0, behavior: 'smooth'});
};
</script>

<style scoped>
.comments-list {
  max-width: 800px;
  margin: 0 auto;
}

.comment-item {
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  padding: 16px 0;
  transition: background-color 0.2s;
}

.comment-item:hover {
  background-color: rgba(0, 0, 0, 0.02);
}

.comment-text {
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.5;
}

.time-badge {
  cursor: help;
  transition: opacity 0.2s;
}

.time-badge:hover {
  opacity: 0.8;
}

.pagination-container {
  max-width: 800px;
  margin: 0 auto;
}
</style>