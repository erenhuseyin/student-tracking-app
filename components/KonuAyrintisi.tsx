// Ders takibinde bir konunun açılan ayrıntısı: işlenme tarihi (işlenmişse), sınıfın o konuya notu ve
// yöneticinin yanıtı. Hoca ve yönetici notu yazar/siler; yanıtı yalnızca yönetici yazar, hoca salt
// okunur görür. Hoca yanıtı veren yöneticinin adını okuyamaz (RLS), "Yönetici yanıtı" görür.
// Kutular açılışta sunucudaki değerle dolar; üst bileşen değer değişince `key` ile yeniden kurar.
// Erişim: sınıfın öğretmeni ve kurum admini (RLS); veli bu ekrana girmez ve notu okuyamaz.
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Buton } from '@/components/Buton';
import { Girdi } from '@/components/Girdi';
import { HataMesaji } from '@/components/HataMesaji';
import { OnayButonu } from '@/components/OnayButonu';
import { TarihGirdisi } from '@/components/TarihGirdisi';
import {
  konuNotunuKaydet,
  type KonuNotuAyrintisi,
  konuNotunuSil,
  konuTarihiniGuncelle,
  notaYanitVer,
} from '@/lib/icerik';
import { tarihGecerliMi, tarihiBicimle } from '@/lib/tarih';
import { type Tema, useTema } from '@/lib/tema';
import { useToast } from '@/lib/toast';

type Props = {
  kurumId: string;
  sinifId: string;
  konuId: string;
  // Konu işlenmişse tamamlanma tarihi.
  islenmeTarihi?: string;
  not?: KonuNotuAyrintisi;
  yonetici: boolean;
  benimId?: string;
  onDegisti: () => void;
};

// timestamptz -> '14 Ekim Salı'
const gunu = (zaman: string) => tarihiBicimle(zaman.slice(0, 10));

export function KonuAyrintisi({ kurumId, sinifId, konuId, islenmeTarihi, not, yonetici, benimId, onDegisti }: Props) {
  const tema = useTema();
  const styles = useMemo(() => olustur(tema), [tema]);
  const toast = useToast();
  const [tarih, setTarih] = useState(islenmeTarihi ?? '');
  const [notMetni, setNotMetni] = useState(not?.not_metni ?? '');
  const [yanitMetni, setYanitMetni] = useState(not?.yanit_metni ?? '');
  const [mesgul, setMesgul] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const calistir = async (is: () => Promise<void>, mesaj: string) => {
    setMesgul(true);
    setHata(null);
    try {
      await is();
      toast(mesaj);
      onDegisti();
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İşlem yapılamadı.');
    } finally {
      setMesgul(false);
    }
  };

  const yazanMetni = not
    ? `${not.yazan_kullanici_id === benimId ? 'Sizin notunuz' : (not.yazanAdi ?? 'Not')} · ${gunu(not.yazilma_zamani)}`
    : null;
  const gorulduMetni =
    not && yonetici ? (not.goruldu_zamani ? `Görüldü · ${gunu(not.goruldu_zamani)}` : 'Henüz görülmedi') : null;

  return (
    <View style={styles.kapsayici}>
      <HataMesaji mesaj={hata} />

      {islenmeTarihi ? (
        <View style={styles.bolum}>
          <TarihGirdisi etiket="İşlenme tarihi" deger={tarih} onDegis={setTarih} pasif={mesgul} />
          {tarih !== islenmeTarihi ? (
            <Buton
              tur="ikincil"
              baslik="Tarihi Kaydet"
              pasif={mesgul || !tarihGecerliMi(tarih)}
              onPress={() => calistir(() => konuTarihiniGuncelle(sinifId, konuId, tarih), 'Tarih kaydedildi')}
            />
          ) : null}
        </View>
      ) : null}

      <View style={styles.bolum}>
        <Girdi
          etiket="Not"
          value={notMetni}
          onChangeText={setNotMetni}
          editable={!mesgul}
          multiline
          maxLength={1000}
          textAlignVertical="top"
          style={styles.cokSatir}
          placeholder="Ör. sınıfın seviyesi düşük, haftaya tekrar edilecek"
        />
        {yazanMetni ? (
          <Text style={tema.yazi.kucuk}>
            {yazanMetni}
            {gorulduMetni ? ` · ${gorulduMetni}` : ''}
          </Text>
        ) : null}
        <View style={styles.eylemler}>
          {notMetni.trim() && notMetni.trim() !== not?.not_metni ? (
            <Buton
              tur="ikincil"
              baslik="Notu Kaydet"
              pasif={mesgul}
              onPress={() => calistir(() => konuNotunuKaydet(kurumId, sinifId, konuId, notMetni, !!not), 'Not kaydedildi')}
            />
          ) : null}
          {not ? (
            <OnayButonu
              etiket="Notu Sil"
              soru="Not ve yanıtı silinsin mi?"
              onOnay={() => calistir(() => konuNotunuSil(sinifId, konuId), 'Not silindi')}
            />
          ) : null}
        </View>
      </View>

      {not && yonetici ? (
        <View style={styles.bolum}>
          <Girdi
            etiket="Yanıtınız (hocaya bildirim gider)"
            value={yanitMetni}
            onChangeText={setYanitMetni}
            editable={!mesgul}
            multiline
            maxLength={1000}
            textAlignVertical="top"
            style={styles.cokSatir}
          />
          {not.yanit_zamani ? (
            <Text style={tema.yazi.kucuk}>
              {not.yanitVerenAdi ?? 'Yönetici'} · {gunu(not.yanit_zamani)}
            </Text>
          ) : null}
          {yanitMetni.trim() !== (not.yanit_metni ?? '') ? (
            <View style={styles.eylemler}>
              <Buton
                tur="ikincil"
                baslik={yanitMetni.trim() ? 'Yanıtı Gönder' : 'Yanıtı Kaldır'}
                pasif={mesgul}
                onPress={() =>
                  calistir(() => notaYanitVer(sinifId, konuId, yanitMetni), yanitMetni.trim() ? 'Yanıt gönderildi' : 'Yanıt kaldırıldı')
                }
              />
            </View>
          ) : null}
        </View>
      ) : null}

      {not?.yanit_metni && !yonetici ? (
        <View style={styles.yanit}>
          <Text style={tema.yazi.etiket}>
            {not.yanitVerenAdi ?? 'Yönetici yanıtı'}
            {not.yanit_zamani ? ` · ${gunu(not.yanit_zamani)}` : ''}
          </Text>
          <Text style={tema.yazi.govde}>{not.yanit_metni}</Text>
        </View>
      ) : null}
    </View>
  );
}

function olustur(t: Tema) {
  return StyleSheet.create({
    kapsayici: {
      gap: t.bosluk.m,
      marginLeft: t.bosluk.xxl,
      paddingVertical: t.bosluk.s,
    },
    bolum: {
      gap: t.bosluk.s,
    },
    cokSatir: {
      minHeight: 72,
    },
    eylemler: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: t.bosluk.s,
    },
    yanit: {
      gap: t.bosluk.xs,
      padding: t.bosluk.m,
      borderRadius: t.yaricap.m,
      backgroundColor: t.renkler.vurguSoluk,
    },
  });
}
