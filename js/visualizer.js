// thanks to mdn/voice-change-o-matic and


// TODOL refactor into module and use more callnacks to avoid globals

// audio variables
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const analyser = audioCtx.createAnalyser();
const analyserLeft = audioCtx.createAnalyser();
const analyserRight = audioCtx.createAnalyser();
// CREATE analyserLeft and analyserRight
let audioSource; // audio source
let audioBuffer;

// canvas variables
const canvas = document.querySelector('.visualizer');
const canvasCtx = canvas.getContext("2d");
const intendedWidth = document.querySelector('#app').clientWidth;
canvas.setAttribute('width', intendedWidth);
const HEIGHT = canvas.height;
const WIDTH = canvas.width;

let animationId; // requestAnimationFrame Id to cancel

// METHODS

// load audio into buffer
function initSound(arrayBuffer) {
    audioCtx.decodeAudioData(arrayBuffer, function(buffer) {
    // audioBuffer is global to reuse the decoded audio later.
    audioBuffer = buffer;
    const buttons = document.querySelectorAll('button');
    buttons[0].disabled = false;
    buttons[1].disabled = false;
  }, function(e) {
    console.log('Error decoding file', e);
  });
}

function stopSound() {
  if (audioSource) {
    audioSource.stop(0);
  }
  // TODO make cleanup function
  //cancelAnimationFrame(animationId );
  canvasCtx.fillStyle = 'rgb(0, 0, 0)';
  canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
}

function playSound() {
    audioSource = audioCtx.createBufferSource(2);
    audioSource.buffer = audioBuffer;
    audioSource.loop = false;
    // split the signal. the idea is to analyze each side and compare values.
    let splitChannels = audioCtx.createChannelSplitter(2);
    audioSource.connect(splitChannels);
    /*
    let gainNode = audioCtx.createGain();
    gainNode.gain.value = 0.01;

    splitChannels.connect(gainNode, 0);

    // Connect the splitter back to the second input of the merger: we
    let merger = audioCtx.createChannelMerger(2);
    gainNode.connect(merger, 0, 0);
    splitChannels.connect(merger, 0, 1);
    */

    //audioSource.connect(analyser);
    // Connect each channel to each analyzer
    splitChannels.connect(analyserLeft, 0);
    splitChannels.connect(analyserRight, 1);

    audioSource.connect(audioCtx.destination);
    audioSource.start(0);
}

// read file into array
const fileInput = document.querySelector('input[type="file"]');

fileInput.addEventListener('change', function(e) {
  const reader = new FileReader();
  reader.onload = function(e) {
    initSound(this.result);
  };
  reader.readAsArrayBuffer(this.files[0]);
}, false);


function visualize() {
    analyserLeft.fftSize = 512;
    analyserRight.fftSize = 512;
    analyserLeft.smoothingTimeConstant = 0.25;
    analyserRight.smoothingTimeConstant = 0.25;

    let bufferLengthAlt = analyserLeft.frequencyBinCount;
    const dataArrayAltLeft = new Uint8Array(bufferLengthAlt);
    const dataArrayAltRight = new Uint8Array(bufferLengthAlt);

    canvasCtx.fillStyle = "rgba(0, 0, 0, 1)";
    canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

    //canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
    // draw lines
    canvasCtx.strokeStyle = "white";
    canvasCtx.fillStyle = "white";
    //canvasCtx.lineWidth = 1;
    canvasCtx.font = "10px Arial";

    // get rid of the top bins
    const rollOffBins = 80;
    bufferLengthAlt = bufferLengthAlt - rollOffBins;

    let sectionHeight = HEIGHT/bufferLengthAlt;
    let numSections = Math.floor(HEIGHT/sectionHeight);
    let binWidth = 44100/analyserLeft.fftSize/2;

    for (let i=0; i < numSections; i++){
        canvasCtx.beginPath();
        canvasCtx.moveTo(60, i*sectionHeight);
        canvasCtx.lineTo(70, i*sectionHeight);
        if ( i % 4 === 0) {
            canvasCtx.stroke();
            canvasCtx.fillText(`${i*binWidth}`, 2, HEIGHT-i*sectionHeight);
        }
    }

    const drawRoutine = function() {
      animationId = requestAnimationFrame(drawRoutine);
      analyserLeft.getByteFrequencyData(dataArrayAltLeft);
      analyserRight.getByteFrequencyData(dataArrayAltRight);

      // fade out canvas
      canvasCtx.fillStyle = "rgba(0, 0, 0, 0.7)";
      canvasCtx.fillRect(70, 0, WIDTH, HEIGHT);

      const drawWidth = WIDTH/2 - 100;
      const drawHeight= Math.floor(sectionHeight * 0.95);


      for(let i = 0; i < bufferLengthAlt; i++) {
        amplitudeLeft = dataArrayAltLeft[i]/255;  // convert to 0-1
        amplitudeRight = dataArrayAltRight[i]/255;  // convert to 0-1
        canvasCtx.fillStyle = 'aliceblue';
        canvasCtx.fillRect(
            (WIDTH/2 - 1) - (amplitudeLeft * drawWidth),
            HEIGHT-(i*sectionHeight),
            amplitudeLeft * drawWidth,
            amplitudeLeft * drawHeight
        );
        canvasCtx.fillStyle = 'yellow';
        canvasCtx.fillRect(
            WIDTH/2 + 1,
            HEIGHT-(i*sectionHeight),
            amplitudeRight * drawWidth,
            amplitudeRight * drawHeight
        );
      }

      /*
      bar graph
      const barWidth = (WIDTH / bufferLengthAlt) * 2.5;
      // 2.5 is an offset to hide some of the unused spectrum.
      // this could be handled more elegantly

      let amplitude;
      let barHeight;
      let startX = 0;
      let startY;

      for(let i = 0; i < bufferLengthAlt; i++) {
        amplitude = dataArrayAlt[i]/255;  // convert to 0-1
        barHeight = amplitude*HEIGHT; // scale to canvas height

        //COLOR
        canvasCtx.fillStyle = 'rgb(' + (amplitude*255) + ',50,50)';

        // draw a bar
        startY = HEIGHT-barHeight/2; // start at middle and draw down
        canvasCtx.fillRect(startX, startY, barWidth, 5);
        startX += barWidth + 1; // move to next bar's startX


      }
      */
    };
    // call draw function first time
    drawRoutine();
}

//start visualizer
visualize();
