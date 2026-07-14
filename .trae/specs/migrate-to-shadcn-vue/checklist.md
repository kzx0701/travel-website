# Checklist

## shadcn-vue 基础设施
- [x] components.json 配置完成,组件源码存于 src/components/ui/
- [x] src/style.css 包含 shadcn 语义 token(--background/--foreground/--card/--primary/--muted/--border/--input/--ring),与原型一致
- [x] 暖橙 #FF6B35 / 冷蓝 #3B82F6 / 淡灰 #E2E8F0 仅作地图数据点常量保留,不进入 UI chrome
- [x] Tailwind preflight 开启
- [x] Geist + DM Serif Display 字体引入并配置到 fontFamily
- [x] lucide-vue-next、sonner、vee-validate、zod、@vee-validate/zod 安装完成
- [x] (可选)Tailwind v4 升级完成或 token 桥接完成

## 按钮体系统一
- [x] 所有按钮均为 shadcn Button 组件
- [x] 主操作为 default variant(近黑底白字)
- [x] 次要操作为 secondary/outline
- [x] 危险操作为 destructive
- [x] 无 `bg-warm` 自定义按钮或 el-button 残留

## 表单与验证
- [x] shadcn Input/Label/Field/FieldGroup 组件就绪
- [x] vee-validate + zod 全局配置完成
- [x] LoginView 表单迁移完成(邮箱格式 + 密码≥6位)
- [x] RegisterView 表单迁移完成(+ 确认密码一致)
- [x] RecordForm 表单迁移完成(日期类型切换 + Field)
- [x] TripForm 表单迁移完成
- [x] 聚焦环为近黑色,无 EP 蓝色聚焦
- [x] 无 el-form/el-form-item/FormRules 残留

## Dialog 与确认框
- [x] shadcn Dialog/AlertDialog 组件就绪
- [x] el-dialog 全部替换为 Dialog(TripForm/PurposeSelect/SettingsView)
- [x] ElMessageBox.confirm 全部重构为声明式 AlertDialog
- [x] RecordList 删除记录用 AlertDialog
- [x] TripCard 删除行程三选一(保留/同步删除/取消)用 AlertDialog 自定义按钮
- [x] SettingsView 修改居住地/删除分类/重新生成 token 用 AlertDialog
- [x] RightPanel 删除确认用 AlertDialog
- [x] 无 ElMessageBox 残留

## sonner toast
- [x] Toaster 挂载到 App.vue
- [x] ElMessage 全部替换为 sonner toast
- [x] 无 ElMessage 残留

## Select/Combobox
- [x] shadcn Select/Combobox/Command 组件就绪
- [x] TimelineView 筛选用 Select/Combobox
- [x] CityList 排序与筛选用 Select/Combobox
- [x] PurposeSelect 分组 + 新建分类入口迁移完成
- [x] TripSelector 不关联 + 新建行程入口迁移完成
- [x] 无 el-select/el-option/el-option-group 残留

## Cascader 自实现
- [x] 省市区三级级联基于 Combobox/Command 实现
- [x] 保留 checkStrictly(可选任意层级)
- [x] 区县数据缺失时可选到城市级
- [x] 样式对齐 shadcn
- [x] 无 el-cascader 残留

## DatePicker
- [x] 日期选择组件就绪(shadcn DatePicker 或 @vuepic/vue-datepicker)
- [x] 支持单日期与日期范围
- [x] StatisticsView 时间筛选迁移完成
- [x] TimelineView 时间筛选迁移完成
- [x] RecordForm 日期单/范围切换迁移完成
- [x] TripForm 日期范围迁移完成
- [x] CityList 筛选时间迁移完成
- [x] 无 el-date-picker 残留

## Dropdown/Popover/Sheet
- [x] shadcn DropdownMenu/Popover/Sheet 组件就绪
- [x] AppNavbar 用户菜单用 DropdownMenu
- [x] CityList 筛选面板用 Popover
- [x] MapLayout 移动端抽屉用 Sheet
- [x] 无 el-dropdown/el-popover/el-drawer 残留

## 其他控件
- [x] el-switch → Switch(SettingsView)
- [x] el-radio-group/el-radio-button → RadioGroup/ToggleGroup(StatisticsView/RecordForm)
- [x] SkeletonLoader 与散落 animate-pulse → Skeleton 组件

## 图标与字体
- [x] 所有内联 SVG 替换为 lucide-vue-next
- [x] 图标尺寸颜色统一(size prop + class)
- [x] 正文用 Geist 字体
- [x] 时间线/个人主页标题用 DM Serif Display

## EP 依赖移除
- [x] 全局无 el-* 组件残留
- [x] 全局无 ElMessage/ElMessageBox 残留
- [x] package.json 不含 element-plus、@element-plus/icons-vue
- [x] vite.config.ts 不含 ElementPlusResolver
- [x] tailwind.config.js 无为 EP 兼容的配置(如 preflight: false)
- [x] auto-imports.d.ts/components.d.ts 无 EP 声明(或文件已移除)

## 视觉与回归
- [x] 9 个原型页面逐页视觉走查通过(主色 zinc 近黑/圆角 12px/字体/按钮/卡片/留白)
- [x] 登录注册功能正常
- [x] 地图三级下钻与点亮正常
- [x] 到达记录 CRUD 正常
- [x] 多城市行程关联正常
- [x] 居住地设置正常
- [x] 统计页(饼图+缩略图+时间筛选)正常
- [x] 时间线页(分组+筛选)正常
- [x] 设置页三分区正常
- [x] 个人主页正常
- [x] 公开主页 /p/:token 匿名访问正常
- [x] npm run build 通过
- [x] npm run lint 通过
