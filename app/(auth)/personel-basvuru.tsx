// Erişim: oturumu olmayan herkes. Öğretmen adayı kuruma katılma başvurusu yapar; kurum yöneticisi
// onaylarsa öğretmen hesabı açılır. Kurum başvuruyu açmadıysa form gösterilmez.
import { BasvuruFormuEkrani } from '@/components/BasvuruFormuEkrani';

export default function PersonelBasvuru() {
  return <BasvuruFormuEkrani tur="personel" />;
}
