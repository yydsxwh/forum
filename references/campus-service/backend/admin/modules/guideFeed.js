// modules/guideFeed.js — 图鉴广场管理
import { api } from '../api.js';
import { esc, fmt, renderPg } from '../utils.js';

let feedPage = 1;

window.loadGuideFeed = loadGuideFeed;
window.showFeedForm = showFeedForm;
window.previewUpload = previewUpload;

export async function loadGuideFeed(page) {
  feedPage = page || feedPage;
  const cat = document.getElementById('gfCategory')?.value || '';
  const kw = document.getElementById('gfSearch')?.value?.trim() || '';
  let url = `/api/admin/guide/feed?page=${feedPage}&pageSize=12`;
  if (cat) url += '&category=' + cat;
  if (kw) url += '&keyword=' + encodeURIComponent(kw);

  const grid = document.getElementById('gfGrid');
  if (grid) grid.innerHTML = '<div class="empty"><span class="ic">⏳</span><div class="msg">加载中…</div></div>';

  const res = await api('GET', url);
  const d = res.data || {};
  const list = d.list || d.data || [];

  if (!list.length) {
    if (grid) grid.innerHTML = '<div class="empty"><span class="ic">🖼️</span><div class="msg">暂无内容，点击「添加内容」开始</div></div>';
    const pg = document.getElementById('gfPg');
    if (pg) pg.innerHTML = '';
    return;
  }

  if (grid) {
    grid.innerHTML = list.map(item => `
      <div class="gf-card">
        <div class="gf-card-img">
          <img src="${esc((item.images && item.images[0]) || '')}" alt="${esc(item.title || '(无标题)')}" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23999%22 stroke-width=%221.5%22><rect x=%223%22 y=%223%22 width=%2218%22 height=%2218%22 rx=%222%22/><circle cx=%228.5%22 cy=%228.5%22 r=%221.5%22/><path d=%22M21 15l-5-5L5 21%22/></svg>'">
        </div>
        <div class="gf-card-info">
          <div class="gf-card-title">${esc(item.title || '(无标题)')}</div>
          <div class="gf-card-desc">${esc(item.description || '')}</div>
          <div class="gf-card-meta">
            <span class="gf-cat">${esc(item.category_key || '未分类')}</span>
            <span class="bs ${item.is_active ? 'published' : 'recalled'}">${item.is_active ? '上架' : '下架'}</span>
          </div>
          <div class="gf-card-sort">排序: ${item.sort_order ?? 0}</div>
        </div>
        <div class="gf-card-actions">
          <button class="ab" onclick="editFeed('${item._id}')">编辑</button>
          <button class="ab ${item.is_active ? 'd' : 's'}" onclick="toggleFeedActive('${item._id}')">${item.is_active ? '下架' : '上架'}</button>
          <button class="ab d" onclick="deleteFeed('${item._id}')">删除</button>
        </div>
      </div>
    `).join('');
  }

  renderPg('gfPg', d.totalPages || 1, feedPage, loadGuideFeed);
}

function showFeedForm(data) {
  const isEdit = !!data;
  window.showModal(isEdit ? '编辑内容' : '添加内容', `
    <div class="fg"><label>标题</label><input id="feedTitle" value="${esc(data?.title || '')}" placeholder="内容标题"></div>
    <div class="fg"><label>描述</label><textarea id="feedDesc" placeholder="简短描述（可选）">${esc(data?.description || '')}</textarea></div>
    <div class="fg"><label>分类</label><select id="feedCat">
      <option value="campus"${data?.category_key === 'campus' ? ' selected' : ''}>校园风光</option>
      <option value="food"${data?.category_key === 'food' ? ' selected' : ''}>美食</option>
      <option value="activity"${data?.category_key === 'activity' ? ' selected' : ''}>活动</option>
      <option value="other"${data?.category_key === 'other' ? ' selected' : ''}>其他</option>
    </select></div>
    <div class="fg"><label>排序值</label><input id="feedSort" type="number" value="${data?.sort_order ?? 0}" placeholder="数字越大越靠前"></div>
    <div class="fg"><label>图片</label>
      <div class="gf-upload-area" id="gfUploadArea" onclick="document.getElementById('feedFile').click()">
        <input type="file" id="feedFile" accept="image/*" style="display:none" onchange="previewUpload(this)">
        <div id="gfUploadPlaceholder">
          <svg width="32" height="32" style="color:var(--t3);margin-bottom:8px"><use href="#i-image"/></svg>
          <div style="font-size:13px;color:var(--t3)">点击上传图片</div>
        </div>
        <img id="gfUploadPreview" style="display:none;max-width:100%;max-height:160px;border-radius:8px;object-fit:cover">
      </div>
      ${(data?.images && data?.images[0]) || '' ? `<input type="hidden" id="feedImageUrl" value="${esc((data?.images && data?.images[0]) || '')}">` : ''}
    </div>`,
    `<button class="bc" onclick="closeModal()">取消</button>
     <button class="bf" onclick="submitFeed('${data?._id || ''}')">${isEdit ? '保存' : '创建'}</button>`);
}

