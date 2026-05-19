// auth.js — módulo compartilhado de autenticação
// Todas as páginas incluem este arquivo

const SB_URL = localStorage.getItem('sb_url') || '';
const SB_KEY = localStorage.getItem('sb_key') || '';

const Auth = {

  // Retorna headers com token de sessão
  async headers() {
    const session = Auth.getSession();
    const token = session?.access_token || SB_KEY;
    return {
      'Content-Type': 'application/json',
      'apikey': SB_KEY,
      'Authorization': `Bearer ${token}`
    };
  },

  // Retorna headers apenas para leitura (sem Content-Type)
  async readHeaders() {
    const session = Auth.getSession();
    const token = session?.access_token || SB_KEY;
    return {
      'apikey': SB_KEY,
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    };
  },

  // Salva sessão no localStorage
  saveSession(session) {
    if (session) {
      localStorage.setItem('sb_session', JSON.stringify(session));
    } else {
      localStorage.removeItem('sb_session');
    }
  },

  // Recupera sessão salva
  getSession() {
    try {
      const raw = localStorage.getItem('sb_session');
      if (!raw) return null;
      const session = JSON.parse(raw);
      // Verifica se expirou
      if (session.expires_at && Date.now() / 1000 > session.expires_at) {
        localStorage.removeItem('sb_session');
        return null;
      }
      return session;
    } catch {
      return null;
    }
  },

  // Verifica se está logado — redireciona para login se não estiver
  // Páginas em exemptPages não redirecionam se não houver credenciais configuradas
  requireAuth(allowWithoutConfig = false) {
    const hasConfig = !!(localStorage.getItem('sb_url') && localStorage.getItem('sb_key'));
    if (allowWithoutConfig && !hasConfig) {
      return false; // permite ficar na página sem redirecionar
    }
    const session = Auth.getSession();
    if (!session) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  },

  // Retorna dados do usuário logado
  getUser() {
    const session = Auth.getSession();
    return session?.user || null;
  },

  // Login com e-mail e senha
  async login(email, password) {
    if (!SB_URL || !SB_KEY) throw new Error('Banco não configurado. Acesse admin.html primeiro.');
    const res = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SB_KEY },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error_description || data.msg || 'Erro ao fazer login.');
    Auth.saveSession(data);
    return data;
  },

  // Logout
  async logout() {
    const session = Auth.getSession();
    if (session?.access_token && SB_URL && SB_KEY) {
      await fetch(`${SB_URL}/auth/v1/logout`, {
        method: 'POST',
        headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${session.access_token}` }
      }).catch(() => {});
    }
    Auth.saveSession(null);
    window.location.href = 'login.html';
  },

  // Renderiza barra de usuário no topo da página
  renderUserBar(containerId) {
    const user = Auth.getUser();
    if (!user) return;
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px; font-size:13px; color:var(--text-muted);">
        <span>👤 ${user.email}</span>
        <button onclick="Auth.logout()" style="
          padding:5px 12px; font-size:13px; font-family:inherit;
          background:transparent; border:1px solid var(--border);
          border-radius:6px; cursor:pointer; color:var(--text-muted);
        ">Sair</button>
      </div>
    `;
  }
};
