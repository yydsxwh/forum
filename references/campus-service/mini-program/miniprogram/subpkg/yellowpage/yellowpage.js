// pages/yellowpage/yellowpage.js — 校园黄页
const base = getApp().globalData._sharedBase;
const api = require('../../utils/api');

// {{SCHOOL_NAME}}校园黄页数据（来源：学校官网各部门页面）
const yellowpageData = [
  // ─── 党政机构 ───
  { category: '党政机构', name: '学校办公室', phone: '{{SCHOOL_AREA_CODE}}-3969013', fax: '{{SCHOOL_AREA_CODE}}-3965698', email: 'xiaoban@{{SCHOOL_EMAIL_DOMAIN}}', location: '行政楼', desc: '党委办公室、校长办公室、校友会工作办公室' },
  { category: '党政机构', name: '纪委办公室（纪检监察室）', phone: '{{SCHOOL_AREA_CODE}}-3963280', email: 'hbgdjw@{{SCHOOL_EMAIL_DOMAIN}}', location: '行政服务中心442室', desc: '来信举报、来电举报、来访举报，工作日 8:30-12:00, 14:00-17:30' },
  { category: '党政机构', name: '党委组织部（党校）', phone: '{{SCHOOL_AREA_CODE}}-3969', location: '行政楼', desc: '组织工作、干部管理、党校教育' },
  { category: '党政机构', name: '党委宣传部（新闻中心）', phone: '{{SCHOOL_AREA_CODE}}-3969', location: '行政楼', desc: '宣传思想工作、新闻报道、校园文化建设' },
  { category: '党政机构', name: '党委统战部', phone: '{{SCHOOL_AREA_CODE}}-3969', location: '行政楼', desc: '统一战线工作' },
  { category: '党政机构', name: '发展规划与学科建设处', phone: '{{SCHOOL_AREA_CODE}}-3967658', location: '综合服务中心410室', desc: '处长：侯毅凯。副处长：凌向阳 3967659。综合科：3967663。发展规划科：3967662。学位与学科建设科：3967664' },
  { category: '党政机构', name: '人力资源处（教师工作部）', phone: '{{SCHOOL_AREA_CODE}}-3967601', location: '行政楼', desc: '人事管理、教师工作、离退休工作处' },
  { category: '党政机构', name: '审计处', phone: '{{SCHOOL_AREA_CODE}}-3969', location: '行政楼', desc: '内部审计、经济责任审计' },
  { category: '党政机构', name: '资产与实验室管理处', phone: '{{SCHOOL_AREA_CODE}}-3969', location: '行政楼', desc: '资产管理、实验室建设与管理' },
  { category: '党政机构', name: '校园规划与建设处', phone: '{{SCHOOL_AREA_CODE}}-3969', location: '行政楼', desc: '校园规划建设、基本建设管理' },
  { category: '党政机构', name: '离退休工作处', phone: '{{SCHOOL_AREA_CODE}}-3969', location: '行政楼', desc: '离退休教职工服务管理，体检中心服务电话：3962029、3962028' },
  { category: '党政机构', name: '工会', phone: '{{SCHOOL_AREA_CODE}}-3969', location: '行政楼', desc: '教职工工会、民主管理' },
  { category: '党政机构', name: '关工委', phone: '{{SCHOOL_AREA_CODE}}-3969', location: '行政楼', desc: '关心下一代工作委员会' },
  { category: '党政机构', name: '团委', phone: '{{SCHOOL_AREA_CODE}}-3969', location: '大学生活动中心', desc: '共青团工作、学生活动' },

  // ─── 教学机构 ───
  { category: '教学机构', name: '教务处', phone: '{{SCHOOL_AREA_CODE}}-3969233', email: 'jiaowuchu@{{SCHOOL_EMAIL_DOMAIN}}', location: '行政楼', desc: '本科教学管理、学籍管理、考试管理、毕业论文管理。教务管理系统：jwglxxfwpt.{{SCHOOL_EMAIL_DOMAIN}}' },
  { category: '教学机构', name: '研究生部', phone: '{{SCHOOL_AREA_CODE}}-3969', email: 'yjsb@{{SCHOOL_EMAIL_DOMAIN}}', location: '行政楼', desc: '研究生教育管理，邮编056038，地址：{{SCHOOL_ADDRESS}}' },
  { category: '教学机构', name: '招生办', phone: '{{SCHOOL_AREA_CODE}}-8579060', fax: '{{SCHOOL_AREA_CODE}}-6030429', email: 'zhaoshengban@{{SCHOOL_EMAIL_DOMAIN}}', location: '行政楼', desc: '本科招生咨询。QQ群：{{SCHOOL_QQ_GROUPS}}。微信：{{SCHOOL_OFFICIAL_WECHAT}}' },
  { category: '教学机构', name: '继续教育学院', phone: '{{SCHOOL_AREA_CODE}}-3969', location: '行政楼', desc: '成人教育、继续教育培训' },
  { category: '教学机构', name: '文法学院', phone: '{{SCHOOL_AREA_CODE}}-3969', location: '文法学院', desc: '法学、文学等学科教学' },
  { category: '教学机构', name: '建筑与艺术学院', phone: '{{SCHOOL_AREA_CODE}}-3969', location: '建筑学院', desc: '建筑学、艺术设计等学科教学' },
  { category: '教学机构', name: '数理科学与工程学院', phone: '{{SCHOOL_AREA_CODE}}-3969', location: '数理学院', desc: '数学、物理等基础学科教学' },
  { category: '教学机构', name: '土木工程学院', phone: '{{SCHOOL_AREA_CODE}}-3969', location: '土木学院', desc: '土木工程、工程管理等学科教学' },
  { category: '教学机构', name: '水利水电学院', phone: '{{SCHOOL_AREA_CODE}}-3123571', location: '水电学院', desc: '水利水电工程、农业水利工程、水文与水资源工程等5个本科专业' },
  { category: '教学机构', name: '能源与环境工程学院', phone: '{{SCHOOL_AREA_CODE}}-3969', location: '能环学院', desc: '能源工程、环境工程等学科教学' },
  { category: '教学机构', name: '医学院', phone: '{{SCHOOL_AREA_CODE}}-3969', location: '医学院', desc: '医学教育、临床医学等' },
  { category: '教学机构', name: '临床医学院', phone: '{{SCHOOL_AREA_CODE}}-3695116', location: '附属医院', desc: '临床教学、附属三级甲等综合医院' },
  { category: '教学机构', name: '机械与装备工程学院', phone: '{{SCHOOL_AREA_CODE}}-3969', location: '机械学院', desc: '机械工程、装备制造等学科教学' },
  { category: '教学机构', name: '信息与电气工程学院', phone: '{{SCHOOL_AREA_CODE}}-3969', location: '信电学院', desc: '信息工程、电气工程等学科教学' },
  { category: '教学机构', name: '园林与生态工程学院', phone: '{{SCHOOL_AREA_CODE}}-3969', location: '园林学院', desc: '园林、生态工程等学科教学' },
  { category: '教学机构', name: '矿业与测绘工程学院', phone: '{{SCHOOL_AREA_CODE}}-3969', location: '矿测学院', desc: '矿业工程、测绘工程等学科教学' },
  { category: '教学机构', name: '生命科学与食品工程学院', phone: '{{SCHOOL_AREA_CODE}}-3969', location: '生食学院', desc: '生物科学、食品工程等学科教学' },
  { category: '教学机构', name: '地球科学与工程学院', phone: '{{SCHOOL_AREA_CODE}}-3967906', location: '地科学院17-510', desc: '学院办公室：杨玲。教学办：3967907。科研办：3967908。学生工作办：3967910、3967915' },
  { category: '教学机构', name: '体育与健康工程学院', phone: '{{SCHOOL_AREA_CODE}}-3969', location: '体育学院', desc: '体育教育、健康工程等学科教学' },
  { category: '教学机构', name: '材料科学与工程学院', phone: '{{SCHOOL_AREA_CODE}}-3969', location: '材料学院', desc: '材料科学与工程等学科教学' },
  { category: '教学机构', name: '马克思主义学院', phone: '{{SCHOOL_AREA_CODE}}-3969', location: '马院', desc: '思想政治理论课教学与研究' },
  { category: '教学机构', name: '管理工程与商学院', phone: '{{SCHOOL_AREA_CODE}}-3969', location: '管商学院', desc: '管理学、商学等学科教学' },
  { category: '教学机构', name: '科信学院', phone: '{{SCHOOL_AREA_CODE}}-3969', location: '科信学院', desc: '独立学院' },

  // ─── 学生事务 ───
  { category: '学生事务', name: '学生工作部（武装部、学生处）', phone: '{{SCHOOL_AREA_CODE}}-3969725', location: '行政楼', desc: '综合办公室：3969725。思政教育科：3969207。学生资助中心：3969724。国防教育科：3969722。武装部：3969726' },
  { category: '学生事务', name: '心理咨询中心', phone: '{{SCHOOL_AREA_CODE}}-3963156', location: '大学生活动中心', desc: '心理健康咨询与服务' },
  { category: '学生事务', name: '易班发展中心', phone: '{{SCHOOL_AREA_CODE}}-3963157', location: '大学生活动中心', desc: '易班平台运营、网络思政教育' },
  { category: '学生事务', name: '学生资助中心', phone: '{{SCHOOL_AREA_CODE}}-3969724', location: '行政楼', desc: '奖助学金、助学贷款、勤工助学等资助管理' },
  { category: '学生事务', name: '美育与劳动教育工作办公室', phone: '{{SCHOOL_AREA_CODE}}-3969051', location: '行政楼', desc: '美育教育、劳动教育课程管理' },
  { category: '学生事务', name: '就业创业服务中心', phone: '{{SCHOOL_AREA_CODE}}-3969', location: '就业中心', desc: '就业指导、创业服务、招聘信息。就业信息网：hbgc.bysjy.com.cn' },

  // ─── 后勤保障 ───
  { category: '后勤保障', name: '后勤管理处', phone: '{{SCHOOL_AREA_CODE}}-3969', location: '行政楼', desc: '后勤管理、餐饮服务、公寓管理等' },
  { category: '后勤保障', name: '财务处', phone: '{{SCHOOL_AREA_CODE}}-3969199', location: '行政楼125室', desc: '综合科：3969199。资金结算科：3969083（行政楼136室）。收费管理科：3969098。预算管理科：3969565。会计核算科：3969218（行政服务大厅）。科研财务科：3969797。伙食财务科：3969756。副处长张宏雷：3969082。副处长杨丁贵：3969087。智慧财务：caiwu.{{SCHOOL_EMAIL_DOMAIN}}' },
  { category: '后勤保障', name: '安全工作处（部）', phone: '{{SCHOOL_AREA_CODE}}-3963110', location: '安全处', desc: '24小时报警电话。新校区值班：3963110。家属院值班：3967110。科信学院：3969110。东门门岗：3969093。西门门岗：3969094。南门门岗：3969095。主校区：3969385。水电公寓：3969782。南苑小区：3961170。罗苑小区：3969783。医学罗南街：3969784' },
  { category: '后勤保障', name: '校医院', phone: '{{SCHOOL_AREA_CODE}}-3969', location: '校医院', desc: '校内医疗服务、健康体检。附属医院体检中心：{{SCHOOL_AREA_CODE}}-3962029、3962028' },
  { category: '后勤保障', name: '现代教育技术中心', phone: '{{SCHOOL_AREA_CODE}}-3969113', location: '现代教育技术中心', desc: '校园网络、信息化建设、教育技术支持。地址：{{SCHOOL_ADDRESS}}，邮编056038' },

  // ─── 教辅单位 ───
  { category: '教辅单位', name: '图书馆', phone: '{{SCHOOL_AREA_CODE}}-3969', location: '图书馆', desc: '馆藏纸质图书225万册，提供图书检索、数据库访问、学位论文提交等服务。校外访问已开通' },
  { category: '教辅单位', name: '分析测试实验中心', phone: '{{SCHOOL_AREA_CODE}}-3969', location: '实验中心', desc: '大型仪器共享、分析测试服务' },
  { category: '教辅单位', name: '教师培训中心', phone: '{{SCHOOL_AREA_CODE}}-3969', location: '教师发展中心', desc: '教师教学能力提升、培训' },
  { category: '教辅单位', name: '技术转移中心', phone: '{{SCHOOL_AREA_CODE}}-3969', location: '技术转移中心', desc: '科技成果转化、技术转移服务' },
  { category: '教辅单位', name: '档案（校史）馆', phone: '{{SCHOOL_AREA_CODE}}-3969', location: '档案馆', desc: '档案管理、校史展览' },
  { category: '教辅单位', name: '建筑艺术博物馆', phone: '{{SCHOOL_AREA_CODE}}-3969', location: '博物馆', desc: '建筑艺术展览与教育' },
  { category: '教辅单位', name: '学报编辑部', phone: '{{SCHOOL_AREA_CODE}}-3969', location: '学报编辑部', desc: '学术期刊编辑出版' },
  { category: '教辅单位', name: '工程实训中心', phone: '{{SCHOOL_AREA_CODE}}-3969', location: '实训中心', desc: '工程实践训练、创新创业实训' },
  { category: '教辅单位', name: '现代农业示范培训基地', phone: '{{SCHOOL_AREA_CODE}}-3969', location: '军地职业技术学院', desc: '现代农业示范培训、军地职业教育' },

  // ─── 国际交流 ───
  { category: '国际交流', name: '国际合作与交流处（国际教育学院）', phone: '{{SCHOOL_AREA_CODE}}-3969295', location: '行政楼', desc: '留学生教育、国际合作项目、港澳台事务。地址：{{SCHOOL_ADDRESS}}，邮编056038' },

  // ─── 附属单位 ───
  { category: '附属单位', name: '附属医院', phone: '{{SCHOOL_AREA_CODE}}-3969', location: '{{SCHOOL_HOSPITAL_ADDRESS}}', desc: '三级甲等综合医院。体检中心电话：{{SCHOOL_AREA_CODE}}-3962029、3962028。东门：丛台路与光明大街交叉口北行200米路西' },
  { category: '附属单位', name: '附属学校', phone: '{{SCHOOL_AREA_CODE}}-3969', location: '附属学校', desc: '附属中小学教育' },
];

