# 🎲 Yeni Nesil Tavla (Premium Backgammon Game)

Modern ve estetik **Yeni Nesil Tavla**, hem **Flutter** mimarisiyle geliştirilmiş mobil/web sürümlerini hem de doğrudan tarayıcı üzerinde çalışan yüksek performanslı **HTML5 Canvas 2.5D** oyun motorunu içerir.

---

## 🌟 Öne Çıkan Özellikler

* 🎨 **Premium 2.5D Görsel Deneyim**: Kabartmalı ahşap tavla tahtası, pirinç menteşe detayları ve silindirik taşlar.
* 🎲 **3D Zar ve Fizik Animasyonu**: Çift zarlar için 3D küp döndürme ve sekme fizikleri.
* 🛸 **Kavisli Yörünge Taş Hareketi (Waypoint Arc Trajectory)**: Taşlar hareket ederken tahtadaki yükseltilmiş BAR (orta çıta) üzerinden kavis çizerek uçar.
* 📜 **Tam Türk Tavlası Kuralları**:
  * Kırık pul (BAR) oyuna giriş önceliği.
  * Zarları maksimum kullanma ve büyük zarı oynama zorunluluğu.
  * Oynanabilir hamle kalmadığında otomatik sıra devri (Auto-Pass).
  * Tekli ve kombine hamle desteği.
* 📱 **Duyarlı (Responsive) Tasarım**: Mobil ve masaüstü tarayıcılara uyumlu, yatay ekran optimizasyonu.

---

## 🚀 Çalıştırma Yöntemleri

### 1. HTML5 Sürümü (Doğrudan Tarayıcıda)
Proje kök dizinindeki `index.html` dosyasını herhangi bir tarayıcıda çift tıklayarak çalıştırabilir veya bir yerel sunucu başlatabilirsiniz:

```bash
# Npx http-server ile çalıştırmak için:
npx http-server . -p 8080
```
Daha sonra tarayıcınızdan **`http://localhost:8080/index.html`** adresine gidin.

### 2. Flutter Web / Mobil Sürümü
Projeyi Flutter ile çalıştırmak için:

```bash
# Bağımlılıkları yükleyin
flutter pub get

# Web üzerinde çalıştırmak için
flutter run -d chrome

# Testleri çalıştırmak için
flutter test
```

---

## 🛠️ Teknolojiler & Mimari

* **Flutter & Dart**: `lib/` klasörü altında reaktif state yönetimi, custom painter tahta çizimi ve kural motoru (`BackgammonEngine`).
* **HTML5 Canvas & JavaScript**: `index.html` içinde bağımsız 3D vektör işleyici ve zengin Canvas animasyonları.

---

## 📝 Lisans & Katkı

Bu proje açık kaynaklıdır. İstediğiniz gibi geliştirebilir ve katkıda bulunabilirsiniz.
