# Prédiction de la cagnotte du ZEvent 2026

Estimation du total final de l'édition 2026 (la dernière), à partir du compteur
en direct et des courbes de collecte des éditions précédentes.

## Résultat

| | |
|---|---|
| **Réel** | **32 891 874 €** |
| Prédit | 29 808 651 € |
| Erreur | **−9,4 %** — dans l'intervalle 80 % annoncé (26–34 M€), au 82ᵉ centile |

Prédiction faite à h\* = 41,9 h sur 55 h, avec 13,45 M€ au compteur.

`python3 src/score.py` rejoue la confrontation.

### Où est passée l'erreur

λ était mesuré à 1,99 (h=5) puis 1,87 (h=41,9) ; le modèle extrapolait la décroissance
jusqu'à 1,82. En réalité **λ est remonté à 2,03** : le sprint final de la dernière édition
a surperformé celui de 2025. C'est le risque « dernière édition » signalé mais non chiffré.
Ne pas extrapoler la dérive du tout donnait 31,3 M€ (−4,8 %).

Le backtest, lui, désignait un modèle amorti (β=0,25) à 23,9 M€, soit −27 %. L'avoir écarté
au profit du raisonnement sur la forme des courbes a porté l'essentiel de la performance.

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
