import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { onAuthStateChanged, User } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { auth } from "../firebaseConfig";
import { useNotificationHandler } from "../hooks/useNotificationHandler";
import { OfflineBanner } from "../src/components/ui/OfflineBanner";
import { KeyManager } from "../src/services/keyManager";
import { NotificationService } from "../src/services/notifications";
import { UsersService } from "../src/services/users";
import { useNotificationStore } from "../src/store/useNotificationStore";
import { legacyColors as colors } from "../src/theme";

export default function RootLayout() {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const router = useRouter();
  const segments = useSegments();
  const pushTokenRef = useRef<string | null>(null);

  // Set up push notification listeners (foreground display + deep link routing)
  useNotificationHandler();

  const [needsReauth, setNeedsReauth] = useState(false);

  // Handle user state changes
  function onAuthStateChangedHandler(user: User | null) {
    setUser(user);
    if (user) {
      // Ensure user profile exists in Firestore
      UsersService.ensureUserProfile().catch(err =>
        console.error('Failed to ensure user profile:', err)
      );

      // Check encryption key availability (cold start after reinstall/data clear)
      KeyManager.isKeyInitialized().then(initialized => {
        if (!initialized) {
          setNeedsReauth(true);
        }
      });

      // Register for push notifications and subscribe to unread count
      NotificationService.registerForPushNotifications()
        .then(token => {
          if (token) {
            pushTokenRef.current = token;
            return NotificationService.storePushToken(token);
          }
        })
        .catch(err => console.error('Push registration failed:', err));

      useNotificationStore.getState().subscribeToUnread();
    } else {
      // User signed out — clean up encryption keys
      KeyManager.clearKeys().catch(() => { });
      useNotificationStore.getState().unsubscribeFromUnread();
      pushTokenRef.current = null;
      setNeedsReauth(false);
    }
    if (initializing) setInitializing(false);
  }

  useEffect(() => {
    const subscriber = onAuthStateChanged(auth, onAuthStateChangedHandler);
    return subscriber; // unsubscribe on unmount
  }, []);

  useEffect(() => {
    if (initializing) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!user && !inAuthGroup) {
      // If not logged in and trying to access protected route, Redirect to login
      router.replace("/(auth)/login");
    } else if (user && needsReauth && segments[1] !== "reauth") {
      // Auth persists but encryption keys are missing — need password re-entry
      // Re-check key initialization status (in case it was just completed)
      KeyManager.isKeyInitialized().then(initialized => {
        if (!initialized) {
          router.replace("/(auth)/reauth");
        } else {
          // Keys are now available, clear reauth flag
          setNeedsReauth(false);
          router.replace("/(tabs)");
        }
      });
    } else if (user && inAuthGroup && !needsReauth) {
      // If logged in and in auth group, redirect to home
      router.replace("/(tabs)");
    }
  }, [user, initializing, segments, needsReauth]);

  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.indigo[600]} />
      </View>
    );
  }

  return (
    <>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen
          name="item/add"
          options={{ headerShown: false, presentation: "modal" }}
        />
        <Stack.Screen
          name="item/[id]"
          options={{ headerShown: false, presentation: "modal" }}
        />
        <Stack.Screen
          name="category/[id]"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="notifications"
          options={{ headerShown: false }}
        />
        <Stack.Screen name="+not-found" />
      </Stack>
      <OfflineBanner />
      <StatusBar style="auto" />
    </>
  );
}
