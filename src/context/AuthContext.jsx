import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  browserSessionPersistence,
  onAuthStateChanged,
  signInAnonymously,
  signOut,
  setPersistence,
  updateProfile
} from 'firebase/auth';
import { auth, firebaseConfigured, friendlyFirebaseError } from '../services/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // This is deliberately memory-only: each new app load starts at the check-in screen.
  const [sessionRole, setSessionRole] = useState(null);

  useEffect(() => {
    if (!firebaseConfigured) {
      setLoading(false);
      return undefined;
    }

    return onAuthStateChanged(auth, (currentUser) => {
      // When somebody new checks in on a shared device, Firebase emits a
      // sign-out event for the previous anonymous account followed by the new
      // account. Ignore a late, stale event so it cannot clear the new session
      // and bounce the app to the other role's route.
      if (currentUser?.uid !== auth.currentUser?.uid) return;
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
      // A name is a check-in for this browser session, not a permanent app
      // profile saved on the device or in Firestore.
      await setPersistence(auth, browserSessionPersistence);
      const currentUser = auth.currentUser;
      const isSamePerson = currentUser?.displayName?.toLocaleLowerCase() === cleanedName.toLocaleLowerCase();

      // A returning person on their own phone keeps the same anonymous Firebase ID.
      if (isSamePerson) {
        await updateProfile(currentUser, { displayName: cleanedName });
        setUser(currentUser);
        return currentUser;
      }

      if (currentUser) await signOut(auth);
      const credential = await signInAnonymously(auth);
      await updateProfile(credential.user, { displayName: cleanedName });
      setUser(credential.user);
      return credential.user;
    } catch (error) {
      throw new Error(friendlyFirebaseError(error));
    }
  }

  function beginSession(role) {
    setSessionRole(role === 'cook' ? 'cook' : 'voter');
  }

  async function logout() {
    if (firebaseConfigured) {
      await signOut(auth);
    }
    setSessionRole(null);
  }

  const value = useMemo(
    () => ({
      user,
      loading,
      loginWithName,
      logout,
      firebaseConfigured,
      sessionRole,
      hasCheckedIn: sessionRole !== null,
      beginSession
    }),
    [user, loading, sessionRole]
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
