// scripts/gen-guide-pages.js — 一次性生成 12 个指南类工具页面（json/wxml/wxss/js）
// 通过 node 运行： node scripts/gen-guide-pages.js
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BASE = path.join(ROOT, 'miniprogram', 'pages');

// 12 个指南页配置
const PAGES = [
  {
    key: 'card-loss',
    name: '校园卡挂失',
    icon: '🔒',
    accent: '#E53935',
    accentBg: '#FFEBEE',
    summary: '校园卡遗失或被盗？请第一时间挂失，挂失后 5 分钟内生效，避免被他人冒用造成损失。',
    steps: [
      '打开「校园卡服务」小程序或拨打校园卡服务热线 24 小时挂失',
      '提供校园卡号（卡面 8 位数字），如记不清可报学号 + 身份证后 4 位',
      '客服确认身份后立即冻结卡片，同时冻结关联的支付/门禁/图书借阅',
      '挂失生效后持身份证到校园卡服务中心补办新卡（旧卡余额自动转入）',
    ],
    materials: [
      '本人校园卡号或学号',
      '身份证号（用于身份验证）',
      '紧急联系人姓名 + 电话',
    ],
    faqs: [
      { q: '补办前怎么消费？', a: '挂失后可在卡务中心申请临时电子卡凭证，过渡 7 天内有效。' },
      { q: '找回原卡怎么办？', a: '原卡找回后持本人身份证到卡务中心办理解挂，余额可继续使用。' },
      { q: '挂失收费吗？', a: '电话挂失完全免费；补办新卡需工本费 20 元。' },
    ],
    contacts: [
      { label: '24h 挂失热线',  value: '{{SCHOOL_AREA_CODE}}-XXX-XXXX', tap: 'call' },
      { label: '卡务中心地址',  value: '主楼一层西侧 102 室', tap: 'navigate' },
    ],
  },
  {
    key: 'card-recharge',
    name: '校园卡充值',
    icon: '💳',
    accent: '#1976D2',
    accentBg: '#E3F2FD',
    summary: '校园卡充值支持线上 / 自助机 / 人工窗口三种方式，建议优先使用线上免排队。',
    steps: [
      '线上：进入「校园卡服务」小程序 → 在线充值 → 选择金额 → 完成支付',
      '自助机：教学楼、食堂门口均有校园卡自助充值机，支持微信/支付宝扫码',
      '人工窗口：主楼一层卡务中心，工作日 8:00-17:00 提供现金充值服务',
      '充值完成后在任意刷卡机贴近 2 秒，金额自动写入卡片',
    ],
    materials: [
      '校园卡',
      '微信/支付宝账户（线上 / 自助机）',
      '或现金（人工窗口）',
    ],
    faqs: [
      { q: '充值没到账怎么办？', a: '线上支付完成后 5 分钟内自动到账；超时可在订单页申请退款或联系卡务中心。' },
      { q: '单次充值有上限吗？', a: '线上单次最高 500 元，单日累计 2000 元；如需大额请联系卡务。' },
      { q: '可以转账给别人吗？', a: '不支持直接转账，但可在小程序里「卡卡转账」功能中转给同校同学。' },
    ],
    contacts: [
      { label: '充值客服',  value: '{{SCHOOL_AREA_CODE}}-XXX-4001', tap: 'call' },
      { label: '常见问题',  value: '校园卡服务 FAQ', tap: 'webview' },
    ],
  },
  {
    key: 'card-replace',
    name: '校园卡补办',
    icon: '🪪',
    accent: '#FB8C00',
    accentBg: '#FFF3E0',
    summary: '卡片损坏或遗失后补办，需要到卡务中心现场办理，工本费 20 元，30 分钟可取。',
    steps: [
      '先完成「校园卡挂失」（若未挂失）',
      '带齐材料到主楼一层卡务中心 102 室',
      '填写《校园卡补办申请表》，工作人员核对身份',
      '现场拍照制作新卡，工本费 20 元（支持微信/支付宝/现金）',
      '新卡当场可取，旧卡余额自动转入新卡',
    ],
    materials: [
      '本人身份证原件',
      '学生证 / 工作证（教职工）',
      '工本费 20 元',
      '若委托他人代办：代办人身份证 + 委托书',
    ],
    faqs: [
      { q: '多久能拿到新卡？', a: '常规补办现场 30 分钟内可取；寒暑假高峰期可能延后到次日。' },
      { q: '补办后门禁要重新授权吗？', a: '不需要。补办后新卡自动继承原卡的所有权限（门禁、图书、借阅等）。' },
      { q: '能加急吗？', a: '教职工因公遗失可申请加急，10 分钟内出卡，请向卡务说明情况。' },
    ],
    contacts: [
      { label: '卡务中心',  value: '{{SCHOOL_AREA_CODE}}-XXX-4002', tap: 'call' },
      { label: '办公时间',  value: '工作日 8:00-17:00', tap: '' },
    ],
  },
  {
    key: 'loan',
    name: '助学贷款',
    icon: '🏦',
    accent: '#00838F',
    accentBg: '#E0F7FA',
    summary: '家庭经济困难学生可申请生源地信用助学贷款或校园地助学贷款，每学年最高 16000 元。',
    steps: [
      '准备材料：身份证、户口本、家庭经济情况认定表（或低保证）',
      '登录「学生在线服务系统」https://www.csls.cdb.com.cn 完成预申请',
      '到户籍所在县（市、区）学生资助管理中心签订合同（生源地）',
      '或在学校学生处资助中心办理（校园地）',
      '贷款审批通过后，资金于开学前打入学校账户用于缴纳学费',
      '毕业前 5 年内开始还款，期限最长 20 年，在校期间利息由财政全额补贴',
    ],
    materials: [
      '本人身份证 + 户口本复印件',
      '家庭经济情况认定表 / 低保证 / 特困证明（如有）',
      '录取通知书 / 学生证',
      '共同借款人身份证（父母或法定监护人）',
    ],
    faqs: [
      { q: '贷款额度是多少？', a: '本专科生每学年最高 16000 元，研究生最高 20000 元，按学费 + 住宿费实际金额申请。' },
      { q: '会影响征信吗？', a: '正常还贷不产生影响；逾期会被记入央行征信系统，请务必按期还款。' },
      { q: '可以提前还款吗？', a: '可以。在校期间或毕业后随时可在学生在线系统申请提前还款，无违约金。' },
    ],
    contacts: [
      { label: '学校资助中心',  value: '{{SCHOOL_AREA_CODE}}-XXX-5001', tap: 'call' },
      { label: '国开行客服',    value: '95566', tap: 'call' },
    ],
  },
  {
    key: 'scholar',
    name: '助学奖金',
    icon: '🏅',
    accent: '#FFB300',
    accentBg: '#FFF8E1',
    summary: '国家奖学金、励志奖学金、校级奖学金、社会类助学金，一学年评审一次，无需还款。',
    steps: [
      '登录学校教务系统 / 智慧学工系统，查看本学期可申请的奖项列表',
      '选择符合条件（成绩 / 综测 / 志愿时长 / 科研等）的奖学金',
      '在线填写申请表，上传成绩单、证书、事迹材料等附件',
      '辅导员 / 班级 / 学院 / 学校四级评审，结果公示 5 个工作日',
      '公示无异议后奖金打入学生本人银行卡',
    ],
    materials: [
      '本人学号 / 校园卡',
      '上一学年成绩单（系统自动调取）',
      '获奖证书、论文、专利等佐证材料（如有）',
      '志愿服务 / 社会实践证明（如有）',
    ],
    faqs: [
      { q: '奖学金可以重复获得吗？', a: '国家奖学金与国家励志奖学金不可同年兼得；其他校级 / 院级奖学金按规定可叠加。' },
      { q: '挂科了能申请吗？', a: '原则上上一学年无不及格科目、无违纪处分方可申请。具体以当年通知为准。' },
      { q: '奖金什么时候发？', a: '一般在公示结束后 30 个工作日内一次性发放到学生银行卡。' },
    ],
    contacts: [
      { label: '学生处资助科',  value: '{{SCHOOL_AREA_CODE}}-XXX-5002', tap: 'call' },
      { label: '查看可申请奖项', value: '奖学金专题', tap: 'webview' },
    ],
  },
  {
    key: 'medical',
    name: '医疗报销',
    icon: '🏥',
    accent: '#E53935',
    accentBg: '#FCE4EC',
    summary: '在校期间因病或意外产生的医疗费用，符合医保政策部分可走学校或医保局报销流程。',
    steps: [
      '看病：首选校医院（直接报销 70%），转诊需校医院开具转诊单',
      '外诊：到医保定点医院就诊，保留所有票据、清单、病历',
      '准备材料：发票原件、费用清单、出院小结 / 病历、身份证复印件、银行卡',
      '每月 1-15 日提交到校医院医保办（学生服务中心 B203）',
      '审核通过后 15 个工作日内打款到学生本人银行卡',
    ],
    materials: [
      '医疗发票原件（电子发票可打印）',
      '费用明细清单',
      '病历 / 诊断证明 / 出院小结',
      '本人身份证正反面复印件',
      '本人银行卡复印件（标注开户行）',
      '转诊单（如系外诊）',
    ],
    faqs: [
      { q: '校内外都能报销吗？', a: '校医院直接结算；校外需校医院转诊。寒暑假异地就医需提前在医保局备案。' },
      { q: '门急诊能报多少？', a: '校内门急诊年度最高 1000 元 / 人；校外按医保目录比例报销。' },
      { q: '能代领吗？', a: '本人银行卡到账，无需代领；但提交材料可由班级医保联络员统一代办。' },
    ],
    contacts: [
      { label: '医保办公室',  value: '{{SCHOOL_AREA_CODE}}-XXX-6001', tap: 'call' },
      { label: '医保政策查询', value: '本地医保局', tap: 'webview' },
    ],
  },
  {
    key: 'cert-in-school',
    name: '在校证明',
    icon: '📄',
    accent: '#43A047',
    accentBg: '#E8F5E9',
    summary: '用于实习、签证、家庭用途证明本人在校就读。自助机可即时打印，带电子章。',
    steps: [
      '方法一（最快）：教学楼自助打印机，凭人脸识别 30 秒打印带电子章的证明',
      '方法二：登录智慧学工 / 教务系统 → 在校证明 → 自动生成 PDF → 下载打印',
      '方法三：到教务处 / 学生处窗口办理，工作日 1 个工作日出证',
      '国际用途需英文版，请到教务处窗口办理',
    ],
    materials: [
      '本人学号 / 一卡通',
      '用途说明（部分场景需要）',
    ],
    faqs: [
      { q: '电子版有法律效力吗？', a: '学校开具的电子证明带电子章，效力等同纸质；签证 / 出国建议彩色打印。' },
      { q: '能开多少份？', a: '自助机不限次数；窗口办理每学期免费 5 份。' },
      { q: '非本人可以代开吗？', a: '需本人到场（自助 / 窗口）；特殊情况可凭委托书 + 双方身份证代为办理。' },
    ],
    contacts: [
      { label: '教务处',  value: '{{SCHOOL_AREA_CODE}}-XXX-7001', tap: 'call' },
      { label: '自助机位置',  value: '各教学楼一层', tap: '' },
    ],
  },
  {
    key: 'cert-status',
    name: '学籍证明',
    icon: '🎓',
    accent: '#8E24AA',
    accentBg: '#F3E5F5',
    summary: '证明学生当前学籍状态、专业、入学 / 预计毕业时间，常用于政审、档案、申报。',
    steps: [
      '在线申请：教务系统 → 学籍管理 → 学籍证明申请',
      '选择用途 + 份数，提交后系统自动生成',
      '彩色打印或自助机现场打印，盖电子章',
      '如需学信网同步证明，登录学信网在线验证报告',
    ],
    materials: [
      '本人学号 / 一卡通',
      '身份证号',
    ],
    faqs: [
      { q: '学信网在线验证和学校学籍证明有区别吗？', a: '学信网侧重学历真实性的官方核验；学校证明侧重校内信息精确表述，可同时出具。' },
      { q: '休学期间能开吗？', a: '可以，开具时会注明当前学籍状态（休学 / 保留学籍）。' },
      { q: '需要中英文对照吗？', a: '出国用建议申请英文版，在教务处窗口办理，加盖学校英文公章。' },
    ],
    contacts: [
      { label: '教务处学籍科',  value: '{{SCHOOL_AREA_CODE}}-XXX-7002', tap: 'call' },
      { label: '学信网',        value: 'https://www.chsi.com.cn', tap: 'webview' },
    ],
  },
  {
    key: 'cert-transcript',
    name: '成绩证明',
    icon: '📊',
    accent: '#5E35B1',
    accentBg: '#EDE7F6',
    summary: '成绩单 / 加权平均分 / 排名证明。中文版自助机可打，英文版及排名证明到教务处窗口。',
    steps: [
      '自助打印：教学楼自助打印机 → 凭人脸识别 → 选择打印学期范围 → 即时出件',
      '申请英文版：教务系统 → 英文成绩单申请 → 缴费 10 元 → 3 工作日出件',
      '申请排名 / 加权均分：教务系统 → 学业成绩证明申请 → 提交后 1 工作日',
      '如需加盖公章：到教务处窗口在自助件上盖公章（当场可取）',
    ],
    materials: [
      '本人学号 / 一卡通',
      '身份证号（中英文版需要）',
    ],
    faqs: [
      { q: '加权平均分怎么算？', a: 'Σ(课程学分 × 成绩) ÷ Σ(课程学分)。所有课程包括必修 / 选修 / 体育。' },
      { q: '成绩单能修改吗？', a: '成绩记录一经归档不可修改；如有异议可依程序申请成绩复核。' },
      { q: '研究生成绩单在哪里打？', a: '研究生院自助打印机 / 研究生教务系统，流程一致。' },
    ],
    contacts: [
      { label: '教务处成绩科',  value: '{{SCHOOL_AREA_CODE}}-XXX-7003', tap: 'call' },
      { label: '自助机位置',    value: '行政楼 / 教学楼', tap: '' },
    ],
  },
  {
    key: 'photo-id',
    name: '证件照',
    icon: '📷',
    accent: '#00838F',
    accentBg: '#E0F7FA',
    summary: '一寸 / 两寸证件照自助拍摄，蓝白红三色背景，校内拍照点 5 分钟出片，支持电子版下载。',
    steps: [
      '找到校内证件照拍摄点（学生活动中心一层 / 食堂北门）',
      '选择规格：一寸 / 两寸 / 护照 / 驾照 等',
      '调整灯光后拍摄 3 张可选片，挑最佳一张',
      '5 分钟内出片 + 电子版（扫码下载）',
      '价格：一寸 12 元 / 两寸 15 元（含电子版）',
    ],
    materials: [
      '本人',
      '微信或支付宝',
    ],
    faqs: [
      { q: '考研 / 公务员能用吗？', a: '可以。本机器严格按 GB/T 15684-2012 标准拍摄，符合主流报考系统要求。' },
      { q: '可以美化吗？', a: '本机为合规证件照，不提供美颜；若有美化需求可去专业摄影机构后重做。' },
      { q: '电子版存在哪？', a: '可在拍摄机里扫码保存到微信；30 天后自动清理，请及时下载。' },
    ],
    contacts: [
      { label: '拍照点咨询',  value: '{{SCHOOL_AREA_CODE}}-XXX-8001', tap: 'call' },
      { label: '位置指引',    value: '校园地图 → 商业服务', tap: 'navigate' },
    ],
  },
  {
    key: 'reimburs',
    name: '财务报销',
    icon: '🧾',
    accent: '#FB8C00',
    accentBg: '#FFF3E0',
    summary: '学生科研、实习差旅、会议注册等经费报销指南。提交前请先确认项目经费账号。',
    steps: [
      '确认经费项目号（找指导老师 / 项目负责人）',
      '登录智慧财务系统 → 我的报销 → 新建报销单',
      '按模板填写：事由、金额、附件列表（发票 / 合同 / 行程单）',
      '选择审批流 → 提交（依次经项目负责人 / 学院 / 财务处审批）',
      '审批通过后 5-10 个工作日内打款到学生本人银行卡',
    ],
    materials: [
      '正规发票（抬头：{{SCHOOL_NAME}} + 税号）',
      '合同 / 协议（如适用）',
      '行程单 / 会议通知 / 邀请函',
      '本人学号 + 银行卡号',
    ],
    faqs: [
      { q: '什么发票能报？', a: '增值税普通发票 / 专用发票 / 火车票 / 飞机行程单 / 出租车电子发票。' },
      { q: '金额有限制吗？', a: '单笔 ≥ 1000 元需对公转账；< 1000 元可现金支付凭证报销。' },
      { q: '多久能到账？', a: '审批通过后 5-10 个工作日，跨月或寒暑假顺延。' },
    ],
    contacts: [
      { label: '财务处',  value: '{{SCHOOL_AREA_CODE}}-XXX-9001', tap: 'call' },
      { label: '智慧财务',  value: 'cwc.{{SCHOOL_EMAIL_DOMAIN}}', tap: 'webview' },
    ],
  },
  {
    key: 'admin',
    name: '行政办公',
    icon: '🗂️',
    accent: '#455A64',
    accentBg: '#ECEFF1',
    summary: 'OA 流程、会议预定、会议室申请、用印申请、文件归档等行政办公指引汇总。',
    steps: [
      '登录学校 OA 系统（统一身份认证单点登录）',
      '在「流程中心」选择对应申请类型（用印 / 用车 / 用房 / 报销 / 证明）',
      '填写表单 → 上传附件 → 选择审批人 → 提交',
      '审批全程系统消息通知，可在「我的申请」追踪进度',
      '审批通过后下载电子件或凭审批单到对应办公室领取',
    ],
    materials: [
      '一卡通 / 统一身份认证账号',
      '具体业务附件（合同 / 邀请函 / 证明材料等）',
      '金额 / 时间 / 地点等关键信息',
    ],
    faqs: [
      { q: '忘记 OA 密码怎么办？', a: 'OA 与统一身份认证打通；忘记密码可在 https://sso.{{SCHOOL_EMAIL_DOMAIN}} 重置。' },
      { q: '移动端能用吗？', a: '可以，下载「智慧校园」App 或在微信小程序中搜索「校园 OA」。' },
      { q: '紧急审批怎么办？', a: '标注「紧急」后系统会优先推送审批人；常规审批工作日 2 个工作日内完成。' },
    ],
    contacts: [
      { label: 'OA 客服',  value: '{{SCHOOL_AREA_CODE}}-XXX-9100', tap: 'call' },
      { label: 'OA 系统',  value: 'oa.{{SCHOOL_EMAIL_DOMAIN}}', tap: 'webview' },
    ],
  },
];

