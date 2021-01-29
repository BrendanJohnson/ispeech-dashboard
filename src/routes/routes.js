import DashboardLayout from '../layout/DashboardLayout.vue'
// GeneralViews
import NotFound from '../pages/NotFoundPage.vue'

// Admin pages
import ChildProfile from 'src/pages/ChildProfile.vue'
import Login from 'src/pages/Login.vue'
import ManageTeachers from 'src/pages/ManageTeachers.vue'
import Dashboard from 'src/pages/Dashboard.vue'
import Register from 'src/pages/Register.vue'
import NewSession from 'src/pages/NewSession.vue'
import UserProfile from 'src/pages/UserProfile.vue'
import TableList from 'src/pages/TableList.vue'
import Typography from 'src/pages/Typography.vue'
import Icons from 'src/pages/Icons.vue'
import Maps from 'src/pages/Maps.vue'
import Notifications from 'src/pages/Notifications.vue'
import Upgrade from 'src/pages/Upgrade.vue'

const routes = [
  {
    path: '/',
    component: DashboardLayout,
    redirect: '/admin/dashboard'
  },
  {
    path: '/login',
    component: Login,
    meta: {
      guest: true
    }
  },
  {
    path: '/register',
    component: Register
  },
  {
    path: '/admin',
    component: DashboardLayout,
    redirect: '/admin/dashboard',
    meta: {
      auth: true
    },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: Dashboard
      },
      {
        path: 'profile',
        name: 'Profile',
        component: ChildProfile
      },
      {
        path: 'teachers',
        name: 'Teachers',
        component: ManageTeachers
      },
      {
        path: 'newsession',
        name: 'New Session',
        component: NewSession
      },
      {
        path: 'sessions',
        name: 'Sessions',
        component: UserProfile
      },
      {
        path: 'table-list',
        name: 'Table List',
        component: TableList
      },
      {
        path: 'typography',
        name: 'Typography',
        component: Typography
      },
      {
        path: 'icons',
        name: 'Icons',
        component: Icons
      },
      {
        path: 'maps',
        name: 'Maps',
        component: Maps
      },
      {
        path: 'notifications',
        name: 'Notifications',
        component: Notifications
      }
    ]
  },
  { path: '*', component: NotFound }
]

/**
 * Asynchronously load view (Webpack Lazy loading compatible)
 * The specified component must be inside the Views folder
 * @param  {string} name  the filename (basename) of the view to load.
function view(name) {
   var res= require('../components/Dashboard/Views/' + name + '.vue');
   return res;
};**/

export default routes
