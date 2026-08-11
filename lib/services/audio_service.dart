import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart';

/// Clean Audio Service for Tavla (Exact Recorded MP3 Audio Files)
class AudioService {
  static final AudioService _instance = AudioService._internal();
  factory AudioService() => _instance;
  AudioService._internal();

  final AudioPlayer _player = AudioPlayer();
  bool soundEnabled = true;

  Future<void> _playSound(String fileName) async {
    if (!soundEnabled) return;
    try {
      await _player.stop();
      await _player.play(AssetSource('sounds/$fileName'));
    } catch (e) {
      debugPrint('Error playing sound $fileName: $e');
    }
  }

  Future<void> playDiceShake() async {
    await _playSound('dice_roll.mp3');
  }

  Future<void> playDiceRoll() async {
    await _playSound('dice_roll.mp3');
  }

  Future<void> playCheckerSelect() async {
    await _playSound('checker_select.mp3');
  }

  Future<void> playCheckerMove() async {
    await _playSound('checker_move.mp3');
  }

  Future<void> playCheckerSnap() async {
    await _playSound('checker_move.mp3');
  }

  Future<void> playCheckerHit() async {
    await _playSound('checker_hit.mp3');
  }

  Future<void> playBearOff() async {
    await _playSound('checker_move.mp3');
  }

  Future<void> playUndo() async {
    await _playSound('checker_select.mp3');
  }

  Future<void> playTimerTick() async {
    await _playSound('checker_select.mp3');
  }

  Future<void> playGameWin() async {
    await _playSound('game_win.mp3');
  }

  Future<void> playGameLose() async {
    await _playSound('game_lose.mp3');
  }
}
