// Default User Profile Factory
function createDefaultUserProfile(userId, name, email = '') {
  let isGuest = !userId || userId === 'guest' || userId.startsWith('guest_');
  return {
    id: userId || 'guest',
    name: name || ('Misafir_' + Math.floor(1000 + Math.random() * 9000)),
    email: email,
    avatar: isGuest ? '◈' : '◆',
    chips: 1000,
    coins: 1000,
    level: 1,
    xp: 0,
    currentXP: 0,
    totalXP: 0,
    wins: 0,
    losses: 0,
    isGuest: isGuest,
    unlockedThemes: ['walnut'],
    unlockedDice: ['ivory'],
    settings: {
      aiDifficulty: 'master',
      soundEnabled: true,
      boardTheme: 'walnut',
      diceTheme: 'ivory'
    },
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    stats: {
      matchesPlayed: 0,
      matchesWon: 0,
      totalMoves: 0,
      totalHits: 0,
      totalDoubles: 0,
      totalMarsa: 0,
      highestCombo: 0,
      currentStreak: 0,
      highestStreak: 0,
      diceHistory: {1:0, 2:0, 3:0, 4:0, 5:0, 6:0}
    },
    unlockedAchievements: []
  };
}

// Active session profile state
let userProfile = createDefaultUserProfile('guest');

// Persistence Storage Engine (Per-User Keyed Storage)
function getActiveUserId() {
  let activeId = localStorage.getItem('tavla_active_user_id');
  if (!activeId) {
    let legacy = localStorage.getItem('tavla_user_profile');
    if (legacy) {
      try {
        let parsed = JSON.parse(legacy);
        if (parsed && parsed.id) return parsed.id;
      } catch(e){}
    }
    activeId = 'guest';
    localStorage.setItem('tavla_active_user_id', activeId);
  }
  return activeId;
}

function saveUserProfile(profileObj) {
  if (!profileObj || !profileObj.id) return;
  profileObj.lastLoginAt = new Date().toISOString();
  
  // Persist to user's unique database key
  localStorage.setItem('tavla_user_data_' + profileObj.id, JSON.stringify(profileObj));
  localStorage.setItem('tavla_active_user_id', profileObj.id);
  
  // Sync global userProfile reference
  if (userProfile && userProfile.id === profileObj.id) {
    Object.assign(userProfile, profileObj);
  }
}

function loadUserProfile(userId) {
  if (!userId) userId = getActiveUserId();
  let raw = localStorage.getItem('tavla_user_data_' + userId);
  
  if (raw) {
    try {
      let parsed = JSON.parse(raw);
      if (parsed && parsed.id) {
        if (!parsed.stats) parsed.stats = {};
        parsed.stats.matchesPlayed = parsed.stats.matchesPlayed || 0;
        parsed.stats.matchesWon = Math.max(parsed.stats.matchesWon || 0, parsed.wins || 0);
        parsed.wins = parsed.stats.matchesWon; // Sync back
        parsed.stats.totalMoves = parsed.stats.totalMoves || 0;
        parsed.stats.totalHits = parsed.stats.totalHits || 0;
        parsed.stats.totalDoubles = parsed.stats.totalDoubles || 0;
        parsed.stats.totalMarsa = parsed.stats.totalMarsa || 0;
        parsed.stats.highestCombo = parsed.stats.highestCombo || 0;
        parsed.stats.currentStreak = parsed.stats.currentStreak || 0;
        parsed.stats.highestStreak = Math.max(parsed.stats.highestStreak || 0, parsed.stats.currentStreak);
        parsed.stats.diceHistory = parsed.stats.diceHistory || {1:0, 2:0, 3:0, 4:0, 5:0, 6:0};
        
        parsed.stats.matchesPlayed = Math.max(parsed.stats.matchesPlayed, (parsed.wins || 0) + (parsed.losses || 0));
        
        if (!parsed.unlockedAchievements || !Array.isArray(parsed.unlockedAchievements)) {
          parsed.unlockedAchievements = [];
        }
        return parsed;
      }
    } catch(e){}
  }
  
  // Migration fallback: if loading guest and legacy tavla_user_profile exists
  if (userId === 'guest') {
    let legacy = localStorage.getItem('tavla_user_profile');
    if (legacy) {
      try {
        let legacyData = JSON.parse(legacy);
        if (legacyData) {
          legacyData.id = legacyData.id || 'guest';
          
          if (!legacyData.stats) legacyData.stats = {};
          legacyData.stats.matchesPlayed = legacyData.stats.matchesPlayed || 0;
          legacyData.stats.matchesWon = Math.max(legacyData.stats.matchesWon || 0, legacyData.wins || 0);
          legacyData.wins = legacyData.stats.matchesWon;
          legacyData.stats.totalMoves = legacyData.stats.totalMoves || 0;
          legacyData.stats.totalHits = legacyData.stats.totalHits || 0;
          legacyData.stats.totalDoubles = legacyData.stats.totalDoubles || 0;
          legacyData.stats.totalMarsa = legacyData.stats.totalMarsa || 0;
          legacyData.stats.highestCombo = legacyData.stats.highestCombo || 0;
          legacyData.stats.currentStreak = legacyData.stats.currentStreak || 0;
          legacyData.stats.highestStreak = Math.max(legacyData.stats.highestStreak || 0, legacyData.stats.currentStreak);
          legacyData.stats.diceHistory = legacyData.stats.diceHistory || {1:0, 2:0, 3:0, 4:0, 5:0, 6:0};
          
          legacyData.stats.matchesPlayed = Math.max(legacyData.stats.matchesPlayed, (legacyData.wins || 0) + (legacyData.losses || 0));

          if (!legacyData.unlockedAchievements || !Array.isArray(legacyData.unlockedAchievements)) {
            legacyData.unlockedAchievements = [];
          }

          localStorage.setItem('tavla_user_data_' + legacyData.id, JSON.stringify(legacyData));
          return legacyData;
        }
      } catch(e){}
    }
  }
  
  // Return new default profile for this userId
  let defaultProf = createDefaultUserProfile(userId);
  localStorage.setItem('tavla_user_data_' + userId, JSON.stringify(defaultProf));
  return defaultProf;
}

function loginUserAccount(userId, name, email = '') {
  // 1. Save currently active profile first so no progress is lost
  if (userProfile && userProfile.id) {
    saveUserProfile(userProfile);
  }
  
  // 2. Load persistent data for target userId (DO NOT OVERWRITE XP/Coins/Level/Wins if account exists!)
  let loadedProfile = loadUserProfile(userId);
  
  if (name) loadedProfile.name = name;
  if (email) loadedProfile.email = email;
  loadedProfile.isGuest = false;
  if (!loadedProfile.avatar || loadedProfile.avatar === '◈') {
    loadedProfile.avatar = '◆';
  }
  
  // 3. Set global userProfile reference and persist
  userProfile = loadedProfile;
  saveUserProfile(userProfile);
  
  // 4. Update UI & Settings
  updateWebProfileUI();
  applyProfileSettingsToGame(userProfile);
  
  return userProfile;
}

function applyProfileSettingsToGame(prof) {
  if (!prof || !prof.settings) return;

  if (typeof UnlockService !== 'undefined') {
    UnlockService.initUserProfileOwnership(prof);
  }

  let bTheme = prof.settings.boardTheme || 'walnut';
  if (typeof UnlockService !== 'undefined' && !UnlockService.isBoardUnlocked(bTheme)) {
    bTheme = 'walnut';
    prof.settings.boardTheme = 'walnut';
  }

  let dTheme = prof.settings.diceTheme || 'ivory';
  if (typeof UnlockService !== 'undefined' && !UnlockService.isDiceUnlocked(dTheme)) {
    dTheme = 'ivory';
    prof.settings.diceTheme = 'ivory';
  }

  if (typeof changeBoardTheme === 'function') {
    changeBoardTheme(bTheme);
  }
  if (typeof changeDiceTheme === 'function') {
    changeDiceTheme(dTheme);
  }

  let boardSelect = document.getElementById('board-theme-select');
  if (boardSelect) boardSelect.value = bTheme;

  let diceSelect = document.getElementById('dice-theme-select');
  if (diceSelect) diceSelect.value = dTheme;

  if (typeof UnlockService !== 'undefined') {
    UnlockService.updateCustomizationUI();
  }
}

const CoinService = {
  CONFIG: {
    INITIAL_COINS: 1000,
    WIN_REWARD: 100,
    LOSS_REWARD: 0
  },

  getCoins() {
    if (typeof userProfile === 'undefined' || !userProfile) return 0;
    if (userProfile.coins === undefined) {
      userProfile.coins = (userProfile.chips !== undefined) ? userProfile.chips : this.CONFIG.INITIAL_COINS;
    }
    userProfile.chips = userProfile.coins;
    return userProfile.coins;
  },

  canAfford(amount) {
    if (amount <= 0) return true;
    return this.getCoins() >= amount;
  },

  addCoins(amount, reason = 'REWARD') {
    if (amount <= 0 || isNaN(amount)) return { success: false, newBalance: this.getCoins(), gained: 0, reason: 'INVALID_AMOUNT' };
    let current = this.getCoins();
    let gained = Math.floor(amount);
    let newBalance = current + gained;
    userProfile.coins = newBalance;
    userProfile.chips = newBalance;

    if (typeof saveUserProfile === 'function') saveUserProfile(userProfile);
    if (typeof updateWebProfileUI === 'function') updateWebProfileUI();

    return { success: true, gained, newBalance, reason };
  },

  spendCoins(amount, reason = 'PURCHASE') {
    if (amount <= 0 || isNaN(amount)) return { success: false, newBalance: this.getCoins(), reason: 'INVALID_AMOUNT' };
    if (!this.canAfford(amount)) {
      return { success: false, newBalance: this.getCoins(), reason: 'INSUFFICIENT_FUNDS' };
    }
    let current = this.getCoins();
    let spent = Math.floor(amount);
    let newBalance = Math.max(0, current - spent);
    userProfile.coins = newBalance;
    userProfile.chips = newBalance;

    if (typeof saveUserProfile === 'function') saveUserProfile(userProfile);
    if (typeof updateWebProfileUI === 'function') updateWebProfileUI();

    return { success: true, spent, newBalance, reason };
  },

  grantMatchReward(isWin) {
    if (!isWin) return { granted: false, amount: 0, newBalance: this.getCoins() };
    let rewardAmount = this.CONFIG.WIN_REWARD;
    let res = this.addCoins(rewardAmount, 'MATCH_WIN');
    return { granted: true, amount: rewardAmount, newBalance: res.newBalance };
  }
};

