import 'package:flutter_test/flutter_test.dart';
import 'package:yeni_nesil_tavla/models/board_state.dart';
import 'package:yeni_nesil_tavla/models/player.dart';
import 'package:yeni_nesil_tavla/engine/backgammon_engine.dart';

void main() {
  group('BackgammonEngine Tests', () {
    late BackgammonEngine engine;

    setUp(() {
      engine = BackgammonEngine();
    });

    test('Initial board setup matches standard backgammon configuration', () {
      BoardState state = BoardState.initial();

      expect(state.points[0].checkersCount, 2);
      expect(state.points[0].owner, PlayerType.black);

      expect(state.points[5].checkersCount, 5);
      expect(state.points[5].owner, PlayerType.white);

      expect(state.points[23].checkersCount, 2);
      expect(state.points[23].owner, PlayerType.white);

      expect(state.whiteBar, 0);
      expect(state.blackBar, 0);
      expect(state.whiteOff, 0);
      expect(state.blackOff, 0);
      expect(state.currentTurn, PlayerType.white);
    });

    test('Dice roll generates 2 dice for normal roll and 4 for double roll', () {
      for (int i = 0; i < 50; i++) {
        List<int> dice = engine.rollDice();
        if (dice.length == 4) {
          expect(dice[0], dice[1]);
          expect(dice[1], dice[2]);
          expect(dice[2], dice[3]);
        } else {
          expect(dice.length, 2);
        }
      }
    });

    test('Cannot bear off when checkers remain outside home board', () {
      BoardState state = BoardState.initial();
      expect(engine.canBearOff(state, PlayerType.white), false);
      expect(engine.canBearOff(state, PlayerType.black), false);
    });

    test('Can bear off when all checkers are in home board', () {
      BoardState state = BoardState.initial();
      // Clear all points
      for (var p in state.points) {
        p.checkersCount = 0;
        p.owner = null;
      }
      // Place 15 White checkers in white home board (indices 0..5)
      state.points[2].checkersCount = 15;
      state.points[2].owner = PlayerType.white;

      expect(engine.canBearOff(state, PlayerType.white), true);
    });

    test('Enforces Maximum Dice Usage Rule (forces playing higher die when only 1 can be played)', () {
      BoardState state = BoardState.initial();
      // Setup a board scenario where only one die can be played
      for (var p in state.points) {
        p.checkersCount = 0;
        p.owner = null;
      }
      // White checker on point 10
      state.points[10].checkersCount = 1;
      state.points[10].owner = PlayerType.white;
      state.currentTurn = PlayerType.white;

      // Block point 1 (10 - 6 - 3 = 1) with 2 black checkers so second step is impossible
      state.points[1].checkersCount = 2;
      state.points[1].owner = PlayerType.black;

      state.remainingDice = [6, 3];

      // Since both 10->4 (die 6) and 10->7 (die 3) allow only 1 move total, higher die (6) must be forced
      var moves = engine.getValidMoves(state);
      expect(moves.length, 1);
      expect(moves.first.dieValue, 6);
    });
  });
}
