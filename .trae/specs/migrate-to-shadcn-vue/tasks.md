# Tasks

- [x] Task 1: shadcn-vue 基础设施初始化
  - [ ] SubTask 1.1: 运行 `npx shadcn-vue@latest init` 创建 components.json,配置路径别名与样式
  - [ ] SubTask 1.2: 将原型 CSS 变量(shadcn 语义 token)写入 src/style.css,替换 `--color-warm/cool/ash` 体系;暖橙/冷蓝/淡灰保留为地图数据点常量
  - [ ] SubTask 1.3: 开启 Tailwind preflight,移除 EP 全局样式注入配置
  - [ ] SubTask 1.4: 引入 Geist + DM Serif Display 字体(通过 @fontsource 或 CDN),配置到 tailwind fontFamily
  - [ ] SubTask 1.5: 安装 lucide-vue-next、sonner、vee-validate、zod、@vee-validate/zod、reka-ui(若 shadcn-vue 未自动装)
  - [ ] SubTask 1.6: 可选:升级 Tailwind v3 → v4,迁移 tailwind.config.js 到 CSS @theme(若不升级则手动桥接 token)

- [x] Task 2: 低风险控件迁移(Button/Skeleton/Switch/Radio/Tabs)
  - [ ] SubTask 2.1: 添加 shadcn Button/Skeleton/Switch/RadioGroup/ToggleGroup/Tabs 组件源码
  - [ ] SubTask 2.2: 替换所有自定义 `<button class="bg-warm ...">` 与 el-button 为 Button 组件(主操作 default 近黑底,次要 secondary/outline,危险 destructive)
  - [ ] SubTask 2.3: 替换 SkeletonLoader 自定义实现与散落的 animate-pulse 为 Skeleton 组件
  - [ ] SubTask 2.4: 替换 el-switch(SettingsView)为 Switch
  - [ ] SubTask 2.5: 替换 el-radio-group/el-radio-button(StatisticsView/RecordForm)为 RadioGroup/ToggleGroup
  - [ ] SubTask 2.6: 替换 AppNavbar router-link 自定义 tabs 为 Tabs(若适用)或保留 router-link + shadcn 样式

- [x] Task 3: sonner toast 替换 ElMessage
  - [ ] SubTask 3.1: 配置 sonner Toaster 挂载到 App.vue
  - [ ] SubTask 3.2: 全局搜索 ElMessage.success/error/warning 调用点,替换为 toast()/toast.error()/toast.warning()
  - [ ] SubTask 3.3: 移除 ElMessage 相关导入

- [x] Task 4: 表单与验证体系迁移
  - [ ] SubTask 4.1: 添加 shadcn Input/Textarea/Label/Field/FieldGroup 组件源码
  - [ ] SubTask 4.2: 配置 vee-validate + zod 全局插件
  - [ ] SubTask 4.3: 迁移 LoginView:el-form → Field + zod schema(邮箱格式、密码≥6位)
  - [ ] SubTask 4.4: 迁移 RegisterView:同上 + 确认密码一致校验
  - [ ] SubTask 4.5: 迁移 RecordForm:日期类型切换 + Field 表单 + zod 校验
  - [ ] SubTask 4.6: 迁移 TripForm:名称 + 日期范围 Field 表单

- [x] Task 5: Dialog 与 AlertDialog 替换
  - [ ] SubTask 5.1: 添加 shadcn Dialog/AlertDialog 组件源码
  - [ ] SubTask 5.2: 替换 el-dialog(TripForm/PurposeSelect/SettingsView)为 Dialog
  - [ ] SubTask 5.3: 将 ElMessageBox.confirm 命令式调用重构为声明式 AlertDialog,涉及:RecordList(删除记录)、TripCard(删除行程选择)、SettingsView(修改居住地/删除分类/重新生成token)、RightPanel
  - [ ] SubTask 5.4: TripCard 删除行程的"保留记录/同步删除/取消"三选一用 AlertDialog 自定义按钮实现

