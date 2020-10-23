<template>
    <card>
        <h4 slot="header" class="card-title">
            New Session
        </h4>
      	<div>
      	 <div v-if="recordingNewSession">
        		<canvas id="newRecordingCanvas" width="800" height="150"></canvas>
      		</div>
          <div v-if="audioProcessingFinishedMessage" class="card col-sm-3 mx-auto text-center bg-success">
            Audio Processing Complete
          </div>
          <div v-if="processingRecording" class="text-center">
              <b-spinner variant="primary" label="Text Centered"></b-spinner>
          </div>
          <div v-if="audioDistributedProcessing" class="text-center">
             <div class="container">
                <div>Analyzing audio file...</div>
                <b-spinner variant="primary" label="Text Centered"></b-spinner>
              </div>
          </div>
          <div v-if="uploadingAudio && audioUploadFileSize" class="text-center">
             <div class="container">
                <div>Uploading audio file...</div>
                <b-progress :value="audioProgressFileSize" :max="audioUploadFileSize" show-progress animated></b-progress>  
             </div> 
          </div>
          <div v-if="processingSession && audioProgressMax" class="text-center">
            <div class="container">
              <div>Analyzing audio file...</div>
              <b-progress :value="audioProgress" :max="audioProgressMax" show-progress animated></b-progress> 
            </div>
          </div>
          <div class="input-group">
            <select v-model="selectedLanguage" class="custom-select col-sm-5" id="language-select">
              <option value="en-GB">English</option>
              <option selected value="yue-Hant-HK">Cantonese</option>
              <option value="zh-TW">Mandarin</option>
            </select>
            <div class="input-group-append">
              <button v-if="this.recordingNewSession" class="btn-sm" @click="stopRecordingSession">
                <b-icon-pause-fill size="md" scale="1">
                </b-icon-pause-fill>
                Stop Recording
              </button>
              <button v-else @click="recordNewSession" class="btn" >
                <b-icon-mic-fill size="md" scale="1">
                </b-icon-mic-fill>
                Start Recording
              </button>
              <button class="btn btn-outline btn-primary" v-b-modal="'upload-modal'">Upload Audio</button>
            </div>
          </div>

          <b-button class="float-right" @click="showXml" v-if="speechSession" variant="primary">
            View XML
          </b-button>
          

          <!--Upload modal -->
          <b-modal @ok="processFile" id="upload-modal">
            <b-form-file v-model="uploadFile"></b-form-file>
          </b-modal>
      	</div>
      	<div id="annotations-table-container">
	        <div class="justify-content-center row">

	        </div>
	        <b-table :filter="annotationsFilter" :id="'annotations-session-' + session.sessionId" ref="annotationsTable" primary-key="key" sticky-header striped hover :items="items" :fields="fields">
	            <template v-slot:cell(transcript)="row">
	            	<p v-if="row.item.alignable_id == editingRow">
	            		<input v-model="row.item.transcript"  @blur="saveTranscriptRow(row, session.sessionId)"></input>
	            	</p>
	            	<p v-else>{{row.item.transcript}}</p>
	                <b-button-toolbar>
		                <b-button-group class="btn-group-sm">
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
	            <template v-slot:cell(star)="row">
	                <div @click="toggleStar($event, row, session.sessionId)" class="mb-0">
	                  <b-icon-star-fill v-if="row.item.starred" scale="1.4" variant="primary"></b-icon-star-fill>
	                  <b-icon-star v-else scale="1.4" variant="primary"></b-icon-star>
	                </div>
	            </template>
	        </b-table>
	    </div>
    </card>
