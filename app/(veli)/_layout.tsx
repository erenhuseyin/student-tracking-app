import { Stack } from 'expo-router';

import { useTema } from '@/lib/tema';

export default function Layout() {
  const tema = useTema();
  return <Stack screenOptions={tema.baslikCubuguSecenekleri} />;
}
