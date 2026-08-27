/* FO4SO.KNOWLEDGE — 站内搜索 */
(function () {
  // 搜索索引：t=标题, u=跳转地址, k=匹配关键词, d=说明
  var INDEX = [
    { t: '首页', u: 'index.html', k: '首页 home 主页面 FO4SO KNOWLEDGE 知识库 终端 入口', d: '返回首页' },
    { t: '开始阅读整合指南合集', u: 'guide.html', k: '整合指南 合集 开始阅读 按钮 主 生存大修 入口', d: '跳转到整合指南页面' },
    { t: '《Fallout 4》的终极形态', u: 'guide.html', k: '终极形态 生存大修 文章 正文 单机', d: '整合指南正文' },
    { t: 'Fallout 4 生存大修简介', u: 'guide.html', k: '简介 Fallout 4 生存大修 模组 系统', d: '侧边目录' },
    { t: '整合包更新计划', u: 'guide.html', k: '整合包 更新 计划 版本', d: '侧边目录' },
    { t: '安装与升级指南', u: 'guide.html', k: '安装 升级 指南 步骤', d: '侧边目录' },
    { t: '教程：如何从零开始', u: 'guide.html', k: '教程 从零开始 手把手 入门 指南', d: '侧边目录' },
    { t: '常见问题与修复', u: 'guide.html', k: '常见问题 修复 故障 异常 答疑', d: '侧边目录' },
    { t: '为什么选择生存大修', u: 'guide.html', k: '为什么 选择 生存大修 挑战 玩法 废土 核心', d: '正文章节' },
    { t: '专注于知识的整合', u: 'index.html', k: '专注于知识的整合 整理 沉淀 知识 百科', d: '首页特性' },
    { t: '超过 400+ 的模组总数', u: 'index.html', k: '超过 400 mod 模组 总数 覆盖 玩法 画质 武器 服装 机制 生存模式', d: '首页特性' },
    { t: '紧跟迭代，持续更新', u: 'index.html', k: '紧跟 迭代 持续更新 开发中 模块 修正 补齐', d: '首页特性' },
    { t: '地平线维基百科入口', u: 'index.html', k: '地平线 wiki 维基 百科 入口 Horizon 查看详情', d: 'Horizon 官方 wiki' },
    { t: '加入交流群：748570653', u: 'index.html', k: '加入交流群 群号 748570653 交流 联系', d: '交流群号' },
    { t: '返回首页', u: 'index.html', k: '返回首页 首页 主页面 home back 后退', d: '返回主页面' }
  ];

  var input = document.querySelector('.search input');
  var box = document.getElementById('searchResults');
  if (!input || !box) return;

  var sel = -1, items = [];

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function hl(text, q) {
    var out = esc(text);
    var tokens = String(q).trim().split(/\s+/).filter(Boolean);
    tokens.forEach(function (tok) {
      if (!tok) return;
      var re = new RegExp('(' + tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
      out = out.replace(re, '<mark>$1</mark>');
    });
    return out;
  }
  function query(q) {
    q = String(q).trim().toLowerCase();
    if (!q) return [];
    var tokens = q.split(/\s+/);
    return INDEX.filter(function (e) {
      var hay = (e.t + ' ' + e.k).toLowerCase();
      return tokens.every(function (t) { return hay.indexOf(t) >= 0; });
    });
  }
  function markSel() {
    var all = box.querySelectorAll('.sr-item');
    for (var i = 0; i < all.length; i++) all[i].classList.toggle('sel', i === sel);
  }
  function render(list) {
    box.innerHTML = '';
    items = list; sel = -1;
    if (!list.length) {
      box.innerHTML = '<div class="sr-empty">没有找到相关内容</div>';
      box.classList.add('open'); return;
    }
    list.forEach(function (e, i) {
      var d = document.createElement('div');
      d.className = 'sr-item';
      d.innerHTML = '<div class="sr-t">' + hl(e.t, input.value) + '</div>' +
        '<div class="sr-u">' + esc(e.u) + ' · ' + esc(e.d || '') + '</div>';
      d.addEventListener('click', function () { location.href = e.u; });
      d.addEventListener('mousemove', function () { if (sel !== i) { sel = i; markSel(); } });
      box.appendChild(d);
    });
    box.classList.add('open');
  }
  function close() { box.classList.remove('open'); sel = -1; }

  input.addEventListener('input', function () { render(query(input.value)); });
  input.addEventListener('focus', function () { if (input.value.trim()) render(query(input.value)); });
  input.addEventListener('keydown', function (e) {
    var all = box.querySelectorAll('.sr-item');
    if (e.key === 'ArrowDown') {
      e.preventDefault(); sel = Math.min(sel + 1, items.length - 1); markSel();
      if (all[sel]) all[sel].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault(); sel = Math.max(sel - 1, 0); markSel();
      if (all[sel]) all[sel].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (items.length) location.href = items[sel >= 0 ? sel : 0].u;
      close();
    } else if (e.key === 'Escape') { close(); input.blur(); }
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.search-wrap')) close();
  });
})();
