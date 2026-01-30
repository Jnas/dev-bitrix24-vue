// /dev/main.ts
import { createApp } from 'vue'
import AppMount from '../src/AppMount.vue'
import vuetify from './vuetify'

async function setupDevTools(app: ReturnType<typeof createApp>) {
    const { default: Toast, useToast } = await import('vue-toastification')
    if (import.meta.env.DEV) {
        import('vue-toastification/dist/index.css')
    }
    app.use(Toast, { icon: false })
    ;(window as unknown as { Toast: ReturnType<typeof useToast> }).Toast = useToast()

    const { default: Axios } = await import('axios')
    ;(window as unknown as { Axios: typeof Axios }).Axios = Axios

    // 👇 Connect ConnectionKeyPanel only in DEV
    if (import.meta.env.DEV) {
        const { default: ConnectionKeyPanel } = await import('./key-bridge/ConnectionKeyPanel.vue')

        // create a separate container for the panel
        const devContainer = document.createElement('div')
        devContainer.id = 'dev-tools-container'
        document.body.appendChild(devContainer)

        // mount the panel as a separate application
        const devApp = createApp(ConnectionKeyPanel)
        devApp.use(vuetify)
        devApp.mount('#dev-tools-container')
    }
}

function resolveContainer(target: string | Element): Element {
    if (typeof target === 'string') {
        const el = document.querySelector(target)
        if (!el) throw new Error(`Container not found: ${target}`)
        return el
    }
    return target
}

export async function initApp(container: string | Element = '#appMount') {
    try {
        const app = createApp(AppMount)
        app.use(vuetify)

        if (import.meta.env.DEV) {
            await setupDevTools(app)

            const savedKey = localStorage.getItem('keybridge_connection_key');
            if (savedKey) {
                try {
                    await keyBridgeClient.setKey(savedKey);
                } catch {
                }
            }
        }

        app.mount(resolveContainer(container))
    } catch {
        console.error('Application initialization error')
    }
}

if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        if (document.querySelector('#appMount')) {
            initApp()
        }
    })
}
