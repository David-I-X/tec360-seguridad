import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { fetchWithAuth, API_URL } from '@/lib/api';

const SERVICE_TYPES = [
  { key: 'gps_installation', label: 'Instalación GPS', emoji: '📍' },
  { key: 'camera_installation', label: 'Instalación Dashcam', emoji: '📹' },
  { key: 'alarm_installation', label: 'Instalación Alarma', emoji: '🔔' },
  { key: 'gps_maintenance', label: 'Mantenimiento GPS', emoji: '📍' },
  { key: 'camera_maintenance', label: 'Mantenimiento Dashcam', emoji: '📹' },
  { key: 'alarm_maintenance', label: 'Mantenimiento Alarma', emoji: '🔔' },
  { key: 'other', label: 'Otro', emoji: '🔧' },
];

export default function NewServiceScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Form data
  const [serviceType, setServiceType] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehiclePhotoUri, setVehiclePhotoUri] = useState<string | null>(null);

  const pickVehiclePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      const compressed = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 800 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );
      setVehiclePhotoUri(compressed.uri);
    }
  };

  const takeVehiclePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a la cámara.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      const compressed = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 800 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );
      setVehiclePhotoUri(compressed.uri);
    }
  };

  const handleSubmit = async () => {
    if (!serviceType || !title || !address || !city) {
      Alert.alert('Campos requeridos', 'Completa tipo, título, dirección y ciudad.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetchWithAuth('/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_type: serviceType,
          title,
          description,
          service_address: address,
          service_city: city,
          service_lat: 4.6097,  // TODO: Use real GPS
          service_lon: -74.0817,
          scheduled_date: new Date().toISOString(),
          vehicle_type: vehicleType || undefined,
          vehicle_model: vehicleModel || undefined,
          vehicle_plate: vehiclePlate || undefined,
        }),
      });

      if (!res.ok) throw new Error('Error al crear servicio');
      const data = await res.json();
      const serviceId = data.id || data.service?.id;

      // Upload vehicle photo if present
      if (vehiclePhotoUri && serviceId) {
        const formData = new FormData();
        formData.append('file', {
          uri: vehiclePhotoUri,
          name: 'vehicle.jpg',
          type: 'image/jpeg',
        } as any);
        formData.append('service_id', serviceId.toString());

        await fetchWithAuth('/uploads/vehicle-photo', {
          method: 'POST',
          body: formData,
        });
      }

      Alert.alert('¡Servicio creado!', 'Tu solicitud fue enviada a los técnicos disponibles.', [
        { text: 'Ver servicio', onPress: () => router.replace(`/(client)/waiting/${serviceId}` as any) },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#f0f0f5" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nuevo Servicio</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Steps indicator */}
      <View style={styles.stepsRow}>
        {['Tipo', 'Vehículo', 'Ubicación'].map((label, i) => (
          <View key={label} style={styles.stepItem}>
            <View style={[styles.stepDot, i <= step && styles.stepDotActive]} />
            <Text style={[styles.stepLabel, i <= step && styles.stepLabelActive]}>{label}</Text>
          </View>
        ))}
      </View>

      <ScrollView style={styles.form} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Step 0: Service Type */}
        {step === 0 && (
          <View style={styles.stepContent}>
            <Text style={styles.sectionTitle}>¿Qué servicio necesitas?</Text>
            <View style={styles.typeGrid}>
              {SERVICE_TYPES.map(t => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.typeCard, serviceType === t.key && styles.typeCardActive]}
                  onPress={() => setServiceType(t.key)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.typeEmoji}>{t.emoji}</Text>
                  <Text style={[styles.typeLabel, serviceType === t.key && styles.typeLabelActive]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Título del servicio</Text>
            <TextInput style={styles.input} placeholder="Ej: Instalar GPS en camioneta" placeholderTextColor="#555872" value={title} onChangeText={setTitle} />

            <Text style={styles.inputLabel}>Descripción (opcional)</Text>
            <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} placeholder="Describe lo que necesitas..." placeholderTextColor="#555872" value={description} onChangeText={setDescription} multiline />
          </View>
        )}

        {/* Step 1: Vehicle */}
        {step === 1 && (
          <View style={styles.stepContent}>
            <Text style={styles.sectionTitle}>Información del vehículo</Text>

            <Text style={styles.inputLabel}>Tipo de vehículo</Text>
            <TextInput style={styles.input} placeholder="Ej: Camioneta, Sedan, Moto" placeholderTextColor="#555872" value={vehicleType} onChangeText={setVehicleType} />

            <Text style={styles.inputLabel}>Modelo</Text>
            <TextInput style={styles.input} placeholder="Ej: Toyota Hilux 2023" placeholderTextColor="#555872" value={vehicleModel} onChangeText={setVehicleModel} />

            <Text style={styles.inputLabel}>Placa</Text>
            <TextInput style={styles.input} placeholder="Ej: ABC-123" placeholderTextColor="#555872" value={vehiclePlate} onChangeText={setVehiclePlate} autoCapitalize="characters" />

            <Text style={styles.inputLabel}>Foto del vehículo</Text>
            <View style={styles.photoRow}>
              <TouchableOpacity style={styles.photoButton} onPress={takeVehiclePhoto}>
                <Ionicons name="camera" size={24} color="#8b5cf6" />
                <Text style={styles.photoButtonText}>Cámara</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoButton} onPress={pickVehiclePhoto}>
                <Ionicons name="image" size={24} color="#8b5cf6" />
                <Text style={styles.photoButtonText}>Galería</Text>
              </TouchableOpacity>
            </View>
            {vehiclePhotoUri && (
              <View style={styles.photoPreview}>
                <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                <Text style={styles.photoPreviewText}>Foto seleccionada ✓</Text>
              </View>
            )}
          </View>
        )}

        {/* Step 2: Location */}
        {step === 2 && (
          <View style={styles.stepContent}>
            <Text style={styles.sectionTitle}>¿Dónde necesitas el servicio?</Text>

            <Text style={styles.inputLabel}>Dirección</Text>
            <TextInput style={styles.input} placeholder="Calle, número, barrio" placeholderTextColor="#555872" value={address} onChangeText={setAddress} />

            <Text style={styles.inputLabel}>Ciudad</Text>
            <TextInput style={styles.input} placeholder="Ej: Bogotá" placeholderTextColor="#555872" value={city} onChangeText={setCity} />
          </View>
        )}
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        {step > 0 && (
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep(s => s - 1)}>
            <Text style={styles.backBtnText}>Atrás</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.nextBtn, isLoading && { opacity: 0.6 }]}
          onPress={step < 2 ? () => setStep(s => s + 1) : handleSubmit}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          <LinearGradient colors={['#8b5cf6', '#a855f7']} style={styles.nextBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            {isLoading ? <ActivityIndicator color="#fff" /> : (
              <Text style={styles.nextBtnText}>{step < 2 ? 'Siguiente' : 'Crear Servicio'}</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050810' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
  headerTitle: { color: '#f0f0f5', fontSize: 18, fontWeight: '700' },
  stepsRow: { flexDirection: 'row', justifyContent: 'center', gap: 32, paddingBottom: 20 },
  stepItem: { alignItems: 'center', gap: 6 },
  stepDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(80,60,160,0.4)' },
  stepDotActive: { backgroundColor: '#8b5cf6' },
  stepLabel: { color: '#555872', fontSize: 11, fontWeight: '600' },
  stepLabelActive: { color: '#8b5cf6' },
  form: { flex: 1, paddingHorizontal: 20 },
  stepContent: {},
  sectionTitle: { color: '#f0f0f5', fontSize: 20, fontWeight: '800', marginBottom: 20 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  typeCard: { width: '47%' as any, backgroundColor: 'rgba(10,14,28,0.85)', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 2, borderColor: 'rgba(80,60,160,0.2)' },
  typeCardActive: { borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,0.1)' },
  typeEmoji: { fontSize: 28, marginBottom: 8 },
  typeLabel: { color: '#8b8fa3', fontSize: 13, fontWeight: '600', textAlign: 'center' },
  typeLabelActive: { color: '#8b5cf6' },
  inputLabel: { color: '#8b8fa3', fontSize: 13, fontWeight: '600', marginBottom: 8, marginLeft: 4 },
  input: { backgroundColor: 'rgba(15,23,42,0.8)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(80,60,160,0.4)', paddingVertical: 14, paddingHorizontal: 16, color: '#f0f0f5', fontSize: 15, marginBottom: 16 },
  photoRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  photoButton: { flex: 1, backgroundColor: 'rgba(10,14,28,0.85)', borderRadius: 14, padding: 20, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)' },
  photoButtonText: { color: '#8b5cf6', fontSize: 13, fontWeight: '600' },
  photoPreview: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  photoPreviewText: { color: '#22c55e', fontSize: 13 },
  bottomActions: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingBottom: 36, paddingTop: 12, backgroundColor: '#050810', borderTopWidth: 1, borderTopColor: 'rgba(80,60,160,0.2)' },
  backBtn: { justifyContent: 'center', paddingHorizontal: 20 },
  backBtnText: { color: '#8b8fa3', fontSize: 15, fontWeight: '600' },
  nextBtn: { flex: 1, borderRadius: 16, overflow: 'hidden' },
  nextBtnGradient: { paddingVertical: 16, alignItems: 'center', borderRadius: 16 },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
