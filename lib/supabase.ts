import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import type { Database } from '@/lib/veritabani.tipleri';

// EXPO_PUBLIC_* değişkenleri derleme sırasında statik olarak gömülür;
// bu yüzden process.env üzerinden dinamik erişim yapılmamalı.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase ayarları eksik: .env.example dosyasını .env olarak kopyalayıp ' +
      'EXPO_PUBLIC_SUPABASE_URL ve EXPO_PUBLIC_SUPABASE_ANON_KEY değerlerini doldurun.',
  );
}

// Web'de statik render (Node) sırasında window yoktur; oturum depolaması
// yalnızca tarayıcıda ya da native ortamda kullanılır.
const oturumDepolamasiVar = Platform.OS !== 'web' || typeof window !== 'undefined';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: oturumDepolamasiVar ? AsyncStorage : undefined,
    autoRefreshToken: true,
    persistSession: oturumDepolamasiVar,
    detectSessionInUrl: false,
  },
});
