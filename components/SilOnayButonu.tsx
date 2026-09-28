// İki adımlı silme onayı: `Alert.alert` kullanılmaz (web'de tarayıcı confirm()'e sarılabilir,
// bu proje için istenmiyor). "Sil" basılınca aynı yerde "Emin misiniz?" + Evet/Vazgeç çıkar.
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

export function SilOnayButonu({ onSil }: { onSil: () => Promise<void> }) {
  const [onayBekleniyor, setOnayBekleniyor] = useState(false);
  const [siliniyor, setSiliniyor] = useState(false);

  if (onayBekleniyor) {
    return (
      <View style={styles.onaySatiri}>
        <Text style={styles.onayMetni}>Emin misiniz?</Text>
        {siliniyor ? (
          <ActivityIndicator size="small" />
        ) : (
          <>
            <Pressable
              onPress={async () => {
                setSiliniyor(true);
                await onSil();
                setSiliniyor(false);
                setOnayBekleniyor(false);
              }}
            >
              <Text style={styles.evetMetni}>Evet, sil</Text>
            </Pressable>
            <Pressable onPress={() => setOnayBekleniyor(false)}>
              <Text style={styles.vazgecMetni}>Vazgeç</Text>
            </Pressable>
          </>
        )}
      </View>
    );
  }

  return (
    <Pressable onPress={() => setOnayBekleniyor(true)}>
      <Text style={styles.silMetni}>Sil</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  onaySatiri: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  onayMetni: {
    color: '#666',
    fontSize: 13,
  },
  evetMetni: {
    color: '#c62828',
    fontWeight: '600',
  },
  vazgecMetni: {
    color: '#666',
  },
  silMetni: {
    color: '#c62828',
  },
});
