const state = {
  me: null,
  accessToken: sessionStorage.getItem('access_token') || '',
  refreshToken: sessionStorage.getItem('refresh_token') || '',
};

const msg = (text, error = false) => {
  const el = document.getElementById('message');
  el.textContent = text;
  el.style.color = error ? '#b91c1c' : '#166534';
};

const setTokens = (access, refresh) => {
  state.accessToken = access || '';
  state.refreshToken = refresh || '';
  sessionStorage.setItem('access_token', state.accessToken);
  sessionStorage.setItem('refresh_token', state.refreshToken);
};

const clearTokens = () => {
  state.me = null;
  setTokens('', '');
  sessionStorage.removeItem('access_token');
  sessionStorage.removeItem('refresh_token');
};

async function refreshAccessToken() {
  if (!state.refreshToken) return false;
  const r = await fetch('/api/v1/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: state.refreshToken }),
  });
  if (!r.ok) return false;
  const data = await r.json();
  setTokens(data.access_token, data.refresh_token);
  return true;
}

async function api(path, options = {}, retry = true) {
  const headers = { ...(options.headers || {}) };
  if (state.accessToken) headers.Authorization = 'Bearer ' + state.accessToken;
  if (!headers['Content-Type'] && options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(path, { ...options, headers });
  if (res.status === 401 && retry) {
    const ok = await refreshAccessToken();
    if (ok) return api(path, options, false);
    clearTokens();
    renderVisibility();
    throw new Error('Phiên đăng nhập đã hết hạn');
  }
  if (!res.ok) {
    let detail = 'Yêu cầu thất bại';
    try {
      const data = await res.json();
      detail = data.detail || data.message || JSON.stringify(data);
    } catch (_) {}
    throw new Error(detail);
  }
  if (res.status === 204) return null;
  return res.json();
}

function renderVisibility() {
  const logged = Boolean(state.accessToken);
  document.getElementById('auth-card').classList.toggle('hidden', logged);
  document.getElementById('app-card').classList.toggle('hidden', !logged);

  const role = state.me?.role;
  document.getElementById('ceo-panel').classList.toggle('hidden', role !== 'ceo');
  document.getElementById('manager-panel').classList.toggle('hidden', !['manager', 'ceo'].includes(role || ''));

  if (state.me) {
    document.getElementById('me-name').textContent = state.me.full_name;
    document.getElementById('me-role').textContent = state.me.role;
    document.getElementById('me-email').textContent = state.me.email;
  }
}

function actionButton(label, className, onClick) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = className || 'secondary';
  btn.textContent = label;
  btn.addEventListener('click', onClick);
  return btn;
}

