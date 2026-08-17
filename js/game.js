let canvas;
let ctx;

let state = {
  points: Array(24).fill(null).map(() => ({ count: 0, owner: null })),
  whiteBar: 0, blackBar: 0,
  whiteOff: 0, blackOff: 0,
  turn: 'white',
  dice: [], remainingDice: [],
  selectedPoint: null, validMoves: [],
  highestWhiteCombo: 0, highestBlackCombo: 0, matchComboXP: 0,
  turnCounter: 0, isRevealActive: false
};

let currentGameMode = 'NORMAL'; // 'NORMAL' veya 'DARK_TAVLA'
const DARK_TAVLA_REVEAL_DURATION = 10000;
let revealTimeoutId = null;

function stopRevealTimer() {
  if (revealTimeoutId) {
    clearTimeout(revealTimeoutId);
    revealTimeoutId = null;
  }
  if (typeof state !== 'undefined') {
    state.isRevealActive = false;
    state.turnCounter = 0;
  }
}

let isVsAI = true;
let isAIBusy = false;

let boardThemes = {
  walnut: { bg: '#17110C', frame: '#2E1A11', dark: '#6A2520', light: '#D8CAB3', accent: '#332115' },
  fenerbahce: { bg: '#070D1E', frame: '#03060F', dark: '#0F1D3F', light: '#FFD700', accent: '#FFD700' },
  ottoman: { bg: '#D4AF77', frame: '#191816', dark: '#1E1C19', light: '#F4F1EA', accent: '#D4AF37' },
  tropical: { bg: '#0C2E22', frame: '#0A241B', dark: '#2C5E43', light: '#E2D5C3', accent: '#FF6B6B' },
  green: { bg: '#10331E', frame: '#0A2013', dark: '#6B1D1B', light: '#F5E6CC', accent: '#D4AF37' },
  marble: { bg: '#E0DACF', frame: '#222222', dark: '#1C1C1C', light: '#D4AF37', accent: '#D4AF37' },
  midnight: { bg: '#060B14', frame: '#03050A', dark: '#D500F9', light: '#00E5FF', accent: '#00E5FF' }
};
let currentBoardTheme = 'walnut';

let diceThemes = {
  ivory: { bg: '#EFEBE1', dot: '#1A0F0A', border: '#C2BAAA' },
  fbYellow: { bg: '#FFD700', dot: '#0A1228', border: '#0F1D3F' },
  gold: { bg: '#D4AF37', dot: '#1A1A1A', border: '#FFF0A5' },
  red: { bg: '#B71C1C', dot: '#FFFFFF', border: '#FF5252' },
  black: { bg: '#1A1A1A', dot: '#FFD700', border: '#D4AF37' },
  green: { bg: '#1B5E20', dot: '#FFFFFF', border: '#66BB6A' }
};
let currentDiceTheme = 'ivory';

let dragItem = null;
let isRolling = false;
let dicePhysics = [];
let activeMoveAnim = null;
let animStartTime = 0;

function changeBoardTheme(val) {
  if (typeof UnlockService !== 'undefined' && !UnlockService.isBoardUnlocked(val)) {
    if (typeof showToast === 'function') showToast('🔒 Bu tahta teması henüz kilitli!', 2000);
    let select = document.getElementById('board-theme-select');
    if (select) select.value = currentBoardTheme;
    if (typeof userProfile !== 'undefined' && userProfile.settings) {
      userProfile.settings.boardTheme = currentBoardTheme;
      if (typeof saveUserProfile === 'function') saveUserProfile(userProfile);
    }
    return false;
  }
  currentBoardTheme = val;
  if (typeof userProfile !== 'undefined' && userProfile.settings) {
    userProfile.settings.boardTheme = val;
    if (typeof saveUserProfile === 'function') saveUserProfile(userProfile);
  }
  draw();
  return true;
}

function changeDiceTheme(val) {
  if (typeof UnlockService !== 'undefined' && !UnlockService.isDiceUnlocked(val)) {
    if (typeof showToast === 'function') showToast('🔒 Bu zar teması henüz kilitli!', 2000);
    let select = document.getElementById('dice-theme-select');
    if (select) select.value = currentDiceTheme;
    if (typeof userProfile !== 'undefined' && userProfile.settings) {
      userProfile.settings.diceTheme = currentDiceTheme;
      if (typeof saveUserProfile === 'function') saveUserProfile(userProfile);
    }
    return false;
  }
  currentDiceTheme = val;
  if (typeof userProfile !== 'undefined' && userProfile.settings) {
    userProfile.settings.diceTheme = val;
    if (typeof saveUserProfile === 'function') saveUserProfile(userProfile);
  }
  draw();
  return true;
}

function toggleFullScreen() {
  if (!document.fullscreenElement && !document.webkitFullscreenElement) {
    let el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  } else {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
  }
}

function openModal(id) {
  let modal = document.getElementById(id);
  if (modal) {
    if (id === 'custom-modal' || id === 'missions-modal') {
      modal.style.display = 'flex';
    } else {
      modal.style.display = 'block';
    }
  }
  if (id === 'custom-modal' && typeof ShopService !== 'undefined') {
    ShopService.updateShopUI();
  }
  if (id === 'missions-modal' && typeof MissionService !== 'undefined') {
    MissionService.updateMissionUI();
  }
}

function closeModal(id) {
  let modal = document.getElementById(id);
  if (modal) modal.style.display = 'none';
}

function openOnlineModal() {
  openModal('online-modal');
}

function requestExitToMainMenu() {
  if (state.winner != null) {
    confirmExitToMainMenu();
  } else {
    openModal('exit-modal');
  }
}

function confirmExitToMainMenu() {
  closeModal('exit-modal');

  if (state.winner == null && typeof userProfile !== 'undefined') {
    userProfile.losses = (userProfile.losses || 0) + 1;

    if (typeof MissionService !== 'undefined') {
      MissionService.abandonMatch();
    }
    
    if (typeof AchievementService !== 'undefined') {
      AchievementService.checkAll();
    }

    if (typeof saveUserProfile === 'function') {
      saveUserProfile(userProfile);
    }
  }

  stopRevealTimer();
  state.isRevealActive = false;
  hideRevealUI();
  let mainMenu = document.getElementById('main-menu');
  if (mainMenu) mainMenu.style.display = 'flex';

  if (typeof updateWebProfileUI === 'function') {
    updateWebProfileUI();
  }
}

let selectedGameMode = 'ai'; // Default

function selectMode(mode) {
  selectedGameMode = mode;
  document.getElementById('mode-classic').classList.remove('selected');
  document.getElementById('mode-dark').classList.remove('selected');

  if (mode === 'ai') {
    document.getElementById('mode-classic').classList.add('selected');
  } else {
    document.getElementById('mode-dark').classList.add('selected');
  }
}

function startSelectedMode() {
  closeModal('mode-modal');
  startMode(selectedGameMode);
}

