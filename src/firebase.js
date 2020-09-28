import * as firebase from 'firebase/app'
import 'firebase/firestore'
import store from "./store"

// Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyDnR_JLW2aE1lhpF9SJZJiiCNz-HqA5_N4",
    authDomain: "ispeech-brendan.firebaseapp.com",
    databaseURL: "https://ispeech-brendan.firebaseio.com",
    projectId: "ispeech-brendan",
    storageBucket: "ispeech-brendan.appspot.com",
    messagingSenderId: "849833613553",
    appId: "1:849833613553:web:3c0e20b5b9fb744f987150",
    measurementId: "G-0FZMHE3JSG"
};

// Initalize Firebase
firebase.initializeApp(firebaseConfig);
// Firestore collections
const db = firebase.firestore();
const childrenCollection = db.collection('children')
const speechSessionsCollection = db.collection('speech_sessions')
const annotationsCollection = db.collectionGroup('annotations')
const countsCollection = db.collectionGroup('counts')


// Firebase auth
const auth = firebase.auth().onAuthStateChanged(user => {
  store.dispatch("fetchUser", user);
});

export {
	auth,
	db,
    annotationsCollection,
    childrenCollection,
    countsCollection,
	speechSessionsCollection
}