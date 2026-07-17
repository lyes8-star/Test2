# Procept — Site web (compatible GitHub Pages)

> **`index.html` est à la racine** — priorité GitHub Pages.

## GitHub Pages

1. Settings → Pages → Source : **Deploy from a branch**
2. Branch : `main` (ou cette branche) → dossier **`/` (root)**

Le site lit `data/content.json` et les photos dans `images/`.  
L’admin (upload / sauvegarde) nécessite `node server.js` en local.

## Lancer en local

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
├── index.html          ← page d’accueil (racine)
├── css/style.css
├── js/main.js + search.js
├── images/             ← toutes les photos Procept (hero, services, gallery)
├── admin/
├── data/content.json   ← textes + chemins images + catégories
├── server.js
└── test                ← export Duda d’origine (archive)
```

## Contenu images

- **45 réalisations** dans `images/gallery/` avec filtres (construction, rénovation, extension, chantier)
- **4 slides** hero + **3** services + photos process / siège
