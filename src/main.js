/*!

 =========================================================
 * Vue Light Bootstrap Dashboard - v2.0.0 (Bootstrap 4)
 =========================================================

 * Product Page: http://www.creative-tim.com/product/light-bootstrap-dashboard
 * Copyright 2019 Creative Tim (http://www.creative-tim.com)
 * Licensed under MIT (https://github.com/creativetimofficial/light-bootstrap-dashboard/blob/master/LICENSE.md)

 =========================================================

 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 */
import Vue from 'vue'
import VueRouter from 'vue-router'
import VueMoment from 'vue-moment'
import firebase from 'firebase'
import { BootstrapVue } from 'bootstrap-vue'

import App from './App.vue'
import store from "./store"
import { auth } from "./firebase"


// LightBootstrap plugin
import LightBootstrap from './light-bootstrap-main'

// Font Awesome
import '@fortawesome/fontawesome-free/css/all.css'
import '@fortawesome/fontawesome-free/js/all.js'

// router setup
import routes from './routes/routes'

import './registerServiceWorker'
// plugin setup
Vue.use(VueRouter)
Vue.use(BootstrapVue)
Vue.use(LightBootstrap)
Vue.use(VueMoment);

// configure router
const router = new VueRouter({
  routes, // short for routes: routes
  linkActiveClass: 'nav-item active',
  //mode: 'history', // get rid of the hasbang
  scrollBehavior: (to) => {
    if (to.hash) {
      return {selector: to.hash}
    } else {
      return { x: 0, y: 0 }
    }
  }
});

router.beforeEach((to, from, next) => {
    if (to.matched.some(record => record.meta.auth)) {
      firebase.auth().onAuthStateChanged(user => {
        if (user) {
          next()
        } else {
          next({
            path: "/login",
          })
        }
      })
    }
    else if (to.matched.some(record => record.meta.guest)) {
      firebase.auth().onAuthStateChanged(user => {
        if (user) {
          next({
            path: "/admin",
          })
        } else {
          next()
        }
      })
    }
    else {
      next()
    }
  });

// // Initialize firebase
// const firebaseConfig = {
//     apiKey: "AIzaSyDnR_JLW2aE1lhpF9SJZJiiCNz-HqA5_N4",
//     authDomain: "ispeech-brendan.firebaseapp.com",
//     databaseURL: "https://ispeech-brendan.firebaseio.com",
//     projectId: "ispeech-brendan",
//     storageBucket: "ispeech-brendan.appspot.com",
//     messagingSenderId: "849833613553",
//     appId: "1:849833613553:web:3c0e20b5b9fb744f987150",
//     measurementId: "G-0FZMHE3JSG"
// };
// firebase.initializeApp(firebaseConfig);

// // Firestore collections
// const db = firebase.firestore();
// const speechSessionsCollection = db.collection('speechSessions')

// // Firebase auth
// firebase.auth().onAuthStateChanged(user => {
//   store.dispatch("fetchUser", user);
// });

/* eslint-disable no-new */
new Vue({
  el: '#app',
  store,
  render: h => h(App),
  router
})
