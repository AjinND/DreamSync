import React from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { auth } from '../../../firebaseConfig';
import { useTheme } from '../../theme';
import { Message } from '../../types/chat';
import { formatMessageTime } from '../../utils/formatChatTimestamp';
import { Lock, Unlock } from 'lucide-react-native';

interface MessageBubbleProps {
    message: Message;
    // Optional: Pass sender details if available in parent
    senderName?: string;
    senderAvatar?: string | null;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, senderName, senderAvatar }) => {
    const isOwn = message.senderId === auth.currentUser?.uid;
    const { colors } = useTheme();
    const [isImageOpen, setIsImageOpen] = React.useState(false);
    const hasImage = message.type === 'image' && !!message.mediaUrl;

    return (
        <>
            <View
                style={[
                    styles.row,
                    { justifyContent: isOwn ? 'flex-end' : 'flex-start' }
                ]}
            >
                {!isOwn && (
                    <View style={styles.avatarWrap}>
                        <View
                            style={[styles.avatar, { backgroundColor: colors.borderLight || '#e2e8f0' }]}
                        >
                            {senderAvatar ? (
                                <Image source={{ uri: senderAvatar }} style={styles.avatarImage} />
                            ) : (
                                <Text style={[styles.avatarText, { color: colors.textSecondary }]}>
                                    {senderName ? senderName[0].toUpperCase() : '?'}
                                </Text>
                            )}
                        </View>
                    </View>
                )}

                <View
                    style={[
                        styles.bubble,
                        {
                            backgroundColor: isOwn ? colors.primary : colors.surface,
                            borderBottomRightRadius: isOwn ? 4 : 20,
                            borderBottomLeftRadius: !isOwn ? 4 : 20,
                        }
                    ]}
                >
                    {!isOwn && senderName && (
                        <Text
                            style={[styles.senderName, { color: colors.primary }]}
                        >
                            {senderName}
                        </Text>
                    )}

                    {hasImage && (
                        <Pressable onPress={() => setIsImageOpen(true)} style={{ marginBottom: message.text ? 8 : 0 }}>
                            <Image
                                source={{ uri: message.mediaUrl }}
                                style={[styles.messageImage, { backgroundColor: colors.borderLight || '#e2e8f0' }]}
                            />
                        </Pressable>
                    )}

                    {!!message.text && (
                        <Text
                            style={[styles.messageText, { color: isOwn ? 'white' : colors.textPrimary }]}
                        >
                            {message.text}
                        </Text>
                    )}

                    <View
                        style={styles.metaRow}
                    >
                        {message.encrypted ? (
                            <Lock size={11} color={isOwn ? 'rgba(255,255,255,0.7)' : colors.textMuted} />
                        ) : (
                            <Unlock size={11} color={isOwn ? 'rgba(255,255,255,0.7)' : colors.textMuted} />
                        )}
                        <Text
                            style={[
                                styles.metaText,
                                { color: isOwn ? 'rgba(255,255,255,0.7)' : colors.textMuted }
                            ]}
                        >
                            {formatMessageTime(message.createdAt)}
                        </Text>
                    </View>
                </View>
            </View>

            <Modal
                visible={isImageOpen}
                transparent
                animationType='fade'
                onRequestClose={() => setIsImageOpen(false)}
            >
                <Pressable
                    onPress={() => setIsImageOpen(false)}
                    style={styles.modalBackdrop}
                >
                    <Image
                        source={{ uri: message.mediaUrl }}
                        style={styles.modalImage}
                    />
                </Pressable>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    avatarWrap: {
        marginRight: 8,
        justifyContent: 'flex-end',
        marginBottom: 2,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarImage: {
        width: 32,
        height: 32,
    },
    avatarText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    bubble: {
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        maxWidth: '75%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    senderName: {
        fontSize: 11,
        marginBottom: 4,
        fontWeight: '600',
        marginLeft: 2,
    },
    messageImage: {
        width: 220,
        height: 220,
        borderRadius: 14,
    },
    messageText: {
        fontSize: 16,
        lineHeight: 22,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: 4,
    },
    metaText: {
        fontSize: 11,
        marginLeft: 4,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.92)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    modalImage: {
        width: '100%',
        height: '80%',
        resizeMode: 'contain',
    },
});
