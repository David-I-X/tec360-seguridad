import { Tabs, useRouter } from 'expo-router';
import { COLORS } from '@/constants/theme';
import { NeuTabBar, DockTab } from '@/components/neu';

const CLIENT_TABS: DockTab[] = [
  { name: 'services',      label: 'Servicios', icon: 'home-outline',          iconActive: 'home' },
  { name: 'notifications', label: 'Alertas',   icon: 'notifications-outline', iconActive: 'notifications' },
  { name: 'history',       label: 'Historial', icon: 'calendar-outline',      iconActive: 'calendar' },
  { name: 'settings',      label: 'Ajustes',   icon: 'settings-outline',      iconActive: 'settings' },
];

export default function ClientLayout() {
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: COLORS.bg } }}
      tabBar={(props) => (
        <NeuTabBar
          {...props}
          tabs={CLIENT_TABS}
          action={{
            label: 'Solicitar nuevo servicio',
            icon: 'add',
            activeRoute: 'new-service',
            onPress: () => router.navigate('/(client)/new-service' as any),
          }}
        />
      )}
    >
      <Tabs.Screen name="services" options={{ title: 'Servicios' }} />
      <Tabs.Screen name="notifications" options={{ title: 'Alertas' }} />
      <Tabs.Screen name="new-service" options={{ title: 'Nuevo' }} />
      <Tabs.Screen name="history" options={{ title: 'Historial' }} />
      <Tabs.Screen name="settings" options={{ title: 'Ajustes' }} />
      {/* Hidden routes */}
      <Tabs.Screen name="service/[id]" options={{ href: null }} />
      <Tabs.Screen name="waiting/[id]" options={{ href: null }} />
      <Tabs.Screen name="quotations/[id]" options={{ href: null }} />
      <Tabs.Screen name="edit-profile" options={{ href: null }} />
      <Tabs.Screen name="help" options={{ href: null }} />
      <Tabs.Screen name="support" options={{ href: null }} />
      <Tabs.Screen name="privacy" options={{ href: null }} />
      <Tabs.Screen name="tech-profile/[techId]" options={{ href: null }} />
      <Tabs.Screen name="chat/[serviceId]" options={{ href: null }} />
      <Tabs.Screen name="terms" options={{ href: null }} />
    </Tabs>
  );
}
