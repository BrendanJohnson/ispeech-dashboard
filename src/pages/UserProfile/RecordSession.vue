<template>
    <card>
      	<h4 slot="header" class="card-title">
        	New Session
      	</h4>
      	<div>
      	   <div v-if="recordingNewSession" >
        		<canvas id="newRecordingCanvas" width="800" height="150"></canvas>
      		</div>
          <input type="file" @change="processFile($event)">
      		<b-button v-if="this.recordingNewSession" @click="stopRecordingSession">
      			<b-icon-pause-fill size="md" scale="1">
	        	</b-icon-pause-fill>
	        	Stop Recording

      		</b-button>
      		<b-button v-else @click="recordNewSession" variant="primary">
      			<b-icon-mic-fill size="md" scale="1">
	        	</b-icon-mic-fill>
	        	Start Recording
	        </b-button>  
          <b-button @click="testXmlGeneration" variant="primary">
            
            XML
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
  import { BIcon, BButtonToolbar, BIconFilePlus, BIconMic, BIconMicFill, BIconPauseFill, BIconStar, BIconStarFill } from 'bootstrap-vue'
  import Card from 'src/components/Cards/Card.vue'
  import { mapState } from 'vuex'
  import moment from 'moment'
  import io from 'socket.io-client'
  import * as tf from '@tensorflow/tfjs'
  import store from '../../store'
  import eafUtil from '../../eafUtil'
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
      BIconPauseFill,
      BIconStar,
      BButtonToolbar,
      BIconStarFill,
      Card
    },
    data () {
      return {
        audioData: null,
      	editingRow: null,
      	input: null,
      	context: null,
        mic: null,
      	processor: null,
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

      this.socket.on('timestampsResult', timestamps => {
          console.log(timestamps);
          this.generateXml(timestamps);



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
             
                //items[0].transcript = speechRecognitionResults.join(' ');

           
      })
      this.socket.on('NLPData', data => {
          console.log('RECEIVE NLP');
          

           
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
      testXmlGeneration() {
        const json = '[{"speaker":"adult","startTime":0.128,"endTime":1.48},{"speaker":"adult","startTime":1.48,"endTime":3.044},{"speaker":"child","startTime":3.044,"endTime":6.72},{"speaker":"child","startTime":10.192,"endTime":13.652},{"speaker":"adult","startTime":13.652,"endTime":15.184},{"speaker":"child","startTime":15.184,"endTime":19.488}]';
      
        const xmlString = eafUtil.timestampsToXml(JSON.parse(json));
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
    		track.stop();
    		this.input.disconnect(processor);
    		processor.disconnect(context.destination);
    		
        context.close().then(function () {
    			//processor = null;
    		  //context = null;
          socket.emit('endGoogleCloudStream', '');
    		});
      },
      stopRecordAudio() {
        this.mic.stop();
        const spectrogramTensor = this.audioData.spectrogram;
        spectrogramTensor.print();
        const waveformTensor = this.audioData.waveform;
        waveformTensor.print();
      },
      processFile(event) {
        const fftLength = 512;
        const frameLength = 400;
        const frameStep = 160;
        const sampleRate = 16000;
      
        this.readBlob(event.target.files[0], buffer => {
            const sourceAudioBuffer = buffer;
            const left = sourceAudioBuffer.getChannelData(0);
            const left16 = downsampleBuffer(left, 44100, sampleRate)
            const data = new Float32Array(left16);
            
            // Use Tensorflow to perform sftf
            console.time('fft')
            const x = tf.tensor1d(data); //.reshape([-1, ...recognizer.modelInputShape().slice(1));
            const stfts = tf.signal.stft(x, frameLength, frameStep, fftLength);
            console.timeEnd('fft')
           
            const stftsMagnitude = tf.transpose(tf.abs(stfts))
            const tensorData = stftsMagnitude.dataSync();
          
        });
      },
      readBlob(blob, cb) {
        const reader = new FileReader();
        const audioContext = new AudioContext();
        reader.onload = function(ev) {
            //reader.readAsArrayBuffer(ev.target.result).then(cb);
            // Decode audio
            audioContext.decodeAudioData(ev.target.result).then(cb);
        };

        reader.readAsArrayBuffer(blob);
      },
      recordNewSession() {
      	  const bufferSize = 512; //2048;
          this.recordingStartTime = Date.now();

          this.recordingNewSession = true;
          this.$nextTick(() => {
        	    let canvasElement = document.getElementById('newRecordingCanvas');
        	    let canvasWidth = canvasElement.parentNode.parentElement.clientWidth;
        	    canvasElement.width = canvasWidth;
        	    let HEIGHT = 150;
        	    let WIDTH = canvasWidth;
              let ctx = canvasElement.getContext("2d");
      	      this.socket.emit('startGoogleCloudStream', '');
      	      this.streamingAudio = true;
    		      const AudioContext = window.AudioContext || window.webkitAudioContext;
        		  const context = new AudioContext({
        			  latencyHint: 'interactive',
        		  });
              const analyser = context.createAnalyser();
            	const processor = context.createScriptProcessor(bufferSize, 1, 1);
            	this.context = context;
            	this.processor = processor; 
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
        		  this.input = input;
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
        		  
              processor.onaudioprocess = e => {
        			    const left = e.inputBuffer.getChannelData(0); // This will contain the same amount of samples as the buffer size
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
