import { useEffect, useRef } from 'react';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import {
  registerForPushNotificationsAsync,
  sendPushTokenToBackend,
  addNotificationResponseListener,
} from '@/lib/notifications';
import * as Notifications from 'expo-notifications';

function NotificationSetup() {
  const { user } = useAuth();
  const router = useRouter();
  const responseListenerRef = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    if (!user) return;

    // Register push token after login
    (async () => {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        await sendPushTokenToBackend(token);
      }
    })();

    // Handle notification taps — navigate to service detail
    responseListenerRef.current = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.service_id) {
        const role = user.role === 'technician' ? 'tech' : 'client';
        router.push(`/(${role})/service/${data.service_id}` as any);
      }
    });

    return () => {
      responseListenerRef.current?.remove();
    };
  }, [user]);

  return null;
}

export default function RootLayout() {
  return (
    <ThemeProvider value={DarkTheme}>
      <AuthProvider>
        <NotificationSetup />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(client)" />
          <Stack.Screen name="(tech)" />
        </Stack>
      </AuthProvider>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