const XPService = {
  CONFIG: {
    WIN_REWARD: 100,
    LOSS_REWARD: 25
  },

  getXP() {
    if (typeof userProfile === 'undefined' || !userProfile) return 0;
    if (userProfile.xp === undefined) {
      userProfile.xp = (userProfile.currentXP !== undefined) ? userProfile.currentXP : 0;
    }
    userProfile.currentXP = userProfile.xp;
    return userProfile.xp;
  },

  getLevel() {
    if (typeof userProfile === 'undefined' || !userProfile) return 1;
    if (!userProfile.level || userProfile.level < 1) {
      userProfile.level = 1;
    }
    return userProfile.level;
  },

  getXPRequiredForNextLevel(level) {
    let lvl = (level && level >= 1) ? Math.floor(level) : 1;
    return lvl * lvl * 100;
  },

  getProgress() {
    let level = this.getLevel();
    let xp = this.getXP();
    let requiredXP = this.getXPRequiredForNextLevel(level);
    let percentage = Math.min(100, Math.max(0, (xp / requiredXP) * 100));
    return { currentXP: xp, requiredXP, percentage, level };
  },

  addXP(amount, reason = 'REWARD') {
    if (amount <= 0 || isNaN(amount)) {
      return { leveledUp: false, levelsGained: 0, newLevel: this.getLevel(), gained: 0 };
    }

    let gained = Math.floor(amount);
    userProfile.totalXP = (userProfile.totalXP || 0) + gained;

    let currentXP = this.getXP() + gained;
    let oldLevel = this.getLevel();
    let currentLevel = oldLevel;

    let leveledUp = false;
    let levelsGained = 0;
    let req = this.getXPRequiredForNextLevel(currentLevel);

    while (currentXP >= req) {
      currentXP -= req;
      currentLevel++;
      leveledUp = true;
      levelsGained++;
      req = this.getXPRequiredForNextLevel(currentLevel);
    }

    userProfile.xp = currentXP;
    userProfile.currentXP = currentXP;
    userProfile.level = currentLevel;

    if (typeof saveUserProfile === 'function') saveUserProfile(userProfile);
    if (typeof updateWebProfileUI === 'function') updateWebProfileUI();

    if (leveledUp) {
      if (typeof RewardService !== 'undefined') {
        RewardService.processLevelRewards(oldLevel, currentLevel);
      } else {
        if (typeof showToast === 'function') {
          showToast(`🌟 SEVİYE ATLADINIZ!\nYENİ SEVİYE: LEVEL ${currentLevel}`, 3500);
        }
      }
      if (typeof SoundFX !== 'undefined' && SoundFX.playGameWin) {
        SoundFX.playGameWin();
      }
    }

    return { leveledUp, levelsGained, newLevel: currentLevel, gained, currentXP, requiredXP: req, reason };
  },

  grantMatchReward(isWin) {
    let rewardAmount = isWin ? this.CONFIG.WIN_REWARD : this.CONFIG.LOSS_REWARD;
    let res = this.addXP(rewardAmount, isWin ? 'MATCH_WIN' : 'MATCH_LOSS');
    return { granted: true, amount: rewardAmount, isWin, ...res };
  }
};

const ProgressionService = {
  CONFIG: {
    WIN_XP: 100,
    LOSS_XP: 25
  },
  
  getXPRequiredForNextLevel(currentLevel) {
    return XPService.getXPRequiredForNextLevel(currentLevel);
  },

  addXP(amount, reason) {
    return XPService.addXP(amount, reason);
  },
  
  grantMatchXP(isWin) {
    return XPService.grantMatchReward(isWin);
  }
};

const ComboService = {
  CONFIG: {
    THRESHOLDS: {
      3: 10,
      5: 25,
      7: 35,
      10: 50
    },
    REPEAT_AFTER_10: 10
  },
  
  processComboIncrease(player, currentCombo) {
    if (player !== 'white') return;
    
    let reward = 0;
    if (this.CONFIG.THRESHOLDS[currentCombo]) {
      reward = this.CONFIG.THRESHOLDS[currentCombo];
    } else if (currentCombo > 10) {
      reward = this.CONFIG.REPEAT_AFTER_10;
    }
    
    if (reward > 0) {
      ProgressionService.addXP(reward);
      if (typeof state !== 'undefined') {
        state.matchComboXP += reward;
      }
      
      if (typeof showComboFeedback === 'function') {
        showComboFeedback(currentCombo, reward);
      }
    }
  }
};

function showRevealUI() {
  let fb = document.getElementById('reveal-feedback');
  if (fb) {
     fb.classList.remove('hide');
     fb.classList.add('show');
  }
}

function hideRevealUI() {
  let fb = document.getElementById('reveal-feedback');
  if (fb) {
     fb.classList.remove('show');
     fb.classList.add('hide');
  }
}

let comboTimeout = null;
function showComboFeedback(comboValue, xpReward) {
  let feedback = document.getElementById('combo-feedback');
  if (!feedback) {
    feedback = document.createElement('div');
    feedback.id = 'combo-feedback';
    feedback.className = 'combo-feedback';
    feedback.innerHTML = `<div class="combo-title" id="combo-title"></div><div class="combo-xp" id="combo-xp"></div>`;
    let uiLayer = document.querySelector('.game-ui-layer');
    if (uiLayer) uiLayer.appendChild(feedback);
    else document.body.appendChild(feedback);
  }

  if (comboTimeout) clearTimeout(comboTimeout);

  let title = document.getElementById('combo-title');
  let xp = document.getElementById('combo-xp');

  if (title) title.innerText = `COMBO ×${comboValue}`;
  if (xp) xp.innerText = `+${xpReward} XP`;

  feedback.className = 'combo-feedback';
  if (comboValue >= 10) feedback.classList.add('combo-x10');
  else if (comboValue >= 7) feedback.classList.add('combo-x7');
  else if (comboValue >= 5) feedback.classList.add('combo-x5');
  else feedback.classList.add('combo-x3');

  void feedback.offsetWidth;
  feedback.classList.add('show');

  comboTimeout = setTimeout(() => {
    feedback.classList.remove('show');
    feedback.classList.add('hide');
  }, 1400);
}



function loadWebProfile() {
  let activeId = getActiveUserId();
  userProfile = loadUserProfile(activeId);
  
  if (typeof AchievementService !== 'undefined') {
    AchievementService.checkAll();
  }
  
  updateWebProfileUI();
  applyProfileSettingsToGame(userProfile);
}

function saveWebProfile() {
  let nameInput = document.getElementById('profile-name-input').value.trim();
  if (nameInput) userProfile.name = nameInput;
  saveUserProfile(userProfile);
  updateWebProfileUI();
  closeModal('profile-modal');
}

function setWebAvatar(emoji) {
  userProfile.avatar = emoji;
  document.getElementById('profile-avatar-display').innerText = emoji;
  saveUserProfile(userProfile);
}

