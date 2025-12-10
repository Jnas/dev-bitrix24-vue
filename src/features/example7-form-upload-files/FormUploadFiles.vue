<!--
  FormUploadFiles.vue - Component for uploading files to CRM

  The component provides functionality for uploading and managing files
  with integration into Bitrix24 CRM. Supports multiple upload,
  upload progress display, and deletion of uploaded files.

  Main functionality:
  - Uploading one or multiple files
  - Deleting uploaded files
  - Integration with CRM entity fields

  Technologies used:
  - Vue.js 3 Composition API
  - Vuetify 3 for UI components
  - Bitrix24 API for working with files
-->
<template>
  <div>
    <v-file-input
        :model-value="allFiles"
        @update:model-value="handleFileAdd"
        label="Attach files"
        multiple
        chips
        placeholder="Choose files"
        prepend-icon="mdi-paperclip"
        counter
        hide-details="auto"
        :clearable="false"
    >
      <template #selection>
        <v-chip
            v-for="(file, index) in allFiles"
            :key="fileKey(file, index)"
            size="small"
            class="ma-1"
            label
            variant="flat"
            :color="manager.isUploadedFile(file) ? 'success' : 'grey-lighten-1'"
        >
          <template #prepend>
            <div v-if="!manager.isUploadedFile(file)">
              <v-progress-circular
                  indeterminate
                  size="20"
                  class="mr-2 ml-0 pl-0"
              />
            </div>
          </template>
          {{ file.name }}
          <v-icon
              v-if="manager.isUploadedFile(file)"
              size="x-small"
              class="ml-1 cursor-pointer"
              @click.stop="removeFile(file)"
          >
            mdi-close
          </v-icon>
        </v-chip>
      </template>
    </v-file-input>
  </div>
</template>

<script setup lang="ts">
/**
 * Component and utility imports
 */
import {computed, onMounted, onUnmounted, watch} from 'vue';
import type {FileWithCustomProps, UploadedFileType} from "@/features/example7-form-upload-files/types/types.ts";
import {FileUploadManager} from "@/features/example7-form-upload-files/managers/FileUploadManager.ts";

// Initialize file upload manager
const manager = new FileUploadManager();

// Component mount flag to prevent memory leaks
let isMounted = true;

/**
 * Lifecycle hook: mounted
 *
 * Executed after component mounting.
 * Initializes file upload manager and sets user field value.
 */
onMounted(async () => {
  isMounted = true;
  await manager.initialize();
  manager.setUserFieldValue();
});

/**
 * Lifecycle hook: unmounted
 *
 * Executed after component unmounting.
 * Resets mount flag to prevent memory leaks.
 */
onUnmounted(() => {
  isMounted = false;
});

/**
 * Computed properties
 */

/**
 * Gets list of all files from manager
 * @type {ComputedRef<FileWithCustomProps[]>}
 */
const allFiles = computed<FileWithCustomProps[]>(() => manager.files);

/**
 * Event handlers
 */

/**
 * Handles addition of new files
 * @param {File|File[]|null} files - Files to add
 */
const handleFileAdd = (files: File | File[] | null) => {
  if (!isMounted) return;
  const filesArray = Array.isArray(files) ? files : files ? [files] : null;
  manager.addFiles(filesArray);
};

/**
 * Removes file from list
 * @param {File} file - File to remove
 */
const removeFile = (file: File) => {
  if (!isMounted) return;
  if ('id' in file && manager.isUploadedFile(file as FileWithCustomProps)) {
    manager.removeFile(file as FileWithCustomProps & UploadedFileType);
  }
  // Update business process field value, passing actual list of uploaded file IDs
  // If a file was deleted, it is automatically excluded from the list
  manager.setUserFieldValue();
};

/**
 * Checks if files are currently being uploaded
 * Used to display upload state and block interface
 * @type {ComputedRef<boolean>}
 */
const isLoading = computed(() => {
  return allFiles.value.some(file => !file.isUploaded);
});

/**
 * Watcher: isLoading
 *
 * Watches for changes in isLoading property and sets user field value.
 */
watch(isLoading, (value) => {
  // TODO here we set the value in the form, when upload is in progress we set null and then the Business process will reset and consider this field not filled, otherwise we set all uploaded files in the field
  manager.setUserFieldValue(value ? null : undefined);
})

/**
 * Generates unique key for file
 * Used by Vue for efficient updating of file list in v-for
 * @param {File} file - File
 * @param {number} index - File index in list (used as fallback)
 * @returns {string} Unique key in format 'file-{type}-{id}'
 */
const fileKey = (file: File, index: number) => {
  if (manager.isLocalFile(file as FileWithCustomProps)) {
    return `file-local-${(file as FileWithCustomProps & { tempId: string }).tempId}`;
  }
  // Check for id via manager
  else if (manager.isUploadedFile(file as FileWithCustomProps)) {
    return `file-uploaded-${(file as FileWithCustomProps & UploadedFileType).id}`;
  }
  return `file-new-${index}`;
};
</script>