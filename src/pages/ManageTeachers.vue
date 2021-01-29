<template>
  <div class="content">
  
<div class="container">
  <b-card v-for="teacher in teachers" :key="teacher.id" bg-variant="light">
    <b-form-group
      label-cols-lg="3"
      label="Teacher Profile"
      label-size="lg"
      label-class="font-weight-bold pt-0"
      class="mb-0"
    >
      	<b-form-group
        	label-cols-sm="3"
        	label="Name:"
        	label-align-sm="right"
        	label-for="nested-street"
     	>
        	<b-form-input id="nested-street" v-model="teacher.name"></b-form-input>
      	</b-form-group>
    </b-form-group>
     <table class="table">
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Audio file name</th>
            <th scope="col">Language</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(feature, index) in teacher.features" :key="feature.name">
            <th scope="row">{{ index + 1 }}</th>
            <td>{{ feature.name }}</td>
            <td>{{ feature.language }}</td>
          </tr>
        </tbody>
      </table>
      	<div v-if="processingFeatures && audioDistributedProcessing" class="text-center">
            <div class="container">
                <div>Analyzing audio file...</div>
                <b-spinner variant="primary" label="Text Centered"></b-spinner>
            </div>
        </div>
        <div v-if="processingFeatures && audioProgressMax" class="text-center">
            <div class="container">
              <div>Analyzing audio file...</div>
              <b-progress :value="audioProgress" :max="audioProgressMax" show-progress animated></b-progress> 
            </div>
      	</div>
        <div v-if="processingSession && uploadingAudio && audioUploadFileSize" class="text-center">
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
      <b-form-group 
      	label-cols-lg="3"
      	label="Add Teacher Audio Data"
      	label-size="lg"
      	label-class="font-weight-bold pt-0"
      	class="mb-0">
        	<select v-model="selectedLanguage" class="custom-select col-sm-2" id="language-select">
              <option value="en-GB">English</option>
              <option selected value="yue-Hant-HK">Cantonese</option>
              <option value="zh-TW">Mandarin</option>
            </select>
	        <div class="input-group-append">
	          <b-form-file v-model="uploadFile"></b-form-file>
	          <button class="btn btn-outline btn-primary" @click="processFile(teacher)">Upload</button>
	        </div>
    	</b-form-group>
  </b-card>
  <div class="mx-auto">
    <b-button variant="primary" @click="newTeacher" class="float-right">New Teacher</b-button>
  </div>
</div>
  </div>
</template>
<script>
  import ChartCard from 'src/components/Cards/ChartCard.vue'
  import StatsCard from 'src/components/Cards/StatsCard.vue'
  import LTable from 'src/components/Table.vue'
  import SocketIOFileUpload from 'socketio-file-upload';
  import io from 'socket.io-client'
  import { mapState } from 'vuex'
  import store from '../store'

  export default {
    components: {
      LTable,
      ChartCard,
      StatsCard
    },
    computed: {
      ...mapState(['children', 'teachers'])
    },
    created () {
    	store.dispatch('loadTeachers')
    },
    data () {
      return {
        audioDistributedProcessing: false,
        audioProgress: 0,
        processingFeatures: false,
        selectedLanguage: 'yue-Hant-HK',
        socket: null,
        uploadFile: null,
        uploadingAudio: false,
	    audioProgressFileSize: 0,
	    audioProgressMax: null,
	    audioUploadFileSize: null
      }
    },
    mounted() {
      	console.log('Establishing socket connection with: ' + process.env.VUE_APP_API_URL);

    	this.socket = io.connect(process.env.VUE_APP_API_URL);
	      this.socket.on('connect', function () {
	        console.log('connected!');
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

	    this.socket.on('audioDistributedProcessingStart', ()=>{
	        this.audioDistributedProcessing = true;
	    });

	    this.socket.on('audioDistributedProcessingEnd', ()=>{
        	this.audioDistributedProcessing = false;
      	})

      	this.socket.on('audioProcessingProgress', data => {
        	this.audioProgress = data.filesProcessed + 1;
      	});
    },
    methods: {
        deleteChild(child) {
          store.dispatch('deleteChild', child)
        },
        newTeacher() {
          store.dispatch('addChild')
        },
        processFile(teacher) {         
	        const uploader = new SocketIOFileUpload(this.socket);

	        uploader.addEventListener('complete', (data)=> {
	          store.dispatch('createTeacherFeature', {
	            teacherId: teacher.id,
	            language: this.selectedLanguage,
	            name: this.uploadFile.name
	          }).then((session)=> {

	            const processingOptions = {
	                filename: this.uploadFile.name,
	                analysisMode: 'custom',
	                speakerId: teacher.id,
	                speakerType: 'adult'
	            };

	            this.$nextTick(() => {
	                  this.socket.emit('startProcessingFeatureAudio', processingOptions);
	                  this.processingFeatures = true;
	            })
	          })
	        })
	        uploader.submitFiles([this.uploadFile])

        },
      	saveChild(child) {
      		store.dispatch('updateChild', child)
      	},
        changeChild(child) {
          store.dispatch('setChild', child)
        }
    }
  }
</script>
<style>

</style>