- [x] Task 6: Select/Combobox 替换
  - [ ] SubTask 6.1: 添加 shadcn Select/Combobox/Command 组件源码
  - [ ] SubTask 6.2: 替换 el-select(TimelineView 筛选、CityList 排序/筛选、TripSelector)为 Select 或 Combobox
  - [ ] SubTask 6.3: 迁移 PurposeSelect:el-option-group 分组 → Combobox/Select 分组 + 底部"新建分类"入口
  - [ ] SubTask 6.4: 迁移 TripSelector:同上 + "不关联行程"选项 + 新建行程入口

- [x] Task 7: Cascader 自实现(ResidenceSelector)
  - [ ] SubTask 7.1: 基于 Combobox/Command 自实现省市区三级级联,保留 checkStrictly(可选任意层级)与 emitPath 行为
  - [ ] SubTask 7.2: 替换 el-cascader,样式对齐 shadcn
  - [ ] SubTask 7.3: 验证区县数据缺失时可选到城市级

- [x] Task 8: DatePicker 替换
  - [ ] SubTask 8.1: 评估 shadcn DatePicker/DateRangePicker 功能是否满足(单日期/范围/快捷选项),不满足则引入 @vuepic/vue-datepicker
  - [ ] SubTask 8.2: 替换 StatisticsView 时间筛选 el-date-picker
  - [ ] SubTask 8.3: 替换 TimelineView 时间筛选 el-date-picker
  - [ ] SubTask 8.4: 替换 RecordForm 日期单/范围切换(保留 radio 切换 + 对应 picker)
  - [ ] SubTask 8.5: 替换 TripForm 日期范围
  - [ ] SubTask 8.6: 替换 CityList 筛选时间 el-date-picker

- [x] Task 9: Dropdown/Popover/Sheet 替换
  - [ ] SubTask 9.1: 添加 shadcn DropdownMenu/Popover/Sheet 组件源码
  - [ ] SubTask 9.2: 替换 AppNavbar el-dropdown(用户菜单)为 DropdownMenu
  - [ ] SubTask 9.3: 替换 CityList el-popover(筛选面板)为 Popover
  - [ ] SubTask 9.4: 替换 MapLayout el-drawer(移动端抽屉)为 Sheet

- [x] Task 10: 图标统一为 lucide-vue-next
  - [ ] SubTask 10.1: 全局搜索内联 SVG 图标,逐个替换为 lucide-vue-next 对应图标
  - [ ] SubTask 10.2: 统一图标尺寸与颜色用法(size prop + class)

- [x] Task 11: EP 依赖完全移除
  - [ ] SubTask 11.1: 全局搜索确认无 el-* 组件、ElMessage、ElMessageBox 残留
  - [ ] SubTask 11.2: npm uninstall element-plus @element-plus/icons-vue
  - [ ] SubTask 11.3: 移除 vite.config.ts 中 unplugin-auto-import/unplugin-vue-components 的 ElementPlusResolver 与相关 auto-import 配置(若 shadcn-vue 不需要)
  - [ ] SubTask 11.4: 移除 auto-imports.d.ts / components.d.ts 中 EP 相关声明(若存在)
  - [ ] SubTask 11.5: 清理 tailwind.config.js 中为 EP 兼容的配置(如 preflight: false)

- [x] Task 12: 视觉走查与回归测试
  - [ ] SubTask 12.1: 对比原型 9 个页面,逐页视觉走查(主色/圆角/字体/按钮/卡片/留白)
  - [ ] SubTask 12.2: 功能回归:登录注册/地图下钻/点亮/记录CRUD/行程/居住地/统计/时间线/设置/个人主页/公开主页
  - [ ] SubTask 12.3: 修复走查发现的样式不一致
  - [ ] SubTask 12.4: npm run build + npm run lint 确认通过

# Task Dependencies
- Task 1 是所有后续任务的前置
- Task 2/3 可并行(无相互依赖)
- Task 4 依赖 Task 1
- Task 5 依赖 Task 1(AlertDialog 替换 ElMessageBox 与 sonner 无依赖)
- Task 6/7/8 依赖 Task 1,三者可并行
- Task 9 依赖 Task 1
- Task 10 可与 Task 2-9 并行
- Task 11 必须在 Task 2-10 全部完成后执行
- Task 12 必须在 Task 11 完成后执行