function startMode(mode) {
  if (mode === '2p-cards') {
    showToast('⚡ Kartlı Özel Güçler Modu çok yakında eklenecektir!', 3000);
    return;
  }
  closeModal('online-modal');
  closeModal('settings-modal');
  closeModal('guide-modal');
  closeModal('mode-modal');
  document.getElementById('main-menu').style.display = 'none';

  if (mode === 'ai' || mode === 'dark') {
    isVsAI = true;
  } else {
    isVsAI = false;
  }

  if (mode === 'dark') {
    currentGameMode = 'DARK_TAVLA';
  } else {
    currentGameMode = 'NORMAL';
  }

  initGame();
}

function initGame() {
  stopRevealTimer();
  hideRevealUI();
  state.points = Array(24).fill(null).map(() => ({ count: 0, owner: null }));

  setPt(23, 2, 'white');
  setPt(12, 5, 'white');
  setPt(7, 3, 'white');
  setPt(5, 5, 'white');

  setPt(0, 2, 'black');
  setPt(11, 5, 'black');
  setPt(16, 3, 'black');
  setPt(18, 5, 'black');

  state.whiteBar = 0; state.blackBar = 0;
  state.whiteOff = 0; state.blackOff = 0;
  state.whiteCombo = 0; state.blackCombo = 0;
  state.highestWhiteCombo = 0; state.highestBlackCombo = 0;
  state.matchComboXP = 0;
  state.turnCounter = 0;
  state.isRevealActive = false;
  state.turn = 'white';
  state.winner = null;
  state.dice = []; state.remainingDice = [];
  state.selectedPoint = null; state.validMoves = [];
  state.matchProcessed = false;
  dragItem = null;
  isRolling = false;
  dicePhysics = [];
  activeMoveAnim = null;
  state.matchStatsStarted = true;

  if (typeof userProfile !== 'undefined' && userProfile.stats) {
    userProfile.stats.matchesPlayed++;
  }

  let fb = document.getElementById('combo-feedback');
  if (fb) {
    fb.classList.remove('show');
    fb.classList.add('hide');
  }

  updateUI();
  if (typeof MissionService !== 'undefined') {
    MissionService.startNewMatch(typeof currentGameMode !== 'undefined' && currentGameMode === 'DARK_TAVLA');
  }
  draw();
}

function setPt(idx, count, owner) {
  state.points[idx] = { count, owner };
}

function rollDice() {
  if (state.dice.length > 0 || isRolling || activeMoveAnim || state.winner != null) return;
  SoundFX.playDiceRoll();
  isRolling = true;
  document.getElementById('roll-btn').disabled = true;

  let d1 = Math.floor(Math.random() * 6) + 1;
  let d2 = Math.floor(Math.random() * 6) + 1;
  let finalDice = (d1 === d2) ? [d1, d1, d1, d1] : [d1, d2];
  let targets = [d1, d2];

  state.dice = finalDice;
  state.remainingDice = [...finalDice];

  if (typeof MissionService !== 'undefined' && state.turn === 'white') {
    MissionService.notifyEvent('DICE_ROLLED', 1);
    if (d1 === d2) {
      MissionService.notifyEvent('DOUBLE_ROLLED', 1);
    }
  }

  if (d1 === d2 && state.turn === 'white' && typeof userProfile !== 'undefined' && userProfile.stats) {
    userProfile.stats.totalDoubles++;
  }

  dicePhysics = [
    {
      startX: -15 + (Math.random() - 0.5) * 10, startY: 12 + (Math.random() - 0.5) * 8,
      targetX: -36 + (Math.random() - 0.5) * 8, targetY: (Math.random() - 0.5) * 6,
      rotSpeedX: (3 + Math.random() * 2) * Math.PI,
      rotSpeedY: (4 + Math.random() * 2) * Math.PI,
      targetVal: targets[0], delay: 0.0
    },
    {
      startX: 15 + (Math.random() - 0.5) * 10, startY: -10 + (Math.random() - 0.5) * 8,
      targetX: 36 + (Math.random() - 0.5) * 8, targetY: (Math.random() - 0.5) * 6,
      rotSpeedX: -(3 + Math.random() * 2) * Math.PI,
      rotSpeedY: -(4 + Math.random() * 2) * Math.PI,
      targetVal: targets[1], delay: 0.04
    }
  ];

  animStartTime = performance.now();
  requestAnimationFrame(stepPhysicsAnimation);

  setTimeout(() => {
    state.dice = finalDice;
    state.remainingDice = [...finalDice];
    isRolling = false;
    calculateValidMoves();
    updateUI();
    draw();

    checkAutoPass();
  }, 1100);
}

function stepPhysicsAnimation(now) {
  let elapsed = (now - animStartTime) / 1500.0;
  let t = Math.min(1.0, elapsed);

  draw(t);

  if (t < 1.0) {
    requestAnimationFrame(stepPhysicsAnimation);
  }
}

function checkAutoPass() {
  if (state.remainingDice.length > 0 && state.validMoves.length === 0) {
    let barCount = state.turn === 'white' ? state.whiteBar : state.blackBar;
    let pName = state.turn === 'white' ? 'Beyaz' : 'Siyah';

    let msg = barCount > 0
      ? `${pName} oyuncunun kırık pulu geleceği haneler kapalı olduğu için oyuna giremiyor! Sıra rakibe geçti.`
      : `${pName} oyuncunun oynayabileceği hamle yok! Sıra rakibe geçti.`;

    showToast(msg, 2400);

    setTimeout(() => {
      state.whiteCombo = 0;
      state.blackCombo = 0;
      state.turn = state.turn === 'white' ? 'black' : 'white';
      state.dice = [];
      state.remainingDice = [];
      state.validMoves = [];
      updateUI();
      draw();
      checkAITurn();
    }, 2400);
  } else {
    checkAITurn();
  }
}

function calculateValidMoves() {
  let rawMoves = getRawValidMoves();
  if (rawMoves.length === 0 || state.remainingDice.length <= 1) {
    state.validMoves = rawMoves;
    return;
  }

  let maxDice = 0;
  let moveUsage = [];

  rawMoves.forEach(m => {
    let temp = simulateSingleMoveState(state, m);
    let used = state.remainingDice.length - temp.remainingDice.length;
    if (used <= 0) used = 1;
    let total = used + getMaxPossibleDiceUsage(temp);
    moveUsage.push({ move: m, count: total });
    if (total > maxDice) maxDice = total;
  });

  let filtered = moveUsage.filter(item => item.count === maxDice).map(item => item.move);

  if (maxDice === 1 && state.remainingDice.length === 2 && state.remainingDice[0] !== state.remainingDice[1]) {
    let maxDie = Math.max(state.remainingDice[0], state.remainingDice[1]);
    let hasHigher = filtered.some(m => m.die === maxDie);
    if (hasHigher) {
      filtered = filtered.filter(m => m.die === maxDie);
    }
  }

  state.validMoves = filtered;
}

function getMaxPossibleDiceUsage(st) {
  if (st.remainingDice.length === 0) return 0;
  let raw = getRawValidMovesForState(st);
  if (raw.length === 0) return 0;

  let maxCount = 0;
  raw.forEach(m => {
    let temp = simulateSingleMoveState(st, m);
    let used = st.remainingDice.length - temp.remainingDice.length;
    if (used <= 0) used = 1;
    let total = used + getMaxPossibleDiceUsage(temp);
    if (total > maxCount) maxCount = total;
  });
  return maxCount;
}

