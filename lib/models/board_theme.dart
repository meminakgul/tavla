import 'package:flutter/material.dart';

/// Preset themes for the Backgammon Board
enum BoardThemeId {
  classicWalnut,
  fenerbahce,
  ottomanWood,
  tropicalEmerald,
  greenFelt,
  whiteMarble,
  midnightVelvet,
}

/// Preset themes for the Dice
enum DiceThemeId {
  ivory,
  fenerbahceYellow,
  gold,
  rubyRed,
  obsidianBlack,
  emeraldGreen,
}

class BoardThemeData {
  final BoardThemeId id;
  final String name;
  final Color boardBg;
  final Color frameColor;
  final Color pointLight;
  final Color pointDark;
  final Color barColor;
  final Color accentColor;

  const BoardThemeData({
    required this.id,
    required this.name,
    required this.boardBg,
    required this.frameColor,
    required this.pointLight,
    required this.pointDark,
    required this.barColor,
    required this.accentColor,
  });

  static final List<BoardThemeData> presets = [
    const BoardThemeData(
      id: BoardThemeId.classicWalnut,
      name: '🪵 Klasik Ceviz',
      boardBg: Color(0xFF2C190E),
      frameColor: Color(0xFF190E08),
      pointLight: Color(0xFFE8D3B0),
      pointDark: Color(0xFF8B261D),
      barColor: Color(0xFF1E110A),
      accentColor: Color(0xFFD4AF37),
    ),
    const BoardThemeData(
      id: BoardThemeId.fenerbahce,
      name: '💛💙 Sarı - Lacivert (Kanarya)',
      boardBg: Color(0xFF070D1E),
      frameColor: Color(0xFF03060F),
      pointLight: Color(0xFFFFD700), // Sarı
      pointDark: Color(0xFF0F1D3F),  // Lacivert
      barColor: Color(0xFF0A1228),
      accentColor: Color(0xFFFFD700),
    ),
    const BoardThemeData(
      id: BoardThemeId.ottomanWood,
      name: '⚜️ Geleneksel Motifli Ahşap (Siyah & Kemik)',
      boardBg: Color(0xFFD4AF77),
      frameColor: Color(0xFF191816),
      pointLight: Color(0xFFF4F1EA),
      pointDark: Color(0xFF1E1C19),
      barColor: Color(0xFF2B2824),
      accentColor: Color(0xFFD4AF37),
    ),
    const BoardThemeData(
      id: BoardThemeId.tropicalEmerald,
      name: '🦩 Tropikal Flamingo & Zümrüt',
      boardBg: Color(0xFF0C2E22),
      frameColor: Color(0xFF0A241B),
      pointLight: Color(0xFFE2D5C3),
      pointDark: Color(0xFF2C5E43),
      barColor: Color(0xFF081E16),
      accentColor: Color(0xFFFF6B6B),
    ),
    const BoardThemeData(
      id: BoardThemeId.greenFelt,
      name: '🟩 Kına & Sedef',
      boardBg: Color(0xFF10331E),
      frameColor: Color(0xFF0A2013),
      pointLight: Color(0xFFF5E6CC),
      pointDark: Color(0xFF6B1D1B),
      barColor: Color(0xFF0D2817),
      accentColor: Color(0xFFD4AF37),
    ),
    const BoardThemeData(
      id: BoardThemeId.whiteMarble,
      name: '🏛️ Kraliyet Mermeri',
      boardBg: Color(0xFFE0DACF),
      frameColor: Color(0xFF222222),
      pointLight: Color(0xFFD4AF37),
      pointDark: Color(0xFF1C1C1C),
      barColor: Color(0xFF333333),
      accentColor: Color(0xFFD4AF37),
    ),
    const BoardThemeData(
      id: BoardThemeId.midnightVelvet,
      name: '🌌 Gece Safiri',
      boardBg: Color(0xFF060B14),
      frameColor: Color(0xFF03050A),
      pointLight: Color(0xFF00E5FF),
      pointDark: Color(0xFFD500F9),
      barColor: Color(0xFF091222),
      accentColor: Color(0xFF00E5FF),
    ),
  ];

  static BoardThemeData getById(BoardThemeId id) {
    return presets.firstWhere((t) => t.id == id, orElse: () => presets.first);
  }
}

class DiceThemeData {
  final DiceThemeId id;
  final String name;
  final Color diceBg;
  final Color dotColor;
  final Color borderColor;

  const DiceThemeData({
    required this.id,
    required this.name,
    required this.diceBg,
    required this.dotColor,
    required this.borderColor,
  });

  static final List<DiceThemeData> presets = [
    const DiceThemeData(
      id: DiceThemeId.ivory,
      name: '⚪ Klasik Fildişi',
      diceBg: Color(0xFFFAF6EE),
      dotColor: Color(0xFF1E110A),
      borderColor: Color(0xFFD4AF37),
    ),
    const DiceThemeData(
      id: DiceThemeId.fenerbahceYellow,
      name: '💛💙 Kanarya Sarı-Lacivert',
      diceBg: Color(0xFFFFD700),
      dotColor: Color(0xFF0A1228),
      borderColor: Color(0xFF0F1D3F),
    ),
    const DiceThemeData(
      id: DiceThemeId.gold,
      name: '👑 Altın Kaplama',
      diceBg: Color(0xFFD4AF37),
      dotColor: Color(0xFF1A1A1A),
      borderColor: Color(0xFFFFF0A5),
    ),
    const DiceThemeData(
      id: DiceThemeId.rubyRed,
      name: '🔴 Yakut Kırmızı',
      diceBg: Color(0xFFB71C1C),
      dotColor: Color(0xFFFFFFFF),
      borderColor: Color(0xFFFF5252),
    ),
    const DiceThemeData(
      id: DiceThemeId.obsidianBlack,
      name: '🖤 Obsidyen Siyah',
      diceBg: Color(0xFF1A1A1A),
      dotColor: Color(0xFFFFD700),
      borderColor: Color(0xFFD4AF37),
    ),
    const DiceThemeData(
      id: DiceThemeId.emeraldGreen,
      name: '🟢 Zümrüt Yeşil',
      diceBg: Color(0xFF1B5E20),
      dotColor: Color(0xFFFFFFFF),
      borderColor: Color(0xFF66BB6A),
    ),
  ];

  static DiceThemeData getById(DiceThemeId id) {
    return presets.firstWhere((t) => t.id == id, orElse: () => presets.first);
  }
}
