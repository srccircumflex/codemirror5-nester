import { CodeMirror } from "../edit/main.js";
import { copyState, getMode } from "../modes.js";
import StringStream from "../util/StringStream.js";
import { MaskParser, NestParser } from "./parser.js";
import {
  RegExp_escape,
  NestStateStarters,
  TokenGetters,
  serializeToken,
  mergeToken,
} from "./utils.js";
import { NESTER } from "./flag.js";


const NestMasksCaches = {
  lineComments: {},
  blockComments: {},
  strings: {
    inline: {},
    multi: {},
  },
};


const CloseIndentions = {
  "smart": class {
    constructor (nest) {
      this.testRe = new RegExp(`^\\s*${nest.close.source}`, nest.close.flags);
    }
    getHow (token, docLine, sel) {return this.testRe.test(docLine.slice(0, token.end)) && token.nesterState;}
  },
  "force": class {
    getHow (token) {return token.nesterState;}
  },
}



export class Nest {
  close/*: RegExp | any*/;
  _close;
  tokenOpen;
  tokenClose;
  tokenInner;
  mask/*: boolean*/;
  masks/*: Nest[]*/;
  suffixes/*: Nest[]*/;
  parser/*: NestParser | MaskParser*/;
  delimToken/*: string*/;
  _delimStyleOpen/*: string*/;
  _delimStyleClose/*: string*/;
  tokenizeDelimiters/*: boolean | string | T.Mode*/;
  innerStyle/*: string*/;
  indent/*(outer: T.indent, startMatch: T.StartMatch, nesterState: T.NestState): T.indent*/;
  indentClose;
  _indentClose;
  comp;
  mode/*: T.Mode*/;
  clv/*: number*/;
  open/*: RegExp*/;
  modeConfig/*: T.SomeObject*/;
  start/*(startMatch: T.StartMatch, nesterState?: T.NestState): T.NestUpdateConfig*/;
  state/*: T.SomeObject | T.NestState*/;
  inline/*: true*/;
  autoClose/*: object*/;
  _autoClose/*: object*/;

  /* CONFIGURATION STANDARDIZATION */
  _makePattern (pattern) {return (typeof pattern == "string") ? new RegExp(RegExp_escape(pattern)) : pattern;}
  _closeAtSOL (stream, from) {return !from && stream.sol() && /^/.exec("");}
  _closeAtDlm (stream, from) {return this.close.exec(stream.data.slice(from));}

  /**
   * The default delimiter comparison function.
   * Must return whether `thisMatch` has still a higher priority than `otherMatch`.
   *
   * True by default
   *  - if the index of `thisMatch` is smaller;
   *  - or is equal and the consumed string is longer
   *    then the string in `otherMatch`, except this
   *    string is completely empty;
   *  - or the consumed string is completely empty.
   *
   * The transferred match objects are `RegExpMatchArray`'s in which
   * additionally the attribute `conf` or `state` is set.
   * `thisMatch` is always a "startMatch" in which `conf` is set to
   * the relevant sub mode configuration.
   * `otherMatch` can also be a "startMatch" when comparing with each other,
   * or is an "endMatch" in which `state` is set to the current `Nest` state.
   *
   * The order in which they are compared is determined by the order in the configurations.
   */
  _compDefault (thisMatch, otherMatch) {
    if (thisMatch.index == otherMatch.index) {
      return !thisMatch[0] || thisMatch[0].length > otherMatch[0].length && !!otherMatch[0];
    } else {
      return thisMatch.index < otherMatch.index;
    }
  }
  _tokenNOOP (token) {return serializeToken(token)}
  _tokenInner (token) {return mergeToken(this.innerStyle, token);}

  static _target (state) {return state[state.target];}
  _delimTokenStatic (stream, state, type) {
    stream.skipToEnd();
    let t = Nest._target(state);
    return type == ">o" ? t._delimStyleOpen : t._delimStyleClose;
  }
  _delimTokenParse (stream, state, type) {
    let t = Nest._target(state);
    return t.mode.token(stream, t.state, type);
  }

