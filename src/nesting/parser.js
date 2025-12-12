import { NESTER } from "./flag.js"
import { Pass } from "../util/misc.js";



function _searchOpen (stream, nests, cur) {
  let conf, match, found = null, data = stream.data.slice(cur);
  for (conf of nests) {
    match = conf.open.exec(data);
    if (match) {
      match.conf = conf;
      match.cur = cur;
      if (!found || !found.conf.comp(found, match)) found = match;
    }
  }
  return found;
}

function _regEnd (stream, state, nest, cur) {
  var match = nest._close(stream, cur);
  if (match) {
    match.state = state;
  }
  state.end = match;
}


function serialNullToken (token) {
  if (token == null || typeof token != "object") token = {token: token, delim: "_"};
  else token.delim = "_" + (token.delim || "");
  return token;
}


export const NestParser = new class {

  /**
   * Configure the continuation of the parsing process at start of line
   * (interface to `continuation`)
   * Possible steps:
   *  - `untilEOL` →
   *  - `untilSubInnerClose` →
   *  - `SeparateDelimParser.delimOpen` →
   *  - `StaticDelimParser.entry` →
   *  - → `*continuation`
   */
  atSOL = (stream, state) => {return this.continuation(stream, state, stream.pos);}

  /**
   * Parse to the end of the line through the active mode.
   * Possible steps:
   *  - `*continuation` →
   *  - `*MaskParser.continuation` →
   *  - → `atSOL`
   */
  untilEOL = (stream, state) => {
    let token = this.innerToken(stream, state);
    if (stream.drt()) {state.parser = this.atSOL;}
    return token;
  }

  untilMask = (stream, state) => {
    let token = this.innerToken(stream, state);
    if (stream.drt()) state.parser = MaskParser.start;
    return token;
  }


  // NestParserBase...
  innerToken (stream, state) {return state.nest.tokenInner(state.tokenGetter(stream, state.nest));}

  searchOpen (stream, nests) {return _searchOpen(stream, nests, stream.pos)};

  _baseContinuation (stream, state, activeNest) {
    let mask;
    if (activeNest.masks.length) {
      // Search for masks that could prevent closure.
      // *@conf* [ masks: Array[MaskConfig, ...] ]
      mask = this.searchOpen(stream, activeNest.masks);
      if (mask && (!state.end || mask.conf.comp(mask, state.end))) {
        // the beginning of the found mask is before the end of this mode
        // (or has a greater significance at the same position)
        state.next = mask;
        if (!mask.index) {
          state.parser = MaskParser.start;
        } else {
          stream.delim = stream.pos + mask.index;
          state.parser = this.untilMask;
        }
      } else {
        mask = false;
      }
    }
    if (!mask) {
      if (state.end) {
        if (!state.end.index) {
          // closes directly at the current stream position
          if (!state.end[0]) {
            // null token
            this.leave(state);
              // state.parser = MainParse.entry
            if (state.nestLv) {
              // is not root
              return Pass;
                // handle null token at parent nest
            } else {
              return serialNullToken(state.parser(stream, state));
            }
          } else {
            stream.delim = stream.pos + state.end[0].length;
            state.parser = this.finalizeDirectDelim;
          }
        } else {
          stream.delim = stream.pos + state.end.index;
          if (!state.end[0]) {
            // null token
            state.parser = this.finalizeToNullDelim;
          } else {
            state.parser = this.finalizeToDelim;
          }
        }
      } else {
        // active at least until end of line
        state.parser = this.untilEOL;
      }
    }
    return state.parser(stream, state);
  }
  /**
   * Configure the continuation of the parsing process depending on
   * a possible end of the active sub mode, the status of a possible
   * subordinate `Nest` or possible mask configuration.
   * Possible steps:
   *  - `atSOL` →
   *  - `entry` →
   *  - `*MaskParser.continuation` →
   *  - → `MaskParser.entry`
   *  - → `finalizeDirectDelim`
   *  - → `finalizeToNullDelim`
   *  - → `finalizeToDelim`
   *  - → `untilEOL`
   *  - → `untilSubInnerClose`
   *  - → `<subordinate Nest>.preStartSub`
   *  - → `<subordinate Nest>.startSub`
   *  - → `MainParser.entry`
   */
  continuation = (stream, state) => {

    let thisNest = state.nest;
    if (thisNest.mode.NESTER === NESTER) {
      //return thisNest.mode.state.parser(stream, thisNest.mode.state);
      //return thisNest.mode.parser.continuation(stream, thisNest.mode.state);
      // sub mode is a Nest
      if (thisNest.state.nest || thisNest.state.next) {
        // active or designated nest mode in the subordinate Nest
        state.parser = this.untilInnerNestClose;
        return state.parser(stream, state);
      } else {
        this.regEnd(stream, state);
        if (TopParser.regNextNest(stream, thisNest.state)) {
          // designated sub mode in the subordinate Nest found
          let next = thisNest.state.next;
          if (!state.end || next.match.conf.comp(next.match, state.end)) {
            // the beginning of the found sub mode in the subordinate Nest is before the end of this mode
            // (or has a greater significance at the same position)
            return next.run(stream, thisNest.state);
              // preStartSub | startSub
          } else {
            // the beginning of the found sub mode has a lower significance, clean up for the next iteration
            thisNest.state.next = undefined;
          }
        }
      }
    } else {
      this.regEnd(stream, state);
    }
    return this._baseContinuation(stream, state, thisNest);
  }

  regEnd (stream, state) {return _regEnd(stream, state, state.nest, stream.pos);}

  /**
   * Parse through the active sub mode until its sub mode is inactive.
   * Possible steps:
   *  - `*continuation` →
   *  - `*MaskParser.continuation` →
   *  - → `atSOL`
   */
  untilInnerNestClose = (stream, state) => {
    let token = this.innerToken(stream, state);
    if (!(state.nest.state.nest || state.nest.state.next)) {
      if (token === Pass) {
        // null token
        return serialNullToken(this.atSOL(stream, state));
      }
      state.parser = this.atSOL;
    }
    return token;
  };

  /**
   * Reset the parser state at the end of the sub mode and register possible suffix configurations for the following iteration.
   */
  leave (state) {
    state.suffixes = state.nest.suffixes;
    state.nestStack._end(state)
    TopParser.comeback(state);
  };

  DelimTags = {
    openStart: ">o",
    openInner: "o",
    openStop: "o<",
    openIso: ">o<",
    closeStart: ">c",
    closeInner: "c",
    closeStop: "c<",
    closeIso: ">c<",
    closeNull: "_c<",
  };

  delimToken = (stream, state, type) => state.delimTokenGetter(stream, state, type);
  delimOpenContinue = (stream, state) => {
    let token = this.delimToken(stream, state, this.DelimTags.openInner);
    if (stream.drt()) {
      state.parser = this.atSOL;
      return {token: token, delim: this.DelimTags.openStop};
    }
    return {token: token, delim: this.DelimTags.openInner};
  }
  delimOpen = (stream, state) => {
    let token = this.delimToken(stream, state, this.DelimTags.openStart);
    if (stream.drt()) {
      state.parser = this.atSOL;
      return {token: token, delim: this.DelimTags.openIso};
    } else {
      state.parser = this.delimOpenContinue;
      return {token: token, delim: this.DelimTags.openStart};
    }
  }
  delimCloseContinue = (stream, state) => {
    let token = this.delimToken(stream, state, this.DelimTags.closeInner);
    if (stream.drt()) {
      this.leave(state);
      return {token: token, delim: this.DelimTags.closeStop};
    }
    return {token: token, delim: this.DelimTags.closeInner};
  }
  delimClose = (stream, state) => {
    let token = this.delimToken(stream, state, this.DelimTags.closeStart);
    if (stream.drt()) {
      this.leave(state);
      return {token: token, delim: this.DelimTags.closeIso};
    } else {
      state.parser = this.delimCloseContinue;
      return {token: token, delim: this.DelimTags.closeStart};
    }
  }
  entry = (stream, state, startMatch) => {
    stream.delim = stream.pos + startMatch[0].length;
    state.parser = this.delimOpen;
    return state.parser(stream, state);
  }
  finalizeToDelim = (stream, state) => {
    let token = this.innerToken(stream, state);
    if (stream.drt()) {
      this.regEnd(stream, state);
      if (state.end) /* todo (debug) */ stream.delim = stream.pos + state.end[0].length;
      state.parser = this.delimClose;
    }
    return token;
  }
  finalizeDirectDelim = this.delimClose;
  finalizeToNullDelim = (stream, state) => {
    let token = this.innerToken(stream, state);
    if (stream.drt()) {
      this.leave(state);
      return {token: token, delim: this.DelimTags.closeNull}
    }
    return token;
  }
}()


