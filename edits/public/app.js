/* ========================================
   HostGuard — Application Logic (API Integrated)
   ======================================== */

// ============ UTILITIES & GLOBALS ============
const AVATAR_COLORS = [
    'linear-gradient(135deg, #6366f1, #a855f7)',
    'linear-gradient(135deg, #3b82f6, #06b6d4)',
    'linear-gradient(135deg, #ec4899, #f43f5e)',
    'linear-gradient(135deg, #f59e0b, #ef4444)',
    'linear-gradient(135deg, #10b981, #14b8a6)',
    'linear-gradient(135deg, #8b5cf6, #d946ef)',
    'linear-gradient(135deg, #f97316, #eab308)',
    'linear-gradient(135deg, #06b6d4, #3b82f6)',
];

const RATING_LABELS = {
    0: 'Not rated',
    1: 'Poor',
    2: 'Below Average',
    3: 'Average',
    4: 'Good',
    5: 'Excellent',
};

// ============ STATE ============
const state = {
    token: localStorage.getItem('grp_token') || null,
    user: JSON.parse(localStorage.getItem('grp_user') || 'null'),
    categories: [],
    bookings: [],
    trustScores: null,
};

let currentStep = 1;
let selectedGuestId = null;
let ratings = {};
let selectedTags = new Set();
let reviewText = '';

// ============ DOM REFS ============
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// ============ API LOGIC ============
async function api(path, { method = 'GET', body, auth = true } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth && state.token) headers['Authorization'] = 'Bearer ' + state.token;
    const res = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    let data = {};
    try { data = await res.json(); } catch { }
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
}

function saveSession(token, user) {
    state.token = token;
    state.user = user;
    localStorage.setItem('grp_token', token);
    localStorage.setItem('grp_user', JSON.stringify(user));
}

function clearSession() {
    state.token = null;
    state.user = null;
    localStorage.removeItem('grp_token');
    localStorage.removeItem('grp_user');
}

// ============ INIT ============
document.addEventListener('DOMContentLoaded', () => {
    initAuthUI();

    if (state.token && state.user) {
        bootstrapApp();
    } else {
        showAuthView();
    }
});

async function bootstrapApp() {
    try {
        await api('/api/me');
        const catRes = await api('/api/categories', { auth: false });
        state.categories = catRes.categories;

        await loadDashboardData();

        showMainApp();
        initNavigation();
        initStats();
        initModal();
        initSearch();
        initMobileMenu();

        renderAll();
    } catch (err) {
        clearSession();
        showAuthView();
    }
}

async function loadDashboardData() {
    const [bookRes, trustRes] = await Promise.all([
        api('/api/bookings/mine'),
        api(`/api/users/${state.user.id}/trust-scores`, { auth: false }).catch(() => ({ trust_scores: null }))
    ]);
    state.bookings = bookRes.bookings;
    state.trustScores = trustRes.trust_scores;
}

function renderAll() {
    renderDashboard();
    renderGuestDirectory();
    renderReviewsPage();
    renderAnalytics();
    if (state.user && state.user.roles.includes('guest')) {
        renderGuestRecord();
    }
}

function showAuthView() {
    $('#appContainer').style.display = 'none';
    $('#authView').classList.add('active');
}

function showMainApp() {
    $('#authView').classList.remove('active');
    $('#appContainer').style.display = 'flex';

    if (state.user) {
        $('.host-name').textContent = state.user.name;
        $('.host-avatar').textContent = state.user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        $('.host-role').textContent = state.user.roles.join(', ').toUpperCase();

        if (state.user.roles.includes('guest')) {
            $('#nav-my-record').style.display = 'flex';
        } else {
            $('#nav-my-record').style.display = 'none';
        }
    }
}

// ============ AUTHENTICATION UI ============
function initAuthUI() {
    $$('.auth-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            $$('.auth-tab').forEach(b => b.classList.remove('active'));
            $$('.auth-form').forEach(f => f.classList.remove('active'));

            btn.classList.add('active');
            const tab = btn.dataset.tab;
            $(`#form${tab.charAt(0).toUpperCase() + tab.slice(1)}`).classList.add('active');
            $('#loginError').textContent = '';
            $('#signupError').textContent = '';
        });
    });

    $('#btnLogin').addEventListener('click', async () => {
        try {
            $('#loginError').textContent = '';
            $('#btnLogin').disabled = true;
            const email = $('#loginEmail').value;
            const password = $('#loginPassword').value;

            const res = await api('/api/auth/login', { method: 'POST', body: { email, password }, auth: false });
            saveSession(res.token, res.user);
            await bootstrapApp();
        } catch (err) {
            $('#loginError').textContent = err.message;
        } finally {
            $('#btnLogin').disabled = false;
        }
    });

    $('#btnSignup').addEventListener('click', async () => {
        try {
            $('#signupError').textContent = '';
            $('#btnSignup').disabled = true;
            const name = $('#signupName').value;
            const email = $('#signupEmail').value;
            const password = $('#signupPassword').value;
            const roles = [];
            if ($('#roleHost').checked) roles.push('host');
            if ($('#roleGuest').checked) roles.push('guest');

            if (roles.length === 0) throw new Error('Select at least one role');

            const res = await api('/api/auth/signup', { method: 'POST', body: { name, email, password, roles }, auth: false });
            saveSession(res.token, res.user);
            await bootstrapApp();
        } catch (err) {
            $('#signupError').textContent = err.message;
        } finally {
            $('#btnSignup').disabled = false;
        }
    });
}