const WXSS = (key) => `/* pages/tools/${key}/${key}.wxss */

/* ===== 页面背景 ===== */
.page-tool {
  min-height: 100vh;
  background: #F5F5F7;
  position: relative;
}

/* ===== 自定义导航 ===== */
.tool-nav {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 200;
  background: #FFFFFF;
  border-bottom: 1rpx solid rgba(0,0,0,.06);
}
.tool-nav-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16rpx;
}
.nav-back {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding-left: 8rpx;
}
.nav-back-arrow {
  font-size: 48rpx;
  color: #1C1C1E;
  line-height: 1;
  font-weight: 300;
}
.nav-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #1C1C1E;
}
.nav-placeholder {
  width: 64rpx;
}

.tool-scroll {
  position: fixed;
  left: 0; right: 0; bottom: 0;
  z-index: 1;
}

/* ===== Hero ===== */
.tool-hero {
  margin: 28rpx 24rpx 0;
  padding: 36rpx 32rpx;
  border-radius: 28rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
  box-shadow: 0 4rpx 24rpx rgba(0,0,0,.04);
}
.tool-hero-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 56rpx;
  flex-shrink: 0;
}
.tool-hero-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.tool-hero-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #1C1C1E;
}
.tool-hero-sub {
  font-size: 26rpx;
  color: #5C5C60;
  line-height: 1.5;
}

/* ===== 通用 section ===== */
.tool-section {
  margin: 32rpx 24rpx 0;
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 8rpx 28rpx;
  box-shadow: 0 4rpx 24rpx rgba(0,0,0,.04);
}
.tool-section-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #1C1C1E;
  padding: 28rpx 0 16rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.tool-section-title::before {
  content: '';
  width: 8rpx;
  height: 28rpx;
  background: #FF9500;
  border-radius: 4rpx;
}

/* ===== 步骤列表 ===== */
.step-item {
  display: flex;
  gap: 20rpx;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #F2F2F7;
}
.step-item:last-child {
  border-bottom: none;
}
.step-num {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: #FF9500;
  color: #FFFFFF;
  font-size: 24rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.step-text {
  flex: 1;
  font-size: 28rpx;
  color: #1C1C1E;
  line-height: 1.6;
  padding-top: 4rpx;
}

/* ===== 材料列表 ===== */
.material-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 18rpx 0;
  border-bottom: 1rpx solid #F2F2F7;
  font-size: 28rpx;
  color: #1C1C1E;
}
.material-item:last-child {
  border-bottom: none;
}
.material-bullet {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: #FF9500;
  flex-shrink: 0;
}

/* ===== FAQ 折叠 ===== */
.faq-item {
  border-bottom: 1rpx solid #F2F2F7;
}
.faq-item:last-child {
  border-bottom: none;
}
.faq-q {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 0;
  font-size: 28rpx;
  font-weight: 600;
  color: #1C1C1E;
}
.faq-arrow {
  font-size: 32rpx;
  color: #8E8E93;
  font-weight: 300;
  transition: transform .2s;
}
.faq-item.open .faq-arrow {
  transform: rotate(90deg);
}
.faq-a {
  font-size: 26rpx;
  color: #5C5C60;
  line-height: 1.6;
  padding-bottom: 28rpx;
}

/* ===== 联系方式按钮组 ===== */
.contact-list {
  margin: 32rpx 24rpx 0;
}
.contact-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 28rpx 32rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 4rpx 24rpx rgba(0,0,0,.04);
}
.contact-item:active {
  background: #F8F8FA;
}
.contact-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.contact-label {
  font-size: 24rpx;
  color: #8E8E93;
}
.contact-value {
  font-size: 30rpx;
  color: #1C1C1E;
  font-weight: 600;
}
.contact-action {
  font-size: 26rpx;
  color: #FFFFFF;
  background: #FF9500;
  padding: 12rpx 28rpx;
  border-radius: 999rpx;
  font-weight: 600;
  flex-shrink: 0;
}
.contact-item.info .contact-action {
  background: #C7C7CC;
}

/* ===== 底部 ===== */
.tool-footer {
  text-align: center;
  padding: 40rpx 24rpx;
}
.tool-footer text {
  font-size: 24rpx;
  color: #C7C7CC;
}
.bottom-safe {
  height: calc(40rpx + constant(safe-area-inset-bottom));
  height: calc(40rpx + env(safe-area-inset-bottom));
}

/* tap 反馈 */
.tap-shrink:active {
  transform: scale(0.97);
  opacity: .85;
}
`;

