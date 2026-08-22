# 学术个人网站健康审查报告

> 项目：`zheyesong.github.io`
> 审查目录：`/Users/vegetable/Desktop/zheyesong.github.io`
> 审查日期：2026-08-20
> 审查方式：源码检查、现有构建命令、静态产物检查、真实浏览器测试、线上站点验证
> 审查范围：Home、Research、Writing、Writing article、CV、404、robots.txt、sitemap
> 修改声明：审查阶段未修改源码、内容、依赖锁文件或构建配置；本文件是确认后新增的审查报告。

## 后续处置记录（2026-08-22）

- **已修复：** P1-2、P1-3 的生成链路、P2-1、P2-3、P2-4、P2-5，以及 P2-6 的 HTML 标题层级和 PDF 文档元数据；同时修复了内部链接检查发现的 404 canonical 问题。
- **验证方式：** 新增统一的 `npm run verify`，覆盖 Astro 类型/内容检查、CV 网站与 LaTeX 事实核对、PDF 构建、站点构建和静态内部链接检查；桌面与 390px 移动端浏览器复核通过。
- **部分保留：** PDF 已包含标题、作者、主题、关键词和语言信息，但尚未实现结构标签（`Tagged: no`），完整 PDF/UA 标签化仍是后续无障碍工作。
- **按当前决定暂缓：** P1-1 的正式发布、P2-2 尾斜杠主机行为、P2-7 头像性能量化，以及 P3 项。当前提交只进入本地 Git 历史，不推送、不部署。

## 1. Findings

没有发现 P0。共发现 **3 个 P1、7 个 P2、3 个 P3**。

### P1-1：线上站点仍是旧版，新版核心路由全部不可用

- **严重程度：** P1
- **文件与行号：** `.github/workflows/pages.yml:3-7`、`src/pages/research/index.astro:1`
- **页面或视口：** 线上全站，所有视口。
- **观察证据：**
  - 当前线上首页 `https://zheyesong.github.io/` 仍是旧 Vite 版本，导航为 About、Blog、Reading Notes。
  - 线上 `/research/`、`/writing/`、`/cv/` 均返回 404。
  - 工作区处于大规模未提交迁移状态：约 30 个跟踪文件发生变化，并有大量未跟踪的 Astro 页面、内容、资源和 PDF。
  - GitHub Pages 工作流仅在 `main` 分支 push 时触发。
- **影响：** 导师、潜在合作者和招生委员会目前看不到本次审查覆盖的 Research、Writing 和 CV 页面。若迁移文件遗漏或拆分提交，可能部署出不完整站点。
- **推荐修复：** 先处理其余 P1/P2 和内容确认，再把 Astro 迁移作为完整变更集提交；在 Node 22 干净环境重新安装、检查、构建和预览，然后一次性部署并执行线上冒烟测试。
- **需要本人确认内容：** 是。确认新版是否已准备替换当前公开网站，以及旧版研究方向是否仍需保留。

### P1-2：SRH 项目的公开代码链接失效

- **严重程度：** P1
- **文件与行号：** `src/data/profile.json:48-55`、`src/data/profile.json:119-134`
- **页面或视口：** Home、Research、CV，全部视口。
- **观察证据：** `https://github.com/zheyesong/SRH-ML-SV` 经页面请求和 GitHub API 验证均返回 404。同一配置使链接同时出现在精选工作、Research 项目和 CV 中；另两个项目仓库正常公开。
- **影响：** “View Code” 直接进入 404，会削弱项目的可复现性和学术可信度。
- **推荐修复：** 确认仓库是否改名、私有或尚未发布；更新为真实公开地址，或暂时移除代码按钮并准确描述可用状态。
- **需要本人确认内容：** 是。

### P1-3：CV PDF 与网站不是同一事实来源，且生成脚本当前无法运行

