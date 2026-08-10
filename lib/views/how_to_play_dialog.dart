import 'package:flutter/material.dart';

class HowToPlayDialog extends StatelessWidget {
  const HowToPlayDialog({super.key});

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.transparent,
      child: Container(
        constraints: const BoxConstraints(maxWidth: 520, maxHeight: 580),
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
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Row(
                  children: [
                    Icon(Icons.help_outline, color: Color(0xFFD4AF37), size: 28),
                    SizedBox(width: 10),
                    Text(
                      'TAVLA NASIL OYNANIR?',
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
            const Divider(color: Color(0xFF8B6B1B), height: 25),
            Expanded(
              child: ListView(
                children: [
                  _buildSectionTitle('🎲 1. Zarlar ve Hareket'),
                  _buildParagraph(
                    'Zar attığınızda çıkan değer kadar pullarınızı kendi ev borunuza doğru ilerletirsiniz. '
                    'Çift zarlarda (örneğin 4-4) aynı zarı 4 kere oynama hakkınız olur.',
                  ),
                  _buildSectionTitle('🛡️ 2. Kırık Pul (BAR) Önceliği'),
                  _buildParagraph(
                    'Eğer tek kalan pulunuz rakip tarafından kırılırsa, pul kına (BAR) düşer. '
                    'Kındaki pulunuzu oyuna sokmadan başka hiçbir pulunuzu hareket ettiremezsiniz!',
                  ),
                  _buildSectionTitle('🏰 3. Kapı Alma ve Maksimum Zar Kuralı'),
                  _buildParagraph(
                    'En az 2 pulunuzun olduğu haneler sizin kapınız olur. Rakip kapılı haneye basamaz. '
                    'İki zardan sadece 1 tanesi oynanabiliyorsa ve zarlar farklıysa, BÜYÜK zarı oynamak zorunludur.',
                  ),
                  _buildSectionTitle('🏆 4. Taş Toplama (Bear Off)'),
                  _buildParagraph(
                    'Tüm 15 pulunuzu kendi ev borunuza (1-6 haneleri arası) topladıktan sonra pullarınızı tahtadan çıkarmaya başlarsınız. '
                    '15 pulunu ilk toplayan oyuncu maçı kazanır!',
                  ),
                  _buildSectionTitle('🃏 5. Özel Kartlı Mod (Güç Kartları)'),
                  _buildParagraph(
                    '• Pul Koruma: Bir pulunuzu 1 tur boyunca kırılmaya karşı korur.\n'
                    '• Ekstra Zar: O tur için 3. bir zar atmanızı sağlar.\n'
                    '• Hane Kilitleme: İstediğiniz boş haneyi 1 tur kapatır.',
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => Navigator.of(context).pop(),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFD4AF37),
                foregroundColor: Colors.black,
                padding: const EdgeInsets.symmetric(horizontal: 36, vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
              ),
              child: const Text('ANLADIM, OYUNA DÖN', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(top: 14, bottom: 6),
      child: Text(
        title,
        style: const TextStyle(color: Color(0xFFD4AF37), fontSize: 16, fontWeight: FontWeight.bold),
      ),
    );
  }

  Widget _buildParagraph(String text) {
    return Text(
      text,
      style: const TextStyle(color: Colors.white70, fontSize: 13.5, height: 1.45),
    );
  }
}
