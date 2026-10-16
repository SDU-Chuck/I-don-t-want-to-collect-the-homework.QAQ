# 课业集：网页收作业，GitHub 保存附件

学生通过网页上传作业，服务端将附件写入私有 GitHub 仓库。网站代码保存在公开代码仓库，作业保存在另一个专用私有仓库。名单、任务和提交状态保存在 D1 数据库，附件不再依赖 R2。

## 已有功能

- 数据结构、计算机网络作业收集，支持要求、截止时间、停止或恢复收集。
- 学生凭独立作业链接免登录提交姓名、学号及附件。
- 支持 PDF、PNG、JPG、JPEG、DOC、DOCX，每次最多5个文件，合计20MB。
- Excel 名单导入；按学号和姓名比对已交、未交和待核对。重复提交不重复计算人数。
- 管理员独立密码登录，查看提交、单独下载、打包 ZIP。ZIP 内附提交情况 CSV。
- 附件经过服务端格式检查后保存到私有 GitHub 仓库，并保留所有提交版本。
- 多人同时上传时基于最新仓库内容提交，不强制覆盖其他同学的作业。

## 三个地方分别保存什么

| 位置 | 保存内容 |
| --- | --- |
| 网站代码仓库，可公开 | 网页、后端代码、部署配置；不放密码和真实名单 |
| 作业仓库，必须私有 | 同学的作业附件、每次提交的 submission.json 信息 |
| Cloudflare D1 | 班级名单、任务、提交及文件索引 |

Cloudflare Workers 运行网站和接收上传。只公开 GitHub 代码仓库或启用 GitHub Pages，不会运行本项目的上传接口。仓库和 Workers 之间的写入凭据只在服务端使用，不交给学生浏览器。

## 第一次配置

1. 新建专门保存作业的 **Private** GitHub 仓库，并勾选 Add a README file。保留默认 main 分支即可。已有公开网站代码仓库继续保存代码，不存同学作业。
2. 在 GitHub 创建 fine-grained personal access token，只选择这个私有作业仓库，将 Repository permissions → Contents 设为 Read and write。无需授予公开代码仓库访问权限，也无需账号管理员权限。设置有效期，到期后更新 Cloudflare Secret。
3. 在 Cloudflare 创建 D1 数据库 classwork-db。将数据库 ID 填到 wrangler.jsonc 的 database_id。
4. 同一配置文件的 vars 中填写 GITHUB_OWNER（仓库所属账号）、GITHUB_HOMEWORK_REPO（作业仓库名，不是完整链接）、GITHUB_HOMEWORK_BRANCH（默认 main）。这些是仓库标识，不是凭据。
5. 在 Cloudflare Workers 连接网站代码的 GitHub 仓库。Worker 名称 classwork-collection；构建命令 npm run build；部署命令 npm run deploy。按控制台提示完成 GitHub App 授权。Cloudflare 只连接公开网站代码仓库，不连接私有作业仓库，因此同学交作业不会触发网站构建。此方式不依赖本机 localhost OAuth 回调。
6. 在 Worker 的 Settings → Variables and Secrets 添加三个 Secret：ADMIN_PASSWORD（至少12位）、SESSION_SECRET（至少32位随机字符）、GITHUB_TOKEN（第2步的凭据）。在 Cloudflare 中自行填写，不要发到聊天、提交进 GitHub，或填写到前端代码。保存后部署更改。
7. 打开正式 HTTPS 网站地址的 /login，输入管理员密码，导入原始班级名单，创建任务并分享 /submit/... 链接。

服务端每次上传/下载请求都会检查仓库是否私有；仓库公开、已归档、凭据失效、初始化分支不存在时，会拒绝操作并给出提示。自动检查通过不代表线上仓库连接已通过，仍需实际配置后做一次测试提交。

官方接口文档：
- https://docs.github.com/en/rest/git/blobs
- https://docs.github.com/en/rest/git/trees
- https://docs.github.com/en/rest/git/refs
- https://developers.cloudflare.com/workers/ci-cd/builds/

## 作业在 GitHub 中的目录

```
homework/
  <收集任务编号>/
    <提交编号>/
      01-作业.pdf
      02-截图.png
      submission.json
```

submission.json 保存姓名、学号、任务、提交时间及附件索引。每次提交的附件和说明会在一次仓库提交中一起归档。D1 负责网站中的查询和统计；它不会在丢失后自动从仓库恢复。若附件归档后数据库写入失败，页面不会假报成功；文件仍保留在私有仓库，可按提交编号核查。重复点击重试不会重复计入已交人数。

附件按 Git blob 哈希读取，因此重新提交不会让旧提交的下载链接变成新内容。切换作业仓库后，已有记录不会自动迁移。旧 R2 附件也不会被自动搬运或删除，需单独迁移。

## 本地运行与验证

要求 Node.js 22.13+ 和 npm。

```sh
npm run install:ci
npm run build
npx wrangler d1 migrations apply DB --local --config wrangler.jsonc --persist-to .wrangler/state
npm run dev
```

复制 .dev.vars.example 为 .dev.vars 并填写本地测试 Secret；在 wrangler.jsonc 填写私有测试仓库标识。使用与正式班级分开的测试仓库。该配置会真的把测试附件写到配置的 GitHub 仓库，不包含假存储降级。

旧版手工 execute 的本地迁移可能未登记迁移表，不应重复执行；已有本地数据库按实际迁移记录处理。线上首次部署使用新 D1 数据库。

```sh
npm run test:storage
npm run check
```

存储测试使用模拟 GitHub 接口，检查二进制完整性、拒绝公开仓库、并发写入冲突、跨仓库读取拒绝及错误中不泄露凭据；不会上传真实作业。

## 运行边界

GitHub 有 API 频率限制和仓库容量限制。每份附件下载会调用一次 GitHub 接口，整班 ZIP 的请求数量还受 Workers 当前套餐子请求限额约束；附件很多时应核对实际部署套餐。仓库请求过于频繁时，提交页面保留姓名、学号和文件，可稍后重试。

删除仓库当前文件不会自动清除 Git 历史中的旧附件；本项目保留历史，不提供彻底清除历史的功能。请按班级或学期使用独立私有仓库。

## 发布状态

源码已改为 GitHub 私有仓库存储，需要真实私有仓库、服务端凭据和 D1 配置后才能上线。已确定使用现有公开仓库保存代码，另建私有仓库保存作业。配置已填写 GitHub 账号 SDU-Chuck；私有仓库名待用户提供，数据库 ID 仍为示例值。源码配置不代表已连接或已部署成功。
