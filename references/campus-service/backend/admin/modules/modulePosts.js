// modules/modulePosts.js — 模块帖子管理（分模块Tab切换）
import { api } from '../api.js';
import { esc, fmt, emptyRow, renderPg } from '../utils.js';

const MODULES = [
  { id:'carpool', label:'拼车出行', icon:'🚗' },
  { id:'express', label:'快递代取', icon:'📦' },
  { id:'task', label:'万能任务', icon:'🎯' },
  { id:'lost', label:'失物招领', icon:'🔍' },
  { id:'forum', label:'校园论坛', icon:'💬' },
  { id:'secondhand', label:'二手市集', icon:'🔄' },
  { id:'rental', label:'物品短租', icon:'🏠' },
  { id:'substitute', label:'代课', icon:'📚' },
  { id:'print', label:'打印跑腿', icon:'🖨️' },
  { id:'yellowpage', label:'校园黄页', icon:'📒' },
  { id:'charity', label:'爱心公益', icon:'❤️' },
  { id:'parttime', label:'兼职专区', icon:'💼' },
];

let mpP = 1, mpModule = '';
window.loadModulePosts = loadModulePosts;

// 渲染模块Tab
export function renderModuleTabs() {
  const el = document.getElementById('mpTabs');
  if (!el) return;
  el.innerHTML = `<button class="mp-tab ${mpModule===''?'active':''}" onclick="selectModule('')">📋 全部</button>` +
    MODULES.map(m => `<button class="mp-tab ${mpModule===m.id?'active':''}" onclick="selectModule('${m.id}')">${m.icon} ${m.label}</button>`).join('');
}

window.selectModule = function(mod) {
  mpModule = mod; mpP = 1;
  document.querySelectorAll('.mp-tab').forEach(el => el.classList.toggle('active', el.dataset.mod === mod));
  renderModuleTabs();
  loadModulePosts(1);
};

