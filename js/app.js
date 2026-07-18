// State initialization
let state = {
  activeTrip: null,
  allTrips: [],
  activities: [],
  expenses: [],
  checklist: [],
  theme: 'dark',
  activeTab: 'dashboard',
  phraseLang: 'en',
  phraseCategory: 'all'
};

// Detect if running on GitHub Pages or static host (no Node backend)
const isStaticMode = window.location.hostname.endsWith('github.io') || window.location.protocol === 'file:';

// API Base URL (relative since hosted on same port)
const API_BASE = '/api';

// SVG category colors for charts
const CATEGORY_COLORS = {
  food: '#ef4444',      // Rose/Red
  stay: '#3b82f6',      // Blue
  transport: '#10b981', // Emerald
  shopping: '#ec4899',  // Pink
  etc: '#6b7280'        // Gray
};

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  loadThemeFromLocalStorage();
  applyTheme();
  
  // Fetch database state before rendering
  showToast("데이터베이스 연결을 불러오는 중...", "info");
  await loadStateFromDatabase();
  
  // If no trips exist, auto-seed the user's Guam reservation data!
  if (state.allTrips.length === 0) {
    showToast("예약된 괌 여행 정보를 정리하여 로드 중...", "info");
    await autoSeedGuamTrip();
    await loadStateFromDatabase(); // reload state
  }
  
  // Render views
  renderAll();
  showToast("데이터베이스 동기화 완료!", "success");
});

// Load state from SQLite API or localStorage fallback
async function loadStateFromDatabase() {
  if (isStaticMode) {
    loadStateFromLocalStorageBackup();
    return;
  }

  try {
    // 1. Fetch all trips and active trip
    const tripsRes = await fetch(`${API_BASE}/trips`).then(r => r.ok ? r.json() : []);
    const activeTripRes = await fetch(`${API_BASE}/trip`).then(r => r.ok ? r.json() : null);

    state.allTrips = tripsRes || [];
    state.activeTrip = activeTripRes;

    const tripId = state.activeTrip ? state.activeTrip.id : '';

    if (tripId) {
      // 2. Fetch details for active trip only
      const [activitiesRes, expensesRes, checklistRes] = await Promise.all([
        fetch(`${API_BASE}/activities?tripId=${tripId}`).then(r => r.ok ? r.json() : []),
        fetch(`${API_BASE}/expenses?tripId=${tripId}`).then(r => r.ok ? r.json() : []),
        fetch(`${API_BASE}/checklist?tripId=${tripId}`).then(r => r.ok ? r.json() : [])
      ]);

      state.activities = activitiesRes || [];
      state.expenses = expensesRes || [];
      state.checklist = checklistRes || [];
    } else {
      state.activities = [];
      state.expenses = [];
      state.checklist = [];
    }
  } catch (err) {
    console.error("데이터베이스 통신 오류 발생:", err);
    showToast("서버 통신 실패. 로컬 스토리지 백업 모드 실행.", "danger");
    loadStateFromLocalStorageBackup();
  }
}

// Fallback to local storage if API is offline / Static mode
function loadStateFromLocalStorageBackup() {
  const savedTrips = localStorage.getItem('globeease_all_trips');
  const savedActiveTrip = localStorage.getItem('globeease_active_trip');
  const savedActivitiesAll = localStorage.getItem('globeease_activities_all');
  const savedExpensesAll = localStorage.getItem('globeease_expenses_all');
  const savedChecklistAll = localStorage.getItem('globeease_checklist_all');
  
  state.allTrips = savedTrips ? JSON.parse(savedTrips) : [];
  state.activeTrip = savedActiveTrip ? JSON.parse(savedActiveTrip) : null;
  
  // If activeTrip is null but trips exist, activate the first one
  if (!state.activeTrip && state.allTrips.length > 0) {
    state.activeTrip = state.allTrips[0];
    state.activeTrip.isActive = true;
    localStorage.setItem('globeease_active_trip', JSON.stringify(state.activeTrip));
  }

  const tripId = state.activeTrip ? state.activeTrip.id : '';

  const activitiesAll = savedActivitiesAll ? JSON.parse(savedActivitiesAll) : [];
  const expensesAll = savedExpensesAll ? JSON.parse(savedExpensesAll) : [];
  const checklistAll = savedChecklistAll ? JSON.parse(savedChecklistAll) : [];

  if (tripId) {
    state.activities = activitiesAll.filter(act => act.tripId === tripId);
    state.expenses = expensesAll.filter(exp => exp.tripId === tripId);
    state.checklist = checklistAll.filter(ch => ch.tripId === tripId);
  } else {
    state.activities = [];
    state.expenses = [];
    state.checklist = [];
  }
}

// Save master collections to local storage
function saveStateToLocalStorage() {
  localStorage.setItem('globeease_all_trips', JSON.stringify(state.allTrips));
  localStorage.setItem('globeease_active_trip', JSON.stringify(state.activeTrip));

  const tripId = state.activeTrip ? state.activeTrip.id : '';
  if (tripId) {
    // Activities
    const savedActivitiesAll = localStorage.getItem('globeease_activities_all');
    let activitiesAll = savedActivitiesAll ? JSON.parse(savedActivitiesAll) : [];
    activitiesAll = activitiesAll.filter(act => act.tripId !== tripId).concat(state.activities);
    localStorage.setItem('globeease_activities_all', JSON.stringify(activitiesAll));

    // Expenses
    const savedExpensesAll = localStorage.getItem('globeease_expenses_all');
    let expensesAll = savedExpensesAll ? JSON.parse(savedExpensesAll) : [];
    expensesAll = expensesAll.filter(exp => exp.tripId !== tripId).concat(state.expenses);
    localStorage.setItem('globeease_expenses_all', JSON.stringify(expensesAll));

    // Checklist
    const savedChecklistAll = localStorage.getItem('globeease_checklist_all');
    let checklistAll = savedChecklistAll ? JSON.parse(savedChecklistAll) : [];
    checklistAll = checklistAll.filter(ch => ch.tripId !== tripId).concat(state.checklist);
    localStorage.setItem('globeease_checklist_all', JSON.stringify(checklistAll));
  }
}

