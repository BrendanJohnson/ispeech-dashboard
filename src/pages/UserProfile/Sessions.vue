<template>
  <div v-if="speechSessions.length">
    <b-modal @ok="handleUpdateTranscript" v-model="showUpdateTranscriptModal">
      <p>
        The data associated with this session has been updated from CSV. By clicking OK you will replace all Speaker/Transcript data with data from the CSV file, and overwrite any edits that have been made to the session details here. In order to see the updates you will need to refresh this page.
      </p> 
      <p>Do you wish to continue?</p>
    </b-modal>
    <b-pagination
      v-model="currentPage"
      :total-rows="rows"
      aria-controls="my-table"
    ></b-pagination>
    <card v-for="(session, i) in speechSessions" :key="session.sessionId">
      <h4 slot="header" class="card-title">
        Session {{session.createdOn | formatDate}}
        <b-button-group class="float-right">
            <b-button class="btn-sm" @click="downloadCsv(session)">
              Download CSV
            </b-button>
            <b-button class="btn-sm" v-b-modal="'upload-modal'">
              Upload CSV
            </b-button>
            <b-button class="btn-sm" @click="showXml(session.manifestUrl)">
              View XML
            </b-button>
        </b-button-group>
      </h4>
      <div :id="'waveform-session-' + session.sessionId" ref="waveform">
          <!-- Here be the waveform -->
        </div>
        <div id="wave-timeline" ref="wave-timeline">
        </div>

        <div>
         <hr/>
          <div class="row">
            <div class="col-6">
              <button class="btn btn-primary" @click="playMusic(session.sessionId)">
                <i class="glyphicon glyphicon-play"></i>
                Play
                /
                <i class="glyphicon glyphicon-pause"></i>
                Pause
              </button>

             

              <!--Upload modal -->
              <b-modal @ok="uploadCsv(session)" id="upload-modal">
                <b-form-file v-model="uploadedCsv"></b-form-file>
              </b-modal>
            </div>
            <div class="col-6">
              <b-form-input v-model="annotationsFilter"  placeholder="Type to Search"></b-form-input>
            </div>
          </div>
      </div>
    <div class="row">
      <div class="col-12">

            <a v-b-toggle class="float-right" href="#example-collapse" @click.prevent>Session Statistics</a>
       
          </div>
      </div>
       <b-collapse id="example-collapse">
      <b-card title="Word types">
      <div>
        <p v-for="(count, tag) in session.tagTotals">{{tag}}: {{count}}</p>
        </div>
      </b-card>
    </b-collapse>
    <div id="annotations-table-container">
        <div class="justify-content-center row">

        </div>
        <b-table :filter="annotationsFilter" :id="'annotations-session-' + session.sessionId" ref="annotationsTable" primary-key="key" sticky-header striped hover :items="items" :fields="fields" @row-clicked="row=>clickRow(row, session.sessionId)">
            <template v-slot:cell(transcript)="row">
            		<p v-if="row.item.alignable_id == editingRow.alignable_id"><input v-model="row.item.transcript"  @blur="saveTranscriptRow(row, session.sessionId)"></input></p>
            		<p v-else>{{row.item.transcript}}</p>
                <div v-if="row.item.syntaxValues">
                  <syntax-canvas style="width: 100%; height: 35px;">
                    <syntax-arrow
                    v-for="obj, index of row.item.syntaxValues"
                    :x1="((index / row.item.syntaxValues.length) * 100)"
                    :x2="((index / row.item.syntaxValues.length) * 100) + (100 / row.item.syntaxValues.length)"
                    :y1="100"
                    :y2="100"
                    :skip="obj.skip"
                    :edgeLabel="obj.edgeLabel"
                    >
                    </syntax-arrow>
                  </syntax-canvas>
                  <syntax-canvas style="width: 100%; height: 50px;">
                    <syntax-box
                      v-for="obj, index of row.item.syntaxValues"
                      :x1="((index / row.item.syntaxValues.length) * 100)"
                      :x2="((index / row.item.syntaxValues.length) * 100) + (100 / row.item.syntaxValues.length)"
                      :y1="50"
                      :y2="40"
                      :color="obj.color"
                      :label="obj.label"
                      :tagLabel="obj.tag"
                      :detailLabel="obj.person"
                    >
                    </syntax-box>
                  </syntax-canvas>  
                </div>
                <b-button-toolbar class="float-right float-top">
                  <b-button-group class="btn-group-sm">
                    <b-button variant="outline-primary">
                      <b-icon-question-circle size="sm" scale="1" class="float-right" @click="analyzeText(row, session.sessionId)" >
                    </b-icon-question-circle>
                  </b-button>
                    <b-button variant="outline-primary">
                      <b-icon-file-plus size="sm" scale="1" class="float-right" @click="toggleEdit($event, row)">
                    </b-icon-file-plus>
                  </b-button>
                  <b-button variant="outline-primary">
                   
                <b-icon-mic size="sm" scale="1" class="float-right" @click="toggleEdit($event, row, true)">
                </b-icon-mic>
                  </b-button>
                </b-button-group>
                </b-button-toolbar>
        
            </template>
            <template v-slot:cell(sentiment)="row">
                <b-icon :icon="'emoji-' + row.item.sentiment" scale="1.4" variant="primary"></b-icon>
            </template>
            <template v-slot:cell(star)="row">
                <div @click="toggleStar($event, row, session.sessionId)" class="mb-0">
                  <b-icon-star-fill v-if="row.item.starred" scale="1.4" variant="primary"></b-icon-star-fill>
                  <b-icon-star v-else scale="1.4" variant="primary"></b-icon-star>
                </div>
            </template>
        </b-table>
      </div>
    <div id="annotations" class="table-responsive" style="display:none;">
      <!-- Hidden as we want to use our own table -->
    </div>
    </card>
  </div>
  <div v-else>
    <p class="no-results">There are currently no sessions</p>
    <form @submit.prevent>
      <button  class="btn btn-primary"  @click="createSession()" >Create Session</button>
    </form>
  </div>
