// --- State & Audio Context ---
let audioCtx = null;
let masterGain = null;

// Solfeggio State
let solfeggioOsc = null;
let solfeggioGain = null;
let solfeggioActive = true;
let currentSolfeggioFreq = 528;
let solfeggioVolume = 0.5;
let solfeggioWaveform = 'sine';

// Binaural State
let binauralOscL = null;
let binauralOscR = null;
let binauralGain = null;
let binauralActive = false;
let carrierFreq = 200;
let beatFreq = 6; // Theta
let binauralVolume = 0.3;

// Master State
let masterVolume = 0.4;
let isPlaying = false;

// Timer State
let timerSeconds = 0;
let timerInterval = null;
let isTimerRunning = false;

// Visualizer State
let canvas, ctx;
let visualMode = 'mandala';
let animationFrameId = null;
let phaseAngle = 0;

// DOM Elements
const playBtn = document.getElementById('global-play-btn');
const playText = document.getElementById('play-text');
const masterVolInput = document.getElementById('master-vol');
const activeFreqBadge = document.getElementById('active-freq-badge');

const solfeggioEnable = document.getElementById('solfeggio-enable');
const solfeggioVolInput = document.getElementById('solfeggio-vol');
const solfeggioVolVal = document.getElementById('solfeggio-vol-val');
const solfeggioWaveSelect = document.getElementById('solfeggio-wave');
const freqButtons = document.querySelectorAll('.freq-btn');

const binauralEnable = document.getElementById('binaural-enable');
const carrierFreqInput = document.getElementById('carrier-freq');
const carrierVal = document.getElementById('carrier-val');
const bwaveButtons = document.querySelectorAll('.bwave-btn');
const binauralVolInput = document.getElementById('binaural-vol');
const binauralVolVal = document.getElementById('binaural-vol-val');

const presetButtons = document.querySelectorAll('.btn-preset');

const timerDisplay = document.getElementById('timer-display');
const timerToggle = document.getElementById('timer-toggle');
const timerReset = document.getElementById('timer-reset');
const visualModeSelect = document.getElementById('visual-mode');

// --- Initialization ---
function initAudio() {
    if (audioCtx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();

    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(masterVolume, audioCtx.currentTime);
    masterGain.connect(audioCtx.destination);
}

function startSession() {
    initAudio();
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    if (isPlaying) {
        stopAllNodes();
        isPlaying = false;
        playText.textContent = 'Start Session';
        playBtn.classList.remove('btn-primary');
        activeFreqBadge.textContent = 'Idle';
    } else {
        startAllNodes();
        isPlaying = true;
        playText.textContent = 'Stop Session';
        playBtn.classList.add('btn-primary');
        updateActiveBadge();
    }
}

// --- Audio Graph Construction ---
function startAllNodes() {
    if (!audioCtx) return;
    stopAllNodes();

    // 1. Solfeggio Oscillator
    if (solfeggioActive) {
        solfeggioOsc = audioCtx.createOscillator();
        solfeggioGain = audioCtx.createGain();

        solfeggioOsc.type = solfeggioWaveform;
        solfeggioOsc.frequency.setValueAtTime(currentSolfeggioFreq, audioCtx.currentTime);
        solfeggioGain.gain.setValueAtTime(solfeggioVolume, audioCtx.currentTime);

        solfeggioOsc.connect(solfeggioGain);
        solfeggioGain.connect(masterGain);
        solfeggioOsc.start();
    }

    // 2. Binaural Beats (Stereo Split)
    if (binauralActive) {
        binauralGain = audioCtx.createGain();
        binauralGain.gain.setValueAtTime(binauralVolume, audioCtx.currentTime);

        const merger = audioCtx.createChannelMerger(2);

        binauralOscL = audioCtx.createOscillator();
        binauralOscR = audioCtx.createOscillator();

        binauralOscL.type = 'sine';
        binauralOscR.type = 'sine';

        const leftFreq = carrierFreq - (beatFreq / 2);
        const rightFreq = carrierFreq + (beatFreq / 2);

        binauralOscL.frequency.setValueAtTime(leftFreq, audioCtx.currentTime);
        binauralOscR.frequency.setValueAtTime(rightFreq, audioCtx.currentTime);

        binauralOscL.connect(merger, 0, 0); // Left channel
        binauralOscR.connect(merger, 0, 1); // Right channel

        merger.connect(binauralGain);
        binauralGain.connect(masterGain);

        binauralOscL.start();
        binauralOscR.start();
    }
}

function stopAllNodes() {
    if (solfeggioOsc) {
        try { solfeggioOsc.stop(); solfeggioOsc.disconnect(); } catch (e) {}
        solfeggioOsc = null;
    }
    if (solfeggioGain) {
        solfeggioGain.disconnect();
        solfeggioGain = null;
    }
    if (binauralOscL) {
        try { binauralOscL.stop(); binauralOscL.disconnect(); } catch (e) {}
        binauralOscL = null;
    }
    if (binauralOscR) {
        try { binauralOscR.stop(); binauralOscR.disconnect(); } catch (e) {}
        binauralOscR = null;
    }
    if (binauralGain) {
        binauralGain.disconnect();
        binauralGain = null;
    }
}

function updateActiveBadge() {
    if (!isPlaying) {
        activeFreqBadge.textContent = 'Idle';
        return;
    }
    let parts = [];
    if (solfeggioActive) parts.push(`${currentSolfeggioFreq}Hz`);
    if (binauralActive) parts.push(`Binaural ${beatFreq}Hz`);
    activeFreqBadge.textContent = parts.length > 0 ? parts.join(' + ') : 'Muted';
}

// --- UI Event Listeners ---
playBtn.addEventListener('click', startSession);

masterVolInput.addEventListener('input', (e) => {
    masterVolume = parseFloat(e.target.value);
    if (masterGain && audioCtx) {
        masterGain.gain.setValueAtTime(masterVolume, audioCtx.currentTime);
    }
});

// Solfeggio Controls
solfeggioEnable.addEventListener('change', (e) => {
    solfeggioActive = e.target.checked;
    if (isPlaying) startAllNodes();
    updateActiveBadge();
});

freqButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        freqButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentSolfeggioFreq = parseInt(btn.getAttribute('data-freq'), 10);
        if (isPlaying && solfeggioActive && solfeggioOsc) {
            solfeggioOsc.frequency.setValueAtTime(currentSolfeggioFreq, audioCtx.currentTime);
        }
        updateActiveBadge();
    });
});

