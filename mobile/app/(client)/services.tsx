import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl, ScrollView,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useAuth } from '@/lib/auth-context';
import { fetchWithAuth, API_URL } from '@/lib/api';
import { COLORS, SPACING, FONTS } from '@/constants/theme';

const statusConfig: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  pending:     { label: 'Pendiente',        color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', dot: '#f59e0b' },
  quoted:      { label: 'Con Cotizaciones', color: '#818cf8', bg: 'rgba(129,140,248,0.15)', dot: '#818cf8' },
  assigned:    { label: 'Asignado',         color: '#60a5fa', bg: 'rgba(96,165,250,0.15)', dot: '#60a5fa' },
  en_route:    { label: 'En camino',        color: '#38bdf8', bg: 'rgba(56,189,248,0.15)', dot: '#38bdf8' },
  arrived:     { label: 'Llegó al sitio',   color: '#fb923c', bg: 'rgba(251,146,60,0.15)', dot: '#fb923c' },
  in_progress: { label: 'En Progreso',      color: '#c084fc', bg: 'rgba(192,132,252,0.15)', dot: '#c084fc' },
  completed:   { label: 'Completado',       color: '#34d399', bg: 'rgba(52,211,153,0.15)', dot: '#34d399' },
  confirmed:   { label: 'Confirmado',       color: '#34d399', bg: 'rgba(52,211,153,0.15)', dot: '#34d399' },
  cancelled:   { label: 'Cancelado',        color: '#f87171', bg: 'rgba(248,113,113,0.15)', dot: '#f87171' },
};

interface ServiceTypeConfig {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
}

