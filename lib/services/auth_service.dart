import 'dart:math';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/board_theme.dart';
import '../models/user_profile.dart';

class AuthService {
  static final AuthService _instance = AuthService._internal();
  factory AuthService() => _instance;
  AuthService._internal();

  static const String _prefKey = 'user_profile_data';
  UserProfile? _currentUser;

  final ValueNotifier<UserProfile?> currentUserNotifier = ValueNotifier<UserProfile?>(null);

  UserProfile get currentUser {
    _currentUser ??= _createGuestProfile();
    return _currentUser!;
  }

  Future<UserProfile> init() async {
    final prefs = await SharedPreferences.getInstance();
    final jsonStr = prefs.getString(_prefKey);

    if (jsonStr != null && jsonStr.isNotEmpty) {
      try {
        _currentUser = UserProfile.decode(jsonStr);
      } catch (_) {
        _currentUser = _createGuestProfile();
      }
    } else {
      _currentUser = _createGuestProfile();
      await _save();
    }

    currentUserNotifier.value = _currentUser;
    return _currentUser!;
  }

  UserProfile _createGuestProfile() {
    final randomId = Random().nextInt(9000) + 1000;
    return UserProfile(
      id: 'guest_$randomId',
      displayName: 'Misafir_$randomId',
      avatarEmoji: '🧔🏻‍♂️',
      chips: 1000,
      level: 1,
      xp: 0,
      wins: 0,
      losses: 0,
      selectedBoardTheme: BoardThemeId.classicWalnut,
      selectedDiceTheme: DiceThemeId.ivory,
      isGuest: true,
    );
  }

  Future<void> _save() async {
    if (_currentUser == null) return;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefKey, _currentUser!.encode());
    currentUserNotifier.value = _currentUser;
  }

  Future<void> updateDisplayName(String name) async {
    currentUser.displayName = name.trim().isEmpty ? currentUser.displayName : name.trim();
    await _save();
  }

  Future<void> updateAvatar(String avatarEmoji) async {
    currentUser.avatarEmoji = avatarEmoji;
    await _save();
  }

  Future<void> updateThemes({BoardThemeId? boardTheme, DiceThemeId? diceTheme}) async {
    if (boardTheme != null) currentUser.selectedBoardTheme = boardTheme;
    if (diceTheme != null) currentUser.selectedDiceTheme = diceTheme;
    await _save();
  }

  Future<void> addChips(int amount) async {
    currentUser.chips += amount;
    await _save();
  }

  Future<bool> deductChips(int amount) async {
    if (currentUser.chips < amount) return false;
    currentUser.chips -= amount;
    await _save();
    return true;
  }

  Future<void> recordGameResult({required bool isWin, int chipsWon = 0}) async {
    if (isWin) {
      currentUser.wins++;
      currentUser.chips += chipsWon;
      currentUser.xp += 100;
      if (currentUser.xp >= currentUser.level * 300) {
        currentUser.level++;
      }
    } else {
      currentUser.losses++;
      currentUser.xp += 25;
    }
    await _save();
  }
}
