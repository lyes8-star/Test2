# Mettre à jour le site Procept (sans coder)

**Vous ne devez modifier que ce dossier `contenu/`** (et éventuellement ajouter des images dans `images/`).

Ne touchez **pas** aux dossiers `js/`, `css/`, `admin/`, `scripts/`, ni aux fichiers `server.js`, `sw.js`, etc. — cela risque de casser le site.

---

## Comment modifier un fichier sur GitHub

1. Ouvrez le fichier voulu dans `contenu/` (ex. `site.json`).
2. Cliquez sur l’icône **crayon** (Edit).
3. Modifiez uniquement le texte entre guillemets `"..."`.
4. En bas de page : **Commit changes** (valider).
5. Attendez 1–2 minutes, puis rechargez le site (Ctrl+F5).

---

## Quel fichier pour quoi ?

| Fichier | Ce que vous changez |
|---------|---------------------|
| `site.json` | Téléphone, email, adresse, horaires, réseaux sociaux |
| `diaporama.json` | Images et textes du grand bandeau d’accueil |
| `a-propos.json` | Texte « À propos » |
| `services.json` | Les 3 métiers (construction, rénovation, promotion) |
| `galerie.json` | Photos de la galerie (légendes, catégories) |
| `actualites.json` | Articles d’actualité |
| `faq.json` | Questions / réponses |
| `zones.json` | Villes d’intervention |
| `pages.json` | Textes des pages Constructeur / Rénovation / Promotion |
| `process.json` | Étapes du parcours client |

---

## Exemples

### Changer le téléphone

Dans `site.json`, trouvez :

```json
"phone": "01 39 58 28 23",
```

Remplacez le numéro, **gardez les guillemets et la virgule**.

### Ajouter une photo à la galerie

1. Déposez l’image dans `images/gallery/` (ex. `gal-46.jpg`).
2. Dans `galerie.json`, copiez un bloc existant et adaptez :

```json
{
  "id": "gal-46",
  "image": "images/gallery/gal-46.jpg",
  "imageFull": "images/gallery/gal-46-full.jpg",
  "caption": "Votre légende",
  "category": "construction",
  "status": "termine"
}
```

Catégories possibles : `construction`, `renovation`, `extension`, `chantier`, `promotion`.  
Statuts : `termine` (livré) ou `en-cours`.

### Changer une image du diaporama

Les images du bandeau sont dans `images/hero/`.  
Dans `diaporama.json`, modifiez le champ `"image"` d’un slide (chemin du type `images/hero/slide-1.jpg` ou `images/gallery/...`).

---

## Règles pour ne pas casser le site

- Ne supprimez **jamais** les virgules `,` entre deux lignes (sauf après le **dernier** élément d’une liste).
- Ne cassez pas les `{ }` et `[ ]`.
- Les chemins d’images commencent toujours par `images/...` (pas d’espace dans le nom de fichier).
- Si GitHub affiche une erreur JSON, annulez (`Cancel`) et recommencez, ou demandez de l’aide.

---

## Dossiers images (ne pas renommer)

| Dossier | Usage |
|---------|--------|
| `images/hero/` | Diaporama d’accueil |
| `images/gallery/` | Galerie / réalisations |
| `images/services/` | Photos des cartes métiers |

---

## En cas de doute

Modifiez uniquement `site.json` (coordonnées) : c’est le fichier le plus simple.  
Pour le reste, demandez à la personne qui gère le code technique.
