import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/Lesson-Plan/',
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
