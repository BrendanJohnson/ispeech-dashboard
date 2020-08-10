<template>
  <div class="content">
    <div class="container-fluid">
      <div class="row">
        <div class="col-xl-3 col-md-6">
          <stats-card>
            <div slot="header" class="icon-warning">
              <i class="nc-icon nc-chart text-warning"></i>
            </div>
            <div slot="content">
              <p class="card-category">Sessions</p>
              <h4 class="card-title">{{stats.noOfSessions}}</h4>
            </div>
            <div slot="footer">
               <div class="stats">
                <i class="fa fa-history"></i> Last session 27 July 2020
              </div>
            </div>
          </stats-card>
        </div>
        <div class="col-xl-3 col-md-6">
          <stats-card>
            <div slot="header" class="icon-success">
              <i class="nc-icon nc-headphones-2 text-success"></i>
            </div>
            <div slot="content">
              <p class="card-category">Total child speech time</p>
              <h4 class="card-title">{{[stats.totals.childSpeechDuration, 'seconds'] | duration('humanize')}}</h4>
            </div>
            <div slot="footer">
              <div class="stats">
                <i class="fa fa-history"></i> Last updated 2 days ago 
              </div>
            </div>
          </stats-card>
        </div>
        <div class="col-xl-3 col-md-6">
          <stats-card>
            <div slot="header" class="icon-danger">
              <i class="nc-icon nc-vector text-danger"></i>
            </div>
            <div slot="content">
              <p class="card-category">Total words detected</p>
              <h4 class="card-title">{{stats.totals.totalTranscriptWords}}</h4>
            </div>
            <div slot="footer">
              <div class="stats">
                <i class="fa fa-history"></i> Last updated 2 days ago 
              </div>
            </div>
          </stats-card>
        </div>
      </div>
      <div class="row">
        <div class="col-md-8">
          <chart-card :chart-data="lineChart.data"
                      :chart-options="lineChart.options"
                      :responsive-options="lineChart.responsiveOptions">
            <template slot="header">
              <h4 class="card-title">Child/Adult Ratio</h4>
              <p class="card-category">Percentage of time the child speaks in the session</p>
               <hr>
            </template>
            <template slot="footer">
              <div class="legend">
                <i class="fa fa-circle text-info"></i> % Speech time
                <i class="fa fa-circle text-danger"></i> % Turns
              </div>
              <hr>
              <div class="stats">
                <i class="fa fa-history"></i> Updated 3 minutes ago
              </div>
            </template>
          </chart-card>
        </div>
                <div class="col-md-4">
          <card>
            <template slot="header">
               <h4 class="card-title">Recommendations</h4>
            </template>
            <l-table :data="tableData.data"
                     :columns="tableData.columns">
              <template slot="columns"></template>

              <template slot-scope="{row}">
                <td>
                  <base-checkbox v-model="row.checked"></base-checkbox>
                </td>
                <td>{{row.title}}</td>
                <td class="td-actions text-right">
                  <button type="button" class="btn-simple btn btn-xs btn-info" v-tooltip.top-center="editTooltip">
                    <i class="fa fa-edit"></i>
                  </button>
                  <button type="button" class="btn-simple btn btn-xs btn-danger" v-tooltip.top-center="deleteTooltip">
                    <i class="fa fa-times"></i>
                  </button>
                </td>
              </template>
            </l-table>

          </card>

        </div>
      </div>

      <div class="row">

        <div class="col-md-8">
          <chart-card
            :chart-data="barChart.data"
            :chart-options="barChart.options"
            :chart-responsive-options="barChart.responsiveOptions"
            chart-type="Bar">
            <template slot="header">
              <h4 class="card-title">No. of Utterances</h4>
              <p class="card-category">All sessions to date</p>
              <hr>
              <b-badge pill variant="primary" style="margin: 2px; background-color: rgba(234, 29, 200, 0.3);">Child</b-badge>

                <b-badge pill variant="secondary"  style="margin: 2px; background-color: #1DC8EA;">Adult</b-badge>
            </template>
          </chart-card>

        </div>

        <div class="col-md-4">
          <chart-card :chart-data="pieChart.data" chart-type="Pie">
            <template slot="header">
              <h4 class="card-title">Langauge Spoken</h4>
              <p class="card-category">Over all sessions (by time)</p>
            </template>
            <template slot="footer">
              <hr>
              <div class="stats">
                <i class="fa fa-history"></i> Last updated 2 days ago
              </div>
            </template>
          </chart-card>
        </div>
      </div>
    </div>
  </div>