Page({
  data: {
    ...base.baseData,
    moduleName: 'yellowpage',
    searchText: '',
    yellowpageData: [],
    filteredData: [],
    activeCategory: '全部',
    categories: ['全部', '党政机构', '教学机构', '学生事务', '后勤保障', '教辅单位', '国际交流', '附属单位'],
    loading: true,
  },

  onLoad() {
    base.baseOnLoad.call(this);
    this.loadData();
  },

  onShow() {
    base.baseOnShow.call(this);
  },

  ...base.baseMethods,

  // ===== 加载数据 =====
  async loadData() {
    try {
      const res = await api.getYellowpageList().catch(() => null);
      if (res && res.success && res.list && res.list.length > 0) {
        this.setData({
          yellowpageData: res.list,
          filteredData: res.list,
          loading: false,
        });
        return;
      }
    } catch (e) {
      console.warn('[yellowpage] API 失败，使用本地数据:', e);
    }
    // 降级：使用本地数据
    this.setData({
      yellowpageData: yellowpageData,
      filteredData: yellowpageData,
      loading: false,
    });
  },

  // 搜索
  onSearchInput(e) {
    const text = e.detail.value;
    this.setData({ searchText: text });
    this.filterData(text, this.data.activeCategory);
  },

  onSearch() {
    this.filterData(this.data.searchText, this.data.activeCategory);
  },

  // 分类切换
  onCategoryTap(e) {
    const category = e.currentTarget.dataset.category;
    this.setData({ activeCategory: category });
    this.filterData(this.data.searchText, category);
  },

  // 过滤数据
  filterData(searchText, category) {
    let result = this.data.yellowpageData;
    if (category && category !== '全部') {
      result = result.filter(item => item.category === category);
    }
    if (searchText) {
      const text = searchText.toLowerCase();
      result = result.filter(item =>
        item.name.toLowerCase().includes(text) ||
        item.phone.includes(text) ||
        (item.desc && item.desc.toLowerCase().includes(text)) ||
        (item.location && item.location.toLowerCase().includes(text))
      );
    }
    this.setData({ filteredData: result });
  },

  // 拨打电话
  onCallTap(e) {
    const phone = e.currentTarget.dataset.phone;
    if (!phone || phone === '{{SCHOOL_AREA_CODE}}-3969') {
      wx.showToast({ title: '电话暂未收录', icon: 'none' });
      return;
    }
    wx.makePhoneCall({ phoneNumber: phone });
  },

  // 复制电话
  onCopyTap(e) {
    const phone = e.currentTarget.dataset.phone;
    wx.setClipboardData({
      data: phone,
      success: () => {
        wx.showToast({ title: '已复制', icon: 'success' });
      }
    });
  },

  // 转发给朋友
  onShareAppMessage: function () {
    return {
      title: '常用电话 · 校园通讯录快速查',
      path: '/pages/index/index?sp=yellowpage_yellowpage',
    };
  },
  // 分享到朋友圈
  onShareTimeline: function () {
    return {
      title: '常用电话 · 校园通讯录快速查',
      query: 'sp=yellowpage_yellowpage',
    };
  },
});
