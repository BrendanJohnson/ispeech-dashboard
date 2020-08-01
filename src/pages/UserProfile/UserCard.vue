<template>
  <card class="card-user">
    <img slot="image" src="img/markus-spiske-ipYwpFUwC-I-unsplash_400_300.jpg" alt="..."/>
    <div class="author">
      <a href="#">
        <img class="avatar border-gray" src="img/faces/face-0.jpg" alt="..."/>

        <h4 class="title">Siu Ming<br />
          <small>Age: 3 years, 2 months</small>
        </h4>
      </a>
    </div>
    <p class="description text-center"> "The Queen has no heart" <br>
      "我想請你搵返啲嘢食" <br>
      "他這個阿姨告訴granny和戴白帽子的叔叔"
    </p>
  </card>
</template>
<script>
  import Card from 'src/components/Cards/Card.vue'
  export default {
    components: {
      Card
    },
    data () {
      return {
        details: [
          {
            title: '12',
            subTitle: 'Files'
          },
          {
            title: '2GB',
            subTitle: 'Used'
          },
          {
            title: '24,6$',
            subTitle: 'Spent'
          }
        ]
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
