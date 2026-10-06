import { Stack } from 'expo-router';

import { useTema } from '@/lib/tema';

export default function AuthLayout() {
  const tema = useTema();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: tema.renkler.zemin } }} />;
}
