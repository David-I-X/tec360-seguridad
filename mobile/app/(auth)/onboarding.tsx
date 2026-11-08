import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/lib/auth-context';
import { completeOnboarding, getPublicOrganizations } from '@/lib/api';
import { COLORS, SPACING, RADIUS, FONTS, GRADIENTS, SHADOWS } from '@/constants/theme';

export default function OnboardingScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'client' | 'technician' | 'company_admin'>('client');
  const [companyName, setCompanyName] = useState('');
  const [nit, setNit] = useState('');
  const [city, setCity] = useState('Medellín');
  const [dispatchMode, setDispatchMode] = useState<'manual' | 'direct'>('manual');
  const [organizationId, setOrganizationId] = useState('');
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string; city: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { refreshUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    getPublicOrganizations()
      .then((res) => {
        if (res?.organizations) setOrganizations(res.organizations);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (!fullName.trim()) {
      Alert.alert('Requerido', 'Por favor ingresa tu nombre completo');
      return;
    }
    if (role === 'company_admin' && !companyName.trim()) {
      Alert.alert('Requerido', 'Por favor ingresa el nombre de tu Taller o Empresa');
      return;
    }

    setIsLoading(true);
    try {
      const response = await completeOnboarding({
        full_name: fullName.trim(),
        email: email.trim() || undefined,
        user_type: role,
        company_name: role === 'company_admin' ? companyName.trim() : undefined,
        nit: role === 'company_admin' ? nit.trim() || undefined : undefined,
        city: role === 'company_admin' ? city.trim() || 'Medellín' : undefined,
        dispatch_mode: role === 'company_admin' ? dispatchMode : undefined,
        organization_id: role === 'technician' && organizationId ? organizationId : undefined,
      });

      await refreshUser();

      if (role === 'company_admin') {
        router.replace('/(tech)/taller' as any);
      } else if (role === 'technician') {
        router.replace({
          pathname: '/(tech)/dashboard',
          params: (response.user as any)?.is_new_technician ? { isNewTech: '1' } : {},
        });
      } else {
        router.replace('/(client)/services');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo completar el registro');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Completa tu perfil</Text>
        <Text style={styles.subtitle}>Cuéntanos un poco sobre ti para personalizar tu experiencia</Text>

        {/* Role Selector */}
        <Text style={styles.label}>¿Cómo usarás Tec360 Seguridad?</Text>
        <View style={styles.roleRow}>
          <TouchableOpacity
            style={[styles.roleCard, role === 'client' && styles.roleCardActive]}
            onPress={() => setRole('client')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="person-outline"
              size={24}
              color={role === 'client' ? COLORS.primary : COLORS.textMuted}
            />
            <Text style={[styles.roleTitle, role === 'client' && styles.roleTitleActive]}>Cliente</Text>
            <Text style={styles.roleDesc}>Solicitar servicios</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.roleCard, role === 'technician' && styles.roleCardActive]}
            onPress={() => setRole('technician')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="construct-outline"
              size={24}
              color={role === 'technician' ? COLORS.primary : COLORS.textMuted}
            />
            <Text style={[styles.roleTitle, role === 'technician' && styles.roleTitleActive]}>Técnico</Text>
            <Text style={styles.roleDesc}>Independiente</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.roleCard, role === 'company_admin' && styles.roleCardWorkshopActive]}
            onPress={() => setRole('company_admin')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="business-outline"
              size={24}
              color={role === 'company_admin' ? '#00F0FF' : COLORS.textMuted}
            />
            <Text style={[styles.roleTitle, role === 'company_admin' && styles.roleTitleWorkshop]}>Organización</Text>
            <Text style={styles.roleDesc}>Taller / Empresa</Text>
          </TouchableOpacity>
        </View>

        {/* Form Fields */}
        <Text style={styles.label}>
          {role === 'company_admin' ? 'Nombre del Administrador / Dueño *' : 'Nombre completo *'}
        </Text>
        <View style={styles.inputRow}>
          <Ionicons name="person-outline" size={20} color={COLORS.textMuted} />
          <TextInput
            style={styles.input}
            placeholder="Juan Pérez"
            placeholderTextColor={COLORS.textMuted}
            value={fullName}
            onChangeText={setFullName}
          />
        </View>

        <Text style={styles.label}>Correo electrónico (opcional)</Text>
        <View style={styles.inputRow}>
          <Ionicons name="mail-outline" size={20} color={COLORS.textMuted} />
          <TextInput
            style={styles.input}
            placeholder="correo@ejemplo.com"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        {role === 'technician' && organizations.length > 0 && (
          <View style={styles.workshopBox}>
            <View style={styles.workshopBoxHeader}>
              <Ionicons name="business-outline" size={18} color="#00F0FF" />
              <Text style={styles.workshopBoxTitle}>
                Organización / Taller (Opcional)
              </Text>
            </View>
            <Text style={styles.workshopBoxDesc}>
              Si trabajas para una organización registrada, escógela aquí para operar con su billetera corporativa.
            </Text>
            <View style={{ gap: 8, marginTop: 8 }}>
              <TouchableOpacity
                style={[styles.dispatchChip, !organizationId && styles.dispatchChipActive]}
                onPress={() => setOrganizationId('')}
              >
                <Text style={[styles.dispatchChipTitle, !organizationId && styles.dispatchChipTitleActive]}>
                  Soy Técnico Independiente (Sin organización)
                </Text>
              </TouchableOpacity>
              {organizations.map((org) => (
                <TouchableOpacity
                  key={org.id}
                  style={[styles.dispatchChip, organizationId === org.id && styles.dispatchChipActive]}
                  onPress={() => setOrganizationId(org.id)}
                >
                  <Text style={[styles.dispatchChipTitle, organizationId === org.id && styles.dispatchChipTitleActive]}>
                    {org.name} ({org.city})
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {role === 'company_admin' && (
          <View style={styles.workshopBox}>
            <View style={styles.workshopBoxHeader}>
              <Ionicons name="sparkles-outline" size={18} color="#00F0FF" />
              <Text style={styles.workshopBoxTitle}>
                Configuración de Taller (+Bono $200.000 COP)
              </Text>
            </View>
            <Text style={styles.workshopBoxDesc}>
              Tu taller recibe una billetera corporativa única con $200.000 COP de bienvenida para asignar cupos a tus técnicos certificados. El administrador gestiona el taller y no opera como técnico.
            </Text>

            <Text style={styles.label}>Nombre del Taller / Empresa *</Text>
            <View style={styles.inputRow}>
              <Ionicons name="business-outline" size={20} color={COLORS.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="Ej. Taller Central Alarmas y GPS"
                placeholderTextColor={COLORS.textMuted}
                value={companyName}
                onChangeText={setCompanyName}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>NIT / RFC (Opcional)</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    placeholder="900.123.456-7"
                    placeholderTextColor={COLORS.textMuted}
                    value={nit}
                    onChangeText={setNit}
                  />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Ciudad</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    placeholder="Medellín"
                    placeholderTextColor={COLORS.textMuted}
                    value={city}
                    onChangeText={setCity}
                  />
                </View>
              </View>
            </View>

            <Text style={styles.label}>Modo de Despacho Inicial</Text>
            <View style={styles.dispatchToggleRow}>
              <TouchableOpacity
                style={[styles.dispatchChip, dispatchMode === 'manual' && styles.dispatchChipActive]}
                onPress={() => setDispatchMode('manual')}
              >
                <Text style={[styles.dispatchChipTitle, dispatchMode === 'manual' && styles.dispatchChipTitleActive]}>
                  El Taller Asigna
                </Text>
                <Text style={styles.dispatchChipSub}>Despacho centralizado</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dispatchChip, dispatchMode === 'direct' && styles.dispatchChipActive]}
                onPress={() => setDispatchMode('direct')}
              >
                <Text style={[styles.dispatchChipTitle, dispatchMode === 'direct' && styles.dispatchChipTitleActive]}>
                  Técnico Acepta
                </Text>
                <Text style={styles.dispatchChipSub}>Autónomo con cupo</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
          activeOpacity={0.85}
        >
          <LinearGradient colors={GRADIENTS.primary} style={styles.buttonGradient}>
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.buttonText}>
                  {role === 'company_admin' ? 'Crear Cuenta de Taller' : 'Comenzar'}
                </Text>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.xxl },
  title: { fontSize: FONTS.sizes.xxl, fontWeight: FONTS.weights.bold, color: COLORS.text, marginBottom: SPACING.xs },
  subtitle: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, marginBottom: SPACING.xl },
  label: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.semibold, color: COLORS.textSecondary, marginBottom: SPACING.sm, marginTop: SPACING.md },
  roleRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  roleCard: {
    flex: 1, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    borderWidth: 1.5, borderColor: COLORS.border, padding: SPACING.md, alignItems: 'center', gap: 4,
  },
  roleCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.bgCardLight },
  roleCardWorkshopActive: { borderColor: '#00F0FF', backgroundColor: 'rgba(0,240,255,0.08)' },
  roleTitle: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.bold, color: COLORS.textSecondary },
  roleTitleActive: { color: COLORS.text },
  roleTitleWorkshop: { color: '#00F0FF' },
  roleDesc: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center' },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, height: 52,
  },
  input: { flex: 1, fontSize: FONTS.sizes.md, color: COLORS.text },
  workshopBox: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: 'rgba(0,240,255,0.22)',
  },
  workshopBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  workshopBoxTitle: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.bold,
    color: '#00F0FF',
  },
  workshopBoxDesc: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  dispatchToggleRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  dispatchChip: {
    flex: 1,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
  },
  dispatchChipActive: {
    borderColor: '#00F0FF',
    backgroundColor: 'rgba(0,240,255,0.1)',
  },
  dispatchChipTitle: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textSecondary,
  },
  dispatchChipTitleActive: {
    color: '#00F0FF',
  },
  dispatchChipSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  button: { borderRadius: RADIUS.lg, overflow: 'hidden', marginTop: SPACING.xl, ...SHADOWS.primary },
  buttonDisabled: { opacity: 0.6 },
  buttonGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: SPACING.md, gap: SPACING.sm,
  },
  buttonText: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold, color: '#fff' },
});
