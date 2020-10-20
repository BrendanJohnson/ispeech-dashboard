import { Bar, mixins } from 'vue-chartjs'
const { reactiveProp } = mixins

export default {
  extends: Bar,
  mixins: [reactiveProp],
 props: {
      chartOptions: {
        type: Object,
      },
      height: {
      	type: Number,
      	default: 250
      }
  },
  mounted () {
    this.renderChart(this.chartData, this.chartOptions)
  }
}