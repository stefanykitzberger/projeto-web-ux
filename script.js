const appState = {
  posts: [],
  users: [],
  postsFilter: '',
  usersFilter: '',
  feedFilter: '',
};

let editingUserId = null;
let editingPostIndex = null;
let deleteConfirmType = null;
let deleteConfirmId = null;

const tabButtons = document.querySelectorAll('.tab-btn');
const profileDialog = document.getElementById('user-profile-dialog');
const userEditDialog = document.getElementById('user-edit-dialog');
const postEditDialog = document.getElementById('post-edit-dialog');
const deleteConfirmDialog = document.getElementById('delete-confirm-dialog');
const postForm = document.getElementById('post-form');
const postSubmitBtn = document.getElementById('post-submit-btn');
const titleInput = document.getElementById('inp-title');
const bodyInput = document.getElementById('inp-body');
const bodyCounter = document.getElementById('body-counter');

function showToast(message, type = 'success', duration = 3500) {
  const container = document.getElementById('toast-container');
  const icons = {
    success: '<i class="fa-solid fa-check" aria-hidden="true"></i>',
    danger: '<i class="fa-solid fa-xmark" aria-hidden="true"></i>',
    warning: '<i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>'
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type !== 'success' ? type : ''}`;
  toast.setAttribute('role', 'status');
  toast.innerHTML = `<span class="toast-icon" aria-hidden="true">${icons[type]}</span><span>${message}</span>`;
  toast.addEventListener('click', () => dismissToast(toast));

  container.appendChild(toast);
  toast.getBoundingClientRect();
  toast.classList.add('show');
  toast._timer = setTimeout(() => dismissToast(toast), duration);
}

function dismissToast(toast) {
  clearTimeout(toast._timer);
  toast.classList.remove('show');
  toast.addEventListener('transitionend', () => toast.remove(), { once: true });
}

function setStatus(text, cls) {
  const badge = document.getElementById('status-badge');
  const icons = {
    loading: '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>',
    ready: '<i class="fa-solid fa-circle" aria-hidden="true"></i>',
    error: '<i class="fa-solid fa-xmark" aria-hidden="true"></i>'
  };
  badge.innerHTML = `<span aria-hidden="true">${icons[cls]}</span> ${text}`;
  badge.className = `status-badge ${cls}`;
  badge.setAttribute('aria-label', `Status da conexão: ${text}`);
}

async function loadData() {
  setStatus('carregando…', 'loading');
  renderPostsSkeleton();
  renderUsersSkeleton();

  const [posts, users] = await Promise.all([
    fetch('https://jsonplaceholder.typicode.com/posts').then(r => r.json()),
    fetch('https://jsonplaceholder.typicode.com/users').then(r => r.json()),
  ]);

  appState.posts = posts;
  appState.users = users;

  populateUserSelect();
  renderPostsTable();
  renderUsersTable();
  setStatus('online', 'ready');
}

function skeletonRow(cols) {
  return `<tr>${Array.from({ length: cols }, () =>
    `<td><span class="skeleton skeleton-cell"></span></td>`
  ).join('')}</tr>`;
}

function renderPostsSkeleton() {
  document.getElementById('posts-tbody').innerHTML = [1, 2, 3, 4, 5].map(() => skeletonRow(4)).join('');
}

function renderUsersSkeleton() {
  document.getElementById('users-tbody').innerHTML = [1, 2, 3, 4, 5].map(() => skeletonRow(5)).join('');
}

function getInitials(name) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function getUser(userId) {
  return appState.users.find(u => u.id === userId);
}

function getUserName(userId) {
  return getUser(userId)?.name ?? `Usuário #${userId}`;
}

function getAvatarGradient(userId) {
  const colors = ['#6af0c8', '#f06a9a', '#c8a6f0', '#ffd93d', '#ff6b6b'];
  return `linear-gradient(135deg,${colors[userId % colors.length]},${colors[(userId + 1) % colors.length]})`;
}

function truncate(str, len) {
  return str.length > len ? str.substring(0, len) + '…' : str;
}

function switchTab(tab) {
  tabButtons.forEach(btn => {
    const isActive = btn.dataset.tab === tab;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', String(isActive));
  });
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`panel-${tab}`).classList.add('active');
  if (tab === 'feed') renderFeed();
}

