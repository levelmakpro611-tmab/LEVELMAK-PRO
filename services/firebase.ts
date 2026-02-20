import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAGPRbt02kBE3WeRZLCJvxZa6xZO7tql94",
    authDomain: "levelmak-ab554.firebaseapp.com",
    projectId: "levelmak-ab554",
    storageBucket: "levelmak-ab554.firebasestorage.app",
    messagingSenderId: "1092880599405",
    appId: "1:1092880599405:web:644c21faae23be7879f264"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
