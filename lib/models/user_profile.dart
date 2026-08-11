import 'dart:convert';
import 'board_theme.dart';

class UserProfile {
  final String id;
  String displayName;
  String avatarEmoji;
  int chips;
  int level;
  int xp;
  int wins;
  int losses;
  BoardThemeId selectedBoardTheme;
  DiceThemeId selectedDiceTheme;
  bool isGuest;

  UserProfile({
    required this.id,
    required this.displayName,
    this.avatarEmoji = '🧔🏻‍♂️',
    this.chips = 1000,
    this.level = 1,
    this.xp = 0,
    this.wins = 0,
    this.losses = 0,
    this.selectedBoardTheme = BoardThemeId.classicWalnut,
    this.selectedDiceTheme = DiceThemeId.ivory,
    this.isGuest = true,
  });

  int get totalGames => wins + losses;

  double get winRate {
    if (totalGames == 0) return 0.0;
    return (wins / totalGames) * 100;
  }

  static const List<String> availableAvatars = [
    '🧔🏻‍♂️', '👑', '🦁', '🎲', '🦅', '🐉', '🏆', '🎩', '😎', '⚡'
  ];

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'displayName': displayName,
      'avatarEmoji': avatarEmoji,
      'chips': chips,
      'level': level,
      'xp': xp,
      'wins': wins,
      'losses': losses,
      'selectedBoardTheme': selectedBoardTheme.name,
      'selectedDiceTheme': selectedDiceTheme.name,
      'isGuest': isGuest,
    };
  }

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    BoardThemeId bTheme = BoardThemeId.classicWalnut;
    DiceThemeId dTheme = DiceThemeId.ivory;

    try {
      bTheme = BoardThemeId.values.firstWhere(
        (e) => e.name == json['selectedBoardTheme'],
        orElse: () => BoardThemeId.classicWalnut,
      );
    } catch (_) {}

    try {
      dTheme = DiceThemeId.values.firstWhere(
        (e) => e.name == json['selectedDiceTheme'],
        orElse: () => DiceThemeId.ivory,
      );
    } catch (_) {}

    return UserProfile(
      id: json['id'] ?? 'guest_1001',
      displayName: json['displayName'] ?? 'Misafir_1001',
      avatarEmoji: json['avatarEmoji'] ?? '🧔🏻‍♂️',
      chips: json['chips'] ?? 1000,
      level: json['level'] ?? 1,
      xp: json['xp'] ?? 0,
      wins: json['wins'] ?? 0,
      losses: json['losses'] ?? 0,
      selectedBoardTheme: bTheme,
      selectedDiceTheme: dTheme,
      isGuest: json['isGuest'] ?? true,
    );
  }

  String encode() => jsonEncode(toJson());

  factory UserProfile.decode(String str) => UserProfile.fromJson(jsonDecode(str));
}