function updateWebProfileUI() {
  function setTxt(id, txt) {
    let el = document.getElementById(id);
    if (el) el.innerText = txt;
  }
  function setVal(id, val) {
    let el = document.getElementById(id);
    if (el) el.value = val;
  }

  setTxt('user-avatar', userProfile.avatar);
  setTxt('user-name', userProfile.name);

  let currentCoins = typeof CoinService !== 'undefined' ? CoinService.getCoins() : (userProfile.coins || userProfile.chips || 0);
  let formattedCoins = Number(currentCoins).toLocaleString();
  setTxt('user-chips', formattedCoins);
  setTxt('modal-chips', formattedCoins);

  let prog = typeof XPService !== 'undefined'
    ? XPService.getProgress()
    : { currentXP: userProfile.xp || userProfile.currentXP || 0, requiredXP: 100, percentage: 0, level: userProfile.level || 1 };

  setTxt('user-level', 'SEVİYE ' + prog.level);
  let xpBar = document.getElementById('user-xp-bar');
  let xpText = document.getElementById('user-xp-text');
  if (xpBar) xpBar.style.width = prog.percentage.toFixed(1) + '%';
  if (xpText) xpText.innerText = `${prog.currentXP.toLocaleString()} / ${prog.requiredXP.toLocaleString()} XP`;

  // Profil Kartı güncelleme
  setTxt('modal-level-text', 'SEVİYE ' + prog.level);
  let cardXpBar = document.getElementById('modal-xp-bar');
  let cardXpText = document.getElementById('modal-xp-text');
  if (cardXpBar) cardXpBar.style.width = prog.percentage.toFixed(1) + '%';
  if (cardXpText) cardXpText.innerText = `${prog.currentXP.toLocaleString()} / ${prog.requiredXP.toLocaleString()} XP`;

  let rankStr = "ÇIRAK";
  if (prog.level >= 5) rankStr = "OYUNCU";
  if (prog.level >= 10) rankStr = "USTA";
  if (prog.level >= 15) rankStr = "BÜYÜK USTA";
  if (prog.level >= 20) rankStr = "TAVLA EFSANESİ";
  setTxt('profile-rank-badge', rankStr);

  setTxt('profile-avatar-display', userProfile.avatar);
  setVal('profile-name-input', userProfile.name);
  setTxt('modal-wins', userProfile.wins);

  let total = (userProfile.stats && userProfile.stats.matchesPlayed > 0) ? userProfile.stats.matchesPlayed : (userProfile.wins + userProfile.losses);
  let wr = total > 0 ? ((userProfile.wins / total) * 100).toFixed(1) : '0.0';
  setTxt('modal-winrate', '%' + wr);

  if (userProfile.stats) {
    setTxt('stat-played', userProfile.stats.matchesPlayed);
    setTxt('stat-won', userProfile.stats.matchesWon);
    setTxt('stat-hits', userProfile.stats.totalHits);
    setTxt('stat-doubles', userProfile.stats.totalDoubles);
    setTxt('stat-marsa', userProfile.stats.totalMarsa);
    setTxt('stat-combo', userProfile.stats.highestCombo);
    setTxt('stat-moves', userProfile.stats.totalMoves);
    
    setTxt('stat-highest-streak', userProfile.stats.highestStreak || 0);
    setTxt('modal-streak-count', userProfile.stats.currentStreak || 0);
    
    let dHistory = userProfile.stats.diceHistory || {1:0, 2:0, 3:0, 4:0, 5:0, 6:0};
    let totalDice = 0;
    for (let i = 1; i <= 6; i++) totalDice += (dHistory[i] || 0);
    if (totalDice === 0) totalDice = 1;
    for (let i = 1; i <= 6; i++) {
      let count = dHistory[i] || 0;
      let pct = Math.round((count / totalDice) * 100);
      let fillEl = document.getElementById(`dice-stat-all-${i}-fill`);
      let textEl = document.getElementById(`dice-stat-all-${i}-text`);
      if (fillEl) fillEl.style.width = pct + '%';
      if (textEl) textEl.innerText = count.toLocaleString();
    }
  }

  let loginBtn = document.getElementById('main-login-btn');
  if (loginBtn) {
    loginBtn.style.display = userProfile.isGuest ? 'flex' : 'none';
  }
  
  let logoutBtn = document.getElementById('settings-logout-btn');
  if (logoutBtn) {
    logoutBtn.style.display = userProfile.isGuest ? 'none' : 'flex';
  }

  if (typeof UnlockService !== 'undefined') {
    UnlockService.initUserProfileOwnership(userProfile);
    UnlockService.updateCustomizationUI();
  }
  if (typeof MissionService !== 'undefined') {
    MissionService.initUserProfileMissions(userProfile);
  }
  
  let achContainer = document.getElementById('profile-achievements-container');
  if (achContainer && typeof AchievementService !== 'undefined') {
    let unlockedList = userProfile.unlockedAchievements || [];
    let html = `<label style="display:block; margin-bottom:6px; font-weight:600; font-size: 11px; letter-spacing: 1px; color:#E5DAC8;">BAŞARIMLAR:</label>`;
    html += `<div style="display:flex; flex-direction:column; gap:8px;">`;
    
    AchievementService.ACHIEVEMENTS.forEach(ach => {
      let isUnlocked = unlockedList.includes(ach.id);
      let statVal = userProfile.stats ? (userProfile.stats[ach.statKey] || 0) : 0;
      let progress = Math.min(statVal, ach.target);
      let pct = Math.floor((progress / ach.target) * 100);
      
      let bg = isUnlocked ? 'rgba(28,16,11,0.9)' : 'rgba(28,16,11,0.5)';
      let border = isUnlocked ? '1px solid #D4AF37' : '1px solid rgba(184,153,89,0.2)';
      let titleColor = isUnlocked ? '#E5DAC8' : 'rgba(229,218,200,0.5)';
      
      html += `
        <div style="background:${bg}; border:${border}; border-radius:6px; padding:10px; display:flex; gap:12px; align-items:center;">
          <div style="font-size:24px; opacity:${isUnlocked ? '1' : '0.4'};">${ach.icon}</div>
          <div style="flex:1;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
              <div style="font-size:12px; font-weight:600; color:${titleColor};">${ach.title} ${isUnlocked ? '✓' : ''}</div>
              ${isUnlocked ? '<div style="font-size:10px; color:#9CCB86; font-weight:bold;">TAMAMLANDI</div>' : `<div style="font-size:10px; color:#B89959; font-weight:bold;">🎁 +${ach.xp} XP | +${ach.coins} 🪙</div>`}
            </div>
            <div style="font-size:10px; color:rgba(229,218,200,0.6); margin-bottom:4px;">${ach.description}</div>
            
            ${!isUnlocked ? `
              <div style="background:rgba(0,0,0,0.5); height:6px; border-radius:3px; overflow:hidden; position:relative;">
                <div style="background:linear-gradient(90deg, #B89959, #D4AF37); height:100%; width:${pct}%;"></div>
              </div>
              <div style="font-size:9px; color:rgba(229,218,200,0.5); text-align:right; margin-top:3px;">${progress} / ${ach.target}</div>
            ` : ''}
          </div>
        </div>
      `;
    });
    
    html += `</div>`;
    achContainer.innerHTML = html;
  }
}

const UnlockService = {
  DEFAULT_BOARDS: ['walnut'],
  DEFAULT_DICE: ['ivory'],

  initUserProfileOwnership(profile) {
    if (!profile) return;

    // Migration sanitization for legacy profiles that saved all themes as unlocked
    if (!profile._ownershipVersion || profile._ownershipVersion < 2) {
      let validBoards = Array.isArray(profile.unlockedBoards) ? profile.unlockedBoards : (Array.isArray(profile.unlockedThemes) ? profile.unlockedThemes : []);
      let validDice = Array.isArray(profile.unlockedDice) ? profile.unlockedDice : [];

      let allowedBoards = [...this.DEFAULT_BOARDS];
      let allowedDice = [...this.DEFAULT_DICE];

      if (Array.isArray(profile.claimedLevelRewards)) {
        if (profile.claimedLevelRewards.includes(7)) allowedBoards.push('tropical');
        if (profile.claimedLevelRewards.includes(25)) allowedBoards.push('marble');
        if (profile.claimedLevelRewards.includes(40)) allowedBoards.push('midnight');
        if (profile.claimedLevelRewards.includes(3)) allowedDice.push('red');
        if (profile.claimedLevelRewards.includes(15)) allowedDice.push('gold');
      }

      // If legacy profile has all 7 boards unlocked without purchasing, sanitize back to allowed
      let isFullLegacyList = validBoards.length >= 6 || (validBoards.includes('fenerbahce') && (!profile.claimedLevelRewards || !profile.claimedLevelRewards.includes(99)));
      if (isFullLegacyList) {
        profile.unlockedBoards = allowedBoards;
        profile.unlockedDice = allowedDice;
      } else {
        profile.unlockedBoards = validBoards.length ? validBoards : allowedBoards;
        profile.unlockedDice = validDice.length ? validDice : allowedDice;
      }

      profile.unlockedThemes = profile.unlockedBoards;
      profile._ownershipVersion = 2;
      if (typeof saveUserProfile === 'function') saveUserProfile(profile);
    }

    if (!Array.isArray(profile.unlockedBoards)) {
      profile.unlockedBoards = [...this.DEFAULT_BOARDS];
    }
    profile.unlockedThemes = profile.unlockedBoards;

    if (!Array.isArray(profile.unlockedDice)) {
      profile.unlockedDice = [...this.DEFAULT_DICE];
    }

    this.DEFAULT_BOARDS.forEach(b => {
      if (!profile.unlockedBoards.includes(b)) profile.unlockedBoards.push(b);
    });
    this.DEFAULT_DICE.forEach(d => {
      if (!profile.unlockedDice.includes(d)) profile.unlockedDice.push(d);
    });
  },

  isBoardUnlocked(boardId) {
    if (typeof userProfile === 'undefined' || !userProfile) return boardId === 'walnut';
    this.initUserProfileOwnership(userProfile);
    return userProfile.unlockedBoards.includes(boardId);
  },

  isDiceUnlocked(diceId) {
    if (typeof userProfile === 'undefined' || !userProfile) return diceId === 'ivory';
    this.initUserProfileOwnership(userProfile);
    return userProfile.unlockedDice.includes(diceId);
  },

  unlockBoard(boardId) {
    if (typeof userProfile === 'undefined' || !userProfile) return false;
    this.initUserProfileOwnership(userProfile);
    if (!userProfile.unlockedBoards.includes(boardId)) {
      userProfile.unlockedBoards.push(boardId);
      userProfile.unlockedThemes = userProfile.unlockedBoards;
      if (typeof saveUserProfile === 'function') saveUserProfile(userProfile);
      this.updateCustomizationUI();
      return true;
    }
    return false;
  },

  unlockDice(diceId) {
    if (typeof userProfile === 'undefined' || !userProfile) return false;
    this.initUserProfileOwnership(userProfile);
    if (!userProfile.unlockedDice.includes(diceId)) {
      userProfile.unlockedDice.push(diceId);
      if (typeof saveUserProfile === 'function') saveUserProfile(userProfile);
      this.updateCustomizationUI();
      return true;
    }
    return false;
  },

  getUnlockedBoards() {
    if (typeof userProfile === 'undefined' || !userProfile) return [...this.DEFAULT_BOARDS];
    this.initUserProfileOwnership(userProfile);
    return [...userProfile.unlockedBoards];
  },

  getUnlockedDice() {
    if (typeof userProfile === 'undefined' || !userProfile) return [...this.DEFAULT_DICE];
    this.initUserProfileOwnership(userProfile);
    return [...userProfile.unlockedDice];
  },

  updateCustomizationUI() {
    if (typeof document === 'undefined') return;
    let boardSelect = document.getElementById('board-theme-select');
    if (boardSelect && boardSelect.options) {
      Array.from(boardSelect.options).forEach(opt => {
        let val = opt.value;
        let unlocked = this.isBoardUnlocked(val);
        let baseText = opt.getAttribute ? opt.getAttribute('data-base-text') : null;
        if (!baseText && opt.text) {
          baseText = opt.text.replace(/\s*\(🔒 KİLİTLİ\)/, '').replace(/🔒\s*/, '').trim();
          if (opt.setAttribute) opt.setAttribute('data-base-text', baseText);
        }
        if (baseText) {
          opt.text = unlocked ? baseText : `🔒 ${baseText} (KİLİTLİ)`;
          opt.disabled = !unlocked;
        }
      });
    }

    let diceSelect = document.getElementById('dice-theme-select');
    if (diceSelect && diceSelect.options) {
      Array.from(diceSelect.options).forEach(opt => {
        let val = opt.value;
        let unlocked = this.isDiceUnlocked(val);
        let baseText = opt.getAttribute ? opt.getAttribute('data-base-text') : null;
        if (!baseText && opt.text) {
          baseText = opt.text.replace(/\s*\(🔒 KİLİTLİ\)/, '').replace(/🔒\s*/, '').trim();
          if (opt.setAttribute) opt.setAttribute('data-base-text', baseText);
        }
        if (baseText) {
          opt.text = unlocked ? baseText : `🔒 ${baseText} (KİLİTLİ)`;
          opt.disabled = !unlocked;
        }
      });
    }
  }
};