export async function loadModulePosts(page) {
  mpP = page || mpP;
  const mpKW = document.getElementById("mpSearch").value.trim();
  const st = document.getElementById('mpStatus').value;

  // 拼车模块走独立 API
  if (mpModule === 'carpool') {
    let url = `/api/admin/carpools?page=${mpP}&pageSize=15`;
    if (mpKW) url += '&keyword=' + encodeURIComponent(mpKW);
    if (st) url += '&status=' + st;
    const res = await api('GET', url);
    const d = res.data || {}; const list = d.list || [];
    document.getElementById('mpHead').innerHTML = '<tr><th>路线</th><th>类型</th><th>发布者</th><th>人数</th><th>状态</th><th>出发时间</th><th>操作</th></tr>';
    document.getElementById('mpBody').innerHTML = list.map(c => {
      const from = typeof c.from === 'string' ? c.from : (c.from?.name || c.from?.city || '-');
      const to = typeof c.to === 'string' ? c.to : (c.to?.name || c.to?.city || '-');
      const typeLabel = c.type === 'offer' ? '有空位' : '找同行';
      const pub = c.creator?.nickName || c.userId?.nickName || '-';
      const joinedCount = (c.participants || []).filter(p => p.status === 'joined').length;
      const ppl = `${joinedCount}/${c.totalSeats || c.maxPassengers || '?'}`;
      const auditSt = c.auditStatus || 'approved';
      const auditBadge = auditSt === 'pending' ? '<span class="bs pending">待审核</span>' : auditSt === 'rejected' ? '<span class="bs rejected">已拒绝</span>' : '';
      const statusLabel = c.status === 'active' ? '活跃' : c.status === 'ended' ? '已结束' : c.status === 'cancelled' ? '已取消' : (c.status || '活跃');
      return `<tr><td>${esc(from)} → ${esc(to)}</td><td>${typeLabel}</td><td>${esc(pub)}</td><td>${ppl}</td>
        <td><span class="bs ${c.status||'active'}">${statusLabel}</span> ${auditBadge}</td>
        <td>${fmt(c.departureTime)}</td>
        <td>${auditSt==='pending'?`<button class="ab s" onclick="auditCarpool('${c._id}')">审核</button>`:''}
        <button class="ab d" onclick="takedownModule('${c._id}')">下架</button>
        <button class="ab" onclick="viewCarpoolDetail('${c._id}')">详情</button></td></tr>`;
    }).join('') || emptyRow(7);
    renderPg('mpPg', d.totalPages||1, mpP, loadModulePosts);
    return;
  }

  // 普通模块走统一 API
  const showModuleCol = !mpModule;
  let url = `/api/admin/modules?page=${mpP}&pageSize=15`;
  if (mpModule) url += '&module=' + mpModule;
  if (mpKW) url += '&keyword=' + encodeURIComponent(mpKW);
  if (st) url += '&status=' + st;
  const res = await api('GET', url);
  const d = res.data || {}; const list = d.list || [];

  // 渲染表头 - 根据是否全局视图调整列
  const theadHtml = showModuleCol
    ? '<tr><th>模块</th><th>标题</th><th>发布者</th><th>状态</th><th>数据</th><th>发布时间</th><th>操作</th></tr>'
    : '<tr><th>标题</th><th>类型</th><th>发布者</th><th>价格</th><th>状态</th><th>数据</th><th>发布时间</th><th>操作</th></tr>';
  document.getElementById('mpHead').innerHTML = theadHtml;

  document.getElementById('mpBody').innerHTML = list.map(p => {
    const modLabel = MODULES.find(m => m.id === p.module);
    const icon = modLabel ? modLabel.icon : '';
    const label = modLabel ? modLabel.label : p.module;
    const statusLabel = { active:'活跃', completed:'已完成', cancelled:'已下架', closed:'已关闭' }[p.status] || p.status;
    const title = p.title || (p.content||'').substring(0, 30) || '无标题';
    const typeLabel = p.type || '-';
    const price = p.price !== undefined && p.price !== null ? '¥' + p.price : '-';
    const modCell = showModuleCol ? `<td><span class="tag">${icon} ${label}</span></td>` : '';

    return `<tr>
      ${modCell}
      <td>${esc(title)}</td>
      ${!showModuleCol ? `<td>${esc(typeLabel)}</td>` : ''}
      <td>${esc(p.creator?.nickName||'-')}</td>
      ${!showModuleCol ? `<td>${price}</td>` : ''}
      <td><span class="bs ${p.status||'active'}">${statusLabel}</span></td>
      <td style="font-size:12px">👁${p.viewCount||0} 💬${p.replyCount||0} ⭐${p.favoriteCount||0}</td>
      <td>${fmt(p.createTime)}</td>
      <td>
        <button class="ab" onclick="viewModulePost('${p.id}')">详情</button>
        <button class="ab d" onclick="takedownModulePost('${p.id}')">下架</button>
      </td></tr>`;
  }).join('') || emptyRow(showModuleCol ? 7 : 8);
  renderPg('mpPg', d.totalPages||1, mpP, loadModulePosts);
}

