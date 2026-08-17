// Real Recorded MP3 Audio Engine (Exact Sounds, Clean Playback)
const SoundFX = {
  soundEnabled: true,
  basePath: 'assets/sounds/',

  play(file) {
    if (!this.soundEnabled) return;
    try {
      let a = new Audio(this.basePath + file);
      a.volume = 1.0;
      let p = a.play();
      if (p !== undefined) {
        p.catch((err) => {
          // Hatanın gerçek nedenini gör (autoplay engeli, 404, vs.)
          console.warn(`SoundFX: "${file}" çalınamadı ->`, err.name, err.message);
        });
      }
    } catch (e) {
      console.error(`SoundFX: "${file}" yüklenirken hata ->`, e);
    }
  },

  playDiceRoll() { this.play('dice_roll.mp3'); },
  playCheckerSelect() { this.play('checker_select.mp3'); },
  playCheckerMove() { this.play('checker_move.mp3'); },
  playCheckerSnap() { this.play('checker_move.mp3'); },
  playCheckerHit() { this.play('checker_hit.mp3'); },
  playBearOff() { this.play('checker_move.mp3'); },
  playUndo() { this.play('checker_select.mp3'); },
  playTimerTick() { this.play('checker_select.mp3'); },
  playGameWin() { this.play('game_win.wav'); },
  playGameLose() { this.play('game_lose.wav'); }
};