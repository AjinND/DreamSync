import { create } from 'zustand';
import { ChatService } from '../services/chat';
import { Chat, Message } from '../types/chat';

interface ChatState {
    chats: Chat[];
    activeChatId: string | null;
    messages: Message[];
    isLoading: boolean;

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
            }, 3000);

            messagesUnsubscribe = ChatService.subscribeToMessages(chatId, (messages) => {
                clearTimeout(loadingTimeout);
                set({ messages, isLoading: false });
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
            set({ chats: [], activeChatId: null, messages: [], isLoading: false });
        },

        sendMessage: async (text: string, type = 'text', mediaUrl) => {
            const { activeChatId } = get();
            if (!activeChatId) return;

            try {
                await ChatService.sendMessage(activeChatId, text, type, mediaUrl);
            } catch (error) {
                console.error("Failed to send message:", error);
                // Could verify toast or error state here
            }
        }
    };
});
