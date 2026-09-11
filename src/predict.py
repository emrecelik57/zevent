"""
Prediction de la cagnotte finale du ZEvent 2026.

Methode
-------
Toutes les editions demarrent a 16:00 UTC (18:00 CEST) le vendredi et durent ~55 h.
On aligne donc les editions sur l'heure ecoulee h et on raisonne sur la courbe
cumulee. Deux constats guident le modele :

1. La collecte est tres "back-loaded" : a h~32 (58% du temps ecoule), les
   editions precedentes n'avaient encaisse que 25 a 42% de leur total final.
   Extrapoler lineairement le rythme actuel sous-estime donc lourdement.

2. 2026 suit de tres pres une HOMOTHETIE de 2025 : le rapport
   lambda(h) = cumul2026(h) / cumul2025(h) vaut 1.99 a h=5 et 1.90 a h=32,
   et le rapport des debits instantanes concorde. Aucune paire d'editions
   historiques n'est aussi stable. Les profils 2021/2022/2024 sont eux
   explicitement ecartes : le rapport de 2026 a ces editions derive fortement
   (x2.4->x5.0), signe que 2026 n'a pas leur forme.

L'estimateur central extrapole donc lambda jusqu'a la fin de l'evenement, et
applique le reste-a-collecter de 2025 mis a l'echelle. L'incertitude combine
la derive de lambda et un facteur de forme sur la portion restante.
"""
import json, csv, datetime, math, random, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
H0_2026 = datetime.datetime(2026, 9, 4, 16, 0, tzinfo=datetime.timezone.utc)
H_END = 55.0                      # fin attendue (nuit dimanche -> lundi)
REF = 2025                        # edition de reference retenue
FINALS = {2016: 170770, 2017: 451851, 2018: 1094731, 2019: 3509878, 2020: 5724377,
          2021: 10064480, 2022: 10182126, 2024: 10145881, 2025: 16179096}
# Point 2026 externe : classement relaye le vendredi a 23h CEST (h=5)
EARLY_2026 = (5.0, 2764432)


def load_curves():
    return {e["year"]: e for e in
            json.load(open(os.path.join(ROOT, "data", "editions_curves.json")))["editions"]}


def interp(pts, h):
    if h <= pts[0][0]:
        return pts[0][1]
    for i in range(1, len(pts)):
        if pts[i][0] >= h:
            x0, y0 = pts[i - 1]
            x1, y1 = pts[i]
            return y1 if x1 == x0 else y0 + (y1 - y0) * (h - x0) / (x1 - x0)
    return pts[-1][1]


def load_live():
    obs = []
    for r in csv.DictReader(open(os.path.join(ROOT, "data", "live_2026.csv"))):
        t = datetime.datetime.strptime(r["ts_utc"], "%Y-%m-%dT%H:%M:%SZ").replace(
            tzinfo=datetime.timezone.utc)
        obs.append(((t - H0_2026).total_seconds() / 3600, float(r["total_eur"])))
    return sorted(obs)


def slope_ls(pts):
    """Pente par moindres carres (EUR/h)."""
    n = len(pts)
    mx = sum(p[0] for p in pts) / n
    my = sum(p[1] for p in pts) / n
    num = sum((x - mx) * (y - my) for x, y in pts)
    den = sum((x - mx) ** 2 for x, _ in pts)
    return num / den if den else float("nan")


def main():
    ed = load_curves()
    obs = load_live()
    h_star, D = obs[-1]
    rate26 = slope_ls(obs)

    print("=" * 72)
    print("  ZEVENT 2026 - PREDICTION DE LA CAGNOTTE FINALE")
    print("=" * 72)
    print(f"\n  Depart h0        : vendredi 4 sept. 18:00 CEST")
    print(f"  Observation      : h* = {h_star:.2f} h  ({h_star/H_END:.0%} de l'evenement)")
    print(f"  Cumul observe    : {D:>14,.0f} EUR")
    print(f"  Debit instantane : {rate26:>14,.0f} EUR/h")

    print("\n  --- Positionnement vs editions precedentes (meme heure) ---")
    print(f"  {'ed':>6} {'part du total a h*':>19} {'ratio cumul 2026':>18}")
    for y in (2021, 2022, 2024, 2025):
        c = interp(ed[y]["points"], h_star)
        print(f"  {y:>6} {c/FINALS[y]:>18.1%} {D/c:>17.2f}x")
    print("\n  => les editions passees encaissaient encore 58-75% de leur total")
    print("     APRES ce point : le sprint final domine tout.")

    # --- derive de l'homothetie vs 2025 -------------------------------------
    ref = ed[REF]["points"]
    l1 = EARLY_2026[1] / interp(ref, EARLY_2026[0])
    l2 = D / interp(ref, h_star)
    slope = (math.log(l2) - math.log(l1)) / (h_star - EARLY_2026[0])
    lam_end = math.exp(math.log(l2) + slope * (H_END - h_star))
    rem_ref = FINALS[REF] - interp(ref, h_star)

    print(f"\n  --- Homothetie vs {REF} ---")
    print(f"  lambda(h=5.0)  = {l1:.3f}")
    print(f"  lambda(h={h_star:.1f}) = {l2:.3f}")
    print(f"  derive         = {slope:+.5f} /h  ->  lambda(fin) = {lam_end:.3f}")
    print(f"  reste a collecter en {REF} apres h* : {rem_ref:,.0f} EUR")

    central = D + rem_ref * lam_end
    print(f"\n  --- Scenarios ---")
    for lab, lam in [("lambda fige a l'initial (1.99)", l1),
                     ("lambda fige a l'actuel  (1.90)", l2),
                     ("lambda extrapole (derive)     ", lam_end)]:
        print(f"  {lab} -> {(D + rem_ref*lam)/1e6:>5.1f} M EUR")

    # --- Monte-Carlo --------------------------------------------------------
    rng = random.Random(20260906)
    draws = []
    for _ in range(200_000):
        lam = rng.gauss(lam_end, 0.10)            # incertitude sur la derive
        shape = rng.gauss(1.0, 0.20)              # forme du sprint final vs 2025
        if lam <= 0 or shape <= 0.2:
            continue
        draws.append(D + rem_ref * lam * shape)
    draws.sort()
    qq = lambda p: draws[min(len(draws) - 1, int(p * len(draws)))]

    print("\n  --- Distribution predictive ---")
    for p in (0.05, 0.10, 0.25, 0.50, 0.75, 0.90, 0.95):
        print(f"   {int(p*100):>3}e centile : {qq(p)/1e6:>6.1f} M EUR")
    print(f"\n  ESTIMATION CENTRALE : {central/1e6:.1f} M EUR")
    print(f"  Intervalle 80%      : {qq(0.10)/1e6:.0f} - {qq(0.90)/1e6:.0f} M EUR")
    print(f"  Deja acquis         : {D/1e6:.1f} M EUR (plancher absolu)")
    print(f"  Record 2025         : {FINALS[REF]/1e6:.1f} M EUR  ->  x{central/FINALS[REF]:.2f}")
    print("=" * 72)


if __name__ == "__main__":
    main()
