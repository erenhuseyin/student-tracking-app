// DİKKAT: Bu dosya `supabase gen types` çıktısının biçimini taklit eder, ancak ELLE yazılmıştır
// (CLI girişi çalışmadığı için) ve supabase/migrations altındaki şemayı yansıtır.
// Şema değiştiğinde güncellenmeyi unutmak tipleri DB'den sapıtır. CLI çalışır hale gelince
// bu dosyanın üzerine üretilmiş çıktı yazılmalıdır:
//   SUPABASE_PROJECT_REF=<ref> npm run tipleri-uret
// (lib/tipler.ts yalnızca Tables<>, Constants ve Database'e dayanır; üretilmiş dosyayla uyumludur.)

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      kurum: {
        Row: {
          ad: string;
          ayarlar: Json;
          id: string;
          il_kodu: number | null;
          kok_kurum_id: string;
          marka_kodu: string | null;
          olusturma_tarihi: string;
          ozellikler: Json;
          seviye: number;
          ust_kurum_id: string | null;
          yol: string[];
        };
        Insert: {
          ad: string;
          ayarlar?: Json;
          id?: string;
          il_kodu?: number | null;
          kok_kurum_id?: string;
          marka_kodu?: string | null;
          olusturma_tarihi?: string;
          ozellikler?: Json;
          seviye?: number;
          ust_kurum_id?: string | null;
          yol?: string[];
        };
        Update: {
          ad?: string;
          ayarlar?: Json;
          id?: string;
          il_kodu?: number | null;
          kok_kurum_id?: string;
          marka_kodu?: string | null;
          olusturma_tarihi?: string;
          ozellikler?: Json;
          seviye?: number;
          ust_kurum_id?: string | null;
          yol?: string[];
        };
        Relationships: [
          {
            foreignKeyName: 'kurum_ust_kurum_id_fkey';
            columns: ['ust_kurum_id'];
            isOneToOne: false;
            referencedRelation: 'kurum';
            referencedColumns: ['id'];
          },
        ];
      };
      kullanici: {
        Row: {
          ad_soyad: string;
          aktif: boolean;
          auth_id: string;
          cinsiyet: Database['public']['Enums']['cinsiyet'] | null;
          eposta: string | null;
          expo_push_token: string | null;
          giris_deneme_sayisi: number;
          giris_kilit_bitis: string | null;
          gorev_id: string | null;
          kok_kurum_id: string | null;
          kullanici_adi: string | null;
          id: string;
          kod_deneme_sayisi: number;
          kurum_id: string | null;
          olusturma_tarihi: string;
          pin_degistirilmeli: boolean;
          rol: Database['public']['Enums']['rol'];
          sifre_belirlendi: boolean;
          son_kod_gonderim: string | null;
        };
        Insert: {
          ad_soyad: string;
          auth_id: string;
          aktif?: boolean;
          cinsiyet?: Database['public']['Enums']['cinsiyet'] | null;
          eposta?: string | null;
          expo_push_token?: string | null;
          giris_deneme_sayisi?: number;
          giris_kilit_bitis?: string | null;
          gorev_id?: string | null;
          kok_kurum_id?: string | null;
          kullanici_adi?: string | null;
          id?: string;
          kod_deneme_sayisi?: number;
          kurum_id?: string | null;
          olusturma_tarihi?: string;
          pin_degistirilmeli?: boolean;
          rol: Database['public']['Enums']['rol'];
          sifre_belirlendi?: boolean;
          son_kod_gonderim?: string | null;
        };
        Update: {
          ad_soyad?: string;
          auth_id?: string;
          aktif?: boolean;
          cinsiyet?: Database['public']['Enums']['cinsiyet'] | null;
          eposta?: string | null;
          expo_push_token?: string | null;
          giris_deneme_sayisi?: number;
          giris_kilit_bitis?: string | null;
          gorev_id?: string | null;
          kok_kurum_id?: string | null;
          kullanici_adi?: string | null;
          id?: string;
          kod_deneme_sayisi?: number;
          kurum_id?: string | null;
          olusturma_tarihi?: string;
          pin_degistirilmeli?: boolean;
          rol?: Database['public']['Enums']['rol'];
          sifre_belirlendi?: boolean;
          son_kod_gonderim?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'kullanici_kurum_id_fkey';
            columns: ['kurum_id'];
            isOneToOne: false;
            referencedRelation: 'kurum';
            referencedColumns: ['id'];
          },
        ];
      };
      sinif: {
        Row: {
          ad: string;
          donem: string;
          id: string;
          kademe_id: string | null;
          kurum_id: string;
          olusturma_tarihi: string;
        };
        Insert: {
          ad: string;
          donem: string;
          id?: string;
          kademe_id?: string | null;
          kurum_id: string;
          olusturma_tarihi?: string;
        };
        Update: {
          ad?: string;
          donem?: string;
          id?: string;
          kademe_id?: string | null;
          kurum_id?: string;
          olusturma_tarihi?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'sinif_kurum_id_fkey';
            columns: ['kurum_id'];
            isOneToOne: false;
            referencedRelation: 'kurum';
            referencedColumns: ['id'];
          },
        ];
      };
      ogrenci: {
        Row: {
          ad_soyad: string;
          aktif: boolean;
          cinsiyet: Database['public']['Enums']['cinsiyet'] | null;
          dogum_tarihi: string;
          id: string;
          kok_kurum_id: string;
          kurum_id: string;
          olusturma_tarihi: string;
          sinif_id: string;
          kullanici_adi: string | null;
        };
        Insert: {
          ad_soyad: string;
          aktif?: boolean;
          cinsiyet?: Database['public']['Enums']['cinsiyet'] | null;
          dogum_tarihi: string;
          id?: string;
          kok_kurum_id?: string;
          kurum_id: string;
          olusturma_tarihi?: string;
          sinif_id: string;
          kullanici_adi?: string | null;
        };
        Update: {
          ad_soyad?: string;
          aktif?: boolean;
          cinsiyet?: Database['public']['Enums']['cinsiyet'] | null;
          dogum_tarihi?: string;
          id?: string;
          kok_kurum_id?: string;
          kurum_id?: string;
          olusturma_tarihi?: string;
          sinif_id?: string;
          kullanici_adi?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'ogrenci_kurum_id_fkey';
            columns: ['kurum_id'];
            isOneToOne: false;
            referencedRelation: 'kurum';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ogrenci_sinif_ayni_kurum_fkey';
            columns: ['sinif_id', 'kurum_id'];
            isOneToOne: false;
            referencedRelation: 'sinif';
            referencedColumns: ['id', 'kurum_id'];
          },
        ];
      };
      ogretmen_sinif: {
        Row: {
          kurum_id: string;
          ogretmen_id: string;
          olusturma_tarihi: string;
          sinif_id: string;
        };
        Insert: {
          kurum_id: string;
          ogretmen_id: string;
          olusturma_tarihi?: string;
          sinif_id: string;
        };
        Update: {
          kurum_id?: string;
          ogretmen_id?: string;
          olusturma_tarihi?: string;
          sinif_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ogretmen_sinif_kurum_id_fkey';
            columns: ['kurum_id'];
            isOneToOne: false;
            referencedRelation: 'kurum';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ogretmen_sinif_ogretmen_ayni_kurum_fkey';
            columns: ['ogretmen_id', 'kurum_id'];
            isOneToOne: false;
            referencedRelation: 'kullanici';
            referencedColumns: ['id', 'kurum_id'];
          },
          {
            foreignKeyName: 'ogretmen_sinif_sinif_ayni_kurum_fkey';
            columns: ['sinif_id', 'kurum_id'];
            isOneToOne: false;
            referencedRelation: 'sinif';
            referencedColumns: ['id', 'kurum_id'];
          },
        ];
      };
      veli_ogrenci: {
        Row: {
          kurum_id: string;
          ogrenci_id: string;
          olusturma_tarihi: string;
          veli_id: string;
        };
        Insert: {
          kurum_id: string;
          ogrenci_id: string;
          olusturma_tarihi?: string;
          veli_id: string;
        };
        Update: {
          kurum_id?: string;
          ogrenci_id?: string;
          olusturma_tarihi?: string;
          veli_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'veli_ogrenci_kurum_id_fkey';
            columns: ['kurum_id'];
            isOneToOne: false;
            referencedRelation: 'kurum';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'veli_ogrenci_ogrenci_ayni_kurum_fkey';
            columns: ['ogrenci_id', 'kurum_id'];
            isOneToOne: false;
            referencedRelation: 'ogrenci';
            referencedColumns: ['id', 'kurum_id'];
          },
          {
            foreignKeyName: 'veli_ogrenci_veli_ayni_kurum_fkey';
            columns: ['veli_id', 'kurum_id'];
            isOneToOne: false;
            referencedRelation: 'kullanici';
            referencedColumns: ['id', 'kurum_id'];
          },
        ];
      };
      yoklama: {
        Row: {
          durum: Database['public']['Enums']['yoklama_durumu'];
          giren_kullanici_id: string;
          id: string;
          kurum_id: string;
          ogrenci_id: string;
          olusturma_tarihi: string;
          tarih: string;
        };
        Insert: {
          durum: Database['public']['Enums']['yoklama_durumu'];
          giren_kullanici_id: string;
          id?: string;
          kurum_id: string;
          ogrenci_id: string;
          olusturma_tarihi?: string;
          tarih: string;
        };
        Update: {
          durum?: Database['public']['Enums']['yoklama_durumu'];
          giren_kullanici_id?: string;
          id?: string;
          kurum_id?: string;
          ogrenci_id?: string;
          olusturma_tarihi?: string;
          tarih?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'yoklama_kurum_id_fkey';
            columns: ['kurum_id'];
            isOneToOne: false;
            referencedRelation: 'kurum';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'yoklama_ogrenci_ayni_kurum_fkey';
            columns: ['ogrenci_id', 'kurum_id'];
            isOneToOne: false;
            referencedRelation: 'ogrenci';
            referencedColumns: ['id', 'kurum_id'];
          },
          {
            foreignKeyName: 'yoklama_giren_kullanici_id_fkey';
            columns: ['giren_kullanici_id'];
            isOneToOne: false;
            referencedRelation: 'kullanici';
            referencedColumns: ['id'];
          },
        ];
      };
      bildirim_log: {
        Row: {
          alici_kullanici_id: string;
          baslik: string | null;
          duyuru_id: string | null;
          gonderim_tarihi: string;
          id: string;
          kurum_id: string;
          metin: string | null;
          ogrenci_id: string | null;
          sinif_id: string | null;
          okundu_mu: boolean;
          tip: Database['public']['Enums']['bildirim_tipi'];
        };
        Insert: {
          alici_kullanici_id: string;
          baslik?: string | null;
          duyuru_id?: string | null;
          gonderim_tarihi?: string;
          id?: string;
          kurum_id: string;
          metin?: string | null;
          ogrenci_id?: string | null;
          sinif_id?: string | null;
          okundu_mu?: boolean;
          tip: Database['public']['Enums']['bildirim_tipi'];
        };
        Update: {
          alici_kullanici_id?: string;
          baslik?: string | null;
          duyuru_id?: string | null;
          gonderim_tarihi?: string;
          id?: string;
          kurum_id?: string;
          metin?: string | null;
          ogrenci_id?: string | null;
          sinif_id?: string | null;
          okundu_mu?: boolean;
          tip?: Database['public']['Enums']['bildirim_tipi'];
        };
        Relationships: [
          {
            foreignKeyName: 'bildirim_log_alici_ayni_kurum_fkey';
            columns: ['alici_kullanici_id', 'kurum_id'];
            isOneToOne: false;
            referencedRelation: 'kullanici';
            referencedColumns: ['id', 'kurum_id'];
          },
        ];
      };
      gelisim_kategorisi: {
        Row: {
          ad: string;
          aktif: boolean;
          id: string;
          kurum_id: string;
          olusturma_tarihi: string;
          sira: number;
        };
        Insert: {
          ad: string;
          aktif?: boolean;
          id?: string;
          kurum_id: string;
          olusturma_tarihi?: string;
          sira?: number;
        };
        Update: {
          ad?: string;
          aktif?: boolean;
          id?: string;
          kurum_id?: string;
          olusturma_tarihi?: string;
          sira?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'gelisim_kategorisi_kurum_id_fkey';
            columns: ['kurum_id'];
            isOneToOne: false;
            referencedRelation: 'kurum';
            referencedColumns: ['id'];
          },
        ];
      };
      gelisim_kaydi: {
        Row: {
          foto_yolu: string | null;
          giren_kullanici_id: string;
          guncelleme_tarihi: string;
          id: string;
          kategori_id: string;
          kok_kurum_id: string;
          kurum_id: string;
          not_metni: string;
          ogrenci_id: string;
          olcek_degeri: number | null;
          olusturma_tarihi: string;
          tarih: string;
        };
        Insert: {
          foto_yolu?: string | null;
          giren_kullanici_id: string;
          guncelleme_tarihi?: string;
          id?: string;
          kategori_id: string;
          kok_kurum_id?: string;
          kurum_id: string;
          not_metni: string;
          ogrenci_id: string;
          olcek_degeri?: number | null;
          olusturma_tarihi?: string;
          tarih?: string;
        };
        Update: {
          foto_yolu?: string | null;
          giren_kullanici_id?: string;
          guncelleme_tarihi?: string;
          id?: string;
          kategori_id?: string;
          kok_kurum_id?: string;
          kurum_id?: string;
          not_metni?: string;
          ogrenci_id?: string;
          olcek_degeri?: number | null;
          olusturma_tarihi?: string;
          tarih?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'gelisim_kaydi_kurum_id_fkey';
            columns: ['kurum_id'];
            isOneToOne: false;
            referencedRelation: 'kurum';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'gelisim_kaydi_kok_kurum_id_fkey';
            columns: ['kok_kurum_id'];
            isOneToOne: false;
            referencedRelation: 'kurum';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'gelisim_kaydi_ogrenci_ayni_kurum_fkey';
            columns: ['ogrenci_id', 'kurum_id'];
            isOneToOne: false;
            referencedRelation: 'ogrenci';
            referencedColumns: ['id', 'kurum_id'];
          },
          {
            foreignKeyName: 'gelisim_kaydi_kategori_ayni_musteri_fkey';
            columns: ['kategori_id', 'kok_kurum_id'];
            isOneToOne: false;
            referencedRelation: 'gelisim_kategorisi';
            referencedColumns: ['id', 'kurum_id'];
          },
          {
            foreignKeyName: 'gelisim_kaydi_giren_kullanici_id_fkey';
            columns: ['giren_kullanici_id'];
            isOneToOne: false;
            referencedRelation: 'kullanici';
            referencedColumns: ['id'];
          },
        ];
      };
      basvuru: {
        Row: {
          ad_soyad: string;
          dogum_tarihi: string | null;
          durum: Database['public']['Enums']['basvuru_durumu'];
          eposta: string | null;
          id: string;
          karar_notu: string | null;
          karar_tarihi: string | null;
          karar_veren_kullanici_id: string | null;
          kok_kurum_id: string;
          kurum_id: string;
          not_metni: string | null;
          olusturma_tarihi: string;
          tur: Database['public']['Enums']['basvuru_turu'];
          veli_ad_soyad: string | null;
          veli_telefon: string | null;
        };
        Insert: {
          ad_soyad: string;
          dogum_tarihi?: string | null;
          durum?: Database['public']['Enums']['basvuru_durumu'];
          eposta?: string | null;
          id?: string;
          karar_notu?: string | null;
          karar_tarihi?: string | null;
          karar_veren_kullanici_id?: string | null;
          kok_kurum_id?: string;
          kurum_id: string;
          not_metni?: string | null;
          olusturma_tarihi?: string;
          tur: Database['public']['Enums']['basvuru_turu'];
          veli_ad_soyad?: string | null;
          veli_telefon?: string | null;
        };
        Update: {
          ad_soyad?: string;
          dogum_tarihi?: string | null;
          durum?: Database['public']['Enums']['basvuru_durumu'];
          eposta?: string | null;
          id?: string;
          karar_notu?: string | null;
          karar_tarihi?: string | null;
          karar_veren_kullanici_id?: string | null;
          kok_kurum_id?: string;
          kurum_id?: string;
          not_metni?: string | null;
          olusturma_tarihi?: string;
          tur?: Database['public']['Enums']['basvuru_turu'];
          veli_ad_soyad?: string | null;
          veli_telefon?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'basvuru_kurum_id_fkey';
            columns: ['kurum_id'];
            isOneToOne: false;
            referencedRelation: 'kurum';
            referencedColumns: ['id'];
          },
        ];
      };
      ders_programi: {
        Row: {
          baslangic_saati: string;
          bitis_saati: string;
          ders_adi: string;
          gun: number;
          id: string;
          kurum_id: string;
          olusturma_tarihi: string;
          sinif_id: string;
        };
        Insert: {
          baslangic_saati: string;
          bitis_saati: string;
          ders_adi: string;
          gun: number;
          id?: string;
          kurum_id: string;
          olusturma_tarihi?: string;
          sinif_id: string;
        };
        Update: {
          baslangic_saati?: string;
          bitis_saati?: string;
          ders_adi?: string;
          gun?: number;
          id?: string;
          kurum_id?: string;
          olusturma_tarihi?: string;
          sinif_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ders_programi_kurum_id_fkey';
            columns: ['kurum_id'];
            isOneToOne: false;
            referencedRelation: 'kurum';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ders_programi_sinif_ayni_kurum_fkey';
            columns: ['sinif_id', 'kurum_id'];
            isOneToOne: false;
            referencedRelation: 'sinif';
            referencedColumns: ['id', 'kurum_id'];
          },
        ];
      };
      devamsizlik_bildirimi: {
        Row: {
          giren_kullanici_id: string;
          id: string;
          kurum_id: string;
          neden: string;
          ogrenci_id: string;
          olusturma_tarihi: string;
          tarih: string;
        };
        Insert: {
          giren_kullanici_id: string;
          id?: string;
          kurum_id: string;
          neden: string;
          ogrenci_id: string;
          olusturma_tarihi?: string;
          tarih: string;
        };
        Update: {
          giren_kullanici_id?: string;
          id?: string;
          kurum_id?: string;
          neden?: string;
          ogrenci_id?: string;
          olusturma_tarihi?: string;
          tarih?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'devamsizlik_bildirimi_ogrenci_ayni_kurum_fkey';
            columns: ['ogrenci_id', 'kurum_id'];
            isOneToOne: false;
            referencedRelation: 'ogrenci';
            referencedColumns: ['id', 'kurum_id'];
          },
        ];
      };
      duyuru: {
        Row: {
          baslik: string;
          etkinlik_zamani: string | null;
          giren_kullanici_id: string;
          guncelleme_tarihi: string;
          icerik: string;
          id: string;
          kok_kurum_id: string;
          kurum_id: string;
          olusturma_tarihi: string;
          sinif_id: string | null;
          tur: Database['public']['Enums']['duyuru_turu'];
          yer: string | null;
        };
        Insert: {
          baslik: string;
          etkinlik_zamani?: string | null;
          giren_kullanici_id: string;
          guncelleme_tarihi?: string;
          icerik: string;
          id?: string;
          kok_kurum_id?: string;
          kurum_id: string;
          olusturma_tarihi?: string;
          sinif_id?: string | null;
          tur?: Database['public']['Enums']['duyuru_turu'];
          yer?: string | null;
        };
        Update: {
          baslik?: string;
          etkinlik_zamani?: string | null;
          giren_kullanici_id?: string;
          guncelleme_tarihi?: string;
          icerik?: string;
          id?: string;
          kok_kurum_id?: string;
          kurum_id?: string;
          olusturma_tarihi?: string;
          sinif_id?: string | null;
          tur?: Database['public']['Enums']['duyuru_turu'];
          yer?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'duyuru_kurum_id_fkey';
            columns: ['kurum_id'];
            isOneToOne: false;
            referencedRelation: 'kurum';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'duyuru_sinif_ayni_kurum_fkey';
            columns: ['sinif_id', 'kurum_id'];
            isOneToOne: false;
            referencedRelation: 'sinif';
            referencedColumns: ['id', 'kurum_id'];
          },
          {
            foreignKeyName: 'duyuru_giren_kullanici_id_fkey';
            columns: ['giren_kullanici_id'];
            isOneToOne: false;
            referencedRelation: 'kullanici';
            referencedColumns: ['id'];
          },
        ];
      };
      gorev: {
        Row: {
          aciklama: string | null;
          ad: string;
          id: string;
          kapali_ogeler: string[];
          kurum_id: string;
          olusturma_tarihi: string;
          temel_rol: Database['public']['Enums']['rol'];
        };
        Insert: {
          aciklama?: string | null;
          ad: string;
          id?: string;
          kapali_ogeler?: string[];
          kurum_id: string;
          olusturma_tarihi?: string;
          temel_rol: Database['public']['Enums']['rol'];
        };
        Update: {
          aciklama?: string | null;
          ad?: string;
          id?: string;
          kapali_ogeler?: string[];
          kurum_id?: string;
          olusturma_tarihi?: string;
          temel_rol?: Database['public']['Enums']['rol'];
        };
        Relationships: [
          {
            foreignKeyName: 'gorev_kurum_id_fkey';
            columns: ['kurum_id'];
            isOneToOne: false;
            referencedRelation: 'kurum';
            referencedColumns: ['id'];
          },
        ];
      };
      kapali_bolum: {
        Row: {
          bolum_anahtari: string;
          kurum_id: string;
          olusturma_tarihi: string;
          rol: Database['public']['Enums']['rol'];
        };
        Insert: {
          bolum_anahtari: string;
          kurum_id: string;
          olusturma_tarihi?: string;
          rol: Database['public']['Enums']['rol'];
        };
        Update: {
          bolum_anahtari?: string;
          kurum_id?: string;
          olusturma_tarihi?: string;
          rol?: Database['public']['Enums']['rol'];
        };
        Relationships: [
          {
            foreignKeyName: 'kapali_bolum_kurum_id_fkey';
            columns: ['kurum_id'];
            isOneToOne: false;
            referencedRelation: 'kurum';
            referencedColumns: ['id'];
          },
        ];
      };
      oneri: {
        Row: {
          giren_kullanici_id: string;
          id: string;
          kok_kurum_id: string;
          kurum_id: string;
          metin: string;
          okundu: boolean;
          olusturma_tarihi: string;
        };
        Insert: {
          giren_kullanici_id: string;
          id?: string;
          kok_kurum_id?: string;
          kurum_id: string;
          metin: string;
          okundu?: boolean;
          olusturma_tarihi?: string;
        };
        Update: {
          giren_kullanici_id?: string;
          id?: string;
          kok_kurum_id?: string;
          kurum_id?: string;
          metin?: string;
          okundu?: boolean;
          olusturma_tarihi?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'oneri_giren_ayni_kurum_fkey';
            columns: ['giren_kullanici_id', 'kurum_id'];
            isOneToOne: false;
            referencedRelation: 'kullanici';
            referencedColumns: ['id', 'kurum_id'];
          },
        ];
      };
      kademe: {
        Row: {
          ad: string;
          id: string;
          kurum_id: string;
          olusturma_tarihi: string;
          sira: number;
        };
        Insert: {
          ad: string;
          id?: string;
          kurum_id: string;
          olusturma_tarihi?: string;
          sira?: number;
        };
        Update: {
          ad?: string;
          id?: string;
          kurum_id?: string;
          olusturma_tarihi?: string;
          sira?: number;
        };
        Relationships: [

        ];
      };
      kademe_dersi: {
        Row: {
          ad: string;
          id: string;
          kademe_id: string;
          kurum_id: string;
          sira: number;
        };
        Insert: {
          ad: string;
          id?: string;
          kademe_id: string;
          kurum_id: string;
          sira?: number;
        };
        Update: {
          ad?: string;
          id?: string;
          kademe_id?: string;
          kurum_id?: string;
          sira?: number;
        };
        Relationships: [

        ];
      };
      ders_konusu: {
        Row: {
          ad: string;
          ders_id: string;
          id: string;
          kurum_id: string;
          sira: number;
        };
        Insert: {
          ad: string;
          ders_id: string;
          id?: string;
          kurum_id: string;
          sira?: number;
        };
        Update: {
          ad?: string;
          ders_id?: string;
          id?: string;
          kurum_id?: string;
          sira?: number;
        };
        Relationships: [

        ];
      };
      ezber_maddesi: {
        Row: {
          ad: string;
          id: string;
          grup: string | null;
          kademe_id: string | null;
          kurum_id: string;
          sira: number;
        };
        Insert: {
          ad: string;
          id?: string;
          grup?: string | null;
          kademe_id?: string | null;
          kurum_id: string;
          sira?: number;
        };
        Update: {
          ad?: string;
          id?: string;
          grup?: string | null;
          kademe_id?: string | null;
          kurum_id?: string;
          sira?: number;
        };
        Relationships: [

        ];
      };
      sinif_konu_ilerleme: {
        Row: {
          giren_kullanici_id: string | null;
          konu_id: string;
          kurum_id: string;
          sinif_id: string;
          tamamlanma_tarihi: string;
        };
        Insert: {
          giren_kullanici_id?: string | null;
          konu_id: string;
          kurum_id: string;
          sinif_id: string;
          tamamlanma_tarihi?: string;
        };
        Update: {
          giren_kullanici_id?: string | null;
          konu_id?: string;
          kurum_id?: string;
          sinif_id?: string;
          tamamlanma_tarihi?: string;
        };
        Relationships: [

        ];
      };
      sinif_konu_notu: {
        Row: {
          goren_kullanici_id: string | null;
          goruldu_zamani: string | null;
          konu_id: string;
          kurum_id: string;
          not_metni: string;
          sinif_id: string;
          yanit_metni: string | null;
          yanit_veren_kullanici_id: string | null;
          yanit_zamani: string | null;
          yazan_kullanici_id: string | null;
          yazilma_zamani: string;
        };
        Insert: {
          konu_id: string;
          kurum_id: string;
          not_metni: string;
          sinif_id: string;
        };
        Update: {
          goruldu_zamani?: string | null;
          not_metni?: string;
          yanit_metni?: string | null;
        };
        Relationships: [

        ];
      };
      ogrenci_ezber: {
        Row: {
          durum: Database['public']['Enums']['ezber_durumu'];
          guncelleme_tarihi: string;
          kurum_id: string;
          madde_id: string;
          ogrenci_id: string;
        };
        Insert: {
          durum: Database['public']['Enums']['ezber_durumu'];
          guncelleme_tarihi?: string;
          kurum_id: string;
          madde_id: string;
          ogrenci_id: string;
        };
        Update: {
          durum?: Database['public']['Enums']['ezber_durumu'];
          guncelleme_tarihi?: string;
          kurum_id?: string;
          madde_id?: string;
          ogrenci_id?: string;
        };
        Relationships: [

        ];
      };
      kitap_okuma: {
        Row: {
          baslama_tarihi: string | null;
          baslik: string;
          bitis_tarihi: string | null;
          durum: Database['public']['Enums']['kitap_durumu'];
          id: string;
          kurum_id: string;
          not_metni: string | null;
          ogrenci_id: string;
          olusturma_tarihi: string;
          yazar: string | null;
        };
        Insert: {
          baslama_tarihi?: string | null;
          baslik: string;
          bitis_tarihi?: string | null;
          durum?: Database['public']['Enums']['kitap_durumu'];
          id?: string;
          kurum_id: string;
          not_metni?: string | null;
          ogrenci_id: string;
          olusturma_tarihi?: string;
          yazar?: string | null;
        };
        Update: {
          baslama_tarihi?: string | null;
          baslik?: string;
          bitis_tarihi?: string | null;
          durum?: Database['public']['Enums']['kitap_durumu'];
          id?: string;
          kurum_id?: string;
          not_metni?: string | null;
          ogrenci_id?: string;
          olusturma_tarihi?: string;
          yazar?: string | null;
        };
        Relationships: [

        ];
      };
      sinif_ders_plani: {
        Row: {
          baslangic_tarihi: string;
          ders_gunleri: number[];
          id: string;
          kurum_id: string;
          olusturma_tarihi: string;
          sinif_id: string;
        };
        Insert: {
          baslangic_tarihi: string;
          ders_gunleri: number[];
          id?: string;
          kurum_id: string;
          olusturma_tarihi?: string;
          sinif_id: string;
        };
        Update: {
          baslangic_tarihi?: string;
          ders_gunleri?: number[];
          id?: string;
          kurum_id?: string;
          olusturma_tarihi?: string;
          sinif_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'sinif_ders_plani_kurum_id_fkey';
            columns: ['kurum_id'];
            isOneToOne: false;
            referencedRelation: 'kurum';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sinif_ders_plani_sinif_ayni_kurum_fkey';
            columns: ['sinif_id', 'kurum_id'];
            isOneToOne: false;
            referencedRelation: 'sinif';
            referencedColumns: ['id', 'kurum_id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    // `gizli` şemasındaki yardımcı fonksiyonlar API'ye açık değildir; burada görünmezler.
    Functions: {
      pano_ozeti: {
        Args: { p_kurum_id: string; p_baslangic: string; p_bitis: string };
        Returns: Json;
      };
      pano_iller: {
        Args: { p_baslangic: string; p_bitis: string };
        Returns: Json;
      };
      pano_cinsiyet: {
        Args: { p_kurum_id: string };
        Returns: Json;
      };
      ders_raporu: {
        Args: Record<PropertyKey, never>;
        Returns: {
          sinif_id: string;
          sinif_adi: string;
          kurum_id: string;
          kademe_id: string | null;
          kademe_adi: string | null;
          hocalar: string | null;
          ogrenci_sayisi: number;
          toplam_konu: number;
          islenen_konu: number;
          son_islenme: string | null;
          okunmamis_not: number;
        }[];
      };
    };
    Enums: {
      rol: 'super_admin' | 'kurum_admin' | 'ogretmen' | 'veli';
      ezber_durumu: 'devam' | 'tamam';
      kitap_durumu: 'baslamadi' | 'okuyor' | 'bitti';
      yoklama_durumu: 'geldi' | 'gelmedi' | 'gec' | 'mazeretli';
      basvuru_durumu: 'bekliyor' | 'onaylandi' | 'reddedildi';
      basvuru_turu: 'ogrenci' | 'personel';
      bildirim_tipi: 'yoklama' | 'gelisim_kaydi' | 'duyuru' | 'basvuru' | 'konu_notu';
      duyuru_turu: 'duyuru' | 'etkinlik';
      cinsiyet: 'kadin' | 'erkek';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DefaultSchema = Database['public'];

export type Tables<T extends keyof DefaultSchema['Tables']> = DefaultSchema['Tables'][T]['Row'];
export type TablesInsert<T extends keyof DefaultSchema['Tables']> = DefaultSchema['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof DefaultSchema['Tables']> = DefaultSchema['Tables'][T]['Update'];
export type Enums<T extends keyof DefaultSchema['Enums']> = DefaultSchema['Enums'][T];

export const Constants = {
  public: {
    Enums: {
      rol: ['super_admin', 'kurum_admin', 'ogretmen', 'veli'],
      ezber_durumu: ['devam', 'tamam'],
      kitap_durumu: ['baslamadi', 'okuyor', 'bitti'],
      yoklama_durumu: ['geldi', 'gelmedi', 'gec', 'mazeretli'],
      basvuru_durumu: ['bekliyor', 'onaylandi', 'reddedildi'],
      basvuru_turu: ['ogrenci', 'personel'],
      bildirim_tipi: ['yoklama', 'gelisim_kaydi', 'duyuru', 'basvuru', 'konu_notu'],
      duyuru_turu: ['duyuru', 'etkinlik'],
      cinsiyet: ['kadin', 'erkek'],
    },
  },
} as const;
