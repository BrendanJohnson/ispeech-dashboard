# iSpeech Dashboard

## :rocket: Getting Started

1. Type `npm install` in the source folder where `package.json` is located
2. Type `npm run dev` to start the development server
3. If this doesn't work might need to downgrade CoreJS using `npm install --save core-js@2`

The repo uses [vue-cli](https://github.com/vuejs/vue-cli) scaffolding which takes care of the development setup with webpack and all the necessary modern tools to make web development faster and easier.

## :hammer: Build

### Build for production with minification
`npm run build`
### Run unit tests
`npm run unit`
### Run and watch unit tests
`npm run unit:watch`

## :rocket: Deployment

### Submit a build to Google Cloud
`gcloud builds submit --tag gcr.io/ispeech-brendan/ispeech-dashboard`

### Deploy build to Google Cloud Run
`gcloud run deploy --image gcr.io/ispeech-brendan/ispeech-dashboard --platform managed --region us-central1`