export const MaskParser = new class extends NestParser.constructor {
  // Parser that prevents leaving a certain mode as long as a mask configuration is effective.
  // *@conf* @main [ mask: true ]
  // *@conf* @sub [ masks: Array[MaskConfig, ...] ]

  // Note: Features such as autocloseDelims should not be implemented for MaskParser,
  // as existing CM modes must sometimes have delimiters and content
  // (otherwise this can lead to infinite loops).

  DelimTags = {
    openFlavor: ">!o",
    closeFlavor: "c!<",
    iso: ">!<",
  };

  target (state) {return state[state.target];}
  innerToken = (stream, state) => {
    let target = this.target(state);
    return target.tokenInner(state.tokenGetter(stream, target));
  };
  delimToken = (stream, state, type) => state.delimTokenGetter(stream, state, type);

  getActiveMask = (state) => state.masks[state.masks.length - 1];

  regEnd (stream, state, activeMask, cur) {return _regEnd(stream, state, activeMask, cur);}
  searchOpen (stream, nests, cur) {return _searchOpen(stream, nests, cur);}

  /**
   * Configure the continuation of the mask parsing process depending on
   * a end or possible nested mask configuration.
   * Possible steps:
   *  - `entry` →
   *  - → `entry`
   *  - → `finalizeToMain`
   *  - → `*SubParser.continuation`
   */
  continuation = (stream, state, cur) => {
    let activeMask = this.getActiveMask(state);
    this.regEnd(stream, state, activeMask, cur);

    if (activeMask.masks.length) {
      // Search for masks that could prevent closure.
      // *@conf* [ masks: Array[MaskConfig, ...] ]
      let maskMatch = this.searchOpen(stream, activeMask.masks, cur);
      if (maskMatch && (!state.end || maskMatch.conf.comp(maskMatch, state.end))) {
        // the beginning of the found mask is before the end of this mode
        // (or has a greater significance at the same position)
        state.masks.push(maskMatch.conf.Start(stream, maskMatch, state));
        return this._advance_continuation(stream, state, cur, maskMatch);
      }
    }

    if (state.end) {
      // confirmed end -> reduce stack
      state.masks.pop();
      let rel_end = state.end.index + state.end[0].length;
      if (state.masks.length) {
        return this._advance_continuation(stream, state, cur, state.end);
      } else if (cur == stream.pos && !rel_end) {
        // null token
        this.leave(state);
          // state.parser = MainParse.entry
        if (state.nestLv) {
          // is not root
          return Pass;
            // handle null token at parent nest
        } else {
          return serialNullToken(state.parser(stream, state));
        }
      } else {
        stream.delim = cur + rel_end;
        state.parser = this.untilEND;
      }
    } else {
      state.parser = this.untilEOL;
    }
    return state.parser(stream, state);
  };

  _advance_continuation = (stream, state, cur, match) => this.continuation(stream, state, cur + match.index + match[0].length);

  untilEND = (stream, state) => {
    let token = this.innerToken(stream, state);
    if (stream.drt()) {this.leave(state);}
    return token;
  };

  leave (state) {
    if (state.target === "top") {
      // end of top mask
      TopParser.comeback(state);
    } else {
      // end of nest mask
      state.parser = state.nest.parser.atSOL;
    }
  }

  /**
   * Entrypoint for Top Parser
   * (nestConf started)
   */
  entry = (stream, state, maskMatch) => {
    state.masks.push(maskMatch.conf);
    return this.continuation(stream, state, stream.pos + maskMatch[0].length);
  };

  /**
   * Entrypoint for Nest/Mask Parser
   * (nestConf not started)
   */
  start = (stream, state) => {
    let maskMatch = state.next;
    state.next = undefined;
    maskMatch.conf = maskMatch.conf.Start(stream, maskMatch, state)
    return this.entry(stream, state, maskMatch);
  };

}()


