import { Stack } from 'expo-router';

import { renkler } from '@/lib/tema';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: renkler.zemin } }} />;
}
