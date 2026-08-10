import 'player.dart';

class BackgammonMove {
  final PlayerType player;
  final int fromIndex; // -1 for White Bar, 24 for Black Bar, 0..23 for points
  final int toIndex;   // 0..23 for points, 24 for White Off, -1 for Black Off
  final int dieValue;
  final bool isHit;
  final bool isBearOff;

  BackgammonMove({
    required this.player,
    required this.fromIndex,
    required this.toIndex,
    required this.dieValue,
    this.isHit = false,
    this.isBearOff = false,
  });

  bool get isFromBar => fromIndex == -1 || fromIndex == 24;

  @override
  String toString() {
    return 'Move($player: $fromIndex -> $toIndex via $dieValue ${isHit ? "[HIT]" : ""} ${isBearOff ? "[OFF]" : ""})';
  }
}
