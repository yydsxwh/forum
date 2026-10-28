// modules/carpools.js — 拼车管理
import { api } from '../api.js';
import { esc, fmt, emptyRow, renderPg } from '../utils.js';

let carpoolP = 1;
window.loadCarpools = loadCarpools;

export async function loadCarpools(page) {
  carpoolP = page || carpoolP;
  const carKW = document.getElementById("carpoolSearch").value.trim();
  const st = document.getElementById('carpoolStatus').value;
  const tp = document.getElementById('carpoolType').value;
  let url = `/api/admin/carpools?page=${carpoolP}&pageSize=15`;
  if (carKW) url += '&keyword=' + encodeURIComponent(carKW);
  if (st) url += '&status=' + st;
  if (tp) url += '&type=' + tp;
  const res = await api('GET', url);
  const d = res.data || {}; const list = d.list || [];
  document.getElementById('carpoolBody').innerHTML = list.map(c => {
    const from = typeof c.from === 'string' ? c.from : (c.from?.name || c.from?.city || '-');
    const to = typeof c.to === 'string' ? c.to : (c.to?.name || c.to?.city || '-');
    const typeLabel = c.type === 'offer' ? '有空位' : '找同行';
    const pub = c.creator?.nickName || c.userId?.nickName || '-';
    const joinedCount = (c.participants || []).filter(p => p.status === 'joined').length;
    const ppl = `${joinedCount}/${c.totalSeats || c.maxPassengers || '?'}`;
    const auditSt = c.auditStatus || 'approved';
    const auditBadge = auditSt === 'pending' ? '<span class="bs pending">待审核</span>' :
                       auditSt === 'rejected' ? '<span class="bs rejected">已拒绝</span>' : '';
    const reportBadge = c.isReported ? '<span class="bs pending">被举报</span>' : '';
    const statusLabel = c.status === 'active' ? '活跃' : c.status === 'ended' ? '已结束' : c.status === 'cancelled' ? '已取消' : (c.status || '活跃');
    return `<tr><td>${esc(from)} → ${esc(to)}</td><td>${typeLabel}</td><td>${esc(pub)}</td><td>${ppl}</td>
      <td><span class="bs ${c.status||'active'}">${statusLabel}</span> ${auditBadge} ${reportBadge}</td>
      <td>${fmt(c.departureTime)}</td>
      <td>${auditSt==='pending'?`<button class="ab s" onclick="auditCarpool('${c._id}','approve')">通过</button><button class="ab d" onclick="auditCarpool('${c._id}','reject')">拒绝</button>`:''}
      <button class="ab d" onclick="takedownCarpool('${c._id}')">下架</button>
      <button class="ab" onclick="viewCarpool('${c._id}')">详情</button></td></tr>`;
  }).join('') || emptyRow(7);
  renderPg('carpoolPg', d.totalPages||1, carpoolP, loadCarpools);
}

window.viewCarpool = async function(id) {
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

window.auditCarpool = async function(id, action) {
  const reason = action === 'reject' ? prompt('拒绝原因：') : '';
  if (reason === null) return;
  const res = await api('PUT', `/api/admin/carpools/${id}/audit`, { action, reason: reason || '' });
  if (res.success) { window.toast(action === 'approve' ? '已通过' : '已拒绝', 'success'); loadCarpools(); }
  else window.toast(res.message || '操作失败', 'error');
};

window.takedownCarpool = async function(id) {
  const reason = prompt('下架原因：');
  if (reason === null) return;
  const res = await api('PUT', `/api/admin/carpools/${id}/takedown`, { reason: reason || '' });
  if (res.success) { window.toast('已下架', 'success'); loadCarpools(); }
  else window.toast(res.message || '操作失败', 'error');
};
