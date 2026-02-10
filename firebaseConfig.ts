// MUST be first import - polyfills crypto.getRandomValues for TweetNaCl
import "react-native-get-random-values";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
import {
    Auth,
    getAuth,
    initializeAuth
} from 'firebase/auth';
// @ts-ignore
import { getReactNativePersistence } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';

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
    console.error("Current Config (Partial):", JSON.stringify(firebaseConfig, null, 2));
}

const app = initializeApp(firebaseConfig);

let auth: Auth;

if (Platform.OS === 'web') {
    auth = getAuth(app);
} else {
    try {
        auth = initializeAuth(app, {
            persistence: getReactNativePersistence(AsyncStorage)
        });
    } catch (e) {
        console.warn("Auth init error, falling back to default:", e);
        auth = getAuth(app);
    }
}

// Enable Debug Logs to see WHY it fails
//setLogLevel('debug');

export { auth };

// Safe initialization for HMR (Hot Module Replacement)
export const db = (() => {
    try {
        if (Platform.OS === 'android') {
            return initializeFirestore(app, { experimentalAutoDetectLongPolling: true } as any);
        }
        return getFirestore(app);
    } catch (e) {
        // If already initialized (e.g. reload), return existing instance
        return getFirestore(app);
    }
})();


export const storage = getStorage(app);

// Initialize Realtime Database
import { getDatabase } from 'firebase/database';
export const rtdb = getDatabase(app);

export default app;