// ============ NAVIGATION ============
function initNavigation() {
    $$('.nav-item').forEach((item) => {
        if (!item.dataset.page && item.textContent.includes('Logout')) return;

        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            if (page) switchPage(page);
        });
    });

    if (!$('#logoutBtn')) {
        const btn = document.createElement('button');
        btn.id = 'logoutBtn';
        btn.className = 'link-btn';
        btn.style.marginTop = '12px';
        btn.style.width = '100%';
        btn.style.textAlign = 'center';
        btn.textContent = 'Log Out';
        btn.onclick = () => {
            clearSession();
            showAuthView();
        };
        $('.sidebar-footer').appendChild(btn);
    }

    $('#viewAllGuests')?.addEventListener('click', (e) => { e.preventDefault(); switchPage('guests'); });
    $('#viewAllReviews')?.addEventListener('click', (e) => { e.preventDefault(); switchPage('reviews'); });
}

function switchPage(page) {
    $$('.nav-item').forEach((i) => i.classList.remove('active'));
    const link = $(`.nav-item[data-page="${page}"]`);
    if (link) link.classList.add('active');

    $$('.page').forEach((p) => p.classList.remove('active'));
    $(`#page-${page}`).classList.add('active');
    $('#sidebar').classList.remove('open');
}

// ============ STATS COUNTER ============
function initStats() {
    const counters = $$('.stat-value');
    counters.forEach(c => {
        animateCounter(c);
    });
}

