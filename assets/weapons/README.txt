UNDEAD SIEGE — 10 3D WEAPON MODELS (.GLB)
================================================
Original gameplay viewmodels exported from the current Undead Siege v0.4 game.
Each .glb is a true 3D geometry asset with embedded materials/textures.
Models face negative Z (barrel pointing toward -Z); +Y is up.
The item origin is near the weapon's grip/receiver rather than at world (0,0,0).

CONTENTS:
 pistol.glb    — M1911 classic pistol
 glock.glb     — Glock 17
 revolver.glb  — .357 Magnum revolver
 smg.glb       — MP5-inspired submachine gun
 carbine.glb   — M4A1-style carbine
 rifle.glb     — SCAR-H-style battle rifle
 shotgun.glb   — M870-style pump shotgun
 sniper.glb    — AX-50-style marksman rifle
 lmg.glb       — M249-style light machine gun
 raygun.glb    — ORIGINAL Arc Discharger fantasy energy gun
 manifest.json — part/feature inventory

GAME INTEGRATION:
 The repo's current src/weapon-view.js animates gun holding position, ADS,
 recoil, bolt/pump/cylinder parts and moving magazine for reloads.
 These GLBs are *static* meshes, with parts organized as separate nodes.
 The GLBs do not contain skeletal animation clips. If replacing the procedural
 guns in the game with these assets, use THREE.GLTFLoader and rebind the
 magazine, bolt and pump nodes in the WeaponView choreography. Reusing the
 existing gameplay animation logic is recommended.

QUALITY NOTE:
 These are exported procedural gameplay meshes, NOT photogrammetry or AAA
 licensed weapon scans. Their meshes use original game geometry/texture maps.
 Test scale, handedness, muzzle position, material appearance and performance
 inside the game before swapping them for the current runtime models.

PRIMARY REPOSITORY (USER CHOICE):
 https://github.com/dustieyyy/undead-siege-play

SOURCE:
 Exported from the project's original Undead Siege v0.4 procedural weapon-view geometry.
 The 3D assets in this directory are now stored in the primary repository above.
