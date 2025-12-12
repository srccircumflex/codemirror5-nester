import { startState } from "../modes.js";
import { NESTER } from "./flag.js"



export function serializeToken (token) {
  if (token == null || typeof token != "object") {
    token = {token: token || ""};
  } else if (typeof token.token == "object") {
    token = {...token, ...token.token};
  }
  return token;
}

// TODO: delimParse: string | true | (stream, state) → token
export function mergeToken (base, update) {
  base = serializeToken(base), update = serializeToken(update);
  let token;
  if (base.token && update.token) {
    token = `${base.token} ${update.token}`;
  } else {
    token = update.token;
  }
  return {...base, ...update, token: token};
}

export function getActiveConf (state) {return state.masks.length ? state.masks[state.masks.length-1] : state.nest;}

export const TokenGetters = {
  tokenGetter: function (stream, nest) {return serializeToken(nest.mode.token(stream, nest.state))},
  delimTokenGetter: function (stream, state, type) {return serializeToken(getActiveConf(state).delimToken(stream, state, type))},
  skip: (stream) => stream.skipToEnd(),
};

export const NestStateStarters = {
  default: (mode, indent, nesterState) => startState(mode, indent, nesterState),
  skip: (mode, indent, nesterState) => {
    var nest = startState(mode, indent, nesterState);
    if (mode.NESTER !== NESTER) {
      nest.tokenGetter = nest.delimTokenGetter = TokenGetters.skip;
    }
    return nest;
  },
};


export function rootNest (state) {
  while (state.nesterState) {state = state.nesterState;}
  return state;
}


let RegExp_escape;
if (Object.hasOwn(RegExp, "escape")) {
  RegExp_escape = RegExp.escape;
} else {
  RegExp_escape = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export { RegExp_escape };