const ShopService = {
  CATALOG: {
    boards: {
      walnut: { id: 'walnut', name: 'Klasik Ceviz Ahşap', price: 0 },
      tropical: { id: 'tropical', name: 'Tropikal', price: 2000 },
      green: { id: 'green', name: 'Kına & Sedef (Yeşil Çuha)', price: 2500 },
      ottoman: { id: 'ottoman', name: 'Geleneksel Motifli Ahşap', price: 4000 },
      marble: { id: 'marble', name: 'Kraliyet Mermeri', price: 6000 },
      midnight: { id: 'midnight', name: 'Gece Safiri', price: 8000 },
      fenerbahce: { id: 'fenerbahce', name: 'Sarı-Lacivert (Fenerbahçe)', price: 15000 }
    },
    dice: {
      ivory: { id: 'ivory', name: 'Klasik Fildişi', price: 0 },
      red: { id: 'red', name: 'Koyu Kırmızı', price: 1000 },
      green: { id: 'green', name: 'Yeşil', price: 1500 },
      fbYellow: { id: 'fbYellow', name: 'Sarı-Lacivert', price: 3000 },
      black: { id: 'black', name: 'Siyah', price: 3500 },
      gold: { id: 'gold', name: 'Mat Altın', price: 5000 }
    }
  },

  isPurchasing: false,

  getBoardProduct(boardId) {
    return this.CATALOG.boards[boardId] || null;
  },

  getDiceProduct(diceId) {
    return this.CATALOG.dice[diceId] || null;
  },

  canPurchaseBoard(boardId) {
    let prod = this.getBoardProduct(boardId);
    if (!prod) return false;
    if (typeof UnlockService !== 'undefined' && UnlockService.isBoardUnlocked(boardId)) return false;
    let currentCoins = typeof CoinService !== 'undefined' ? CoinService.getCoins() : 0;
    return currentCoins >= prod.price;
  },

  canPurchaseDice(diceId) {
    let prod = this.getDiceProduct(diceId);
    if (!prod) return false;
    if (typeof UnlockService !== 'undefined' && UnlockService.isDiceUnlocked(diceId)) return false;
    let currentCoins = typeof CoinService !== 'undefined' ? CoinService.getCoins() : 0;
    return currentCoins >= prod.price;
  },

  purchaseBoard(boardId) {
    if (this.isPurchasing) return { success: false, reason: 'BUSY' };
    this.isPurchasing = true;

    try {
      let prod = this.getBoardProduct(boardId);
      if (!prod) {
        this.isPurchasing = false;
        if (typeof showToast === 'function') showToast('✕ Geçersiz ürün!', 2000);
        return { success: false, reason: 'INVALID_PRODUCT' };
      }

      if (typeof UnlockService !== 'undefined' && UnlockService.isBoardUnlocked(boardId)) {
        this.isPurchasing = false;
        if (typeof showToast === 'function') showToast('✓ Bu ürüne zaten sahipsin.', 2000);
        return { success: false, reason: 'ALREADY_OWNED' };
      }

      if (typeof CoinService !== 'undefined' && !CoinService.canAfford(prod.price)) {
        this.isPurchasing = false;
        let diff = prod.price - CoinService.getCoins();
        if (typeof showToast === 'function') {
          showToast(`✕ YETERSİZ COIN\nBu eşya için ${prod.price.toLocaleString()} Coin gerekiyor.\nEksik: ${diff.toLocaleString()} Coin.\n\nGörevleri tamamlayarak Coin kazanabilirsin.`, 4500);
        }
        return { success: false, reason: 'INSUFFICIENT_FUNDS' };
      }

      // Atomic Transaction: Spend Coins
      let spendRes = typeof CoinService !== 'undefined'
        ? CoinService.spendCoins(prod.price, 'PURCHASE_BOARD_' + boardId)
        : { success: true };

      if (!spendRes.success) {
        this.isPurchasing = false;
        if (typeof showToast === 'function') showToast('✕ Yeterli Coin yok!', 2000);
        return { success: false, reason: 'PAYMENT_FAILED' };
      }

      // Unlock Item
      let unlocked = typeof UnlockService !== 'undefined'
        ? UnlockService.unlockBoard(boardId)
        : true;

      if (!unlocked) {
        // Rollback coins if unlock failed
        if (typeof CoinService !== 'undefined') CoinService.addCoins(prod.price, 'REFUND_BOARD_' + boardId);
        this.isPurchasing = false;
        if (typeof showToast === 'function') showToast('✕ Kilit açma başarısız oldu!', 2000);
        return { success: false, reason: 'UNLOCK_FAILED' };
      }

      // Equip newly purchased theme
      if (typeof changeBoardTheme === 'function') {
        changeBoardTheme(boardId);
      }

      this.updateShopUI();
      if (typeof updateWebProfileUI === 'function') updateWebProfileUI();
      if (typeof showToast === 'function') showToast(`✓ Satın alındı!\n${prod.name} artık senin.`, 3000);

      this.isPurchasing = false;
      return { success: true, product: prod, newBalance: CoinService.getCoins() };
    } catch (err) {
      this.isPurchasing = false;
      console.error('ShopService purchaseBoard error:', err);
      return { success: false, reason: 'ERROR' };
    }
  },

  purchaseDice(diceId) {
    if (this.isPurchasing) return { success: false, reason: 'BUSY' };
    this.isPurchasing = true;

    try {
      let prod = this.getDiceProduct(diceId);
      if (!prod) {
        this.isPurchasing = false;
        if (typeof showToast === 'function') showToast('✕ Geçersiz ürün!', 2000);
        return { success: false, reason: 'INVALID_PRODUCT' };
      }

      if (typeof UnlockService !== 'undefined' && UnlockService.isDiceUnlocked(diceId)) {
        this.isPurchasing = false;
        if (typeof showToast === 'function') showToast('✓ Bu ürüne zaten sahipsin.', 2000);
        return { success: false, reason: 'ALREADY_OWNED' };
      }

      if (typeof CoinService !== 'undefined' && !CoinService.canAfford(prod.price)) {
        this.isPurchasing = false;
        let diff = prod.price - CoinService.getCoins();
        if (typeof showToast === 'function') {
          showToast(`✕ YETERSİZ COIN\nBu eşya için ${prod.price.toLocaleString()} Coin gerekiyor.\nEksik: ${diff.toLocaleString()} Coin.\n\nGörevleri tamamlayarak Coin kazanabilirsin.`, 4500);
        }
        return { success: false, reason: 'INSUFFICIENT_FUNDS' };
      }

      // Atomic Transaction: Spend Coins
      let spendRes = typeof CoinService !== 'undefined'
        ? CoinService.spendCoins(prod.price, 'PURCHASE_DICE_' + diceId)
        : { success: true };

      if (!spendRes.success) {
        this.isPurchasing = false;
        if (typeof showToast === 'function') showToast('✕ Yeterli Coin yok!', 2000);
        return { success: false, reason: 'PAYMENT_FAILED' };
      }

      // Unlock Item
      let unlocked = typeof UnlockService !== 'undefined'
        ? UnlockService.unlockDice(diceId)
        : true;

      if (!unlocked) {
        // Rollback coins if unlock failed
        if (typeof CoinService !== 'undefined') CoinService.addCoins(prod.price, 'REFUND_DICE_' + diceId);
        this.isPurchasing = false;
        if (typeof showToast === 'function') showToast('✕ Kilit açma başarısız oldu!', 2000);
        return { success: false, reason: 'UNLOCK_FAILED' };
      }

      // Equip newly purchased theme
      if (typeof changeDiceTheme === 'function') {
        changeDiceTheme(diceId);
      }

      this.updateShopUI();
      if (typeof updateWebProfileUI === 'function') updateWebProfileUI();
      if (typeof showToast === 'function') showToast(`✓ Satın alındı!\n${prod.name} artık senin.`, 3000);

      this.isPurchasing = false;
      return { success: true, product: prod, newBalance: CoinService.getCoins() };
    } catch (err) {
      this.isPurchasing = false;
      console.error('ShopService purchaseDice error:', err);
      return { success: false, reason: 'ERROR' };
    }
  },

  updateShopUI() {
    if (typeof document === 'undefined') return;
    let shopCoins = document.getElementById('shop-coins-display');
    if (shopCoins && typeof CoinService !== 'undefined') {
      shopCoins.innerText = CoinService.getCoins().toLocaleString();
    }
    if (typeof UnlockService !== 'undefined') {
      UnlockService.updateCustomizationUI();
    }
    this.renderShopItems();
  },

  renderShopItems() {
    let container = document.getElementById('shop-items-container');
    let coinsDisplay = document.getElementById('shop-coins-display');
    if (!container) return;

    let userCoins = typeof CoinService !== 'undefined' ? CoinService.getCoins() : 0;
    if (coinsDisplay) coinsDisplay.innerText = userCoins.toLocaleString();

    let currentBoard = 'walnut';
    let currentDice = 'ivory';
    if (typeof userProfile !== 'undefined' && userProfile && userProfile.settings) {
      currentBoard = userProfile.settings.boardTheme || 'walnut';
      currentDice = userProfile.settings.diceTheme || 'ivory';
    }

    let html = '';

    // --- BOARDS ---
    html += `<div style="font-size:11px; font-weight:700; color:#A68045; letter-spacing:3px; margin-bottom:12px; border-bottom:1px dashed #3A2318; padding-bottom:6px;">TAHTA KOLEKSİYONU</div>`;
    html += `<div style="display:flex; flex-direction:column; gap:10px; margin-bottom:25px;">`;

    Object.values(this.CATALOG.boards).forEach(b => {
      let isUnlocked = typeof UnlockService !== 'undefined' ? UnlockService.isBoardUnlocked(b.id) : (b.id === 'walnut');
      let isEquipped = (currentBoard === b.id);
      let canAfford = userCoins >= b.price;

      html += `
        <div class="premium-card" style="background:#170B06; border:1px solid ${isEquipped ? 'rgba(212,175,55,0.4)' : '#3A2318'}; border-radius:6px; padding:12px 15px; display:flex; align-items:center; justify-content:space-between; box-shadow:${isEquipped ? 'inset 0 0 15px rgba(212,175,55,0.05)' : 'none'}; position:relative; overflow:hidden; gap: 10px;">
          
          <div style="display:flex; align-items:center; gap:12px; flex:1; min-width:0;">
            <div class="premium-card-icon" style="font-size:38px; flex-shrink:0; width:45px; text-align:center; filter: grayscale(${isUnlocked ? '0' : '100%'}); opacity:${isUnlocked ? '1' : '0.5'}; line-height:1;">🪵</div>
            
            <div style="display:flex; flex-direction:column; justify-content:center; min-width:0; overflow:hidden;">
              <div style="color:#E5DAC8; font-size:13px; font-weight:700; letter-spacing:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${b.name.toUpperCase()}">${b.name.toUpperCase()}</div>
              <div style="color:${isUnlocked ? '#A68045' : '#8A6D3B'}; font-size:10px; font-weight:600; letter-spacing:1px; margin-top:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                ${isUnlocked ? (isEquipped ? '✓ KUŞANILI' : '✓ SAHİPSİN') : 'KOLEKSİYON PARÇASI'}
              </div>
            </div>
          </div>

          <div style="display:flex; flex-direction:column; align-items:flex-end; justify-content:center; gap:6px; width:95px; flex-shrink:0;">
            <div style="color:#D4AF37; font-size:12px; font-weight:700; letter-spacing:1px; display:${isUnlocked ? 'none' : 'block'}; text-align:right; width:100%;">
              🪙 ${b.price.toLocaleString()}
            </div>
      `;

      if (isEquipped) {
        html += `<div style="padding:5px 12px; font-size:10px; background:rgba(212,175,55,0.05); color:#D4AF37; font-weight:bold; border:1px solid rgba(212,175,55,0.3); border-radius:4px; letter-spacing:1px; cursor:default; text-align:center; width:100%; box-sizing:border-box;">AKTİF</div>`;
      } else if (isUnlocked) {
        html += `<button style="padding:5px 12px; font-size:10px; background:transparent; color:#E5DAC8; font-weight:bold; border:1px solid #8A6D3B; border-radius:4px; letter-spacing:1px; cursor:pointer; transition:all 0.2s; width:100%; box-sizing:border-box;" onmouseover="this.style.background='#8A6D3B'; this.style.color='#170B06';" onmouseout="this.style.background='transparent'; this.style.color='#E5DAC8';" onclick="changeBoardTheme('${b.id}'); ShopService.updateShopUI();">KUŞAN</button>`;
      } else {
        if (canAfford) {
          html += `<button style="padding:5px 12px; font-size:10px; background:#8B6B23; color:#E5DAC8; font-weight:bold; border:1px solid #D4AF37; border-radius:4px; letter-spacing:1px; cursor:pointer; transition:all 0.2s; width:100%; box-sizing:border-box;" onmouseover="this.style.background='#A68045';" onmouseout="this.style.background='#8B6B23';" onclick="ShopService.purchaseBoard('${b.id}')">SATIN AL</button>`;
        } else {
          html += `<button style="padding:5px 12px; font-size:10px; background:transparent; color:#A68045; font-weight:bold; border:1px dashed #3A2318; border-radius:4px; letter-spacing:1px; cursor:pointer; transition:all 0.2s; width:100%; box-sizing:border-box;" onmouseover="this.style.borderColor='#8A6D3B'; this.style.color='#8A6D3B';" onmouseout="this.style.borderColor='#3A2318'; this.style.color='#A68045';" onclick="ShopService.purchaseBoard('${b.id}')">KİLİTLİ</button>`;
        }
      }
      html += `</div></div>`;
    });
    html += `</div>`;

    // --- DICE ---
    html += `<div style="font-size:11px; font-weight:700; color:#A68045; letter-spacing:3px; margin-bottom:12px; border-bottom:1px dashed #3A2318; padding-bottom:6px;">ZAR KOLEKSİYONU</div>`;
    html += `<div style="display:flex; flex-direction:column; gap:10px;">`;

    Object.values(this.CATALOG.dice).forEach(d => {
      let isUnlocked = typeof UnlockService !== 'undefined' ? UnlockService.isDiceUnlocked(d.id) : (d.id === 'ivory');
      let isEquipped = (currentDice === d.id);
      let canAfford = userCoins >= d.price;

      html += `
        <div class="premium-card" style="background:#170B06; border:1px solid ${isEquipped ? 'rgba(212,175,55,0.4)' : '#3A2318'}; border-radius:6px; padding:12px 15px; display:flex; align-items:center; justify-content:space-between; box-shadow:${isEquipped ? 'inset 0 0 15px rgba(212,175,55,0.05)' : 'none'}; position:relative; overflow:hidden; gap: 10px;">
          
          <div style="display:flex; align-items:center; gap:12px; flex:1; min-width:0;">
            <div class="premium-card-icon" style="font-size:38px; flex-shrink:0; width:45px; text-align:center; filter: grayscale(${isUnlocked ? '0' : '100%'}); opacity:${isUnlocked ? '1' : '0.5'}; line-height:1;">🎲</div>
            
            <div style="display:flex; flex-direction:column; justify-content:center; min-width:0; overflow:hidden;">
              <div style="color:#E5DAC8; font-size:13px; font-weight:700; letter-spacing:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${d.name.toUpperCase()}">${d.name.toUpperCase()}</div>
              <div style="color:${isUnlocked ? '#A68045' : '#8A6D3B'}; font-size:10px; font-weight:600; letter-spacing:1px; margin-top:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                ${isUnlocked ? (isEquipped ? '✓ KUŞANILI' : '✓ SAHİPSİN') : 'KOLEKSİYON PARÇASI'}
              </div>
            </div>
          </div>

          <div style="display:flex; flex-direction:column; align-items:flex-end; justify-content:center; gap:6px; width:95px; flex-shrink:0;">
            <div style="color:#D4AF37; font-size:12px; font-weight:700; letter-spacing:1px; display:${isUnlocked ? 'none' : 'block'}; text-align:right; width:100%;">
              🪙 ${d.price.toLocaleString()}
            </div>
      `;

      if (isEquipped) {
        html += `<div style="padding:5px 12px; font-size:10px; background:rgba(212,175,55,0.05); color:#D4AF37; font-weight:bold; border:1px solid rgba(212,175,55,0.3); border-radius:4px; letter-spacing:1px; cursor:default; text-align:center; width:100%; box-sizing:border-box;">AKTİF</div>`;
      } else if (isUnlocked) {
        html += `<button style="padding:5px 12px; font-size:10px; background:transparent; color:#E5DAC8; font-weight:bold; border:1px solid #8A6D3B; border-radius:4px; letter-spacing:1px; cursor:pointer; transition:all 0.2s; width:100%; box-sizing:border-box;" onmouseover="this.style.background='#8A6D3B'; this.style.color='#170B06';" onmouseout="this.style.background='transparent'; this.style.color='#E5DAC8';" onclick="changeDiceTheme('${d.id}'); ShopService.updateShopUI();">KUŞAN</button>`;
      } else {
        if (canAfford) {
          html += `<button style="padding:5px 12px; font-size:10px; background:#8B6B23; color:#E5DAC8; font-weight:bold; border:1px solid #D4AF37; border-radius:4px; letter-spacing:1px; cursor:pointer; transition:all 0.2s; width:100%; box-sizing:border-box;" onmouseover="this.style.background='#A68045';" onmouseout="this.style.background='#8B6B23';" onclick="ShopService.purchaseDice('${d.id}')">SATIN AL</button>`;
        } else {
          html += `<button style="padding:5px 12px; font-size:10px; background:transparent; color:#A68045; font-weight:bold; border:1px dashed #3A2318; border-radius:4px; letter-spacing:1px; cursor:pointer; transition:all 0.2s; width:100%; box-sizing:border-box;" onmouseover="this.style.borderColor='#8A6D3B'; this.style.color='#8A6D3B';" onmouseout="this.style.borderColor='#3A2318'; this.style.color='#A68045';" onclick="ShopService.purchaseDice('${d.id}')">KİLİTLİ</button>`;
        }
      }
      html += `</div></div>`;
    });
    html += `</div>`;

    container.innerHTML = html;
  }
};

