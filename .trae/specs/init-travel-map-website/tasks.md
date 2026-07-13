# Tasks

- [x] Task 1: 项目初始化与脚手架搭建
  - [x] SubTask 1.1: 使用 Vite 创建 Vue3 + TypeScript 项目
  - [x] SubTask 1.2: 集成 Pinia、Vue Router、Element Plus、TailwindCSS、ECharts、@supabase/supabase-js 等依赖
  - [x] SubTask 1.3: 配置项目目录结构（components/common、components/business、views、stores、api、composables、utils、data、types 等），落实组件化分层规范
  - [x] SubTask 1.4: 配置 ESLint + Prettier 代码规范（含 Vue 单文件行数/复杂度建议规则）

- [x] Task 2: Supabase 后端集成与数据模型
  - [ ] SubTask 2.1: 创建 Supabase 项目并配置环境变量（VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY），关闭强制邮箱确认
  - [ ] SubTask 2.2: 设计并创建数据库表结构：
    - profiles（用户扩展信息）
    - residences（居住地，区县级，user_id + city_code + district_code）
    - visit_records（到达记录，user_id + city_code + start_date + end_date + purpose + note + trip_id?）
    - trips（行程，user_id + name + start_date + end_date?）
    - purpose_categories（出行目的分类，含预设系统类 + 用户自定义类，user_id 可空表示系统类）
    - profile_settings（个人主页可见性等设置）
  - [ ] SubTask 2.3: 配置 RLS 策略，确保用户只能访问自己的 residences / visit_records / trips / 自定义 purpose_categories / profile_settings；系统预设 purpose_categories 全局可读
  - [ ] SubTask 2.4: 封装 Supabase 客户端 SDK 模块与各表的 api 仓库层（api/residence.ts、api/visitRecord.ts、api/trip.ts、api/purpose.ts）

- [x] Task 3: 用户认证模块
  - [ ] SubTask 3.1: 实现注册页面（邮箱 + 密码，含表单校验，注册后可直接登录）
  - [ ] SubTask 3.2: 实现登录页面（邮箱 + 密码，含错误提示）
  - [ ] SubTask 3.3: 创建 auth store 管理登录态与当前用户信息
  - [ ] SubTask 3.4: 实现路由守卫拦截未登录访问
  - [ ] SubTask 3.5: 实现退出登录功能

- [x] Task 4: 中国城市数据集与三级地图组件
  - [ ] SubTask 4.1: 整理中国城市数据集 JSON（含港澳台，覆盖省/市/区县层级 + 经纬度 + 拼音），打包到项目 data 目录
  - [ ] SubTask 4.2: 引入 ECharts 与全国/省/市三级 GeoJSON 数据（离线打包）
  - [ ] SubTask 4.3: 实现 BaseMap 基础地图组件（统一渲染 API，支持传入地图层级与区域编码）
  - [ ] SubTask 4.4: 实现三级下钻逻辑（全国→省→市）与平滑过渡动画，避免突兀闪烁
  - [ ] SubTask 4.5: 实现层级面包屑组件（中国 / XX省 / XX市，可点击回上级）
  - [ ] SubTask 4.6: 实现全国图省份色块汇总（按已点亮城市数/比例加深）+ 已点亮城市点位
  - [ ] SubTask 4.7: 实现省级图城市点位渲染与点击交互
  - [ ] SubTask 4.8: 实现市级图区县边界展示（纯查看，不可点亮）
  - [ ] SubTask 4.9: 实现已点亮 / 未点亮 / 居住地三种样式区分
  - [ ] SubTask 4.10: 实现按到达次数的点亮强度分级（颜色深浅）

- [x] Task 5: 城市搜索组件
  - [ ] SubTask 5.1: 实现通用城市搜索组件（输入防抖 + 名称/拼音模糊匹配 + 结果展示城市名+省份）
  - [ ] SubTask 5.2: 实现搜索结果点击后下钻到该城市市级地图并展开右侧城市详情

- [x] Task 6: 地图页核心布局
  - [ ] SubTask 6.1: 实现 MapPage 布局骨架（顶栏 + 左信息区 + 中地图 + 右信息区，桌面优先）
  - [ ] SubTask 6.2: 实现顶部导航栏组件（页面切换：地图/统计/时间线/个人主页/设置 + 用户信息：头像/邮箱/居住地/退出登录）
  - [ ] SubTask 6.3: 实现左侧信息区（城市搜索 + 已点亮城市列表 + 快捷统计卡片）
  - [ ] SubTask 6.4: 实现已点亮城市列表组件（可切换排序：最近到达/到达次数/拼音）
  - [ ] SubTask 6.5: 实现右侧信息区容器（默认态/城市详情态/记录表单态切换）
  - [ ] SubTask 6.6: 实现右侧默认态（层级面包屑 + 操作引导提示）
  - [ ] SubTask 6.7: 实现右侧城市详情态（城市名 + 所属省份 + 到达次数 + 记录列表 + 添加按钮）

- [x] Task 7: 居住地设置
  - [ ] SubTask 7.1: 实现居住地选择组件（区县级，复用城市搜索 + 区县下钻选择）
  - [ ] SubTask 7.2: 实现居住地保存到 Supabase 与读取
  - [ ] SubTask 7.3: 实现居住地在地图上的特殊样式标识
  - [ ] SubTask 7.4: 实现修改居住地时旧居住地城市可点亮、新居住地城市不可点亮的逻辑
  - [ ] SubTask 7.5: 在设置页集成居住地设置入口

