let aiTimeoutId = null;

function checkAITurn() {
  if (!isVsAI || state.winner || isRolling || activeMoveAnim) {
    if (aiTimeoutId) {
      clearTimeout(aiTimeoutId);
      aiTimeoutId = null;
    }
    isAIBusy = false;
    return;
  }
  if (state.turn !== 'black') {
    if (aiTimeoutId) {
      clearTimeout(aiTimeoutId);
      aiTimeoutId = null;
    }
    isAIBusy = false;
    return;
  }

  if (isAIBusy || aiTimeoutId) return;
  isAIBusy = true;

  if (state.dice.length === 0 && !isRolling) {
    aiTimeoutId = setTimeout(() => {
      aiTimeoutId = null;
      isAIBusy = false;
      if (state.turn === 'black' && state.dice.length === 0 && !isRolling && !state.winner) {
        rollDice();
      }
    }, 400);
    return;
  }

  if (state.dice.length > 0 && state.validMoves.length > 0) {
    aiTimeoutId = setTimeout(() => {
      aiTimeoutId = null;
      if (state.turn !== 'black' || activeMoveAnim || state.winner) {
        isAIBusy = false;
        return;
      }
      let move = getAIBestMove();
      isAIBusy = false;
      if (move) applyMoveWithWaypointAnim(move);
    }, 600);
  } else {
    isAIBusy = false;
  }
}

function getAIBestMove() {
  let valid = state.validMoves;
  if (valid.length === 0) return null;

  let bestMove = valid[0];
  let maxScore = -999999;

  let baseState = (currentGameMode === 'DARK_TAVLA' && !state.isRevealActive)
    ? getPerceivedStateForAI(state)
    : state;

  valid.forEach(m => {
    let temp = simulateSingleMoveState(baseState, m);
    let score = evaluateBoardForAI(temp);
    if (score > maxScore) {
      maxScore = score;
      bestMove = m;
    }
  });
  return bestMove;
}

function getPerceivedStateForAI(realState) {
  if (currentGameMode !== 'DARK_TAVLA' || realState.isRevealActive) {
    return realState;
  }
  let perceived = JSON.parse(JSON.stringify(realState));
  perceived.whiteBar = 0;
  perceived.whiteOff = 0;
  for (let i = 0; i < 24; i++) {
    let pt = perceived.points[i];
    if (pt.owner === 'white' && pt.count < 2) {
      pt.count = 0;
      pt.owner = null;
    }
  }
  return perceived;
}

function evaluateBoardForAI(st) {
  let score = 0;
  if (st.blackOff === 15) return 100000;
  if (st.whiteOff === 15) return -100000;

  score += st.blackOff * 200 - st.whiteOff * 200;
  score -= st.blackBar * 200 - st.whiteBar * 200;

  let consecutiveBlackPoints = 0;

  for (let i = 0; i < 24; i++) {
    let pt = st.points[i];
    
    // --- Ardışık Kapı (Prime / Duvar) Bonusu ---
    if (pt.owner === 'black' && pt.count >= 2) {
      consecutiveBlackPoints++;
      if (consecutiveBlackPoints >= 2) {
        score += consecutiveBlackPoints * 15; 
      }
    } else {
      consecutiveBlackPoints = 0;
    }

    if (!pt.owner || pt.count === 0) continue;
    
    if (pt.owner === 'black') {
      if (pt.count === 1) {
        let penalty = i >= 18 ? 60 : 40;
        if (st.whiteBar > 0) penalty = 150; // Rakip bardayken açık vermeye ceza
        score -= penalty;
      }
      else if (pt.count >= 2) {
        score += (i >= 18 ? 90 : 45); 
        
        // Yığılma (Stacking) Cezası
        if (pt.count > 4) {
          score -= (pt.count - 4) * 20;
        }
      }
    } else {
      // White pieces (opponent)
      if (pt.count === 1) score += 30; // Rakibin açığını yakalamak (hit) için teşvik
    }
  }
  return score;
}
