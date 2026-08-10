import 'player.dart';

class PointState {
  final int index; // 0..23
  int checkersCount;
  PlayerType? owner;

  PointState({
    required this.index,
    this.checkersCount = 0,
    this.owner,
  });

  bool get isEmpty => checkersCount == 0 || owner == null;
  bool get isBlot => checkersCount == 1; // Single checker, vulnerable to hit
  bool get isBlock => checkersCount >= 2; // Point blocked by 2+ checkers

  PointState clone() {
    return PointState(
      index: index,
      checkersCount: checkersCount,
      owner: owner,
    );
  }
}
