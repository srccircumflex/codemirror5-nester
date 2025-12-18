

export function triggerAutoClose (cm) {
  if (cm.Nester.autoclose) {
    let SEL = cm.doc.sel.ranges[0].head;
    cm.doc.sel.ranges[0].anchor = SEL;
    let token = cm.getTokenAt(SEL);
    if (token.spec.delim) cm.Nester.autoclose(cm, token, SEL);
  }
}