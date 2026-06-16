export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correct: number;
  category: string;
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  { id: 1, question: "Güneş'in çapı Dünya'nın çapının kaç katıdır?", options: ["10 kat", "50 kat", "109 kat", "333 kat"], correct: 2, category: "Güneş Sistemi" },
  { id: 2, question: "Güneş sistemindeki en büyük gezegen hangisidir?", options: ["Satürn", "Neptün", "Uranüs", "Jüpiter"], correct: 3, category: "Güneş Sistemi" },
  { id: 3, question: "Işığın boşluktaki hızı yaklaşık kaç km/s'dir?", options: ["150.000", "300.000", "450.000", "600.000"], correct: 1, category: "Fizik" },
  { id: 4, question: "Ay'ın Dünya etrafındaki tam dönüş süresi kaç gündür?", options: ["24", "27,3", "30", "365"], correct: 1, category: "Ay" },
  { id: 5, question: "Güneş'e en yakın yıldız hangisidir?", options: ["Sirius", "Vega", "Proxima Centauri", "Betelgeuse"], correct: 2, category: "Yıldızlar" },
  { id: 6, question: "Samanyolu galaksisinin şekli nedir?", options: ["Eliptik", "Düzensiz", "Sarmal", "Mercek biçimi"], correct: 2, category: "Galaksiler" },
  { id: 7, question: "Hangi gezegen 'Kızıl Gezegen' olarak bilinir?", options: ["Venüs", "Mars", "Jüpiter", "Satürn"], correct: 1, category: "Güneş Sistemi" },
  { id: 8, question: "Güneş sistemi yaklaşık kaç milyar yıl önce oluşmuştur?", options: ["2,5", "4,6", "6,7", "13,8"], correct: 1, category: "Güneş Sistemi" },
  { id: 9, question: "Bir Astronomik Birim (AU) neyi ifade eder?", options: ["Dünya-Ay arası mesafe", "Dünya-Güneş ortalama mesafesi", "Güneş-Jüpiter arası mesafe", "Samanyolu'nun çapı"], correct: 1, category: "Ölçüm" },
  { id: 10, question: "Hangi gezegen halkalarıyla en çok ünlüdür?", options: ["Jüpiter", "Neptün", "Satürn", "Uranüs"], correct: 2, category: "Güneş Sistemi" },
  { id: 11, question: "Karadeliklerin ilk fotoğrafı hangi yılda çekilmiştir?", options: ["2012", "2015", "2019", "2022"], correct: 2, category: "Karadelikler" },
  { id: 12, question: "ISS (Uluslararası Uzay İstasyonu) hangi yıl fırlatılmıştır?", options: ["1993", "1998", "2001", "2005"], correct: 1, category: "Uzay Araştırmaları" },
  { id: 13, question: "Güneş'in yüzey sıcaklığı yaklaşık kaç Kelvin'dir?", options: ["3.000", "5.778", "10.000", "15 milyon"], correct: 1, category: "Güneş" },
  { id: 14, question: "'Küçük Gezegen Kemeri' nerede bulunur?", options: ["Mars ve Jüpiter arasında", "Jüpiter ve Satürn arasında", "Satürn ve Uranüs arasında", "Neptün'ün ötesinde"], correct: 0, category: "Güneş Sistemi" },
  { id: 15, question: "Hubble Uzay Teleskobu hangi yılda fırlatılmıştır?", options: ["1985", "1990", "1995", "2000"], correct: 1, category: "Uzay Araştırmaları" },
  { id: 16, question: "Hangi gezegenin en fazla uydusu vardır?", options: ["Jüpiter", "Satürn", "Neptün", "Uranüs"], correct: 1, category: "Güneş Sistemi" },
  { id: 17, question: "Plüton hangi kategoride sınıflandırılır?", options: ["Gezegen", "Asteroid", "Cüce Gezegen", "Kuyruklu Yıldız"], correct: 2, category: "Güneş Sistemi" },
  { id: 18, question: "Ay'ın Dünya'dan görülemeyen kısmına ne denir?", options: ["Karanlık Yüz", "Arka Yüz", "Gizli Yüz", "Karanlık Taraf"], correct: 1, category: "Ay" },
  { id: 19, question: "VLF ne anlamına gelir?", options: ["Very Low Frequency", "Very Large Frequency", "Variable Light Flux", "Visible Light Filter"], correct: 0, category: "Teknoloji" },
  { id: 20, question: "Güneş fırtınaları (CME) ne tür partiküller yayar?", options: ["Nötrinolar", "Proton ve elektronlar", "Fotonlar", "Nötronlar"], correct: 1, category: "Güneş" },
  { id: 21, question: "Kuiper Kuşağı nerede bulunur?", options: ["Güneş'in iç çevresinde", "Asteroid Kuşağı'nda", "Neptün'ün ötesinde", "Samanyolu'nun merkezinde"], correct: 2, category: "Güneş Sistemi" },
  { id: 22, question: "Schumann Rezonansı nerede oluşur?", options: ["Atmosfer ve iyonosfer arası", "Okyanusların derinlikleri", "Yer mantosunda", "Manyetosfer"], correct: 0, category: "Fizik" },
  { id: 23, question: "James Webb Uzay Teleskobu hangi yılda fırlatılmıştır?", options: ["2018", "2020", "2021", "2023"], correct: 2, category: "Uzay Araştırmaları" },
  { id: 24, question: "Andromeda galaksisi Samanyolu'na kaç ışık yılı uzaktadır?", options: ["1 milyon", "2,5 milyon", "10 milyon", "50 milyon"], correct: 1, category: "Galaksiler" },
  { id: 25, question: "Yıldız renkleri arasında en sıcak olan hangisidir?", options: ["Kırmızı", "Sarı", "Turuncu", "Mavi"], correct: 3, category: "Yıldızlar" },
  { id: 26, question: "Evrenin yaşı yaklaşık kaç milyar yıldır?", options: ["4,6", "7,5", "13,8", "20"], correct: 2, category: "Evren" },
  { id: 27, question: "Süpernova nedir?", options: ["Büyük bir yıldızın patlaması", "İki galaksinin çarpışması", "Yeni bir yıldızın doğumu", "Kara deliğin büyümesi"], correct: 0, category: "Yıldızlar" },
  { id: 28, question: "Güneş'te enerji üretimi hangi süreçle gerçekleşir?", options: ["Nükleer fisyon", "Kimyasal reaksiyon", "Nükleer füzyon", "Radyoaktif bozunma"], correct: 2, category: "Güneş" },
  { id: 29, question: "Mars'ın en yüksek dağı hangisidir?", options: ["Olympus Mons", "Mons Alba", "Arsia Mons", "Pavonis Mons"], correct: 0, category: "Mars" },
  { id: 30, question: "Güneş sistemimizdeki en küçük gezegen hangisidir?", options: ["Mars", "Merkür", "Plüton", "Venüs"], correct: 1, category: "Güneş Sistemi" },
  { id: 31, question: "Işık yılı yaklaşık kaç km'ye eşittir?", options: ["9,46 trilyon km", "5 milyon km", "1,5 milyar km", "384.400 km"], correct: 0, category: "Ölçüm" },
  { id: 32, question: "Hangi gezegen Güneş'e en yakındır?", options: ["Venüs", "Mars", "Merkür", "Dünya"], correct: 2, category: "Güneş Sistemi" },
  { id: 33, question: "Gezegen Nebulası nedir?", options: ["Bir gezegenin oluşum bölgesi", "Yaşlanmış yıldızın attığı gaz kabuğu", "Gezegenler arası toz bulutları", "Galaksilerarası madde"], correct: 1, category: "Yıldızlar" },
  { id: 34, question: "BLE ne anlamına gelir?", options: ["Bluetooth Low Energy", "Binary Light Emission", "Broadband Link Encryption", "Basic Level Electronics"], correct: 0, category: "Teknoloji" },
  { id: 35, question: "Ay'ın Dünya'ya olan ortalama uzaklığı yaklaşık kaç km'dir?", options: ["150.000 km", "384.400 km", "1,2 milyon km", "3,8 milyon km"], correct: 1, category: "Ay" },
  { id: 36, question: "Kuyruklu yıldız nedir?", options: ["Asteroid", "Meteroit", "Buz ve gaz kuyruğu olan küçük cisim", "Kuasar"], correct: 2, category: "Güneş Sistemi" },
  { id: 37, question: "Satürn'ün halkalarının büyük çoğunluğu neden oluşmuştur?", options: ["Buz ve kaya parçaları", "Gaz bulutları", "Metal tozları", "Organik maddeler"], correct: 0, category: "Güneş Sistemi" },
  { id: 38, question: "NASA hangi ülkenin uzay ajansıdır?", options: ["Rusya", "Çin", "Japonya", "Amerika Birleşik Devletleri"], correct: 3, category: "Uzay Araştırmaları" },
  { id: 39, question: "Oort Bulutu nedir?", options: ["Güneş'i çevreleyen hipotedik uzak cisim bölgesi", "Jüpiter'in atmosferik katmanı", "Nötron yıldızlarının çevresi", "Karadeliklerin halkası"], correct: 0, category: "Güneş Sistemi" },
  { id: 40, question: "Deneyap Kart hangi ülkede üretilen geliştirici kartıdır?", options: ["Japonya", "Almanya", "Türkiye", "Güney Kore"], correct: 2, category: "Teknoloji" },
  { id: 41, question: "Güneş tutulması ne zaman gerçekleşir?", options: ["Ay Dünya'nın gölgesine girdiğinde", "Ay Güneş ile Dünya arasına geçtiğinde", "Dünya Güneş ile Ay arasına geçtiğinde", "Güneş parlaklığı azaldığında"], correct: 1, category: "Gözlem" },
  { id: 42, question: "Aya ilk inen insan kimdir?", options: ["Yuri Gagarin", "Alan Shepard", "Neil Armstrong", "Buzz Aldrin"], correct: 2, category: "Uzay Araştırmaları" },
  { id: 43, question: "Güneş'in toplam yaşam süresinin kaçta kaçını tükettiği tahmin edilmektedir?", options: ["1/4", "1/3", "1/2", "3/4"], correct: 2, category: "Güneş" },
  { id: 44, question: "Manyetik Fırtına nedir?", options: ["Jüpiter üzerindeki büyük fırtınalar", "Güneş aktivitesinin Dünya manyetik alanını bozması", "Satürn'ün halka sistemi değişimleri", "Yıldızlararası manyetik alan"], correct: 1, category: "Güneş" },
  { id: 45, question: "SETI ne anlamına gelir?", options: ["Space Exploration Technology Initiative", "Search for Extraterrestrial Intelligence", "Solar Energy Transfer Index", "Stellar Evolution Tracking Interface"], correct: 1, category: "Uzay Araştırmaları" },
  { id: 46, question: "Nötron yıldızları ne kadar yoğundur?", options: ["Su yoğunluğunda", "Güneş yoğunluğunda", "1 cm³'ü milyonlarca ton", "Demir yoğunluğunda"], correct: 2, category: "Yıldızlar" },
  { id: 47, question: "Hangi gezegen 'Dünya'nın kardeşi' olarak bilinir?", options: ["Mars", "Venüs", "Merkür", "Neptün"], correct: 1, category: "Güneş Sistemi" },
  { id: 48, question: "Gamma ışını patlamaları (GRB) neden kaynaklanır?", options: ["Güneş fırtınalarından", "Nötron yıldızı birleşmelerinden veya süper kütleli yıldız çöküşlerinden", "Kara delik oluşumundan", "Galaksi merkezlerindeki patlamalardan"], correct: 1, category: "Yıldızlar" },
  { id: 49, question: "James Webb Uzay Teleskobu'nun en önemli özelliği nedir?", options: ["En büyük optik ayna", "Kızılötesi ışınlarla evrenin ilk galaksilerini görmesi", "X-ışını gözlem kapasitesi", "Radyo dalgası alıcısı"], correct: 1, category: "Uzay Araştırmaları" },
  { id: 50, question: "Evrenin genişlemesini ilk kimin keşfettiği bilinmektedir?", options: ["Albert Einstein", "Edwin Hubble", "Isaac Newton", "Carl Sagan"], correct: 1, category: "Evren" },
];

export function shuffleQuestions(questions: QuizQuestion[]): QuizQuestion[] {
  const arr = [...questions];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