tabButtons.forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  btn.addEventListener('keydown', e => {
    const tabs = [...tabButtons];
    const idx = tabs.indexOf(btn);
    if (e.key === 'ArrowRight') tabs[(idx + 1) % tabs.length].focus();
    if (e.key === 'ArrowLeft') tabs[(idx - 1 + tabs.length) % tabs.length].focus();
  });
});

function populateUserSelect() {
  const sel = document.getElementById('sel-author');
  const current = sel.value;
  sel.innerHTML = '<option value="" disabled>Selecione um autor…</option>' +
    appState.users.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
  if (current) sel.value = current;
}

function renderPostsTable() {
  const tbody = document.getElementById('posts-tbody');
  const filter = appState.postsFilter.toLowerCase();

  const filtered = filter
    ? appState.posts.filter(p =>
      p.title.toLowerCase().includes(filter) ||
      String(p.id).includes(filter) ||
      getUserName(p.userId).toLowerCase().includes(filter)
    )
    : appState.posts;

  document.getElementById('posts-count').textContent = `${filtered.length} de ${appState.posts.length} post${appState.posts.length !== 1 ? 's' : ''}`;

  if (!appState.posts.length) {
    tbody.innerHTML = `<tr><td><div class="state-msg inline">
      <span class="state-icon"><i class="fa-solid fa-envelope-open" aria-hidden="true"></i></span>
      <span class="state-title">Sem posts cadastrados</span>
      Publique seu primeiro post usando o formulário acima.
    </div></td></tr>`;
    return;
  }

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td><div class="state-msg inline">
      <span class="state-icon"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i></span>
      <span class="state-title">Nenhum resultado</span>
      Nenhum post corresponde a "<strong>${appState.postsFilter}</strong>".
    </div></td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(post => {
    const realIdx = appState.posts.indexOf(post);
    const author = getUserName(post.userId);
    const grad = getAvatarGradient(post.userId);
    const initials = getInitials(author);
    return `<tr>
      <td class="td-id">${post.id}</td>
      <td>
        <button class="user-link" onclick="openUserProfile(${post.userId})" title="Ver perfil de ${author}"
          style="font-size:13px;display:flex;align-items:center;gap:7px;">
          <span style="width:22px;height:22px;border-radius:50%;background:${grad};display:inline-flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#0a0a0f;flex-shrink:0;" aria-hidden="true">${initials}</span>
          ${author}
        </button>
      </td>
      <td class="td-title" title="${post.title}">${post.title}</td>
      <td>
        <div class="actions-cell">
          <button class="btn btn-sm btn-edit" onclick="openPostEdit(${realIdx})" aria-label="Editar post: ${truncate(post.title, 30)}">Editar</button>
          <button class="btn btn-sm btn-delete" onclick="deletePost(${realIdx})" aria-label="Excluir post: ${truncate(post.title, 30)}">Excluir</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function renderUsersTable() {
  const tbody = document.getElementById('users-tbody');
  const filter = appState.usersFilter.toLowerCase();

  const filtered = filter
    ? appState.users.filter(u =>
      u.name.toLowerCase().includes(filter) ||
      u.username.toLowerCase().includes(filter) ||
      u.email.toLowerCase().includes(filter) ||
      String(u.id).includes(filter)
    )
    : appState.users;

  document.getElementById('users-count').textContent = `${filtered.length} de ${appState.users.length} usuário${appState.users.length !== 1 ? 's' : ''}`;

  if (!appState.users.length) {
    tbody.innerHTML = `<tr><td><div class="state-msg inline">
      <span class="state-icon"><i class="fa-solid fa-user" aria-hidden="true"></i></span>
      <span class="state-title">Nenhum usuário encontrado</span>
    </div></td></tr>`;
    return;
  }

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td><div class="state-msg inline">
      <span class="state-icon"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i></span>
      <span class="state-title">Nenhum resultado</span>
      Nenhum usuário corresponde a "<strong>${appState.usersFilter}</strong>".
    </div></td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(user => {
    const grad = getAvatarGradient(user.id);
    const initials = getInitials(user.name);
    return `<tr>
      <td class="td-id">${user.id}</td>
      <td>
        <button class="user-link" onclick="openUserProfile(${user.id})" title="Ver perfil"
          style="display:flex;align-items:center;gap:8px;">
          <span style="width:26px;height:26px;border-radius:50%;background:${grad};display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#0a0a0f;flex-shrink:0;" aria-hidden="true">${initials}</span>
          ${user.name}
        </button>
      </td>
      <td class="td-id">@${user.username}</td>
      <td style="font-size:13px;">${user.email}</td>
      <td>
        <div class="actions-cell">
          <button class="btn btn-sm btn-edit" onclick="openUserEdit(${user.id})" aria-label="Editar ${user.name}">Editar</button>
          <button class="btn btn-sm btn-delete" onclick="deleteUser(${user.id})" aria-label="Excluir ${user.name}">Excluir</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function renderFeed() {
  const container = document.getElementById('feed-list');
  const filter = appState.feedFilter.toLowerCase();

  const filtered = filter
    ? appState.posts.filter(p =>
      p.title.toLowerCase().includes(filter) ||
      p.body.toLowerCase().includes(filter) ||
      getUserName(p.userId).toLowerCase().includes(filter)
    )
    : appState.posts;

  container.innerHTML = '';

  if (!appState.posts.length) {
    container.innerHTML = `<div class="state-msg inline">
      <span class="state-icon"><i class="fa-solid fa-envelope-open" aria-hidden="true"></i></span>
      <span class="state-title">Feed vazio</span>
      Nenhum post disponível para exibir no momento.
    </div>`;
    return;
  }

  if (!filtered.length) {
    container.innerHTML = `<div class="state-msg inline">
      <span class="state-icon"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i></span>
      <span class="state-title">Sem resultados</span>
      Nenhum post corresponde à sua busca.
    </div>`;
    return;
  }

  filtered.forEach(post => {
    const author = getUserName(post.userId);
    const user = getUser(post.userId);
    const article = document.createElement('article');
    article.className = 'post-card';
    article.innerHTML = `
      <div class="card-header">
        <div class="avatar" style="background:${getAvatarGradient(post.userId)}" aria-hidden="true">${getInitials(author)}</div>
        <div class="card-meta">
          <button class="user-link" onclick="openUserProfile(${post.userId})" aria-label="Ver perfil de ${author}">${author}</button>
          <span class="card-meta-sub">@${user.username}</span>
        </div>
        <span class="post-id-badge" aria-label="ID do post ${post.id}">#${post.id}</span>
      </div>
      <h3 class="card-title">${post.title}</h3>
      <p class="card-body">${post.body}</p>`;
    container.appendChild(article);
  });
}

document.getElementById('posts-search').addEventListener('input', e => {
  appState.postsFilter = e.target.value;
  renderPostsTable();
});

document.getElementById('users-search').addEventListener('input', e => {
  appState.usersFilter = e.target.value;
  renderUsersTable();
});

document.getElementById('feed-search').addEventListener('input', e => {
  appState.feedFilter = e.target.value;
  renderFeed();
});

function validateField(input, minLen = 1) {
  const val = input.value.trim();
  const ok = val.length >= minLen;
  const errEl = document.getElementById(input.getAttribute('aria-describedby'));

  if (!val.length) {
    input.classList.remove('valid', 'invalid');
    errEl?.classList.remove('visible');
    return null;
  }

  input.classList.toggle('invalid', !ok);
  input.classList.toggle('valid', ok);
  errEl?.classList.toggle('visible', !ok);
  return ok;
}

function openPostEdit(index) {
  const post = appState.posts[index];
  editingPostIndex = index;
  document.getElementById('pe-title').value = post.title;
  document.getElementById('pe-body').value = post.body;
  document.getElementById('pe-subtitle').textContent = `por ${getUserName(post.userId)} · #${post.id}`;
  postEditDialog.showModal();
  document.getElementById('pe-title').focus();
}

function closePostEdit() {
  postEditDialog.close();
  editingPostIndex = null;
}

function savePostEdit() {
  const title = document.getElementById('pe-title').value.trim();
  const body = document.getElementById('pe-body').value.trim();

  if (title.length < 5) {
    showToast('O título precisa ter ao menos 5 caracteres.', 'danger');
    document.getElementById('pe-title').focus();
    return;
  }
  if (body.length < 10) {
    showToast('O conteúdo precisa ter ao menos 10 caracteres.', 'danger');
    document.getElementById('pe-body').focus();
    return;
  }

  const saveBtn = document.getElementById('post-edit-save-btn');
  saveBtn.classList.add('btn-loading');
  saveBtn.disabled = true;

  setTimeout(() => {
    appState.posts[editingPostIndex].title = title;
    appState.posts[editingPostIndex].body = body;
    saveBtn.classList.remove('btn-loading');
    saveBtn.disabled = false;
    closePostEdit();
    renderPostsTable();
    showToast('Post atualizado com sucesso!', 'success');
  }, 300);
}

function deletePost(index) {
  const post = appState.posts[index];
  openDeleteConfirm('post', index, `Você está prestes a excluir o post "${truncate(post.title, 60)}". Essa ação é permanente.`);
}

function openUserEdit(userId) {
  const user = getUser(userId);
  editingUserId = userId;
  document.getElementById('eu-subtitle').textContent = `@${user.username} · ID ${user.id}`;
  document.getElementById('eu-name').value = user.name;
  document.getElementById('eu-username').value = user.username;
  document.getElementById('eu-email').value = user.email;
  document.getElementById('eu-phone').value = user.phone;
  document.getElementById('eu-website').value = user.website;
  document.getElementById('eu-city').value = user.address.city;
  document.getElementById('eu-street').value = user.address.street;
  document.getElementById('eu-suite').value = user.address.suite;
  document.getElementById('eu-zip').value = user.address.zipcode;
  document.getElementById('eu-company').value = user.company.name;
  document.getElementById('eu-catchphrase').value = user.company.catchPhrase;
  document.getElementById('eu-bs').value = user.company.bs;
  userEditDialog.showModal();
  document.getElementById('eu-name').focus();
}

function closeUserEdit() {
  userEditDialog.close();
  editingUserId = null;
}

function saveUserEdit() {
  const user = getUser(editingUserId);
  const name = document.getElementById('eu-name').value.trim();
  const username = document.getElementById('eu-username').value.trim();
  const email = document.getElementById('eu-email').value.trim();

  if (!name) {
    showToast('Nome é obrigatório.', 'danger');
    document.getElementById('eu-name').focus();
    return;
  }
  if (!username) {
    showToast('Username é obrigatório.', 'danger');
    document.getElementById('eu-username').focus();
    return;
  }
  if (!email.includes('@')) {
    showToast('E-mail inválido.', 'danger');
    document.getElementById('eu-email').focus();
    return;
  }

  const saveBtn = document.getElementById('user-edit-save-btn');
  saveBtn.classList.add('btn-loading');
  saveBtn.disabled = true;

  setTimeout(() => {
    user.name = name;
    user.username = username;
    user.email = email;
    user.phone = document.getElementById('eu-phone').value.trim();
    user.website = document.getElementById('eu-website').value.trim();
    user.address = {
      city: document.getElementById('eu-city').value.trim(),
      street: document.getElementById('eu-street').value.trim(),
      suite: document.getElementById('eu-suite').value.trim(),
      zipcode: document.getElementById('eu-zip').value.trim(),
    };
    user.company = {
      name: document.getElementById('eu-company').value.trim(),
      catchPhrase: document.getElementById('eu-catchphrase').value.trim(),
      bs: document.getElementById('eu-bs').value.trim(),
    };

    saveBtn.classList.remove('btn-loading');
    saveBtn.disabled = false;
    closeUserEdit();
    renderUsersTable();
    renderPostsTable();
    populateUserSelect();
    showToast(`Usuário ${name} atualizado!`, 'success');
  }, 300);
}

function deleteUser(userId) {
  const user = getUser(userId);
  const postsCount = appState.posts.filter(p => p.userId === userId).length;
  const extra = postsCount > 0
    ? ` Isso também excluirá ${postsCount} post${postsCount > 1 ? 's' : ''} vinculado${postsCount > 1 ? 's' : ''} a este usuário.`
    : '';
  openDeleteConfirm('user', userId, `Você está prestes a excluir o usuário "${user.name}".${extra}`);
}

function openUserProfile(userId) {
  const user = getUser(userId);
  const avatar = document.getElementById('dp-avatar');
  avatar.style.background = getAvatarGradient(user.id);
  avatar.textContent = getInitials(user.name);
  avatar.setAttribute('aria-label', `Avatar de ${user.name}`);

  document.getElementById('dp-name').textContent = user.name;
  document.getElementById('dp-username').textContent = `@${user.username}`;
  document.getElementById('dp-email').textContent = user.email;
  document.getElementById('dp-phone').textContent = user.phone;
  document.getElementById('dp-street').textContent = user.address.street;
  document.getElementById('dp-suite').textContent = user.address.suite;
  document.getElementById('dp-city').textContent = user.address.city;
  document.getElementById('dp-zip').textContent = user.address.zipcode;
  document.getElementById('dp-company').textContent = user.company.name;
  document.getElementById('dp-bs').textContent = user.company.bs;
  document.getElementById('dp-catchphrase').textContent = user.company.catchPhrase;
  document.getElementById('dp-website').innerHTML = `<a href="https://${user.website}" target="_blank" rel="noopener noreferrer">${user.website}</a>`;

  profileDialog.showModal();
}

function openDeleteConfirm(type, id, message) {
  deleteConfirmType = type;
  deleteConfirmId = id;
  document.getElementById('dc-message').textContent = message;
  deleteConfirmDialog.showModal();
  document.getElementById('delete-confirm-btn').focus();
}

function closeDeleteConfirm() {
  deleteConfirmDialog.close();
  deleteConfirmType = null;
  deleteConfirmId = null;
}

function confirmDelete() {
  const btn = document.getElementById('delete-confirm-btn');
  btn.classList.add('btn-loading');
  btn.disabled = true;

  setTimeout(() => {
    if (deleteConfirmType === 'post') {
      appState.posts.splice(deleteConfirmId, 1);
      renderPostsTable();
      showToast('Post excluído.', 'danger');
    } else {
      const postsCount = appState.posts.filter(p => p.userId === deleteConfirmId).length;
      const name = getUser(deleteConfirmId).name;
      appState.posts = appState.posts.filter(p => p.userId !== deleteConfirmId);
      appState.users = appState.users.filter(u => u.id !== deleteConfirmId);
      renderUsersTable();
      renderPostsTable();
      populateUserSelect();
      showToast(`"${name}" e ${postsCount} post(s) excluídos.`, 'danger');
    }

    btn.classList.remove('btn-loading');
    btn.disabled = false;
    closeDeleteConfirm();
  }, 350);
}

document.getElementById('profile-close-btn').addEventListener('click', () => profileDialog.close());

document.getElementById('user-edit-close-btn').addEventListener('click', closeUserEdit);
document.getElementById('user-edit-cancel-btn').addEventListener('click', closeUserEdit);
document.getElementById('user-edit-save-btn').addEventListener('click', saveUserEdit);

document.getElementById('post-edit-close-btn').addEventListener('click', closePostEdit);
document.getElementById('post-edit-cancel-btn').addEventListener('click', closePostEdit);
document.getElementById('post-edit-save-btn').addEventListener('click', savePostEdit);

document.getElementById('delete-confirm-close-btn').addEventListener('click', closeDeleteConfirm);
document.getElementById('delete-confirm-cancel-btn').addEventListener('click', closeDeleteConfirm);
document.getElementById('delete-confirm-btn').addEventListener('click', confirmDelete);

titleInput.addEventListener('blur', () => validateField(titleInput, 5));
titleInput.addEventListener('input', () => {
  if (titleInput.classList.contains('invalid')) validateField(titleInput, 5);
});

bodyInput.addEventListener('blur', () => validateField(bodyInput, 10));
bodyInput.addEventListener('input', () => {
  const len = bodyInput.value.length;
  bodyCounter.textContent = `${len} / 1000`;
  bodyCounter.classList.toggle('warn', len > 800);
  bodyCounter.classList.toggle('over', len > 1000);
  if (bodyInput.classList.contains('invalid')) validateField(bodyInput, 10);
});

postForm.addEventListener('submit', e => {
  e.preventDefault();

  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();
  const userId = parseInt(document.getElementById('sel-author').value);

  const titleOk = validateField(titleInput, 5);
  const bodyOk = validateField(bodyInput, 10);
  const authorOk = !isNaN(userId);

  const authorErr = document.getElementById('sel-author-err');
  authorErr.classList.toggle('visible', !authorOk);

  if (!titleOk || !bodyOk || !authorOk) {
    if (!authorOk) document.getElementById('sel-author').focus();
    else if (!titleOk) titleInput.focus();
    else bodyInput.focus();
    return;
  }

  postSubmitBtn.classList.add('btn-loading');
  postSubmitBtn.disabled = true;

  setTimeout(() => {
    const newId = Math.max(...appState.posts.map(p => p.id), 0) + 1;
    appState.posts.unshift({ id: newId, userId, title, body });

    postForm.reset();
    titleInput.classList.remove('valid', 'invalid');
    bodyInput.classList.remove('valid', 'invalid');
    bodyCounter.textContent = '0 / 1000';

    renderPostsTable();
    populateUserSelect();

    postSubmitBtn.classList.remove('btn-loading');
    postSubmitBtn.disabled = false;
    showToast('Post publicado com sucesso!', 'success');
  }, 400);
});

loadData();