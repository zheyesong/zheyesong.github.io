# Quiet Order / 静序

方案 A 的实现规范。设计使用编辑栅格、语义字阶与 4/8 单位间距；黄金比例不作为统一硬性常数。

## Sources of truth

- 颜色：`src/data/palette.json`。HTML 根节点、头像场景、静态导出及 OG 卡片共享此配置。
- 间距、字阶、列数、跨度与断点：`src/styles/tokens.css`。
- 页面基础与公共栏目：`base.css`、`layout.css`、`components.css`。
- 专属样式：`home.css`、`writing.css`、`cv.css`。不要在其他文件追加跨页补丁。
- 字体：`fonts.css`，自托管 Source Serif 4 400 / 600 / italic 400 和 Inter 400 / 500 / 600。

## Palette

| 用途 | 色值 |
|---|---|
| 纸面 | `#F7F5EF` |
| 正文 | `#242723` |
| 次要正文 | `#596057` |
| 链接与强调 | `#4D6254` |
| 悬停 | `#334639` |
| 分隔线 | `#D8D7CE` |
| 控件轮廓 | `#949B8F` |

分隔线不承载唯一的交互含义；正文链接保留下划线或明确上下文。所有文本颜色与纸面背景的对比度须达到 4.5:1。

## Proportions

| 屏幕 | 列数 | 列间距 | 两侧最小边距 | 首屏分栏 | 栏目分栏 | 头像宽度 |
|---|---:|---:|---:|---|---|---:|
| ≥1200px | 12 | 24px | 64px | 4:8 | 2:10 | 256px |
| 841–1199px | 8 | 24px | 32px | 3:5 | 1:7 | 208px |
| ≤840px | 4 | 16px | 20px | 上下排列 | 标签在上 | 160px |

容器上限为 1152px。列宽由可用空间减去列间距后等分，不强求每列宽度为 8 的倍数。
头像在桌面所属列内靠右，保留 16px 内边距；手机居中。头像保留 394:560 比例，无拉伸、负边距或视口专用位置修补。
主页的栏目正文与 Research/CV 的项目正文共用同一栅格轴线。

## Type

| 用途 | 桌面字号/行高 | 手机字号/行高 |
|---|---|---|
| 姓名 | 80/88px | 48/56px |
| 主标题 | 48/56px | 36/44px |
| 项目与列表标题 | 28/36px | 24/32px |
| 引言 | 24/32px | 20/28px |
| 长文 | 18/32px | 18/28px |
| 导航、日期、状态 | 14/20–24px | 14/20–24px |
| 编号、小标签 | 12/16px | 12/16px |

Source Serif 4 用于姓名、标题和正文；Inter 用于导航、元信息与操作。文章最大行宽 `68ch`。
姓名的 `-0.035em` 字距是唯一的展示字体光学校正，不作为其他标题的通用设置。
头像内部像素采样和浏览器下采样提示用于静动态一致性，不用来改变其几何轮廓。

## Spacing and components

间距令牌为 4、8、16、24、32、48、64、96px。

- 元信息内部 8px；标题与摘要 16px。
- 条目上下内边距 24px；栏目上下内边距 32px。
- 首屏与后续内容间距 64px；主要操作目标至少 48px。
- `.margin-section` 使用完整列栅格；`SectionHeading variant="margin"` 为侧标签，`.section-body` 为正文。
- 普通 `SectionHeading` 保留正常字号，避免目录标签样式污染正文标题层级。
- 手机将元信息折成可换行的行，侧栏目录移至正文前方。

## Content invariants

- 首页仅精选 distance-profile 项目；其他项目仍在 Research/CV。
- 首页不显示身份副标题、Folio 或四项重复研究小点。
- Academic Record 保留 UNC 和复旦；交换经历仅在网页隐藏。
- PDF、LaTeX、个人事实、原始头像输入和 GLB 不因视觉更新而改变。
- 旋转时长约 4.67 秒；交接 180ms；保持 reduced-motion、键盘、触控和按需加载行为。

## Regeneration and validation

颜色或渲染配方变化后：

```bash
npm run build:kinetic-rest
npm run build:og
npm run verify
```

先检查真实页面，再更新截图基线。覆盖 1440×900、1280×720、1080、840、390、320px。
200% 桌面缩放以 1280×720 物理屏幕对应的 640×360 CSS 视口和 DPR 2 验证重排；这不是浏览器工具栏缩放操作的声明。
检查字体加载、长标题、栏目对齐、菜单/筛选/目录/PDF、色彩对比、无 JS 阅读和头像首尾像素对照。
浏览器内页截图基线覆盖 Research、Writing、文章、CV 与 404 的桌面和手机首屏。

## References

- [Carbon 2x Grid](https://carbondesignsystem.com/elements/2x-grid/overview/)
- [Carbon spacing](https://carbondesignsystem.com/elements/spacing/overview/)

本站借鉴它们的尺度和节奏组织方法，采用上述针对学术阅读设计的列数和字阶。
