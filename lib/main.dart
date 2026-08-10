import 'package:flutter/material.dart';
import 'views/game_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const YeniNesilTavlaApp());
}

class YeniNesilTavlaApp extends StatelessWidget {
  const YeniNesilTavlaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Yeni Nesil Tavla',
      debugShowCheckedModeBanner: false,
      themeMode: ThemeMode.dark,
      darkTheme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF120B07),
        primaryColor: const Color(0xFFD4AF37),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFFD4AF37),
          secondary: Color(0xFF8B261D),
          surface: Color(0xFF1E110A),
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF1E110A),
          elevation: 0,
        ),
        useMaterial3: true,
      ),
      home: const GameScreen(),
    );
  }
}
