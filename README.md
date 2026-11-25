# 🍲 Dapur Kilat! — Sizzle & Serve

![make.fun bounty](https://make.fun/badge/best-cooking-game-20261125-0137.svg)
![rank](https://make.fun/badge/best-cooking-game-20261125-0137/yylunpdo/best-cooking-game/rank.svg)
![reward](https://make.fun/badge/best-cooking-game-20261125-0137/reward.svg)

**Dapur Kilat!** is a fast, cheerful cooking game built for the
[best cooking game bounty on make.fun](https://make.fun/c/best-cooking-game-20261125-0137).
Run a tiny kitchen for one 150-second shift: take orders, grill meat and eggs
until golden, build each plate exactly to the recipe, and serve before the
customer's patience runs out.

## How to play

- **Take the order** — the order board at the top shows up to three customers,
  each with a dish, its recipe, and a patience bar that drains in real time.
- **Grab ingredients** — click a bin on the counter (or press `1`–`6`).
  Bread, lettuce, tomato and cheese go straight to the plate.
- **Grill first** — meat and eggs go to the grill. Click the grill slot when
  the food turns golden to move it to the plate; wait too long and it burns.
- **Serve** — click **SAJIKAN** (or press `Space`) when the plate matches an
  order exactly. A fast serve earns a bigger tip. A wrong plate stays put so
  you can fix it; click a plate item to remove it, or **BUANG** (`T`) to clear it.
- **Survive the shift** — every served dish raises your level and the kitchen
  gets busier. Lose all three hearts to walk-outs, or run the clock out, and
  the shift ends. `P` pauses, `M` mutes.

Score, coins, level, timer and hearts are always on screen, and the best
score is kept in the browser between visits.

## The dishes

| Dish | Recipe | Base pay |
| --- | --- | --- |
| Burger Klasik | Roti + Daging + Selada | 12 |
| Keju Burger | Roti + Daging + Keju | 14 |
| Burger Spesial | Roti + Daging + Keju + Tomat | 18 |
| Salad Segar | Selada + Tomat + Telur | 14 |
| Roti Telur | Roti + Telur + Keju | 13 |
| Veggie Delight | Roti + Selada + Tomat + Keju | 16 |

Tips of up to +10 coins reward fast serves.

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no dependencies, no network requests: `game/` is plain static
files (HTML + vanilla JS + canvas + WebAudio bleeps), and `main.ts` hands it
in by copying `game/` and `screenshots/` to `/output` with a dossier.

## Layout

- `game/index.html` — the page, one canvas
- `game/src/config.js` — dishes, ingredients, tuning, layout
- `game/src/world.js` — orders, grill, plate, clock, score
- `game/src/render.js` — all drawing (kitchen, board, bins, grill, plate)
- `game/src/input.js` — mouse + keyboard, kitchen zones
- `game/src/audio.js` — synthesised WebAudio effects, no sound files
- `game/src/shots.js` — the three screenshot scenes (`?shot=start|play|end`)
- `game/src/main.js` — boot and the fixed-step loop
- `main.ts` — the hand-in program, `serve.ts` — the local server

MIT licensed. Built for the make.fun bounty — good luck, and serve it hot!