// 查看帖子详情（增强版）
window.viewModulePost = async function(id) {
  const res = await api('GET', `/api/admin/modules/${id}`);
  if (!res.success) { window.toast(res.message||'获取失败', 'error'); return; }
  const p = res.data || {};
  const modInfo = MODULES.find(m => m.id === p.module);
  const modLabel = modInfo ? modInfo.label : p.module;
  const modIcon = modInfo ? modInfo.icon : '';

  const imagesHtml = (p.images||[]).length > 0
    ? `<div class="dr"><span class="dl">图片(${p.images.length})</span><span class="dv">${p.images.map(img => `<img src="${esc(img)}" style="max-width:120px;max-height:120px;border-radius:6px;margin:4px;border:1px solid var(--bd)">`).join('')}</span></div>`
    : '';
  const extraHtml = Object.keys(p.extra||{}).length > 0
    ? `<div class="dr"><span class="dl">扩展信息</span><span class="dv" style="white-space:pre-wrap;font-size:12px;color:var(--t2)">${esc(JSON.stringify(p.extra, null, 2))}</span></div>`
    : '';
  const repliesHtml = (p.replies||[]).length > 0
    ? `<div style="margin-top:16px;border-top:1px solid var(--bd);padding-top:12px"><strong>回复列表 (${p.replies.length})：</strong>${p.replies.map(r => `<div style="padding:8px 0;border-bottom:1px solid var(--bd);font-size:13px"><span style="color:var(--acc);font-weight:500">${esc(r.user?.nickName||'用户')}</span><span style="color:var(--t3);font-size:11px;margin-left:8px">${fmt(r.createTime)}</span>${r.isDeleted?' <span style="color:var(--r);font-size:11px">已删除</span>':''}<div style="margin-top:4px;color:var(--t2)">${esc(r.content)}</div></div>`).join('')}</div>`
    : '';

  // 发布者操作按钮
  const creatorId = p.creator?.id;
  const creatorActions = creatorId ? `<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--bd)">
    <button class="ab" onclick="switchPage('users');setTimeout(()=>{document.getElementById('userSearch').value='${creatorId}';loadUsers(1)},300);closeModal()">查看用户</button>
    <button class="ab d" onclick="takedownModulePost('${p.id}');closeModal()">下架此帖</button>
  </div>` : '';

  window.showModal(`${modIcon} ${modLabel} - 帖子详情`,
    `<div style="max-height:70vh;overflow-y:auto">
    <div class="dr"><span class="dl">模块</span><span class="dv"><span class="tag">${modIcon} ${modLabel}</span></span></div>
    <div class="dr"><span class="dl">标题</span><span class="dv">${esc(p.title||'无标题')}</span></div>
    <div class="dr"><span class="dl">内容</span><span class="dv" style="max-height:200px;overflow-y:auto;white-space:pre-wrap;background:var(--bg-i);padding:12px;border-radius:6px">${esc(p.content||'')}</span></div>
    <div class="dr"><span class="dl">类型</span><span class="dv">${esc(p.type||'-')}</span></div>
    <div class="dr"><span class="dl">价格</span><span class="dv">${p.price!==undefined&&p.price!==null?'¥'+p.price:'未设置'}</span></div>
    <div class="dr"><span class="dl">联系方式</span><span class="dv">${esc(p.contact||'未提供')}</span></div>
    <div class="dr"><span class="dl">状态</span><span class="dv"><span class="bs ${p.status||'active'}">${p.status||'-'}</span></span></div>
    <div class="dr"><span class="dl">发布者</span><span class="dv">${esc(p.creator?.nickName||'-')} (${esc(p.creator?.school||'')} · 信用${p.creator?.creditScore||0})</span></div>
    <div class="dr"><span class="dl">标签</span><span class="dv">${esc((p.tags||[]).join(', ')||'无')}</span></div>
    <div class="dr"><span class="dl">浏览量</span><span class="dv">${p.viewCount||0}</span></div>
    <div class="dr"><span class="dl">回复/收藏</span><span class="dv">${p.replyCount||0} / ${p.favoriteCount||0}</span></div>
    <div class="dr"><span class="dl">发布时间</span><span class="dv">${fmt(p.createTime)}</span></div>
    <div class="dr"><span class="dl">更新时间</span><span class="dv">${fmt(p.updateTime)}</span></div>
    ${imagesHtml}
    ${extraHtml}
    ${repliesHtml}
    ${creatorActions}
    </div>`);
};

window.takedownModulePost = async function(id) {
  const reason = prompt('下架原因：');
  if (reason === null) return;
  const res = await api('PUT', `/api/admin/modules/${id}/takedown`, { reason: reason || '管理员操作' });
  if (res.success) { window.toast('已下架', 'success'); loadModulePosts(); }
  else window.toast(res.message || '操作失败', 'error');
};