  constructor (conf) {
    Object.assign(this, conf)
  }

  static Init (conf) {
    const nest = new Nest(conf);

    if (conf.close == undefined) {
      nest._close = nest._closeAtSOL;
    } else {
      nest.close = nest._makePattern(nest.close);
      nest._close = nest._closeAtDlm;
    }

    nest.tokenInner = nest._tokenNOOP;

    if (conf.mask) {
      nest.parser = MaskParser;
      conf.delimToken = true;
    } else {
      nest.parser = NestParser;
    }

    let typeof_delimToken = typeof conf.delimToken;
    if (typeof_delimToken != "function") {
      nest._delimStyleOpen = ``;
      nest._delimStyleClose = ``;
      nest.delimToken = nest._delimTokenStatic;
      if (typeof_delimToken == "string") {
        nest._delimStyleOpen = `${conf.delimToken} ${conf.delimToken}-open`;
        nest._delimStyleClose = `${conf.delimToken} ${conf.delimToken}-close`;
      } else if (typeof_delimToken == "boolean") {
        if (conf.delimToken) {
          nest.delimToken = nest._delimTokenParse;
        }
      }
    }

    if (conf.close && conf.indentClose != false) {
      if ([true, undefined].includes(conf.indentClose)) conf.indentClose = "smart";
      if (typeof conf.indentClose == "string") nest._indentClose = new CloseIndentions[conf.indentClose](nest);
      else nest._indentClose = conf.indentClose;
    } else {
      nest._indentClose = false;
    }

    if (conf.autoClose) {
      nest._autoClose = conf.autoClose;
      if (typeof conf.autoClose == "string") {
        nest._autoClose = {
          text: conf.autoClose,
          configure: function (pos) {this.cursor = pos; return this;},
        };
      } else if (typeof conf.autoClose.configure == "string") {
        nest._autoClose.configure = CodeMirror.Nester.autoCloseFactory[conf.autoClose.configure];
      }
    }

    if (nest.innerStyle) nest.tokenInner = nest._tokenInner;
    nest.indent ||= (indent) => indent;
    nest.comp ||= nest._compDefault;
    nest.masks = nest.masks ? [...nest.masks] : []
    return nest;
  }


  static Node (conf, lv, isMask) {
    conf.clv = lv;
    conf.mask ||= isMask;
    conf = Nest.Init(conf);
    conf.open = conf._makePattern(conf.open);
    if (conf.masks) {
      conf.masks = Nest.Nodes(conf.masks, lv + 1, true);
    }
    if (conf.suffixes) {
      conf.suffixes = Nest.Nodes(conf.suffixes, lv + 1, isMask);
    }
    return conf;
  }

  static Nodes (configs, lv, isMask) {
    return configs.map(conf => Nest.Node(conf, lv, isMask));
  }


  Start (stream, startMatch, nesterState) {
    let cm = stream.lineOracle.doc.cm, nest;
    if (this.start) {
      nest = Nest.Init({...this, ...this.start(startMatch, cm.options)});
    } else {
      nest = new Nest(this);
    }
    nesterState.target = "nest";
    if (nest.mask) {
      // start mask
        // *@conf* [ mask: true ]
      if (!nesterState.nest) nesterState.target = "top";
    } else {
      nesterState.nest = nest;
      if (typeof nest.mode == "string") {
        nest.mode = getMode(cm.options, nest.modeConfig ? {name: nest.mode, ...nest.modeConfig} : nest.mode);
      }
        // *@conf* [ mode: <mode> ] | [ mode: <string> [ , modeConfig: <object> ] ]
      if (nest.mode) {
        Nest.compileNestMasksAtMode(nest.mode, nest.clv);
        nest.masks = nest.masks.concat(nest.mode.nestMasks);
      }

      // start nest
      var indent = nest.indent(
        nesterState.top.mode.indent?.(nesterState.top.state, "", ""),
        startMatch,
        nesterState,
      );
      indent = indent || indent == 0 ? indent : 0;
        // possible indentation from top
      nest.state = nesterState.startNestState(nest.mode, indent, nesterState);
      nesterState.nestStack._ext(nesterState, startMatch);
    }

      // fake update to the current cursor position;
      // processed in parser.entry;
      // generalization not possible, MaskParser also processes distant matches

    return nest;
  }

