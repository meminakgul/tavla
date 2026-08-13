import 'dart:math';
import 'package:flutter/material.dart';
import '../models/board_theme.dart';

/// Vector3 math structure for True 3D Software Engine
class Vector3D {
  final double x;
  final double y;
  final double z;

  const Vector3D(this.x, this.y, this.z);

  Vector3D rotate(double rx, double ry, double rz) {
    double cx = cos(rx), sx = sin(rx);
    double y1 = y * cx - z * sx;
    double z1 = y * sx + z * cx;

    double cy = cos(ry), sy = sin(ry);
    double x2 = x * cy + z1 * sy;
    double z2 = -x * sy + z1 * cy;

    double cz = cos(rz), sz = sin(rz);
    double x3 = x2 * cz - y1 * sz;
    double y3 = x2 * sz + y1 * cz;

    return Vector3D(x3, y3, z2);
  }
}

class _CubeFaceInfo {
  final List<int> idx;
  final Vector3D norm;
  final int val;

  const _CubeFaceInfo({
    required this.idx,
    required this.norm,
    required this.val,
  });
}

class _RenderableFace {
  final _CubeFaceInfo face;
  final double avgZ;
  final double lightInt;

  const _RenderableFace({
    required this.face,
    required this.avgZ,
    required this.lightInt,
  });
}

/// Physical 6-Faced True 3D Software Cube Painter
class True3DCubePainter extends CustomPainter {
  final double cubeSize;
  final double rotX;
  final double rotY;
  final double rotZ;
  final double zHeight;
  final double opacity;
  final DiceThemeData diceTheme;

  True3DCubePainter({
    required this.cubeSize,
    required this.rotX,
    required this.rotY,
    required this.rotZ,
    required this.zHeight,
    required this.opacity,
    required this.diceTheme,
  });

