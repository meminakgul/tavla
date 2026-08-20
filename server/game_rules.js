/**
 * 🎲 GameRules - Tavla Evrimi Ortak Kural Motoru (Single Source of Truth)
 * Hem Node.js (Authoritative Server) hem de Tarayıcı (Client UI/Simulation) için
 * standart Türk Tavlası kurallarını ve state geçişlerini yönetir.
 */

(function (root, factory) {
  if (typeof exports === 'object' && typeof module === 'object') {
    module.exports = factory(require('crypto'));
  } else if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else {
    root.GameRules = factory(null);
  }
})(typeof self !== 'undefined' ? self : this, function (cryptoModule) {

  const GameRules = {

    /**
     * Başlangıç tahtası state'ini oluşturur.
     */
    createInitialBoardState(firstTurn = 'white') {
      const points = Array(24).fill(null).map(() => ({ count: 0, owner: null }));

      // Beyaz Taşlar (0-5 yönünde hareket eder, 0-5 ev tahtasıdır)
      points[23] = { count: 2, owner: 'white' };
      points[12] = { count: 5, owner: 'white' };
      points[7] = { count: 3, owner: 'white' };
      points[5] = { count: 5, owner: 'white' };

      // Siyah Taşlar (18-23 yönünde hareket eder, 18-23 ev tahtasıdır)
      points[0] = { count: 2, owner: 'black' };
      points[11] = { count: 5, owner: 'black' };
      points[16] = { count: 3, owner: 'black' };
      points[18] = { count: 5, owner: 'black' };

      return {
        points,
        whiteBar: 0,
        blackBar: 0,
        whiteOff: 0,
        blackOff: 0,
        turn: firstTurn,
        dice: [],
        remainingDice: [],
        validMoves: [],
        winner: null,
        stateVersion: 1,
        turnCounter: 0,
        matchDiceStats: {
          white: { rolls: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }, doubles: 0, total: 0 },
          black: { rolls: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }, doubles: 0, total: 0 }
        }
      };
    },

    /**
     * Güvenli zar üretimi (Sunucu tarafında kriptografik random)
     */
    generateDice() {
      let d1, d2;
      if (cryptoModule && typeof cryptoModule.randomInt === 'function') {
        d1 = cryptoModule.randomInt(1, 7);
        d2 = cryptoModule.randomInt(1, 7);
      } else {
        d1 = Math.floor(Math.random() * 6) + 1;
        d2 = Math.floor(Math.random() * 6) + 1;
      }
      const dice = (d1 === d2) ? [d1, d1, d1, d1] : [d1, d2];
      return { d1, d2, dice };
    },

    /**
     * Hedef noktanın geçerli olup olmadığını kontrol eder.
     */
    isValidTargetForState(st, target, player) {
      if (target < 0 || target >= 24) return false;
      const pt = st.points[target];
      if (!pt.owner || pt.count === 0) return true;
      if (pt.owner === player) return true;
      if (pt.owner !== player && pt.count === 1) return true;
      return false;
    },

    /**
     * Oyuncunun tüm pullarının ev tahtasında olup olmadığını (Toplama izni) kontrol eder.
     */
    canBearOffForState(st, player) {
      const bar = player === 'white' ? st.whiteBar : st.blackBar;
      if (bar > 0) return false;
      let outside = 0;
      if (player === 'white') {
        for (let i = 6; i < 24; i++) {
          if (st.points[i].owner === 'white') outside += st.points[i].count;
        }
      } else {
        for (let i = 0; i < 18; i++) {
          if (st.points[i].owner === 'black') outside += st.points[i].count;
        }
      }
      return outside === 0;
    },

    /**
     * Toplama aşamasında zar hane numarasından büyükse en gerideki pul mu kontrolü
     */
    isHighestOccupiedForState(st, player, idx) {
      if (player === 'white') {
        for (let i = 5; i > idx; i--) {
          if (st.points[i].owner === 'white' && st.points[i].count > 0) return false;
        }
        return true;
      } else {
        for (let i = 18; i < idx; i++) {
          if (st.points[i].owner === 'black' && st.points[i].count > 0) return false;
        }
        return true;
      }
    },

    /**
     * Tek bir hamleyi klonlanmış state üzerinde simüle eder.
     */
    simulateSingleMoveState(st, m) {
      const clone = {
        points: st.points.map(p => ({ ...p })),
        whiteBar: st.whiteBar,
        blackBar: st.blackBar,
        whiteOff: st.whiteOff,
        blackOff: st.blackOff,
        turn: st.turn,
        remainingDice: [...st.remainingDice]
      };

      const player = clone.turn;
      const opp = player === 'white' ? 'black' : 'white';

      // Çıkış noktasını güncelle
      if (m.from === 24) clone.whiteBar--;
      else if (m.from === -1) clone.blackBar--;
      else {
        clone.points[m.from].count--;
        if (clone.points[m.from].count === 0) clone.points[m.from].owner = null;
      }

      // Varış noktasını güncelle
      if (m.isOff) {
        if (player === 'white') clone.whiteOff++;
        else clone.blackOff++;
      } else {
        const targetPt = clone.points[m.to];
        if (targetPt.owner === opp && targetPt.count === 1) {
          if (opp === 'white') clone.whiteBar++;
          else clone.blackBar++;
          targetPt.count = 1;
          targetPt.owner = player;
        } else {
          targetPt.count++;
          targetPt.owner = player;
        }
      }

      // Kullanılan zarı çıkar
      if (m.isCombined && Array.isArray(m.componentDice)) {
        for (const cd of m.componentDice) {
          const idx = clone.remainingDice.indexOf(cd);
          if (idx !== -1) clone.remainingDice.splice(idx, 1);
        }
      } else {
        const dieIdx = clone.remainingDice.indexOf(m.die);
        if (dieIdx !== -1) clone.remainingDice.splice(dieIdx, 1);
      }

      return clone;
    },

    /**
     * Olası hamle listesini (kısıtlamasız ham liste) hesaplar.
     */
    getRawValidMovesForState(st) {
      const rawMoves = [];
      if (st.remainingDice.length === 0) return rawMoves;

      const player = st.turn;
      const uniqueDice = [...new Set(st.remainingDice)];
      const barCount = player === 'white' ? st.whiteBar : st.blackBar;

      // 1. Kırık pul (BAR) varsa önce onu oyuna sokma zorunluluğu
      if (barCount > 0) {
        const fromIdx = player === 'white' ? 24 : -1;
        uniqueDice.forEach(die => {
          const target = player === 'white' ? 24 - die : -1 + die;
          if (this.isValidTargetForState(st, target, player)) {
            rawMoves.push({ from: fromIdx, to: target, die });
          }
        });
        return rawMoves;
      }

      // 2. Tahtadaki pulların tek zar hamleleri
      for (let i = 0; i < 24; i++) {
        if (st.points[i].owner === player && st.points[i].count > 0) {
          uniqueDice.forEach(die => {
            const target = player === 'white' ? i - die : i + die;
            if (target >= 0 && target < 24) {
              if (this.isValidTargetForState(st, target, player)) {
                rawMoves.push({ from: i, to: target, die });
              }
            } else if (this.canBearOffForState(st, player)) {
              const exactOff = player === 'white' ? i - die === -1 : i + die === 24;
              if (exactOff) {
                rawMoves.push({ from: i, to: player === 'white' ? -1 : 24, die, isOff: true });
              } else {
                const overOff = player === 'white' ? i - die < -1 : i + die > 24;
                if (overOff && this.isHighestOccupiedForState(st, player, i)) {
                  rawMoves.push({ from: i, to: player === 'white' ? -1 : 24, die, isOff: true });
                }
              }
            }
          });
        }
      }

      // 3. Kombine hamle desteği (Kullanıcı tek tıkla 2 zarı birden oynamak isterse)
      if (st.remainingDice.length >= 2) {
        const d1 = st.remainingDice[0];
        const d2 = st.remainingDice[1];
        if (d1 !== d2) {
          for (let i = 0; i < 24; i++) {
            if (st.points[i].owner === player && st.points[i].count > 0) {
              const mid1 = player === 'white' ? i - d1 : i + d1;
              const mid2 = player === 'white' ? i - d2 : i + d2;
              const combTarget = player === 'white' ? i - (d1 + d2) : i + (d1 + d2);

              const path1Valid = this.isValidTargetForState(st, mid1, player) && this.isValidTargetForState(st, combTarget, player);
              const path2Valid = this.isValidTargetForState(st, mid2, player) && this.isValidTargetForState(st, combTarget, player);

              if ((path1Valid || path2Valid) && combTarget >= 0 && combTarget < 24) {
                if (!rawMoves.some(m => m.from === i && m.to === combTarget)) {
                  rawMoves.push({
                    from: i,
                    to: combTarget,
                    die: d1 + d2,
                    isCombined: true,
                    componentDice: [d1, d2]
                  });
                }
              }
            }
          }
        }
      }

      return rawMoves;
    },

    /**
     * İleriye dönük maksimum oynanabilecek zar sayısını hesaplar.
     */
    getMaxPossibleDiceUsage(st) {
      if (st.remainingDice.length === 0) return 0;
      const raw = this.getRawValidMovesForState(st);
      if (raw.length === 0) return 0;

      let max = 0;
      raw.forEach(m => {
        const temp = this.simulateSingleMoveState(st, m);
        const used = st.remainingDice.length - temp.remainingDice.length;
        const sub = (used > 0 ? used : 1) + this.getMaxPossibleDiceUsage(temp);
        if (sub > max) max = sub;
      });
      return max;
    },

    /**
     * Kural gereği maksimum zar kullanımını zorunlu kılan geçerli hamleleri hesaplar.
     */
    calculateValidMovesForState(st) {
      const rawMoves = this.getRawValidMovesForState(st);
      if (rawMoves.length === 0 || st.remainingDice.length <= 1) {
        return rawMoves;
      }

      let maxDice = 0;
      const moveUsage = [];

      rawMoves.forEach(m => {
        const temp = this.simulateSingleMoveState(st, m);
        let used = st.remainingDice.length - temp.remainingDice.length;
        if (used <= 0) used = 1;
        const total = used + this.getMaxPossibleDiceUsage(temp);
        moveUsage.push({ move: m, count: total });
        if (total > maxDice) maxDice = total;
      });

      let candidates = moveUsage.filter(item => item.count === maxDice).map(item => item.move);

      // İki zardan sadece 1'i oynanabiliyorsa büyük olanı oynama zorunluluğu
      if (maxDice === 1 && st.remainingDice.length >= 2) {
        const d1 = st.remainingDice[0];
        const d2 = st.remainingDice[1];
        if (d1 !== d2) {
          const maxVal = Math.max(d1, d2);
          const bigDieMoves = candidates.filter(m => m.die === maxVal);
          if (bigDieMoves.length > 0) {
            candidates = bigDieMoves;
          }
        }
      }

      return candidates;
    },

    /**
     * Hamleyi tahtaya uygular ve authoritative yeni state oluşturur.
     */
    applyMoveToState(st, m) {
      const player = st.turn;
      const opp = player === 'white' ? 'black' : 'white';

      // Çıkış
      if (m.from === 24) st.whiteBar--;
      else if (m.from === -1) st.blackBar--;
      else {
        st.points[m.from].count--;
        if (st.points[m.from].count === 0) st.points[m.from].owner = null;
      }

      // Varış
      let wasHit = false;
      if (m.isOff) {
        if (player === 'white') st.whiteOff++;
        else st.blackOff++;
      } else {
        const targetPt = st.points[m.to];
        if (targetPt.owner === opp && targetPt.count === 1) {
          wasHit = true;
          if (opp === 'white') st.whiteBar++;
          else st.blackBar++;
          targetPt.count = 1;
          targetPt.owner = player;
        } else {
          targetPt.count++;
          targetPt.owner = player;
        }
      }

      // Kalan zarlardan düş
      if (m.isCombined && Array.isArray(m.componentDice)) {
        for (const cd of m.componentDice) {
          const idx = st.remainingDice.indexOf(cd);
          if (idx !== -1) st.remainingDice.splice(idx, 1);
        }
      } else {
        const dieIdx = st.remainingDice.indexOf(m.die);
        if (dieIdx !== -1) st.remainingDice.splice(dieIdx, 1);
      }

      // State version artır
      st.stateVersion = (st.stateVersion || 0) + 1;

      // Galibiyet kontrolü
      if (st.whiteOff === 15) {
        st.winner = 'white';
        st.validMoves = [];
        st.dice = [];
        st.remainingDice = [];
        return { state: st, wasHit, turnChanged: false, gameOver: true, winner: 'white' };
      }
      if (st.blackOff === 15) {
        st.winner = 'black';
        st.validMoves = [];
        st.dice = [];
        st.remainingDice = [];
        return { state: st, wasHit, turnChanged: false, gameOver: true, winner: 'black' };
      }

      // Geçerli hamleleri yeniden hesapla
      st.validMoves = this.calculateValidMovesForState(st);

      // Sıra değişimi (Tüm zarlar bittiğinde)
      let turnChanged = false;
      if (st.remainingDice.length === 0) {
        turnChanged = true;
        st.turn = st.turn === 'white' ? 'black' : 'white';
        st.dice = [];
        st.remainingDice = [];
        st.validMoves = [];
        st.turnCounter = (st.turnCounter || 0) + 1;
      }

      return { state: st, wasHit, turnChanged, gameOver: false, winner: null };
    },

    /**
     * Otomatik pas (Auto-pass) kontrolü ve sıra devri
     */
    checkAndApplyAutoPass(st) {
      if (st.remainingDice.length > 0 && (!st.validMoves || st.validMoves.length === 0)) {
        st.turn = st.turn === 'white' ? 'black' : 'white';
        st.dice = [];
        st.remainingDice = [];
        st.validMoves = [];
        st.turnCounter = (st.turnCounter || 0) + 1;
        st.stateVersion = (st.stateVersion || 0) + 1;
        return true;
      }
      return false;
    }

  };

  return GameRules;
});
