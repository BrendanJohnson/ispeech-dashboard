<template>
    <card>
      	<h4 slot="header" class="card-title">
        	New Session
      	</h4>
      	<div>
      	    <div v-if="recordingNewSession" >
        		<canvas id="newRecordingCanvas" width="800" height="150"></canvas>
      		</div>
      		<b-button @click="recordNewSession" variant="primary">
      			<b-icon-mic-fill size="md" scale="1">
	        	</b-icon-mic-fill>
	        	Start Recording
	        </b-button>    	
      	</div>
      	<div id="annotations-table-container">
	        <div class="justify-content-center row">

	        </div>
	        <b-table :filter="annotationsFilter" :id="'annotations-session-' + session.sessionId" ref="annotationsTable" primary-key="key" sticky-header striped hover :items="items" :fields="fields">
	            <template v-slot:cell(show_details)="row">
	              <b-button :id="`popover-reactive-${row.index}`" variant="primary" ref="button">
	                Details
	              </b-button>
	              <b-popover
	                custom-class="hide-border"
	                boundary="viewport"
	                container="annotations-table-container"
	                :target="`popover-reactive-${row.index}`"
	                triggers="click"
	                placement="right"
	                ref="popover"
	              >
	                <img src="https://storage.googleapis.com/ispeech-bucket/EAF/trees/better_intelligibility_77.png" alt="">
	              </b-popover>
	            </template>
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
  import { BIcon, BButtonToolbar, BIconFilePlus, BIconMic, BIconMicFill, BIconStar, BIconStarFill } from 'bootstrap-vue'
  import Card from 'src/components/Cards/Card.vue'
  import { mapState } from 'vuex'
  import moment from 'moment'
  import io from 'socket.io-client';
  import store from '../../store'
  import WaveSurfer from 'wavesurfer.js'
  import Regions from 'wavesurfer.js/dist/plugin/wavesurfer.regions.js'
  import Timeline from 'wavesurfer.js/dist/plugin/wavesurfer.timeline.js'
  import Elan from 'wavesurfer.js/dist/plugin/wavesurfer.elan.js'

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
      BIconStar,
      BButtonToolbar,
      BIconStarFill,
      Card
    },
    data () {
      return {
      	editingRow: null,
      	session: {
      		sessionId: 0
      	},
        show: false,
        socket: null,
        speechRecognitionBlock: 0,
        speechRecognitionResults: [],
        speechRecognitionText: 'None',
        streamingAudio: false,
        audioStream: null,
        annotationsFilter: '',
        recordingNewSession: false,
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
    	this.socket = io.connect('localhost:3000');
      let removeLastSentence = true;
      //let speechResults = this.speechRecognitionText;
      let speechRecognitionResults = this.speechRecognitionResults;
      let speechRecognitionBlock = this.speechRecognitionBlock;
      let speechRecognitionText = this.speechRecognitionText;
      let items = this.items;
      
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
                //items[0].transcript = speechRecognitionResults.join(' ');

           
      })
    },
    computed: {
      ...mapState(['speechSessions'])
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
      recordNewSession() {
      	const bufferSize = 2048;
        this.recordingStartTime = Date.now();

        this.recordingNewSession = true;
        this.$nextTick(() => {
        	let canvasElement = document.getElementById('newRecordingCanvas');
        	let canvasWidth = canvasElement.parentNode.parentElement.clientWidth;
        	canvasElement.width = canvasWidth;
        	let HEIGHT = 150;
        	let WIDTH = canvasWidth;
            let ctx = canvasElement.getContext("2d");

            newRecordingCanvas
      	    this.socket.emit('startGoogleCloudStream', '');
      	    this.streamingAudio = true;
    		const AudioContext = window.AudioContext || window.webkitAudioContext;
    		const context = new AudioContext({
    			latencyHint: 'interactive',
    		});
            const analyser = context.createAnalyser();
        	const processor = context.createScriptProcessor(bufferSize, 1, 1);
        	processor.connect(context.destination);
        	context.resume();
        	let backFill = [];
        	let backFillPosition = 0;
        	let socket = this.socket;

        	navigator.mediaDevices.getUserMedia({
        		audio: true,
        		video: false
        	}).then(stream => {
        		this.audioStream = stream;
        		let input = context.createMediaStreamSource(stream);
        		input.connect(processor);
                // Link the audio to a waveform display
                input.connect(analyser);       
                analyser.fftSize = bufferSize;
                let bufferLength = analyser.frequencyBinCount;
                // let dataArray = new Uint8Array(bufferLength);
                let dataArray = new Float32Array(bufferLength);
                var max = 0;
                let barWidth = (WIDTH / bufferLength) * 2.5;
                let countTo10 = 0;
                let x = 0;
                ctx.fillStyle = 'rgb(200, 200, 200)';
                ctx.fillRect(0, 0, WIDTH, HEIGHT);
        		processor.onaudioprocess = function (e) {
        			const left = e.inputBuffer.getChannelData(0);
        			const left16 = downsampleBuffer(left, 44100, 16000)
        			socket.emit('binaryData', left16);
                    
                    // Show analyzer 
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
        	});
        });
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
