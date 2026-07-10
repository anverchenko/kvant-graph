/* Рендер повної сторінки-уроку в дизайні КВАНТ (pifagor).
   Дані: window.__LESSONS__ (id→Lesson) і window.__META__ (id→{grade,strand,strandName,code}).
   Урок обирається за ?id=. Стилі — з assets/lesson-styles.css + phosphor.css (ізольовано в iframe). */
(function () {
  var LESSONS = window.__LESSONS__ || {};
  var META = window.__META__ || {};

  var STAGES = [
    { key: 'goal', label: 'Мета', icon: 'ph-target' },
    { key: 'explanation', label: 'Пояснення', icon: 'ph-book-open' },
    { key: 'example', label: 'Приклад', icon: 'ph-lightbulb' },
    { key: 'practice', label: 'Спробуй сам', icon: 'ph-pencil-simple' },
    { key: 'training', label: 'Тренування', icon: 'ph-barbell' },
    { key: 'check', label: 'Перевірка', icon: 'ph-clipboard-text' },
    { key: 'summary', label: 'Підсумок', icon: 'ph-chart-bar' },
    { key: 'result', label: 'Результат', icon: 'ph-medal' }
  ];

  function esc(s) {
    return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; });
  }

  // Легкий LaTeX-рендер ($…$): \sqrt, \frac, ^, _, оператори/грецькі.
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
  function mathT(t) { return String(t).split('$').map(function (p, i) { return i % 2 ? renderMath(p) : esc(p); }).join(''); }
  function mathH(t) { return String(t).split('$').map(function (p, i) { return i % 2 ? renderMath(p) : p; }).join(''); }

  function renderSec(s) {
    if (s.type === 'text') return mathH(s.html);
    if (s.type === 'figure') return '<figure class="fig">' + s.svg + (s.caption ? '<figcaption>' + mathH(s.caption) + '</figcaption>' : '') + '</figure>';
    if (s.type === 'callout') return '<div class="callout ' + s.kind + '">' + (s.title ? '<h4>' + mathH(s.title) + '</h4>' : '') + mathH(s.html) + '</div>';
    if (s.type === 'example') {
      var steps = s.steps.map(function (st) {
        return '<li class="ex-step"><span class="ex-expr">' + mathT(st.expr) + '</span><span class="ex-note">' + mathH(st.note || '') + '</span></li>';
      }).join('');
      return '<div class="example"><div class="ex-title">' + esc(s.title) + '</div>' + (s.intro ? '<div class="ex-intro">' + mathH(s.intro) + '</div>' : '') +
        '<ul class="ex-steps">' + steps + '</ul><div class="ex-answer">Відповідь: ' + mathT(s.answer) + '</div></div>';
    }
    return '';
  }

  function assignStages(L) {
    var buckets = {};
    (L.sections || []).forEach(function (s, i) {
      var st = s.stage;
      if (!st) {
        if (i === 0 && s.type === 'text') st = 'goal';
        else if (s.type === 'example') st = 'example';
        else if (s.type === 'callout' && /^(Коротко|Підсумок)/i.test(s.title || '')) st = 'summary';
        else st = 'explanation';
      }
      (buckets[st] = buckets[st] || []).push(s);
    });
    return buckets;
  }

  function quizHtml(L) {
    var q = L.quiz || [];
    if (!q.length) return '';
    return '<div class="quiz">' + q.map(function (item, qi) {
      var opts = item.options.map(function (opt, oi) {
        return '<button class="qopt" type="button" data-oi="' + oi + '"><span class="qradio"></span><span>' + mathT(opt) + '</span></button>';
      }).join('');
      return '<div class="qcard" data-qi="' + qi + '" data-correct="' + item.correct + '"><p class="qq">' + (qi + 1) + '. ' + mathT(item.q) +
        '</p><div class="qopts">' + opts + '</div><div class="qexplain" data-explain="' + esc(item.explain) + '"></div></div>';
    }).join('') + '<button class="quiz-check" type="button">Перевірити</button></div>';
  }

  // ---- рендер ----
  var id = new URLSearchParams(location.search).get('id');
  var L = LESSONS[id];
  var M = META[id] || {};
  var content = document.getElementById('lessonContent');

  if (!L) {
    content.innerHTML = '<div class="ls-notfound"><p>Урок не знайдено.</p><a class="check-cta" href="math.html">До графа</a></div>';
    return;
  }
  document.title = L.title + ' — КВАНТ';

  // Топбар-контекст
  function chip(icon, k, v, cls) {
    return '<div class="lt-item ' + (cls || '') + '">' + (icon ? '<i class="lt-item-ic ph ' + icon + '" aria-hidden="true"></i>' : '') +
      '<span class="lt-kv"><span class="lt-k">' + k + '</span><span class="lt-v">' + esc(v) + '</span></span></div>';
  }
  document.getElementById('ltContext').innerHTML =
    chip('ph-function', 'Предмет', 'Математика', 'is-subject') +
    chip('ph-users-three', 'Клас', (M.grade || '') + ' клас') +
    chip('ph-book', 'Модуль', M.strandName || '—', 'hide-sm') +
    chip('ph-target', 'Тема', L.title, 'hide-md') +
    chip('ph-list-checks', 'Тема №', M.code || '—') +
    '<div class="lt-item"><span class="lt-kv"><span class="lt-k">Прогрес уроку</span><span class="lt-progress-row"><span class="lt-progress-track"><span class="lt-progress-fill" id="ltFill" style="width:0%"></span></span><span class="lt-progress-pct" id="ltPct">0%</span></span></span></div>' +
    chip('ph-clock', 'Орієнтовний час', (L.minutes || '') + ' хв', 'hide-sm');

  // Наявність контенту в етапі
  var buckets = assignStages(L);
  function has(key) { return key === 'check' ? (L.quiz || []).length > 0 : (buckets[key] || []).length > 0; }

  // Степер
  document.getElementById('stepList').innerHTML = STAGES.map(function (st, ix) {
    var cls = 'step-item' + (ix === 0 ? ' active' : ' upcoming') + (has(st.key) ? '' : ' is-empty');
    return '<button class="' + cls + '" type="button" data-target="stage-' + st.key + '"' + (ix === 0 ? ' aria-current="step"' : '') + '>' +
      '<span class="step-dot" aria-hidden="true"></span><span class="step-main"><i class="step-ic ph ' + st.icon + '" aria-hidden="true"></i><span class="step-label">' + st.label + '</span></span></button>';
  }).join('');

  // Контент по всіх етапах
  var emptyHtml = '<p class="ls-empty">Цей етап поки порожній — заповниться пізніше.</p>';
  content.innerHTML = STAGES.map(function (st, ix) {
    var inner = st.key === 'check' ? (quizHtml(L) || emptyHtml)
      : (has(st.key) ? (buckets[st.key] || []).map(renderSec).join('') : emptyHtml);
    var title = st.key === 'goal' ? '<h2 class="slot-title">' + esc(L.title) + '</h2>' : '';
    return '<section class="ls-stage" id="stage-' + st.key + '">' +
      '<div class="slot-overline"><span class="dot" aria-hidden="true"></span><span>Етап ' + (ix + 1) + ' · ' + st.label + '</span></div>' +
      title + '<div class="ls-stage-body">' + inner + '</div></section>';
  }).join('');

  // ---- взаємодія ----
  var steps = [].slice.call(document.querySelectorAll('.step-item'));
  var stages = [].slice.call(document.querySelectorAll('.ls-stage'));

  steps.forEach(function (b) {
    b.addEventListener('click', function () {
      var el = document.getElementById(b.dataset.target);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // Квіз
  content.querySelectorAll('.qcard').forEach(function (card) {
    var correct = +card.dataset.correct;
    card.querySelectorAll('.qopt').forEach(function (opt) {
      opt.addEventListener('click', function () {
        card.querySelectorAll('.qopt').forEach(function (o) { o.classList.remove('is-sel'); });
        opt.classList.add('is-sel');
      });
    });
  });
  content.querySelectorAll('.quiz-check').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var quiz = btn.closest('.quiz');
      var all = 0, ok = 0;
      quiz.querySelectorAll('.qcard').forEach(function (card) {
        all++;
        var correct = +card.dataset.correct;
        var opts = card.querySelectorAll('.qopt');
        var ex = card.querySelector('.qexplain');
        opts.forEach(function (o) { o.classList.remove('correct', 'wrong'); });
        var sel = card.querySelector('.qopt.is-sel');
        opts[correct] && opts[correct].classList.add('correct');
        if (sel && +sel.dataset.oi === correct) { ok++; ex.innerHTML = '<b>✓ Правильно.</b> ' + mathT(ex.dataset.explain); ex.className = 'qexplain show ok'; }
        else { if (sel) sel.classList.add('wrong'); ex.innerHTML = mathT(ex.dataset.explain); ex.className = 'qexplain show'; }
      });
    });
  });

  // Scroll-spy: активний/пройдені/майбутні етапи + прогрес
  var topbar = document.querySelector('.lesson-topbar');
  var fill = document.getElementById('ltFill'), pct = document.getElementById('ltPct');
  function sync() {
    var line = topbar.getBoundingClientRect().bottom + 40;
    var ai = 0;
    stages.forEach(function (el, i) { if (el.getBoundingClientRect().top <= line) ai = i; });
    steps.forEach(function (b, i) {
      b.classList.toggle('active', i === ai);
      b.classList.toggle('completed', i < ai);
      b.classList.toggle('upcoming', i > ai);
      if (i === ai) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
    var p = Math.round(ai / (STAGES.length - 1) * 100);
    if (fill) fill.style.width = p + '%';
    if (pct) pct.textContent = p + '%';
  }
  var raf = 0;
  function onScroll() { if (raf) return; raf = requestAnimationFrame(function () { raf = 0; sync(); }); }
  window.addEventListener('scroll', onScroll, true);
  window.addEventListener('resize', onScroll);
  sync();

  // Якщо сторінка відкрита в iframe (з графа) — «Вийти з уроку» закриває overlay.
  if (window.parent && window.parent !== window) {
    var exit = document.querySelector('.lt-exit');
    if (exit) exit.addEventListener('click', function (e) { e.preventDefault(); window.parent.postMessage('kvant-close-lesson', '*'); });
  }
})();
