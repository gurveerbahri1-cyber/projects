/* ========================================
   HostGuard — Application Logic
   ======================================== */

// ============ DATA ============
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

const GUESTS = [
    { id: 1, name: 'Arjun Mehta', initials: 'AM', property: 'Sunset Villa', checkIn: '2026-06-15', checkOut: '2026-06-20', status: 'pending', score: null },
    { id: 2, name: 'Emily Zhang', initials: 'EZ', property: 'Downtown Loft', checkIn: '2026-06-10', checkOut: '2026-06-14', status: 'pending', score: null },
    { id: 3, name: 'Carlos Rivera', initials: 'CR', property: 'Beach House', checkIn: '2026-06-01', checkOut: '2026-06-07', status: 'pending', score: null },
    { id: 4, name: 'Priya Sharma', initials: 'PS', property: 'Sunset Villa', checkIn: '2026-05-25', checkOut: '2026-05-30', status: 'pending', score: null },
    { id: 5, name: 'David Kim', initials: 'DK', property: 'Downtown Loft', checkIn: '2026-05-18', checkOut: '2026-05-22', status: 'pending', score: null },
    { id: 6, name: 'Sophie Laurent', initials: 'SL', property: 'Beach House', checkIn: '2026-05-10', checkOut: '2026-05-15', status: 'reviewed', score: 4.6, ratings: { cleanliness: 5, 'property-care': 4, discipline: 5, communication: 5, noise: 4, overall: 5 }, review: 'Wonderful guest! Sophie kept the place spotless and was an absolute pleasure to host. Very respectful of house rules.', tags: ['respectful', 'tidy', 'great-communication', 'would-host-again'], flags: ['recommend'], date: '2026-05-16' },
    { id: 7, name: 'James O\'Brien', initials: 'JO', property: 'Sunset Villa', checkIn: '2026-05-01', checkOut: '2026-05-06', status: 'reviewed', score: 3.5, ratings: { cleanliness: 3, 'property-care': 4, discipline: 3, communication: 4, noise: 3, overall: 4 }, review: 'James was generally a fine guest but left the kitchen a bit messy. Communication was good though.', tags: ['great-communication'], flags: [], date: '2026-05-07' },
    { id: 8, name: 'Mia Thompson', initials: 'MT', property: 'Downtown Loft', checkIn: '2026-04-20', checkOut: '2026-04-25', status: 'reviewed', score: 4.8, ratings: { cleanliness: 5, 'property-care': 5, discipline: 5, communication: 5, noise: 4, overall: 5 }, review: 'One of the best guests I\'ve ever had. Mia left the apartment cleaner than she found it. Highly recommend!', tags: ['respectful', 'quiet', 'tidy', 'great-communication', 'on-time', 'would-host-again'], flags: ['recommend'], date: '2026-04-26' },
    { id: 9, name: 'Liam Foster', initials: 'LF', property: 'Beach House', checkIn: '2026-04-10', checkOut: '2026-04-15', status: 'reviewed', score: 2.3, ratings: { cleanliness: 2, 'property-care': 2, discipline: 2, communication: 3, noise: 2, overall: 3 }, review: 'Unfortunately Liam had a party despite the no-party policy. Neighbors complained about noise. Some minor damage to furniture.', tags: ['noisy', 'messy', 'rule-breaker'], flags: ['caution'], date: '2026-04-16' },
    { id: 10, name: 'Ananya Patel', initials: 'AP', property: 'Sunset Villa', checkIn: '2026-04-01', checkOut: '2026-04-05', status: 'reviewed', score: 4.2, ratings: { cleanliness: 4, 'property-care': 4, discipline: 5, communication: 4, noise: 4, overall: 4 }, review: 'Ananya was a responsible guest who followed all the rules. Minor issues with cleanliness but otherwise great.', tags: ['respectful', 'on-time'], flags: ['recommend'], date: '2026-04-06' },
    { id: 11, name: 'Oliver Grant', initials: 'OG', property: 'Downtown Loft', checkIn: '2026-03-15', checkOut: '2026-03-20', status: 'reviewed', score: 4.5, ratings: { cleanliness: 5, 'property-care': 4, discipline: 4, communication: 5, noise: 5, overall: 4 }, review: 'Very pleasant guest. Oliver communicated everything in advance and was very quiet during his stay.', tags: ['quiet', 'great-communication', 'would-host-again'], flags: ['recommend'], date: '2026-03-21' },
    { id: 12, name: 'Nina Rossi', initials: 'NR', property: 'Beach House', checkIn: '2026-03-01', checkOut: '2026-03-08', status: 'reviewed', score: 1.8, ratings: { cleanliness: 1, 'property-care': 2, discipline: 1, communication: 2, noise: 2, overall: 3 }, review: 'Very difficult guest. Late checkout, broken lamp, and the house was left in terrible condition. Would not host again.', tags: ['messy', 'late-checkout', 'property-damage', 'rule-breaker'], flags: ['block'], date: '2026-03-09' },
];

