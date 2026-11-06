# Budget Tracker

A fast, private expense tracker for daily use. Type `coffee 4.50`, press Enter, done.

It runs entirely in your browser: no account, no ads, no server. Your data is saved
on your device and you can export it at any time.

## Run it on your computer

You need [Node.js](https://nodejs.org) (version 20 or newer).

```bash
npm install
npm run dev
```

Your browser opens at http://localhost:5173. Leave the terminal window open while you use it.

Other commands:

| Command | What it does |
|---|---|
| `npm test` | Runs the automated tests |
| `npm run build` | Builds the website into the `dist/` folder, ready to put online |
| `npm run preview` | Serves the built `dist/` folder locally |

## Features

- **One-line entry.** `lunch 12.50`, `12 lunch with Sam`, `taxi 18 yesterday`. Comma decimals
  (`12,50`), thousands (`1,200`) and currency signs (`$18`) all work.
- **Automatic categories.** Guessed from the description, and it learns from you: when you
  re-categorise “Coffee” once, every later coffee uses your choice.
- **One-tap repeats.** Things you buy often show up as buttons under the entry box.
- **Left to spend per day.** Set a monthly budget and see how much you can spend each day
  for the rest of the month to stay on track.
- **Where it went.** Category breakdown; tap a category to filter the list.
- **Daily list** with day totals, search, edit, and undo for deletes.
- **Month by month.** A budget carries forward until you change it.
- **Your data is yours.** Export CSV (opens in Excel / Google Sheets), download and import
  JSON backups. Import also reads `budget_data.json` from the old Python version.
- **Income.** Switch the entry box to *Income*, or start with `+` (`+salary 2500`). Each month
  shows Income, Spent and Saved.
- **What I own.** Cash, bank accounts, savings, gold, investments and other items with their
  current value, plus your **Splitwise balance** (positive when friends owe you, negative when
  you owe) and loans/debts. Shows your total net worth and when each value was last updated.
- **English and Italian.** Switch with EN / IT at the top. Numbers, dates and the entry box follow
  the language (`caffè 1,50 ieri` works).
- **Light, dark or automatic theme**, switched with the 🌗 button.
- Works on phones (add it to your home screen); keyboard shortcut <kbd>/</kbd> jumps to the
  entry box.

## Where data is stored

Everything is stored in your browser's local storage for this site. It stays there after you
close the tab, but it is per-browser and per-device. Clearing browser data deletes it, so use
**⚙️ → Download backup** now and then.

## Put it online

`npm run build` creates a static website in `dist/`. Upload that folder to any static host,
for example Netlify, Vercel, Cloudflare Pages or GitHub Pages. Each visitor's data stays in
their own browser.

## Project layout

```
src/
  App.tsx              app state, saving, undo
  components/          UI pieces (entry box, summary, list, dialogs)
  lib/                 logic with no UI: parsing, categories, totals, import/export
  lib/lib.test.ts      tests for the logic
Budget_Tracker.py      the original command-line version (run with `py Budget_Tracker.py`)
```

## Ideas for later

- Recurring expenses (rent, subscriptions) added automatically each month
- Automatic Splitwise balance via the Splitwise API (needs a Splitwise login and a small server)
- Per-category budgets
- Offline support with a service worker
- Optional account and sync between devices (needs a backend)
