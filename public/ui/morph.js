// Patch the page to match new markup instead of replacing it.
//
// Every state push used to rebuild the whole screen, so a vote from across the
// table replayed the beat card's entrance, cut the dice off mid-tumble, threw
// an open dossier back to the top and scrolled the seats back to the start.
// Patching keeps every element that is still there — and with it its scroll,
// its focus, its animation and whatever the person was typing.
//
// Elements are matched in order. When something appears or disappears in the
// middle (the night's title card going away, a banner turning up), the rest
// still find their old selves. `data-key` marks an element that must be new
// when it changes: a new beat's card lands again, a new throw of the dice
// tumbles.

export function morph(target, html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  patchChildren(target, tpl.content);
}

const keyOf = (node) => (node.nodeType === 1 ? node.getAttribute('data-key') : null);

function same(a, b) {
  if (a.nodeType !== b.nodeType) return false;
  if (a.nodeType !== 1) return true;
  return a.tagName === b.tagName && keyOf(a) === keyOf(b);
}

const LOOKAHEAD = 6;

function patchChildren(parent, next) {
  const news = [...next.childNodes];
  const wanted = new Set(news.map(keyOf).filter((k) => k != null));
  let cur = parent.firstChild;
  for (const n of news) {
    if (cur && same(cur, n)) {
      patchNode(cur, n);
      cur = cur.nextSibling;
      continue;
    }
    // did the ones in front of it go away? never skip past one still wanted
    // later, and never throw an element away to match a bit of text
    let found = null;
    let o = n.nodeType === 1 ? cur : null;
    for (let i = 0; o && i < LOOKAHEAD; i++, o = o.nextSibling) {
      if (i > 0 && same(o, n)) { found = o; break; }
      if (keyOf(o) != null && wanted.has(keyOf(o))) break;
    }
    if (found) {
      while (cur !== found) { const gone = cur; cur = cur.nextSibling; gone.remove(); }
      patchNode(found, n);
      cur = found.nextSibling;
    } else {
      parent.insertBefore(n, cur);
    }
  }
  while (cur) { const gone = cur; cur = cur.nextSibling; gone.remove(); }
}

function patchNode(o, n) {
  if (o.nodeType !== 1) {
    if (o.nodeValue !== n.nodeValue) o.nodeValue = n.nodeValue;
    return;
  }
  for (const { name } of [...o.attributes]) if (!n.hasAttribute(name)) o.removeAttribute(name);
  for (const { name, value } of [...n.attributes]) if (o.getAttribute(name) !== value) o.setAttribute(name, value);
  const tag = o.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') {
    // whatever is being typed right now wins over what the last state said
    if (o === document.activeElement) return;
    if (o.type === 'checkbox' || o.type === 'radio') o.checked = n.hasAttribute('checked');
    else {
      const v = tag === 'TEXTAREA' ? n.textContent : (n.getAttribute('value') ?? '');
      if (o.value !== v) o.value = v;
    }
    return;
  }
  patchChildren(o, n);
}
