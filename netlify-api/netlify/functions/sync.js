// Netlify Function — 半自动发布：读带「已审核」标签的 Issue → 生成 articles/<n>-<slug>.html → 提交仓库
// 环境变量：GITHUB_TOKEN（Contents: 读写）、OWNER(wz3723)、REPO(FO4SO-KNOWLEDGE)、PUBLISH_LABEL(默认 已审核)、SYNC_KEY(可选，用于手动触发鉴权)
const { marked } = require('marked');
marked.setOptions({ breaks: true, gfm: true });

const ARTICLE_CSS = [
  "body{background:#0b0b0c;color:#d8ccae;font-family:'PingFang SC','Microsoft YaHei','Noto Sans SC',system-ui,sans-serif;line-height:1.8;-webkit-font-smoothing:antialiased;margin:0;padding:0;}",
  ".progress{position:fixed;top:0;left:0;height:3px;background:linear-gradient(90deg,#e3b04b,#f2c76b);width:0;z-index:999;}",
  ".topnav{display:flex;align-items:center;gap:24px;padding:14px 28px;border-bottom:1px solid #1d1d20;background:#0b0b0c;}",
  ".brand{font-weight:800;letter-spacing:.04em;color:transparent;background:linear-gradient(180deg,#ffdd85,#d6982a);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;}",
  ".links{margin-left:auto;display:flex;gap:20px;}.links a{color:#ab9f83;font-size:14px;text-decoration:none;}",
  ".article{max-width:820px;margin:0 auto;padding:28px 24px 80px;}",
  ".crumb{font-size:13px;color:#7d7460;}",
  ".bar{margin:14px 0;}.back{color:#f2c76b;text-decoration:none;font-size:14px;}",
  ".head h1{font-size:clamp(24px,4vw,34px);font-weight:800;color:#f4f0e0;margin:10px 0 8px;}",
  ".meta{font-size:13px;color:#7d7460;display:flex;gap:18px;}.meta b{color:#e3b04b;font-weight:600;}",
  ".rule{height:1px;background:linear-gradient(180deg,rgba(255,255,255,.14),transparent);margin:16px 0;}",
  ".body{font-size:15px;color:#ab9f83;}",
  ".body h1,.body h2,.body h3{color:#e3b04b;margin:26px 0 12px;line-height:1.35;}",
  ".body p{margin:16px 0;}", ".body ul,.body ol{padding-left:24px;margin:16px 0;}",
  ".body li{margin:6px 0;}", ".body a{color:#f2c76b;text-decoration:underline;}",
  ".body img{max-width:100%;border-radius:8px;margin:16px 0;display:block;}",
  ".body a.zoom-img{display:block;}",
  ".body a.zoom-img img{cursor:zoom-in;transition:opacity .15s;}",
  ".body a.zoom-img img:hover{opacity:.9;}",
  ".body blockquote{border-left:3px solid #a8873f;background:#131315;padding:12px 16px;margin:16px 0;color:#ab9f83;border-radius:0 8px 8px 0;}",
  ".sign{margin-top:30px;padding-top:16px;border-top:1px solid #1d1d20;color:#7d7460;font-size:14px;}.sign b{color:#f2c76b;}",
  ".foot{max-width:820px;margin:0 auto;text-align:center;color:#7d7460;font-size:13px;border-top:1px solid #1d1d20;padding:22px;}",
  ".body pre{background:#101012;border:1px solid #26262a;border-radius:8px;padding:12px 14px;overflow:auto;}.body code{font-family:Consolas,monospace;color:#b8d4c8;}",
  ".body table{border-collapse:collapse;width:100%;margin:16px 0;}.body table td,.body table th{border:1px solid #26262a;padding:8px 12px;}.body table th{color:#e3b04b;}"
].join('\n');

const CORS = { 'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Methods':'GET,POST,OPTIONS', 'Access-Control-Allow-Headers':'Content-Type' };
const cors = (h) => Object.assign({ 'Content-Type':'application/json' }, CORS, h || {});
const j = (s, c, h) => ({ statusCode: c, headers: cors(h), body: JSON.stringify(s) });

