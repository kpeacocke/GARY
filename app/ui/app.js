const componentMeta = {
  drums: { label: 'Drums', role: 'OpenShift service A' },
  bass: { label: 'Bass', role: 'RHEL / edge service' },
  synth: { label: 'Synth', role: 'OpenShift service B' },
  voice: { label: 'Voice / FX', role: 'Future AI-backed service' },
};

let state = null;
let audio = null;
let transport = { running: false, currentStep: 0, nextNoteTime: 0, timer: null, bar: 1 };
const bpm = 120;
const secondsPerStep = 60 / bpm / 4;
const scheduleAhead = 0.1;
const schedulerInterval = 25;

const $ = (sel) => document.querySelector(sel);
const componentsEl = $('#components');
const eventLog = $('#event-log');

function renderComponents() {
  componentsEl.innerHTML = Object.entries(componentMeta).map(([name, meta]) => `
    <article class="component ${state?.components?.[name] === 'failed' ? 'failed' : 'healthy'}" data-component="${name}">
      <div class="component-name">${meta.label}</div>
      <div class="component-role">${meta.role}</div>
      <div class="health"><span>HEALTH</span><strong>${(state?.components?.[name] || 'unknown').toUpperCase()}</strong></div>
      <div class="meter">${Array.from({ length: 10 }, () => '<i></i>').join('')}</div>
      <div class="actions">
        <button class="fail" data-action="fail">FAIL</button>
        <button class="recover" data-action="recover">RECOVER</button>
      </div>
    </article>`).join('');
}

async function fetchState() {
  const res = await fetch('/api/state', { cache: 'no-store' });
  state = await res.json();
  applyState();
}

function applyState() {
  if (!state) return;
  $('#gary-status').textContent = state.gary.toUpperCase();
  $('#continuity').textContent = String(state.beatContinuity).toUpperCase();
  renderComponents();
  if (audio) {
    for (const [name, status] of Object.entries(state.components)) {
      const target = status === 'healthy' ? 0.8 : 0.0001;
      const gain = audio.gains[name].gain;
      gain.cancelScheduledValues(audio.ctx.currentTime);
      gain.setTargetAtTime(target, audio.ctx.currentTime, 0.035);
    }
  }
}

async function updateComponent(name, action) {
  const res = await fetch(`/api/components/${name}/${action}`, { method: 'POST' });
  const body = await res.json();
  state = body.state;
  applyState();
  prependEvent(body.event);
}

function prependEvent(evt) {
  if (!evt) return;
  const line = `${evt.time.slice(11,19)}  ${evt.type}\n${evt.subject} → ${evt.data.status}`;
  eventLog.textContent = `${line}\n\n${eventLog.textContent}`.slice(0, 2200);
}

componentsEl.addEventListener('click', (e) => {
  const button = e.target.closest('button[data-action]');
  if (!button) return;
  const card = button.closest('[data-component]');
  updateComponent(card.dataset.component, button.dataset.action);
});

$('#reset').addEventListener('click', async () => {
  const res = await fetch('/api/reset', { method: 'POST' });
  state = await res.json();
  applyState();
  eventLog.textContent = 'All services restored. Nobody learned anything.';
});

function makeAudio() {
  const ctx = new AudioContext();
  const master = ctx.createGain();
  master.gain.value = 0.55;
  master.connect(ctx.destination);
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -12;
  compressor.ratio.value = 7;
  compressor.connect(master);

  const gains = {};
  for (const name of Object.keys(componentMeta)) {
    const gain = ctx.createGain();
    gain.gain.value = state?.components?.[name] === 'failed' ? 0.0001 : 0.8;
    gain.connect(compressor);
    gains[name] = gain;
  }
  return { ctx, master, compressor, gains };
}

function osc(time, duration, freq, destination, type = 'sine', volume = 0.15) {
  const o = audio.ctx.createOscillator();
  const g = audio.ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, time);
  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(volume, time + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  o.connect(g).connect(destination);
  o.start(time); o.stop(time + duration + 0.02);
}

