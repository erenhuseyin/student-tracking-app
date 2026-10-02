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
import type { Kullanici, Kurum } from '@/lib/tipler';

export type OturumDurumu = 'yukleniyor' | 'oturum_yok' | 'profil_yok' | 'yanlis_uygulama' | 'hazir';

type OturumBaglami = {
  durum: OturumDurumu;
  session: Session | null;
  kullanici: Kullanici | null;
  // Kullanıcının kendi kurumu (şube olabilir) ve kökü (müşteri). Kök kurumda ikisi aynıdır;
  // süper adminde ikisi de null.
  kurum: Kurum | null;
  kokKurum: Kurum | null;
  hataMesaji: string | null;
  cikisYap: () => Promise<void>;
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
  if (!kurum.ust_kurum_id) return { kurum, kokKurum: kurum, hata: null };

  const { data: kokKurum, error: kokHatasi } = await supabase
    .from('kurum')
    .select('*')
    .eq('id', kurum.ust_kurum_id)
    .maybeSingle();
  if (kokHatasi || !kokKurum) return { kurum: null, kokKurum: null, hata };
  return { kurum, kokKurum, hata: null };
}

export function OturumSaglayici({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [kullanici, setKullanici] = useState<Kullanici | null>(null);
  const [kurum, setKurum] = useState<Kurum | null>(null);
  const [kokKurum, setKokKurum] = useState<Kurum | null>(null);
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
        setHataMesaji(null);
        setDurum('oturum_yok');
        return;
      }

      const { kullanici: satir, hata } = await kullaniciSatirinaGetir(yeniSession.user.id);
      if (iptalEdildi) return;
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
      hataMesaji,
      cikisYap: async () => {
        await supabase.auth.signOut();
      },
    }),
    [durum, session, kullanici, kurum, kokKurum, hataMesaji],
  );

  return <Baglam value={deger}>{children}</Baglam>;
}

export function useOturum(): OturumBaglami {
  const deger = useContext(Baglam);
  if (!deger) throw new Error('useOturum, OturumSaglayici içinde kullanılmalı.');
  return deger;
}
