import React, { useState, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Location from 'expo-location';
import { Marker } from 'react-native-maps';
import { TecMapView, TecMapViewRef, ServicePinMarker } from '@/components/map';
import { fetchWithAuth, API_URL } from '@/lib/api';
import { COLORS, SPACING, RADIUS, FONTS } from '@/constants/theme';

const SERVICE_TYPES = [
  { key: 'gps_installation', label: 'Instalación GPS', emoji: '📍' },
  { key: 'camera_installation', label: 'Instalación Dashcam', emoji: '📹' },
  { key: 'alarm_installation', label: 'Instalación Alarma', emoji: '🔔' },
  { key: 'gps_maintenance', label: 'Mantenimiento GPS', emoji: '📍' },
  { key: 'camera_maintenance', label: 'Mantenimiento Dashcam', emoji: '📹' },
  { key: 'alarm_maintenance', label: 'Mantenimiento Alarma', emoji: '🔔' },
  { key: 'other', label: 'Otro', emoji: '🔧' },
];

const STEPS = ['Tipo', 'Vehículo', 'Ubicación', 'Horario'];

const TIME_SLOTS = [
  { id: '08:00', label: '08:00 AM', period: 'Mañana', hours: 8, minutes: 0 },
  { id: '09:30', label: '09:30 AM', period: 'Mañana', hours: 9, minutes: 30 },
  { id: '11:00', label: '11:00 AM', period: 'Mañana', hours: 11, minutes: 0 },
  { id: '13:30', label: '01:30 PM', period: 'Tarde', hours: 13, minutes: 30 },
  { id: '15:00', label: '03:00 PM', period: 'Tarde', hours: 15, minutes: 0 },
  { id: '16:30', label: '04:30 PM', period: 'Tarde', hours: 16, minutes: 30 },
  { id: '18:00', label: '06:00 PM', period: 'Noche', hours: 18, minutes: 0 },
  { id: '19:30', label: '07:30 PM', period: 'Noche', hours: 19, minutes: 30 },
];

export default function NewServiceScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [formMode, setFormMode] = useState<'normal' | 'recovery'>('normal');

  const mapRef = useRef<TecMapViewRef | null>(null);

  // Form data
  const [serviceType, setServiceType] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Medellín');
  const [lat, setLat] = useState(6.2442); // Default to Medellín
  const [lng, setLng] = useState(-75.5636);
  const [vehicleType, setVehicleType] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehiclePhotoUri, setVehiclePhotoUri] = useState<string | null>(null);

  // Scheduling state
  const [scheduleMode, setScheduleMode] = useState<'asap' | 'scheduled'>('asap');
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${today.getFullYear()}-${mm}-${dd}`;
  });
  const [selectedSlot, setSelectedSlot] = useState<string>('09:30');
  const [isCustomTime, setIsCustomTime] = useState(false);
  const [customHour, setCustomHour] = useState('09');
  const [customMinute, setCustomMinute] = useState('00');
  const [customPeriod, setCustomPeriod] = useState<'AM' | 'PM'>('AM');
  const [clientNotes, setClientNotes] = useState('');

  // Recovery-specific state
  const [recVehicleType, setRecVehicleType] = useState('');
  const [recVehicleModel, setRecVehicleModel] = useState('');
  const [recVehiclePlate, setRecVehiclePlate] = useState('');
  const [recVehicleColor, setRecVehicleColor] = useState('');
  const [recDistinctiveMarks, setRecDistinctiveMarks] = useState('');
  const [recTimeFrame, setRecTimeFrame] = useState<'recent' | 'earlier' | 'yesterday' | 'other'>('recent');
  const [recStolenDate, setRecStolenDate] = useState('');
  const [recStolenTime, setRecStolenTime] = useState('');
  const [recHasGps, setRecHasGps] = useState<'yes' | 'no' | 'unknown'>('unknown');
  const [recGpsBrand, setRecGpsBrand] = useState('');
  const [recAddress, setRecAddress] = useState('');
  const [recPoliceReport, setRecPoliceReport] = useState('');
  const [recDescription, setRecDescription] = useState('');

  const getLocationAndGeocode = async (setAddrFn: (val: string) => void, setCityFn?: (val: string) => void) => {
    setIsLocating(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso de ubicación', 'Por favor habilita el acceso a tu ubicación o escribe la dirección manualmente.');
        setIsLocating(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const currentLat = location.coords.latitude;
      const currentLng = location.coords.longitude;
      setLat(currentLat);
      setLng(currentLng);

      // Smoothly animate map to current position
      mapRef.current?.animateToRegion({
        latitude: currentLat,
        longitude: currentLng,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      }, 500);

      let resolvedAddress = '';
      let resolvedCity = 'Medellín';

      try {
        const geocodeResult = await Location.reverseGeocodeAsync({
          latitude: currentLat,
          longitude: currentLng,
        });

        if (geocodeResult && geocodeResult.length > 0) {
          const addr = geocodeResult[0];
          resolvedCity = addr.city || addr.subregion || addr.region || 'Medellín';

          const streetPart = [addr.street, addr.streetNumber].filter(Boolean).join(' ');
          const zonePart = addr.district || addr.subregion || addr.name;

          const parts = [
            streetPart || zonePart,
            zonePart && zonePart !== streetPart ? zonePart : null,
            resolvedCity,
          ].filter(Boolean);

          if (parts.length > 0) {
            resolvedAddress = parts.join(', ');
          }
        }
      } catch (geocerr) {
        console.warn('Reverse geocoding error:', geocerr);
      }

      // If geocoding was empty or too short, build clear fallback with coordinates
      if (!resolvedAddress || resolvedAddress.trim().length < 5) {
        resolvedAddress = `Ubicación GPS (${currentLat.toFixed(4)}, ${currentLng.toFixed(4)}), ${resolvedCity}`;
      }

      setAddrFn(resolvedAddress);
      if (setCityFn) {
        setCityFn(resolvedCity);
      }
    } catch (e: any) {
      console.warn('GPS location error:', e);
      Alert.alert('Aviso GPS', 'No pudimos obtener la señal de GPS automáticamente. Puedes fijarla arrastrando el mapa o escribiendo tu dirección.');
    } finally {
      setIsLocating(false);
    }
  };

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

  const upcomingDays = useMemo(() => {
    const list = [];
    const now = new Date();
    const dayNames = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
    const monthNames = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

    for (let i = 0; i < 14; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateKey = `${yyyy}-${mm}-${dd}`;

      let label = dayNames[d.getDay()];
      if (i === 0) label = 'HOY';
      else if (i === 1) label = 'MAÑ';

      list.push({
        dateKey,
        rawDate: d,
        label,
        dayNum: d.getDate(),
        month: monthNames[d.getMonth()],
        fullText: d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }),
      });
    }
    return list;
  }, []);

  const isSlotPast = (slot: typeof TIME_SLOTS[0]) => {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayKey = `${today.getFullYear()}-${mm}-${dd}`;

    if (selectedDateKey !== todayKey) return false;

    const currentMinutes = today.getHours() * 60 + today.getMinutes();
    const slotMinutes = slot.hours * 60 + slot.minutes;
    return slotMinutes <= currentMinutes + 30;
  };

  const selectedDayObj = useMemo(() => {
    return upcomingDays.find(d => d.dateKey === selectedDateKey) || upcomingDays[0];
  }, [upcomingDays, selectedDateKey]);

  const formattedSelectedTime = useMemo(() => {
    if (isCustomTime) {
      return `${customHour}:${customMinute} ${customPeriod}`;
    }
    const slot = TIME_SLOTS.find(s => s.id === selectedSlot);
    return slot ? slot.label : '09:30 AM';
  }, [isCustomTime, customHour, customMinute, customPeriod, selectedSlot]);

  const handleNextStep = () => {
    if (step === 0) {
      if (!serviceType) {
        Alert.alert('Tipo de servicio', 'Por favor selecciona qué servicio necesitas.');
        return;
      }
      setStep(1);
      return;
    }
    if (step === 1) {
      if (!vehicleType) {
        Alert.alert('Vehículo requerido', 'Por favor selecciona el tipo de vehículo.');
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!address.trim()) {
        Alert.alert('Dirección requerida', 'Por favor ingresa o confirma la dirección del servicio.');
        return;
      }
      setStep(3);
      return;
    }
    if (step === 3) {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    const trimmedAddress = address.trim();
    const targetCity = (city || 'Medellín').trim();

    if (!serviceType) {
      Alert.alert('Tipo de servicio', 'Por favor selecciona qué servicio necesitas.');
      return;
    }
    if (!trimmedAddress) {
      Alert.alert('Dirección requerida', 'Por favor ingresa o confirma la dirección del servicio.');
      return;
    }

    // Guarantee address meets backend min length (at least 10 chars)
    const finalAddress = trimmedAddress.length < 10
      ? `${trimmedAddress}, ${targetCity}`
      : trimmedAddress;

    const selectedService = SERVICE_TYPES.find(t => t.key === serviceType);
    const serviceLabel = selectedService?.key === 'other' ? 'Servicio General' : (selectedService?.label || 'Servicio Técnico');

    // Build scheduled date & time ISO preserving local time
    let targetDate: Date;
    let targetHours: number;
    let targetMinutes: number;

    if (scheduleMode === 'asap') {
      targetDate = new Date();
      targetDate.setMinutes(targetDate.getMinutes() + 45);
      targetHours = targetDate.getHours();
      targetMinutes = targetDate.getMinutes();
    } else {
      const [y, m, d] = selectedDateKey.split('-').map(Number);
      targetDate = new Date(y, m - 1, d);

      if (isCustomTime) {
        let h = parseInt(customHour, 10);
        if (customPeriod === 'PM' && h < 12) h += 12;
        if (customPeriod === 'AM' && h === 12) h = 0;
        targetHours = h;
        targetMinutes = parseInt(customMinute, 10);
      } else {
        const slot = TIME_SLOTS.find(s => s.id === selectedSlot) || TIME_SLOTS[0];
        targetHours = slot.hours;
        targetMinutes = slot.minutes;
      }
    }

    const pad = (n: number) => n.toString().padStart(2, '0');
    const localISO = `${targetDate.getFullYear()}-${pad(targetDate.getMonth() + 1)}-${pad(targetDate.getDate())}T${pad(targetHours)}:${pad(targetMinutes)}:00`;

    const formattedDateForTitle = `${pad(targetDate.getDate())}/${pad(targetDate.getMonth() + 1)}/${targetDate.getFullYear()}`;
    const finalTitle = title.trim().length >= 5
      ? title.trim()
      : `${serviceLabel}${vehicleModel ? ` - ${vehicleModel}` : ''} - ${formattedDateForTitle}`;

    setIsLoading(true);
    try {
      const res = await fetchWithAuth('/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_type: serviceType,
          title: finalTitle,
          description: description || undefined,
          service_address: finalAddress,
          service_city: targetCity,
          service_lat: Number(lat) || 6.2442,
          service_lon: Number(lng) || -75.5636,
          scheduled_date: localISO,
          client_notes: clientNotes ? clientNotes.trim() : (description || undefined),
          vehicle_type: vehicleType || undefined,
          vehicle_model: vehicleModel || undefined,
          vehicle_plate: vehiclePlate ? vehiclePlate.trim() : undefined,
        }),
      });

      if (!res.ok) {
        let msg = 'Error al crear servicio';
        try {
          const errData = await res.json();
          if (Array.isArray(errData.details)) {
            msg = errData.details.join('\n');
          } else if (Array.isArray(errData.detail)) {
            msg = errData.detail.map((e: any) => e.msg || e).join('\n');
          } else if (typeof errData.detail === 'string') {
            msg = errData.detail;
          } else if (errData.error) {
            msg = errData.error;
          }
        } catch (_) {}
        throw new Error(msg);
      }
      const data = await res.json();
      const serviceId = data.id || data.service?.id;

      // Upload vehicle photo if present
      if (vehiclePhotoUri && serviceId) {
        try {
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
        } catch (photoErr) {
          console.warn('Vehicle photo upload failed:', photoErr);
        }
      }

      Alert.alert('¡Servicio programado!', 'Tu solicitud fue guardada y asignada a los técnicos disponibles.', [
        { text: 'Ver servicio', onPress: () => router.replace(`/(client)/service/${serviceId}` as any) },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo crear el servicio');
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

    const trimmedRecAddress = recAddress.trim();
    // Build the address: when GPS is active and no manual address, use a default
    const finalAddress = (recHasGps === 'yes' && !trimmedRecAddress)
      ? 'Seguimiento por GPS activo, Medellín'
      : (trimmedRecAddress.length < 10 ? `${trimmedRecAddress}, Medellín` : trimmedRecAddress);

    let stolenDatetime = 'Hace menos de 1 hora';
    if (recTimeFrame === 'earlier') stolenDatetime = 'Hoy más temprano';
    else if (recTimeFrame === 'yesterday') stolenDatetime = 'Ayer';
    else if (recTimeFrame === 'other') {
      stolenDatetime = [recStolenDate, recStolenTime].filter(Boolean).join(' ') || 'Fecha por precisar';
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
          service_address: finalAddress,
          service_city: city || 'Medellín',
          service_lat: Number(lat) || 6.2442,
          service_lon: Number(lng) || -75.5636,
          scheduled_date: new Date().toISOString(),
          vehicle_type: recVehicleType,
          vehicle_model: recVehicleModel,
          vehicle_plate: recVehiclePlate,
          service_metadata: {
            has_gps: recHasGps,
            gps_brand: recGpsBrand || null,
            vehicle_color: recVehicleColor || null,
            distinctive_marks: recDistinctiveMarks || null,
            police_report_number: recPoliceReport || null,
            stolen_datetime: stolenDatetime,
          },
        }),
      });

      if (!res.ok) {
        let msg = 'Error al crear solicitud de recuperación';
        try {
          const errData = await res.json();
          if (Array.isArray(errData.details)) {
            msg = errData.details.join('\n');
          } else if (Array.isArray(errData.detail)) {
            msg = errData.detail.map((e: any) => e.msg || e).join('\n');
          } else if (typeof errData.detail === 'string') {
            msg = errData.detail;
          } else if (errData.error) {
            msg = errData.error;
          }
        } catch (_) {}
        throw new Error(msg);
      }

      const data = await res.json();
      const serviceId = data.id || data.service?.id;
      Alert.alert('🚨 Alerta Enviada', 'Tu solicitud fue enviada al equipo de reacción.', [
        { text: 'Ver servicio', onPress: () => router.replace(`/(client)/service/${serviceId}` as any) },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo activar la solicitud');
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
                onPress={() => getLocationAndGeocode(setRecAddress, setCity)}
                disabled={isLocating}
              >
                {isLocating ? (
                  <ActivityIndicator size="small" color="#8b8fa3" />
                ) : (
                  <>
                    <Ionicons name="location" size={18} color="#8b8fa3" />
                    <Text style={{ color: '#8b8fa3', fontSize: 13, fontWeight: '600', marginLeft: 8 }}>Obtener mi ubicación actual</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Time frame when it happened */}
          <Text style={styles.inputLabel}>¿Cuándo ocurrió el suceso? *</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {[
              { key: 'recent', label: '⚡ Menos de 1 hr' },
              { key: 'earlier', label: '🕒 Hoy más temprano' },
              { key: 'yesterday', label: '📅 Ayer' },
              { key: 'other', label: '🗓️ Otra fecha' },
            ].map(tf => (
              <TouchableOpacity
                key={tf.key}
                style={[styles.gpsOption, recTimeFrame === tf.key && styles.gpsOptionActive]}
                onPress={() => setRecTimeFrame(tf.key as any)}
              >
                <Text style={[styles.gpsOptionText, recTimeFrame === tf.key && { color: '#ef4444', fontWeight: '700' }]}>
                  {tf.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {recTimeFrame === 'other' && (
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Fecha aproximada</Text>
                <TextInput
                  style={styles.input}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor="#555872"
                  value={recStolenDate}
                  onChangeText={setRecStolenDate}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Hora aproximada</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: 03:30 PM"
                  placeholderTextColor="#555872"
                  value={recStolenTime}
                  onChangeText={setRecStolenTime}
                />
              </View>
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
        {STEPS.map((label, i) => (
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

            <TouchableOpacity 
              style={[styles.gpsOption, { flexDirection: 'row', justifyContent: 'center', paddingVertical: 12, marginBottom: 12 }]}
              onPress={() => getLocationAndGeocode(setAddress, setCity)}
              disabled={isLocating}
            >
              {isLocating ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <>
                  <Ionicons name="location" size={20} color={COLORS.primary} />
                  <Text style={[styles.gpsOptionText, { marginLeft: 8, color: COLORS.primary, fontSize: 15, fontWeight: '700' }]}>
                    Usar mi ubicación actual
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <View style={{ height: 260, marginVertical: 8, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border }}>
              <TecMapView
                ref={mapRef}
                style={{ flex: 1 }}
                initialRegion={{
                  latitude: lat,
                  longitude: lng,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                onRegionChangeComplete={async (region) => {
                  setLat(region.latitude);
                  setLng(region.longitude);
                  try {
                    const res = await Location.reverseGeocodeAsync({ latitude: region.latitude, longitude: region.longitude });
                    if (res && res.length > 0) {
                      const addr = res[0];
                      const detectedCity = addr.city || addr.subregion || addr.region || 'Medellín';
                      const streetPart = [addr.street, addr.streetNumber].filter(Boolean).join(' ');
                      const zonePart = addr.district || addr.subregion || addr.name;
                      const parts = [
                        streetPart || zonePart,
                        zonePart && zonePart !== streetPart ? zonePart : null,
                        detectedCity,
                      ].filter(Boolean);
                      if (parts.length > 0) {
                        setAddress(parts.join(', '));
                      }
                      setCity(detectedCity);
                    }
                  } catch (e) {}
                }}
              >
                <Marker coordinate={{ latitude: lat, longitude: lng }} anchor={{ x: 0.5, y: 1 }}>
                  <ServicePinMarker />
                </Marker>
              </TecMapView>
            </View>

            {/* Coordinates Badge */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14, paddingHorizontal: 4 }}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.green} />
              <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>
                Punto fijado: {lat.toFixed(4)}, {lng.toFixed(4)}
              </Text>
            </View>

            <Text style={styles.inputLabel}>Dirección / Referencia *</Text>
            <TextInput
              style={styles.input}
              placeholder="Calle, número, barrio"
              placeholderTextColor="#555872"
              value={address}
              onChangeText={setAddress}
            />

            <Text style={styles.inputLabel}>Ciudad *</Text>
            <TextInput
              style={styles.input}
              placeholder="Medellín"
              placeholderTextColor="#555872"
              value={city}
              onChangeText={setCity}
            />
          </View>
        )}

        {/* Step 3: Schedule & Confirmation */}
        {step === 3 && (
          <View style={styles.stepContent}>
            <Text style={styles.sectionTitle}>Fecha y hora de la cita</Text>

            {/* Mode selection: ASAP vs Scheduled */}
            <View style={styles.scheduleModeRow}>
              <TouchableOpacity
                style={[styles.scheduleModeCard, scheduleMode === 'asap' && styles.scheduleModeCardActive]}
                onPress={() => setScheduleMode('asap')}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Ionicons name="flash" size={16} color={scheduleMode === 'asap' ? COLORS.primaryLight : COLORS.textSecondary} />
                  <Text style={[styles.scheduleModeTitle, scheduleMode === 'asap' && styles.scheduleModeTitleActive]}>
                    Hoy mismo
                  </Text>
                </View>
                <Text style={styles.scheduleModeSub}>Lo antes posible (1-2 hrs)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.scheduleModeCard, scheduleMode === 'scheduled' && styles.scheduleModeCardActive]}
                onPress={() => setScheduleMode('scheduled')}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Ionicons name="calendar" size={16} color={scheduleMode === 'scheduled' ? COLORS.primaryLight : COLORS.textSecondary} />
                  <Text style={[styles.scheduleModeTitle, scheduleMode === 'scheduled' && styles.scheduleModeTitleActive]}>
                    Programar
                  </Text>
                </View>
                <Text style={styles.scheduleModeSub}>Elegir fecha y hora</Text>
              </TouchableOpacity>
            </View>

            {scheduleMode === 'scheduled' && (
              <>
                {/* Day selector */}
                <Text style={styles.inputLabel}>Selecciona el día</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.daysScroll}
                >
                  {upcomingDays.map((d) => {
                    const isSelected = selectedDateKey === d.dateKey;
                    return (
                      <TouchableOpacity
                        key={d.dateKey}
                        style={[styles.dayCard, isSelected && styles.dayCardActive]}
                        onPress={() => setSelectedDateKey(d.dateKey)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.dayCardLabel, isSelected && styles.dayCardLabelActive]}>
                          {d.label}
                        </Text>
                        <Text style={[styles.dayCardNum, isSelected && styles.dayCardNumActive]}>
                          {d.dayNum}
                        </Text>
                        <Text style={[styles.dayCardMonth, isSelected && styles.dayCardMonthActive]}>
                          {d.month}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Time selection */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, marginBottom: 8 }}>
                  <Text style={[styles.inputLabel, { marginBottom: 0 }]}>Franja horaria</Text>
                  <TouchableOpacity onPress={() => setIsCustomTime(!isCustomTime)}>
                    <Text style={{ color: COLORS.primaryLight, fontSize: 12, fontWeight: '700' }}>
                      {isCustomTime ? 'Ver franjas sugeridas' : '⏰ Hora exacta'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {!isCustomTime ? (
                  <View style={styles.slotsContainer}>
                    {['Mañana', 'Tarde', 'Noche'].map((period) => {
                      const periodSlots = TIME_SLOTS.filter(s => s.period === period);
                      return (
                        <View key={period}>
                          <Text style={styles.slotGroupTitle}>
                            {period === 'Mañana' ? '🌅 Mañana' : period === 'Tarde' ? '☀️ Tarde' : '🌆 Noche'}
                          </Text>
                          <View style={styles.slotsRow}>
                            {periodSlots.map((slot) => {
                              const isPast = isSlotPast(slot);
                              const isSelected = selectedSlot === slot.id && !isPast;
                              return (
                                <TouchableOpacity
                                  key={slot.id}
                                  style={[
                                    styles.slotChip,
                                    isSelected && styles.slotChipActive,
                                    isPast && styles.slotChipDisabled,
                                  ]}
                                  onPress={() => {
                                    if (isPast) {
                                      Alert.alert('Hora no disponible', 'Esta franja horaria ya pasó para el día de hoy.');
                                      return;
                                    }
                                    setSelectedSlot(slot.id);
                                  }}
                                  activeOpacity={isPast ? 1 : 0.7}
                                >
                                  <Text style={[
                                    styles.slotChipText,
                                    isSelected && styles.slotChipTextActive,
                                    isPast && styles.slotChipTextDisabled,
                                  ]}>
                                    {slot.label}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.customTimeContainer}>
                    <Text style={styles.customTimeLabel}>Hora</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.customPillsScroll}>
                      {['07', '08', '09', '10', '11', '12', '01', '02', '03', '04', '05', '06', '07', '08'].map(h => (
                        <TouchableOpacity
                          key={h}
                          style={[styles.customPill, customHour === h && styles.customPillActive]}
                          onPress={() => setCustomHour(h)}
                        >
                          <Text style={[styles.customPillText, customHour === h && styles.customPillTextActive]}>{h}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    <Text style={styles.customTimeLabel}>Minutos</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {['00', '15', '30', '45'].map(m => (
                        <TouchableOpacity
                          key={m}
                          style={[styles.customPill, { flex: 1 }, customMinute === m && styles.customPillActive]}
                          onPress={() => setCustomMinute(m)}
                        >
                          <Text style={[styles.customPillText, customMinute === m && styles.customPillTextActive]}>:{m}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={styles.customTimeLabel}>Jornada</Text>
                    <View style={styles.customAmPmRow}>
                      {(['AM', 'PM'] as const).map(p => (
                        <TouchableOpacity
                          key={p}
                          style={[styles.customAmPmBtn, customPeriod === p && styles.customAmPmBtnActive]}
                          onPress={() => setCustomPeriod(p)}
                        >
                          <Text style={[styles.customAmPmText, customPeriod === p && styles.customAmPmTextActive]}>{p}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </>
            )}

            {/* Client Notes */}
            <Text style={[styles.inputLabel, { marginTop: 14 }]}>Instrucciones para el técnico (opcional)</Text>
            <TextInput
              style={[styles.input, { height: 75, textAlignVertical: 'top' }]}
              placeholder="Ej: Timbre 402, preguntar por Carlos, portón negro..."
              placeholderTextColor="#555872"
              value={clientNotes}
              onChangeText={setClientNotes}
              multiline
            />

            {/* Summary card */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Ionicons name="receipt-outline" size={18} color={COLORS.primaryLight} />
                <Text style={styles.summaryTitle}>Resumen de la cita</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Servicio</Text>
                <Text style={styles.summaryValue}>
                  {SERVICE_TYPES.find(t => t.key === serviceType)?.emoji} {SERVICE_TYPES.find(t => t.key === serviceType)?.label || 'Servicio Técnico'}
                </Text>
              </View>
              {vehicleType ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Vehículo</Text>
                  <Text style={styles.summaryValue}>
                    {vehicleModel || (vehicleType === 'car' ? 'Carro' : vehicleType === 'motorcycle' ? 'Moto' : 'Carga')}
                    {vehiclePlate ? ` (${vehiclePlate})` : ''}
                  </Text>
                </View>
              ) : null}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Ubicación</Text>
                <Text style={styles.summaryValue} numberOfLines={1}>
                  {address || 'Ubicación fijada'}
                </Text>
              </View>
              <View style={[styles.summaryRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                <Text style={styles.summaryLabel}>Fecha y Hora</Text>
                <Text style={[styles.summaryValue, { color: COLORS.primaryLight, fontWeight: '700' }]}>
                  {scheduleMode === 'asap'
                    ? '⚡ Hoy mismo (Lo antes posible)'
                    : `📅 ${selectedDayObj?.label} ${selectedDayObj?.dayNum} ${selectedDayObj?.month} · ${formattedSelectedTime}`}
                </Text>
              </View>
            </View>
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
          onPress={step < 3 ? handleNextStep : handleSubmit}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          <LinearGradient colors={['#8b5cf6', '#a855f7']} style={styles.nextBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            {isLoading ? <ActivityIndicator color="#fff" /> : (
              <Text style={styles.nextBtnText}>{step < 3 ? 'Siguiente' : 'Confirmar Servicio'}</Text>
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
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: SPACING.md },
  headerTitle: { color: COLORS.text, fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold },
  stepsRow: { flexDirection: 'row', justifyContent: 'center', gap: SPACING.xl, paddingBottom: 20 },
  stepItem: { alignItems: 'center', gap: 6 },
  stepDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(80,60,160,0.4)' },
  stepDotActive: { backgroundColor: COLORS.primary },
  stepLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: FONTS.weights.semibold },
  stepLabelActive: { color: COLORS.primary },
  form: { flex: 1, paddingHorizontal: 20 },
  stepContent: {},
  sectionTitle: { color: COLORS.text, fontSize: FONTS.sizes.xl, fontWeight: '800', marginBottom: 20 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: SPACING.lg },
  typeCard: { width: '47%' as any, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: 20, alignItems: 'center', borderWidth: 2, borderColor: COLORS.border },
  typeCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryMuted },
  typeEmoji: { fontSize: 28, marginBottom: SPACING.sm },
  typeLabel: { color: COLORS.textSecondary, fontSize: 13, fontWeight: FONTS.weights.semibold, textAlign: 'center' },
  typeLabelActive: { color: COLORS.primary },
  inputLabel: { color: COLORS.textSecondary, fontSize: 13, fontWeight: FONTS.weights.semibold, marginBottom: SPACING.sm, marginLeft: SPACING.xs },
  input: { backgroundColor: 'rgba(15,23,42,0.8)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(80,60,160,0.4)', paddingVertical: SPACING.md, paddingHorizontal: SPACING.md, color: COLORS.text, fontSize: 15, marginBottom: SPACING.md },
  photoRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.md },
  photoButton: { flex: 1, backgroundColor: COLORS.bgCard, borderRadius: 14, padding: 20, alignItems: 'center', gap: SPACING.sm, borderWidth: 1, borderColor: COLORS.primaryBorder },
  photoButtonText: { color: COLORS.primary, fontSize: 13, fontWeight: FONTS.weights.semibold },
  photoPreview: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: SPACING.sm },
  photoPreviewText: { color: COLORS.green, fontSize: 13 },
  bottomActions: { flexDirection: 'row', gap: SPACING.md, paddingHorizontal: 20, paddingBottom: 36, paddingTop: SPACING.md, backgroundColor: COLORS.bg, borderTopWidth: 1, borderTopColor: COLORS.border },
  backBtn: { justifyContent: 'center', paddingHorizontal: 20 },
  backBtnText: { color: COLORS.textSecondary, fontSize: 15, fontWeight: FONTS.weights.semibold },
  nextBtn: { flex: 1, borderRadius: RADIUS.lg, overflow: 'hidden' },
  nextBtnGradient: { paddingVertical: SPACING.md, alignItems: 'center', borderRadius: RADIUS.lg },
  nextBtnText: { color: '#fff', fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold },
  // Mode selector
  modeRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginBottom: SPACING.md },
  modeBtn: { flex: 1, backgroundColor: COLORS.bgCard, borderRadius: 14, padding: 20, alignItems: 'center', borderWidth: 2, borderColor: COLORS.border, gap: SPACING.xs },
  modeBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryMuted },
  modeBtnRecovery: { borderColor: COLORS.red, backgroundColor: COLORS.redMuted },
  modeEmoji: { fontSize: 22 },
  modeBtnText: { color: COLORS.textSecondary, fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.bold },
  modeBtnTextActive: { color: COLORS.primary },
  modeBtnTextRecovery: { color: COLORS.red },
  // Recovery
  recoveryBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 6, backgroundColor: COLORS.redMuted, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', borderRadius: RADIUS.round, paddingHorizontal: SPACING.md, paddingVertical: 6, marginBottom: SPACING.md },
  recoveryBadgeText: { color: COLORS.red, fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.semibold },
  typeCardRecovery: { borderColor: COLORS.red, backgroundColor: COLORS.redMuted },
  gpsOption: { flex: 1, backgroundColor: COLORS.bgCard, borderRadius: 10, padding: SPACING.md, alignItems: 'center', borderWidth: 2, borderColor: COLORS.border },
  gpsOptionActive: { borderColor: COLORS.red, backgroundColor: COLORS.redMuted },
  gpsOptionText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: FONTS.weights.semibold },
  // Schedule styles
  scheduleModeRow: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  scheduleModeCard: { flex: 1, backgroundColor: COLORS.bgCard, borderRadius: 14, padding: 14, borderWidth: 2, borderColor: COLORS.border },
  scheduleModeCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryMuted },
  scheduleModeTitle: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '700' },
  scheduleModeTitleActive: { color: COLORS.primaryLight },
  scheduleModeSub: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  daysScroll: { gap: 8, paddingBottom: 10, paddingTop: 2 },
  dayCard: { width: 62, paddingVertical: 10, alignItems: 'center', backgroundColor: COLORS.bgCard, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.border },
  dayCardActive: { borderColor: COLORS.primary, backgroundColor: 'rgba(139,92,246,0.22)' },
  dayCardLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  dayCardLabelActive: { color: COLORS.primaryLight },
  dayCardNum: { color: COLORS.text, fontSize: 18, fontWeight: '800', marginVertical: 2 },
  dayCardNumActive: { color: '#ffffff' },
  dayCardMonth: { color: COLORS.textMuted, fontSize: 10, fontWeight: '600' },
  dayCardMonthActive: { color: COLORS.primaryLight },
  slotsContainer: { gap: 10, marginBottom: 14 },
  slotGroupTitle: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700', marginBottom: 6 },
  slotsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotChip: { width: '31%', paddingVertical: 10, borderRadius: 10, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  slotChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryMuted },
  slotChipDisabled: { opacity: 0.3 },
  slotChipText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  slotChipTextActive: { color: COLORS.primaryLight, fontWeight: '800' },
  slotChipTextDisabled: { color: COLORS.textMuted },
  customTimeContainer: { backgroundColor: 'rgba(15,23,42,0.85)', borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 14, gap: 12, marginBottom: 14 },
  customTimeLabel: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
  customPillsScroll: { gap: 6, paddingVertical: 2 },
  customPill: { minWidth: 42, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  customPillActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryMuted },
  customPillText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  customPillTextActive: { color: COLORS.primaryLight, fontWeight: '800' },
  customAmPmRow: { flexDirection: 'row', gap: 8 },
  customAmPmBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  customAmPmBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryMuted },
  customAmPmText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '700' },
  customAmPmTextActive: { color: COLORS.primaryLight },
  summaryCard: { backgroundColor: 'rgba(15,23,42,0.9)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)', padding: 16, marginTop: 16, gap: 10 },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  summaryTitle: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(80,60,160,0.1)' },
  summaryLabel: { color: COLORS.textMuted, fontSize: 12 },
  summaryValue: { color: COLORS.text, fontSize: 12, fontWeight: '600', maxWidth: '65%', textAlign: 'right' },
});
