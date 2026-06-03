const appState = { posts: [], users: [] };
const tabButtons = document.querySelectorAll(".tab-btn");
const postForm = document.getElementById("post-form");

function setStatus(text, elementClass) {
  const badge = document.getElementById("status-badge");
  badge.textContent = text;
  badge.className = `status-badge ${elementClass}`;
}

function loadData() {
  setStatus("carregando...", "loading");

  fetch("https://jsonplaceholder.typicode.com/posts")
    .then((response) => response.json())
    .then((posts) => {
      appState.posts = posts;
      renderPostsTable();
    })
    .catch((error) => {
      setStatus("erro na API", "error");
      console.error("Erro ao carregar posts:", error);
    });

  fetch("https://jsonplaceholder.typicode.com/users")
    .then((response) => response.json())
    .then((users) => {
      appState.users = users;
      populateUserSelect();
      renderUsersTable();
      setStatus("● online", "ready");
    })
    .catch((error) => {
      setStatus("erro na API", "error");
      console.error("Erro ao carregar users:", error);
    });
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
      (post, idx) => `
    <tr>
      <td class="td-id">${post.id}</td>
      <td class="td-id">${post.userId}</td>
      <td class="td-title" title="${post.title}">${post.title}</td>
      <td>
        <div class="actions-cell">
          <button class="btn btn-sm btn-edit" onclick="openPostEdit(${idx})">Editar</button>
          <button class="btn btn-sm btn-delete" onclick="deletePost(${idx})">Excluir</button>
        </div>
      </td>
    </tr>
  `,
    )
    .join("");
}

function renderUsersTable() {
  const tbody = document.getElementById("users-tbody");
  tbody.innerHTML = appState.users
    .map(
      (user) => `
    <tr>
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
    </tr>
  `,
    )
    .join("");
}

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

function switchTab(tab) {
  tabButtons.forEach((btn) => btn.classList.remove("active"));
  document
    .querySelectorAll(".panel")
    .forEach((panel) => panel.classList.remove("active"));
  document.querySelector(`.tab-btn[data-tab="${tab}"]`).classList.add("active");
  document.getElementById(`panel-${tab}`).classList.add("active");
  if (tab === "feed") renderFeed();
}

loadData();
