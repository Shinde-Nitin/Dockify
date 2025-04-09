// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCIWkoUK-_FIOrx1FV87i7aumd28saMQVk",
    authDomain: "quickcart-8f9e5.firebaseapp.com",
    databaseURL: "https://quickcart-8f9e5-default-rtdb.firebaseio.com",
    projectId: "quickcart-8f9e5",
    storageBucket: "quickcart-8f9e5.appspot.com",
    messagingSenderId: "1057384276199",
    appId: "1:1057384276199:web:a220fa6a3105e844000242",
    measurementId: "G-PX1RHRMYY4"
  };

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = firebase.auth();
const database = firebase.database();
const storage = firebase.storage(); 