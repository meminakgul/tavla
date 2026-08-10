import 'player.dart';
import 'point.dart';
import 'move.dart';

class BoardState {
  List<PointState> points;
  int whiteBar;
  int blackBar;
  int whiteOff;
  int blackOff;
  PlayerType currentTurn;
  List<int> dice;
  List<int> remainingDice;
  int? selectedPoint; // 24 for White Bar, -1 for Black Bar, 0..23 for point, null if none
  List<BackgammonMove> validMoves;
  List<BackgammonMove> turnMoveHistory;
  bool isRolling;
  PlayerType? winner;

  BoardState({
    required this.points,
    this.whiteBar = 0,
    this.blackBar = 0,
    this.whiteOff = 0,
    this.blackOff = 0,
    this.currentTurn = PlayerType.white,
    this.dice = const [],
    this.remainingDice = const [],
    this.selectedPoint,
    this.validMoves = const [],
    this.turnMoveHistory = const [],
    this.isRolling = false,
    this.winner,
  });

  factory BoardState.initial() {
    List<PointState> initialPoints = List.generate(24, (i) => PointState(index: i));

    // Standard Klasik Tavla Setup:
    // Hane 24 (Idx 23): 2 White
    // Hane 13 (Idx 12): 5 White
    // Hane 8  (Idx 7):  3 White
    // Hane 6  (Idx 5):  5 White
    // ---
    // Hane 1  (Idx 0):  2 Black
    // Hane 12 (Idx 11): 5 Black
    // Hane 17 (Idx 16): 3 Black
    // Hane 19 (Idx 18): 5 Black

    initialPoints[23] = PointState(index: 23, checkersCount: 2, owner: PlayerType.white);
    initialPoints[12] = PointState(index: 12, checkersCount: 5, owner: PlayerType.white);
    initialPoints[7]  = PointState(index: 7,  checkersCount: 3, owner: PlayerType.white);
    initialPoints[5]  = PointState(index: 5,  checkersCount: 5, owner: PlayerType.white);

    initialPoints[0]  = PointState(index: 0,  checkersCount: 2, owner: PlayerType.black);
    initialPoints[11] = PointState(index: 11, checkersCount: 5, owner: PlayerType.black);
    initialPoints[16] = PointState(index: 16, checkersCount: 3, owner: PlayerType.black);
    initialPoints[18] = PointState(index: 18, checkersCount: 5, owner: PlayerType.black);

    return BoardState(
      points: initialPoints,
      currentTurn: PlayerType.white,
    );
  }

  int getBarCount(PlayerType player) {
    return player == PlayerType.white ? whiteBar : blackBar;
  }

  int getOffCount(PlayerType player) {
    return player == PlayerType.white ? whiteOff : blackOff;
  }

  bool hasCheckersOnBar(PlayerType player) {
    return getBarCount(player) > 0;
  }

  BoardState clone() {
    return BoardState(
      points: points.map((p) => p.clone()).toList(),
      whiteBar: whiteBar,
      blackBar: blackBar,
      whiteOff: whiteOff,
      blackOff: blackOff,
      currentTurn: currentTurn,
      dice: List.from(dice),
      remainingDice: List.from(remainingDice),
      selectedPoint: selectedPoint,
      validMoves: List.from(validMoves),
      turnMoveHistory: List.from(turnMoveHistory),
      isRolling: isRolling,
      winner: winner,
    );
  }
}