const WXML = (cfg) => `<!-- pages/tools/${cfg.key}/${cfg.key}.wxml — ${cfg.name} -->
<view class="page-tool">

  <!-- 自定义导航栏 -->
  <view class="tool-nav" style="padding-top:{{statusBarHeight}}px;">
    <view class="tool-nav-inner" style="height:88rpx;">
      <view class="nav-back tap-shrink" bindtap="goBack">
        <text class="nav-back-arrow">‹</text>
      </view>
      <text class="nav-title">${cfg.name}</text>
      <view class="nav-placeholder"></view>
    </view>
  </view>

  <scroll-view class="tool-scroll" scroll-y enhanced show-scrollbar="{{false}}" style="top:{{statusBarHeight + 88}}px;">

    <!-- Hero -->
    <view class="tool-hero" style="background:{{accentBg}};">
      <view class="tool-hero-icon" style="background:#FFFFFF;">${cfg.icon}</view>
      <view class="tool-hero-info">
        <text class="tool-hero-title">${cfg.name}</text>
        <text class="tool-hero-sub">${cfg.summary}</text>
      </view>
    </view>

    <!-- 办理流程 -->
    <view class="tool-section">
      <view class="tool-section-title">办理流程</view>
      <block wx:for="{{steps}}" wx:key="*this">
        <view class="step-item">
          <view class="step-num">{{index + 1}}</view>
          <text class="step-text">{{item}}</text>
        </view>
      </block>
    </view>

    <!-- 所需材料 -->
    <view class="tool-section">
      <view class="tool-section-title">所需材料</view>
      <block wx:for="{{materials}}" wx:key="*this">
        <view class="material-item">
          <view class="material-bullet"></view>
          <text>{{item}}</text>
        </view>
      </block>
    </view>

    <!-- 常见问题 -->
    <view class="tool-section">
      <view class="tool-section-title">常见问题</view>
      <view
        wx:for="{{faqs}}"
        wx:for-item="faq"
        wx:key="q"
        class="faq-item {{faq.open ? 'open' : ''}}"
        data-index="{{index}}"
        bindtap="onFaqToggle"
      >
        <view class="faq-q">
          <text>{{faq.q}}</text>
          <text class="faq-arrow">›</text>
        </view>
        <view class="faq-a" wx:if="{{faq.open}}">{{faq.a}}</view>
      </view>
    </view>

    <!-- 联系 / 网点 -->
    <view class="contact-list">
      <view
        wx:for="{{contacts}}"
        wx:key="label"
        class="contact-item tap-shrink {{item.tap === '' ? 'info' : ''}}"
        data-tap="{{item.tap}}"
        data-value="{{item.value}}"
        bindtap="onContactTap"
      >
        <view class="contact-info">
          <text class="contact-label">{{item.label}}</text>
          <text class="contact-value">{{item.value}}</text>
        </view>
        <view class="contact-action">{{item.tap === 'call' ? '拨打' : (item.tap === 'navigate' ? '导航' : (item.tap === 'webview' ? '访问' : '查看'))}}</view>
      </view>
    </view>

    <!-- 底部 -->
    <view class="tool-footer">
      <text>有信息更新？欢迎点底部反馈告诉我们 · {{SCHOOL_NAME}}</text>
    </view>
    <view class="bottom-safe"></view>
  </scroll-view>
</view>
`;

