// The screenshot scenes behind ?shot=start|play|end. Each one plays the real
// rules forward from a fresh world with a scripted cook (not a fake frame), so
// the picture is what a short game really looks like and the same seed always
// gives the same frame.
import { STEP } from './config.js';
import { EVENT_OVER, EVENT_SERVED } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const SAMPLE = STEP;

/** Run the world forward `seconds`, feeding it `driver(state)` each step. */
function runFor(world, seconds, driver) {
  for (let t = 0; t < seconds; t += SAMPLE) {
    const events = world.step(SAMPLE);
    if (driver) driver(world.state, events);
    if (events & EVENT_OVER) break;
  }
}

/**
 * Set `world` to the named scene (start, play or end; any other name is start)
 * and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'end') {
    // Title over a kitchen already alive: two orders waiting, a patty sizzling.
    world.spawnOrder('burger');
    world.spawnOrder('salad');
    world.addIngredient('bun');
    world.addIngredient('patty');
    runFor(world, 2.5);
    world.addIngredient('lettuce');
    return { screen: SCREEN_TITLE, best: 120 };
  }
  if (name === 'play') {
    // A busy mid-shift: two dishes served, a third order waiting, a plate
    // mid-assembly and an egg on the grill.
    world.spawnOrder('burger');
    world.spawnOrder('cheeseburger');
    world.spawnOrder('salad');
    runFor(world, 1.0);
    world.addIngredient('bun');
    world.addIngredient('patty');
    runFor(world, 4.4);
    world.takeGrill(0);
    world.addIngredient('lettuce');
    world.serve();
    world.addIngredient('bun');
    world.addIngredient('patty');
    runFor(world, 4.4);
    world.takeGrill(0);
    world.addIngredient('cheese');
    const served = world.serve();
    void served;
    world.spawnOrder('spesial');
    world.addIngredient('bun');
    world.addIngredient('egg');
    runFor(world, 1.5);
    return { screen: SCREEN_PLAY, best: Math.max(120, world.state.score) };
  }
  // End: the cook serves one dish, then a rush of walkouts ends the shift.
  world.spawnOrder('burger');
  world.addIngredient('bun');
  world.addIngredient('patty');
  runFor(world, 4.4);
  world.takeGrill(0);
  world.addIngredient('lettuce');
  world.serve();
  world.spawnOrder('salad');
  world.spawnOrder('veggie');
  let guard = 0;
  while (!world.state.over && guard < 20000) {
    world.step(STEP);
    guard += 1;
    if (world.state.orders.length === 0 && !world.state.over) world.spawnOrder();
  }
  return { screen: SCREEN_OVER, best: Math.max(120, world.state.score) };
}
