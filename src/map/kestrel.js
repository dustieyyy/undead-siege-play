// KESTREL FIELD v2 — map data (source of truth: kestrel-v2 floor plan).
// Plan coordinates in meters: origin = Ops Room SW corner, +x east, +y north.
// The engine converts to Three.js as X = x, Z = -y, Y = up.
// Everything gameplay-related (doors, costs, buys, perks, crates, spawns,
// barricades) is data so rounds/zombies can be layered on next.

export const F2 = 3.8;          // upper floor walking height
export const GROUND_TOP = 3.8;  // ground-floor walls run up to the slab top
export const UPPER_TOP = 7.2;   // upper-floor walls / bunker roof underside
export const HANGAR_WALL = 7.0; // hangar side-wall height (arch on top, peak ~10.5)
export const HANGAR_PEAK = 10.5;

// Window/door opening presets (sill/top are relative to the wall base).
const WIN = {w: 1.6, sill: .9, top: 2.3};
const DOOR = {w: 2.4, sill: 0, top: 2.6};
const OBS = {w: 2.4, sill: 1.0, top: 2.5};

const win = (at, id, extra = {}) => ({...WIN, at, kind: 'window', barricade: id, ...extra});
const door = (at, id, extra = {}) => ({...DOOR, at, kind: 'door', door: id, ...extra});
const open = (at, extra = {}) => ({...DOOR, at, kind: 'open', ...extra});
const obs = (at, extra = {}) => ({...OBS, at, kind: 'obs', ...extra});

// Areas (for HUD zone names, spawn activation, future AI navigation).
export const AREAS = [
  {id: 'ops', name: 'OPS ROOM', floor: 0, rect: [0, 0, 16, 12], start: true},
  {id: 'mess', name: 'MESS / BRIEFING', floor: 0, rect: [-10, 0, 0, 12]},
  {id: 'walkway', name: 'COVERED WALKWAY', floor: 0, rect: [16, 4, 26, 8]},
  {id: 'depot', name: 'FUEL & STORAGE DEPOT', floor: 0, rect: [16, -8, 26, 4]},
  {id: 'yard', name: 'FENCED YARD', floor: 0, rect: [-10, -12, 16, 0], outdoor: true},
  {id: 'hangar', name: 'HANGAR', floor: 0, rect: [26, -8, 52, 14]},
  {id: 'tower', name: 'TOWER ROOM', floor: 1, rect: [0, 0, 16, 12]},
  {id: 'balcony', name: 'BALCONY', floor: 1, rect: [2, -3, 14, 0], outdoor: true},
  {id: 'quarters', name: "OFFICERS' QUARTERS", floor: 1, rect: [-10, 0, 0, 12]},
  {id: 'catwalk', name: 'CATWALK', floor: 1, rect: [16, 5, 29, 9]},
  {id: 'loft', name: 'HANGAR LOFT', floor: 1, rect: [26, 9, 52, 14]},
];

