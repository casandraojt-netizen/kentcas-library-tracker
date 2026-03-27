# Library Tracker

A desktop app for tracking physical books and web fiction with offline-first SQLite storage, optional Neon PostgreSQL sync, built-in RSS monitoring, and a library UI designed around shelves, cover cards, and quick progress updates.

## Features

- Physical and web collections with collection-specific statuses and genres
- Custom shelves/lists beyond the base collections, with books allowed on multiple shelves at once
- Author pages that show every matching book in your library
- Reading history that records both status changes and chapter progress
- Local-first storage with optional Neon sync for books and reading history across devices
- Cover image URLs plus Open Library cover search from the add/edit modal
- Quick chapter `+1` updates for numeric chapter strings
- Favorites, tags, notes, R18 blur/hide support, and filterable library views
- Built-in RSS reader for threadmark feeds
- Forum search for Royal Road, SpaceBattles, Sufficient Velocity, and Questionable Questing
- CSV import/export, including multi-shelf membership
- Minimize-to-tray desktop behavior

## Reading History

The app keeps an event log for:

- adding a book
- changing a book status
- updating chapter progress

History is stored locally and synced to Neon when cloud sync is enabled. The history view supports:

- search by title/author
- filtering by shelf, genre, tag, and event type
- a full-history toggle
- an automatic "last 30 days only" default when a filtered view grows beyond 5 pages

## RSS Behavior

RSS polling is intentionally staggered to reduce load on forum hosts:

- active books (`reading`, `waiting`) are checked every 15 minutes
- inactive books (`unread`, `hiatus`, `dropped`) are checked every 12 hours
- all RSS-enabled books are checked once on app startup

The poller no longer adds a cache-busting query parameter and no longer forces `no-cache` / `no-store` headers.

## Getting Started

### Prerequisites

Install:

- Node.js LTS
- Python
- Visual Studio Build Tools with Desktop development with C++ and a recent Windows SDK

The native `better-sqlite3` dependency needs the Windows build toolchain.

### Install dependencies

```bash
npm install
```

### Run in development

```bash
npm run dev
```

### Optional cloud sync

You can configure Neon either in `.env` or from inside the app settings.

Example `.env`:

```env
NEON_DATABASE_URL=postgresql://user:password@host.neon.tech/dbname?sslmode=require
```

If a Neon URL is set, the app will create/migrate the remote schema automatically.

## Building

### Windows installer

```bash
npm run build:win
```

The installer output is written to `release/`.

Note: on Windows, `electron-builder` may need an elevated shell because some packaging steps create symlinks.

### Other targets

```bash
npm run build:mac
npm run build:linux
```

## Usage Notes

- Add a book from any shelf view with `N` or the `Add Book` button.
- If you add a book while viewing a custom shelf, that shelf is applied automatically and the book still remains in its base collection.
- Edit a book to toggle extra shelves, add RSS feeds, tags, notes, favorite state, or cover URLs.
- Click an author name to open that author's page.
- Use the Reading History view from the sidebar to review recent status/chapter events.
- Exporting while viewing a shelf exports only the books in that shelf.
- CSV import supports a `shelves` column using `|` separators, for example: `physical|Bedside|Commute`.

## RSS Feed URLs

For SpaceBattles, Sufficient Velocity, and Questionable Questing, threadmark feeds typically look like:

```text
https://forums.spacebattles.com/threads/[story-slug].[thread-id]/threadmarks.rss?threadmark_category=1
```

Copy the RSS link directly from the threadmarks page for the specific story.

## Storage

### Local SQLite

The app stores books and reading history locally first.

Typical database locations:

- Windows: `%APPDATA%\library-tracker\library.db`
- macOS: `~/Library/Application Support/library-tracker/library.db`
- Linux: `~/.config/library-tracker/library.db`

### Neon PostgreSQL

When Neon is configured, the app syncs:

- books
- reading history

Sync runs automatically and also on local mutations. The remote schema is created and migrated by the app.

## Tech Stack

- Electron
- React
- Vite
- Tailwind CSS
- better-sqlite3
- PostgreSQL via `pg`
- rss-parser
- Recharts

## Project Structure

```text
library-tracker/
|- electron/
|  |- main.js
|  |- preload.js
|  |- rss.js
|  |- scraper.js
|  `- db/
|     |- local.js
|     `- sync.js
|- public/
|- scripts/
|- src/
|  |- App.jsx
|  |- constants.js
|  |- library.js
|  |- hooks/
|  `- components/
`- package.json
```

## Git Notes

Do not commit:

- `node_modules/`
- `dist/`
- `release/`
- `.env`

## License

MIT
