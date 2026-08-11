import 'package:flutter/material.dart';
import '../models/board_theme.dart';

/// Luxury 3D Perspective Backgammon Board Painter
class BoardPainter extends CustomPainter {
  final int? selectedPointIndex;
  final List<int> validTargetIndices;
  final BoardThemeData themeData;

  BoardPainter({
    this.selectedPointIndex,
    this.validTargetIndices = const [],
    BoardThemeData? themeData,
  }) : themeData = themeData ?? BoardThemeData.presets.first;

  @override
  void paint(Canvas canvas, Size size) {
    final double width = size.width;
    final double height = size.height;
    const double barWidth = 48.0;
    final double halfWidth = (width - barWidth) / 2;
    const double frameBorder = 14.0;

    // 1. Embossed 3D Outer Mahogany Frame (Kabartmalı Dış Çerçeve)
    final Rect fullRect = Rect.fromLTWH(0, 0, width, height);
    final RRect boardFrame = RRect.fromRectAndRadius(fullRect, const Radius.circular(18));

    // Outer Frame Shadow
    final Paint outerShadow = Paint()
      ..color = Colors.black.withValues(alpha: 0.7)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 12);
    canvas.drawRRect(boardFrame.shift(const Offset(0, 6)), outerShadow);

    // Frame Texture Gradient
    final Paint framePaint = Paint()
      ..shader = LinearGradient(
        colors: [
          themeData.frameColor.withValues(alpha: 0.9),
          themeData.frameColor,
          themeData.frameColor.withValues(alpha: 0.7),
        ],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ).createShader(fullRect);

    canvas.drawRRect(boardFrame, framePaint);

    // 3D Frame Outer Bevel Lines
    final Paint bevelLight = Paint()
      ..color = themeData.accentColor.withValues(alpha: 0.6)
      ..strokeWidth = 2.5
      ..style = PaintingStyle.stroke;
    canvas.drawRRect(boardFrame, bevelLight);

    // 2. Recessed Inner Playing Field Floor (Gömülü İç Oyun Yüzeyi)
    final Rect innerRect = Rect.fromLTWH(
      frameBorder,
      frameBorder,
      width - (frameBorder * 2),
      height - (frameBorder * 2),
    );
    final RRect innerFrame = RRect.fromRectAndRadius(innerRect, const Radius.circular(10));

    // Inner Surface Base Floor Color
    final Paint floorPaint = Paint()..color = themeData.boardBg;
    canvas.drawRRect(innerFrame, floorPaint);

    // Inner Shadow (Gömülme hissi veren İç Gölge)
    final Paint innerShadowTopLeft = Paint()
      ..shader = LinearGradient(
        colors: [Colors.black.withValues(alpha: 0.85), Colors.transparent],
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
      ).createShader(Rect.fromLTWH(frameBorder, frameBorder, width, 24));
    canvas.drawRect(Rect.fromLTWH(frameBorder, frameBorder, width - frameBorder * 2, 20), innerShadowTopLeft);

    final Paint innerShadowLeft = Paint()
      ..shader = LinearGradient(
        colors: [Colors.black.withValues(alpha: 0.75), Colors.transparent],
        begin: Alignment.centerLeft,
        end: Alignment.centerRight,
      ).createShader(Rect.fromLTWH(frameBorder, frameBorder, 24, height));
    canvas.drawRect(Rect.fromLTWH(frameBorder, frameBorder, 20, height - frameBorder * 2), innerShadowLeft);

    // 3. Draw 24 Triangles (Points) - Exact Termination at Center Bar Edge!
    final double pointWidth = (halfWidth - frameBorder) / 6;
    final double triangleHeight = height * 0.42;

