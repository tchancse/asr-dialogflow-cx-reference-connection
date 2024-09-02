# Google STT/Dialogflow CX reference connection code

You can use this STT/Dialogflow CX reference connection code to connect a Vonage Voice API call to a Dialogflow CX (DF CX) agent and then have an audio conversation with the agent. Caller's queries and agent's responses transcripts are posted back to the Vonage Voice API application.

## About this reference connection code

STT/Dialogflow CX reference connection makes use of the [WebSockets feature](https://developer.vonage.com/en/voice/voice-api/concepts/websockets) of Vonage Voice API. When a voice call is established, a Voice API application triggers a WebSocket connection to this Dialogflow reference connection and streams the audio to and from the voice call in real time.

See https://github.com/nexmo-se/asr-dialogflow-cx-sample-voice-application for a **sample Voice API application** using this reference connection code to connect voice calls to a DF CX agent.

## Transcripts

This reference connection code will send caller's speech transcript, and Dialogflow agent's response transcript to the Voice API application via webhook calls.

## Enabling APIs on your Google project

Using your Google Cloud Console, on your corresponding Google project, make sure that the **Cloud Speech-to-Text API** and **Dialogflow API** are enabled.

## Dialogflow CX agent

You may already have a DF CX agent ready, if not, please create one that will be used for the purpose here.

For the next sections, we will need (a) the corresponding Google Cloud Project ID, (b) the Google Application Credentials JSON file (actual credentials file name has ".json" extension), (c) the Dialogflow CX agent location, and (d) the Dialogflow CX agent ID.

- To retrieve the Google Cloud Project ID:</br>
Go to https://console.cloud.google.com, select the relevant project, under Project info section, you will see the Project ID, we will use that value to set the parameter **GCLOUD_PROJECT_ID** in the next sections,</br></br>

- To retrieve the application credentials:</br>
click on the top left corner (3-vertical bars named Navigation Menu)</br>
select APIs Services > Credentials</br>
click on [+ CREATE CREDENTIALS] Service account</br>
enter a name for 'Service account name' , e.g. *VonageDFCX*</br>
click [CREATE AND CONTINUE]</br>
under Select a role dropdown menu, select Owner (note: role permissions are outside the scope of this README)</br>
click [CONTINUE]</br>
click [DONE]</br>
click on the service account you just created</br>
click on [KEYS]</br>
click on [ADD KEY] Create new key</br>
select JSON as key type</br>
click on CREATE</br>
save that key file (ending with .json) on your computer and add a leading dot to the filename (e.g. .xxxx.json), it will need to be copied to this application folder once installed from this repository</br>
that key file name is the value, e.g. *.VonageDFCX-05768e59b7c5.json*,  
we will use that value to set the parameter **GOOGLE_APPLICATION_CREDENTIALS** in the next sections.</br></br>

- To retrieve the Dialogflow CX agent location:</br>
Go to https://dialogflow.cloud.google.com/cx, select the relevant project</br>
on the line showing your DF CX agent, the region name is displayed, e.g. *us-west1*</br>
we will use that value to set the parameter **DF_AGENT_LOCATION** in the next sections.</br></br>

- To retrieve the Dialogflow CX agent ID:</br>
on the line showing your DF CX agent, click on the 3-vertical dots,</br>
click on Copy name</br>
the last part of that character string after *agents/* is the agent ID</br>
e.g. *7b2598cf-9ed7-414e-8b6f-c1bf8f5dabf5*</br>
we will use that value to set the parameter **DF_AGENT_ID** in the next sections.</br></br>

## Running Dialogflow reference connection code

You deploy the Dialogflow reference connection code in one of the following couple of ways.

### Local deployment

#### Ngrok

[Download and install ngrok](https://ngrok.com/download), an Internet tunelling service.</br>
Sign in or sign up with [ngrok](https://ngrok.com/), from the menu, follow the **Setup and Installation** guide.

Set up a domain to forward to the local port 6000 (as this server application will be listening on port 6000).

Start ngrok to listen on port 6000,</br>
please take note of the ngrok **Enpoint URL** as it is needed when setting up the corresponding sample server application using Vonage Voice API,
that URL looks like:</br>
`https://yyyyyyyy.ngrok.io`

#### Node.js - Application

To run your own instance of this sample application locally, you'll need Node.js (we tested with version 18.19).

Download this sample application code to a local folder, then go to that folder.

Copy the `.env.example` file over to a new file called `.env`:
```bash
cp .env.example .env
```

Edit `.env` file, and set the first 4 parameter values:</br>
GCLOUD_PROJECT_ID=xxxxxx </br>
GOOGLE_APPLICATION_CREDENTIALS=.xxxxxxxxxxxxxxx.json</br>
DF_AGENT_LOCATION=xxxxxx<br>
DF_AGENT_ID=xxxxxxxxx<br>
DF_LANGUAGE=en<br>

Install dependencies once:
```bash
npm install
```

Launch the applicatiom:
```bash
node asr-df-cx-connecting-server
```

### Command Line Heroku deployment

You must first have deployed your application locally, as explained in previous section, and verified it is working.

Install [git](https://git-scm.com/downloads).

Install [Heroku command line](https://devcenter.heroku.com/categories/command-line) and login to your Heroku account.

If you do not yet have a local git repository, create one:</br>
```bash
git init
git add .
git commit -am "initial"
```

Start by creating this application on Heroku from the command line using the Heroku CLI:

```bash
heroku create myappname
```

Note: In above command, replace "myappname" with a unique name on the whole Heroku platform.

On your Heroku dashboard where your application page is shown, click on `Settings` button,
add the following `Config Vars` and set them with their respective values:</br>
GCLOUD_PROJECT_ID</br>
GOOGLE_APPLICATION_CREDENTIALS</br>
DF_AGENT_LOCATION<br>
DF_AGENT_ID<br>
DF_LANGUAGE<br>


Deploy the application:

```bash
git push heroku master
```
