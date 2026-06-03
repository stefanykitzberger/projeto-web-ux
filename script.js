const appState = {
  posts: [],
  users: [],
};

let editingUserId = null;
let editingPostIndex = null;
let toastTimer;
let deleteConfirmType = null;
let deleteConfirmId = null;

const tabButtons = document.querySelectorAll(".tab-btn");
const profileDialog = document.getElementById("user-profile-dialog");
const userEditDialog = document.getElementById("user-edit-dialog");
const postEditDialog = document.getElementById("post-edit-dialog");
const deleteConfirmDialog = document.getElementById("delete-confirm-dialog");
const postForm = document.getElementById("post-form");

function loadData() {
  setStatus("carregando...", "loading");

  fetch("https://jsonplaceholder.typicode.com/posts")
    .then((response) => {
      return response.json();
    })
    .then((posts) => {
      appState.posts = posts;
      renderPostsTable();
    })
    .catch((error) => {
      setStatus("erro na API", "error");
      showToast("Falha ao carregar dados da API.", "danger");
      console.error("Erro ao carregar posts:", error);
    });

  fetch("https://jsonplaceholder.typicode.com/users")
    .then((response) => {
      return response.json();
    })
    .then((users) => {
      appState.users = users;
      populateUserSelect();
      renderUsersTable();
      setStatus("● online", "ready");
    })
    .catch((error) => {
      setStatus("erro na API", "error");
      showToast("Falha ao carregar dados da API.", "danger");
      console.error("Erro ao carregar users:", error);
    });
}

function setStatus(text, elementClass) {
  const badge = document.getElementById("status-badge");
  badge.textContent = text;
  badge.className = `status-badge ${elementClass}`;
}

