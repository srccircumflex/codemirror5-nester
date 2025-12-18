(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {

  let RegExp_escape;
  if (Object.hasOwn(RegExp, "escape")) {
    RegExp_escape = RegExp.escape;
  } else {
    RegExp_escape = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  CodeMirror.defineMode("@xml.text", function (cmConfig, tagConf) {
    return {
      startState: (indent, nesterState) => {return {indent: indent == undefined ? 0 : indent, nesterState: nesterState}},
      token: (stream) => {
        let c = stream.next();
        if (c == "&") {
          let ok;
          if (stream.eat("#")) {
            if (stream.eat("x")) {
              ok = stream.eatWhile(/[a-fA-F\d]/) && stream.eat(";");
            } else {
              ok = stream.eatWhile(/[\d]/) && stream.eat(";");
            }
          } else {
            ok = stream.eatWhile(/[\w\.\-:]/) && stream.eat(";");
          }
          return ok ? "atom" : "error";
        } else {
          stream.eatWhile(/[^&]/);
          return null;
        }
      },
      indent: (state, textAfter, fullLine) => {
        return state.indent;
      },
      blockCommentStart: "<!--",
      blockCommentEnd: "-->",
    }
  });

  CodeMirror.defineMode("@xml.tag", function (cmConfig, tagConf) {

    let nestModes = [
      {
        open: /["']/,
        start: (match) => {return {close: match[0]}},
        mode: tagConf.parserConf.defaultAttrMode,
        modeConfig: tagConf.parserConf.defaultAttrModeConfig,
        delimToken: "string",
        innerStyle: "string",
      },
    ]

    if (tagConf.parserConf.attrModes) {
      nestModes = nestModes.concat(
        tagConf.parserConf.attrModes.map(
          c => {
            return {
              open: typeof c[0] == "string"
                    ? new RegExp(`${RegExp_escape(c[0])}=(?<q>["'])`)
                    : new RegExp(`${c[0].source}=(?<q>["'])`, c[0].flags),
              start: (match) => {
                return {
                  delimToken: (stream, state, type) => {
                    let c = stream.next();
                    if (c == match.groups.q) return "string";
                    if (c == "=") return;
                    stream.match(/[\w\-]*/);
                    return "attribute";
                  },
                  close: match.groups.q,
                }
              },
              mode: c[1],
              modeConfig: c[2],
            }
          }
        )
      )
    }

    function _searchInnerByAttr (name, configs, cond2) {
      if (!configs) return undefined;
      for (let conf of configs) {
        if (conf[0].test(name) && cond2(conf)) {
          tagConf.blockInnerConf.mode = conf[2];
          tagConf.blockInnerConf.modeConfig = conf[3];
          break;
        }
      }
    }

    function searchInnerByAttrConf (match) {
      return _searchInnerByAttr(
        match[1],
        tagConf.parserConf.innerByAttrConf,
        (conf) => conf[1].test(match.groups.v),
      )
    }

    function searchInnerByAttrName (match) {
      return _searchInnerByAttr(
        match[1],
        tagConf.parserConf.innerByAttrName,
        () => true,
      )
    }

    return CodeMirror.Nester(
      {
        startState: (indent, nesterState) => {return {indent: indent, nesterState: nesterState}},
        token: (stream, state) => {
          if (stream.eatSpace()) {
            var attr = /^([\w\-]+)(=("(?<v>[^"]*)"|'(?<v>[^']*)'))?/.exec(stream.string.slice(stream.pos));
            attr && (attr[2] ? searchInnerByAttrConf(attr) : searchInnerByAttrName(attr));
            return;
          }
          if (stream.next() === "=") return;
          stream.match(/^[\w\-]*/);
          return "attribute";
        },
        indent: (state, textAfter, fullLine) => state.indent,
      },
      ...nestModes,
    );
  });

  CodeMirror.defineMode("@xml.block", function (cmConfig, tagConf) {
    return CodeMirror.Nester(
      CodeMirror.getMode(cmConfig, {...tagConf, name: "@xml.tag"}),
      {
        open: ">",
        close: new RegExp(`(?=(${tagConf.originClose.source}))`, "i"),
        start: () => tagConf.blockInnerConf,
        delimToken: "tag",
        indent: (outer, startMatch) => /\S/.test(startMatch.input.slice(startMatch.index + 1 /* > */)) ? outer : outer + cmConfig.indentUnit,
        autoClose: {
          tag: tagConf.tag,
          configure: function (pos, stackEntry, state, cm) {
            let conf = this,
                tagStartMatch = state.nesterState.nesterState.nestStack.get(-1).startMatch,
                line = cm.getLine(pos.line);
            if (line.slice(0, tagStartMatch.pos).match(`^\\s*$`)) {
              conf = {...this};
              conf.type = "block"
            }
            conf.text = `</${conf.tag}>`;
            return conf;
          }
        },
      }
    )
  });

  CodeMirror.defineMode("xml", function (cmConfig, parserConfig) {
    const defaultTagConf = {
      defaultInnerMode: "xml",
      defaultInnerModeConfig: {_compiled: parserConfig},
      defaultAttrMode: "@xml.text",
      defaultAttrModeConfig: {},
    }

    if (parserConfig._compiled) {
      parserConfig = parserConfig._compiled;
      defaultTagConf.defaultInnerModeConfig = {_compiled: parserConfig};
    } else {
      parserConfig.textMode ||= CodeMirror.getMode(cmConfig, "@xml.text")
      parserConfig.autoSelfClosers ||= []
      parserConfig.autoSelfClosers = new Set(parserConfig.autoSelfClosers)
      parserConfig.implicitlyClosed ||= []
      parserConfig.implicitlyClosed = new Set(parserConfig.implicitlyClosed)
      /*
      tagConfigs = [
        {
          tags: <iterable pattern>,
          ?defaultInnerMode: mode,
          ?innerModeByAttrs: [
            [attrPattern, valPattern|null, mode[, modeConfig]],
            ...
          ],
          ?defaultAttrMode: mode,
          ?defaultAttrModeConfig: obj,
          ?attrModes: [
            [attrPattern, mode[, modeConfig]],
            ...
          ],
        },
        ...
      ]
      */
      parserConfig.tagConfigs ||= []

      const _wordReStdCache = {}
      function wordReStd (pattern) {
        if (typeof pattern == "string") {
          return _wordReStdCache[pattern] || (_wordReStdCache[pattern] = new RegExp(`^${pattern}$`));
        } else return pattern;
      }

      for (var tagConf of parserConfig.tagConfigs) {
        for (var i = 0; i<tagConf.tags.length; i++) {
          if (typeof tagConf.tags[i] == "string") {
            tagConf.tags[i] = wordReStd(tagConf.tags[i])
          }
        }
        tagConf.defaultInnerMode ||= defaultTagConf.defaultInnerMode;
        tagConf.defaultInnerModeConfig ||= defaultTagConf.defaultInnerModeConfig;
        tagConf.defaultAttrMode ||= defaultTagConf.defaultAttrMode;
        tagConf.defaultAttrModeConfig ||= defaultTagConf.defaultAttrModeConfig;
        tagConf.innerByAttrName = []
        tagConf.innerByAttrConf = []
        for (var innerByAttr of tagConf.innerModeByAttrs || []) {
          innerByAttr[0] = wordReStd(innerByAttr[0])
          if (innerByAttr[1]) {
            innerByAttr[1] = wordReStd(innerByAttr[1])
            tagConf.innerByAttrConf.push(innerByAttr)
          } else {
            tagConf.innerByAttrName.push(innerByAttr)
          }
        }
        delete tagConf.innerModeByAttrs
      }
    }

    function getTagParserConfig (tag) {
      for (var tagConf of parserConfig.tagConfigs) {
        for (var tagPattern of tagConf.tags) {
          if (tagPattern.test(tag)) return tagConf;
        }
      }
    }

    const _implicitCloseCache = {}
    function implicitClose (tagReEsc) {
      return _implicitCloseCache[tagReEsc]
      || (_implicitCloseCache[tagReEsc] = new RegExp(`(<\\/${tagReEsc}>)|(?=(<\\/?([A-Z_][\\w\\.\\-]*(?::[A-Z_][\\w\\.\\-]*)?)))`, "i"));
    }

    function getBlockConfig (startMatch, cmOptions) {
      var tagConf = {
        tag: startMatch[1].toLowerCase(),
        esc: undefined,
        blockInnerConf: {mode: undefined},
        parserConf: undefined,
      };
      tagConf.esc = RegExp_escape(tagConf.tag)
      tagConf.parserConf = getTagParserConfig(tagConf.tag) || defaultTagConf
      tagConf.blockInnerConf.mode = tagConf.parserConf.defaultInnerMode
      tagConf.blockInnerConf.modeConfig = tagConf.parserConf.defaultInnerModeConfig

      var blockConfig = {};

      if (parserConfig.autoSelfClosers.has(tagConf.tag)) {
        blockConfig.mode = CodeMirror.getMode(cmOptions, {...tagConf, name: "@xml.tag"});
        blockConfig.close = /\/?>/;
      } else {
        if (parserConfig.implicitlyClosed.has(tagConf.tag)) {
          blockConfig.close = tagConf.originClose = implicitClose(tagConf.esc);
        } else {
          blockConfig.close = tagConf.originClose = new RegExp(`<\\/${tagConf.esc}>`, "i");
        }
        blockConfig.mode = CodeMirror.getMode(cmOptions, {...tagConf, name: "@xml.block"});
      }
      return blockConfig;
    }

    const xmlTagRe = /<([A-Z_][\w\.\-]*(?::[A-Z_][\w\.\-]*)?)/i

    return CodeMirror.Nester(
      parserConfig.textMode,
      {
        open: xmlTagRe,
        start: getBlockConfig,
        delimToken: "tag",
      },
      {
        open: "<!--",
        close: "-->",
        mode: {token: (stream, state) => {stream.skipToEnd(); return "comment";}},
        delimToken: true,
      },
    )

  });

});
