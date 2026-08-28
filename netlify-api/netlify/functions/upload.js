// Netlify Function — 投稿图片上传（写入 GitHub 仓库 images/）
// 部署到 Netlify：项目 Base directory 设为含本文件的文件夹（netlify-api），
// 函数地址为 <你的Netlify>.netlify.app/.netlify/functions/upload
// 环境变量：GITHUB_TOKEN（仓库 Contents: 读写）、OWNER（默认 wz3723）、REPO（默认 FO4SO-KNOWLEDGE）
exports.handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
  const j = (s, c) => ({ statusCode: c, headers: cors, body: JSON.stringify(s) });

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };
  if (event.httpMethod !== 'POST') return j({ error: 'method not allowed' }, 405);

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.OWNER || 'wz3723';
  const repo  = process.env.REPO  || 'FO4SO-KNOWLEDGE';
  if (!token) return j({ error: 'missing GITHUB_TOKEN' }, 500);

  const type = event.headers['content-type'] || 'image/png';
  if (!type.startsWith('image/')) return j({ error: 'not an image' }, 400);
  const buf = event.isBase64Encoded ? Buffer.from(event.body, 'base64') : Buffer.from(event.body);
  if (!buf || !buf.length) return j({ error: 'no data' }, 400);

  const sub = (type.split('/')[1] || 'png').split('+')[0];
  const ext = ['png','jpg','jpeg','gif','webp','bmp','avif'].includes(sub) ? sub : 'png';
  const key = 'images/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;

  const apiUrl = 'https://api.github.com/repos/' + owner + '/' + repo + '/contents/' + key;
  const gh = await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'fo4so-api'
    },
    body: JSON.stringify({ message: 'upload image ' + key, content: buf.toString('base64'), branch: 'main' })
  });
  if (!gh.ok) {
    const t = await gh.text();
    return j({ error: 'github write failed: ' + t.slice(0, 140) }, 502);
  }
  return j({ url: 'https://raw.githubusercontent.com/' + owner + '/' + repo + '/main/' + key }, 200);
};
