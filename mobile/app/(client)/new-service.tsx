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
  const [formMode, setFormMode] = useState<'normal' | 'recovery'>('normal');

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

  // Recovery-specific state
  const [recVehicleType, setRecVehicleType] = useState('');
  const [recVehicleModel, setRecVehicleModel] = useState('');
  const [recVehiclePlate, setRecVehiclePlate] = useState('');
  const [recVehicleColor, setRecVehicleColor] = useState('');
  const [recDistinctiveMarks, setRecDistinctiveMarks] = useState('');
  const [recStolenDate, setRecStolenDate] = useState('');
  const [recStolenTime, setRecStolenTime] = useState('');
  const [recHasGps, setRecHasGps] = useState<'yes' | 'no' | 'unknown'>('unknown');
  const [recGpsBrand, setRecGpsBrand] = useState('');
  const [recAddress, setRecAddress] = useState('');
  const [recPoliceReport, setRecPoliceReport] = useState('');
  const [recDescription, setRecDescription] = useState('');

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
    if (!serviceType || !address || !city) {
      Alert.alert('Campos requeridos', 'Completa el tipo de servicio, dirección y ciudad.');
      return;
    }

    const selectedService = SERVICE_TYPES.find(t => t.key === serviceType);
    const finalTitle = title || selectedService?.label || 'Servicio Técnico';

    setIsLoading(true);
    try {
      const res = await fetchWithAuth('/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_type: serviceType,
          title: finalTitle,
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

      if (!res.ok) {
        let msg = 'Error al crear servicio';
        try {
          const errData = await res.json();
          if (Array.isArray(errData.detail)) {
             msg = errData.detail[0].msg; // e.g. String should have at least 10 characters
          } else if (errData.detail) {
             msg = errData.detail;
          }
        } catch(e){}
        throw new Error(msg);
      }
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
        { text: 'Ver servicio', onPress: () => router.replace(`/(client)/service/${serviceId}` as any) },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecoverySubmit = async () => {
    if (!recPoliceReport) {
      Alert.alert('Requerido', 'El número de denuncia policial es obligatorio.');
      return;
    }
    if (!recVehicleType || !recVehicleModel || !recVehiclePlate) {
      Alert.alert('Campos requeridos', 'Completa tipo de vehículo, modelo y placa.');
      return;
    }
    if (recHasGps !== 'yes' && !recAddress) {
      Alert.alert('Requerido', 'Ingresa la última ubicación vista.');
      return;
    }
    setIsLoading(true);
    try {
      const recTitle = `🚨 Recuperación - ${recVehicleType === 'motorcycle' ? 'Moto' : 'Carro'} ${recVehicleModel} (${recVehiclePlate})`;
      const res = await fetchWithAuth('/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_type: 'vehicle_recovery',
          title: recTitle,
          description: recDescription || 'Solicitud de recuperación de vehículo robado',
          service_address: recHasGps === 'yes' && !recAddress ? 'Seguimiento por GPS activo' : recAddress,
          service_city: 'Colombia',
          service_lat: 4.6097,
          service_lon: -74.0817,
          vehicle_type: recVehicleType,
          vehicle_model: recVehicleModel,
          vehicle_plate: recVehiclePlate,
          service_metadata: {
            has_gps: recHasGps,
            vehicle_color: recVehicleColor || null,
            distinctive_marks: recDistinctiveMarks || null,
            police_report_number: recPoliceReport || null,
          },
        }),
      });
      if (!res.ok) throw new Error('Error al crear solicitud de recuperación');
      const data = await res.json();
      const serviceId = data.id || data.service?.id;
      Alert.alert('🚨 Alerta Enviada', 'Tu solicitud fue enviada al equipo de reacción.', [
        { text: 'Ver servicio', onPress: () => router.replace(`/(client)/service/${serviceId}` as any) },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#f0f0f5" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nueva Solicitud</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Mode Selector */}
      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[styles.modeBtn, formMode === 'normal' && styles.modeBtnActive]}
          onPress={() => setFormMode('normal')}
          activeOpacity={0.7}
        >
          <Text style={styles.modeEmoji}>🔧</Text>
          <Text style={[styles.modeBtnText, formMode === 'normal' && styles.modeBtnTextActive]}>Servicio Técnico</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, formMode === 'recovery' && styles.modeBtnRecovery]}
          onPress={() => setFormMode('recovery')}
          activeOpacity={0.7}
        >
          <Text style={styles.modeEmoji}>🚨</Text>
          <Text style={[styles.modeBtnText, formMode === 'recovery' && styles.modeBtnTextRecovery]}>Equipo Reacción</Text>
        </TouchableOpacity>
      </View>

      {/* RECOVERY MODE */}
      {formMode === 'recovery' ? (
        <>
        <ScrollView style={styles.form} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 120 }}>
          <View style={styles.recoveryBadge}>
            <Ionicons name="shield" size={16} color="#ef4444" />
            <Text style={styles.recoveryBadgeText}>Recuperación de Vehículo Robado</Text>
          </View>

          <Text style={styles.sectionTitle}>Reportar Robo</Text>

          {/* Police Report */}
          <View style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#ef4444', marginBottom: 20 }}>
            <Text style={[styles.inputLabel, { color: '#ef4444', marginBottom: 4 }]}>N° denuncia policial *</Text>
            <Text style={{ color: '#fca5a5', fontSize: 11, marginBottom: 12 }}>⚠️ ¡Importante! Primero marca al 123 para realizar la denuncia.</Text>
            <TextInput 
              style={[styles.input, { borderColor: 'rgba(239, 68, 68, 0.5)', marginBottom: 0 }]} 
              placeholder="Ej: 202500012345" 
              placeholderTextColor="#ef444480" 
              value={recPoliceReport} 
              onChangeText={(text) => setRecPoliceReport(text.replace(/[^0-9]/g, ''))} 
              keyboardType="number-pad"
            />
          </View>

          {/* Vehicle Type */}
          <Text style={styles.inputLabel}>Tipo de Vehículo *</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            {[{ value: 'motorcycle', label: 'Moto', emoji: '🏍️' }, { value: 'car', label: 'Carro', emoji: '🚗' }].map(vt => (
              <TouchableOpacity
                key={vt.value}
                style={[styles.typeCard, { flex: 1 }, recVehicleType === vt.value && styles.typeCardRecovery]}
                onPress={() => setRecVehicleType(vt.value)}
              >
                <Text style={styles.typeEmoji}>{vt.emoji}</Text>
                <Text style={[styles.typeLabel, recVehicleType === vt.value && { color: '#ef4444' }]}>{vt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Model + Plate */}
          <Text style={styles.inputLabel}>Modelo *</Text>
          <TextInput style={styles.input} placeholder="Ej: Honda CB 190R" placeholderTextColor="#555872" value={recVehicleModel} onChangeText={setRecVehicleModel} />

          <Text style={styles.inputLabel}>Placa *</Text>
          <TextInput style={styles.input} placeholder="ABC123" placeholderTextColor="#555872" value={recVehiclePlate} onChangeText={t => setRecVehiclePlate(t.toUpperCase())} autoCapitalize="characters" />

          {/* Color + Marks */}
          <Text style={styles.inputLabel}>Color del vehículo</Text>
          <TextInput style={styles.input} placeholder="Ej: Rojo, Negro mate" placeholderTextColor="#555872" value={recVehicleColor} onChangeText={setRecVehicleColor} />

          <Text style={styles.inputLabel}>Marcas distintivas</Text>
          <TextInput style={styles.input} placeholder="Stickers, rayas, modificaciones..." placeholderTextColor="#555872" value={recDistinctiveMarks} onChangeText={setRecDistinctiveMarks} />

          {/* Has GPS */}
          <Text style={styles.inputLabel}>¿Tiene GPS activo?</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            {(['yes', 'no', 'unknown'] as const).map(opt => (
              <TouchableOpacity
                key={opt}
                style={[styles.gpsOption, recHasGps === opt && styles.gpsOptionActive]}
                onPress={() => setRecHasGps(opt)}
              >
                <Text style={[styles.gpsOptionText, recHasGps === opt && { color: '#ef4444' }]}>
                  {opt === 'yes' ? 'Sí' : opt === 'no' ? 'No' : 'No sé'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Last seen location */}
          {recHasGps !== 'yes' && (
            <View style={{ backgroundColor: 'rgba(15,23,42,0.5)', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#334155', marginBottom: 16 }}>
              <Text style={styles.inputLabel}>Última ubicación vista *</Text>
              <TextInput style={[styles.input, { marginBottom: 8 }]} placeholder="Barrio, calle, referencia..." placeholderTextColor="#555872" value={recAddress} onChangeText={setRecAddress} />
              
              <TouchableOpacity 
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#555872', borderStyle: 'dashed' }}
                onPress={async () => {
                  try {
                    const Location = require('expo-location');
                    let { status } = await Location.requestForegroundPermissionsAsync();
                    if (status !== 'granted') {
                      Alert.alert('Permiso denegado', 'Ingresa la ubicación manualmente.');
                      return;
                    }
                    let location = await Location.getCurrentPositionAsync({});
                    setRecAddress('Ubicación obtenida por GPS');
                  } catch (e) {
                    Alert.alert('Aviso', 'Ingresa tu ubicación manualmente.');
                  }
                }}
              >
                <Ionicons name="location" size={18} color="#8b8fa3" />
                <Text style={{ color: '#8b8fa3', fontSize: 13, fontWeight: '600', marginLeft: 8 }}>Obtener mi ubicación actual</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Notes */}
          <Text style={styles.inputLabel}>Información adicional (opcional)</Text>
          <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} placeholder="Cualquier dato relevante..." placeholderTextColor="#555872" value={recDescription} onChangeText={setRecDescription} multiline />
        </ScrollView>

        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={[styles.nextBtn, isLoading && { opacity: 0.6 }]}
            onPress={handleRecoverySubmit}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <LinearGradient colors={['#dc2626', '#ef4444']} style={styles.nextBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              {isLoading ? <ActivityIndicator color="#fff" /> : (
                <Text style={styles.nextBtnText}>🚨 Activar Equipo de Reacción</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
        </>
      ) : (
      /* NORMAL MODE */
      <>
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


            <Text style={styles.inputLabel}>Descripción (opcional)</Text>
            <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} placeholder="Describe lo que necesitas..." placeholderTextColor="#555872" value={description} onChangeText={setDescription} multiline />
          </View>
        )}

        {/* Step 1: Vehicle */}
        {step === 1 && (
          <View style={styles.stepContent}>
            <Text style={styles.sectionTitle}>Información del vehículo</Text>

            <Text style={styles.inputLabel}>Tipo de vehículo *</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
              {[{ value: 'motorcycle', label: 'Moto', emoji: '🏍️' }, { value: 'car', label: 'Carro', emoji: '🚗' }, { value: 'heavy_cargo', label: 'Carga', emoji: '🚚' }].map(vt => (
                <TouchableOpacity
                  key={vt.value}
                  style={[styles.typeCard, { flex: 1 }, vehicleType === vt.value && styles.typeCardActive]}
                  onPress={() => setVehicleType(vt.value)}
                >
                  <Text style={styles.typeEmoji}>{vt.emoji}</Text>
                  <Text style={[styles.typeLabel, vehicleType === vt.value && styles.typeLabelActive]}>{vt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

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
      </>
      )}
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
  // Mode selector
  modeRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 16 },
  modeBtn: { flex: 1, backgroundColor: 'rgba(10,14,28,0.85)', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 2, borderColor: 'rgba(80,60,160,0.2)', gap: 4 },
  modeBtnActive: { borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,0.1)' },
  modeBtnRecovery: { borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)' },
  modeEmoji: { fontSize: 22 },
  modeBtnText: { color: '#8b8fa3', fontSize: 12, fontWeight: '700' },
  modeBtnTextActive: { color: '#8b5cf6' },
  modeBtnTextRecovery: { color: '#ef4444' },
  // Recovery
  recoveryBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 6, backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 16 },
  recoveryBadgeText: { color: '#ef4444', fontSize: 12, fontWeight: '600' },
  typeCardRecovery: { borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)' },
  gpsOption: { flex: 1, backgroundColor: 'rgba(10,14,28,0.85)', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 2, borderColor: 'rgba(80,60,160,0.2)' },
  gpsOptionActive: { borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)' },
  gpsOptionText: { color: '#8b8fa3', fontSize: 13, fontWeight: '600' },
});
