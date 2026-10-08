// Erişim: oturumu olmayan herkes. Veli, çocuğu için ön kayıt başvurusu yapar; kurum yöneticisi
// onaylarsa öğrenci ve veli hesabı açılır. Kurum başvuruyu açmadıysa form gösterilmez.
import { BasvuruFormuEkrani } from '@/components/BasvuruFormuEkrani';

export default function OgrenciBasvuru() {
  return <BasvuruFormuEkrani tur="ogrenci" />;
}
