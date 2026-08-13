import 'package:flutter/material.dart';
import '../models/board_state.dart';
import '../models/board_theme.dart';
import '../models/player.dart';
import '../models/move.dart';
import '../engine/backgammon_engine.dart';
import '../engine/backgammon_ai.dart';
import '../services/audio_service.dart';
import '../services/auth_service.dart';
import 'board_widget.dart';

enum GameMode { classic, cards }

class GameScreen extends StatefulWidget {
  final GameMode gameMode;
  final bool isVsAI;
  final AIDifficulty aiDifficulty;
  final BoardThemeId boardThemeId;
  final DiceThemeId diceThemeId;

  const GameScreen({
    super.key,
    this.gameMode = GameMode.classic,
    this.isVsAI = true,
    this.aiDifficulty = AIDifficulty.master,
    this.boardThemeId = BoardThemeId.classicWalnut,
    this.diceThemeId = DiceThemeId.ivory,
  });

  @override
  State<GameScreen> createState() => _GameScreenState();
}

class _GameScreenState extends State<GameScreen> {
  final BackgammonEngine _engine = BackgammonEngine();
  late BackgammonAI _aiEngine;
  late BoardState _state;
  bool _isAIBusy = false;

  @override
  void initState() {
    super.initState();
    _aiEngine = BackgammonAI(engine: _engine);
    _state = BoardState.initial();
  }

  void _resetGame() {
    setState(() {
      _state = BoardState.initial();
      _isAIBusy = false;
    });
  }

  void _checkAITurn() {
    if (!widget.isVsAI || _isAIBusy || _state.winner != null) return;
    if (_state.currentTurn != PlayerType.black) return;

    _isAIBusy = true;

    // AI rolls dice if dice empty
    if (_state.dice.isEmpty && !_state.isRolling) {
      Future.delayed(const Duration(milliseconds: 600), () {
        if (!mounted) return;
        _rollDice();
      });
      return;
    }

    // AI plays best move if dice available
    if (_state.dice.isNotEmpty && !_state.isRolling) {
      Future.delayed(const Duration(milliseconds: 800), () {
        if (!mounted) return;
        BackgammonMove? bestMove = _aiEngine.selectBestMove(
          _state,
          difficulty: widget.aiDifficulty,
        );

        if (bestMove != null) {
          _applyMove(bestMove);
        }
        _isAIBusy = false;
      });
    }
  }

