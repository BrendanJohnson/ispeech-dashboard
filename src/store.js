import Vue from "vue";
import Vuex from "vuex";
import { speechSessionsCollection } from "./firebase"

Vue.use(Vuex);

speechSessionsCollection.orderBy('createdOn', 'desc').onSnapshot(snapshot => {
	console.log('running')

 	let sessions = []

 	snapshot.forEach(doc => {
 		console.log('document')
    	let session = doc.data()
   		session.id = doc.id
   		session.comments = doc.comments
   		session.sessionId = doc.sessionId

    	sessions.push(session)
  	})

	console.log(sessions)
  	store.commit('setSpeechSessions', sessions)
})

const store = new Vuex.Store({
  state: {
    user: {
      loggedIn: false,
      data: null
    },
    speechSessions: []
  },
  getters: {
    user(state){
      return state.user
    }
  },
  mutations: {
  	setSpeechSessions(state, value) {
  		state.speechSessions = value;
  	},
    SET_LOGGED_IN(state, value) {
      state.user.loggedIn = value;
    },
    SET_USER(state, data) {
      state.user.data = data;
    }
  },
  actions: {
  	async createSpeechSession({state, commit}, session) {
  		await speechSessionsCollection.add({
  			sessionId: 3,
  			comments: "",
  			createdOn: new Date()
  		})
  	},
    fetchUser({ commit }, user) {
      commit("SET_LOGGED_IN", user !== null);
      if (user) {
        commit("SET_USER", {
          displayName: user.displayName,
          email: user.email
        });
      } else {
        commit("SET_USER", null);
      }
    }
  }
});


export default store