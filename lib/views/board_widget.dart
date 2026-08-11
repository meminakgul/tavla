import 'package:flutter/material.dart';
import '../models/board_state.dart';
import '../models/board_theme.dart';
import '../models/player.dart';
import '../models/point.dart';
import 'board_painter.dart';

/// Premium 2.5D Backgammon Board & Crisp Checkers Widget
class BoardWidget extends StatelessWidget {
  final BoardState state;
  final Function(int pointIndex) onPointTapped;
  final Function(PlayerType player) onBarTapped;
  final Function() onBearOffTapped;
  final BoardThemeData? boardTheme;

  const BoardWidget({
    super.key,
    required this.state,
    required this.onPointTapped,
    required this.onBarTapped,
    required this.onBearOffTapped,
    this.boardTheme,
  });

  @override
  Widget build(BuildContext context) {
    List<int> validTargetIndices = [];
    if (state.selectedPoint != null) {
      validTargetIndices = state.validMoves
          .where((m) => m.fromIndex == state.selectedPoint)
          .map((m) => m.toIndex)
          .toList();
    }

    return AspectRatio(
      aspectRatio: 1.4, // Standard 2.5D Backgammon aspect ratio
      child: LayoutBuilder(
        builder: (context, constraints) {
          final width = constraints.maxWidth;
          final height = constraints.maxHeight;
          const double barWidth = 48.0;
          const double frameBorder = 14.0;
          final double halfWidth = (width - barWidth) / 2;
          final double pointWidth = (halfWidth - frameBorder) / 6;
          final double checkerSize = (pointWidth * 0.88).clamp(18.0, 38.0);

          return Stack(
            clipBehavior: Clip.none,
            children: [
              // 1. Premium 2.5D Custom Painted Board Surface (Crisp High-Res Canvas)
              Positioned.fill(
                child: CustomPaint(
                  painter: BoardPainter(
                    selectedPointIndex: state.selectedPoint,
                    validTargetIndices: validTargetIndices,
                    themeData: boardTheme,
                  ),
                ),
              ),

              // 2. Interactive Overlays & Stacked 2.5D Checkers for 24 Points
              for (int i = 0; i < 24; i++)
                _buildPointOverlay(
                  index: i,
                  width: width,
                  height: height,
                  halfWidth: halfWidth,
                  barWidth: barWidth,
                  frameBorder: frameBorder,
                  pointWidth: pointWidth,
                  checkerSize: checkerSize,
                ),

              // 3. Physical Raised BAR Checkers (Resting ON TOP of 3D Center Beam)
              _buildBarArea(
                width: width,
                height: height,
                halfWidth: halfWidth,
                barWidth: barWidth,
                frameBorder: frameBorder,
                checkerSize: checkerSize,
              ),

              // 4. Bearing Off Area (Right Outer Rim)
              _buildBearOffArea(
                width: width,
                height: height,
                checkerSize: checkerSize,
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildPointOverlay({
    required int index,
    required double width,
    required double height,
    required double halfWidth,
    required double barWidth,
    required double frameBorder,
    required double pointWidth,
    required double checkerSize,
  }) {
    double left = 0;
    bool isTop = index >= 12;

    // Physical Coordinate Boundaries: Sol vs Sağ Board
    if (index >= 0 && index <= 5) {
      left = halfWidth + barWidth + (5 - index) * pointWidth;
    } else if (index >= 6 && index <= 11) {
      left = frameBorder + (11 - index) * pointWidth;
    } else if (index >= 12 && index <= 17) {
      left = frameBorder + (index - 12) * pointWidth;
    } else if (index >= 18 && index <= 23) {
      left = halfWidth + barWidth + (index - 18) * pointWidth;
    }

    PointState point = state.points[index];
    bool isSelected = state.selectedPoint == index;
    bool isValidTarget = state.selectedPoint != null &&
        state.validMoves.any((m) => m.fromIndex == state.selectedPoint && m.toIndex == index);

    return Positioned(
      left: left,
      top: isTop ? frameBorder : null,
      bottom: !isTop ? frameBorder : null,
      width: pointWidth,
      height: height * 0.44,
      child: DragTarget<int>(
        onWillAcceptWithDetails: (details) {
          int from = details.data;
          return state.validMoves.any((m) => m.fromIndex == from && m.toIndex == index);
        },
        onAcceptWithDetails: (details) {
          int from = details.data;
          if (state.selectedPoint != from) {
            onPointTapped(from);
          }
          onPointTapped(index);
        },
        builder: (context, candidateData, rejectedData) {
          bool isHovered = candidateData.isNotEmpty;
          return GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: () => onPointTapped(index),
            child: Container(
              decoration: BoxDecoration(
                color: isHovered
                    ? Colors.lightGreenAccent.withValues(alpha: 0.40)
                    : isSelected
                        ? Colors.amber.withValues(alpha: 0.20)
                        : isValidTarget
                            ? Colors.greenAccent.withValues(alpha: 0.25)
                            : Colors.transparent,
                borderRadius: BorderRadius.vertical(
                  top: isTop ? Radius.zero : const Radius.circular(8),
                  bottom: isTop ? const Radius.circular(8) : Radius.zero,
                ),
              ),
              child: Column(
                mainAxisAlignment: isTop ? MainAxisAlignment.start : MainAxisAlignment.end,
                children: _buildCheckersStack(point, checkerSize, isTop, index),
              ),
            ),
          );
        },
      ),
    );
  }

  List<Widget> _buildCheckersStack(PointState point, double checkerSize, bool isTop, int pointIndex) {
    if (point.isEmpty) return [];

    int count = point.checkersCount;
    int displayCount = count > 5 ? 5 : count;

    List<Widget> checkers = [];
    for (int i = 0; i < displayCount; i++) {
      bool isLast = i == displayCount - 1;
      int badgeCount = (isLast && count > 5) ? count : 0;
      bool canDrag = isLast && point.owner == state.currentTurn;

      Widget checkerWidget = _build25DCheckerWidget(
        owner: point.owner!,
        size: checkerSize,
        badgeCount: badgeCount,
      );

      if (canDrag) {
        checkers.add(
          Draggable<int>(
            data: pointIndex,
            onDragStarted: () {
              if (state.selectedPoint != pointIndex) {
                onPointTapped(pointIndex);
              }
            },
            feedback: Material(
              color: Colors.transparent,
              child: _build25DCheckerWidget(
                owner: point.owner!,
                size: checkerSize * 1.15,
                badgeCount: badgeCount,
              ),
            ),
            childWhenDragging: Opacity(
              opacity: 0.35,
              child: checkerWidget,
            ),
            child: checkerWidget,
          ),
        );
      } else {
        checkers.add(checkerWidget);
      }
    }

    return checkers;
  }

  Widget _buildBarArea({
    required double width,
    required double height,
    required double halfWidth,
    required double barWidth,
    required double frameBorder,
    required double checkerSize,
  }) {
    bool whiteBarSelected = state.selectedPoint == -1;
    bool blackBarSelected = state.selectedPoint == 24;

    bool canDragWhite = state.whiteBar > 0 && state.currentTurn == PlayerType.white;
    bool canDragBlack = state.blackBar > 0 && state.currentTurn == PlayerType.black;

    Widget whiteBarChecker = state.whiteBar > 0
        ? _build25DCheckerWidget(
            owner: PlayerType.white,
            size: checkerSize,
            badgeCount: state.whiteBar,
          )
        : const SizedBox.shrink();

    Widget blackBarChecker = state.blackBar > 0
        ? _build25DCheckerWidget(
            owner: PlayerType.black,
            size: checkerSize,
            badgeCount: state.blackBar,
          )
        : const SizedBox.shrink();

    return Positioned(
      left: halfWidth,
      top: frameBorder,
      width: barWidth,
      height: height - (frameBorder * 2),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // White Bar
          GestureDetector(
            onTap: () => onBarTapped(PlayerType.white),
            child: Container(
              padding: const EdgeInsets.all(2),
              decoration: BoxDecoration(
                border: whiteBarSelected ? Border.all(color: Colors.amberAccent, width: 2.5) : null,
                shape: BoxShape.circle,
              ),
              child: canDragWhite
                  ? Draggable<int>(
                      data: 24,
                      onDragStarted: () => onBarTapped(PlayerType.white),
                      feedback: Material(
                        color: Colors.transparent,
                        child: _build25DCheckerWidget(
                          owner: PlayerType.white,
                          size: checkerSize * 1.15,
                          badgeCount: state.whiteBar,
                        ),
                      ),
                      childWhenDragging: Opacity(opacity: 0.35, child: whiteBarChecker),
                      child: whiteBarChecker,
                    )
                  : whiteBarChecker,
            ),
          ),

          // Black Bar
          GestureDetector(
            onTap: () => onBarTapped(PlayerType.black),
            child: Container(
              padding: const EdgeInsets.all(2),
              decoration: BoxDecoration(
                border: blackBarSelected ? Border.all(color: Colors.amberAccent, width: 2.5) : null,
                shape: BoxShape.circle,
              ),
              child: canDragBlack
                  ? Draggable<int>(
                      data: -1,
                      onDragStarted: () => onBarTapped(PlayerType.black),
                      feedback: Material(
                        color: Colors.transparent,
                        child: _build25DCheckerWidget(
                          owner: PlayerType.black,
                          size: checkerSize * 1.15,
                          badgeCount: state.blackBar,
                        ),
                      ),
                      childWhenDragging: Opacity(opacity: 0.35, child: blackBarChecker),
                      child: blackBarChecker,
                    )
                  : blackBarChecker,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBearOffArea({
    required double width,
    required double height,
    required double checkerSize,
  }) {
    bool canBearOff = state.validMoves.any((m) => m.isBearOff);

    return Positioned(
      right: 2,
      top: height * 0.35,
      height: height * 0.30,
      width: 28,
      child: DragTarget<int>(
        onWillAcceptWithDetails: (details) {
          int from = details.data;
          return state.validMoves.any((m) => m.fromIndex == from && m.isBearOff);
        },
        onAcceptWithDetails: (details) {
          int from = details.data;
          onPointTapped(from);
          onBearOffTapped();
        },
        builder: (context, candidateData, rejectedData) {
          bool isHovered = candidateData.isNotEmpty;
          return GestureDetector(
            onTap: onBearOffTapped,
            child: Container(
              decoration: BoxDecoration(
                color: isHovered
                    ? Colors.amberAccent.withValues(alpha: 0.60)
                    : canBearOff
                        ? Colors.amber.withValues(alpha: 0.35)
                        : Colors.black45,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: isHovered || canBearOff ? Colors.amberAccent : const Color(0xFF553311),
                  width: 2,
                ),
            boxShadow: canBearOff
                ? [
                    BoxShadow(
                      color: Colors.amberAccent.withValues(alpha: 0.4),
                      blurRadius: 8,
                    ),
                  ]
                : [],
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // White Bear Off Counter Badge
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Column(
                  children: [
                    Container(
                      width: 14,
                      height: 14,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: Colors.white,
                        border: Border.all(color: Colors.amber, width: 1),
                      ),
                    ),
                    Text(
                      '${state.whiteOff}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),

              Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.exit_to_app,
                    color: canBearOff ? Colors.amberAccent : Colors.white24,
                    size: 16,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'OFF',
                    style: TextStyle(
                      color: canBearOff ? Colors.amberAccent : Colors.white38,
                      fontSize: 9,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),

              // Black Bear Off Counter Badge
              Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Column(
                  children: [
                    Text(
                      '${state.blackOff}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Container(
                      width: 14,
                      height: 14,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: const Color(0xFF22130A),
                        border: Border.all(color: Colors.amber, width: 1),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      );
    },
  ),
);
  }

  /// Builds a High-Resolution Crisp 2.5D Tactile Checker Widget
  Widget _build25DCheckerWidget({
    required PlayerType owner,
    required double size,
    int badgeCount = 0,
  }) {
    bool isWhite = owner == PlayerType.white;

    return Container(
      width: size,
      height: size,
      margin: const EdgeInsets.symmetric(vertical: 0.5),
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          // Contact Ambient Occlusion Shadow
          Positioned(
            left: 1,
            bottom: -1,
            child: Container(
              width: size - 2,
              height: size * 0.40,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(size),
                color: Colors.black.withValues(alpha: 0.60),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.60),
                    blurRadius: 3,
                  ),
                ],
              ),
            ),
          ),

          // 2.5D Side Thickness Rim Edge
          Positioned(
            top: 2,
            child: Container(
              width: size,
              height: size,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isWhite ? const Color(0xFF9E9585) : const Color(0xFF150D07),
                border: Border.all(
                  color: isWhite ? const Color(0xFF7A7060) : const Color(0xFF0A0503),
                  width: 1.2,
                ),
              ),
            ),
          ),

          // 2.5D Crisp Top Disc Face
          Positioned(
            top: 0,
            child: Container(
              width: size,
              height: size,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: isWhite
                      ? [
                          const Color(0xFFFFFFFF), // Cream ivory center
                          const Color(0xFFEBE5D8), // Ivory main
                          const Color(0xFFC7BDA9), // Edge bevel
                        ]
                      : [
                          const Color(0xFF3A2417), // Rich ebony highlight
                          const Color(0xFF22130A), // Ebony main
                          const Color(0xFF0F0703), // Edge shadow
                        ],
                  center: const Alignment(-0.35, -0.35),
                  radius: 0.85,
                ),
                border: Border.all(
                  color: isWhite ? const Color(0xFFD4CBB8) : const Color(0xFF4A3222),
                  width: 1.5,
                ),
                boxShadow: [
                  BoxShadow(
                    color: isWhite ? Colors.white.withValues(alpha: 0.6) : Colors.amber.withValues(alpha: 0.15),
                    blurRadius: 2,
                    offset: const Offset(-1, -1),
                  ),
                ],
              ),
              child: Center(
                child: badgeCount > 0
                    ? Container(
                        padding: const EdgeInsets.all(3),
                        decoration: const BoxDecoration(
                          color: Color(0xFFD4AF37),
                          shape: BoxShape.circle,
                        ),
                        child: Text(
                          '$badgeCount',
                          style: TextStyle(
                            color: Colors.black,
                            fontWeight: FontWeight.w900,
                            fontSize: size * 0.38,
                          ),
                        ),
                      )
                    : Container(
                        width: size * 0.52,
                        height: size * 0.52,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: isWhite ? const Color(0xB3A69A82) : const Color(0x66D4AF37),
                            width: 1.5,
                          ),
                        ),
                      ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
