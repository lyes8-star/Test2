/**
 * Génère un lexique SEO local (métiers × communes) pour recherche interne
 * et sections visibles — jamais pour du stuffing caché.
 */
const fs = require('fs');
const path = require('path');

const metiers = [
  'constructeur de maisons',
  'construction maison neuve',
  'maison clé en main',
  'maison haut de gamme',
  'rénovation maison',
  'rénovation complète',
  'extension maison',
  'agrandissement maison',
  'promotion immobilière',
  'promoteur immobilier',
  'permis de construire',
  'maison RE2020',
  'ossature bois',
  'extension bois',
  'véranda',
  'terrasse',
  'toit terrasse végétalisé',
  'construction piscine',
  'rénovation façade',
  'rénovation toiture',
  'architecte constructeur',
  'maître d\'œuvre',
  'gros œuvre',
  'second œuvre',
  'maison contemporaine',
  'maison traditionnelle',
  'projet immobilier',
  'achat terrain constructible',
  'plans de maison',
  'devis construction',
  'devis rénovation',
  'devis extension',
];

const prefixes = [
  'constructeur maison',
  'construction maison',
  'rénovation maison',
  'extension maison',
  'promoteur immobilier',
  'maison neuve',
  'maison clé en main',
  'entreprise construction',
  'artisan rénovation',
  'travaux extension',
];

const communes = [
  // Siège / cœur
  'Mareil-Marly', 'Saint-Germain-en-Laye', 'Versailles', 'Rueil-Malmaison', 'Marly-le-Roi',
  // Yvelines
  'Le Vésinet', 'Chatou', 'Croissy-sur-Seine', 'Le Pecq', 'Montesson', 'Houilles',
  'Carrières-sur-Seine', 'Sartrouville', 'Maisons-Laffitte', 'Poissy', 'Achères',
  'Conflans-Sainte-Honorine', 'Triel-sur-Seine', 'Andrésy', 'Chanteloup-les-Vignes',
  'Verneuil-sur-Seine', 'Les Mureaux', 'Meulan-en-Yvelines', 'Hardricourt',
  'Mantes-la-Jolie', 'Mantes-la-Ville', 'Limay', 'Rosny-sur-Seine',
  'Épône', 'Aubergenville', 'Flins-sur-Seine', 'Les Clayes-sous-Bois',
  'Plaisir', 'Élancourt', 'Trappes', 'Montigny-le-Bretonneux', 'Guyancourt',
  'Voisins-le-Bretonneux', 'Magny-les-Hameaux', 'Saint-Quentin-en-Yvelines',
  'Toussus-le-Noble', 'Châteaufort', 'Gif-sur-Yvette', 'Buc', 'Jouy-en-Josas',
  'Les Loges-en-Josas', 'Vélizy-Villacoublay', 'Viroflay', 'Chaville',
  'Le Chesnay-Rocquencourt', 'La Celle-Saint-Cloud', 'Bougival', 'Louveciennes',
  'Fourqueux', 'L\'Étang-la-Ville', 'Saint-Nom-la-Bretèche', 'Feucherolles',
  'Chambourcy', 'Orgeval', 'Villennes-sur-Seine', 'Médan', 'Vernouillet',
  'Saint-Germain-de-la-Grange', 'Crespières', 'Davron', 'Noisy-le-Roi',
  'Bailly', 'Fontenay-le-Fleury', 'Saint-Cyr-l\'École', 'Bois-d\'Arcy',
  'Les Essarts-le-Roi', 'Auffargis', 'Lévis-Saint-Nom', 'Coignières',
  'Maurepas', 'La Verrière', 'Le Mesnil-Saint-Denis', 'Chevreuse',
  'Saint-Rémy-lès-Chevreuse', 'Milon-la-Chapelle', 'Magny-les-Hameaux',
  'Rambouillet', 'Gazeran', 'Clairefontaine-en-Yvelines', 'Sonchamp',
  'Ablis', 'Saint-Arnoult-en-Yvelines', 'Dampierre-en-Yvelines', 'Senlisse',
  'Cernay-la-Ville', 'Auffargis', 'Les Mesnuls', 'Montfort-l\'Amaury',
  'Neauphle-le-Château', 'Neauphle-le-Vieux', 'Jouars-Pontchartrain',
  'Villiers-Saint-Frédéric', 'Beynes', 'Thiverval-Grignon', 'Plaisir',
  // Hauts-de-Seine
  'Nanterre', 'Courbevoie', 'Puteaux', 'Suresnes', 'Saint-Cloud',
  'Garches', 'Vaucresson', 'Marnes-la-Coquette', 'Boulogne-Billancourt',
  'Issy-les-Moulineaux', 'Meudon', 'Clamart', 'Sèvres', 'Vanves',
  'Malakoff', 'Montrouge', 'Bagneux', 'Fontenay-aux-Roses', 'Sceaux',
  'Châtenay-Malabry', 'Le Plessis-Robinson', 'Antony', 'Colombes',
  'La Garenne-Colombes', 'Bois-Colombes', 'Asnières-sur-Seine', 'Gennevilliers',
  'Villeneuve-la-Garenne', 'Clichy', 'Levallois-Perret', 'Neuilly-sur-Seine',
  // Paris / périph
  'Paris', 'Paris 16e', 'Paris 15e', 'Paris 17e', 'Boulogne',
  // Départements / régions
  'Yvelines', 'Hauts-de-Seine', 'Île-de-France', 'ouest parisien',
];

const uniqueCommunes = [...new Set(communes)];

const keywords = new Set();

// Base métiers
metiers.forEach((m) => keywords.add(m));

// Combinaisons métier × ville
prefixes.forEach((p) => {
  uniqueCommunes.forEach((ville) => {
    keywords.add(`${p} ${ville}`);
    keywords.add(`${p} à ${ville}`);
    keywords.add(`${p} près de ${ville}`);
  });
});

// Variantes courtes
uniqueCommunes.forEach((ville) => {
  keywords.add(`maison neuve ${ville}`);
  keywords.add(`rénovation ${ville}`);
  keywords.add(`extension ${ville}`);
  keywords.add(`constructeur ${ville}`);
  keywords.add(`travaux maison ${ville}`);
});

const list = [...keywords].sort((a, b) => a.localeCompare(b, 'fr'));

const out = {
  generatedAt: new Date().toISOString(),
  count: list.length,
  cities: uniqueCommunes.sort((a, b) => a.localeCompare(b, 'fr')),
  keywords: list,
};

const dest = path.join(__dirname, '..', 'data', 'seo-keywords.json');
fs.writeFileSync(dest, JSON.stringify(out, null, 2));
console.log(`Wrote ${out.count} keywords and ${out.cities.length} cities → ${dest}`);
