import { create } from 'zustand';
import { ChatService } from '../services/chat';
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
    sendMessage: (text: string, type?: 'text' | 'image', mediaUrl?: string) => Promise<void>;
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
                    const pendingMessages = state.messages.filter(m => m._pending && !confirmedIds.has(m.id));
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

        sendMessage: async (text: string, type = 'text', mediaUrl) => {
            const { activeChatId, messages } = get();
            if (!activeChatId) return;

            const userId = (await import('@/firebaseConfig')).auth.currentUser?.uid;
            if (!userId) return;

            // Create optimistic pending message
            const pendingMessage: Message = {
                id: `pending_${Date.now()}_${Math.random()}`,
                senderId: userId,
                text,
                createdAt: Date.now(),
                type,
                mediaUrl,
                readBy: {},
                _pending: true,
            };

            // Add pending message to UI immediately
            set({ messages: [...messages, pendingMessage] });

            try {
                await ChatService.sendMessage(activeChatId, text, type, mediaUrl);
                // Real-time listener will replace pending message with server-confirmed one
            } catch (error) {
                console.error("Failed to send message:", error);
                // Mark message as failed
                set((state) => ({
                    messages: state.messages.map(m =>
                        m.id === pendingMessage.id
                            ? { ...m, _pending: false, _failed: true }
                            : m
                    )
                }));
            }
        }
    };
});
