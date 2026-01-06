
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // 브라우저에서 process.env.API_KEY 참조 시 에러 방지
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || '')
  }
});
