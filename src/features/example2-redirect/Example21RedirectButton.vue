<!--
  Example21RedirectButton.vue - Button for initializing redirection process
  
  The component provides a button that, when clicked, opens a custom script
  for performing redirection. The script content is defined in the Example22RedirectProcess.vue component.
  
  Main functionality:
  - Displaying a button with click handler
  - Integration with Bitrix24 API for opening a custom script
  
  Technologies used:
  - Vue.js 3 Composition API
  - Vuetify 3 for UI components
  - Integration with Bitrix24 via api().methods
-->
<template>
  <v-app style="background-color: #f9fafb">
    <v-main>
      <v-container>
        <v-btn
            color="primary"
            @click="onButtonClick"
            class="mb-2"
        >
          Click me
        </v-btn>
      </v-container>
    </v-main>
  </v-app>
</template>

<script>
import {api} from "../../../dev/api.js";

export default {
  name: 'RedirectButton',
  methods: {
    /**
     * Button click handler
     * Opens a custom script to perform redirection
     * @fires api().methods.openCustomScript - Opens the specified custom script
     */
    async onButtonClick() {
      // Call API method to open the redirection custom script
      api().methods.openCustomScript("customScriptRedirect")
    },
  },
};
</script>
