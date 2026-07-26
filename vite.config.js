import { defineConfig } from 'vite';

export default defineConfig({
  // A1: GitHub Pages serves this repo at /fabric-of-space/, not at the
  // domain root. Without a relative base, the build emits src="/assets/..."
  // which 404s there — a black screen. './' makes every asset path relative
  // to wherever the page actually sits, so the same dist/ works anywhere.
  base: './',
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
      // M12i: the OGLE archive speaks plain HTTP files, no CORS. Same trick.
      '/api/ogle': {
        target: 'https://www.astrouw.edu.pl',
        changeOrigin: true,
        rewrite: (path) => path.replace('/api/ogle', '/ogle/ogle4/ROTATION_CURVE'),
      },
    },
  },
});