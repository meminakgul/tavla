import 'package:flutter/material.dart';
import '../models/board_theme.dart';

class CustomizationDialog extends StatefulWidget {
  final BoardThemeId currentBoardTheme;
  final DiceThemeId currentDiceTheme;
  final Function(BoardThemeId boardTheme, DiceThemeId diceTheme) onSave;

  const CustomizationDialog({
    super.key,
    required this.currentBoardTheme,
    required this.currentDiceTheme,
    required this.onSave,
  });

  @override
  State<CustomizationDialog> createState() => _CustomizationDialogState();
}

class _CustomizationDialogState extends State<CustomizationDialog> {
  late BoardThemeId _selectedBoard;
  late DiceThemeId _selectedDice;

  @override
  void initState() {
    super.initState();
    _selectedBoard = widget.currentBoardTheme;
    _selectedDice = widget.currentDiceTheme;
  }

  @override
  Widget build(BuildContext context) {
    final activeBoard = BoardThemeData.getById(_selectedBoard);
    final activeDice = DiceThemeData.getById(_selectedDice);

    return Dialog(
      backgroundColor: Colors.transparent,
      child: Container(
        constraints: const BoxConstraints(maxWidth: 520),
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: const Color(0xFF1B1109),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: const Color(0xFFD4AF37), width: 2),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.85),
              blurRadius: 25,
              spreadRadius: 5,
            ),
          ],
        ),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.palette, color: Color(0xFFD4AF37), size: 28),
                      SizedBox(width: 10),
                      Text(
                        'TAHTA & ZAR ÖZELLEŞTİR',
                        style: TextStyle(
                          color: Color(0xFFD4AF37),
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 1.1,
                        ),
                      ),
                    ],
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: Colors.white70),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
              const Divider(color: Color(0xFF8B6B1B), height: 26),

              // Live Mini Preview Box
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
                decoration: BoxDecoration(
                  color: activeBoard.boardBg,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: activeBoard.accentColor, width: 2),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.5),
                      blurRadius: 8,
                    ),
                  ],
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    // Triangle sample
                    Column(
                      children: [
                        const Text(
                          'Tahta Önizleme',
                          style: TextStyle(color: Colors.white70, fontSize: 12),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            _buildTrianglePreview(activeBoard.pointDark),
                            const SizedBox(width: 4),
                            _buildTrianglePreview(activeBoard.pointLight),
                            const SizedBox(width: 4),
                            _buildTrianglePreview(activeBoard.pointDark),
                          ],
                        ),
                      ],
                    ),

                    // Dice sample
                    Column(
                      children: [
                        const Text(
                          'Zar Önizleme',
                          style: TextStyle(color: Colors.white70, fontSize: 12),
                        ),
                        const SizedBox(height: 8),
                        Container(
                          width: 38,
                          height: 38,
                          decoration: BoxDecoration(
                            color: activeDice.diceBg,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: activeDice.borderColor, width: 2),
                          ),
                          child: Center(
                            child: Container(
                              width: 8,
                              height: 8,
                              decoration: BoxDecoration(
                                color: activeDice.dotColor,
                                shape: BoxShape.circle,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // 1. Board Themes Section
              const Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  '🎨 Tahta Temaları',
                  style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(height: 10),
              Column(
                children: BoardThemeData.presets.map((theme) {
                  bool isSelected = _selectedBoard == theme.id;
                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListTile(
                      onTap: () {
                        setState(() {
                          _selectedBoard = theme.id;
                        });
                      },
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: BorderSide(
                          color: isSelected ? const Color(0xFFD4AF37) : Colors.white12,
                          width: isSelected ? 2 : 1,
                        ),
                      ),
                      tileColor: isSelected
                          ? const Color(0xFFD4AF37).withValues(alpha: 0.15)
                          : const Color(0xFF120B07),
                      leading: CircleAvatar(
                        backgroundColor: theme.boardBg,
                        radius: 14,
                        child: CircleAvatar(
                          backgroundColor: theme.pointLight,
                          radius: 6,
                        ),
                      ),
                      title: Text(
                        theme.name,
                        style: TextStyle(
                          color: isSelected ? const Color(0xFFD4AF37) : Colors.white,
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                          fontSize: 14,
                        ),
                      ),
                      trailing: isSelected
                          ? const Icon(Icons.check_circle, color: Color(0xFFD4AF37))
                          : null,
                    ),
                  );
                }).toList(),
              ),

              const SizedBox(height: 16),

              // 2. Dice Themes Section
              const Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  '🎲 Zar Renkleri',
                  style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: DiceThemeData.presets.map((diceTheme) {
                  bool isSelected = _selectedDice == diceTheme.id;
                  return ChoiceChip(
                    label: Text(
                      diceTheme.name,
                      style: TextStyle(
                        color: isSelected ? Colors.black : Colors.white,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                        fontSize: 12,
                      ),
                    ),
                    selected: isSelected,
                    selectedColor: const Color(0xFFD4AF37),
                    backgroundColor: const Color(0xFF120B07),
                    side: BorderSide(
                      color: isSelected ? const Color(0xFFD4AF37) : Colors.white24,
                    ),
                    onSelected: (selected) {
                      if (selected) {
                        setState(() {
                          _selectedDice = diceTheme.id;
                        });
                      }
                    },
                  );
                }).toList(),
              ),

              const SizedBox(height: 24),

              // Save Button
              ElevatedButton(
                onPressed: () {
                  widget.onSave(_selectedBoard, _selectedDice);
                  Navigator.of(context).pop();
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFD4AF37),
                  foregroundColor: Colors.black,
                  padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                  elevation: 6,
                ),
                child: const Text(
                  'KAYDET VE UYGULA',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, letterSpacing: 1.1),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTrianglePreview(Color color) {
    return CustomPaint(
      size: const Size(16, 28),
      painter: _TrianglePreviewPainter(color),
    );
  }
}

class _TrianglePreviewPainter extends CustomPainter {
  final Color color;
  _TrianglePreviewPainter(this.color);

  @override
  void paint(Canvas canvas, Size size) {
    final Path p = Path()
      ..moveTo(0, size.height)
      ..lineTo(size.width / 2, 0)
      ..lineTo(size.width, size.height)
      ..close();
    canvas.drawPath(p, Paint()..color = color);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