const RewardService = {
  CATALOG: {
    2:  { type: 'coins', amount: 500 },
    3:  { type: 'dice', itemId: 'red', name: 'Koyu Kırmızı Zar' },
    5:  { type: 'coins', amount: 1000 },
    7:  { type: 'board', itemId: 'tropical', name: 'Tropikal Tahta' },
    10: { type: 'coins', amount: 2500 },
    15: { type: 'dice', itemId: 'gold', name: 'Mat Altın Zar' },
    20: { type: 'coins', amount: 5000 },
    25: { type: 'board', itemId: 'marble', name: 'Kraliyet Mermeri Tahta' },
    30: { type: 'coins', amount: 7500 },
    40: { type: 'board', itemId: 'midnight', name: 'Gece Safiri Tahta' }
  },

  initUserProfileRewards(profile) {
    if (!profile) return;
    if (!Array.isArray(profile.claimedLevelRewards)) {
      profile.claimedLevelRewards = [];
    }
  },

  getRewardForLevel(level) {
    return this.CATALOG[level] || null;
  },

  isRewardClaimed(level) {
    if (typeof userProfile === 'undefined' || !userProfile) return false;
    this.initUserProfileRewards(userProfile);
    return userProfile.claimedLevelRewards.includes(Number(level));
  },

  getClaimedRewards() {
    if (typeof userProfile === 'undefined' || !userProfile) return [];
    this.initUserProfileRewards(userProfile);
    return [...userProfile.claimedLevelRewards];
  },

  claimReward(level) {
    if (typeof userProfile === 'undefined' || !userProfile) return { success: false, reason: 'NO_PROFILE' };
    this.initUserProfileRewards(userProfile);

    let lvlNum = Number(level);
    if (this.isRewardClaimed(lvlNum)) {
      return { success: false, reason: 'ALREADY_CLAIMED' };
    }

    let reward = this.getRewardForLevel(lvlNum);
    if (!reward) {
      return { success: false, reason: 'NO_REWARD_FOR_LEVEL' };
    }

    let result = { success: true, level: lvlNum, reward };

    if (reward.type === 'coins') {
      let coinRes = typeof CoinService !== 'undefined'
        ? CoinService.addCoins(reward.amount, 'LEVEL_REWARD_L' + lvlNum)
        : { newBalance: 0 };
      result.coinsAdded = reward.amount;
      result.newBalance = coinRes.newBalance;
    } else if (reward.type === 'dice') {
      let isAlreadyOwned = typeof UnlockService !== 'undefined' ? UnlockService.isDiceUnlocked(reward.itemId) : false;
      if (!isAlreadyOwned && typeof UnlockService !== 'undefined') {
        UnlockService.unlockDice(reward.itemId);
        result.unlocked = true;
      } else {
        result.alreadyOwned = true;
      }
    } else if (reward.type === 'board') {
      let isAlreadyOwned = typeof UnlockService !== 'undefined' ? UnlockService.isBoardUnlocked(reward.itemId) : false;
      if (!isAlreadyOwned && typeof UnlockService !== 'undefined') {
        UnlockService.unlockBoard(reward.itemId);
        result.unlocked = true;
      } else {
        result.alreadyOwned = true;
      }
    }

    // Mark as claimed in persistent profile
    userProfile.claimedLevelRewards.push(lvlNum);
    if (typeof saveUserProfile === 'function') saveUserProfile(userProfile);
    if (typeof updateWebProfileUI === 'function') updateWebProfileUI();
    if (typeof ShopService !== 'undefined') ShopService.updateShopUI();
    if (typeof MissionService !== 'undefined') {
      MissionService.initUserProfileMissions(userProfile);
    }
    return result;
  },

  processLevelRewards(oldLevel, newLevel) {
    if (typeof userProfile === 'undefined' || !userProfile) return [];
    this.initUserProfileRewards(userProfile);

    let start = Math.max(1, oldLevel + 1);
    let end = newLevel;
    let claimedList = [];
    let notifications = [];

    for (let lvl = start; lvl <= end; lvl++) {
      let reward = this.getRewardForLevel(lvl);
      if (reward && !this.isRewardClaimed(lvl)) {
        let res = this.claimReward(lvl);
        if (res.success) {
          claimedList.push(res);
          if (reward.type === 'coins') {
            notifications.push(`🎁 LEVEL ${lvl} ÖDÜLÜ: +${reward.amount.toLocaleString()} Coins`);
          } else if (reward.type === 'dice' || reward.type === 'board') {
            let itemName = reward.name || reward.itemId;
            if (res.alreadyOwned) {
              notifications.push(`🎁 LEVEL ${lvl} ÖDÜLÜ: ${itemName} (Zaten Açık)`);
            } else {
              notifications.push(`🎁 LEVEL ${lvl} ÖDÜLÜ: ${itemName} 🔓`);
            }
          }
        }
      }
    }

    if (typeof showToast === 'function') {
      let toastMsg = `🌟 SEVİYE ATLADINIZ! (LEVEL ${newLevel})\n`;
      if (notifications.length > 0) {
        toastMsg += notifications.join('\n');
      }
      showToast(toastMsg, 5000);
    }

    return claimedList;
  }
};