  @override
  void paint(Canvas canvas, Size size) {
    if (opacity <= 0.01) return;

    final Offset center = Offset(size.width / 2, size.height / 2);
    final double s = cubeSize / 2.2;

    // 1. 8 Corner Vertices of 3D Cube
    final List<Vector3D> vertices = [
      Vector3D(-s, -s, -s), // 0
      Vector3D( s, -s, -s), // 1
      Vector3D( s,  s, -s), // 2
      Vector3D(-s,  s, -s), // 3
      Vector3D(-s, -s,  s), // 4
      Vector3D( s, -s,  s), // 5
      Vector3D( s,  s,  s), // 6
      Vector3D(-s,  s,  s), // 7
    ];

    // 2. Rotate all vertices in 3D space
    final List<Vector3D> rotated = vertices.map((v) => v.rotate(rotX, rotY, rotZ)).toList();

    // 3. 6 Polygonal Cube Faces mapped to standard Dice Values 1..6
    const List<_CubeFaceInfo> faces = [
      _CubeFaceInfo(idx: [4, 5, 6, 7], norm: Vector3D( 0,  0,  1), val: 1), // Front (+Z)
      _CubeFaceInfo(idx: [1, 0, 3, 2], norm: Vector3D( 0,  0, -1), val: 6), // Back (-Z)
      _CubeFaceInfo(idx: [0, 1, 5, 4], norm: Vector3D( 0, -1,  0), val: 2), // Top (-Y)
      _CubeFaceInfo(idx: [7, 6, 2, 3], norm: Vector3D( 0,  1,  0), val: 5), // Bottom (+Y)
      _CubeFaceInfo(idx: [5, 1, 2, 6], norm: Vector3D( 1,  0,  0), val: 3), // Right (+X)
      _CubeFaceInfo(idx: [0, 4, 7, 3], norm: Vector3D(-1,  0,  0), val: 4), // Left (-X)
    ];

    const Vector3D lightDir = Vector3D(-0.4, -0.6, 0.7);
    final List<_RenderableFace> renderable = [];

    // 4. Backface Culling & Diffuse Directional Lighting
    for (final f in faces) {
      final Vector3D rNorm = f.norm.rotate(rotX, rotY, rotZ);
      if (rNorm.z > 0.05) {
        final double avgZ = (rotated[f.idx[0]].z +
                rotated[f.idx[1]].z +
                rotated[f.idx[2]].z +
                rotated[f.idx[3]].z) /
            4;
        final double dotLight = rNorm.x * lightDir.x + rNorm.y * lightDir.y + rNorm.z * lightDir.z;
        final double lightInt = (0.55 + dotLight * 0.45).clamp(0.40, 1.0);
        renderable.add(_RenderableFace(face: f, avgZ: avgZ, lightInt: lightInt));
      }
    }

    // Sort visible faces by depth (Painter's Algorithm)
    renderable.sort((a, b) => a.avgZ.compareTo(b.avgZ));

    // 5. Perspective Focal Projection
    const double focal = 160.0;
    Offset project(Vector3D v) {
      final double perspectiveScale = focal / (focal + v.z + 100.0);
      return Offset(
        center.dx + v.x * perspectiveScale,
        center.dy - zHeight + v.y * perspectiveScale,
      );
    }

    // 6. Dynamic Grounded Bounce Shadow
    final bool isGrounded = zHeight < 0.5;
    final double shadowScale = isGrounded ? 1.0 : (1.0 - zHeight / 140.0).clamp(0.4, 1.2);
    final double shadowOpacity = (isGrounded ? 0.75 : (0.75 - zHeight / 160.0).clamp(0.15, 0.75)) * opacity;
    final double shadowOffsetY = isGrounded ? 14.0 : (14.0 + zHeight * 0.35);

    final Paint shadowPaint = Paint()
      ..color = Colors.black.withValues(alpha: shadowOpacity)
      ..style = PaintingStyle.fill;

    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(center.dx + zHeight * 0.1, center.dy + shadowOffsetY),
        width: cubeSize * 0.96 * shadowScale,
        height: cubeSize * 0.36 * shadowScale,
      ),
      shadowPaint,
    );

    // 7. Render Polygons & 3D Pips
    final Paint faceFillPaint = Paint()..style = PaintingStyle.fill;
    final Paint borderPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.8
      ..color = diceTheme.borderColor.withValues(alpha: opacity);

    final Paint pipPaint = Paint()
      ..style = PaintingStyle.fill
      ..color = diceTheme.dotColor.withValues(alpha: opacity);

    for (final r in renderable) {
      final List<Offset> pts = r.face.idx.map((i) => project(rotated[i])).toList();

      final Path polyPath = Path()
        ..moveTo(pts[0].dx, pts[0].dy)
        ..lineTo(pts[1].dx, pts[1].dy)
        ..lineTo(pts[2].dx, pts[2].dy)
        ..lineTo(pts[3].dx, pts[3].dy)
        ..close();

      // Shaded face color according to diffuse light intensity
      final Color shadedBg = Color.lerp(Colors.black, diceTheme.diceBg, r.lightInt)!;
      faceFillPaint.color = shadedBg.withValues(alpha: opacity);

      canvas.drawPath(polyPath, faceFillPaint);
      canvas.drawPath(polyPath, borderPaint);

      // Draw 3D projected pips on face
      _draw3DPips(canvas, pts, r.face.val, pipPaint);
    }
  }

  void _draw3DPips(Canvas canvas, List<Offset> quad, int val, Paint pipPaint) {
    final Offset quadCenter = Offset(
      (quad[0].dx + quad[1].dx + quad[2].dx + quad[3].dx) / 4,
      (quad[0].dy + quad[1].dy + quad[2].dy + quad[3].dy) / 4,
    );

    final Offset uVec = Offset(
      (quad[1].dx - quad[0].dx) * 0.5,
      (quad[1].dy - quad[0].dy) * 0.5,
    );
    final Offset vVec = Offset(
      (quad[3].dx - quad[0].dx) * 0.5,
      (quad[3].dy - quad[0].dy) * 0.5,
    );

    const Map<int, List<List<double>>> pipOffsets = {
      1: [[0, 0]],
      2: [[-0.55, -0.55], [0.55, 0.55]],
      3: [[-0.55, -0.55], [0, 0], [0.55, 0.55]],
      4: [[-0.55, -0.55], [0.55, -0.55], [-0.55, 0.55], [0.55, 0.55]],
      5: [[-0.55, -0.55], [0.55, -0.55], [0, 0], [-0.55, 0.55], [0.55, 0.55]],
      6: [[-0.55, -0.65], [0.55, -0.65], [-0.55, 0], [0.55, 0], [-0.55, 0.65], [0.55, 0.65]],
    };

    final List<List<double>> offsets = pipOffsets[val] ?? [[0, 0]];
    final double quadWidth = (quad[1] - quad[0]).distance;
    final double r = (quadWidth * 0.08).clamp(2.0, 4.8);

    for (final off in offsets) {
      final double px = quadCenter.dx + uVec.dx * off[0] + vVec.dx * off[1];
      final double py = quadCenter.dy + uVec.dy * off[0] + vVec.dy * off[1];
      canvas.drawCircle(Offset(px, py), r, pipPaint);
    }
  }

  @override
  bool shouldRepaint(covariant True3DCubePainter oldDelegate) {
    return oldDelegate.rotX != rotX ||
        oldDelegate.rotY != rotY ||
        oldDelegate.rotZ != rotZ ||
        oldDelegate.zHeight != zHeight ||
        oldDelegate.opacity != opacity ||
        oldDelegate.diceTheme != diceTheme;
  }
}

