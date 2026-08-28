// FO4SO API — 投稿图片上传（Cloudflare Worker + R2）
// 部署到 api.fo4so.asia。R2 绑定名 IMAGES，bucket 名 fo4so-images。
const ALLOW_ORIGIN = '*';
const EXT_OK = ['png','jpg','jpeg','gif','webp','bmp','avif'];

function cors(h){
  h = Object.assign(
    {
      'Access-Control-Allow-Origin': ALLOW_ORIGIN,
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }, h || {});
  return h;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (method === 'OPTIONS') return new Response(null, { status: 204, headers: cors() });

    // 上传：POST /upload  (multipart/form-data, 字段名 file)
    if (method === 'POST' && path === '/upload') {
      try {
        const form = await request.formData();
        const file = form.get('file');
        if (!file || typeof file === 'string') {
          return new Response(JSON.stringify({ error: 'no file' }), { status: 400, headers: cors({ 'Content-Type': 'application/json' }) });
        }
        if (!(file.type || '').startsWith('image/')) {
          return new Response(JSON.stringify({ error: 'not an image' }), { status: 400, headers: cors({ 'Content-Type': 'application/json' }) });
        }
        const rawExt = (file.name || 'image.png').split('.').pop().toLowerCase();
        const ext = EXT_OK.includes(rawExt) ? rawExt : 'png';
        const key = 'img/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;
        await env.IMAGES.put(key, file.stream(), { httpMetadata: { contentType: file.type || 'image/png' } });
        const url2 = { url: url.origin + '/images/' + key };
        return new Response(JSON.stringify(url2), { status: 200, headers: cors({ 'Content-Type': 'application/json' }) });
      } catch (e) {
        return new Response(JSON.stringify({ error: 'server error' }), { status: 500, headers: cors({ 'Content-Type': 'application/json' }) });
      }
    }

    // 服务图片：GET /images/<key>
    if (method === 'GET' && path.indexOf('/images/') === 0) {
      try {
        const key = decodeURIComponent(path.slice('/images/'.length));
        const obj = await env.IMAGES.get(key);
        if (!obj) return new Response('404', { status: 404, headers: cors() });
        const type = (obj.httpMetadata && obj.httpMetadata.contentType) || 'application/octet-stream';
        return new Response(obj.body, {
          headers: cors({
            'Content-Type': type,
            'Cache-Control': 'public, max-age=31536000, immutable'
          })
        });
      } catch (e) {
        return new Response('500', { status: 500, headers: cors() });
      }
    }

    return new Response('FO4SO API', { status: 200, headers: cors() });
  }
};