</template>
<script>
  import { BIcon, BIconEmojiSmile, BIconEmojiNeutral, BIconEmojiFrown, BIconEmojiDizzy, BIconEmojiLaughing, BIconQuestionCircle, BButtonToolbar, BIconFilePlus, BIconMic, BIconStar, BIconStarFill } from 'bootstrap-vue'
  import Card from 'src/components/Cards/Card.vue'
  import SyntaxArrow from 'src/components/Syntax/SyntaxArrow.vue'
  import SyntaxBox from 'src/components/Syntax/SyntaxBox.vue'
  import SyntaxCanvas from 'src/components/Syntax/SyntaxCanvas.vue'
  import { mapState } from 'vuex'
  import moment from 'moment'

  import parseCsv from 'csv-parse';
  import io from 'socket.io-client';
  import store from '../../store'
  import timelineUtil from '../../timelineUtil'
  import WaveSurfer from 'wavesurfer.js'
  import Regions from 'wavesurfer.js/dist/plugin/wavesurfer.regions.js'
  import Timeline from 'wavesurfer.js/dist/plugin/wavesurfer.timeline.js'
  import Elan from 'wavesurfer.js/dist/plugin/wavesurfer.elan.js'

  const sentimentMapper = sentiment => {
    if (sentiment > 0.8) return 'laughing';
    else if (sentiment > 0.5) return 'smile';
    else if (sentiment > 0) return 'neutral';
    else if (sentiment > -0.5) return 'frown';
    else return 'dizzy'
  }

  const itemMapper = (session, annotation, alignable_id) => {
      return {
        transcript: annotation && annotation.transcript ? annotation.transcript : null,
        start_time: annotation && annotation.start ? annotation.start : 'N/A',
        end_time: annotation && annotation.end ? annotation.end : 'N/A',
        duration: annotation && annotation.duration ? annotation.duration : 0,
        key: session.sessionId + '_' + alignable_id,
        alignable_id: alignable_id,
        speaker: annotation ? ((annotation.speaker == 'child') ? (session.child ? session.child.name : 'Child') : 'Adult') : 'Unknown',
        isActive: true,
        sentiment: annotation && annotation.sentiment ? sentimentMapper(annotation.sentiment) : null,
        starred: annotation && annotation.starred,
        syntaxValues: annotation ? annotation.syntaxValues : null 
      }
  };         

  var downsampleBuffer = function (buffer, sampleRate, outSampleRate) {
      if (outSampleRate == sampleRate) {
        return buffer;
      }
      if (outSampleRate > sampleRate) {
        throw "downsampling rate show be smaller than original sample rate";
      }
      var sampleRateRatio = sampleRate / outSampleRate;
      var newLength = Math.round(buffer.length / sampleRateRatio);
      var result = new Int16Array(newLength);
      var offsetResult = 0;
      var offsetBuffer = 0;
      while (offsetResult < result.length) {
        var nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
        var accum = 0, count = 0;
        for (var i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
          accum += buffer[i];
          count++;
        }

        result[offsetResult] = Math.min(1, accum / count) * 0x7FFF;
        offsetResult++;
        offsetBuffer = nextOffsetBuffer;
      }
      return result.buffer;
    }

  export default {
    components: {
      BIcon,
      BIconEmojiSmile,
      BIconEmojiNeutral,
      BIconEmojiFrown,
      BIconEmojiDizzy,
      BIconEmojiLaughing,
      BIconFilePlus,
      BIconMic,
      BIconQuestionCircle,
      BIconStar,
      BButtonToolbar,
      BIconStarFill,
      Card,
      SyntaxArrow,
      SyntaxBox,
      SyntaxCanvas
    },
    data () {
      return {
        currentPage: 1,
      	editingRow: {},
        show: false,
        showUpdateTranscriptModal: false,
        socket: null,
        speechRecognitionBlock: 0,
        speechRecognitionResults: [],
        speechRecognitionText: 'None',
        streamingAudio: false,
        updateModalSession: null,
        uploadedCsv: null,
        audioStream: null,
        annotationsFilter: '',
        wavesurfers: [],
        fields: [
          {
            key: 'start_time',
            sortable: true
          },
          {
            key: 'end_time',
            sortable: false
          },
          {
            key: 'duration',
            sortable: true,
            formatter: value => {
              var roundedTime = Math.round((value + Number.EPSILON) * 100) / 100;
              return roundedTime + 's';
            }
          },
          {
            key: 'speaker',
            sortable: true
          },
          {
            key: 'sentiment',
            label: '',
            sortable: true
          },
          {
            key: 'transcript',
            label: 'Transcript',
            sortable: true
          },
          {
            key: 'star',
            label: '',
            sortable: false
          }
        ],
        items: [
        ],
        syntaxValues: [],
        user: {
          company: 'Light dashboard',
          username: 'michael23',
          email: '',
          firstName: 'Mike',
          lastName: 'Andrew',
          address: 'Melbourne, Australia',
          city: 'melbourne',
          country: 'Australia',
          postalCode: '',
          aboutMe: `Lamborghini Mercy, Your chick she so thirsty, I'm in that two seat Lambo.`
        }
      }
    },
    mounted() {
    	this.socket = io.connect('localhost:3000');
      let removeLastSentence = true;
      //let speechResults = this.speechRecognitionText;
      let speechRecognitionResults = this.speechRecognitionResults;
      let speechRecognitionBlock = this.speechRecognitionBlock;
      let speechRecognitionText = this.speechRecognitionText;
     
      this.socket.on('nextBlock', data => {
        speechRecognitionBlock++
      })

      let that = this;

      this.socket.on('speechData', (data) => {
            var dataFinal = undefined || data.results[0].isFinal;
            
            if (dataFinal === false) {
                speechRecognitionResults[speechRecognitionBlock] = data.results[0].alternatives[0].transcript;              
                that.editingRow.transcript = speechRecognitionResults.join(' ');         
            }
      })

      this.socket.on('updatedTranscript', data => {

          console.log('updated transcript')
          this.showUpdateTranscriptModal = true;
          this.updateModalSession = {
                sessionId: data.sessionId,
                timeline: data.timeline,
                manifestUrl: 'https://storage.googleapis.com/ispeech-manifests/' + data.manifest
          };

      })

    	if (this.speechSessions.length) {
      	this.speechSessions.forEach(session => this.renderWavesurfer(session))
    	}
    },
    computed: {
      ...mapState(['speechSessions']),
      rows() {
        return this.speechSessions.length
      }
    
    },
    watch: {
      immediate: true,
      speechSessions(sessions) {
        if (sessions.length) {
          sessions.forEach(session => {
            if(!this.wavesurfers[session.sessionId]) {
              this.renderWavesurfer(session)
            }
            else {
              this.items = this.items.map(item => {
                return itemMapper(session, session.annotations[item.alignable_id], item.alignable_id);
              })
            }
          })       
        }
      }
    },
    filters: {
      formatDate(val) {
        if (!val) { return '-' }
    
        let date = val.toDate()
        return moment(date).format('MMMM Do YYYY, h:mm a')
      }
    },
    methods: {
      analyzeText(row, sessionId) {
        let request = {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inputText: row.item.transcript })
        };
        fetch('/NLP/',request).then(response => response.json())
            .then(data => {
              let annotation = {  
                                  annotationId: row.item.alignable_id,
                                  starred: !!row.item.starred,
                                  transcript: row.item.transcript,
                                  nlp: data
                                };
              store.dispatch('updateAnnotation',{ annotation: annotation, sessionId: sessionId })
        });
      },
      createSession() {
        store.dispatch('createSpeechSession', { content: "test" })
      },
      renderWavesurfer(session) {
        this.$nextTick(() => {
          var container = this.$refs.waveform.filter(item => {
            return item.id == 'waveform-session-' + session.sessionId 
          })[0];

          this.wavesurfers[session.sessionId] = WaveSurfer.create({
            container: container,
             barWidth: 2,
            barHeight: 1, // the height of the wave
            waveColor: '#409EFF',
            progressColor: 'blue',
            minPxPerSec: 10, // for scrolling
            scrollParent: true,  // for scrolling
            backend: 'MediaElement',
            mediaControls: false,
            interact: true,
            fillParent: true,
            normalize: true, // this normalizes the max amplitude value from the entire audio file, works well for quiet audio
            audioRate: '1',
            plugins: [
              Regions.create({ regions: []}),

              Timeline.create({
                container: '#wave-timeline'
              }),

              // Instead of creating the normal way, we're going to pass XML as a string
              Elan.create({
                  container: '#annotations',
                  url: session.manifestUrl,
                  //url: 'https://storage.googleapis.com/ispeech-manifests/manifest2.xml', 
                  tiers: {
                      "Speaker": true,
                      "Transcript": true
                  }
              })

            ],
            xhr: {
                    cache: "default",
                    mode: "cors",
                    method: "GET",
                    credentials: "omit",
                    headers: [
                      { key: "cache-control", value: "no-cache" },
                      { key: "pragma", value: "no-cache" }
                    ]
                  }
          });


        // Proxy actually points to https://storage.googleapis.com/ispeech-bucket/raw_audio
        //  this.wavesurfers[session.sessionId].load('/audio/putonghua_030120_slice.mp3');
          this.wavesurfers[session.sessionId].load(session.audioUrl);

          var wavesurfer = this.wavesurfers[session.sessionId];

          wavesurfer.elan.on('select', function (start, end) {
            wavesurfer.backend.play(start, end);
          });

          var elanReadyFactory = function(wavesurfer, items) {
            return function() {
              for (var i = 0; i <= wavesurfer.elan.renderedAlignable.length; i++) {
                  var region = wavesurfer.elan.renderedAlignable[i]
                  if (region) {
                    var alignable_id = region.id;
                    wavesurfer.addRegion({
                                  start: region.start,
                                  end: region.end,
                                  resize: false,
                                  drag: false,
                                  color: (region.value == 'adult') ? 'rgba(29, 200, 234, 0.3)' : 'rgba(234, 29, 200, 0.3)'
                    });
                    let transcript_data = wavesurfer.elan.data.tiers.map(function(tier) {
                      var matchingAnnotations = [];
                      if (tier.annotations) {
                         matchingAnnotations = tier.annotations.filter(function(annotation) {
                            return annotation.ref == alignable_id && (annotation.id.indexOf("TRANSCRIPT") > -1);
                         });
                      }
                    
                      return matchingAnnotations.filter(function(annotation) {
                        return annotation.value;
                      }).map(function(annotation) {
                        return annotation.value;
                      });
                    });

                    let annotation = session.annotations[region.id];

                    if(!session.annotations[alignable_id] || (session.annotations[alignable_id] && !session.annotations[alignable_id].start)) {
                      let annotation = {
                        annotationId: alignable_id,
                        start: region.start,
                        end: region.end,
                        duration: region.end-region.start,
                        speaker: region.value,
                        transcript: transcript_data[2][0]
                      }
                      store.dispatch('updateAnnotation', { annotation: annotation, sessionId: session.sessionId })
                    }

                    const item = itemMapper(session, session.annotations[region.id], region.id);
                    items.push(item);
                  }
              }
            };
          };

          var onProgressFactory = function(rowFn, scrollFn) {
            var prevAnnotation, prevRow, region;
            return function(time) {
              var annotation = wavesurfer.elan.getRenderedAnnotation(time);
              if (prevAnnotation != annotation) {
                prevAnnotation = annotation;
                region && region.remove();
                region = null;

                if (annotation) {
                  var row = rowFn(session.sessionId + '_' + annotation.id, session.sessionId);
                  prevRow && prevRow.classList.remove('table-success');
                  prevRow = row;
                  row.classList.add('table-success');
                  var before = row.previousSibling;
                  var after = row.nextSibling;
                  if (after && after.dataset) {
                    scrollFn(after.dataset.pk, session.sessionId);
                  }
                  // Region
                  region = wavesurfer.addRegion({
                      start: annotation.start,
                      end: annotation.end,
                      resize: false,
                      drag: false,
                      color: 'rgba(223, 240, 216, 0.7)'
                  });
                }
              }      
            }
          }
          var onRegionClick = function(region) {
            wavesurfer.play(region.start)
          }
          this.wavesurfers[session.sessionId].on('audioprocess', onProgressFactory(this.getRow, this.scrollToRow));
          this.wavesurfers[session.sessionId].elan.on('ready', elanReadyFactory(wavesurfer, this.items));
          this.wavesurfers[session.sessionId].on('region-click', onRegionClick);

        })
      },
      updateProfile () {
        alert('Your data: ' + JSON.stringify(this.user))
      },
      playMusic(id) {
        this.wavesurfers[id].playPause.bind(this.wavesurfers[id])()
      },
      clickRow(row, sessionId) {
        this.wavesurfers[sessionId].play(row.start_time)
      },
      getRow(key, sessionId) {
        var container = this.$refs.annotationsTable.filter(item => {
            return item.id == 'annotations-session-' + sessionId 
        })[0];
        const tbody = container.$el.querySelector('tbody')
        const row = tbody.querySelectorAll('tr[data-pk="' + key + '"]')[0];
        return row;
      },
      handleUpdateTranscript() {
          console.log('clear for: ');
          console.log(this.updateModalSession)
          store.dispatch('updateSession', this.updateModalSession) 
          store.dispatch('clearAnnotations', this.updateModalSession);
      },
      scrollToRow(key, sessionId) {
        var container = this.$refs.annotationsTable.filter(item => {
            return item.id == 'annotations-session-' + sessionId 
        })[0];
        const tbody = container.$el.querySelector('tbody')
        const row = tbody.querySelectorAll('tr[data-pk="' + key + '"]')[0];
        row.scrollIntoViewIfNeeded(false)
      },
      saveTranscriptRow(row, sessionId) {
      	event.stopPropagation()
      	this.editingRow = {}
      	let annotation = { annotationId: row.item.alignable_id, starred: !!row.item.starred, transcript: row.item.transcript }
        store.dispatch('updateAnnotation',{ annotation: annotation, sessionId: sessionId })
      },
      downloadCsv(session) {
        const items = session.timeline;
        const replacer = (key, value) => value === null ? '' : value ;
        const header = Object.keys(items[0])
        let csv = items.map(row => header.map(fieldName => {
          return (fieldName == 'transcript') ? '' : JSON.stringify(row[fieldName], replacer)
        }).join(','))
        csv.unshift(header.join(','))
        csv = csv.join('\r\n')
        
        let anchor = document.createElement('a');
        anchor.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
        anchor.target = '_blank';
        anchor.download = 'session.csv';
        anchor.click();

      },
      uploadCsv(session) {
        const reader = new FileReader();
        let socket = this.socket;
        reader.onload = function (evt) {
            const json = parseCsv(evt.target.result,{
                delimiter: ',',  columns: true
            },
            (err,json)=>{
              console.log('emitting json');
              socket.emit('updateTranscript', { existingManifestName: session.manifestUrl.match(/[^/\\&\?]+\.\w{3,4}(?=([\?&].*$|$))/)[0], sessionId: session.sessionId, timeline: json });
            }) 
        };
        reader.onerror = function (evt) {
                alert("An error ocurred reading the CSV file",evt);
        };
        reader.readAsText(this.uploadedCsv, "UTF-8");
        
      },
      showXml(manifestUrl) {
          window.open(manifestUrl, "_blank");
      },
      audioInput() {
      	const bufferSize = 2048;

        this.$nextTick(() => {
      	    this.socket.emit('startGoogleCloudStream', '');
      	    this.streamingAudio = true;
        		const AudioContext = window.AudioContext || window.webkitAudioContext;
        		const context = new AudioContext({
        			latencyHint: 'interactive',
        		});

        		const processor = context.createScriptProcessor(bufferSize, 1, 1);
        		processor.connect(context.destination);
        		context.resume();

        		let socket = this.socket;

        		navigator.mediaDevices.getUserMedia({
        			audio: true,
        			video: false
        		}).then(stream => {
        						this.audioStream = stream;
        						let input = context.createMediaStreamSource(stream);
        						input.connect(processor);
                    processor.onaudioprocess = function (e) {
                        const left = e.inputBuffer.getChannelData(0);
                        const left16 = downsampleBuffer(left, 44100, 16000)
                        socket.emit('binaryData', left16);                    
             
              }
        		});
        });
      },
      toggleEdit(event, row, record) {
        event.stopPropagation()
      	this.editingRow = row.item;
        if (record) {

          this.audioInput()
        }
      },
      toggleStar(event, row, sessionId) {
        event.stopPropagation()
        let annotation = { annotationId: row.item.alignable_id, starred: !row.item.starred };
        store.dispatch('updateAnnotation',{ annotation: annotation, sessionId: sessionId })
      }
    }
  }
</script>
<style>

</style>
