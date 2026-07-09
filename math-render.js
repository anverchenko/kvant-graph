/* Легкий LaTeX-рендер формул для уроків КВАНТ (той самий підхід, що у власному в'ювері графа).
   Синтаксис: інлайн-формули в $…$. Підтримка: ^ _ \sqrt{} \frac{}{} + набір операторів/грецьких.
   Без зовнішніх бібліотек. Обходить .lesson-content і рендерить $…$ у текстових вузлах. */
(function () {
  var CSS =
    '.msqrt{display:inline-flex;align-items:flex-start;white-space:nowrap;}' +
    '.msqrt>.mrad{font-size:1.28em;line-height:.9;margin-right:1px;}' +
    '.msqrt>.mradx{border-top:1.6px solid currentColor;padding:.14em .28em 0 .12em;}' +
    '.mfrac{display:inline-flex;flex-direction:column;vertical-align:middle;text-align:center;margin:0 .18em;font-size:.94em;}' +
    '.mfrac>.mnum{border-bottom:1.6px solid currentColor;padding:0 .38em .05em;}' +
    '.mfrac>.mden{padding:.05em .38em 0;}' +
    '.math sup{font-size:.72em;line-height:0;}' +
    '.math sub{font-size:.72em;line-height:0;}' +
    '.math{white-space:nowrap;}';

  function esc(s) {
    return String(s).replace(/[&<>]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c];
    });
  }

  function renderMath(src) {
    var s = String(src), i = 0;
    function ec(c) { return c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c; }
    function grp(stop) {
      var out = '';
      while (i < s.length) {
        var c = s[i];
        if (stop && c === '}') { i++; break; }
        if (c === '\\') { out += cmd(); continue; }
        if (c === '^') { i++; out += '<sup>' + arg() + '</sup>'; continue; }
        if (c === '_') { i++; out += '<sub>' + arg() + '</sub>'; continue; }
        if (c === '{') { i++; out += grp(true); continue; }
        out += ec(c); i++;
      }
      return out;
    }
    function arg() {
      if (s[i] === '{') { i++; return grp(true); }
      if (s[i] === '\\') { return cmd(); }
      var c = s[i++]; return c === undefined ? '' : ec(c);
    }
    function cmd() {
      i++; var n = '';
      while (i < s.length && /[a-zA-Z]/.test(s[i])) { n += s[i++]; }
      if (n === 'sqrt') { return '<span class="msqrt"><span class="mrad">√</span><span class="mradx">' + arg() + '</span></span>'; }
      if (n === 'frac') { var a = arg(), b = arg(); return '<span class="mfrac"><span class="mnum">' + a + '</span><span class="mden">' + b + '</span></span>'; }
      var m = { cdot: '·', times: '×', pm: '±', ge: '≥', le: '≤', neq: '≠', approx: '≈', div: '÷', pi: 'π', alpha: 'α', beta: 'β', gamma: 'γ', theta: 'θ', circ: '°', degree: '°' };
      if (m[n] != null) return m[n];
      if (n === '') { var ch = s[i++]; return ec(ch || ''); }
      return ec(n);
    }
    return grp(false);
  }

  // Текст із $…$ → HTML (немат-частини екрануються).
  function mathParts(text) {
    return text.split('$').map(function (p, idx) {
      return idx % 2 ? '<span class="math">' + renderMath(p) + '</span>' : esc(p);
    }).join('');
  }

  function walk(root) {
    var re = /\$[^$]+\$/;
    var skip = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1 };
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!re.test(n.nodeValue)) return NodeFilter.FILTER_REJECT;
        if (n.parentNode && skip[n.parentNode.nodeName]) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodes = [], n;
    while ((n = w.nextNode())) nodes.push(n);
    nodes.forEach(function (tn) {
      // Потрібна парна кількість $, інакше не чіпаємо (щоб не ламати текст із поодиноким $).
      if ((tn.nodeValue.split('$').length - 1) % 2 !== 0) return;
      var span = document.createElement('span');
      span.innerHTML = mathParts(tn.nodeValue);
      tn.parentNode.replaceChild(span, tn);
    });
  }

  function run() {
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    var roots = document.querySelectorAll('.lesson-content');
    (roots.length ? roots : [document.body]).forEach(function (r) { walk(r); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