function simulateSingleMoveState(st, m) {
  let temp = JSON.parse(JSON.stringify(st));
  if (m.from === 24) temp.whiteBar--;
  else if (m.from === -1) temp.blackBar--;
  else {
    temp.points[m.from].count--;
    if (temp.points[m.from].count === 0) temp.points[m.from].owner = null;
  }

  if (m.isOff) {
    if (temp.turn === 'white') temp.whiteOff++; else temp.blackOff++;
  } else {
    let targetPt = temp.points[m.to];
    let opp = temp.turn === 'white' ? 'black' : 'white';
    if (targetPt.owner === opp && targetPt.count === 1) {
      if (opp === 'white') temp.whiteBar++; else temp.blackBar++;
      targetPt.count = 1; targetPt.owner = temp.turn;

      if (temp.turn === 'white') {
        temp.whiteCombo++;
        if (temp.whiteCombo > temp.highestWhiteCombo) temp.highestWhiteCombo = temp.whiteCombo;
      } else {
        temp.blackCombo++;
        if (temp.blackCombo > temp.highestBlackCombo) temp.highestBlackCombo = temp.blackCombo;
      }
      if (opp === 'white') temp.whiteCombo = 0; else temp.blackCombo = 0;
    } else {
      targetPt.count++; targetPt.owner = temp.turn;
      if (targetPt.count === 2) {
        if (temp.turn === 'white') {
          temp.whiteCombo++;
          if (temp.whiteCombo > temp.highestWhiteCombo) temp.highestWhiteCombo = temp.whiteCombo;
        } else {
          temp.blackCombo++;
          if (temp.blackCombo > temp.highestBlackCombo) temp.highestBlackCombo = temp.blackCombo;
        }
      }
    }
  }

  if (m.isCombined && m.componentDice) {
    m.componentDice.forEach(d => {
      let idx = temp.remainingDice.indexOf(d);
      if (idx !== -1) temp.remainingDice.splice(idx, 1);
    });
  } else {
    let dieIdx = temp.remainingDice.indexOf(m.die);
    if (dieIdx !== -1) temp.remainingDice.splice(dieIdx, 1);
  }
  return temp;
}

function getRawValidMoves() {
  return getRawValidMovesForState(state);
}

function getRawValidMovesForState(st) {
  let rawMoves = [];
  if (st.remainingDice.length === 0) return rawMoves;

  let p = st.turn;
  let barCount = p === 'white' ? st.whiteBar : st.blackBar;

  if (barCount > 0) {
    let fromIdx = p === 'white' ? 24 : -1;
    let uniqueDice = [...new Set(st.remainingDice)];
    uniqueDice.forEach(die => {
      let toIdx = p === 'white' ? (24 - die) : (die - 1);
      if (isValidTargetForState(st, toIdx, p)) {
        rawMoves.push({ from: fromIdx, to: toIdx, die });
      }
    });
    return rawMoves;
  }

  let uniqueDice = [...new Set(st.remainingDice)];
  for (let i = 0; i < 24; i++) {
    if (st.points[i].owner === p && st.points[i].count > 0) {
      uniqueDice.forEach(die => {
        let target = p === 'white' ? (i - die) : (i + die);

        if (p === 'white') {
          if (target >= 0) {
            if (isValidTargetForState(st, target, p)) {
              rawMoves.push({ from: i, to: target, die });
            }
          } else if (canBearOffForState(st, p)) {
            if (target === -1 || isHighestOccupiedForState(st, p, i)) {
              rawMoves.push({ from: i, to: -1, die, isOff: true });
            }
          }
        } else {
          if (target < 24) {
            if (isValidTargetForState(st, target, p)) {
              rawMoves.push({ from: i, to: target, die });
            }
          } else if (canBearOffForState(st, p)) {
            if (target === 24 || isHighestOccupiedForState(st, p, i)) {
              rawMoves.push({ from: i, to: 24, die, isOff: true });
            }
          }
        }
      });

      if (st.remainingDice.length >= 2) {
        let d1 = st.remainingDice[0];
        let d2 = st.remainingDice[1];

        let inter1 = p === 'white' ? (i - d1) : (i + d1);
        let combTarget = p === 'white' ? (i - d1 - d2) : (i + d1 + d2);
        let inter2 = p === 'white' ? (i - d2) : (i + d2);

        let path1Valid = isValidTargetForState(st, inter1, p) && isValidTargetForState(st, combTarget, p);
        let path2Valid = isValidTargetForState(st, inter2, p) && isValidTargetForState(st, combTarget, p);

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
  return rawMoves;
}

function isValidTargetForState(st, target, player) {
  if (target < 0 || target >= 24) return false;
  let pt = st.points[target];
  if (!pt.owner || pt.count === 0) return true;
  if (pt.owner === player) return true;
  if (pt.owner !== player && pt.count === 1) return true;
  return false;
}

function canBearOffForState(st, player) {
  let bar = player === 'white' ? st.whiteBar : st.blackBar;
  if (bar > 0) return false;
  let outside = 0;
  if (player === 'white') {
    for (let i = 6; i < 24; i++) if (st.points[i].owner === 'white') outside += st.points[i].count;
  } else {
    for (let i = 0; i < 18; i++) if (st.points[i].owner === 'black') outside += st.points[i].count;
  }
  return outside === 0;
}

function isHighestOccupiedForState(st, player, idx) {
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
}

function isValidTarget(target, player) {
  return isValidTargetForState(state, target, player);
}

function canBearOff(player) {
  return canBearOffForState(state, player);
}

function isHighestOccupied(player, idx) {
  return isHighestOccupiedForState(state, player, idx);
}

function getCanvasCoords(e) {
  const rect = canvas.getBoundingClientRect();
  const touch = (e.touches && e.touches.length > 0)
    ? e.touches[0]
    : (e.changedTouches && e.changedTouches.length > 0 ? e.changedTouches[0] : null);
  const clientX = touch ? touch.clientX : e.clientX;
  const clientY = touch ? touch.clientY : e.clientY;

  let container = canvas.parentElement;
  let targetW = container ? container.clientWidth : canvas.clientWidth;
  let targetH = container ? container.clientHeight : canvas.clientHeight;

  let scaleX = (rect.width > 0 && targetW > 0) ? targetW / rect.width : 1;
  let scaleY = (rect.height > 0 && targetH > 0) ? targetH / rect.height : 1;

  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  };
}

function startDrag(e) {
  if (e.cancelable && e.type.startsWith('touch')) e.preventDefault();
  if (state.dice.length === 0 || isRolling || activeMoveAnim) return;
  let pos = getCanvasCoords(e);
  let clickedPt = getPointFromCoords(pos.x, pos.y);

  if (state.selectedPoint !== null && clickedPt !== null && clickedPt !== state.selectedPoint) {
    let move = state.validMoves.find(m => m.from === state.selectedPoint && m.to === clickedPt);
    if (move) {
      state.selectedPoint = null;
      dragItem = null;
      applyMoveWithWaypointAnim(move);
      return;
    }
  }

  if (clickedPt === null) {
    state.selectedPoint = null;
    dragItem = null;
    draw();
    return;
  }

  let barCount = state.turn === 'white' ? state.whiteBar : state.blackBar;
  if (barCount > 0) {
    let barIdx = state.turn === 'white' ? 24 : -1;
    if (clickedPt === barIdx) {
      state.selectedPoint = barIdx;
      dragItem = { from: barIdx, startX: pos.x, startY: pos.y, currentX: pos.x, currentY: pos.y };
    } else if (state.selectedPoint === barIdx) {
      let move = state.validMoves.find(m => m.from === barIdx && m.to === clickedPt);
      if (move) {
        state.selectedPoint = null;
        dragItem = null;
        applyMoveWithWaypointAnim(move);
        return;
      }
    }
    draw();
    return;
  }

  if (clickedPt >= 0 && clickedPt < 24 && state.points[clickedPt].owner === state.turn) {
    state.selectedPoint = clickedPt;
    dragItem = { from: clickedPt, startX: pos.x, startY: pos.y, currentX: pos.x, currentY: pos.y };
  } else {
    state.selectedPoint = null;
    dragItem = null;
  }
  draw();
}

function moveDrag(e) {
  if (activeMoveAnim) return;
  if (!dragItem) return;
  if (e.cancelable && e.type.startsWith('touch')) e.preventDefault();
  let pos = getCanvasCoords(e);
  dragItem.currentX = pos.x;
  dragItem.currentY = pos.y;
  draw();
}

function endDrag(e) {
  if (activeMoveAnim) return;
  if (!dragItem) return;
  if (e.cancelable && e.type.startsWith('touch')) e.preventDefault();
  let pos = getCanvasCoords(e);
  let targetPt = getPointFromCoords(pos.x, pos.y);

  let dragDist = Math.hypot(pos.x - dragItem.startX, pos.y - dragItem.startY);

  if (dragDist > 10) {
    if (targetPt !== null && targetPt !== dragItem.from) {
      let move = state.validMoves.find(m => m.from === dragItem.from && m.to === targetPt);
      if (move) {
        state.selectedPoint = null;
        dragItem = null;
        applyMoveWithWaypointAnim(move);
        return;
      }
    }
    state.selectedPoint = null;
  }

  dragItem = null;
  draw();
}

function showToast(msg, duration = 2400) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }
  toast.style.cssText = 'position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); background:rgba(30,17,10,0.95); color:#FFF; padding:20px 40px; border-radius:16px; border: 2px solid #D4AF37; font-weight:600; font-size:18px; letter-spacing:0.5px; z-index:9999; box-shadow:0 10px 30px rgba(0,0,0,0.8), 0 0 15px rgba(212,175,55,0.4); text-align:center; transition:opacity 0.3s ease-in-out; pointer-events:none; min-width: 300px; display:flex; flex-direction:column; align-items:center; justify-content:center;';
  toast.innerHTML = msg.replace(/\n/g, '<br>');
  toast.style.opacity = '1';

  if (toast.hideTimeout) clearTimeout(toast.hideTimeout);
  toast.hideTimeout = setTimeout(() => { toast.style.opacity = '0'; }, duration);
}

