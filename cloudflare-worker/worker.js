// FO4SO API — 投稿图片上传（serverless + 写入 GitHub 仓库 images/）
// 部署到免卡 serverless（Vercel 或 Cloudflare Workers）。
// 需要配置环境变量/Secret：GITHUB_TOKEN（仓库 Contents: 读写）、OWNER、REPO
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400'
};
const EXT_OK = ['png','jpg','jpeg','gif','webp','bmp','avif'];

function json(o, status, extra){ return new Response(JSON.stringify(o), { status: status, headers: Object.assign({ 'Content-Type':'application/json' }, CORS, extra||{}) }); }
function b64(buf){ const b = new Uint8Array(buf); let s=''; for(let i=0;i<b.length;i++) s += String.fromCharCode(b[i]); return btoa(s); }

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

    // 上传：POST /upload  (multipart/form-data, 字段名 file)
    if (method === 'POST' && path === '/upload') {
      const token = env.GITHUB_TOKEN;
      const owner = env.OWNER || 'wz3723';
      const repo  = env.REPO  || 'FO4SO-KNOWLEDGE';
      if (!token) return json({ error: 'server not configured (missing GITHUB_TOKEN)' }, 500);
      try {
        const type = request.headers.get('content-type') || 'image/png';
        if (!type.startsWith('image/')) return json({ error: 'not an image' }, 400);
        const buf = await request.arrayBuffer();
        if (!buf || !buf.byteLength) return json({ error: 'no data' }, 400);
        const sub = (type.split('/')[1] || 'png').split('+')[0];
        const ext = EXT_OK.includes(sub) ? sub : 'png';
        const key = 'images/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;

        const content = b64(buf);
        const apiUrl = 'https://api.github.com/repos/' + owner + '/' + repo + '/contents/' + key;

        const resp = await fetch(apiUrl, {
          method: 'PUT',
          headers: {
            'Authorization': 'Bearer ' + token,
            'Accept': 'application/vnd.github+json',
            'Content-Type': 'application/json',
            'User-Agent': 'fo4so-api'
          },
          body: JSON.stringify({ message: 'upload image ' + key, content: content, branch: 'main' })
        });
        if (!resp.ok) {
          const t = await resp.text();
          return json({ error: 'github write failed: ' + (t || '').slice(0, 140) }, 502);
        }
        // 返回可直接显示的链接（raw.githubusercontent 即时可用；也可换成 https://fo4so.asia/images/<key>）
        return json({ url: 'https://raw.githubusercontent.com/' + owner + '/' + repo + '/main/' + key }, 200);
      } catch (e) {
        return json({ error: 'server error' }, 500);
      }
    }

    return new Response('FO4SO API', { status: 200, headers: CORS });
  }
};
