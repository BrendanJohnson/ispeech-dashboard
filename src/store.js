import Vue from "vue";
import Vuex from "vuex";
import moment from 'moment'
import { childrenCollection, childFeaturesCollection, countsCollection, currentUser, speechSessionsCollection, teachersCollection, teacherFeaturesCollection, usersCollection, annotationsCollection } from "./firebase"

Vue.use(Vuex);

const languageLabels = {  'yue-Hant-HK': 'Cantonese',
                          'zh-TW': 'Mandarin',
                          'en-GB': 'English' };

const syntaxColors = { 'VERB': 'red' ,
                       'ADV': 'orange',
                       'ADP': 'orange',
                       'PRON': '#1DCAE84D',
                       'NOUN': '#1D62F0',
                       'ADJ': 'green',
                       'PUNCT': '#663300',
                       'NUM': '#9966ff',
                       'DEFAULT': '#1D62F0' };

const syntaxLabels = { 'VERB': 'Verb' ,
                       'ADV': 'Adverb',
                       'ADP': 'Adposition',
                       'PRON': 'Pronoun',
                       'NOUN': 'Noun',
                       'ADJ': 'Adjective',
                       'PUNCT': 'Punctuation',
                       'NUM': 'Number' };

const addNewUserToFirestore = (user) => {
  return usersCollection.doc(currentUser.uid).set(user);
}

const annotationNlpMapper = (annotation, nlp) => {
  const tagMap = new Map();
  const tagCounts = {};
  if (nlp && nlp.syntax.tokens) {
    nlp.syntax.tokens.forEach(item => {
         const key = item.partOfSpeech.tag
         const collection = tagMap.get(key);
         if (!collection) {
             tagMap.set(key, [item]);
         } else {
             collection.push(item);
         }
    });
    for (const [key, value] of tagMap.entries()) {
      if(tagCounts[key]) tagCounts[key] = tagCounts[key] + value.length;
      else tagCounts[key] = value.length;    
    }
  }

  return Object.assign({}, annotation, {
      syntaxValues: nlp ? nlp.syntax.tokens.map((token, index) => {
            let skipAhead = token.dependencyEdge.headTokenIndex - index;
            return {
              val: 20,
              color: syntaxColors[token.partOfSpeech.tag] || syntaxColors['DEFAULT'],
              person: (token.partOfSpeech.person.indexOf('UNKNOWN') > -1) ? ' ' : token.partOfSpeech.person.toLowerCase() + ' p.',
              label: token.lemma, skip: skipAhead,
              tag: token.partOfSpeech.tag,
              edgeLabel: token.dependencyEdge.label
            }
      }) : null,
      sentiment: (nlp && nlp.sentiment) ? nlp.sentiment.score : null,
      tagCounts: tagCounts
  })
}

