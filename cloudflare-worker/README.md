# FO4SO 投稿图片上传后端（serverless + GitHub 仓库存图）

把投稿页上传的图片**写进仓库 `images/`**，返回可直接显示的链接（免卡、图在你自己的 GitHub 仓库里）。

## 原理
- 投稿页（`submit.html`）点「上传图片」→ POST 到本后端的 `/upload`（`multipart/form-data`，字段名 `file`）
- 后端用你的 **GitHub Token** 把图片 base64 写进 `仓库/images/<时间戳-随机>.png`
- 返回 `https://raw.githubusercontent.com/<owner>/<repo>/main/images/<文件名>`（即时可显示）

## 需要配置（环境变量/Secret，勿写进 git）
- `GITHUB_TOKEN`：GitHub Token，需对仓库有 **Contents: Read and write** 权限
- `OWNER`：`wz3723`
- `REPO`：`FO4SO-KNOWLEDGE`

## 部署到免卡 serverless（二选一）

### 方式 A：Vercel（推荐，免费、通常不要求卡）
1. 注册 Vercel（免费）→ New Project → 把本文件夹（或 Cloudflare Worker 代码）作为 Serverless Function
2. 或在项目 `api/` 目录放一个 `upload.js`（Node 版），设置环境变量
3. 设置环境变量：`GITHUB_TOKEN` / `OWNER` / `REPO`
4. 部署后得到一个 URL，如 `https://xx.vercel.app/upload`
5. 把 `submit.html` 里的 `var API='https://api.fo4so.asia/upload'` 改成你的 Vercel URL

### 方式 B：Cloudflare Workers
1. 建 Worker `fo4so-api`，粘贴 `worker.js`
2. Settings → Variables & Secrets → 添加 `GITHUB_TOKEN`、`OWNER`、`REPO`
3. 部署；若用 `api.fo4so.asia` 需在 Domains & Routes 加自定义域名
4. 把 `submit.html` 的 `var API` 改成 `https://api.fo4so.asia/upload`

## 提醒
- 图片写进仓库后，`images/` 会随仓库增长（GitHub 仓库有大小限制，留意）。
- 每张图是一次提交；图片本身由 GitHub 托管，稳定。
- 若希望图片走 `https://fo4so.asia/images/...`（站点域名），把 `worker.js` 返回的 `url` 改为这个即可（GitHub Pages 重建后约 1 分钟显示）。