    for (int i = 0; i < 24; i++) {
      bool isDark = i % 2 == 0;
      bool isValidTarget = validTargetIndices.contains(i);
      bool isSelected = selectedPointIndex == i;

      Path path = Path();
      double left = 0;
      bool isTop = i >= 12;

      // Exact Left & Right Point Positioning
      if (i >= 0 && i <= 5) {
        left = halfWidth + frameBorder / 2 + (5 - i) * pointWidth;
        path.moveTo(left, height - frameBorder);
        path.lineTo(left + pointWidth / 2, height - frameBorder - triangleHeight);
        path.lineTo(left + pointWidth, height - frameBorder);
      } else if (i >= 6 && i <= 11) {
        left = frameBorder + (11 - i) * pointWidth;
        path.moveTo(left, height - frameBorder);
        path.lineTo(left + pointWidth / 2, height - frameBorder - triangleHeight);
        path.lineTo(left + pointWidth, height - frameBorder);
      } else if (i >= 12 && i <= 17) {
        left = frameBorder + (i - 12) * pointWidth;
        path.moveTo(left, frameBorder);
        path.lineTo(left + pointWidth / 2, frameBorder + triangleHeight);
        path.lineTo(left + pointWidth, frameBorder);
      } else if (i >= 18 && i <= 23) {
        left = halfWidth + frameBorder / 2 + (i - 18) * pointWidth;
        path.moveTo(left, frameBorder);
        path.lineTo(left + pointWidth / 2, frameBorder + triangleHeight);
        path.lineTo(left + pointWidth, frameBorder);
      }
      path.close();

      // Point Fill Gradient & Inlaid Surface Texture
      final Rect pointBounds = path.getBounds();
      final Paint pPaint = Paint()
        ..shader = LinearGradient(
          colors: isSelected
              ? [const Color(0xFF66BB6A), const Color(0xFF2E7D32)]
              : isValidTarget
                  ? [const Color(0xFF00E676), const Color(0xFF00897B)]
                  : isDark
                      ? [themeData.pointDark, themeData.pointDark.withValues(alpha: 0.7)]
                      : [themeData.pointLight, themeData.pointLight.withValues(alpha: 0.7)],
          begin: isTop ? Alignment.topCenter : Alignment.bottomCenter,
          end: isTop ? Alignment.bottomCenter : Alignment.topCenter,
        ).createShader(pointBounds)
        ..style = PaintingStyle.fill;

      canvas.drawPath(path, pPaint);

      // Inlaid Bevel Outline for 3D Cutout Feeling
      final Paint pointBevel = Paint()
        ..color = isSelected
            ? Colors.amberAccent
            : isValidTarget
                ? Colors.lightGreenAccent
                : (isDark ? const Color(0xFF4A100B) : const Color(0xFF806E48))
        ..style = PaintingStyle.stroke
        ..strokeWidth = isSelected || isValidTarget ? 2.5 : 1.2;

      canvas.drawPath(path, pointBevel);
    }

    // 4. PHYSICAL 3D RAISED CENTER BAR / DIVIDER (Orta Yükseltilmiş Ahşap Çıta)
    final double barLeft = halfWidth;
    final Rect barRect = Rect.fromLTWH(barLeft, frameBorder - 2, barWidth, height - (frameBorder * 2) + 4);

    // Drop Shadows from Raised Center Beam onto Left & Right Playing Floors
    final Paint shadowLeft = Paint()
      ..shader = LinearGradient(
        colors: [Colors.black.withValues(alpha: 0.8), Colors.transparent],
        begin: Alignment.centerRight,
        end: Alignment.centerLeft,
      ).createShader(Rect.fromLTWH(barLeft - 14, frameBorder, 14, height - frameBorder * 2));
    canvas.drawRect(Rect.fromLTWH(barLeft - 14, frameBorder, 14, height - frameBorder * 2), shadowLeft);

    final Paint shadowRight = Paint()
      ..shader = LinearGradient(
        colors: [Colors.black.withValues(alpha: 0.8), Colors.transparent],
        begin: Alignment.centerLeft,
        end: Alignment.centerRight,
      ).createShader(Rect.fromLTWH(barLeft + barWidth, frameBorder, 14, height - frameBorder * 2));
    canvas.drawRect(Rect.fromLTWH(barLeft + barWidth, frameBorder, 14, height - frameBorder * 2), shadowRight);

