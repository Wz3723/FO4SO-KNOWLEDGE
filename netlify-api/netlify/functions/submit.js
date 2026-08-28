// Netlify Function — 投稿：POST 标题+正文，用 GitHub API 直接创建 Issue（突破 URL 长度限制）
// 环境变量：GITHUB_TOKEN、OWNER(wz3723)、REPO(FO4SO-KNOWLEDGE)
const CORS = { 'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Methods':'POST,OPTIONS', 'Access-Control-Allow-Headers':'Content-Type' };
const cors = (h) => Object.assign({ 'Content-Type':'application/json' }, CORS, h || {});
const j = (s, c, h) => ({ statusCode: c, headers: cors(h), body: JSON.stringify(s) });

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors(), body: '' };
  if (event.httpMethod !== 'POST') return j({ error: 'method' }, 405);

  const token = process.env.GITHUB_TOKEN, owner = process.env.OWNER || 'wz3723', repo = process.env.REPO || 'FO4SO-KNOWLEDGE';
  if (!token) return j({ error: 'missing GITHUB_TOKEN' }, 500);

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (e) { return j({ error: 'bad json' }, 400); }

  const title = String(body.title || '').trim();
  const author = String(body.author || '').trim();
  const contact = String(body.contact || '').trim();
  const content = String(body.content || '').trim();
  if (!title) return j({ error: '请填写标题' }, 400);
  if (!content) return j({ error: '请填写内容' }, 400);

  const issueBody = '**作者**：' + (author || '匿名') + '\n**联系方式**：' + (contact || '未填写') + '\n\n---\n\n' + content;

  const gh = await fetch('https://api.github.com/repos/' + owner + '/' + repo + '/issues', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'fo4so-api'
    },
    body: JSON.stringify({ title: title, body: issueBody })
  });
  const data = await gh.json().catch(() => ({}));
  if (!gh.ok) return j({ error: (data.message || ('创建失败(' + gh.status + ')')).slice(0, 140) }, 502);

  return j({ ok: true, number: data.number, url: data.html_url }, 200);
};
