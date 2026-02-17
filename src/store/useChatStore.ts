import { create } from 'zustand';
import { auth } from '../../firebaseConfig';
import { ChatService, SendMessageResult } from '../services/chat';
import { Chat, Message } from '../types/chat';

interface ChatState {
    chats: Chat[];
    activeChatId: string | null;
    messages: Message[];
    isLoading: boolean;
    decryptionError: boolean;

    // Actions
    fetchChats: () => void; // Subscribes to chat list
    enterChat: (chatId: string) => void; // Subscribes to messages
    leaveChat: () => void; // Unsubscribes from messages
    clear: () => void; // Unsubscribes from everything (Sign out)
    addPendingMessage: (payload: { text?: string; type?: 'text' | 'image'; mediaUrl?: string; clientId?: string }) => string;
    sendMessage: (payload: { text?: string; type?: 'text' | 'image'; mediaUrl?: string; clientId?: string; skipOptimistic?: boolean }) => Promise<SendMessageResult>;
}

export const useChatStore = create<ChatState>((set, get) => {
    let chatsUnsubscribe: (() => void) | null = null;
    let messagesUnsubscribe: (() => void) | null = null;

    return {
        chats: [],
        activeChatId: null,
        messages: [],
        isLoading: false,
        decryptionError: false,

        fetchChats: () => {
            if (chatsUnsubscribe) return; // Already subscribed

            set({ isLoading: true });
            chatsUnsubscribe = ChatService.subscribeToChats((chats) => {
                set({ chats, isLoading: false });
            });
        },

        enterChat: (chatId: string) => {
            // Unsubscribe from previous chat if any
            if (messagesUnsubscribe) {
                messagesUnsubscribe();
                messagesUnsubscribe = null;
            }

            set({ activeChatId: chatId, messages: [], isLoading: true });
            void ChatService.markChatAsRead(chatId);

            // Set a timeout to prevent infinite loading
            const loadingTimeout = setTimeout(() => {
                console.log('[ChatStore] Message subscription timeout, forcing loading off');
                set({ isLoading: false });
            }, 8000);

            messagesUnsubscribe = ChatService.subscribeToMessages(chatId, (messages) => {
                clearTimeout(loadingTimeout);
                const hasDecryptionErrors = messages.some(m => m.text === '[Unable to decrypt]');

                // Remove pending messages that have been confirmed by server
                set((state) => {
                    const confirmedIds = new Set(messages.map(m => m.id));
                    const confirmedClientIds = new Set(
                        messages.map(m => m.clientId).filter((v): v is string => typeof v === 'string' && v.length > 0)
                    );
                    const pendingMessages = state.messages.filter((m) => {
                        if (!m._pending) return false;
                        if (confirmedIds.has(m.id)) return false;
                        if (m.clientId && confirmedClientIds.has(m.clientId)) return false;
                        return true;
                    });
                    const allMessages = [...messages, ...pendingMessages];

                    return {
                        messages: allMessages,
                        isLoading: false,
                        decryptionError: hasDecryptionErrors
                    };
                });
            });
        },

        leaveChat: () => {
            if (messagesUnsubscribe) {
                messagesUnsubscribe();
                messagesUnsubscribe = null;
            }
            set({ activeChatId: null, messages: [] });
        },

        clear: () => {
            if (chatsUnsubscribe) {
                chatsUnsubscribe();
                chatsUnsubscribe = null;
            }
            if (messagesUnsubscribe) {
                messagesUnsubscribe();
                messagesUnsubscribe = null;
            }
            set({ chats: [], activeChatId: null, messages: [], isLoading: false, decryptionError: false });
        },

        addPendingMessage: ({ text = '', type = 'text', mediaUrl, clientId }) => {
            const { activeChatId, messages } = get();
            if (!activeChatId) return '';

            const userId = auth.currentUser?.uid;
            if (!userId) return '';

            const resolvedClientId = clientId || `client_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

            const pendingMessage: Message = {
                id: `pending_${Date.now()}_${Math.random()}`,
                clientId: resolvedClientId,
                senderId: userId,
                text,
                createdAt: Date.now(),
                type,
                mediaUrl,
                readBy: {},
                _pending: true,
            };

            set({ messages: [...messages, pendingMessage] });
            return resolvedClientId;
        },

        sendMessage: async ({ text = '', type = 'text', mediaUrl, clientId, skipOptimistic = false }) => {
            const { activeChatId } = get();
            if (!activeChatId) return { encrypted: true };

            let resolvedClientId = clientId;
            if (!skipOptimistic) {
                resolvedClientId = get().addPendingMessage({ text, type, mediaUrl, clientId });
            }

            try {
                return await ChatService.sendMessage(activeChatId, text, type, mediaUrl, resolvedClientId);
            } catch (error) {
                console.error("Failed to send message:", error);
                set((state) => ({
                    messages: state.messages.map(m =>
                        m.clientId === resolvedClientId
                            ? { ...m, _pending: false, _failed: true }
                            : m
                    )
                }));
                return { encrypted: false, reason: 'send_failed' };
            }
        }
    };
});