function noise(time, duration, destination, volume = 0.08, highpass = 3500) {
  const length = Math.ceil(audio.ctx.sampleRate * duration);
  const buffer = audio.ctx.createBuffer(1, length, audio.ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  const src = audio.ctx.createBufferSource();
  const filter = audio.ctx.createBiquadFilter();
  filter.type = 'highpass'; filter.frequency.value = highpass;
  const gain = audio.ctx.createGain();
  gain.gain.setValueAtTime(volume, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  src.buffer = buffer; src.connect(filter).connect(gain).connect(destination);
  src.start(time); src.stop(time + duration);
}

function kick(time) {
  const o = audio.ctx.createOscillator();
  const g = audio.ctx.createGain();
  o.frequency.setValueAtTime(135, time);
  o.frequency.exponentialRampToValueAtTime(42, time + 0.13);
  g.gain.setValueAtTime(0.45, time);
  g.gain.exponentialRampToValueAtTime(0.0001, time + 0.18);
  o.connect(g).connect(audio.gains.drums); o.start(time); o.stop(time + 0.2);
}

function scheduleStep(step, time) {
  // Drums: 4/4 kick + snare + hats
  if ([0, 4, 8, 12].includes(step)) kick(time);
  if ([4, 12].includes(step)) noise(time, 0.16, audio.gains.drums, 0.19, 1300);
  if (step % 2 === 0) noise(time, 0.045, audio.gains.drums, 0.045, 5000);

  // Bass: simple minor ostinato
  const bassSeq = [55, 55, 65.41, 55, 73.42, 65.41, 55, 49];
  if (step % 2 === 0) osc(time, 0.2, bassSeq[(step / 2) % bassSeq.length], audio.gains.bass, 'sawtooth', 0.08);

  // Synth: off-beat arpeggio
  const arp = [220, 261.63, 329.63, 392, 329.63, 261.63, 246.94, 293.66];
  if (step % 2 === 1) osc(time, 0.12, arp[Math.floor(step / 2) % arp.length], audio.gains.synth, 'triangle', 0.06);

  // Voice/FX placeholder: airy accent on bars
  if (step === 0 || step === 8) {
    osc(time, 0.65, step === 0 ? 440 : 349.23, audio.gains.voice, 'sine', 0.035);
    noise(time, 0.5, audio.gains.voice, 0.025, 7000);
  }
}

function scheduler() {
  while (transport.nextNoteTime < audio.ctx.currentTime + scheduleAhead) {
    scheduleStep(transport.currentStep, transport.nextNoteTime);
    transport.currentStep += 1;
    if (transport.currentStep >= 16) { transport.currentStep = 0; transport.bar += 1; }
    transport.nextNoteTime += secondsPerStep;
  }
}

async function startTransport() {
  if (transport.running) return;
  if (!audio) audio = makeAudio();
  await audio.ctx.resume();
  transport.currentStep = 0;
  transport.bar = 1;
  transport.nextNoteTime = audio.ctx.currentTime + 0.08;
  transport.timer = setInterval(scheduler, schedulerInterval);
  transport.running = true;
  $('#play').disabled = true; $('#stop').disabled = false;
  $('#transport-dot').classList.add('live');
  $('#transport-text').textContent = 'TRANSPORT LIVE';
}

function stopTransport() {
  if (!transport.running) return;
  clearInterval(transport.timer);
  transport.running = false;
  $('#play').disabled = false; $('#stop').disabled = true;
  $('#transport-dot').classList.remove('live');
  $('#transport-text').textContent = 'TRANSPORT IDLE';
}

$('#play').addEventListener('click', startTransport);
$('#stop').addEventListener('click', stopTransport);

setInterval(() => {
  if (transport.running) {
    const beat = Math.floor(transport.currentStep / 4) + 1;
    $('#bar').textContent = transport.bar;
    $('#beat').textContent = beat;
  }
  document.querySelectorAll('.component.healthy .meter').forEach((meter) => {
    meter.querySelectorAll('i').forEach((bar) => {
      const height = 6 + Math.random() * 34;
      bar.style.height = `${height}px`;
      bar.classList.toggle('active', Math.random() > .15);
    });
  });
}, 100);

fetchState();
setInterval(fetchState, 1200);
