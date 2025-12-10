# Application Development Guide for Bitrix24

## 1. Introduction

This guide is a manual for using the "Vue.js UI Builder" application for Bitrix24. The application allows you to create modern, adaptive forms and custom fields using Vue3 and Vuetify 3, which can then be easily integrated into Bitrix24. The code examples presented in the documentation demonstrate practical applications of the builder in various business scenarios: from simple test forms to complex integrations with business processes, external APIs, and the CRM system. Each example includes a detailed description of the code structure, features of working with the Bitrix24 API through Axios, and customization recommendations for specific tasks. The application ensures full compatibility with the Bitrix24 ecosystem while maintaining the advantages of modern frontend development using Vue.js and Vuetify, making the user interface more intuitive and functional.

https://www.bitrix24.com/apps/app/Akfinance.vue_js_ui_builder/

## 2. Project Structure

### General Structure

```
src/
├── mock/                # Mock data for development
├── features/            # Features (functional application modules)
│   ├── example1-test-form/        # Example 1: Test form
│   ├── example2-redirect/         # Example 2: Redirection
│   ├── example3-business-process-workflow-starter/  # Example 3: Business process workflow starter
│   ├── example4-axios/            # Example 4: Working with external APIs
│   ├── example5-comments-form/    # Example 5: Comments form
│   ├── example6-business-process-field-set-value/  # Example 6: Setting values in Business Process field
│   └── example7-form-upload-files/  # Example 7: Uploading files to Business Process form
├── shared/              # Shared components and utilities
└── AppMount.vue         # Main entry point (should not be renamed)
```

### Examples Description

#### Example 1: Test form (`example1-test-form`)
- **Purpose**: Demonstration form with basic functionality
- **Capabilities**:
  - Text input and display with reactive computations
  - Button click handling with loading animation
  - Integration with Bitrix24 API for user data retrieval
  - Demonstration of lifecycle hooks usage

#### Example 2: Redirection (`example2-redirect`)
- **Purpose**: Demonstration of redirection to external resource
- **Components**:
  - `Example21RedirectButton.vue` - Button for initiating redirection
  - `Example22RedirectProcess.vue` - Redirection process component
- **Features**:
  - Automatic redirection after 3 seconds
  - Loading indicator during waiting time

#### Example 3: Business process workflow starter (`example3-business-process-workflow-starter`)
- **Purpose**: Business process management in Bitrix24
- **Functionality**:
  - Button for starting business process
  - Process state tracking
  - Periodic status polling
- **Features**:
  - Integration with Bitrix24 API
  - Error and loading state handling

#### Example 4: Working with external APIs (`example4-axios`)
- **Purpose**: Demonstration of working with external APIs
- **Functionality**:
  - Loading random cat facts from external API
  - Button for data refresh
  - Loading and error state handling
- **Technologies used**:
  - Axios for HTTP requests
  - Vuetify for UI components

#### Example 5: Comments form (`example5-comments-form`)
- **Purpose**: Full-featured comment system
- **Components**:
  - `CommentInput.vue` - Comment input field
  - `CommentsList.vue` - Comments list with pagination
- **Functionality**:
  - Adding new comments
  - Loading and displaying existing comments
  - Pagination and sorting
  - Integration with Bitrix24 CRM

#### Example 6: Custom field in Business Processes (`example6-business-process-field-set-value`)
- **Purpose**: Managing custom field values in business processes
- **Features**:
  - Multiple selection from dropdown
  - Saving values in JSON format
  - Input validation and processing
  - Integration with Bitrix24 API via `setUserfieldValue`
- **Limitations**:
  - Works only in custom field context
  - Requires mandatory field setup in business process settings

#### Example 7: File upload (`example7-form-upload-files`)
- **Purpose**: Component for uploading and managing files in CRM
- **Functionality**:
  - Single or multiple file upload
  - Upload progress display
  - Deletion of uploaded files
  - Integration with CRM entity fields
- **Features**:
  - Multiple file upload support
  - Visual upload process indication
  - Uploaded file state management
  - Integration with Bitrix24 API for file operations
- **Technologies used**:
  - Vue 3 Composition API
  - Vuetify 3 for UI components
  - Custom file upload manager

## 3. Detailed Folder Description

#### mock/
- **Purpose**: Contains mock data for development mode operation
- **Features**: This folder must always remain in the current project location
- **Contents**: JSON files emulating data from Bitrix24 (placement info, API responses)

#### features/
Contains functional application modules, each representing a separate feature:

```
features/
└── [feature-name]/
    ├── components/       # UI components for this feature
    ├── managers/         # Logic in composables (useAuth, useLogin)
    ├── services/         # API services and business logic
    └── [FeatureName].vue # Main feature component
```

Example structure:
```
features/
├── auth/
│   ├── components/
│   │   └── LoginForm.vue
│   ├── managers/
│   │   └── useAuth.js
│   ├── services/
│   │   └── authService.js
│   └── AuthComponent.vue
└── profile/
    └── ...
```

#### shared/
Contains reusable elements throughout the application:

