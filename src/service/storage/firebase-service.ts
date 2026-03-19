import { initializeApp } from 'firebase/app';
import { getAuth, signInWithRedirect, getRedirectResult, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { StorageService } from '@/service/storage/storage-service';

const firebaseConfig = {
	apiKey: 'AIzaSyD7X36A-L49OoyQ4vlgHXIL3v4o0in3aNw',
	authDomain: 'forgesteel-db477.firebaseapp.com',
	projectId: 'forgesteel-db477',
	storageBucket: 'forgesteel-db477.firebasestorage.app',
	messagingSenderId: '891967573630',
	appId: '1:891967573630:web:754d48a475f57dc074122f'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

export class FirebaseService implements StorageService {
	private user: User | null = null;
	private authReady: Promise<void>;

	constructor() {
		this.authReady = new Promise<void>((resolve) => {
			onAuthStateChanged(auth, (user) => {
				this.user = user;
				resolve();
			});
		});
	}

	async initialize(): Promise<boolean> {
		await this.authReady;
		if (this.user) return true;

		try {
			const result = await getRedirectResult(auth);
			if (result) {
				this.user = result.user;
				return true;
			}
		} catch (error) {
			console.error('Firebase redirect result failed:', error);
		}

		// Only redirect if we haven't already tried this session
		const redirectKey = 'firebase-redirect-pending';
		if (sessionStorage.getItem(redirectKey)) {
			// We already tried redirecting and came back without auth
			// Don't loop — fall back to local storage
			sessionStorage.removeItem(redirectKey);
			console.warn('Firebase auth redirect failed, falling back to local storage');
			return false;
		}

		sessionStorage.setItem(redirectKey, 'true');
		await signInWithRedirect(auth, provider);
		return false;
	}

	async get<T>(key: string): Promise<T | null> {
		if (!this.user) return null;

		try {
			const docRef = doc(db, 'users', this.user.uid, 'data', key);
			const docSnap = await getDoc(docRef);
			if (docSnap.exists()) {
				return docSnap.data().value as T;
			}
			return null;
		} catch (error) {
			console.error('Firebase get failed:', error);
			return null;
		}
	}

	async put<T>(key: string, value: T): Promise<T> {
		if (!this.user) throw new Error('Not authenticated');

		try {
			const docRef = doc(db, 'users', this.user.uid, 'data', key);
			await setDoc(docRef, { value, updatedAt: new Date().toISOString() });
			return value;
		} catch (error) {
			console.error('Firebase put failed:', error);
			throw error;
		}
	}

	static getAuth() {
		return auth;
	}

	getUser(): User | null {
		return this.user;
	}

	async signOut(): Promise<void> {
		await auth.signOut();
		this.user = null;
	}
}