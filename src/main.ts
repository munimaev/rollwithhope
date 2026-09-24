import { ViteSSG } from 'vite-ssg'
import App from './App.vue'
import { routes } from './router'
import '@fontsource-variable/alegreya'
import '@fontsource-variable/literata'
import './styles/index.css'

export const createApp = ViteSSG(App, { routes, base: import.meta.env.BASE_URL })
