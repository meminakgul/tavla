import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'services/auth_service.dart';
import 'views/main_menu_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.landscapeLeft,
    DeviceOrientation.landscapeRight,
  ]);
  await AuthService().init();
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
      home: const MainMenuScreen(),
    );
  }
}