const onSpeechSnapshot= snapshot => {
  store.commit('setPagination', { next: snapshot.docs[snapshot.docs.length - 1],
                                  previous: snapshot.docs[0] })
  Promise.all(snapshot.docs.map(doc => {
      let session = doc.data()
      session.id = doc.id
      return speechSessionsCollection.doc(doc.id).collection('annotations').get().then(annotationSnapshot => {
              var annotations = {}
              var adultSpeechDuration = 0
              var childSpeechDuration = 0
              var adultNoOfTurns = 0
              var childNoOfTurns = 0
              var adultTranscriptWords = 0
              var childTranscriptWords = 0
              var tagTotals = {};

              annotationSnapshot.forEach(annotationDoc => {
                  let annotationData = annotationNlpMapper(annotationDoc.data(), annotationDoc.data().nlp);
                  if ((annotationData.speaker == 'child') && annotationData.duration) {
                    childSpeechDuration += annotationData.duration
                    childTranscriptWords += annotationData.transcript.length
                    childNoOfTurns++
                  }
                  if ((annotationData.speaker == 'adult') && annotationData.duration) {
                    adultSpeechDuration += annotationData.duration;
                    adultTranscriptWords += annotationData.transcript ? annotationData.transcript.length : 0;
                    adultNoOfTurns++
                  }
                  if (annotationData.tagCounts) {
                    for (let [key, value] of Object.entries(annotationData.tagCounts)) { 
                        if (tagTotals[key]) { //(4)
                          tagTotals[key] += value; //(5)
                        } else { //(6)
                          tagTotals[key] = value;
                        }
                    }
                  }
                  annotations[annotationData.annotationId] = annotationData
              });

              session.adultSpeechDuration = adultSpeechDuration
              session.adultNoOfTurns = adultNoOfTurns
              session.adultTranscriptWords = adultTranscriptWords
              session.childSpeechDuration = childSpeechDuration
              session.childNoOfTurns = childNoOfTurns
              session.childTranscriptWords = childTranscriptWords
              session.tagTotals = tagTotals
              session.tagTotalLabels = Object.keys(tagTotals).map((x)=>{return syntaxLabels[x] || 'Unknown' });
              session.tagTotalCounts = Object.values(tagTotals);
              session.tagColors = Object.keys(tagTotals).map((x)=>{ return syntaxColors[x] }) 
              session.totalSpeechDuration = adultSpeechDuration + childSpeechDuration
              session.totalNoOfTurns = adultNoOfTurns + childNoOfTurns
              session.totalTranscriptWords = adultTranscriptWords + childTranscriptWords
              session.annotations = annotations
              session.loaded = false;
              return session;
      })
    })).then(sessions => {
      childrenCollection.onSnapshot(snapshot => {
        Promise.all(snapshot.docs.map(doc => {
            let child = doc.data()
            child.quotes = []
            return child
          })).then(children => {
            sessions = sessions.map(session=>{
                session.child = children.filter(child=>{
                  return child.id == session.childId;
                })[0];
                return session;
            }).filter(session=>{
                return !session.deleted;
            })
            store.commit('setSpeechSessions', sessions)
          });
      })
    });
}

countsCollection.where("type", "==", "speechSession").onSnapshot(snapshot => {
  snapshot.docs.forEach(function (doc) {
      const countsData = doc.data();
      store.commit('setCounts', 104)    
   });
})