const MissionService = {
  MAIN_MISSION_POOL: [
    { id: 'play_10_matches', type: 'MATCH_PLAYED', target: 10, title: '10 Maç Oyna', xp: 500, coins: 500 },
    { id: 'play_20_matches', type: 'MATCH_PLAYED', target: 20, title: '20 Maç Oyna', xp: 800, coins: 800 },
    { id: 'win_5_matches', type: 'MATCH_WON', target: 5, title: '5 Maç Kazan', xp: 750, coins: 750 },
    { id: 'win_10_matches', type: 'MATCH_WON', target: 10, title: '10 Maç Kazan', xp: 1200, coins: 1200 },
    { id: 'hit_25_checkers', type: 'CHECKER_HIT', target: 25, title: '25 Taş Kır', xp: 600, coins: 600 },
    { id: 'hit_50_checkers', type: 'CHECKER_HIT', target: 50, title: '50 Taş Kır', xp: 1000, coins: 1000 },
    { id: 'roll_10_doubles', type: 'DOUBLE_ROLLED', target: 10, title: '10 Çift Zar At', xp: 500, coins: 500 },
    { id: 'roll_25_doubles', type: 'DOUBLE_ROLLED', target: 25, title: '25 Çift Zar At', xp: 900, coins: 900 },
    { id: 'play_5_dark_matches', type: 'DARK_MATCH_PLAYED', target: 5, title: '5 Karanlık Tavla Maçı Oyna', xp: 1000, coins: 1000 },
    { id: 'bearoff_30_checkers', type: 'CHECKER_BEAR_OFF', target: 30, title: '30 Taş Topla', xp: 700, coins: 700 }
  ],

  MATCH_MISSION_POOL: [
    { id: 'm_hit_2', type: 'CHECKER_HIT', target: 2, title: 'Bu maçta 2 taş kır', xp: 75, coins: 75 },
    { id: 'm_roll_5', type: 'DICE_ROLLED', target: 5, title: 'Bu maçta 5 kez zar at', xp: 50, coins: 50 },
    { id: 'm_bearoff_3', type: 'CHECKER_BEAR_OFF', target: 3, title: 'Bu maçta 3 taş topla', xp: 75, coins: 75 },
    { id: 'm_make_1_gate', type: 'POINT_MADE', target: 1, title: 'Bu maçta en az 1 kapı oluştur', xp: 50, coins: 50 },
    { id: 'm_hit_1_bar', type: 'CHECKER_HIT', target: 1, title: 'Bu maçta 1 rakip taşını kır', xp: 50, coins: 50 },
    { id: 'm_roll_1_double', type: 'DOUBLE_ROLLED', target: 1, title: 'Bu maçta 1 kez çift zar at', xp: 100, coins: 100 }
  ],

  PLAYTIME_REWARD_TIERS: [
    { minutes: 15, xp: 100, coins: 50, label: '15 Dakika Aktif Maç Süresi' },
    { minutes: 60, xp: 200, coins: 100, label: '60 Dakika Aktif Maç Süresi' },
    { minutes: 240, xp: 1000, coins: 500, label: '240 Dakika Aktif Maç Süresi' },
    { minutes: 480, xp: 1500, coins: 1000, label: '480 Dakika Aktif Maç Süresi' }
  ],

  // MATCH TIMER STATE (RAM ONLY FOR CURRENT ACTIVE MATCH)
  activeMatchStartTimestamp: null,
  isMatchTimerRunning: false,

  initUserProfileMissions(profile) {
    if (!profile) return;
    if (!Array.isArray(profile.mainMissions)) {
      profile.mainMissions = [];
    }
    if (!Array.isArray(profile.completedMainMissionIds)) {
      profile.completedMainMissionIds = [];
    }
    if (!Array.isArray(profile.claimedPlaytimeRewards)) {
      profile.claimedPlaytimeRewards = [];
    }
    if (typeof profile.totalMatchPlaytimeSeconds !== 'number') {
      profile.totalMatchPlaytimeSeconds = 0;
    }

    // Ensure 3 active Main Missions slots are populated
    while (profile.mainMissions.length < 3) {
      let nextM = this.generateNewMainMission(profile);
      if (nextM) profile.mainMissions.push(nextM);
      else break;
    }
  },

  generateNewMainMission(profile) {
    if (!profile) return null;
    let activeIds = Array.isArray(profile.mainMissions) ? profile.mainMissions.map(m => m.id) : [];
    let doneIds = Array.isArray(profile.completedMainMissionIds) ? profile.completedMainMissionIds : [];

    let available = this.MAIN_MISSION_POOL.filter(m => !activeIds.includes(m.id) && !doneIds.includes(m.id));
    if (available.length === 0) {
      // Dynamic fallback mission if initial pool is exhausted
      let base = this.MAIN_MISSION_POOL[activeIds.length % this.MAIN_MISSION_POOL.length];
      let mult = Math.floor(doneIds.length / 5) + 1;
      return {
        id: base.id + '_dyn_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        type: base.type,
        target: base.target * mult,
        title: `${base.title} (${mult}x)`,
        xp: base.xp * mult,
        coins: base.coins * mult,
        progress: 0,
        completed: false
      };
    }
    let chosen = available[Math.floor(Math.random() * available.length)];
    return {
      id: chosen.id,
      type: chosen.type,
      target: chosen.target,
      title: chosen.title,
      xp: chosen.xp,
      coins: chosen.coins,
      progress: 0,
      completed: false
    };
  },

  startNewMatch(isDarkMode = false) {
    if (typeof userProfile === 'undefined' || !userProfile) return;
    this.initUserProfileMissions(userProfile);

    // Pick 3 random Match Missions from pool
    let shuffled = [...this.MATCH_MISSION_POOL].sort(() => Math.random() - 0.5);
    userProfile.activeMatchMissions = shuffled.slice(0, 3).map(m => ({
      id: m.id + '_' + Date.now(),
      baseId: m.id,
      type: m.type,
      target: m.target,
      title: m.title,
      xp: m.xp,
      coins: m.coins,
      progress: 0,
      completed: false,
      claimed: false
    }));

    // Start Match Playtime Timer for this active match
    this.startMatchTimer();

    // Trigger MATCH_STARTED events
    this.notifyEvent('MATCH_STARTED', 1);
    this.notifyEvent('MATCH_PLAYED', 1);
    if (isDarkMode) {
      this.notifyEvent('DARK_MATCH_STARTED', 1);
      this.notifyEvent('DARK_MATCH_PLAYED', 1);
    }

    this.updateMissionUI();
  },

  startMatchTimer() {
    this.stopMatchTimer();
    this.activeMatchStartTimestamp = Date.now();
    this.isMatchTimerRunning = true;
  },

  stopMatchTimer() {
    if (this.isMatchTimerRunning && this.activeMatchStartTimestamp) {
      let elapsed = Math.floor((Date.now() - this.activeMatchStartTimestamp) / 1000);
      if (elapsed > 0 && typeof userProfile !== 'undefined' && userProfile) {
        userProfile.totalMatchPlaytimeSeconds = (userProfile.totalMatchPlaytimeSeconds || 0) + elapsed;
        this.checkPlaytimeRewards();
        if (typeof saveUserProfile === 'function') saveUserProfile(userProfile);
      }
    }
    this.activeMatchStartTimestamp = null;
    this.isMatchTimerRunning = false;
  },

  checkPlaytimeRewards() {
    if (typeof userProfile === 'undefined' || !userProfile) return;
    this.initUserProfileMissions(userProfile);

    let totalMins = Math.floor((userProfile.totalMatchPlaytimeSeconds || 0) / 60);

    for (let tier of this.PLAYTIME_REWARD_TIERS) {
      if (totalMins >= tier.minutes && !userProfile.claimedPlaytimeRewards.includes(tier.minutes)) {
        // Grant playtime reward!
        userProfile.claimedPlaytimeRewards.push(tier.minutes);

        if (typeof CoinService !== 'undefined') {
          CoinService.addCoins(tier.coins, 'PLAYTIME_REWARD_' + tier.minutes + 'M');
        }
        if (typeof XPService !== 'undefined') {
          XPService.addXP(tier.xp, 'PLAYTIME_REWARD_' + tier.minutes + 'M');
        }

        if (typeof showToast === 'function') {
          showToast(`⏱️ OYNAMA SÜRESİ ÖDÜLÜ! (${tier.minutes} Dk)\n🎁 +${tier.xp} XP | +${tier.coins} Coins`, 4000);
        }
      }
    }
  },

  endMatch(isWin = false, isDarkMode = false) {
    this.stopMatchTimer();

    if (typeof userProfile === 'undefined' || !userProfile) return { xp: 0, coins: 0, count: 0 };
    this.notifyEvent('MATCH_COMPLETED', 1);
    if (isWin) {
      this.notifyEvent('MATCH_WON', 1);
    } else {
      this.notifyEvent('MATCH_LOST', 1);
    }
    if (isDarkMode) {
      this.notifyEvent('DARK_MATCH_COMPLETED', 1);
    }

    let missionSummary = { xp: 0, coins: 0, count: 0 };

    // Process Match Missions rewards at the end of the match
    if (Array.isArray(userProfile.activeMatchMissions)) {
      userProfile.activeMatchMissions.forEach(mm => {
        if (mm.completed && !mm.claimed) {
          mm.claimed = true;
          missionSummary.xp += mm.xp;
          missionSummary.coins += mm.coins;
          missionSummary.count++;
          
          if (typeof CoinService !== 'undefined') CoinService.addCoins(mm.coins, 'MATCH_MISSION_' + mm.id);
          if (typeof XPService !== 'undefined') XPService.addXP(mm.xp, 'MATCH_MISSION_' + mm.id);
        }
      });
      // Clean up Match Missions since the match ended
      userProfile.activeMatchMissions = [];
    }

    if (typeof saveUserProfile === 'function') saveUserProfile(userProfile);
    this.updateMissionUI();
    
    return missionSummary;
  },

  abandonMatch() {
    this.stopMatchTimer();
    
    if (typeof userProfile === 'undefined' || !userProfile) return;
    
    // Clean up Match Missions without granting any rewards
    if (Array.isArray(userProfile.activeMatchMissions)) {
      userProfile.activeMatchMissions = [];
    }

    if (typeof saveUserProfile === 'function') saveUserProfile(userProfile);
    this.updateMissionUI();
  },

  notifyEvent(eventType, amount = 1) {
    if (typeof userProfile === 'undefined' || !userProfile) return;
    this.initUserProfileMissions(userProfile);

    let profileChanged = false;

    // 1. Update Main Missions
    if (Array.isArray(userProfile.mainMissions)) {
      userProfile.mainMissions.forEach((m, idx) => {
        if (!m.completed && m.type === eventType) {
          m.progress = Math.min(m.target, m.progress + amount);
          profileChanged = true;

          if (m.progress >= m.target) {
            m.completed = true;
            this.claimMainMission(m, idx);
          }
        }
      });
    }

    // 2. Update Active Match Missions
    if (Array.isArray(userProfile.activeMatchMissions)) {
      userProfile.activeMatchMissions.forEach((mm) => {
        if (!mm.completed && mm.type === eventType) {
          mm.progress = Math.min(mm.target, mm.progress + amount);
          profileChanged = true;

          if (mm.progress >= mm.target) {
            mm.completed = true;
            if (typeof showToast === 'function') {
              showToast(`✅ Görev Hedefine Ulaşıldı: ${mm.title}\nÖdül maç sonunda verilecek.`, 2500);
            }
          }
        }
      });
    }

    if (profileChanged) {
      if (typeof saveUserProfile === 'function') saveUserProfile(userProfile);
      this.updateMissionUI();
    }
  },

  claimMainMission(m, idx) {
    if (!m || m.claimed) return;
    m.claimed = true;

    // Award Coins & XP atomically via services
    if (typeof CoinService !== 'undefined') CoinService.addCoins(m.coins, 'MAIN_MISSION_' + m.id);
    if (typeof XPService !== 'undefined') XPService.addXP(m.xp, 'MAIN_MISSION_' + m.id);

    if (!userProfile.completedMainMissionIds.includes(m.id)) {
      userProfile.completedMainMissionIds.push(m.id);
    }

    if (typeof showToast === 'function') {
      showToast(`🎯 ANA GÖREV TAMAMLANDI!\n${m.title}\n🎁 +${m.xp} XP | +${m.coins} Coins`, 4000);
    }

    // Replace completed mission slot with new one
    let newM = this.generateNewMainMission(userProfile);
    userProfile.mainMissions[idx] = newM;

    if (typeof saveUserProfile === 'function') saveUserProfile(userProfile);
  },



  updateMissionUI() {
    if (typeof document === 'undefined') return;
    let container = document.getElementById('missions-list-container');
    if (!container) return;

    if (typeof userProfile === 'undefined' || !userProfile) return;
    this.initUserProfileMissions(userProfile);

    let html = '';

    // --- MAIN MISSIONS ---
    html += `<div style="font-size:11px; font-weight:700; color:#A68045; letter-spacing:3px; margin-bottom:12px; border-bottom:1px dashed #3A2318; padding-bottom:6px;">ANA GÖREVLER (TAVLA YOLCULUĞU)</div>`;
    html += `<div style="display:flex; flex-direction:column; gap:10px; margin-bottom:25px;">`;

    userProfile.mainMissions.forEach(m => {
      let pct = Math.min(100, Math.floor((m.progress / m.target) * 100));
      html += `
        <div style="background:#170B06; border:1px solid #3A2318; border-radius:6px; padding:14px; position:relative;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <div style="font-size:13px; font-weight:700; color:#E5DAC8;">${m.title}</div>
            <div style="font-size:11px; font-weight:bold; color:#D4AF37;">🎁 +${m.xp} XP | +${m.coins} 🪙</div>
          </div>
          <div style="background:#0F0804; height:8px; border-radius:4px; overflow:hidden; position:relative; border:1px solid #2A1A0F;">
            <div style="background:linear-gradient(90deg, #8A6D3B, #D4AF37); height:100%; width:${pct}%; transition:width 0.4s;"></div>
          </div>
          <div style="font-size:10px; color:#A68045; text-align:right; margin-top:4px; font-weight:600;">${m.progress} / ${m.target} (${pct}%)</div>
        </div>
      `;
    });
    html += `</div>`;

    // --- MATCH MISSIONS ---
    html += `<div style="font-size:11px; font-weight:700; color:#A68045; letter-spacing:3px; margin-bottom:12px; border-bottom:1px dashed #3A2318; padding-bottom:6px;">BU MAÇIN GÖREVLERİ</div>`;
    html += `<div style="display:flex; flex-direction:column; gap:10px; margin-bottom:25px;">`;

    if (Array.isArray(userProfile.activeMatchMissions) && userProfile.activeMatchMissions.length > 0) {
      userProfile.activeMatchMissions.forEach(mm => {
        let isDone = mm.completed;
        html += `
          <div style="background:#170B06; border:1px solid ${isDone ? '#4C7338' : '#3A2318'}; border-radius:6px; padding:12px; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div style="font-size:12px; font-weight:700; color:${isDone ? '#9CCB86' : '#E5DAC8'};">
                ${isDone ? '✓ ' : '🎯 '} ${mm.title}
              </div>
              <div style="font-size:10px; color:#8A6D3B; margin-top:3px; font-weight:600;">İlerleme: ${mm.progress} / ${mm.target}</div>
            </div>
            <div style="font-size:11px; font-weight:bold; color:${isDone ? '#9CCB86' : '#D4AF37'};">
              ${isDone ? 'TAMAMLANDI' : `🎁 +${mm.xp} XP | +${mm.coins} 🪙`}
            </div>
          </div>
        `;
      });
    } else {
      html += `<div style="font-size:11px; color:#8A6D3B; font-style:italic; padding:10px; text-align:center; background:#170B06; border:1px solid #3A2318; border-radius:6px;">Maç başladığında görevler görünecektir.</div>`;
    }
    html += `</div>`;

    // --- PLAYTIME REWARDS ---
    let totalMins = Math.floor((userProfile.totalMatchPlaytimeSeconds || 0) / 60);
    html += `<div style="font-size:11px; font-weight:700; color:#A68045; letter-spacing:3px; margin-bottom:12px; border-bottom:1px dashed #3A2318; padding-bottom:6px;">MAÇ OYNAMA SÜRESİ (${totalMins} Dk)</div>`;
    html += `<div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">`;

    this.PLAYTIME_REWARD_TIERS.forEach(tier => {
      let isClaimed = userProfile.claimedPlaytimeRewards.includes(tier.minutes);
      let canClaim = totalMins >= tier.minutes;

      html += `
        <div style="background:#170B06; border:1px solid ${isClaimed ? '#4C7338' : '#3A2318'}; border-radius:6px; padding:10px; text-align:center;">
          <div style="font-size:12px; font-weight:700; color:#E5DAC8;">⏱️ ${tier.minutes} Dk</div>
          <div style="font-size:10px; color:#D4AF37; margin:4px 0; font-weight:bold;">+${tier.xp} XP | +${tier.coins} 🪙</div>
          <div style="font-size:10px; font-weight:bold; color:${isClaimed ? '#9CCB86' : (canClaim ? '#D4AF37' : '#8A6D3B')};">
            ${isClaimed ? '✓ ALINDI' : (canClaim ? 'KAZANILDI' : `${tier.minutes - totalMins} Dk Kaldı`)}
          </div>
        </div>
      `;
    });
    html += `</div>`;

    container.innerHTML = html;
  }
};