// ============ STATE ============
let currentStep = 1;
let selectedGuestId = null;
let ratings = {};
let selectedTags = new Set();
let reviewText = '';

// ============ DOM REFS ============
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

// ============ INIT ============
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initStats();
    renderDashboard();
    renderGuestDirectory();
    renderReviewsPage();
    renderAnalytics();
    initModal();
    initSearch();
    initMobileMenu();
});

// ============ NAVIGATION ============
function initNavigation() {
    $$('.nav-item').forEach((item) => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            switchPage(page);
        });
    });

    $('#viewAllGuests')?.addEventListener('click', (e) => {
        e.preventDefault();
        switchPage('guests');
    });

    $('#viewAllReviews')?.addEventListener('click', (e) => {
        e.preventDefault();
        switchPage('reviews');
    });
}

function switchPage(page) {
    $$('.nav-item').forEach((i) => i.classList.remove('active'));
    $(`.nav-item[data-page="${page}"]`).classList.add('active');
    $$('.page').forEach((p) => p.classList.remove('active'));
    $(`#page-${page}`).classList.add('active');

    // Close mobile sidebar
    $('#sidebar').classList.remove('open');
}

// ============ STATS COUNTER ============
function initStats() {
    const counters = $$('.stat-value');
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    animateCounter(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.5 }
    );
    counters.forEach((c) => observer.observe(c));
}

function animateCounter(el) {
    const target = parseFloat(el.dataset.count);
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
    renderPendingGuests();
    renderRecentReviews();
}

function renderPendingGuests() {
    const grid = $('#guestCardsGrid');
    const pending = GUESTS.filter((g) => g.status === 'pending');
    grid.innerHTML = pending
        .map(
            (g, i) => `
        <div class="guest-card" data-id="${g.id}" onclick="openReviewForGuest(${g.id})">
            <div class="guest-card-header">
                <div class="guest-avatar" style="background: ${AVATAR_COLORS[i % AVATAR_COLORS.length]}">${g.initials}</div>
                <div class="guest-card-info">
                    <div class="guest-card-name">${g.name}</div>
                    <div class="guest-card-property">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                        ${g.property}
                    </div>
                </div>
            </div>
            <div class="guest-card-dates">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                ${formatDate(g.checkIn)} — ${formatDate(g.checkOut)}
            </div>
            <div class="guest-card-action">
                <span class="badge pending">Pending Review</span>
                <button class="rate-btn" onclick="event.stopPropagation(); openReviewForGuest(${g.id})">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    Rate Now
                </button>
            </div>
        </div>
    `
        )
        .join('');
}

function renderRecentReviews() {
    const list = $('#recentReviewsList');
    const reviewed = GUESTS.filter((g) => g.status === 'reviewed')
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 4);
    list.innerHTML = reviewed.map((g, i) => createReviewItemHTML(g, i)).join('');
}

function createReviewItemHTML(g, i) {
    const stars = '★'.repeat(Math.round(g.score)) + '☆'.repeat(5 - Math.round(g.score));
    const tagHTML = (g.tags || [])
        .map((t) => {
            const isPositive = ['respectful', 'quiet', 'tidy', 'great-communication', 'on-time', 'would-host-again'].includes(t);
            return `<span class="review-tag ${isPositive ? 'positive' : 'negative'}">${formatTag(t)}</span>`;
        })
        .join('');

    return `
        <div class="review-item" style="animation-delay: ${i * 0.08}s">
            <div class="review-avatar" style="background: ${AVATAR_COLORS[(i + 3) % AVATAR_COLORS.length]}">${g.initials}</div>
            <div class="review-content">
                <div class="review-header">
                    <span class="review-guest-name">${g.name}</span>
                    <span class="review-date">${formatDate(g.date)} · ${g.property}</span>
                </div>
                <div class="review-stars">${stars}</div>
                <div class="review-text">${g.review}</div>
                <div class="review-tags">${tagHTML}</div>
            </div>
        </div>
    `;
}

