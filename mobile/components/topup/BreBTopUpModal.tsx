import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { COLORS, NEU, RADIUS } from '@/constants/theme';
import {
  getTopUpConfig,
  resolveTopUpQrUrl,
  submitTopUpRequest,
  type TopUpConfig,
  type TopUpRequestItem,
} from '@/lib/api';

interface BreBTopUpModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmitted: () => void;
  title?: string;
  subtitle?: string;
  presetAmounts?: number[];
}

const DEFAULT_PRESETS = [20000, 50000, 100000, 200000];

function formatCOP(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(amount);
}

export function BreBTopUpModal({
  visible,
  onClose,
  onSubmitted,
  title = 'Recargar con Bre-B',
  subtitle = 'Transfiere a nuestra llave y sube tu comprobante',
  presetAmounts = DEFAULT_PRESETS,
}: BreBTopUpModalProps) {
  const [config, setConfig] = useState<TopUpConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [customAmount, setCustomAmount] = useState(String(presetAmounts[1] || 50000));
  const [referenceHint, setReferenceHint] = useState('');
  const [receipt, setReceipt] = useState<{ uri: string; name: string; mimeType: string } | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedReq, setSubmittedReq] = useState<TopUpRequestItem | null>(null);

  useEffect(() => {
    if (!visible) return;
    let mounted = true;
    setError(null);
    setLoadingConfig(true);
    getTopUpConfig()
      .then((cfg) => {
        if (mounted) setConfig(cfg);
      })
      .catch((err: any) => {
        if (mounted) setError(err?.message || 'No se pudo cargar la información de pago.');
      })
      .finally(() => {
        if (mounted) setLoadingConfig(false);
      });
    return () => {
      mounted = false;
    };
  }, [visible]);

  const resetAndClose = () => {
    if (submitting) return;
    setError(null);
    setSubmittedReq(null);
    setReceipt(null);
    setReferenceHint('');
    onClose();
  };

  const handleShareKey = async () => {
    if (!config?.payee_key) return;
    try {
      await Share.share({
        message: config.payee_key,
      });
    } catch {
      // Cancelado por usuario
    }
  };

  const handlePickReceipt = async () => {
    setError(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Necesitamos permiso para seleccionar la captura de tu galería.');
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      allowsEditing: false,
    });
    if (res.canceled || !res.assets?.length) return;

    const asset = res.assets[0];
    setError(null);
    setCompressing(true);
    try {
      const actions: ImageManipulator.Action[] = [];
      if (asset.width && asset.height && Math.max(asset.width, asset.height) > 1280) {
        actions.push(
          asset.width >= asset.height ? { resize: { width: 1280 } } : { resize: { height: 1280 } }
        );
      } else if (asset.width && asset.width > 1280) {
        actions.push({ resize: { width: 1280 } });
      }
      const compressed = await ImageManipulator.manipulateAsync(asset.uri, actions, {
        compress: 0.65,
        format: ImageManipulator.SaveFormat.JPEG,
      });
      setReceipt({
        uri: compressed.uri,
        name: `comprobante_${Date.now()}.jpg`,
        mimeType: 'image/jpeg',
      });
    } catch {
      const rawName = (asset.fileName || asset.uri.split('/').pop() || '').toLowerCase();
      const ext = rawName.includes('.') ? `.${rawName.split('.').pop()}` : '';
      const mimeByExt: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
      };
      const mimeType = asset.mimeType && mimeByExt[`.${asset.mimeType.split('/')[1]}`]
        ? asset.mimeType
        : mimeByExt[ext];
      if (!mimeType) {
        setError('Formato de imagen no compatible. Usa una captura JPG, PNG o WEBP.');
        setReceipt(null);
      } else {
        setReceipt({
          uri: asset.uri,
          name: asset.fileName || `comprobante_${Date.now()}${ext || '.jpg'}`,
          mimeType,
        });
      }
    } finally {
      setCompressing(false);
    }
  };

  const handleSubmit = async () => {
    const amount = Number(customAmount);
    const minAmount = config?.min_amount ?? 10000;
    const maxAmount = config?.max_amount ?? 2000000;

    if (!Number.isFinite(amount) || amount < minAmount || amount > maxAmount) {
      setError(`El monto debe estar entre ${formatCOP(minAmount)} y ${formatCOP(maxAmount)} COP.`);
      return;
    }
    if (!receipt) {
      setError('Adjunta la captura del comprobante de pago.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const created = await submitTopUpRequest({
        amount,
        referenceHint: referenceHint.trim() || undefined,
        receiptUri: receipt.uri,
        receiptName: receipt.name,
        receiptMimeType: receipt.mimeType,
      });
      setSubmittedReq(created);
      onSubmitted();
    } catch (err: any) {
      setError(err?.message || 'No se pudo enviar el comprobante. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const qrResolvedUrl = resolveTopUpQrUrl(config?.qr_url);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={resetAndClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.sheet}
        >
          {submittedReq ? (
            <View style={styles.doneBox}>
              <Ionicons name="time-outline" size={58} color={COLORS.primaryLight} />
              <Text style={styles.doneTitle}>Comprobante en revisión</Text>
              <Text style={styles.doneSubtitle}>
                Recibimos tu solicitud por {formatCOP(submittedReq.amount)} COP. Tu saldo se
                acreditará automáticamente en cuanto se valide la transferencia.
              </Text>
              <View style={styles.doneMeta}>
                <Text style={styles.doneMetaText}>
                  ID solicitud: {submittedReq.id.slice(0, 12)}
                </Text>
                {submittedReq.reference_hint ? (
                  <Text style={styles.doneMetaText}>
                    Ref. indicada: {submittedReq.reference_hint}
                  </Text>
                ) : null}
              </View>
              <TouchableOpacity style={styles.primaryBtn} onPress={resetAndClose} activeOpacity={0.85}>
                <LinearGradient colors={['#7c3aed', '#6d28d9']} style={styles.primaryBtnGradient}>
                  <Text style={styles.primaryBtnText}>Entendido</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.header}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{title}</Text>
                  <Text style={styles.subtitle}>{subtitle}</Text>
                </View>
                <TouchableOpacity onPress={resetAndClose} hitSlop={10}>
                  <Ionicons name="close" size={24} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              {loadingConfig ? (
                <View style={styles.loaderBox}>
                  <ActivityIndicator color={COLORS.primaryLight} />
                  <Text style={styles.loaderText}>Cargando datos Bre-B...</Text>
                </View>
              ) : config && !config.can_request ? (
                <View style={styles.blockedBox}>
                  <Ionicons name="shield-outline" size={32} color={COLORS.yellow} />
                  <Text style={styles.blockedTitle}>Recarga gestionada por tu Taller</Text>
                  <Text style={styles.blockedText}>
                    {config.blocked_reason ||
                      'Solo el dueño o gerente del taller puede solicitar recargas para la billetera compartida.'}
                  </Text>
                </View>
              ) : (
                <>
                  {/* Datos Bre-B */}
                  <View style={styles.brebCard}>
                    <View style={styles.brebTopRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.brebBadge}>LLAVE BRE-B / NEQUI / BANCOLOMBIA</Text>
                        <Text style={styles.payeeName}>
                          {config?.payee_name || 'Tec360 Seguridad'}
                        </Text>
                        <Text selectable style={styles.payeeKey}>
                          {config?.payee_key || 'Llave aún no configurada'}
                        </Text>
                        {config?.payee_key ? (
                          <TouchableOpacity style={styles.copyBtn} onPress={handleShareKey}>
                            <Ionicons name="copy-outline" size={14} color={COLORS.primaryLight} />
                            <Text style={styles.copyBtnText}>Copiar / Compartir llave</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>

                      {qrResolvedUrl ? (
                        <Image
                          source={{ uri: qrResolvedUrl }}
                          style={styles.qrImage}
                          resizeMode="contain"
                        />
                      ) : (
                        <View style={styles.qrPlaceholder}>
                          <Ionicons name="qr-code-outline" size={40} color={COLORS.textMuted} />
                        </View>
                      )}
                    </View>
                    <Text style={styles.brebHint}>
                      1. Transfiere desde Nequi, Bancolombia o cualquier banco usando la llave o QR.
                    </Text>
                  </View>

                  {/* Montos */}
                  <Text style={styles.label}>2. Monto transferido (COP)</Text>
                  <View style={styles.presetsRow}>
                    {presetAmounts.map((amt) => {
                      const active = Number(customAmount) === amt;
                      return (
                        <TouchableOpacity
                          key={amt}
                          style={[styles.presetBtn, active && styles.presetBtnActive]}
                          onPress={() => setCustomAmount(String(amt))}
                        >
                          <Text style={[styles.presetText, active && styles.presetTextActive]}>
                            {formatCOP(amt)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <View style={styles.inputWrap}>
                    <Text style={styles.currencyPrefix}>$</Text>
                    <TextInput
                      style={styles.amountInput}
                      keyboardType="numeric"
                      value={customAmount}
                      onChangeText={setCustomAmount}
                      placeholder="50000"
                      placeholderTextColor="#555872"
                    />
                  </View>

                  <Text style={styles.label}>Referencia o últimos 4 dígitos (opcional)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={referenceHint}
                    onChangeText={setReferenceHint}
                    maxLength={12}
                    placeholder="Ej: M1234 o 4821"
                    placeholderTextColor="#555872"
                  />

                  {/* Comprobante */}
                  <Text style={styles.label}>3. Captura del comprobante</Text>
                  <TouchableOpacity
                    style={styles.uploadBox}
                    onPress={handlePickReceipt}
                    disabled={compressing || submitting}
                    activeOpacity={0.8}
                  >
                    {compressing ? (
                      <View style={styles.uploadInner}>
                        <ActivityIndicator color={COLORS.primaryLight} />
                        <Text style={styles.uploadHint}>Optimizando captura...</Text>
                      </View>
                    ) : receipt ? (
                      <View style={styles.receiptPreviewRow}>
                        <Image source={{ uri: receipt.uri }} style={styles.receiptThumb} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.receiptTitle}>Captura adjunta</Text>
                          <Text style={styles.uploadHint}>Toca para cambiar imagen</Text>
                        </View>
                        <Ionicons name="checkmark-circle" size={22} color={COLORS.green} />
                      </View>
                    ) : (
                      <View style={styles.uploadInner}>
                        <Ionicons name="cloud-upload-outline" size={26} color={COLORS.primaryLight} />
                        <Text style={styles.receiptTitle}>Subir captura de pago</Text>
                        <Text style={styles.uploadHint}>JPG, PNG o WEBP · compresión automática</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  {error ? (
                    <View style={styles.errorBox}>
                      <Ionicons name="alert-circle" size={16} color={COLORS.red} />
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  ) : null}

                  <TouchableOpacity
                    style={[styles.primaryBtn, submitting && { opacity: 0.7 }]}
                    onPress={handleSubmit}
                    disabled={submitting || compressing || config?.enabled === false}
                    activeOpacity={0.85}
                  >
                    <LinearGradient colors={['#7c3aed', '#6d28d9']} style={styles.primaryBtnGradient}>
                      {submitting ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <ActivityIndicator color="#fff" size="small" />
                          <Text style={styles.primaryBtnText}>Enviando comprobante...</Text>
                        </View>
                      ) : (
                        <Text style={styles.primaryBtnText}>
                          Enviar comprobante ({formatCOP(Number(customAmount) || 0)})
                        </Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'flex-end' },
  sheet: {
    ...NEU.raised,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: 20,
    maxHeight: '92%',
    paddingBottom: Platform.OS === 'ios' ? 36 : 22,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  title: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  subtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  loaderBox: { paddingVertical: 40, alignItems: 'center', gap: 10 },
  loaderText: { color: COLORS.textSecondary, fontSize: 13 },
  blockedBox: {
    ...NEU.inset,
    borderRadius: RADIUS.lg,
    padding: 18,
    alignItems: 'center',
    gap: 8,
    marginVertical: 12,
  },
  blockedTitle: { color: COLORS.text, fontWeight: '700', fontSize: 15, textAlign: 'center' },
  blockedText: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 19 },
  brebCard: {
    ...NEU.inset,
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  brebTopRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  brebBadge: { fontSize: 10, fontWeight: '800', color: COLORS.primaryLight, letterSpacing: 0.5 },
  payeeName: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4, fontWeight: '600' },
  payeeKey: { fontSize: 17, fontWeight: '800', color: COLORS.text, marginTop: 2 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  copyBtnText: { color: COLORS.primaryLight, fontSize: 12, fontWeight: '700' },
  qrImage: { width: 92, height: 92, borderRadius: RADIUS.md, backgroundColor: '#fff' },
  qrPlaceholder: {
    width: 92,
    height: 92,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brebHint: { fontSize: 11, color: COLORS.textMuted, lineHeight: 16 },
  label: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 6 },
  presetsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  presetBtn: {
    ...NEU.raisedSm,
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  presetBtnActive: { ...NEU.inset, backgroundColor: COLORS.surfaceHigh },
  presetText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: 12 },
  presetTextActive: { color: COLORS.primaryLight },
  inputWrap: {
    ...NEU.inset,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  currencyPrefix: { color: COLORS.textMuted, fontSize: 16, fontWeight: '700', marginRight: 6 },
  amountInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 17,
    paddingVertical: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  textInput: {
    ...NEU.inset,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: COLORS.text,
    fontSize: 14,
    marginBottom: 14,
  },
  uploadBox: {
    ...NEU.inset,
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 14,
  },
  uploadInner: { alignItems: 'center', gap: 4, paddingVertical: 6 },
  receiptPreviewRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  receiptThumb: { width: 52, height: 52, borderRadius: RADIUS.md, backgroundColor: '#111' },
  receiptTitle: { color: COLORS.text, fontSize: 13, fontWeight: '700' },
  uploadHint: { color: COLORS.textMuted, fontSize: 11 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.redMuted,
    padding: 11,
    borderRadius: RADIUS.md,
    marginBottom: 12,
  },
  errorText: { color: COLORS.red, fontSize: 12, flex: 1 },
  primaryBtn: { borderRadius: RADIUS.md, overflow: 'hidden', width: '100%' },
  primaryBtnGradient: { paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { color: COLORS.onPrimary, fontSize: 14, fontWeight: '700' },
  doneBox: { alignItems: 'center', paddingVertical: 16, gap: 10 },
  doneTitle: { color: COLORS.text, fontSize: 19, fontWeight: '800' },
  doneSubtitle: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 19 },
  doneMeta: {
    ...NEU.inset,
    borderRadius: RADIUS.md,
    padding: 12,
    width: '100%',
    gap: 4,
    marginVertical: 6,
  },
  doneMetaText: { color: COLORS.textSecondary, fontSize: 12, fontVariant: ['tabular-nums'] },
});
