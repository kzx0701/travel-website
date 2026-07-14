# 迁移至 shadcn-vue 控件库 Spec

## Why
当前项目使用 Element Plus + 自定义 Tailwind 双轨制实现控件,与原型图(基于 shadcn/ui 设计系统)在设计语言层面存在根本性差异:主色冲突(暖橙 vs zinc 近黑)、CSS 变量体系不同、圆角/字体/按钮风格分裂。为达成与原型的视觉一致性并消除双轨制技术债,需全量迁移至 shadcn-vue。

## What Changes
- **BREAKING**:移除 Element Plus 依赖(element-plus、@element-plus/icons-vue、unplugin-auto-import/unplugin-vue-components 的 ElementPlusResolver)
- 引入 shadcn-vue,组件源码放入 `src/components/ui/`
- 主题 token 体系从 `--el-*` + `--color-warm/cool/ash` 切换为 shadcn 语义 token(`--background/--foreground/--card/--primary/--muted/--border/--input/--ring/--chart-*`)
- 开启 Tailwind preflight(当前为兼容 EP 已关闭)
- 引入 Geist + DM Serif Display 字体
- 引入 lucide-vue-next 替换散落的内联 SVG 图标
- 表单验证体系从 EP FormRules 迁移到 vee-validate + zod
- 命令式 ElMessageBox.confirm → 声明式 AlertDialog
- 命令式 ElMessage → sonner toast
- el-cascader → Combobox 自实现省市区级联
- el-date-picker → shadcn DatePicker/DateRangePicker(或社区方案 @vuepic/vue-datepicker 若 shadcn 版本不足)
- el-select/el-dropdown/el-dialog/el-switch/el-radio-group/el-popover/el-drawer 等全部替换为 shadcn 对应组件
- 地图数据点色(暖橙 #FF6B35 / 冷蓝 #3B82F6 / 淡灰 #E2E8F0)保留为常量,仅用于 ECharts,不进入 UI chrome
- 可选:Tailwind v3 → v4 升级以对齐原型 @theme inline

## Impact
- Affected specs: init-travel-map-website(视觉与交互层重写,功能需求不变)
- Affected code:
  - 配置:tailwind.config.js、vite.config.ts、package.json、src/style.css、components.json(新增)
  - 全部 views(7 个)与大部分 components(business/layout/common)
  - 表单相关:LoginView、RegisterView、RecordForm、TripForm、SettingsView、PurposeSelect、ResidenceSelector
  - 命令式调用点:RecordList、TripCard、RightPanel、SettingsView 等(ElMessageBox/ElMessage)
  - 不影响:stores/、api/、composables/(纯逻辑层)、data/、utils/(除 avatar)、ECharts 地图层

## ADDED Requirements

### Requirement: shadcn-vue 基础设施
系统 SHALL 基于 shadcn-vue 初始化 UI 组件体系,组件源码存放于 `src/components/ui/`,主题 token 遵循 shadcn 语义命名(`--background/--foreground/--card/--primary/--muted/--border/--input/--ring`),开启 Tailwind preflight。

#### Scenario: 主题 token 就绪
- **WHEN** 开发者查看 src/style.css
- **THEN** 包含 shadcn 语义 token 与原型 CSS 变量一致,暖橙/冷蓝/淡灰仅作地图数据点常量保留

#### Scenario: preflight 开启
- **WHEN** Tailwind 配置加载
- **THEN** preflight 为 true,基础元素样式标准化

### Requirement: 按钮体系统一
系统 SHALL 使用 shadcn Button 组件统一所有按钮,支持 variant(default/secondary/destructive/outline/ghost/link)与 size,消除当前 4 种零散按钮实现。

#### Scenario: 按钮统一
- **WHEN** 用户查看任意页面按钮
- **THEN** 均为 Button 组件,主操作为 default(近黑底白字),次要操作为 secondary/outline,危险操作为 destructive

### Requirement: 表单与验证体系
系统 SHALL 使用 shadcn Input/Field/FieldGroup + vee-validate + zod 构建表单,替换 EP el-form/FormRules。

#### Scenario: 表单验证
- **WHEN** 用户提交表单
- **THEN** 由 zod schema 校验,错误信息通过 Field 组件展示,样式为 shadcn 风格(聚焦环近黑)

### Requirement: 对话框与确认框
系统 SHALL 使用 shadcn Dialog 替换 el-dialog,使用 AlertDialog 替换 ElMessageBox.confirm(声明式),使用 sonner toast 替换 ElMessage。

#### Scenario: 删除确认
- **WHEN** 用户触发删除
- **THEN** 弹出 AlertDialog 声明式确认,样式为 shadcn 风格

#### Scenario: 操作反馈
- **WHEN** 操作成功/失败
- **THEN** 通过 sonner toast 提示,样式简约

### Requirement: 选择器与级联
系统 SHALL 使用 shadcn Select/Combobox 替换 el-select,使用 Combobox 自实现省市区三级级联替换 el-cascader(保留 checkStrictly 行为)。

#### Scenario: 居住地级联
- **WHEN** 用户在设置页选择居住地
- **THEN** 通过 Combobox 实现省/市/区三级级联,可选任意层级

### Requirement: 日期选择
系统 SHALL 使用 shadcn DatePicker/DateRangePicker 替换 el-date-picker,支持单日期与日期范围切换。若 shadcn 版本功能不足,可采用 @vuepic/vue-datepicker 作为 Tailwind 友好的替代。

#### Scenario: 日期范围选择
- **WHEN** 用户在记录表单选择日期范围
- **THEN** 提供 DateRangePicker,样式与 shadcn 一致

### Requirement: 其他控件替换
系统 SHALL 替换以下 EP 控件为 shadcn 对应组件:
- el-dropdown → DropdownMenu
- el-popover → Popover
- el-drawer → Sheet/Drawer
- el-switch → Switch
- el-radio-group/el-radio-button → RadioGroup/ToggleGroup
- 自定义 skeleton → Skeleton 组件
- el-tabs(若有) → Tabs

#### Scenario: 控件统一
- **WHEN** 用户浏览各页面
- **THEN** 所有控件为 shadcn 风格,无 EP 默认样式残留

### Requirement: 图标与字体
系统 SHALL 引入 lucide-vue-next 替换内联 SVG 图标,引入 Geist + DM Serif Display 字体(标题用衬线)。

#### Scenario: 图标统一
- **WHEN** 开发者使用图标
- **THEN** 从 lucide-vue-next 导入,无内联 SVG 散落

#### Scenario: 字体加载
- **WHEN** 页面渲染
- **THEN** 正文用 Geist,时间线/个人主页标题用 DM Serif Display

### Requirement: EP 依赖完全移除
系统 SHALL 在迁移完成后完全移除 Element Plus 相关依赖与配置,确保零 EP 残留。

#### Scenario: 无 EP 残留
- **WHEN** 检查 package.json 与 vite.config.ts
- **THEN** 不含 element-plus、@element-plus/icons-vue、ElementPlusResolver

## MODIFIED Requirements

### Requirement: UI 与视觉(重写)
系统 SHALL 使用 shadcn-vue 作为 UI 组件体系,主题遵循原型 shadcn 设计系统:主色 zinc 近黑 #18181b、圆角 12px 基准、Geist 字体、分层细微阴影。地图数据点色(暖橙/冷蓝/淡灰)仅用于 ECharts,不进入 UI chrome。仅亮色模式。

## REMOVED Requirements

### Requirement: Element Plus 作为 UI 组件库
**Reason**: 与原型 shadcn 设计语言冲突,双轨制导致样式分裂
**Migration**: 全量替换为 shadcn-vue 对应组件,详见 ADDED Requirements