- **严重程度：** P1
- **文件与行号：** `README.md:68-78`、`scripts/build-cv-pdf.py:48`、`scripts/build-cv-pdf.py:96-106`、`src/pages/cv/index.astro:61-79`
- **页面或视口：** CV 页面和下载后的 PDF。
- **观察证据：**
  - README 声称 HTML 与 PDF 使用相同 profile 数据，但脚本把 `education` 数组当作对象读取，实际触发 `TypeError: list indices must be integers`。
  - 脚本只输出 `selectedWork`，HTML CV 使用的研究项目和奖项路径不同。
  - `public/Zheye-Song-CV.pdf` 是 2026-07-05 由 pdfTeX/LaTeX 生成，不可能是当前 ReportLab 脚本的产物。
  - PDF 含网站数据源中没有的手机号和更强的成果表述。
  - PDF 未标记，Title/Author 元数据为空。
  - PDF 为一页 Letter；浏览器下载和视觉渲染正常，没有裁切。
- **影响：** 更新网站不会可靠更新 PDF；正式申请材料可能出现相互矛盾的信息，且 PDF 的屏幕阅读器体验较差。
- **推荐修复：** 明确唯一的 CV 生成链路——修复当前生成器或正式采用 LaTeX；让 HTML/PDF 读取同一份结构化数据，并加入生成测试和内容差异检查。
- **需要本人确认内容：** 是。确认手机号是否公开，以及项目贡献和成果措辞是否准确。

### P2-1：Writing 日期会随构建时区改变一天

- **严重程度：** P2
- **文件与行号：** `src/content/writing/research-directions-map.md:4`、`src/content.config.ts:22`、`src/pages/writing/index.astro:52-57`、`src/pages/writing/[id].astro:38-43`
- **页面或视口：** Writing 列表与文章页，所有视口。
- **观察证据：** 源日期是 `2026-07-24`；在 America/New_York 时区的本地构建中显示为 **JUL 23, 2026**。CI 的 UTC 构建可能显示 7 月 24 日。
- **影响：** 同一提交在不同环境生成不同的学术文章日期。
- **推荐修复：** 将其作为纯日期字符串处理，或显式使用 UTC 格式化。
- **需要本人确认内容：** 否。

### P2-2：无尾斜杠路径在本地静态预览中返回 404

- **严重程度：** P2
- **文件与行号：** `astro.config.mjs:7`
- **页面或视口：** `/research`、`/writing`、`/cv` 和文章无斜杠地址。
- **观察证据：** 带 `/` 的内部链接均为 200；同一路由不带 `/` 时，Astro 静态预览返回 404。
- **影响：** 手动输入、外部引用或旧链接若省略尾斜杠，可能失效。新版尚未部署，因此 GitHub Pages 的最终规范化行为仍未验证。
- **推荐修复：** 部署前同时测试两种 URL；必要时增加明确重定向或主机侧规范化。
- **需要本人确认内容：** 否。

### P2-3：CI 没有运行类型、内容和链接检查

- **严重程度：** P2
- **文件与行号：** `.github/workflows/pages.yml:31-34`、`package.json:6-11`
- **页面或视口：** 部署流程。
- **观察证据：** CI 只执行 `npm ci` 和 `npm run build`；没有运行 `npm run check`、lint、测试、内部链接或外部链接检查。
- **影响：** 失效仓库链接、内容一致性问题和部分类型问题可以通过部署流程。
- **推荐修复：** 至少把 `npm run check` 和静态内部链接检查加入 CI；外部链接使用可容忍临时网络故障的定期任务。
- **需要本人确认内容：** 否。

### P2-4：内容模型不足以阻止误发布和无效事实

