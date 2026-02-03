import { auth } from '@/firebaseConfig';
import { JourneysService } from '@/src/services/journeys';
import { useTheme } from '@/src/theme';
import { Journey } from '@/src/types/social';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Avatar } from '../ui';

interface CollaborationSectionProps {
    dreamId: string;
    isOwner: boolean;
    onStartJourney?: () => void;
}

export function CollaborationSection({ dreamId, isOwner, onStartJourney }: CollaborationSectionProps) {
    const { colors } = useTheme();
    const [journey, setJourney] = useState<Journey | null>(null);
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const userId = auth.currentUser?.uid;

    useEffect(() => {
        loadJourney();
    }, [dreamId, isProcessing]); // Reload when processing changes

    const loadJourney = async () => {
        try {
            const data = await JourneysService.getJourneyByDreamId(dreamId);
            setJourney(data);
        } catch (error) {
            console.error('Failed to load journey:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleJoinRequest = async () => {
        if (!journey || !userId) return;
        setIsProcessing(true);
        try {
            await JourneysService.requestToJoin(journey.id, userId);
            Alert.alert('Request Sent', 'The owner will be notified of your request.');
        } catch (error) {
            Alert.alert('Error', 'Failed to send request.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleManageRequest = async (requesterId: string, action: 'accept' | 'reject') => {
        if (!journey) return;
        setIsProcessing(true);
        try {
            await JourneysService.handleJoinRequest(journey.id, requesterId, action);
            Alert.alert(action === 'accept' ? 'Welcome!' : 'Request Rejected', 'The list has been updated.');
        } catch (error) {
            Alert.alert('Error', `Failed to ${action} request.`);
        } finally {
            setIsProcessing(false);
        }
    };

    const toggleOpenStatus = async () => {
        if (!journey || !isOwner) return;
        try {
            const newStatus = !journey.settings?.isOpen;
            await JourneysService.updateSettings(journey.id, {
                isOpen: newStatus,
                maxParticipants: journey.settings?.maxParticipants || 5
            });
            setJourney(prev => prev ? { ...prev, settings: { ...prev.settings, isOpen: newStatus, maxParticipants: prev.settings?.maxParticipants || 5 } } : null);
        } catch (error) {
            Alert.alert('Error', 'Failed to update settings');
        }
    };

    const updateMaxParticipants = async (newMax: number) => {
        if (!journey || !isOwner) return;
        // Optimistic update
        setJourney(prev => prev ? ({
            ...prev,
            settings: {
                ...prev.settings!,
                isOpen: prev.settings?.isOpen || false,
                maxParticipants: newMax
            }
        }) : null);

        try {
            await JourneysService.updateSettings(journey.id, {
                isOpen: journey.settings?.isOpen || false,
                maxParticipants: newMax
            });
        } catch (error) {
            console.error(error);
        }
    };

    if (loading) {
        return <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />;
    }

    // 1. No Journey Exists
    if (!journey) {
        if (!isOwner) return null; // Don't show anything to visitors if no journey exists

        return (
            <View style={[styles.container, { backgroundColor: colors.surface }]}>
                <View style={styles.header}>
                    <Ionicons name="people" size={20} color={colors.primary} />
                    <Text style={[styles.title, { color: colors.textPrimary }]}>Go Farther Together</Text>
                </View>
                <Text style={[styles.description, { color: colors.textSecondary }]}>
                    Start a Shared Journey to invite friends and achieve this dream together.
                </Text>
                <TouchableOpacity
                    style={[styles.button, { backgroundColor: colors.primary }]}
                    onPress={onStartJourney}
                >
                    <Text style={styles.buttonText}>Start Journey</Text>
                    <Ionicons name="arrow-forward" size={16} color="#FFF" />
                </TouchableOpacity>
            </View>
        );
    }

    // 2. Journey Exists
    const isParticipant = userId && journey.participants.includes(userId);
    const hasPendingRequest = userId && journey.requests?.includes(userId);
    const isOpen = journey.settings?.isOpen;

    // View for Non-Participants (Seekers)
    if (!isParticipant && !isOwner) {
        if (!isOpen) return null; // Private journey

        return (
            <View style={[styles.container, { backgroundColor: colors.surface }]}>
                <View style={styles.header}>
                    <Ionicons name="people-outline" size={20} color={colors.textSecondary} />
                    <Text style={[styles.title, { color: colors.textPrimary }]}>Join this Journey</Text>
                </View>
                <Text style={[styles.description, { color: colors.textSecondary }]}>
                    This dream is open for collaboration.
                </Text>
                {hasPendingRequest ? (
                    <View style={[styles.button, { backgroundColor: colors.textSecondary + '10' }]}>
                        <Text style={[styles.buttonText, { color: colors.textSecondary }]}>Request Pending</Text>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: colors.accent }]}
                        onPress={handleJoinRequest}
                        disabled={isProcessing}
                    >
                        {isProcessing ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Request to Join</Text>}
                    </TouchableOpacity>
                )}
            </View>
        );
    }

    // View for Participants & Owner
    return (
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
            <View style={styles.header}>
                <Ionicons name="people" size={20} color={colors.accent} />
                <Text style={[styles.title, { color: colors.textPrimary }]}>Active Journey</Text>
                <View style={[styles.badge, { backgroundColor: colors.accent + '20' }]}>
                    <Text style={[styles.badgeText, { color: colors.accent }]}>
                        {journey.participants.length} Travelers
                    </Text>
                </View>
            </View>

            {/* Participants List */}
            <View style={styles.participants}>
                {journey.participants.map((uid, index) => (
                    <View key={uid} style={[styles.avatarContainer, { zIndex: 10 - index }]}>
                        <Avatar name={`User ${uid.slice(0, 2)}`} size="sm" />
                    </View>
                ))}

                {/* Invite / Settings Controls for Owner */}
                {isOwner && (
                    <View style={styles.ownerControls}>
                        {isOpen && (
                            <View style={[styles.maxParticipantsControl, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                                <TouchableOpacity
                                    onPress={() => journey.settings && journey.settings.maxParticipants > 2 && updateMaxParticipants(journey.settings.maxParticipants - 1)}
                                    style={styles.controlBtn}
                                >
                                    <Text style={[styles.controlBtnText, { color: colors.textSecondary }]}>-</Text>
                                </TouchableOpacity>
                                <View style={styles.countContainer}>
                                    <Ionicons name="people" size={12} color={colors.textSecondary} />
                                    <Text style={[styles.controlText, { color: colors.textPrimary }]}>
                                        {journey.settings?.maxParticipants || 5}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => journey.settings && journey.settings.maxParticipants < 50 && updateMaxParticipants(journey.settings.maxParticipants + 1)}
                                    style={styles.controlBtn}
                                >
                                    <Text style={[styles.controlBtnText, { color: colors.textSecondary }]}>+</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        <TouchableOpacity
                            style={[styles.addParticipant, { borderColor: colors.border, backgroundColor: isOpen ? colors.accent + '10' : 'transparent' }]}
                            onPress={toggleOpenStatus}
                        >
                            <Ionicons name={isOpen ? "lock-open" : "lock-closed"} size={16} color={isOpen ? colors.accent : colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Join Requests (Owner Only) */}
            {isOwner && journey.requests && journey.requests.length > 0 && (
                <View style={styles.requestsContainer}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Pending Requests</Text>
                    {journey.requests.map(reqId => (
                        <View key={reqId} style={styles.requestRow}>
                            <View style={styles.userInfo}>
                                <Avatar name={`Req ${reqId.slice(0, 2)}`} size="sm" />
                                <Text style={[styles.userName, { color: colors.textPrimary }]}>User {reqId.slice(0, 4)}...</Text>
                            </View>
                            <View style={styles.actions}>
                                <TouchableOpacity onPress={() => handleManageRequest(reqId, 'reject')} style={[styles.actionBtn, { backgroundColor: '#D32F2F' }]}>
                                    <Ionicons name="close" size={16} color="#FFF" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => handleManageRequest(reqId, 'accept')} style={[styles.actionBtn, { backgroundColor: '#388E3C' }]}>
                                    <Ionicons name="checkmark" size={16} color="#FFF" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 16,
        marginTop: 16,
        padding: 16,
        borderRadius: 16,
        gap: 12,
    },
    loader: {
        marginVertical: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
    },
    description: {
        fontSize: 14,
        lineHeight: 20,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 12,
        gap: 8,
        marginTop: 4,
    },
    buttonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 15,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    participants: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    avatarContainer: {
        marginRight: -10,
        borderWidth: 2,
        borderColor: '#FFF',
        borderRadius: 20,
    },
    addParticipant: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 18, // Offset for overlap
        borderStyle: 'dashed',
    },
    requestsContainer: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: '#ccc',
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    requestRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    userName: {
        fontSize: 14,
        fontWeight: '500',
    },
    actions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    ownerControls: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 12,
        gap: 8,
    },
    maxParticipantsControl: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 20,
        borderWidth: 1,
        paddingHorizontal: 4,
        paddingVertical: 2,
    },
    controlBtn: {
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    controlBtnText: {
        fontSize: 16,
        fontWeight: '600',
    },
    countContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 4,
    },
    controlText: {
        fontSize: 12,
        fontWeight: '600',
    },
});