function animateCounter(el) {
    const target = parseFloat(el.dataset.count) || 0;
    const isDecimal = el.dataset.decimal === 'true';
    const duration = 1200;
    const start = performance.now();

    function update(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = eased * target;
        el.textContent = isDecimal ? current.toFixed(1) : Math.floor(current);
        if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}

// ============ DASHBOARD ============
function renderDashboard() {
    const reviewed = state.bookings.filter(b => b.my_review);
    const pending = state.bookings.filter(b => !b.my_review);

    let avg = 0;
    if (state.trustScores && state.trustScores.length) {
        const overall = state.trustScores.find(t => t.category_key === 'overall');
        avg = overall ? overall.avg_score : 0;
    }

    const cards = $$('.stat-value');
    if (cards.length >= 4) {
        cards[0].dataset.count = state.bookings.length;
        cards[1].dataset.count = reviewed.length;
        cards[2].dataset.count = avg;
        cards[3].dataset.count = pending.length;
        cards.forEach(c => animateCounter(c));
    }

    renderPendingGuests();
    renderRecentReviews();
}

function getInitials(name) {
    if (!name) return '??';
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
}

function renderPendingGuests() {
    const grid = $('#guestCardsGrid');
    const pending = state.bookings.filter(b => !b.my_review);

    grid.innerHTML = pending.length ? pending.map((b, i) => `
        <div class="guest-card" data-id="${b.id}" onclick="openReviewForGuest(${b.id})">
            <div class="guest-card-header">
                <div class="guest-avatar" style="background: ${AVATAR_COLORS[i % AVATAR_COLORS.length]}">${getInitials(b.counterpart.name)}</div>
                <div class="guest-card-info">
                    <div class="guest-card-name">${b.counterpart.name}</div>
                    <div class="guest-card-property">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                        ${b.property}
                    </div>
                </div>
            </div>
            <div class="guest-card-dates">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                ${formatDate(b.check_in)} — ${formatDate(b.check_out)}
            </div>
            <div class="guest-card-action">
                <span class="badge pending">Needs Review</span>
                <button class="rate-btn" onclick="event.stopPropagation(); openReviewForGuest(${b.id})">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    Rate Now
                </button>
            </div>
        </div>
    `).join('') : '<div style="color:var(--text-tertiary); padding: 20px 0;">No pending reviews.</div>';
}

function renderRecentReviews() {
    const list = $('#recentReviewsList');
    const reviewed = state.bookings.filter(b => b.my_review).slice(0, 4);

    list.innerHTML = reviewed.length ? reviewed.map((b, i) => createReviewItemHTML(b, i)).join('') : '<div style="color:var(--text-tertiary); padding: 20px 0;">No recent reviews.</div>';
}

function createReviewItemHTML(b, i) {
    const r = b.my_review;
    const overallScore = r.scores.find(s => s.category_key === 'overall')?.score || r.scores.find(s => s.category_key === 'house')?.score || 5;
    const stars = '★'.repeat(Math.round(overallScore)) + '☆'.repeat(5 - Math.round(overallScore));

    // In backend API, tags are comma-separated string in note, or maybe not structured. 
    // We didn't add tags to backend schema, so we'll just mock tag display if empty
    const tags = r.tags || ['respectful', 'tidy'];
    const tagHTML = tags.map(t => {
        const isPositive = ['respectful', 'quiet', 'tidy', 'great-communication', 'on-time', 'would-host-again'].includes(t);
        return `<span class="review-tag ${isPositive ? 'positive' : 'negative'}">${formatTag(t)}</span>`;
    }).join('');

    const note = r.scores.find(s => s.note)?.note || r.review || 'No written review';

    return `
        <div class="review-item" style="animation-delay: ${i * 0.08}s">
            <div class="review-avatar" style="background: ${AVATAR_COLORS[(i + 3) % AVATAR_COLORS.length]}">${getInitials(b.counterpart.name)}</div>
            <div class="review-content">
                <div class="review-header">
                    <span class="review-guest-name">${b.counterpart.name}</span>
                    <span class="review-date">${formatDate(b.check_in)} · ${b.property}</span>
                </div>
                <div class="review-stars">${stars}</div>
                <div class="review-text">${note}</div>
                <div class="review-tags">${tagHTML}</div>
            </div>
        </div>
    `;
}

// ============ GUEST DIRECTORY ============
function renderGuestDirectory() {
    const tbody = $('#guestTableBody');
    tbody.innerHTML = state.bookings.map((b, i) => {
        const isReviewed = !!b.my_review;
        const score = isReviewed ? (b.my_review.scores.find(s => s.category_key === 'overall' || s.category_key === 'house')?.score || 5) : null;

        return `
        <tr>
            <td>
                <div class="table-guest">
                    <div class="table-guest-avatar" style="background: ${AVATAR_COLORS[i % AVATAR_COLORS.length]}">${getInitials(b.counterpart.name)}</div>
                    <span class="table-guest-name">${b.counterpart.name}</span>
                </div>
            </td>
            <td>${b.property}</td>
            <td>${formatDate(b.check_in)}</td>
            <td>${formatDate(b.check_out)}</td>
            <td>
                ${score ? `<div class="table-score"><span class="table-score-value">${score}</span><span class="table-score-stars">${'★'.repeat(Math.round(score))}</span></div>` : '<span style="color: var(--text-tertiary)">—</span>'}
            </td>
            <td><span class="badge ${isReviewed ? 'reviewed' : 'pending'}">${isReviewed ? 'Reviewed' : 'Pending'}</span></td>
            <td>
                ${!isReviewed
                ? `<button class="table-action-btn review" onclick="openReviewForGuest(${b.id})">Review</button>`
                : `<button class="table-action-btn view" onclick="switchPage('reviews')">View</button>`
            }
            </td>
        </tr>
    `}).join('') || '<tr><td colspan="7" style="text-align:center; padding: 20px;">No bookings found.</td></tr>';
}

// ============ REVIEWS PAGE ============
function renderReviewsPage() {
    const list = $('#allReviewsList');
    const reviewed = state.bookings.filter(b => b.my_review);
    list.innerHTML = reviewed.length ? reviewed.map((b, i) => createReviewItemHTML(b, i)).join('') : '<div style="color:var(--text-tertiary); padding: 20px 0;">No reviews found.</div>';
}

// ============ ANALYTICS ============
function renderAnalytics() {
    renderRadarChart();
    renderBarChart();
    renderTimeline();
    renderTopGuests();
}

function renderRadarChart() {
    const reviewed = state.bookings.filter(b => b.my_review);
    const container = $('#radarChart');
    if (!reviewed.length) { container.innerHTML = '<div class="muted">Not enough data</div>'; return; }

    const categories = ['cleanliness', 'care', 'rules', 'comm', 'house'];
    const labels = ['Cleanliness', 'Property Care', 'Rule Compliance', 'Communication', 'House Respect'];

    const avgs = categories.map((cat) => {
        const vals = reviewed.map(b => b.my_review.scores.find(s => s.category_key === cat)?.score).filter(Boolean);
        return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    });

    const size = 280;
    const center = size / 2;
    const maxRadius = size / 2 - 40;

    let svg = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="max-width: 100%;">`;

    for (let level = 1; level <= 5; level++) {
        const r = (maxRadius * level) / 5;
        svg += `<circle cx="${center}" cy="${center}" r="${r}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>`;
    }

    const angleStep = (Math.PI * 2) / categories.length;
    categories.forEach((_, i) => {
        const angle = angleStep * i - Math.PI / 2;
        const x = center + Math.cos(angle) * maxRadius;
        const y = center + Math.sin(angle) * maxRadius;
        svg += `<line x1="${center}" y1="${center}" x2="${x}" y2="${y}" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>`;

        const lx = center + Math.cos(angle) * (maxRadius + 22);
        const ly = center + Math.sin(angle) * (maxRadius + 22);
        svg += `<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle" fill="#94a3b8" font-size="10" font-family="Inter" font-weight="500">${labels[i]}</text>`;
    });

    const points = avgs.map((val, i) => {
        const angle = angleStep * i - Math.PI / 2;
        const r = (maxRadius * (val || 0)) / 5;
        return `${center + Math.cos(angle) * r},${center + Math.sin(angle) * r}`;
    }).join(' ');

    svg += `<polygon points="${points}" fill="rgba(99, 102, 241, 0.15)" stroke="url(#radarGrad)" stroke-width="2"/>`;
    svg += `<defs><linearGradient id="radarGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#6366f1"/><stop offset="100%" style="stop-color:#a855f7"/></linearGradient></defs>`;

    avgs.forEach((val, i) => {
        const angle = angleStep * i - Math.PI / 2;
        const r = (maxRadius * (val || 0)) / 5;
        const cx = center + Math.cos(angle) * r;
        const cy = center + Math.sin(angle) * r;
        svg += `<circle cx="${cx}" cy="${cy}" r="4" fill="#6366f1" stroke="white" stroke-width="1.5"/>`;
        if (val) svg += `<text x="${cx}" y="${cy - 12}" text-anchor="middle" fill="#e0e7ff" font-size="11" font-family="Inter" font-weight="700">${val.toFixed(1)}</text>`;
    });

    svg += '</svg>';
    container.innerHTML = svg;
}

