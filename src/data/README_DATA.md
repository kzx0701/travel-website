# 地图数据说明

本目录存放中国行政区划数据。其中：

- `cities.ts`：省/市级数据集（含 34 个省级单位、358 个地级市/自治州/盟/地区，含港澳台主要城市），含拼音、经纬度，作为业务数据源直接使用
- `districts.ts`：区/县级数据骨架（仅示例数据，后续扩充）
- `geo/`：ECharts 地图渲染所需的 GeoJSON 文件（**需手动下载**，不随仓库提交）

## GeoJSON 文件下载与放置

由于完整 GeoJSON 文件较大（全国约 1MB，全量省+市约 30MB+），且涉及版权与稳定性，本项目 **不打包** GeoJSON 文件，运行时由 `src/utils/mapGeoLoader.ts` 通过 Vite 静态 glob 扫描 `src/data/geo/**/*.json` 加载。

### 期望的目录结构

```
src/data/geo/
├── china.json                       全国地图（country 级）
├── province/
│   ├── 110000.json                  北京市
│   ├── 120000.json                  天津市
│   ├── 440000.json                  广东省
│   └── ...                          其余 31 个省级单位
└── city/
    ├── 110100.json                  北京市（直辖市市级边界）
    ├── 440100.json                  广州市
    ├── 440300.json                  深圳市
    └── ...                          其余地级市
```

文件命名规则：以 6 位行政区划代码（adcode）命名。省份 adcode 见 `cities.ts` 中的 `provinces` 数组，城市 adcode 见 `cities` 数组的 `code` 字段。

### 下载来源（任选其一）

1. **阿里云 DataV GeoAtlas**（推荐，免费公开）
   - 全国：`https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json`
   - 单省：`https://geo.datav.aliyun.com/areas_v3/bound/{provinceCode}_full.json`（如 `440000_full.json`）
   - 单市：`https://geo.datav.aliyun.com/areas_v3/bound/{cityCode}_full.json`（如 `440300_full.json`）
   - 下载后重命名为 `{adcode}.json` 放入对应目录

2. **echarts-china-map**（npm 社区包）
   - `npm i echarts-china-map` 后从包内 `dist/` 目录复制所需 JSON

3. **民政部行政区划数据**（权威但需自行转换为 GeoJSON）

### 一键下载脚本示例

可在项目根目录执行以下 Node 脚本批量下载（需 Node 18+）：

```bash
mkdir -p src/data/geo/province src/data/geo/city

# 全国
curl -L https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json -o src/data/geo/china.json

# 各省（adcode 列表见 cities.ts provinces 数组）
for code in 110000 120000 130000 140000 150000 210000 220000 230000 310000 320000 \
           330000 340000 350000 360000 370000 410000 420000 430000 440000 450000 \
           460000 500000 510000 520000 530000 540000 610000 620000 630000 640000 \
           650000 710000 810000 820000; do
  curl -L "https://geo.datav.aliyun.com/areas_v3/bound/${code}_full.json" \
    -o "src/data/geo/province/${code}.json"
done

# 各市（adcode 列表见 cities.ts cities 数组的 code 字段）
# 示例：
# for code in 110100 440100 440300 330100; do
#   curl -L "https://geo.datav.aliyun.com/areas_v3/bound/${code}_full.json" \
#     -o "src/data/geo/city/${code}.json"
# done
```

## 缺失 GeoJSON 时的降级行为

`src/utils/mapGeoLoader.ts` 在文件缺失时会：

1. `console.warn` 输出未找到文件的提示；
2. 返回 `null`，由 `BaseMap.vue` 在画面底部展示黄色提示条；
3. ECharts 自动降级为无底图渲染（使用 `cartesian2d` 坐标系按经纬度绘制城市点位），保证组件不会崩溃。

补齐 GeoJSON 文件后无需改动代码，Vite 会自动重新扫描 glob 并热更新。
