import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ClientSettingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ajustes</Text>
      <Text style={styles.subtitle}>Próximamente — Fase 5</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' },
  title: { color: '#f8fafc', fontSize: 24, fontWeight: '700' },
  subtitle: { color: '#64748b', fontSize: 14, marginTop: 8 },
});
