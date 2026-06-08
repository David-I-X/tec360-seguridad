/**
 * ChatScreen — Pantalla de chat reutilizable para cliente y técnico.
 * Se conecta al WebSocket de servicio y muestra historial persistido.
 */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/lib/auth-context';
import { fetchWithAuth, getAuthToken } from '@/lib/api';
import { serviceWebSocket } from '@/lib/websocket';

interface Message {
  id: string;
  service_id: string;
  sender_id: string;
  sender_name?: string;
  text: string;
  created_at: string;
  is_read: boolean;
}

interface ChatScreenProps {
  serviceId: string;
  onBack: () => void;
  otherParticipantName?: string;
}

export default function ChatScreen({ serviceId, onBack, otherParticipantName }: ChatScreenProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const currentUserId = user?.id;

  // ─── Load chat history ────────────────────────────
  const loadHistory = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`/services/${serviceId}/messages?limit=100`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (e) {
      console.error('[Chat] Error loading history:', e);
    } finally {
      setLoading(false);
    }
  }, [serviceId]);

  // ─── WebSocket connection ─────────────────────────
  useEffect(() => {
    loadHistory();

    // Connect to service room
    const connectWS = async () => {
      const token = await getAuthToken();
      if (token) {
        serviceWebSocket.connect(serviceId, token);
      }
    };
    connectWS();

    // Listen for chat messages
    const unsubscribe = serviceWebSocket.onMessage((msg) => {
      if (msg.type === 'chat_message' && msg.data) {
        const newMessage: Message = {
          id: msg.data.id,
          service_id: msg.data.service_id,
          sender_id: msg.data.sender_id,
          sender_name: msg.data.sender_name,
          text: msg.data.text,
          created_at: msg.data.created_at,
          is_read: false,
        };
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.some((m) => m.id === newMessage.id)) return prev;
          return [...prev, newMessage];
        });
      }
    });

    // Mark messages as read
    fetchWithAuth(`/services/${serviceId}/messages/read`, { method: 'POST' }).catch(() => {});

    return () => {
      unsubscribe();
    };
  }, [serviceId, loadHistory]);

  // ─── Auto-scroll to bottom ────────────────────────
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // ─── Send message ─────────────────────────────────
  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text || sending) return;

    setSending(true);
    serviceWebSocket.sendChatMessage(text);
    setInputText('');
    Keyboard.dismiss();
    setSending(false);
  }, [inputText, sending]);

  // ─── Format time ──────────────────────────────────
  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // ─── Render message bubble ────────────────────────
  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.sender_id === currentUserId;
    return (
      <View style={[styles.bubbleRow, isMe ? styles.bubbleRowRight : styles.bubbleRowLeft]}>
        {!isMe && (
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {(item.sender_name || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={[styles.bubble, isMe ? styles.bubbleMine : styles.bubbleTheirs]}>
          {isMe ? (
            <LinearGradient
              colors={['#7c3aed', '#6d28d9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.bubbleGradient}
            >
              <Text style={[styles.bubbleText, styles.bubbleTextMine]}>{item.text}</Text>
              <Text style={[styles.bubbleTime, styles.bubbleTimeMine]}>{formatTime(item.created_at)}</Text>
            </LinearGradient>
          ) : (
            <>
              {item.sender_name && (
                <Text style={styles.senderName}>{item.sender_name}</Text>
              )}
              <Text style={[styles.bubbleText, styles.bubbleTextTheirs]}>{item.text}</Text>
              <Text style={[styles.bubbleTime, styles.bubbleTimeTheirs]}>{formatTime(item.created_at)}</Text>
            </>
          )}
        </View>
      </View>
    );
  };

  // ─── Render ───────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>
            {otherParticipantName || 'Chat del Servicio'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {serviceWebSocket.isConnected ? '🟢 En línea' : '⚪ Conectando...'}
          </Text>
        </View>
        <View style={styles.headerIcon}>
          <Ionicons name="chatbubbles" size={24} color="rgba(255,255,255,0.7)" />
        </View>
      </View>

      {/* Messages */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={styles.loadingText}>Cargando mensajes...</Text>
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubble-ellipses-outline" size={64} color="#374151" />
          <Text style={styles.emptyTitle}>Sin mensajes aún</Text>
          <Text style={styles.emptySubtitle}>
            Envía un mensaje para coordinar el servicio
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />
      )}

      {/* Input */}
      <View style={styles.inputContainer}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            placeholder="Escribe un mensaje..."
            placeholderTextColor="#6b7280"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={2000}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
          >
            <LinearGradient
              colors={inputText.trim() ? ['#7c3aed', '#6d28d9'] : ['#374151', '#374151']}
              style={styles.sendBtnGradient}
            >
              <Ionicons name="send" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ─────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f14',
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#18181b',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 2,
  },
  headerIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9ca3af',
    marginTop: 12,
    fontSize: 14,
  },
  // Empty
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    color: '#9ca3af',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtitle: {
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  // Messages list
  messagesList: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  // Bubble
  bubbleRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-end',
  },
  bubbleRowLeft: {
    justifyContent: 'flex-start',
  },
  bubbleRowRight: {
    justifyContent: 'flex-end',
  },
  avatarCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarText: {
    color: '#d1d5db',
    fontSize: 13,
    fontWeight: '600',
  },
  bubble: {
    maxWidth: '75%',
    borderRadius: 18,
    overflow: 'hidden',
  },
  bubbleMine: {
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: '#1f2937',
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleGradient: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  senderName: {
    color: '#a78bfa',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 20,
  },
  bubbleTextMine: {
    color: '#fff',
  },
  bubbleTextTheirs: {
    color: '#e5e7eb',
  },
  bubbleTime: {
    fontSize: 10,
    marginTop: 4,
  },
  bubbleTimeMine: {
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'right',
  },
  bubbleTimeTheirs: {
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'right',
  },
  // Input
  inputContainer: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 30 : 12,
    backgroundColor: '#18181b',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#1f2937',
    color: '#fff',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    maxHeight: 100,
    marginRight: 8,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendBtnGradient: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
