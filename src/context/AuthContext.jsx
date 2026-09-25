import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
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

  async function login(email, password) {
    if (!firebaseConfigured) {
      throw new Error('Firebase is not configured yet. Add your VITE_FIREBASE values to .env.');
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      throw new Error(friendlyFirebaseError(error));
    }
  }

  async function register(name, email, password) {
    if (!firebaseConfigured) {
      throw new Error('Firebase is not configured yet. Add your VITE_FIREBASE values to .env.');
    }
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(credential.user, { displayName: name });
      await setDoc(doc(db, 'users', credential.user.uid), {
        userId: credential.user.uid,
        name,
        email,
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
    () => ({ user, loading, login, register, logout, firebaseConfigured }),
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
