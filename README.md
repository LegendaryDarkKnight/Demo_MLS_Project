# Demo MLS Project

This project is a monorepo with:
- `packages/api` (Express API)
- `packages/web` (Next.js frontend)

## 1) Clone the repository

```bash
git clone https://github.com/LegendaryDarkKnight/Demo_MLS_Project.git
```

## 2) Move to the project root directory

```bash
cd Demo_MLS_Project
```

You should be in the folder that contains the root `package.json`.

## 3) Install dependencies

```bash
npm install
```

This installs all workspace dependencies for both API and Web.

## 4) Run the project (API + Web together)

```bash
npm run dev
```

Expected local URLs:
- Web app: `http://localhost:3000`
- API: `http://localhost:3001`
- API health check: `http://localhost:3001/health`

## Production build (optional)

```bash
npm run build
npm run start
```

## Troubleshooting install/run issues

If `npm install` fails, try the following in order.

### A) Update Node.js

Recommended: use Node.js 18+ (Node 20 LTS preferred).

Check your version:

```bash
node -v
npm -v
```

If Node is old, update it:
- Windows/macOS/Linux: install latest LTS from `https://nodejs.org`
- Or use nvm:
	- macOS/Linux: `nvm install --lts && nvm use --lts`
	- Windows: install nvm-windows, then `nvm install lts` and `nvm use <version>`

### B) Clean install

From the project root:

```bash
rm -rf node_modules package-lock.json
npm install
```

Windows PowerShell equivalent:

```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm install
```

### C) Clear npm cache (if needed)

```bash
npm cache clean --force
npm install
```

### D) Port already in use

If `3000` or `3001` is busy, stop the conflicting process and run again.

## Useful workspace scripts

From root:
- `npm run dev` -> run API + Web in development
- `npm run build` -> build API + Web
- `npm run start` -> start API + Web in production mode

From web only:
- `npm run dev --workspace=packages/web`

From api only:
- `npm run dev --workspace=packages/api`