// Seed checklist items to DB helper
async function seedChecklistDatabase(tripId) {
  const defaultList = travelData.defaultChecklist.map(item => ({
    ...item,
    id: 'ch_' + Math.random().toString(36).substr(2, 9),
    tripId
  }));

  if (isStaticMode) {
    const savedChecklistAll = localStorage.getItem('globeease_checklist_all');
    let checklistAll = savedChecklistAll ? JSON.parse(savedChecklistAll) : [];
    checklistAll = checklistAll.concat(defaultList);
    localStorage.setItem('globeease_checklist_all', JSON.stringify(checklistAll));
    return;
  }

  try {
    await Promise.all(defaultList.map(item => 
      fetch(`${API_BASE}/checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      })
    ));
  } catch (err) {
    console.error("기본 체크리스트 데이터베이스 로드 실패:", err);
  }
}

// Auto seed Guam reservation data from user request
async function autoSeedGuamTrip() {
  const tripId = "trip_guam";
  const payload = {
    id: tripId,
    destinationId: "guam",
    title: "괌 5일 #진에어 #웨스틴 리조트",
    startDate: "2026-08-20",
    endDate: "2026-08-24",
    isActive: true,
    bookingInfo: {
      bookingCode: "RB2026052210310",
      bookingDate: "2026.05.22 (금)",
      packageName: "괌 5일 #진에어 #웨스틴 리조트#파샬오션뷰#호텔조식#레이트체크아웃",
      travelPeriod: "4박5일",
      depositPaid: 600000,
      totalAmount: 3387000,
      remainingAmount: 2787000,
      travelers: [
        { name: "김구", engName: "KIM KU", birth: "1973.08.30", gender: "남", status: "확인완료" },
        { name: "김정배", engName: "KIM JUNGBAE", birth: "1972.04.28", gender: "여", status: "확인완료" },
        { name: "김시원", engName: "KIM SIWON", birth: "2000.11.08", gender: "여", status: "확인완료" }
      ],
      flights: [
        { flightNo: "LJ917 (출발편)", route: "인천(ICN) → 괌(GUM)", depTime: "2026.08.20(목) 22:05", arrTime: "2026.08.21(금) 03:35" },
        { flightNo: "LJ918 (귀국편)", route: "괌(GUM) → 인천(ICN)", depTime: "2026.08.24(월) 04:40", arrTime: "2026.08.24(월) 08:20" }
      ]
    }
  };

  const detailedActivities = [
    // Day 1
    { id: 'act_g1_1', day: 1, time: '19:05', title: '인천공항 제2터미널 카운터 수속 (진에어)', note: '출발 3시간 전 도착 권장 (19:05까지).\n진에어 위탁 수하물: 1인당 23kg 2개 무료, 기내 수하물: 12kg 1개.\n필수 지참: 여권, 이티켓, 전자 세관신고서, ETA(전자 여행허가승인).\n※ 사전 여행자계약서 동의 필수!', tripId },
    { id: 'act_g1_2', day: 1, time: '22:05', title: '인천 국제 공항 출발 (진에어 LJ917)', note: '비행 소요시간: 약 4시간 20분\n석식: 무상 기내식 (간단한 스낵류) 제공.', tripId },
    
    // Day 2
    { id: 'act_g2_1', day: 2, time: '03:35', title: '괌 국제 공항 도착 및 입국 수속', note: '괌 입국 수속 -> 수하물 수령 -> 입국장 외부 우측 투어 데스크 모니터 "노랑풍선" 가이드 미팅.\n다른 고객들과 10-15명 동승하여 호텔로 이동 (가이드 연락처 및 카톡 사전 확인).', tripId },
    { id: 'act_g2_2', day: 2, time: '05:00', title: '웨스틴 리조트 괌 체크인 & 휴식', note: '별도 숙박 바우처 없이 여권으로 체크인 가능.\n체크인 후 오전 자유 시간 및 휴식.', tripId },
    { id: 'act_g2_3', day: 2, time: '09:00', title: '호텔 조식 (웨스틴 리조트)', note: '조식: 호텔식 제공.', tripId },
    { id: 'act_g2_4', day: 2, time: '14:00', title: '괌 아일랜드 관광 (2시간 소요 - 선택사항)', note: '1인당 $10 추가 (사전 신청 완료).\n코스:\n1) 스페인광장 (초콜릿 하우스, 역사 깊은 유적지)\n2) 사랑의절벽 (사랑의 종 타종 체험)\n3) 아가나 (시원한 바다 전망)', tripId },
    { id: 'act_g2_5', day: 2, time: '18:00', title: '개별 중/석식 후 자유 일정', note: '중식: 불포함 (자유식)\n석식: 불포함 (자유식)\n호텔 수영장 이용 및 해변 산책.', tripId },

    // Day 3
    { id: 'act_g3_1', day: 3, time: '08:30', title: '호텔 조식 (웨스틴 리조트)', note: '조식: 호텔식 제공.', tripId },
    { id: 'act_g3_2', day: 3, time: '10:00', title: '전일 자유 일정 (투몬 비치 물놀이 등)', note: '투몬 비치 해양 액티비티 또는 호텔 내 부대시설 휴식.\n중식: 불포함 (자유식)\n석식: 불포함 (자유식)', tripId },

    // Day 4
    { id: 'act_g4_1', day: 4, time: '08:30', title: '호텔 조식 (웨스틴 리조트)', note: '조식: 호텔식 제공.', tripId },
    { id: 'act_g4_2', day: 4, time: '11:00', title: '체크아웃 준비 및 오전 자유시간', note: '캐리어 짐 정리 및 휴식.', tripId },
    { id: 'act_g4_3', day: 4, time: '13:00', title: '오후 자유 일정 및 쇼핑', note: 'T갤러리아 면세점, GPO(괌 프리미어 아울렛) 쇼핑.\n중식: 불포함 (자유식)\n석식: 불포함 (자유식)', tripId },
    { id: 'act_g4_4', day: 4, time: '23:00', title: '호텔 레이트 체크아웃 및 가이드 미팅', note: '23:00 - 00:00 웨스틴 리조트 레이트 체크아웃.\n가이드 미팅 후 공항 차량 이동.\n공항 도착 후 귀국 출국 수속 및 수하물 수속 진행.', tripId },

    // Day 5
    { id: 'act_g5_1', day: 5, time: '04:40', title: '괌 국제 공항 출발 (진에어 LJ918)', note: '괌 출발 04:40 -> 한국 도착 08:20 (약 4시간 30분 소요).', tripId },
    { id: 'act_g5_2', day: 5, time: '08:20', title: '인천 국제 공항 도착 및 해산', note: '인천공항 제2여객터미널 도착, 위탁 수하물 수령 후 귀가.', tripId }
  ];

  const expDeposit = { id: "exp_deposit", name: "괌 패키지 여행 예약금", category: "stay", currency: "KRW", amount: 600000, amountKrw: 600000, dateStr: "5/22 10:31", tripId };
  const expRemaining = { id: "exp_remaining", name: "괌 패키지 여행 잔금", category: "stay", currency: "KRW", amount: 2787000, amountKrw: 2787000, dateStr: "7/18 00:00", tripId };

  if (isStaticMode) {
    state.allTrips = [payload];
    state.activeTrip = payload;
    state.activities = detailedActivities;
    state.expenses = [expDeposit, expRemaining];
    state.checklist = travelData.defaultChecklist.map((item, idx) => ({
      ...item,
      id: 'ch_static_' + idx,
      tripId
    }));
    saveStateToLocalStorage();
    return;
  }

  try {
    // Save Trip to API
    await fetch(`${API_BASE}/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    await Promise.all(detailedActivities.map(act => 
      fetch(`${API_BASE}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(act)
      })
    ));

    await Promise.all([
      fetch(`${API_BASE}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expDeposit)
      }),
      fetch(`${API_BASE}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expRemaining)
      })
    ]);

    // Seed default checklists for Guam
    await seedChecklistDatabase(tripId);
  } catch (err) {
    console.error("Auto seeding failed:", err);
  }
}

// Theme storage (keeps in client localStorage since it is a user UI setting)
function loadThemeFromLocalStorage() {
  state.theme = localStorage.getItem('globeease_theme') || 'dark';
}

// Save theme helper
function saveTheme() {
  localStorage.setItem('globeease_theme', state.theme);
}

// Global Event Listeners setup
function setupEventListeners() {
  // Navigation / Tabs switching
  const tabs = document.querySelectorAll('.nav-item, .mobile-nav-item');
  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      const targetTab = tab.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });

  // Theme Toggle Button
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', toggleTheme);
  }

  // Modals close button handlers
  const closeModalBtns = document.querySelectorAll('.close-modal-btn');
  closeModalBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      closeAllModals();
    });
  });

  // Backdrops click to close
  const modals = document.querySelectorAll('.modal-backdrop');
  modals.forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeAllModals();
      }
    });
  });

  // Trip Form submit
  const tripForm = document.getElementById('tripForm');
  if (tripForm) {
    tripForm.addEventListener('submit', handleTripSubmit);
  }

  // New Trip trigger buttons
  const btnNewTrip = document.getElementById('btnNewTrip');
  const btnNewTripBlank = document.getElementById('btnNewTripBlank');
  if (btnNewTrip) btnNewTrip.addEventListener('click', openTripModal);
  if (btnNewTripBlank) btnNewTripBlank.addEventListener('click', openTripModal);

  // Activity Form submit
  const activityForm = document.getElementById('activityForm');
  if (activityForm) {
    activityForm.addEventListener('submit', handleActivitySubmit);
  }

  // Add Activity buttons
  const btnAddActivity = document.getElementById('btnAddActivity');
  const btnTimelineAddActivity = document.getElementById('btnTimelineAddActivity');
  if (btnAddActivity) btnAddActivity.addEventListener('click', openActivityModal);
  if (btnTimelineAddActivity) btnTimelineAddActivity.addEventListener('click', openActivityModal);

  // Expense Form submit
  const expenseForm = document.getElementById('expenseForm');
  if (expenseForm) {
    expenseForm.addEventListener('submit', handleExpenseSubmit);
  }

  const btnNewExpense = document.getElementById('btnNewExpense');
  if (btnNewExpense) btnNewExpense.addEventListener('click', openExpenseModal);

  // Checklist Category tabs
  const checklistCatBtns = document.querySelectorAll('.checklist-cat-btn');
  checklistCatBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      checklistCatBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.getAttribute('data-category');
      renderChecklist(cat);
    });
  });

  // Checklist Item Form submit
  const checklistItemForm = document.getElementById('checklistItemForm');
  if (checklistItemForm) {
    checklistItemForm.addEventListener('submit', handleChecklistItemSubmit);
  }

  const btnNewChecklistItem = document.getElementById('btnNewChecklistItem');
  if (btnNewChecklistItem) btnNewChecklistItem.addEventListener('click', openChecklistItemModal);

  // Currency Converter Bidirectional inputs
  const fromInput = document.getElementById('converterFromInput');
  const toInput = document.getElementById('converterToInput');
  const fromSelect = document.getElementById('converterFromCurrency');
  const toSelect = document.getElementById('converterToCurrency');
  const btnSwapCurrency = document.getElementById('btnSwapCurrency');

  if (fromInput) fromInput.addEventListener('input', () => convertCurrency('from'));
  if (fromSelect) fromSelect.addEventListener('change', () => {
    updateExchangeRateText();
    convertCurrency('from');
  });
  if (toSelect) toSelect.addEventListener('change', () => {
    updateExchangeRateText();
    convertCurrency('from');
  });
  if (btnSwapCurrency) {
    btnSwapCurrency.addEventListener('click', () => {
      const tempVal = fromSelect.value;
      fromSelect.value = toSelect.value;
      toSelect.value = tempVal;
      updateExchangeRateText();
      convertCurrency('from');
    });
  }

  // Trip Switcher Header Select change handler
  const switcherSelect = document.getElementById('tripSwitcherSelect');
  if (switcherSelect) {
    switcherSelect.addEventListener('change', (e) => {
      switchActiveTrip(e.target.value);
    });
  }
}

// View switcher
function switchTab(tabId) {
  state.activeTab = tabId;
  
  // Sync Navigation buttons (Desktop)
  document.querySelectorAll('.nav-item').forEach(item => {
    if (item.getAttribute('data-tab') === tabId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Sync Mobile Navigation
  document.querySelectorAll('.mobile-nav-item').forEach(item => {
    if (item.getAttribute('data-tab') === tabId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Sync Content panels
  document.querySelectorAll('.tab-panel').forEach(panel => {
    if (panel.id === `${tabId}-panel`) {
      panel.classList.add('active');
    } else {
      panel.classList.remove('active');
    }
  });

  // Update headers dynamically
  const titles = {
    dashboard: { main: '대시보드', sub: '나의 여행 현황을 한눈에 살펴보세요.' },
    itinerary: { main: '일정 플래너', sub: '일자별 맞춤형 하루 일정을 계획해 보세요.' },
    expenses: { main: '지출 가계부', sub: '여행 경비 수입 및 지출 명세를 관리합니다.' },
    checklist: { main: '준비물 리스트', sub: '꼼꼼하게 챙겨야 할 캐리어 체크리스트.' },
    converter: { main: '환율 계산기', sub: '실시간 주요 통화 교환 가치 계산 서비스.' },
    phrasebook: { main: '서바이벌 회화', sub: '공항부터 비상상황까지 유용한 현지어 표현.' }
  };

  const titleNode = document.getElementById('pageTitle');
  const subtitleNode = document.getElementById('pageSubtitle');
  if (titleNode && subtitleNode && titles[tabId]) {
    titleNode.textContent = titles[tabId].main;
    subtitleNode.textContent = titles[tabId].sub;
  }

  // Specific panel triggers
  if (tabId === 'dashboard') {
    renderDashboard();
  } else if (tabId === 'itinerary') {
    renderItinerary();
  } else if (tabId === 'expenses') {
    renderExpenses();
  } else if (tabId === 'checklist') {
    const activeCat = document.querySelector('.checklist-cat-btn.active').getAttribute('data-category');
    renderChecklist(activeCat);
  } else if (tabId === 'converter') {
    setupConverter();
  }
  
  // Smooth scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Global renderer triggers
function renderAll() {
  renderTripSwitcher();
  renderDashboard();
  renderItinerary();
  renderExpenses();
  const activeCat = document.querySelector('.checklist-cat-btn.active')?.getAttribute('data-category') || 'all';
  renderChecklist(activeCat);
  setupConverter();
}

// Toast helper
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let iconSvg = '';
  if (type === 'success') {
    iconSvg = `<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`;
  } else if (type === 'danger') {
    iconSvg = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
  } else {
    iconSvg = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
  }

  toast.innerHTML = `${iconSvg} <span>${message}</span>`;
  container.appendChild(toast);

  // Automatically remove toast after animation completed
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// Theme handler
function applyTheme() {
  document.body.setAttribute('data-theme', state.theme);
  const btnText = document.querySelector('#themeToggleBtn span');
  const btnIcon = document.querySelector('#themeToggleBtn svg');
  
  if (btnText && btnIcon) {
    if (state.theme === 'dark') {
      btnText.textContent = '라이트 모드';
      btnIcon.innerHTML = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
    } else {
      btnText.textContent = '다크 모드';
      btnIcon.innerHTML = `<svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
    }
  }
}

// Toggle Theme
function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  saveTheme();
  applyTheme();
}

// Modal actions
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'flex';
    setTimeout(() => {
      modal.classList.add('active');
    }, 10);
  }
}