function esc(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function today(){ return new Date().toISOString().slice(0,10); }
function slugify(t){ return String(t).replace(/[^\w\u4e00-\u9fa5-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,50) || 'article'; }

function buildArticlePage(title, author, date, bodyHtml, words){
  // 每个图片包一层 <a target=_blank>，点击在标签页打开原图放大查看
  bodyHtml = String(bodyHtml || '').replace(/<img([^>]*?)>/g, function(m, attrs){
    var src = (String(attrs).match(/src=["']([^"']*)["']/) || [])[1];
    if (!src) return m;
    return '<a class="zoom-img" href="' + src + '" target="_blank" rel="noopener"><img' + attrs + '></a>';
  });
  return '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n<meta charset="UTF-8"/>\n<meta name="viewport" content="width=device-width, initial-scale=1.0"/>\n<title>'+esc(title)+'</title>\n<meta name="author" content="'+esc(author||'')+'"/>\n<meta name="date" content="'+esc(date||'')+'"/>\n<meta name="category" content="攻略"/>\n<style>'+ARTICLE_CSS+'</style>\n</head>\n<body>\n<div class="progress" id="prog"></div>\n<nav class="topnav">\n  <a class="brand" href="../index.html">FO4SO<span class="dot">.</span>KNOWLEDGE</a>\n  <div class="links"><a href="../index.html">首页</a><a href="../guide.html">目录</a><a href="../submit.html">投稿</a></div>\n</nav>\n<main class="article">\n  <nav class="crumb"><a href="../guide.html">目录</a> / <a href="../guide.html#player-guides">玩家上传攻略</a> / <span>'+esc(title)+'</span></nav>\n  <div class="bar"><a class="back" href="../guide.html#player-guides">← 返回玩家上传攻略</a></div>\n  <header class="head">\n    <h1>'+esc(title)+'</h1>\n    <div class="meta"><span>作者 <b>'+esc(author||'匿名')+'</b></span>'+(date?'<span>日期 <b>'+esc(date)+'</b></span>':'')+'<span>字数 <b>'+words+'</b></span></div>\n  </header>\n  <div class="rule"></div>\n  <div class="body">'+bodyHtml+'</div>\n  <p class="sign">—— 投稿：<b>'+esc(author||'匿名')+'</b></p>\n</main>\n<footer class="foot">FO4SO.KNOWLEDGE // VERSION：1.5.6</footer>\n</body>\n</html>';
}

function parseIssue(issue){
  let body = issue.body || '';
  let author = '', contact = '';
  // 从 submit.html 的 **作者**：/ **联系方式**： 提取
  const am = body.match(/^.*?\*\*作者\*\*：\s*([^\n]+)/m); if (am) author = am[1].trim();
  const cm = body.match(/^.*?\*\*联系方式\*\*：\s*([^\n]+)/m); if (cm) contact = cm[1].trim();
  // 去掉元数据行与分隔线
  let content = body
    .replace(/^.*?\*\*作者\*\*：\s*[^\n]*\n?/m, '')
    .replace(/^.*?\*\*联系方式\*\*：\s*[^\n]*\n?/m, '')
    .replace(/^\s*---\s*\n?/m, '')
    .trim();
  return { title: issue.title, author, contact, content };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors(), body: '' };
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') return j({ error: 'method' }, 405);

  // webhook（POST）只在相关事件触发才跑，避免每次评论/编辑都重复同步
  if (event.httpMethod === 'POST') {
    let action = '';
    try { action = (JSON.parse(event.body || '{}').action || ''); } catch (e) {}
    if (action && ['labeled', 'opened', 'edited'].indexOf(action) < 0) {
      return j({ ok: true, skip: 'action=' + action }, 200);
    }
  }

  const env = process.env;
  const token = env.GITHUB_TOKEN, owner = env.OWNER || 'wz3723', repo = env.REPO || 'FO4SO-KNOWLEDGE';
  const label = env.PUBLISH_LABEL || '已审核';
  if (!token) return j({ error: 'missing GITHUB_TOKEN' }, 500);

  // 可选：SYNC_KEY 鉴权（?key= 或 header）
  const key = env.SYNC_KEY;
  if (key) {
    const q = (event.queryStringParameters || {}).key || '';
    const h = event.headers['x-sync-key'] || '';
    if (q !== key && h !== key) return j({ error: 'unauthorized' }, 401);
  }

  const gh = 'https://api.github.com/repos/' + owner + '/' + repo;
  const auth = { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'User-Agent': 'fo4so-api' };

  try {
    // 1) 待发：带标签的 open issues
    const issuesRes = await fetch(gh + '/issues?state=open&labels=' + encodeURIComponent(label) + '&per_page=100', { headers: auth });
    const issues = await issuesRes.json();
    if (!issuesRes.ok) return j({ error: 'issues fetch failed: ' + (issues.message||'').slice(0,140) }, 502);
    if (!Array.isArray(issues)) return j({ error: 'no issues' }, 200);

    // 2) 已发布：articles/ 里的文件名（<n>-<slug>.html）
    const artRes = await fetch(gh + '/contents/articles', { headers: auth });
    let existing = [];        // [{name, path}]
    let publishedPaths = new Set();
    if (artRes.ok) {
      const files = await artRes.json();
      if (Array.isArray(files)) {
        existing = files.map(f => ({ name: f.name, path: f.path || ('articles/' + f.name) }));
        existing.forEach(x => publishedPaths.add(x.path));
      }
    }
    const publishedNums = new Set();
    existing.forEach(x => { const m = x.name.match(/^(\d+)-/); if (m) publishedNums.add(m[1]); });

    let published = 0, skipped = 0, errors = [];
    const PENDING = [];
    const seen = new Set();
    for (const it of issues) {
      if (it.pull_request) continue;
      const n = String(it.number);
      if (publishedNums.has(n)) { skipped++; continue; }
      seen.add(n); PENDING.push(it);
    }
    // 若 webhook 带了具体 Issue 号，直接再取该 Issue，避免加标签后查询延迟漏掉
    try {
      const payload = JSON.parse(event.body || '{}');
      const n = payload.issue && Number(payload.issue.number);
      if (n && !seen.has(String(n)) && !publishedNums.has(String(n))) {
        const one = await fetch(gh + '/issues/' + n, { headers: auth });
        if (one.ok) {
          const o = await one.json();
          const hasLabel = (o.labels || []).some(l => l.name === label);
          if (hasLabel) { skipped--; PENDING.push(o); seen.add(String(n)); }
        }
      }
    } catch (e) { /* 忽略 webhook 解析错误 */ }

    for (const it of PENDING) {
      const n = String(it.number);
      const { title, author, content } = parseIssue(it);
      const date = today();
      const bodyHtml = marked.parse(content || '');
      const words = (content.replace(/<[^>]+>/g,'').trim().length);
      const html = buildArticlePage(title || ('投稿 '+n), author || '匿名', date, bodyHtml, words);
      const path = 'articles/' + n + '-' + slugify(title || 'article') + '.html';
      const put = await fetch(gh + '/contents/' + path, {
        method: 'PUT',
        headers: Object.assign({ 'Content-Type':'application/json' }, auth),
        body: JSON.stringify({ message: '发布投稿 #' + n + ' ' + (title||''), content: Buffer.from(html).toString('base64'), branch: 'main' })
      });
      if (!put.ok) { const e = await put.text(); errors.push('#'+n+': '+e.slice(0,120)); continue; }
      published++;
      publishedPaths.add(path);
      // 在 Issue 上回一条「已发布」评论，给站长确认
      try {
        await fetch(gh + '/issues/' + n + '/comments', {
          method: 'POST',
          headers: Object.assign({ 'Content-Type':'application/json' }, auth),
          body: JSON.stringify({ body: '✅ 已发布到网站：《' + (title || '') + '》' })
        });
      } catch (e) { /* 评论失败不影响发布 */ }
    }

    // 3) 维护 articles-manifest.json（清单，供攻略页即时读取，避免缓存延迟/限流）
    try {
      const manifest = { files: Array.from(publishedPaths).sort() };
      // 若文件已存在，需先取 sha 才能覆盖
      let sha = undefined;
      const cur = await fetch(gh + '/contents/articles-manifest.json', { headers: auth });
      if (cur.ok) { const d = await cur.json(); sha = d.sha; }
      const payload = { message: '更新文章清单', content: Buffer.from(JSON.stringify(manifest)).toString('base64'), branch: 'main' };
      if (sha) payload.sha = sha;
      const mput = await fetch(gh + '/contents/articles-manifest.json', {
        method: 'PUT',
        headers: Object.assign({ 'Content-Type':'application/json' }, auth),
        body: JSON.stringify(payload)
      });
      if (!mput.ok) errors.push('manifest: '+ (await mput.text()).slice(0,120));
    } catch (e) { errors.push('manifest: ' + (e.message||'')); }

    return j({ ok: true, label: label, published: published, skipped: skipped, errors: errors }, 200);
  } catch (e) {
    return j({ error: 'server error: ' + (e.message||'') }, 500);
  }
};
