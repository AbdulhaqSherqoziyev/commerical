import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({ base: '/superadmin/', plugins: [react()], build: { outDir: 'dist' } })
