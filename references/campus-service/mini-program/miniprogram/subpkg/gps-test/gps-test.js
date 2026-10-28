// gps-test.js — 隐私授权全链路诊断工具
Page({
  data: {
    checks: [],
    running: false,
    summary: '',
  },

  async runAll() {
    this.setData({ running: true, checks: [], summary: '诊断中...' });
    const results = [];

    // ① 系统信息
    try {
      const info = wx.getSystemInfoSync();
      results.push({
        label: '① 系统环境',
        detail: `${info.platform} | 基础库 ${info.SDKVersion} | 微信 ${info.version}`,
        ok: true,
      });
    } catch (e) {
      results.push({ label: '① 系统环境', detail: '获取失败', ok: false });
    }

    // ② 隐私设置状态（服务器端）
    results.push(await this.checkPrivacySetting());

    // ③ app.json 配置
    results.push(await this.checkAppConfig());

    // ④ 权限授权状态
    results.push(await this.checkAuthSetting());

    // ⑤ 尝试 wx.authorize（隐私后的 scope 授权）
    results.push(await this.checkAuthorize());

    // ⑥ 尝试 wx.getLocation
    results.push(await this.checkGetLocation());

    // ⑦ 设置页检查
    results.push(await this.checkOpenSetting());

    // 汇总
    const failCount = results.filter(r => !r.ok).length;
    const summary = failCount === 0
      ? '✅ 全部检查通过，定位应该可以正常工作'
      : `❌ ${failCount}/${results.length} 项未通过，详见下方`;

    this.setData({ checks: results, running: false, summary });
  },

  // ② 隐私设置
  checkPrivacySetting() {
    return new Promise(resolve => {
      if (!wx.getPrivacySetting) {
        resolve({ label: '② 隐私设置 (wx.getPrivacySetting)', detail: '⚠️ 此基础库不支持该API', ok: false, hint: '基础库版本过低' });
        return;
      }
      wx.getPrivacySetting({
        success: res => {
          const needAuth = res.needAuthorization;
          const name = res.privacyContractName || '(空)';
          if (needAuth && name !== '(空)') {
            resolve({ label: '② 隐私设置', detail: `✅ needAuthorization=true, 协议: ${name}`, ok: true });
          } else if (needAuth) {
            resolve({ label: '② 隐私设置', detail: `⚠️ needAuthorization=true 但协议名为空`, ok: false, hint: '后台隐私协议未发布或未关联' });
          } else {
            resolve({ label: '② 隐私设置', detail: `⚠️ needAuthorization=false, 协议: ${name}`, ok: false, hint: '隐私协议未生效，检查后台发布状态' });
          }
        },
        fail: err => {
          resolve({ label: '② 隐私设置', detail: `❌ 查询失败: ${JSON.stringify(err)}`, ok: false });
        }
      });
    });
  },

  // ③ app.json 配置
  checkAppConfig() {
    return new Promise(resolve => {
      try {
        const accountInfo = wx.getAccountInfoSync ? wx.getAccountInfoSync() : null;
        const miniProgram = accountInfo?.miniProgram || {};
        resolve({
          label: '③ 小程序信息',
          detail: `appId: ${miniProgram.appId || '(无法获取)'} | env: ${miniProgram.envVersion || '?'}`,
          ok: !!miniProgram.appId,
          hint: !miniProgram.appId ? '无法获取小程序信息' : (miniProgram.envVersion === 'develop' ? '当前为开发版' : miniProgram.envVersion === 'trial' ? '当前为体验版' : '当前为正式版'),
        });
      } catch (e) {
        resolve({ label: '③ 小程序信息', detail: `获取失败: ${e.message}`, ok: false });
      }
    });
  },

  // ④ 授权状态
  checkAuthSetting() {
    return new Promise(resolve => {
      wx.getSetting({
        success: res => {
          const auth = res.authSetting || {};
          const locationAuth = auth['scope.userLocation'];
          const keys = Object.keys(auth).filter(k => auth[k]).join(', ') || '(无已授权项)';
          if (locationAuth) {
            resolve({ label: '④ 授权状态 (scope.userLocation)', detail: `✅ 已授权 | 所有授权: ${keys}`, ok: true });
          } else {
            resolve({ label: '④ 授权状态 (scope.userLocation)', detail: `❌ 未授权 | 所有授权: ${keys}`, ok: false, hint: '定位权限未授予，需通过授权流程获取' });
          }
        },
        fail: err => {
          resolve({ label: '④ 授权状态', detail: `❌ 查询失败: ${JSON.stringify(err)}`, ok: false });
        }
      });
    });
  },

  // ⑤ wx.authorize
  checkAuthorize() {
    return new Promise(resolve => {
      wx.authorize({
        scope: 'scope.userLocation',
        success: () => {
          resolve({ label: '⑤ wx.authorize(scope.userLocation)', detail: '✅ 授权成功（系统弹窗已弹出并同意）', ok: true });
        },
        fail: err => {
          const errMsg = err.errMsg || '';
          const errno = err.errno || 0;
          let hint = '';
          if (errMsg.includes('auth deny')) {
            hint = '用户拒绝了授权';
          } else if (errno === 104 || errMsg.includes('104')) {
            hint = 'errno 104: 隐私授权未完成或 buttonId 不匹配';
          } else if (errno === 112 || errMsg.includes('112')) {
            hint = 'errno 112: 系统未弹出定位对话框（可能是隐私授权未通过）';
          } else {
            hint = `errno ${errno || '?'}`;
          }
          resolve({ label: '⑤ wx.authorize(scope.userLocation)', detail: `❌ 失败: ${errMsg}`, ok: false, hint });
        }
      });
    });
  },

  // ⑥ wx.getLocation
  checkGetLocation() {
    return new Promise(resolve => {
      wx.getLocation({
        type: 'gcj02',
        success: res => {
          resolve({ label: '⑥ wx.getLocation', detail: `✅ 成功! lat=${res.latitude.toFixed(6)}, lng=${res.longitude.toFixed(6)}`, ok: true });
        },
        fail: err => {
          resolve({ label: '⑥ wx.getLocation', detail: `❌ 失败: ${(err.errMsg || '')} (errno=${err.errno || 0})`, ok: false, hint: '定位获取失败' });
        }
      });
    });
  },

  // ⑦ 打开设置页
  checkOpenSetting() {
    return new Promise(resolve => {
      wx.getSetting({
        success: res => {
          const auth = res.authSetting || {};
          const hasLocation = 'scope.userLocation' in auth;
          resolve({
            label: '⑦ 设置页状态',
            detail: hasLocation
              ? `✅ 设置页中存在"位置信息"选项 (当前=${auth['scope.userLocation'] ? '已开启' : '已关闭'})`
              : '⚠️ 设置页中无"位置信息"选项（权限未注册到系统）',
            ok: hasLocation,
            hint: hasLocation ? '' : '设置页缺少定位选项 = 微信未为此小程序注册定位权限 → 检查后台隐私配置 + requiredPrivateInfos',
          });
        },
        fail: err => {
          resolve({ label: '⑦ 设置页状态', detail: `查询失败: ${JSON.stringify(err)}`, ok: false });
        }
      });
    });
  },

  // 手动打开设置页
  openSetting() {
    wx.openSetting({
      success: res => {
        console.log('openSetting 返回:', res.authSetting);
        wx.showToast({ title: '已打开设置页', icon: 'success' });
      }
    });
  },

  // 清除所有授权（用于重置测试）
  clearAuth() {
    wx.openSetting({
      success: () => {
        wx.showToast({ title: '请在设置页手动关闭权限后返回', icon: 'none', duration: 3000 });
      }
    });
  }
});
