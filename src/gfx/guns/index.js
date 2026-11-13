import * as pistols from './pistols.js';
import * as rifles from './rifles.js';
import * as smgs from './smgs.js';
import * as shotguns from './shotguns.js';
import * as mgs from './mgs.js';
export const GUN_BUILDERS = {...pistols, ...rifles, ...smgs, ...shotguns, ...mgs};
