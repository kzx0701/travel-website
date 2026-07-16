# 地图重构：全球地球仪 + 无缝下钻

## Why

当前地图基于 ECharts 2D geo 组件实现，存在以下根本性问题：

1. **双图层叠加**：`geo` 组件渲染全国底图，`province-detail` map 系列叠加省级城市边界，两个图层在拖动时无法完美同步，导致描边错位和视觉撕裂。
2. **无法实现 3D 地球仪**：ECharts 2D geo 是平面投影，无法展示可旋转的全球地球仪。echarts-gl 虽有 globe 组件，但无法在其表面渲染行政区域 polygon 填充。
3. **过渡不丝滑**：从"散点显示"到"区域填充显示"是硬切换（隐藏 scatter → 显示 map series），而非连续渐变。`center`/`zoom` 动画与 `regions` 暗化分阶段执行，仍偶有闪烁。
4. **架构复杂度高**：`useMapChart.ts` 已达 1200+ 行，包含大量手动动画管理（定时器、RAF、两阶段动画），维护困难。

用户最新需求：
- 默认展示**可旋转的 3D 全球地球仪**，聚焦于中国
- 从地球仪到中国到省份到城市，**全程一个连续的地图**，无缝过渡
- 省份视图下已点亮城市以**区域填充**高亮，未点亮城市保持透明
- 一切以**丝滑体验**为第一目标

## What Changes

