import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { COLORS } from '@/constants/theme';
import { NeuTabBar, DockTab } from '@/components/neu';
import { fetchWithAuth } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

const TECH_TABS: DockTab[] = [
  { name: 'dashboard', label: 'Inicio',    icon: 'home-outline',      iconActive: 'home' },
  { name: 'jobs',      label: 'Trabajos',  icon: 'briefcase-outline', iconActive: 'briefcase' },
  { name: 'wallet',    label: 'Billetera', icon: 'wallet-outline',    iconActive: 'wallet' },
  { name: 'profile',   label: 'Perfil',    icon: 'person-outline',    iconActive: 'person' },
];

const WORKSHOP_TABS: DockTab[] = [
  { name: 'taller',    label: 'Mi Taller', icon: 'business-outline',  iconActive: 'business' },
  { name: 'jobs',      label: 'Servicios', icon: 'briefcase-outline', iconActive: 'briefcase' },
  { name: 'wallet',    label: 'Billetera', icon: 'wallet-outline',    iconActive: 'wallet' },
  { name: 'profile',   label: 'Perfil',    icon: 'person-outline',    iconActive: 'person' },
];

const ACTIVE_STATUSES = ['assigned', 'en_route', 'arrived', 'in_progress'];

/** Finds the technician's service in progress, if any. */
async function findActiveServiceId(): Promise<string | null> {
  try {
    const res = await fetchWithAuth('/services?page_size=20');
    if (!res.ok) return null;
    const data = await res.json();
    const list: any[] = data.services || data.items || [];
    const active = list.find(s => ACTIVE_STATUSES.includes(s.status));
    return active?.id ? String(active.id) : null;
  } catch {
    return null;
  }
}

export default function TechLayout() {
  const router = useRouter();
  const { user } = useAuth();
  const isWorkshopOwner = user?.role === 'company_admin';
  const [activeId, setActiveId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const id = await findActiveServiceId();
    setActiveId(id);
    return id;
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 45000);
    const sub = AppState.addEventListener('change', s => { if (s === 'active') refresh(); });
    return () => { clearInterval(timer); sub.remove(); };
  }, [refresh]);

  // Centre action: jump into the service in progress; with none, open the jobs list or workshop console.
  const openActive = useCallback(async () => {
    if (isWorkshopOwner) {
      router.navigate('/(tech)/taller' as any);
      return;
    }
    const id = activeId ?? (await refresh());
    if (id) router.navigate(`/(tech)/service/${id}` as any);
    else router.navigate('/(tech)/jobs' as any);
  }, [activeId, isWorkshopOwner, refresh, router]);

  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: COLORS.bg } }}
      tabBar={(props) => (
        <NeuTabBar
          {...props}
          tabs={isWorkshopOwner ? WORKSHOP_TABS : TECH_TABS}
          action={{
            label: isWorkshopOwner
              ? 'Consola de Taller y Subcuentas'
              : activeId
                ? 'Abrir servicio en curso'
                : 'Ver trabajos disponibles',
            icon: isWorkshopOwner ? 'people' : activeId ? 'navigate' : 'flash',
            live: !!activeId,
            activeRoute: isWorkshopOwner ? 'taller' : 'service/[id]',
            onPress: openActive,
          }}
        />
      )}
    >
      <Tabs.Screen name="dashboard" options={{ title: 'Inicio' }} />
      <Tabs.Screen name="taller" options={{ title: 'Mi Taller' }} />
      <Tabs.Screen name="jobs" options={{ title: 'Trabajos' }} />
      <Tabs.Screen name="wallet" options={{ title: 'Billetera' }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil' }} />
      {/* Hidden routes */}
      <Tabs.Screen name="service/[id]" options={{ href: null }} />
      <Tabs.Screen name="quotations" options={{ href: null }} />
      <Tabs.Screen name="quotation/[id]/index" options={{ href: null }} />
      <Tabs.Screen name="quotation/[id]/new" options={{ href: null }} />
      <Tabs.Screen name="edit-profile" options={{ href: null }} />
      <Tabs.Screen name="support" options={{ href: null }} />
      <Tabs.Screen name="chat/[serviceId]" options={{ href: null }} />
      <Tabs.Screen name="escuela/index" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="escuela/[slug]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="escuela/[slug]/leccion/[lessonSlug]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="escuela/[slug]/quiz" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="escuela/certificado/[code]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
    </Tabs>
  );
}
