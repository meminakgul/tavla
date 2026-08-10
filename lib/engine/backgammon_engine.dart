import 'dart:math';
import '../models/player.dart';
import '../models/point.dart';
import '../models/move.dart';
import '../models/board_state.dart';

/// Turkish Backgammon Rules Engine with Auto-Pass when BAR checkers cannot enter
class BackgammonEngine {
  final Random _random = Random();

  List<int> rollDice() {
    int d1 = _random.nextInt(6) + 1;
    int d2 = _random.nextInt(6) + 1;
    if (d1 == d2) {
      return [d1, d1, d1, d1];
    } else {
      return [d1, d2];
    }
  }

  bool canBearOff(BoardState state, PlayerType player) {
    if (state.getBarCount(player) > 0) return false;

    int outsideCount = 0;
    if (player == PlayerType.white) {
      for (int i = 6; i < 24; i++) {
        if (state.points[i].owner == PlayerType.white) {
          outsideCount += state.points[i].checkersCount;
        }
      }
    } else {
      for (int i = 0; i < 18; i++) {
        if (state.points[i].owner == PlayerType.black) {
          outsideCount += state.points[i].checkersCount;
        }
      }
    }
    return outsideCount == 0;
  }

  List<BackgammonMove> getValidMoves(BoardState state) {
    List<BackgammonMove> rawMoves = _getRawValidMoves(state);
    if (rawMoves.isEmpty || state.remainingDice.length <= 1) return rawMoves;

    // Filter for Maximum Dice Usage Rule
    Map<BackgammonMove, int> moveDiceUsage = {};
    int maxDiceUsed = 0;

    for (var m in rawMoves) {
      BoardState tempState = executeMove(state, m);
      int usedByM = state.remainingDice.contains(m.dieValue) ? 1 : 2;

      int maxSubsequent = 0;
      if (tempState.currentTurn == state.currentTurn) {
        maxSubsequent = _getMaxPossibleDiceUsage(tempState);
      }
      int totalDice = usedByM + maxSubsequent;
      moveDiceUsage[m] = totalDice;

      if (totalDice > maxDiceUsed) {
        maxDiceUsed = totalDice;
      }
    }

    List<BackgammonMove> filtered = rawMoves.where((m) => moveDiceUsage[m] == maxDiceUsed).toList();

    // Standard rule: If only 1 die out of 2 can be played and the dice are different, player MUST play the higher die
    if (maxDiceUsed == 1 && state.remainingDice.length == 2 && state.remainingDice[0] != state.remainingDice[1]) {
      int maxDie = max(state.remainingDice[0], state.remainingDice[1]);
      bool hasHigherDieMove = filtered.any((m) => m.dieValue == maxDie);
      if (hasHigherDieMove) {
        filtered = filtered.where((m) => m.dieValue == maxDie).toList();
      }
    }

    return filtered;
  }

  int _getMaxPossibleDiceUsage(BoardState state) {
    if (state.remainingDice.isEmpty) return 0;
    List<BackgammonMove> rawMoves = _getRawValidMoves(state);
    if (rawMoves.isEmpty) return 0;

    int maxCount = 0;
    for (var m in rawMoves) {
      BoardState tempState = executeMove(state, m);
      int usedByM = state.remainingDice.contains(m.dieValue) ? 1 : 2;

      int maxSubsequent = 0;
      if (tempState.currentTurn == state.currentTurn) {
        maxSubsequent = _getMaxPossibleDiceUsage(tempState);
      }
      int total = usedByM + maxSubsequent;
      if (total > maxCount) {
        maxCount = total;
      }
    }
    return maxCount;
  }

