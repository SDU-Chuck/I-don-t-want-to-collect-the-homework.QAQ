# 课业集：GitHub + Cloudflare 部署

## 功能
- 数据结构、计算机网络作业收集；学生凭链接免登录提交。
- PDF、PNG、JPG、JPEG、DOC、DOCX，每次最多5个文件、合计20MB。
- Excel 名单导入；按学号和姓名统计已交、未交、待核对。
- 管理员单独下载或打包 ZIP，含所有提交版本和提交情况 CSV。
- 独立管理员密码登录、8小时有效会话、登录失败频率限制。

## 仓库内容

代码可以放在 GitHub；不要上传 .dev.vars、.wrangler、work、outputs、node_modules，也不要上传班级名单或作业附件。管理员密码和会话密钥存放在 Cloudflare 的 Secret 中。源码不包含名单，首次线上登录后从网页导入原始 Excel。

## 首次部署

需要 Node.js 22.13+、npm，以及已登录的 GitHub 和 Cloudflare 账号。

1. 将项目源码推送到自己的 GitHub 仓库。
2. 在 Cloudflare 创建 D1 数据库 `classwork-db` 和 R2 存储桶 `classwork-files`。如果账号提示开通或计费，请自行确认后继续。
3. 将实际 D1 数据库 ID 填入 `wrangler.jsonc` 的 `database_id`。如果资源名称不同，同步修改 `database_name` 和 `bucket_name`。不要保留全零的示例 ID。
4. 在 Cloudflare Workers 创建/导入 GitHub 仓库，Worker 名称使用 `classwork-collection`，生产分支选 `main`。
5. 构建命令：`npm run build`。部署命令：`npm run deploy`。部署命令先应用 D1 迁移，再发布 Worker。构建身份需要对应 Worker、D1 和 R2 的操作权限；仅连接可信的生产分支，不为不可信 PR 执行生产部署。
6. 在 Worker 的 Settings → Variables and Secrets 添加两个 Secret：`ADMIN_PASSWORD`（至少12位）与 `SESSION_SECRET`（至少32位随机字符）。请在 Cloudflare 中自行输入，不要发送到聊天或写进源码。更新 Secret 后按界面要求部署更改。
7. 打开 Worker 的 HTTPS 地址，进入 `/login`，用设置的管理员密码登录。没有注册入口，只有一个管理员。
8. 导入29人班级名单，新建收集，将每项任务的 `/submit/...` 链接发给同学。

GitHub 后续推送由 Cloudflare Workers Builds 自动构建部署。当前项目不再依赖 Sites 或 ChatGPT 登录，也不使用 GitHub Pages。

官方文档：
- https://developers.cloudflare.com/workers/ci-cd/builds/
- https://developers.cloudflare.com/workers/ci-cd/builds/configuration/

## 本地运行

```sh
npm run install:ci
npm run build
```

将 `.dev.vars.example` 复制为 `.dev.vars`，设置自己的测试密码和随机会话密钥。首次创建本地数据库时依次执行：

```sh
npx wrangler d1 migrations apply DB --local --config wrangler.jsonc --persist-to .wrangler/state
npm run dev
```

已有旧版本地数据库不要重复执行已经应用过的 SQL。应只执行尚未应用的迁移，例如本次新增的 `drizzle/0002_organic_agent_brand.sql`。旧版 Wrangler 手动 execute 的迁移不会自动登记到 migrations 表中；生产应从全新的 D1 数据库开始，并统一使用 migrations apply。

## 发布状态

项目已适配独立 Cloudflare 部署。仓库连接、真实 D1/R2 配置以及正式上线须以实际账号中的操作结果为准，不能仅凭构建成功认定已上线。

本地上传记录与名单不会自动迁移到生产。请在生产重新导入名单。管理员会话不接受客户端伪造的 ChatGPT 身份请求头。密码变更时也应轮换 SESSION_SECRET，以使旧会话失效。
