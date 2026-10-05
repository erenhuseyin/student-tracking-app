import { Stack } from 'expo-router';

import { baslikCubuguSecenekleri } from '@/lib/tema';

export default function Layout() {
  return <Stack screenOptions={baslikCubuguSecenekleri} />;
}
