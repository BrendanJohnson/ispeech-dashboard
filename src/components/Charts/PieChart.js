import { Doughnut, mixins } from 'vue-chartjs'
const { reactiveProp } = mixins

export default {
  extends: Doughnut,
  mixins: [reactiveProp],
   props: {
      chartOptions: {
        type: Object,
      },
      height: {
      	type: Number,
      	default: 100
      }
  },
  mounted () {
    this.renderChart(this.chartData, this.chartOptions)
  }
}