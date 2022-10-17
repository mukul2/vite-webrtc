import './style.css';

import firebase from 'firebase/app';
import 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAoTmy1Cv5MJIdJmf5uuSzax94nQ7UuyC4",
  authDomain: "stahtohmlcrzxxz.firebaseapp.com",
  databaseURL: "https://stahtohmlcrzxxz-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "stahtohmlcrzxxz",
  storageBucket: "stahtohmlcrzxxz.appspot.com",
  messagingSenderId: "884501683260",
  appId: "1:884501683260:web:344b6bbd3f1559eb26f739"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}


var room = "";

var isCaller = 1;
const firestore = firebase.firestore();

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

// Global State
const pc = new RTCPeerConnection(servers);
let localStream = null;
let remoteStream = null;

// HTML elements
const webcamButton = document.getElementById('webcamButton');
const webcamVideo = document.getElementById('webcamVideo');
const callButton = document.getElementById('callButton');
const callInput = document.getElementById('callInput');
const answerButton = document.getElementById('answerButton');
const remoteVideo = document.getElementById('remoteVideo');
const hangupButton = document.getElementById('hangupButton');

async function startCam() {

  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);

   room = urlParams.get('room');

   isCaller = urlParams.get('isCaller');




  localStream = await navigator.mediaDevices.getUserMedia({ video: {
      width: { ideal: 4096 },
      height: { ideal: 2160 }
    } , audio: true});
  remoteStream = new MediaStream();

  // Push tracks from local stream to peer connection
  localStream.getTracks().forEach((track) => {
    pc.addTrack(track, localStream);
  });

  // Pull tracks from remote stream, add to video stream
  pc.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track);
    });
  };

  webcamVideo.srcObject = localStream;
  remoteVideo.srcObject = remoteStream;



  if (isCaller == 1) {
    console.log("im caller so offering")
    callOther();
  } else {
    console.log("im receiver so waiting")
    receiveCall();
  }
}


// 1. Setup media sources
startCam();
// 2. Create an offer

async  function callOther() {
  // Reference Firestore collections for signaling
  const callDoc = firestore.collection('calls').doc(room);
  const offerCandidates = callDoc.collection('offerCandidates');
  const answerCandidates = callDoc.collection('answerCandidates');



  // Get candidates for caller, save to db
  pc.onicecandidate = (event) => {
    event.candidate && offerCandidates.add(event.candidate.toJSON());
  };

  // Create offer
  const offerDescription = await pc.createOffer();
  await pc.setLocalDescription(offerDescription);

  const offer = {
    sdp: offerDescription.sdp,
    type: offerDescription.type,
  };

  await callDoc.set({ offer });

  // Listen for remote answer
  callDoc.onSnapshot((snapshot) => {
    const data = snapshot.data();
    if (!pc.currentRemoteDescription && data?.answer) {
      const answerDescription = new RTCSessionDescription(data.answer);
      pc.setRemoteDescription(answerDescription);
    }
  });

  // When answered, add candidate to peer connection
  answerCandidates.onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const candidate = new RTCIceCandidate(change.doc.data());
        pc.addIceCandidate(candidate);
      }
    });
  });


}

var localCam = true ;
tootoo.onclick = async () => {
  if(localCam){

    localCam = false ;

    var vidTrack = localStream.getVideoTracks();
    vidTrack.forEach(track =>
      track.enabled = false
     // track.stop();


    );

    tootoo.srcObject = "Turn On Camera" ;
    //document.getElementById("tootoo").value="Turn On Camera";

    // webcamVideo.srcObject = '';
  }else{

    var vidTrack = localStream.getVideoTracks();
    vidTrack.forEach(track =>

      track.enabled = true

    );

   // document.getElementById("tootoo").value="Turn Off Camera";
    tootoo.srcObject = "Turn Off Camera" ;
    localCam = true ;
   // webcamVideo.srcObject = localStream;
  }


}

async function receiveCall(){
  const callId = room;
  const callDoc = firestore.collection('calls').doc(callId);
  const answerCandidates = callDoc.collection('answerCandidates');
  const offerCandidates = callDoc.collection('offerCandidates');

  pc.onicecandidate = (event) => {
    event.candidate && answerCandidates.add(event.candidate.toJSON());
  };

  const callData = (await callDoc.get()).data();

  const offerDescription = callData.offer;
  await pc.setRemoteDescription(new RTCSessionDescription(offerDescription));

  const answerDescription = await pc.createAnswer();
  await pc.setLocalDescription(answerDescription);

  const answer = {
    type: answerDescription.type,
    sdp: answerDescription.sdp,
  };

  await callDoc.update({ answer });

  offerCandidates.onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      console.log(change);
      if (change.type === 'added') {
        let data = change.doc.data();
        pc.addIceCandidate(new RTCIceCandidate(data));
      }
    });
  });
}
