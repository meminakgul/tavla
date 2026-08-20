/**
 * 🚀 Tavla Evrimi - Server-Authoritative HTTP & WebSocket Sunucusu
 * Hem statik web uygulamasını sunar hem de WebSocket üzerinden 1v1 tavla maçlarını yönetir.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const roomManager = require('./server/room_manager.js');

const PORT = process.env.PORT || 8080;
const ROOT_DIR = __dirname;

// MIME türleri
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg'
};

// 1. HTTP Sunucusu (Statik Dosya Dağıtımı)
const server = http.createServer((req, res) => {
  // CORS başlıkları
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // URL çözümleme
  let safePath = req.url.split('?')[0];
  if (safePath === '/' || safePath === '') safePath = '/index.html';

  const filePath = path.join(ROOT_DIR, safePath);

  // Güvenlik: ROOT_DIR dışına çıkış engeli
  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Erişim engellendi.');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Dosya bulunamadı (404).');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

// 2. WebSocket Sunucusu (Authoritative Game Protocol)
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress;
  console.log(`[WebSocket] Yeni istemci bağlandı (${ip})`);

  ws.on('message', (messageData) => {
    try {
      const packet = JSON.parse(messageData.toString());
      if (!packet || !packet.type) return;

      const { type, payload } = packet;

      switch (type) {
        case 'CREATE_ROOM':
          roomManager.createRoom(ws, payload || {});
          break;

        case 'JOIN_ROOM':
          roomManager.joinRoom(ws, payload ? payload.roomCode : null, payload ? payload.metadata : {});
          break;

        case 'ROLL_DICE':
          roomManager.handleRollDice(ws);
          break;

        case 'MOVE_REQUEST':
          roomManager.handleMoveRequest(ws, payload);
          break;

        case 'RECONNECT':
          roomManager.handleReconnect(ws, payload ? payload.reconnectToken : null);
          break;

        case 'LEAVE_MATCH':
          roomManager.handleLeaveMatch(ws);
          break;

        case 'PING':
          if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
          break;

        default:
          console.warn(`[WebSocket] Bilinmeyen event türü: ${type}`);
      }

    } catch (e) {
      console.error('[WebSocket] Mesaj işleme hatası:', e);
    }
  });

  ws.on('close', () => {
    roomManager.handleDisconnect(ws);
  });

  ws.on('error', (err) => {
    console.error('[WebSocket] İstemci soket hatası:', err);
  });
});

// 3. Sunucuyu Başlat
server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🎲 TAVLA EVRİMİ — MULTIPLAYER SUNUCUSU AKTİF!`);
  console.log(`🚀 HTTP & WebSocket: http://localhost:${PORT}`);
  console.log(`====================================================`);
});