// Walls: axis-aligned segments. mat: concrete | painted | plank | hangar | brickInt
export const WALLS = [
  // --- Bunker (Ops + Mess) ground floor, 0..3.8
  {a: [-10, 0], b: [16, 0], base: 0, h: GROUND_TOP, mat: 'concrete', inner: 'painted',
    openings: [win(3, 'ops-s1'), win(7, 'ops-s2'), door(12, 'yard-gate', {w: 3, top: 2.8})]},
  {a: [-10, 12], b: [16, 12], base: 0, h: GROUND_TOP, mat: 'concrete', inner: 'painted',
    openings: [win(-5, 'mess-n'), win(4, 'ops-n1'), win(8.4, 'ops-n2')]},
  {a: [-10, 0], b: [-10, 12], base: 0, h: GROUND_TOP, mat: 'concrete', inner: 'painted',
    openings: [win(3, 'mess-w1'), win(9, 'mess-w2')]},
  {a: [16, 0], b: [16, 12], base: 0, h: GROUND_TOP, mat: 'concrete', inner: 'painted',
    openings: [door(6, 'ops-walkway')]},
  {a: [0, 0], b: [0, 12], base: 0, h: GROUND_TOP, mat: 'painted', t: .3,
    openings: [door(6, 'ops-mess')]},
  // --- Depot (single storey, 0..3.6)
  {a: [16, -8], b: [26, -8], base: 0, h: 3.6, mat: 'brick', inner: 'brickInt', openings: [win(21, 'depot-s')]},
  {a: [16, -8], b: [16, 0], base: 0, h: 3.6, mat: 'brick', inner: 'brickInt', openings: [door(-4, 'depot-yard')]},
  {a: [16, 4], b: [26, 4], base: 0, h: 3.6, mat: 'brickInt', t: .3, openings: [door(24, 'walkway-depot')]},
  // --- Covered walkway (plank sides, 0..3.2)
  {a: [16, 8], b: [26, 8], base: 0, h: 3.2, mat: 'plank', t: .2, openings: [win(19, 'walkway-n')]},
  // --- Hangar (side walls 7 m, arched roof)
  {a: [26, -8], b: [52, -8], base: 0, h: HANGAR_WALL, mat: 'hangar', openings: [win(32, 'hangar-s1'), win(46, 'hangar-s2')]},
  {a: [26, 14], b: [52, 14], base: 0, h: HANGAR_WALL, mat: 'hangar',
    openings: [win(40, 'hangar-n'), win(40, 'loft-n', {sill: F2 + .9, top: F2 + 2.3})]},
  {a: [26, -8], b: [26, 14], base: 0, h: HANGAR_WALL, mat: 'hangar', gable: true,
    openings: [win(-1, 'depot-e'), door(6, 'walkway-hangar'), open(6, {sill: F2, top: F2 + 2.5, catwalk: true})]},
  {a: [52, -8], b: [52, 14], base: 0, h: HANGAR_WALL, mat: 'hangar', gable: true,
    openings: [win(3, 'hangar-e', {w: 3.2, sill: 0, top: 4.6})]},
  // --- Upper floor (3.8..7.2)
  {a: [-10, 0], b: [16, 0], base: F2, h: UPPER_TOP - F2, mat: 'concrete', inner: 'painted',
    openings: [obs(3.5), open(8.2, {w: 1.6, top: 2.3}), obs(12.6)]},
  {a: [-10, 12], b: [16, 12], base: F2, h: UPPER_TOP - F2, mat: 'concrete', inner: 'painted',
    openings: [win(-5, 'quarters-n'), win(8, 'tower-n'), obs(3.2, {w: 2})]},
  {a: [-10, 0], b: [-10, 12], base: F2, h: UPPER_TOP - F2, mat: 'concrete', inner: 'painted',
    openings: [win(6, 'quarters-w')]},
  {a: [16, 0], b: [16, 12], base: F2, h: UPPER_TOP - F2, mat: 'concrete', inner: 'painted',
    openings: [door(6, 'catwalk-gate'), obs(10.4, {w: 1.6})]},
  {a: [0, 0], b: [0, 12], base: F2, h: UPPER_TOP - F2, mat: 'painted', t: .3,
    openings: [door(6, 'tower-quarters')]},
];

