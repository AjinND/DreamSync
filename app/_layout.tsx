import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { onAuthStateChanged, User } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { auth } from "../firebaseConfig";
import { BucketLoaderFull } from "../src/components/loading";
import { useNotificationHandler } from "../hooks/useNotificationHandler";
import { OfflineBanner } from "../src/components/ui/OfflineBanner";
import { KeyManager } from "../src/services/keyManager";
import { NotificationService } from "../src/services/notifications";
import { UsersService } from "../src/services/users";
import { useNotificationStore } from "../src/store/useNotificationStore";

export default function RootLayout() {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const router = useRouter();
  const segments = useSegments();
  const pushTokenRef = useRef<string | null>(null);

  // Set up push notification listeners (foreground display + deep link routing)
  useNotificationHandler();

  const [needsReauth, setNeedsReauth] = useState(false);

  // Track first auth check (cold start) vs subsequent calls (fresh login/signup)
  const isInitialAuthCheckRef = useRef(true);
  // Mirror initializing state to avoid stale closures in async handler
  const initializingRef = useRef(true);

  useEffect(() => {
    // Handle user state changes
    function onAuthStateChangedHandler(user: User | null) {
      setUser(user);
      if (user) {
        // Ensure user profile exists in Firestore
        UsersService.ensureUserProfile().catch(err =>
          console.error('Failed to ensure user profile:', err)
        );

        // Only check key availability on FIRST auth check (cold start)
        // For fresh login/signup, keys are initialized by login.tsx/signup.tsx BEFORE this fires
        if (isInitialAuthCheckRef.current) {
          isInitialAuthCheckRef.current = false;

          // Check encryption key availability (cold start after reinstall/data clear)
          KeyManager.isKeyInitialized()
            .then(initialized => {
              if (!initialized) {
                setNeedsReauth(true);
              }
              // Defer transition out of initializing until after key check completes
              if (initializingRef.current) {
                setInitializing(false);
                initializingRef.current = false;
              }
            })
            .catch(err => {
              console.error('Key initialization check failed:', err);
              // Assume keys are missing on error
              setNeedsReauth(true);
              if (initializingRef.current) {
                setInitializing(false);
                initializingRef.current = false;
              }
            });
        } else {
          // Non-initial calls (fresh login/signup) — keys should already be initialized
          // Transition out of initializing immediately
          if (initializingRef.current) {
            setInitializing(false);
            initializingRef.current = false;
          }
        }

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

        // Transition out of initializing immediately for null user
        if (initializingRef.current) {
          setInitializing(false);
          initializingRef.current = false;
        }
      }
    }

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
      // If logged in and in auth group, redirect to home (only if keys are ready)
      KeyManager.isKeyInitialized().then(initialized => {
        if (initialized) {
          router.replace("/(tabs)");
        }
        // If not initialized, login/signup screen handles navigation after key init
      });
    }
  }, [user, initializing, segments, needsReauth]);

  if (initializing) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <BottomSheetModalProvider>
          <BucketLoaderFull message="Preparing your workspace..." />
        </BottomSheetModalProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
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
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
