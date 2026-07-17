# Procept — Site web

## Pour mettre à jour le site (sans coder)

➡️ **[Guide simple : dossier `contenu/`](contenu/LIRE-MOI.md)**

Au quotidien : modifiez seulement les fichiers **texte** (`.json`) dans **`contenu/`** sur GitHub.  
Ne touchez pas à `js/`, `css/`, `server.js`, ni à **`contenu/photos/`** (photos gérées à part).

| Besoin | Fichier |
|--------|---------|
| Coordonnées | [`contenu/site.json`](contenu/site.json) |
| Textes bandeau | [`contenu/diaporama.json`](contenu/diaporama.json) |
| Légendes galerie | [`contenu/galerie.json`](contenu/galerie.json) |
| Actualités | [`contenu/actualites.json`](contenu/actualites.json) |

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
- Photos : `contenu/photos/` (hero, gallery, services)
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
├── contenu/              ← zone éditeurs
│   ├── LIRE-MOI.md
│   ├── *.json            ← textes à modifier
│   └── photos/           ← ne pas toucher (sauf tech)
├── index.html
├── constructeur/ renovation/ …
├── css/ js/              ← technique
├── data/content.json
├── admin/
└── server.js
```
