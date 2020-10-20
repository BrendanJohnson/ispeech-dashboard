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
              <p class="card-category">Sessions
              </p>
              <h4 class="card-title">{{stats.noOfSessions}}</h4>
            </div>
            <div slot="footer">
               <div class="stats">
                <i class="fa fa-history"></i> Last session {{stats.sessionDates[stats.sessionDates.length-1]}}
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
             
            </div>
          </stats-card>
        </div>
      </div>
      <div class="row">
        <div class="col-md-8">
          <div class="card" v-if="adultChildRatioData && !reloading">
            <div class="card-header">
              <h4 class="card-title">Child/Adult Ratio</h4>
              <p class="card-category">Percentage of time the child speaks in the session</p>
              <hr>
            </div>
            <div class="card-body">
              <line-chart height="240px" :chart-data="adultChildRatioData" :chart-options="adultChildRatioOptions"></line-chart>
        
            </div>
          </div>
          <div v-else>
            <h4>Loading session statistics...</h4>
          </div>
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
          <div class="card" v-if="utterancesData && !reloading">
            <div class="card-header">
              <h4 class="card-title">No. of Utterances</h4>
                <p class="card-category">All sessions to date</p>
                <hr>
            </div>
            <div class="card-body">
              <bar-chart :chart-data="utterancesData" :chart-options="utterancesOptions"></bar-chart>
            </div>
          </div>
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
  
  import { mapGetters } from 'vuex'
  import moment from 'moment'
  import store from '../store'
  import ChartCard from 'src/components/Cards/ChartCard.vue'
  import BarChart from 'src/components/Charts/BarChart.js'
  import LineChart from 'src/components/Charts/LineChart.js'
  import StatsCard from 'src/components/Cards/StatsCard.vue'
  import LTable from 'src/components/Table.vue'

  export default {
    components: {
      LTable,
      BarChart,
      ChartCard,
      LineChart,
      StatsCard
    },
    computed: {
      ...mapGetters({ stats: 'getStatistics' }),
      adultChildRatioOptions() {
        return {
                    responsive: true,
                    scales: {
                      xAxes: [{
                        type: 'time',
                         ticks: {
                                  autoSkip: true,
                                  maxTicksLimit: 7
                                },
                         time: {
                                 displayFormats: {
                                   'millisecond': 'MMM DD',
                                   'second': 'MMM DD',
                                   'minute': 'MMM DD',
                                   'hour': 'MMM DD',
                                   'day': 'MMM DD',
                                   'week': 'MMM DD',
                                   'month': 'MMM DD',
                                   'quarter': 'MMM DD',
                                   'year': 'MMM DD',
                                }
                         }
                      }] 
                    }
              };
      },

      adultChildRatioData() {
        if (this.stats && this.stats.adultChildRatio) {
          this.reloading = false;
          console.log('this.stats.adultChildRatio.speechPercentage')
          console.log(this.stats.adultChildRatio.combinedData)
          return {
            datasets: [
              {
                label: 'Child speech % (by time)',
                backgroundColor: '#1DC8EA',
                data: this.stats.adultChildRatio.speechPercentage,
              },
              {
                label: 'Child speech % (by turns)',
                backgroundColor: 'rgba(234, 29, 200, 0.3)',
                data: this.stats.adultChildRatio.turnsPercentage
              }
            ]
        }
        }
        else return null

      },
      utterancesData() {
        if (this.stats && this.stats.childNoOfTurns) {
          return {
            labels: this.stats.sessionDates,
            datasets: [{
              label: 'Child',
              backgroundColor: '#ffbff6',
              data: this.stats.childNoOfTurns
            },
            {
            label: 'Adult',
            backgroundColor: '#1DC8EA',
            data: this.stats.adultNoOfTurns
          }]
          }
        }
        else return null

      },
      utterancesOptions() {
        return {    
                    responsive: true,
                    indexAxis: 'y',

                    scales: {
                      xAxes: [{
                        stacked: true,
                        barThickness: 25,
                        offset: true,
                        display: true,

                        scaleLabel: {
                              display: true,
                              labelString: "Session Date",
                          }
                      }],
                      yAxes: [{
                        ticks: {
                          beginAtZero: true
                        }
                      }] 
                    }
              };
      },
      barChart() {
          var dateLabels = this.stats.speechSessions.map(session => {
            return moment(session.createdOn.toDate()).format("DD/MM/YYYY")
          })
          var childNoOfTurns = this.stats.speechSessions.map(session => {
            return session.childNoOfTurns
          })
          var adultNoOfTurns = this.stats.speechSessions.map(session => {
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
        return {
          data: {
            labels: this.stats.languages,
            series: this.stats.languageComposition
          }
        }
      }
    },
    mounted () {
      console.log('dispatched mounted()')
      this.reloading = true;
    },
    created () {
      console.log('dispatched created()')
      store.dispatch('loadSpeechSessions')
    },
    data () {
      return {
        editTooltip: 'Edit Task',
        deleteTooltip: 'Remove',
        reloading: false,
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
