import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  serverTimestamp,
  doc,
  getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection() {
  try {
    // Only wait 3 seconds for connection test
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    
    await getDocFromServer(doc(db, 'test', 'connection'));
    clearTimeout(timeout);
  } catch (error) {
    // Silently continue if connection test fails or times out
    console.warn("Connection test skipped or timed out");
  }
}

export async function initAuth(): Promise<User | null> {
  return new Promise((resolve) => {
    // Set a timeout for auth initialization to prevent blocking
    const timeout = setTimeout(() => {
      console.warn("Auth initialization timed out");
      resolve(null);
    }, 5000);

    onAuthStateChanged(auth, async (user) => {
      clearTimeout(timeout);
      if (user) {
        resolve(user);
      } else {
        try {
          const cred = await signInAnonymously(auth);
          resolve(cred.user);
        } catch (error: any) {
          if (error.code === 'auth/admin-restricted-operation') {
             console.warn("Anonymous auth disabled in console. Progress will not be saved.");
          } else {
             console.error("Auth failed:", error.message);
          }
          resolve(null);
        }
      }
    });
  });
}

export interface ScoreEntry {
  id?: string;
  playerName: string;
  score: number;
  level: number;
  createdAt: any;
  userId: string;
}

export async function submitScore(entry: Omit<ScoreEntry, 'createdAt' | 'id'>) {
  const path = 'leaderboard';
  try {
    await addDoc(collection(db, path), {
      ...entry,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeToLeaderboard(callback: (scores: ScoreEntry[]) => void) {
  const path = 'leaderboard';
  const q = query(
    collection(db, path),
    orderBy('score', 'desc'),
    limit(10)
  );

  return onSnapshot(q, (snapshot) => {
    const scores = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ScoreEntry[];
    callback(scores);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
}
