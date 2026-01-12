// Firebase Configuration
// BU BİLGİLERİ KENDİ PROJENİZDEN ALACAKSINIZ
const firebaseConfig = {
    apiKey: "AIzaSyAfKwl9PR10NaZ-7NPIIwNcFWeAxGAqseU",
    authDomain: "gardiropapp.firebaseapp.com",
    projectId: "gardiropapp",
    storageBucket: "gardiropapp.firebasestorage.app",
    messagingSenderId: "581699180228",
    appId: "1:581699180228:web:904dda7a7d1a7bd3b29b91"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();