// ========== 拼车管理专用（嵌入模块帖子页面） ==========

window.auditCarpool = async function(id) {
  const action = confirm('确认通过该拼车？\n点"取消"则拒绝') ? 'approve' : 'reject';
  const reason = action === 'reject' ? prompt('拒绝原因：') : '';
  if (reason === null) return;
  const res = await api('PUT', `/api/admin/carpools/${id}/audit`, { action, reason: reason || '' });
  if (res.success) { window.toast(action === 'approve' ? '已通过' : '已拒绝', 'success'); loadModulePosts(); }
  else window.toast(res.message || '操作失败', 'error');
};

window.takedownModule = async function(id) {
  const reason = prompt('下架原因：');
  if (reason === null) return;
  if (mpModule === 'carpool') {
    const res = await api('PUT', `/api/admin/carpools/${id}/takedown`, { reason: reason || '' });
    if (res.success) { window.toast('已下架', 'success'); loadModulePosts(); }
    else window.toast(res.message || '操作失败', 'error');
  } else {
    const res = await api('PUT', `/api/admin/modules/${id}/takedown`, { reason: reason || '管理员操作' });
    if (res.success) { window.toast('已下架', 'success'); loadModulePosts(); }
    else window.toast(res.message || '操作失败', 'error');
  }
};

window.viewCarpoolDetail = async function(id) {
  const res = await api('GET', `/api/admin/carpools/${id}`);
  const c = res.data || {};
  const from = typeof c.from === 'string' ? c.from : (c.from?.name || c.from?.city || '-');
  const to = typeof c.to === 'string' ? c.to : (c.to?.name || c.to?.city || '-');
  const pub = c.creator?.nickName || c.userId?.nickName || '-';
  const joinedCount = (c.participants || []).filter(p => p.status === 'joined').length;
  const ppl = `${joinedCount}/${c.totalSeats || c.maxPassengers || '?'}`;
  const participantList = (c.participants || []).map(p =>
    `<div class="dr"><span class="dl">参与者</span><span class="dv">${esc(p.nickName||'-')} (${esc(p.status||'joined')}) 联系方式: ${esc(p.contact||'未提供')}</span></div>`
  ).join('');
  window.showModal('拼车详情', `
    <div class="dr"><span class="dl">路线</span><span class="dv">${esc(from)} → ${esc(to)}</span></div>
    <div class="dr"><span class="dl">类型</span><span class="dv">${c.type==='offer'?'有空位':'找同行'}</span></div>
    <div class="dr"><span class="dl">发布者</span><span class="dv">${esc(pub)}</span></div>
    <div class="dr"><span class="dl">出发时间</span><span class="dv">${fmt(c.departureTime)}</span></div>
    <div class="dr"><span class="dl">人数</span><span class="dv">${ppl}</span></div>
    <div class="dr"><span class="dl">剩余座位</span><span class="dv">${c.remainSeats ?? '-'}</span></div>
    <div class="dr"><span class="dl">状态</span><span class="dv">${c.status||'-'}</span></div>
    <div class="dr"><span class="dl">审核</span><span class="dv">${c.auditStatus||'approved'}</span></div>
    <div class="dr"><span class="dl">举报</span><span class="dv">${c.isReported?'是':'否'}</span></div>
    <div class="dr"><span class="dl">联系方式</span><span class="dv">${esc(c.contact||'-')}</span></div>
    <div class="dr"><span class="dl">备注</span><span class="dv">${esc(c.note||'无')}</span></div>
    <div class="dr"><span class="dl">标签</span><span class="dv">${esc((c.tags||[]).join(', ')||'无')}</span></div>
    <div class="dr"><span class="dl">创建时间</span><span class="dv">${fmt(c.createTime)}</span></div>
    ${participantList}`);
};
