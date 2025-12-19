
(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../../../lib/codemirror"), require("../xml/xml"), require("../../../../mode/javascript/javascript"), require("../../../../mode/css/css"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../../../lib/codemirror", "../xml/xml", "../../../../mode/javascript/javascript", "../../../../mode/css/css"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
"use strict";

CodeMirror.defineMode("html", function (cmConfig, parserConfig) {
  let mode_javascript = CodeMirror.getMode(cmConfig, "javascript"),
      mode_json = CodeMirror.getMode(cmConfig, "application/json"),
      mode_jsonld = CodeMirror.getMode(cmConfig, "application/ld+json"),
      mode_typescript = CodeMirror.getMode(cmConfig, "application/javascript"),
      mode_plain = CodeMirror.getMode(cmConfig, "text/plain"),
      mode_css = CodeMirror.getMode(cmConfig, "text/css"),
      mode_scss = CodeMirror.getMode(cmConfig, "text/x-scss"),
      mode_less = CodeMirror.getMode(cmConfig, "text/x-less"),
      mode_gss = CodeMirror.getMode(cmConfig, "text/x-gss");

  const config = {
    name: "xml",
    textMode: undefined,
    autoSelfClosers: [
      'area', 'base', 'br', 'col', 'command',
      'embed', 'frame', 'hr', 'img', 'input',
      'keygen', 'link', 'meta', 'param', 'source',
      'track', 'wbr', 'menuitem'
    ],
    implicitlyClosed: [
      'dd', 'li', 'optgroup', 'option', 'p',
      'rp', 'rt', 'tbody', 'td', 'tfoot',
      'th', 'tr'
    ],
    tagConfigs: [],
  }

  const defaultTagConfigs = {
    script: {
      tags: ["script"],
      attrModes: [],
      defaultInnerMode: mode_javascript,
      innerModeByAttrs: [
        ["type", /^((((text|application)\/)?(x-)?(java|ecma)script)|module|)$/i, mode_javascript],
        ["type", /^((application\/)?(x-|manifest\+)?json)$/i, mode_json],
        ["type", /^((application\/)?ld\+json)$/i, mode_jsonld],
        ["type", /^(((text|application)\/)?typescript)$/i, mode_typescript],
        ["type", /./, mode_plain],
        ["lang", /^json$/i, mode_json],
        ["lang", /^ld\+json$/i, mode_jsonld],
        ["lang", /^typescript$/i, mode_typescript],
        ["lang", /./, mode_plain],
      ]
    },
    style: {
      tags: ["style"],
      attrModes: [],
      defaultInnerMode: mode_css,
      innerModeByAttrs: [
        ["type", /^(((text\/)?(x-)?(stylesheet|css))|)$/i, mode_css],
        ["type", /^(((text\/)?(x-)?scss)|)$/i, mode_scss],
        ["type", /^(((text\/)?(x-)?less)|)$/i, mode_less],
        ["type", /^(((text\/)?(x-)?gss)|)$/i, mode_gss],
        ["type", /./, mode_plain],
        ["lang", /^css$/i, mode_css],
        ["lang", /^scss$/i, mode_scss],
        ["lang", /^less$/i, mode_less],
        ["lang", /^gss$/i, mode_gss],
        ["lang", /./, mode_plain],
      ]
    },
    "<...>": {
      tags: [/./],
      attrModes: [
        ["style", CodeMirror.getMode(cmConfig, {name: "text/css", inline: true})],
      ],
      innerModeByAttrs: [],
    },
  }

  function updateDefault (update, key) {
    update = update[key];
    let target = defaultTagConfigs[key], updateArray = (k) => {target[k] = update[k].concat(target[k])};
    if (update.tags) updateArray("tags");
    if (update.attrModes) updateArray("attrModes");
    if (update.defaultInnerMode) target.defaultInnerMode = update.defaultInnerMode;
    if (update.innerModeByAttrs) updateArray("innerModeByAttrs");

  }

  config.textMode = parserConfig.textMode;
  if (parserConfig.tagConfigs) {
    if (parserConfig.tagConfigs.set) {
      config.tagConfigs = parserConfig.tagConfigs.set;
    } else {
      if (parserConfig.tagConfigs.add) config.tagConfigs = parserConfig.tagConfigs.add;
      else config.tagConfigs = [];
      if (parserConfig.tagConfigs.update) {
        let update = parserConfig.tagConfigs.update;
        if (update.script) updateDefault(update, "script");
        if (update.style) updateDefault(update, "style");
        if (update["<...>"]) updateDefault(update, "<...>");
      }
    }
  }
  config.tagConfigs = config.tagConfigs.concat(
    [
      defaultTagConfigs.script,
      defaultTagConfigs.style,
      defaultTagConfigs["<...>"],
    ]
  )
  return CodeMirror.getMode(cmConfig, config)
})

})