  List<BackgammonMove> _getRawValidMoves(BoardState state) {
    if (state.remainingDice.isEmpty) return [];

    PlayerType player = state.currentTurn;
    List<BackgammonMove> moves = [];

    // 1. BAR (Kırık Pul) Re-entry Priority
    if (state.hasCheckersOnBar(player)) {
      int fromIdx = player == PlayerType.white ? 24 : -1;
      Set<int> uniqueDice = state.remainingDice.toSet();

      for (int die in uniqueDice) {
        int toIdx = player == PlayerType.white ? (24 - die) : (die - 1);
        if (_isValidTarget(state, player, toIdx)) {
          bool isHit = state.points[toIdx].owner == player.opponent && state.points[toIdx].checkersCount == 1;
          moves.add(BackgammonMove(
            player: player,
            fromIndex: fromIdx,
            toIndex: toIdx,
            dieValue: die,
            isHit: isHit,
          ));
        }
      }
      return moves;
    }

    // 2. Normal board moves
    bool bearOffAllowed = canBearOff(state, player);
    Set<int> uniqueDice = state.remainingDice.toSet();

    for (int i = 0; i < 24; i++) {
      if (state.points[i].owner == player && state.points[i].checkersCount > 0) {
        for (int die in uniqueDice) {
          int targetIdx = player == PlayerType.white ? (i - die) : (i + die);

          if (player == PlayerType.white) {
            if (targetIdx >= 0) {
              if (_isValidTarget(state, player, targetIdx)) {
                bool isHit = state.points[targetIdx].owner == player.opponent && state.points[targetIdx].checkersCount == 1;
                moves.add(BackgammonMove(
                  player: player,
                  fromIndex: i,
                  toIndex: targetIdx,
                  dieValue: die,
                  isHit: isHit,
                ));
              }
            } else if (bearOffAllowed) {
              if (targetIdx == -1 || _isHighestOccupiedHomePoint(state, player, i)) {
                moves.add(BackgammonMove(
                  player: player,
                  fromIndex: i,
                  toIndex: -1,
                  dieValue: die,
                  isBearOff: true,
                ));
              }
            }
          } else {
            if (targetIdx < 24) {
              if (_isValidTarget(state, player, targetIdx)) {
                bool isHit = state.points[targetIdx].owner == player.opponent && state.points[targetIdx].checkersCount == 1;
                moves.add(BackgammonMove(
                  player: player,
                  fromIndex: i,
                  toIndex: targetIdx,
                  dieValue: die,
                  isHit: isHit,
                ));
              }
            } else if (bearOffAllowed) {
              if (targetIdx == 24 || _isHighestOccupiedHomePoint(state, player, i)) {
                moves.add(BackgammonMove(
                  player: player,
                  fromIndex: i,
                  toIndex: 24,
                  dieValue: die,
                  isBearOff: true,
                ));
              }
            }
          }
        }
      }
    }

    // 3. Combined moves
    if (state.remainingDice.length >= 2) {
      List<BackgammonMove> combinedMoves = _calculateCombinedMoves(state, moves);
      moves.addAll(combinedMoves);
    }

    return moves;
  }

  List<BackgammonMove> _calculateCombinedMoves(BoardState state, List<BackgammonMove> singleMoves) {
    List<BackgammonMove> combined = [];
    PlayerType player = state.currentTurn;

    for (var m1 in singleMoves) {
      if (m1.isBearOff) continue;

      BoardState tempState = executeMove(state, m1);
      List<BackgammonMove> secondStepMoves = _getRawValidMoves(tempState);

      for (var m2 in secondStepMoves) {
        if (m2.fromIndex == m1.toIndex) {
          if (!combined.any((c) => c.fromIndex == m1.fromIndex && c.toIndex == m2.toIndex)) {
            combined.add(BackgammonMove(
              player: player,
              fromIndex: m1.fromIndex,
              toIndex: m2.toIndex,
              dieValue: m1.dieValue + m2.dieValue,
              isHit: m2.isHit || m1.isHit,
              isBearOff: m2.isBearOff,
            ));
          }
        }
      }
    }
    return combined;
  }

  List<BackgammonMove> getValidMovesFromPoint(BoardState state, int fromIndex) {
    return getValidMoves(state).where((m) => m.fromIndex == fromIndex).toList();
  }

  bool _isValidTarget(BoardState state, PlayerType player, int targetIndex) {
    if (targetIndex < 0 || targetIndex >= 24) return false;
    PointState pt = state.points[targetIndex];
    if (pt.isEmpty) return true;
    if (pt.owner == player) return true;
    if (pt.owner == player.opponent && pt.checkersCount == 1) return true;
    return false;
  }