function renderManagers(items = []) {
  const host = document.getElementById('managers-table');
  host.textContent = '';
  const table = document.createElement('table');
  table.innerHTML = '<thead><tr><th>Họ tên</th><th>Email</th><th>Trạng thái</th><th>Hành động</th></tr></thead>';
  const tbody = document.createElement('tbody');

  items.forEach((u) => {
    const tr = document.createElement('tr');
    const name = document.createElement('td'); name.textContent = u.full_name;
    const email = document.createElement('td'); email.textContent = u.email;
    const active = document.createElement('td'); active.textContent = u.is_active ? 'Hoạt động' : 'Vô hiệu';
    const actions = document.createElement('td');

    const toggleLabel = u.is_active ? 'Deactivate' : 'Activate';
    const toggleClass = u.is_active ? 'warn' : 'secondary';
    actions.appendChild(actionButton(toggleLabel, toggleClass, async () => {
      try {
        await api(`/api/v1/users/managers/${u.id}/${u.is_active ? 'deactivate' : 'activate'}`, { method: 'PATCH' });
        msg('Cập nhật trạng thái manager thành công');
        await loadManagers();
      } catch (e) { msg(e.message, true); }
    }));

    actions.appendChild(actionButton('Reset password', 'secondary', async () => {
      try {
        await api(`/api/v1/users/managers/${u.id}/reset-password`, { method: 'POST' });
        msg('Đã reset mật khẩu manager');
      } catch (e) { msg(e.message, true); }
    }));

    tr.append(name, email, active, actions);
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  host.appendChild(table);
}

function renderDepartments(items = []) {
  const host = document.getElementById('departments-table');
  host.textContent = '';
  const table = document.createElement('table');
  table.innerHTML = '<thead><tr><th>Tên</th><th>Mô tả</th><th>Manager ID</th><th>Trạng thái</th><th>Hành động</th></tr></thead>';
  const tbody = document.createElement('tbody');

  items.forEach((d) => {
    const tr = document.createElement('tr');
    const n = document.createElement('td'); n.textContent = d.name;
    const desc = document.createElement('td'); desc.textContent = d.description || '';
    const managerId = document.createElement('td'); managerId.textContent = d.manager_id || '';
    const active = document.createElement('td'); active.textContent = d.is_active ? 'Hoạt động' : 'Vô hiệu';
    const actions = document.createElement('td');

    const assignInput = document.createElement('input');
    assignInput.placeholder = 'Manager ID';
    assignInput.value = d.manager_id || '';

    actions.appendChild(assignInput);
    actions.appendChild(actionButton('Gán manager', 'secondary', async () => {
      if (!assignInput.value.trim()) return msg('Vui lòng nhập manager id', true);
      try {
        await api(`/api/v1/organizations/departments/${d.id}/assign-manager`, {
          method: 'PATCH',
          body: JSON.stringify({ manager_id: assignInput.value.trim() }),
        });
        msg('Gán manager thành công');
        await loadDepartments();
      } catch (e) { msg(e.message, true); }
    }));

    if (d.is_active) {
      actions.appendChild(actionButton('Deactivate', 'warn', async () => {
        try {
          await api(`/api/v1/organizations/departments/${d.id}`, { method: 'DELETE' });
          msg('Vô hiệu hóa phòng ban thành công');
          await loadDepartments();
        } catch (e) { msg(e.message, true); }
      }));
    }

    tr.append(n, desc, managerId, active, actions);
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  host.appendChild(table);
}

function renderStaff(items = []) {
  const host = document.getElementById('staff-table');
  host.textContent = '';
  const table = document.createElement('table');
  table.innerHTML = '<thead><tr><th>Họ tên</th><th>Email</th><th>SĐT</th><th>Trạng thái</th><th>Hành động</th></tr></thead>';
  const tbody = document.createElement('tbody');

  items.forEach((u) => {
    const tr = document.createElement('tr');
    const name = document.createElement('td'); name.textContent = u.full_name;
    const email = document.createElement('td'); email.textContent = u.email;
    const phone = document.createElement('td'); phone.textContent = u.phone || '';
    const active = document.createElement('td'); active.textContent = u.is_active ? 'Hoạt động' : 'Vô hiệu';
    const actions = document.createElement('td');

    actions.appendChild(actionButton(u.is_active ? 'Deactivate' : 'Activate', u.is_active ? 'warn' : 'secondary', async () => {
      try {
        await api(`/api/v1/users/staff/${u.id}/${u.is_active ? 'deactivate' : 'activate'}`, { method: 'PATCH' });
        msg('Cập nhật trạng thái staff thành công');
        await loadStaff();
      } catch (e) { msg(e.message, true); }
    }));

    actions.appendChild(actionButton('Reset password', 'secondary', async () => {
      try {
        await api(`/api/v1/users/staff/${u.id}/reset-password`, { method: 'POST' });
        msg('Đã reset mật khẩu staff');
      } catch (e) { msg(e.message, true); }
    }));

    tr.append(name, email, phone, active, actions);
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  host.appendChild(table);
}

async function loadMe() {
  state.me = await api('/api/v1/users/me');
  renderVisibility();
}

async function loadManagers() {
  const res = await api('/api/v1/users/managers');
  renderManagers(res.items || []);
}

async function loadDepartments() {
  const res = await api('/api/v1/organizations/departments');
  renderDepartments(Array.isArray(res) ? res : []);
}

async function loadStaff() {
  const res = await api('/api/v1/users/staff');
  renderStaff(Array.isArray(res) ? res : []);
}

async function bootstrap() {
  renderVisibility();
  if (!state.accessToken) return;
  try {
    await loadMe();
    if (state.me.role === 'ceo') {
      await Promise.all([loadManagers(), loadDepartments()]);
    }
    if (state.me.role === 'manager' || state.me.role === 'ceo') {
      await loadStaff();
    }
  } catch (e) {
    clearTokens();
    renderVisibility();
    msg(e.message, true);
  }
}

document.getElementById('login-form').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  try {
    const data = await api('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      headers: { 'Content-Type': 'application/json' },
    });
    setTokens(data.access_token, data.refresh_token);
    msg('Đăng nhập thành công');
    await bootstrap();
  } catch (e) {
    msg(e.message, true);
  }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  try {
    if (state.refreshToken && state.accessToken) {
      await api('/api/v1/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: state.refreshToken }),
      });
    }
  } catch (_) {}
  clearTokens();
  renderVisibility();
  msg('Đã đăng xuất');
});

document.getElementById('change-password-form').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const oldPassword = document.getElementById('old-password').value;
  const newPassword = document.getElementById('new-password').value;
  try {
    await api('/api/v1/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
    });
    msg('Đổi mật khẩu thành công, vui lòng đăng nhập lại');
    clearTokens();
    renderVisibility();
  } catch (e) {
    msg(e.message, true);
  }
});