function logoutUser() {
  // 1. SAVE logged-in user profile before logging out (NEVER DELETE DATA!)
  if (userProfile && userProfile.id) {
    saveUserProfile(userProfile);
  }
  
  // 2. Switch session to Guest profile
  let guestId = 'guest';
  userProfile = loadUserProfile(guestId);
  userProfile.isGuest = true;
  saveUserProfile(userProfile);
  
  // 3. Update UI & Settings
  updateWebProfileUI();
  applyProfileSettingsToGame(userProfile);
  closeModal('settings-modal');
}

function handleCredentialResponse(response) {
  try {
    const base64Url = response.credential.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    
    const payload = JSON.parse(jsonPayload);
    const googleUserId = 'google_' + (payload.sub || payload.email || 'user');
    const userName = payload.name || payload.given_name || 'Google Kullanıcısı';
    const userEmail = payload.email || '';
    
    loginUserAccount(googleUserId, userName, userEmail);
    closeModal('login-modal');
    alert(`Hoş geldin ${userProfile.name}!\nHesabınız Yüklendi: Seviye ${userProfile.level} | ${userProfile.chips} Jeton | ${userProfile.currentXP} XP`);
  } catch (err) {
    console.error("Login parse error", err);
  }
}

function mockLoginAccount(accountName, accountTag) {
  let userId = 'user_' + accountTag;
  let raw = localStorage.getItem('tavla_user_data_' + userId);
  
  if (!raw) {
    loginUserAccount(userId, accountName);
    userProfile.chips = 1500;
    saveUserProfile(userProfile);
    alert(`Yeni Hesap Oluşturuldu!\n${userProfile.name}\nSeviye ${userProfile.level} | ${userProfile.chips} Jeton | ${userProfile.currentXP} XP`);
  } else {
    loginUserAccount(userId, accountName);
    alert(`Tekrar Hoş Geldiniz ${userProfile.name}!\nMevcut Hesabınız Yüklendi:\nSeviye ${userProfile.level} | ${userProfile.chips} Jeton | ${userProfile.currentXP} XP`);
  }
  closeModal('login-modal');
}

