import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import jotaiDebugLabel from 'jotai/babel/plugin-debug-label'
import jotaiReactRefresh from 'jotai/babel/plugin-react-refresh'

export default defineConfig(() => ({
  resolve: {
    alias: {
      eventsource: 'pocketbase',
    },
  },
  plugins: [
    react({ babel: { plugins: [jotaiDebugLabel, jotaiReactRefresh] } }),
  ],
}))