function applyMoveWithWaypointAnim(m) {
  let waypoints = buildWaypointPath(m.from, m.to);
  let startT = performance.now();
  let duration = 420;

  let moverOwner = state.turn;

  activeMoveAnim = {
    waypoints,
    startT,
    duration,
    owner: moverOwner,
    move: m
  };

  function stepMoveAnim(now) {
    if (!activeMoveAnim) return;
    let elapsed = now - activeMoveAnim.startT;
    let ratio = Math.min(1.0, elapsed / activeMoveAnim.duration);

    draw(1.0, ratio);

    if (ratio < 1.0) {
      requestAnimationFrame(stepMoveAnim);
    } else {
      activeMoveAnim = null;
      applyMoveState(m);
    }
  }

  requestAnimationFrame(stepMoveAnim);
}

function applyMoveState(m) {
  if (m.isCombined) {
    let d1 = m.componentDice[0];
    let d2 = m.componentDice[1];

    let p = state.turn;
    let midTarget = p === 'white' ? (m.from - d1) : (m.from + d1);
    if (!isValidTarget(midTarget, p)) {
      midTarget = p === 'white' ? (m.from - d2) : (m.from + d2);
    }

    applySingleMove({ from: m.from, to: midTarget, die: d1 });
    applySingleMove({ from: midTarget, to: m.to, die: d2 });
    return;
  }

  applySingleMove(m);
}

function checkWinCondition() {
  if (state.whiteOff >= 15 || state.blackOff >= 15) {
    stopRevealTimer();
    state.isRevealActive = false;
    hideRevealUI();
    let winnerName = state.whiteOff >= 15 ? 'Beyaz' : 'Siyah';
    state.winner = winnerName;
    state.dice = [];
    state.remainingDice = [];
    state.whiteCombo = 0;
    state.blackCombo = 0;
    state.validMoves = [];

    let xpResult = null;
    let objRewards = null;
    let coinReward = null;
    if (!state.matchProcessed) {
      state.matchProcessed = true;
      let isWin = (winnerName === 'Beyaz');

      if (typeof userProfile !== 'undefined') {
        if (isWin) {
          userProfile.wins = (userProfile.wins || 0) + 1;
          if (userProfile.stats) {
            userProfile.stats.matchesWon = userProfile.wins;
            if (state.blackOff === 0) userProfile.stats.totalMarsa++;
          }
        } else {
          userProfile.losses = (userProfile.losses || 0) + 1;
        }
      }

      if (typeof CoinService !== 'undefined') {
        coinReward = CoinService.grantMatchReward(isWin);
      }

      if (typeof XPService !== 'undefined') {
        xpResult = XPService.grantMatchReward(isWin);
      }

      if (typeof MissionService !== 'undefined') {
        MissionService.endMatch(isWin, typeof currentGameMode !== 'undefined' && currentGameMode === 'DARK_TAVLA');
      }

      if (typeof AchievementService !== 'undefined') {
        AchievementService.checkAll();
      }

      if (typeof saveUserProfile === 'function') saveUserProfile(userProfile);
    }

    updateUI();
    draw();
    SoundFX.playGameWin();
    setTimeout(() => {
      let msg = `🏆 TEBRİKLER! ${winnerName.toUpperCase()} OYUNCU MAÇI KAZANDI! 🎉\n\n`;
      let isWin = (winnerName === 'Beyaz');
      if (isWin && coinReward && coinReward.granted) {
        msg += `🪙 +${coinReward.amount} Coins\n`;
      }
      if (xpResult && xpResult.granted) {
        msg += `⭐ +${xpResult.amount} XP (${isWin ? 'GALİBİYET' : 'MAĞLUBİYET'})\n\n`;
      }
      if (state.matchComboXP > 0 && isWin) {
        msg += `\n🔥 COMBO BAŞARISI: +${state.matchComboXP} XP\n`;
        if (state.highestWhiteCombo > 0) {
          msg += `   (En Yüksek Seri: x${state.highestWhiteCombo})\n`;
        }
      }

      let prog = typeof XPService !== 'undefined' ? XPService.getProgress() : { level: 1, currentXP: 0, requiredXP: 100 };
      msg += `\n⭐ MEVCUT: SEVİYE ${prog.level} (${prog.currentXP} / ${prog.requiredXP} XP)`;

      if (xpResult && xpResult.leveledUp) {
        msg += `\n\n🌟 SEVİYE ATLADINIZ! YENİ SEVİYE: LEVEL ${xpResult.newLevel}`;
      }
      showToast(msg, 7000);
    }, 150);
    return true;
  }
  return false;
}

