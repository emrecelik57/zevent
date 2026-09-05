# Prédiction de la cagnotte du ZEvent 2026

Estimation du total final de l'édition 2026 (la dernière), à partir du compteur
en direct et des courbes de collecte des éditions précédentes.

## Résultat

**≈ 30 M€** (intervalle 80 % : **26 – 35 M€**), soit ~1,9× le record de 2025.

Estimation faite à h\* ≈ 32 h sur ~55 h d'événement, avec 12,87 M€ déjà collectés.

## Données

| Source | Contenu |
|---|---|
| `https://zevent.fr/api/` | compteur officiel en direct, cagnottes par streamer |
| `zevent-cagnotte.vercel.app` | courbes cumulées horodatées 2019–2025 (relevés ZEvenTracker / InGDoc) |
| Wikipédia FR/EN | totaux finaux par édition |

- `data/editions_curves.json` — courbes `[heure_depuis_h0, cumul_€]` par édition.
- `data/live_2026.csv` — échantillonnage du compteur officiel (1/min).

Toutes les éditions démarrent à 16:00 UTC (18:00 CEST) le vendredi et durent
~55 h, ce qui permet de les aligner sur l'heure écoulée `h`.

## Méthode

Deux faits structurent le modèle :

1. **La collecte est très back-loaded.** À h ≈ 32 (58 % du temps écoulé), les
   éditions passées n'avaient encaissé que 25–42 % de leur total ; 58 à 75 %
   arrivait ensuite, concentré sur les dernières heures. Extrapoler le rythme
   courant sous-estime donc lourdement.

2. **2026 est une homothétie de 2025.** Le rapport
   `λ(h) = cumul₂₀₂₆(h) / cumul₂₀₂₅(h)` vaut 1,99 à h=5 et 1,90 à h=32, et le
   rapport des *débits instantanés* concorde (~1,9–2,0). Aucune paire
   d'éditions historiques n'est aussi stable.

   Les profils 2021/2022/2024 sont écartés explicitement : le rapport de 2026 à
   ces éditions dérive de ×2,4–3,7 à ×4,2–5,0 entre h=5 et h=32, donc 2026 n'a
   pas leur forme.

L'estimateur central extrapole λ jusqu'à la fin puis met à l'échelle le
reste-à-collecter de 2025 :

```
F = D(h*) + [F₂₀₂₅ − cumul₂₀₂₅(h*)] × λ_fin
```

L'incertitude (Monte-Carlo) combine la dérive de λ et un facteur de forme sur
le sprint final.

## Limites

- **Une seule référence.** Le modèle repose sur 2025 ; le backtest leave-one-out
  montre qu'une homothétie entre deux éditions de *formes* différentes se trompe
  de 20–60 %. Ici la forme concorde, mais ce critère n'est pas validable sur
  l'historique (aucune paire passée n'est aussi stable).
- **Extrapolation hors domaine.** 2026 est très au-delà de la plage historique
  des finaux (10–16 M€).
- **Anomalie 2025.** La courbe 2025 contient un saut de +2,3 M€ entre h=29 et
  h=30, qui gonfle sa part collectée à h\*. 2026 semble avoir connu des sursauts
  comparables (Mastu, Domingo, MisterMV), la comparaison reste cohérente.
- **Trou de données 2026** entre h=5 et h=32 : λ n'est mesuré qu'en deux points.
- **Effet « dernière édition »** non modélisé : risque asymétrique à la hausse
  sur le final.

## Usage

```bash
python3 src/predict.py
```