function mockGoogleLogin() {
  mockLoginAccount('Emin Akgül', 'emin');
}

const AchievementService = {
  ACHIEVEMENTS: [
    { id: 'first_step', title: 'İlk Adım', description: 'İlk maçını oyna', statKey: 'matchesPlayed', target: 1, xp: 100, coins: 100, category: 'Gameplay', icon: '🎯' },
    { id: 'veteran', title: 'Veteran', description: '25 maç kazan', statKey: 'matchesWon', target: 25, xp: 500, coins: 500, category: 'Gameplay', icon: '🏆' },
    { id: 'warrior', title: 'Savaşçı', description: '50 taş kır', statKey: 'totalHits', target: 50, xp: 400, coins: 400, category: 'Combat', icon: '⚔️' },
    { id: 'lucky', title: 'Şanslı', description: '25 çift zar at', statKey: 'totalDoubles', target: 25, xp: 300, coins: 300, category: 'Gameplay', icon: '🎲' },
    { id: 'executioner', title: 'Cellat', description: '5 mars yap', statKey: 'totalMarsa', target: 5, xp: 800, coins: 800, category: 'Combat', icon: '💀' },
    { id: 'combo_master', title: 'Kombo Ustası', description: '5 kombo yap', statKey: 'highestCombo', target: 5, xp: 500, coins: 500, category: 'Combo', icon: '🔥' },
    { id: 'combo_monster', title: 'Kombo Canavarı', description: '10 kombo yap', statKey: 'highestCombo', target: 10, xp: 1000, coins: 1000, category: 'Combo', icon: '💥' },
    { id: 'master_player', title: 'Usta Oyuncu', description: '100 maç oyna', statKey: 'matchesPlayed', target: 100, xp: 1200, coins: 1200, category: 'Gameplay', icon: '👑' },
    { id: 'destroyer', title: 'Yıkıcı', description: '250 taş kır', statKey: 'totalHits', target: 250, xp: 1500, coins: 1500, category: 'Combat', icon: '💣' },
    { id: 'legend', title: 'Efsane', description: '100 maç kazan', statKey: 'matchesWon', target: 100, xp: 2500, coins: 2500, category: 'Gameplay', icon: '🌟' }
  ],

  checkAll() {
    if (typeof userProfile === 'undefined' || !userProfile || !userProfile.stats) return;
    if (!Array.isArray(userProfile.unlockedAchievements)) {
      userProfile.unlockedAchievements = [];
    }

    let newlyUnlocked = [];

    this.ACHIEVEMENTS.forEach(ach => {
      if (!userProfile.unlockedAchievements.includes(ach.id)) {
        let currentProgress = userProfile.stats[ach.statKey] || 0;
        if (currentProgress >= ach.target) {
          userProfile.unlockedAchievements.push(ach.id);
          
          if (typeof CoinService !== 'undefined') {
            CoinService.addCoins(ach.coins, 'ACHIEVEMENT_' + ach.id);
          }
          if (typeof XPService !== 'undefined') {
            XPService.addXP(ach.xp, 'ACHIEVEMENT_' + ach.id);
          }
          
          newlyUnlocked.push(ach);
        }
      }
    });

    if (newlyUnlocked.length > 0) {
      if (typeof saveUserProfile === 'function') saveUserProfile(userProfile);
      if (typeof updateWebProfileUI === 'function') updateWebProfileUI();
      
      if (typeof showToast === 'function') {
        let currentDelay = 500;
        newlyUnlocked.forEach((ach, index) => {
           setTimeout(() => {
             let msg = `🏆 BAŞARIM AÇILDI!\n${ach.title}\n${ach.description}\n\n🎁 +${ach.xp} XP | +${ach.coins} Coin`;
             showToast(msg, 4000);
           }, currentDelay + (index * 4200));
        });
      }
    }
  }
};
