async function loadReviews(){
  try{
    const res = await fetch('reviews.json', {cache: 'no-store'});
    const data = await res.json();
    return data.sort((a,b)=> new Date(b.created_at) - new Date(a.created_at));
  }catch(e){
    console.error('Не удалось загрузить reviews.json', e);
    return [];
  }

}

// Global auth state (populated after validate)
let currentToken = null;
let currentUserIsAdmin = false;

// Add logout button to hero actions (removes local token)
function addLogoutButton(){
  const existing = document.getElementById('logoutBtn');
  if (existing) return;
  const target = document.querySelector('.top-right-controls') || document.querySelector('.hero-actions');
  if (!target) return;
  const btn = document.createElement('a');
  btn.id = 'logoutBtn';
  btn.className = 'btn';
  btn.textContent = 'Выйти';
  btn.href = '#';
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    try { localStorage.removeItem('site_token'); } catch {}
    try { if (window.currentToken) window.currentToken = null; } catch {}
    location.reload();
  });
  target.appendChild(btn);
}

function addLoginInfo(userLabel) {
  const existing = document.getElementById('loginInfo');
  if (existing) existing.remove();
  const target = document.querySelector('.top-right-controls');
  if (!target) return;
  const info = document.createElement('div');
  info.id = 'loginInfo';
  info.className = 'review-logged';
  info.textContent = `Вход выполнен как ${userLabel}`;
  target.insertBefore(info, target.firstChild);
}

function renderList(container, items){
  container.innerHTML = '';
  if(!items.length){container.innerHTML = '<p class="muted">Пока нет отзывов.</p>';return}
  for(const it of items){
    const el = document.createElement('div'); el.className='review';
    const meta = document.createElement('div'); meta.className='meta'; meta.textContent = `${it.user_label || 'Пользователь'} • ${new Date(it.created_at).toLocaleString()}`;
    el.appendChild(meta);
    // stars
    if (typeof it.stars === 'number'){
      const starsEl = document.createElement('div'); starsEl.className = 'stars';
      for(let i=1;i<=5;i++){
        const s = document.createElement('span'); s.className = 'star' + (i<=it.stars ? ' filled' : ''); s.textContent = '★';
        starsEl.appendChild(s);
      }
      el.appendChild(starsEl);
    }
    const text = document.createElement('div'); text.className='text'; text.textContent = it.text;
    el.appendChild(text);
    // admin controls (delete/ban) shown only for logged-in admins
    if (typeof currentUserIsAdmin !== 'undefined' && currentUserIsAdmin && typeof it.user_id !== 'undefined'){
      const ctrl = document.createElement('div'); ctrl.className = 'admin-controls';
      const del = document.createElement('button'); del.className = 'admin-btn delete'; del.textContent = 'Удалить';
      del.addEventListener('click', async ()=>{
        if(!confirm('Удалить все отзывы этого пользователя?')) return;
        try{
          const res = await fetch('http://localhost:8080/reviews/admin_action', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({token: currentToken, action:'delete', target_user_id: it.user_id})});
          const jj = await res.json();
          if(jj && jj.ok){
            alert('Отзывы удалены: '+(jj.deleted||0));
            const all = await loadReviews(); renderList(document.getElementById('latestReviews'), all.slice(0,5)); renderList(document.getElementById('allReviewsList'), all);
          }else{ alert('Ошибка: '+(jj && jj.error)); }
        }catch(e){ console.error(e); alert('Ошибка сети'); }
      });

      const ban = document.createElement('button'); ban.className = 'admin-btn ban'; ban.textContent = 'Заблокировать';
      ban.addEventListener('click', async ()=>{
        if(!confirm('Заблокировать пользователя от отправки отзывов?')) return;
        try{
          const res = await fetch('http://localhost:8080/reviews/admin_action', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({token: currentToken, action:'ban', target_user_id: it.user_id})});
          const jj = await res.json();
          if(jj && jj.ok){ alert('Пользователь заблокирован.'); }
          else{ alert('Ошибка: '+(jj && jj.error)); }
        }catch(e){ console.error(e); alert('Ошибка сети'); }
      });

      ctrl.appendChild(del); ctrl.appendChild(ban); el.appendChild(ctrl);
    }
    container.appendChild(el);
  }
}

async function loadReputationTop(){
  try{
    const res = await fetch('http://localhost:8080/reputation/top', {cache: 'no-store'});
    const data = await res.json();
    return data.ok ? (data.top || []) : [];
  }catch(e){
    console.error('Failed to load reputation top', e);
    return [];
  }
}

