(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {

  CodeMirror.Nester.globalDelimMap["o<$"] = (cm, token, sel) => {
    let nest = token.nest;
    if (nest._autoClose) {
      let nesterState = nest.state,
          stackEntry = nest.findNestClose(cm, sel.line),
          SEL = {...sel};
      if (stackEntry && !stackEntry.endMatch) {
        let autoClose = nest._autoClose.configure(
          {...sel},
          stackEntry,
          nesterState,
          cm,
        );
        if (autoClose.text) {
          let sel_set = autoClose.cursor;
          if (autoClose.type == "block") {
            cm.replaceRange(autoClose.text, SEL, SEL, "auto-delim");
            cm.setSelection(SEL, SEL);
            cm.replaceRange("\n\n", SEL, SEL, "!auto-block");
            cm.indentLine(sel.line + 1, "smart", true);
            let parent_nesterState = {...nesterState.nesterState};
            parent_nesterState.nest = null;
            cm.indentLine(sel.line + 2, parent_nesterState, true);
            sel_set ||= {line: sel.line + 1, ch: Infinity};
            cm.setSelection(sel_set, sel_set);
          } else {
            sel_set ||= SEL;
            cm.replaceRange(autoClose.text, SEL, SEL, "auto-delim");
            cm.setSelection(sel_set, sel_set, {origin: "auto-delim"});
          }
        }
      }
    }
  };

  CodeMirror.Nester.autoCloseFactory = {
    "block": function (pos, stackEntry, state, cm) {
      var conf = this,
          line = cm.getLine(pos.line),
          delimStart = stackEntry.startMatch.cur + stackEntry.startMatch.index,
          before = line.slice(0, delimStart);
      if (
        !(
          before.match(/\S/g)
          || /* after */ line.slice(delimStart + stackEntry.startMatch[0].length)
          .match(/\S/g)
        )
      ) {
        // only delim in line
        conf = {...this};
        conf.text = "\n\n" + this.text;
        conf.cursor = {line: pos.line + 1, ch: Infinity};
      }
      return conf;
    }
  }

})