- **严重程度：** P2
- **文件与行号：** `src/content.config.ts:25`、`src/data/profile.json:1`
- **页面或视口：** Research、Writing、CV。
- **观察证据：** `draft` 缺省值为 `false`，忘记填写会直接发布；profile JSON 没有对 URL、项目状态和日期关系进行显式校验，因此 SRH 404 未造成构建失败。
- **影响：** 草稿、过期状态和格式错误较容易上线。
- **推荐修复：** 将 draft 设为必须显式声明或默认 `true`；为 profile 增加 Zod 校验、状态枚举和 URL 格式检查。
- **需要本人确认内容：** 否。

### P2-5：头像资源生成文档与实际实现不一致

- **严重程度：** P2
- **文件与行号：** `README.md:108-114`、`src/scripts/kinetic-head-geometry.ts:4-5`、`src/scripts/kinetic-head-choreography.ts:1`、`scripts/build-kinetic-head.mjs:4`
- **页面或视口：** 维护工具链；头像设计本身不在重新设计范围内。
- **观察证据：** README 描述 34 层、13 秒多阶段动画；当前实现是 63 层、约 7 秒完整旋转。构建脚本直接导入 `sharp`，但 `sharp` 只是 Astro 的传递依赖，未在项目中直接声明。
- **影响：** 后续维护者无法可靠复现冻结资产；依赖树变化可能使脚本突然失效。
- **推荐修复：** 只校正文档和依赖声明，记录输入、输出和再生成步骤，不改变头像视觉设计。
- **需要本人确认内容：** 否。

### P2-6：CV 标题层级和 PDF 无障碍元数据不足

- **严重程度：** P2
- **文件与行号：** `src/pages/cv/index.astro:32-45`、`src/pages/cv/index.astro:66-79`
- **页面或视口：** CV，桌面和移动端。
- **观察证据：** “Education”和具体教育经历都使用 `h2`；“Honors”和每条奖项也都使用 `h2`。PDF 为 `Tagged: no`，且 Title/Author 为空。
- **影响：** 屏幕阅读器中的文档大纲过于扁平，PDF 内容较难导航和识别。
- **推荐修复：** 条目标题改为 `h3`；重新生成带标题、作者、语言、阅读顺序和标签的 PDF。
- **需要本人确认内容：** 否。

### P2-7：首页头像资源存在移动端成本风险

- **严重程度：** P2
- **文件与行号：** `src/components/KineticHead.astro:23-38`、`src/scripts/kinetic-head.ts:25-27`、`src/scripts/kinetic-head.ts:149-150`、`astro.config.mjs:8-11`
- **页面或视口：** Home，尤其移动网络。
- **观察证据：**
  - 构建警告头像 JS chunk 为 602,624 B，gzip 约 151 KB。
  - GLB 为约 1.53 MB、纹理约 426 KB、静态备用图约 270 KB；延迟初始化后的总负载约 2.37 MB。
  - 头像脚本只出现在 Home，并延迟动态加载。
  - 实现限制为 30fps 和 DPR 1.5。
- **影响：** 慢速移动网络的数据量、解码时间和 GPU/CPU 使用风险尚未量化。
- **推荐修复：** 保持现有设计；先用真实移动设备和限速 Lighthouse/性能录制获取证据，再考虑 GLB/纹理压缩、按交互加载或 chunk 拆分。
- **需要本人确认内容：** 否。

### P3-1：Writing 文章缺少文章级 SEO 元数据

- **严重程度：** P3
- **文件与行号：** `src/layouts/BaseLayout.astro:53-63`、`src/pages/writing/[id].astro:77`
- **页面或视口：** Writing article。
- **观察证据：** 全站已有独立 title/description、canonical、Open Graph、favicon 和 Person JSON-LD；但文章仍使用 `og:type=website`，没有 Article JSON-LD 或发布时间字段。
- **影响：** 搜索引擎对文章类型、作者和发布日期的理解不够明确。
- **推荐修复：** 给文章页补充 Article 元数据；为旧跳转页确定长期 `noindex` 或正式重定向策略。
- **需要本人确认内容：** 否。

### P3-2：存在已弃用目录、未引用模型和历史审查文件

