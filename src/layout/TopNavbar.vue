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
            <a href="#" class="nav-link">
              <i class="nc-icon nc-zoom-split"></i>
              <span class="d-lg-block">&nbsp;Search</span>
            </a>
          </li>
        </ul>
        <ul class="navbar-nav ml-auto">
          <li class="nav-item">
            <a class="nav-link" href="#">
              Account: {{user.data.displayName}}
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
  import { mapGetters } from "vuex";
  import firebase from "firebase";

  export default {
    computed: {
      routeName () {
        const {name} = this.$route
        return this.capitalizeFirstLetter(name)
      },
      ...mapGetters({
        user: "user"
      })
    },
    data () {
      return {
        activeNotifications: false
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
       }
    }
  }

</script>
<style>

</style>
