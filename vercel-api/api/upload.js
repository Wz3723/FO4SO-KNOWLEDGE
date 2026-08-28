// Vercel Serverless Function — 投稿图片上传（写入 GitHub 仓库 images/）
// 部署到 Vercel：本项目根目录设为包含本文件的文件夹；函数地址为 <你的Vercel>.vercel.app/api/upload
// 环境变量：GITHUB_TOKEN（仓库 Contents: 读写）、OWNER（默认 wz3723）、REPO（默认 FO4SO-KNOWLEDGE）
export default async function handler(req, res) {
  // CORS（浏览器跨域投稿页需要）
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'method not allowed' }); return; }

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.OWNER || 'wz3723';
  const repo  = process.env.REPO  || 'FO4SO-KNOWLEDGE';
  if (!token) return res.status(500).json({ error: 'server not configured (missing GITHUB_TOKEN)' });

  const type = req.headers['content-type'] || 'image/png';
  const buf = Buffer.isBuffer(req.body)
    ? req.body
    : (req.body instanceof Uint8Array ? Buffer.from(req.body) : null);
  if (!buf || !buf.length) return res.status(400).json({ error: 'no data' });
  if (!type.startsWith('image/')) return res.status(400).json({ error: 'not an image' });

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
    return res.status(502).json({ error: 'github write failed: ' + t.slice(0, 140) });
  }
  res.status(200).json({ url: 'https://raw.githubusercontent.com/' + owner + '/' + repo + '/main/' + key });
}