- **严重程度：** P3
- **文件与行号：** `design-qa.md:26`、`design-qa.md:51`、`src/styles/global.css:541-603`、`public/blog.html:5-7`
- **页面或视口：** 构建产物与维护仓库。
- **观察证据：**
  - `public/assets/models/lee-perry-smith.glb` 约 405 KB，被复制到部署产物但无代码引用。
  - `content/blog`、`content/reading` 是旧结构空目录。
  - `design-qa.md` 仍宣称两个代码仓库已验证正常，其中一个现在返回 404，并引用临时截图路径。
  - 约 2,114 行全局 CSS 中保留部分旧列表选择器。
- **影响：** 增加部署体积和维护者判断成本；历史“已通过”报告容易被误认为当前事实。
- **推荐修复：** 等迁移稳定并建立引用清单后再归档或清理；不要在修复主问题前删除。
- **需要本人确认内容：** 是。确认哪些旧页面仍需兼容。

### P3-3：Writing 筛选按钮触控目标偏小

- **严重程度：** P3
- **文件与行号：** `src/styles/global.css:1053-1068`
- **页面或视口：** Writing，390×844 和 320 px。
- **观察证据：** 浏览器测得 “All” 约 20×22 px，“Research note” 约 91×22 px；按钮可聚焦、焦点可见，点击与 `aria-pressed` 均正常。
- **影响：** 手指触控容错较低；按钮间距可能满足 WCAG 2.5.8 的间距例外，因此不定性为明确违规。
- **推荐修复：** 后续通过内边距把交互高度提高到至少 24 px，理想为约 44 px。
- **需要本人确认内容：** 否。

## 2. Content requiring confirmation

以下内容无法仅靠源码或公开资料确认，修改前需要本人核对：

