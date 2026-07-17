# Procept — Site web (compatible GitHub Pages)

> **`index.html` à la racine** — priorité GitHub Pages.

## SEO Google (conforme)

- `robots.txt` + `sitemap.xml`
- Meta canonical, Open Graph, Twitter Card
- JSON-LD `HomeAndConstructionBusiness` + `FAQPage`
- Sections visibles **Zones** + **FAQ** (contenu indexable)
- Lexique `data/seo-keywords.json` (~4500 termes) pour la **recherche interne** uniquement — **aucun stuffing caché**

Soumettez le sitemap dans [Google Search Console](https://search.google.com/search-console) après déploiement.

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
├── index.html
├── robots.txt / sitemap.xml / favicon.svg
├── css/ js/ images/ admin/
├── data/content.json
├── data/seo-keywords.json
└── server.js
```
