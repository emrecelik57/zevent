# Kartoon Grand Prix

Jeu de course de karts en 3D dans le navigateur, façon « kart de salon » : 8 pilotes
animaux, 5 circuits, objets, dérapages avec mini-turbo, Grand Prix, contre-la-montre
avec fantôme et mode 2 joueurs en écran partagé.

## Jouer

Ouvrir `index.html` dans Chrome, Edge ou Firefox (connexion Internet nécessaire :
le moteur 3D three.js est chargé depuis un CDN). Clic ou Entrée sur l'écran titre.

| Action | Clavier | Manette |
|---|---|---|
| Accélérer / freiner | `↑` `↓` ou `Z` `S` | A / B (ou RT / LT) |
| Tourner | `←` `→` ou `Q` `D` | stick gauche, croix |
| Saut / dérapage | `Espace` ou `Maj` | RB |
| Objet (maintenir = traîner derrière) | `E`, `X` ou `Ctrl` | LB / X |
| Lancer en arrière | `↓` + objet | B + objet |
| Regarder derrière | `C` | Y |
| Pause / plein écran | `Échap` ou `P` / `F` | Start |

À 2 joueurs : J1 = `Z Q S D` + `Espace` (saut) + `E` (objet) ; J2 = flèches +
`Maj droite` (saut) + `Entrée` (objet). Avec deux manettes, chacune pilote un joueur.

Astuces : maintenir le saut en tournant pour déraper (étincelles bleues → orange →
violettes, relâcher pour un mini-turbo) ; appuyer sur saut en l'air après un tremplin
pour une figure ; accélérer juste après le « 2 » pour un départ canon.

## Contenu

- **Pilotes** : Roux (renard), Bambou (panda), Gribouille (grenouille), Pompon (lapin),
  Boulon (robot), Glaçon (pingouin), Croc (dino), Moustache (chat), chacun avec ses
  stats (vitesse, accélération, maniabilité, poids).
- **Circuits** : Prairie Pétillante, Canyon Cactus, Pic Givré, Néon City, Route Cosmique.
- **Objets** : banane (×3), palet vert (×3), missile rouge à tête chercheuse, bombe,
  nitro (×3), étoile d'invincibilité, éclair, comète bleue qui vise le premier.
- **Modes** : Grand Prix (5 courses, points 15-12-10-8-6-4-2-1, podium), course libre,
  contre-la-montre (record et fantôme sauvegardés dans le navigateur), 2 joueurs.
- Cylindrées 50cc à 200cc, musique et bruitages synthétisés (Web Audio), options
  (volumes, qualité graphique, caméra, accélération automatique).

## Développement

Le code source est dans `src/` ; `index.html` est généré :

```bash
node build.mjs        # régénère index.html (un seul fichier autonome)
```

Ordre d'assemblage : `core, audio, input, textures, models, tracks, track, decor, fx,
kart, ai, items, camera, race, hud, menu, main` (voir `build.mjs`). Les circuits sont
décrits dans `src/tracks.js` par des points de contrôle `[x, z, hauteur, largeur]`.
