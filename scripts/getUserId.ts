/**
 * Get User ID Helper Script
 *
 * This script helps you find your Firebase user ID so you can run the verification script.
 *
 * Usage:
 *   npx ts-node scripts/getUserId.ts <email>
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import * as dotenv from 'dotenv';
import * as readline from 'readline';

// Load environment variables
dotenv.config();

const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

function askQuestion(query: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) =>
        rl.question(query, (ans) => {
            rl.close();
            resolve(ans);
        })
    );
}

async function main() {
    console.log('🔑 DreamSync User ID Finder\n');

    const email = process.argv[2] || (await askQuestion('Enter your email: '));
    const password = await askQuestion('Enter your password: ');

    console.log('\n🔐 Signing in...\n');

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        console.log('✅ Signed in successfully!\n');
        console.log('Your User ID:');
        console.log('─────────────────────────────────────');
        console.log(user.uid);
        console.log('─────────────────────────────────────\n');
        console.log('Copy this ID and use it to run the verification script:\n');
        console.log(`  npx ts-node scripts/verifyEncryption.ts ${user.uid}\n`);
        console.log('To check messages too, add a chat ID:\n');
        console.log(`  npx ts-node scripts/verifyEncryption.ts ${user.uid} <chatId>\n`);
    } catch (error: any) {
        console.error('❌ Error signing in:', error.message);
        process.exit(1);
    }

    process.exit(0);
}

main();