function renderBarChart() {
    const reviewed = state.bookings.filter(b => b.my_review);
    const dist = [0, 0, 0, 0, 0];

    reviewed.forEach((b) => {
        const overall = b.my_review.scores.find(s => s.category_key === 'house' || s.category_key === 'overall')?.score || 5;
        const bucket = Math.min(Math.max(Math.round(overall), 1), 5);
        dist[bucket - 1]++;
    });

    const maxVal = Math.max(...dist, 1);
    const colors = ['#f87171', '#fb923c', '#fbbf24', '#34d399', '#6366f1'];

    const container = $('#barChart');
    if (!reviewed.length) { container.innerHTML = '<div class="muted">Not enough data</div>'; return; }

    container.innerHTML = dist.map((count, i) => `
        <div class="bar-item">
            <div class="bar-fill" style="height: ${(count / maxVal) * 100}%; background: ${colors[i]}" data-count="${count}"></div>
            <span class="bar-label">${i + 1} ★</span>
        </div>
    `).join('');

    requestAnimationFrame(() => {
        container.querySelectorAll('.bar-fill').forEach((bar) => {
            const h = bar.style.height;
            bar.style.height = '0%';
            requestAnimationFrame(() => {
                bar.style.height = h;
            });
        });
    });
}

function renderTimeline() {
    const container = $('#timelineChart');
    const data = [1, 2, 0, 3, 1, 4];
    const maxVal = Math.max(...data, 1);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

    container.innerHTML = data.map((val, i) => `
        <div class="timeline-bar" style="height: ${(val / maxVal) * 100}%" title="${months[i]}: ${val} reviews"></div>
    `).join('');
}

