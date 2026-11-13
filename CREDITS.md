# Credits & asset sources

Everything in Undead Siege is original or permissively licensed. **No ripped game assets, no real-world insignia, no third-party textures.**

| What | Source | License |
|---|---|---|
| Three.js r180 (`vendor/three/`) | https://threejs.org — vendored copy of `three.module.js`, `three.core.js`, `addons/BufferGeometryUtils.js` | MIT (see `vendor/three/LICENSE`) |
| All textures (concrete, painted plaster, brick, planks, corrugated metal, grass/dirt, runway, rust, canvas, burlap, chain-link, grating, fog noise, glow) | Generated procedurally at load time in `src/gfx/textures.js` | Original, part of this project |
| All 3D models (bunker, hangar, plane wreck, truck, generator, furniture, props, trees) | Built procedurally from primitives in `src/gfx/*.js` | Original, part of this project |
| Zombie model `assets/zombie/zombie_kestrel_rigged.glb` | Original ZOMBIE-001 design. Made with Higgsfield (reference images → Meshy image-to-3D, auto-rig and animation library clips), merged with glTF-Transform. The LOD (`zombie_kestrel_lod1.glb`) was simplified locally with meshoptimizer | Generated on the owner's paid Higgsfield plan; owned by the project per Higgsfield terms |
| Sound effects, ambience, music and announcer (`assets/audio/`, 29 files) | **Audio generated with ElevenLabs (elevenlabs.io)**: Sound Effects v2, Eleven Music v2.5, Multilingual v2 TTS. Original prompts, no game IP | ElevenLabs **free tier**: attribution required, no commercial licence. Regenerate on a paid plan before any commercial release |
| GLTFLoader, SkeletonUtils (`vendor/three/addons/`) | three.js r180 addons | MIT |
| Map layout "Kestrel Field" | Original design (`kestrel-v2` floor plan) | Original |
| Weapons and first-person arms (7 guns, gloved hands, sleeves), their textures, muzzle flash and smoke sprites | Built procedurally in `src/gfx/guns/`; original designs with made-up names, no real trademarks or markings, nothing taken from other games | Original, part of this project |
| Perk names, Supply Crate, wall chalk outlines, stencils | Original names/shapes drawn in code; no logos or text from other games | Original |

**Attribution: Audio by ElevenLabs (elevenlabs.io).** The game's title screen shows this line too.

No CC0 texture packs (ambientCG / Poly Haven) are used yet. If any are added later, list each one here with its URL and license.
