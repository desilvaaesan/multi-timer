# Multitimer

A small, dependency-free multi-timer app: run several countdowns (or stopwatches) at once, each shown as a colored ring with its own label. No build step — just HTML, CSS, and vanilla JS.

## Run locally

Just open `index.html` in a browser. Everything (including saved timers) is stored in `localStorage`, so your timers persist across reloads.

## Deploy with GitHub Pages

1. Create a new repo on GitHub and push these three files (`index.html`, `style.css`, `script.js`) to it.
   ```bash
   git init
   git add .
   git commit -m "Multitimer"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```
2. On GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, then pick the `main` branch and `/ (root)` folder. Save.
3. GitHub will publish it at `https://<your-username>.github.io/<repo-name>/` within a minute or two.

No other configuration is needed — there's no backend, no npm install, no environment variables.

## Notes

- Timer state (labels, colors, remaining time, running/paused) is saved to the browser's `localStorage`, per device/browser — it isn't synced anywhere.
- The completion sound uses the Web Audio API and needs one user interaction on the page first (a browser requirement, not a bug).
- Add a timer with the **New timer** button: give it a label, a color, an optional one-character icon, and either a countdown duration or "Count up" mode.
