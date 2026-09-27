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
  // This is deliberately memory-only: each new app load starts at the check-in screen.
  const [sessionRole, setSessionRole] = useState(null);

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

  async function saveProfile(currentUser, name) {
    await setDoc(doc(db, 'users', currentUser.uid), {
      userId: currentUser.uid,
      name,
      lastSeenAt: serverTimestamp()
    }, { merge: true });
  }

  async function loginWithName(name) {
    if (!firebaseConfigured) {
      throw new Error('Firebase is not configured yet. Add your VITE_FIREBASE values to .env.');
    }
    const cleanedName = name.trim();
    if (!cleanedName) throw new Error('Enter your name first.');
    try {
      const currentUser = auth.currentUser;
      const isSamePerson = currentUser?.displayName?.toLocaleLowerCase() === cleanedName.toLocaleLowerCase();

      // A returning person on their own phone keeps the same anonymous Firebase ID.
      if (isSamePerson) {
        await updateProfile(currentUser, { displayName: cleanedName });
        await saveProfile(currentUser, cleanedName);
        setUser(currentUser);
        return currentUser;
      }

      if (currentUser) await signOut(auth);
      const credential = await signInAnonymously(auth);
      await updateProfile(credential.user, { displayName: cleanedName });
      await saveProfile(credential.user, cleanedName);
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
