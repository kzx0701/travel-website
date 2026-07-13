import type { District } from '@/types'

/**
 * 区/县数据骨架
 *
 * 说明：全国区县数量约 2800+，数据量较大，一期只提供骨架结构与少量示例数据。
 * 后续扩充方式：
 * 1) 从民政部行政区划代码表导入全量区县；
 * 2) 或运行时从 GeoJSON 子区域提取 (city/<adcode>.json 中 features 的 properties)。
 *
 * 区县编码规则：6 位行政区划代码，前 4 位为所属地级市编码（直辖市例外），
 * 后 2 位为区县顺序码。例如：
 *   - 110105 北京市朝阳区
 *   - 310115 上海市浦东新区
 *   - 440305 深圳市南山区
 */

/**
 * 示例区县数据（仅覆盖北京、上海、深圳的部分区县，用于一期联调）
 * 实际项目使用时请通过外部数据源补全
 */
export const districts: District[] = [
  // 北京市（直辖市，cityCode 用 110100）
  { code: '110101', name: '东城区', cityCode: '110100', cityName: '北京市' },
  { code: '110102', name: '西城区', cityCode: '110100', cityName: '北京市' },
  { code: '110105', name: '朝阳区', cityCode: '110100', cityName: '北京市' },
  { code: '110106', name: '丰台区', cityCode: '110100', cityName: '北京市' },
  { code: '110108', name: '海淀区', cityCode: '110100', cityName: '北京市' },
  { code: '110109', name: '门头沟区', cityCode: '110100', cityName: '北京市' },
  { code: '110111', name: '房山区', cityCode: '110100', cityName: '北京市' },
  { code: '110112', name: '通州区', cityCode: '110100', cityName: '北京市' },
  { code: '110113', name: '顺义区', cityCode: '110100', cityName: '北京市' },
  { code: '110114', name: '昌平区', cityCode: '110100', cityName: '北京市' },
  { code: '110115', name: '大兴区', cityCode: '110100', cityName: '北京市' },
  { code: '110116', name: '怀柔区', cityCode: '110100', cityName: '北京市' },
  { code: '110117', name: '平谷区', cityCode: '110100', cityName: '北京市' },
  { code: '110118', name: '密云区', cityCode: '110100', cityName: '北京市' },
  { code: '110119', name: '延庆区', cityCode: '110100', cityName: '北京市' },

  // 上海市（直辖市，cityCode 用 310100）
  { code: '310101', name: '黄浦区', cityCode: '310100', cityName: '上海市' },
  { code: '310104', name: '徐汇区', cityCode: '310100', cityName: '上海市' },
  { code: '310105', name: '长宁区', cityCode: '310100', cityName: '上海市' },
  { code: '310106', name: '静安区', cityCode: '310100', cityName: '上海市' },
  { code: '310107', name: '普陀区', cityCode: '310100', cityName: '上海市' },
  { code: '310109', name: '虹口区', cityCode: '310100', cityName: '上海市' },
  { code: '310110', name: '杨浦区', cityCode: '310100', cityName: '上海市' },
  { code: '310112', name: '闵行区', cityCode: '310100', cityName: '上海市' },
  { code: '310113', name: '宝山区', cityCode: '310100', cityName: '上海市' },
  { code: '310114', name: '嘉定区', cityCode: '310100', cityName: '上海市' },
  { code: '310115', name: '浦东新区', cityCode: '310100', cityName: '上海市' },
  { code: '310116', name: '金山区', cityCode: '310100', cityName: '上海市' },
  { code: '310117', name: '松江区', cityCode: '310100', cityName: '上海市' },
  { code: '310118', name: '青浦区', cityCode: '310100', cityName: '上海市' },
  { code: '310120', name: '奉贤区', cityCode: '310100', cityName: '上海市' },
  { code: '310151', name: '崇明区', cityCode: '310100', cityName: '上海市' },

  // 深圳市
  { code: '440303', name: '罗湖区', cityCode: '440300', cityName: '深圳市' },
  { code: '440304', name: '福田区', cityCode: '440300', cityName: '深圳市' },
  { code: '440305', name: '南山区', cityCode: '440300', cityName: '深圳市' },
  { code: '440306', name: '宝安区', cityCode: '440300', cityName: '深圳市' },
  { code: '440307', name: '龙岗区', cityCode: '440300', cityName: '深圳市' },
  { code: '440308', name: '盐田区', cityCode: '440300', cityName: '深圳市' },
  { code: '440309', name: '龙华区', cityCode: '440300', cityName: '深圳市' },
  { code: '440310', name: '坪山区', cityCode: '440300', cityName: '深圳市' },
  { code: '440311', name: '光明区', cityCode: '440300', cityName: '深圳市' },

  // 广州市
  { code: '440103', name: '荔湾区', cityCode: '440100', cityName: '广州市' },
  { code: '440104', name: '越秀区', cityCode: '440100', cityName: '广州市' },
  { code: '440105', name: '海珠区', cityCode: '440100', cityName: '广州市' },
  { code: '440106', name: '天河区', cityCode: '440100', cityName: '广州市' },
  { code: '440111', name: '白云区', cityCode: '440100', cityName: '广州市' },
  { code: '440112', name: '黄埔区', cityCode: '440100', cityName: '广州市' },
  { code: '440113', name: '番禺区', cityCode: '440100', cityName: '广州市' },
  { code: '440114', name: '花都区', cityCode: '440100', cityName: '广州市' },
  { code: '440115', name: '南沙区', cityCode: '440100', cityName: '广州市' },
  { code: '440117', name: '从化区', cityCode: '440100', cityName: '广州市' },
  { code: '440118', name: '增城区', cityCode: '440100', cityName: '广州市' },

  // 杭州市
  { code: '330102', name: '上城区', cityCode: '330100', cityName: '杭州市' },
  { code: '330105', name: '拱墅区', cityCode: '330100', cityName: '杭州市' },
  { code: '330106', name: '西湖区', cityCode: '330100', cityName: '杭州市' },
  { code: '330108', name: '滨江区', cityCode: '330100', cityName: '杭州市' },
  { code: '330109', name: '萧山区', cityCode: '330100', cityName: '杭州市' },
  { code: '330110', name: '余杭区', cityCode: '330100', cityName: '杭州市' },
  { code: '330111', name: '富阳区', cityCode: '330100', cityName: '杭州市' },
  { code: '330112', name: '临安区', cityCode: '330100', cityName: '杭州市' },
  { code: '330113', name: '临平区', cityCode: '330100', cityName: '杭州市' },
  { code: '330114', name: '钱塘区', cityCode: '330100', cityName: '杭州市' },
]

/**
 * 区县编码 → 区县对象 映射
 */
export const districtMap: Record<string, District> = districts.reduce(
  (acc, d) => {
    acc[d.code] = d
    return acc
  },
  {} as Record<string, District>,
)

/**
 * 按城市编码分组的区县映射
 */
export const districtsByCity: Record<string, District[]> = districts.reduce(
  (acc, d) => {
    if (!acc[d.cityCode]) acc[d.cityCode] = []
    acc[d.cityCode].push(d)
    return acc
  },
  {} as Record<string, District[]>,
)

/**
 * 根据城市编码获取区县列表
 */
export function getDistrictsByCity(cityCode: string): District[] {
  return districtsByCity[cityCode] ?? []
}

/**
 * 根据区县编码获取区县
 */
export function getDistrictByCode(code: string): District | undefined {
  return districtMap[code]
}
