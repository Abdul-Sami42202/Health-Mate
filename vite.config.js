import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        family: resolve(__dirname, 'family.html'),
        reports: resolve(__dirname, 'reports.html'),
        reportView: resolve(__dirname, 'report-view.html'),
        timeline: resolve(__dirname, 'timeline.html'),
        profile: resolve(__dirname, 'profile.html'),
        legal: resolve(__dirname, 'legal.html'),
        help: resolve(__dirname, 'help.html'),
        signin: resolve(__dirname, 'signin.html'),
        signup: resolve(__dirname, 'signup.html'),
      }
    }
  }
});