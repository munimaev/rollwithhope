import { ViteSSG } from 'vite-ssg'
import App from './App.vue'
import { routes } from './router'
import './styles/tokens.css'
import '@fontsource/eb-garamond/400.css'
import '@fontsource/eb-garamond/600.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import './styles/base.css'

export const createApp = ViteSSG(App, { routes, base: import.meta.env.BASE_URL })
