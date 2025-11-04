// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/5/LICENSE

/**
 * CodeMirror - Nesting Mode Extension
 * -----------------------------------------------------------------------------
 * An extension for CodeMirror 5 that enables 
 * the nesting of modes for complex requirements.
 * 
 * This module sets `CodeMirror.nestingMode(mainMode, ...subModeConfigs)`
 * as a mode constructor.
 * 
 * Key Features:
 * 
 *  - MULTI-LEVEL NESTING
 *    nestingMode recognizes active nestingMode in subordinate area
 *    configurations recursively and always handles the currently active mode
 *    at the lowest level.
 * 
 *  - DYNAMIC SUB MODE CONFIGURATION
 *    The start of a sub mode can be defined as a character string 
 *    or as a regular expression. All further configurations can be 
 *    queried dynamically via a defined callback at runtime, 
 *    which receives a regex match that represents the start delimiter.
 * 
 *  - MODE RECURSIONS
 *    In the sub mode configuration, the mode for the area can be 
 *    defined as a string (Mode MIME or Name) which is only queried 
 *    internally when activated by CodeMirror.getMode.
 * 
 *  - MASKS
 *    Special definitions of sub modes as masks or within non-mask sub 
 *    modes can be used to create masks with a higher context relevance 
 *    that prevent a mode from being exited.
 * 
 *  - SUFFIXES
 *    Suffixes can be defined in sub mode configurations that are 
 *    queried once after this sub mode has ended.
 *
 * Configuration:
 *
 * A main mode object must be passed as the first argument, and any number of
 * sub-mode configuration objects as the following arguments.
 * A sub mode configuration object can be configured according to the 
 * following patterns:
 *  - {open, mode [, modeConfig] [, start] [, close] [, masks] [, suffixes] [, innerStyle] [[, includeDelimiters] | [, parseDelimiters] [, delimStyle]] [, comp]}
 *  - {open, start: (match) → mode [, modeConfig] [, close] [, masks] [, suffixes] [, innerStyle] [[, includeDelimiters] | [, parseDelimiters] [, delimStyle]] [, comp]}
 *  - {mask: true, open, [, start] [, close] [, masks] [, comp]}
 *
 *  Standard options for the sub mode configurations:
 *
 *    The following options define the basic concept of a sub mode.
 *
 *    open/close pattern configurations support regular expressions as 
 *    well as simple string literals whose character string is safely 
 *    converted internally into a regular expression. 
 *    A possible start callback therefore always receives a regex match.
 *    Open patterns must advance the parsing process, so the match must 
 *    consume characters. An exception is possible through the configuration 
 *    with includeDelimiters. Close patterns do not have to consume.
 *    Line break characters (\n) are not present in the data to be parsed. 
 *    However, an explicit newline character (\n) is passed to the open or 
 *    close regex to represent an empty line. The delimiter parser step 
 *    is skipped in that case.
 *
 *    - open: string | regexp
 *      (mandatory)
 *        Defines the start of the area of a sub mode as a string or regular 
 *        expression and must be present in every sub mode configuration.
 *
 *    - start: (Regexp Match Array) => SubConf Object
 *      (optional)
 *        Callback for a dynamic update of the configuration at runtime. 
 *        Is executed at the start of the defined area with the regex match of 
 *        the start delimiter. The returned object updates this configuration.
 *
 *    - mode: string | CodeMirror mode 
 *      (must be set after start at the latest)
 *        The mode for the defined area. Can be passed as an CodeMirror mode 
 *        object or as MIME or register name for creation at runtime. 
 *        In this case, the optional modeConfig option is used in 
 *        `CodeMirror.getMode(modeConfig || {}, mode)`.
 *
 *    - close: string | regexp
 *      (optional)
 *        Defines the end of the area of a sub mode as a string or regular 
 *        expression. If not set, it is automatically ended at the end of
 *        the line.
 *
 *  Advanced tokenization options:
 *
 *    These options can be used to define a general scope-related styling 
 *    of tokens of a sub area and to control the behavior of the parser in 
 *    relation to the area delimiters. 
 *    (these options are ignored in mask configurations)
 *
 *    By default, the delimiters are each parsed statically as an independent 
 *    token and provided with delimStyle if available.
 *    Possible combinations:
 *      - [ , innerStyle ] [ , delimStyle ] [ , parseDelimiters ]
 *      - [ , innerStyle ] [ , includeDelimiters ]
 *
 *    - innerStyle: string
 *      (optional)
 *        A CSS class list that additionally precedes the class list of each 
 *        token within the area.
 *
 *    - delimStyle: string
 *      (optional)
 *        A CSS class name that is [additionally] prefixed to the delimiters of 
 *        the area. Internally, the following list prefixes are created: 
 *        `${delimStyle} ${delimStyle}-open `
 *        and `${delimStyle} ${delimStyle}-close `.
 *
 *    - parseDelimiters: true
 *      (optional)
 *        If set, the contents of the delimiters are transferred in isolation 
 *        to the tokenization of the inner mode. 
 *        (additional prefixes can be defined via delimStyle)
 *
 *    - includeDelimiters: true
 *      (optional)
 *        If set, delimiters are seamlessly assigned to the inner area. 
 *        (delimStyle is ignored)
 *
 *  Special parser behavior configuration:
 *
 *    - mask: true
 *      (optional)
 *    - masks: Array[MaskConfig, ...]
 *      (optional)
 *        Mask configurations enable a context-related definition of areas in
 *        which exiting a mode is prevented. An application example would be
 *        string literals that can potentially contain an open or close pattern.
 *
 *        Mask configurations can in themselves contain mask configurations
 *        (masks) for nesting. In the example, this can also ensure that the
 *        masking area is not terminated at a quote that is actually escaped
 *        with a backslash.
 *
 *        At the root level of the configurations, the mask flag must be set to
 *        true in order to define a mask configuration that can prevent leaving
 *        the main mode respectively the start of a sub mode.
 *
 *        In sub modes (also mask modes), an array of mask configurations can be 
 *        defined that can prevent leaving the area.
 *
 *        Mask configurations evaluate the following options as described above: 
 *        open, start, close, masks, comp.
 *
 *    - suffixes: Array[SubConfig, ...] 
 *      (optional)
 *        Suffix configurations can be assigned to a sub mode configuration, 
 *        which are queried once after the sub mode area is closed. 
 *        The configuration of suffixes supports each described option as a
 *        sub mode (for concatenations also the suffixes option).
 *
 *    - comp: (thisMatch, otherMatch) => boolean 
 *      (optional)
 *        For a modified delimiter comparison function to control
 *        the delimiter priorities.
 *
 *        By default, the first match that occurs is preferred that
 *          - has the smallest index; 
 *          - or has an empty content;
 *          - or has the longest content.
 *
 *        This callback must return whether `thisMatch` has still a higher
 *        priority than `otherMatch`.
 *
 *        The transferred match objects are `RegExpMatchArray`'s in which
 *        additionally the attribute `conf` or `state` is set. `thisMatch` 
 *        is always a "startMatch" in which `conf` is set to the relevant 
 *        sub mode configuration.`otherMatch` can also be a "startMatch"
 *        when comparing with each other, or is an "endMatch" in which `state`
 *        is set to the current `nestingMode` state.
 *
 *        The order in which delimiters are potentially compared with each other is 
 *        determined by the order in the configurations.
 * 
 * -----------------------------------------------------------------------------
 * Author: Adrian F. Hoefflin [srccircumflex]                          Nov. 2025
 */

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
"use strict";

