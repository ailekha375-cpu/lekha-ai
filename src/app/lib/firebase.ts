// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
//import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBRictbZ5hrzblJaj2VqUf7Ry0VH6uOonA",
  authDomain: "lekha-5d006.firebaseapp.com",
  projectId: "lekha-5d006",
  storageBucket: "lekha-5d006.firebasestorage.app",
  messagingSenderId: "87248550877",
  appId: "1:87248550877:web:ae675e353d8d93be6bd434",
  measurementId: "G-Q8EHSHMP03"
};

// Initialize Firebase
// const app = initializeApp(firebaseConfig);
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
//const analytics = getAnalytics(app);

export const auth = getAuth(app);