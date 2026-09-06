# Plan de boutique Shopify — Accessoires de bureau

Créneau retenu : **accessoires de bureau / setup**
Marché : **France, français, EUR**
Style : **minimaliste, blanc et noir**

Statut : en attente de ré-autorisation du connecteur Shopify (jeton expiré).
Tout ce qui suit est prêt à exécuter dès la reconnexion.

---

## Pourquoi ce créneau

| Critère | Évaluation |
|---|---|
| Demande | Stable toute l'année, pic septembre (rentrée) et novembre-décembre |
| Panier moyen visé | 45-70 € (2 articles) |
| Marge brute cible | 60-70 % |
| Sourçabilité | Produits génériques déjà existants, nombreux fournisseurs |
| Contenu publicitaire | Très visuel, format « setup tour » performant sur les réseaux |
| Réglementation | Aucune contrainte particulière (contrairement aux cosmétiques) |

---

## Étape 1 — Créer la boutique

Outil : `get-new-store-previews`

```
productOrService : "accessoires bureau, supports écran, tapis bureau, lampes, organisateurs câbles"
targetAudience   : "télétravailleurs 25-40, développeurs, créatifs, setup soigné"
brandStyle       : "minimaliste, noir et blanc, sobre, espace blanc, premium"
locale           : "fr"
```

Retour : jusqu'à 3 aperçus de vitrine (~3 min de génération). Chaque aperçu a un lien
d'inscription ; s'inscrire via ce lien crée la vraie boutique avec ce thème **et des
produits assortis déjà installés**.

Point d'attention : un aperçu ne peut être réclamé que comme boutique **neuve**. Il ne
peut pas être appliqué à une boutique existante.

---

## Étape 2 — Ajouter des produits qui se vendent déjà

Outil : `find-sample-product` — renvoie des produits réels existants (avec visuels)
dans un carrousel. Le bouton « Add this product » les crée directement en brouillon.

Requêtes à lancer, une par catégorie (au singulier, c'est ce que l'outil attend) :

1. `monitor stand` — support d'écran
2. `desk mat` — tapis de bureau
3. `desk lamp` — lampe de bureau
4. `laptop stand` — support d'ordinateur portable
5. `cable organizer` — organisateur de câbles
6. `usb c hub` — hub USB-C
7. `desk organizer` — rangement de bureau

C'est la voie à privilégier : produits déjà existants, visuels réels fournis, aucune
fiche à rédiger de zéro.

---

## Étape 3 — Catalogue de secours (`create-product`)

À utiliser seulement pour ce que l'étape 2 ne couvre pas. Prix de vente calés sur
une marge de 60-70 %.

| Produit | Prix | Coût cible | Marge | Variantes |
|---|---|---|---|---|
| Support d'écran aluminium | 49,90 € | ~16 € | 68 % | Noir / Argent |
| Tapis de bureau cuir végan | 34,90 € | ~11 € | 68 % | 80×40, 90×45 × Noir / Gris |
| Lampe de bureau LED USB-C | 59,90 € | ~21 € | 65 % | Noir / Blanc |
| Support d'ordinateur pliable | 29,90 € | ~9 € | 70 % | Noir / Argent |
| Organisateur de câbles magnétique (lot de 6) | 14,90 € | ~4 € | 73 % | — |
| Hub USB-C 7-en-1 | 44,90 € | ~16 € | 64 % | — |
| Repose-poignets ergonomique | 19,90 € | ~6 € | 70 % | Noir / Gris |
| Boîte de rangement bureau | 27,90 € | ~9 € | 68 % | Bambou / Noir mat |

Règles d'appel `create-product` :
- `status: "DRAFT"` d'abord, publication en masse ensuite (étape 5).
- Dès qu'on passe `variants`, il faut aussi passer `options` (tableau de chaînes :
  `["Taille", "Couleur"]`, ou `["Title"]` pour une variante unique).
- `inventoryItem: { tracked: true }` sur chaque variante, sinon `set-inventory`
  restera sans effet.
- `images` : uniquement des URL HTTPS publiques et réelles. Pas de chemins locaux,
  pas de générateurs d'images aléatoires. Les visuels doivent venir du fournisseur
  ou d'un shooting — à fournir avant publication.

---

## Étape 4 — Collections

Outil : `create-collection`

| Collection | Type | Règle |
|---|---|---|
| Setup complet | manuelle | les 8 produits |
| Ergonomie | intelligente | `TAG CONTAINS "ergonomie"` |
| Câbles & connectique | intelligente | `TAG CONTAINS "cable"` |
| Petits prix — moins de 30 € | intelligente | `VARIANT_PRICE LESS_THAN 30` |
| Meilleures ventes | manuelle, `sortOrder: BEST_SELLING` | alimentée après les premières ventes |

---

## Étape 5 — Mise en ligne

1. `bulk-update-product-status` → `ACTIVE` sur les produits validés (visuels + prix OK).
2. `set-inventory` → stock initial par variante et par emplacement.
3. `create-discount` → code `BIENVENUE10`, 10 % première commande.
4. `run-analytics-query` → suivi des ventes et des produits les plus performants
   après quelques jours, puis on garde les gagnants et on coupe le reste.

---

## Ce qui bloque encore

- **Connecteur Shopify à ré-autoriser** : Réglages → Connecteurs → Shopify, sur claude.ai.
  Sans ça, aucun appel n'aboutit.
- **Visuels produits** : URL HTTPS publiques nécessaires pour tout produit créé
  manuellement. L'étape 2 évite ce problème puisque les produits d'exemple arrivent
  avec leurs images.
