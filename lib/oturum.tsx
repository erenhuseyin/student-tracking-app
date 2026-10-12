// Oturum durumu: auth.users (Supabase Auth) ile kullanici tablosu ayrı iki kavramdır.
// Biri auth ile giriş yapabilir ama kullanici satırı olmayabilir (davetsiz kayıt, silinmiş
// profil vb.) — bu yüzden ayrı durumlar var, ikisi (session var + profil yok/var) tek
// "girişli" durumda birleştirilmez.
//
// `yanlis_uygulama`: her müşterinin kendi uygulaması var (bkz. lib/marka.ts) ama Auth ortak;
// başka müşterinin kullanıcısı bu uygulamadan giriş yaparsa içeri alınmaz. Süper admin
// hiçbir kuruma bağlı olmadığı için her uygulamadan girebilir.
import type { Session } from '@supabase/supabase-js';
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';

import { marka } from '@/lib/marka';
import { supabase } from '@/lib/supabase';
import type { Gorev, Kullanici, Kurum } from '@/lib/tipler';

export type OturumGorevi = Pick<Gorev, 'id' | 'ad' | 'kapali_ogeler'>;

export type OturumDurumu = 'yukleniyor' | 'oturum_yok' | 'profil_yok' | 'yanlis_uygulama' | 'hazir';

type OturumBaglami = {
  durum: OturumDurumu;
  session: Session | null;
  kullanici: Kullanici | null;
  // Kullanıcının kendi kurumu (şube olabilir) ve kökü (müşteri). Kök kurumda ikisi aynıdır;
  // süper adminde ikisi de null.
  kurum: Kurum | null;
  kokKurum: Kurum | null;
  // Kullanıcının görevi (müşterinin tanımladığı; yoksa null). Bkz. lib/gorevler.ts.
  gorev: OturumGorevi | null;
  // Bu kullanıcıya gizlenen menü öğeleri: müşterinin rolü için kapattığı bölümler (kapali_bolum)
  // ve görevinin kapattığı öğeler (bkz. lib/menu.ts > useBolumAcik).
  kapaliBolumler: string[];
  hataMesaji: string | null;
  cikisYap: () => Promise<void>;
  // Kullanıcı kendi satırını değiştirdikten sonra (ör. profilde ad) bağlamı tazeler.
  kullaniciyiYenile: () => Promise<void>;
};

const Baglam = createContext<OturumBaglami | null>(null);

async function kullaniciSatirinaGetir(authId: string): Promise<{ kullanici: Kullanici | null; hata: string | null }> {
  const { data, error } = await supabase.from('kullanici').select('*').eq('auth_id', authId).maybeSingle();
  if (error) return { kullanici: null, hata: 'Profil bilgisi alınamadı. Lütfen tekrar deneyin.' };
  return { kullanici: data, hata: null };
}

async function kurumlariGetir(
  kurumId: string,
): Promise<{ kurum: Kurum | null; kokKurum: Kurum | null; hata: string | null }> {
  const hata = 'Kurum bilgisi alınamadı. Lütfen tekrar deneyin.';
  const { data: kurum, error } = await supabase.from('kurum').select('*').eq('id', kurumId).maybeSingle();
  if (error || !kurum) return { kurum: null, kokKurum: null, hata };
  if (kurum.kok_kurum_id === kurum.id) return { kurum, kokKurum: kurum, hata: null };

  const { data: kokKurum, error: kokHatasi } = await supabase
    .from('kurum')
    .select('*')
    .eq('id', kurum.kok_kurum_id)
    .maybeSingle();
  if (kokHatasi || !kokKurum) return { kurum: null, kokKurum: null, hata };
  return { kurum, kokKurum, hata: null };
}

// Yalnızca öğretmen ve veli bölümleri kapatılabilir. Okunamazsa (ör. bağlantı sorunu) hiçbir
// bölüm kapalı sayılmaz: bu bir görünürlük ayarıdır, veriyi RLS korur.
async function kapaliBolumleriGetir(kokKurumId: string, rol: Kullanici['rol']): Promise<string[]> {
  if (rol !== 'ogretmen' && rol !== 'veli') return [];
  const { data, error } = await supabase
    .from('kapali_bolum')
    .select('bolum_anahtari')
    .eq('kurum_id', kokKurumId)
    .eq('rol', rol);
  if (error) return [];
  return data.map((s) => s.bolum_anahtari);
}