  findNestClose (cm, lineNo) {
    let nesterState = this.state.nesterState, stackEntry = nesterState.nestStack.get(-1);
    if (!stackEntry.endMatch) {
      let stream = new StringStream(
        cm.getLine(lineNo),
        cm.options.tabSize,
        cm,
        stackEntry.startMatch.cur + stackEntry.startMatch.index + stackEntry.startMatch[0].length,
      );
      nesterState = {...nesterState};
      nesterState.startNestState = NestStateStarters.skip;
      if (this.mode.NESTER !== NESTER) nesterState.tokenGetter = nesterState.delimTokenGetter = TokenGetters.skip;
      while (!stackEntry.endMatch) {
        if (stream.eol()) {
          stream = stream.NewLine(cm.getLine(lineNo+=1));
          if (stream.string == undefined) break;
        }
        nesterState.top.token(stream, nesterState);
      }
    }
    return stackEntry;
  }

  static compileNestMasksAtMode (mode, clv) {
    clv++;
    var MaskNode = (mask) => Nest.Node(
        mask,
        clv,
        true  // is mask
    );
    mode.nestMasks ||= [];
    let cacheKey, i, conf;
    if (!mode.nestMasks.compiled) {
      mode.nestMasks.compiled = true
      if (mode.stringQuotes) {
        /**
         * = {
         *  [inline|multi]: array|charString|{quotes: array|charString [, escape: string]}
         *    inline / multi(-line) quotes [and spec escape intro]
         *  [, escape: string]
         *    global escape intro (applied as default to inline/multi)
         * };
         */

        for (let field of ["inline", "multi"]) {
          i = mode.stringQuotes[field];
          if (i) {
            if (!i.escape) i = {quotes: [...i.quotes || i], escape: mode.stringQuotes.escape};
            else i.quotes = [...i.quotes];
            i.quotes = i.quotes.sort().map((x) => RegExp_escape(x)).join("|");
            mode.stringQuotes[field] = i;
            cacheKey = i.quotes + (i.escape ? "\0" + i.escape : "");
            conf = NestMasksCaches.strings[field][cacheKey];
            if (!conf) {
              conf = MaskNode(
                {
                  open: new RegExp(i.quotes),
                  type: field,
                  start: function (m) {return {close: new RegExp(RegExp_escape(m[0]) + (this.type == "inline" ? `|$` : ``))}},
                  masks: i.escape ? [{
                    open: new RegExp(RegExp_escape(i.escape) + "(.|$)"),
                    close: "",
                    innerStyle: "esc",
                  }] : undefined,
                },
              );
              NestMasksCaches.strings[field][cacheKey] = conf;
            }
            mode.nestMasks.push(conf);
          }
        }
      }
      if (mode.lineComment) {
        var lC = (k) => {
          mode.nestMasks.push(
              NestMasksCaches.lineComments[k]
              || (NestMasksCaches.lineComments[k] = MaskNode({open: k}))
          );
        }
        mode.lineComment instanceof Array ? mode.lineComment.forEach(lC) : lC(mode.lineComment);
      }
      if (mode.blockCommentStart) {
        cacheKey = `${mode.blockCommentStart}\0${mode.blockCommentEnd}`
        mode.nestMasks.push(
            NestMasksCaches.blockComments[cacheKey]
            || (NestMasksCaches.blockComments[cacheKey] = MaskNode({open: mode.blockCommentStart, close: mode.blockCommentEnd}))
        );
      }
    }
  }

  Copy () {
    var copy = new Nest(this);
    copy.state = copyState(this.mode, this.state);
    return copy;
  }
}


import PARSER_COMPONENTS from "./parser.js"

export default {
  Nest: Nest,
  NestMasksCaches: NestMasksCaches,
  CloseIndentions: CloseIndentions,
  ...PARSER_COMPONENTS,
};