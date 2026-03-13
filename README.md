# 📚 Library Tracker

A beautiful desktop app to track your **physical books** and **web novels / manga / manhwa** collection — with offline-first SQLite storage and optional Neon PostgreSQL cloud sync.

![Library Tracker Preview](docs/preview.png)

## ✨ Features

- **Two Collections** — Physical Books & Web Collection (novels, comics, manhwa, etc.)
- **Card View** — Each book shows as a square card with cover image, title, status, and latest chapter
- **Status Tracking**
  - Physical: Reading · Finished · Unread · Dropped
  - Web: Reading · Finished · Unread · Dropped · Waiting for Updates · Abandoned · On Hiatus
- **Genre Classification** — 18+ physical genres, 25+ web genres
- **Chapter Tracking** — Track your latest chapter read and total chapters
- **Favorites** — Star any book to surface it easily
- **Filtering** — Filter by status, genre, year range, favorites, or search by title/author
- **Sorting** — By last updated, title, year, or status
- **Offline First** — Works completely without internet using local SQLite
- **Cloud Sync** — Auto-syncs to Neon PostgreSQL when online (every 60 seconds + on every change)

---

## 🚀 Getting Started

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/library-tracker.git
cd library-tracker
npm install
```

### 2. Set Up Neon (optional)

Create a [Neon](https://neon.tech) project and get your connection string.

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Edit `.env` and paste your Neon URL:
```
NEON_DATABASE_URL=postgresql://user:password@host.neon.tech/dbname?sslmode=require
```

> You can also configure the database URL later from inside the app via **Settings**.

### 3. Run in Development

```bash
npm run dev
```

### 4. Build for Your Platform

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

Your installer will appear in the `release/` directory.

---

## 🗄️ Database

### Local (SQLite)
Books are stored locally in your OS user data directory:
- **Windows**: `%APPDATA%\library-tracker\library.db`
- **macOS**: `~/Library/Application Support/library-tracker/library.db`
- **Linux**: `~/.config/library-tracker/library.db`

### Cloud (Neon PostgreSQL)
When a `NEON_DATABASE_URL` is configured, the app will:
1. Push any locally-changed books to Neon on every save and every 60 seconds
2. Pull any books changed remotely since the last sync
3. Use `updated_at` timestamp for conflict resolution (last-write-wins)

The schema is automatically created in Neon on first connection.

---

## 🔧 Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop | [Electron](https://electronjs.org) |
| Frontend | [React](https://react.dev) + [Vite](https://vitejs.dev) |
| Styling | [Tailwind CSS](https://tailwindcss.com) |
| Local DB | [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) |
| Cloud DB | [Neon](https://neon.tech) (PostgreSQL) via [pg](https://github.com/brianc/node-postgres) |

---

## 📖 Usage Tips

- **Adding a book**: Click **Add Book** in the top right, fill in the details, and hit save
- **Cover images**: Paste any public image URL (try searching on Google Images or Goodreads)
- **Chapter tracking**: Enter just a number (`42`) or any text (`Vol. 3 Ch. 12`)
- **Favoriting**: Click the ⭐ on any card, or toggle it in the edit modal
- **Sync status**: Shown at the bottom of the sidebar — click the refresh icon to sync immediately
- **Settings**: Click the ⚙️ gear icon to configure or update your Neon URL

---

## 📁 Project Structure

```
library-tracker/
├── electron/
│   ├── main.js          # Electron main process
│   ├── preload.js       # Secure IPC bridge
│   └── db/
│       ├── local.js     # SQLite operations
│       └── sync.js      # Neon sync logic
├── src/
│   ├── App.jsx          # Root component
│   ├── constants.js     # Statuses, genres, types
│   ├── hooks/
│   │   └── useBooks.js  # Book data hook
│   └── components/
│       ├── BookCard.jsx        # Card display
│       ├── BookModal.jsx       # Add/Edit modal
│       ├── CollectionView.jsx  # Collection page
│       ├── FilterPanel.jsx     # Sidebar filters
│       ├── SettingsModal.jsx   # Settings dialog
│       └── SyncStatus.jsx      # Sync indicator
├── .env.example
├── vite.config.js
├── tailwind.config.js
└── package.json
```

---

## 🤝 Contributing

Feel free to fork and customize for your own library! Pull requests welcome.

## 📄 License

MIT