function previewUpload(input) {
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const preview = document.getElementById('gfUploadPreview');
    const placeholder = document.getElementById('gfUploadPlaceholder');
    if (preview) { preview.src = e.target.result; preview.style.display = 'block'; }
    if (placeholder) placeholder.style.display = 'none';
  };
  reader.readAsDataURL(file);
}

window.submitFeed = async function(id) {
  const title = document.getElementById('feedTitle')?.value?.trim();
  const description = document.getElementById('feedDesc')?.value?.trim() || '';
  const category = document.getElementById('feedCat')?.value || 'other';
  const sortOrder = parseInt(document.getElementById('feedSort')?.value) || 0;
  const fileInput = document.getElementById('feedFile');
  const existingUrl = document.getElementById('feedImageUrl')?.value || '';

  if (!title) { window.toast('请输入标题', 'error'); return; }

  let imageUrl = existingUrl;

  // 如果有新文件上传，先上传图片
  if (fileInput?.files?.[0]) {
    const fd = new FormData();
    fd.append('image', fileInput.files[0]);
    try {
      const base = localStorage.getItem('treehole_admin_api_base_v2') || '';
      const auth = localStorage.getItem('admin_token') || '';
      const headers = {};
      if (auth) headers['Authorization'] = 'Bearer ' + auth;
      const r = await fetch(base + '/api/upload/image', { method: 'POST', headers, body: fd });
      const d = await r.json();
      if (d.success && (d.data?.url || d.url)) {
        imageUrl = d.data?.url || d.url;
      } else {
        window.toast(d.message || '图片上传失败', 'error');
        return;
      }
    } catch (e) {
      window.toast('图片上传失败: ' + (e?.message || '网络错误'), 'error');
      return;
    }
  }

  if (!imageUrl) { window.toast('请上传图片', 'error'); return; }

  const body = { title, description, categoryKey: category, sortOrder, images: imageUrl ? [imageUrl] : [] };

  const res = id
    ? await api('PUT', `/api/admin/guide/feed/${id}`, body)
    : await api('POST', '/api/admin/guide/feed', body);

  if (res.success) {
    window.toast(id ? '已更新' : '已创建', 'success');
    closeModal();
    loadGuideFeed();
  } else {
    window.toast(res.message || '操作失败', 'error');
  }
};

window.editFeed = async function(id) {
  // Find the item from the displayed cards (since there's no single-item API)
  const card = document.querySelector(`[onclick="editFeed('${id}')"]`);
  if (card) {
    const title = card.querySelector('.gf-card-title')?.textContent || '';
    const desc = card.querySelector('.gf-card-desc')?.textContent || '';
    const catText = card.querySelector('.gf-cat')?.textContent || '';
    const catMap = {'校园风光':'campus','美食':'food','活动':'activity','其他':'other','未分类':'other'};
    const img = card.querySelector('img')?.src || '';
    const statusText = card.querySelector('.bs')?.textContent || '';
    const sortText = card.querySelector('.gf-card-sort')?.textContent?.replace('排序: ','') || '0';
    showFeedForm({ _id: id, title, description: desc, category_key: catMap[catText]||'other', sort_order: parseInt(sortText)||0, images: img?[img]:[], is_active: statusText==='上架' });
  } else {
    window.toast('无法获取内容详情', 'error');
  }
};

window.deleteFeed = async function(id) {
  if (!confirm('确认删除该内容？此操作不可撤销。')) return;
  const res = await api('DELETE', `/api/admin/guide/feed/${id}`);
  if (res.success) { window.toast('已删除', 'success'); loadGuideFeed(); }
  else window.toast(res.message || '操作失败', 'error');
};

window.toggleFeedActive = async function(id) {
  const res = await api('PUT', `/api/admin/guide/feed/${id}/toggle`);
  if (res.success) { window.toast(res.data?.isActive ? '已上架' : '已下架', 'success'); loadGuideFeed(); }
  else window.toast(res.message || '操作失败', 'error');
};
