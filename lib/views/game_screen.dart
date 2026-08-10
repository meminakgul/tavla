import 'package:flutter/material.dart';
import '../models/board_state.dart';
import '../models/player.dart';
import '../models/move.dart';
import '../engine/backgammon_engine.dart';
import 'board_widget.dart';
import 'dice_widget.dart';

class GameScreen extends StatefulWidget {
  const GameScreen({super.key});

  @override
  State<GameScreen> createState() => _GameScreenState();
}

class _GameScreenState extends State<GameScreen> {
  final BackgammonEngine _engine = BackgammonEngine();
  late BoardState _state;
  @override
  void initState() {
    super.initState();
    _state = BoardState.initial();
  }

  void _resetGame() {
    setState(() {
      _state = BoardState.initial();
    });
  }

  void _rollDice() {
    if (_state.dice.isNotEmpty || _state.winner != null || _state.isRolling) return;

    // Pre-determine dice roll result (deterministic outcome)
    List<int> rolled = _engine.rollDice();

    setState(() {
      _state.isRolling = true;
      _state.dice = rolled;
      _state.remainingDice = List.from(rolled);
    });

    // 1100ms duration matches controlled tumbling & ground bounce duration
    Future.delayed(const Duration(milliseconds: 1100), () {
      if (!mounted) return;
      BoardState newState = _state.clone();
      newState.isRolling = false;
      newState.validMoves = _engine.getValidMoves(newState);

      // Auto turn-switch if BAR checkers blocked or no valid moves available
      if (newState.validMoves.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${newState.currentTurn.displayName} için oynanabilir hamle yok! Sıra devrediliyor.'),
            duration: const Duration(seconds: 2),
            backgroundColor: Colors.redAccent,
          ),
        );
        Future.delayed(const Duration(seconds: 2), () {
          if (!mounted) return;
          setState(() {
            _state.currentTurn = _state.currentTurn.opponent;
            _state.dice = [];
            _state.remainingDice = [];
            _state.validMoves = [];
          });
        });
      }

      setState(() {
        _state = newState;
      });
    });
  }

  void _onPointTapped(int pointIndex) {
    if (_state.dice.isEmpty || _state.winner != null || _state.isRolling) return;

    PlayerType player = _state.currentTurn;

    if (_state.selectedPoint != null) {
      int from = _state.selectedPoint!;

      if (from == pointIndex) {
        // Tapped same point again -> Deselect cleanly!
        setState(() {
          _state.selectedPoint = null;
        });
        return;
      }

      List<BackgammonMove> candidates = _state.validMoves.where(
        (m) => m.fromIndex == from && m.toIndex == pointIndex,
      ).toList();

      if (candidates.isNotEmpty) {
        _applyMove(candidates.first);
        return;
      }
    }

    if (_state.hasCheckersOnBar(player)) {
      int barIndex = player == PlayerType.white ? 24 : -1;
      List<BackgammonMove> barMoves = _state.validMoves.where(
        (m) => m.fromIndex == barIndex && m.toIndex == pointIndex,
      ).toList();

      if (barMoves.isNotEmpty) {
        _applyMove(barMoves.first);
        return;
      }

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Önce KINIZDAKI (BAR) pulunuzu oyuna sokmalısınız!'),
          duration: Duration(seconds: 1),
          backgroundColor: Colors.amber,
        ),
      );
      return;
    }

    if (_state.points[pointIndex].owner == player) {
      List<BackgammonMove> moves = _engine.getValidMovesFromPoint(_state, pointIndex);
      if (moves.isNotEmpty) {
        setState(() {
          _state.selectedPoint = pointIndex;
        });
      } else {
        setState(() {
          _state.selectedPoint = null;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Bu pul için oynanabilir hamle yok!'),
            duration: Duration(seconds: 1),
          ),
        );
      }
    } else {
      setState(() {
        _state.selectedPoint = null;
      });
    }
  }

  void _onBarTapped(PlayerType player) {
    if (_state.dice.isEmpty || _state.winner != null || _state.isRolling) return;
    if (_state.currentTurn != player || !_state.hasCheckersOnBar(player)) return;

    int barIndex = player == PlayerType.white ? 24 : -1;
    List<BackgammonMove> moves = _engine.getValidMovesFromPoint(_state, barIndex);

    if (moves.isNotEmpty) {
      setState(() {
        _state.selectedPoint = barIndex;
      });
    }
  }

  void _onBearOffTapped() {
    if (_state.selectedPoint == null || _state.isRolling) return;
    int from = _state.selectedPoint!;
    int offIndex = _state.currentTurn.offIndex;

    List<BackgammonMove> candidates = _state.validMoves.where(
      (m) => m.fromIndex == from && m.toIndex == offIndex,
    ).toList();

    if (candidates.isNotEmpty) {
      _applyMove(candidates.first);
    }
  }

  void _applyMove(BackgammonMove move) {
    setState(() {
      _state = _engine.executeMove(_state, move);
    });

    if (_state.winner != null) {
      _showWinnerDialog(_state.winner!);
    }
  }

  void _showWinnerDialog(PlayerType winner) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        return AlertDialog(
          backgroundColor: const Color(0xFF2C190E),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: Color(0xFFD4AF37), width: 2),
          ),
          title: Center(
            child: Text(
              'TEBRİKLER! 🏆',
              style: TextStyle(
                color: winner == PlayerType.white ? Colors.white : const Color(0xFFD4AF37),
                fontWeight: FontWeight.bold,
                fontSize: 22,
              ),
            ),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(
                Icons.emoji_events,
                color: Color(0xFFD4AF37),
                size: 64,
              ),
              const SizedBox(height: 12),
              Text(
                '${winner.displayName} Oyuncu Maçı Kazandı!',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
          actions: [
            Center(
              child: ElevatedButton(
                onPressed: () {
                  Navigator.of(context).pop();
                  _resetGame();
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFD4AF37),
                  foregroundColor: Colors.black,
                  padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20),
                  ),
                ),
                child: const Text(
                  'YENİ MAÇ BAŞLAT',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF120B07),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E110A),
        elevation: 4,
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.casino, color: Color(0xFFD4AF37), size: 24),
            const SizedBox(width: 8),
            ShaderMask(
              shaderCallback: (bounds) => const LinearGradient(
                colors: [Color(0xFFD4AF37), Color(0xFFFFF3CD), Color(0xFFD4AF37)],
              ).createShader(bounds),
              child: const Text(
                'YENİ NESİL TAVLA',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 2.0,
                  fontSize: 18,
                ),
              ),
            ),
          ],
        ),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Color(0xFFD4AF37)),
            tooltip: 'Yeniden Başlat',
            onPressed: () {
              showDialog(
                context: context,
                builder: (ctx) => AlertDialog(
                  backgroundColor: const Color(0xFF2C190E),
                  title: const Text('Maç Yeniden Başlatılsın mı?', style: TextStyle(color: Colors.white)),
                  content: const Text('Mevcut maç sıfırlanacak.', style: TextStyle(color: Colors.white70)),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(ctx),
                      child: const Text('İptal', style: TextStyle(color: Colors.grey)),
                    ),
                    TextButton(
                      onPressed: () {
                        Navigator.pop(ctx);
                        _resetGame();
                      },
                      child: const Text('Evet, Sıfırla', style: TextStyle(color: Colors.amberAccent)),
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Siyah Oyuncu HUD
            _buildPlayerHeader(
              player: PlayerType.black,
              isCurrentTurn: _state.currentTurn == PlayerType.black,
            ),

            const Spacer(),

            // Backgammon Board Canvas & Overlay
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: BoardWidget(
                state: _state,
                onPointTapped: _onPointTapped,
                onBarTapped: _onBarTapped,
                onBearOffTapped: _onBearOffTapped,
              ),
            ),

            const SizedBox(height: 12),

            // Dice & Controls Area
            Container(
              height: 56,
              alignment: Alignment.center,
              child: DiceWidget(
                diceValues: _state.dice,
                remainingDice: _state.remainingDice,
                isRolling: _state.isRolling,
                canRoll: _state.dice.isEmpty,
                onRollPressed: _rollDice,
              ),
            ),

            const Spacer(),

            // Beyaz Oyuncu HUD
            _buildPlayerHeader(
              player: PlayerType.white,
              isCurrentTurn: _state.currentTurn == PlayerType.white,
            ),

            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  Widget _buildPlayerHeader({
    required PlayerType player,
    required bool isCurrentTurn,
  }) {
    bool isWhite = player == PlayerType.white;
    int offCount = _state.getOffCount(player);
    int barCount = _state.getBarCount(player);

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        color: isCurrentTurn
            ? const Color(0xFF2C190E)
            : const Color(0xFF180F0A),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isCurrentTurn ? const Color(0xFFD4AF37) : Colors.white10,
          width: isCurrentTurn ? 2 : 1,
        ),
        boxShadow: isCurrentTurn
            ? [
                BoxShadow(
                  color: const Color(0xFFD4AF37).withValues(alpha: 0.3),
                  blurRadius: 8,
                  spreadRadius: 1,
                ),
              ]
            : [],
      ),
      child: Row(
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: isWhite ? Colors.white : Colors.black,
              border: Border.all(color: const Color(0xFFD4AF37), width: 1.5),
            ),
            child: isWhite
                ? const Icon(Icons.circle, color: Colors.grey, size: 16)
                : const Icon(Icons.circle, color: Colors.white38, size: 16),
          ),
          const SizedBox(width: 12),

          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                player.displayName,
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
              if (isCurrentTurn)
                const Text(
                  '● SIRA SENDE',
                  style: TextStyle(
                    color: Color(0xFF00E676),
                    fontWeight: FontWeight.w600,
                    fontSize: 11,
                  ),
                ),
            ],
          ),

          const Spacer(),

          if (barCount > 0)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              margin: const EdgeInsets.only(right: 12),
              decoration: BoxDecoration(
                color: Colors.redAccent.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.redAccent, width: 1),
              ),
              child: Text(
                'KIRIK: $barCount',
                style: const TextStyle(
                  color: Colors.redAccent,
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
              ),
            ),

          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                'Toplanan: $offCount / 15',
                style: const TextStyle(
                  color: Color(0xFFD4AF37),
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 4),
              SizedBox(
                width: 80,
                height: 4,
                child: LinearProgressIndicator(
                  value: offCount / 15.0,
                  backgroundColor: Colors.white10,
                  valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFFD4AF37)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
