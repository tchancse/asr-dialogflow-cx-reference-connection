'use strict'

//--------

require('dotenv').config()

const express = require('express');
const bodyParser = require('body-parser')
const app = express();
const expressWs = require('express-ws')(app);
const { Readable } = require('stream');

app.use(bodyParser.json());

//---- HTTP client

const webHookRequest = require('request');

const reqHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
};

//------------

// this is used with the heroku one-click install.
// if you are running locally, use GOOGLE_APPLICATION_CREDENTIALS to point to the file location
// let config = null;
// if (process.env.GOOGLE_APPLICATION_CREDENTIALS === undefined) {
//   config = {
//     projectId: 'nexmo-extend',
//     credentials: {
//       client_email: process.env.GOOGLE_CLIENT_EMAIL,
//       private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
//     }
//   }
// }

//-- Google Speech-to-Text
const speech = require('@google-cloud/speech');

//-- Google Dialogflow CX
const {SessionsClient} = require('@google-cloud/dialogflow-cx');

const projectId = process.env.GCLOUD_PROJECT_ID;
const location = process.env.DF_AGENT_LOCATION;
const agentId = process.env.DF_AGENT_ID;

const language = process.env.DF_LANGUAGE;

const dfApiServer = location + '-dialogflow.googleapis.com';

const sttEncoding = 'LINEAR16'; // NEVER modify

const sampleRateHertz = 16000; // NEVER modify

// const dfCxEncoding = 'AUDIO_ENCODING_LINEAR_16'; // NEVER modify
const outputEncoding = 'OUTPUT_AUDIO_ENCODING_LINEAR_16'; // NEVER modify

//----------------------------------------------------

function reqCallback(error, response, body) {

  if (error != null) {
    console.log("Webhook call status to VAPI application:");
    // console.log("response:", response);
    console.log("error:", error);
    // console.log("body:", body);
  };
}

//-----------------------------------------------------

async function detectIntentText(query, uuid, webhookUrl, dfSessionPath, dfClient, websocket) {
  
  const sessionId = uuid;
  
  const request = {
    session: dfSessionPath,
    queryInput: {
      text: {
        text: query,
      },
      languageCode: language
    },
    outputAudioConfig: {
      audioEncoding: outputEncoding,
      sampleRateHertz: sampleRateHertz
    }
  };
  
  // const [response] = await client.detectIntent(request);

  let [response] = [];
  
  try {
    [response] = await dfClient.detectIntent(request);
  } catch(err) {
    console.error(">>>> Error DF CX detectIntent:", err)
  };

  if ([response] != []){
    
    console.log('[response]:', [response]);

    // const userQuery = response.queryResult.transcript;  // audio query
    const userQuery = response.queryResult.text;  // text query

    let agentResponse = '';
    for (const message of response.queryResult.responseMessages) {
      // console.log(">>> message:", message);
      if (message.text) {
        agentResponse = agentResponse + message.text.text[0];
      }
    }
    
    let matchedIntent = ''
    if (response.queryResult.match.intent) {
        matchedIntent = response.queryResult.match.intent.displayName;
    }
    
    const currentPage = response.queryResult.currentPage.displayName;

    const result = {
      'uuid': uuid,
      'userQuery': userQuery,
      'agentResponse': agentResponse,
      'matchedIntent': matchedIntent,
      'currentPage': currentPage
    };     

    console.log("result:", JSON.stringify(result));

    console.log('webhookUrl:', webhookUrl);

    const reqOptions = {
      uri: webhookUrl,
      method: 'POST',
      headers: reqHeaders,
      body: JSON.stringify(result)
    };

    webHookRequest(reqOptions, reqCallback);

    try {
      
      const timerIds = app.get(`playtimers_${uuid}`) || [];
      for (const timerId of timerIds) {
        clearTimeout(timerId);
      };

      if ( response.outputAudio.byteLength > 0 ) {

        console.log(">>> Playback in progress for websocket:", uuid);
        
        // Send Dialogflow audio response to caller via websocket
        console.log("Sending back audio bytes:", response.outputAudio.byteLength);
        const replyAudio = response.outputAudio;

        const frames = replyAudio.length / 640;
        let pos = 0;
        const timerIds = [];
        
        for (let i = 0; i < frames + 1; i++) {
          const newpos = pos + 640;
          const data = replyAudio.slice(pos, newpos);
          
          timerIds.push(setTimeout(function () {
            if (websocket.readyState === 1) {  // Send data only if websocket is up
              websocket.send(data);
            }
          }, i * 20))  // Send a frame every 20 ms
          
          pos = newpos;
        }

        app.set(`playtimers_${uuid}`, timerIds);

      }
    } catch (e) {
      console.log("WebSocket resonse error:", e);
    }

  }
  else {
    console.log(">>> Empty response")
  }  

}

//-----------

app.ws('/socket', async (ws, req) => {

  const originalUuid = req.query.original_uuid; 
  const webhookUrl = req.query.webhook_url;

  console.log('>>> websocket connected with original call uuid:', originalUuid);
  console.log('>>> webhookUrl:', webhookUrl);


  // -- Google STT client
  const client = new speech.SpeechClient();

  const request ={
    config: {
      encoding: sttEncoding,    // never change  
      sampleRateHertz: sampleRateHertz,  // never change
      audioChannelCount: 1,
      languageCode: 'en-US',
      // maxAlternatives: 6, // do not add this parameter
      model: 'command_and_search',
      useEnhanced: true,
      profanityFilter: true,
      // speechContexts: [
      //     {
      //       "phrases": ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z", "0", "1", "2", "two", "to", "do", "3", "three", "free", "4", "for", "four", "5", "6", "7", "8", "9", "zero"]
      //     }
      //   ],
      enableSpeakerDiarization: false,  
      metadata: {
              "interactionType": 'VOICE_COMMAND',
              "microphoneDistance": 'NEARFIELD',
              "originalMediaType": 'AUDIO',
              "recordingDeviceType": 'PHONE_LINE'
          },  
      },
      interimResults: false
  };

  //-- Google DF CX client
  const dfClient = new SessionsClient({apiEndpoint: dfApiServer});

  const sessionPath = dfClient.projectLocationAgentSessionPath(
    projectId,
    location,
    agentId,
    originalUuid   // aka DF CX sessionId
  );

  console.log('sessionPath:', sessionPath);

  let transcript = "";

  //-- Google STT
  const recognizeStream = client
  .streamingRecognize(request)
  .on('error', console.error)
  .on('data', data => {
    // console.log(
    //   `Transcription: ${data.results[0].alternatives[0].transcript}`
    // );
    transcript = data.results[0].alternatives[0].transcript;

    console.log(
      // "Received payload from Google ASR:\n",
      // "original uuid:", uuid,
      // "\n",
      // data.results[0],
      // "\n",

      "transcript:", transcript, "\n\n"

    );

    detectIntentText(transcript, originalUuid, webhookUrl, sessionPath, dfClient, ws);
 
  });

  ws.on('message', (msg) => {
    if (typeof msg === "string") {
      let config = JSON.parse(msg);
    } else {
      recognizeStream.write(msg);
    }

  });

  ws.on('close', () => {
    recognizeStream.destroy();
  })
});

//-------------

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Connecting server application listening on port ${port}!`))
