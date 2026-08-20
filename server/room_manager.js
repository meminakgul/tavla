/**
 * 🏠 RoomManager - Tavla Evrimi Authoritative Oda ve Maç Yöneticisi
 * 6 haneli oda kodları, State Machine (WAITING, READY, PLAYING, DISCONNECTED, FINISHED),
 * LEAVE_MATCH, 60s Reconnect Grace Period ve kesin Server-Authoritative PvP yaşam döngüsü.
 */

const crypto = require('crypto');
const GameRules = require('./game_rules.js');

class RoomManager {
  constructor() {
    this.rooms = new Map(); // roomId -> Room
    this.roomsByCode = new Map(); // roomCode -> Room
    this.clientToRoom = new Map(); // ws -> { roomId, role }
    this.tokenToPlayer = new Map(); // reconnectToken -> { roomId, role }
  }

  /**
   * 6 Haneli benzersiz sayısal/alfanümerik oda kodu üretir.
   */
  generateRoomCode() {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(crypto.randomInt(0, chars.length));
    }
    if (this.roomsByCode.has(code)) {
      return this.generateRoomCode();
    }
    return code;
  }

  /**
   * Yeni 6 haneli oda oluşturur.
   */
  createRoom(ws, metadata = {}) {
    const roomId = crypto.randomUUID();
    const roomCode = this.generateRoomCode();
    const reconnectToken = crypto.randomUUID();

    const player1 = {
      id: metadata.id || 'p1_' + crypto.randomInt(1000, 9999),
      username: (metadata.username && typeof metadata.username === 'string') ? metadata.username.substring(0, 20) : 'Ev Sahibi',
      avatar: metadata.avatar || '🎲',
      title: metadata.title || 'Usta Oyuncu',
      role: 'white',
      ws: ws,
      connected: true,
      reconnectToken: reconnectToken,
      lastSeen: Date.now()
    };

    const gameState = GameRules.createInitialBoardState('white');

    const room = {
      roomId,
      roomCode,
      player1,
      player2: null,
      status: 'WAITING', // 'WAITING', 'READY', 'PLAYING', 'DISCONNECTED', 'FINISHED'
      createdAt: Date.now(),
      gameState,
      reconnectTimeout: null,
      disconnectedPlayer: null,
      reconnectDeadline: null,
      resultProcessed: false
    };

    this.rooms.set(roomId, room);
    this.roomsByCode.set(roomCode, room);
    this.clientToRoom.set(ws, { roomId, role: 'white' });
    this.tokenToPlayer.set(reconnectToken, { roomId, role: 'white' });

    console.log(`[RoomManager] Oda oluşturuldu: ${roomCode} (ID: ${roomId})`);

    this.send(ws, 'ROOM_STATE', {
      roomId,
      roomCode,
      status: 'WAITING',
      role: 'white',
      reconnectToken,
      player1: { username: player1.username, avatar: player1.avatar, title: player1.title }
    });

    return room;
  }

  /**
   * Odaya 6 haneli kodla katılır.
   */
  joinRoom(ws, roomCode, metadata = {}) {
    const cleanCode = (roomCode || '').trim().toUpperCase();
    const room = this.roomsByCode.get(cleanCode);

    if (!room) {
      this.send(ws, 'ERROR', { code: 'ROOM_NOT_FOUND', message: 'Oda bulunamadı! Kodun doğruluğunu kontrol edin.' });
      return null;
    }

    if (room.status !== 'WAITING' || room.player2 !== null) {
      this.send(ws, 'ERROR', { code: 'ROOM_FULL', message: 'Bu oda dolu veya maç başlamış!' });
      return null;
    }

    // Rastgele renk ataması (Server-Authoritative)
    const firstRole = crypto.randomInt(0, 2) === 0 ? 'white' : 'black';
    const secondRole = (firstRole === 'white') ? 'black' : 'white';

    room.player1.role = firstRole;

    const reconnectToken = crypto.randomUUID();
    const player2 = {
      id: metadata.id || 'p2_' + crypto.randomInt(1000, 9999),
      username: (metadata.username && typeof metadata.username === 'string') ? metadata.username.substring(0, 20) : 'Misafir',
      avatar: metadata.avatar || '🎲',
      title: metadata.title || 'Çaylak',
      role: secondRole,
      ws: ws,
      connected: true,
      reconnectToken: reconnectToken,
      lastSeen: Date.now()
    };

    room.player2 = player2;
    room.status = 'PLAYING';

    this.clientToRoom.set(room.player1.ws, { roomId: room.roomId, role: firstRole });
    this.clientToRoom.set(ws, { roomId: room.roomId, role: secondRole });
    this.tokenToPlayer.set(room.player1.reconnectToken, { roomId: room.roomId, role: firstRole });
    this.tokenToPlayer.set(reconnectToken, { roomId: room.roomId, role: secondRole });

    console.log(`[RoomManager] Odaya katıldı: ${cleanCode} -> Roller: Player1 (${room.player1.username}) = ${firstRole}, Player2 (${player2.username}) = ${secondRole}`);

    // Player 1'e maç başlangıcını gönder
    this.send(room.player1.ws, 'GAME_START', {
      roomId: room.roomId,
      roomCode: room.roomCode,
      role: firstRole,
      opponentRole: secondRole,
      reconnectToken: room.player1.reconnectToken,
      stateVersion: room.gameState.stateVersion,
      gameState: room.gameState,
      opponent: { username: player2.username, avatar: player2.avatar, title: player2.title }
    });

    // Player 2'ye maç başlangıcını gönder
    this.send(room.player2.ws, 'GAME_START', {
      roomId: room.roomId,
      roomCode: room.roomCode,
      role: secondRole,
      opponentRole: firstRole,
      reconnectToken: player2.reconnectToken,
      stateVersion: room.gameState.stateVersion,
      gameState: room.gameState,
      opponent: { username: room.player1.username, avatar: room.player1.avatar, title: room.player1.title }
    });

    return room;
  }

  /**
   * Zar atma talebini işler (Authoritative)
   */
  handleRollDice(ws) {
    const session = this.clientToRoom.get(ws);
    if (!session) return;

    const room = this.rooms.get(session.roomId);
    if (!room || room.status !== 'PLAYING') {
      this.send(ws, 'ERROR', { code: 'MATCH_NOT_ACTIVE', message: 'Maç aktif durumda değil!' });
      return;
    }

    const { gameState } = room;

    // Sıra kontrolü
    if (gameState.turn !== session.role) {
      this.send(ws, 'ERROR', { code: 'NOT_YOUR_TURN', message: 'Sıra sizde değil!' });
      return;
    }

    // Halihazırda bekleyen zar var mı kontrolü
    if (gameState.dice && gameState.dice.length > 0) {
      this.send(ws, 'ERROR', { code: 'ALREADY_ROLLED', message: 'Zarlar zaten atıldı!' });
      return;
    }

    // Sunucu tarafında resmi zar üretimi
    const diceResult = GameRules.generateDice();
    gameState.dice = diceResult.dice;
    gameState.remainingDice = [...diceResult.dice];

    // İstatistik kaydı
    const playerStats = gameState.matchDiceStats[session.role];
    playerStats.rolls[diceResult.d1]++;
    playerStats.rolls[diceResult.d2]++;
    playerStats.total += 2;
    if (diceResult.d1 === diceResult.d2) playerStats.doubles++;

    // Geçerli hamleleri hesapla
    gameState.validMoves = GameRules.calculateValidMovesForState(gameState);
    gameState.stateVersion = (gameState.stateVersion || 0) + 1;

    console.log(`[RoomManager] Zar atıldı (${room.roomCode}): [${diceResult.d1}, ${diceResult.d2}] -> ${gameState.validMoves.length} geçerli hamle`);

    // Her iki oyuncuya zarları bildir
    this.broadcastToRoom(room, 'DICE_ROLLED', {
      d1: diceResult.d1,
      d2: diceResult.d2,
      dice: gameState.dice,
      remainingDice: gameState.remainingDice,
      validMoves: gameState.validMoves,
      stateVersion: gameState.stateVersion
    });

    // Eğer oynanabilecek hiçbir hamle yoksa otomatik pas devri yap
    if (gameState.validMoves.length === 0) {
      setTimeout(() => {
        if (room.status !== 'PLAYING') return;
        const autoPassed = GameRules.checkAndApplyAutoPass(gameState);
        if (autoPassed) {
          console.log(`[RoomManager] Otomatik pas (${room.roomCode}): Sıra devredildi -> ${gameState.turn}`);
          this.broadcastToRoom(room, 'TURN_CHANGED', {
            turn: gameState.turn,
            stateVersion: gameState.stateVersion,
            gameState: gameState
          });
        }
      }, 1500);
    }
  }

  /**
   * Hamle talebini işler (Authoritative)
   */
  handleMoveRequest(ws, payload) {
    const session = this.clientToRoom.get(ws);
    if (!session) return;

    const room = this.rooms.get(session.roomId);
    if (!room || room.status !== 'PLAYING') {
      this.send(ws, 'MOVE_REJECTED', { reason: 'MATCH_NOT_ACTIVE' });
      return;
    }

    const { gameState } = room;

    // Sıra kontrolü
    if (gameState.turn !== session.role) {
      this.send(ws, 'MOVE_REJECTED', { reason: 'NOT_YOUR_TURN', stateVersion: gameState.stateVersion });
      return;
    }

    if (!gameState.remainingDice || gameState.remainingDice.length === 0) {
      this.send(ws, 'MOVE_REJECTED', { reason: 'NO_DICE', stateVersion: gameState.stateVersion });
      return;
    }

    const { from, to, die } = payload;

    // Hamlenin geçerliliğini doğrula
    const matchedMove = gameState.validMoves.find(m => m.from === from && m.to === to && m.die === die);
    if (!matchedMove) {
      console.warn(`[RoomManager] Geçersiz hamle reddedildi:`, payload);
      this.send(ws, 'MOVE_REJECTED', { reason: 'INVALID_MOVE', stateVersion: gameState.stateVersion, currentGameState: gameState });
      return;
    }

    // Hamleyi authoritative state'e uygula
    const result = GameRules.applyMoveToState(gameState, matchedMove);

    console.log(`[RoomManager] Hamle kabul edildi (${room.roomCode}): ${session.role} from ${from} to ${to}, v=${gameState.stateVersion}`);

    if (result.gameOver) {
      room.status = 'FINISHED';
      room.resultProcessed = true;

      const winnerRole = result.winner;
      const loserRole = winnerRole === 'white' ? 'black' : 'white';

      const rewards = {
        winner: { xp: 100, coins: 250 },
        loser: { xp: 25, coins: 50 }
      };

      console.log(`[RoomManager] 🏆 NORMAL GALİBİYET (${room.roomCode}): Kazanan = ${winnerRole}`);

      this.broadcastToRoom(room, 'GAME_OVER', {
        winner: winnerRole,
        loser: loserRole,
        reason: 'NORMAL',
        rewards,
        gameState: gameState,
        stateVersion: gameState.stateVersion
      });
      return;
    }

    // Hamleyi iki oyuncuya da yayınla
    this.broadcastToRoom(room, 'MOVE_ACCEPTED', {
      move: matchedMove,
      wasHit: result.wasHit,
      turnChanged: result.turnChanged,
      stateVersion: gameState.stateVersion,
      gameState: gameState
    });

    // Kalan zarlar varsa ama geçerli hamle kalmadıysa otomatik pas devri yap
    if (!result.turnChanged && gameState.remainingDice.length > 0 && gameState.validMoves.length === 0) {
      setTimeout(() => {
        if (room.status !== 'PLAYING') return;
        const autoPassed = GameRules.checkAndApplyAutoPass(gameState);
        if (autoPassed) {
          console.log(`[RoomManager] Otomatik pas (${room.roomCode}) -> ${gameState.turn}`);
          this.broadcastToRoom(room, 'TURN_CHANGED', {
            turn: gameState.turn,
            stateVersion: gameState.stateVersion,
            gameState: gameState
          });
        }
      }, 1200);
    }
  }

  /**
   * Oyuncu "Oyundan Ayrıl" butonuna bastığında anında hükmen mağlubiyet oluşturur
   */
  handleLeaveMatch(ws) {
    const session = this.clientToRoom.get(ws);
    if (!session) return;

    const room = this.rooms.get(session.roomId);
    if (!room || room.status === 'FINISHED') return;

    if (room.status === 'WAITING') {
      this.cleanupRoom(room.roomId);
      return;
    }

    const leaverRole = session.role;
    const winnerRole = leaverRole === 'white' ? 'black' : 'white';
    const remainingPlayer = session.role === room.player1.role ? room.player2 : room.player1;

    console.log(`[RoomManager] 🚪 Oyuncu maçtan ayrıldı (LEAVE_MATCH): ${leaverRole} (${room.roomCode}) -> Hükmen Kazanan: ${winnerRole}`);

    room.status = 'FINISHED';
    room.resultProcessed = true;

    if (room.reconnectTimeout) {
      clearTimeout(room.reconnectTimeout);
      room.reconnectTimeout = null;
    }

    const rewards = {
      winner: { xp: 100, coins: 250 },
      loser: { xp: 25, coins: 50 }
    };

    // Her iki tarafa da anında GAME_OVER gönder (60sn bekleme yok)
    this.broadcastToRoom(room, 'GAME_OVER', {
      winner: winnerRole,
      loser: leaverRole,
      reason: 'FORFEIT',
      rewards,
      gameState: room.gameState,
      stateVersion: room.gameState.stateVersion
    });

    this.cleanupRoom(room.roomId);
  }

  /**
   * Bağlantı kopmasını yönetir (60 Saniye Reconnect Bekleme)
   */
  handleDisconnect(ws) {
    const session = this.clientToRoom.get(ws);
    if (!session) return;

    const room = this.rooms.get(session.roomId);
    this.clientToRoom.delete(ws);

    if (!room) return;

    // Maç zaten bittiyse işlem yapma
    if (room.status === 'FINISHED') return;

    const disconnectingPlayer = session.role === room.player1.role ? room.player1 : room.player2;
    const remainingPlayer = session.role === room.player1.role ? room.player2 : room.player1;

    if (disconnectingPlayer) {
      disconnectingPlayer.connected = false;
      disconnectingPlayer.lastSeen = Date.now();
    }

    console.log(`[RoomManager] 🔌 Oyuncu soketi kapandı: ${session.role} (${room.roomCode})`);

    // Bekleme aşamasındaki odayı temizle
    if (room.status === 'WAITING') {
      this.cleanupRoom(room.roomId);
      return;
    }

    // Oyun oynanıyorsa 'DISCONNECTED' durumuna al ve 60sn sayaç başlat
    if (room.status === 'PLAYING') {
      room.status = 'DISCONNECTED';
      room.disconnectedPlayer = session.role;
      room.reconnectDeadline = Date.now() + 60000;

      if (remainingPlayer && remainingPlayer.connected && remainingPlayer.ws) {
        this.send(remainingPlayer.ws, 'PLAYER_DISCONNECTED', {
          role: session.role,
          timeoutSeconds: 60,
          message: 'Rakibin bağlantısı kesildi. 60 saniye içinde yeniden bağlanabilir.'
        });

        // 60 Saniye sonra hükmen galibiyet
        if (room.reconnectTimeout) clearTimeout(room.reconnectTimeout);
        room.reconnectTimeout = setTimeout(() => {
          if (room.status === 'DISCONNECTED' && disconnectingPlayer && !disconnectingPlayer.connected) {
            room.status = 'FINISHED';
            room.resultProcessed = true;
            const winnerRole = remainingPlayer.role;
            const loserRole = disconnectingPlayer.role;

            console.log(`[RoomManager] ⏱️ 60sn Reconnect süresi doldu! Hükmen galip: ${winnerRole}`);

            this.send(remainingPlayer.ws, 'GAME_OVER', {
              winner: winnerRole,
              loser: loserRole,
              reason: 'FORFEIT',
              rewards: {
                winner: { xp: 100, coins: 250 },
                loser: { xp: 25, coins: 50 }
              },
              gameState: room.gameState,
              stateVersion: room.gameState.stateVersion
            });

            this.cleanupRoom(room.roomId);
          }
        }, 60000);
      }
    }
  }

  /**
   * Reconnect oturum anahtarı ile odaya geri bağlanma
   */
  handleReconnect(ws, reconnectToken) {
    const session = this.tokenToPlayer.get(reconnectToken);
    if (!session) {
      this.send(ws, 'ERROR', { code: 'INVALID_TOKEN', message: 'Geçersiz veya süresi dolmuş oturum anahtarı!' });
      return;
    }

    const room = this.rooms.get(session.roomId);
    if (!room || room.status === 'FINISHED') {
      this.send(ws, 'ERROR', { code: 'MATCH_EXPIRED', message: 'Maç sona ermiş veya mevcut değil.' });
      return;
    }

    // Reconnect zamanlayıcısını durdur ve durumu 'PLAYING'e geri al
    if (room.reconnectTimeout) {
      clearTimeout(room.reconnectTimeout);
      room.reconnectTimeout = null;
    }
    room.status = 'PLAYING';
    room.disconnectedPlayer = null;
    room.reconnectDeadline = null;

    const player = session.role === room.player1.role ? room.player1 : room.player2;
    const opponent = session.role === room.player1.role ? room.player2 : room.player1;

    player.ws = ws;
    player.connected = true;
    player.lastSeen = Date.now();
    this.clientToRoom.set(ws, { roomId: room.roomId, role: session.role });

    console.log(`[RoomManager] 🔄 Oyuncu geri bağlandı: ${session.role} (${room.roomCode}) -> Maç sürüyor!`);

    // Geri bağlanan oyuncuya tam authoritative game state'i gönder
    this.send(ws, 'GAME_STATE', {
      stateVersion: room.gameState.stateVersion,
      gameState: room.gameState,
      role: session.role,
      opponent: opponent ? { username: opponent.username, avatar: opponent.avatar, title: opponent.title } : null,
      turn: room.gameState.turn,
      dice: room.gameState.dice,
      remainingDice: room.gameState.remainingDice,
      validMoves: room.gameState.validMoves,
      matchStatus: room.status
    });

    // Rakibe geri bağlanma bildirimini gönder
    if (opponent && opponent.connected && opponent.ws) {
      this.send(opponent.ws, 'PLAYER_RECONNECTED', {
        role: session.role,
        stateVersion: room.gameState.stateVersion,
        matchStatus: room.status
      });
    }
  }

  /**
   * Odayı temizler ve bellekten siler
   */
  cleanupRoom(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    if (room.reconnectTimeout) clearTimeout(room.reconnectTimeout);
    if (room.player1 && room.player1.reconnectToken) this.tokenToPlayer.delete(room.player1.reconnectToken);
    if (room.player2 && room.player2.reconnectToken) this.tokenToPlayer.delete(room.player2.reconnectToken);

    this.roomsByCode.delete(room.roomCode);
    this.rooms.delete(roomId);
    console.log(`[RoomManager] Oda temizlendi: ${roomId}`);
  }

  /**
   * WebSocket üzerinden JSON paketi gönderir
   */
  send(ws, type, payload = {}) {
    if (ws && ws.readyState === 1) { // OPEN
      ws.send(JSON.stringify({ type, payload, timestamp: Date.now() }));
    }
  }

  /**
   * Odadaki iki oyuncuya da yayın yapar
   */
  broadcastToRoom(room, type, payload = {}) {
    if (room.player1 && room.player1.connected && room.player1.ws) {
      this.send(room.player1.ws, type, payload);
    }
    if (room.player2 && room.player2.connected && room.player2.ws) {
      this.send(room.player2.ws, type, payload);
    }
  }
}

module.exports = new RoomManager();
