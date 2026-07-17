# Procept — Site web (compatible GitHub Pages)

> **`index.html` est à la racine** — priorité GitHub Pages / hébergement statique.

## GitHub Pages

1. Settings → Pages → Source : **Deploy from a branch**
2. Branch : `main` (ou cette branche) → dossier **`/` (root)**
3. Le site sera servi via `index.html` à la racine

Sur GitHub Pages, le site public fonctionne en lecture seule (`data/content.json`).  
L’admin (upload / sauvegarde) nécessite le serveur local ci-dessous.

## Lancer en local (avec admin)

```bash
node server.js
```

| Page | URL |
|------|-----|
| Site | http://localhost:3000 |
| Admin | http://localhost:3000/admin |

Identifiants : `admin` / `procept2026`

## Structure

```
├── index.html          ← ★ page d’accueil (racine = priorité GitHub Pages)
├── css/style.css
├── js/main.js
├── js/search.js
├── admin/              ← interface admin
├── data/content.json   ← contenu du site
├── uploads/            ← images uploadées (serveur local)
├── server.js           ← API + admin (local)
└── README.md
```
