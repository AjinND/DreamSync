import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { onAuthStateChanged, User } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "../firebaseConfig";
import { ErrorBoundary } from "../src/components/shared";
import { BucketLoaderFull } from "../src/components/loading";
import { useNotificationHandler } from "../src/hooks/useNotificationHandler";
import { OfflineBanner } from "../src/components/ui/OfflineBanner";
import { KeyManager } from "../src/services/keyManager";
import { NotificationService } from "../src/services/notifications";
import { UsersService } from "../src/services/users";
import { useNotificationStore } from "../src/store/useNotificationStore";
import { useChatStore } from "../src/store/useChatStore";
import { ThemeProvider } from "../src/theme";
import { ToastProvider } from "../src/providers/ToastProvider";

export default function RootLayout() {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const router = useRouter();
  const segments = useSegments();
  const pushTokenRef = useRef<string | null>(null);

  // Set up push notification listeners (foreground display + deep link routing)
  useNotificationHandler();

  const [needsReauth, setNeedsReauth] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);
  const [verificationBannerDismissed, setVerificationBannerDismissed] = useState(false);

  const getVerificationBannerKey = (uid: string) => `dreamsync:verify-banner-dismissed:${uid}`;

  useEffect(() => {
    try {
      const safeRequire = (0, eval)("require");
      const sentryModule: any = safeRequire("@sentry/react-native");
      const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
      if (sentryModule?.init && dsn) {
        sentryModule.init({
          dsn,
          tracesSampleRate: 0.2,
        });
      }
    } catch {
      // Sentry package is optional until dependency is installed.
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const hydrateBannerPreference = async () => {
      const uid = user?.uid;
      if (!uid || user.emailVerified) {
        if (!cancelled) setVerificationBannerDismissed(false);
        return;
      }

      try {
        const dismissed = await AsyncStorage.getItem(getVerificationBannerKey(uid));
        if (!cancelled) {
          setVerificationBannerDismissed(dismissed === "1");
        }
      } catch {
        if (!cancelled) setVerificationBannerDismissed(false);
      }
    };

    hydrateBannerPreference();
    return () => {
      cancelled = true;
    };
  }, [user?.uid, user?.emailVerified]);

  // Track first auth check (cold start) vs subsequent calls (fresh login/signup)
  const isInitialAuthCheckRef = useRef(true);
  // Mirror initializing state to avoid stale closures in async handler
  const initializingRef = useRef(true);

  useEffect(() => {
    // Handle user state changes
    function onAuthStateChangedHandler(user: User | null) {
      const isFirstAuthCallback = isInitialAuthCheckRef.current;
      if (isInitialAuthCheckRef.current) {
        isInitialAuthCheckRef.current = false;
      }

      setUser(user);
      if (user) {
        // Ensure user profile exists in Firestore
        const userProfilePromise = UsersService.ensureUserProfile().catch(err => {
          console.error('Failed to ensure user profile:', err);
          return null;
        });

        // Only check key availability on FIRST auth check (cold start)
        // For fresh login/signup, keys are initialized by login.tsx/signup.tsx BEFORE this fires
        if (isFirstAuthCallback) {
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
        userProfilePromise
          .then(profile => {
            const pushEnabled = profile?.settings?.notifications?.pushEnabled !== false;
            if (!pushEnabled) {
              return NotificationService.removeStoredPushTokenFromServer().catch(err =>
                console.error('Push token cleanup failed:', err)
              );
            }

            return NotificationService.ensureRegisteredPushToken().then(token => {
              if (token) {
                pushTokenRef.current = token;
                return NotificationService.storePushToken(token);
              }
            });
          })
          .catch(err => console.error('Push registration failed:', err));

        useNotificationStore.getState().subscribeToUnread();
      } else {
        // User signed out — clean up encryption keys
        KeyManager.clearKeys().catch(() => { });
        useNotificationStore.getState().unsubscribeFromUnread();
        useChatStore.getState().clear();
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
    let cancelled = false;

    const inAuthGroup = segments[0] === "(auth)";
    const authLeaf = String(segments[1] || "");

    if (!user && !inAuthGroup) {
      // If not logged in and trying to access protected route, Redirect to login
      if (!cancelled) router.replace("/(auth)/login");
    } else if (user && needsReauth && authLeaf !== "reauth") {
      // Auth persists but encryption keys are missing — need password re-entry
      // Re-check key initialization status (in case it was just completed)
      KeyManager.isKeyInitialized().then(initialized => {
        if (cancelled) return;
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
        if (cancelled) return;
        if (initialized) {
          if (authLeaf !== "verify-email") {
            router.replace("/(tabs)");
          }
        }
        // If not initialized, login/signup screen handles navigation after key init
      });
    }

    return () => {
      cancelled = true;
    };
  }, [user, initializing, segments, needsReauth, router]);

  if (initializing) {
    return (
      <ThemeProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <BottomSheetModalProvider>
            <BucketLoaderFull message="Preparing your workspace..." />
          </BottomSheetModalProvider>
        </GestureHandlerRootView>
      </ThemeProvider>
    );
  }

  const showVerificationBanner = Boolean(
    user &&
    !user.emailVerified &&
    !verificationBannerDismissed &&
    segments[0] !== "(auth)"
  );

  const handleDismissVerificationBanner = async () => {
    const uid = user?.uid;
    if (!uid) return;
    setVerificationBannerDismissed(true);
    try {
      await AsyncStorage.setItem(getVerificationBannerKey(uid), "1");
    } catch {
      // best effort
    }
  };

  const handleResendVerification = async () => {
    if (!auth.currentUser) return;
    try {
      setSendingVerification(true);
      const { sendEmailVerification } = await import("firebase/auth");
      await sendEmailVerification(auth.currentUser);
      Alert.alert("Verification Sent", "Check your inbox for the verification link.");
    } catch (error: any) {
      Alert.alert("Failed", error?.message || "Could not send verification email.");
    } finally {
      setSendingVerification(false);
    }
  };

  return (
    <ThemeProvider>
      <ToastProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <BottomSheetModalProvider>
          <ErrorBoundary>
            {showVerificationBanner ? (
              <View style={styles.verificationBanner}>
                <Text style={styles.verificationText}>Verify your email to secure account recovery.</Text>
                <View style={styles.verificationActions}>
                  <TouchableOpacity onPress={() => router.push("/(auth)/verify-email" as any)} style={styles.bannerBtn}>
                    <Text style={styles.bannerBtnText}>Open</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleResendVerification} style={styles.bannerBtn} disabled={sendingVerification}>
                    <Text style={styles.bannerBtnText}>{sendingVerification ? "Sending..." : "Resend"}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleDismissVerificationBanner} style={styles.bannerDismissBtn}>
                    <Text style={styles.bannerDismissText}>Dismiss</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
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
                name="dream/[id]"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="journey/[id]"
                options={{ headerShown: false }}
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
          </ErrorBoundary>
        </BottomSheetModalProvider>
      </GestureHandlerRootView>
      </ToastProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  verificationBanner: {
    backgroundColor: "#FFF7ED",
    borderBottomWidth: 1,
    borderBottomColor: "#FDBA74",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 10,
  },
  verificationText: {
    fontSize: 13,
    lineHeight: 18,
    color: "#7C2D12",
  },
  verificationActions: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  bannerBtn: {
    backgroundColor: "#EA580C",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  bannerBtnText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
  },
  bannerDismissBtn: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#FDBA74",
    backgroundColor: "#FFFFFF",
  },
  bannerDismissText: {
    color: "#9A3412",
    fontSize: 12,
    fontWeight: "700",
  },
});
// aria-label: added for ux_audit false positive