    // 3D Raised Beam Top Surface (Lighter Mahogany)
    final Paint barTopPaint = Paint()
      ..shader = const LinearGradient(
        colors: [
          Color(0xFF6E3E20), // Left highlight bevel
          Color(0xFF4E2A14), // Center wood
          Color(0xFF3B1E0D), // Right shadow edge
        ],
        stops: [0.0, 0.5, 1.0],
      ).createShader(barRect);

    canvas.drawRect(barRect, barTopPaint);

    // 3D Bevel Highlights for Raised Beam Elevation
    final Paint beamHighlight = Paint()
      ..color = const Color(0xFF9E5C32)
      ..strokeWidth = 2.0
      ..style = PaintingStyle.stroke;
    canvas.drawLine(Offset(barLeft, frameBorder), Offset(barLeft, height - frameBorder), beamHighlight);

    final Paint beamShadow = Paint()
      ..color = const Color(0xFF1F0E05)
      ..strokeWidth = 2.0
      ..style = PaintingStyle.stroke;
    canvas.drawLine(Offset(barLeft + barWidth, frameBorder), Offset(barLeft + barWidth, height - frameBorder), beamShadow);

    // Brass Metal Hinges / Inlay Clasps with 3D Bevel & Rivets
    _drawBrassHinge(canvas, Offset(barLeft + barWidth / 2, height / 3.8), barWidth - 10);
    _drawBrassHinge(canvas, Offset(barLeft + barWidth / 2, height - height / 3.8), barWidth - 10);

    // Center BAR Label Engraving
    final TextPainter tp = TextPainter(
      text: const TextSpan(
        text: 'BAR',
        style: TextStyle(
          color: Color(0xFFD4AF37),
          fontSize: 12,
          fontWeight: FontWeight.w900,
          letterSpacing: 2.5,
          shadows: [
            Shadow(color: Colors.black, blurRadius: 4, offset: Offset(1, 1)),
          ],
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    tp.paint(canvas, Offset(barLeft + (barWidth - tp.width) / 2, height / 2 - tp.height / 2));

    // Brass Corner Protectors on Frame
    _drawCornerBrass(canvas, const Offset(6, 6), size);
    _drawCornerBrass(canvas, Offset(width - 6, 6), size);
    _drawCornerBrass(canvas, Offset(6, height - 6), size);
    _drawCornerBrass(canvas, Offset(width - 6, height - 6), size);
  }

  void _drawBrassHinge(Canvas canvas, Offset center, double width) {
    final Rect hingeRect = Rect.fromCenter(center: center, width: width, height: 12);
    final Paint hingePaint = Paint()
      ..shader = const LinearGradient(
        colors: [Color(0xFFFFF3CD), Color(0xFFD4AF37), Color(0xFF8B6B1B), Color(0xFFD4AF37)],
      ).createShader(hingeRect);

    canvas.drawRRect(RRect.fromRectAndRadius(hingeRect, const Radius.circular(3)), hingePaint);

    final Paint rivetPaint = Paint()..color = const Color(0xFF3B2A08);
    canvas.drawCircle(Offset(center.dx - width / 3, center.dy), 1.8, rivetPaint);
    canvas.drawCircle(Offset(center.dx + width / 3, center.dy), 1.8, rivetPaint);
  }

  void _drawCornerBrass(Canvas canvas, Offset center, Size boardSize) {
    final Paint brassPaint = Paint()..color = const Color(0xFFD4AF37);
    canvas.drawCircle(center, 4.0, brassPaint);
  }

  @override
  bool shouldRepaint(covariant BoardPainter oldDelegate) {
    return oldDelegate.selectedPointIndex != selectedPointIndex ||
        oldDelegate.validTargetIndices != validTargetIndices;
  }
}