// ============ GUEST DIRECTORY ============
function renderGuestDirectory() {
    const tbody = $('#guestTableBody');
    tbody.innerHTML = GUESTS.map(
        (g, i) => `
        <tr>
            <td>
                <div class="table-guest">
                    <div class="table-guest-avatar" style="background: ${AVATAR_COLORS[i % AVATAR_COLORS.length]}">${g.initials}</div>
                    <span class="table-guest-name">${g.name}</span>
                </div>
            </td>
            <td>${g.property}</td>
            <td>${formatDate(g.checkIn)}</td>
            <td>${formatDate(g.checkOut)}</td>
            <td>
                ${g.score
                ? `<div class="table-score">
                        <span class="table-score-value">${g.score}</span>
                        <span class="table-score-stars">${'★'.repeat(Math.round(g.score))}</span>
                    </div>`
                : '<span style="color: var(--text-tertiary)">—</span>'
            }
            </td>
            <td><span class="badge ${g.status}">${g.status === 'pending' ? 'Pending' : 'Reviewed'}</span></td>
            <td>
                ${g.status === 'pending'
                ? `<button class="table-action-btn review" onclick="openReviewForGuest(${g.id})">Review</button>`
                : `<button class="table-action-btn view" onclick="viewReview(${g.id})">View</button>`
            }
            </td>
        </tr>
    `
    ).join('');
}

// ============ REVIEWS PAGE ============
function renderReviewsPage() {
    const list = $('#allReviewsList');
    const reviewed = GUESTS.filter((g) => g.status === 'reviewed').sort((a, b) => new Date(b.date) - new Date(a.date));
    list.innerHTML = reviewed.map((g, i) => createReviewItemHTML(g, i)).join('');
}

// ============ ANALYTICS ============
function renderAnalytics() {
    renderRadarChart();
    renderBarChart();
    renderTimeline();
    renderTopGuests();
}

function renderRadarChart() {
    const reviewed = GUESTS.filter((g) => g.status === 'reviewed');
    const categories = ['cleanliness', 'property-care', 'discipline', 'communication', 'noise', 'overall'];
    const labels = ['Cleanliness', 'Property Care', 'Discipline', 'Communication', 'Noise', 'Overall'];
    const avgs = categories.map((cat) => {
        const vals = reviewed.map((g) => g.ratings[cat]).filter(Boolean);
        return vals.reduce((a, b) => a + b, 0) / vals.length;
    });

    const container = $('#radarChart');
    const size = 280;
    const center = size / 2;
    const maxRadius = size / 2 - 40;

    let svg = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="max-width: 100%;">`;

    // Draw grid circles
    for (let level = 1; level <= 5; level++) {
        const r = (maxRadius * level) / 5;
        svg += `<circle cx="${center}" cy="${center}" r="${r}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>`;
    }

    // Draw axes & labels
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

    // Draw data polygon
    const points = avgs
        .map((val, i) => {
            const angle = angleStep * i - Math.PI / 2;
            const r = (maxRadius * val) / 5;
            return `${center + Math.cos(angle) * r},${center + Math.sin(angle) * r}`;
        })
        .join(' ');

    svg += `<polygon points="${points}" fill="rgba(99, 102, 241, 0.15)" stroke="url(#radarGrad)" stroke-width="2"/>`;

    // Gradient
    svg += `<defs><linearGradient id="radarGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#6366f1"/><stop offset="100%" style="stop-color:#a855f7"/></linearGradient></defs>`;

    // Draw data points
    avgs.forEach((val, i) => {
        const angle = angleStep * i - Math.PI / 2;
        const r = (maxRadius * val) / 5;
        const cx = center + Math.cos(angle) * r;
        const cy = center + Math.sin(angle) * r;
        svg += `<circle cx="${cx}" cy="${cy}" r="4" fill="#6366f1" stroke="white" stroke-width="1.5"/>`;
        svg += `<text x="${cx}" y="${cy - 12}" text-anchor="middle" fill="#e0e7ff" font-size="11" font-family="Inter" font-weight="700">${val.toFixed(1)}</text>`;
    });

    svg += '</svg>';
    container.innerHTML = svg;
}