function showToast(message, type) {
  const toastEl = document.getElementById("toast");
  toastEl.textContent = message;
  toastEl.className = `show ${type === "danger" ? "danger" : ""}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.remove("show");
  }, 3000);
}

function getInitials(name) {
  const words = name.split(" ");
  const firstTwoWords = words.slice(0, 2);
  const initials = firstTwoWords.map((word) => word[0]);
  return initials.join("").toUpperCase();
}

function getUser(userId) {
  return appState.users.find((user) => user.id === userId);
}

function getUserName(userId) {
  const user = getUser(userId);
  return user.name;
}

function getAvatarGradient(userId) {
  const colors = ["#6af0c8", "#f06a9a", "#c8a6f0", "#ffd93d", "#ff6b6b"];
  const initialColor = colors[userId % colors.length];
  const finalColor = colors[(userId + 1) % colors.length];
  return `linear-gradient(135deg,${initialColor},${finalColor})`;
}

function switchTab(tab) {
  tabButtons.forEach((btn) => {
    btn.classList.remove("active");
  });
  document.querySelectorAll(".panel").forEach((panel) => {
    panel.classList.remove("active");
  });

  document.querySelector(`.tab-btn[data-tab="${tab}"]`).classList.add("active");
  document.getElementById(`panel-${tab}`).classList.add("active");

  if (tab === "feed") renderFeed();
}

function populateUserSelect() {
  document.getElementById("sel-author").innerHTML = appState.users
    .map((user) => `<option value="${user.id}">${user.name}</option>`)
    .join("");
}

function renderPostsTable() {
  const tbody = document.getElementById("posts-tbody");
  if (!appState.posts.length) {
    tbody.innerHTML = `<tr><td colspan="4"><div class="state-msg">Nenhum post encontrado.</div></td></tr>`;
    return;
  }

  tbody.innerHTML = appState.posts
    .map(
      (post, idx) =>
        `<tr data-real="${idx}">
          <td class="td-id">${post.id}</td>
          <td class="td-id">${post.userId}</td>
          <td class="td-title" title="${post.title}">${post.title}</td>
          <td>
            <div class="actions-cell">
              <button class="btn btn-sm btn-edit" onclick="openPostEdit(${idx})">Editar</button>
              <button class="btn btn-sm btn-delete" onclick="deletePost(${idx})">Excluir</button>
            </div>
          </td>
        </tr>`,
    )
    .join("");
}

function deletePost(index) {
  const post = appState.posts[index];
  const message = `Excluir o post "${post.title.length > 40 ? `${post.title.substring(0, 40)}...` : post.title}"?`;
  openDeleteConfirm("post", index, message);
}

function openPostEdit(index) {
  const post = appState.posts[index];
  if (!post) return;

  editingPostIndex = index;
  document.getElementById("pe-title").value = post.title;
  document.getElementById("pe-body").value = post.body;
  postEditDialog.showModal();
}

function closePostEdit() {
  postEditDialog.close();
  editingPostIndex = null;
}

function savePostEdit() {
  if (editingPostIndex === null) return;

  const title = document.getElementById("pe-title").value.trim();
  const body = document.getElementById("pe-body").value.trim();

  if (!title || !body) {
    showToast("Título e conteúdo não podem estar vazios.", "danger");
    return;
  }

  appState.posts[editingPostIndex].title = title;
  appState.posts[editingPostIndex].body = body;

  closePostEdit();
  renderPostsTable();
  showToast("Post atualizado com sucesso!");
}

function renderUsersTable() {
  const tbody = document.getElementById("users-tbody");
  tbody.innerHTML = appState.users
    .map((user) => {
      return `<tr>
          <td class="td-id">${user.id}</td>
          <td>${user.name}</td>
          <td class="td-id">@${user.username}</td>
          <td>${user.email}</td>
          <td>
            <div class="actions-cell">
              <button class="btn btn-sm btn-edit" onclick="openUserEdit(${user.id})">Editar</button>
              <button class="btn btn-sm btn-delete" onclick="deleteUser(${user.id})">Excluir</button>
            </div>
          </td>
        </tr>`;
    })
    .join("");
}

function deleteUser(userId) {
  const user = getUser(userId);
  if (!user) return;

  const userPostsCount = appState.posts.filter(
    (post) => post.userId === userId,
  ).length;
  const hasRelatedPosts = userPostsCount > 0;
  const msg = hasRelatedPosts
    ? `Excluir "${user.name}"?\nIsso também removerá ${userPostsCount} post(s) vinculado(s) a este usuário.`
    : `Excluir o usuário "${user.name}"?`;

  openDeleteConfirm("user", userId, msg);
}

function openUserEdit(userId) {
  const user = getUser(userId);
  if (!user) return;

  editingUserId = userId;
  document.getElementById("eu-subtitle").textContent =
    `@${user.username} · ID ${user.id}`;
  document.getElementById("eu-name").value = user.name;
  document.getElementById("eu-username").value = user.username;
  document.getElementById("eu-email").value = user.email;
  document.getElementById("eu-phone").value = user.phone;
  document.getElementById("eu-website").value = user.website;
  document.getElementById("eu-city").value = user.address && user.address.city;
  document.getElementById("eu-street").value =
    user.address && user.address.street;
  document.getElementById("eu-suite").value =
    user.address && user.address.suite;
  document.getElementById("eu-zip").value =
    user.address && user.address.zipcode;
  document.getElementById("eu-company").value =
    user.company && user.company.name;
  document.getElementById("eu-catchphrase").value =
    user.company && user.company.catchPhrase;
  document.getElementById("eu-bs").value = user.company && user.company.bs;
  userEditDialog.showModal();
}

function closeUserEdit() {
  userEditDialog.close();
  editingUserId = null;
}

function saveUserEdit() {
  const user = getUser(editingUserId);
  if (!user) return;

  user.name = document.getElementById("eu-name").value.trim() || user.name;
  user.username =
    document.getElementById("eu-username").value.trim() || user.username;
  user.email = document.getElementById("eu-email").value.trim() || user.email;
  user.phone = document.getElementById("eu-phone").value.trim();
  user.website = document.getElementById("eu-website").value.trim();

  user.address = {
    city: document.getElementById("eu-city").value.trim(),
    street: document.getElementById("eu-street").value.trim(),
    suite: document.getElementById("eu-suite").value.trim(),
    zipcode: document.getElementById("eu-zip").value.trim(),
  };

  user.company = {
    name: document.getElementById("eu-company").value.trim(),
    catchPhrase: document.getElementById("eu-catchphrase").value.trim(),
    bs: document.getElementById("eu-bs").value.trim(),
  };

  closeUserEdit();
  renderUsersTable();
  renderPostsTable();
  populateUserSelect();
  showToast("Usuário atualizado com sucesso!");
}

function openDeleteConfirm(type, id, message) {
  deleteConfirmType = type;
  deleteConfirmId = id;
  document.getElementById("dc-message").textContent = message;
  deleteConfirmDialog.showModal();
}

function closeDeleteConfirm() {
  deleteConfirmDialog.close();
  deleteConfirmType = null;
  deleteConfirmId = null;
}

function confirmDelete() {
  if (deleteConfirmType === "post") {
    appState.posts.splice(deleteConfirmId, 1);
    renderPostsTable();
    showToast("Post excluído.", "danger");
  } else if (deleteConfirmType === "user") {
    const user = getUser(deleteConfirmId);
    const postsCount = appState.posts.filter(
      (post) => post.userId === deleteConfirmId,
    ).length;
    appState.posts = appState.posts.filter(
      (post) => post.userId !== deleteConfirmId,
    );
    appState.users = appState.users.filter(
      (user) => user.id !== deleteConfirmId,
    );
    renderUsersTable();
    renderPostsTable();
    populateUserSelect();
    showToast(`Usuário e ${postsCount} post(s) excluídos.`, "danger");
  }
  closeDeleteConfirm();
}

function openUserProfile(userId) {
  const user = getUser(userId);
  if (!user) return;

  const avatar = document.getElementById("dp-avatar");
  avatar.style.background = getAvatarGradient(user.id);
  avatar.textContent = getInitials(user.name);

  document.getElementById("dp-name").textContent = user.name;
  document.getElementById("dp-username").textContent = `@${user.username}`;
  document.getElementById("dp-email").textContent = user.email;
  document.getElementById("dp-phone").textContent = user.phone;
  document.getElementById("dp-street").textContent = user.address.street;
  document.getElementById("dp-suite").textContent = user.address.suite;
  document.getElementById("dp-city").textContent = user.address.city;
  document.getElementById("dp-zip").textContent = user.address.zipcode;
  document.getElementById("dp-company").textContent = user.company.name;
  document.getElementById("dp-bs").textContent = user.company.bs;
  document.getElementById("dp-catchphrase").textContent =
    user.company.catchPhrase;
  document.getElementById("dp-website").innerHTML = user.website;

  profileDialog.showModal();
}

function renderFeed() {
  const container = document.getElementById("feed-list");
  container.innerHTML = "";

  if (!appState.posts.length) {
    container.innerHTML = `<div class="state-msg">Nenhum post para exibir.</div>`;
    return;
  }

  appState.posts.forEach((post) => {
    const author = getUserName(post.userId);
    const initials = getInitials(author);
    const grad = getAvatarGradient(post.userId);

    const article = document.createElement("article");
    article.className = "post-card";
    article.innerHTML = `
        <div class="card-header">
          <div class="avatar" style="background:${grad}">${initials}</div>
          <div class="card-meta">
            <button class="user-link" onclick="openUserProfile(${post.userId})">${author}</button>
          </div>
          <span class="post-id-badge">#${post.id}</span>
        </div>
        <h3 class="card-title">${post.title}</h3>
        <p class="card-body">${post.body}</p>`;

    container.appendChild(article);
  });
}

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    switchTab(btn.dataset.tab);
  });
});

postForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = document.getElementById("inp-title").value.trim();
  const body = document.getElementById("inp-body").value.trim();
  if (!title || !body) return;

  const userId = parseInt(document.getElementById("sel-author").value);
  const newId = Math.max(...appState.posts.map((post) => post.id)) + 1;
  appState.posts.unshift({
    id: newId,
    userId: userId,
    title: title,
    body: body,
  });
  postForm.reset();
  renderPostsTable();
  showToast("Post criado com sucesso!");
});

document.getElementById("profile-close-btn").addEventListener("click", () => {
  profileDialog.close();
});

document.getElementById("user-edit-close-btn").addEventListener("click", closeUserEdit);
document.getElementById("user-edit-cancel-btn").addEventListener("click", closeUserEdit);
document.getElementById("user-edit-save-btn").addEventListener("click", saveUserEdit);

document.getElementById("post-edit-close-btn").addEventListener("click", closePostEdit);
document.getElementById("post-edit-cancel-btn").addEventListener("click", closePostEdit);
document.getElementById("post-edit-save-btn").addEventListener("click", savePostEdit);

document.getElementById("delete-confirm-close-btn").addEventListener("click", closeDeleteConfirm);
document.getElementById("delete-confirm-cancel-btn").addEventListener("click", closeDeleteConfirm);
document.getElementById("delete-confirm-btn").addEventListener("click", confirmDelete);

profileDialog.addEventListener("click", (event) => {
  if (event.target === event.currentTarget) {
    event.currentTarget.close();
  }
});

userEditDialog.addEventListener("click", (event) => {
  if (event.target === event.currentTarget) {
    event.currentTarget.close();
  }
});

postEditDialog.addEventListener("click", (event) => {
  if (event.target === event.currentTarget) {
    event.currentTarget.close();
  }
});

deleteConfirmDialog.addEventListener("click", (event) => {
  if (event.target === event.currentTarget) {
    event.currentTarget.close();
  }
});

loadData();