const store = new Vuex.Store({
  state: {
    children: [],
    currentChild: null,
    lastVisible: null,
    teachers: [],
    user: {
      loggedIn: false,
      data: null
    },
    speechSessionPagination: { currentPage: 1, next: null, previous: null, limit: 5, total: 0 },
    speechSession: null,
    speechSessions: []
  },
  getters: {
    getPagination: (state) => {
      return state.speechSessionPagination
    },
    getSpeechSessionsPaginated: (state) => {
      return state.speechSessions
    },
    getStatistics: (state) => {
      if (!state.speechSessions.length) {
        return {
          languages: 0,
          languageComposition: [],
          noOfSessions: 0,
          speechSessions: [],
          totals: {}
        }
      }
      let languageMap = state.speechSessions.reduce((entryMap, e) => entryMap.set(e.language, [...entryMap.get(e.language)||[], e]),
            new Map()
      );
      let adultChildData = state.speechSessions.map(session => ({
            childSpeechPercentage: Math.abs((session.childSpeechDuration / session.totalSpeechDuration) * 100) || 0,
            childTurnsPercentage: Math.abs((session.childNoOfTurns / session.totalNoOfTurns) * 100) || 0,
            date: session.createdOn.toDate()

          })).filter(data => {
          return (data.childSpeechPercentage > 0) && (data.childTurnsPercentage > 0);
      })
      let sessionDates = state.speechSessions.map(session => ({
            adultNoOfTurns: session.adultNoOfTurns,
            childNoOfTurns: session.childNoOfTurns,
            date: session.createdOn.toDate(),
        })).filter(data => { 
          return data.adultNoOfTurns && data.childNoOfTurns
        }).sort((a,b)=>{ return a.date - b.date })
      return {
        languages: Array.from(languageMap.keys()).map((languageCode)=>{
          return languageLabels[languageCode] || 'Unknown'
        }),
        languageComposition: Array.from(languageMap.values()).map((language)=>{
            return language.length
        }),
        noOfSessions: state.speechSessions.length,
        totals: state.speechSessions.reduce((a,b) => {
                  return {
                            childSpeechDuration: a.childSpeechDuration + b.childSpeechDuration,
                            totalTranscriptWords: a.totalTranscriptWords + b.totalTranscriptWords
                          }
                  }),
        adultChildRatio: {
          speechPercentage: adultChildData.map(data=>({ x: data.date, y: data.childSpeechPercentage})),
          turnsPercentage: adultChildData.map(data=>({ x: data.date, y: data.childTurnsPercentage})),
          dates: adultChildData.map(data=>data.date)
        },
        sessionDates: sessionDates.map(data => moment(data.date).format('MMM DD')),
        adultNoOfTurns: sessionDates.map(session => session.adultNoOfTurns),
        childNoOfTurns: state.speechSessions.map(session => session.childNoOfTurns),
        speechSessions: state.speechSessions
      }
    },
    user(state){
      return state.user
    }
  },
  mutations: {
    setChildren(state, value) {
      state.children = value;
    },
    setCurrentChild(state, value) {
      state.currentChild = value;
    },
    setCounts(state, value) {
      state.speechSessionPagination.total = value;
    },
    setSpeechSession(state, value) {
      state.speechSession = value;
    },
  	setSpeechSessions(state, value) {
  		state.speechSessions = value;
  	},
    setTeachers(state, value) {
      state.teachers = value;
    },
    setChildQuotes(state, value) {
        state.children = state.children.map(child=>{
            if(value) child.quotes.push(value)       
            return child
        })
    },
    setChildFeatures(state, { childId, features }) {
        state.children = state.children.map(child=>{
            if ((child.id == childId)) {
               child.features = features;
            }  
            return child
        })
    },
    setAnnotation(state, value) {
        state.speechSessions = state.speechSessions.map(session=>{
            if (session.sessionId == value.sessionId) {
                let annotations = session.annotations || {}
                annotations[value.annotation.annotationId] = value.annotation
                session.annotations = annotations
            }
            return session
        })

        // state.children = state.children.map(child=>{
        //     child.quotes.push(value.annotation.transcript)
        //     return child
        // })
    },
    setPagination(state, value) {
      state.speechSessionPagination = value;
    },
    SET_LOGGED_IN(state, value) {
      state.user.loggedIn = value;
    },
    SET_USER(state, data) {
      state.user.data = data;
    }
  },
  actions: {
    async createSpeakerFeature({state, commit}, { childId, name, language }) {
      await childrenCollection.where("id", "==", childId)
                              .get()
                              .then(docs => {
                                docs.forEach(doc => {
                                  const childFeaturesCollection = childrenCollection.doc(doc.id).collection('child_features');
                                  childFeaturesCollection.add({
                                    name, language
                                  })
                                })
                              })
    },
  	async createSpeechSession({state, commit}, session) {
      const ref = speechSessionsCollection.doc();
      const id = ref.id;
      session.createdOn = new Date();
      session.sessionId = id;
      await countsCollection.where("type", "==", "speechSession").get().then((snapshots)=>{
           snapshots.forEach(function (doc) {
                doc.ref.update({count: 1 }).then(()=>{
                    store.commit('setSessionsCount', 1);
                 })     
           });
      });
  		await speechSessionsCollection.add(session).then(()=> {
        return store.commit('setSpeechSession', session)
      })
  	},
    async createTeacherFeature({state, commit}, { teacherId, name, language }) {
      await teachersCollection.where("id", "==", teacherId)
                              .get()
                              .then(docs => {
                                docs.forEach(doc => {
                                  const teacherFeaturesCollection = teachersCollection.doc(doc.id).collection('teacher_features');
                                  teacherFeaturesCollection.add({
                                    name, language
                                  })
                                })
                              })
    },
    async deleteSpeakerFeature({state, commit},{ name }) {
      await childrenCollection.where("id", "==", state.currentChild.id)
                              .get()
                              .then(docs => {
                                docs.forEach(doc => {
                                  const childFeaturesCollection = childrenCollection.doc(doc.id).collection('child_features');
                                  childFeaturesCollection.where("name", "==", name)
                                                         .get()
                                                         .then(featureDocs=>{
                                                            featureDocs.forEach(featureDoc=>featureDoc.ref.delete())

                                                            commit('setChildFeatures', { childId: state.currentChild.id,
                                                                                         features: state.currentChild.features.filter(feature=>{ return feature.name != name})})
                    
                                                         });
                                })
                              });
    },
    async pruneSpeechSessions({state, commit}, { limit }) {
      console.log('running prune')
        speechSessionsCollection.orderBy('createdOn', 'desc').limit(limit).onSnapshot((snapshot)=>{
          snapshot.docs.map(doc => {
            let session = doc.data()
            if (!session.manifestUrl) {
              console.log('DELETING SESSION')
              console.log(session)
              doc.ref.delete()
            }
            else {
              console.log('KEEP SESSION')
              console.log(session)
              doc.ref.update({ language: 'yue-Hant-HK', childId: session.childId || 2 })

            }

          })
        })

    },
    async loadTeachers({state, commit}) {
        let snapshot = await teachersCollection.get()
        return Promise.all(snapshot.docs.map(doc => {
              let teacher = doc.data()
              if (teacher.hidden) return null;

              return teachersCollection.doc(doc.id).collection('teacher_features').get().then(teacher_features=>{
                  teacher.features = teacher_features.docs.map(feature_doc=>{
                      return feature_doc.data()
                  }).filter(x=>x.name)
                  return teacher
              })     
              return teacher   
              
        }).filter(x=>!!x)).then(teachers => {
                commit('setTeachers', teachers)
        });
    },
    async loadSpeechSessions({state, commit}, options={ limit: 200 }) {
      await(store.dispatch('fetchChildren'))
      const query = speechSessionsCollection.orderBy('createdOn', 'desc').where("childId", "==", state.currentChild.id)

      if (options.search) { 
          annotationsCollection.where("transcript", "==", options.search)
                                .get().then(function (querySnapshot) {
              let docIds = [];
              querySnapshot.forEach(function (doc) {
                  docIds.push(doc.ref.parent.parent.id);
              });

              return docIds.slice(0,9); // Only return 10 docIds max
          }).then(docIds=>{
              if (docIds.length) {
                  speechSessionsCollection.where('__name__', 'in', docIds).onSnapshot(onSpeechSnapshot)
              }
              else {
                store.commit('setSpeechSessions', [])
              }

          })
      }
      else if (options.next) {
        query.startAfter(options.next).limit(options.limit).onSnapshot(onSpeechSnapshot);
      }
      else if (options.previous) {
        query.endBefore(options.previous).limit(options.limit).onSnapshot(onSpeechSnapshot);
      }
      else {
        query.limit(options.limit).onSnapshot(onSpeechSnapshot);
      }
    },
    async addChild({state, commit}, child) {
      let newChild = child || {
        name: 'New Child',
        id: Math.max.apply(Math, state.children.map((x) => { return x.id; })) + 1
      }
      await childrenCollection.add(newChild).then(response=>{
        state.children.push(newChild)
        commit('setChildren', state.children)
      });
    },
    async addTeacher({state, commit}, teacher) {
      let newTeacher = teacher || {
        name: 'New Teacher',
        id: Math.max.apply(Math, state.teachers.map((x) => { return x.id; })) + 1,
        type: 'teacher'
      }
      await teachersCollection.add(newTeacher).then(response=>{
        state.teachers.push(newTeacher)
        commit('setTeachers', state.teachers)
      });
    },
    async setChild({state, commit}, child) {
      let docRef = usersCollection.doc(currentUser.uid);  
      const userDetails = {
        defaultChildId: child.id
      };
      return docRef.get()
            .then(doc => {
              if (doc.exists) {
                return docRef.update(userDetails).then(store.commit('setCurrentChild', child))
              } else {
                // Add User Details to Firestore
                return addNewUserToFirestore(userDetails).then(store.commit('setCurrentChild', child));
              }
            })
            .catch(error => {
                console.error('Setting default child failed" ' + error);
            });
    },
    async deleteChild({state, commit}, child) {
      await childrenCollection
              .where("id", "==", child.id)
              .get()
              .then(docs => {
                  child.hidden = true;
                  docs.forEach(doc => {
                    doc.ref.update(child).then(response=>{
                      commit('setChildren', state.children.filter(x=>{ return x.id != child.id; }))
                    })
                  })
              })
    },
    async updateChild({state, commit}, child) {
      await childrenCollection
              .where("id", "==", child.id)
              .get()
              .then(docs => {
                  docs.forEach(doc => {
                    doc.ref.update(child)
                  })
              })
    },
    async updateSession({state, commit}, data) {
         await speechSessionsCollection
                .where("sessionId", "==", data.sessionId)
                .get()
                .then(docs => {
                    docs.forEach(doc => {
                        doc.ref.update(data).then(()=>{
                            store.commit('setSpeechSession', data);
                        })
                    })
                })
    },
    async clearAnnotations({state, commit}, data) {
      await speechSessionsCollection
            .where("sessionId", "==", data.sessionId)
            .get()
            .then(docs => {
              docs.forEach(doc => {
                let snapshot = speechSessionsCollection.doc(doc.id).collection('annotations').get().then((annotationDocs)=> {
                    annotationDocs.forEach(annotationDoc=> {
                        annotationDoc.ref.delete()
                    })
                });   
              })
            })
    },
    async deleteSession({state, commit}, data) {
      await speechSessionsCollection
            .where("sessionId", "==", data.sessionId)
            .get()
            .then(docs=> {
                docs.forEach(doc => {
                  doc.ref.delete().then(()=> {
                      console.log('doc deleted')

                  })
  
                })
            })
    },
    async updateAnnotation({state, commit}, data) {
      await speechSessionsCollection
              .where("sessionId", "==", data.sessionId)
              .get()
              .then(docs => {
                docs.forEach(doc => {
                  var annotationsCollections = speechSessionsCollection.doc(doc.id).collection('annotations');
                  annotationsCollections.where("annotationId", "==", data.annotation.annotationId).get().then((annotationDocs) => {
                      if (annotationDocs.empty) { // Create a new annotation
                        annotationsCollections.add(data.annotation).then(()=>store.commit('setAnnotation', data))
                      }
                      else {
                        annotationDocs.forEach(annotationDoc=> { // Update an annotation
                            let updatedAnnotation = data.annotation;
                            annotationDoc.ref.update(updatedAnnotation).then(()=> {
                              data.annotation = annotationNlpMapper(updatedAnnotation, updatedAnnotation.nlp);
                              store.commit('setAnnotation', data);
                              if (updatedAnnotation.starred) store.commit('setChildQuotes', updatedAnnotation.transcript);
                            });
                        })
                      }
                  })
                })
              })
    },
    async fetchChildren({ state, commit }) {
      await(store.dispatch('fetchUser'))
      let snapshot = await childrenCollection.get()
      
      return Promise.all(snapshot.docs.map(doc => {
            let child = doc.data()
            if (child.hidden) return null;
            child.quotes = []

            return childrenCollection.doc(doc.id).collection('child_features').get().then(child_features=>{
                child.features = child_features.docs.map(feature_doc=>{
                    return feature_doc.data()
                }).filter(x=>x.name)
                return child
            })        
            
      }).filter(x=>!!x)).then(children => {
              console.log('setting children');
              console.log(state.user)
              if (!state.currentChild) {
                commit('setCurrentChild',
                        children.filter(x=>{ return x.id == state.user.data.defaultChildId})[0] || children[0]); 
              }
              commit('setChildren', children)
          });
    },
    async fetchUser({ state, commit }, user) {
      commit("SET_LOGGED_IN", user !== null);
      if (user) {
        let userDoc = await usersCollection.doc(user.uid).get();
        if (userDoc.exists) {
          
          return commit("SET_USER", { ...userDoc.data(),
                                               displayName: user.displayName,
                                               email: user.email });
        }
        else {
          return commit("SET_USER", { displayName: user.displayName,
                                               email: user.email });
        }
                       

      } else {
        return commit("SET_USER", null);
      }
    },
  }
});

export default store