// Walkable floors above ground (y=0 is everywhere). solid:[bottom,top] relative heights.
// Ramps rise along x from `low` to `high`.
export const FLOORS = [
  // Officers' Quarters + Tower (stair hole at 9.5..14.5 x 9.3..12)
  {rect: [-10, 0, 0, 12], h: F2, mat: 'woodFloor'},
  {rect: [0, 0, 16, 9.3], h: F2, mat: 'woodFloor'},
  {rect: [0, 9.3, 9.5, 12], h: F2, mat: 'woodFloor'},
  {rect: [14.5, 9.3, 16, 12], h: F2, mat: 'concreteFloor', fromGround: true},
  // Balcony, catwalk, landing
  {rect: [2, -3, 14, 0], h: F2, mat: 'concreteFloor', thin: true},
  {rect: [16, 5, 26, 7], h: F2, mat: 'grating', thin: true},
  {rect: [26, 5, 29, 9], h: F2, mat: 'grating', thin: true},
  // Hangar loft (holes over both stairs)
  {rect: [26, 9, 52, 11.6], h: F2, mat: 'plankFloor', thin: true},
  {rect: [26, 11.6, 29.5, 14], h: F2, mat: 'plankFloor', thin: true},
  {rect: [34.5, 11.6, 36, 14], h: F2, mat: 'concreteFloor', fromGround: true},
  {rect: [36, 11.6, 44, 14], h: F2, mat: 'plankFloor', thin: true},
  {rect: [44, 11.6, 45.6, 14], h: F2, mat: 'concreteFloor', fromGround: true},
  {rect: [50.6, 11.6, 52, 14], h: F2, mat: 'plankFloor', thin: true},
];
export const RAMPS = [
  {id: 'ops-stairs', rect: [9.5, 9.3, 14.5, 11.8], low: 9.5, high: 14.5, h: F2},
  {id: 'loft-stairs-w', rect: [29.5, 11.6, 34.5, 13.8], low: 29.5, high: 34.5, h: F2},
  {id: 'loft-stairs-e', rect: [45.6, 11.6, 50.6, 13.8], low: 50.6, high: 45.6, h: F2},
];

// Railings & balustrades: [x0,y0,x1,y1], base, height. full=true runs from the ground.
export const RAILS = [
  {rect: [9.5, 9.15, 14.0, 9.3], base: 0, h: F2 + 1.1, full: true},   // ops stair balustrade
  {rect: [9.4, 9.3, 9.55, 11.8], base: F2, h: 1.1},                    // tower hole west edge
  {rect: [29.5, 11.45, 34.4, 11.6], base: 0, h: F2 + 1.1, full: true}, // NW loft stairs
  {rect: [29.4, 11.6, 29.55, 13.8], base: F2, h: 1.1},
  {rect: [45.7, 11.45, 50.6, 11.6], base: 0, h: F2 + 1.1, full: true}, // NE loft stairs
  {rect: [50.55, 11.6, 50.7, 13.8], base: F2, h: 1.1},
  {rect: [29, 8.9, 52, 9.05], base: F2, h: 1.1},                       // loft edge
  {rect: [28.95, 5, 29.1, 9], base: F2, h: 1.1},                       // landing east edge
  {rect: [26, 4.95, 29, 5.1], base: F2, h: 1.1},                       // landing south edge
  {rect: [16, 4.9, 26, 5.05], base: F2, h: 1.1},                       // catwalk south
  {rect: [16, 6.95, 26, 7.1], base: F2, h: 1.1},                       // catwalk north
  {rect: [2, -3.1, 14, -2.95], base: F2, h: 1.1},                      // balcony front
];

// Purchasable doors / debris / power gates. at = plan point of the opening centre.
export const DOORS = [
  {id: 'ops-mess', name: 'Mess / Briefing', cost: 750, at: [0, 6], dir: 'v', floor: 0, style: 'wood', opens: ['mess']},
  {id: 'ops-walkway', name: 'Covered Walkway', cost: 1000, at: [16, 6], dir: 'v', floor: 0, style: 'steel', opens: ['walkway']},
  {id: 'walkway-depot', name: 'Fuel Depot', cost: 750, at: [24, 4], dir: 'h', floor: 0, style: 'wood', opens: ['depot']},
  {id: 'walkway-hangar', name: 'Hangar', cost: 1250, at: [26, 6], dir: 'v', floor: 0, style: 'steel', opens: ['hangar']},
  {id: 'yard-gate', name: 'Yard Gate', cost: 1250, at: [12, 0], dir: 'h', floor: 0, style: 'steel', w: 3, opens: ['yard']},
  {id: 'depot-yard', name: 'Depot Yard Door', cost: 1000, at: [16, -4], dir: 'v', floor: 0, style: 'wood', opens: ['yard', 'depot']},
  {id: 'ops-stairs', name: 'Tower Stairs', cost: 1000, debris: [9.5, 9.3, 11.4, 11.8], floor: 0, style: 'debris', opens: ['tower', 'balcony']},
  {id: 'tower-quarters', name: "Officers' Quarters", cost: 1250, at: [0, 6], dir: 'v', floor: 1, style: 'wood', opens: ['quarters']},
  {id: 'catwalk-gate', name: 'Catwalk', cost: 0, power: true, at: [16, 6], dir: 'v', floor: 1, style: 'shutter', opens: ['catwalk']},
];

