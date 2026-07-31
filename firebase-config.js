const firebaseConfig = {
    apiKey: "AIzaSyBepxuzaf56wyH_Mxaz9ZRr8Pn-qKAd2ks",
    authDomain: "vibe-messenger-6a05c.firebaseapp.com",
    projectId: "vibe-messenger-6a05c",
    storageBucket: "vibe-messenger-6a05c.firebasestorage.app",
    messagingSenderId: "623283246823",
    appId: "1:623283246823:web:475f2bc68ee1193828f442",
    measurementId: "G-702RZ4CKNZ"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();
