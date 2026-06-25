# AGENTS.md — Yatzy Battle

## Project Overview
Yatzy Battle is a 2D Phaser roguelike dungeon crawler using Yatzy dice combat. See `GDD` Obsidian vault for the complete game specification.

## Commands
- **build step** use `npm run build`
- **No test/lint scripts** currently configured.
- To serve locally: `npm run dev` (Vite dev server, auto-opens browser).

## Tech Stack
- **Language:** JavaScript ES6+ (Phaser + Vite frameworks)
- **Markup:** HTML5
- **Styling:** CSS3 (custom properties, flexbox, grid, animations)
- **Deployment:** GitHub Pages (static site)

## Code Conventions
- Use Phaser Scenes (`MapScene`, `BattleScene`, `BootScene`) extending `Phaser.Scene` with clear single responsibility
- Extract pure game logic into system modules (`MapGenerator.js`, `DiceSystem.js`) with no Phaser dependency
- Mobile-first responsive design (max-width 600px container)
- Dark slate theme with amber/yellow accents
- Follow all `*.md` in Obsidian vault `GDD` for all game design decisions; update `*.md` if design changes

## File Guide
| File | Purpose |
|---|---|
| `index.html` | DOM entry: header, stats bar, modals, Phaser canvas container |
| `styles.css` | Visual design for header, modals, stats bar; responsive layout |
| `src/main.js` | Phaser game bootstrap (config, canvas size, scene list) |
| `src/scenes/BootScene.js` | Asset preloader (room icons, sprites) |
| `src/scenes/MapScene.js` | Map exploration: procedural generation, room rendering, navigation |
| `src/scenes/BattleScene.js` | Dice combat: rolling, lock/unlock, enemy HP, damage resolution |
| `src/systems/MapGenerator.js` | Pure map generation logic (no Phaser dependency) |
| `src/systems/DiceSystem.js` | Dice rolling, category evaluation, damage calculation |
| `src/config.js` | Game constants (room types, enemy stats, tuning values) |
| `assets/` | PNG icons for room types (9 icons) |
| `GDD/` | Obsidian vault for game design documentation |

## Workflow
1. Run `npm run dev` to start the Vite dev server with HMR
2. Edit files in `src/scenes/` or `src/systems/` — Vite auto-refreshes the browser
3. When implementing new features, reference `GDD/` vault notes first, then `SPEC.md`
4. Keep the UI description in `GDD/12_UI_UX.md` in sync with the actual layout
