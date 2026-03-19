import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { StorageService } from '@/service/storage/storage-service';

const firebaseConfig = {
	apiKey: 'AIzaSyD7X36A-L49OoyQ4vlgHXIL3v4o0in3aNw',
	authDomain: 'forgesteel-db477.web.app',
	projectId: 'forgesteel-db477',
	storageBucket: 'forgesteel-db477.firebasestorage.app',
	messagingSenderId: '891967573630',
	appId: '1:891967573630:web:754d48a475f57dc074122f'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

let signInPromiseResolve: (() => void) | null = null;

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

		// User not signed in — wait for them to click the sign-in button
		// The DataLoader UI will show the button, which calls FirebaseService.signIn()
		return new Promise<boolean>((resolve) => {
			signInPromiseResolve = () => resolve(true);
			// If sign-in doesn't happen within 1ms, return false to let the loader show UI
			setTimeout(() => {
				if (!this.user) {
					resolve(false);
				}
			}, 1);
		});
	}

	static async signIn(): Promise<boolean> {
		try {
			const result = await signInWithPopup(auth, provider);
			if (result.user && signInPromiseResolve) {
				signInPromiseResolve();
				signInPromiseResolve = null;
			}
			return true;
		} catch (error) {
			console.error('Firebase sign-in failed:', error);
			return false;
		}
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

	static isSignedIn(): boolean {
		return auth.currentUser !== null;
	}

	getUser(): User | null {
		return this.user;
	}

	async signOut(): Promise<void> {
		await auth.signOut();
		this.user = null;
	}
}
