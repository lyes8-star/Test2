# Procept — Site web

## Pour mettre à jour le site (sans coder)

➡️ **[Guide simple : dossier `contenu/`](contenu/LIRE-MOI.md)**

Vous modifiez uniquement les fichiers dans **`contenu/`** (téléphone, textes, galerie, actualités…) directement sur GitHub.  
Ne touchez pas à `js/`, `css/`, `server.js`, etc.

| Besoin | Fichier |
|--------|---------|
| Coordonnées | [`contenu/site.json`](contenu/site.json) |
| Bandeau d’accueil | [`contenu/diaporama.json`](contenu/diaporama.json) |
| Galerie | [`contenu/galerie.json`](contenu/galerie.json) |
| Actualités | [`contenu/actualites.json`](contenu/actualites.json) |

Images : dossiers `images/hero/`, `images/gallery/`, `images/services/` (ne pas renommer ces dossiers).

---

## Pour les développeurs

Site compatible **GitHub Pages** (`index.html` à la racine).

### SEO

- `robots.txt` + `sitemap.xml`
- Meta canonical, Open Graph, Twitter Card
- JSON-LD métier / FAQ / fil d’Ariane
- Lexique `data/seo-keywords.json` (recherche interne uniquement)

### Contenu technique

- Source éditable : `contenu/*.json`
- Assemblage : `node scripts/sync-content.js` → `data/content.json`
- Chargement navigateur : `js/content-loader.js` (repli sur `data/content.json`)

### Lancer en local

```bash
ADMIN_PASSWORD='votre-mot-de-passe-fort' node server.js
```

| Page | URL |
|------|-----|
| Accueil | http://localhost:3000 |
| Construction | http://localhost:3000/constructeur/ |
| Admin | http://localhost:3000/admin |

L’admin enregistre à la fois `contenu/` et `data/content.json`.

### Structure

```
├── contenu/          ← À MODIFIER (éditeurs)
│   └── LIRE-MOI.md
├── images/           ← photos (hero, gallery, services)
├── index.html        ← pages publiques (ne pas déplacer)
├── constructeur/ renovation/ …
├── css/ js/          ← technique (ne pas toucher)
├── data/content.json ← copie synchronisée
├── admin/
└── server.js
```
