enum PlayerType { white, black }

extension PlayerTypeExtension on PlayerType {
  PlayerType get opponent => this == PlayerType.white ? PlayerType.black : PlayerType.white;

  String get displayName => this == PlayerType.white ? 'Beyaz' : 'Siyah';

  // White Home Board: indices 0..5 (Haneler 1..6, Sağ Alt)
  // Black Home Board: indices 18..23 (Haneler 19..24, Sağ Üst)
  bool isInHomeBoard(int pointIndex) {
    if (this == PlayerType.white) {
      return pointIndex >= 0 && pointIndex <= 5;
    } else {
      return pointIndex >= 18 && pointIndex <= 23;
    }
  }

  int get offIndex => this == PlayerType.white ? -1 : 24;
  int get barIndex => this == PlayerType.white ? 24 : -1;
}
