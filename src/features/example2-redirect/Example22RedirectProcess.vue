<!-- 
  Example22RedirectProcess.vue - Redirection process component

  The component displays a loading indicator and redirects to the specified URL
  after a short delay. Used as the target page for the redirection process.

  Main functionality:
  - Displaying a loading indicator during redirection wait time
  - Automatic redirection to the specified URL after delay

  Technologies used:
  - Vue.js 3 Composition API
  - Vuetify 3 for UI components
-->
<!-- this is customScriptRedirect -->
<template>
  <v-app>
    <v-main class="redirect-container">
      <p>Redirecting...</p>
      <v-progress-circular
          indeterminate
          color="primary"
          class="mt-2"
      />
    </v-main>
  </v-app>
</template>

<script>
export default {
  name: 'RedirectProcess',
  /**
   * Lifecycle hook: executed after component is mounted to DOM
   * Sets a timer to redirect to the Bitrix24 API documentation page
   * @lifecycle
   */
  mounted() {
    // Set a timer for redirection after 3 seconds
    setTimeout(() => {
      // Redirect to the Bitrix24 API documentation page
      window.location.href = 'https://apidocs.bitrix24.ru/api-reference/';
    }, 3000);
  }
}
</script>

<style scoped>
.redirect-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin: 0;
  padding: 0;
  text-align: center;
}
</style>