```
shared/
├── components/          # Reusable UI components
├── composables/         # Shared composables
├── utils/               # Utility functions
└── types/               # TypeScript types
```

## 3. Application API

The `api()` object provides access to Bitrix24 functionality and auxiliary tools.

### 3.1. Properties of api()

#### api().fields
Contains properties passed to the application from Bitrix24.

- **api().fields.placement** - data passed from Bitrix24, similar to the `BX24.placement.info` function
  - Documentation: [BX24.placement.info](https://apidocs.bitrix24.com/api-reference/widgets/ui-interaction/bx24-placement-info.html)

### 3.2. Methods of api()

#### api().methods.b24Call
Asynchronous method for making requests to the Bitrix24 REST API.

- Similar to the `BX24.callMethod` method, but returns a Promise
- Usage: `const response = await api().methods.b24Call('method.name', params)`
- Doesn't require a callback parameter, simplifying asynchronous code
- Documentation: [BX24.callMethod](https://apidocs.bitrix24.com/sdk/bx24-js-sdk/how-to-call-rest-methods/bx24-call-method.html)

#### api().methods.axios
Standard Axios plugin (version 1.11.0) for making HTTP requests.

- **Purpose**: Making requests to external APIs or custom backend services
- Documentation: [Axios](https://axios-http.com/docs/intro)

#### api().methods.toast
Integration with the "vue-toastification" library (version ^2.0.0-rc.5).

- **Purpose**: Displaying notifications and informational messages to the user
- Usage example: `api().methods.toast.success('Operation completed!')`

#### api().methods.openCustomScript
Method for opening custom scripts in a slider.

- **Syntax**: `api().methods.openCustomScript(scriptName: string, params = {})`
- **Important**: The method is not available in development mode, works only after compilation and loading into Bitrix24
- **Purpose**: Transition between different scripts within the application

## 4. Working with Mock Data

Since development mode is isolated from Bitrix24, you need to create mock data for testing.

### 4.1. Obtaining Placement Data

1. In the Bitrix24 application, create a widget embedding and enable development mode
2. Go to the widget placement location in the Bitrix24 interface
3. Click the "Development" button at the widget placement location
4. In the opened slider, click "Input Data" (in the top right corner)
5. Click the export icon (↑) to save the file
6. Place the saved file in the `/src/mock/` folder; if the folder doesn't exist, create it

Now when calling `api().fields.placement` in development mode, the saved data will be used.

### 4.2. Creating Mock API Requests

1. In web development mode, click "API Debugger" (top right corner)
2. In the "Method" field, specify the API method name (for example, `user.get`)
3. In the "Data (JSON)" field, specify request parameters:
   ```json
   {
     "filter": {
       "ID": 1
     }
   }
   ```
4. Click "Send"
5. After receiving the response, click the export icon (↑)
6. Save the file in the `/src/mock/` folder

Example mock file structure:
```json
{
  "method": "user.get",
  "params": {
    "filter": {
      "ID": 1
    }
  },
  "response": {
    "result": [...],
    "total": 1
  },
  "delay": 200
}
```

Note: The `delay` parameter can be edited manually to emulate various API response speeds.

## 5. Installation and Launch

### 5.1. Installing Dependencies

Before the first project launch, execute in the project root:

```bash
npm install
```

### 5.2. Development Mode

To launch development mode, use the command:

```bash
npm run dev
```

After launch, the console will show the address where the application is accessible (usually `http://localhost:5173`).

### 5.3. Project Build

To compile the application into a production version, execute:

```bash
npm run build
```

After executing the command, the following files will appear in the `dist/` folder:
- `dev-b24vue.js` - main JavaScript file
- `dev-b24vue.css` - application styles (if used)

### 5.4. Deployment to Bitrix24

1. Go to web development mode in Bitrix24
2. Switch to "Loading a ready-made solution" mode
3. Upload the compiled files from the `dist/` folder
4. Save changes

After uploading, the files will be automatically applied when opening the widget.

## 6. Usage Examples

### Example 1: Getting User Data

```javascript
// In composables/user.js
export const useUser = () => {
  const getUser = async (userId) => {
    try {
      const response = await api().methods.b24Call('user.get', {
        filter: { ID: userId }
      });
      return response.result[0];
    } catch {
      api().methods.toast.error('Error loading user data');
      throw error;
    }
  };
  
  return { getUser };
};
```

### Example 2: Displaying a Notification

```javascript
// In a component
import { useUser } from '@/features/user/composables/useUser';

export default {
  setup() {
    const { getUser } = useUser();
    
    const loadUser = async () => {
      try {
        const user = await getUser(1);
        api().methods.toast.success(`User ${user.NAME} loaded`);
      } catch {
        // Error handling
      }
    };
    
    return { loadUser };
  }
};
```

## 7. Additional Resources

- [Official Bitrix24 REST API Documentation](https://apidocs.bitrix24.com/api-reference/)
- [Documentation on Widgets and UI Interaction](https://apidocs.bitrix24.com/api-reference/widgets/)