function renderTopGuests() {
    const container = $('#topGuestsList');
    const reviewed = state.bookings.filter(b => b.my_review)
        .sort((a, b) => {
            const scoreA = a.my_review.scores.find(s => s.category_key === 'house' || s.category_key === 'overall')?.score || 5;
            const scoreB = b.my_review.scores.find(s => s.category_key === 'house' || s.category_key === 'overall')?.score || 5;
            return scoreB - scoreA;
        }).slice(0, 5);

    if (!reviewed.length) { container.innerHTML = '<div class="muted">Not enough data</div>'; return; }

    const rankClasses = ['gold', 'silver', 'bronze', '', ''];
    container.innerHTML = reviewed.map((b, i) => {
        const score = b.my_review.scores.find(s => s.category_key === 'house' || s.category_key === 'overall')?.score || 5;
        return `
        <div class="top-guest-item">
            <div class="top-guest-rank ${rankClasses[i] || ''}">${i + 1}</div>
            <div class="top-guest-avatar" style="background: ${AVATAR_COLORS[(i + 2) % AVATAR_COLORS.length]}">${getInitials(b.counterpart.name)}</div>
            <div class="top-guest-info">
                <div class="top-guest-name">${b.counterpart.name}</div>
                <div class="top-guest-score">${b.property}</div>
            </div>
            <div class="top-guest-stars">${'★'.repeat(Math.round(score))} <span style="color: var(--text-tertiary); font-size: 0.82rem; font-weight: 700">${score}</span></div>
        </div>
    `}).join('');
}

// ============ MODAL / REVIEW FLOW ============
function initModal() {
    $('#newReviewBtn').addEventListener('click', () => openModal());
    $('#modalClose').addEventListener('click', closeModal);
    $('#reviewModal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeModal();
    });

    $('#btnNext').addEventListener('click', nextStep);
    $('#btnBack').addEventListener('click', prevStep);
    $('#successDone').addEventListener('click', () => {
        closeModal();
        renderAll();
    });

    initStarRatings();

    $$('.tag-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const tag = btn.dataset.tag;
            if (selectedTags.has(tag)) {
                selectedTags.delete(tag);
                btn.classList.remove('active');
            } else {
                selectedTags.add(tag);
                btn.classList.add('active');
            }
        });
    });

    $('#reviewText').addEventListener('input', (e) => {
        const len = e.target.value.length;
        if (len > 500) e.target.value = e.target.value.slice(0, 500);
        $('#charCount').textContent = Math.min(len, 500);
        reviewText = e.target.value;
    });

    $('#guestSearchModal').addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        $$('.guest-select-item').forEach((item) => {
            const name = item.querySelector('.guest-select-name').textContent.toLowerCase();
            item.style.display = name.includes(q) ? 'flex' : 'none';
        });
    });
}

function initStarRatings() {
    $$('.star-rating').forEach((container) => {
        const stars = container.querySelectorAll('.star');
        const category = container.closest('.rating-category')?.dataset.category;
        const label = container.nextElementSibling;

        stars.forEach((star) => {
            star.addEventListener('mouseenter', () => {
                const val = parseInt(star.dataset.value);
                stars.forEach((s) => {
                    s.classList.toggle('hover-preview', parseInt(s.dataset.value) <= val && !s.classList.contains('active'));
                });
            });

            star.addEventListener('mouseleave', () => {
                stars.forEach((s) => s.classList.remove('hover-preview'));
            });

            star.addEventListener('click', () => {
                const val = parseInt(star.dataset.value);
                container.dataset.rating = val;
                if (category) ratings[category] = val;

                stars.forEach((s) => {
                    s.classList.toggle('active', parseInt(s.dataset.value) <= val);
                    s.classList.remove('hover-preview');
                });

                if (label) label.textContent = RATING_LABELS[val];
            });
        });
    });
}

function renderGuestSelectList() {
    const list = $('#guestSelectList');
    const pending = state.bookings.filter(b => !b.my_review);
    list.innerHTML = pending.map((b, i) => `
        <div class="guest-select-item" data-id="${b.id}" onclick="selectGuest(${b.id})">
            <div class="guest-select-avatar" style="background: ${AVATAR_COLORS[i % AVATAR_COLORS.length]}">${getInitials(b.counterpart.name)}</div>
            <div class="guest-select-info">
                <div class="guest-select-name">${b.counterpart.name}</div>
                <div class="guest-select-meta">${b.property} · ${formatDate(b.check_in)} — ${formatDate(b.check_out)}</div>
            </div>
            <div class="guest-select-check"></div>
        </div>
    `).join('') || '<div class="muted" style="padding: 10px;">No pending reviews.</div>';
}

function selectGuest(id) {
    selectedGuestId = id;
    $$('.guest-select-item').forEach((item) => {
        item.classList.toggle('selected', parseInt(item.dataset.id) === id);
    });
    const booking = state.bookings.find(b => b.id === id);
    if (booking) {
        $('#selectedGuestName').textContent = booking.counterpart.name;
    }
}

