# 📚 Library Tracker

A beautiful desktop app to track your **physical books** and **web novels / manga / manhwa** collection — with offline-first SQLite storage and optional Neon PostgreSQL cloud sync.

---

## ✨ Features

- **Two Collections** — Physical Books & Web Collection (novels, comics, manhwa, etc.)
- **Card View** — Each book shows as a card with cover image, title, status, and latest chapter
- **Status Tracking**
  - Physical: Reading · Finished · Unread · Dropped
  - Web: Reading · Finished · Unread · Dropped · Waiting for Updates · Abandoned by Author · On Hiatus
- **Status Date Tracking** — Records exactly when you changed a book's status
- **Genre Classification** — 18+ physical genres, 25+ web genres
- **Chapter Tracking** — Track your latest chapter with smart +1 increment (works with any format: `42`, `c14`, `v7v31`, `Vol. 3 Ch. 12`)
- **Cover Image Search** — Search Open Library directly from the add/edit modal
- **Favorites** — Star any book to surface it easily
- **R18 Tag** — Mark books as R18; they are blurred by default and hidden unless you toggle them visible
- **RSS Feed Reader** — Add a threadmarks RSS URL to any web book; view all chapters in a built-in reader panel and open them in-app or in your browser
- **RSS Update Notifications** — App checks feeds every 30 minutes and shows a green NEW badge on cards with new chapters; click the badge to dismiss it
- **Forum Search** — Search Royal Road, SpaceBattles, Sufficient Velocity, and Questionable Questing directly from the app and import stories into your library
- **Filtering & Sorting** — Filter by status, genre, year range, favorites, R18, or new RSS updates; sort by last updated, status changed date, title, or year
- **Reading Statistics** — Charts showing monthly activity, status breakdown, genre breakdown, and key stats
- **Bulk CSV Import** — Import your existing list from a spreadsheet
- **Keyboard Shortcuts** — `N` to add, `/` to search, `F` to toggle favorites, `S` to open forum search (web collection)
- **Minimize to System Tray** — Runs in the background, keeps checking RSS feeds
- **Offline First** — Works completely without internet using local SQLite
- **Cloud Sync** — Auto-syncs to Neon PostgreSQL when online (every 60 seconds + on every change)

---

## 🖥️ Prerequisites

Before you can run or build this app, you need the following installed:

### 1. Node.js
Download and install from https://nodejs.org — use the **LTS** version.

### 2. Visual Studio Build Tools (Windows only)
Required to compile the `better-sqlite3` native module.

1. Download **Visual Studio Build Tools** from https://visualstudio.microsoft.com/visual-cpp-build-tools/
2. Run the installer and select **"Desktop development with C++"**
3. Under **Individual Components**, also select the latest **Windows 11 SDK**
4. Click Install and wait for it to complete

