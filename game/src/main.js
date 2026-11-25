// Boot and the one loop: clicks and keys are read every frame, the world
// advances in fixed 1/60 s steps (several in a slow frame, none in a fast
// one), and the renderer paints what is there. The game moves between four
// screens: title, play, paused and game over.
//
// ?seed=N fixes the order pattern. ?shot=start|play|end (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import {
  EVENT_BURNT,
  EVENT_COOKED,
  EVENT_OVER,
  EVENT_SERVED,
  EVENT_WALKOUT,
  EVENT_WRONG,
  createWorld,
} from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, true);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes and each serving.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Memasak! Pesanan pertama sudah datang.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    audio.fanfare();
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(`Shift selesai. Skor ${world.state.score}. Terbaik ${best}.`);
  }

  /** One event bit from the world -> the matching sound and announcement. */
  function handleEvents(events) {
    if (events & EVENT_SERVED) {
      audio.ding();
      announce(world.state.flash);
    } else if (events & EVENT_WRONG) {
      audio.buzz();
    } else if (events & EVENT_BURNT) {
      audio.buzz();
      announce(world.state.flash);
    } else if (events & EVENT_WALKOUT) {
      audio.walkout();
      announce(world.state.flash);
    }
    if (events & EVENT_OVER) endGame();
  }

  function handleClicks() {
    for (const click of input.takeClicks()) {
      audio.unlock();
      if (click.kind === 'sound') {
        const on = audio.toggle();
        announce(on ? 'Suara hidup.' : 'Suara mati.');
        continue;
      }
      if (screen === SCREEN_TITLE || screen === SCREEN_OVER) {
        if (click.kind === 'confirm') startGame();
        continue;
      }
      if (screen === SCREEN_PAUSED) continue;
      if (click.kind === 'bin') {
        const events = world.addIngredient(click.id);
        if (events & EVENT_WRONG) {
          audio.buzz();
          announce(world.state.flash);
        } else if (events) {
          if (world.ingredientById(click.id).needsGrill) audio.sizzle();
          else audio.chop();
        }
      } else if (click.kind === 'grill') {
        const events = world.takeGrill(click.index);
        if (events & EVENT_COOKED) audio.pop();
        if (events) handleEvents(events);
      } else if (click.kind === 'plate') {
        if (world.removeFromPlate(click.index)) audio.pop();
      } else if (click.kind === 'serve') {
        handleEvents(world.serve());
      } else if (click.kind === 'trash') {
        if (world.trashPlate()) audio.pop();
      } else if (click.kind === 'confirm') {
        // Clicking empty space does nothing mid-shift: no accidental serves.
      }
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) startGame();
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Istirahat.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Memasak lagi.');
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    handleClicks();
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP) {
        handleEvents(world.step(STEP));
        accumulator -= STEP;
        if (screen !== SCREEN_PLAY) {
          accumulator = 0;
          break;
        }
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best, audio.on);
  }

  // Leaving the tab pauses a running game rather than letting orders walk out unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Istirahat.');
    }
  });

  announce('Dapur Kilat. Tekan Spasi atau klik untuk mulai memasak.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