- [x] Task 8: 到达记录管理
  - [ ] SubTask 8.1: 实现记录表单组件（日期单/范围切换 + 出行目的选择 + 单行备注 50 字限制 + 行程关联可选）
  - [ ] SubTask 8.2: 实现新增到达记录逻辑（首次记录同时点亮城市），入口：地图点击/右侧常驻按钮/左侧列表"+"按钮
  - [ ] SubTask 8.3: 实现城市记录列表组件（弹窗内/右侧详情内展示）
  - [ ] SubTask 8.4: 实现记录编辑功能
  - [ ] SubTask 8.5: 实现记录删除功能（删除最后一条记录时取消点亮）

- [x] Task 9: 多城市行程关联
  - [ ] SubTask 9.1: 实现行程创建/编辑组件（名称 + 日期范围）
  - [ ] SubTask 9.2: 实现记录关联行程的 UI（记录表单中可选归属到新/已有行程）
  - [ ] SubTask 9.3: 实现行程 API 仓库与数据加载

- [x] Task 10: 出行目的的分类管理
  - [ ] SubTask 10.1: 预设系统分类种子数据（旅游/出差/探亲/工作学习/中转/其他）
  - [ ] SubTask 10.2: 实现用户自定义分类新增与列表加载
  - [ ] SubTask 10.3: 实现目的选择器组件（预设 + 自定义合并展示）

- [x] Task 11: 统计子页面
  - [ ] SubTask 11.1: 实现统计页基础布局
  - [ ] SubTask 11.2: 实现已点亮城市数 / 覆盖省份数 / 总出行次数统计卡片
  - [ ] SubTask 11.3: 实现出行目的分布饼图（ECharts）
  - [ ] SubTask 11.4: 实现点亮地图缩略图展示（复用 BaseMap 只读模式）
  - [ ] SubTask 11.5: 实现空数据状态展示

- [x] Task 12: 时间线子页面
  - [ ] SubTask 12.1: 实现时间线页基础布局
  - [ ] SubTask 12.2: 拉取当前用户全部到达记录并按日期倒序排序（日期范围按起始日期）
  - [ ] SubTask 12.3: 实现按月份分组展示记录
  - [ ] SubTask 12.4: 实现时间线条目组件（城市 / 日期 / 目的 / 备注）

- [x] Task 13: 设置子页面
  - [ ] SubTask 13.1: 实现设置页基础布局（居住地 / 账号 / 偏好分区）
  - [ ] SubTask 13.2: 集成居住地设置（Task 7）
  - [ ] SubTask 13.3: 实现账号信息展示与退出登录

- [x] Task 14: 个人主页子页面
  - [ ] SubTask 14.1: 实现个人主页基础布局
  - [ ] SubTask 14.2: 实现点亮地图只读展示（复用 BaseMap）
  - [ ] SubTask 14.3: 实现统计概览展示（复用统计卡片组件）
  - [ ] SubTask 14.4: 实现行程列表展示（按行程分组展示关联记录）
  - [ ] SubTask 14.5: 实现公开/私密切换与分享链接生成

- [x] Task 15: 整体集成与视觉打磨
  - [ ] SubTask 15.1: 实现全局加载状态与空状态通用组件
  - [ ] SubTask 15.2: 实现路由配置与页面切换过渡
  - [ ] SubTask 15.3: 视觉风格与配色落地（待设计稿确认后实施：点亮色、居住地色、强度梯度）
  - [ ] SubTask 15.4: 移动端基本可用性检查（左右信息区可折叠为抽屉/Tab）

- [x] Task 16: 交互与体验细节补充
  - [ ] SubTask 16.1: 实现地图交互（滚轮缩放 + 拖动平移 + 缩放 +/- 按钮）
  - [ ] SubTask 16.2: 实现随机卡通头像生成（DiceBear）并集成到顶栏与个人主页
  - [ ] SubTask 16.3: 实现删除二次确认通用机制（基于 ElMessageBox）
  - [ ] SubTask 16.4: 实现注册密码最少 6 位校验
  - [ ] SubTask 16.5: 实现左侧城市列表筛选（按省份 / 按目的 / 按时间）
  - [ ] SubTask 16.6: 实现统计页时间范围筛选（全部/今年/最近一年/自定义）
  - [ ] SubTask 16.7: 实现时间线页筛选（按城市 / 按目的 / 按时间）
  - [ ] SubTask 16.8: 实现按需加载策略（概览加载 + 城市记录选中时加载）
  - [ ] SubTask 16.9: 实现右侧城市记录列表按到达日期倒序
  - [ ] SubTask 16.10: 实现行程卡片列表组件（行程名/日期/城市数/记录数 + 展开详情）
  - [ ] SubTask 16.11: 实现个人主页公开随机 token 链接生成与失效
  - [ ] SubTask 16.12: 实现删除行程时让用户选择保留/同步删除关联记录
  - [ ] SubTask 16.13: 实现删除自定义分类时将关联记录 purpose 转为"其他"
  - [ ] SubTask 16.14: 实现骨架屏加载组件（贴合地图/列表/卡片形态，平滑替换避免闪烁）

# Task Dependencies
- Task 2 依赖 Task 1
- Task 3 依赖 Task 2
- Task 4 依赖 Task 1
- Task 5 依赖 Task 4
- Task 6 依赖 Task 4、Task 5
- Task 7 依赖 Task 5、Task 6
- Task 8 依赖 Task 6、Task 7
- Task 9 依赖 Task 8
- Task 10 依赖 Task 2
- Task 11 依赖 Task 8
- Task 12 依赖 Task 8
- Task 13 依赖 Task 7
- Task 14 依赖 Task 9、Task 11
- Task 15 可与 Task 6 ~ Task 14 并行推进（基础设施层）
- Task 16 各子项可分发到对应主 Task 并行实施