const JS = (cfg) => `// pages/tools/${cfg.key}/${cfg.key}.js — ${cfg.name}
const app = getApp();

Page({
  data: {
    statusBarHeight: 44,
    navBarHeight: 88,
    accent: '${cfg.accent}',
    accentBg: '${cfg.accentBg}',
    steps: ${JSON_STR(cfg.steps)},
    materials: ${JSON_STR(cfg.materials)},
    faqs: ${JSON_STR(cfg.faqs.map(f => ({ q: f.q, a: f.a, open: false })))},
    contacts: ${JSON_STR(cfg.contacts)},
  },

  onLoad() {
    const win = wx.getWindowInfo();
    this.setData({
      statusBarHeight: win.statusBarHeight || 44,
      navBarHeight: (win.statusBarHeight || 44) + 44,
    });
  },

  goBack() { wx.navigateBack(); },

  onFaqToggle(e) {
    const { index } = e.currentTarget.dataset;
    const faqs = (this.data.faqs || []).map((f, i) => ({ ...f, open: i === index ? !f.open : f.open }));
    this.setData({ faqs });
  },

  onContactTap(e) {
    const { tap, value } = e.currentTarget.dataset;
    if (tap === 'call') {
      const phone = String(value || '').replace(/[^0-9-]/g, '').split('-')[0];
      if (phone) {
        wx.makePhoneCall({ phoneNumber: phone, fail: () => wx.showToast({ title: '拨号失败', icon: 'none' }) });
      }
    } else if (tap === 'navigate') {
      wx.showToast({ title: '地图导航即将上线', icon: 'none' });
    } else if (tap === 'webview') {
      wx.showToast({ title: '外链跳转即将上线', icon: 'none' });
    } else {
      wx.showToast({ title: value || '查看详情', icon: 'none' });
    }
  },
});

function JSON_STR(o) { return JSON.stringify(o, null, 2); }
`;

