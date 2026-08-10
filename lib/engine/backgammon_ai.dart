import 'dart:math';
import '../models/board_state.dart';
import '../models/player.dart';
import '../models/move.dart';
import 'backgammon_engine.dart';

enum AIDifficulty { easy, medium, master }

/// Smart Artificial Intelligence Engine for Backgammon (Tavla Yapay Zekası)
class BackgammonAI {
  final BackgammonEngine engine;
  final Random _random = Random();

  BackgammonAI({required this.engine});

  /// Selects the optimal move for the current AI turn based on difficulty
  BackgammonMove? selectBestMove(BoardState state, {AIDifficulty difficulty = AIDifficulty.master}) {
    List<BackgammonMove> validMoves = engine.getValidMoves(state);
    if (validMoves.isEmpty) return null;

    if (difficulty == AIDifficulty.easy) {
      return validMoves[_random.nextInt(validMoves.length)];
    }

    BackgammonMove bestMove = validMoves.first;
    double bestScore = -999999.0;

    for (var move in validMoves) {
      BoardState simulated = engine.executeMove(state, move);
      double score = evaluateBoard(simulated, state.currentTurn);

      // Add slight randomness for Medium difficulty
      if (difficulty == AIDifficulty.medium) {
        score += (_random.nextDouble() * 20.0 - 10.0);
      }

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }

  /// Evaluates board equity for a given player
  double evaluateBoard(BoardState state, PlayerType aiPlayer) {
    PlayerType opponent = aiPlayer.opponent;
    double score = 0.0;

    // 1. Victory & Game Over State
    if (state.getOffCount(aiPlayer) == 15) return 100000.0;
    if (state.getOffCount(opponent) == 15) return -100000.0;

    // 2. Bear Off Progress (+50 per borne off checker)
    score += state.getOffCount(aiPlayer) * 50.0;
    score -= state.getOffCount(opponent) * 50.0;

    // 3. BAR Checkers (Extreme penalty for checkers on BAR, massive reward for trapping opponent)
    score -= state.getBarCount(aiPlayer) * 120.0;
    score += state.getBarCount(opponent) * 120.0;

    // 4. Point Evaluation across all 24 points
    int aiHomePointsMade = 0;

    for (int i = 0; i < 24; i++) {
      var pt = state.points[i];
      if (pt.isEmpty) continue;

      bool isHomeBoard = aiPlayer == PlayerType.white ? (i <= 5) : (i >= 18);

      if (pt.owner == aiPlayer) {
        if (pt.checkersCount == 1) {
          // Unprotected Blot (-35 penalty, worse if near home or opponent bar)
          score -= isHomeBoard ? 45.0 : 30.0;
        } else if (pt.checkersCount >= 2) {
          // Secured Point (Kapı Alma)
          score += 25.0;
          if (isHomeBoard) {
            aiHomePointsMade++;
            score += 35.0; // Home board points are extra valuable for trapping
          }
        }
      } else if (pt.owner == opponent) {
        if (pt.checkersCount == 1) {
          // Vulnerable opponent blot (+30 incentive)
          score += 30.0;
        }
      }
    }

    // 5. Prime Building (Consecutive Made Points)
    score += (aiHomePointsMade * aiHomePointsMade) * 15.0;

    // 6. Pip Race / Distance to Home (Pip Count Advantage)
    int aiPip = _calculatePipCount(state, aiPlayer);
    int oppPip = _calculatePipCount(state, opponent);
    score += (oppPip - aiPip) * 3.0;

    return score;
  }

  int _calculatePipCount(BoardState state, PlayerType player) {
    int pip = 0;
    if (player == PlayerType.white) {
      pip += state.whiteBar * 25;
      for (int i = 0; i < 24; i++) {
        if (state.points[i].owner == PlayerType.white) {
          pip += state.points[i].checkersCount * (i + 1);
        }
      }
    } else {
      pip += state.blackBar * 25;
      for (int i = 0; i < 24; i++) {
        if (state.points[i].owner == PlayerType.black) {
          pip += state.points[i].checkersCount * (24 - i);
        }
      }
    }
    return pip;
  }
}