solfeggioVolInput.addEventListener('input', (e) => {
    solfeggioVolume = parseFloat(e.target.value);
    solfeggioVolVal.textContent = Math.round(solfeggioVolume * 100) + '%';
    if (solfeggioGain && audioCtx) {
        solfeggioGain.gain.setValueAtTime(solfeggioVolume, audioCtx.currentTime);
    }
});

solfeggioWaveSelect.addEventListener('change', (e) => {
    solfeggioWaveform = e.target.value;
    if (isPlaying) startAllNodes();
});

// Binaural Controls
binauralEnable.addEventListener('change', (e) => {
    binauralActive = e.target.checked;
    if (isPlaying) startAllNodes();
    updateActiveBadge();
});

carrierFreqInput.addEventListener('input', (e) => {
    carrierFreq = parseInt(e.target.value, 10);
    carrierVal.textContent = carrierFreq;
    if (isPlaying && binauralActive) startAllNodes();
});

bwaveButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        bwaveButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        beatFreq = parseInt(btn.getAttribute('data-beat'), 10);
        if (isPlaying && binauralActive) startAllNodes();
        updateActiveBadge();
    });
});

binauralVolInput.addEventListener('input', (e) => {
    binauralVolume = parseFloat(e.target.value);
    binauralVolVal.textContent = Math.round(binauralVolume * 100) + '%';
    if (binauralGain && audioCtx) {
        binauralGain.gain.setValueAtTime(binauralVolume, audioCtx.currentTime);
    }
});

// Presets
presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const preset = btn.getAttribute('data-preset');
        applyPreset(preset);
    });
});

function applyPreset(name) {
    // Turn on audio if off
    if (!isPlaying) {
        startSession();
    }

    if (name === 'deep-focus') {
        solfeggioEnable.checked = true; solfeggioActive = true;
        setSolfeggioFreq(528);
        binauralEnable.checked = true; binauralActive = true;
        setBinauralBeat(10);
    } else if (name === 'deep-sleep') {
        solfeggioEnable.checked = true; solfeggioActive = true;
        setSolfeggioFreq(417);
        binauralEnable.checked = true; binauralActive = true;
        setBinauralBeat(2);
    } else if (name === 'pineal-activation') {
        solfeggioEnable.checked = true; solfeggioActive = true;
        setSolfeggioFreq(963);
        binauralEnable.checked = true; binauralActive = true;
        setBinauralBeat(6);
    } else if (name === 'chakra-balance') {
        solfeggioEnable.checked = true; solfeggioActive = true;
        setSolfeggioFreq(396);
        binauralEnable.checked = true; binauralActive = true;
        setBinauralBeat(6);
    } else if (name === 'clear') {
        solfeggioEnable.checked = true; solfeggioActive = true;
        setSolfeggioFreq(528);
        binauralEnable.checked = false; binauralActive = false;
    }

    if (isPlaying) startAllNodes();
    updateActiveBadge();
}

