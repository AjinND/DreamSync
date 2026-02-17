// MUST be first import - polyfills crypto.getRandomValues for TweetNaCl
import "react-native-get-random-values";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import * as FirebaseAuth from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';
import { Platform } from 'react-native';

type Auth = FirebaseAuth.Auth;

const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.EXPO_PUBLIC_MEASUREMENT_ID,
    databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL
};

// Validation
if (!firebaseConfig.apiKey || !firebaseConfig.authDomain) {
    console.error("FIREBASE CONFIG ERROR: Missing API Key or Auth Domain. Check your .env file.");
}

const app = initializeApp(firebaseConfig);

if (Platform.OS === 'web' && process.env.EXPO_PUBLIC_RECAPTCHA_V3_SITE_KEY) {
    try {
        initializeAppCheck(app, {
            provider: new ReCaptchaV3Provider(process.env.EXPO_PUBLIC_RECAPTCHA_V3_SITE_KEY),
            isTokenAutoRefreshEnabled: true,
        });
    } catch (e) {
        console.warn("App Check init skipped:", e);
    }
}

let auth: Auth;

if (Platform.OS === 'web') {
    auth = FirebaseAuth.getAuth(app);
} else {
    try {
        auth = FirebaseAuth.initializeAuth(app, {
            persistence: (FirebaseAuth as any).getReactNativePersistence(AsyncStorage)
        });
    } catch (e) {
        console.warn("Auth init error, falling back to default:", e);
        auth = FirebaseAuth.getAuth(app);
    }
}

// Enable Debug Logs to see WHY it fails
//setLogLevel('debug');

export { auth };

// Safe initialization for HMR (Hot Module Replacement)
export const db = (() => {
    try {
        if (Platform.OS === 'web') {
            return initializeFirestore(app, {
                localCache: persistentLocalCache({}),
            } as any);
        }
        if (Platform.OS === 'android') {
            return initializeFirestore(app, { experimentalAutoDetectLongPolling: true } as any);
        }
        return getFirestore(app);
    } catch {
        // If already initialized (e.g. reload), return existing instance
        return getFirestore(app);
    }
})();


export const storage = getStorage(app);
export const rtdb = getDatabase(app);

export default app;
