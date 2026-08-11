import 'dart:math';
import 'package:flutter/material.dart';
import '../models/board_theme.dart';

/// Clean, Reliable 2D Backgammon Dice Widget
class DiceWidget extends StatefulWidget {
  final List<int> diceValues;
  final List<int> remainingDice;
  final bool isRolling;
  final VoidCallback? onRollPressed;
  final bool canRoll;
  final DiceThemeData? diceTheme;

  const DiceWidget({
    super.key,
    required this.diceValues,
    required this.remainingDice,
    this.isRolling = false,
    this.onRollPressed,
    this.canRoll = true,
    this.diceTheme,
  });

  @override
  State<DiceWidget> createState() => _DiceWidgetState();
}

class _DiceWidgetState extends State<DiceWidget> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _rotationAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 600),
      vsync: this,
    );
    _rotationAnimation = Tween<double>(begin: 0, end: 2 * pi).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOutBack),
    );
  }

  @override
  void didUpdateWidget(covariant DiceWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isRolling && !oldWidget.isRolling) {
      _controller.forward(from: 0.0);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.diceValues.isEmpty && !widget.isRolling) {
      return widget.canRoll
          ? ElevatedButton.icon(
              onPressed: widget.onRollPressed,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFD4AF37),
                foregroundColor: Colors.black,
                padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(24),
                ),
                elevation: 6,
              ),
              icon: const Icon(Icons.casino, size: 24),
              label: const Text(
                'ZAR AT',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.2,
                ),
              ),
            )
          : const SizedBox.shrink();
    }

    int val1 = widget.diceValues.isNotEmpty ? widget.diceValues[0] : 3;
    int val2 = widget.diceValues.length >= 2
        ? widget.diceValues[1]
        : (widget.diceValues.isNotEmpty ? widget.diceValues[0] : 4);

    double opacity1 = widget.diceValues.isNotEmpty ? _calculateDieOpacity(0) : 1.0;
    double opacity2 = widget.diceValues.isNotEmpty ? _calculateDieOpacity(1) : 1.0;

    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Transform.rotate(
          angle: _controller.isAnimating ? _rotationAnimation.value : 0,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildDie(value: val1, opacity: opacity1),
              const SizedBox(width: 12),
              _buildDie(value: val2, opacity: opacity2),
            ],
          ),
        );
      },
    );
  }

  double _calculateDieOpacity(int dieIndex) {
    bool isDouble = widget.diceValues.length == 4;
    int totalMoves = widget.diceValues.length;
    int remainingCount = widget.remainingDice.length;
    int usedMoves = totalMoves - remainingCount;

    if (isDouble) {
      if (dieIndex == 0) {
        if (usedMoves >= 2) return 0.20;
        if (usedMoves == 1) return 0.55;
        return 1.0;
      } else {
        if (usedMoves >= 4) return 0.20;
        if (usedMoves == 3) return 0.55;
        return 1.0;
      }
    } else {
      int val = widget.diceValues[dieIndex];
      int availableCount = widget.remainingDice.where((d) => d == val).length;
      int instanceIdx = 0;
      for (int i = 0; i < dieIndex; i++) {
        if (widget.diceValues[i] == val) instanceIdx++;
      }
      bool isUsed = instanceIdx >= availableCount;
      return isUsed ? 0.25 : 1.0;
    }
  }

  Widget _buildDie({required int value, required double opacity}) {
    final theme = widget.diceTheme ?? DiceThemeData.presets.first;

    return Opacity(
      opacity: opacity,
      child: Container(
        width: 44,
        height: 44,
        decoration: BoxDecoration(
          color: theme.diceBg,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: theme.borderColor, width: 2),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.4),
              blurRadius: 4,
              offset: const Offset(2, 3),
            ),
          ],
        ),
        child: Center(
          child: _buildDieFace(value, theme.dotColor),
        ),
      ),
    );
  }

  Widget _buildDieFace(int val, Color dotColor) {
    final Map<int, List<Alignment>> dotPositions = {
      1: [Alignment.center],
      2: [const Alignment(-0.55, -0.55), const Alignment(0.55, 0.55)],
      3: [const Alignment(-0.55, -0.55), Alignment.center, const Alignment(0.55, 0.55)],
      4: [
        const Alignment(-0.55, -0.55),
        const Alignment(0.55, -0.55),
        const Alignment(-0.55, 0.55),
        const Alignment(0.55, 0.55)
      ],
      5: [
        const Alignment(-0.55, -0.55),
        const Alignment(0.55, -0.55),
        Alignment.center,
        const Alignment(-0.55, 0.55),
        const Alignment(0.55, 0.55)
      ],
      6: [
        const Alignment(-0.55, -0.65),
        const Alignment(0.55, -0.65),
        const Alignment(-0.55, 0),
        const Alignment(0.55, 0),
        const Alignment(-0.55, 0.65),
        const Alignment(0.55, 0.65)
      ],
    };

    List<Alignment> alignments = dotPositions[val] ?? [Alignment.center];

    return Stack(
      children: alignments.map((align) {
        return Align(
          alignment: align,
          child: Container(
            width: 7,
            height: 7,
            decoration: BoxDecoration(
              color: dotColor,
              shape: BoxShape.circle,
            ),
          ),
        );
      }).toList(),
    );
  }
}