function setSolfeggioFreq(freq) {
    currentSolfeggioFreq = freq;
    freqButtons.forEach(b => {
        if (parseInt(b.getAttribute('data-freq')) === freq) b.classList.add('active');
        else b.classList.remove('active');
    });
}

function setBinauralBeat(beat) {
    beatFreq = beat;
    bwaveButtons.forEach(b => {
        if (parseInt(b.getAttribute('data-beat')) === beat) b.classList.add('active');
        else b.classList.remove('active');
    });
}

// --- Timer Functionality ---
timerToggle.addEventListener('click', () => {
    if (isTimerRunning) {
        clearInterval(timerInterval);
        isTimerRunning = false;
        timerToggle.textContent = 'Resume Timer';
    } else {
        isTimerRunning = true;
        timerToggle.textContent = 'Pause Timer';
        timerInterval = setInterval(() => {
            timerSeconds++;
            updateTimerDisplay();
        }, 1000);
    }
});

timerReset.addEventListener('click', () => {
    clearInterval(timerInterval);
    isTimerRunning = false;
    timerSeconds = 0;
    updateTimerDisplay();
    timerToggle.textContent = 'Start Timer';
});

function updateTimerDisplay() {
    const mins = Math.floor(timerSeconds / 60);
    const secs = timerSeconds % 60;
    timerDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// --- Cymatic Visualizer Canvas ---
function initCanvas() {
    canvas = document.getElementById('cymatic-canvas');
    ctx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    animateVisualizer();
}

function resizeCanvas() {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
}

visualModeSelect.addEventListener('change', (e) => {
    visualMode = e.target.value;
});

function animateVisualizer() {
    const width = canvas.width / window.devicePixelRatio;
    const height = canvas.height / window.devicePixelRatio;

    ctx.fillStyle = '#070a12';
    ctx.fillRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    const speed = isPlaying ? (currentSolfeggioFreq / 800) : 0.2;
    phaseAngle += 0.02 * speed;

    if (visualMode === 'mandala') {
        drawMandala(centerX, centerY);
    } else if (visualMode === 'waveform') {
        drawWaveform(width, height);
    } else if (visualMode === 'particles') {
        drawParticles(centerX, centerY);
    }

    animationFrameId = requestAnimationFrame(animateVisualizer);
}

function drawMandala(cx, cy) {
    const petals = 8;
    const maxRadius = Math.min(cx, cy) * 0.75;
    const intensity = isPlaying ? (solfeggioVolume + binauralVolume) : 0.2;

    ctx.save();
    ctx.translate(cx, cy);

    for (let i = 0; i < petals; i++) {
        ctx.rotate((Math.PI * 2) / petals);
        ctx.beginPath();
        
        const r = maxRadius * (0.6 + 0.4 * Math.sin(phaseAngle + i));
        const cp1x = r * 0.5;
        const cp1y = r * 0.5 * Math.sin(phaseAngle);
        
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(cp1x, cp1y, r, r * 0.5, 0, r);
        ctx.bezierCurveTo(-r, r * 0.5, -cp1x, cp1y, 0, 0);
        
        const hue = (currentSolfeggioFreq / 1000) * 360 + (i * 20);
        ctx.fillStyle = `hsla(${hue}, 80%, 60%, ${0.1 + intensity * 0.2})`;
        ctx.fill();
        ctx.strokeStyle = `hsla(${hue}, 90%, 70%, ${0.3 + intensity * 0.4})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }

    // Center pulsing core
    ctx.beginPath();
    const coreRadius = 20 + 10 * Math.sin(phaseAngle * 3);
    ctx.arc(0, 0, coreRadius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(56, 189, 248, ${0.4 + intensity * 0.5})`;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
}

function drawWaveform(width, height) {
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#38bdf8';

    const sliceWidth = width / 100;
    let x = 0;

    for (let i = 0; i < 100; i++) {
        const v = Math.sin((i / 10) + phaseAngle * 2) * (isPlaying ? 40 * solfeggioVolume : 10);
        const y = (height / 2) + v * Math.sin(phaseAngle + i * 0.05);

        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
        x += sliceWidth;
    }
    ctx.stroke();
}

function drawParticles(cx, cy) {
    const count = 50;
    const maxR = Math.min(cx, cy) * 0.8;

    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + phaseAngle;
        const dist = (Math.sin(phaseAngle + i) * 0.5 + 0.5) * maxR;
        const x = cx + Math.cos(angle) * dist;
        const y = cy + Math.sin(angle) * dist;

        ctx.beginPath();
        ctx.arc(x, y, isPlaying ? 3 : 1.5, 0, Math.PI * 2);
        ctx.fillStyle = i % 2 === 0 ? '#38bdf8' : '#c084fc';
        ctx.fill();
    }
}

// Run initialization
window.addEventListener('DOMContentLoaded', () => {
    initCanvas();
    updateTimerDisplay();
});
