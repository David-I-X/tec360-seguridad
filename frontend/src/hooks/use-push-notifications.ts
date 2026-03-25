"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api"; 
// Adjust import path as needed for where `api.ts` or `fetchWithAuth` is located.
// We'll verify this import path later.

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
      checkSubscription();
    }
  }, []);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error("Error checking push subscription:", error);
    }
  };

  const subscribeToPush = async () => {
    if (!isSupported) {
      console.warn("Push notifications are not supported by this browser.");
      return false;
    }

    try {
      // 1. Request Permission
      const currentPermission = await Notification.requestPermission();
      setPermission(currentPermission);
      
      if (currentPermission !== "granted") {
        console.warn("Notification permission completely denied.");
        return false;
      }

      // 2. Get Service Worker Registration
      const registration = await navigator.serviceWorker.ready;

      // 3. Convert VAPID key to Uint8Array safely for PushManager
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        console.error("Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY from env");
        return false;
      }
      
      const convertedVapidKey = urlBase64ToUint8Array(vapidKey);

      // 4. Subscribe
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });

      // 5. Send to Server
      const subscriptionJson = subscription.toJSON();
      
      // Sending it to our new endpoint
      await sendSubscriptionToBackend(subscriptionJson);
      
      setIsSubscribed(true);
      return true;

    } catch (error) {
      console.error("Failed to subscribe to push notifications:", error);
      return false;
    }
  };

  const sendSubscriptionToBackend = async (subscription: PushSubscriptionJSON) => {
    try {
      // Assuming api.ts uses auth cookies or token injection automatically
      await api.post("/users/me/push-tokens", {
        token: JSON.stringify(subscription),
        platform: "web_push",
      });
      console.log("Push token successfully registered!");
    } catch (error) {
      console.error("Error sending push token to backend:", error);
    }
  };

  return {
    isSupported,
    permission,
    isSubscribed,
    subscribeToPush,
  };
}

/**
 * Utility function to convert a Base64 VAPID public key into a Uint8Array
 */
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
