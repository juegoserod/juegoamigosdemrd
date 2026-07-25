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

    apiKey: "AIzaSyDBqRMHBqMGZyjfbYV_eVp1eYVjLgs0EXU",

    authDomain: "amigosdemrd.firebaseapp.com",

    projectId: "amigosdemrd",

    storageBucket: "amigosdemrd.firebasestorage.app",

    messagingSenderId: "270375257685",

    appId: "1:270375257685:web:227717ba7f88bcd19676dc"

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