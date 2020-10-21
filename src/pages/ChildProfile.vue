<template>
  <div class="content">
  
<div class="container">
  <b-card v-for="child in children" :key="child.id" bg-variant="light">
    <b-form-group
      label-cols-lg="3"
      label="Child Profile"
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
        	<b-form-input id="nested-street" v-model="child.name"></b-form-input>
      	</b-form-group>
      	<b-form-group
      	    label-cols-sm="3"
        	label="Date of birth:"
        	label-align-sm="right"
        	label-for="ex-disabled-readonly"
     	>
          <b-form-datepicker v-model="child.dateOfBirth" :date-format-options="{ year: 'numeric', month: 'short', day: '2-digit'}" id="ex-disabled-readonly" :disabled="disabled" :readonly="readonly"></b-form-datepicker>
       </b-form-group> 
       
    </b-form-group>
    <div class="mx-auto">
      <b-button variant="primary" @click="changeChild(child)">Switch to child</b-button> 
   		<b-button variant="primary" class="float-right"  @click="saveChild(child)">Save changes</b-button> 
    </div>
  </b-card>
  <div class="mx-auto">
    <b-button variant="primary" @click="newChild" class="float-right">New Child</b-button>
  </div>
</div>
  </div>
</template>
<script>
  import ChartCard from 'src/components/Cards/ChartCard.vue'
  import StatsCard from 'src/components/Cards/StatsCard.vue'
  import LTable from 'src/components/Table.vue'
  import { mapState } from 'vuex'
  import store from '../store'

  export default {
    components: {
      LTable,
      ChartCard,
      StatsCard
    },
    computed: {
      ...mapState(['children'])
    },
    data () {
      return {
        editTooltip: 'Edit Task',
        deleteTooltip: 'Remove',
        pieChart: {
          data: {
            labels: ['English 27%','Mandarin 32%', 'Cantonese 41%' ],
            series: [27, 32, 41]
          }
        },
        lineChart: {
          data: {
            labels: ['29/06/2020', '02/07/2020', '22/07/2020', '27/07/2020'],
            series: [
              [43, 42, 32, 42],
              [33, 49, 48, 51]
            ]
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
        },
        barChart: {
          data: {
            labels: ['29/06/2020', '02/07/2020', '22/07/2020', '27/07/2020'],
            series: [
              [42, 50, 20, 58],
              [50, 59, 42, 72]
            ]
          },
          options: {
            classNames: {
              chart: 'ct-chart-utterances'
            },
            seriesBarDistance: 10,
            axisX: {
             showGrid: false,
              labelOffset: {
                x: 30
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
        },
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
    },
    methods: {
        newChild() {
          store.dispatch('addChild')
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