### 3. Python
Download and install from https://python.org — any recent version works.

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/library-tracker.git
cd library-tracker
```

### 2. Install dependencies

```bash
npm install
```

### 3. Rebuild native modules for Electron

This step is required every time you run `npm install`. It recompiles `better-sqlite3` specifically for Electron's internal Node.js version:

```bash
npx electron-rebuild -f -w better-sqlite3
```

### 4. Set up Neon (optional — for cloud sync)

If you want your library to sync across devices:

1. Create a free account at https://neon.tech
2. Create a new project and copy the **Connection string**
3. Duplicate `.env.example` and rename it to `.env`
4. Paste your connection string:

```
NEON_DATABASE_URL=postgresql://user:password@host.neon.tech/dbname?sslmode=require
```

You can also skip this and configure it later from inside the app via the **⚙️ Settings** icon.

### 5. Run in development mode

```bash
npm run dev
```

---

## 📦 Building the Installer (.exe)

### Step 1 — Run Command Prompt as Administrator

Right-click Command Prompt → **Run as administrator**. This is required for the build tools to create the necessary file links.

### Step 2 — Navigate to the project folder

```bash
cd C:\Users\YourName\Documents\library-tracker
```

### Step 3 — Build

```bash
npm run build:win
```

This will bundle everything into a self-contained installer. The first run downloads ~110 MB of build tools and takes 2–5 minutes. When finished your installer will be at:

```
release\Library Tracker Setup 1.0.0.exe
```

### Step 4 — Install

Double-click the installer. It will create a **Desktop shortcut** and a **Start Menu shortcut**. After installing, launch it from the desktop — no terminal needed.

### Other platforms

```bash
npm run build:mac    # macOS .dmg
npm run build:linux  # Linux AppImage
```

---

## 💡 Usage Tips

| Feature | How to use |
|---|---|
| **Add a book** | Click "Add Book" or press `N` |
| **Search for a cover** | Click the cover area in the add/edit modal |
| **Quick chapter +1** | Hover over a card — an amber +1 button appears. Works with any format: `42`, `c14`, `v7v31`, `Vol. 3 Ch. 12` |
| **RSS feed** | Add a threadmarks RSS URL when editing a web book (e.g. `.../threadmarks.rss?threadmark_category=1`). Click the RSS icon on a card to open the reader |
| **RSS new chapter badge** | A green NEW badge appears when a new chapter is detected. Click it to dismiss |
| **R18 content** | Toggle R18 on a book in the edit modal. R18 books are blurred by default. Click the `+N R18` pill in the toolbar to reveal them |
| **Forum search** | Click "Forum Search" in the Web Collection toolbar or press `S`. Search across Royal Road, SpaceBattles, SV, and QQ |
| **Bulk import** | Click the ↑ icon at the bottom of the sidebar. Download the CSV template, fill it in, upload it |
| **Keyboard shortcuts** | `N` = add book · `/` = search · `F` = favorites · `S` = forum search (web only) |
| **Minimize to tray** | Closing the window hides it to the system tray. Right-click the tray icon to quit |
| **Cloud sync** | Configure your Neon URL in Settings (⚙️). Sync status is shown at the bottom of the sidebar |
| **Statistics** | Click the Statistics tab in the sidebar |

---

## 🔗 RSS Feed URLs

For SpaceBattles, Sufficient Velocity, and Questionable Questing, the RSS URL format is:

```
https://forums.spacebattles.com/threads/[story-slug].[thread-id]/threadmarks.rss?threadmark_category=1
```

To find the exact URL: go to the story's thread page in your browser, navigate to Threadmarks, and look for the RSS icon — copy that link directly.

---

## 🗄️ Database & Storage

### Local (SQLite)
All books are stored locally first. The database file is at:
- **Windows**: `%APPDATA%\library-tracker\library.db`
- **macOS**: `~/Library/Application Support/library-tracker/library.db`
- **Linux**: `~/.config/library-tracker/library.db`

### Cloud (Neon PostgreSQL)
When a Neon URL is configured the app pushes local changes on every save and every 60 seconds, pulls remote changes since the last sync, and uses `updated_at` timestamps for conflict resolution. The remote schema is created automatically on first connection.

---

## 🔧 Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | [Electron](https://electronjs.org) v29 |
| Frontend | [React](https://react.dev) 18 + [Vite](https://vitejs.dev) 5 |
| Styling | [Tailwind CSS](https://tailwindcss.com) |
| Charts | [Recharts](https://recharts.org) |
| Local database | [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) v11 |
| Cloud database | [Neon](https://neon.tech) (PostgreSQL) via [pg](https://github.com/brianc/node-postgres) |
| RSS parsing | [rss-parser](https://github.com/rbren/rss-parser) |
| Cover search | [Open Library API](https://openlibrary.org/developers/api) |
| Forum search | HTML scraping + Royal Road search |

---

## 📁 Project Structure

```
library-tracker/
├── electron/
│   ├── main.js          # Electron main process, tray, IPC handlers
│   ├── preload.js       # Secure IPC bridge to renderer
│   ├── rss.js           # RSS feed polling and update detection
│   ├── scraper.js       # Forum search (Royal Road, SB, SV, QQ)
│   └── db/
│       ├── local.js     # SQLite CRUD operations
│       └── sync.js      # Neon PostgreSQL sync logic
├── src/
│   ├── App.jsx          # Root component, navigation
│   ├── constants.js     # Statuses, genres, types
│   ├── hooks/
│   │   └── useBooks.js  # Book data hook
│   └── components/
│       ├── BookCard.jsx        # Card with +1, RSS badge, R18 blur
│       ├── BookModal.jsx       # Add/Edit modal with cover search
│       ├── CollectionView.jsx  # Collection page with grid and filters
│       ├── CoverSearch.jsx     # Open Library cover search
│       ├── FilterPanel.jsx     # Sidebar filter controls
│       ├── ForumSearch.jsx     # Forum search modal
│       ├── ImportModal.jsx     # CSV bulk import
│       ├── RssReader.jsx       # Built-in RSS chapter reader
│       ├── SettingsModal.jsx   # Neon URL configuration
│       ├── StatsView.jsx       # Reading statistics and charts
│       └── SyncStatus.jsx      # Sync status indicator
├── scripts/
│   └── generate-icon.js # Generates app icons
├── public/
│   ├── icon.png         # App icon (256x256)
│   └── icon-tray.png    # System tray icon (16x16)
├── .env.example
├── .gitignore
├── vite.config.mjs
├── tailwind.config.js
└── package.json
```

---

## ⚠️ GitHub — What NOT to commit

The `.gitignore` already excludes these:

- `node_modules/` — never commit (500MB+), others run `npm install`
- `release/` — the built installer, too large for git
- `.env` — contains your private Neon database URL
- `dist/` — build output, regenerated by `npm run build:win`

---

## 📄 License

MIT