function renderBarChart() {
    const reviewed = GUESTS.filter((g) => g.status === 'reviewed');
    const dist = [0, 0, 0, 0, 0]; // 1-5
    reviewed.forEach((g) => {
        const bucket = Math.min(Math.max(Math.round(g.score), 1), 5);
        dist[bucket - 1]++;
    });
    const maxVal = Math.max(...dist, 1);
    const colors = ['#f87171', '#fb923c', '#fbbf24', '#34d399', '#6366f1'];

    const container = $('#barChart');
    container.innerHTML = dist
        .map(
            (count, i) => `
        <div class="bar-item">
            <div class="bar-fill" style="height: ${(count / maxVal) * 100}%; background: ${colors[i]}" data-count="${count}"></div>
            <span class="bar-label">${i + 1} ★</span>
        </div>
    `
        )
        .join('');

    // Animate bars
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
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const data = [3, 5, 7, 4, 8, 6];
    const maxVal = Math.max(...data, 1);

    container.innerHTML = data
        .map(
            (val, i) => `
        <div class="timeline-bar" style="height: ${(val / maxVal) * 100}%" title="${months[i]}: ${val} reviews"></div>
    `
        )
        .join('');
}

function renderTopGuests() {
    const container = $('#topGuestsList');
    const reviewed = GUESTS.filter((g) => g.status === 'reviewed')
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

    const rankClasses = ['gold', 'silver', 'bronze', '', ''];
    container.innerHTML = reviewed
        .map(
            (g, i) => `
        <div class="top-guest-item">
            <div class="top-guest-rank ${rankClasses[i] || ''}">${i + 1}</div>
            <div class="top-guest-avatar" style="background: ${AVATAR_COLORS[(i + 2) % AVATAR_COLORS.length]}">${g.initials}</div>
            <div class="top-guest-info">
                <div class="top-guest-name">${g.name}</div>
                <div class="top-guest-score">${g.property}</div>
            </div>
            <div class="top-guest-stars">${'★'.repeat(Math.round(g.score))} <span style="color: var(--text-tertiary); font-size: 0.82rem; font-weight: 700">${g.score}</span></div>
        </div>
    `
        )
        .join('');
}

// ============ MODAL / REVIEW FLOW ============
function initModal() {
    // Open
    $('#newReviewBtn').addEventListener('click', () => openModal());

    // Close
    $('#modalClose').addEventListener('click', closeModal);
    $('#reviewModal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeModal();
    });

    // Navigation
    $('#btnNext').addEventListener('click', nextStep);
    $('#btnBack').addEventListener('click', prevStep);
    $('#successDone').addEventListener('click', () => {
        closeModal();
        renderDashboard();
        renderGuestDirectory();
        renderReviewsPage();
        renderAnalytics();
    });

    // Star ratings
    initStarRatings();

    // Tags
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

    // Textarea char count
    $('#reviewText').addEventListener('input', (e) => {
        const len = e.target.value.length;
        if (len > 500) e.target.value = e.target.value.slice(0, 500);
        $('#charCount').textContent = Math.min(len, 500);
        reviewText = e.target.value;
    });

    // Render guest list in modal
    renderGuestSelectList();

    // Search in modal
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
    const pending = GUESTS.filter((g) => g.status === 'pending');
    list.innerHTML = pending
        .map(
            (g, i) => `
        <div class="guest-select-item" data-id="${g.id}" onclick="selectGuest(${g.id})">
            <div class="guest-select-avatar" style="background: ${AVATAR_COLORS[i % AVATAR_COLORS.length]}">${g.initials}</div>
            <div class="guest-select-info">
                <div class="guest-select-name">${g.name}</div>
                <div class="guest-select-meta">${g.property} · ${formatDate(g.checkIn)} — ${formatDate(g.checkOut)}</div>
            </div>
            <div class="guest-select-check"></div>
        </div>
    `
        )
        .join('');
}

