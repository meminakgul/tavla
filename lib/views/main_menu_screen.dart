import 'package:flutter/material.dart';
import '../engine/backgammon_ai.dart';
import 'game_screen.dart';
import 'settings_dialog.dart';
import 'how_to_play_dialog.dart';

class MainMenuScreen extends StatefulWidget {
  const MainMenuScreen({super.key});

  @override
  State<MainMenuScreen> createState() => _MainMenuScreenState();
}

class _MainMenuScreenState extends State<MainMenuScreen> with SingleTickerProviderStateMixin {
  late AnimationController _animController;
  AIDifficulty _aiDifficulty = AIDifficulty.master;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 3),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  void _startGame({required GameMode mode, required bool isVsAI}) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => GameScreen(
          gameMode: mode,
          isVsAI: isVsAI,
          aiDifficulty: _aiDifficulty,
        ),
      ),
    );
  }

  void _showOnlineModeDialog() {
    showDialog(
      context: context,
      builder: (context) {
        return Dialog(
          backgroundColor: Colors.transparent,
          child: Container(
            constraints: const BoxConstraints(maxWidth: 420),
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: const Color(0xFF1E110A),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFFD4AF37), width: 2),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.8),
                  blurRadius: 25,
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'ÇEVRİMİÇİ / İKİ KİŞİLİK MOD SEÇİMİ',
                  style: TextStyle(
                    color: Color(0xFFD4AF37),
                    fontSize: 17,
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 20),

                // 1. Klasik Çevrimiçi Mod
                _buildMenuButton(
                  text: 'KLASİK ÇEVRİMİÇİ MOD',
                  icon: Icons.sports_esports,
                  gradientColors: [const Color(0xFFD4AF37), const Color(0xFF8B6B1B)],
                  textColor: Colors.black,
                  onPressed: () {
                    Navigator.of(context).pop();
                    _startGame(mode: GameMode.classic, isVsAI: false);
                  },
                ),
                const SizedBox(height: 14),

                // 2. Kartlı Özel Güçler Modu
                _buildMenuButton(
                  text: 'KARTLI ÖZEL GÜÇLER MODU',
                  icon: Icons.style,
                  gradientColors: [const Color(0xFF8E24AA), const Color(0xFF4A148C)],
                  textColor: Colors.white,
                  onPressed: () {
                    Navigator.of(context).pop();
                    _startGame(mode: GameMode.cards, isVsAI: false);
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0D0704),
      body: Stack(
        children: [
          // 1. Rich Mahogany Wood Background with Radial Warm Glow
          Positioned.fill(
            child: Container(
              decoration: const BoxDecoration(
                gradient: RadialGradient(
                  center: Alignment.center,
                  radius: 1.1,
                  colors: [
                    Color(0xFF2A160A),
                    Color(0xFF140C07),
                    Color(0xFF0D0704),
                  ],
                ),
              ),
            ),
          ),

          // 2. Decorative Left Cards (PUL KORUMA, EKSTRA ZAR, KİLİT)
          Positioned(
            left: 20,
            bottom: 40,
            child: OrientationBuilder(
              builder: (context, orientation) {
                if (MediaQuery.of(context).size.width < 700) return const SizedBox.shrink();
                return Row(
                  children: [
                    _buildDecorativeCard('PUL KORUMA', Icons.shield, Colors.blueAccent),
                    Transform.translate(
                      offset: const Offset(-15, -10),
                      child: _buildDecorativeCard('EKSTRA ZAR', Icons.casino, Colors.greenAccent),
                    ),
                    Transform.translate(
                      offset: const Offset(-30, -20),
                      child: _buildDecorativeCard('HANE KİLİT', Icons.lock, Colors.purpleAccent),
                    ),
                  ],
                );
              },
            ),
          ),

          // 3. Main Center Menu Content
          Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Gold Embossed Header Title Badge: TAVLA EVRİMİ
                  AnimatedBuilder(
                    animation: _animController,
                    builder: (context, child) {
                      double glow = _animController.value;
                      return Container(
                        padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 12),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1C1009),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: const Color(0xFFD4AF37), width: 2.5),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFFD4AF37).withValues(alpha: 0.3 + glow * 0.3),
                              blurRadius: 20 + glow * 10,
                              spreadRadius: 2,
                            ),
                          ],
                        ),
                        child: const Column(
                          children: [
                            Text(
                              'TAVLA EVRİMİ',
                              style: TextStyle(
                                color: Color(0xFFD4AF37),
                                fontSize: 34,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 3.5,
                                shadows: [
                                  Shadow(color: Colors.black, blurRadius: 8, offset: Offset(2, 2)),
                                ],
                              ),
                            ),
                            Text(
                              'PREMIUM BACKGAMMON EXPERIENCE',
                              style: TextStyle(
                                color: Colors.white70,
                                fontSize: 10,
                                letterSpacing: 2.0,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 36),

                  // Menu Action Buttons Stack
                  SizedBox(
                    width: 320,
                    child: Column(
                      children: [
                        // 1. YAPAY ZEKAYA KARŞI (KLASİK MOD) - Primary AI Button
                        _buildMenuButton(
                          text: 'YAPAY ZEKAYA KARŞI (KLASİK)',
                          icon: Icons.smart_toy,
                          gradientColors: [const Color(0xFFD4AF37), const Color(0xFF997A15)],
                          textColor: Colors.black,
                          onPressed: () => _startGame(mode: GameMode.classic, isVsAI: true),
                        ),
                        const SizedBox(height: 14),

                        // 2. ÇEVRİMİÇİ MOD (Mod Seçimi Açılır)
                        _buildMenuButton(
                          text: 'ÇEVRİMİÇİ / 2 OYUNCULU MOD',
                          icon: Icons.public,
                          gradientColors: [const Color(0xFF0288D1), const Color(0xFF01579B)],
                          textColor: Colors.white,
                          onPressed: _showOnlineModeDialog,
                        ),
                        const SizedBox(height: 14),

                        // 3. AYARLAR
                        _buildMenuButton(
                          text: 'AYARLAR',
                          icon: Icons.settings,
                          gradientColors: [const Color(0xFFE65100), const Color(0xFFBF360C)],
                          textColor: Colors.white,
                          onPressed: () {
                            showDialog(
                              context: context,
                              builder: (context) => SettingsDialog(
                                currentDifficulty: _aiDifficulty,
                                onDifficultyChanged: (diff) {
                                  setState(() {
                                    _aiDifficulty = diff;
                                  });
                                },
                              ),
                            );
                          },
                        ),
                        const SizedBox(height: 14),

                        // 4. NASIL OYNANIR
                        _buildMenuButton(
                          text: 'NASIL OYNANIR',
                          icon: Icons.help,
                          gradientColors: [const Color(0xFFF57F17), const Color(0xFFE65100)],
                          textColor: Colors.white,
                          onPressed: () {
                            showDialog(
                              context: context,
                              builder: (context) => const HowToPlayDialog(),
                            );
                          },
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Footer info
          const Positioned(
            left: 20,
            bottom: 12,
            child: Text(
              'Versiyon 1.5 - Oyun Atölyesi',
              style: TextStyle(color: Colors.white38, fontSize: 11),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMenuButton({
    required String text,
    required IconData icon,
    required List<Color> gradientColors,
    required Color textColor,
    required VoidCallback onPressed,
  }) {
    return Container(
      width: double.infinity,
      height: 52,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(26),
        gradient: LinearGradient(
          colors: gradientColors,
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        ),
        boxShadow: [
          BoxShadow(
            color: gradientColors.first.withValues(alpha: 0.4),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
        border: Border.all(color: Colors.amber.withValues(alpha: 0.6), width: 1.5),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(26),
          onTap: onPressed,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(icon, color: textColor, size: 22),
                const SizedBox(width: 10),
                Text(
                  text,
                  style: TextStyle(
                    color: textColor,
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1.1,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildDecorativeCard(String title, IconData icon, Color color) {
    return Container(
      width: 90,
      height: 130,
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: const Color(0xFF1E110A),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color, width: 2),
        boxShadow: [
          BoxShadow(color: color.withValues(alpha: 0.3), blurRadius: 8),
        ],
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: color, size: 30),
          const SizedBox(height: 10),
          Text(
            title,
            style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
