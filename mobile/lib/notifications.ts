/**
 * Push Notification Service for Expo
 * Handles: registration, permission requests, token storage, and notification handling
 * Safe for both Expo Go and Development / Production Builds
 */
import { isRunningInExpoGo } from 'expo';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { fetchWithAuth } from './api';

export type NotificationSubscription = {
  remove: () => void;
};

// Expo Go on Android removed push notifications in SDK 53+ and throws an uncatchable Error if loaded
const isExpoGoAndroid = isRunningInExpoGo() && Platform.OS === 'android';

let Notifications: any = null;

if (!isExpoGoAndroid) {
  try {
    Notifications = require('expo-notifications');
    if (Notifications?.setNotificationHandler) {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    }
  } catch (err) {
    console.warn('[Notifications] expo-notifications not available:', err);
    Notifications = null;
  }
}

/**
 * Register for push notifications and return the Expo push token
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (isExpoGoAndroid) {
    console.log('[Notifications] Push notifications disabled in Expo Go on Android (SDK 53+). Use a development build for push testing.');
    return null;
  }

  if (!Notifications) return null;

  // Push notifications only work on physical devices
  if (!Device.isDevice) {
    console.log('[Notifications] Must use physical device for push notifications');
    return null;
  }

  try {
    // Check/request permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Notifications] Permission not granted');
      return null;
    }

    let projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (projectId === 'YOUR_EAS_PROJECT_ID') {
      projectId = undefined;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId,
    });
    const token = tokenData?.data;
    console.log('[Notifications] Push token:', token);

    // Android needs a notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'General',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#8b5cf6',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('services', {
        name: 'Servicios',
        importance: Notifications.AndroidImportance.HIGH,
        description: 'Notificaciones de servicios y actualizaciones',
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#8b5cf6',
        sound: 'default',
      });
    }

    return token;
  } catch (error) {
    console.warn('[Notifications] Error getting push token:', error);
    return null;
  }
}

/**
 * Send the push token to the backend so it can send notifications
 */
export async function sendPushTokenToBackend(token: string): Promise<void> {
  if (!token) return;
  try {
    await fetchWithAuth('/users/me/push-tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: token,
        platform: 'expo',
      }),
    });
    console.log('[Notifications] Push token sent to backend');
  } catch (error) {
    console.warn('[Notifications] Failed to send push token to backend:', error);
  }
}

/**
 * Add listener for incoming notifications (foreground)
 */
export function addNotificationReceivedListener(
  callback: (notification: any) => void
): NotificationSubscription {
  if (!Notifications?.addNotificationReceivedListener) {
    return { remove: () => {} };
  }
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Add listener for notification interactions (taps)
 */
export function addNotificationResponseListener(
  callback: (response: any) => void
): NotificationSubscription {
  if (!Notifications?.addNotificationResponseReceivedListener) {
    return { remove: () => {} };
  }
  return Notifications.addNotificationResponseReceivedListener(callback);
}

