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
  <div>
    <b-table ref="annotationsTable" primary-key="alignable_id" sticky-header striped hover :items="items" :fields="fields" @row-clicked="clickRow"></b-table>
  </div>
    <div id="annotations" class="table-responsive" style="display:none;">
      <!-- Hidden as we want to use our own table -->
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
            key: 'transcript',
            label: 'Transcript',
            sortable: true
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
                    credentials: "omit",
                    headers: [
                      { key: "cache-control", value: "no-cache" },
                      { key: "pragma", value: "no-cache" }
                    ]
                  }
          });
        // Proxy actually points to https://storage.googleapis.com/ispeech-bucket/raw_audio
        //  this.wavesurfer.load('/audio/putonghua_030120_slice.mp3');
          this.wavesurfer.load('https://storage.googleapis.com/ispeech-bucket/raw_audio/putonghua_030120_slice.mp3');

          var wavesurfer = this.wavesurfer;

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
                    var transcript_data = wavesurfer.elan.data.tiers.map(function(tier) {
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

                    items.push({transcript: transcript_data[2][0], start_time: region.start, end_time: region.end, duration: region.end-region.start, alignable_id: alignable_id, speaker: region.value, isActive: true})
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
                  var row = rowFn(annotation.id);
                  prevRow && prevRow.classList.remove('table-success');
                  prevRow = row;
                  row.classList.add('table-success');
                  var before = row.previousSibling;
                  var after = row.nextSibling;
                  if (after && after.dataset) {
                    scrollFn(after.dataset.pk);
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

          this.wavesurfer.on('audioprocess', onProgressFactory(this.getRow, this.scrollToRow));
          this.wavesurfer.elan.on('ready', elanReadyFactory(wavesurfer, this.items));
          this.wavesurfer.on('region-click', onRegionClick);

        })
    },
    methods: {
      updateProfile () {
        alert('Your data: ' + JSON.stringify(this.user))
      },
      playMusic() {
        this.wavesurfer.playPause.bind(this.wavesurfer)()
      },
      clickRow(row) {
        console.log('clicked')
        console.log(row)
        this.wavesurfer.play(row.start_time)

      },
      getRow(key) {
        const tbody = this.$refs.annotationsTable.$el.querySelector('tbody')
        const row = tbody.querySelectorAll('tr[data-pk="' + key + '"]')[0];
        return row;
      },
      scrollToRow(key) {
        const tbody = this.$refs.annotationsTable.$el.querySelector('tbody')
        const row = tbody.querySelectorAll('tr[data-pk="' + key + '"]')[0];
        row.scrollIntoViewIfNeeded(false)
       // row.scrollIntoView()
      }

    }
  }

</script>
<style>

</style>
