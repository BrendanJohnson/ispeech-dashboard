<template>
  <nav class="navbar navbar-expand-lg">
    <div class="container-fluid">
      <button type="button"
              class="navbar-toggler navbar-toggler-right"
              :class="{toggled: $sidebar.showSidebar}"
              aria-controls="navigation-index"
              aria-expanded="false"
              aria-label="Toggle navigation"
              @click="toggleSidebar">
        <span class="navbar-toggler-bar burger-lines"></span>
        <span class="navbar-toggler-bar burger-lines"></span>
        <span class="navbar-toggler-bar burger-lines"></span>
      </button>
      <div class="collapse navbar-collapse justify-content-end">
        <ul class="nav navbar-nav mr-auto">
          <li class="nav-item">
            <form @submit="submit" method="get" >
              <div>
                <input
                  v-model="searchText"
                  type="text"
                  name="search"
                  class="form-control"
                  placeholder="Search ..."
                >
              </div>
            </form>
          </li>
        </ul>
        <ul class="navbar-nav ml-auto">
          <li class="nav-item">
            <a v-if="currentChild" class="nav-link" href="#/admin/profile">
              Child: {{currentChild.name}}
            </a>
          </li>
          <li class="nav-item">
            <a href="#" class="nav-link" @click.prevent="signOut">
              Log out
            </a>
          </li>
        </ul>
      </div>
    </div>
  </nav>
</template>
<script>
  import { mapGetters, mapState } from "vuex";
  import firebase from "firebase";
  import store from '../store'

  export default {
    computed: {
      routeName () {
        const {name} = this.$route
        return this.capitalizeFirstLetter(name)
      },
      ...mapState(['currentChild']),
      ...mapGetters({
        user: "user"
      })
    },
    data () {
      return {
        activeNotifications: false,
        searchText: null
      }
    },
    methods: {
      capitalizeFirstLetter (string) {
        return string.charAt(0).toUpperCase() + string.slice(1)
      },
      toggleNotificationDropDown () {
        this.activeNotifications = !this.activeNotifications
      },
      closeDropDown () {
        this.activeNotifications = false
      },
      toggleSidebar () {
        this.$sidebar.displaySidebar(!this.$sidebar.showSidebar)
      },
      hideSidebar () {
        this.$sidebar.displaySidebar(false)
      },
      signOut() {
        firebase
          .auth()
          .signOut()
          .then(() => {
            this.$router.replace({
              name: "home"
            });
          });
       },
       submit(e) {
          e.preventDefault();
          store.dispatch('loadSpeechSessions', { limit: 5,  search: this.searchText })
             
       }

    }
  }

</script>
<style>

</style>
