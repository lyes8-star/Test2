# Procept — Site web moderne avec administration

Site vitrine optimisé pour **Procept**, constructeur de maisons à Saint-Germain-en-Laye, avec interface d'administration pour mettre à jour le contenu et les images en temps réel.

## Fonctionnalités

- **Site public moderne** : design responsive, diaporama, galerie photos, formulaire de contact
- **Interface admin** (`/admin`) : modification des textes, images du diaporama, services et galerie
- **Persistance réelle** : toutes les modifications sont enregistrées dans `data/content.json` et les images uploadées dans `uploads/`
- **Aucune dépendance externe** : serveur Node.js natif, zéro npm install requis

## Démarrage

```bash
node server.js
```

- Site public : http://localhost:3000
- Administration : http://localhost:3000/admin

### Identifiants par défaut

| Champ | Valeur |
|-------|--------|
| Utilisateur | `admin` |
| Mot de passe | `procept2026` |

Modifiables via variables d'environnement :

```bash
ADMIN_USER=monuser ADMIN_PASSWORD=monmotdepasse node server.js
```

## Structure

```
├── server.js           # Serveur HTTP + API
├── data/
│   └── content.json    # Contenu du site (textes, URLs images)
├── uploads/            # Images uploadées via l'admin
└── public/
    ├── index.html      # Page d'accueil
    ├── css/style.css
    ├── js/main.js
    └── admin/          # Interface d'administration
```

## API

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/content` | GET | Contenu public du site |
| `/api/admin/login` | POST | Connexion admin |
| `/api/admin/content` | PUT | Sauvegarder le contenu |
| `/api/admin/upload` | POST | Upload d'image |

## Ancien site

L'export HTML Duda original est conservé dans le fichier `test` à la racine du dépôt.
