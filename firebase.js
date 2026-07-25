// Firebase v11

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";

import {
    getFirestore,
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {

    apiKey: "TU_API_KEY",

    authDomain: "TU_PROYECTO.firebaseapp.com",

    projectId: "TU_PROYECTO",

    storageBucket: "TU_PROYECTO.firebasestorage.app",

    messagingSenderId: "000000000000",

    appId: "1:000000000000:web:XXXXXXXX"

};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

export {

    db,

    collection,
    doc,
    getDoc,
    getDocs,

    addDoc,
    setDoc,
    updateDoc,
    deleteDoc,

    onSnapshot,

    serverTimestamp

};