function applySingleMove(m) {
  if (state.turn === 'white' && typeof userProfile !== 'undefined' && userProfile.stats) {
    userProfile.stats.totalMoves++;
  }

  if (m.from === 24) state.whiteBar--;
  else if (m.from === -1) state.blackBar--;
  else {
    state.points[m.from].count--;
    if (state.points[m.from].count === 0) state.points[m.from].owner = null;
  }

  if (m.isOff) {
    SoundFX.playBearOff();
    if (state.turn === 'white') {
      state.whiteOff++;
      if (typeof MissionService !== 'undefined') {
        MissionService.notifyEvent('CHECKER_BEAR_OFF', 1);
      }
    } else {
      state.blackOff++;
    }
    if (checkWinCondition()) return;
  } else {
    let targetPt = state.points[m.to];
    let opp = state.turn === 'white' ? 'black' : 'white';
    if (targetPt.owner === opp && targetPt.count === 1) {
      SoundFX.playCheckerHit();
      if (opp === 'white') state.whiteBar++; else state.blackBar++;
      targetPt.count = 1; targetPt.owner = state.turn;
      if (state.turn === 'white' && typeof MissionService !== 'undefined') {
        MissionService.notifyEvent('CHECKER_HIT', 1);
      }
      if (state.turn === 'white' && typeof userProfile !== 'undefined' && userProfile.stats) {
        userProfile.stats.totalHits++;
      }

      if (state.turn === 'white') {
        state.whiteCombo++;
        if (state.whiteCombo > state.highestWhiteCombo) state.highestWhiteCombo = state.whiteCombo;
        if (typeof userProfile !== 'undefined' && userProfile.stats && state.whiteCombo > userProfile.stats.highestCombo) {
          userProfile.stats.highestCombo = state.whiteCombo;
        }
        ComboService.processComboIncrease('white', state.whiteCombo);
      } else {
        state.blackCombo++;
        if (state.blackCombo > state.highestBlackCombo) state.highestBlackCombo = state.blackCombo;
        ComboService.processComboIncrease('black', state.blackCombo);
      }
      if (opp === 'white') state.whiteCombo = 0; else state.blackCombo = 0;
    } else {
      SoundFX.playCheckerMove();
      targetPt.count++; targetPt.owner = state.turn;
      if (targetPt.count === 2) {
        if (state.turn === 'white' && typeof MissionService !== 'undefined') {
          MissionService.notifyEvent('POINT_MADE', 1);
        }

        if (state.turn === 'white') {
          state.whiteCombo++;
          if (state.whiteCombo > state.highestWhiteCombo) state.highestWhiteCombo = state.whiteCombo;
          if (typeof userProfile !== 'undefined' && userProfile.stats && state.whiteCombo > userProfile.stats.highestCombo) {
            userProfile.stats.highestCombo = state.whiteCombo;
          }
          ComboService.processComboIncrease('white', state.whiteCombo);
        } else {
          state.blackCombo++;
          if (state.blackCombo > state.highestBlackCombo) state.highestBlackCombo = state.blackCombo;
          ComboService.processComboIncrease('black', state.blackCombo);
        }
      }
    }
  }

  let dieIdx = state.remainingDice.indexOf(m.die);
  if (dieIdx !== -1) state.remainingDice.splice(dieIdx, 1);
  state.selectedPoint = null;
  calculateValidMoves();

  if (state.remainingDice.length === 0) {
    state.whiteCombo = 0;
    state.blackCombo = 0;
    state.turn = state.turn === 'white' ? 'black' : 'white';

    if (currentGameMode === 'DARK_TAVLA') {
      if (!state.isRevealActive) {
        state.turnCounter++;
        if (state.turnCounter >= 6) {
          state.isRevealActive = true;
          showRevealUI();
          if (revealTimeoutId) clearTimeout(revealTimeoutId);
          revealTimeoutId = setTimeout(() => {
            revealTimeoutId = null;
            state.isRevealActive = false;
            state.turnCounter = 0;
            hideRevealUI();
            draw();
          }, DARK_TAVLA_REVEAL_DURATION);
        }
      }
    }

    state.dice = [];
    state.remainingDice = [];
    state.validMoves = [];
  } else {
    checkAutoPass();
  }

  updateUI();
  draw();
  checkAITurn();
}

function getPointFromCoords(x, y) {
  let container = canvas.parentElement;
  let w = container ? container.clientWidth : canvas.clientWidth;
  let h = container ? container.clientHeight : canvas.clientHeight;
  if (!w || !h) return null;

  let frameBorder = 14;
  let rightTrayW = 54;
  let barW = 48, halfW = (w - barW - rightTrayW) / 2, ptW = (halfW - frameBorder) / 6;

  if (x > halfW && x < halfW + barW) {
    return y < h / 2 ? 24 : -1;
  }

  if (x >= w - rightTrayW - frameBorder && canBearOff(state.turn)) {
    return state.turn === 'white' ? -1 : 24;
  }

  let isTop = y < h / 2;
  let idx = null;

  if (!isTop) {
    if (x >= halfW + barW && x < w - rightTrayW) {
      let col = Math.floor((x - (halfW + barW)) / ptW);
      idx = 5 - col;
    } else if (x >= frameBorder && x < halfW) {
      let col = Math.floor((x - frameBorder) / ptW);
      idx = 11 - col;
    }
  } else {
    if (x >= frameBorder && x < halfW) {
      let col = Math.floor((x - frameBorder) / ptW);
      idx = 12 + col;
    } else if (x >= halfW + barW && x < w - rightTrayW) {
      let col = Math.floor((x - (halfW + barW)) / ptW);
      idx = 18 + col;
    }
  }
  return idx;
}

