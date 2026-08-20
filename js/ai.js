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

function getAIBestMove(player = 'black') {
  let valid = state.validMoves;
  if (valid.length === 0) return null;

  let bestMove = valid[0];
  let maxScore = -999999;

  let baseState = (currentGameMode === 'DARK_TAVLA' && !state.isRevealActive)
    ? getPerceivedStateForAI(state)
    : state;

  valid.forEach(m => {
    let temp = simulateSingleMoveState(baseState, m);
    let score = evaluateBoardForAI(temp, player);
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

function evaluateBoardForAI(st, player = 'black') {
  // Neural Network Evaluation
  if (typeof AI_WEIGHTS !== 'undefined') {
    let vec = new Array(28).fill(0);
    for (let i = 0; i < 24; i++) {
      if (st.points[i].owner === 'white') vec[i] = st.points[i].count;
      else if (st.points[i].owner === 'black') vec[i] = -st.points[i].count;
    }
    vec[24] = st.whiteBar;
    vec[25] = st.blackBar;
    vec[26] = st.whiteOff;
    vec[27] = st.blackOff;

    let h1 = new Array(128).fill(0);
    for (let i = 0; i < 128; i++) {
      let sum = AI_WEIGHTS.fc1_bias[i];
      for (let j = 0; j < 28; j++) sum += vec[j] * AI_WEIGHTS.fc1_weight[i][j];
      h1[i] = sum > 0 ? sum : 0;
    }

    let h2 = new Array(64).fill(0);
    for (let i = 0; i < 64; i++) {
      let sum = AI_WEIGHTS.fc2_bias[i];
      for (let j = 0; j < 128; j++) sum += h1[j] * AI_WEIGHTS.fc2_weight[i][j];
      h2[i] = sum > 0 ? sum : 0;
    }

    let out = AI_WEIGHTS.out_bias[0];
    for (let i = 0; i < 64; i++) {
      out += h2[i] * AI_WEIGHTS.out_weight[0][i];
    }

    let pWhite = 1 / (1 + Math.exp(-out));
    return player === 'white' ? pWhite : (1 - pWhite);
  }

  // --- Original Heuristic Fallback ---
  if (st.blackOff === 15) return player === 'black' ? 100000 : -100000;
  if (st.whiteOff === 15) return player === 'white' ? 100000 : -100000;

  let blackAdvantage = 0;
  blackAdvantage += st.blackOff * 200 - st.whiteOff * 200;
  blackAdvantage -= st.blackBar * 200 - st.whiteBar * 200;

  let consecutiveBlackPoints = 0;
  for (let i = 0; i < 24; i++) {
    let pt = st.points[i];
    if (pt.owner === 'black' && pt.count >= 2) {
      consecutiveBlackPoints++;
      if (consecutiveBlackPoints >= 2) blackAdvantage += consecutiveBlackPoints * 15; 
    } else {
      consecutiveBlackPoints = 0;
    }

    if (!pt.owner || pt.count === 0) continue;
    if (pt.owner === 'black') {
      if (pt.count === 1) {
        let penalty = i >= 18 ? 60 : 40;
        if (st.whiteBar > 0) penalty = 150;
        blackAdvantage -= penalty;
      }
      else if (pt.count >= 2) {
        blackAdvantage += (i >= 18 ? 90 : 45); 
        if (pt.count > 4) blackAdvantage -= (pt.count - 4) * 20;
      }
    } else {
      if (pt.count === 1) blackAdvantage += 30;
    }
  }
  return player === 'black' ? blackAdvantage : -blackAdvantage;
}