  void _rollDice() {
    if (_state.dice.isNotEmpty || _state.winner != null || _state.isRolling) return;

    AudioService().playDiceRoll();
    List<int> rolled = _engine.rollDice();

    setState(() {
      _state.isRolling = true;
      _state.dice = rolled;
      _state.remainingDice = List.from(rolled);
    });

    Future.delayed(const Duration(milliseconds: 1100), () {
      if (!mounted) return;
      BoardState newState = _state.clone();
      newState.isRolling = false;
      newState.validMoves = _engine.getValidMoves(newState);

      if (newState.validMoves.isEmpty) {
        _showCenterWarning('${newState.currentTurn.displayName} için oynanabilir hamle yok! Sıra devrediliyor.');
        Future.delayed(const Duration(seconds: 2), () {
          if (!mounted) return;
          setState(() {
            _state.currentTurn = _state.currentTurn.opponent;
            _state.dice = [];
            _state.remainingDice = [];
            _state.validMoves = [];
            _isAIBusy = false;
          });
          _checkAITurn();
        });
      }

      setState(() {
        _state = newState;
        _isAIBusy = false;
      });

      _checkAITurn();
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

      _showCenterWarning('Önce KINIZDAKI (BAR) pulunuzu oyuna sokmalısınız!');
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
        _showCenterWarning('Bu pul için oynanabilir hamle yok!');
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
    if (move.isHit) {
      AudioService().playCheckerHit();
    } else if (move.isBearOff) {
      AudioService().playBearOff();
    } else {
      AudioService().playCheckerMove();
    }

    setState(() {
      _state = _engine.executeMove(_state, move);
    });

    if (_state.winner != null) {
      _showWinnerDialog(_state.winner!);
    } else {
      _checkAITurn();
    }
  }

  void _showWinnerDialog(PlayerType winner) {
    bool isHumanWin = winner == PlayerType.white;
    AuthService().recordGameResult(isWin: isHumanWin, chipsWon: isHumanWin ? 250 : 0);
    AudioService().playGameWin();
    
    showDialog(
      context: context,
      barrierDismissible: false,
      barrierColor: Colors.black87,
      builder: (context) {
        return Dialog(
          backgroundColor: Colors.transparent,
          elevation: 0,
          child: Container(
            width: 400, // Sabit genişlik verilerek metnin sıkışması (vertical scrunch) önleniyor.
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              color: const Color(0xFF1E110A).withValues(alpha: 0.95),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: const Color(0xFFD4AF37), width: 2),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFFD4AF37).withValues(alpha: 0.3),
                  blurRadius: 20,
                  spreadRadius: 5,
                )
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(
                  Icons.emoji_events,
                  color: Color(0xFFD4AF37),
                  size: 80,
                ),
                const SizedBox(height: 16),
                Text(
                  'TEBRİKLER! 🏆',
                  style: TextStyle(
                    color: winner == PlayerType.white ? Colors.white : const Color(0xFFD4AF37),
                    fontWeight: FontWeight.w900,
                    letterSpacing: 2.0,
                    fontSize: 28,
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  '${winner.displayName} Oyuncu Maçı Kazandı! 🎉',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 32),
                ElevatedButton(
                  onPressed: () {
                    Navigator.of(context).pop();
                    _resetGame();
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFD4AF37),
                    foregroundColor: Colors.black,
                    padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(30),
                    ),
                    elevation: 8,
                  ),
                  child: const Text(
                    'YENİ MAÇ BAŞLAT',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, letterSpacing: 1.2),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _showCenterWarning(String message) {
    showDialog(
      context: context,
      barrierDismissible: false,
      barrierColor: Colors.black45,
      builder: (ctx) {
        Future.delayed(const Duration(milliseconds: 1500), () {
          if (ctx.mounted && Navigator.canPop(ctx)) {
            Navigator.pop(ctx);
          }
        });
        return Dialog(
          backgroundColor: Colors.transparent,
          elevation: 0,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
            decoration: BoxDecoration(
              color: const Color(0xFF1E110A).withValues(alpha: 0.95),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFD4AF37), width: 1.5),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFFD4AF37).withValues(alpha: 0.2),
                  blurRadius: 15,
                  spreadRadius: 2,
                )
              ],
            ),
            child: Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 16,
                fontWeight: FontWeight.w600,
                letterSpacing: 0.5,
              ),
            ),
          ),
        );
      },
    );
  }

  void _onHomePressed() {
    if (_state.winner != null) {
      Navigator.of(context).pop();
      return;
    }
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF2C190E),
        title: const Text('Ana Menüye Dön', style: TextStyle(color: Colors.white)),
        content: const Text('Devam eden bir maçınız var. Çıkmak istediğinize emin misiniz?', style: TextStyle(color: Colors.white70)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('İptal', style: TextStyle(color: Colors.grey)),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              Navigator.of(context).pop();
            },
            child: const Text('Çıkış', style: TextStyle(color: Colors.redAccent)),
          ),
        ],
      ),
    );
  }

  void _onRefreshPressed() {
    if (_state.winner != null) {
      _resetGame();
      return;
    }
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
            icon: const Icon(Icons.home, color: Color(0xFFD4AF37)),
            tooltip: 'Ana Menü',
            onPressed: _onHomePressed,
          ),
          IconButton(
            icon: const Icon(Icons.refresh, color: Color(0xFFD4AF37)),
            tooltip: 'Yeniden Başlat',
            onPressed: _onRefreshPressed,
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Top Compact Player HUD Bar (Moves player info out of the way to the top edges)
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: const Color(0xFF180F0A),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFD4AF37).withValues(alpha: 0.3), width: 1),
              ),
              child: Row(
                children: [
                  // Siyah Oyuncu Badge (Sol)
                  _buildCompactPlayerBadge(
                    player: PlayerType.black,
                    isCurrentTurn: _state.currentTurn == PlayerType.black,
                  ),

                  const Spacer(),

                  // Turn / Game Status Message (Orta)
                  Text(
                    _state.winner != null
                        ? '🏆 ${_state.winner!.displayName.toUpperCase()} KAZANDI!'
                        : (_state.currentTurn == PlayerType.white ? '🟢 SIRA BEYAZDA' : '🔴 SIRA SİYAHTA'),
                    style: TextStyle(
                      color: _state.winner != null ? const Color(0xFFD4AF37) : Colors.white70,
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                    ),
                  ),

                  const Spacer(),

                  // Beyaz Oyuncu Badge (Sağ)
                  _buildCompactPlayerBadge(
                    player: PlayerType.white,
                    isCurrentTurn: _state.currentTurn == PlayerType.white,
                  ),
                ],
              ),
            ),

            // Backgammon Board Canvas & Overlay (Fills Maximum Screen Height & Width!)
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                child: Center(
                  child: BoardWidget(
                    state: _state,
                    onPointTapped: _onPointTapped,
                    onBarTapped: _onBarTapped,
                    onBearOffTapped: _onBearOffTapped,
                    boardTheme: BoardThemeData.getById(widget.boardThemeId),
                    canRoll: _state.dice.isEmpty && (!widget.isVsAI || _state.currentTurn == PlayerType.white),
                    onRollPressed: _rollDice,
                    diceTheme: DiceThemeData.getById(widget.diceThemeId),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }



  Widget _buildCompactPlayerBadge({
    required PlayerType player,
    required bool isCurrentTurn,
  }) {
    bool isWhite = player == PlayerType.white;
    int offCount = _state.getOffCount(player);
    int barCount = _state.getBarCount(player);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: isCurrentTurn ? const Color(0xFF2C190E) : Colors.transparent,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isCurrentTurn ? const Color(0xFFD4AF37) : Colors.white24,
          width: isCurrentTurn ? 1.5 : 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 18,
            height: 18,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: isWhite ? Colors.white : Colors.black,
              border: Border.all(color: const Color(0xFFD4AF37), width: 1),
            ),
          ),
          const SizedBox(width: 6),
          Text(
            player.displayName,
            style: TextStyle(
              color: isCurrentTurn ? Colors.white : Colors.white70,
              fontWeight: isCurrentTurn ? FontWeight.bold : FontWeight.normal,
              fontSize: 12,
            ),
          ),
          if (barCount > 0) ...[
            const SizedBox(width: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: Colors.redAccent,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                'Kırık: $barCount',
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 10,
                ),
              ),
            ),
          ],
          const SizedBox(width: 8),
          Text(
            '🏆 $offCount/15',
            style: const TextStyle(
              color: Color(0xFFD4AF37),
              fontWeight: FontWeight.bold,
              fontSize: 11,
            ),
          ),
        ],
      ),
    );
  }
}