function draw(animRatio = 1.0, moveRatio = 1.0) {
  if (!canvas) return;
  let dpr = window.devicePixelRatio || 1;
  let container = canvas.parentElement;
  if (!container) return;
  let w = container.clientWidth;
  let h = container.clientHeight;
  if (!w || !h || w < 100 || h < 100) return;

  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);

  ctx.save();
  ctx.scale(dpr, dpr);

  let frameBorder = 14;
  let rightTrayW = 54;
  let barW = 48, halfW = (w - barW - rightTrayW) / 2, ptW = (halfW - frameBorder) / 6;
  let triH = Math.min(h * 0.42, (halfW - frameBorder) * 1.8);

  let theme = boardThemes[currentBoardTheme] || boardThemes.walnut;

  let viewer = isVsAI ? 'white' : state.turn;
  let forceReveal = (currentGameMode === 'DARK_TAVLA' && state.isRevealActive);
  let isFogMode = (currentGameMode === 'DARK_TAVLA' && !forceReveal);

  // Outer Frame
  ctx.fillStyle = theme.frame;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#0F0804'; ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, w - 2, h - 2);

  let floorGrd = ctx.createRadialGradient((w - rightTrayW) / 2, h / 2, h * 0.2, (w - rightTrayW) / 2, h / 2, w);
  floorGrd.addColorStop(0, theme.bg);
  floorGrd.addColorStop(1, '#0B0805');
  ctx.fillStyle = floorGrd;
  ctx.fillRect(frameBorder, frameBorder, w - frameBorder - rightTrayW, h - (frameBorder * 2));

  if (forceReveal) {
    ctx.save();
    let revealGrd = ctx.createRadialGradient((w - rightTrayW) / 2, h / 2, 20, (w - rightTrayW) / 2, h / 2, w * 0.7);
    revealGrd.addColorStop(0, 'rgba(255, 225, 140, 0.22)');
    revealGrd.addColorStop(0.5, 'rgba(212, 175, 55, 0.10)');
    revealGrd.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = revealGrd;
    ctx.fillRect(frameBorder, frameBorder, w - frameBorder - rightTrayW, h - (frameBorder * 2));
    ctx.restore();
  }

  // Inner Shadows
  ctx.strokeStyle = 'rgba(0,0,0,0.8)';
  ctx.lineWidth = 3;
  ctx.strokeRect(frameBorder - 1.5, frameBorder - 1.5, w - frameBorder - rightTrayW + 3, h - frameBorder * 2 + 3);

  // Bearing Off Trays
  let trayLeft = w - rightTrayW;
  let trayTop = frameBorder;
  let trayH = h - frameBorder * 2;

  ctx.fillStyle = theme.frame;
  ctx.fillRect(trayLeft - 4, 0, 4, h);
  ctx.strokeStyle = '#0F0804'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(trayLeft - 4, 0); ctx.lineTo(trayLeft - 4, h); ctx.stroke();

  ctx.fillStyle = '#1A0E08';
  ctx.fillRect(trayLeft, trayTop, rightTrayW - frameBorder, trayH);

  ctx.strokeStyle = 'rgba(0,0,0,0.8)';
  ctx.lineWidth = 3;
  ctx.strokeRect(trayLeft + 1.5, trayTop + 1.5, rightTrayW - frameBorder - 3, trayH - 3);

  ctx.fillStyle = '#0F0804';
  ctx.fillRect(trayLeft, h / 2 - 2, rightTrayW - frameBorder, 4);

  // Collected Checkers
  let trayCx = trayLeft + (rightTrayW - frameBorder) / 2;
  let trayCheckerR = Math.min(ptW * 0.44, 17);
  let stackSpacing = Math.min(trayCheckerR * 2.2, (trayH / 2 - 20) / 15);

  let wCount = state.whiteOff;
  if (dragItem && dragItem.from === -1 && state.turn === 'white') wCount--;
  let showWhiteOff = true;
  if (isFogMode && !forceReveal && viewer !== 'white') showWhiteOff = false;

  if (showWhiteOff) {
    for (let i = 0; i < wCount; i++) {
      let cy = h - trayTop - trayCheckerR - 6 - i * stackSpacing;
      draw3DCylindricalChecker(trayCx, cy, trayCheckerR, 'white');
    }
  }

  let bCount = state.blackOff;
  if (dragItem && dragItem.from === 24 && state.turn === 'black') bCount--;
  let showBlackOff = true;
  if (isFogMode && !forceReveal && viewer !== 'black') showBlackOff = false;

  if (showBlackOff) {
    for (let i = 0; i < bCount; i++) {
      let cy = trayTop + trayCheckerR + 6 + i * stackSpacing;
      draw3DCylindricalChecker(trayCx, cy, trayCheckerR, 'black');
    }
  }

  // Draw 24 Points
  for (let i = 0; i < 24; i++) {
    let isDark = i % 2 === 0;
    let isSel = state.selectedPoint === i;

    let left = 0, isTop = i >= 12;
    if (i <= 5) left = halfW + barW + (5 - i) * ptW;
    else if (i <= 11) left = frameBorder + (11 - i) * ptW;
    else if (i <= 17) left = frameBorder + (i - 12) * ptW;
    else left = halfW + barW + (i - 18) * ptW;

    ctx.beginPath();
    if (!isTop) {
      ctx.moveTo(left, h - frameBorder); ctx.lineTo(left + ptW / 2, h - frameBorder - triH); ctx.lineTo(left + ptW, h - frameBorder);
    } else {
      ctx.moveTo(left, frameBorder); ctx.lineTo(left + ptW / 2, frameBorder + triH); ctx.lineTo(left + ptW, frameBorder);
    }
    ctx.closePath();

    let pt = state.points[i];
    let isOwnPoint = pt.owner === viewer && pt.count > 0;

    let isLegalDestination = false;
    let isOpponentGateTarget = false;

    if (isFogMode && state.selectedPoint !== null && state.turn === viewer) {
      isLegalDestination = state.validMoves.some(m => m.to === i && m.from === state.selectedPoint);

      if (!isLegalDestination) {
        let uniqueDice = [...new Set(state.remainingDice)];
        let p = viewer;

        uniqueDice.forEach(die => {
          let target = p === 'white' ? (state.selectedPoint - die) : (state.selectedPoint + die);
          if (target === i) {
            let tgtPt = state.points[i];
            if (tgtPt && tgtPt.owner && tgtPt.owner !== p && tgtPt.count >= 2) {
              isOpponentGateTarget = true;
            }
          }
        });

        if (state.remainingDice.length >= 2) {
          let d1 = state.remainingDice[0];
          let d2 = state.remainingDice[1];
          let inter1 = p === 'white' ? (state.selectedPoint - d1) : (state.selectedPoint + d1);
          let inter2 = p === 'white' ? (state.selectedPoint - d2) : (state.selectedPoint + d2);
          let combTarget = p === 'white' ? (state.selectedPoint - d1 - d2) : (state.selectedPoint + d1 + d2);

          if (combTarget === i) {
            let path1Valid = isValidTargetForState(state, inter1, p);
            let path2Valid = isValidTargetForState(state, inter2, p);
            if (path1Valid || path2Valid) {
              let tgtPt = state.points[i];
              if (tgtPt && tgtPt.owner && tgtPt.owner !== p && tgtPt.count >= 2) {
                isOpponentGateTarget = true;
              }
            }
          }
        }
      }
    } else {
      isLegalDestination = state.validMoves.some(m => m.to === i && m.from === state.selectedPoint);
    }

    let ptGrd = ctx.createLinearGradient(0, isTop ? frameBorder : h - frameBorder, 0, isTop ? frameBorder + triH : h - frameBorder - triH);

    if (isSel) {
      ptGrd.addColorStop(0, '#5E4322'); ptGrd.addColorStop(1, '#3E2A12');
    } else if (isLegalDestination && isFogMode) {
      ptGrd.addColorStop(0, '#E5DAC8'); ptGrd.addColorStop(1, '#B89959');
    } else if (isOpponentGateTarget && isFogMode) {
      ptGrd.addColorStop(0, '#5C1010'); ptGrd.addColorStop(1, '#3A0808');
    } else if (isLegalDestination && !isFogMode) {
      ptGrd.addColorStop(0, '#3A4232'); ptGrd.addColorStop(1, '#222A1A');
    } else if (isFogMode && !forceReveal && !isOwnPoint) {
      ptGrd.addColorStop(0, '#100905'); ptGrd.addColorStop(1, '#050201');
    } else if (isDark) {
      ptGrd.addColorStop(0, theme.dark); ptGrd.addColorStop(1, theme.dark);
    } else {
      ptGrd.addColorStop(0, theme.light); ptGrd.addColorStop(1, '#C7B79E');
    }

    ctx.fillStyle = ptGrd;
    ctx.fill();

    if (isLegalDestination && isFogMode) ctx.strokeStyle = '#D4AF37';
    else if (isOpponentGateTarget && isFogMode) ctx.strokeStyle = '#8B0000';
    else ctx.strokeStyle = isSel ? '#F2EBDF' : isLegalDestination ? '#9CCB86' : (isFogMode && !forceReveal && !isOwnPoint ? 'rgba(0,0,0,0.8)' : (isDark ? 'rgba(0,0,0,0.4)' : 'rgba(100,60,30,0.1)'));

    ctx.lineWidth = isSel || isLegalDestination || isOpponentGateTarget ? 1.5 : 1.0;
    ctx.stroke();

    if (pt.count > 0) {
      let isVisible = true;
      if (isFogMode && !forceReveal) {
        if (pt.owner !== viewer) {
          isVisible = false;
        }
      }

      if (isVisible) {
        let r = Math.min(ptW * 0.44, 17);
        let actualCount = (dragItem && dragItem.from === i) ? pt.count - 1 : pt.count;

        if (actualCount > 0) {
          let defaultSpacing = r * 1.7;
          let stepY = defaultSpacing;
          let availableH = triH - r * 1.8;

          if (actualCount > 1) {
            let requiredH = (actualCount - 1) * defaultSpacing;
            if (requiredH > availableH) {
              stepY = availableH / (actualCount - 1);
            }
          }

          for (let c = 0; c < actualCount; c++) {
            let cx = left + ptW / 2;
            let cy = isTop ? (frameBorder + r + 2 + c * stepY) : (h - frameBorder - r - 2 - c * stepY);
            draw3DCylindricalChecker(cx, cy, r, pt.owner);
          }
        }
      }
    }
  }

  // Physical 3D Center BAR Beam
  let barLeft = halfW;
  let barTop = frameBorder - 2;
  let barH = h - (frameBorder * 2) + 4;

  let sL = ctx.createLinearGradient(barLeft - 10, 0, barLeft, 0);
  sL.addColorStop(0, 'transparent'); sL.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = sL; ctx.fillRect(barLeft - 10, frameBorder, 10, h - frameBorder * 2);

  let sR = ctx.createLinearGradient(barLeft + barW, 0, barLeft + barW + 10, 0);
  sR.addColorStop(0, 'rgba(0,0,0,0.6)'); sR.addColorStop(1, 'transparent');
  ctx.fillStyle = sR; ctx.fillRect(barLeft + barW, frameBorder, 10, h - frameBorder * 2);

  let beamGrd = ctx.createLinearGradient(barLeft, 0, barLeft + barW, 0);
  beamGrd.addColorStop(0.0, '#3A2113');
  beamGrd.addColorStop(0.5, '#2A170C');
  beamGrd.addColorStop(1.0, '#1F1008');
  ctx.fillStyle = beamGrd;
  ctx.fillRect(barLeft, barTop, barW, barH);

  ctx.strokeStyle = '#4A2E1B'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(barLeft, barTop); ctx.lineTo(barLeft, barTop + barH); ctx.stroke();
  ctx.strokeStyle = '#0F0804';
  ctx.beginPath(); ctx.moveTo(barLeft + barW, barTop); ctx.lineTo(barLeft + barW, barTop + barH); ctx.stroke();

  drawBrassHinge(barLeft + barW / 2, h / 4, barW - 16);
  drawBrassHinge(barLeft + barW / 2, h - h / 4, barW - 16);

  let visWhiteBar = (dragItem && dragItem.from === 24) ? state.whiteBar - 1 : state.whiteBar;
  let visBlackBar = (dragItem && dragItem.from === -1) ? state.blackBar - 1 : state.blackBar;

  let showWhiteBar = true;
  let showBlackBar = true;

  if (isFogMode && !forceReveal) {
    if (viewer !== 'white') showWhiteBar = false;
    if (viewer !== 'black') showBlackBar = false;
  }

  if (visWhiteBar > 0 && showWhiteBar) draw3DCylindricalChecker(barLeft + barW / 2, 45, 17, 'white');
  if (visBlackBar > 0 && showBlackBar) draw3DCylindricalChecker(barLeft + barW / 2, h - 45, 17, 'black');

  if (dragItem) {
    draw3DCylindricalChecker(dragItem.currentX, dragItem.currentY, 18, state.turn);
  }

  if (activeMoveAnim) {
    let isVisibleAnim = true;
    if (isFogMode && !forceReveal && activeMoveAnim.owner !== viewer) isVisibleAnim = false;
    if (isVisibleAnim) {
      let pos = interpolateWaypoints(activeMoveAnim.waypoints, moveRatio);
      draw3DCylindricalChecker(pos.x, pos.y, 18, activeMoveAnim.owner);
    }
  }

  if (isRolling && dicePhysics.length === 2) {
    let t = animRatio;
    dicePhysics.forEach(p => {
      let easeT = Math.min(1.0, Math.pow(t, 0.8));
      let posX = p.startX + (p.targetX - p.startX) * easeT;
      let posY = p.startY + (p.targetY - p.startY) * easeT;

      let zH = 0;
      if (t < 0.45) zH = Math.sin((t / 0.45) * Math.PI) * 34.0;
      else if (t < 0.75) zH = Math.sin(((t - 0.45) / 0.30) * Math.PI) * 11.0;
      else if (t < 0.95) zH = Math.sin(((t - 0.75) / 0.20) * Math.PI) * 3.0;

      let targetRotX = 0, targetRotY = 0;
      switch (p.targetVal) {
        case 1: targetRotX = 0; targetRotY = 0; break;
        case 6: targetRotX = Math.PI; targetRotY = 0; break;
        case 2: targetRotX = -Math.PI / 2; targetRotY = 0; break;
        case 5: targetRotX = Math.PI / 2; targetRotY = 0; break;
        case 3: targetRotX = 0; targetRotY = -Math.PI / 2; break;
        case 4: targetRotX = 0; targetRotY = Math.PI / 2; break;
      }

      let rotX, rotY;
      if (t < 0.75) {
        let subT = t / 0.75;
        rotX = subT * p.rotSpeedX;
        rotY = subT * p.rotSpeedY;
      } else {
        let subT = (t - 0.75) / 0.25;
        let currentRotX = 0.75 * p.rotSpeedX;
        let currentRotY = 0.75 * p.rotSpeedY;
        let finalTargetX = targetRotX + Math.round(currentRotX / (2 * Math.PI)) * 2 * Math.PI;
        let finalTargetY = targetRotY + Math.round(currentRotY / (2 * Math.PI)) * 2 * Math.PI;

        rotX = currentRotX + (finalTargetX - currentRotX) * Math.pow(subT, 2);
        rotY = currentRotY + (finalTargetY - currentRotY) * Math.pow(subT, 2);
      }

      renderTrue3DCube(w / 2 + posX, h / 2 + posY, 44, rotX, rotY, 0, zH, 1.0);
    });
  } else if (state.dice.length > 0) {
    function getFaceAngles(v) {
      switch (v) {
        case 1: return [0, 0];
        case 6: return [Math.PI, 0];
        case 2: return [-Math.PI / 2, 0];
        case 5: return [Math.PI / 2, 0];
        case 3: return [0, -Math.PI / 2];
        case 4: return [0, Math.PI / 2];
      }
      return [0, 0];
    }

    let d1 = state.dice[0];
    let d2 = state.dice[1] !== undefined ? state.dice[1] : state.dice[0];

    let op1 = getDieOpacity(0);
    let op2 = getDieOpacity(1);

    let [rotX1, rotY1] = getFaceAngles(d1);
    let [rotX2, rotY2] = getFaceAngles(d2);

    renderTrue3DCube(w / 2 - 30, h / 2, 44, rotX1, rotY1, 0, 0, op1);
    renderTrue3DCube(w / 2 + 30, h / 2, 44, rotX2, rotY2, 0, 0, op2);
  }
  ctx.restore();
}

