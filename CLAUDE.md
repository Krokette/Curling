# Curling Game

Jeu de curling HTML5. Ouvrir `index.html` directement dans un navigateur — aucune installation, aucun build.

## Stack
Vanilla JS + HTML5 Canvas. Aucune dépendance externe.

## Lancer
```
open index.html   # macOS
xdg-open index.html  # Linux
# ou double-clic sur index.html
```

## Fichiers clés
| Fichier | Rôle |
|---|---|
| `js/config.js` | Toutes les constantes physiques et de jeu. Tuner ici si la physique semble off. |
| `js/physics.js` | Boucle physique, friction, curl (sqrt(speed)), collisions élastiques |
| `js/rules.js` | FGZ, hog line, scoring, gestion du marteau |
| `js/ai.js` | Stratégie IA (draw/takeout/guard) + binary search puissance |
| `js/renderer.js` | Tout le dessin Canvas. Aucune logique jeu. |
| `js/input.js` | Souris + clavier → callbacks. Aucune logique jeu. |
| `js/game.js` | Machine d'états, boucle rAF, orchestrateur |

## Règles implémentées
- 4 ends, extra end si égalité
- 8 pierres par équipe par end (16 total), alternance
- Free Guard Zone : les 5 premières pierres d'un end ne peuvent pas être retirées de la FGZ
- Scoring : équipe la plus proche du bouton marque, compte toutes ses pierres plus proches que la meilleure adverse
- Marteau : l'équipe qui score perd le marteau (end blanc = marteau inchangé)
- Sweeping : ESPACE pendant le lancer (réduit friction 28%, curl 55%)

## Contrôles
| Action | Contrôle |
|---|---|
| Viser | Déplacer la souris |
| Curl gauche | Q |
| Curl droit | E |
| Charger la puissance | Clic gauche maintenu |
| Lancer | Relâcher le clic |
| Balayer | ESPACE (pendant le lancer) |

## Tests manuels
1. Lancer avec Q → vérifier courbe gauche
2. Lancer sur une pierre existante → vérifier collision élastique
3. Vérifier FGZ : pierre en FGZ dans les 5 premiers lancers → ne peut pas être retirée
4. Jouer 4 ends → écran GAME_OVER
5. Mode IA → vérifier délai de réflexion + lancer automatique

## Tuning physique
Si les pierres vont trop loin/court : ajuster `FRICTION_COEFF` dans `config.js`.
Si le curl est trop prononcé/faible : ajuster `CURL_COEFF`.
Si les collisions semblent molles/dures : ajuster `RESTITUTION`.
