import http from 'http';

const PORT = 3001;

// Danh sách các client web (SSE - Server Sent Events) đang kết nối để nhận tọa độ
const clients = new Set();

const server = http.createServer((req, res) => {
  // CORS Headers cho phép App Mobile và Web gọi
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 1. Endpoint SSE để Website bản đồ 3D kết nối và lắng nghe vị trí real-time
  if (req.url === '/api/events' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    res.write('data: {"status":"connected"}\n\n');
    clients.add(res);

    req.on('close', () => {
      clients.delete(res);
    });
    return;
  }

  // 2. Endpoint Webhook để App React Native gửi dữ liệu Beacon quét được
  // Body mẫu: { "beacons": [{ "minor": 101, "rssi": -65 }, { "minor": 102, "rssi": -78 }] }
  // Hoặc: { "userPosition": { "x": 12.5, "z": 8.2, "floor": 1 } }
  if (req.url === '/api/webhook/beacon' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        console.log(`[Webhook InMap 7A] Nhận dữ liệu từ Mobile:`, payload);

        // Bắn ngay cho tất cả các màn hình Website 3D đang mở
        const eventData = `data: ${JSON.stringify(payload)}\n\n`;
        clients.forEach((client) => {
          client.write(eventData);
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, clientsNotified: clients.size }));
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
      }
    });
    return;
  }

  // 3. Health check
  if (req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', connectedWebClients: clients.size }));
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`===================================================`);
  console.log(`🚀 INMAP 7A WEBHOOK SERVER ĐANG CHẠY TẠI PORT: ${PORT}`);
  console.log(`👉 Webhook URL cho App React Native: http://<IP-MÁY-BẠN>:${PORT}/api/webhook/beacon`);
  console.log(`👉 Website SSE Listener: http://localhost:${PORT}/api/events`);
  console.log(`===================================================`);
});