CodeMirror._Nesting = {};

CodeMirror.nestingMode = function(mainMode, ...subModeConfigs) {

  /* PARSERS > */

  let searchDelimFrom = (stream, pattern, from) => {return pattern.exec(stream.string.slice(from));};

  let searchOpen = (stream, configs, from) => {
    var m, match;
    for (var conf of configs) {
      m = searchDelimFrom(stream, conf.open, from);
      if (m) {
        m.conf = conf;
        if (!match || !match.conf.comp(match, m)) match = m;
      }
    }
    return match;
  };

  let checkStreamStringReset = (stream, state) => {
    if (stream.pos >= stream.string.length) {
      stream.string = state.originalString;
      return true;
    }};
    
  const TokenGetters = {
    default: (stream, state, mode) => mode.token(stream, state),
    blankLine: (stream) => {stream.pos = 1},
  };
  let PI_TOKEN_GETTER = TokenGetters.default;

  class MainParser {
    /**
     * Starts a sub mode when the cursor is at the position of the delimiter.
     * Possible steps:
     *  - (`main` | `*<superior nestingMode>.continuation`) →
     *  - (`main` | `*<superior nestingMode>.continuation`) → `preStartSub` → `untilOpen` →
     *  - → `<sub mode>.entry`
     */
    startSub = (stream, state) => {
      var startMatch = state.next.match;
      startMatch.index = 0;
        // fake update to the current cursor position;
        // processed in parser.entry;
        // generalization not possible, MaskParser also processes distant matches
      state.subConf = startMatch.conf.getConfig(startMatch);
        // *@conf* [ start: (<regexMatch>) -> <object> ]
      state.next = undefined;

      if (state.subConf.mask) {
        // start masking
          // *@conf* [ mask: true ]
        state.subConf.mode = mainMode;
        state.subConf.parser = this;
        state.subState = state.mainState;
          // fake activation of a sub mode
        state.masks.push(state.subConf);
        state.originalString = stream.string;
        state.parser = P_MASK.entry;
          // MaskParser relations
      } else {
        // start sub mode
        var outerIndent = mainMode.indent?.(state.mainState, "", "");
        outerIndent = [undefined, CodeMirror.Pass].includes(outerIndent) ? 0 : outerIndent;
          // possible indentation from main mode
        state.subConf.mode = (typeof state.subConf.mode == "string") ? CodeMirror.getMode(state.subConf.modeConfig || {}, state.subConf.mode) : state.subConf.mode;
          // *@conf* [ mode: <mode> ] | [ mode: <string> [ , modeConfig: <object> ] ]
        state.subState = CodeMirror.startState(state.subConf.mode, outerIndent);
        state.parser = state.subConf.parser.entry;
      }
      return state.parser(
        stream, state, startMatch,
        stream.pos  // searchedFrom for MaskParser.entry
      );
    };

    /**
     * Configures the parser for processing the remainder until the start of a sub mode.
     * Possible steps:
     *  - (`main` | `*<superior nestingMode>.continuation`) →
     *  - → `untilOpen`
     */
    preStartSub = (stream, state) => {
      state.originalString = stream.string;
      stream.string = stream.string.slice(0, stream.pos + state.next.match.index);
      state.parser = this.untilOpen;
      return state.parser(stream, state);
    };

    /**
     * Processing the remainder until the start of a sub mode.
     * Possible steps:
     *  - (`main` | `*<superior nestingMode>.continuation`) → `preStartSub` →
     *  - → `startSub`
     */
    untilOpen = (stream, state) => {
      var token = PI_TOKEN_GETTER(stream, state.mainState, mainMode);
      if (checkStreamStringReset(stream, state)) {
        state.parser = this.startSub;
      }
      return token;
    };

    /**
     * Parse to the end of the line through the main mode.
     * Possible steps:
     *  - `main` →
     *  - → `main`
     */
    untilEOL = (stream, state) => {
      var token = PI_TOKEN_GETTER(stream, state.mainState, mainMode);
      if (checkStreamStringReset(stream, state)) {
        state.parser = this.main;
      }
      return token;
    };

    /**
     * Main entry point at line/parser start if no sub mode is active.
     * Possible steps:
     *  - → `preStartSub`
     *  - → `startSub`
     *  - → `untilEOL`
     */
    main = (stream, state) => {
      if (this.regNextSub(stream, state)) {
        return state.next.run(stream, state);
          // preStartSub | startSub
      } else {
        state.originalString = stream.string;
        state.parser = this.untilEOL;
        return state.parser(stream, state);
      }
    };

    /**
     * Search from the current stream position for the start of a sub mode and register in `state.next` if available.
     *
     * Possible `state.next`: ```{
     *  match: <regexMatch(.conf:<subModeConfig>)>,
     *  run: startSub | preStartSub,
     * }```
     *
     * Called in `main` or `<superior nestingMode>.continuation`.
     * @returns `true` if a start was found
     */
    regNextSub = (stream, state) => {
      var configs = subModeConfigs;
      if (state.suffixes) {
        // Search for suffixes that were registered at the time the previous configuration was closed (short validity period).
        // *@conf* [ suffixes: <Array[<subModeConfig>, ...]> ]
        configs = [...state.suffixes, ...configs];
        state.suffixes = undefined;
      }
      var match = searchOpen(stream, configs, stream.pos)
      if (match) {
        state.next = {
          match: match,
          run: match.index ? this.preStartSub : this.startSub,
        };
        return true;
      }
    };

    /**
     * reset the parser state at the end of a sub mode
     */
    finally = (state) => {
      state.subConf = state.subState = null;
      state.parser = P_MAIN.main;
    }
  }

  const P_MAIN = new MainParser();

  const PI_INNER = (stream, state) => {return state.subConf.tokenInner(PI_TOKEN_GETTER(stream, state.subState, state.subConf.mode));};
    // interface to the tokenization of the sub mode
    // *@conf* [ innerStyle: <string> ]

  class _SubParserBase {
    /**
     * Configure the continuation of the parsing process depending on
     * a possible end of the active sub mode, the status of a possible
     * subordinate `nestingMode` or possible mask configuration.
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
     *  - → `<subordinate nestingMode>.preStartSub`
     *  - → `<subordinate nestingMode>.startSub`
     *  - → `MainParser.main`
     */
    continuation = (stream, state, endMatch, searchedFrom) => {
      state.originalString = stream.string;

      if (state.subConf.mode.Nesting === CodeMirror._Nesting) {
        // sub mode is a nestingMode
        if (state.subState.subConf || state.subState.next) {
          // active or designated sub mode in the subordinate nestingMode
          state.parser = this.untilSubInnerClose;
          return state.parser(stream, state);
        } else if (state.subConf.mode.mainParser.regNextSub(stream, state.subState)) {
          // designated sub mode in the subordinate nestingMode found
          var next = state.subState.next;
          if (!endMatch || (endMatch.state = state) && next.match.conf.comp(next.match, endMatch)) {
            // the beginning of the found sub mode in the subordinate nestingMode is before the end of this mode
            // (or has a greater significance at the same position)
            return next.run(stream, state.subState);
              // preStartSub | startSub
          } else {
            // the beginning of the found sub mode has a lower significance, clean up for the next iteration
            state.subState.next = undefined;
          }
        }
      }
      if (endMatch) {
        endMatch.state = state
        if (state.subConf.masks) {
          // Search for masks that could prevent closure.
          // *@conf* [ masks: <Array[<MaskConfig>, ...]> ]
          var maskMatch = P_MASK.searchMask(stream, state.subConf, searchedFrom)
          if (maskMatch && maskMatch.conf.comp(maskMatch, endMatch)) {
            // the beginning of the found mask is before the end of this mode
            // (or has a greater significance at the same position)
            state.masks.push(maskMatch.conf);
            return maskMatch.conf.parser.entry(stream, state, maskMatch, searchedFrom);
              // MaskParser.entry
          }
        }
        if (!endMatch.index && !searchedFrom) {
          // closes directly at the current stream position
          if (!endMatch[0]) {
            // null token
            this.finally(state);
              // state.parser = MainParse.main
          } else {
            stream.string = stream.string.slice(0, stream.pos + endMatch[0].length);
            state.parser = this.finalizeDirectDelim;
          }
        } else if (!endMatch[0]) {
          // null token
          this.setFinalString(stream, endMatch, searchedFrom);
          state.parser = this.finalizeToNullDelim;
        } else {
          this.setFinalString(stream, endMatch, searchedFrom);
          state.parser = this.finalizeToDelim;
        }
      } else {
        // active at least until end of line
        state.parser = this.untilEOL;
      }
      return state.parser(stream, state);
    };

    /** (abstract) set the final string in the stream at designated sub mode end */
    setFinalString = (stream, endMatch, from) => {};

    /** (abstract) finalize the sub mode at distant delimiter
     * Possible steps:
     *  - `*continuation` →
     *  - → `delimClose`
     *  - → `main`
     */
    finalizeToDelim = (stream, state) => {};

    /**
     * (abstract) finalize the sub mode at immediate delimiter
     * Possible steps:
     *  - `*continuation` →
     *  - → `delimClose`
     *  - → `main`
     */
    finalizeDirectDelim = (stream, state) => {};

    /** (abstract) finalize the sub mode at null delimiter
     * Possible steps:
     *  - `*continuation` →
     *  - → `delimClose`
     *  - → `main`
     */
    finalizeToNullDelim = (stream, state) => {};

    /**
     * (abstract) entry point of the sub mode parser
     * Possible steps:
     *  - `startSub` →
     *  - → `atSOL`
     *  - → `delimOpen`
     *  - → `*continuation`
     */
    entry = (stream, state, startMatch) => {};

    /**
     * Parse to the end of the line through the active sub mode.
     * Possible steps:
     *  - `*continuation` →
     *  - `*MaskParser.continuation` →
     *  - → `atSOL`
     */
    untilEOL = (stream, state) => {
      var token = PI_INNER(stream, state);
      if (checkStreamStringReset(stream, state)) {state.parser = this.atSOL;}
      return token;
    };

    /**
     * Parse through the active sub mode until its sub mode is inactive.
     * Possible steps:
     *  - `*continuation` →
     *  - `*MaskParser.continuation` →
     *  - → `atSOL`
     */
    untilSubInnerClose = (stream, state) => {
      var token = PI_INNER(stream, state);
      if (!(state.subState.subConf || state.subState.next)) {state.parser = this.atSOL;}
      return token;
    };

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
    atSOL = (stream, state) => {
      return this.continuation(stream, state, state.subConf.searchClose(stream, stream.pos), stream.pos);
    };

    /**
     * Reset the parser state at the end of the sub mode and register possible suffix configurations for the following iteration.
     */
    finally = (state) => {
      if (state.subConf.suffixes) state.suffixes = state.subConf.suffixes;
      P_MAIN.finally(state);
    };
  }

  class IncludeDelimParser extends _SubParserBase {
    // Sub mode parser that includes the content of the delimiter seamlessly for tokenization.
    // *@conf* [ includeDelimiters: true ]

    setFinalString = (stream, endMatch, from) => {stream.string = stream.string.slice(0, from + endMatch.index + endMatch[0].length);};
    entry = (stream, state, startMatch) => {
      var searchFrom = stream.pos + startMatch.index + startMatch[0].length;
      return this.continuation(
        stream,
        state,
        state.subConf.searchClose(stream, searchFrom),
        searchFrom,
      );
    };
    finalizeToDelim = (stream, state) => {
      var token = PI_INNER(stream, state);
      if (checkStreamStringReset(stream, state)) {this.finally(state);}
      return token;
    };
    finalizeDirectDelim = this.finalizeToDelim;
    finalizeToNullDelim = this.finalizeToDelim;
  }

  class SeparateDelimParser extends _SubParserBase {
    // Sub mode parser that transfers the content of the delimiter separately to the tokenization.
    // *@conf* [ parseDelimiters: true [ , delimStyle: <string> ] ]

    setFinalString = (stream, endMatch, from) => {
      stream.string = stream.string.slice(0, from + endMatch.index);
    };
    delimOpen = (stream, state) => {
      var token = state.subConf.tokenOpen(PI_TOKEN_GETTER(stream, state.subState, state.subConf.mode));
      if (checkStreamStringReset(stream, state)) {state.parser = this.atSOL;}
      return token;
    };
    delimClose = (stream, state) => {
      var token = state.subConf.tokenClose(PI_TOKEN_GETTER(stream, state.subState, state.subConf.mode));
      if (checkStreamStringReset(stream, state)) {this.finally(state);}
      return token;
    };
    entry = (stream, state, startMatch) => {
      state.originalString = stream.string;
      stream.string = stream.string.slice(0, stream.pos + startMatch.index + startMatch[0].length);
      state.parser = this.delimOpen;
      return state.parser(stream, state);
    };
    finalizeToDelim = (stream, state) => {
      var token = PI_INNER(stream, state);
      if (checkStreamStringReset(stream, state)) {
        state.originalString = stream.string;
        var endMatch = state.subConf.searchClose(stream, stream.pos);
        stream.string = stream.string.slice(0, stream.pos + endMatch.index + endMatch[0].length);
        state.parser = this.delimClose;
      }
      return token;
    };
    finalizeDirectDelim = this.delimClose;
    finalizeToNullDelim = (stream, state) => {
      var token = PI_INNER(stream, state);
      if (checkStreamStringReset(stream, state)) {this.finally(state);}
      return token;
    };
  }

  class StaticDelimParser extends SeparateDelimParser {
    // Sub mode parser that statically tokenizes the content of the delimiter (default).
    // *@conf* [ [ delimStyle: <string> ] ]

    entry = (stream, state, startMatch) => {
      state.originalString = stream.string;
      stream.pos += startMatch[0].length;
      state.parser = this.atSOL;
      return state.subConf.delimStyleOpen;
    };
    delimClose = (stream, state) => {
      var endMatch = state.subConf.searchClose(stream, stream.pos);
      stream.pos += endMatch[0].length;
      var token = state.subConf.delimStyleClose;
      stream.string = state.originalString;
      this.finally(state);
      return token;
    };
    finalizeToDelim = (stream, state) => {
      var token = PI_INNER(stream, state);
      if (checkStreamStringReset(stream, state)) {
        state.originalString = stream.string;
        var endMatch = state.subConf.searchClose(stream, stream.pos);
        stream.string = stream.string.slice(0, stream.pos + endMatch.index + endMatch[0].length);
        state.parser = this.delimClose;
      }
      return token;
    };
    finalizeDirectDelim = this.delimClose;
  }

  let P_SUBincludeDelim = new IncludeDelimParser();
  let P_SUBseparateDelim = new SeparateDelimParser();
  let P_SUBstaticDelim = new StaticDelimParser();

  class MaskParser {
    // Parser that prevents leaving a certain mode as long as a masking configuration is effective.
    // *@conf* @main [ mask: true ]
    // *@conf* @sub [ masks: <Array[<MaskConfig>, ...]> ]

    /** Get the active mask configuration from the stack (LIFO). */
    getActiveMask = (state) => {return state.masks[state.masks.length - 1];};

    /**
     * Search for the closest start of a mask configuration from a certain point in the stream
     * (whether mask configurations are present must be checked beforehand).
     * Used in `MaskParser.continuation` and `SubParser.continuation`.
     */
    searchMask = (stream, modeConf, searchFrom) => {return searchOpen(stream, modeConf.masks, searchFrom);};

    /**
     * Configure the continuation of the masked parsing process depending on
     * a VALID end or possible nested mask configuration.
     * Possible steps:
     *  - `entry` →
     *  - → `entry`
     *  - → `finalizeToMain`
     *  - → `*SubParser.continuation`
     */
    continuation = (stream, state, endMatch, searchedFrom) => {
      var activeMask = this.getActiveMask(state);
      if (activeMask.masks) {
        // possibly nested
        var maskMatch = this.searchMask(stream, activeMask, searchedFrom);
        endMatch.state = state
        if (maskMatch && maskMatch.conf.comp(maskMatch, endMatch)) {
          // the beginning of the found mask is before the end of this mask
          // (or has a greater significance at the same position)
          // -> extend stack
          state.masks.push(maskMatch.conf);
          return this.entry(stream, state, maskMatch, searchedFrom);
        }
      }
      // valid end -> reduce stack
      state.masks.pop();
      if (state.masks.length) {
        // mask stack still active
        return this.entry(stream, state, endMatch, searchedFrom);
      } else if (activeMask.clv == 0) {
        // end of mask configuration from main mode level
        state.parser = this.finalizeToMain;
        stream.string = stream.string.slice(0, searchedFrom + endMatch.index + endMatch[0].length);
        return state.parser(stream, state);
      } else {
        // end of sub mode masking
        searchedFrom += endMatch.index + endMatch[0].length;
        return state.subConf.parser.continuation(stream, state, state.subConf.searchClose(stream, searchedFrom), searchedFrom);
      }
    };

    /**
     * Check for an end to the masking area.
     * Possible steps:
     *  - `entry` →
     *  - → `untilEOL`
     *  - → `*continuation`
     */
    checkEnd = (stream, state, searchFrom) => {
      var maskEnd = this.getActiveMask(state).searchClose(stream, searchFrom);
      if (maskEnd) {
        return this.continuation(stream, state, maskEnd, searchFrom);
      } else {
        state.parser = this.untilEOL;
        return state.parser(stream, state);
      }
    };

    /**
     * Entrypoint.
     * Possible steps:
     *  - `SubParser.continuation` →
     *  - `MainParser.startSub` →
     *  - → `untilEOL`
     *  - → `*continuation`
     */
    entry = (stream, state, maskMatch, searchedFrom) => {
      return this.checkEnd(stream, state, searchedFrom + maskMatch.index + maskMatch[0].length);
    };

    /**
     * Parse to the end of the line through the masked mode.
     * Possible steps:
     *  - `entry` →
     *  - `atSOL` →
     *  - → `atSOL`
     */
    untilEOL = (stream, state) => {
      var token = PI_INNER(stream, state);
      if (checkStreamStringReset(stream, state)) {state.parser = this.atSOL;}
      return token;
    };

    /**
     * Configure the continuation of the parsing process at start of line
     * (interface to `checkEnd`)
     * Possible steps:
     *  - `untilEOL` →
     *  - → `*continuation`
     */
    atSOL = (stream, state) => {
      state.originalString = stream.string;
      return this.checkEnd(stream, state, 0);
    };

    /** finalize a main mode masking
     * Possible steps:
     *  - `*continuation` →
     *  - → `MainParser.main`
     */
    finalizeToMain = (stream, state) => {
      var token = PI_INNER(stream, state);
      if (checkStreamStringReset(stream, state)) {
        state.mainState = state.subState;
          // Updating the main state.
          // ((i) Since the status is cached by line from CM as a copy, the reference is lost with multiline masking)
        P_MAIN.finally(state);
      }
      return token;
    };
  }

  const P_MASK = new MaskParser();

  /* < PARSERS */

  /* CONFIGURATION STANDARDIZATION > */

  function _makePattern(pattern) {return (typeof pattern == "string") ? new RegExp(RegExp.escape(pattern)) : pattern;}

  function _closeAtSOL (stream, from) {return !from && stream.sol() && /^/.exec("");}
  function _closeAtDlm (stream, from) {return searchDelimFrom(stream, this.close, from);}

  /**
   * The default delimiter comparison function.
   * Must return whether `thisMatch` has still a higher priority than `otherMatch`.
   * 
   * True by default 
   *  - if the index of `thisMatch` is smaller; 
   *  - or is equal and the consumed string is either equal or longer 
   *    then the string in `otherMatch`, except this string is completely empty;
   *  - or the consumed string is completely empty.
   * 
   * The transferred match objects are `RegExpMatchArray`'s in which
   * additionally the attribute `conf` or `state` is set.
   * `thisMatch` is always a "startMatch" in which `conf` is set to 
   * the relevant sub mode configuration.
   * `otherMatch` can also be a "startMatch" when comparing with each other, 
   * or is an "endMatch" in which `state` is set to the current `nestingMode` state.
   * 
   * The order in which they are compared is determined by the order in the configurations.
   */
  let _compDefault = (thisMatch, otherMatch) => {
    if (thisMatch.index == otherMatch.index) {
      return !thisMatch[0] || thisMatch[0].length >= otherMatch[0].length && !!otherMatch[0];
    } else {
      return thisMatch.index < otherMatch.index;
    }
  };

  let _tokenNOOP = (token) => token;
  function _tokenInner (token) {return this.innerStyle + token;}
  function _tokenOpen (token) {return this.delimStyleOpen + token;}
  function _tokenClose (token) {return this.delimStyleClose + token;}

  let _makeParserConf = (conf) => {
    if (conf.close == undefined) {
      conf.searchClose = _closeAtSOL;
    } else {
      conf.close = _makePattern(conf.close);
      conf.searchClose = _closeAtDlm;
    }
    if (conf.mask) {
      conf.parser = P_MASK;
      conf.tokenInner = _tokenNOOP;
    } else if (conf.includeDelimiters) {
      conf.parser = P_SUBincludeDelim;
    } else {
      if (conf.delimStyle) {
        conf.delimStyleOpen = `${conf.delimStyle} ${conf.delimStyle}-open `;
        conf.delimStyleClose = `${conf.delimStyle} ${conf.delimStyle}-close `;
        conf.tokenOpen = _tokenOpen;
        conf.tokenClose = _tokenClose;
      } else {
        conf.tokenOpen = conf.tokenClose = _tokenNOOP;
      }
      if (conf.parseDelimiters) {
        conf.parser = P_SUBseparateDelim;
      } else {
        conf.parser = P_SUBstaticDelim;
      }
    }
    if (conf.innerStyle) {
      conf.innerStyle = `${conf.innerStyle} `;
      conf.tokenInner = _tokenInner;
    } else {
      conf.tokenInner = _tokenNOOP;
    }
    conf.comp ||= _compDefault
    return conf;
  };

  function _startConfDefault() {return this;}
  function _startConfDynamic(match) {return _makeParserConf({...this, ...this.start(match)});}

  let _makeStartConf = (conf) => {
    conf.open = _makePattern(conf.open);
    conf.getConfig = conf.start ? _startConfDynamic : _startConfDefault;
  };

  function _makeConf(modeConfigs, clv, __masks) {
    return modeConfigs.map(conf => {
      conf = {...conf}
      conf.clv = clv;
      conf.mask ||= __masks
      _makeStartConf(conf);
      _makeParserConf(conf);
      if (conf.masks) {
        conf.masks = _makeConf(conf.masks, clv + 1, true);
      }
      if (conf.suffixes) {
        conf.suffixes = _makeConf(conf.suffixes, clv + 1);
      }
      return conf
    })
  }

  subModeConfigs = _makeConf(subModeConfigs, 0);

  /* < CONFIGURATION STANDARDIZATION */

  /* EXPORTS > */
  return {
    Nesting: CodeMirror._Nesting, 
      // flag
    mainParser: P_MAIN,
      // required for nested nestingMode

    startState: function() {
      return {
        mainState: CodeMirror.startState(mainMode),
        subConf: null,
        subState: null,
        parser: P_MAIN.main,
        suffixes: null,
        masks: [],
      };
    },

    copyState: function(state) {
      return {
        mainState: CodeMirror.copyState(mainMode, state.mainState),
        subConf: state.subConf,
        subState: state.subConf && CodeMirror.copyState(state.subConf.mode, state.subState),
        parser: state.parser,
        suffixes: state.suffixes,
        masks: [...state.masks],
        originalString: state.originalString,
      };
    },

    token: function(stream, state) {return state.parser(stream, state);},

    indent: function(state, textAfter, line) {
      var mode = state.subConf ? state.subConf.mode : mainMode;
      if (!mode.indent) return CodeMirror.Pass;
      return mode.indent(state.subConf ? state.subState : state.mainState, textAfter, line);
    },

    blankLine: function(state) {
      // executes only one action for a blank line: 
      //  - closes a sub mode whose `close` is not defined (close at SOL by default), 
      //  - closes a sub mode whose `close` matches "\n", 
      //  - or starts a sub mode whose open matches "\n".
      if (state.subConf) {
        if (state.subConf.mode.Nesting !== CodeMirror._Nesting) {
          PI_TOKEN_GETTER = TokenGetters.blankLine;
        }
        state.subConf.mode.blankLine?.(state.subState);
      } else {
        mainMode.blankLine?.(state.mainState);
        PI_TOKEN_GETTER = TokenGetters.blankLine;
      }
      state.parser(
        {string: "\n", pos: 0, sol: () => true},
        state,
      );
      PI_TOKEN_GETTER = TokenGetters.default;
    },

    electricChars: mainMode.electricChars,

    innerMode: function(state) {
      if (state.subConf) {
        if (state.subConf.mode.innerMode) {
          return state.subConf.mode.innerMode(state.subState);
        } else {
          return {state: state.subState, mode: state.subConf.mode};
        }
      } else {
        return {state: state.mainState, mode: mainMode};
      }
    },
  };
  /* < EXPORTS */

};

});