function closeAllModals() {
  const modals = document.querySelectorAll('.modal-backdrop');
  modals.forEach(modal => {
    modal.classList.remove('active');
    setTimeout(() => {
      modal.style.display = 'none';
    }, 300);
  });
}

// Render Trip Switcher in header
function renderTripSwitcher() {
  const switcherContainer = document.getElementById('tripSwitcherContainer');
  const switcherSelect = document.getElementById('tripSwitcherSelect');

  if (!switcherContainer || !switcherSelect) return;

  if (state.allTrips.length === 0) {
    switcherContainer.style.display = 'none';
    return;
  }

  switcherContainer.style.display = 'flex';
  switcherSelect.innerHTML = state.allTrips.map(t => `
    <option value="${t.id}" ${state.activeTrip && state.activeTrip.id === t.id ? 'selected' : ''}>
      ${t.title}
    </option>
  `).join('');
}

// Switch current active trip
async function switchActiveTrip(tripId) {
  if (isStaticMode) {
    state.allTrips = state.allTrips.map(t => ({ ...t, isActive: t.id === tripId }));
    state.activeTrip = state.allTrips.find(t => t.id === tripId);
    saveStateToLocalStorage();
    loadStateFromLocalStorageBackup();
    currentSelectedDay = 1;
    renderAll();
    showToast("선택된 여행 정보가 활성화되었습니다.");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/trips/${tripId}/active`, { method: 'PUT' });
    if (!res.ok) throw new Error('API activation call failed');

    showToast("새로운 여행 데이터를 동기화 중...", "info");
    await loadStateFromDatabase();
    
    // reset selection variables
    currentSelectedDay = 1;
    
    renderAll();
    showToast("선택된 여행 정보가 활성화되었습니다.");
  } catch (err) {
    console.error(err);
    showToast("여행 일정 전환에 실패했습니다.", "danger");
  }
}

// Delete an entire trip
async function deleteTrip(tripId) {
  if (confirm("정말로 이 여행 계획을 삭제하시겠습니까?\n여행에 등록된 모든 일정 계획과 경비, 준비물 내역이 완전히 함께 삭제됩니다.")) {
    if (isStaticMode) {
      state.allTrips = state.allTrips.filter(t => t.id !== tripId);
      if (state.activeTrip && state.activeTrip.id === tripId) {
        state.activeTrip = state.allTrips[0] || null;
        if (state.activeTrip) state.activeTrip.isActive = true;
      }
      
      const savedActivitiesAll = localStorage.getItem('globeease_activities_all');
      let activitiesAll = savedActivitiesAll ? JSON.parse(savedActivitiesAll) : [];
      activitiesAll = activitiesAll.filter(act => act.tripId !== tripId);
      localStorage.setItem('globeease_activities_all', JSON.stringify(activitiesAll));

      const savedExpensesAll = localStorage.getItem('globeease_expenses_all');
      let expensesAll = savedExpensesAll ? JSON.parse(savedExpensesAll) : [];
      expensesAll = expensesAll.filter(exp => exp.tripId !== tripId);
      localStorage.setItem('globeease_expenses_all', JSON.stringify(expensesAll));

      const savedChecklistAll = localStorage.getItem('globeease_checklist_all');
      let checklistAll = savedChecklistAll ? JSON.parse(savedChecklistAll) : [];
      checklistAll = checklistAll.filter(ch => ch.tripId !== tripId);
      localStorage.setItem('globeease_checklist_all', JSON.stringify(checklistAll));

      saveStateToLocalStorage();
      loadStateFromLocalStorageBackup();
      currentSelectedDay = 1;
      renderAll();
      showToast("여행 계획을 영구 삭제했습니다.", "success");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/trips/${tripId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('API delete call failed');

      showToast("여행 계획을 영구 삭제했습니다.", "success");
      await loadStateFromDatabase();
      
      // Reset day selection
      currentSelectedDay = 1;
      
      renderAll();
    } catch (err) {
      console.error(err);
      showToast("여행 계획 삭제 실패", "danger");
    }
  }
}

// -------------------------
// 1. DASHBOARD VIEW
// -------------------------
function renderDashboard() {
  const destinationsContainer = document.getElementById('destinationsContainer');
  
  // Render Destinations Recommended
  if (destinationsContainer) {
    destinationsContainer.innerHTML = travelData.destinations.map(dest => `
      <div class="dest-card" onclick="quickRegisterTrip('${dest.id}')">
        <img src="${dest.image}" class="dest-card-img" alt="${dest.name}">
        <div class="dest-card-overlay">
          <h3 class="dest-card-title">${dest.name}</h3>
          <p class="dest-card-desc">${dest.description}</p>
        </div>
      </div>
    `).join('');
  }

  // Update Trip D-Day Banner
  const destTag = document.getElementById('activeTripDest');
  const titleTag = document.getElementById('activeTripTitle');
  const datesTag = document.getElementById('activeTripDates');
  const countdownDays = document.getElementById('countdownDays');
  const countdownLabel = document.getElementById('countdownLabel');

  if (state.activeTrip) {
    const selectedDest = travelData.destinations.find(d => d.id === state.activeTrip.destinationId) || { name: state.activeTrip.destinationId };
    destTag.textContent = selectedDest.name;
    titleTag.textContent = state.activeTrip.title;
    datesTag.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      <span>${formatKoreanDate(state.activeTrip.startDate)} - ${formatKoreanDate(state.activeTrip.endDate)}</span>
    `;

    // Calculate D-Day
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(state.activeTrip.startDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(state.activeTrip.endDate);
    endDate.setHours(0, 0, 0, 0);

    const timeDiff = startDate.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

    if (daysDiff > 0) {
      countdownDays.textContent = `D-${daysDiff}`;
      countdownLabel.textContent = '남은 일수';
    } else if (today.getTime() <= endDate.getTime()) {
      countdownDays.textContent = 'D-Day';
      countdownLabel.textContent = '여행 중!';
    } else {
      countdownDays.textContent = '완료';
      countdownLabel.textContent = '추억 간직하기';
    }
  } else {
    destTag.textContent = '등록된 일정 없음';
    titleTag.textContent = '새로운 여행 일정을 등록해 보세요!';
    datesTag.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      <span>기간 설정이 필요합니다.</span>
    `;
    countdownDays.textContent = 'D-0';
    countdownLabel.textContent = '남은 일수';
  }

  // Render Booking Details Card
  const bookingContainer = document.getElementById('bookingDetailsContainer');
  if (state.activeTrip && state.activeTrip.bookingInfo && bookingContainer) {
    bookingContainer.style.display = 'block';
    const info = state.activeTrip.bookingInfo;
    const payPercent = Math.round((info.depositPaid / info.totalAmount) * 100);

    bookingContainer.innerHTML = `
      <div class="glass-card" style="margin-top: 1.5rem; margin-bottom: 2rem;">
        <div class="card-header" style="border-bottom: 1px solid var(--card-border); padding-bottom: 0.75rem; margin-bottom: 1rem;">
          <h3 class="card-title" style="font-size: 1.1rem;">
            <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            예약 및 항공 세부 정보
          </h3>
          <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 700;">예약번호: ${info.bookingCode}</span>
        </div>
        
        <div class="booking-info-grid">
          <!-- Left: Flight details -->
          <div class="booking-section">
            <h4 class="booking-section-title">
              <svg viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
              항공 일정표
            </h4>
            <div class="flight-timeline">
              ${info.flights.map(f => `
                <div class="flight-item">
                  <div class="flight-header">
                    <span class="flight-badge">${f.flightNo}</span>
                    <span style="font-weight: 700; font-size: 0.75rem; color: var(--accent-secondary);">${f.route}</span>
                  </div>
                  <div class="flight-times">
                     <div>출발: ${f.depTime}</div>
                     <div>도착: ${f.arrTime}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Right: Payment & Travelers -->
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            <!-- Payment status -->
            <div class="booking-section">
              <h4 class="booking-section-title">
                <svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                결제 현황 (원화)
              </h4>
              <div class="payment-progress-container">
                <div class="payment-progress-text">
                  <span>결제진행률 (${payPercent}%)</span>
                  <span>₩ ${formatNumber(info.depositPaid)} / ₩ ${formatNumber(info.totalAmount)}</span>
                </div>
                <div class="payment-progress-bar-bg">
                  <div class="payment-progress-bar-fill" style="width: ${payPercent}%;"></div>
                </div>
                <div class="booking-detail-row" style="margin-top: 0.35rem;">
                  <span class="booking-detail-label">남은 잔금</span>
                  <span class="booking-detail-value" style="color: var(--accent-warning);">₩ ${formatNumber(info.remainingAmount)}</span>
                </div>
              </div>
            </div>

            <!-- Travelers list -->
            <div class="booking-section">
              <h4 class="booking-section-title">
                <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                여행자 명단 (${info.travelers.length}명)
              </h4>
              <div class="traveler-badge-list">
                ${info.travelers.map(t => `
                  <div class="traveler-badge-item">
                    <div>
                      <span class="traveler-badge-name">${t.name}</span> 
                      <span class="traveler-badge-meta">${t.engName} (${t.gender})</span>
                    </div>
                    <span class="traveler-check-status">${t.status}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  } else if (bookingContainer) {
    bookingContainer.style.display = 'none';
  }

  // Update checklist status widget
  const widgetChecklistStatus = document.getElementById('widgetChecklistStatus');
  if (widgetChecklistStatus) {
    const checkedCount = state.checklist.filter(item => item.checked).length;
    widgetChecklistStatus.textContent = `${checkedCount} / ${state.checklist.length}`;
  }

  // Update total expense widget
  const widgetTotalExpense = document.getElementById('widgetTotalExpense');
  const totalKrw = state.expenses.reduce((sum, item) => sum + item.amountKrw, 0);
  if (widgetTotalExpense) {
    widgetTotalExpense.textContent = `₩ ${formatNumber(totalKrw)}`;
  }

  // Render donut chart on dashboard
  renderDonutChart('expenseDonutChart', 'chartTotalValue', 'chartLegendContainer');
}

// Chart render helper (reusable)
function renderDonutChart(svgId, totalId, legendId) {
  const svg = document.getElementById(svgId);
  const totalNode = document.getElementById(totalId);
  const legendNode = document.getElementById(legendId);
  
  if (!svg) return;

  const totalKrw = state.expenses.reduce((sum, item) => sum + item.amountKrw, 0);
  if (totalNode) {
    totalNode.textContent = `₩ ${formatNumber(totalKrw)}`;
  }

  // Reset SVG segments
  const rings = svg.querySelectorAll('.chart-segment');
  rings.forEach(ring => ring.remove());

  if (totalKrw === 0) {
    if (legendNode) legendNode.innerHTML = `<p style="text-align:center; color:var(--text-secondary); font-size:0.85rem; margin-top:0.5rem;">기록된 지출 내역이 없습니다.</p>`;
    return;
  }

  // Group expenses by category
  const categories = { food: 0, stay: 0, transport: 0, shopping: 0, etc: 0 };
  state.expenses.forEach(exp => {
    if (categories[exp.category] !== undefined) {
      categories[exp.category] += exp.amountKrw;
    } else {
      categories.etc += exp.amountKrw;
    }
  });

  const categoryNames = {
    food: '식비',
    stay: '숙박',
    transport: '교통',
    shopping: '쇼핑',
    etc: '기타'
  };

  // Convert categories to array and filter out 0 values
  let segments = [];
  let currentOffset = 0;
  
  Object.keys(categories).forEach(cat => {
    const amount = categories[cat];
    if (amount > 0) {
      const percentage = (amount / totalKrw) * 100;
      segments.push({
        category: cat,
        name: categoryNames[cat],
        amount: amount,
        percentage: percentage,
        color: CATEGORY_COLORS[cat]
      });
    }
  });

  // Draw SVG segments
  const radius = 70;
  const circumference = 2 * Math.PI * radius; // 439.82

  segments.forEach(seg => {
    const strokeDash = (seg.percentage / 100) * circumference;
    const strokeOffset = circumference - strokeDash + currentOffset;

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('r', radius);
    circle.setAttribute('cx', 90);
    circle.setAttribute('cy', 90);
    circle.setAttribute('class', 'chart-segment');
    circle.setAttribute('stroke', seg.color);
    circle.setAttribute('stroke-dasharray', `${strokeDash} ${circumference - strokeDash}`);
    circle.setAttribute('stroke-dashoffset', strokeOffset);
    circle.style.transition = 'stroke-dasharray 0.5s ease-in-out';

    svg.appendChild(circle);
    currentOffset -= strokeDash;
  });

  // Render Legend
  if (legendNode) {
    legendNode.innerHTML = segments.map(seg => `
      <div class="legend-item">
        <div class="legend-label-group">
          <span class="legend-color" style="background-color: ${seg.color}"></span>
          <span class="legend-name">${seg.name}</span>
        </div>
        <span class="legend-val">₩ ${formatNumber(seg.amount)} (${Math.round(seg.percentage)}%)</span>
      </div>
    `).join('');
  }
}

// -------------------------
// 2. ITINERARY VIEW
// -------------------------
let currentSelectedDay = 1;

function renderItinerary() {
  const tripBlank = document.getElementById('tripBlankState');
  const itineraryContainer = document.getElementById('itineraryContainer');
  const btnAddActivity = document.getElementById('btnAddActivity');
  const tripsListSection = document.getElementById('tripsListSection');
  const tripsListGrid = document.getElementById('tripsListGrid');

  // Render Trips List Section
  if (state.allTrips.length > 0 && tripsListSection && tripsListGrid) {
    tripsListSection.style.display = 'block';
    tripsListGrid.innerHTML = state.allTrips.map(t => {
      const activeClass = state.activeTrip && state.activeTrip.id === t.id ? 'active' : '';
      return `
        <div class="glass-card trip-manager-card ${activeClass}">
          <h4 class="trip-manager-title">${t.title}</h4>
          <div class="trip-manager-dates">
            <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span>${formatKoreanDate(t.startDate)} - ${formatKoreanDate(t.endDate)}</span>
          </div>
          <div class="trip-manager-actions">
            ${activeClass ? '' : `<button class="btn btn-primary btn-sm" onclick="switchActiveTrip('${t.id}')">선택 활성화</button>`}
            <button class="btn btn-secondary btn-sm" onclick="openTripModalEdit('${t.id}')">수정</button>
            <button class="btn btn-secondary btn-sm" onclick="deleteTrip('${t.id}')" style="color: var(--accent-danger); border-color: rgba(239,68,68,0.2);">삭제</button>
          </div>
        </div>
      `;
    }).join('');
  } else if (tripsListSection) {
    tripsListSection.style.display = 'none';
  }

  if (!state.activeTrip) {
    tripBlank.style.display = 'block';
    itineraryContainer.style.display = 'none';
    if (btnAddActivity) btnAddActivity.style.display = 'none';
    return;
  }

  tripBlank.style.display = 'none';
  itineraryContainer.style.display = 'grid';
  if (btnAddActivity) btnAddActivity.style.display = 'inline-flex';

  // Calculate days in active itinerary
  const start = new Date(state.activeTrip.startDate);
  const end = new Date(state.activeTrip.endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  // Build Day Selector List
  const daySelectorList = document.getElementById('daySelectorList');
  if (daySelectorList) {
    let dayHTML = '';
    for (let i = 1; i <= diffDays; i++) {
      const activeClass = i === currentSelectedDay ? 'active' : '';
      const dayActivities = state.activities.filter(act => act.day === i);
      const activityCount = dayActivities.length;
      
      dayHTML += `
        <li>
          <button class="day-btn ${activeClass}" onclick="selectItineraryDay(${i})">
            <span>Day ${i}</span>
            <span class="day-badge">${activityCount}</span>
          </button>
        </li>
      `;
    }
    daySelectorList.innerHTML = dayHTML;
  }

  // Populate activity day select options in activity modal
  const activityDaySelect = document.getElementById('activityDaySelect');
  if (activityDaySelect) {
    let selectHTML = '';
    for (let i = 1; i <= diffDays; i++) {
      selectHTML += `<option value="${i}">Day ${i}</option>`;
    }
    activityDaySelect.innerHTML = selectHTML;
    activityDaySelect.value = currentSelectedDay;
  }

  // Render selected day's timeline
  renderDayTimeline();
}

function selectItineraryDay(dayNumber) {
  currentSelectedDay = dayNumber;
  
  // Update days tab classes
  const btns = document.querySelectorAll('.day-btn');
  btns.forEach((btn, index) => {
    if (index + 1 === dayNumber) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  renderDayTimeline();
}

function renderDayTimeline() {
  const currentDayTitle = document.getElementById('currentDayTitle');
  const timelineList = document.getElementById('timelineList');
  
  if (currentDayTitle) {
    currentDayTitle.textContent = `Day ${currentSelectedDay} 일정`;
  }

  const dayActivities = state.activities
    .filter(act => act.day === currentSelectedDay)
    .sort((a, b) => a.time.localeCompare(b.time));

  if (!timelineList) return;

  if (dayActivities.length === 0) {
    timelineList.innerHTML = `
      <div class="timeline-empty">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <p>Day ${currentSelectedDay}의 등록된 일정이 없습니다.</p>
        <p style="font-size:0.8rem; margin-top:0.35rem; color:var(--text-muted);">오른쪽 위 '일정 추가' 버튼을 눌러 첫 일정을 등록해 보세요!</p>
      </div>
    `;
    return;
  }

  timelineList.innerHTML = dayActivities.map(act => `
    <div class="timeline-card">
      <div class="timeline-time-tag">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <span>${act.time}</span>
      </div>
      <h3 class="timeline-card-title">${act.title}</h3>
      ${act.note ? `<p class="timeline-card-notes">${act.note.replace(/\n/g, '<br>')}</p>` : ''}
      
      <div class="timeline-card-actions">
        <button class="action-icon-btn delete" onclick="deleteActivity('${act.id}')" title="삭제">
          <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
        </button>
      </div>
    </div>
  `).join('');
}

// Modal Openers
let editingTripId = null;

function openTripModal() {
  editingTripId = null;
  document.getElementById('tripModalTitle').textContent = "새 여행 일정 등록";

  const destSelect = document.getElementById('tripDestInput');
  if (destSelect) {
    destSelect.innerHTML = travelData.destinations.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
  }

  document.getElementById('tripTitleInput').value = "";
  
  const today = new Date();
  const threeDaysLater = new Date(today);
  threeDaysLater.setDate(today.getDate() + 3);

  document.getElementById('tripStartInput').value = today.toISOString().split('T')[0];
  document.getElementById('tripEndInput').value = threeDaysLater.toISOString().split('T')[0];

  openModal('tripModal');
}

function openTripModalEdit(tripId) {
  editingTripId = tripId;
  const trip = state.allTrips.find(t => t.id === tripId);
  if (!trip) return;

  document.getElementById('tripModalTitle').textContent = "여행 일정 수정";

  const destSelect = document.getElementById('tripDestInput');
  if (destSelect) {
    destSelect.innerHTML = travelData.destinations.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
    destSelect.value = trip.destinationId;
  }

  document.getElementById('tripTitleInput').value = trip.title;
  document.getElementById('tripStartInput').value = trip.startDate;
  document.getElementById('tripEndInput').value = trip.endDate;

  openModal('tripModal');
}

async function quickRegisterTrip(destId) {
  const destObj = travelData.destinations.find(d => d.id === destId);
  if (!destObj) return;

  const today = new Date();
  const threeDaysLater = new Date(today);
  threeDaysLater.setDate(today.getDate() + 3);

  const tripId = 'trip_' + Date.now();
  const payload = {
    id: tripId,
    destinationId: destId,
    title: `${destObj.name.split(',')[0]} 자유여행`,
    startDate: today.toISOString().split('T')[0],
    endDate: threeDaysLater.toISOString().split('T')[0],
    isActive: true
  };

  if (isStaticMode) {
    state.allTrips.push(payload);
    state.activeTrip = payload;
    state.allTrips = state.allTrips.map(t => ({ ...t, isActive: t.id === tripId }));
    await seedChecklistDatabase(tripId);
    saveStateToLocalStorage();
    loadStateFromLocalStorageBackup();
    currentSelectedDay = 1;
    renderAll();
    showToast(`${destObj.name} 일정이 등록되어 활성화되었습니다!`);
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('API request failed');

    showToast("신규 여행 일정을 동기화 중...", "info");
    await seedChecklistDatabase(tripId);
    await loadStateFromDatabase();
    
    currentSelectedDay = 1;
    renderAll();
    showToast(`${destObj.name} 일정이 성공적으로 등록되어 활성화되었습니다!`);
  } catch (err) {
    console.error(err);
    showToast("여행 일정 저장 실패", "danger");
  }
}

function openActivityModal() {
  if (!state.activeTrip) {
    showToast("여행 정보를 먼저 등록해 주세요.", "danger");
    return;
  }
  
  const activityDaySelect = document.getElementById('activityDaySelect');
  if (activityDaySelect) {
    activityDaySelect.value = currentSelectedDay;
  }

  document.getElementById('activityTitleInput').value = '';
  document.getElementById('activityNoteInput').value = '';
  document.getElementById('activityTimeInput').value = '09:00';

  openModal('activityModal');
}

// Form Handlers
async function handleTripSubmit(e) {
  e.preventDefault();
  
  const destinationId = document.getElementById('tripDestInput').value;
  const title = document.getElementById('tripTitleInput').value;
  const startDate = document.getElementById('tripStartInput').value;
  const endDate = document.getElementById('tripEndInput').value;

  if (new Date(startDate) > new Date(endDate)) {
    showToast("출발일은 도착일 이전 날짜여야 합니다.", "danger");
    return;
  }

  const tripId = editingTripId || 'trip_' + Date.now();
  const existingTrip = state.allTrips.find(t => t.id === tripId);
  const bookingInfo = existingTrip ? existingTrip.bookingInfo : null;

  const payload = { 
    id: tripId, 
    destinationId, 
    title, 
    startDate, 
    endDate,
    bookingInfo,
    isActive: editingTripId ? existingTrip.isActive : true // Activate if new trip
  };

  if (isStaticMode) {
    if (!editingTripId) {
      state.allTrips.push(payload);
      state.activeTrip = payload;
      await seedChecklistDatabase(tripId);
    } else {
      state.allTrips = state.allTrips.map(t => t.id === tripId ? payload : t);
      if (state.activeTrip && state.activeTrip.id === tripId) {
        state.activeTrip = payload;
      }
    }
    if (payload.isActive) {
      state.allTrips = state.allTrips.map(t => ({ ...t, isActive: t.id === tripId }));
    }
    saveStateToLocalStorage();
    closeAllModals();
    loadStateFromLocalStorageBackup();
    currentSelectedDay = 1;
    renderAll();
    showToast("여행 계획이 저장 및 업데이트되었습니다!");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('API save failed');

    closeAllModals();

    if (!editingTripId) {
      // Seed default checklists for new trip
      await seedChecklistDatabase(tripId);
    }

    showToast("데이터베이스 동기화 중...", "info");
    await loadStateFromDatabase();
    
    currentSelectedDay = 1;
    renderAll();
    showToast("여행 계획이 저장 및 업데이트되었습니다!");
  } catch (err) {
    console.error(err);
    showToast("여행 계획 저장 오류", "danger");
  }
}

async function handleActivitySubmit(e) {
  e.preventDefault();

  if (!state.activeTrip) return;

  const day = parseInt(document.getElementById('activityDaySelect').value);
  const time = document.getElementById('activityTimeInput').value;
  const title = document.getElementById('activityTitleInput').value;
  const note = document.getElementById('activityNoteInput').value;

  const newActivity = {
    id: 'act_' + Date.now(),
    day,
    time,
    title,
    note,
    tripId: state.activeTrip.id
  };

  if (isStaticMode) {
    const savedActivitiesAll = localStorage.getItem('globeease_activities_all');
    let activitiesAll = savedActivitiesAll ? JSON.parse(savedActivitiesAll) : [];
    activitiesAll.push(newActivity);
    localStorage.setItem('globeease_activities_all', JSON.stringify(activitiesAll));

    state.activities.push(newActivity);
    closeAllModals();
    selectItineraryDay(day);
    renderDashboard();
    showToast("새 일정이 타임라인에 등록되었습니다.");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newActivity)
    });
    if (!res.ok) throw new Error('API activity save failed');

    state.activities.push(newActivity);
    closeAllModals();
    selectItineraryDay(day);
    renderDashboard();
    showToast("새 일정이 타임라인에 등록되었습니다.");
  } catch (err) {
    console.error(err);
    showToast("일정 저장에 실패했습니다.", "danger");
  }
}

async function deleteActivity(id) {
  if (confirm("정말로 이 일정을 삭제하시겠습니까?")) {
    if (isStaticMode) {
      const savedActivitiesAll = localStorage.getItem('globeease_activities_all');
      let activitiesAll = savedActivitiesAll ? JSON.parse(savedActivitiesAll) : [];
      activitiesAll = activitiesAll.filter(act => act.id !== id);
      localStorage.setItem('globeease_activities_all', JSON.stringify(activitiesAll));

      state.activities = state.activities.filter(act => act.id !== id);
      renderItinerary();
      renderDashboard();
      showToast("일정이 리스트에서 제거되었습니다.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/activities/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('API activity delete failed');

      state.activities = state.activities.filter(act => act.id !== id);
      renderItinerary();
      renderDashboard();
      showToast("일정이 데이터베이스에서 제거되었습니다.");
    } catch (err) {
      console.error(err);
      showToast("일정 삭제 오류 발생", "danger");
    }
  }
}

// -------------------------
// 3. EXPENSES VIEW
// -------------------------
function renderExpenses() {
  const expenseTotalAmount = document.getElementById('expenseTotalAmount');
  const expenseListContainer = document.getElementById('expenseListContainer');

  const totalKrw = state.expenses.reduce((sum, exp) => sum + exp.amountKrw, 0);
  if (expenseTotalAmount) {
    expenseTotalAmount.textContent = `₩ ${formatNumber(totalKrw)}`;
  }

  if (!expenseListContainer) return;

  if (state.expenses.length === 0) {
    expenseListContainer.innerHTML = `
      <div style="text-align: center; padding: 4rem 2rem; color: var(--text-secondary);">
        <p>기록된 경비가 없습니다.</p>
        <p style="font-size: 0.8rem; margin-top: 0.35rem; color: var(--text-muted);">오른쪽 위 '지출 추가' 버튼을 눌러 경비를 입력해 보세요!</p>
      </div>
    `;
    renderDonutChart('expenseDonutChartMain', 'chartTotalValueMain', 'chartLegendContainerMain');
    return;
  }

  // Sort expenses by date (newest first)
  const sortedExpenses = [...state.expenses].sort((a, b) => b.id.localeCompare(a.id));

  const categoryIcons = {
    food: '🍔',
    stay: '🏨',
    transport: '🚇',
    shopping: '🛍️',
    etc: '☕'
  };

  const categoryTexts = {
    food: '식비',
    stay: '숙박',
    transport: '교통',
    shopping: '쇼핑',
    etc: '기타'
  };

  expenseListContainer.innerHTML = sortedExpenses.map(exp => {
    const symbol = getCurrencySymbol(exp.currency);
    return `
      <div class="expense-item">
        <div class="expense-info-group">
          <div class="expense-category-icon cat-${exp.category}">
            ${categoryIcons[exp.category] || '💰'}
          </div>
          <div class="expense-details">
            <span class="expense-name">${exp.name}</span>
            <span class="expense-meta">${categoryTexts[exp.category]} | ${exp.dateStr}</span>
          </div>
        </div>
        <div class="expense-amount-group">
          <div class="expense-amounts">
            <div class="expense-amount-local">${symbol} ${formatNumber(exp.amount)}</div>
            <div class="expense-amount-krw">₩ ${formatNumber(exp.amountKrw)}</div>
          </div>
          <button class="action-icon-btn delete" onclick="deleteExpense('${exp.id}')" title="지출 삭제" style="margin-left: 0.5rem;">
            <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Update Main Chart
  renderDonutChart('expenseDonutChartMain', 'chartTotalValueMain', 'chartLegendContainerMain');
}

function openExpenseModal() {
  if (!state.activeTrip) {
    showToast("활성화된 여행 정보가 없습니다.", "danger");
    return;
  }

  // Populate Currency Selector
  const currencySelect = document.getElementById('expenseCurrencyInput');
  if (currencySelect) {
    currencySelect.innerHTML = travelData.currencies.map(c => `
      <option value="${c.code}">${c.code} (${c.name})</option>
    `).join('');
    
    // Default select currency of currently active trip
    const activeDest = travelData.destinations.find(d => d.id === state.activeTrip.destinationId);
    if (activeDest) {
      currencySelect.value = activeDest.currency;
    }
  }

  // Clear fields
  document.getElementById('expenseNameInput').value = '';
  document.getElementById('expenseAmountInput').value = '';
  
  openModal('expenseModal');
}

async function handleExpenseSubmit(e) {
  e.preventDefault();

  if (!state.activeTrip) return;

  const name = document.getElementById('expenseNameInput').value;
  const category = document.getElementById('expenseCategoryInput').value;
  const currency = document.getElementById('expenseCurrencyInput').value;
  const amountVal = parseFloat(document.getElementById('expenseAmountInput').value);

  // Compute exchange to KRW
  const currencyObj = travelData.currencies.find(c => c.code === currency) || { rate: 1.0 };
  let amountKrw = 0;

  if (currency === 'KRW') {
    amountKrw = amountVal;
  } else if (currency === 'JPY') {
    amountKrw = (amountVal / 100) * currencyObj.rate;
  } else {
    amountKrw = amountVal * currencyObj.rate;
  }

  const today = new Date();
  const dateStr = `${today.getMonth() + 1}/${today.getDate()} ${today.getHours().toString().padStart(2, '0')}:${today.getMinutes().toString().padStart(2, '0')}`;

  const newExpense = {
    id: 'exp_' + Date.now(),
    name,
    category,
    currency,
    amount: amountVal,
    amountKrw: Math.round(amountKrw),
    dateStr,
    tripId: state.activeTrip.id
  };

  if (isStaticMode) {
    const savedExpensesAll = localStorage.getItem('globeease_expenses_all');
    let expensesAll = savedExpensesAll ? JSON.parse(savedExpensesAll) : [];
    expensesAll.push(newExpense);
    localStorage.setItem('globeease_expenses_all', JSON.stringify(expensesAll));

    state.expenses.push(newExpense);
    closeAllModals();
    renderExpenses();
    renderDashboard();
    showToast("새 지출 내역이 등록되었습니다.");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newExpense)
    });
    if (!res.ok) throw new Error('API expense save failed');

    state.expenses.push(newExpense);
    closeAllModals();
    renderExpenses();
    renderDashboard();
    showToast("새 지출 내역이 등록되었습니다.");
  } catch (err) {
    console.error(err);
    showToast("지출 내역 등록 실패", "danger");
  }
}

async function deleteExpense(id) {
  if (confirm("정말로 이 지출 항목을 삭제하시겠습니까?")) {
    if (isStaticMode) {
      const savedExpensesAll = localStorage.getItem('globeease_expenses_all');
      let expensesAll = savedExpensesAll ? JSON.parse(savedExpensesAll) : [];
      expensesAll = expensesAll.filter(exp => exp.id !== id);
      localStorage.setItem('globeease_expenses_all', JSON.stringify(expensesAll));

      state.expenses = state.expenses.filter(exp => exp.id !== id);
      renderExpenses();
      renderDashboard();
      showToast("지출 내역이 안전하게 삭제되었습니다.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/expenses/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('API expense delete failed');

      state.expenses = state.expenses.filter(exp => exp.id !== id);
      renderExpenses();
      renderDashboard();
      showToast("지출 내역이 안전하게 삭제되었습니다.");
    } catch (err) {
      console.error(err);
      showToast("지출 내역 삭제 실패", "danger");
    }
  }
}

// -------------------------
// 4. CHECKLIST VIEW
// -------------------------
function renderChecklist(category = 'all') {
  const checklistGrid = document.getElementById('checklistGrid');
  const checklistProgressBar = document.getElementById('checklistProgressBar');
  const checklistProgressPercent = document.getElementById('checklistProgressPercent');
  const checklistProgressRatio = document.getElementById('checklistProgressRatio');
  
  // Calculate progress of checklist
  const total = state.checklist.length;
  const checked = state.checklist.filter(item => item.checked).length;
  const percent = total === 0 ? 0 : Math.round((checked / total) * 100);

  if (checklistProgressBar) checklistProgressBar.style.width = `${percent}%`;
  if (checklistProgressPercent) checklistProgressPercent.textContent = `${percent}%`;
  if (checklistProgressRatio) checklistProgressRatio.textContent = `${checked} / ${total}`;

  // Update Category Label
  const categoryTexts = {
    all: '전체 목록',
    essential: '필수 준비물',
    electronics: '전자기기',
    toiletries: '세면 & 화장품',
    clothing: '의류',
    medicine: '비상 의약품'
  };
  const categoryTitleNode = document.getElementById('checklistCategoryTitle');
  if (categoryTitleNode) categoryTitleNode.textContent = categoryTexts[category] || '준비물 목록';

  if (!checklistGrid) return;

  // Filter items
  const filteredItems = category === 'all' 
    ? state.checklist 
    : state.checklist.filter(item => item.category === category);

  if (filteredItems.length === 0) {
    checklistGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 2rem; color: var(--text-secondary);">
        등록된 준비물이 없습니다.
      </div>
    `;
    return;
  }

  checklistGrid.innerHTML = filteredItems.map(item => `
    <div class="checklist-item-card ${item.checked ? 'checked' : ''}">
      <div class="checklist-checkbox-label" onclick="toggleChecklistItem('${item.id}')">
        <span class="custom-checkbox">
          <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
        </span>
        <span>${item.name}</span>
      </div>
      <button class="action-icon-btn delete" onclick="deleteChecklistItem('${item.id}')" title="삭제" style="padding: 0.25rem;">
        <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
      </button>
    </div>
  `).join('');
}

async function toggleChecklistItem(id) {
  if (isStaticMode) {
    let targetItem = state.checklist.find(item => item.id === id);
    if (!targetItem) return;
    const newChecked = !targetItem.checked;

    const savedChecklistAll = localStorage.getItem('globeease_checklist_all');
    let checklistAll = savedChecklistAll ? JSON.parse(savedChecklistAll) : [];
    checklistAll = checklistAll.map(ch => ch.id === id ? { ...ch, checked: newChecked } : ch);
    localStorage.setItem('globeease_checklist_all', JSON.stringify(checklistAll));

    state.checklist = state.checklist.map(item => item.id === id ? { ...item, checked: newChecked } : item);

    const activeCat = document.querySelector('.checklist-cat-btn.active')?.getAttribute('data-category') || 'all';
    renderChecklist(activeCat);
    
    const widgetChecklistStatus = document.getElementById('widgetChecklistStatus');
    if (widgetChecklistStatus) {
      const checkedCount = state.checklist.filter(item => item.checked).length;
      widgetChecklistStatus.textContent = `${checkedCount} / ${state.checklist.length}`;
    }
    return;
  }

  let targetItem = state.checklist.find(item => item.id === id);
  if (!targetItem) return;

  const newChecked = !targetItem.checked;

  try {
    const res = await fetch(`${API_BASE}/checklist/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checked: newChecked })
    });
    if (!res.ok) throw new Error('API checklist update failed');

    state.checklist = state.checklist.map(item => {
      if (item.id === id) {
        return { ...item, checked: newChecked };
      }
      return item;
    });

    // Re-render
    const activeCat = document.querySelector('.checklist-cat-btn.active')?.getAttribute('data-category') || 'all';
    renderChecklist(activeCat);
    
    // Sync counter check count on dashboard widget
    const widgetChecklistStatus = document.getElementById('widgetChecklistStatus');
    if (widgetChecklistStatus) {
      const checkedCount = state.checklist.filter(item => item.checked).length;
      widgetChecklistStatus.textContent = `${checkedCount} / ${state.checklist.length}`;
    }
  } catch (err) {
    console.error(err);
    showToast("체크리스트 상태 수정 실패", "danger");
  }
}

function openChecklistItemModal() {
  document.getElementById('checklistNewName').value = '';
  // Default checklist category to the active selector tab
  const activeCat = document.querySelector('.checklist-cat-btn.active')?.getAttribute('data-category') || 'essential';
  const categoryField = document.getElementById('checklistNewCategory');
  if (categoryField && activeCat !== 'all') {
    categoryField.value = activeCat;
  }
  
  openModal('checklistItemModal');
}

async function handleChecklistItemSubmit(e) {
  e.preventDefault();

  if (!state.activeTrip) return;

  const name = document.getElementById('checklistNewName').value;
  const category = document.getElementById('checklistNewCategory').value;

  const newItem = {
    id: 'ch_' + Date.now(),
    category,
    name,
    checked: false,
    tripId: state.activeTrip.id
  };

  if (isStaticMode) {
    const savedChecklistAll = localStorage.getItem('globeease_checklist_all');
    let checklistAll = savedChecklistAll ? JSON.parse(savedChecklistAll) : [];
    checklistAll.push(newItem);
    localStorage.setItem('globeease_checklist_all', JSON.stringify(checklistAll));

    state.checklist.push(newItem);
    closeAllModals();
    
    // Highlight tab
    document.querySelectorAll('.checklist-cat-btn').forEach(btn => {
      if (btn.getAttribute('data-category') === category) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    renderChecklist(category);
    showToast("새 준비물이 추가되었습니다.");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/checklist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem)
    });
    if (!res.ok) throw new Error('API checklist add failed');

    state.checklist.push(newItem);
    closeAllModals();
    
    // Highlight tab
    document.querySelectorAll('.checklist-cat-btn').forEach(btn => {
      if (btn.getAttribute('data-category') === category) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    renderChecklist(category);
    showToast("새 준비물이 추가되었습니다.");
  } catch (err) {
    console.error(err);
    showToast("준비물 등록 실패", "danger");
  }
}

async function deleteChecklistItem(id) {
  if (isStaticMode) {
    const savedChecklistAll = localStorage.getItem('globeease_checklist_all');
    let checklistAll = savedChecklistAll ? JSON.parse(savedChecklistAll) : [];
    checklistAll = checklistAll.filter(ch => ch.id !== id);
    localStorage.setItem('globeease_checklist_all', JSON.stringify(checklistAll));

    state.checklist = state.checklist.filter(item => item.id !== id);
    const activeCat = document.querySelector('.checklist-cat-btn.active')?.getAttribute('data-category') || 'all';
    renderChecklist(activeCat);
    showToast("준비물이 리스트에서 해제되었습니다.");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/checklist/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('API checklist delete failed');

    state.checklist = state.checklist.filter(item => item.id !== id);
    const activeCat = document.querySelector('.checklist-cat-btn.active')?.getAttribute('data-category') || 'all';
    renderChecklist(activeCat);
    showToast("준비물이 리스트에서 해제되었습니다.");
  } catch (err) {
    console.error(err);
    showToast("준비물 삭제 실패", "danger");
  }
}

// -------------------------
// 5. CURRENCY CONVERTER VIEW
// -------------------------
function setupConverter() {
  const fromSelect = document.getElementById('converterFromCurrency');
  const toSelect = document.getElementById('converterToCurrency');

  if (!fromSelect || !toSelect) return;

  const currencyOptions = travelData.currencies.map(c => `
    <option value="${c.code}">${c.code} - ${c.name}</option>
  `).join('');

  fromSelect.innerHTML = currencyOptions;
  toSelect.innerHTML = currencyOptions;

  // Defaults: USD -> KRW
  fromSelect.value = 'USD';
  toSelect.value = 'KRW';

  updateExchangeRateText();
  convertCurrency('from');

  // Render Exchange Rates list table
  renderRatesTable();
}

function updateExchangeRateText() {
  const from = document.getElementById('converterFromCurrency').value;
  const to = document.getElementById('converterToCurrency').value;
  const rateText = document.getElementById('converterExchangeRateText');

  const fromObj = travelData.currencies.find(c => c.code === from);
  const toObj = travelData.currencies.find(c => c.code === to);

  if (!fromObj || !toObj) return;

  // Convert 1 unit of "from" to "to"
  let computedRate = 0;
  if (from === 'KRW') {
    computedRate = to === 'JPY' ? (100 / toObj.rate) : (1 / toObj.rate);
  } else {
    const amountInKrw = from === 'JPY' ? (fromObj.rate / 100) : fromObj.rate;
    computedRate = to === 'KRW' ? amountInKrw : (to === 'JPY' ? (amountInKrw * 100 / toObj.rate) : (amountInKrw / toObj.rate));
  }

  if (from === 'JPY') {
    let rateFor100 = 0;
    if (to === 'KRW') rateFor100 = fromObj.rate;
    else rateFor100 = (fromObj.rate) / (to === 'JPY' ? (toObj.rate/100) : toObj.rate);
    rateText.innerHTML = `<span class="rate-info-highlight">100 JPY = ${formatNumber(rateFor100, 2)} ${to}</span>`;
  } else {
    rateText.innerHTML = `<span class="rate-info-highlight">1 ${from} = ${formatNumber(computedRate, 2)} ${to}</span>`;
  }
}

function convertCurrency(direction = 'from') {
  const fromSelect = document.getElementById('converterFromCurrency');
  const toSelect = document.getElementById('converterToCurrency');
  const fromInput = document.getElementById('converterFromInput');
  const toInput = document.getElementById('converterToInput');

  if (!fromSelect || !toSelect || !fromInput || !toInput) return;

  const from = fromSelect.value;
  const to = toSelect.value;

  const fromObj = travelData.currencies.find(c => c.code === from);
  const toObj = travelData.currencies.find(c => c.code === to);

  if (!fromObj || !toObj) return;

  let valStr = fromInput.value.replace(/,/g, '');
  if (isNaN(valStr) || valStr === '') {
    toInput.value = '0';
    return;
  }
  const fromVal = parseFloat(valStr);

  let amountInKrw = 0;
  if (from === 'KRW') {
    amountInKrw = fromVal;
  } else if (from === 'JPY') {
    amountInKrw = (fromVal / 100) * fromObj.rate;
  } else {
    amountInKrw = fromVal * fromObj.rate;
  }

  let converted = 0;
  if (to === 'KRW') {
    converted = amountInKrw;
  } else if (to === 'JPY') {
    converted = (amountInKrw / toObj.rate) * 100;
  } else {
    converted = amountInKrw / toObj.rate;
  }

  toInput.value = formatNumber(converted, 2);
}

function renderRatesTable() {
  const tableBody = document.getElementById('ratesTableBody');
  if (!tableBody) return;

  const rates = travelData.currencies.filter(c => c.code !== 'KRW');

  const changes = {
    USD: { diff: '+4.5', up: true },
    JPY: { diff: '-0.12', up: false },
    EUR: { diff: '+7.2', up: true },
    CNY: { diff: '+0.4', up: true },
    THB: { diff: '-0.15', up: false },
    AUD: { diff: '+1.8', up: true },
    GBP: { diff: '-2.4', up: false },
    SGD: { diff: '+0.8', up: true },
    VND: { diff: '-0.02', up: false },
    IDR: { diff: '+0.05', up: true }
  };

  const currencyFlags = {
    USD: '🇺🇸', JPY: '🇯🇵', EUR: '🇪🇺', CNY: '🇨🇳', THB: '🇹🇭', AUD: '🇦🇺', GBP: '🇬🇧', SGD: '🇸🇬', VND: '🇻🇳', IDR: '🇮🇩'
  };

  tableBody.innerHTML = rates.map(c => {
    const change = changes[c.code] || { diff: '0.0', up: true };
    const changeColor = change.up ? '#10b981' : '#ef4444';
    const changeSymbol = change.up ? '▲' : '▼';
    const displayRate = c.code === 'VND' || c.code === 'IDR' ? c.rate * 100 : c.rate;
    const labelSuffix = c.code === 'VND' || c.code === 'IDR' ? ' (100단위)' : '';
    
    return `
      <tr>
        <td>
          <div class="rates-currency-name">
            <span class="rates-flag">${currencyFlags[c.code] || '🌐'}</span>
            <span>${c.name}${labelSuffix}</span>
          </div>
        </td>
        <td><strong>${c.code}</strong></td>
        <td class="rates-value">₩ ${formatNumber(displayRate, 2)}</td>
        <td style="text-align: right; font-weight: bold; color: ${changeColor}">
          ${changeSymbol} ${change.diff}
        </td>
      </tr>
    `;
  }).join('');
}

// -------------------------
// COMMON FORMATTERS & GETTERS
// -------------------------
function getCurrencySymbol(code) {
  const curr = travelData.currencies.find(c => c.code === code);
  return curr ? curr.symbol : '';
}

function formatNumber(num, decimals = 0) {
  return Number(num).toLocaleString('ko-KR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

function formatKoreanDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}
