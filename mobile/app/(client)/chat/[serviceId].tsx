/**
 * Client Chat Route — /client/chat/[serviceId]
 */
import React from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import ChatScreen from '@/components/chat-screen';

export default function ClientChatPage() {
  const router = useRouter();
  const { serviceId, techName } = useLocalSearchParams<{
    serviceId: string;
    techName?: string;
  }>();

  return (
    <ChatScreen
      serviceId={serviceId!}
      onBack={() => router.back()}
      otherParticipantName={techName || 'Técnico'}
    />
  );
}