// 23 barricade spots (17 ground incl. 3 yard fence gaps, 6 upper). Boards = 6 each.
// Windows in WALLS reference these ids; fence gaps & balcony ends are standalone.
export const BARRICADES = [
  {id: 'ops-s1', area: 'ops'}, {id: 'ops-s2', area: 'ops'}, {id: 'ops-n1', area: 'ops'}, {id: 'ops-n2', area: 'ops'},
  {id: 'mess-w1', area: 'mess'}, {id: 'mess-w2', area: 'mess'}, {id: 'mess-n', area: 'mess'},
  {id: 'walkway-n', area: 'walkway'},
  {id: 'depot-s', area: 'depot'}, {id: 'depot-e', area: 'depot'},
  {id: 'yard-w', area: 'yard', fence: [-10, -6, 'v']}, {id: 'yard-s1', area: 'yard', fence: [-3, -12, 'h']}, {id: 'yard-s2', area: 'yard', fence: [10, -12, 'h']},
  {id: 'hangar-s1', area: 'hangar'}, {id: 'hangar-s2', area: 'hangar'}, {id: 'hangar-e', area: 'hangar'}, {id: 'hangar-n', area: 'hangar'},
  {id: 'tower-n', area: 'tower'}, {id: 'balcony-w', area: 'balcony', rail: [2, -1.5, 'v']}, {id: 'balcony-e', area: 'balcony', rail: [14, -1.5, 'v']},
  {id: 'quarters-w', area: 'quarters'}, {id: 'quarters-n', area: 'quarters'},
  {id: 'loft-n', area: 'loft'},
];

// Wall-buys: `id` is the weapon id (see WEAPONS); `spot` names the chalk location.
export const WALLBUYS = [
  {id: 'kar98k', spot: 'ops-n', name: 'Kar98k', tier: 1, cost: 500, at: [6.3, 11.75], floor: 0, facing: 'S'},
  {id: 'p38', spot: 'ops-s', name: 'Walther P38', tier: 1, cost: 400, at: [9.2, .25], floor: 0, facing: 'N'},
  {id: 'm1a1', spot: 'mess-e', name: 'M1A1 Carbine', tier: 1, cost: 600, at: [-9.4, 5.2], floor: 0, facing: 'E'},
  {id: 'mosin', spot: 'mess-n', name: 'Mosin-Nagant', tier: 1, cost: 500, at: [-2, 11.75], floor: 0, facing: 'S'},
  {id: 'mp40', spot: 'yard', name: 'MP40', tier: 2, cost: 1000, at: [15.75, -10], floor: 0, facing: 'W'},
  {id: 'trench', spot: 'depot', name: 'M1897 Trench Gun', tier: 2, cost: 1500, at: [25.4, -4], floor: 0, facing: 'W'},
  {id: 'doublebarrel', spot: 'depot-n', name: 'Double-Barreled Shotgun', tier: 2, cost: 1200, at: [19, 3.82], floor: 0, facing: 'S'},
  {id: 'thompson', spot: 'walkway', name: 'Thompson', tier: 2, cost: 1200, at: [23, 7.88], floor: 0, facing: 'S'},
  {id: 'bar', spot: 'hangar-e', name: 'BAR', tier: 3, cost: 1800, at: [51.4, -6], floor: 0, facing: 'W'},
  {id: 'stg44', spot: 'hangar-s', name: 'STG-44', tier: 3, cost: 1600, at: [39, -7.4], floor: 0, facing: 'N'},
  {id: 'g43', spot: 'tower', name: 'Gewehr 43', tier: 3, cost: 1200, at: [15.4, 2.2], floor: 1, facing: 'W'},
  {id: 'garand', spot: 'quarters', name: 'M1 Garand', tier: 3, cost: 1400, at: [-2, 11.75], floor: 1, facing: 'S'},
];