function draw3DCylindricalChecker(x, y, r, owner) {
  if (!r || r <= 0 || isNaN(r)) return;
  let isWhite = owner === 'white';

  ctx.save();

  ctx.beginPath();
  ctx.ellipse(x + 2, y + r * 0.4, r * 0.95, r * 0.85, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(10, 5, 2, 0.65)';
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.1, r * 0.98, r * 0.98, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x, y + 4.5, r, 0, Math.PI * 2);
  ctx.fillStyle = isWhite ? '#A89E8D' : '#140C07';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  let discGrd = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.05, x, y, r);
  if (isWhite) {
    discGrd.addColorStop(0, '#FFFBF0');
    discGrd.addColorStop(0.5, '#E5D8C0');
    discGrd.addColorStop(1.0, '#C2B196');
  } else {
    discGrd.addColorStop(0, '#362215');
    discGrd.addColorStop(0.6, '#1C1008');
    discGrd.addColorStop(1.0, '#0F0804');
  }
  ctx.fillStyle = discGrd;
  ctx.fill();

  ctx.strokeStyle = isWhite ? '#F2EBDF' : '#331D11';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x, y, r * 0.65, 0, Math.PI * 2);
  let innerGrd = ctx.createLinearGradient(x, y - r, x, y + r);
  if (isWhite) {
    innerGrd.addColorStop(0, '#B3A186');
    innerGrd.addColorStop(1, '#FFFDF7');
  } else {
    innerGrd.addColorStop(0, '#050302');
    innerGrd.addColorStop(1, '#331D11');
  }
  ctx.strokeStyle = innerGrd;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();
}



