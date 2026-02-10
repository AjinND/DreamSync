/**
 * Encryption Verification Script
 *
 * This script checks the encryption status of your data in Firebase.
 * Run this to verify whether new data is being encrypted correctly.
 *
 * Usage:
 *   npx ts-node scripts/verifyEncryption.ts
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { getDatabase, ref, get, query as rtdbQuery, limitToLast, orderByChild } from 'firebase/database';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const rtdb = getDatabase(app);

interface EncryptedField {
    c: string; // ciphertext
    n: string; // nonce
    v: number; // version
}

function isEncrypted(value: any): boolean {
    return (
        typeof value === 'object' &&
        value !== null &&
        'c' in value &&
        'n' in value &&
        'v' in value
    );
}

function analyzeField(fieldName: string, value: any): string {
    if (value === null || value === undefined) {
        return `${fieldName}: (empty)`;
    }
    if (isEncrypted(value)) {
        return `${fieldName}: ✅ ENCRYPTED (v${value.v})`;
    }
    if (typeof value === 'string') {
        const preview = value.length > 50 ? value.substring(0, 47) + '...' : value;
        return `${fieldName}: ❌ PLAIN TEXT: "${preview}"`;
    }
    if (Array.isArray(value)) {
        const encryptedCount = value.filter(item =>
            typeof item === 'object' && item !== null && 'answer' in item && isEncrypted(item.answer)
        ).length;
        const plainCount = value.filter(item =>
            typeof item === 'object' && item !== null && 'answer' in item && !isEncrypted(item.answer)
        ).length;
        return `${fieldName}: Array with ${encryptedCount} encrypted, ${plainCount} plain text items`;
    }
    return `${fieldName}: (${typeof value})`;
}

async function checkDreams(userId: string) {
    console.log('\n📋 CHECKING DREAMS...\n');

    const dreamsRef = collection(db, 'bucketItems');
    const q = query(
        dreamsRef,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(5)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        console.log('No dreams found for this user.');
        return;
    }

    snapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`\nDream: ${data.title || '(untitled)'}`);
        console.log(`  ID: ${doc.id}`);
        console.log(`  Created: ${new Date(data.createdAt?.seconds * 1000).toLocaleString()}`);
        console.log(`  Public: ${data.isPublic === true ? 'Yes' : 'No'}`);
        console.log(`  Encryption Version: ${data.encryptionVersion || 'None'}`);

        if (data.isPublic !== true) {
            // Check sensitive fields that should be encrypted
            if (data.reflections && data.reflections.length > 0) {
                console.log(`  ${analyzeField('reflections[0].answer', data.reflections[0].answer)}`);
            }
            if (data.memories && data.memories.length > 0) {
                console.log(`  ${analyzeField('memories[0].content', data.memories[0].content)}`);
            }
            if (data.expenses && data.expenses.length > 0) {
                console.log(`  ${analyzeField('expenses[0].amount', data.expenses[0].amount)}`);
            }
            if (data.progress && data.progress.length > 0) {
                console.log(`  ${analyzeField('progress[0].note', data.progress[0].note)}`);
            }
            if (data.location) {
                console.log(`  ${analyzeField('location', data.location)}`);
            }
            if (data.budget) {
                console.log(`  ${analyzeField('budget', data.budget)}`);
            }
        } else {
            console.log('  (Public dream - should be plain text)');
        }
    });
}

async function checkMessages(chatId: string) {
    console.log('\n💬 CHECKING MESSAGES...\n');

    const messagesRef = ref(rtdb, `messages/${chatId}`);
    const q = rtdbQuery(messagesRef, orderByChild('createdAt'), limitToLast(5));

    const snapshot = await get(q);

    if (!snapshot.exists()) {
        console.log('No messages found for this chat.');
        return;
    }

    const messages = snapshot.val();
    const messageArray = Object.entries(messages).map(([id, data]: [string, any]) => ({
        id,
        ...data,
    }));

    // Sort by createdAt descending
    messageArray.sort((a, b) => b.createdAt - a.createdAt);

    messageArray.forEach((msg: any) => {
        console.log(`\nMessage ID: ${msg.id}`);
        console.log(`  Sender: ${msg.senderId}`);
        console.log(`  Created: ${new Date(msg.createdAt).toLocaleString()}`);
        console.log(`  Encrypted: ${msg.encrypted === true ? 'Yes' : 'No'}`);

        if (msg.encrypted === true) {
            console.log(`  ✅ ENCRYPTED`);
            console.log(`  Ciphertext: ${msg.ciphertext?.substring(0, 40)}...`);
            console.log(`  Nonce: ${msg.nonce?.substring(0, 40)}...`);
        } else {
            const preview = msg.text?.length > 50 ? msg.text.substring(0, 47) + '...' : msg.text;
            console.log(`  ❌ PLAIN TEXT: "${preview}"`);
        }
    });
}

async function checkUserProfile(userId: string) {
    console.log('\n👤 CHECKING USER PROFILE...\n');

    const userDoc = await getDocs(query(collection(db, 'users'), where('__name__', '==', userId), limit(1)));

    if (userDoc.empty) {
        console.log('User profile not found.');
        return;
    }

    const data = userDoc.docs[0].data();
    console.log(`User: ${data.displayName || '(unnamed)'}`);
    console.log(`  ID: ${userId}`);
    console.log(`  ${analyzeField('email', data.email)}`);
    console.log(`  ${analyzeField('bio', data.bio)}`);

    if (data.keyData) {
        console.log(`  ✅ Key Data Published: Yes`);
        console.log(`    Public Key: ${data.keyData.publicKey?.substring(0, 40)}...`);
        console.log(`    Salt: ${data.keyData.salt ? 'Present' : 'Missing'}`);
        console.log(`    Key Version: ${data.keyData.version}`);
    } else {
        console.log(`  ❌ Key Data Published: No`);
    }
}

async function main() {
    console.log('🔍 DreamSync Encryption Verification\n');
    console.log('This script checks if your data is being encrypted correctly.\n');

    // You need to provide your user ID
    const userId = process.argv[2];
    const chatId = process.argv[3];

    if (!userId) {
        console.error('❌ Error: User ID required');
        console.log('\nUsage:');
        console.log('  npx ts-node scripts/verifyEncryption.ts <userId> [chatId]');
        console.log('\nExample:');
        console.log('  npx ts-node scripts/verifyEncryption.ts abc123 chat-xyz');
        process.exit(1);
    }

    try {
        await checkUserProfile(userId);
        await checkDreams(userId);

        if (chatId) {
            await checkMessages(chatId);
        } else {
            console.log('\n💬 MESSAGES: Skipped (no chatId provided)');
            console.log('   To check messages, run: npx ts-node scripts/verifyEncryption.ts <userId> <chatId>');
        }

        console.log('\n\n✅ Verification Complete\n');
        console.log('Expected Behavior:');
        console.log('  - User profile: Email/bio should be ENCRYPTED ✅');
        console.log('  - Private dreams: Reflections/memories/expenses should be ENCRYPTED ✅');
        console.log('  - New messages: Should be ENCRYPTED ✅');
        console.log('  - Old messages (before keys): May be PLAIN TEXT (expected)');
        console.log('  - Public dreams: Always PLAIN TEXT (by design)');

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }

    process.exit(0);
}

main();
