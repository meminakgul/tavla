/**
 * 🌐 NetworkService - Tavla Evrimi Authoritative WebSocket Ağ Katmanı
 * Server-Authoritative mimaride WebSocket üzerinden oda kurma, katılma,
 * zar atma, hamle doğrulama ve 60 saniyelik reconnect akışını yönetir.
 */

const NetworkService = {
  socket: null,
  status: 'disconnected', // 'disconnected', 'connecting', 'connected'
  listeners: {},
  roomId: null,
  roomCode: null,
  role: null, // 'white' veya 'black'
  reconnectToken: null,
  pingInterval: null,
  lastStateVersion: 0,

  /**
   * Olay dinleyici ekleme
   */
  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  },

  /**
   * Olay tetikleme
   */
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => {
        try {
          cb(data);
        } catch (e) {
          console.error(`[Network] Event handler hatası (${event}):`, e);
        }
      });
    }
  },

  /**
   * WebSocket bağlantısını kurar
   */
  connect(callback = null) {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      if (this.socket.readyState === WebSocket.OPEN && callback) callback();
      return;
    }

    let protocol = 'ws:';
    let host = 'localhost:8080';

    if (typeof window !== 'undefined' && window.location) {
      if (window.location.protocol === 'https:') {
        protocol = 'wss:';
      }
      if (window.location.host && window.location.protocol !== 'file:') {
        host = window.location.host;
      }
    }

    const wsUrl = `${protocol}//${host}`;

    this.status = 'connecting';
    this.emit('status_change', { status: 'connecting' });

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log('[Network] WebSocket sunucusuna bağlandı:', wsUrl);
        this.status = 'connected';
        this.emit('status_change', { status: 'connected' });

        // Düzenli heartbeat PING başlat
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = setInterval(() => {
          this.send('PING', {});
        }, 20000);

        if (callback) callback();
      };

      this.socket.onmessage = (event) => {
        try {
          const packet = JSON.parse(event.data);
          if (!packet || !packet.type) return;
          this.handleIncomingPacket(packet);
        } catch (e) {
          console.error('[Network] Paket ayrıştırma hatası:', e);
        }
      };

      this.socket.onclose = () => {
        console.log('[Network] WebSocket bağlantısı kapandı.');
        this.status = 'disconnected';
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.emit('status_change', { status: 'disconnected' });
        this.emit('disconnected', {});
      };

      this.socket.onerror = (err) => {
        console.error('[Network] WebSocket soket hatası:', err);
        this.emit('error', { message: 'Sunucu bağlantı hatası!' });
      };

    } catch (e) {
      console.error('[Network] WebSocket başlatma hatası:', e);
      this.status = 'disconnected';
      this.emit('error', { message: 'Bağlantı kurulamadı.' });
    }
  },

  /**
   * Sunucudan gelen paketleri yönlendirir
   */
  handleIncomingPacket(packet) {
    const { type, payload } = packet;

    switch (type) {
      case 'ROOM_STATE':
        this.roomId = payload.roomId;
        this.roomCode = payload.roomCode;
        this.role = payload.role;
        if (payload.reconnectToken) {
          this.reconnectToken = payload.reconnectToken;
          sessionStorage.setItem('tavla_reconnect_token', this.reconnectToken);
        }
        this.emit('room_state', payload);
        break;

      case 'GAME_START':
        this.roomId = payload.roomId;
        this.roomCode = payload.roomCode;
        this.role = payload.role;
        if (payload.reconnectToken) {
          this.reconnectToken = payload.reconnectToken;
          sessionStorage.setItem('tavla_reconnect_token', this.reconnectToken);
        }
        if (payload.stateVersion !== undefined) {
          this.lastStateVersion = payload.stateVersion;
        }
        this.emit('game_start', payload);
        break;

      case 'DICE_ROLLED':
        if (payload.stateVersion !== undefined && payload.stateVersion < this.lastStateVersion) {
          console.warn('[Network] Eski stateVersion atlandı (DICE_ROLLED):', payload.stateVersion);
          return;
        }
        if (payload.stateVersion !== undefined) this.lastStateVersion = payload.stateVersion;
        this.emit('dice_rolled', payload);
        break;

      case 'MOVE_ACCEPTED':
        if (payload.stateVersion !== undefined && payload.stateVersion < this.lastStateVersion) {
          console.warn('[Network] Eski stateVersion atlandı (MOVE_ACCEPTED):', payload.stateVersion);
          return;
        }
        if (payload.stateVersion !== undefined) this.lastStateVersion = payload.stateVersion;
        this.emit('move_accepted', payload);
        break;

      case 'MOVE_REJECTED':
        this.emit('move_rejected', payload);
        break;

      case 'TURN_CHANGED':
        if (payload.stateVersion !== undefined && payload.stateVersion < this.lastStateVersion) {
          console.warn('[Network] Eski stateVersion atlandı (TURN_CHANGED):', payload.stateVersion);
          return;
        }
        if (payload.stateVersion !== undefined) this.lastStateVersion = payload.stateVersion;
        this.emit('turn_changed', payload);
        break;

      case 'GAME_STATE':
        // Reconnect tam senkronizasyonu
        if (payload.stateVersion !== undefined) this.lastStateVersion = payload.stateVersion;
        this.emit('game_state', payload);
        break;

      case 'PLAYER_DISCONNECTED':
        this.emit('player_disconnected', payload);
        break;

      case 'PLAYER_RECONNECTED':
        if (payload.stateVersion !== undefined) this.lastStateVersion = payload.stateVersion;
        this.emit('player_reconnected', payload);
        break;

      case 'GAME_OVER':
        sessionStorage.removeItem('tavla_reconnect_token');
        this.emit('game_over', payload);
        break;

      case 'ERROR':
        if (payload && (payload.code === 'INVALID_TOKEN' || payload.code === 'MATCH_EXPIRED')) {
          sessionStorage.removeItem('tavla_reconnect_token');
          console.log('[Network] Eski/geçersiz reconnect oturumu temizlendi.');
          return;
        }
        this.emit('error', payload);
        break;

      case 'PONG':
        // Heartbeat cevabı
        break;

      default:
        this.emit(type, payload);
    }
  },

  /**
   * Sunucuya paket gönderir
   */
  send(type, payload = {}) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, payload, timestamp: Date.now() }));
    } else {
      console.warn('[Network] Soket açık değil, paket gönderilemedi:', type);
    }
  },

  /**
   * 1. Oda Oluşturma
   */
  createRoom() {
    this.connect(() => {
      const metadata = this.getUserMetadata();
      this.send('CREATE_ROOM', metadata);
    });
  },

  /**
   * 2. Odaya Katılma
   */
  joinRoom(roomCode) {
    if (!roomCode || roomCode.trim().length === 0) {
      this.emit('error', { message: 'Lütfen 6 haneli oda kodunu girin!' });
      return;
    }
    this.connect(() => {
      const metadata = this.getUserMetadata();
      this.send('JOIN_ROOM', { roomCode: roomCode.trim().toUpperCase(), metadata });
    });
  },

  /**
   * 3. Zar Atma İsteği (Authoritative)
   */
  requestRollDice() {
    this.send('ROLL_DICE', {});
  },

  /**
   * 4. Hamle Yapma İsteği (Authoritative)
   */
  requestMove(from, to, die) {
    this.send('MOVE_REQUEST', { from, to, die });
  },

  /**
   * 5. Yeniden Bağlanma (Reconnect)
   */
  tryReconnect() {
    const token = sessionStorage.getItem('tavla_reconnect_token');
    if (!token) return false;

    this.connect(() => {
      console.log('[Network] Reconnect token ile bağlanılıyor:', token);
      this.send('RECONNECT', { reconnectToken: token });
    });
    return true;
  },

  /**
   * 6. Maçtan Ayrıl (Hükmen Mağlubiyet)
   */
  leaveMatch() {
    this.send('LEAVE_MATCH', {});
    sessionStorage.removeItem('tavla_reconnect_token');
  },

  /**
   * Profil metadata'sını alır (Yalnızca görsel amaçlı)
   */
  getUserMetadata() {
    if (typeof userProfile !== 'undefined' && userProfile) {
      return {
        id: userProfile.id || null,
        username: userProfile.username || 'Misafir Oyuncu',
        avatar: userProfile.avatar || '🎲',
        title: userProfile.title || 'Çaylak'
      };
    }
    return { username: 'Oyuncu', avatar: '🎲', title: 'Çaylak' };
  },

  /**
   * Bağlantıyı kapatma ve sıfırlama
   */
  disconnect() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    sessionStorage.removeItem('tavla_reconnect_token');
    if (this.socket) {
      try { this.socket.close(); } catch (e) {}
      this.socket = null;
    }
    this.status = 'disconnected';
    this.roomId = null;
    this.roomCode = null;
    this.role = null;
    this.reconnectToken = null;
    this.lastStateVersion = 0;
  },

  /**
   * URL'den ?room=XYZ parametresi yakalama
   */
  getRoomFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('room');
  }
};
