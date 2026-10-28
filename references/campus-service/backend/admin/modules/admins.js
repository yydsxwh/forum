// modules/admins.js — 管理员管理
import { api } from '../api.js';
import { esc, fmt, emptyRow, renderPg } from '../utils.js';

let adminP = 1;
window.loadAdmins = loadAdmins;
window.showAdminForm = showAdminForm;

export { loadAdmins };

async function loadAdmins(page) {
  adminP = page || adminP;
  const st = document.getElementById('adminStatus').value;
  let url = `/api/admin/admins?page=${adminP}&pageSize=15`;
  if (st) url += '&status=' + st;
  const res = await api('GET', url);
  const d = res.data || {}; const list = d.list || d.data || [];
  document.getElementById('adminBody').innerHTML = list.map(a => {
    const roleLabel = a.role === 'superadmin' ? '超级管理员' : a.role === 'admin' ? '管理员' : (a.role || '-');
    const statusSt = a.status || (a.isActive === false ? 'disabled' : 'active');
    return `<tr><td><b>${esc(a.username)}</b></td><td>${esc(a.nickName||'-')}</td>
      <td>${roleLabel}</td><td><span class="bs ${statusSt}">${statusSt}</span></td>
      <td>${fmt(a.createTime)}</td>
      <td><button class="ab" onclick="editAdmin('${a._id}')">编辑</button>
      <button class="ab d" onclick="toggleAdminStatus('${a._id}','${statusSt}')">${statusSt==='active'?'禁用':'启用'}</button></td></tr>`;
  }).join('') || emptyRow(6);
  renderPg('adminPg', d.totalPages||1, adminP, loadAdmins);
}

function showAdminForm(data) {
  const isEdit = !!data;
  window.showModal(isEdit ? '编辑管理员' : '添加管理员', `
    <div class="fg"><label>用户名</label><input id="admUser" value="${esc(data?.username||'')}" placeholder="管理员用户名"${isEdit?' disabled':''}></div>
    ${isEdit?'':'<div class="fg"><label>密码</label><input id="admPass" type="password" placeholder="管理员密码"></div>'}
    <div class="fg"><label>昵称</label><input id="admNick" value="${esc(data?.nickName||'')}" placeholder="显示昵称"></div>
    <div class="fg"><label>角色</label><select id="admRole">
      <option value="admin"${data?.role==='admin'?' selected':''}>管理员</option>
      <option value="superadmin"${data?.role==='superadmin'?' selected':''}>超级管理员</option>
    </select></div>`,
    `<button class="bc" onclick="closeModal()">取消</button><button class="bf" onclick="submitAdmin('${data?._id||''}')">${isEdit?'保存':'创建'}</button>`);
}

window.submitAdmin = async function(id) {
  const body = {
    nickName: document.getElementById('admNick').value.trim(),
    role: document.getElementById('admRole').value
  };
  if (!id) {
    body.username = document.getElementById('admUser').value.trim();
    body.password = document.getElementById('admPass').value;
    if (!body.username || !body.password) { window.toast('请输入用户名和密码', 'error'); return; }
  }
  const res = id
    ? await api('PUT', `/api/admin/admins/${id}`, body)
    : await api('POST', '/api/admin/admins', body);
  if (res.success) { window.toast(id ? '已更新' : '已创建', 'success'); closeModal(); loadAdmins(); }
  else window.toast(res.message || '操作失败', 'error');
};

window.editAdmin = async function(id) {
  const res = await api('GET', `/api/admin/admins?page=1&pageSize=100`);
  const list = res.data?.list || res.data?.data || [];
  const admin = list.find(a => a._id === id);
  if (admin) showAdminForm(admin);
  else window.toast('获取详情失败', 'error');
};

window.toggleAdminStatus = async function(id, curSt) {
  const newSt = curSt === 'active' ? 'disabled' : 'active';
  const res = await api('PUT', `/api/admin/admins/${id}`, { status: newSt });
  if (res.success) { window.toast('已更新', 'success'); loadAdmins(); }
  else window.toast(res.message || '操作失败', 'error');
};
