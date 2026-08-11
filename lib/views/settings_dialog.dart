import 'package:flutter/material.dart';
import '../engine/backgammon_ai.dart';
import '../services/audio_service.dart';

class SettingsDialog extends StatefulWidget {
  final AIDifficulty currentDifficulty;
  final Function(AIDifficulty difficulty) onDifficultyChanged;

  const SettingsDialog({
    super.key,
    required this.currentDifficulty,
    required this.onDifficultyChanged,
  });

  @override
  State<SettingsDialog> createState() => _SettingsDialogState();
}

class _SettingsDialogState extends State<SettingsDialog> {
  late AIDifficulty _difficulty;
  late bool _soundEnabled;

  @override
  void initState() {
    super.initState();
    _difficulty = widget.currentDifficulty;
    _soundEnabled = AudioService().soundEnabled;
  }


  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.transparent,
      child: Container(
        constraints: const BoxConstraints(maxWidth: 460),
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: const Color(0xFF1E110A),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: const Color(0xFFD4AF37), width: 2),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.8),
              blurRadius: 25,
              spreadRadius: 5,
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Row(
                  children: [
                    Icon(Icons.settings, color: Color(0xFFD4AF37), size: 28),
                    SizedBox(width: 10),
                    Text(
                      'OYUN AYARLARI',
                      style: TextStyle(
                        color: Color(0xFFD4AF37),
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1.2,
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
            const Divider(color: Color(0xFF8B6B1B), height: 30),

            // AI Difficulty Selector
            const Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'Yapay Zeka Zorluk Seviyesi',
                style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                _buildDifficultyChip(AIDifficulty.easy, 'Kolay', Colors.green),
                const SizedBox(width: 8),
                _buildDifficultyChip(AIDifficulty.medium, 'Orta', Colors.orange),
                const SizedBox(width: 8),
                _buildDifficultyChip(AIDifficulty.master, 'Usta AI', Colors.redAccent),
              ],
            ),
            const SizedBox(height: 24),

            // Sound Toggle
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Row(
                  children: [
                    Icon(Icons.volume_up, color: Colors.amberAccent, size: 22),
                    SizedBox(width: 10),
                    Text(
                      'Ses Efektleri ve Müzik',
                      style: TextStyle(color: Colors.white, fontSize: 15),
                    ),
                  ],
                ),
                Switch(
                  value: _soundEnabled,
                  activeThumbColor: const Color(0xFFD4AF37),
                  onChanged: (val) {
                    setState(() {
                      _soundEnabled = val;
                      AudioService().soundEnabled = val;
                    });
                  },
                ),
              ],
            ),
            const SizedBox(height: 30),

            // Save Button
            ElevatedButton(
              onPressed: () {
                widget.onDifficultyChanged(_difficulty);
                Navigator.of(context).pop();
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFD4AF37),
                foregroundColor: Colors.black,
                padding: const EdgeInsets.symmetric(horizontal: 36, vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
              ),
              child: const Text('KAYDET VE KAPAT', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDifficultyChip(AIDifficulty level, String label, Color color) {
    bool isSelected = _difficulty == level;
    return Expanded(
      child: GestureDetector(
        onTap: () {
          setState(() {
            _difficulty = level;
          });
        },
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isSelected ? color.withValues(alpha: 0.3) : const Color(0xFF140C07),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isSelected ? color : Colors.white24,
              width: isSelected ? 2 : 1,
            ),
          ),
          child: Center(
            child: Text(
              label,
              style: TextStyle(
                color: isSelected ? color : Colors.white70,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
