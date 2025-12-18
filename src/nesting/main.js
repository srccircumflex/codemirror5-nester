// Distributed under an MIT license: https://codemirror.net/5/LICENSE

/**
 * CodeMirror - Nesting Mode Extension
 * -----------------------------------------------------------------------------
 * An extension for CodeMirror 5 that enables
 * the nesting of modes for complex requirements.
 *
 * This module sets `CodeMirror.Nester(mainMode, ...subModeConfigs)`
 * as a mode constructor.
 *
 * -----------------------------------------------------------------------------
 * Author: Adrian F. Hoefflin [srccircumflex]                          Nov. 2025
 */

import { Top } from "./top.js";
import TopComponents from "./top.js";
import NestComponents from "./nest.js";
import { NESTER } from "./flag.js";


function Nester (topMode, ...nestConfigs) {return Top.Root(topMode, nestConfigs);}
Nester.version = "0.1";
Nester.NESTER = NESTER;
Object.assign(Nester, TopComponents);
Object.assign(Nester, NestComponents);


export default function (CodeMirror) {
  CodeMirror.Nester = Nester;
  CodeMirror.prototype.Nester = Nester;
}
