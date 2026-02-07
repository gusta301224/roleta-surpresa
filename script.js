const prizes = [
  {
    label: '🍧 Açaí',
    description: 'Um açaí caprichado com tudo que você ama: leite em pó, morango e muito carinho.',
    color: '#FF8EB0',
  },
  {
    label: '🍣 Sushi',
    description: 'Um jantar japonês delicioso para curtirmos juntinhos e brindar nosso amor.',
    color: '#B897FF',
  },
  {
    label: '🍔 Lanche',
    description: 'Aquele lanche perfeito, com refri e sobremesa para uma noite divertida.',
    color: '#73D7FF',
  },
  {
    label: '🍫 Chocolate',
    description: 'Uma seleção especial de chocolates para adoçar ainda mais seu dia.',
    color: '#FFD77A',
  },
  {
    label: '🎁 Presente surpresa',
    description: 'Uma surpresa pensada com amor — do jeitinho que você merece.',
    color: '#7EF2C2',
  },
  {
    label: '💖 Você escolhe',
    description: 'Hoje quem manda é você! Escolha o presente e eu realizo com alegria.',
    color: '#FFA7F6',
  },
];

const wheel = document.getElementById('wheel');
const spinBtn = document.getElementById('spin-btn');
const statusEl = document.getElementById('status');
const resultTitleEl = document.getElementById('result-title');
const resultDescriptionEl = document.getElementById('result-description');
const resultCard = document.getElementById('result-card');

let currentRotation = 0;
let spinning = false;
let audioCtx;
let spinOscillators = [];

buildWheel();
setupConfetti();

spinBtn.addEventListener('click', spinWheel);

function buildWheel() {
  const slices = prizes.length;
  const angle = 360 / slices;
  const gradientStops = prizes
    .map((prize, index) => `${prize.color} ${index * angle}deg ${(index + 1) * angle}deg`)
    .join(', ');

  wheel.style.background = `conic-gradient(${gradientStops})`;

  const radius = Math.min(window.innerWidth * 0.15, 88);

  prizes.forEach((prize, index) => {
    const label = document.createElement('span');
    label.className = 'segment-label';
    const baseAngle = index * angle + angle / 2;
    label.style.transform = `translate(-50%, -50%) rotate(${baseAngle}deg) translateY(-${radius}px) rotate(${-baseAngle}deg)`;
    label.textContent = prize.label;
    wheel.appendChild(label);
  });
}


function ensureAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function stopSpinSound() {
  if (!audioCtx) return;
  spinOscillators.forEach(({ osc, gain }) => {
    const now = audioCtx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setTargetAtTime(0.0001, now, 0.08);
    osc.stop(now + 0.22);
  });
  spinOscillators = [];
}

function playSpinSound(durationMs = 5600) {
  ensureAudioContext();
  stopSpinSound();

  const noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 2, audioCtx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * 0.5;
  }

  const noise = audioCtx.createBufferSource();
  noise.buffer = noiseBuffer;
  noise.loop = true;

  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 450;
  filter.Q.value = 0.9;

  const gain = audioCtx.createGain();
  gain.gain.value = 0.0001;

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);

  const now = audioCtx.currentTime;
  gain.gain.exponentialRampToValueAtTime(0.08, now + 0.15);
  gain.gain.exponentialRampToValueAtTime(0.03, now + durationMs / 1000);

  noise.start(now);
  noise.stop(now + durationMs / 1000 + 0.35);

  spinOscillators.push({ osc: noise, gain });
}

function playWinSound() {
  ensureAudioContext();
  const now = audioCtx.currentTime;

  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, idx) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = idx % 2 === 0 ? 'triangle' : 'sine';
    osc.frequency.value = freq;

    const start = now + idx * 0.08;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.16, start + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.32);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(start);
    osc.stop(start + 0.36);
  });
}

function spinWheel() {
  if (spinning) return;

  ensureAudioContext();
  spinning = true;
  spinBtn.disabled = true;
  statusEl.textContent = 'Girando... preparando a surpresa! 💫';
  playSpinSound(5600);

  const extraTurns = 360 * (5 + Math.floor(Math.random() * 2));
  const randomOffset = Math.floor(Math.random() * 360);
  const finalRotation = currentRotation + extraTurns + randomOffset;

  wheel.style.transform = `rotate(${finalRotation}deg)`;

  setTimeout(() => {
    const normalized = ((finalRotation % 360) + 360) % 360;
    const pointerAngle = (360 - normalized + 270) % 360;
    const selectedIndex = Math.floor(pointerAngle / (360 / prizes.length)) % prizes.length;
    const selectedPrize = prizes[selectedIndex];

    resultTitleEl.textContent = `${selectedPrize.label}`;
    resultDescriptionEl.textContent = selectedPrize.description;
    statusEl.textContent = `Resultado: ${selectedPrize.label}. Que momento especial! ✨`;

    resultCard.classList.remove('pulse');
    void resultCard.offsetWidth;
    resultCard.classList.add('pulse');

    stopSpinSound();
    playWinSound();
    launchConfetti();

    currentRotation = finalRotation;
    spinning = false;
    spinBtn.disabled = false;
  }, 5700);
}

function setupConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  const ctx = canvas.getContext('2d');
  let confetti = [];

  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };

  resize();
  window.addEventListener('resize', resize);

  function createPiece() {
    return {
      x: Math.random() * canvas.width,
      y: -20,
      size: 5 + Math.random() * 7,
      speedY: 2 + Math.random() * 3,
      speedX: -1 + Math.random() * 2,
      color: ['#FF6FA3', '#FFD166', '#7EF2C2', '#73D7FF', '#FFFFFF'][Math.floor(Math.random() * 5)],
      rotation: Math.random() * Math.PI,
      rotationSpeed: Math.random() * 0.2,
    };
  }

  window.launchConfetti = () => {
    confetti = Array.from({ length: 180 }, createPiece);
  };

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    confetti.forEach((piece) => {
      piece.y += piece.speedY;
      piece.x += piece.speedX;
      piece.rotation += piece.rotationSpeed;

      ctx.save();
      ctx.translate(piece.x, piece.y);
      ctx.rotate(piece.rotation);
      ctx.fillStyle = piece.color;
      ctx.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size);
      ctx.restore();
    });

    confetti = confetti.filter((piece) => piece.y < canvas.height + 25);
    requestAnimationFrame(draw);
  }

  draw();
}

function launchConfetti() {
  if (typeof window.launchConfetti === 'function') {
    window.launchConfetti();
  }
}
