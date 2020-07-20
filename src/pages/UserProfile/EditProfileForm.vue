<template>
  <card>
    <h4 slot="header" class="card-title">
     Session 1: 9 July 2019
    </h4>
    <div id="waveform" ref="waveform">
      <!-- Here be the waveform -->
    </div>
    <div id="wave-timeline" ref="wave-timeline">
      <!--时间轴 -->
    </div>
    <div>

          <button class="btn btn-primary" @click="playMusic">
      <i class="glyphicon glyphicon-play"></i>
      Play
      /
      <i class="glyphicon glyphicon-pause"></i>
      Pause
    </button>
  </div>
    </div>
    <div id="annotations" class="table-responsive">
      <!-- Here be transcript -->
    </div>
  </card>
</template>
<script>
  import Card from 'src/components/Cards/Card.vue'
  import WaveSurfer from 'wavesurfer.js'
  import Regions from 'wavesurfer.js/dist/plugin/wavesurfer.regions.js'
  import Timeline from 'wavesurfer.js/dist/plugin/wavesurfer.timeline.js'
  import Elan from 'wavesurfer.js/dist/plugin/wavesurfer.elan.js'

  export default {
    components: {
      Card
    },
    data () {
      return {
        wavesurfer: null,
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
    this.$nextTick(() => {
          this.wavesurfer = WaveSurfer.create({
            container: this.$refs.waveform,
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

              Elan.create({
                  container: '#annotations',
                  url: 'https://storage.googleapis.com/ispeech-bucket/EAF/manifest.eaf.xml', 
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
                    credentials: "include",
                    headers: [
                      { key: "cache-control", value: "no-cache" },
                      { key: "pragma", value: "no-cache" }
                    ]
                  }
          });
        // Proxy actually points to https://storage.googleapis.com/ispeech-bucket/raw_audio
          this.wavesurfer.load('/audio/putonghua_030120_slice.mp3');

          var wavesurfer = this.wavesurfer;
          wavesurfer.elan.on('select', function (start, end) {
            wavesurfer.backend.play(start, end);
          });

          var prevAnnotation, prevRow, region;
          var onProgress = function (time) {
                  var annotation = wavesurfer.elan.getRenderedAnnotation(time);
                  if (prevAnnotation != annotation) {
                      prevAnnotation = annotation;
                      region && region.remove();
                      region = null;

                      if (annotation) {
                          // Highlight annotation table row
                          var row = wavesurfer.elan.getAnnotationNode(annotation);
                          prevRow && prevRow.classList.remove('table-success');
                          prevRow = row;
                          row.classList.add('table-success');
                          var before = row.previousSibling;
                          if (before) {
                              wavesurfer.elan.container.scrollTop = before.offsetTop;
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
          };

          var onElanReady = function() {
            for (var i = 0; i <= wavesurfer.elan.renderedAlignable.length; i++) {
                var region = wavesurfer.elan.renderedAlignable[i]
                if (region) {
                  wavesurfer.addRegion({
                                start: region.start,
                                end: region.end,
                                resize: false,
                                drag: false,
                                color: (region.value == 'adult') ? 'rgba(29, 200, 234, 0.3)' : 'rgba(234, 29, 200, 0.3)'
                  });
                }
            }
          }

          var onRegionClick = function(region) {
            wavesurfer.play(region.start)
          }

          this.wavesurfer.on('audioprocess', onProgress);
          this.wavesurfer.elan.on('ready', onElanReady);
          this.wavesurfer.on('region-click', onRegionClick);

        })
    },
    methods: {
      updateProfile () {
        alert('Your data: ' + JSON.stringify(this.user))
      },
      playMusic() {
      //"播放/暂停"按钮的单击触发事件，暂停的话单击则播放，正在播放的话单击则暂停播放
      this.wavesurfer.playPause.bind(this.wavesurfer)()

    }
    }
  }

</script>
<style>

</style>