</template>
<script>
  import { BIcon, BButtonToolbar, BIconFilePlus, BIconMic, BIconMicFill, BIconPauseFill, BIconStar, BIconStarFill, BProgress } from 'bootstrap-vue'
  import Card from 'src/components/Cards/Card.vue'
  import { mapState } from 'vuex'
  import moment from 'moment'
  import io from 'socket.io-client'
  import store from '../../store'
  import WaveSurfer from 'wavesurfer.js'
  import Regions from 'wavesurfer.js/dist/plugin/wavesurfer.regions.js'
  import Timeline from 'wavesurfer.js/dist/plugin/wavesurfer.timeline.js'
  import Elan from 'wavesurfer.js/dist/plugin/wavesurfer.elan.js'
  import SocketIOFileUpload from 'socketio-file-upload';

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
      BIconFilePlus,
      BIconMic,
      BIconMicFill,
      BIconPauseFill,
      BIconStar,
      BButtonToolbar,
      BIconStarFill,
      Card
    },
    data () {
      return {
        audioData: null,
        audioDistributedProcessing: false,
        audioProgress: 0,
        audioProcessingFinishedMessage: null,
        audioProgressMax: null,
        audioProgressFileSize: 0,
        audioUploadFileSize: null,
      	editingRow: null,
        fftBufferSize: 512, //2048;
      	input: null,
      	context: null,
        mic: null,
      	processor: null,   
        processingRecording: false,
        processingSession: false,
        selectedLanguage: 'yue-Hant-HK',
      	session: {
      		sessionId: 0
      	},
        show: false,
        socket: null,
        speechRecognitionBlock: 0,
        speechRecognitionResults: [],
        speechRecognitionText: 'None',
        streamingAudio: false,
        uploadFile: null,
        audioStream: null,
        annotationsFilter: '',
        recordingNewSession: false,
        uploadingAudio: false,
        wavesurfers: [],
        fields: [
          {
            key: 'show_details',
            label: ''
          },
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
      console.log('Establishing socket connection with: ' + process.env.VUE_APP_API_URL);

    	this.socket = io.connect(process.env.VUE_APP_API_URL);
      this.socket.on('connect', function () {
        console.log('connected!');
      });
      let removeLastSentence = true;
      //let speechResults = this.speechRecognitionText;
      let speechRecognitionResults = this.speechRecognitionResults;
      let speechRecognitionBlock = this.speechRecognitionBlock;
      let speechRecognitionText = this.speechRecognitionText;
      let items = this.items;

      this.socket.on('timestampsResult', result => {
        console.log('timestamp result')
        console.log(result)
         this.processingRecording = false;
         this.processingSession = false;
         this.audioDistributedProcessing = false;
         this.audioProcessingFinishedMessage = true;
         this.speechSession.audioUrl = 'https://storage.googleapis.com/' + result.bucket + '/' + result.audio;
         this.speechSession.manifestUrl = 'https://storage.googleapis.com/' + result.bucket + '/' + result.manifest;
         this.speechSession.timelineUrl = 'https://storage.googleapis.com/' + result.bucket + '/' + result.timeline;
      });

      this.socket.on('upload:event', data=> {
        if (data.message.type == 'started') {
          this.uploadingAudio = true;
          this.audioProgressFileSize = 0;
          this.audioUploadFileSize = data.message.fileSize;
        }
        if (data.message.type == 'progress') {
          this.audioProgressFileSize = data.message.loaded;
        }
        if (data.message.type == 'finished') {
          this.uploadingAudio = false;
          
        }
      });

      this.socket.on('audioProcessingStart', data=> {
        this.audioProgressMax = data.numberOfFiles + 1;
      })

      this.socket.on('audioDistributedProcessingStart', ()=>{
        this.audioDistributedProcessing = true;
      })

      this.socket.on('audioDistributedProcessingEnd', ()=>{
        this.audioDistributedProcessing = false;
      })

      this.socket.on('audioProcessingProgress', data => {
        this.audioProgress = data.filesProcessed + 1;
      });

      this.socket.on('nextBlock', data => {
        let elapsedTimeMs = Date.now() - this.recordingStartTime;
        let elapsedTimeM = Math.floor(elapsedTimeMs/60000);
        let elapsedTimeS = (elapsedTimeMs/1000-(elapsedTimeM*60)).toFixed(0);
        let padToTwoDigits = number => number <= 99 ? `0${number}`.slice(-2) : number;

        items.push({
        				transcript: speechRecognitionResults[speechRecognitionBlock],
        				start_time: items[items.length-1] ? items[items.length-1].end_time : "00:00",
        				end_time: padToTwoDigits(elapsedTimeM) + ":" + padToTwoDigits(elapsedTimeS),
        				duration: "",
        				key: this.session.sessionId + '_' + (speechRecognitionBlock),
        				alignable_id: speechRecognitionBlock-1,
        				speaker: "Unknown",
        				isActive: false,
        				starred: false });
       
      	
        speechRecognitionBlock++;
      })

      this.socket.on('speechData', data => {
          // console.log(data.results[0].alternatives[0].transcript);
            var dataFinal = undefined || data.results[0].isFinal;
            speechRecognitionResults[speechRecognitionBlock] = data.results[0].alternatives[0].transcript;  
      })
    },
    computed: {
      ...mapState(['speechSession'])
    },
    filters: {
      formatDate(val) {
        if (!val) { return '-' }
    
        let date = val.toDate()
        return moment(date).format('MMMM Do YYYY, h:mm a')
      }
    },
    methods: {
      createSession() {
        store.dispatch('createSpeechSession', { content: "test" })
      },
      showXml() {
          window.open(this.speechSession.manifestUrl, "_blank");
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
      	this.editingRow = null
      	let annotation = { annotationId: row.item.alignable_id, starred: !row.item.starred, transcript: row.item.transcript }
        store.dispatch('updateAnnotation',{ annotation: annotation, sessionId: sessionId })
      },
      stopRecordingSession() {
        const context = this.context;
    		const track = this.audioStream.getTracks()[0];
        const processor = this.processor;
        const socket = this.socket;
        this.recordingNewSession = false;
        this.processingRecording = true;
    		track.stop();
    		this.input.disconnect(processor);
    		processor.disconnect(context.destination);
    		
        context.close().then(function () {
    			//processor = null;
    		  //context = null;
          socket.emit('endGoogleCloudStream');
    		});
      },
      stopRecordAudio() {
        this.mic.stop();
        const spectrogramTensor = this.audioData.spectrogram;
        spectrogramTensor.print();
        const waveformTensor = this.audioData.waveform;
        waveformTensor.print();
      },
      processFile() {
        this.audioProcessingFinishedMessage = false;
        const filename = this.uploadFile.name;
        const uploader = new SocketIOFileUpload(this.socket);
        uploader.addEventListener('complete', (data)=> {
          store.dispatch('createSpeechSession', this.selectedLanguage).then((session)=> {
            this.$nextTick(() => {
                this.socket.emit('startProcessingFile', { sessionId: this.speechSession.sessionId, filename: filename, language: this.selectedLanguage });
                this.processingSession = true;
            })
          })
        })
        uploader.submitFiles([this.uploadFile])
      },
      recordNewSession() {
          this.recordingStartTime = Date.now();
          this.recordingNewSession = true;
          store.dispatch('createSpeechSession', this.selectedLanguage).then(()=> {
              this.$nextTick(() => {
                  this.socket.emit('startGoogleCloudStream', {
                    sessionId: this.speechSession.sessionId,
                    language: this.selectedLanguage
                  });
                  this.streamingAudio = true;
                  const AudioContext = window.AudioContext || window.webkitAudioContext;
                  const context = new AudioContext({
                    latencyHint: 'interactive',
                  });
                  const analyser = context.createAnalyser();
                  const processor = context.createScriptProcessor(this.fftBufferSize, 1, 1);
                  this.context = context;
                  this.processor = processor; 
                  processor.connect(context.destination);
                  context.resume();
                  //let socket = this.socket;

                  navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: false
                  }).then((stream) => this.processAudioStream(stream, context, analyser, processor));
          })
        });
      },
      processAudioStream (stream, context, analyser, processor) {
          this.audioStream = stream;
          let input = context.createMediaStreamSource(stream);
          this.input = input;
          input.connect(processor);
          // Link the audio to a waveform display
          input.connect(analyser);       
          analyser.fftSize = this.fftBufferSize;
          let bufferLength = analyser.frequencyBinCount;
          // let dataArray = new Uint8Array(bufferLength);
          let dataArray = new Float32Array(bufferLength);

          // Parameters for the graph
          let backFill = [];
          let backFillPosition = 0;
          let canvasElement = document.getElementById('newRecordingCanvas')
          let canvasWidth = canvasElement.parentNode.parentElement.clientWidth;
          canvasElement.width = canvasWidth;
          let HEIGHT = 150;
          let WIDTH = canvasWidth;
          let ctx = canvasElement.getContext("2d");
          let barWidth = (WIDTH / bufferLength) * 2.5;
          let countTo10 = 0;
          let x = 0;
          ctx.fillStyle = 'rgb(200, 200, 200)';
          ctx.fillRect(0, 0, WIDTH, HEIGHT);
              
          processor.onaudioprocess = e => {
              const left = e.inputBuffer.getChannelData(0); // This will contain the same amount of samples as the buffer size
              const left16 = downsampleBuffer(left, 44100, 16000)
              this.socket.emit('binaryData', left16);
              
              // Render analyzer 
              let barHeight;
              //analyser.getByteFrequencyData(dataArray);
              analyser.getFloatFrequencyData(dataArray);
              let sum = 0;
              let backFillOffset = 0;
              for(var i = 0; i < bufferLength; i++) {
                  const minDb = analyser.minDecibels;
                  const maxDb = analyser.maxDecibels;
                  const freqScale = 1 / (maxDb - minDb);
                  let scaledHeight = (freqScale * (dataArray[i] - minDb));
                  sum += scaledHeight;
              }

              let scaledBarHeight = 25-(-(sum/bufferLength) * 30);
              ctx.fillStyle = 'rgb(80,150,220)';
              ctx.fillRect(x,(HEIGHT/2)-(scaledBarHeight/2),barWidth,scaledBarHeight);
              backFill.push(scaledBarHeight);

              if (backFillPosition > 0) { // Horizontal Scrolling
                  let backFillWindow = backFill.slice(backFillPosition + backFillOffset);

                  for (var i = 0; i < backFillWindow.length; i++) {
                      let backFillBarHeight = backFillWindow[i];
                      ctx.fillStyle = 'rgb(200, 200, 200)';
                       ctx.fillRect(i, 0, WIDTH, HEIGHT);
                      ctx.fillStyle = 'rgb(80,150,220)';
                      ctx.fillRect(i,(HEIGHT/2)-(backFillBarHeight/2),barWidth,backFillBarHeight);
                  }
                  backFillOffset = backFillOffset+3;
              }

              if (backFill.length > (WIDTH/barWidth)) {
                backFillPosition++;                 
              }
              else {
                x += barWidth; 
              }    

          };
      },
      toggleEdit(event, row, record) {
        event.stopPropagation()
      	this.editingRow = row.item.alignable_id
        if (record) {
          this.recordNewSession()
        }
      },
      toggleStar(event, row, sessionId) {
        event.stopPropagation()
        let annotation = { annotationId: row.item.alignable_id, starred: !row.item.starred }
        store.dispatch('updateAnnotation',{ annotation: annotation, sessionId: sessionId })
      }

    }
  }
</script>
<style>

</style>