  bool _isHighestOccupiedHomePoint(BoardState state, PlayerType player, int pointIndex) {
    if (player == PlayerType.white) {
      for (int i = 5; i > pointIndex; i--) {
        if (state.points[i].owner == PlayerType.white && state.points[i].checkersCount > 0) return false;
      }
      return true;
    } else {
      for (int i = 18; i < pointIndex; i++) {
        if (state.points[i].owner == PlayerType.black && state.points[i].checkersCount > 0) return false;
      }
      return true;
    }
  }

  BoardState executeMove(BoardState state, BackgammonMove move) {
    if (!state.remainingDice.contains(move.dieValue)) {
      List<int> dice = List.from(state.remainingDice);
      int? d1, d2;
      for (int i = 0; i < dice.length; i++) {
        for (int j = i + 1; j < dice.length; j++) {
          if (dice[i] + dice[j] == move.dieValue) {
            d1 = dice[i];
            d2 = dice[j];
            break;
          }
        }
        if (d1 != null) break;
      }

      if (d1 != null && d2 != null) {
        int midIdx = move.player == PlayerType.white ? (move.fromIndex - d1) : (move.fromIndex + d1);
        if (!_isValidTarget(state, move.player, midIdx)) {
          midIdx = move.player == PlayerType.white ? (move.fromIndex - d2) : (move.fromIndex + d2);
        }

        BackgammonMove step1 = BackgammonMove(
          player: move.player,
          fromIndex: move.fromIndex,
          toIndex: midIdx,
          dieValue: d1,
          isHit: state.points[midIdx].owner == move.player.opponent && state.points[midIdx].checkersCount == 1,
        );

        BoardState intermediateState = _executeSingleStep(state, step1);

        BackgammonMove step2 = BackgammonMove(
          player: move.player,
          fromIndex: midIdx,
          toIndex: move.toIndex,
          dieValue: d2,
          isHit: move.isHit,
          isBearOff: move.isBearOff,
        );

        return _executeSingleStep(intermediateState, step2);
      }
    }

    return _executeSingleStep(state, move);
  }

  BoardState _executeSingleStep(BoardState state, BackgammonMove move) {
    BoardState nextState = state.clone();

    if (move.isFromBar) {
      if (move.player == PlayerType.white) {
        nextState.whiteBar--;
      } else {
        nextState.blackBar--;
      }
    } else {
      PointState fromPt = nextState.points[move.fromIndex];
      fromPt.checkersCount--;
      if (fromPt.checkersCount == 0) fromPt.owner = null;
    }

    if (move.isBearOff) {
      if (move.player == PlayerType.white) {
        nextState.whiteOff++;
      } else {
        nextState.blackOff++;
      }
    } else {
      PointState toPt = nextState.points[move.toIndex];
      if (toPt.owner == move.player.opponent && toPt.checkersCount == 1) {
        if (move.player.opponent == PlayerType.white) {
          nextState.whiteBar++;
        } else {
          nextState.blackBar++;
        }
        toPt.checkersCount = 1;
        toPt.owner = move.player;
      } else {
        toPt.checkersCount++;
        toPt.owner = move.player;
      }
    }

    List<int> remaining = List.from(nextState.remainingDice);
    remaining.remove(move.dieValue);
    nextState.remainingDice = remaining;

    nextState.turnMoveHistory = [...nextState.turnMoveHistory, move];
    nextState.selectedPoint = null;

    if (nextState.whiteOff == 15) {
      nextState.winner = PlayerType.white;
      return nextState;
    } else if (nextState.blackOff == 15) {
      nextState.winner = PlayerType.black;
      return nextState;
    }

    List<BackgammonMove> availableMoves = getValidMoves(nextState);
    nextState.validMoves = availableMoves;

    // Auto turn switch if no remaining dice or no valid moves (e.g. BAR checkers blocked)
    if (nextState.remainingDice.isEmpty || availableMoves.isEmpty) {
      nextState.currentTurn = nextState.currentTurn.opponent;
      nextState.dice = [];
      nextState.remainingDice = [];
      nextState.validMoves = [];
      nextState.turnMoveHistory = [];
    }

    return nextState;
  }
}
