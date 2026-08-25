// services/firebaseConfig.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
const firebaseConfig = {
  apiKey: "x",
  authDomain: "x",
  projectId: "x",
  storageBucket: "x",
  messagingSenderId: "x",
  appId: "x",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
