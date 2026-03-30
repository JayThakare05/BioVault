import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Your web app's Firebase configuration from user
const firebaseConfig = {
  apiKey: "AIzaSyA05elWH5jAUsPbQWZ1P13wBi1bpeA5otQ",
  authDomain: "biovault-8ee36.firebaseapp.com",
  projectId: "biovault-8ee36",
  storageBucket: "biovault-8ee36.firebasestorage.app",
  messagingSenderId: "409001231543",
  appId: "1:409001231543:web:dd25a9a29f4ebbf40db932"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
