# Emberfall

[![best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![rank](https://make.fun/badge/best-game-01/laddergit/emberfall/rank.svg)](https://make.fun/bounty/best-game-01)
[![reward](https://make.fun/badge/best-game-01/laddergit/emberfall/reward.svg)](https://make.fun/bounty/best-game-01)

**Emberfall** is a tower defense game for the [make.fun best game bounty](https://make.fun/bounty/best-game-01). The void marches down the road toward the last Ember Crystal — build towers on the plots, hold the crystal through 15 waves, and do not let it fall.

## Play

Open `game/index.html` in a desktop browser, or serve it locally:

```sh
node serve.ts
# then open http://localhost:8080
```

- **Mouse**: click a tower card, then click a plot to build. Click a tower to upgrade or sell it.
- **Keys 1–4**: pick Ember, Frost, Cannon or Storm. **Enter**: start / send the next wave. **Space**: pause. **F**: 1x/2x speed. **M**: mute. **R**: restart.

Four towers (Ember Spire, Frost Obelisk, Cannon Mortar, Storm Coil), five enemy kinds including the Emberlord boss, 15 waves, gold economy, upgrades, synthesized sound effects, and a full win/lose loop with a restart.

## Entry

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored make.fun library (`vendor/makefun-game.ts`).

## License

MIT — see [LICENSE](LICENSE).
