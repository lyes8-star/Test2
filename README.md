# Procept — Site web moderne avec administration

> **Où est le site ?** Le fichier principal est ici : **[`public/index.html`](public/index.html)**  
> (pas à la racine du dépôt — c’est normal pour un serveur Node)

## Lancer le site

```bash
node server.js
```

Puis ouvrir :

| Page | URL |
|------|-----|
| **Site public** | http://localhost:3000 |
| **Admin** | http://localhost:3000/admin |

Identifiants admin : `admin` / `procept2026`

## Structure des fichiers

```
├── README.md                 ← ce fichier
├── server.js                 ← démarre le site (sert le dossier public/)
├── data/content.json         ← textes & images (modifiables via admin)
├── public/
│   ├── index.html            ← ★ PAGE D’ACCUEIL DU SITE
│   ├── css/style.css
│   ├── js/main.js
│   ├── js/search.js          ← recherche live par mots-clés
│   └── admin/                ← interface d’administration
│       └── index.html
├── uploads/                  ← images uploadées via l’admin
└── test                      ← ancien export Duda (archive)
```

## Fonctionnalités

- Site moderne responsive (diaporama, services, galerie, contact)
- Navigation à 2 niveaux + mega-menu Services + recherche en direct
- Admin pour changer textes et images avec **sauvegarde réelle** (`data/content.json` + `uploads/`)
- Aucune dépendance npm : `node server.js` suffit
