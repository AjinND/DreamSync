/**
 * CommentSection - Display and add comments on dreams
 */

import { auth } from '@/firebaseConfig';
import { CommentsService } from '@/src/services/comments';
import { useTheme } from '@/src/theme';
import { Comment } from '@/src/types/social';
import { Send, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { UserAvatar } from './UserAvatar';

interface CommentSectionProps {
    dreamId: string;
    commentsCount?: number;
    onCountChange?: (count: number) => void;
}

export function CommentSection({ dreamId, commentsCount = 0, onCountChange }: CommentSectionProps) {
    const { colors } = useTheme();
    const [comments, setComments] = useState<Comment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newComment, setNewComment] = useState('');
    const [isSending, setIsSending] = useState(false);

    const currentUserId = auth.currentUser?.uid;

    useEffect(() => {
        loadComments();
    }, [dreamId]);

    const loadComments = async () => {
        setIsLoading(true);
        const fetchedComments = await CommentsService.getComments(dreamId);
        setComments(fetchedComments);
        setIsLoading(false);

        // Sync count local
        onCountChange?.(fetchedComments.length);

        // Self-healing: if count mismatch, sync it in DB
        // Note: commentsCount prop might be 0 if not passed, verifying mismatch logic
        if (commentsCount !== undefined && commentsCount !== fetchedComments.length) {
            // We assume fetchedComments.length is the source of truth
            CommentsService.syncCommentCount(dreamId, fetchedComments.length);
        }
    };

    const handleSend = async () => {
        if (!newComment.trim() || isSending) return;

        setIsSending(true);
        const comment = await CommentsService.addComment(dreamId, newComment);
        if (comment) {
            setComments(prev => {
                const newComments = [comment, ...prev];
                onCountChange?.(newComments.length);
                return newComments;
            });
            setNewComment('');
        }
        setIsSending(false);
    };

    const handleDelete = (commentId: string) => {
        Alert.alert(
            'Delete Comment',
            'Are you sure you want to delete this comment?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        const success = await CommentsService.deleteComment(dreamId, commentId);
                        if (success) {
                            setComments(prev => {
                                const newComments = prev.filter(c => c.id !== commentId);
                                onCountChange?.(newComments.length);
                                return newComments;
                            });
                        }
                    },
                },
            ]
        );
    };

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    return (
        <View style={styles.container}>
            {/* Comment Input */}
            <View style={[styles.inputContainer, { backgroundColor: colors.surface }]}>
                <TextInput
                    style={[styles.input, { color: colors.textPrimary }]}
                    placeholder="Add a comment..."
                    placeholderTextColor={colors.textMuted}
                    value={newComment}
                    onChangeText={setNewComment}
                    multiline
                    maxLength={500}
                />
                <TouchableOpacity
                    onPress={handleSend}
                    disabled={!newComment.trim() || isSending}
                    style={[
                        styles.sendButton,
                        { backgroundColor: newComment.trim() ? colors.primary : colors.border },
                    ]}
                >
                    {isSending ? (
                        <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                        <Send size={18} color="#FFF" />
                    )}
                </TouchableOpacity>
            </View>

            {/* Comments List */}
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={colors.textMuted} />
                </View>
            ) : comments.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                        No comments yet. Be the first!
                    </Text>
                </View>
            ) : (
                <View style={styles.commentsList}>
                    {comments.map(comment => (
                        <View key={comment.id} style={styles.commentItem}>
                            <UserAvatar
                                userId={comment.userId}
                                name={comment.userName}
                                avatar={comment.userAvatar}
                                size="small"
                            />
                            <View style={styles.commentContent}>
                                <View style={styles.commentHeader}>
                                    <Text style={[styles.commentName, { color: colors.textPrimary }]}>
                                        {comment.userName}
                                    </Text>
                                    <Text style={[styles.commentTime, { color: colors.textMuted }]}>
                                        {formatDate(comment.createdAt)}
                                    </Text>
                                </View>
                                <Text style={[styles.commentText, { color: colors.textSecondary }]}>
                                    {comment.text}
                                </Text>
                            </View>
                            {comment.userId === currentUserId && (
                                <TouchableOpacity
                                    onPress={() => handleDelete(comment.id)}
                                    style={styles.deleteButton}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                    <Trash2 size={14} color={colors.textMuted} />
                                </TouchableOpacity>
                            )}
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 16,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: 12,
        borderRadius: 16,
        gap: 10,
    },
    input: {
        flex: 1,
        fontSize: 15,
        maxHeight: 100,
        paddingVertical: 4,
    },
    sendButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingContainer: {
        padding: 20,
        alignItems: 'center',
    },
    emptyContainer: {
        padding: 20,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
    },
    commentsList: {
        gap: 14,
    },
    commentItem: {
        flexDirection: 'row',
        gap: 10,
    },
    commentContent: {
        flex: 1,
    },
    commentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 2,
    },
    commentName: {
        fontWeight: '600',
        fontSize: 14,
    },
    commentTime: {
        fontSize: 12,
    },
    commentText: {
        fontSize: 14,
        lineHeight: 20,
    },
    deleteButton: {
        padding: 4,
    },
});
