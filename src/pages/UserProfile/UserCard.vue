<template>
  <card class="card-user">
    <img slot="image" src="img/markus-spiske-ipYwpFUwC-I-unsplash_400_300.jpg" alt="..."/>
    <div class="author">
      <a href="#">
        <img class="avatar border-gray" src="img/faces/face-0.jpg" alt="..."/>

        <h4 class="title">{{currentChild.name}}<br />
          <small>Age: {{ new Date() | moment('diff', currentChild.dateOfBirth, 'year') }} years, {{ new Date() | moment('diff', currentChild.dateOfBirth, 'month') % 12 }} months </small>
        </h4>
      </a>
    </div>
    <p class="description text-center" >
      <span v-for="(quote, i) in currentChild.quotes">"{{quote}}"
      <br></span>
    </p>
  </card>
</template>
<script>
  import Card from 'src/components/Cards/Card.vue'
  import { mapState } from 'vuex'
  import store from '../../store'

  export default {
    components: {
      Card
    },
    computed: {
      ...mapState(['currentChild'])
    },
    data () {
      return {

      }
    },
    methods: {
      getClasses (index) {
        var remainder = index % 3
        if (remainder === 0) {
          return 'col-md-3 col-md-offset-1'
        } else if (remainder === 2) {
          return 'col-md-4'
        } else {
          return 'col-md-3'
        }
      }
    }
  }

</script>
<style>

</style>
