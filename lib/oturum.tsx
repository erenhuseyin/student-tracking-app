// Oturum durumu: auth.users (Supabase Auth) ile kullanici tablosu ayrı iki kavramdır.
// Biri auth ile giriş yapabilir ama kullanici satırı olmayabilir (davetsiz kayıt, silinmiş
// profil vb.) — bu yüzden dört ayrı durum var, ikisi (session var + profil yok/var) tek
// "girişli" durumda birleştirilmez.
import type { Session } from '@supabase/supabase-js';
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { Kullanici } from '@/lib/tipler';

export type OturumDurumu = 'yukleniyor' | 'oturum_yok' | 'profil_yok' | 'hazir';

type OturumBaglami = {
  durum: OturumDurumu;
  session: Session | null;
  kullanici: Kullanici | null;
  hataMesaji: string | null;
  cikisYap: () => Promise<void>;
};

const Baglam = createContext<OturumBaglami | null>(null);

async function kullaniciSatirinaGetir(authId: string): Promise<{ kullanici: Kullanici | null; hata: string | null }> {
  const { data, error } = await supabase.from('kullanici').select('*').eq('auth_id', authId).maybeSingle();
  if (error) return { kullanici: null, hata: 'Profil bilgisi alınamadı. Lütfen tekrar deneyin.' };
  return { kullanici: data, hata: null };
}

export function OturumSaglayici({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [kullanici, setKullanici] = useState<Kullanici | null>(null);
  const [durum, setDurum] = useState<OturumDurumu>('yukleniyor');
  const [hataMesaji, setHataMesaji] = useState<string | null>(null);

  useEffect(() => {
    let iptalEdildi = false;

    async function oturumuUygula(yeniSession: Session | null) {
      if (iptalEdildi) return;
      setSession(yeniSession);

      if (!yeniSession) {
        setKullanici(null);
        setHataMesaji(null);
        setDurum('oturum_yok');
        return;
      }

      const { kullanici: satir, hata } = await kullaniciSatirinaGetir(yeniSession.user.id);
      if (iptalEdildi) return;
      setKullanici(satir);
      setHataMesaji(hata);
      setDurum(satir ? 'hazir' : 'profil_yok');
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
      hataMesaji,
      cikisYap: async () => {
        await supabase.auth.signOut();
      },
    }),
    [durum, session, kullanici, hataMesaji],
  );

  return <Baglam value={deger}>{children}</Baglam>;
}

export function useOturum(): OturumBaglami {
  const deger = useContext(Baglam);
  if (!deger) throw new Error('useOturum, OturumSaglayici içinde kullanılmalı.');
  return deger;
}