export const TopParser = new class extends NestParser.constructor {

  innerToken (stream, state) {
    return state.top.mode.token(stream, state.top.state);
  }

  /**
   * Starts a sub mode when the cursor is at the position of the delimiter.
   * Possible steps:
   *  - (`main` | `*<superior Nest>.continuation`) →
   *  - (`main` | `*<superior Nest>.continuation`) → `preStartSub` → `untilOpen` →
   *  - → `<sub mode>.entry`
   */
  startNest = (stream, state) => {
    let startMatch = state.next.match;
    state.next = undefined;
    startMatch.conf = startMatch.conf.Start(stream, startMatch, state);
    state.parser = startMatch.conf.parser.entry;
    return state.parser(stream, state, startMatch);
  }

  /**
   * Processing the remainder until the start of a sub mode.
   * Possible steps:
   *  - (`main` | `*<superior Nest>.continuation`) → `preStartSub` →
   *  - → `startSub`
   */
  untilOpen = (stream, state) => {
    let token = this.innerToken(stream, state);
    if (stream.drt()) {
      state.parser = this.startNest;
    }
    return token;
  }

  /**
   * Configures the parser for processing the remainder until the start of a sub mode.
   * Possible steps:
   *  - (`main` | `*<superior Nest>.continuation`) →
   *  - → `untilOpen`
   */
  preStartNest = (stream, state) => {
    stream.delim = stream.pos + state.next.match.index;
    state.parser = this.untilOpen;
    return state.parser(stream, state);
  }

  /**
   * Main main point at line/parser start if no sub mode is active.
   * Possible steps:
   *  - → `preStartSub`
   *  - → `startSub`
   *  - → `untilEOL`
   */
  atSOL = (stream, state) => {
    if (this.regNextNest(stream, state)) {
      return state.next.run(stream, state);
        // preStartSub | startSub
    } else {
      state.parser = this.untilEOL;
      return state.parser(stream, state);
    }
  }

  _nextNest = (stream, state) => {
    let nests = state.top.nests;
    if (state.suffixes) {
      // Search for suffixes that were registered at the time the previous configuration was closed (short validity period).
      // *@conf* [ suffixes: <Array[<subModeConfig>, ...]> ]
      nests = [...state.suffixes, ...nests];
    }

    let match = this.searchOpen(stream, nests)
    if (state.suffixes && stream.string === "\n" && !match) {
      state.suffixes = state.suffixes.filter(s => !s.inline)
    } else {
      state.suffixes = null;
    }
    return match;
  }

  /**
   * Search from the current stream position for the start of a sub mode and register in `state.next` if available.
   *
   * Possible `state.next`: ```{
   *  match: <regexMatch(.conf:<subModeConfig>)>,
   *  run: startSub | preStartSub,
   * }```
   *
   * Called in `main` or `<superior Nest>.continuation`.
   * @returns `true` if a start was found
   */
  regNextNest = (stream, state) => {
    let match = this._nextNest(stream, state),
        _match, _state = state;
    while (_state.top.mode.NESTER == NESTER) {
      _state = _state.top.state;
      _match = this._nextNest(stream, _state);
      if (match) {
        if (_match && !match.conf.comp(match, _match)) {
          match = _match;
        }
      } else {
        match = _match;
      }
    }
    if (match) {
      state.next = {
        match: match,
        run: match.index ? this.preStartNest : this.startNest,
      };
    }
    return !!match;
  }

  /**
   * reset the parser state to top
   */
  comeback = (state) => {
    state.nestBefore = state.nest;
    state.nest = null;
    state.parser = this.atSOL;
  }

}()


export default {
  NestParser: NestParser,
  MaskParser: MaskParser,
  TopParser: TopParser,
};
