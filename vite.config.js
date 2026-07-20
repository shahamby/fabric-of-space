import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/api/horizons': {
        target: 'https://ssd.jpl.nasa.gov',
        changeOrigin: true,
        rewrite: (path) => path.replace('/api/horizons', '/api/horizons.api'),
      },
      // M12d: VizieR won't set CORS headers for us either. Same trick.
      '/api/vizier': {
        target: 'https://vizier.cds.unistra.fr',
        changeOrigin: true,
        rewrite: (path) => path.replace('/api/vizier', '/viz-bin/asu-tsv'),
      },
    },
  },
});