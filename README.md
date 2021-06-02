# iSpeech Dashboard

## :bulb: Getting Started

1. Type `npm install` in the source folder where `package.json` is located
2. Type `npm run dev` to start the local development server
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
`gcloud run deploy --image gcr.io/ispeech-brendan/ispeech-dashboard --platform managed --region us-central1 --memory 256Mi`



## :book: How to Use

### Processing Audio 
To process audio click on the "New Session" button:
![alt text](https://github.com//iSpeechAPAC/ispeech-dashboard/blob/master/new_session.jpg?raw=true)

## :cloud: Cloud configuration

### Cloud Bucket configuration
In order to access XML manifests stored in Google Cloud, CORS needs to be setup on the GCS bucket.
After authentication with your Google Account, use gsutil to execute the following command with the provided cors.json:
`gsutil cors set cors.json gs://ispeech-manifests`

### Installation of gcloud CLI
Normally the gcloud tool should be installed using the instructions at https://cloud.google.com/sdk/docs/quickstart.

On MacOS there maybe an error after trying to run the init.sh script due to the installed version of the openssl library being wrong (usually too new). The following commands helped to fix the issue:   

1. Install an older version of openssl using Homebrew:
```
brew uninstall openssl
brew tap-new $USER/old-openssl
brew extract --version=1.0.2t openssl $USER/old-openssl
brew install openssl@1.0.2t
```
Note that the first time I ran this there was an error due to needing to access Github to download the version, I remedied this by first running `export HOMEBREW_NO_GITHUB_API=1` which sets an environment variable.

2. Create a symlink to point to the Tap installed by Homebrew: `ln -s /usr/local/opt/openssl@1.0.2t /usr/local/opt/openssl`