// Okunamazsa (ör. bağlantı sorunu ya da migration henüz uygulanmadıysa) görev yok sayılır ve
// hiçbir şey gizlenmez: görev bir görünürlük ayarıdır, veriyi RLS korur.
async function gorevGetir(gorevId: string | null): Promise<OturumGorevi | null> {
  if (!gorevId) return null;
  const { data, error } = await supabase.from('gorev').select('id, ad, kapali_ogeler').eq('id', gorevId).maybeSingle();
  return error ? null : data;
}

export function OturumSaglayici({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [kullanici, setKullanici] = useState<Kullanici | null>(null);
  const [kurum, setKurum] = useState<Kurum | null>(null);
  const [kokKurum, setKokKurum] = useState<Kurum | null>(null);
  const [kapaliBolumler, setKapaliBolumler] = useState<string[]>([]);
  const [gorev, setGorev] = useState<OturumGorevi | null>(null);
  const [durum, setDurum] = useState<OturumDurumu>('yukleniyor');
  const [hataMesaji, setHataMesaji] = useState<string | null>(null);

  useEffect(() => {
    let iptalEdildi = false;

    async function oturumuUygula(yeniSession: Session | null) {
      if (iptalEdildi) return;
      setSession(yeniSession);

      if (!yeniSession) {
        setKullanici(null);
        setKurum(null);
        setKokKurum(null);
        setKapaliBolumler([]);
        setGorev(null);
        setHataMesaji(null);
        setDurum('oturum_yok');
        return;
      }

      const { kullanici: satir, hata } = await kullaniciSatirinaGetir(yeniSession.user.id);
      if (iptalEdildi) return;
      // Pasifleştirilmiş hesap: RLS zaten hiçbir veri döndürmez (bkz. 20261006120000); kullanıcıya
      // boş ekranlar yerine açık bir mesaj gösterilir.
      if (satir && !satir.aktif) {
        setKullanici(null);
        setKurum(null);
        setKokKurum(null);
        setHataMesaji('Hesabınız kapatılmış. Lütfen kurumunuzun yöneticisiyle iletişime geçin.');
        setDurum('profil_yok');
        return;
      }
      if (!satir || !satir.kurum_id) {
        setKullanici(satir);
        setKurum(null);
        setKokKurum(null);
        setHataMesaji(hata);
        setDurum(satir ? 'hazir' : 'profil_yok');
        return;
      }

      const kurumlar = await kurumlariGetir(satir.kurum_id);
      if (iptalEdildi) return;
      setKurum(kurumlar.kurum);
      setKokKurum(kurumlar.kokKurum);
      setHataMesaji(kurumlar.hata);
      if (kurumlar.hata) {
        setKullanici(null);
        setDurum('profil_yok');
        return;
      }
      const [kapalilar, kullaniciGorevi] = await Promise.all([
        kurumlar.kokKurum ? kapaliBolumleriGetir(kurumlar.kokKurum.id, satir.rol) : [],
        gorevGetir(satir.gorev_id),
      ]);
      if (iptalEdildi) return;
      setKapaliBolumler([...new Set([...kapalilar, ...(kullaniciGorevi?.kapali_ogeler ?? [])])]);
      setGorev(kullaniciGorevi);
      setKullanici(satir);
      setDurum(kurumlar.kokKurum?.marka_kodu === marka.kod ? 'hazir' : 'yanlis_uygulama');
    }

    supabase.auth.getSession().then(({ data }) => oturumuUygula(data.session));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_olay, yeniSession) => {
      oturumuUygula(yeniSession);
    });

    return () => {
      iptalEdildi = true;
      subscription.unsubscribe();
    };
  }, []);

  const deger = useMemo<OturumBaglami>(
    () => ({
      durum,
      session,
      kullanici,
      kurum,
      kokKurum,
      gorev,
      kapaliBolumler,
      hataMesaji,
      cikisYap: async () => {
        await supabase.auth.signOut();
      },
      kullaniciyiYenile: async () => {
        if (!session) return;
        const { kullanici: satir } = await kullaniciSatirinaGetir(session.user.id);
        if (satir) setKullanici(satir);
      },
    }),
    [durum, session, kullanici, kurum, kokKurum, gorev, kapaliBolumler, hataMesaji],
  );

  return <Baglam value={deger}>{children}</Baglam>;
}

export function useOturum(): OturumBaglami {
  const deger = useContext(Baglam);
  if (!deger) throw new Error('useOturum, OturumSaglayici içinde kullanılmalı.');
  return deger;
}