export const SUPPLY_CRATES = [
  {id: 'crate-1', at: [3.6, 7.8], floor: 0, rot: 0, firstSpawn: true},
  {id: 'crate-2', at: [22, -7.1], floor: 0, rot: 0},
  {id: 'crate-3', at: [40, 12.9], floor: 0, rot: 0},
  {id: 'crate-4', at: [-7.6, 11], floor: 1, rot: 0},
];
export const SUPPLY_CRATE_COST = 950;

export const PERKS = [
  {id: 'second-wind', name: 'Second Wind', cost: 500, needsPower: false, at: [-3.5, .75], floor: 0, facing: 'N', color: 0x7fb0d8},
  {id: 'field-ration', name: 'Field Ration', cost: 2000, needsPower: true, at: [18.4, -2.6], floor: 0, facing: 'E', color: 0xd8b25a},
  {id: 'iron-lung', name: 'Iron Lung', cost: 2500, needsPower: true, at: [51.25, 6.6], floor: 0, facing: 'W', color: 0xc8483c},
  {id: 'quickhand', name: 'Quickhand', cost: 3000, needsPower: true, at: [28, -7.3], floor: 0, facing: 'N', color: 0x6fbf73},
];

export const POWER = {at: [48.25, 7.75], cage: [46.5, 7.5, 50, 11], floor: 0};

// Zombie spawn zones (outside, fogged). Activation by unlocked area.
export const SPAWN_ZONES = [
  {id: 'treeline', name: 'Treeline', rect: [-19.5, -11, -14.5, 11], activeFrom: 'start'},
  {id: 'crash-site', name: 'Crash Site', rect: [-2, 17, 42, 21], activeFrom: 'start'},
  {id: 'runway-fog', name: 'Runway Fog', rect: [-7, -20.25, 27, -15.75], activeFrom: 'yard'},
  {id: 'apron', name: 'Apron', rect: [54.5, -8, 59.5, 14], activeFrom: 'hangar'},
  {id: 'fuel-dump', name: 'Fuel Dump', rect: [32, -15.5, 48, -11.5], activeFrom: 'hangar'},
];

// Easter-egg anchors (placeholders for the Morse egg).
export const SECRETS = {
  radio: {at: [2.2, 1.4], floor: 0},
  locker: {at: [-2, 11.4], floor: 1},
  morseLamps: [{at: [-1, -17.6], kind: 'dot'}, {at: [17, -17.6], kind: 'dash'}],
  parachuteDrop: [4, -4],
};