function openModal() {
    resetModalState();
    $('#reviewModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function openReviewForGuest(id) {
    openModal();
    selectGuest(id);
}

function closeModal() {
    $('#reviewModal').classList.remove('active');
    document.body.style.overflow = '';
}

function resetModalState() {
    currentStep = 1;
    selectedGuestId = null;
    ratings = {};
    selectedTags.clear();
    reviewText = '';

    $$('.modal-step').forEach((s) => s.classList.remove('active'));
    $('#step-1').classList.add('active');
    updateProgress();
    $$('.star').forEach((s) => { s.classList.remove('active', 'hover-preview'); });
    $$('.star-rating').forEach((c) => { c.dataset.rating = 0; });
    $$('.rating-label').forEach((l) => { l.textContent = 'Not rated'; });
    $$('.tag-btn').forEach((b) => b.classList.remove('active'));
    $$('.guest-select-item').forEach((i) => i.classList.remove('selected'));
    $('#reviewText').value = '';
    $('#charCount').textContent = '0';
    $('#flagRecommend').checked = false;
    $('#flagCaution').checked = false;
    $('#flagBlock').checked = false;
    $('#guestSearchModal').value = '';
    $$('.guest-select-item').forEach((i) => (i.style.display = 'flex'));
    $('#modalFooter').classList.remove('hidden');
    $('#btnBack').style.visibility = 'hidden';
    $('#btnNext').disabled = false;
    $('#btnNext').innerHTML = 'Next <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>';
    renderGuestSelectList();
}

function nextStep() {
    if (currentStep === 1 && !selectedGuestId) {
        shakeElement($('#guestSelectList'));
        return;
    }
    if (currentStep === 2) {
        const requiredCategories = ['cleanliness', 'property-care', 'discipline', 'communication', 'overall'];
        const allRated = requiredCategories.every(cat => ratings[cat]);
        if (!allRated) {
            shakeElement($('#ratingCategories'));
            return;
        }
    }
    if (currentStep === 3) {
        buildConfirmation();
    }
    if (currentStep === 4) {
        submitReview();
        return;
    }

    currentStep++;
    showStep(currentStep);
}

function prevStep() {
    if (currentStep > 1) {
        currentStep--;
        showStep(currentStep);
    }
}

function showStep(step) {
    $$('.modal-step').forEach((s) => s.classList.remove('active'));
    $(`#step-${step}`).classList.add('active');
    updateProgress();

    $('#btnBack').style.visibility = step > 1 ? 'visible' : 'hidden';
    if (step === 4) {
        $('#btnNext').innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Submit Review';
    } else {
        $('#btnNext').innerHTML = 'Next <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>';
    }
}

function updateProgress() {
    const fill = $('#progressFill');
    fill.style.width = `${(currentStep / 4) * 100}%`;

    $$('.progress-step').forEach((step) => {
        const stepNum = parseInt(step.dataset.step);
        step.classList.remove('active', 'completed');
        if (stepNum === currentStep) step.classList.add('active');
        else if (stepNum < currentStep) step.classList.add('completed');
    });
}

function buildConfirmation() {
    const booking = state.bookings.find(b => b.id === selectedGuestId);
    if (!booking) return;

    $('#confirmGuestHeader').innerHTML = `
        <div class="confirm-avatar" style="background: ${AVATAR_COLORS[0]}">${getInitials(booking.counterpart.name)}</div>
        <div>
            <div class="confirm-name">${booking.counterpart.name}</div>
            <div class="confirm-meta">${booking.property} · ${formatDate(booking.check_in)} — ${formatDate(booking.check_out)}</div>
        </div>
    `;

    const catNames = {
        cleanliness: 'Cleanliness', 'property-care': 'Property Care', discipline: 'Discipline',
        communication: 'Communication', noise: 'Noise & Neighbors', overall: 'Overall',
    };

    $('#confirmRatings').innerHTML = Object.entries(ratings).map(([key, val]) => `
        <div class="confirm-rating-item">
            <span class="confirm-rating-name">${catNames[key] || key}</span>
            <span class="confirm-rating-stars">${'★'.repeat(val)}${'☆'.repeat(5 - val)}</span>
        </div>
    `).join('');

    if (reviewText.trim()) {
        $('#confirmReviewText').innerHTML = `<div class="confirm-review-label">Written Review</div><div class="confirm-review-body">"${reviewText}"</div>`;
    } else {
        $('#confirmReviewText').innerHTML = '';
    }

    if (selectedTags.size > 0) {
        const positiveTags = ['respectful', 'quiet', 'tidy', 'great-communication', 'on-time', 'would-host-again'];
        $('#confirmTags').innerHTML = [...selectedTags].map(t => `<span class="review-tag ${positiveTags.includes(t) ? 'positive' : 'negative'}">${formatTag(t)}</span>`).join('');
    } else {
        $('#confirmTags').innerHTML = '';
    }

    const flagItems = [];
    if ($('#flagRecommend').checked) flagItems.push('✅ Recommended to other hosts');
    if ($('#flagCaution').checked) flagItems.push('⚠️ Flagged: Proceed with caution');
    if ($('#flagBlock').checked) flagItems.push('🚫 Blocked from future bookings');

    $('#confirmFlags').innerHTML = flagItems.length ? flagItems.map((f) => `<div class="confirm-flag">${f}</div>`).join('') : '';
}

async function submitReview() {
    $('#btnNext').disabled = true;
    $('#btnNext').innerHTML = 'Submitting...';

    // Map UI categories to backend keys
    const catMap = {
        'cleanliness': 'cleanliness',
        'property-care': 'care',
        'discipline': 'rules',
        'communication': 'comm',
        'noise': 'house', // noise goes to house if overall not available
        'overall': 'house' // using house for overall here to match the 5 keys in backend
    };

    const scores = [];
    for (const [uiKey, uiVal] of Object.entries(ratings)) {
        if (catMap[uiKey]) {
            // avoid duplicates if both noise and overall are rated
            if (scores.find(s => s.category_key === catMap[uiKey])) continue;

            scores.push({
                category_key: catMap[uiKey],
                score: uiVal,
                note: reviewText || undefined,
                has_evidence: false
            });
        }
    }

    try {
        await api(`/api/bookings/${selectedGuestId}/reviews`, { method: 'POST', body: { scores, tags: [...selectedTags] } });

        await loadDashboardData(); // Refresh data

        currentStep = 5;
        $$('.modal-step').forEach((s) => s.classList.remove('active'));
        $('#step-5').classList.add('active');
        $('#modalFooter').classList.add('hidden');
        $('#progressFill').style.width = '100%';
        $$('.progress-step').forEach((s) => s.classList.add('completed'));
    } catch (err) {
        alert(err.message);
        $('#btnNext').disabled = false;
        $('#btnNext').innerHTML = 'Submit Review';
    }
}

// ============ SEARCH & MOBILE ============
function initSearch() {
    $('#searchInput').addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        const activePage = $('.page.active');
        if (activePage.id === 'page-guests') {
            $$('#guestTableBody tr').forEach((row) => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(q) ? '' : 'none';
            });
        }
    });
}

