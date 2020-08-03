import Vue from "vue";
import Vuex from "vuex";
import { childrenCollection, speechSessionsCollection } from "./firebase"

Vue.use(Vuex);

speechSessionsCollection.orderBy('createdOn', 'desc').onSnapshot(snapshot => {
 	Promise.all(snapshot.docs.map(doc => {
    	let session = doc.data()
   		session.id = doc.id
      return speechSessionsCollection.doc(doc.id).collection('annotations').get().then(annotationSnapshot => {
              var annotations = {}
              annotationSnapshot.forEach(annotationDoc => {
                  var annotationData = annotationDoc.data()
                  if(annotationData.starred) {
                    store.commit('setChildQuotes', annotationData.transcript)
                  }
                  
                  annotations[annotationData.annotationId] = annotationData
              });
              session.annotations = annotations;
              return session;
      })
    
  	})).then(sessions => {
        store.commit('setSpeechSessions', sessions)

    });
})


childrenCollection.onSnapshot(snapshot => {
  console.log('loading children')
  Promise.all(snapshot.docs.map(doc => {
    console.log('CHILD')
    console.log(doc.data())
      let child = doc.data()
      child.id = doc.id
      child.quotes = []
      return child
    
    })).then(children => {
        store.commit('setChildren', children)

    });
})

const store = new Vuex.Store({
  state: {
    children: [],
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
    setChildren(state, value) {
      state.children = value;
    },
  	setSpeechSessions(state, value) {
  		state.speechSessions = value;
  	},
    setChildQuotes(state, value) {
        state.children = state.children.map(child=>{
            if(value) child.quotes.push(value)
            
            return child
        })
    },
    setAnnotation(state, value) {
        state.speechSessions = state.speechSessions.map(session=>{
            if (session.sessionId == value.sessionId) {
                let annotations = session.annotations || {}

                if (annotations[value.annotation.annotationId]) {
                    annotations[value.annotation.annotationId] = value.annotation
                }
                else {
                    annotations.push(value.annotation)
                }
                session.annotations = annotations
            }
            return session
        })

        // state.children = state.children.map(child=>{
        //     child.quotes.push(value.annotation.transcript)
        //     return child
        // })
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
    async updateAnnotation({state, commit}, data) {
      await speechSessionsCollection
              .where("sessionId", "==", data.sessionId)
              .get()
              .then(docs => {
                console.log('got doc');
                console.log(docs)
                docs.forEach(doc=> {
                  var annotationsCollections = speechSessionsCollection.doc(doc.id).collection('annotations');

                  annotationsCollections.where("annotationId", "==", data.annotation.annotationId).get().then((annotationDocs) => {
                      console.log(annotationDocs);
                      if (annotationDocs.empty) { // Create a new annotation
                        annotationsCollections.add(data.annotation).then(()=>store.commit('setAnnotation', data))
                      }
                      else {
                        annotationDocs.forEach(annotationDoc=> { // Update an annotation
                            annotationDoc.ref.update(data.annotation).then(()=>store.commit('setAnnotation', data))
                        })
                      }
                  })
                })
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
    },
  }
});


export default store