- Fudan 当前身份、B.S. 是否已正式授予、87/100 分数及各教育阶段时间。
- `Under Review`、`Ongoing`、`Present` 在 2026-08-20 是否仍准确；如为投稿，需确认题目、状态和是否允许公开写出。
- SRH 仓库是否私有、改名或尚未创建。
- Zhiheng Zhang 的 SUFE 身份和 Kun Tang 的清华身份可由官方页面支持：
  - [SUFE faculty profile](https://ssds.sufe.edu.cn/ssds_en/03/94/c20066a263060/page.htm)
  - [Tsinghua faculty profile](https://vsph.tsinghua.edu.cn/en/info/1005/1874.htm)
- Jiaxi Yang 的 “Alumni Researcher, Columbia University” 和 Qiaoyu Liang 的 Toronto 身份未找到足够权威的公开依据。
- PDF 中的手机号是否应公开。
- “Proved”“Validated”“calibrated coverage”等技术表述是否与实际研究结果严格一致。
- PDF 提到的 ICML 2026 工作及本人贡献关系。公开项目中该论文列出的作者不含 Zheye Song，因此应避免让读者误解为论文作者，除非能清楚说明扩展工作和贡献边界：[ICML 2026 program/downloads](https://icml.cc/Downloads/2026)。
- 旧站强调 Random Matrix Theory；新版移除它并加入 policy learning / complex-data inference。需要确认这是有意更新。
- 奖项的正式名称、授予年份和表述。

## 3. Functional test matrix

| 步骤 | 页面/流程 | 桌面 1280×720 / 1440×900 | 390×844 / 320 px | 实测结果 |
|---:|---|---|---|---|
| 1 | Home、导航、头像 | 通过 | 通过 | 无横向滚动；头像静态图可见；旋转期间 canvas 可见，约 7 秒后恢复；无控制台错误 |
| 2 | Research、首页锚点 | 通过 | 通过 | `/research/#causal-inference` 正确定位；当前导航状态正确 |
| 3 | Writing、分类筛选 | 通过 | 通过 | `aria-pressed` 与内容数量正确；发现日期少一天 |
| 4 | Writing article、目录 | 通过 | 通过 | 3 个目录锚点均可跳转；当前只有一篇公开文章，前后篇多文章分支未能实测 |
| 5 | CV、PDF 下载 | 通过 | 通过 | 下载触发，HTTP 200、`application/pdf`、无视觉裁切；内容生成管线存在 P1 |
| 6 | 404、返回首页 | 通过 | 通过 | 返回真实 HTTP 404；Return home 正常 |
| 7 | robots、sitemap | HTTP 200 | 不适用 | 内容和 URL 正确；内置浏览器打开纯文本时被客户端拦截，但 HTTP 内容已验证 |
| 8 | 旧链接、历史导航 | 通过 | 通过 | `about.html`、`blog.html`、`blog-read.html`、`reading.html`、`reading-read.html` 均跳转；前进、后退、刷新正常 |
| 9 | 无 JS 核心内容 | 部分通过 | 部分通过 | 原始 HTML 含姓名、研究、文章和标题；浏览器工具无法真正禁用 JS，视觉退化未完全验证 |
| 10 | 键盘、缩放、减弱动画 | 部分通过 | 部分通过 | Skip link、原生按钮和焦点样式通过；工具不能可靠模拟 200% 缩放和系统 reduced-motion，源码降级逻辑存在 |

补充结果：

- 所有 320 px 页面均满足 `scrollWidth = 320`。
- 没有发现文本、导航、头像、艺术品或页脚重叠。
- 应用页面没有失败图片、字体加载失败或意外网络 404。
- 浏览器前进、后退、刷新不会破坏导航状态。
- Writing 筛选刷新后安全恢复到 All。
- 头像点击后不会消失，动画结束后恢复静态图。
- `prefers-reduced-motion` 的源码分支存在，但未完成操作系统级真实模拟。

## 4. Build and validation results

### 4.1 项目基线

- **框架：** Astro 7.0.9，静态输出。
- **语言与类型检查：** TypeScript 6.0.3，严格模式。
- **内容系统：** Astro Content Collections。
- **主要前端依赖：** Three.js 0.185.1、Lucide、Fontsource Inter/Cormorant、Astro sitemap。
- **个人资料及项目数据：** `src/data/profile.json`，经 `src/data/site.ts` 导入。
- **Research/Writing 内容：** `src/content/`，schema 位于 `src/content.config.ts`。
- **页面路由：** Home、Research、Writing、Writing article、CV、404、robots；sitemap 自动生成。
- **部署：** `.github/workflows/pages.yml`，GitHub Pages，Node 22。
- **本地审查环境：** Node 25.8.1、npm 11.11.0。

### 4.2 目录与资源观察

- 公共资源包含字体、图片、PDF、纹理和 GLB 模型。
- 最大的公共资源：
  - `public/assets/models/kinetic-head.glb`：1,525,500 B。
  - `public/assets/kinetic-head-texture.png`：426,099 B。
  - `public/assets/models/lee-perry-smith.glb`：404,976 B，未发现引用。
  - 头像主 PNG：约 270 KB。
  - Open Graph 图片：约 244 KB。
  - favicon PNG：约 131 KB，尺寸 512×512。
  - CV PDF：约 81 KB。
- Home 才会加载头像运行时代码；Research、Writing 和 CV 不加载该模块。
- `content/blog/.gitkeep` 和 `content/reading/.gitkeep` 属于旧内容结构。
- `.DS_Store`、`dist`、`.astro` 和 `node_modules` 均被忽略；未发现生成文件混入当前源码目录。
- 当前 Git 修改包含旧 Vite 实现删除和新 Astro 实现新增，迁移与其他未提交内容混杂。

### 4.3 命令结果

| 命令 | 结果 |
|---|---|
| `npm run check` | 成功：23 files，0 errors，0 warnings，0 hints |
| `npm run build` | 成功：生成 6 个 HTML 页面路由、robots 和 sitemap |
| `git diff --check` | 成功，无空白错误 |
| 静态内部链接检查 | 扫描 11 个 HTML 文件，未发现缺失目标 |
| 本地静态 HTTP 检查 | 预期页面、PDF、robots、sitemap 均为 200；404 页面为 404 |
| `npm ls --depth=0` | 成功，但有来自依赖树的 extraneous 可选 WASM 包 |
| lint/test | 项目没有提供相应命令 |

Astro 构建生成：

- `/`
- `/research/`
- `/writing/`
- `/writing/research-directions-map/`
- `/cv/`
- `/404.html`
- `/robots.txt`
- sitemap index

构建唯一显著警告是头像 JS chunk 超过 600 KB：`dist/_astro/kinetic-head.B1EzPaWY.js` 为 602,624 B，gzip 约 151 KB。没有发现缺失构建资源。

### 4.4 只读完整性确认

审查前后以下文件的 SHA-256 完全相同：

- `package.json`
- `package-lock.json`
- `astro.config.mjs`
- `tsconfig.json`
- `README.md`
- `src/data/profile.json`

审查结束时 Git 状态与初始状态相同；本地预览服务已停止。本报告创建前未修改、删除或升级任何项目内容。

## 5. Maintainability assessment

| 项目 | 当前做法 | 潜在后果 | 推荐的低风险改进 | 是否必须现在处理 |
|---|---|---|---|---|
| 个人资料 | 多数页面读取 profile JSON；文章、Research 引言和 PDF 仍有独立事实 | 页面与 PDF 漂移 | 建立明确的事实来源边界 | PDF 部分必须 |
| Research | 兴趣使用 collection，项目使用 profile JSON | 新增尚算简单，但状态无枚举 | 校验状态、日期和 URL | 近期 |
| Writing | 自动生成目录、分类、标签、字数、阅读时间和前后篇 | 日期时区错误；draft 默认公开 | 日期确定化，draft 默认安全 | 必须 |
| CV | HTML 数据化；PDF 生成器已失效 | 无法安全替换或重建 PDF | 统一生成链路并加差异检查 | 必须 |
| 导航 | 集中配置 | 风险低 | 保持现状 | 否 |
| 样式 | 单个约 2,114 行全局 CSS | 旧选择器和跨页影响难追踪 | 迁移稳定后按页面边界清理 | 延后 |
| 头像资产 | 有生成脚本和运行时隔离 | 文档失真、依赖隐式 | 校正文档，直接声明构建依赖 | 近期 |
| 部署 | GitHub Pages 自动构建 | 不运行 check/link test；迁移未提交 | 加 CI 门禁，整体提交 | 必须 |
| README | 覆盖安装、文章、CV 的基本操作 | CV 和头像说明不再真实，未明确 Node 版本 | 与真实流程同步 | 近期 |
| 缺失字段 | Collection 部分字段有 schema | profile 无运行时校验，draft 易误发布 | Zod 校验和内容不变量测试 | 近期 |
| CV 替换 | README 提供命令，但脚本已失效 | 非专业维护者可能生成错误或旧 PDF | 明确唯一命令、前置条件和验证步骤 | 必须 |
| 资产命名 | 资源按类型分布在 public/assets | 旧模型和生成输出用途不清 | 增加简短资源清单和生成来源说明 | 近期 |

## 6. Recommended implementation order

1. 本人确认新版上线意图、SRH 链接、项目状态、导师关系、手机号和成果措辞。
2. 修复 SRH 链接、Writing 日期和 CV 唯一生成链路。
3. 修正 CV 标题层级和 PDF 标签/元数据。
4. 加强 profile/content schema、draft 安全默认值和 CI 检查。
5. 校正文档、Node 版本和头像构建依赖。
6. 在不改变头像设计的前提下做真实移动端性能测量。
7. 清理迁移边界并完整提交；在 Node 22 干净环境构建后部署。
8. 部署后实测生产域名、无尾斜杠、404、缓存、robots、sitemap 和全部外链。

## 7. Residual risks

- 未运行 Lighthouse，因此没有提供或推测任何分数。
- 未在真实 iOS/Android、Safari、Firefox 或慢速移动网络上测试。
- 浏览器工具不能可靠禁用 JavaScript、模拟 200% 缩放或系统 reduced-motion。
- 只有一篇公开文章，无法实测多文章前后篇导航。
- 新版尚未部署，GitHub Pages 对尾斜杠、缓存和 404 的最终行为仍需上线验证。
- 没有在全新 Node 22 环境执行 `npm ci`，因此尚未完全复刻 CI。
- 外部公开资料无法证明所有个人经历、贡献和项目状态。
- `robots.txt` 和 sitemap 已通过 HTTP 验证，但内置浏览器对纯文本路由的可视检查受客户端拦截。
- 原始 HTML 证明无 JavaScript 时核心文本存在，但没有完成真实禁用 JavaScript 后的视觉测试。

## 必须立即修复

- 新旧站点和未提交迁移的部署风险。
- SRH GitHub 404。
- CV PDF 的断裂生成链路与内容不一致。
- Writing 日期时区错误。
- 个人身份、项目状态、贡献和手机号确认。

## 建议近期修复

- CI 增加 `check`、内部链接和内容不变量验证。
- profile schema、状态枚举和安全 draft 默认值。
- 无尾斜杠路径策略。
- CV 标题层级及可访问 PDF。
- README、Node 版本和 `sharp` 直接依赖。
- 头像移动端性能测量及 favicon 优化。

## 可以延后处理

- Article 结构化数据和旧跳转页索引策略。
- 未引用模型、旧空目录、历史 `design-qa.md` 和未使用 CSS。
- Writing 筛选按钮触控尺寸。
- 任何纯视觉层面的头像调整。

## Appendix A：浏览器与 PDF 证据

审查截图存储在临时证据目录 `/tmp/zheye-site-audit/`；该目录不属于仓库，系统清理后可能失效。

| 证据 | 路径 |
|---|---|
| Home 1440×900 | `/tmp/zheye-site-audit/03-home-1440x900.png` |
| 头像旋转运行状态 | `/tmp/zheye-site-audit/02-home-avatar-running.png` |
| Research 390×844 | `/tmp/zheye-site-audit/10-research-390x844.png` |
| Writing 390×844，包含日期偏移 | `/tmp/zheye-site-audit/11-writing-390x844.png` |
| Writing article 390×844 | `/tmp/zheye-site-audit/12b-writing-article-390x844.png` |
| CV 390×844 | `/tmp/zheye-site-audit/13b-cv-390x844.png` |
| 404 390×844 | `/tmp/zheye-site-audit/14b-404-390x844.png` |
| PDF CV 渲染 | `/tmp/zheye-audit-pdf.Ik8g7p/cv-1.png` |

## Appendix B：复现检查清单

在不升级依赖的前提下，建议从项目根目录依次运行：

```bash
git status --short
npm run check
npm run build
git diff --check
npm run preview
```

随后在真实浏览器中检查：

- `http://localhost:<preview-port>/`
- `http://localhost:<preview-port>/research/`
- `http://localhost:<preview-port>/writing/`
- `http://localhost:<preview-port>/writing/research-directions-map/`
- `http://localhost:<preview-port>/cv/`
- `http://localhost:<preview-port>/404.html`
- `http://localhost:<preview-port>/robots.txt`
- `http://localhost:<preview-port>/sitemap-index.xml`

每次修复后至少重新验证：桌面 1280×720、桌面 1440×900、手机 390×844 和 320 px 宽度；同时记录控制台错误、失败网络请求、横向滚动、键盘焦点、返回/前进/刷新和头像动画恢复状态。