- **移除 ECharts 地图渲染**，改用 **MapLibre GL JS v5+**（开源、无 API Key、支持 Globe 投影）
- 新建 `useMapLibre` composable 替代 `useMapChart`
- 重写 `BaseMap.vue` 使用 MapLibre 实例
- 新增世界国家边界 GeoJSON（简化版 Natural Earth 110m，~100KB，随仓库提交）
- 保留所有现有 GeoJSON 数据（china.json / province/*.json / city/*.json）
- 保留 ECharts 用于统计页饼图（仅移除地图相关用法）
- 更新 `mapGeoLoader.ts` 适配 MapLibre 数据源加载

## Technology Choice: MapLibre GL JS

### 为什么选 MapLibre GL JS

| 维度 | MapLibre GL JS v5+ | Mapbox GL JS | ECharts + echarts-gl | CesiumJS |
|---|---|---|---|---|
| 3D Globe | v5 原生支持 | v2+ 原生支持 | echarts-gl 支持，但无法渲染 polygon 填充 | 原生支持 |
| Globe → 2D 过渡 | 自动渐变（zoom 驱动） | 自动渐变 | 无（3D/2D 硬切换） | N/A |
| flyTo 动画 | GPU 加速，丝滑 | GPU 加速，丝滑 | center/zoom 插值，有闪烁 | 丝滑 |
| GeoJSON 填充层 | 原生 fill layer + 数据驱动样式 | 同左 | geo regions / map series，有限 | GeoJSON 支持 |
| 拖动/缩放同步 | 单一渲染器，天然同步 | 同左 | 双图层需手动同步 | 天然同步 |
| API Key | **不需要** | 需要（免费 50k/月） | 不需要 | 不需要 |
| 开源协议 | BSD-3-Clause | 闭源（v2+） | Apache-2.0 | Apache-2.0 |
| 包体积 | ~800KB（gzip ~250KB） | ~1MB | echarts ~1MB + gl ~2MB | ~40MB |
| 生态/文档 | 良好（Mapbox 文档通用） | 优秀 | 一般 | 一般 |

**结论**：MapLibre GL JS v5+ 是最佳选择——开源免费、无需 API Key、支持 Globe 投影、GeoJSON fill layer 原生支持、flyTo 动画丝滑、与 Mapbox API 兼容（未来可无缝迁移）。

### 为什么不选其他方案

- **ECharts + echarts-gl**：globe 组件只能渲染散点和柱状图，无法在球面上渲染行政区域 polygon 填充。双图层问题无法根治。
- **Mapbox GL JS**：功能最强，但需要 API Key，闭源。个人项目不必要。
- **CesiumJS**：过于重量级（40MB+），适合 GIS 专业应用，对旅行地图应用来说大材小用。
- **D3 + TopoJSON**：无 3D globe，需从零构建所有交互，工作量巨大。

## Architecture Design

### 核心理念：单一连续地图

MapLibre 使用**单一渲染器**——从地球仪到省份到城市，始终是同一个 map 实例、同一套 WebGL 上下文。不存在"图层切换"或"地图重注册"，所有变化通过以下三种机制实现：

1. **flyTo**：相机移动（全球 → 中国 → 省份 → 城市）
2. **zoom 驱动的 layer opacity 插值**：不同层级的内容随缩放渐变显隐
3. **数据驱动样式（data-driven expressions）**：点亮城市根据 visit count 动态着色

### Map 实例配置

```
MapLibre Map
├── projection: 'globe'           // 3D 地球仪投影
├── center: [104, 35]             // 默认聚焦中国
├── zoom: 1.5                     // 全球视角
├── minZoom: 0                    // 可缩到全球
├── maxZoom: 12                   // 可放大到城市级
├── dragRotate: true              // 允许拖动旋转地球
├── atmosphere: {                 // 大气层光晕
│     color: '#e0f2fe',           // 浅蓝大气
│     highColor: '#bae6fd',
│     spaceColor: '#0f172a'       // 深空背景
│   }
└── style: 自定义最小样式（见下方）
```

### 自定义 Style 结构

不使用外部 tile provider，仅用背景色 + GeoJSON source + 自定义 layer，完全自包含：

```
Style:
├── sources:
│   ├── world-countries          // 世界国家边界（Natural Earth 110m，随仓库提交）
│   ├── china-provinces          // 中国省级边界（china.json）
│   ├── province-cities          // 当前省份的城市边界（按需加载，如 440000.json）
│   └── city-centers             // 已点亮城市中心点（动态生成）
│
├── layers (渲染顺序，从底到顶):
│   ├── background               // 海洋背景色 #1e293b（深蓝灰）
│   │
│   ├── world-fill               // 世界国家填充 #334155（浅灰）
│   │   opacity: interpolate(zoom, 0→1, 3→1, 4.5→0)  // 放大到中国时淡出
│   ├── world-border             // 世界国家边界 #475569
│   │   opacity: 同上
│   │
│   ├── province-fill            // 中国省份填充（数据驱动：有点亮城市→暖橙微光，无→透明）
│   │   opacity: interpolate(zoom, 2→0, 3.5→1)       // 放大到中国时淡入
│   ├── province-border          // 中国省份边界 #64748b
│   │   opacity: 同上
│   │
│   ├── city-fill                // 城市区域填充（数据驱动：点亮→橙色，选中→蓝色，居住地→浅蓝，未点亮→透明）
│   │   opacity: interpolate(zoom, 4→0, 5.5→1)       // 放大到省份时淡入
│   ├── city-border              // 城市边界 #94a3b8
│   │   opacity: 同上
│   │
│   └── city-dots                // 已点亮城市圆点（全国视图用）
│       opacity: interpolate(zoom, 0→1, 3→1, 5→0)    // 放大到省份时淡出
│       circle-color: 数据驱动（暖橙/冷蓝）
│       circle-radius: 数据驱动（按 visit count 分档）
```

### zoom 驱动的渐变效果

这是实现"无缝过渡"的核心。所有图层使用 MapLibre 的 `interpolate` 表达式，基于 `zoom` 自动渐变 opacity：

```
zoom 0-1.5:  全球地球仪视图
              world-fill: opacity=1（看到所有国家）
              province-*: opacity=0（不可见）
              city-*: opacity=0（不可见）
              city-dots: opacity=1（点亮城市可见为橙色小点）

zoom 1.5-3:  过渡到中国
              world-fill: 1→0（世界国家淡出）
              province-*: 0→1（中国省份淡入）
              city-dots: 1→1（圆点持续可见）

zoom 3-5:    中国到省份
              province-*: 1→1（省份边界持续可见）
              city-*: 0→1（城市边界淡入）
              city-dots: 1→0（圆点淡出，改为区域填充表达）

zoom 5-8:    省份到城市
              province-*: 1→0.3（省份边界弱化）
              city-*: 1→1（城市区域清晰）
              选中城市: 蓝色高亮
```

**关键**：这一切都是 GPU 自动插值的，不需要任何 JS 动画代码。flyTo 移动相机的同时，zoom 变化自动驱动所有图层的渐变——**一个 flyTo 调用完成全部过渡**。

### 数据驱动样式（data-driven expressions）

**省份填充**（全国视图，有点亮城市的省份微微发光）：
```json
{
  "fill-color": [
    "match",
    ["get", "name"],
    ["广东省", "云南省", ...],  // 有点亮城市的省份列表
    "rgba(255, 107, 53, 0.12)", // 暖橙微光
    "rgba(148, 163, 184, 0.06)" // 默认极淡灰
  ]
}
```

**城市填充**（省份视图，点亮城市橙色高亮）：
```json
{
  "fill-color": [
    "case",
    ["==", ["get", "cityCode"], "selected-city-code"], "rgba(59, 130, 246, 0.22)",  // 选中→蓝
    ["==", ["get", "cityCode"], "residence-city-code"], "rgba(59, 130, 246, 0.12)",  // 居住地→浅蓝
    ["in", ["get", "cityCode"], ["literal", ["lit-city-codes"]]],                     // 点亮→橙
      ["interpolate", ["linear"], ["get", "visitCount"],
        1, "rgba(255, 179, 128, 0.28)",   // 1次
        3, "rgba(255, 107, 53, 0.32)",    // 2-3次
        4, "rgba(224, 90, 32, 0.36)"      // 4+次
      ],
    "rgba(248, 250, 252, 0)"  // 未点亮→透明
  ]
}
```

**城市圆点**（全国视图）：
```json
{
  "circle-color": [
    "match",
    ["get", "isResidence"],
    true, "#3B82F6",   // 居住地→冷蓝
    "#FF6B35"          // 点亮→暖橙
  ],
  "circle-radius": [
    "interpolate", ["linear"], ["get", "visitCount"],
    1, 6,    // 1次→6px
    3, 8,    // 2-3次→8px
    4, 10    // 4+次→10px
  ]
}
```

### 交互流程

#### 全球 → 中国
```
用户双击中国区域 或 点击"中国"面包屑
→ map.flyTo({ center: [104, 35], zoom: 3, duration: 2000, curve: 1.42 })
→ 相机飞向中国，zoom 从 1.5 → 3
→ world-fill 自动淡出，province-* 自动淡入
→ 全程一个 flyTo，无任何 JS 动画代码
```

#### 中国 → 省份
```
用户点击广东省区域
→ 1. 加载 440000.json 作为 province-cities source（异步）
→ 2. map.flyTo({ center: [广东中心], zoom: 6, duration: 1500 })
→ province-border 渐变弱化，city-* 渐变淡入
→ city-dots 渐变淡出（圆点消失，区域填充接管）
→ 全程丝滑，因为所有 opacity 变化由 zoom 驱动，与 flyTo 同步
```

#### 省份 → 城市
```
用户点击广州市区域
→ map.flyTo({ center: [广州中心], zoom: 8, duration: 1200 })
→ 选中城市填充变为蓝色（更新数据驱动样式的 match 表达式）
→ 全程同样是一个 flyTo
```

#### 返回上级
```
用户点击面包屑"中国"
→ map.flyTo({ center: [104, 35], zoom: 3, duration: 2000 })
→ 所有图层 opacity 由 zoom 自动回退
```

#### 地球仪旋转
```
用户拖动地球（dragRotate: true）
→ 地球自然旋转，可看到其他国家
→ 松手后地球保持当前角度
→ 可随时通过 flyTo 回到中国
```

### 文件变更清单

#### 新增
- `package.json`：添加 `maplibre-gl` 依赖
- `src/composables/useMapLibre.ts`：MapLibre 地图 composable（替代 useMapChart）
- `src/data/geo/world/ne_110m_admin_0_countries.json`：世界国家简化边界（Natural Earth 110m，~100KB，随仓库提交）
- `src/utils/mapGeoLoader.ts`：更新适配 MapLibre GeoJSON source 加载方式

#### 重写
- `src/components/business/BaseMap.vue`：使用 MapLibre 实例替代 ECharts

#### 保留不变
- `src/data/cities.ts` / `src/data/districts.ts`：业务数据源
- `src/data/geo/china.json`：全国 GeoJSON
- `src/data/geo/province/*.json`：省级 GeoJSON
- `src/data/geo/city/*.json`：市级 GeoJSON
- `src/stores/map.ts`：地图状态管理（MapLevel 等）
- `src/types/index.ts`：类型定义

#### 废弃（可保留备查或删除）
- `src/composables/useMapChart.ts`：ECharts 地图逻辑（被 useMapLibre 替代）

### useMapLibre composable 接口设计

```typescript
interface UseMapLibreParams {
  level: MapLevel           // 'country' | 'province' | 'city'
  regionCode: string        // 当前省份/城市编码
  litCities: City[]         // 已点亮城市列表
  cityVisitCount: Record<string, number>
  residenceCityCode: string
  readonly: boolean
}

interface UseMapLibreCallbacks {
  onCityClick?: (city: City) => void
  onRegionClick?: (code: string, name: string) => void
}

function useMapLibre(
  containerRef: Ref<HTMLElement | null>,
  params: Ref<UseMapLibreParams>,
  callbacks: Ref<UseMapLibreCallbacks>,
): {
  loading: Ref<boolean>
  mapAvailable: Ref<boolean>
  currentZoom: Ref<number>
  flying: Ref<boolean>
  renderMap: () => Promise<void>
  updateData: () => void        // 点亮状态变化时更新数据驱动样式
  focusProvince: (code: string, opts?: { center?: [number, number]; zoom?: number }) => void
  unfocus: () => void
  zoomIn: () => void
  zoomOut: () => void
  resize: () => void
}
```

**关键简化**：相比 useMapChart 的 1200+ 行，useMapLibre 预计 300-400 行，因为：
- 无需手动管理动画定时器（flyTo 内置）
- 无需手动同步双图层（单一渲染器）
- 无需手动管理 regions 暗化（zoom 驱动 opacity）
- 无需 calculateAdaptiveFocus（MapLibre flyTo 支持 padding/bearing，自动适配）

## Implementation Plan

### Phase 1: 基础搭建
1. 安装 `maplibre-gl` 依赖
2. 下载 Natural Earth 110m 世界国家 GeoJSON，放入 `src/data/geo/world/`
3. 创建 `useMapLibre.ts` composable 骨架
4. 初始化 MapLibre 实例，配置 globe 投影 + 大气层 + 自定义 style

### Phase 2: 图层与样式
5. 添加 world-countries source + fill/border layers（zoom 驱动 opacity）
6. 添加 china-provinces source + fill/border layers（数据驱动点亮省份颜色）
7. 添加 city-centers source + circle layer（数据驱动圆点颜色/大小）
8. 实现 updateData()：更新数据驱动样式中的 match 表达式

### Phase 3: 交互与下钻
9. 实现省份点击 → flyTo + 加载省级 GeoJSON
10. 实现城市点击 → flyTo + 高亮选中城市
11. 实现面包屑返回 → flyTo 回上级
12. 实现 province-cities source + fill/border layers（数据驱动城市颜色）

### Phase 4: 集成与清理
13. 重写 BaseMap.vue 使用 useMapLibre
14. 更新 mapGeoLoader.ts 适配 MapLibre 加载方式
15. 验证所有页面（地图页/统计页缩略图/个人主页只读地图）
16. 移除 useMapChart.ts（或标记废弃）

## Data Requirements

### 新增数据
- **世界国家边界 GeoJSON**：Natural Earth 110m `ne_110m_admin_0_countries.geojson`
  - 下载：`https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson`
  - 大小：~350KB（未压缩），gzip ~100KB
  - 随仓库提交（体积小，公开域名）
  - 用于 globe 视图下展示全球陆地轮廓

### 现有数据（保持不变）
- `src/data/geo/china.json`：中国省级边界（DataV 来源，~1MB）
- `src/data/geo/province/*.json`：省级城市边界（33 个文件）
- `src/data/geo/city/*.json`：市级区县边界（300+ 个文件）
- `src/data/cities.ts`：省/市业务数据

### 配色规范（保持不变）
- 暖橙主色：`#FF6B35`（点亮城市）
- 暖橙浅色：`#FFB380`（1 次到达）
- 暖橙深色：`#E05A20`（4+ 次到达）
- 冷蓝居住地：`#3B82F6`
- 未点亮灰：`#E2E8F0`
- 海洋背景：`#1e293b`（深蓝灰，globe 视图）
- 陆地默认：`#334155`（浅灰，world-fill）

## Risk & Mitigation

1. **MapLibre v5 globe 稳定性**：v5 较新，可能有 edge case。Mitigation：先验证基本 globe + flyTo + GeoJSON fill 在目标浏览器正常，再全面迁移。
2. **GeoJSON 性能**：china.json（~1MB）作为 source 可能影响首次加载。Mitigation：MapLibre 对 GeoJSON source 有内置 simplify/cluster，且 china.json 仅加载一次。
3. **省份 GeoJSON 按需加载**：flyTo 时需要先加载省份 GeoJSON 再开始动画。Mitigation：可以先 flyTo（省份边界后续淡入时才需要），同时异步加载 GeoJSON，加载完成后 addSource + addLayer。
4. **保留 ECharts**：统计页饼图仍用 ECharts，不影响。只需确保 BaseMap 不再依赖 echarts。
