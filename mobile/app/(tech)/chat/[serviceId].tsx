/**
 * Tech Chat Route — /tech/chat/[serviceId]
 */
import React from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import ChatScreen from '@/components/chat-screen';

export default function TechChatPage() {
  const router = useRouter();
  const { serviceId, clientName } = useLocalSearchParams<{
    serviceId: string;
    clientName?: string;
  }>();

  return (
    <ChatScreen
      serviceId={serviceId!}
      onBack={() => router.back()}
      otherParticipantName={clientName || 'Cliente'}
    />
  );
}