// Static obstacle footprints (props with collision).
export const OBSTACLES = [
  {id: 'truck', rect: [2, -9, 8, -6], h: 2.6},
  {id: 'yard-sandbags', rect: [-7, -10, -4, -7.5], h: 1.1},
  {id: 'drum-stack', rect: [16.6, -7.6, 19, -5.2], h: 1.9},
  {id: 'plane', rect: [33, 0, 45, 6], h: 3.2},
  {id: 'generator', rect: [46.9, 8.5, 49.7, 10.8], h: 1.7},
  {id: 'cage-w', rect: [46.45, 7.5, 46.6, 11.05], h: 2.5},
  {id: 'cage-e', rect: [49.9, 7.5, 50.05, 11.05], h: 2.5},
  {id: 'cage-n', rect: [46.45, 10.9, 50.05, 11.05], h: 2.5},
  {id: 'ops-desks', rect: [6.3, 5.6, 9.1, 6.5], h: .95},
  {id: 'ops-cabinets', rect: [10.6, 3.2, 11.6, 5.2], h: .7},
  {id: 'mess-table-1', rect: [-7.25, 3.5, -6.35, 7.5], h: .8},
  {id: 'mess-table-2', rect: [-3.65, 3.5, -2.75, 7.5], h: .8},
  {id: 'mess-stove', rect: [-9.6, 10.2, -8.6, 11.6], h: 1.2},
  {id: 'depot-racks', rect: [16.4, 2.9, 23, 3.8], h: 2.4},
  {id: 'depot-shelf-e', rect: [25.0, .6, 25.8, 3.6], h: 2.2},
  {id: 'hangar-bench-1', rect: [35, -7.8, 38, -7.0], h: .95},
  {id: 'hangar-bench-2', rect: [40.5, -7.8, 43.5, -7.0], h: .95},
  {id: 'hangar-engine', rect: [43.4, -4.6, 44.8, -3.2], h: 1.5},
  {id: 'hangar-tires', rect: [27, 2, 28.2, 3.2], h: 1.2},
  {id: 'quarters-bunk-1', rect: [-9.75, .4, -8.85, 2.5], h: 1.8, floor: 1},
  {id: 'quarters-bunk-2', rect: [-9.75, 2.9, -8.85, 5.0], h: 1.8, floor: 1},
  {id: 'quarters-bed', rect: [-6.4, 9.5, -4.3, 10.5], h: .6, floor: 1},
  {id: 'quarters-desk', rect: [-4.2, 1, -2.4, 1.8], h: .78, floor: 1},
  {id: 'quarters-lockers', rect: [-3.2, 11.25, -.8, 11.8], h: 1.9, floor: 1},
  {id: 'tower-desk', rect: [1, .25, 6, 1.05], h: .8, floor: 1},
  {id: 'tower-chart', rect: [6.5, 5.2, 8.5, 6.6], h: .9, floor: 1},
  {id: 'tower-rack', rect: [.25, 9.6, .9, 11.6], h: 1.9, floor: 1},
  {id: 'loft-crates', rect: [38, 12.6, 40.2, 13.8], h: 1.4, floor: 1},
];

export const START = {at: [7, 4.5], yaw: 0}; // facing north

export const TELEPORTS = [
  {id: 'ops', at: [7, 4.5], floor: 0, yaw: 0},
  {id: 'mess', at: [-5, 6], floor: 0, yaw: -Math.PI / 2},
  {id: 'walkway', at: [18, 6], floor: 0, yaw: -Math.PI / 2},
  {id: 'depot', at: [21, 1.5], floor: 0, yaw: Math.PI},
  {id: 'yard', at: [-4, -4], floor: 0, yaw: -2.2},
  {id: 'hangar', at: [28.5, -4], floor: 0, yaw: -1.25},
  {id: 'power', at: [48.2, 6.4], floor: 0, yaw: 0},
  {id: 'tower', at: [4, 4], floor: 1, yaw: -1.2},
  {id: 'balcony', at: [8, -1.5], floor: 1, yaw: Math.PI},
  {id: 'quarters', at: [-2, 2], floor: 1, yaw: .6},
  {id: 'catwalk', at: [17.5, 6], floor: 1, yaw: -Math.PI / 2},
  {id: 'loft', at: [37, 10.2], floor: 1, yaw: -1.9},
];

// Yard fence (chain-link + planks + barbed wire). Gaps hold barricades.
export const FENCES = [
  {a: [-10, -12], b: [-10, 0], h: 2.5, gaps: [{at: -6, w: 2, barricade: 'yard-w'}]},
  {a: [-10, -12], b: [16, -12], h: 2.5, gaps: [{at: -3, w: 2, barricade: 'yard-s1'}, {at: 10, w: 2, barricade: 'yard-s2'}]},
  {a: [16, -12], b: [16, -8], h: 2.5, gaps: []},
];