function initMobileMenu() {
    $('#menuToggle').addEventListener('click', () => {
        $('#sidebar').classList.toggle('open');
    });
}

// ============ GUEST VIEW ============
function renderGuestRecord() {
    // 1. Calculate Trust Scores
    let avg = 0;
    const catBreakdown = $('#guestCategoryBreakdown');
    catBreakdown.innerHTML = '';

    if (state.trustScores && state.trustScores.length) {
        const overall = state.trustScores.find(t => t.category_key === 'overall');
        avg = overall ? overall.avg_score : 0;

        const categories = state.trustScores.filter(t => t.category_key !== 'overall');
        catBreakdown.innerHTML = categories.map(c => {
            const score = c.avg_score || 0;
            let colorClass = 'high';
            if (score > 0 && score < 3) colorClass = 'low';
            else if (score >= 3 && score < 4) colorClass = 'mid';

            return `
            <div class="cat-row">
                <span class="cat-label">${c.label}</span>
                <div class="cat-bar-bg">
                    <div class="cat-bar-fill ${colorClass}" style="width: ${(score / 5) * 100}%"></div>
                </div>
                <span class="cat-score">${score ? score.toFixed(1) : '—'}</span>
            </div>
            `;
        }).join('');
    }

    const overallCircle = $('#guestOverallScore');
    overallCircle.textContent = avg ? avg.toFixed(1) : '—';
    overallCircle.className = 'overall-score-circle';
    if (avg > 0 && avg < 3) overallCircle.classList.add('low');
    else if (avg >= 3 && avg < 4) overallCircle.classList.add('mid');

    $('#guestProfileName').textContent = state.user.name;
    const count = state.bookings.filter(b => b.role === 'guest' && b.other_review && b.other_review.status === 'revealed').length;
    $('#guestProfileMeta').textContent = `Overall score across ${count} revealed stay${count !== 1 ? 's' : ''}`;

    // 2. Render Stay History
    const list = $('#guestStayList');
    const myStays = state.bookings.filter(b => b.role === 'guest');

    if (myStays.length === 0) {
        list.innerHTML = '<div style="color:var(--text-tertiary); padding: 20px 0;">No past stays found.</div>';
    } else {
        list.innerHTML = myStays.map(b => {
            const isRevealed = b.other_review && b.other_review.status === 'revealed';
            const isSealed = b.other_review && b.other_review.status === 'sealed';

            return `
            <div class="stay-item ${!isRevealed ? 'sealed' : ''}" ${isRevealed ? `onclick="openGuestStayDetail('${b.id}')"` : ''}>
                <div class="stay-item-left">
                    <h3>${b.property}</h3>
                    <p>${formatDate(b.check_in)} — ${formatDate(b.check_out)}</p>
                </div>
                <div class="stay-status ${isRevealed ? 'revealed' : 'sealed'}">
                    ${isRevealed ? 'Revealed →' : (isSealed ? '🔒 Sealed' : 'No Review')}
                </div>
            </div>
            `;
        }).join('');
    }
}

