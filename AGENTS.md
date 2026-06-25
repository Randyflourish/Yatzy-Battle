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
- Use Phaser Scenes extending `Phaser.Scene` with clear single responsibility
- Extract pure game logic into system modules with no Phaser dependency
- max-width 600px container
- Follow all `*.md` in Obsidian vault `GDD` for all game design decisions; update `*.md` if design changes

## Workflow
1. Run `npm run dev` to start the Vite dev server with HMR
2. Edit files in `src/scenes/` or `src/systems/` — Vite auto-refreshes the browser
3. When implementing new features, reference `GDD/` vault notes.
