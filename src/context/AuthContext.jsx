import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged,
  signInAnonymously,
  signOut,
  updateProfile
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, firebaseConfigured, friendlyFirebaseError } from '../services/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseConfigured) {
      setLoading(false);
      return undefined;
    }

    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
  }, []);

  async function loginWithName(name) {
    if (!firebaseConfigured) {
      throw new Error('Firebase is not configured yet. Add your VITE_FIREBASE values to .env.');
    }
    const cleanedName = name.trim();
    if (!cleanedName) throw new Error('Enter your name first.');
    try {
      if (auth.currentUser) await signOut(auth);
      const credential = await signInAnonymously(auth);
      await updateProfile(credential.user, { displayName: cleanedName });
      await setDoc(doc(db, 'users', credential.user.uid), {
        userId: credential.user.uid,
        name: cleanedName,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      throw new Error(friendlyFirebaseError(error));
    }
  }

  async function logout() {
    if (firebaseConfigured) {
      await signOut(auth);
    }
  }

  const value = useMemo(
    () => ({ user, loading, loginWithName, logout, firebaseConfigured }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