const serviceTypeConfigs: Record<string, ServiceTypeConfig> = {
  gps_installation:   { label: 'Instalación GPS Satelital', icon: 'radio', color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' },
  gps_maintenance:    { label: 'Mantenimiento GPS',         icon: 'radio', color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' },
  camera_installation:{ label: 'Instalación Dashcam HD',    icon: 'videocam', color: '#c084fc', bg: 'rgba(192,132,252,0.15)' },
  camera_maintenance: { label: 'Mantenimiento Dashcam',     icon: 'videocam', color: '#c084fc', bg: 'rgba(192,132,252,0.15)' },
  alarm_installation: { label: 'Instalación de Alarma',     icon: 'notifications', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' },
  alarm_maintenance:  { label: 'Mantenimiento de Alarma',    icon: 'notifications', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' },
  vehicle_recovery:   { label: 'Equipo de Reacción',        icon: 'shield-half', color: '#f87171', bg: 'rgba(248,113,113,0.15)' },
  other:              { label: 'Servicio Técnico',          icon: 'construct', color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' },
};

const ACTIVE_STATUSES = ['assigned', 'en_route', 'arrived', 'in_progress'];
type StatusFilter = 'all' | 'active' | 'quoted' | 'completed';
type ViewMode = 'cards' | 'map';

function formatServiceDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const day = d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
    const time = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${day} · ${time}`;
  } catch {
    return '';
  }
}

export default function ServicesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [services, setServices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [selectedMapService, setSelectedMapService] = useState<any | null>(null);

  const staticUrl = API_URL.replace(/\/api\/?$/, '');

  const loadServices = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/services?page_size=100');
      if (res.ok) {
        const data = await res.json();
        const list = data.services || data.items || [];
        setServices(Array.isArray(list) ? list : []);
      }
    } catch (e) {
      console.error('[Services] Error al cargar servicios:', e);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  const onRefresh = () => {
    setRefreshing(true);
    loadServices();
  };

  // Filter & Search Logic
  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      // 1. Status Filter
      if (statusFilter === "active" && !ACTIVE_STATUSES.includes(service.status)) {
        return false;
      }
      if (statusFilter === "quoted" && service.status !== "quoted" && service.status !== "pending") {
        return false;
      }
      if (statusFilter === "completed" && service.status !== "completed" && service.status !== "confirmed") {
        return false;
      }

      // 2. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const titleMatch = (service.title || "").toLowerCase().includes(query);
        const typeMatch = (service.service_type || "").toLowerCase().includes(query);
        const cityMatch = (service.service_city || "").toLowerCase().includes(query);
        const addressMatch = (service.service_address || "").toLowerCase().includes(query);
        const descMatch = (service.description || "").toLowerCase().includes(query);
        const techMatch = service.technician?.full_name?.toLowerCase().includes(query);

        return titleMatch || typeMatch || cityMatch || addressMatch || descMatch || techMatch;
      }

      return true;
    });
  }, [services, statusFilter, searchQuery]);

  // Counts
  const activeCount = useMemo(() => services.filter(s => ACTIVE_STATUSES.includes(s.status)).length, [services]);
  const quotedCount = useMemo(() => services.filter(s => ['quoted', 'pending'].includes(s.status)).length, [services]);
  const completedCount = useMemo(() => services.filter(s => ['completed', 'confirmed'].includes(s.status)).length, [services]);

  // High-priority Live Mission Service
  const liveMissionService = useMemo(() => {
    return services.find(s => ACTIVE_STATUSES.includes(s.status));
  }, [services]);

  // Valid coordinates for map
  const mapServices = useMemo(() => {
    return filteredServices.filter(
      (s) => s.service_lat && s.service_lon && (s.service_lat !== 0 || s.service_lon !== 0)
    );
  }, [filteredServices]);

  const initialMapRegion = useMemo(() => {
    if (mapServices.length > 0) {
      return {
        latitude: mapServices[0].service_lat,
        longitude: mapServices[0].service_lon,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      };
    }
    return {
      latitude: 6.2442,
      longitude: -75.5636,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    };
  }, [mapServices]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Conectando con enlace telemático...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <View style={styles.headerTopBadge}>
            <View style={styles.headerDot} />
            <Text style={styles.headerBadgeText}>TELEMÁTICA 360°</Text>
          </View>
          <Text style={styles.headerTitle}>Centro de Control</Text>
          <Text style={styles.headerSubtitle}>
            Hola, {user?.full_name?.split(' ')[0] || 'Cliente'} · Monitoreo y servicios
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/(client)/new-service' as any)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#8b5cf6', '#7c3aed']}
            style={styles.newButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* ── View Switcher & Search Bar ── */}
      <View style={styles.toolbarContainer}>
        {/* Search Input */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color={COLORS.textMuted} style={styles.searchIcon} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Buscar servicio, técnico, ciudad..."
            placeholderTextColor={COLORS.textMuted}
            style={styles.searchInput}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.searchClearBtn}>
              <Ionicons name="close-circle" size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* View Mode Switcher (Tarjetas / Mapa) */}
        <View style={styles.viewModeToggle}>
          <TouchableOpacity
            style={[styles.viewModeBtn, viewMode === 'cards' && styles.viewModeBtnActive]}
            onPress={() => setViewMode('cards')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="grid"
              size={16}
              color={viewMode === 'cards' ? '#fff' : COLORS.textMuted}
            />
            <Text style={[styles.viewModeText, viewMode === 'cards' && styles.viewModeTextActive]}>
              Lista
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.viewModeBtn, viewMode === 'map' && styles.viewModeBtnActive]}
            onPress={() => setViewMode('map')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="map"
              size={16}
              color={viewMode === 'map' ? '#fff' : COLORS.textMuted}
            />
            <Text style={[styles.viewModeText, viewMode === 'map' && styles.viewModeTextActive]}>
              Mapa ({mapServices.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── HUD Metrics (4 Columns) ── */}
      <View style={styles.hudContainer}>
        <View style={styles.hudCard}>
          <View style={styles.hudHeaderRow}>
            <Text style={styles.hudLabel}>TOTAL</Text>
            <Ionicons name="layers" size={14} color={COLORS.primary} />
          </View>
          <Text style={styles.hudNumber}>{services.length}</Text>
        </View>

        <View style={[styles.hudCard, { borderColor: 'rgba(52,211,153,0.3)' }]}>
          <View style={styles.hudHeaderRow}>
            <Text style={[styles.hudLabel, { color: '#34d399' }]}>EN VIVO</Text>
            <Ionicons name="pulse" size={14} color="#34d399" />
          </View>
          <Text style={[styles.hudNumber, { color: '#34d399' }]}>{activeCount}</Text>
        </View>

        <View style={[styles.hudCard, { borderColor: 'rgba(129,140,248,0.3)' }]}>
          <View style={styles.hudHeaderRow}>
            <Text style={[styles.hudLabel, { color: '#818cf8' }]}>COTIZ.</Text>
            <Ionicons name="document-text" size={14} color="#818cf8" />
          </View>
          <Text style={[styles.hudNumber, { color: '#818cf8' }]}>{quotedCount}</Text>
        </View>

        <View style={[styles.hudCard, { borderColor: 'rgba(52,211,153,0.2)' }]}>
          <View style={styles.hudHeaderRow}>
            <Text style={styles.hudLabel}>HECHOS</Text>
            <Ionicons name="checkmark-circle" size={14} color="#34d399" />
          </View>
          <Text style={styles.hudNumber}>{completedCount}</Text>
        </View>
      </View>

      {/* ── Status Filter Chips ── */}
      <View style={{ marginBottom: 12 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChipContainer}
        >
          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'all' && styles.filterChipActive]}
            onPress={() => setStatusFilter('all')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterChipText, statusFilter === 'all' && styles.filterChipTextActive]}>
              Todos ({services.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'active' && styles.filterChipActiveGreen]}
            onPress={() => setStatusFilter('active')}
            activeOpacity={0.7}
          >
            <View style={[styles.filterDot, { backgroundColor: '#34d399' }]} />
            <Text style={[styles.filterChipText, statusFilter === 'active' && { color: '#34d399' }]}>
              En Operación ({activeCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'quoted' && styles.filterChipActiveIndigo]}
            onPress={() => setStatusFilter('quoted')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterChipText, statusFilter === 'quoted' && { color: '#818cf8' }]}>
              Cotizaciones ({quotedCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'completed' && styles.filterChipActiveWhite]}
            onPress={() => setStatusFilter('completed')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterChipText, statusFilter === 'completed' && styles.filterChipTextActiveDark]}>
              Completados ({completedCount})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* ── Main Content: MAP or CARDS ── */}
      {viewMode === 'map' ? (
        /* MAP VIEW */
        <View style={styles.mapViewContainer}>
          <MapView
            provider={PROVIDER_GOOGLE}
            style={StyleSheet.absoluteFillObject}
            initialRegion={initialMapRegion}
            customMapStyle={darkMapStyle}
          >
            {mapServices.map((item) => {
              const cfg = statusConfig[item.status] || statusConfig.pending;
              const isSelected = selectedMapService?.id === item.id;

              return (
                <Marker
                  key={item.id}
                  coordinate={{ latitude: item.service_lat, longitude: item.service_lon }}
                  title={item.title}
                  onPress={() => setSelectedMapService(item)}
                >
                  <View style={[styles.mapMarkerPin, { borderColor: cfg.color }, isSelected && styles.mapMarkerSelected]}>
                    <View style={[styles.mapMarkerCore, { backgroundColor: cfg.color }]} />
                  </View>
                </Marker>
              );
            })}
          </MapView>

          {/* Selected Service Floating Card */}
          {selectedMapService ? (
            <View style={styles.mapFloatingCard}>
              <View style={styles.mapFloatingHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mapFloatingTitle} numberOfLines={1}>
                    {selectedMapService.title}
                  </Text>
                  <Text style={styles.mapFloatingSub} numberOfLines={1}>
                    {selectedMapService.service_address || selectedMapService.service_city || "Sin dirección"}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedMapService(null)}
                  style={styles.mapFloatingClose}
                >
                  <Ionicons name="close" size={16} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.mapFloatingBottom}>
                <View style={styles.mapFloatingStatus}>
                  <View style={[styles.miniDot, { backgroundColor: (statusConfig[selectedMapService.status] || statusConfig.pending).dot }]} />
                  <Text style={[styles.miniStatusText, { color: (statusConfig[selectedMapService.status] || statusConfig.pending).color }]}>
                    {(statusConfig[selectedMapService.status] || statusConfig.pending).label}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => router.push(`/(client)/service/${selectedMapService.id}` as any)}
                  style={styles.mapFloatingBtn}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#8b5cf6', '#7c3aed']}
                    style={styles.mapFloatingGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.mapFloatingBtnText}>Abrir Servicio</Text>
                    <Ionicons name="arrow-forward" size={14} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.mapHintBadge}>
              <Ionicons name="information-circle-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.mapHintText}>
                Toca cualquier marcador para inspeccionar el servicio
              </Text>
            </View>
          )}

          {/* Map Legend Overlay */}
          <View style={styles.mapLegend}>
            <View style={styles.mapLegendItem}>
              <View style={[styles.mapLegendDot, { backgroundColor: '#34d399' }]} />
              <Text style={styles.mapLegendLabel}>En Operación</Text>
            </View>
            <View style={styles.mapLegendItem}>
              <View style={[styles.mapLegendDot, { backgroundColor: '#818cf8' }]} />
              <Text style={styles.mapLegendLabel}>Cotizado</Text>
            </View>
            <View style={styles.mapLegendItem}>
              <View style={[styles.mapLegendDot, { backgroundColor: '#f59e0b' }]} />
              <Text style={styles.mapLegendLabel}>Pendiente</Text>
            </View>
          </View>
        </View>
      ) : (
        /* CARDS / LIST VIEW */
        <FlatList
          data={filteredServices}
          keyExtractor={(item) => item.id?.toString()}
          contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: SPACING.md }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
          ListHeaderComponent={
            <>
              {/* ── Live Mission Hero Card ── */}
              {liveMissionService && (
                <TouchableOpacity
                  style={styles.heroCard}
                  activeOpacity={0.85}
                  onPress={() => router.push(`/(client)/service/${liveMissionService.id}` as any)}
                >
                  <LinearGradient
                    colors={['rgba(96,165,250,0.18)', 'rgba(139,92,246,0.12)', 'rgba(10,14,28,0.8)']}
                    style={styles.heroGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.heroTopRow}>
                      <View style={styles.heroPulseBadge}>
                        <View style={styles.heroPulseDot} />
                        <Text style={styles.heroPulseText}>OPERACIÓN EN CURSO // ENLACE ACTIVO</Text>
                      </View>
                      <View style={styles.heroStatusTag}>
                        <Text style={styles.heroStatusText}>
                          {(statusConfig[liveMissionService.status] || statusConfig.assigned).label}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.heroTitle} numberOfLines={1}>
                      {liveMissionService.title}
                    </Text>

                    <View style={styles.heroMetaRow}>
                      <View style={styles.heroMetaItem}>
                        <Ionicons name="location" size={13} color="#f87171" />
                        <Text style={styles.heroMetaText} numberOfLines={1}>
                          {liveMissionService.service_address || liveMissionService.service_city || "Medellín, Colombia"}
                        </Text>
                      </View>

                      {liveMissionService.scheduled_date && (
                        <View style={styles.heroMetaItem}>
                          <Ionicons name="time" size={13} color="#c084fc" />
                          <Text style={styles.heroMetaText}>
                            {formatServiceDate(liveMissionService.scheduled_date)}
                          </Text>
                        </View>
                      )}

                      {liveMissionService.technician?.full_name && (
                        <View style={styles.heroMetaItem}>
                          <Ionicons name="person" size={13} color="#60a5fa" />
                          <Text style={styles.heroMetaText} numberOfLines={1}>
                            {liveMissionService.technician.full_name}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.heroActionBtn}>
                      <Ionicons name="navigate" size={14} color="#34d399" />
                      <Text style={styles.heroActionText}>Abrir Telemetría en Vivo</Text>
                      <Ionicons name="chevron-forward" size={14} color="#34d399" />
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </>
          }
          renderItem={({ item }) => {
            const isLive = ACTIVE_STATUSES.includes(item.status);
            const cfg = statusConfig[item.status] || statusConfig.pending;
            const typeConfig = serviceTypeConfigs[item.service_type] || serviceTypeConfigs.other;
            const dateStr = formatServiceDate(item.scheduled_date || item.requested_date || item.created_at);
            const formattedPrice = item.estimated_price
              ? `$${Number(item.estimated_price).toLocaleString('es-CO')}`
              : null;

            return (
              <TouchableOpacity
                style={[styles.serviceCard, isLive && styles.serviceCardLive]}
                onPress={() => router.push(`/(client)/service/${item.id}` as any)}
                activeOpacity={0.75}
              >
                {/* Top Row: Type Icon + Badges */}
                <View style={styles.cardHeaderRow}>
                  <View style={[styles.typeIconBox, { backgroundColor: typeConfig.bg }]}>
                    <Ionicons name={typeConfig.icon} size={18} color={typeConfig.color} />
                  </View>

                  <View style={styles.cardHeaderBadges}>
                    {isLive && (
                      <View style={styles.livePulsePill}>
                        <View style={styles.livePulseDot} />
                        <Text style={styles.livePulseText}>EN VIVO</Text>
                      </View>
                    )}
                    <View style={[styles.statusBadge, { backgroundColor: cfg.bg, borderColor: `${cfg.color}30` }]}>
                      <View style={[styles.miniDot, { backgroundColor: cfg.dot }]} />
                      <Text style={[styles.statusBadgeText, { color: cfg.color }]}>
                        {cfg.label}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Title & Service Category */}
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.cardCategory} numberOfLines={1}>
                  {typeConfig.label}
                </Text>

                {/* Meta details: Address & Date */}
                <View style={styles.cardMetaBlock}>
                  <View style={styles.cardMetaItem}>
                    <Ionicons name="location-outline" size={13} color="#f87171" />
                    <Text style={styles.cardMetaText} numberOfLines={1}>
                      {item.service_address ? `${item.service_address}${item.service_city ? `, ${item.service_city}` : ''}` : (item.service_city || "Ubicación por definir")}
                    </Text>
                  </View>

                  <View style={styles.cardMetaItem}>
                    <Ionicons name="time-outline" size={13} color="#c084fc" />
                    <Text style={styles.cardMetaText}>
                      {dateStr || "Fecha no programada"}
                    </Text>
                  </View>
                </View>

                {/* Middle Snippet: Technician or Quote notice */}
                <View style={styles.cardMiddleRow}>
                  {item.technician ? (
                    <View style={styles.techPreviewRow}>
                      {item.technician.avatar_url ? (
                        <Image
                          source={{ uri: item.technician.avatar_url.startsWith('http') ? item.technician.avatar_url : `${staticUrl}${item.technician.avatar_url}` }}
                          style={styles.techAvatar}
                        />
                      ) : (
                        <View style={styles.techInitialBox}>
                          <Text style={styles.techInitialText}>
                            {(item.technician.full_name || 'T').charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.techNameText} numberOfLines={1}>
                          {item.technician.full_name}
                        </Text>
                        {item.technician.average_rating > 0 && (
                          <View style={styles.techRatingRow}>
                            <Ionicons name="star" size={10} color="#fbbf24" />
                            <Text style={styles.techRatingText}>
                              {Number(item.technician.average_rating).toFixed(1)}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  ) : item.status === 'quoted' ? (
                    <View style={styles.noticeQuotedRow}>
                      <Ionicons name="document-text" size={14} color="#818cf8" />
                      <Text style={styles.noticeQuotedText}>Cotizaciones disponibles para revisar</Text>
                    </View>
                  ) : (
                    <View style={styles.noticeSearchingRow}>
                      <Ionicons name="sparkles" size={13} color="#fbbf24" />
                      <Text style={styles.noticeSearchingText}>Buscando técnicos certificados en zona</Text>
                    </View>
                  )}
                </View>

                {/* Bottom Row: Price & Navigation Chevron */}
                <View style={styles.cardBottomRow}>
                  <View>
                    <Text style={styles.cardPriceLabel}>
                      {formattedPrice ? "PRECIO ESTIMADO" : "COTIZACIÓN"}
                    </Text>
                    <Text style={styles.cardPriceValue}>
                      {formattedPrice || "Por definir"}
                    </Text>
                  </View>

                  <View style={styles.cardCtaRow}>
                    <Text style={styles.cardCtaText}>
                      {isLive ? "Telemetría" : item.status === 'quoted' ? "Cotizaciones" : "Detalles"}
                    </Text>
                    <Ionicons name="chevron-forward" size={15} color={COLORS.primaryLight} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="clipboard-outline" size={36} color={COLORS.primaryLight} />
              </View>
              <Text style={styles.emptyTitle}>
                {searchQuery ? "Sin resultados" : "No tienes servicios aquí"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? `No encontramos coincidencias para "${searchQuery}".`
                  : "Comienza blindando tu vehículo con instalación de GPS satelital o dashcam."}
              </Text>
              {searchQuery ? (
                <TouchableOpacity
                  style={styles.emptyBtn}
                  onPress={() => setSearchQuery("")}
                  activeOpacity={0.8}
                >
                  <Text style={styles.emptyBtnText}>Limpiar búsqueda</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => router.push('/(client)/new-service' as any)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#8b5cf6', '#7c3aed']}
                    style={styles.emptyNewServiceBtn}
                  >
                    <Ionicons name="add-circle" size={18} color="#fff" />
                    <Text style={styles.emptyNewServiceText}>Solicitar mi primer servicio</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </View>
  );
}

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#334155' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#312e81' }] },
  { featureType: 'water', stylers: [{ color: '#020617' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'landscape', stylers: [{ color: '#0b1329' }] },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingTop: 54 },
  centered: { flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: COLORS.textSecondary, marginTop: 12, fontSize: FONTS.sizes.sm },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  headerTopBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  headerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primaryLight,
  },
  headerBadgeText: {
    color: COLORS.primaryLight,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  newButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  // Toolbar
  toolbarContainer: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(18,22,40,0.85)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(80,60,160,0.25)',
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
    paddingVertical: 0,
  },
  searchClearBtn: {
    padding: 4,
  },
  viewModeToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(18,22,40,0.85)',
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(80,60,160,0.25)',
  },
  viewModeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    borderRadius: 9,
  },
  viewModeBtnActive: {
    backgroundColor: COLORS.primary,
  },
  viewModeText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  viewModeTextActive: {
    color: '#fff',
  },

  // HUD Metrics Strip (4 columns)
  hudContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    gap: 8,
    marginBottom: 12,
  },
  hudCard: {
    flex: 1,
    backgroundColor: 'rgba(10,14,28,0.85)',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  hudHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  hudLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  hudNumber: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
  },

  // Filter Chips
  filterChipContainer: {
    paddingHorizontal: SPACING.md,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: 'rgba(18,22,40,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(80,60,160,0.3)',
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipActiveGreen: {
    backgroundColor: 'rgba(52,211,153,0.2)',
    borderColor: '#34d399',
  },
  filterChipActiveIndigo: {
    backgroundColor: 'rgba(129,140,248,0.2)',
    borderColor: '#818cf8',
  },
  filterChipActiveWhite: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  filterChipText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  filterChipTextActiveDark: {
    color: '#0f172a',
  },
  filterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // Hero Mission Card
  heroCard: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.4)',
    marginBottom: 14,
  },
  heroGradient: {
    padding: 14,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  heroPulseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34d399',
  },
  heroPulseText: {
    color: '#34d399',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroStatusTag: {
    backgroundColor: 'rgba(96,165,250,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.3)',
  },
  heroStatusText: {
    color: '#60a5fa',
    fontSize: 10,
    fontWeight: '700',
  },
  heroTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
  },
  heroMetaRow: {
    gap: 4,
    marginBottom: 10,
  },
  heroMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroMetaText: {
    color: '#cbd5e1',
    fontSize: 11,
    flex: 1,
  },
  heroActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(52,211,153,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.3)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  heroActionText: {
    color: '#34d399',
    fontSize: 12,
    fontWeight: '800',
  },

  // Service Card (Cuadrícula / Lista)
  serviceCard: {
    backgroundColor: 'rgba(10,14,28,0.85)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(80,60,160,0.2)',
  },
  serviceCardLive: {
    borderColor: 'rgba(52,211,153,0.4)',
    backgroundColor: 'rgba(52,211,153,0.03)',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  typeIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardHeaderBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  livePulsePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(52,211,153,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.3)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  livePulseDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#34d399',
  },
  livePulseText: {
    color: '#34d399',
    fontSize: 8,
    fontWeight: '800',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  miniDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  cardCategory: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 10,
  },
  cardMetaBlock: {
    gap: 4,
    marginBottom: 10,
  },
  cardMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardMetaText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    flex: 1,
  },
  cardMiddleRow: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(80,60,160,0.15)',
    marginBottom: 10,
  },
  techPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  techAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  techInitialBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(139,92,246,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  techInitialText: {
    color: COLORS.primaryLight,
    fontSize: 11,
    fontWeight: '800',
  },
  techNameText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
  techRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 1,
  },
  techRatingText: {
    color: '#fbbf24',
    fontSize: 10,
    fontWeight: '700',
  },
  noticeQuotedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  noticeQuotedText: {
    color: '#818cf8',
    fontSize: 11,
    fontWeight: '600',
  },
  noticeSearchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  noticeSearchingText: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(80,60,160,0.15)',
  },
  cardPriceLabel: {
    color: COLORS.textMuted,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardPriceValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '800',
  },
  cardCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  cardCtaText: {
    color: COLORS.primaryLight,
    fontSize: 11,
    fontWeight: '700',
  },

  // Map View
  mapViewContainer: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  mapMarkerPin: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    borderWidth: 2.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapMarkerSelected: {
    transform: [{ scale: 1.25 }],
    borderColor: '#fff',
  },
  mapMarkerCore: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  mapFloatingCard: {
    position: 'absolute',
    bottom: 45,
    left: SPACING.md,
    right: SPACING.md,
    backgroundColor: 'rgba(10,14,28,0.95)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
  mapFloatingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  mapFloatingTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
  },
  mapFloatingSub: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  mapFloatingClose: {
    padding: 4,
  },
  mapFloatingBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(80,60,160,0.2)',
  },
  mapFloatingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  miniStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  mapFloatingBtn: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  mapFloatingGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  mapFloatingBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  mapHintBadge: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(10,14,28,0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(80,60,160,0.3)',
  },
  mapHintText: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  mapLegend: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(10,14,28,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(80,60,160,0.2)',
  },
  mapLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  mapLegendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  mapLegendLabel: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: SPACING.lg,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(139,92,246,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.3)',
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  emptySubtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  emptyBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(18,22,40,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(80,60,160,0.3)',
  },
  emptyBtnText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  emptyNewServiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
  },
  emptyNewServiceText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});