// 修复：JS 模板里我用了 JSON_STR 工具，但可能出问题，直接标准 JSON.stringify 即可
function JSv2(cfg) {
  const faqs = cfg.faqs.map(f => ({ q: f.q, a: f.a, open: false }));
  return `// pages/tools/${cfg.key}/${cfg.key}.js — ${cfg.name}
const app = getApp();

Page({
  data: {
    statusBarHeight: 44,
    navBarHeight: 88,
    accent: '${cfg.accent}',
    accentBg: '${cfg.accentBg}',
    steps: ${JSON.stringify(cfg.steps, null, 2)},
    materials: ${JSON.stringify(cfg.materials, null, 2)},
    faqs: ${JSON.stringify(faqs, null, 2)},
    contacts: ${JSON.stringify(cfg.contacts, null, 2)},
  },

  onLoad() {
    const win = wx.getWindowInfo();
    this.setData({
      statusBarHeight: win.statusBarHeight || 44,
      navBarHeight: (win.statusBarHeight || 44) + 44,
    });
  },

  goBack() { wx.navigateBack(); },

  onFaqToggle(e) {
    const { index } = e.currentTarget.dataset;
    const faqs = (this.data.faqs || []).map((f, i) => ({ ...f, open: i === index ? !f.open : f.open }));
    this.setData({ faqs });
  },

  onContactTap(e) {
    const { tap, value } = e.currentTarget.dataset;
    if (tap === 'call') {
      const phone = String(value || '').replace(/[^0-9-]/g, '').split('-')[0];
      if (phone) {
        wx.makePhoneCall({ phoneNumber: phone, fail: () => wx.showToast({ title: '拨号失败', icon: 'none' }) });
      }
    } else if (tap === 'navigate') {
      wx.showToast({ title: '地图导航即将上线', icon: 'none' });
    } else if (tap === 'webview') {
      wx.showToast({ title: '外链跳转即将上线', icon: 'none' });
    } else {
      wx.showToast({ title: value || '查看详情', icon: 'none' });
    }
  },
});
`;
}

function JSON_STR(o) { return JSON.stringify(o, null, 2); }

// 生成文件（四件套同名：xxx.json / xxx.wxml / xxx.wxss / xxx.js）
PAGES.forEach((cfg) => {
  const dir = path.join(BASE, 'tools', cfg.key);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, cfg.key + '.json'),  `{"navigationStyle":"custom","usingComponents":{}}\n`);
  fs.writeFileSync(path.join(dir, cfg.key + '.wxml'), WXML(cfg));
  fs.writeFileSync(path.join(dir, cfg.key + '.wxss'), WXSS(cfg.key));
  fs.writeFileSync(path.join(dir, cfg.key + '.js'),    JSv2(cfg));
  console.log('OK ' + cfg.key);
});

console.log('\\n完成 ' + PAGES.length + ' 个指南类页面');