function renderTopList(container, items){
  container.innerHTML = '';
  if(!items.length){container.innerHTML = '<p class="muted">Пока нет данных о репутации.</p>';return}
  for(const item of items){
    const el = document.createElement('div');
    el.className = 'top-item';
    if(item.rank === 1) el.classList.add('place-1');
    else if(item.rank === 2) el.classList.add('place-2');
    else if(item.rank === 3) el.classList.add('place-3');
    
    const rank = document.createElement('div');
    rank.className = 'top-item-rank';
    rank.textContent = `#${item.rank}`;
    
    const name = document.createElement('div');
    name.className = 'top-item-name';
    name.textContent = item.display_name;
    
    const rep = document.createElement('div');
    rep.className = 'top-item-reputation';
    rep.textContent = `${item.reputation} очков`;
    
    el.appendChild(rank);
    el.appendChild(name);
    el.appendChild(rep);
    container.appendChild(el);
  }
}

document.addEventListener('DOMContentLoaded', async ()=>{
  const reviews = await loadReviews();
  const latest = reviews.slice(0,5);
  const latestContainer = document.getElementById('latestReviews');
  const allBtn = document.getElementById('allReviewsBtn');
  const modal = document.getElementById('allReviewsModal');
  const allList = document.getElementById('allReviewsList');
  const closeModal = document.getElementById('closeModal');
  
  // Top view elements
  const aboutBtn = document.getElementById('aboutBtn');
  const topBtn = document.getElementById('topBtn');
  const aboutContent = document.getElementById('aboutContent');
  const topContent = document.getElementById('topContent');
  const topList = document.getElementById('topList');

  renderList(latestContainer, latest);
  renderList(allList, reviews);

  allBtn.addEventListener('click', ()=>{ modal.setAttribute('aria-hidden','false'); });
  closeModal.addEventListener('click', ()=>{ modal.setAttribute('aria-hidden','true'); });
  
  // Setup About/Top toggle
  const aboutTitle = document.getElementById('aboutTitle');
  
  aboutBtn.addEventListener('click', async ()=>{
    aboutContent.style.display = 'block';
    topContent.style.display = 'none';
    aboutBtn.classList.add('primary');
    topBtn.classList.remove('primary');
    aboutTitle.textContent = 'О сайте';
  });
  
  topBtn.addEventListener('click', async ()=>{
    aboutContent.style.display = 'none';
    topContent.style.display = 'block';
    topBtn.classList.add('primary');
    aboutBtn.classList.remove('primary');
    aboutTitle.textContent = 'Топ';
    
    // Load and display top
    const topData = await loadReputationTop();
    renderTopList(topList, topData);
  });

  // Load server-provided background image (place bg.jpg into the website/ folder)
  (function tryLoadServerBackground(){
    const img = new Image();
    img.onload = ()=>{ document.body.style.backgroundImage = `url('bg.jpg')`; document.body.style.backgroundSize = 'cover'; document.body.style.backgroundPosition = 'center'; };
    img.onerror = ()=>{};
    img.src = 'bg.jpg';
  })();

  // leave review btn opens telegram bot link (placeholder)
  const leave = document.getElementById('leaveReviewBtn');
  const botLink = document.getElementById('botLink');
  const BOT_USERNAME = 'Questionnairesold1_bot';
  botLink.href = `https://t.me/${BOT_USERNAME}`;
  // Auth endpoint (matches bot's small auth server)
  const AUTH_ENDPOINT = 'http://localhost:8080/auth/validate';

  // Keep the current validated token in memory (globals declared above)

  // Try to restore token from localStorage (persistent session)
  const storedToken = localStorage.getItem('site_token');
  if (storedToken) {
    try {
      const rr = await fetch(`${AUTH_ENDPOINT}?token=${encodeURIComponent(storedToken)}`);
      const jj = await rr.json();
      if (jj && jj.valid) {
        currentToken = storedToken;
        currentUserIsAdmin = !!jj.is_admin;
        addLoginInfo(jj.user_label || jj.username || jj.user_id);
        const authBtn = document.getElementById('authBtn');
        if (authBtn) authBtn.style.display = 'none';
        addLogoutButton();
        showReviewForm(currentToken);
      } else {
        localStorage.removeItem('site_token');
      }
    } catch (e) {
      console.error('Failed to validate stored token', e);
    }
  }

  // If token present in URL, validate it with the bot auth server
  const params = new URLSearchParams(location.search);
  const token = params.get('token');
  if (token) {
    try {
      const r = await fetch(`${AUTH_ENDPOINT}?token=${encodeURIComponent(token)}`);
      const j = await r.json();
      if (j && j.valid) {
        currentUserIsAdmin = !!j.is_admin;
        addLoginInfo(j.user_label || j.username || j.user_id);
        currentToken = token;
        try { localStorage.setItem('site_token', currentToken); } catch (e){}
        const authBtn = document.getElementById('authBtn');
        if (authBtn) authBtn.style.display = 'none';
        addLogoutButton();
        showReviewForm(currentToken);
      } else {
        console.warn('Token not valid');
      }
    } catch (e) {
      console.error('Auth check failed', e);
    }
  }

  leave.addEventListener('click', async (e)=>{
    e.preventDefault();
    // If already validated, show the form directly
    if (currentToken) { showReviewForm(currentToken); return; }
    try{
      const res = await fetch('http://localhost:8080/auth/create', {
        method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ttl_hours:1})
      });
      const j = await res.json();
      if(j && j.start_link){
        const newToken = j.token;
        window.open(j.start_link, '_blank');
        (async function pollAuth(tkn){
          const deadline = Date.now() + 60000; // 60s timeout
          while(Date.now() < deadline){
            try{
              const res = await fetch(`${AUTH_ENDPOINT}?token=${encodeURIComponent(tkn)}`);
              const body = await res.json();
              if(body && body.valid){
                try { localStorage.setItem('site_token', tkn); } catch (e){}
                location.reload();
                return;
              }
            }catch(e){ console.error('poll error', e); }
            await new Promise(r=>setTimeout(r, 2000));
          }
          console.warn('Auth poll timed out');
        })(newToken);
      } else {
        // fallback: open bot
        location.href = `https://t.me/${BOT_USERNAME}`;
      }
    }catch(err){
      console.error(err);
      location.href = `https://t.me/${BOT_USERNAME}`;
    }
  });
  // explicit auth button (opens bot via created token)
  const authBtn = document.getElementById('authBtn');
  if (authBtn) {
    authBtn.addEventListener('click', async (e)=>{
      e.preventDefault();
      if (currentToken) { showReviewForm(currentToken); return; }
      try{
        const res = await fetch('http://localhost:8080/auth/create', {
          method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ttl_hours:1})
        });
        const j = await res.json();
        if(j && j.start_link){
          const newToken = j.token;
          window.open(j.start_link, '_blank');
          (async function pollAuth(tkn){
            const deadline = Date.now() + 60000;
            while(Date.now() < deadline){
              try{
                const res = await fetch(`${AUTH_ENDPOINT}?token=${encodeURIComponent(tkn)}`);
                const body = await res.json();
                if(body && body.valid){
                  currentUserIsAdmin = !!body.is_admin;
                  addLoginInfo(body.user_label || body.username || body.user_id);
                  currentToken = tkn;
                  try { localStorage.setItem('site_token', currentToken); } catch (e){}
                  const authBtn = document.getElementById('authBtn');
                  if (authBtn) authBtn.style.display = 'none';
                  addLogoutButton();
                  showReviewForm(currentToken);
                  return;
                }
              }catch(e){ console.error('poll error', e); }
              await new Promise(r=>setTimeout(r, 2000));
            }
            console.warn('Auth poll timed out');
          })(newToken);
        } else {
          location.href = `https://t.me/${BOT_USERNAME}`;
        }
      }catch(err){
        console.error(err);
        location.href = `https://t.me/${BOT_USERNAME}`;
      }
    });
  }

  // Render a simple review form for authenticated users
  function showReviewForm(token){
    if(!token) return;
    // prefer a dedicated container below the latest reviews
    const container = document.getElementById('reviewFormContainer') || document.querySelector('.hero-inner');
    if(!container) return;
    // avoid duplicate
    if(document.getElementById('reviewForm')) return;
    const form = document.createElement('div'); form.id='reviewForm'; form.className='review-form';
    form.innerHTML = `
      <h3>Оставить отзыв</h3>
      <div class="stars" id="starPicker">
        <span class="star">★</span>
        <span class="star">★</span>
        <span class="star">★</span>
        <span class="star">★</span>
        <span class="star">★</span>
      </div>
      <textarea id="reviewText" class="review-textarea" placeholder="Ваш отзыв..."></textarea>
      <div><button id="submitReview" class="btn primary">Отправить</button></div>
    `;
    container.appendChild(form);
    // star picker logic (starts with 5 selected)
    let selectedStars = 5;
    const starPicker = form.querySelector('#starPicker');
    if (starPicker){
      const stars = Array.from(starPicker.querySelectorAll('.star'));
      const update = ()=> stars.forEach((ss,i)=> ss.classList.toggle('filled', i < selectedStars));
      update();
      stars.forEach((s, idx)=>{
        s.addEventListener('click', ()=>{
          selectedStars = idx+1;
          update();
        });
        s.addEventListener('mouseover', ()=>{
          stars.forEach((ss,i)=> ss.classList.toggle('filled', i <= idx));
        });
        s.addEventListener('mouseleave', update);
      });
    }
    const btn = form.querySelector('#submitReview');
    btn.addEventListener('click', async ()=>{
      const txt = (form.querySelector('#reviewText').value || '').trim();
      if(!txt){ alert('Введите текст отзыва'); return; }
      try{
        const res = await fetch('http://localhost:8080/reviews/add', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({token: token, text: txt, stars: selectedStars})});
        const j = await res.json();
        if(j && j.ok){
          alert('Спасибо — отзыв сохранён.');
          // reload reviews
          const all = await loadReviews();
          renderList(document.getElementById('latestReviews'), all.slice(0,5));
          renderList(document.getElementById('allReviewsList'), all);
          form.remove();
        }else{
          alert('Ошибка при сохранении отзыва: '+(j && j.error) );
        }
      }catch(e){
        console.error(e); alert('Ошибка сети при отправке отзыва');
      }
    });
  }
});
