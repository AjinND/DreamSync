import { Ionicons } from "@expo/vector-icons";
import NetInfo from "@react-native-community/netinfo";
import { useEffect, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { legacyColors as colors } from "../../theme";

export function OfflineBanner() {
    const insets = useSafeAreaInsets();
    const [isConnected, setIsConnected] = useState<boolean | null>(true);
    const [heightAnim] = useState(new Animated.Value(0));

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener((state) => {
            setIsConnected(state.isConnected);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        Animated.timing(heightAnim, {
            toValue: isConnected === false ? 40 : 0,
            duration: 300,
            useNativeDriver: false,
        }).start();
    }, [isConnected]);

    if (isConnected !== false) return null;

    return (
        <Animated.View style={[styles.container, { height: heightAnim, paddingTop: insets.top > 0 ? insets.top : 0 }]}>
            <View style={styles.content}>
                <Ionicons name="cloud-offline" size={16} color="white" style={{ marginRight: 8 }} />
                <Text style={styles.text}>No Internet Connection</Text>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.slate[800],
        overflow: 'hidden',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        justifyContent: 'flex-end',
    },
    content: {
        height: 40,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 4,
    },
    text: {
        color: 'white',
        fontWeight: '600',
        fontSize: 12,
    },
});