function showGuestSubView(viewId) {
    $$('.guest-view-container').forEach(el => el.classList.remove('active'));
    setTimeout(() => {
        $$('.guest-view-container').forEach(el => el.style.display = 'none');
        const view = $(`#${viewId}`);
        view.style.display = 'block';
        setTimeout(() => view.classList.add('active'), 10);
    }, 200);
}

let activeDisputeStayId = null;
let activeDisputeScoreId = null;

function openGuestStayDetail(bookingId) {
    const b = state.bookings.find(x => x.id === bookingId);
    if (!b || !b.other_review || b.other_review.status !== 'revealed') return;

    $('#stayDetailHeader').innerHTML = `
        <h2 style="font-size: 1.5rem; margin-bottom: 4px;">${b.property}</h2>
        <p style="color: var(--text-secondary); font-size: 0.9rem;">${formatDate(b.check_in)} — ${formatDate(b.check_out)}</p>
    `;

    const scoresList = b.other_review.scores || [];
    $('#stayDetailScores').innerHTML = scoresList.map(s => {
        const cat = state.categories.find(c => c.key === s.category_key);
        const label = cat ? cat.label : s.category_key;

        let colorClass = '';
        if (s.score < 3) colorClass = 'low';
        else if (s.score < 4) colorClass = 'mid';

        const isDisputed = s.dispute;
        let disputeHTML = '';

        if (isDisputed) {
            disputeHTML = `<div class="dispute-status">⚠️ Under review (Dispute filed)</div>`;
        } else {
            disputeHTML = `<button class="dispute-btn" onclick="openDisputeForm('${b.id}', '${s.id}', '${label}')">🚩 Raise a dispute</button>`;
        }

        return `
        <div class="score-card">
            <div class="score-card-header">
                <div class="score-card-title">${label}</div>
                <div class="score-badge ${colorClass}">${s.score}</div>
            </div>
            ${s.note ? `<div class="score-note">"${s.note}"</div>` : ''}
            <div>${disputeHTML}</div>
        </div>
        `;
    }).join('');

    showGuestSubView('guestStayDetailView');
}

function openDisputeForm(bookingId, scoreId, catLabel) {
    activeDisputeStayId = bookingId;
    activeDisputeScoreId = scoreId;

    $('#disputeCategoryName').textContent = `Dispute: ${catLabel}`;
    $('#disputeExplanation').value = '';
    showGuestSubView('guestDisputeView');
}

// Bind Guest View Buttons
document.addEventListener('DOMContentLoaded', () => {
    $('#btnBackToRecord')?.addEventListener('click', () => showGuestSubView('guestProfileView'));
    $('#btnBackToStay')?.addEventListener('click', () => openGuestStayDetail(activeDisputeStayId));

    $('#btnSubmitDispute')?.addEventListener('click', async () => {
        const expl = $('#disputeExplanation').value;
        if (!expl.trim()) {
            alert('Please provide an explanation.');
            return;
        }

        const btn = $('#btnSubmitDispute');
        btn.disabled = true;
        btn.textContent = 'Submitting...';

        try {
            await api(`/api/review-scores/${activeDisputeScoreId}/disputes`, {
                method: 'POST',
                body: { explanation: expl }
            });
            await loadDashboardData();
            openGuestStayDetail(activeDisputeStayId);
        } catch (err) {
            alert(err.message);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Submit Dispute';
        }
    });
});

// ============ UTILITIES ============
function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00'));
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTag(tag) {
    return tag.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function shakeElement(el) {
    el.style.animation = 'none';
    el.offsetHeight;
    el.style.animation = 'shake 0.5s ease';
    setTimeout(() => (el.style.animation = ''), 500);
}

const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
        20%, 40%, 60%, 80% { transform: translateX(4px); }
    }
`;
document.head.appendChild(style);
