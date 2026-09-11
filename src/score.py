"""Post-mortem : confronte la prediction au resultat reel du ZEvent 2026."""
import json, math, random, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ACTUAL = 32_891_874.15          # total final officiel (API ZEvent, evenement clos)
F2025 = 16_179_096

d = json.load(open(os.path.join(ROOT, "data", "chart_data.json")))
D, rem_ref = d["d_now"], F2025 - 7_201_784   # reste 2025 apres h*=41.87

print("=" * 68)
print("  POST-MORTEM ZEVENT 2026")
print("=" * 68)
print(f"\n  Reel                : {ACTUAL:>14,.0f} EUR")
print(f"  Predit (central)    : {d['central']:>14,.0f} EUR")
err = d["central"] / ACTUAL - 1
print(f"  Erreur              : {err:>13.1%}  ({(d['central']-ACTUAL)/1e6:+.1f} M EUR)")
print(f"  Intervalle 80%      : {d['p10']/1e6:.1f} - {d['p90']/1e6:.1f} M EUR"
      f"  -> {'DANS' if d['p10']<=ACTUAL<=d['p90'] else 'HORS'} l'intervalle")

# percentile du reel dans la distribution predictive
rng = random.Random(20260906)
draws = []
for _ in range(200_000):
    lam, shape = rng.gauss(d["lambda_end"], 0.10), rng.gauss(1.0, 0.20)
    if lam > 0 and shape > 0.2:
        draws.append(D + rem_ref * lam * shape)
draws.sort()
pct = sum(1 for x in draws if x < ACTUAL) / len(draws)
print(f"  Position du reel    : {pct:.0%}e centile de la distribution predite")

print("\n  --- Ou est passee l'erreur : lambda ---")
lam_real = ACTUAL / F2025
print(f"  lambda mesure a h=5.0  : {d['lambda_early']:.3f}")
print(f"  lambda mesure a h=41.9 : {d['lambda_now']:.3f}")
print(f"  lambda EXTRAPOLE (fin) : {d['lambda_end']:.3f}   <- hypothese retenue")
print(f"  lambda REEL      (fin) : {lam_real:.3f}   <- il est REMONTE, pas descendu")

print("\n  --- Classement retrospectif des modeles testes ---")
cands = [("Homothetie, lambda fige a l'initial (1.99)", D + rem_ref * d["lambda_early"]),
         ("Homothetie, lambda fige a l'actuel  (1.87)", D + rem_ref * d["lambda_now"]),
         ("Homothetie, lambda extrapole   [RETENU]", d["central"]),
         ("Puissance amortie beta=0.25 [optimum backtest]", 23_900_000),
         ("Regression front-loading", 22_400_000),
         ("Additif", 20_300_000)]
for lab, v in sorted(cands, key=lambda c: abs(c[1] / ACTUAL - 1)):
    print(f"  {abs(v/ACTUAL-1):>6.1%}  {v/1e6:>5.1f} M   {lab}")
print("=" * 68)