document.getElementById('create-manager-form').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const full_name = document.getElementById('manager-name').value.trim();
  const email = document.getElementById('manager-email').value.trim();
  const dept_id = document.getElementById('manager-dept-id').value.trim();
  try {
    await api('/api/v1/users/managers', {
      method: 'POST',
      body: JSON.stringify({ full_name, email, dept_id }),
    });
    msg('Tạo manager thành công');
    ev.target.reset();
    await loadManagers();
  } catch (e) {
    msg(e.message, true);
  }
});

document.getElementById('refresh-managers-btn').addEventListener('click', async () => {
  try { await loadManagers(); msg('Đã tải danh sách manager'); } catch (e) { msg(e.message, true); }
});

document.getElementById('create-department-form').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const name = document.getElementById('dept-name').value.trim();
  const description = document.getElementById('dept-desc').value.trim();
  const manager_id = document.getElementById('dept-manager-id').value.trim();
  const payload = { name, description: description || null };
  if (manager_id) payload.manager_id = manager_id;
  try {
    await api('/api/v1/organizations/departments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    msg('Tạo phòng ban thành công');
    ev.target.reset();
    await loadDepartments();
  } catch (e) {
    msg(e.message, true);
  }
});

document.getElementById('refresh-departments-btn').addEventListener('click', async () => {
  try { await loadDepartments(); msg('Đã tải danh sách phòng ban'); } catch (e) { msg(e.message, true); }
});

document.getElementById('create-staff-form').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const full_name = document.getElementById('staff-name').value.trim();
  const email = document.getElementById('staff-email').value.trim();
  const phone = document.getElementById('staff-phone').value.trim();
  try {
    await api('/api/v1/users/staff', {
      method: 'POST',
      body: JSON.stringify({ full_name, email, phone: phone || null }),
    });
    msg('Tạo staff thành công');
    ev.target.reset();
    await loadStaff();
  } catch (e) {
    msg(e.message, true);
  }
});

document.getElementById('refresh-staff-btn').addEventListener('click', async () => {
  try { await loadStaff(); msg('Đã tải danh sách staff'); } catch (e) { msg(e.message, true); }
});

bootstrap();
