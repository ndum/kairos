import { createApp } from 'vue'

import App from './ui/App.vue'
import { createAppI18n } from './ui/i18n'
import { createAppRouter } from './ui/router'
import './ui/styles/main.css'

// Composition root. Adapters are created here and handed to the application services as
// the features that need them arrive.
createApp(App).use(createAppRouter()).use(createAppI18n()).mount('#app')
