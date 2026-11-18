import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import https from 'https'

function ttsProxyPlugin(): Plugin {
  return {
    name: 'tts-proxy-plugin',
    configureServer(server) {
      server.middlewares.use('/api/tts', (req, res) => {
        try {
          const urlObj = new URL(req.url || '', 'http://localhost');
          const q = urlObj.searchParams.get('q');
          if (!q) {
            res.statusCode = 400;
            res.end('Missing query parameter q');
            return;
          }
          const ttsUrl = 'https://translate.google.com/translate_tts?ie=UTF-8&tl=vi&client=tw-ob&q=' + encodeURIComponent(q);
          const ttsReq = https.get(
            ttsUrl,
            {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Referer': 'https://translate.google.com/',
              },
            },
            (ttsRes) => {
              res.writeHead(ttsRes.statusCode || 200, {
                'Content-Type': ttsRes.headers['content-type'] || 'audio/mpeg',
                'Cache-Control': 'public, max-age=86400',
              });
              ttsRes.pipe(res);
            }
          );
          ttsReq.on('error', () => {
            res.statusCode = 500;
            res.end('TTS Proxy Error');
          });
        } catch {
          res.statusCode = 500;
          res.end('Server Error');
        }
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), ttsProxyPlugin()],
  server: {
    host: true,
    port: 5173,
  },
})