function drawBrassHinge(cx, cy, w) {
  ctx.save();
  let hGrd = ctx.createLinearGradient(cx - w / 2, cy, cx + w / 2, cy);
  hGrd.addColorStop(0, '#A68A56'); hGrd.addColorStop(0.4, '#735F3A');
  hGrd.addColorStop(0.8, '#4A3C22'); hGrd.addColorStop(1.0, '#735F3A');
  ctx.fillStyle = hGrd;
  ctx.fillRect(cx - w / 2, cy - 4, w, 8);
  ctx.strokeStyle = '#261C0E'; ctx.lineWidth = 1;
  ctx.strokeRect(cx - w / 2, cy - 4, w, 8);

  ctx.fillStyle = '#1A1208';
  ctx.beginPath(); ctx.arc(cx - w / 3, cy, 1.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + w / 3, cy, 1.2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function getDieOpacity(dieIndex) {
  if (state.dice.length === 0) return 1.0;
  let isDouble = (state.dice.length === 4);
  let totalMoves = state.dice.length;
  let remainingCount = state.remainingDice.length;
  let usedMoves = totalMoves - remainingCount;

  if (isDouble) {
    // Exactly 2 physical dice rendered for double rolls (dieIndex 0 and dieIndex 1)
    // 1st die handles moves 1 & 2; 2nd die handles moves 3 & 4
    let dieUsedCount = (dieIndex === 0)
      ? Math.min(2, usedMoves)
      : Math.max(0, usedMoves - 2);

    if (dieUsedCount === 0) return 1.0;  // Full opacity
    if (dieUsedCount === 1) return 0.50; // Half-transparent after 1st move
    return 0.20;                         // Completely transparent after 2nd move
  }

  // Normal Roll (2 dice)
  let remCopy = [...state.remainingDice];
  for (let i = 0; i < state.dice.length; i++) {
    let dVal = state.dice[i];
    let idx = remCopy.indexOf(dVal);
    if (idx !== -1) {
      remCopy.splice(idx, 1);
      if (i === dieIndex) return 1.0;
    } else {
      if (i === dieIndex) return 0.20;
    }
  }
  return 1.0;
}

function updateUI() {
  let isHumanTurn = !isVsAI || state.turn === 'white';
  let wTurn = document.getElementById('white-turn');
  let bTurn = document.getElementById('black-turn');
  let wOff = document.getElementById('white-off-count');
  let bOff = document.getElementById('black-off-count');
  let rBtn = document.getElementById('roll-btn');
  let sMsg = document.getElementById('status-msg');

  if (wTurn) wTurn.style.display = (state.turn === 'white' && !state.winner) ? 'block' : 'none';
  if (bTurn) bTurn.style.display = (state.turn === 'black' && !state.winner) ? 'block' : 'none';
  if (wOff) wOff.innerText = state.whiteOff;
  if (bOff) bOff.innerText = state.blackOff;
  if (rBtn) rBtn.disabled = state.dice.length > 0 || isRolling || state.winner != null || !isHumanTurn;

  if (sMsg) {
    if (state.winner) {
      sMsg.innerText = `MAÇ BİTTİ - ${state.winner.toUpperCase()} KAZANDI`;
    } else if (!isHumanTurn) {
      sMsg.innerText = 'RAKİP BEKLENİYOR...';
    } else {
      if (state.dice.length > 0) {
        let d1 = state.dice[0];
        let d2 = state.dice[1] !== undefined ? state.dice[1] : state.dice[0];
        sMsg.innerText = `ZAR [ ${d1} - ${d2} ]`;
      } else {
        sMsg.innerText = 'ZAR BEKLENİYOR';
      }
    }
  }
}

function handleResize() {
  if (dragItem) {
    dragItem = null;
    if (typeof state !== 'undefined') {
      state.selectedPoint = null;
    }
  }
  draw();
}

function setupEventListeners() {
  canvas = document.getElementById('boardCanvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');

  canvas.addEventListener('mousedown', startDrag);
  canvas.addEventListener('touchstart', startDrag);

  window.addEventListener('mousemove', moveDrag);
  window.addEventListener('touchmove', moveDrag);

  window.addEventListener('mouseup', endDrag);
  window.addEventListener('touchend', endDrag);

  window.addEventListener('resize', handleResize);
}

window.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadWebProfile();
  initGame();
  setTimeout(draw, 50);
});

window.addEventListener('load', () => {
  draw();
});
