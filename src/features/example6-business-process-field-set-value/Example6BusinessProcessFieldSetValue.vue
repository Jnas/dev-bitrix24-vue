<!--
Example 6: Setting value in business process custom field

Purpose:
The component allows programmatically filling the value of a custom field in a Bitrix24 business process.

How it works:
1. You create a custom field with the required view.
2. In the business process configuration in the "Request additional information" element, select the created custom field
3. In the "Request additional information" field settings, mark it as required
4. When the code is executed (for example, when filling the field) the value is saved to this field and the running business process will consider this field filled

IMPORTANT LIMITATIONS:
- The code works ONLY in the context of the custom field it is embedded in
- Cannot change other entity fields, only the current field
- The setUserfieldValue() method is only available inside a custom field

Example call: api().methods.setUserfieldValue("your value");
-->
<template>
  <v-app>
    <v-main>
      <v-card style="background-color: #f8fafb">
        <v-card-title>
          Select fruits
        </v-card-title>
        <!-- Dropdown list for selecting fruits -->
        <v-combobox
            v-model="selectedFruits"
            :items="availableFruits"
            label="Add fruits"
            multiple
            clearable
            hide-details
        >
          <template #selection="{ item, index }">
            <v-chip
                size="small"
                closable
                color="success"
                variant="elevated"
                text-color="black"
                class="ma-1"
                @click:close="removeFruit(index)"
            >
              {{ item.value }}
            </v-chip>
          </template>
        </v-combobox>
      </v-card>
    </v-main>
  </v-app>
</template>

<script>
import {api} from "../../../dev/api.ts";

export default {
  data() {
    return {
      // Current value of selected fruits
      // Stored in array of strings format: ['Apple', 'Banana', ...]
      selectedFruits: [],

      // List of available fruits for selection
      // Used for display in dropdown list
      availableFruits: [
        'Apple', 'Banana', 'Orange', 'Kiwi',
        'Grapes', 'Pear', 'Pineapple', 'Mango'
      ]
    };
  },

  /**
   * Lifecycle hook: called when component is mounted
   * Restores previously saved values from the custom field
   */
  mounted() {
    // Get saved value from custom field
    // api().fields.placement.options.VALUE contains the current field value
    const rawValue = api()?.fields?.placement?.options?.VALUE;

    // Parse and set initial values
    this.selectedFruits = this.parseInitial(rawValue);
  },

  watch: {
    /**
     * Watcher for changes in selected fruits list
     * Automatically synchronizes changes with business process
     *
     * @param {Array} list - New value of selected fruits list
     */
    selectedFruits: {
      handler(list) {
        // Save in JSON string format if list is not empty
        // Or null if list is empty (to reset field value)
        api().methods.setUserfieldValue(
            list.length ? JSON.stringify(list) : null
        );
      },
      immediate: true // Call handler immediately on initialization
    }
  },

  methods: {
    /**
     * Removes a fruit from selected list by index
     * @param {number} idx - Index of fruit to remove in selectedFruits array
     */
    removeFruit(idx) {
      this.selectedFruits.splice(idx, 1);
    },

    /**
     * Parses initial value from custom field
     * Handles various input data formats
     *
     * @param {any} val - Input value from custom field
     * @returns {Array} - Normalized array of selected fruits
     */
    parseInitial(val) {
      // If value is missing or empty, return empty array
      if (!val) {
        return [];
      }

      // 1. Convert value to string and decode HTML entities
      // (in case value was encoded when saved)
      const str = String(val);
      const tempElement = document.createElement('textarea');
      tempElement.innerHTML = str;
      let decoded = tempElement.value;

      // Double decoding in case of multiple escaping
      tempElement.innerHTML = decoded;
      decoded = tempElement.value;

      // 2. Try to parse value as JSON array
      try {
        const parsedArray = JSON.parse(decoded);

        if (Array.isArray(parsedArray)) {
          return parsedArray
              // Keep only string values
              .filter(item => typeof item === 'string')
              // Remove extra spaces
              .map(item => item.trim())
              // Keep only fruits from available list
              .filter(fruit => this.availableFruits.includes(fruit));
        }
      } catch (error) {
        // In case of parsing error (invalid JSON) return empty array
        console.warn('Failed to parse saved value:', error);
      }

      return [];
    }
  }
};
</script>