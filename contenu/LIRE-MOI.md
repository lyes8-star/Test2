# Mettre à jour le site Procept (sans coder)

**Au quotidien, modifiez uniquement les fichiers texte `.json` dans ce dossier `contenu/`.**

Ne touchez **pas** à `js/`, `css/`, `admin/`, `scripts/`, `server.js`, `sw.js`, ni au dossier **`contenu/photos/`** (photos déjà en place — trop technique pour un remplacement manuel).

---

## Comment modifier un fichier sur GitHub

1. Ouvrez le fichier voulu (ex. `site.json`).
2. Cliquez sur l’icône **crayon** (Edit).
3. Modifiez uniquement le texte entre guillemets `"..."`.
4. En bas de page : **Commit changes** (valider).
5. Attendez 1–2 minutes, puis rechargez le site (Ctrl+F5).

---

## Quel fichier pour quoi ?

| Fichier | Ce que vous changez |
|---------|---------------------|
| `site.json` | Téléphone, email, adresse, horaires, réseaux sociaux |
| `diaporama.json` | Titres / textes du bandeau d’accueil |
| `a-propos.json` | Texte « À propos » |
| `services.json` | Descriptions des métiers |
| `galerie.json` | Légendes et catégories des photos |
| `actualites.json` | Articles d’actualité (textes) |
| `faq.json` | Questions / réponses |
| `zones.json` | Villes d’intervention |
| `pages.json` | Textes Constructeur / Rénovation / Promotion |
| `process.json` | Étapes du parcours client |

---

## Exemple : changer le téléphone

Dans `site.json` :

```json
"phone": "01 39 58 28 23",
```

Remplacez le numéro, **gardez les guillemets et la virgule**.

### Changer une légende de galerie

Dans `galerie.json`, modifiez seulement le champ `"caption"` d’une photo existante.  
Ne changez pas les chemins `"image"` / `"imageFull"` sans aide technique.

---

## Photos (`contenu/photos/`)

Les images sont déjà rangées ici (`hero/`, `gallery/`, `services/`).

**Pour un non-informaticien : ne pas ajouter, remplacer ni renommer les fichiers photos.**  
Si une nouvelle photo est nécessaire, demandez à la personne qui gère le site.

---

## Règles pour ne pas casser le site

- Ne supprimez **jamais** les virgules `,` entre deux lignes (sauf après le **dernier** élément d’une liste).
- Ne cassez pas les `{ }` et `[ ]`.
- Si GitHub affiche une erreur JSON, annulez (`Cancel`) et recommencez.

---

## En cas de doute

Modifiez uniquement `site.json` (coordonnées) : c’est le fichier le plus simple.
