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
          olusturma_tarihi: string;
        };
        Insert: {
          ad: string;
          ayarlar?: Json;
          id?: string;
          olusturma_tarihi?: string;
        };
        Update: {
          ad?: string;
          ayarlar?: Json;
          id?: string;
          olusturma_tarihi?: string;
        };
        Relationships: [];
      };
      kullanici: {
        Row: {
          ad_soyad: string;
          auth_id: string;
          id: string;
          kurum_id: string | null;
          olusturma_tarihi: string;
          rol: Database['public']['Enums']['rol'];
        };
        Insert: {
          ad_soyad: string;
          auth_id: string;
          id?: string;
          kurum_id?: string | null;
          olusturma_tarihi?: string;
          rol: Database['public']['Enums']['rol'];
        };
        Update: {
          ad_soyad?: string;
          auth_id?: string;
          id?: string;
          kurum_id?: string | null;
          olusturma_tarihi?: string;
          rol?: Database['public']['Enums']['rol'];
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
          kurum_id: string;
          olusturma_tarihi: string;
        };
        Insert: {
          ad: string;
          donem: string;
          id?: string;
          kurum_id: string;
          olusturma_tarihi?: string;
        };
        Update: {
          ad?: string;
          donem?: string;
          id?: string;
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
          dogum_tarihi: string;
          id: string;
          kurum_id: string;
          olusturma_tarihi: string;
          sinif_id: string;
        };
        Insert: {
          ad_soyad: string;
          dogum_tarihi: string;
          id?: string;
          kurum_id: string;
          olusturma_tarihi?: string;
          sinif_id: string;
        };
        Update: {
          ad_soyad?: string;
          dogum_tarihi?: string;
          id?: string;
          kurum_id?: string;
          olusturma_tarihi?: string;
          sinif_id?: string;
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
    };
    Views: {
      [_ in never]: never;
    };
    // `gizli` şemasındaki yardımcı fonksiyonlar API'ye açık değildir; burada görünmezler.
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      rol: 'super_admin' | 'kurum_admin' | 'ogretmen' | 'veli';
      yoklama_durumu: 'geldi' | 'gelmedi' | 'gec';
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
      yoklama_durumu: ['geldi', 'gelmedi', 'gec'],
    },
  },
} as const;