/// Premium True 3D Backgammon Dice Widget
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
  late Animation<double> _animation;
  final Random _rng = Random();

  double _rotSpeedX1 = 0.0;
  double _rotSpeedY1 = 0.0;
  double _rotSpeedX2 = 0.0;
  double _rotSpeedY2 = 0.0;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 1000),
      vsync: this,
    );
    _animation = CurvedAnimation(
      parent: _controller,
      curve: Curves.linear,
    );
    _generatePhysicsSpeeds();
  }

  void _generatePhysicsSpeeds() {
    _rotSpeedX1 = (3.5 + _rng.nextDouble() * 2.5) * pi;
    _rotSpeedY1 = (4.5 + _rng.nextDouble() * 2.5) * pi;
    _rotSpeedX2 = -(3.5 + _rng.nextDouble() * 2.5) * pi;
    _rotSpeedY2 = -(4.5 + _rng.nextDouble() * 2.5) * pi;
  }

  @override
  void didUpdateWidget(covariant DiceWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isRolling && !oldWidget.isRolling) {
      _generatePhysicsSpeeds();
      _controller.forward(from: 0.0);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  List<double> _getFaceAngles(int val) {
    switch (val) {
      case 1: return [0.0, 0.0];
      case 6: return [pi, 0.0];
      case 2: return [-pi / 2, 0.0];
      case 5: return [pi / 2, 0.0];
      case 3: return [0.0, -pi / 2];
      case 4: return [0.0, pi / 2];
      default: return [0.0, 0.0];
    }
  }

  @override
  Widget build(BuildContext context) {
    // 1. When no dice exist & not rolling -> Show "ZAR AT" button
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
                shadowColor: const Color(0xFFD4AF37).withValues(alpha: 0.5),
              ),
              icon: const Icon(Icons.casino, size: 24),
              label: const Text(
                'ZAR AT',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w900,
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

    List<double> targetAngles1 = _getFaceAngles(val1);
    List<double> targetAngles2 = _getFaceAngles(val2);

    final theme = widget.diceTheme ?? DiceThemeData.presets.first;

    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        double t = widget.isRolling ? _animation.value : 1.0;

        // Bouncing Z-Height calculation
        double zH1 = 0.0;
        double zH2 = 0.0;
        if (widget.isRolling) {
          if (t < 0.45) {
            zH1 = sin((t / 0.45) * pi) * 34.0;
            zH2 = sin((t / 0.45) * pi) * 38.0;
          } else if (t < 0.75) {
            zH1 = sin(((t - 0.45) / 0.30) * pi) * 11.0;
            zH2 = sin(((t - 0.45) / 0.30) * pi) * 14.0;
          } else if (t < 0.95) {
            zH1 = sin(((t - 0.75) / 0.20) * pi) * 3.0;
            zH2 = sin(((t - 0.75) / 0.20) * pi) * 4.0;
          }
        }

        // 3D Rotations calculation
        double rotX1, rotY1, rotX2, rotY2;
        if (!widget.isRolling || t >= 1.0) {
          rotX1 = targetAngles1[0];
          rotY1 = targetAngles1[1];
          rotX2 = targetAngles2[0];
          rotY2 = targetAngles2[1];
        } else if (t < 0.75) {
          double subT = t / 0.75;
          rotX1 = subT * _rotSpeedX1;
          rotY1 = subT * _rotSpeedY1;
          rotX2 = subT * _rotSpeedX2;
          rotY2 = subT * _rotSpeedY2;
        } else {
          double subT = (t - 0.75) / 0.25;
          double easeSubT = subT * subT; // quadratic ease in landing

          double curX1 = 0.75 * _rotSpeedX1;
          double curY1 = 0.75 * _rotSpeedY1;
          double finalX1 = targetAngles1[0] + (curX1 / (2 * pi)).round() * (2 * pi);
          double finalY1 = targetAngles1[1] + (curY1 / (2 * pi)).round() * (2 * pi);
          rotX1 = curX1 + (finalX1 - curX1) * easeSubT;
          rotY1 = curY1 + (finalY1 - curY1) * easeSubT;

          double curX2 = 0.75 * _rotSpeedX2;
          double curY2 = 0.75 * _rotSpeedY2;
          double finalX2 = targetAngles2[0] + (curX2 / (2 * pi)).round() * (2 * pi);
          double finalY2 = targetAngles2[1] + (curY2 / (2 * pi)).round() * (2 * pi);
          rotX2 = curX2 + (finalX2 - curX2) * easeSubT;
          rotY2 = curY2 + (finalY2 - curY2) * easeSubT;
        }

        return Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            CustomPaint(
              size: const Size(60, 60),
              painter: True3DCubePainter(
                cubeSize: 44.0,
                rotX: rotX1,
                rotY: rotY1,
                rotZ: 0.0,
                zHeight: zH1,
                opacity: opacity1,
                diceTheme: theme,
              ),
            ),
            const SizedBox(width: 16),
            CustomPaint(
              size: const Size(60, 60),
              painter: True3DCubePainter(
                cubeSize: 44.0,
                rotX: rotX2,
                rotY: rotY2,
                rotZ: 0.0,
                zHeight: zH2,
                opacity: opacity2,
                diceTheme: theme,
              ),
            ),
          ],
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
}
