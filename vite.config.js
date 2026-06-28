import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/investment-simulator/', // ★リポジトリ名と同じ名前を「/」で挟んで追加
})
