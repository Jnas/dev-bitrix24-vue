<template>
  <div :class="isclass ? 'app-loader' : ''">
    <div>
      <div
        v-if="text !== undefined && text !== null && text.length > 0"
        class="text-center"
      >
        {{ text }}
      </div>
      <div style="display: flex; justify-content: center">
        <v-progress-circular
          :color="color"
          indeterminate
          :size="size"
          :value="percent"
          :width="width"
        >
          {{ percent === undefined || percent === null ? "" : percent + "%" }}
        </v-progress-circular>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted } from "vue";

const props = defineProps({
  width: {
    type: Number,
    default: 5,
  },
  isclass: {
    type: Boolean,
    default: true,
  },
  value: {
    type: Number,
    default: undefined,
  },
  size: {
    type: Number,
    default: 75,
  },
  text: {
    type: String,
    default: undefined,
  },
});

const color = ref("");
const oldValue = ref(0);

const percent = computed(() => {
  return props.value === undefined || props.value === -1
    ? undefined
    : props.value;
});

const setColor = () => {
  const colors = [
    "red",
    "blue",
    "green",
    "purple",
    "indigo",
    "deep-purple",
    "cyan",
    "teal",
    "light-blue",
    "light-green",
    "lime",
    "blue-grey",
  ];
  color.value = colors[Math.floor(Math.random() * colors.length)];
};

watch(
  () => props.value,
  (newValue) => {
    if (newValue === undefined) return;
    if (Math.abs(oldValue.value - newValue) > 15) setColor();
    oldValue.value = newValue;
  },
);

watch(
  () => props.text,
  () => {
    setColor();
  },
);

onMounted(() => {
  setColor();
});
</script>

<style scoped>
.app-loader {
  width: 100%;
  height: 100%;
  position: fixed;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
  z-index: 1000;
}
</style>