function selectGuest(id) {
    selectedGuestId = id;
    $$('.guest-select-item').forEach((item) => {
        item.classList.toggle('selected', parseInt(item.dataset.id) === id);
    });
    const guest = GUESTS.find((g) => g.id === id);
    if (guest) {
        $('#selectedGuestName').textContent = guest.name;
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

    // Reset UI
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
        const allRated = Object.keys(ratings).length === 6;
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

    // Show/hide back button
    $('#btnBack').style.visibility = step > 1 ? 'visible' : 'hidden';

    // Change next button text
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
    const guest = GUESTS.find((g) => g.id === selectedGuestId);
    if (!guest) return;

    const idx = GUESTS.indexOf(guest);

    // Header
    $('#confirmGuestHeader').innerHTML = `
        <div class="confirm-avatar" style="background: ${AVATAR_COLORS[idx % AVATAR_COLORS.length]}">${guest.initials}</div>
        <div>
            <div class="confirm-name">${guest.name}</div>
            <div class="confirm-meta">${guest.property} · ${formatDate(guest.checkIn)} — ${formatDate(guest.checkOut)}</div>
        </div>
    `;

    // Ratings
    const catNames = {
        cleanliness: 'Cleanliness',
        'property-care': 'Property Care',
        discipline: 'Discipline',
        communication: 'Communication',
        noise: 'Noise & Neighbors',
        overall: 'Overall',
    };

    $('#confirmRatings').innerHTML = Object.entries(ratings)
        .map(
            ([key, val]) => `
        <div class="confirm-rating-item">
            <span class="confirm-rating-name">${catNames[key] || key}</span>
            <span class="confirm-rating-stars">${'★'.repeat(val)}${'☆'.repeat(5 - val)}</span>
        </div>
    `
        )
        .join('');

    // Review text
    if (reviewText.trim()) {
        $('#confirmReviewText').innerHTML = `
            <div class="confirm-review-label">Written Review</div>
            <div class="confirm-review-body">"${reviewText}"</div>
        `;
    } else {
        $('#confirmReviewText').innerHTML = '';
    }

    // Tags
    if (selectedTags.size > 0) {
        const positiveTags = ['respectful', 'quiet', 'tidy', 'great-communication', 'on-time', 'would-host-again'];
        $('#confirmTags').innerHTML = [...selectedTags]
            .map(
                (t) => `
            <span class="review-tag ${positiveTags.includes(t) ? 'positive' : 'negative'}">${formatTag(t)}</span>
        `
            )
            .join('');
    } else {
        $('#confirmTags').innerHTML = '';
    }

    // Flags
    const flagItems = [];
    if ($('#flagRecommend').checked) flagItems.push('✅ Recommended to other hosts');
    if ($('#flagCaution').checked) flagItems.push('⚠️ Flagged: Proceed with caution');
    if ($('#flagBlock').checked) flagItems.push('🚫 Blocked from future bookings');

    if (flagItems.length) {
        $('#confirmFlags').innerHTML = flagItems.map((f) => `<div class="confirm-flag">${f}</div>`).join('');
    } else {
        $('#confirmFlags').innerHTML = '';
    }
}

function submitReview() {
    const guest = GUESTS.find((g) => g.id === selectedGuestId);
    if (!guest) return;

    // Calculate score
    const vals = Object.values(ratings);
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;

    // Update guest data
    guest.status = 'reviewed';
    guest.score = parseFloat(avg.toFixed(1));
    guest.ratings = { ...ratings };
    guest.review = reviewText || 'No written review provided.';
    guest.tags = [...selectedTags];
    guest.flags = [];
    if ($('#flagRecommend').checked) guest.flags.push('recommend');
    if ($('#flagCaution').checked) guest.flags.push('caution');
    if ($('#flagBlock').checked) guest.flags.push('block');
    guest.date = new Date().toISOString().split('T')[0];

    // Show success
    currentStep = 5;
    $$('.modal-step').forEach((s) => s.classList.remove('active'));
    $('#step-5').classList.add('active');
    $('#modalFooter').classList.add('hidden');

    // Update progress to full
    $('#progressFill').style.width = '100%';
    $$('.progress-step').forEach((s) => s.classList.add('completed'));
}

function viewReview(id) {
    const guest = GUESTS.find((g) => g.id === id);
    if (!guest || guest.status !== 'reviewed') return;
    // Switch to reviews page
    switchPage('reviews');
}

// ============ SEARCH ============
function initSearch() {
    $('#searchInput').addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        // Search across current page content
        const activePage = $('.page.active');
        if (activePage.id === 'page-guests') {
            $$('#guestTableBody tr').forEach((row) => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(q) ? '' : 'none';
            });
        }
    });
}

// ============ MOBILE ============
function initMobileMenu() {
    $('#menuToggle').addEventListener('click', () => {
        $('#sidebar').classList.toggle('open');
    });
}

// ============ UTILITIES ============
function formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTag(tag) {
    return tag
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

function shakeElement(el) {
    el.style.animation = 'none';
    el.offsetHeight; // trigger reflow
    el.style.animation = 'shake 0.5s ease';
    setTimeout(() => (el.style.animation = ''), 500);
}

// Shake keyframes
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
        20%, 40%, 60%, 80% { transform: translateX(4px); }
    }
`;
document.head.appendChild(style);