</template>
<script>
  import { mapState } from 'vuex'
  import moment from 'moment'
  import ChartCard from 'src/components/Cards/ChartCard.vue'
  import StatsCard from 'src/components/Cards/StatsCard.vue'
  import LTable from 'src/components/Table.vue'

  export default {
    components: {
      LTable,
      ChartCard,
      StatsCard
    },
    computed: {
      stats() {
        return {
            noOfSessions: this.$store.state.speechSessions.length,
            totals: this.$store.state.speechSessions.reduce((a,b) => {
              return { childSpeechDuration: a.childSpeechDuration + b.childSpeechDuration,
                      totalTranscriptWords: a.totalTranscriptWords + b.totalTranscriptWords
              };
            }),

          }
      },
      barChart() {
          var dateLabels = this.$store.state.speechSessions.map(session => {
            return moment(session.createdOn.toDate()).format("DD/MM/YYYY")
          })
          var childNoOfTurns = this.$store.state.speechSessions.map(session => {
            return session.childNoOfTurns
          })
          var adultNoOfTurns = this.$store.state.speechSessions.map(session => {
            return session.adultNoOfTurns
          })

         return {
          data: {
            labels: dateLabels,
            series: [
              childNoOfTurns,
              adultNoOfTurns
            ]
          },
          options: {
            classNames: {
              chart: 'ct-chart-utterances'
            },
            seriesBarDistance: 15,
            axisX: {
             showGrid: false,
              labelOffset: {
                x: 20
              }
             },
            height: '245px'
          },
          responsiveOptions: [
            ['screen and (max-width: 640px)', {
              seriesBarDistance: 5,
              axisX: {
                labelInterpolationFnc (value) {
                  return value[0]
                }
              }
            }]
          ]
          }
      },
      pieChart() {
        var languageMap = this.$store.state.speechSessions.reduce((entryMap, e) => entryMap.set(e.language, [...entryMap.get(e.language)||[], e]),
            new Map()
        );
        var languageComposition = Array.from(languageMap.values()).map((language)=>{
            return language.length
        })

        return {
          data: {
            labels: Array.from(languageMap.keys()),
            series: languageComposition
          }
        }
      },
      lineChart () {
        var dateLabels = this.$store.state.speechSessions.map(session => {
          return moment(session.createdOn.toDate()).format("DD/MM/YYYY")
        })
        var childSpeechPercentages = this.$store.state.speechSessions.map(session => {
          return Math.abs((session.childSpeechDuration / session.totalSpeechDuration) * 100)
        })
        var childTurnsPercentages = this.$store.state.speechSessions.map(session => {
          return Math.abs((session.childNoOfTurns / session.totalNoOfTurns) * 100)
        })
        console.log(childSpeechPercentages)
        return {
          data: {
            labels: dateLabels,
            series: [childSpeechPercentages, childTurnsPercentages]
          },
          options: {
            low: 0,
            high: 70,
            showArea: false,
            height: '245px',
            axisX: {
              showGrid: false
            },
            lineSmooth: true,
            showLine: true,
            showLabel: true,
            showPoint: true,
            fullWidth: true,
            chartPadding: {
              right: 35
            },
             axisX: {
              labelOffset: {
                x: -50
              }
             }
          },
          responsiveOptions: [
            ['screen and (max-width: 640px)', {
              axisX: {
                labelInterpolationFnc (value) {
                  return value[0]
                }
              }
            }]
          ]
          
        };
      }
    },
    data () {
      return {
        editTooltip: 'Edit Task',
        deleteTooltip: 'Remove',
        tableData: {
          data: [
            {title: 'Practice speaking in group class', checked: false},
            {title: 'More time spent reading stories', checked: false},
            {
              title: 'Another suggestion: tailored based on the analysis of the speaking patterns',
              checked: false
            }
          ]
        }
      }
    }
  }
</script>
<style>

</style>
