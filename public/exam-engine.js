/* ============================================================================
   FILE 3/3: exam-engine.js
   ĐỘNG CƠ PHÒNG THI INSPERA 100% (MODULES 19 -> 38):
   - WRITING CHART EXTRACTOR & COMPACT TOPBAR (NO PROMPT OVERFLOW)
   - INSPERA BOOKMARK, SPLIT MAP LAYOUT & PART-GROUPED FOOTER (IELTS MATE STYLE)
   - OFFICIAL 4-STEP CD-IELTS MOCK TEST LOBBY (SOUND CHECK + FULL TEST ONLY + NO PAUSE)
   - INSPERA AUTHENTIC HIGHLIGHT & NOTE ENGINE (PERSISTENT ACROSS ALL PARTS IN LISTENING & READING)
   - PERSONAL LEARNING DASHBOARD, HOMEWORK ASSIGNMENTS & LIVE ONLINE BANNER
   ============================================================================ */

/* === MODULE 19: TRÍCH XUẤT HÌNH ẢNH BIỂU ĐỒ / BẢN ĐỒ TASK 1 & ZOOM LIGHTBOX === */
function extractTask1ChartImageSrc(wExam) {
  if (!wExam) return '';
  const t1 = wExam.task1 || {};
  const directUrl = t1.image || t1.imageUrl || t1.img || t1.chartUrl || t1.mediaUrl || wExam.image || wExam.imageUrl || '';
  if (directUrl && String(directUrl).trim()) return String(directUrl).trim();
  const promptStr = String(t1.prompt || '');
  const imgMatch = promptStr.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch && imgMatch[1]) return imgMatch[1].trim();
  return '';
}

window.openTask1ChartZoom = function(imgSrc) {
  if (!imgSrc) return;
  const overlay = document.getElementById('rewriteChartZoomOverlay');
  const img = document.getElementById('rewriteChartZoomImg');
  if (overlay && img) {
    img.src = imgSrc;
    overlay.style.display = 'flex';
  }
};

/* === MODULE 20 & 21: THU GỌN THANH TOPBAR PHÒNG THI & GOM NÚT HIỂN THỊ (⚙️) === */
function optimizeRealExamShellTopbar() {
  const shell = document.getElementById('examShell');
  if (!shell || shell.style.display === 'none') return;

  // 1. Giữ tiêu đề trên Topbar ngắn gọn, đặc biệt với bài Writing có đề dài
  const titleEl = document.getElementById('insperaExamTitle');
  if (titleEl && activeExam) {
    if (activeExamType === 'writing') {
      const shortTitle = String(activeExam.title || 'IELTS Academic Writing').length > 42
        ? 'IELTS Academic Writing'
        : activeExam.title;
      if (titleEl.textContent !== shortTitle) titleEl.textContent = shortTitle;
      titleEl.title = activeExam.title || '';
    } else {
      titleEl.title = activeExam.title || '';
    }
  }

  // 2. Gom 2 thẻ <select id="examFontSizeSelect"> và <select id="examThemeSelect"> vào nút "⚙️ Hiển thị"
  const fontSel = document.getElementById('examFontSizeSelect');
  const themeSel = document.getElementById('examThemeSelect');

  if (fontSel && themeSel && !document.getElementById('examDisplayGearContainer')) {
    const parentRight = fontSel.parentElement;
    const gearWrap = document.createElement('div');
    gearWrap.id = 'examDisplayGearContainer';
    gearWrap.className = 'exam-display-gear-container';

    const gearBtn = document.createElement('button');
    gearBtn.type = 'button';
    gearBtn.className = 'exam-display-gear-btn';
    gearBtn.innerHTML = '⚙️ Hiển thị';

    const dropdown = document.createElement('div');
    dropdown.id = 'examDisplayGearDropdown';
    dropdown.className = 'exam-display-gear-dropdown';

    const fBox = document.createElement('div');
    fBox.innerHTML = '<span class="gear-field-label">🔤 Cỡ chữ (Text Size)</span>';
    fBox.appendChild(fontSel);

    const tBox = document.createElement('div');
    tBox.innerHTML = '<span class="gear-field-label">🎨 Giao diện (Contrast)</span>';
    tBox.appendChild(themeSel);

    dropdown.appendChild(fBox);
    dropdown.appendChild(tBox);
    gearWrap.appendChild(gearBtn);
    gearWrap.appendChild(dropdown);

    gearBtn.onclick = (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('show');
    };

    document.addEventListener('click', (e) => {
      if (!gearWrap.contains(e.target)) dropdown.classList.remove('show');
    });

    parentRight.insertBefore(gearWrap, parentRight.firstChild);
  }

  // 3. Khóa nghiêm ngặt nút Pause & chỉnh tốc độ khi đang ở chế độ Thi thật (Exam Mode) hoặc Mock Test
  const isStrictExam = (typeof currentExecutionMode !== 'undefined' && currentExecutionMode === 'exam') ||
                       (window.mockSession && window.mockSession.active);
  shell.classList.toggle('exam-strict-mode', Boolean(isStrictExam && !isReviewMode));

  const pauseBtn = document.getElementById('btnPracticePauseToggle');
  if (pauseBtn && (isStrictExam || isReviewMode)) {
    pauseBtn.style.display = 'none';
  }
}

setInterval(optimizeRealExamShellTopbar, 400);

/* === MODULE 22: HỆ THỐNG BOOKMARK CHUẨN INSPERA & CHIA ĐÔI 2 CỘT CHO BÀI MAP/DIAGRAM === */
let bookmarkedQuestionKeys = new Set();
let lastBookmarkExamId = null;

function ensureBookmarkSetForCurrentExam() {
  const curId = activeExam ? activeExam.id : null;
  if (curId !== lastBookmarkExamId) {
    bookmarkedQuestionKeys.clear();
    lastBookmarkExamId = curId;
  }
}

window.toggleInsperaQuestionBookmark = function(qKey, ev) {
  if (ev) {
    ev.stopPropagation();
    ev.preventDefault();
  }
  ensureBookmarkSetForCurrentExam();
  if (bookmarkedQuestionKeys.has(qKey)) {
    bookmarkedQuestionKeys.delete(qKey);
  } else {
    bookmarkedQuestionKeys.add(qKey);
  }
  syncInsperaBookmarkVisuals();
};

function syncInsperaBookmarkVisuals() {
  ensureBookmarkSetForCurrentExam();
  document.querySelectorAll('.inspera-bookmark-btn[data-bm-key]').forEach(btn => {
    const k = btn.getAttribute('data-bm-key');
    const isBm = bookmarkedQuestionKeys.has(k);
    btn.classList.toggle('active', isBm);
    btn.title = isBm ? 'Bỏ đánh dấu câu này (Bookmarked)' : 'Đánh dấu xem lại câu này (Bookmark)';
  });

  document.querySelectorAll('#insperaFooterList .progress-item').forEach(pill => {
    const k = (pill.id || '').replace('fpill_', '');
    if (k) pill.classList.toggle('bookmarked-pill', bookmarkedQuestionKeys.has(k));
  });
}

function createBookmarkButtonElement(qKey) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'inspera-bookmark-btn' + (bookmarkedQuestionKeys.has(qKey) ? ' active' : '');
  btn.setAttribute('data-bm-key', qKey);
  btn.title = 'Bookmark question for review';
  btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>`;
  btn.onclick = (e) => toggleInsperaQuestionBookmark(qKey, e);
  return btn;
}

function injectInsperaBookmarkButtons() {
  if (!activeExam || activeExamType === 'writing') return;
  ensureBookmarkSetForCurrentExam();
  const rightPane = document.getElementById('insperaRightPane');
  if (!rightPane) return;

  const keys = Object.keys(activeExam.correctAnswers || {}).sort(
    (a, b) => parseInt(a.replace(/\D/g, '')) - parseInt(b.replace(/\D/g, ''))
  );

  keys.forEach(k => {
    if (rightPane.querySelector(`.inspera-bookmark-btn[data-bm-key="${k}"]`)) return;
    const qNum = k.replace(/\D/g, '');

    const qBlock = rightPane.querySelector(`.question[data-question="${qNum}"]`);
    if (qBlock) {
      if (qBlock.tagName === 'TR') {
        const stmtCell = qBlock.querySelector('.matrix-statement') || qBlock.cells[0];
        if (stmtCell) stmtCell.appendChild(createBookmarkButtonElement(k));
      } else {
        const qText = qBlock.querySelector('.question-text') || qBlock;
        qText.appendChild(createBookmarkButtonElement(k));
      }
      return;
    }

    const inlineCtrl = rightPane.querySelector(`input[type="text"][name="${k}"], select[name="${k}"], .drop-zone[data-target="${k}"]`);
    if (inlineCtrl) {
      inlineCtrl.insertAdjacentElement('afterend', createBookmarkButtonElement(k));
    }
  });

  syncInsperaBookmarkVisuals();
}

function transformListeningMapToSplitColumns() {
  if (activeExamType !== 'listening') return;
  const rightPane = document.getElementById('insperaRightPane');
  if (!rightPane) return;

  rightPane.querySelectorAll('.question-group').forEach(group => {
    if (group.dataset.mapSplitApplied === '1') return;
    const img = group.querySelector('img');
    if (!img) return;
    const hasQuestions = group.querySelector('input, select, .drop-zone, .question');
    if (!hasQuestions) return;

    const imgContainer = img.parentElement;
    let questionsBox = imgContainer.nextElementSibling;
    if (questionsBox && questionsBox.contains(img)) return;

    group.dataset.mapSplitApplied = '1';
    const splitWrap = document.createElement('div');
    splitWrap.className = 'inspera-map-split-layout';

    const leftCol = document.createElement('div');
    leftCol.className = 'inspera-map-left-sticky';

    const rightCol = document.createElement('div');
    rightCol.className = 'inspera-map-right-questions';

    img.onclick = () => { if (typeof openTask1ChartZoom === 'function') openTask1ChartZoom(img.src); };
    leftCol.appendChild(img);

    const nodesToMove = [];
    let curr = imgContainer.nextSibling;
    while (curr) {
      nodesToMove.push(curr);
      curr = curr.nextSibling;
    }
    if (imgContainer.children.length === 0 && !imgContainer.textContent.trim()) {
      imgContainer.remove();
    }
    nodesToMove.forEach(node => rightCol.appendChild(node));

    splitWrap.appendChild(leftCol);
    splitWrap.appendChild(rightCol);
    group.appendChild(splitWrap);
  });
}

/* === MODULE 23, 26, 27, 28, 29: CHUẨN HÓA BỘ ĐẾM CÂU & FOOTER THEO CỤM PART (INSPERA STYLE) === */
let currentFocusedQuestionKey = null;
let _cachedExamPartMap = { examId: null, map: {} };

function extractQuestionNumbersFromPassageDOM(p) {
  const nums = new Set();
  const qHtml = String(p.questionsHtml || '');
  const pHtml = String(p.passageHtml || '');

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${pHtml}</div><div>${qHtml}</div>`, 'text/html');
    doc.querySelectorAll('[name]').forEach(el => {
      const m = (el.getAttribute('name') || '').match(/^q(\d+)$/i);
      if (m) nums.add(parseInt(m[1], 10));
    });
    doc.querySelectorAll('[data-target]').forEach(el => {
      const m = (el.getAttribute('data-target') || '').match(/^q(\d+)$/i);
      if (m) nums.add(parseInt(m[1], 10));
    });
    doc.querySelectorAll('[data-question]').forEach(el => {
      const raw = (el.getAttribute('data-question') || '').trim();
      const rangeM = raw.match(/^(\d+)\s*[-–]\s*(\d+)$/);
      if (rangeM) {
        for (let i = parseInt(rangeM[1], 10); i <= parseInt(rangeM[2], 10); i++) nums.add(i);
      } else {
        const singleM = raw.match(/^(\d+)$/);
        if (singleM) nums.add(parseInt(singleM[1], 10));
      }
    });
    doc.querySelectorAll('[data-multi-pair]').forEach(el => {
      (el.getAttribute('data-multi-pair') || '').split(',').forEach(part => {
        const m = part.trim().match(/^q(\d+)$/i);
        if (m) nums.add(parseInt(m[1], 10));
      });
    });
    doc.querySelectorAll('[data-pair-group]').forEach(el => {
      (el.getAttribute('data-pair-group') || '').split('_').forEach(part => {
        const m = part.trim().match(/^q(\d+)$/i);
        if (m) nums.add(parseInt(m[1], 10));
      });
    });
    doc.querySelectorAll('.q-badge').forEach(el => {
      const txt = (el.textContent || '').trim();
      const rangeM = txt.match(/^(\d+)\s*[-–]\s*(\d+)$/);
      if (rangeM) {
        for (let i = parseInt(rangeM[1], 10); i <= parseInt(rangeM[2], 10); i++) nums.add(i);
      } else {
        const singleM = txt.match(/^(\d+)$/);
        if (singleM) nums.add(parseInt(singleM[1], 10));
      }
    });
  } catch (e) {}

  return Array.from(nums).filter(n => !isNaN(n) && n > 0 && n <= 60).sort((a, b) => a - b);
}

function getAccurateExamPartMap() {
  if (!activeExam) return {};
  if (_cachedExamPartMap.examId === activeExam.id && Object.keys(_cachedExamPartMap.map).length > 0) {
    return _cachedExamPartMap.map;
  }

  const passages = activeExam.passages || [];
  const map = {};
  const explicitByPart = {};

  passages.forEach((p, idx) => {
    const pNum = p.partNum || (idx + 1);
    explicitByPart[pNum] = extractQuestionNumbersFromPassageDOM(p);
  });

  passages.forEach((p, idx) => {
    const pNum = p.partNum || (idx + 1);
    explicitByPart[pNum].forEach(n => {
      if (!map['q' + n]) map['q' + n] = pNum;
    });
  });

  const allKeys = Object.keys(activeExam.correctAnswers || {}).sort(
    (a, b) => parseInt(a.replace(/\D/g, ''), 10) - parseInt(b.replace(/\D/g, ''), 10)
  );

  allKeys.forEach(k => {
    if (map[k]) return;
    const n = parseInt(k.replace(/\D/g, ''), 10);
    if (isNaN(n)) return;

    for (let idx = 0; idx < passages.length; idx++) {
      const pNum = passages[idx].partNum || (idx + 1);
      const explicitArr = explicitByPart[pNum];
      if (explicitArr && explicitArr.length >= 2) {
        const minQ = explicitArr[0];
        const maxQ = explicitArr[explicitArr.length - 1];
        if (n >= minQ && n <= maxQ) {
          map[k] = pNum;
          return;
        }
      }
    }

    if (activeExamType === 'listening' && passages.length >= 4) {
      if (n <= 10) map[k] = passages[0].partNum || 1;
      else if (n <= 20) map[k] = passages[1].partNum || 2;
      else if (n <= 30) map[k] = passages[2].partNum || 3;
      else map[k] = passages[3].partNum || 4;
    } else if (passages.length === 3) {
      if (n <= 13) map[k] = passages[0].partNum || 1;
      else if (n <= 26) map[k] = passages[1].partNum || 2;
      else map[k] = passages[2].partNum || 3;
    } else {
      map[k] = passages[0] ? (passages[0].partNum || 1) : 1;
    }
  });

  _cachedExamPartMap = { examId: activeExam.id, map };
  return map;
}

window.findPartForQuestionKey = function(qKey) {
  if (!activeExam) return 1;
  const partMap = getAccurateExamPartMap();
  const normalizedKey = String(qKey || '').toLowerCase().startsWith('q') ? String(qKey).toLowerCase() : ('q' + qKey);
  if (partMap[normalizedKey]) return partMap[normalizedKey];
  const passages = activeExam.passages || [];
  return passages[0] ? (passages[0].partNum || 1) : 1;
};

function getSortedExamQuestionKeys() {
  if (!activeExam || !activeExam.correctAnswers) return [];
  return Object.keys(activeExam.correctAnswers).sort(
    (a, b) => parseInt(a.replace(/\D/g, ''), 10) - parseInt(b.replace(/\D/g, ''), 10)
  );
}

function getQuestionsGroupedByPart() {
  const groups = {};
  const passages = (activeExam && activeExam.passages) || [];
  passages.forEach((p, idx) => {
    const pNum = p.partNum || (idx + 1);
    groups[pNum] = [];
  });

  const keys = getSortedExamQuestionKeys();
  keys.forEach(k => {
    const pNum = findPartForQuestionKey(k);
    if (!groups[pNum]) groups[pNum] = [];
    if (!groups[pNum].includes(k)) groups[pNum].push(k);
  });
  return groups;
}

function forceRenderWritingFooterClean() {
  const hasWritingBox = Boolean(document.getElementById('writingEditor'));
  if (!hasWritingBox && activeExamType !== 'writing') return;
  if (!activeExam) return;

  activeExamType = 'writing';
  const topTabs = document.getElementById('insperaPartTabs');
  if (topTabs) {
    topTabs.innerHTML = '';
    topTabs.style.display = 'none';
  }

  const arrowBox = document.getElementById('matePrevNextBox');
  if (arrowBox) arrowBox.style.display = 'none';

  const footerList = document.getElementById('insperaFooterList');
  if (!footerList) return;

  const hasT1 = Boolean(activeExam.task1 && String(activeExam.task1.prompt || '').trim());
  const hasT2 = Boolean(activeExam.task2 && String(activeExam.task2.prompt || '').trim());
  const curText = (activePartNum === 1 ? writingAnswers.task1 : writingAnswers.task2) || '';
  const words = curText.trim() ? curText.trim().split(/\s+/).length : 0;

  footerList.innerHTML = `
    <div style="display:flex; align-items:center; gap:12px;">
      ${hasT1 ? `<button type="button" class="writing-footer-pill ${activePartNum === 1 ? 'current' : ''} ${(writingAnswers.task1 || '').trim() ? 'answered' : ''}" id="wfoot_1" onclick="switchWritingTask(1)">Part 1 (Task 1)</button>` : ''}
      ${hasT2 ? `<button type="button" class="writing-footer-pill ${activePartNum === 2 ? 'current' : ''} ${(writingAnswers.task2 || '').trim() ? 'answered' : ''}" id="wfoot_2" onclick="switchWritingTask(2)">Part 2 (Task 2)</button>` : ''}
      <span id="writingWordCountDisplay" style="margin-left:10px; font-weight:800; color:#0f172a; font-size:13px;">Word count: ${words}</span>
    </div>
  `;
}

window.buildFooterNav = function() {
  const container = document.getElementById('insperaFooterList');
  if (!container) return;

  if (activeExamType === 'writing' || document.getElementById('writingEditor')) {
    forceRenderWritingFooterClean();
    return;
  }

  const arrowBox = document.getElementById('matePrevNextBox');
  if (arrowBox) arrowBox.style.display = '';

  container.innerHTML = '';
  const groups = getQuestionsGroupedByPart();
  const partNums = Object.keys(groups).map(Number).sort((a, b) => a - b);

  partNums.forEach(pNum => {
    const qKeys = groups[pNum] || [];
    const answeredCount = qKeys.filter(k => Boolean(userAnswers[k] && String(userAnswers[k]).trim() !== '')).length;
    const isActivePart = (Number(pNum) === Number(activePartNum));

    const partDiv = document.createElement('div');
    partDiv.className = 'mate-footer-part-group' + (isActivePart ? ' active-part' : '');

    if (!isActivePart) {
      partDiv.innerHTML = `
        <span class="mate-footer-part-title">Part ${pNum}</span>
        <span class="mate-footer-part-count">${answeredCount} of ${qKeys.length}</span>
      `;
      partDiv.onclick = () => {
        switchExamPassage(pNum);
        const firstKey = qKeys[0];
        if (firstKey) currentFocusedQuestionKey = firstKey;
        buildFooterNav();
      };
    } else {
      const titleSpan = document.createElement('span');
      titleSpan.className = 'mate-footer-part-title';
      titleSpan.textContent = `Part ${pNum}`;
      partDiv.appendChild(titleSpan);

      const pillsWrap = document.createElement('div');
      pillsWrap.className = 'mate-footer-q-pills';

      qKeys.forEach(k => {
        const num = k.replace(/\D/g, '');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'progress-item';
        btn.id = `fpill_${k}`;
        btn.textContent = num;

        const hasVal = Boolean(userAnswers[k] && String(userAnswers[k]).trim() !== '');
        if (isReviewMode) {
          if (!hasVal) btn.classList.add('review-unanswered');
          else btn.classList.add(isAnswerCorrect(k) ? 'review-correct' : 'review-incorrect');
        } else {
          if (hasVal) btn.classList.add('answered');
        }
        if (currentFocusedQuestionKey === k) btn.classList.add('current');
        if (typeof bookmarkedQuestionKeys !== 'undefined' && bookmarkedQuestionKeys.has(k)) {
          btn.classList.add('bookmarked-pill');
        }

        btn.onclick = (e) => {
          e.stopPropagation();
          focusExamQuestionByKey(k);
        };
        pillsWrap.appendChild(btn);
      });

      partDiv.appendChild(pillsWrap);
    }

    container.appendChild(partDiv);
  });

  const bottomSubmitBtn = document.getElementById('btnSubmitBottom');
  if (bottomSubmitBtn && !isReviewMode) {
    bottomSubmitBtn.innerHTML = '✓';
    bottomSubmitBtn.title = 'Nộp bài (Submit Test)';
  }
};

window.updateFooterNav = function() {
  if (activeExamType === 'writing' || document.getElementById('writingEditor')) {
    forceRenderWritingFooterClean();
    return;
  }
  buildFooterNav();
};

window.focusExamQuestionByKey = function(qKey) {
  if (!qKey || !activeExam) return;
  currentFocusedQuestionKey = qKey;
  const num = qKey.replace(/\D/g, '');
  const targetPart = findPartForQuestionKey(qKey);

  if (targetPart && Number(targetPart) !== Number(activePartNum)) {
    switchExamPassage(targetPart);
  } else {
    buildFooterNav();
  }

  setTimeout(() => {
    const targetEl = document.querySelector(`#insperaSplitBox [data-question="${num}"]`)
      || document.querySelector(`#insperaSplitBox [name="${qKey}"]`)
      || document.querySelector(`#insperaSplitBox .drop-zone[data-target="${qKey}"]`);
    if (targetEl) {
      document.querySelectorAll('.question-scroll-focus').forEach(el => el.classList.remove('question-scroll-focus'));
      const box = targetEl.closest('.question') || targetEl.closest('tr') || targetEl;
      box.classList.add('question-scroll-focus');
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (targetEl.focus && !isReviewMode) targetEl.focus();
    }
  }, 60);
};

window.stepExamQuestionByDelta = function(delta) {
  if (!activeExam || activeExamType === 'writing') return;
  const keys = getSortedExamQuestionKeys();
  if (!keys.length) return;
  let idx = keys.indexOf(currentFocusedQuestionKey);
  if (idx === -1) idx = 0;
  else idx = Math.max(0, Math.min(keys.length - 1, idx + delta));
  focusExamQuestionByKey(keys[idx]);
};

/* === MODULE 23, 24, 25, 30: PHÒNG THI THỬ 3 KỸ NĂNG LIÊN HOÀN (FULL MOCK TEST ENGINE & LOBBY 4 BƯỚC) === */
let mockSession = {
  active: false,
  title: '',
  stage: 0, // 0: Pre-test, 1: Listening, 2: Reading, 3: Writing
  listeningExam: null,
  readingExam: null,
  writingExam: null,
  listeningResult: null,
  readingResult: null,
  writingResult: null,
  breakTimer: null
};
window.mockSession = mockSession;

let lobbyStepState = {
  pretestDone: false,
  listeningIntroConfirmed: false,
  slideIndex: 0,
  slideTimer: null
};

const LISTENING_INTRO_SLIDES = [
  "You will be listening to an audio recording during the <b>Listening</b> test.",
  "There are <b>4 parts</b> and <b>40 questions</b> in total.<br><span style='font-size:16px; font-weight:500;'>The audio plays once only.</span>",
  "Put on your headphones now and click <b>Confirm</b> when you are ready to begin."
];

function ensureMockSetsInitialized() {
  if (!db.mockSets) db.mockSets = [];
  const fs = (typeof getActiveFirestore === 'function') ? getActiveFirestore() : CLOUD_DB;
  if (fs && !window._mockSetsListenerBound) {
    window._mockSetsListenerBound = true;
    fs.collection('suite_mockSets').onSnapshot(snap => {
      if (!snap.empty) {
        db.mockSets = snap.docs.map(d => d.data());
        if (activeUser && document.getElementById('tab-mocktest')?.style.display !== 'none') {
          renderMockTestTab();
        }
      }
    });
  }
}

function injectMockTestTabIntoDashboard() {
  const tabsBar = document.querySelector('.dash-tabs');
  const writingBtn = document.getElementById('tabbtn-writing');
  if (tabsBar && writingBtn && !document.getElementById('tabbtn-mocktest')) {
    const btn = document.createElement('button');
    btn.className = 'dash-tab-btn';
    btn.id = 'tabbtn-mocktest';
    btn.innerHTML = '🎓 Full Mock Test (3 Kỹ Năng)';
    btn.onclick = () => switchDashTab('mocktest');
    writingBtn.insertAdjacentElement('afterend', btn);
  }

  const dashBody = document.querySelector('.dash-body');
  if (dashBody && !document.getElementById('tab-mocktest')) {
    const pane = document.createElement('div');
    pane.id = 'tab-mocktest';
    pane.className = 'dash-pane';
    pane.style.display = 'none';
    dashBody.appendChild(pane);
  }
}

// Thuật toán Round-Robin Shuffle chọn ĐỀ FULL TEST (4 Parts Listening, 3 Passages Reading, Task 1 + Task 2 Writing)
function hashSeedForMock(str) {
  let h = 2166136261 >>> 0;
  const s = String(str || '');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pickNonRepeatingFromPool(pool, doneSet, saltStr) {
  if (!pool || !pool.length) return null;
  const sorted = pool.slice().sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const fresh = sorted.filter(e => !doneSet.has(e.id));
  const candidates = fresh.length ? fresh : sorted;

  const allStudents = (db.users || []).filter(u => u.role === 'student').sort((a, b) => String(a.username).localeCompare(String(b.username)));
  let rank = allStudents.findIndex(u => activeUser && u.username === activeUser.username);
  if (rank < 0) rank = activeUser ? hashSeedForMock(activeUser.username) : Math.floor(Math.random() * 100);

  const daySeed = hashSeedForMock(new Date().toISOString().slice(0, 10) + '_' + saltStr);
  const idx = (rank + daySeed + doneSet.size) % candidates.length;
  return candidates[idx];
}

function buildRandomMockTestBundle() {
  const doneR = new Set(getStudentCompletedExamIds('reading'));
  const doneL = new Set(getStudentCompletedExamIds('listening'));
  const doneW = new Set(getStudentCompletedExamIds('writing'));

  // 1. CHỈ LẤY ĐỀ FULL LISTENING (4 Parts hoặc có chữ Full / >= 30 câu)
  const allL = getVisibleExams(db.listeningExams || []);
  const fullL = allL.filter(e =>
    (e.passages && e.passages.length >= 4) ||
    String(e.category || '').toLowerCase().includes('full') ||
    Object.keys(e.correctAnswers || {}).length >= 30
  );
  const chosenL = pickNonRepeatingFromPool(fullL.length ? fullL : allL, doneL, 'L');

  // 2. CHỈ LẤY ĐỀ FULL READING (3 Passages hoặc có chữ Full / >= 30 câu)
  const allR = getVisibleExams(db.readingExams || []);
  const fullR = allR.filter(e =>
    (e.passages && e.passages.length >= 3) ||
    String(e.category || '').toLowerCase().includes('full') ||
    Object.keys(e.correctAnswers || {}).length >= 30
  );
  const chosenR = pickNonRepeatingFromPool(fullR.length ? fullR : allR, doneR, 'R');

  // 3. CHỈ LẤY ĐỀ FULL WRITING (Có cả Task 1 & Task 2; nếu kho toàn đề lẻ thì tự ghép 1 đề Task 1 + 1 đề Task 2 chưa làm)
  const allW = getVisibleExams(db.writingExams || []);
  const fullW = allW.filter(w => w.task1?.prompt && w.task2?.prompt);
  let chosenW = null;

  if (fullW.length) {
    chosenW = pickNonRepeatingFromPool(fullW, doneW, 'W_FULL');
  } else {
    const t1Pool = allW.filter(w => w.task1?.prompt);
    const t2Pool = allW.filter(w => w.task2?.prompt);
    const pickT1 = pickNonRepeatingFromPool(t1Pool, doneW, 'W_T1');
    const pickT2 = pickNonRepeatingFromPool(t2Pool, doneW, 'W_T2');
    if (pickT1 || pickT2) {
      chosenW = {
        id: (pickT1 ? pickT1.id : pickT2.id),
        title: `Full Writing Mock (${pickT1 ? pickT1.title : 'Task 1'} + ${pickT2 ? pickT2.title : 'Task 2'})`,
        duration: 60,
        task1: pickT1 ? pickT1.task1 : { prompt: '', image: '' },
        task2: pickT2 ? pickT2.task2 : { prompt: '' }
      };
    }
  }

  return { listening: chosenL, reading: chosenR, writing: chosenW };
}

window.startRandomFullMockTest = function() {
  const bundle = buildRandomMockTestBundle();
  if (!bundle.listening || !bundle.reading || !bundle.writing) {
    return alert('Kho đề hiện cần có ít nhất 1 đề Listening, 1 đề Reading và 1 đề Writing để bắt đầu kỳ thi thử 3 kỹ năng!');
  }
  startMockTestFlow('Full CD-IELTS Mock Test (Official Simulation)', bundle.listening, bundle.reading, bundle.writing);
};

window.startFullMockTestSession = window.startRandomFullMockTest;

window.startAssignedMockSet = function(mockSetId) {
  const ms = (db.mockSets || []).find(x => x.id === mockSetId);
  if (!ms) return;
  const lEx = (db.listeningExams || []).find(e => e.id === ms.listeningId) || (db.listeningExams || [])[0];
  const rEx = (db.readingExams || []).find(e => e.id === ms.readingId) || (db.readingExams || [])[0];
  const w1 = (db.writingExams || []).find(e => e.id === ms.writingT1Id) || (db.writingExams || [])[0];
  const w2 = ms.writingT2Id ? (db.writingExams || []).find(e => e.id === ms.writingT2Id) : null;

  if (!lEx || !rEx || !w1) return alert('Một trong các đề thành phần của gói thi thử này đã bị xóa!');

  const combinedW = {
    id: w1.id,
    title: w2 && w2.id !== w1.id ? `Full Writing (${w1.title} + ${w2.title})` : w1.title,
    duration: 60,
    task1: w1.task1 || { prompt: '', image: '' },
    task2: (w2 && w2.task2?.prompt) ? w2.task2 : (w1.task2 || { prompt: '' })
  };

  startMockTestFlow(ms.title, lEx, rEx, combinedW);
};

function syncExamRoomBodyClass() {
  const shell = document.getElementById('examShell');
  const lobby = document.getElementById('officialMockLobbyOverlay');
  const inExam = (shell && shell.style.display !== 'none') || (lobby && lobby.style.display !== 'none');
  document.body.classList.toggle('in-active-exam-room', Boolean(inExam));
}

function ensureMockStrictAudioBarInjected() {
  const audioHeader = document.getElementById('listeningAudioHeaderContainer');
  if (audioHeader && !document.getElementById('mockStrictAudioBar')) {
    const strictBar = document.createElement('div');
    strictBar.id = 'mockStrictAudioBar';
    strictBar.innerHTML = `
      <span style="color:#dc2626;">● LIVE AUDIO</span>
      <span id="mockStrictAudioTimeLabel" style="font-family:monospace; color:#334155;">Playing...</span>
      <span style="margin-left:6px;">🔊</span>
      <input type="range" min="0" max="1" step="0.05" value="1" style="width:70px; accent-color:#0f172a; cursor:pointer;"
        title="Chỉnh âm lượng tai nghe" oninput="setGlobalMockVolume(this.value)">
    `;
    audioHeader.appendChild(strictBar);

    const audioEl = document.getElementById('examAudioPlayer');
    if (audioEl) {
      audioEl.addEventListener('timeupdate', () => {
        const lbl = document.getElementById('mockStrictAudioTimeLabel');
        if (lbl && audioEl.duration) {
          const curM = String(Math.floor(audioEl.currentTime / 60)).padStart(2, '0');
          const curS = String(Math.floor(audioEl.currentTime % 60)).padStart(2, '0');
          const totM = String(Math.floor(audioEl.duration / 60)).padStart(2, '0');
          const totS = String(Math.floor(audioEl.duration % 60)).padStart(2, '0');
          lbl.textContent = `${curM}:${curS} / ${totM}:${totS}`;
        }
      });
    }
  }
}

window.setGlobalMockVolume = function(val) {
  const v = parseFloat(val);
  const audioEl = document.getElementById('examAudioPlayer');
  if (audioEl) audioEl.volume = isNaN(v) ? 1 : v;
  const preAudio = document.getElementById('lobbyTestSampleAudio');
  if (preAudio) preAudio.volume = isNaN(v) ? 1 : v;
};

function activateStrictMockListeningAudio() {
  const shell = document.getElementById('examShell');
  if (!shell) return;
  ensureMockStrictAudioBarInjected();

  // Luôn tắt chế độ Practice Pause khi ở trong Mock Test hoặc Exam Mode
  if (typeof currentExecutionMode !== 'undefined' && mockSession.active) {
    currentExecutionMode = 'exam';
    isPracticePaused = false;
  }
  const pauseBtn = document.getElementById('btnPracticePauseToggle');
  if (pauseBtn && (mockSession.active || currentExecutionMode === 'exam')) {
    pauseBtn.style.display = 'none';
  }

  const isStrictListening = (mockSession.active || currentExecutionMode === 'exam') && activeExamType === 'listening' && !isReviewMode;
  if (isStrictListening) {
    shell.classList.add('mock-strict-audio');
    const audioEl = document.getElementById('examAudioPlayer');
    if (audioEl) {
      audioEl.playbackRate = 1.0;
      setTimeout(() => { audioEl.play().catch(() => {}); }, 300);
    }
  } else {
    shell.classList.remove('mock-strict-audio');
  }
}

window.startMockTestFlow = function(title, lExam, rExam, wExam) {
  mockSession = {
    active: true,
    title,
    stage: 0, // 0: Pre-test, 1: Listening, 2: Reading, 3: Writing
    listeningExam: lExam,
    readingExam: rExam,
    writingExam: wExam,
    listeningResult: null,
    readingResult: null,
    writingResult: null,
    breakTimer: null
  };
  window.mockSession = mockSession;
  lobbyStepState = {
    pretestDone: false,
    listeningIntroConfirmed: false,
    slideIndex: 0,
    slideTimer: null
  };
  openOfficialMockLobby();
};

function openOfficialMockLobby() {
  document.getElementById('dashboardApp').style.display = 'none';
  document.getElementById('examShell').style.display = 'none';
  const lobby = document.getElementById('officialMockLobbyOverlay');
  if (lobby) lobby.style.display = 'flex';
  const candLbl = document.getElementById('lobbyCandidateLabel');
  if (candLbl) candLbl.textContent = `Candidate: ${activeUser ? activeUser.name : 'Student'}`;
  const titleLbl = document.getElementById('lobbyMockTitleLabel');
  if (titleLbl) titleLbl.textContent = mockSession.title || 'Official Mock Test';
  syncExamRoomBodyClass();
  renderOfficialMockLobbyCards();
}

window.abortOfficialMockLobby = function() {
  if (!confirm('Bạn có chắc chắn muốn thoát khỏi kỳ thi thử 3 kỹ năng này?')) return;
  clearInterval(lobbyStepState.slideTimer);
  mockSession.active = false;
  document.getElementById('officialMockLobbyOverlay').style.display = 'none';
  document.getElementById('dashboardApp').style.display = 'flex';
  syncExamRoomBodyClass();
};

function renderOfficialMockLobbyCards() {
  clearInterval(lobbyStepState.slideTimer);
  const box = document.getElementById('lobbyAccordionContainer');
  if (!box) return;

  const st = mockSession.stage; // 0: Pre-test, 1: Listening, 2: Reading, 3: Writing

  const pretestCardHtml = `
    <div class="lobby-step-card">
      <div class="lobby-step-header">
        <div>
          <div class="lobby-step-title">Pre-test</div>
          <div class="lobby-step-sub">2 Parts • Sound & Keyboard Check</div>
        </div>
        ${st > 0 ? `<span class="lobby-status-pill completed">✓ Completed</span>` : `<span class="lobby-status-pill">In Progress</span>`}
      </div>
      ${st === 0 ? `
        <div class="lobby-step-body">
          <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:18px; margin-top:12px; border-radius:4px;">
            <div style="font-weight:700; font-size:13.5px; margin-bottom:8px;">Part 1: Put on your headphones and test the sound</div>
            <p style="font-size:12.5px; color:#475569; margin-bottom:12px;">Click the Play button below to check your headphone volume before starting the Listening test.</p>
            <audio id="lobbyTestSampleAudio" controls src="${(mockSession.listeningExam && mockSession.listeningExam.audioUrl) || ''}" style="width:100%; height:34px; margin-bottom:16px;"></audio>
            <div style="font-weight:700; font-size:13.5px; margin-bottom:8px;">Part 2: Keyboard & Input Check (Optional)</div>
            <input type="text" class="form-input" placeholder="Type your name here to test keyboard input..." style="max-width:360px; margin-bottom:16px;">
            <div>
              <button type="button" class="lobby-black-btn" onclick="completeMockPretestStep()">
                Next <i class="fas fa-arrow-right"></i>
              </button>
            </div>
          </div>
        </div>
      ` : ''}
    </div>
  `;

  const listeningCardHtml = `
    <div class="lobby-step-card">
      <div class="lobby-step-header">
        <div>
          <div class="lobby-step-title">Listening — ${(mockSession.listeningExam && mockSession.listeningExam.title) || ''}</div>
          <div class="lobby-step-sub">4 Parts • ~30 minutes</div>
        </div>
        ${st > 1 ? `<span class="lobby-status-pill completed">✓ Completed</span>` : (st === 1 ? `<span class="lobby-status-pill" style="color:#111827; border-color:#111827;">Ready</span>` : `<span class="lobby-status-pill">Not started</span>`)}
      </div>
      ${st === 1 ? `
        <div class="lobby-step-body">
          ${!lobbyStepState.listeningIntroConfirmed ? `
            <div class="inspera-slide-box">
              <div style="position:absolute; top:14px; left:18px; font-weight:900; color:#2563eb; font-size:14px;">IELTS</div>
              <div class="inspera-slide-main-text" id="listeningSlideText">${LISTENING_INTRO_SLIDES[0]}</div>
            </div>
            <div class="inspera-slide-controls">
              <span style="font-size:12px; font-weight:700; color:#1e293b;" id="listeningSlideCounter">Slide 1 / ${LISTENING_INTRO_SLIDES.length}</span>
              <span style="font-size:12px; color:#334155;">🔊 Official Test Instructions</span>
            </div>
            <button type="button" class="lobby-black-btn" onclick="confirmListeningIntroSlide()">
              ✓ Confirm
            </button>
          ` : `
            <div style="margin-top:14px;">
              <button type="button" class="lobby-black-btn" onclick="enterMockListeningRoomNow()">
                Start test
              </button>
            </div>
          `}
        </div>
      ` : ''}
    </div>
  `;

  const readingCardHtml = `
    <div class="lobby-step-card">
      <div class="lobby-step-header">
        <div>
          <div class="lobby-step-title">Reading — ${(mockSession.readingExam && mockSession.readingExam.title) || ''}</div>
          <div class="lobby-step-sub">3 Parts • 60 minutes</div>
        </div>
        ${st > 2 ? `<span class="lobby-status-pill completed">✓ Completed</span>` : (st === 2 ? `<span class="lobby-status-pill" style="color:#111827; border-color:#111827;">Ready</span>` : `<span class="lobby-status-pill">Not started</span>`)}
      </div>
      ${st === 2 ? `
        <div class="lobby-step-body">
          <div class="inspera-slide-box">
            <div style="position:absolute; top:14px; left:18px; font-weight:900; color:#059669; font-size:14px;">IELTS</div>
            <div class="inspera-slide-main-text">
              IELTS Academic Reading<br>
              <span style="font-size:16px; font-weight:500; color:#334155;">You will have <b>60 minutes</b> to complete <b>40 questions</b> across 3 passages.</span>
            </div>
          </div>
          <div style="margin-top:16px;">
            <button type="button" class="lobby-black-btn" onclick="enterMockReadingRoomNow()">
              Start test
            </button>
          </div>
        </div>
      ` : ''}
    </div>
  `;

  const writingCardHtml = `
    <div class="lobby-step-card">
      <div class="lobby-step-header">
        <div>
          <div class="lobby-step-title">Writing — ${(mockSession.writingExam && mockSession.writingExam.title) || ''}</div>
          <div class="lobby-step-sub">2 Parts • 60 minutes</div>
        </div>
        ${st > 3 ? `<span class="lobby-status-pill completed">✓ Completed</span>` : (st === 3 ? `<span class="lobby-status-pill" style="color:#111827; border-color:#111827;">Ready</span>` : `<span class="lobby-status-pill">Not started</span>`)}
      </div>
      ${st === 3 ? `
        <div class="lobby-step-body">
          <div class="inspera-slide-box">
            <div style="position:absolute; top:14px; left:18px; font-weight:900; color:#d97706; font-size:14px;">IELTS</div>
            <div class="inspera-slide-main-text">
              IELTS Academic Writing<br>
              <span style="font-size:16px; font-weight:500; color:#334155;">You will have <b>60 minutes</b> for <b>Task 1</b> (at least 150 words) and <b>Task 2</b> (at least 250 words).</span>
            </div>
          </div>
          <div style="margin-top:16px;">
            <button type="button" class="lobby-black-btn" onclick="enterMockWritingRoomNow()">
              Start test
            </button>
          </div>
        </div>
      ` : ''}
    </div>
  `;

  box.innerHTML = pretestCardHtml + listeningCardHtml + readingCardHtml + writingCardHtml;

  if (st === 1 && !lobbyStepState.listeningIntroConfirmed) {
    lobbyStepState.slideIndex = 0;
    lobbyStepState.slideTimer = setInterval(() => {
      lobbyStepState.slideIndex = (lobbyStepState.slideIndex + 1) % LISTENING_INTRO_SLIDES.length;
      const txtEl = document.getElementById('listeningSlideText');
      const cntEl = document.getElementById('listeningSlideCounter');
      if (txtEl) txtEl.innerHTML = LISTENING_INTRO_SLIDES[lobbyStepState.slideIndex];
      if (cntEl) cntEl.textContent = `Slide ${lobbyStepState.slideIndex + 1} / ${LISTENING_INTRO_SLIDES.length}`;
    }, 2400);
  }
}

window.completeMockPretestStep = function() {
  const sampleAudio = document.getElementById('lobbyTestSampleAudio');
  if (sampleAudio) sampleAudio.pause();
  lobbyStepState.pretestDone = true;
  mockSession.stage = 1;
  renderOfficialMockLobbyCards();
};

window.confirmListeningIntroSlide = function() {
  clearInterval(lobbyStepState.slideTimer);
  lobbyStepState.listeningIntroConfirmed = true;
  renderOfficialMockLobbyCards();
};

window.enterMockListeningRoomNow = function() {
  document.getElementById('officialMockLobbyOverlay').style.display = 'none';
  currentExecutionMode = 'exam';
  isPracticePaused = false;
  if (typeof _coreLaunchListening === 'function') _coreLaunchListening(mockSession.listeningExam.id);
  else launchListeningExam(mockSession.listeningExam.id);
  if (typeof setupExamOrPracticeTimerBar === 'function') setupExamOrPracticeTimerBar();
  activateStrictMockListeningAudio();
  syncExamRoomBodyClass();
};

window.enterMockReadingRoomNow = function() {
  document.getElementById('officialMockLobbyOverlay').style.display = 'none';
  currentExecutionMode = 'exam';
  isPracticePaused = false;
  if (typeof _coreLaunchReading === 'function') _coreLaunchReading(mockSession.readingExam.id);
  else launchExam(mockSession.readingExam.id);
  if (typeof setupExamOrPracticeTimerBar === 'function') setupExamOrPracticeTimerBar();
  activateStrictMockListeningAudio();
  syncExamRoomBodyClass();
};

window.enterMockWritingRoomNow = function() {
  document.getElementById('officialMockLobbyOverlay').style.display = 'none';
  currentExecutionMode = 'exam';
  isPracticePaused = false;
  const tempW = mockSession.writingExam;
  const existsInDb = (db.writingExams || []).some(w => w.id === tempW.id && w.task1?.prompt && w.task2?.prompt);
  if (!existsInDb) {
    activeExam = tempW;
    stopAllAudioPlayers();
    activeExamType = 'writing';
    isReviewMode = false;
    activePartNum = tempW.task1?.prompt ? 1 : 2;
    writingAnswers = { task1: '', task2: '' };
    secondsRemaining = 60 * 60;
    document.getElementById('dashboardApp').style.display = 'none';
    document.getElementById('examShell').style.display = 'flex';
    document.getElementById('insperaExamTitle').textContent = 'IELTS Academic Writing';
    document.getElementById('insperaCandidateTag').textContent = `👤 ${activeUser.name}`;
    document.getElementById('btnSubmitExam').style.display = '';
    document.getElementById('btnSubmitBottom').style.display = '';
    loadWritingWorkspace(activePartNum);
    forceRenderWritingFooterClean();
    setupResizer();
    startTimer();
  } else {
    if (typeof _coreLaunchWriting === 'function') _coreLaunchWriting(tempW.id);
    else launchWritingExam(tempW.id);
  }
  if (typeof setupExamOrPracticeTimerBar === 'function') setupExamOrPracticeTimerBar();
  activateStrictMockListeningAudio();
  syncExamRoomBodyClass();
};

function showFinalMockTrfReport() {
  const lBand = parseFloat(String(mockSession.listeningResult?.band || '0').replace(/[^0-9.]/g, '')) || 0;
  const rBand = parseFloat(String(mockSession.readingResult?.band || '0').replace(/[^0-9.]/g, '')) || 0;
  const wBand = parseFloat(String(mockSession.writingResult?.band || '0').replace(/[^0-9.]/g, '')) || 0;

  const validBands = [lBand, rBand, wBand].filter(b => b > 0);
  const avgOverall = validBands.length
    ? (Math.round((validBands.reduce((a, b) => a + b, 0) / validBands.length) * 2) / 2).toFixed(1)
    : 'Submitted';

  document.getElementById('mockTransitionHeader').textContent = '🏆 KẾT QUẢ TỔNG HỢP FULL MOCK TEST (3 KỸ NĂNG)';
  document.getElementById('mockTransitionBody').innerHTML = `
    <div style="font-size:15px; font-weight:800; color:#1f3d32; margin-bottom:14px;">${mockSession.title}</div>
    <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:10px; margin-bottom:18px;">
      <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:10px; padding:12px;">
        <div style="font-size:11.5px; font-weight:700; color:#1d4ed8;">🎧 LISTENING</div>
        <div style="font-size:22px; font-weight:800; color:#1e3a8a; margin-top:4px;">${lBand ? 'Band ' + lBand : '—'}</div>
        <div style="font-size:11.5px; color:#64748b;">${mockSession.listeningResult?.score || ''}</div>
      </div>
      <div style="background:#ecfdf5; border:1px solid #a7f3d0; border-radius:10px; padding:12px;">
        <div style="font-size:11.5px; font-weight:700; color:#047857;">📖 READING</div>
        <div style="font-size:22px; font-weight:800; color:#064e3b; margin-top:4px;">${rBand ? 'Band ' + rBand : '—'}</div>
        <div style="font-size:11.5px; color:#64748b;">${mockSession.readingResult?.score || ''}</div>
      </div>
      <div style="background:#fffbeb; border:1px solid #fde68a; border-radius:10px; padding:12px;">
        <div style="font-size:11.5px; font-weight:700; color:#b45309;">✍️ WRITING</div>
        <div style="font-size:22px; font-weight:800; color:#78350f; margin-top:4px;">${wBand ? 'Band ' + wBand : 'Submitted'}</div>
        <div style="font-size:11.5px; color:#64748b;">${mockSession.writingResult?.score || ''}</div>
      </div>
    </div>
    <div style="background:#1f3d32; color:#ffffff; border-radius:12px; padding:16px;">
      <div style="font-size:12px; text-transform:uppercase; letter-spacing:1px; color:#a7f3d0;">Estimated Overall Band (L-R-W)</div>
      <div style="font-size:36px; font-weight:800; margin-top:4px;">Band ${avgOverall}</div>
    </div>
  `;
  document.getElementById('mockTransitionFooter').innerHTML = `
    <button type="button" class="btn btn-emerald" style="padding:10px 24px;" onclick="closeModal('mockTransitionModal'); renderDashboard();">
      🏠 Hoàn Tất & Về Trang Chủ
    </button>
  `;
  openModal('mockTransitionModal');
}

// Bọc hàm submitExam để hỗ trợ cả thi lẻ (hiện Popup báo điểm chuẩn) lẫn thi Mock Test 3 kỹ năng (chuyển qua Cổng chờ 4 bước & gộp 1 dòng kết quả)
const _v11BaseSubmitExam = window.submitExam;
window.submitExam = async function(forceSubmit = false) {
  if (!mockSession.active) {
    return _v11BaseSubmitExam(forceSubmit);
  }
  const skillName = mockSession.stage === 1 ? 'LISTENING' : (mockSession.stage === 2 ? 'READING' : 'WRITING');
  if (!forceSubmit && !confirm(`Hoàn thành phần thi ${skillName} (Finish section) và chuyển sang bước tiếp theo?`)) {
    return;
  }

  await _v11BaseSubmitExam(true);
  closeModal('scoreSummaryModal');
  closeModal('gradeWritingModal');
  closeModal('studentViewWritingModal');

  const latestRes = (db.results && db.results.length) ? db.results[db.results.length - 1] : null;

  if (mockSession.stage === 1) {
    mockSession.listeningResult = latestRes;
    mockSession.stage = 2;
    openOfficialMockLobby();
    return;
  }

  if (mockSession.stage === 2) {
    mockSession.readingResult = latestRes;
    mockSession.stage = 3;
    openOfficialMockLobby();
    return;
  }

  if (mockSession.stage === 3) {
    mockSession.writingResult = latestRes;
    mockSession.active = false;
    document.getElementById('officialMockLobbyOverlay').style.display = 'none';
    document.getElementById('examShell').classList.remove('mock-strict-audio');
    syncExamRoomBodyClass();
    showFinalMockTrfReport();
  }
};
window.finishExam = window.submitExam;

function renderMockTestTab() {
  ensureMockSetsInitialized();
  const pane = document.getElementById('tab-mocktest');
  if (!pane || !activeUser) return;
  const isTeacher = activeUser.role === 'teacher';

  const visibleSets = (db.mockSets || []).filter(s => {
    if (isTeacher) return true;
    return !s.classId || s.classId === 'ALL' || s.classId === activeUser.classId;
  });

  pane.innerHTML = `
    <div class="card" style="background:linear-gradient(135deg, #1f3d32 0%, #064e3b 100%); color:#ffffff; border:none;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
        <div>
          <div style="font-size:20px; font-weight:800; margin-bottom:6px;">🎓 Phòng Thi Thử IELTS 3 Kỹ Năng Liên Hoàn (Full Mock Test)</div>
          <div style="font-size:13.5px; color:#d1fae5; max-width:740px; line-height:1.55;">
            Trải nghiệm 100% quy trình thi thật trên máy tính (Inspera): <b>Pre-test Sound Check ➔ Listening (30p) ➔ Reading (60p) ➔ Writing (60p)</b>. Chỉ bốc các bộ đề Full Test và tự động chia đề không trùng lặp.
          </div>
        </div>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button class="btn" style="background:#f59e0b; color:#fff; font-weight:800; padding:11px 18px;" onclick="startRandomFullMockTest()">
            ⚡ Thi Thử Ngẫu Nhiên 3 Kỹ Năng Ngay
          </button>
          ${isTeacher ? `
            <button class="btn" style="background:#ffffff; color:#064e3b; font-weight:800; padding:11px 18px;" onclick="openCreateMockSetModal()">
              ➕ Tạo Bộ Đề Mock Test Giao Lớp
            </button>
          ` : ''}
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">
        <span>📋 Danh Sách Đợt Thi Thử / Bộ Đề 3 Kỹ Năng Đã Giao</span>
      </div>
      ${!visibleSets.length ? `
        <div style="text-align:center; padding:32px; color:#64748b;">
          Hiện chưa có bộ đề cố định nào được tạo. Bạn có thể bấm nút <b>"⚡ Thi Thử Ngẫu Nhiên 3 Kỹ Năng Ngay"</b> ở trên để hệ thống tự chọn bộ đề Full Test!
        </div>
      ` : `
        <table>
          <thead>
            <tr>
              <th>Tên Đợt Thi Thử</th>
              <th>1. Listening</th>
              <th>2. Reading</th>
              <th>3. Writing</th>
              <th>Lớp Nhận Đề</th>
              <th>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            ${visibleSets.map(ms => {
              const clsName = (!ms.classId || ms.classId === 'ALL')
                ? 'Tất cả các lớp'
                : ((db.classes || []).find(c => c.id === ms.classId)?.name || 'Lớp học');
              return `
                <tr>
                  <td><b style="color:#0f172a; font-size:14px;">🎓 ${ms.title}</b></td>
                  <td style="font-size:12.5px; color:#1d4ed8;">🎧 ${ms.listeningTitle || 'Listening'}</td>
                  <td style="font-size:12.5px; color:#047857;">📖 ${ms.readingTitle || 'Reading'}</td>
                  <td style="font-size:12.5px; color:#b45309;">✍️ ${ms.writingTitle || 'Writing'}</td>
                  <td><span style="background:#f1f5f9; padding:3px 10px; border-radius:99px; font-size:12px; font-weight:700;">${clsName}</span></td>
                  <td style="display:flex; gap:6px;">
                    <button class="btn btn-emerald" onclick="startAssignedMockSet('${ms.id}')">▶️ Vào Phòng Thi</button>
                    ${isTeacher ? `<button class="btn btn-danger" onclick="deleteMockSet('${ms.id}')">Xóa</button>` : ''}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `}
    </div>
  `;
}

window.openCreateMockSetModal = function() {
  const clsSel = document.getElementById('mockSetClassSelect');
  if (clsSel) {
    clsSel.innerHTML = `<option value="ALL">🏫 Tất cả các lớp (Public)</option>` +
      (db.classes || []).map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  }
  const lSel = document.getElementById('mockSetListeningSelect');
  if (lSel) {
    lSel.innerHTML = (db.listeningExams || []).map(e => `<option value="${e.id}">${e.title}</option>`).join('');
  }
  const rSel = document.getElementById('mockSetReadingSelect');
  if (rSel) {
    rSel.innerHTML = (db.readingExams || []).map(e => `<option value="${e.id}">${e.title}</option>`).join('');
  }
  const w1Sel = document.getElementById('mockSetWritingT1Select');
  const w2Sel = document.getElementById('mockSetWritingT2Select');
  if (w1Sel && w2Sel) {
    const wOpts = (db.writingExams || []).map(w => `<option value="${w.id}">${w.title}</option>`).join('');
    w1Sel.innerHTML = wOpts;
    w2Sel.innerHTML = `<option value="">-- Đề 3A đã có đủ cả Task 1 & 2 --</option>` + wOpts;
  }
  document.getElementById('mockSetTitleInput').value = '';
  openModal('createMockSetModal');
};

window.saveCustomMockSet = async function() {
  const title = document.getElementById('mockSetTitleInput').value.trim();
  const classId = document.getElementById('mockSetClassSelect').value;
  const lId = document.getElementById('mockSetListeningSelect').value;
  const rId = document.getElementById('mockSetReadingSelect').value;
  const w1Id = document.getElementById('mockSetWritingT1Select').value;
  const w2Id = document.getElementById('mockSetWritingT2Select').value;

  if (!title || !lId || !rId || !w1Id) {
    return alert('Vui lòng nhập Tên bộ đề và chọn đủ 3 kỹ năng!');
  }

  const lEx = (db.listeningExams || []).find(e => e.id === lId);
  const rEx = (db.readingExams || []).find(e => e.id === rId);
  const w1Ex = (db.writingExams || []).find(e => e.id === w1Id);
  const w2Ex = w2Id ? (db.writingExams || []).find(e => e.id === w2Id) : null;

  const newSet = {
    id: 'mockset_' + Date.now(),
    title,
    classId,
    listeningId: lId,
    listeningTitle: lEx ? lEx.title : '',
    readingId: rId,
    readingTitle: rEx ? rEx.title : '',
    writingT1Id: w1Id,
    writingT2Id: w2Id || '',
    writingTitle: w2Ex ? `${w1Ex?.title || 'Task 1'} + ${w2Ex.title}` : (w1Ex?.title || 'Writing'),
    createdAt: Date.now()
  };

  if (!db.mockSets) db.mockSets = [];
  db.mockSets.unshift(newSet);

  const fs = (typeof getActiveFirestore === 'function') ? getActiveFirestore() : CLOUD_DB;
  if (fs) {
    try { await fs.collection('suite_mockSets').doc(newSet.id).set(newSet); } catch (e) {}
  }
  await persist();
  closeModal('createMockSetModal');
  renderMockTestTab();
  alert('✅ Đã tạo và giao Bộ đề thi thử 3 kỹ năng thành công!');
};

window.deleteMockSet = async function(id) {
  if (!confirm('Xóa bộ đề thi thử này?')) return;
  db.mockSets = (db.mockSets || []).filter(x => x.id !== id);
  const fs = (typeof getActiveFirestore === 'function') ? getActiveFirestore() : CLOUD_DB;
  if (fs) {
    try { await fs.collection('suite_mockSets').doc(id).delete(); } catch (e) {}
  }
  await persist();
  renderMockTestTab();
};

/* === MODULE 35: INSPERA AUTHENTIC HIGHLIGHT & NOTE ENGINE (GIỮ NGUYÊN 100% KHI CHUYỂN PART CHO CẢ LISTENING & READING) === */
(function() {
  window.setupInExamHighlightEngine = function() {};
  window.applyUserHighlight = function() {};
  window.removeUserHighlight = function() {};

  const popup = document.getElementById('insperaHlPopup');
  const noteCard = document.getElementById('insperaNoteCard');
  const noteInput = document.getElementById('insperaNoteTextarea');
  const noteSaveBtn = document.getElementById('insperaNoteSaveBtn');
  const noteDeleteBtn = document.getElementById('insperaNoteDeleteBtn');
  const noteCloseBtn = document.getElementById('insperaNoteCloseBtn');
  if (!popup || !noteCard) return;

  let savedRange = null;
  let activeHlGroupId = null;
  let notesStore = {};
  let partDomSnapshots = {}; // { "<examId>_part_<num>_left": html, "<examId>_part_<num>_right": html }

  const ICON_NOTE = `<svg viewBox="0 0 24 24"><path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/></svg>`;
  const ICON_MARKER = `<svg viewBox="0 0 24 24"><path d="M18.5 1.15c-.53 0-1.04.19-1.43.58l-5.81 5.82 5.65 5.65 5.82-5.81c.77-.78.77-2.04 0-2.83l-2.84-2.83c-.39-.39-.89-.58-1.39-.58zM10.3 8.5L4 14.8V19h4.2l6.3-6.3-4.2-4.2zM3 21v2h18v-2H3z"/></svg>`;
  const ICON_CLEAR = `<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>`;

  function getCurrentPartStorageKey() {
    if (typeof activeExam === 'undefined' || !activeExam) return null;
    return `${activeExam.id}_part_${typeof activePartNum !== 'undefined' ? activePartNum : 1}`;
  }

  // SỬA TRIỆT ĐỂ: Lưu vết Highlight cho CẢ cột trái (Reading) VÀ cột phải (Listening + Câu hỏi Reading)
  function savePartHighlightSnapshot() {
    if ((typeof isReviewMode !== 'undefined' && isReviewMode) || activeExamType === 'writing') return;
    const key = getCurrentPartStorageKey();
    if (!key) return;

    const leftPane = document.getElementById('insperaLeftPane');
    if (leftPane) {
      const contentEl = leftPane.querySelector('.passage-content') || leftPane;
      partDomSnapshots[key + '_left'] = contentEl.innerHTML;
    }

    const rightPane = document.getElementById('insperaRightPane');
    if (rightPane) {
      // Đồng bộ trạng thái các ô input/radio/checkbox trước khi chụp HTML của cột phải
      rightPane.querySelectorAll('input[type="text"]').forEach(inp => {
        inp.setAttribute('value', inp.value);
      });
      rightPane.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(box => {
        if (box.checked) box.setAttribute('checked', 'checked');
        else box.removeAttribute('checked');
      });
      rightPane.querySelectorAll('select').forEach(sel => {
        Array.from(sel.options).forEach(opt => {
          if (opt.value === sel.value) opt.setAttribute('selected', 'selected');
          else opt.removeAttribute('selected');
        });
      });
      partDomSnapshots[key + '_right'] = rightPane.innerHTML;
    }
  }

  function restorePartHighlightSnapshot() {
    if ((typeof isReviewMode !== 'undefined' && isReviewMode) || activeExamType === 'writing') return;
    const key = getCurrentPartStorageKey();
    if (!key) return;

    const leftPane = document.getElementById('insperaLeftPane');
    const savedLeft = partDomSnapshots[key + '_left'];
    if (leftPane && savedLeft && savedLeft.includes('inspera-hl-mark')) {
      const contentEl = leftPane.querySelector('.passage-content') || leftPane;
      contentEl.innerHTML = savedLeft;
    }

    const rightPane = document.getElementById('insperaRightPane');
    const savedRight = partDomSnapshots[key + '_right'];
    if (rightPane && savedRight && savedRight.includes('inspera-hl-mark')) {
      rightPane.innerHTML = savedRight;
    }

    if ((savedLeft && savedLeft.includes('inspera-hl-mark')) || (savedRight && savedRight.includes('inspera-hl-mark'))) {
      const splitBox = document.getElementById('insperaSplitBox');
      if (typeof bindInputListeners === 'function') bindInputListeners(splitBox);
      if (typeof setupDragDropEngine === 'function') setupDragDropEngine();
      if (typeof restoreUserAnswersInDOM === 'function') restoreUserAnswersInDOM(splitBox);
      if (typeof injectInsperaBookmarkButtons === 'function') injectInsperaBookmarkButtons();
    }
  }

  function hidePopup() { popup.style.display = 'none'; }
  function hideNoteCard() { noteCard.style.display = 'none'; }

  function positionPopupAtRect(rect) {
    popup.style.display = 'flex';
    const popRect = popup.getBoundingClientRect();
    let left = rect.left + (rect.width / 2) - (popRect.width / 2);
    left = Math.max(10, Math.min(window.innerWidth - popRect.width - 10, left));
    let top = rect.bottom + 8;
    if (top + popRect.height > window.innerHeight - 10) {
      top = Math.max(10, rect.top - popRect.height - 8);
    }
    const arrowOffset = Math.max(14, Math.min(popRect.width - 14, (rect.left + rect.width / 2) - left));
    popup.style.setProperty('--arrow-left', `${arrowOffset}px`);
    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;
  }

  function highlightRangeWithGroupId(range, groupId, isNote = false) {
    if (!range || range.collapsed) return null;
    const root = range.commonAncestorContainer.nodeType === 1
      ? range.commonAncestorContainer
      : range.commonAncestorContainer.parentNode;

    const textNodes = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function(node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        if (!range.intersectsNode(node)) return NodeFilter.FILTER_REJECT;
        const p = node.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        if (p.closest('input, textarea, select, button, .drop-zone, .drag-item, .q-badge, .answer-indicator, #insperaHlPopup, #insperaNoteCard')) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    let current;
    while ((current = walker.nextNode())) textNodes.push(current);
    if (textNodes.length === 0 && range.startContainer.nodeType === 3) {
      textNodes.push(range.startContainer);
    }

    let firstCreatedMark = null;
    textNodes.forEach(node => {
      const isStart = (node === range.startContainer);
      const isEnd = (node === range.endContainer);
      const startOff = isStart ? range.startOffset : 0;
      const endOff = isEnd ? range.endOffset : node.nodeValue.length;
      if (startOff >= endOff) return;

      const existingMark = node.parentElement && node.parentElement.closest('mark.inspera-hl-mark');
      if (existingMark && startOff === 0 && endOff === node.nodeValue.length) {
        existingMark.setAttribute('data-hl-id', groupId);
        if (isNote) existingMark.classList.add('has-note');
        if (!firstCreatedMark) firstCreatedMark = existingMark;
        return;
      }

      let targetNode = node;
      if (endOff < targetNode.nodeValue.length) targetNode.splitText(endOff);
      if (startOff > 0) targetNode = targetNode.splitText(startOff);

      const mark = document.createElement('mark');
      mark.className = 'inspera-hl-mark' + (isNote ? ' has-note' : '');
      mark.setAttribute('data-hl-id', groupId);
      targetNode.parentNode.insertBefore(mark, targetNode);
      mark.appendChild(targetNode);
      if (!firstCreatedMark) firstCreatedMark = mark;
    });

    window.getSelection().removeAllRanges();
    savePartHighlightSnapshot();
    return firstCreatedMark;
  }

  function removeSingleHighlightGroup(groupId) {
    if (!groupId) return;
    const workspace = document.getElementById('insperaSplitBox');
    if (!workspace) return;
    workspace.querySelectorAll(`mark.inspera-hl-mark[data-hl-id="${groupId}"]`).forEach(mark => {
      const parent = mark.parentNode;
      while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
      parent.removeChild(mark);
      parent.normalize();
    });
    delete notesStore[groupId];
    savePartHighlightSnapshot();
  }

  function removeAllHighlightsInWorkspace() {
    const workspace = document.getElementById('insperaSplitBox');
    if (!workspace) return;
    workspace.querySelectorAll('mark.inspera-hl-mark').forEach(mark => {
      const id = mark.getAttribute('data-hl-id');
      if (id) delete notesStore[id];
      const parent = mark.parentNode;
      while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
      parent.removeChild(mark);
      parent.normalize();
    });
    savePartHighlightSnapshot();
  }

  function openNoteCardForGroup(groupId, anchorEl) {
    activeHlGroupId = groupId;
    hidePopup();
    noteInput.value = notesStore[groupId] || '';
    noteDeleteBtn.style.display = notesStore[groupId] ? 'inline-block' : 'none';
    noteCard.style.display = 'block';

    if (anchorEl) {
      const rect = anchorEl.getBoundingClientRect();
      let left = rect.left + (rect.width / 2) - 135;
      left = Math.max(12, Math.min(window.innerWidth - 282, left));
      let top = rect.bottom + 10;
      if (top + 165 > window.innerHeight - 12) top = Math.max(12, rect.top - 170);
      noteCard.style.left = `${left}px`;
      noteCard.style.top = `${top}px`;
    }
    setTimeout(() => noteInput.focus(), 20);
  }

  function showCreationPopup(rect) {
    const workspace = document.getElementById('insperaSplitBox');
    const anyExistingMarks = workspace && workspace.querySelector('mark.inspera-hl-mark');

    let clickedInsideMark = null;
    if (savedRange) {
      const startEl = savedRange.startContainer.nodeType === 1 ? savedRange.startContainer : savedRange.startContainer.parentElement;
      clickedInsideMark = startEl ? startEl.closest('mark.inspera-hl-mark') : null;
    }

    popup.innerHTML = `
      <button type="button" class="inspera-pop-btn" id="insperaBtnNote">${ICON_NOTE}<span>Note</span></button>
      <div class="inspera-pop-divider"></div>
      <button type="button" class="inspera-pop-btn" id="insperaBtnHighlight">${ICON_MARKER}<span>Highlight</span></button>
      ${clickedInsideMark ? `<div class="inspera-pop-divider"></div><button type="button" class="inspera-pop-btn" id="insperaBtnClearSingle">${ICON_CLEAR}<span>Clear</span></button>` : ''}
      ${anyExistingMarks ? `<div class="inspera-pop-divider"></div><button type="button" class="inspera-pop-btn" id="insperaBtnClearAll">${ICON_CLEAR}<span>Clear all</span></button>` : ''}
    `;

    positionPopupAtRect(rect);

    document.getElementById('insperaBtnHighlight').onclick = function(e) {
      e.stopPropagation();
      if (!savedRange) return;
      const newId = 'hl_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      highlightRangeWithGroupId(savedRange, newId, false);
      savedRange = null;
      hidePopup();
    };

    document.getElementById('insperaBtnNote').onclick = function(e) {
      e.stopPropagation();
      if (!savedRange) return;
      const existingId = clickedInsideMark ? clickedInsideMark.getAttribute('data-hl-id') : null;
      const groupId = existingId || ('hl_' + Date.now() + '_' + Math.floor(Math.random() * 1000));
      const markEl = highlightRangeWithGroupId(savedRange, groupId, true) || clickedInsideMark;
      savedRange = null;
      openNoteCardForGroup(groupId, markEl);
    };

    const btnClearSingle = document.getElementById('insperaBtnClearSingle');
    if (btnClearSingle && clickedInsideMark) {
      btnClearSingle.onclick = function(e) {
        e.stopPropagation();
        removeSingleHighlightGroup(clickedInsideMark.getAttribute('data-hl-id'));
        savedRange = null;
        hidePopup();
      };
    }

    const btnClearAll = document.getElementById('insperaBtnClearAll');
    if (btnClearAll) {
      btnClearAll.onclick = function(e) {
        e.stopPropagation();
        removeAllHighlightsInWorkspace();
        savedRange = null;
        hidePopup();
      };
    }
  }

  function showExistingMarkPopup(markEl) {
    const groupId = markEl.getAttribute('data-hl-id');
    if (!groupId) return;
    popup.innerHTML = `
      <button type="button" class="inspera-pop-btn" id="insperaBtnEditNote">${ICON_NOTE}<span>Note</span></button>
      <div class="inspera-pop-divider"></div>
      <button type="button" class="inspera-pop-btn" id="insperaBtnClearOne">${ICON_CLEAR}<span>Clear</span></button>
      <div class="inspera-pop-divider"></div>
      <button type="button" class="inspera-pop-btn" id="insperaBtnClearAll">${ICON_CLEAR}<span>Clear all</span></button>
    `;
    positionPopupAtRect(markEl.getBoundingClientRect());

    document.getElementById('insperaBtnEditNote').onclick = function(e) {
      e.stopPropagation();
      openNoteCardForGroup(groupId, markEl);
    };
    document.getElementById('insperaBtnClearOne').onclick = function(e) {
      e.stopPropagation();
      removeSingleHighlightGroup(groupId);
      hidePopup();
    };
    document.getElementById('insperaBtnClearAll').onclick = function(e) {
      e.stopPropagation();
      removeAllHighlightsInWorkspace();
      hidePopup();
    };
  }

  noteSaveBtn.onclick = function() {
    if (!activeHlGroupId) return;
    const val = noteInput.value.trim();
    const workspace = document.getElementById('insperaSplitBox');
    if (val) {
      notesStore[activeHlGroupId] = val;
      if (workspace) {
        workspace.querySelectorAll(`mark.inspera-hl-mark[data-hl-id="${activeHlGroupId}"]`).forEach(m => {
          m.classList.add('has-note');
          m.title = `💬 Note: ${val}`;
        });
      }
    } else {
      delete notesStore[activeHlGroupId];
      if (workspace) {
        workspace.querySelectorAll(`mark.inspera-hl-mark[data-hl-id="${activeHlGroupId}"]`).forEach(m => {
          m.classList.remove('has-note');
          m.removeAttribute('title');
        });
      }
    }
    savePartHighlightSnapshot();
    hideNoteCard();
  };

  noteDeleteBtn.onclick = function() {
    if (!activeHlGroupId) return;
    removeSingleHighlightGroup(activeHlGroupId);
    hideNoteCard();
  };

  noteCloseBtn.onclick = function() {
    if (activeHlGroupId && !notesStore[activeHlGroupId]) {
      const workspace = document.getElementById('insperaSplitBox');
      const marks = workspace ? workspace.querySelectorAll(`mark.inspera-hl-mark.has-note[data-hl-id="${activeHlGroupId}"]`) : [];
      if (marks.length) removeSingleHighlightGroup(activeHlGroupId);
    }
    hideNoteCard();
  };

  document.addEventListener('mouseup', function(e) {
    if (popup.contains(e.target) || noteCard.contains(e.target)) return;
    const workspace = document.getElementById('insperaSplitBox');
    if (!workspace || !workspace.contains(e.target)) {
      hidePopup();
      return;
    }
    if (e.target.closest('input, textarea, select, button, .drop-zone, .drag-item')) {
      hidePopup();
      return;
    }
    setTimeout(() => {
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed && sel.toString().trim().length > 0) {
        const range = sel.getRangeAt(0);
        if (!workspace.contains(range.commonAncestorContainer)) return;
        savedRange = range.cloneRange();
        hideNoteCard();
        showCreationPopup(range.getBoundingClientRect());
      } else {
        const clickedMark = e.target.closest('mark.inspera-hl-mark');
        if (clickedMark) {
          savedRange = null;
          showExistingMarkPopup(clickedMark);
        } else {
          hidePopup();
        }
      }
    }, 15);
  });

  document.addEventListener('mousedown', function(e) {
    if (!popup.contains(e.target) && !e.target.closest('mark.inspera-hl-mark')) hidePopup();
    if (!noteCard.contains(e.target) && !popup.contains(e.target) && !e.target.closest('mark.inspera-hl-mark')) hideNoteCard();
  });

  // Kết nối vào chu trình chuyển Part và tải Passage
  const _hlOrigLoadPassageView = window.loadPassageView;
  window.loadPassageView = function(partNum) {
    _hlOrigLoadPassageView(partNum);
    transformListeningMapToSplitColumns();
    injectInsperaBookmarkButtons();
    restorePartHighlightSnapshot();
  };

  const _hlOrigSwitchPassage = window.switchExamPassage;
  window.switchExamPassage = function(partNum) {
    savePartHighlightSnapshot();
    hidePopup();
    hideNoteCard();
    _hlOrigSwitchPassage(partNum);
    const groups = getQuestionsGroupedByPart();
    if (groups[partNum] && groups[partNum][0]) {
      currentFocusedQuestionKey = groups[partNum][0];
    }
    buildFooterNav();
  };
})();

/* === MODULE 36: SẮP XẾP THỨ TỰ KHUNG GIẢI THÍCH TRONG REVIEW MODE (Q1 -> Q40) === */
(function() {
  function getQuestionNumFromKey(keyStr) {
    return parseInt(String(keyStr || '').replace(/\D/g, ''), 10) || 0;
  }
  function sortReviewIndicatorsInScope(scope) {
    if (!scope) return;
    const parents = new Set();
    scope.querySelectorAll('.answer-indicator[data-ind]').forEach(ind => {
      if (ind.parentElement) parents.add(ind.parentElement);
    });
    parents.forEach(parent => {
      const directIndicators = Array.from(parent.children).filter(
        el => el.classList && el.classList.contains('answer-indicator') && el.hasAttribute('data-ind')
      );
      if (directIndicators.length > 1) {
        directIndicators.sort((a, b) => getQuestionNumFromKey(a.getAttribute('data-ind')) - getQuestionNumFromKey(b.getAttribute('data-ind')));
        directIndicators.forEach(ind => parent.appendChild(ind));
      }
    });
  }

  const _origShowReviewAnswersForSort = window.showReviewAnswersInDOM;
  window.showReviewAnswersInDOM = function(scope) {
    _origShowReviewAnswersForSort(scope);
    sortReviewIndicatorsInScope(scope || document.getElementById('insperaSplitBox'));
  };
})();

/* === MODULE 38: PERSONAL DASHBOARD (HỒ SƠ HỌC TẬP), GIAO BÀI TẬP VỀ NHÀ & REVIEW FOOTER === */
(function() {
  function ensureV3Collections() {
    if (typeof db === 'undefined') return;
    if (!Array.isArray(db.homeworkAssignments)) db.homeworkAssignments = [];
    if (!db.userStudyGoals || typeof db.userStudyGoals !== 'object') db.userStudyGoals = {};
  }

  function applyReviewColoringToCurrentFooter() {
    if (typeof isReviewMode === 'undefined' || !isReviewMode || !activeExam || activeExamType === 'writing') return;
    const footerList = document.getElementById('insperaFooterList');
    if (!footerList) return;
    const keys = Object.keys(activeExam.correctAnswers || {});
    keys.forEach(function(k) {
      const btn = document.getElementById('fpill_' + k);
      if (!btn) return;
      btn.classList.remove('answered', 'correct', 'incorrect', 'review-correct', 'review-incorrect', 'review-unanswered');
      const hasAns = Boolean(userAnswers && userAnswers[k] && String(userAnswers[k]).trim() !== '');
      if (!hasAns) btn.classList.add('review-unanswered');
      else if (typeof isAnswerCorrect === 'function' && isAnswerCorrect(k)) btn.classList.add('review-correct');
      else btn.classList.add('review-incorrect');
    });
  }

  const _origEnterReviewV3 = window.enterReviewModeFromSummary;
  window.enterReviewModeFromSummary = function() {
    if (typeof _origEnterReviewV3 === 'function') _origEnterReviewV3();
    setTimeout(applyReviewColoringToCurrentFooter, 60);
  };

  function injectPersonalDashboardTabAndPane() {
    const tabsBar = document.querySelector('.dash-tabs');
    if (!tabsBar) return;

    if (!document.getElementById('tabbtn-mydashboard')) {
      const homeBtn = document.getElementById('tabbtn-home');
      const pdBtn = document.createElement('button');
      pdBtn.className = 'dash-tab-btn';
      pdBtn.id = 'tabbtn-mydashboard';
      pdBtn.innerHTML = '🎓 Personal Dashboard';
      pdBtn.onclick = function() { switchDashTab('mydashboard'); };
      if (homeBtn && homeBtn.nextSibling) tabsBar.insertBefore(pdBtn, homeBtn.nextSibling);
      else tabsBar.appendChild(pdBtn);
    }

    if (!document.getElementById('btnOpenAssignHwHeader')) {
      const hwBtn = document.createElement('button');
      hwBtn.className = 'dash-tab-btn teacher-item';
      hwBtn.id = 'btnOpenAssignHwHeader';
      hwBtn.style.cssText = 'color:#1d4ed8; background:#eff6ff; border:1px solid #bfdbfe; margin-left:auto;';
      hwBtn.innerHTML = '📋 + Giao bài tập';
      hwBtn.onclick = function() { openCreateHomeworkModal(); };
      tabsBar.appendChild(hwBtn);
    }

    const dashBody = document.querySelector('.dash-body');
    if (dashBody && !document.getElementById('tab-mydashboard')) {
      const pane = document.createElement('div');
      pane.id = 'tab-mydashboard';
      pane.className = 'dash-pane';
      pane.style.display = 'none';
      pane.innerHTML = `
        <div class="card">
          <div class="card-title">
            <span>🎯 Hồ Sơ Học Tập & Mục Tiêu Cá Nhân</span>
            <button class="btn btn-secondary" onclick="promptUpdateStudyGoals()">⚙️ Chỉnh mục tiêu & Ngày thi</button>
          </div>
          <div class="pd-top-grid" id="pdTopMetricsGrid"></div>
        </div>
        <div class="pd-comp-grid">
          <div class="card" style="margin-bottom:0;">
            <div class="card-title"><span>📊 Đánh Giá Năng Lực Hiện Tại</span></div>
            <div class="pd-band-box" id="pdCompetencyBandsBox"></div>
          </div>
          <div class="card" style="margin-bottom:0;">
            <div class="card-title"><span>⏱️ Hoạt Động Học Trong Tuần (7 ngày)</span></div>
            <div id="pdWeeklyChartContainer"></div>
          </div>
          <div class="card" style="margin-bottom:0;">
            <div class="card-title">
              <span>📅 Lịch Học Theo Tháng (Heatmap)</span>
              <span id="pdHeatmapMonthLabel" style="font-size:12px; color:#059669; font-weight:800;"></span>
            </div>
            <div class="pd-heatmap-grid" id="pdMonthlyHeatmapGrid"></div>
          </div>
        </div>
        <div class="card">
          <div class="card-title"><span>📚 Lịch Sử Bài Đã Làm</span></div>
          <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px;" id="pdHistoryTypePills">
            <button type="button" class="asg-tab-btn active" data-pdtype="all" onclick="setPdHistoryType('all')">Tất cả</button>
            <button type="button" class="asg-tab-btn" data-pdtype="single" onclick="setPdHistoryType('single')">Thi 1 kỹ năng</button>
            <button type="button" class="asg-tab-btn" data-pdtype="practice" onclick="setPdHistoryType('practice')">Luyện tập</button>
            <button type="button" class="asg-tab-btn" data-pdtype="vocab" onclick="setPdHistoryType('vocab')">Từ vựng / Chính tả</button>
            <button type="button" class="asg-tab-btn" data-pdtype="full" onclick="setPdHistoryType('full')">Thi thật (Full Test)</button>
          </div>
          <div style="display:grid; grid-template-columns: 1.6fr 1fr 1fr 1fr auto; gap:10px; margin-bottom:16px; background:#f8fafc; padding:12px; border-radius:12px; border:1px solid #e2e8f0;">
            <input type="text" id="pdFilterKeyword" class="form-input" placeholder="🔍 Tìm kiếm theo tên đề thi..." oninput="renderPdHistoryTable()">
            <select id="pdFilterSkill" class="form-input" onchange="renderPdHistoryTable()">
              <option value="all">🎯 Tất cả kỹ năng</option>
              <option value="reading">📖 Reading</option>
              <option value="listening">🎧 Listening</option>
              <option value="writing">✍️ Writing</option>
              <option value="quiz">⭐ Vocab Quiz</option>
            </select>
            <input type="date" id="pdFilterDateFrom" class="form-input" onchange="renderPdHistoryTable()" title="Từ ngày">
            <input type="date" id="pdFilterDateTo" class="form-input" onchange="renderPdHistoryTable()" title="Đến ngày">
            <button type="button" class="btn btn-secondary" onclick="resetPdHistoryFilters()">Xóa lọc</button>
          </div>
          <table>
            <thead>
              <tr>
                <th>Tên Bài Thi / Bài Tập</th>
                <th>Kỹ Năng</th>
                <th>Tỷ Lệ Đúng</th>
                <th>Band Score</th>
                <th>Thời Gian Nộp</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody id="pdHistoryTbody"></tbody>
          </table>
        </div>
      `;
      dashBody.appendChild(pane);
    }
  }

  function getUserGoalProfile() {
    ensureV3Collections();
    const uname = activeUser ? activeUser.username : 'guest';
    const saved = db.userStudyGoals[uname] || {};
    return {
      targetBand: saved.targetBand || '7.5',
      targetDays: Number(saved.targetDays) || 30,
      examDate: saved.examDate || '2026-12-31'
    };
  }

  window.promptUpdateStudyGoals = function() {
    if (!activeUser) return;
    const cur = getUserGoalProfile();
    const newBand = prompt('Nhập Band điểm mục tiêu của bạn (VD: 7.0, 7.5, 8.0):', cur.targetBand);
    if (newBand === null) return;
    const newDays = prompt('Nhập mục tiêu tổng số ngày cần học (VD: 30, 60, 90):', cur.targetDays);
    if (newDays === null) return;
    const newDate = prompt('Nhập ngày thi IELTS dự kiến (Định dạng YYYY-MM-DD):', cur.examDate);
    if (newDate === null) return;

    ensureV3Collections();
    db.userStudyGoals[activeUser.username] = {
      targetBand: newBand.trim() || '7.5',
      targetDays: Number(newDays) || 30,
      examDate: newDate.trim() || '2026-12-31'
    };
    if (typeof persist === 'function') persist();
    renderMyLearningDashboard();
  };

  function getResultIsoDate(r) {
    if (r.isoDate) return r.isoDate;
    const m = String(r.id || '').match(/(\d{13})/);
    if (m) {
      const d = new Date(Number(m[1]));
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
    return '';
  }

  function calculateUserStreakAndDays(userResults) {
    const dateSet = new Set();
    userResults.forEach(function(r) {
      const iso = getResultIsoDate(r);
      if (iso) dateSet.add(iso);
    });
    const totalStudyDays = dateSet.size;
    let streak = 0;
    const cur = new Date();
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(cur);
      checkDate.setDate(cur.getDate() - i);
      const iso = checkDate.getFullYear() + '-' + String(checkDate.getMonth() + 1).padStart(2, '0') + '-' + String(checkDate.getDate()).padStart(2, '0');
      if (dateSet.has(iso)) streak++;
      else if (i > 0) break;
    }
    return { streak, totalStudyDays, dateSet };
  }

  let currentPdHistoryType = 'all';
  window.setPdHistoryType = function(typeKey) {
    currentPdHistoryType = typeKey;
    document.querySelectorAll('#pdHistoryTypePills .asg-tab-btn').forEach(function(btn) {
      btn.classList.toggle('active', btn.getAttribute('data-pdtype') === typeKey);
    });
    renderPdHistoryTable();
  };

  window.resetPdHistoryFilters = function() {
    if (document.getElementById('pdFilterKeyword')) document.getElementById('pdFilterKeyword').value = '';
    if (document.getElementById('pdFilterSkill')) document.getElementById('pdFilterSkill').value = 'all';
    if (document.getElementById('pdFilterDateFrom')) document.getElementById('pdFilterDateFrom').value = '';
    if (document.getElementById('pdFilterDateTo')) document.getElementById('pdFilterDateTo').value = '';
    setPdHistoryType('all');
  };

  function classifySubmissionMode(r) {
    const sk = typeof detectResultSkillType === 'function' ? detectResultSkillType(r) : 'reading';
    if (sk === 'quiz') return 'vocab';
    const title = String(r.examTitle || '').toLowerCase();
    if (title.includes('full')) return 'full';
    if (title.includes('passage') || title.includes('part')) return 'practice';
    return 'single';
  }

  window.retakeFullExamById = function(examId, skillType) {
    if (skillType === 'listening' && typeof launchListeningExam === 'function') launchListeningExam(examId);
    else if (skillType === 'writing' && typeof launchWritingExam === 'function') launchWritingExam(examId);
    else if (typeof launchExam === 'function') launchExam(examId);
  };

  function renderPdHistoryTable() {
    const tbody = document.getElementById('pdHistoryTbody');
    if (!tbody || !activeUser) return;

    const kw = (document.getElementById('pdFilterKeyword')?.value || '').toLowerCase().trim();
    const skFilter = document.getElementById('pdFilterSkill')?.value || 'all';
    const dFrom = document.getElementById('pdFilterDateFrom')?.value || '';
    const dTo = document.getElementById('pdFilterDateTo')?.value || '';

    let list = (db.results || []).slice().reverse();
    if (activeUser.role === 'student') {
      list = list.filter(function(r) {
        return String(r.userName || '').toLowerCase() === String(activeUser.name || '').toLowerCase();
      });
    }

    list = list.filter(function(r) {
      const sk = typeof detectResultSkillType === 'function' ? detectResultSkillType(r) : 'reading';
      const mode = classifySubmissionMode(r);
      const rIso = getResultIsoDate(r);
      if (currentPdHistoryType !== 'all' && mode !== currentPdHistoryType) return false;
      if (skFilter !== 'all' && sk !== skFilter) return false;
      if (kw && !String(r.examTitle || '').toLowerCase().includes(kw)) return false;
      if (dFrom && (!rIso || rIso < dFrom)) return false;
      if (dTo && (!rIso || rIso > dTo)) return false;
      return true;
    });

    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:24px; color:#94a3b8;">Không tìm thấy lịch sử bài làm phù hợp với bộ lọc.</td></tr>';
      return;
    }

    tbody.innerHTML = list.map(function(r) {
      const sk = typeof detectResultSkillType === 'function' ? detectResultSkillType(r) : 'reading';
      const skillBadgeMap = {
        reading: '<span style="background:#ecfdf5; color:#059669; padding:4px 10px; border-radius:8px; font-weight:800; font-size:12px;">📖 Reading</span>',
        listening: '<span style="background:#eff6ff; color:#2563eb; padding:4px 10px; border-radius:8px; font-weight:800; font-size:12px;">🎧 Listening</span>',
        writing: '<span style="background:#fff7ed; color:#d97706; padding:4px 10px; border-radius:8px; font-weight:800; font-size:12px;">✍️ Writing</span>',
        quiz: '<span style="background:#f3e8ff; color:#7c3aed; padding:4px 10px; border-radius:8px; font-weight:800; font-size:12px;">🎯 Vocab Quiz</span>'
      };

      let pct = 100;
      const mScore = String(r.score || '').match(/(\d+)\s*\/\s*(\d+)/);
      if (mScore && Number(mScore[2]) > 0) pct = Math.round((Number(mScore[1]) / Number(mScore[2])) * 100);
      const ringColor = pct >= 70 ? '#16a34a' : (pct >= 50 ? '#d97706' : '#dc2626');
      const scoreVisual = mScore ? `
        <div style="display:flex; align-items:center; gap:8px;">
          <div class="score-ring-badge" style="background: conic-gradient(${ringColor} ${pct * 3.6}deg, #e2e8f0 0deg);">
            <div class="score-ring-inner">${mScore[1]}/${mScore[2]}</div>
          </div>
          <span style="font-size:12px; font-weight:700; color:#64748b;">${pct}%</span>
        </div>
      ` : `<span style="font-weight:700; color:#334155;">${r.score}</span>`;

      let actionsHtml = '';
      if (sk === 'writing') {
        actionsHtml = `
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="btn btn-secondary" style="padding:5px 10px; font-size:12px;" onclick="openStudentViewWritingModal('${r.id}')">👁️ Xem bài</button>
            <button class="btn btn-emerald" style="padding:5px 10px; font-size:12px;" onclick="retakeFullExamById('${r.examId}', 'writing')">🔄 Làm lại</button>
          </div>
        `;
      } else if (sk === 'quiz') {
        actionsHtml = '<span style="font-size:12px; color:#64748b; font-weight:600;">Hoàn thành Quiz</span>';
      } else {
        actionsHtml = `
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="btn btn-secondary" style="padding:5px 10px; font-size:12px;" onclick="reopenReviewFromHistory('${r.id}')">🔍 Xem lại</button>
            <button class="btn btn-emerald" style="padding:5px 10px; font-size:12px;" onclick="retakeFullExamById('${r.examId}', '${sk}')">🔄 Làm lại</button>
          </div>
        `;
      }

      const bandDisp = (String(r.band).startsWith('Band') || r.band === 'PASSED' || r.band === 'RETRY' || r.band === 'Submitted')
        ? r.band : ('Band ' + r.band);

      return `
        <tr>
          <td>
            <div style="font-weight:800; color:#0f172a;">${r.examTitle}</div>
            ${activeUser.role === 'teacher' ? `<div style="font-size:11.5px; color:#64748b;">Học sinh: <b>${r.userName}</b></div>` : ''}
          </td>
          <td>${skillBadgeMap[sk] || ''}</td>
          <td>${scoreVisual}</td>
          <td><b style="color:#059669; font-size:14px;">${bandDisp}</b></td>
          <td><span style="font-size:12px; color:#64748b;">${r.timestamp || ''}</span></td>
          <td>${actionsHtml}</td>
        </tr>
      `;
    }).join('');
  }

  function renderMyLearningDashboard() {
    if (!activeUser) return;
    injectPersonalDashboardTabAndPane();

    let myResults = (db.results || []).slice();
    if (activeUser.role === 'student') {
      myResults = myResults.filter(function(r) {
        return String(r.userName || '').toLowerCase() === String(activeUser.name || '').toLowerCase();
      });
    }

    const goal = getUserGoalProfile();
    const stats = calculateUserStreakAndDays(myResults);
    const examDt = new Date(goal.examDate);
    const diffMs = examDt.getTime() - Date.now();
    const daysLeft = isNaN(diffMs) ? 0 : Math.max(0, Math.ceil(diffMs / (1000 * 3600 * 24)));

    const topGrid = document.getElementById('pdTopMetricsGrid');
    if (topGrid) {
      topGrid.innerHTML = `
        <div class="pd-metric-card">
          <div class="pd-metric-icon" style="background:#fff7ed; color:#ea580c;">🔥</div>
          <div>
            <div style="font-size:22px; font-weight:800; color:#0f172a;">${stats.streak} ngày</div>
            <div style="font-size:11.5px; font-weight:700; color:#64748b; text-transform:uppercase;">Streak Học Tập</div>
          </div>
        </div>
        <div class="pd-metric-card">
          <div class="pd-metric-icon" style="background:#ecfdf5; color:#059669;">📝</div>
          <div>
            <div style="font-size:22px; font-weight:800; color:#0f172a;">${myResults.length} lượt</div>
            <div style="font-size:11.5px; font-weight:700; color:#64748b; text-transform:uppercase;">Tổng Lượt Làm Bài</div>
          </div>
        </div>
        <div class="pd-metric-card">
          <div class="pd-metric-icon" style="background:#eff6ff; color:#2563eb;">📅</div>
          <div>
            <div style="font-size:22px; font-weight:800; color:#0f172a;">${stats.totalStudyDays}/${goal.targetDays}</div>
            <div style="font-size:11.5px; font-weight:700; color:#64748b; text-transform:uppercase;">Ngày Cần Học</div>
          </div>
        </div>
        <div class="pd-metric-card">
          <div class="pd-metric-icon" style="background:#fef3c7; color:#d97706;">🎯</div>
          <div>
            <div style="font-size:22px; font-weight:800; color:#059669;">Band ${goal.targetBand}</div>
            <div style="font-size:11.5px; font-weight:700; color:#64748b; text-transform:uppercase;">Band Mục Tiêu</div>
          </div>
        </div>
        <div class="pd-metric-card">
          <div class="pd-metric-icon" style="background:#f3e8ff; color:#7c3aed;">⏳</div>
          <div>
            <div style="font-size:18px; font-weight:800; color:#0f172a;">${goal.examDate}</div>
            <div style="font-size:11.5px; font-weight:800; color:#7c3aed;">CÒN ${daysLeft} NGÀY THI</div>
          </div>
        </div>
      `;
    }

    function calcAvgBandForSkill(skill) {
      const nums = myResults
        .filter(function(r) { return (typeof detectResultSkillType === 'function' ? detectResultSkillType(r) : '') === skill; })
        .map(function(r) { return parseFloat(String(r.band || '').replace('Band', '').trim()); })
        .filter(function(n) { return !isNaN(n) && n > 0; });
      if (!nums.length) return '—';
      const avg = nums.reduce(function(a, b) { return a + b; }, 0) / nums.length;
      return (Math.round(avg * 2) / 2).toFixed(1);
    }

    const compBox = document.getElementById('pdCompetencyBandsBox');
    if (compBox) {
      compBox.innerHTML = `
        <div class="pd-skill-pill"><div style="font-size:12px; font-weight:700; color:#64748b;">📖 Reading</div><div style="font-size:26px; font-weight:800; color:#059669; margin-top:4px;">${calcAvgBandForSkill('reading')}</div></div>
        <div class="pd-skill-pill"><div style="font-size:12px; font-weight:700; color:#64748b;">🎧 Listening</div><div style="font-size:26px; font-weight:800; color:#2563eb; margin-top:4px;">${calcAvgBandForSkill('listening')}</div></div>
        <div class="pd-skill-pill"><div style="font-size:12px; font-weight:700; color:#64748b;">✍️ Writing</div><div style="font-size:26px; font-weight:800; color:#d97706; margin-top:4px;">${calcAvgBandForSkill('writing')}</div></div>
        <div class="pd-skill-pill"><div style="font-size:12px; font-weight:700; color:#64748b;">🗣️ Speaking</div><div style="font-size:26px; font-weight:800; color:#7c3aed; margin-top:4px;">—</div></div>
      `;
    }

    const chartBox = document.getElementById('pdWeeklyChartContainer');
    if (chartBox) {
      const daysLabel = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
      const bars = [];
      let maxMins = 60;
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        const count = myResults.filter(function(r) { return getResultIsoDate(r) === iso; }).length;
        const mins = count * 30;
        if (mins > maxMins) maxMins = mins;
        bars.push({ label: daysLabel[d.getDay()], mins });
      }
      chartBox.innerHTML = `<div class="pd-bar-chart">${bars.map(function(b) {
        const hPct = Math.max(5, Math.round((b.mins / maxMins) * 100));
        return `<div class="pd-bar-col"><span style="font-size:10px; font-weight:800; color:#059669;">${b.mins}p</span><div class="pd-bar-fill" style="height:${hPct}px;"></div><span style="font-size:11px; font-weight:700; color:#475569;">${b.label}</span></div>`;
      }).join('')}</div>`;
    }

    const heatGrid = document.getElementById('pdMonthlyHeatmapGrid');
    const heatLbl = document.getElementById('pdHeatmapMonthLabel');
    if (heatGrid) {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = now.getMonth();
      const daysInMonth = new Date(yyyy, mm + 1, 0).getDate();
      if (heatLbl) heatLbl.textContent = 'Tháng ' + (mm + 1) + '/' + yyyy;
      let cellsHtml = '';
      for (let day = 1; day <= daysInMonth; day++) {
        const iso = yyyy + '-' + String(mm + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
        const c = myResults.filter(function(r) { return getResultIsoDate(r) === iso; }).length;
        const lvClass = c === 0 ? '' : (c === 1 ? 'lv-1' : (c === 2 ? 'lv-2' : 'lv-3'));
        cellsHtml += `<div class="pd-heat-cell ${lvClass}" title="Ngày ${iso}: ${c} bài nộp">${day}</div>`;
      }
      heatGrid.innerHTML = cellsHtml;
    }

    renderPdHistoryTable();
  }

  let currentHomeAsgTab = 'todo';
  window.switchHomeAsgTab = function(tabName) {
    currentHomeAsgTab = tabName;
    renderHomeAssignmentsSection();
  };

  function isHomeworkCompletedByUser(asg, userObj) {
    if (!userObj || !asg) return false;
    return (db.results || []).some(function(r) {
      return String(r.userName || '').toLowerCase() === String(userObj.name || '').toLowerCase() &&
             (r.examId === asg.examId || r.examTitle === asg.examTitle);
    });
  }

  function renderHomeAssignmentsSection() {
    if (!activeUser) return;
    ensureV3Collections();
    const homePane = document.getElementById('tab-home');
    if (!homePane) return;

    let box = document.getElementById('homeMyAssignmentsSection');
    if (!box) {
      box = document.createElement('div');
      box.id = 'homeMyAssignmentsSection';
      box.className = 'card';
      const lastCard = homePane.querySelector('.card:last-of-type');
      if (lastCard) homePane.insertBefore(box, lastCard);
      else homePane.appendChild(box);
    }

    const isTeacher = activeUser.role === 'teacher';
    const myAsgs = (db.homeworkAssignments || []).filter(function(a) {
      if (isTeacher) return true;
      return Array.isArray(a.studentUsernames) && a.studentUsernames.includes(activeUser.username);
    });

    const todoList = [];
    const doneList = [];
    myAsgs.forEach(function(a) {
      if (isHomeworkCompletedByUser(a, activeUser)) doneList.push(a);
      else todoList.push(a);
    });

    const activeList = currentHomeAsgTab === 'todo' ? todoList : doneList;
    const todayIso = new Date().toISOString().split('T')[0];

    box.innerHTML = `
      <div class="card-title">
        <span>📌 Nhiệm vụ / Bài tập được giao (My Assignments)</span>
        <div style="display:flex; gap:8px;">
          ${isTeacher ? '<button class="btn btn-emerald" onclick="openCreateHomeworkModal()">📋 + Giao bài tập mới</button>' : ''}
          <button class="btn btn-secondary" onclick="switchDashTab('mydashboard')">📊 Xem Lịch sử bài đã làm →</button>
        </div>
      </div>
      <div class="asg-tabs">
        <button type="button" class="asg-tab-btn ${currentHomeAsgTab === 'todo' ? 'active' : ''}" onclick="switchHomeAsgTab('todo')">⏳ Cần làm (To-do) (${todoList.length})</button>
        <button type="button" class="asg-tab-btn ${currentHomeAsgTab === 'done' ? 'active' : ''}" onclick="switchHomeAsgTab('done')">✅ Đã hoàn thành (${doneList.length})</button>
      </div>
      <div>
        ${!activeList.length ? `
          <div class="asg-empty-box">
            <div style="font-size:32px; margin-bottom:8px;">🎉</div>
            <div style="font-weight:800; font-size:15px; color:#0f172a;">${currentHomeAsgTab === 'todo' ? 'Bạn đã hoàn thành hết bài tập được giao!' : 'Chưa có bài tập nào trong mục đã hoàn thành.'}</div>
            <div style="font-size:13px; color:#64748b; margin:6px 0 16px;">Tự luyện thêm trong thư viện đề để nâng Band điểm nhé!</div>
            <div style="display:flex; justify-content:center; gap:10px; flex-wrap:wrap;">
              <button class="btn btn-emerald" onclick="switchDashTab('reading')">📖 Reading</button>
              <button class="btn btn-secondary" onclick="switchDashTab('listening')">🎧 Listening</button>
              <button class="btn btn-secondary" onclick="switchDashTab('writing')">✍️ Writing</button>
            </div>
          </div>
        ` : activeList.map(function(a) {
          const isOverdue = a.deadline && a.deadline < todayIso && currentHomeAsgTab === 'todo';
          const skIcon = a.skill === 'listening' ? '🎧 Listening' : (a.skill === 'writing' ? '✍️ Writing' : '📖 Reading');
          return `
            <div class="asg-card ${isOverdue ? 'overdue' : ''}">
              <div>
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                  <span style="background:#ecfdf5; color:#059669; padding:2px 8px; border-radius:6px; font-size:11.5px; font-weight:800;">${skIcon}</span>
                  <b style="font-size:15px; color:#0f172a;">${a.examTitle}</b>
                  ${isOverdue ? '<span style="background:#fee2e2; color:#dc2626; padding:2px 8px; border-radius:6px; font-size:11px; font-weight:800;">⚠️ Quá hạn</span>' : ''}
                </div>
                <div style="font-size:12.5px; color:#64748b;">
                  ⏰ Hạn nộp: <b>${a.deadline || 'Không giới hạn'}</b>
                  ${a.note ? ` &nbsp;•&nbsp; 💬 Ghi chú: <i>"${a.note}"</i>` : ''}
                  ${isTeacher ? ` &nbsp;•&nbsp; 👥 Đã giao: <b>${(a.studentUsernames || []).length} học sinh</b>` : ''}
                </div>
              </div>
              <div style="display:flex; gap:8px; align-items:center;">
                <button class="btn btn-emerald" onclick="retakeFullExamById('${a.examId}', '${a.skill}')">
                  ${currentHomeAsgTab === 'todo' ? '🚀 Làm bài ngay' : '🔄 Làm lại'}
                </button>
                ${isTeacher ? `<button class="btn btn-danger" onclick="deleteHomeworkAssignment('${a.id}')">Xóa</button>` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  window.openCreateHomeworkModal = function() {
    ensureV3Collections();
    const clsSel = document.getElementById('hwFilterClassSelect');
    if (clsSel) {
      clsSel.innerHTML = '<option value="ALL">🏫 Tất cả các lớp</option>' +
        (db.classes || []).map(function(c) { return `<option value="${c.id}">${c.name}</option>`; }).join('');
    }
    const today = new Date();
    today.setDate(today.getDate() + 3);
    if (document.getElementById('hwDeadlineInput')) {
      document.getElementById('hwDeadlineInput').value = today.toISOString().split('T')[0];
    }
    if (document.getElementById('hwNoteInput')) document.getElementById('hwNoteInput').value = '';
    populateHwExamOptions();
    renderHwStudentChecklist();
    openModal('createHomeworkModal');
  };

  window.populateHwExamOptions = function() {
    const sk = document.getElementById('hwSkillSelect')?.value || 'reading';
    const exSel = document.getElementById('hwExamSelect');
    if (!exSel) return;
    const pool = sk === 'listening' ? (db.listeningExams || []) : (sk === 'writing' ? (db.writingExams || []) : (db.readingExams || []));
    if (!pool.length) {
      exSel.innerHTML = '<option value="">-- Chưa có đề thi nào trong mục này --</option>';
      return;
    }
    exSel.innerHTML = pool.map(function(e) { return `<option value="${e.id}">${e.title}</option>`; }).join('');
  };

  window.renderHwStudentChecklist = function() {
    const clsId = document.getElementById('hwFilterClassSelect')?.value || 'ALL';
    const box = document.getElementById('hwStudentCheckListBox');
    if (!box) return;
    const students = (db.users || []).filter(function(u) {
      return u.role === 'student' && (clsId === 'ALL' || u.classId === clsId);
    });
    if (!students.length) {
      box.innerHTML = '<div style="color:#94a3b8; font-style:italic; grid-column:1/-1;">Không có học sinh nào trong lớp này.</div>';
      return;
    }
    box.innerHTML = students.map(function(st) {
      const cls = (db.classes || []).find(function(c) { return c.id === st.classId; });
      return `
        <label style="display:flex; align-items:center; gap:8px; background:#ffffff; border:1px solid #e2e8f0; padding:7px 10px; border-radius:8px; cursor:pointer; font-size:12.5px; font-weight:700;">
          <input type="checkbox" class="hw-stu-checkbox" value="${st.username}" checked style="width:16px; height:16px; accent-color:#059669;">
          <span>${st.name} <small style="color:#64748b; font-weight:500;">(${cls ? cls.name : 'Tự do'})</small></span>
        </label>
      `;
    }).join('');
  };

  window.toggleAllHwStudents = function(checkState) {
    document.querySelectorAll('.hw-stu-checkbox').forEach(function(cb) { cb.checked = Boolean(checkState); });
  };

  window.saveNewHomeworkAssignment = async function() {
    ensureV3Collections();
    const skill = document.getElementById('hwSkillSelect')?.value || 'reading';
    const examId = document.getElementById('hwExamSelect')?.value || '';
    const deadline = document.getElementById('hwDeadlineInput')?.value || '';
    const note = (document.getElementById('hwNoteInput')?.value || '').trim();

    if (!examId) return alert('Vui lòng chọn đề thi cần giao!');
    const pool = skill === 'listening' ? (db.listeningExams || []) : (skill === 'writing' ? (db.writingExams || []) : (db.readingExams || []));
    const examObj = pool.find(function(e) { return e.id === examId; });
    if (!examObj) return alert('Không tìm thấy đề thi đã chọn!');

    const selectedStudents = Array.from(document.querySelectorAll('.hw-stu-checkbox:checked')).map(function(cb) { return cb.value; });
    if (!selectedStudents.length) return alert('Vui lòng tích chọn ít nhất 1 học sinh nhận bài tập!');

    db.homeworkAssignments.unshift({
      id: 'hw_' + Date.now(),
      skill,
      examId: examObj.id,
      examTitle: examObj.title,
      studentUsernames: selectedStudents,
      deadline,
      note,
      createdAt: Date.now()
    });

    if (typeof persist === 'function') await persist();
    closeModal('createHomeworkModal');
    renderHomeAssignmentsSection();
    alert('✅ Đã giao bài tập "' + examObj.title + '" cho ' + selectedStudents.length + ' học sinh!');
  };

  window.deleteHomeworkAssignment = async function(asgId) {
    if (!confirm('Xóa bài tập đã giao này?')) return;
    ensureV3Collections();
    db.homeworkAssignments = (db.homeworkAssignments || []).filter(function(a) { return a.id !== asgId; });
    if (typeof persist === 'function') await persist();
    renderHomeAssignmentsSection();
  };

  // Kết nối vào điều hướng Dashboard
  const _origSwitchDashTabV3 = window.switchDashTab;
  window.switchDashTab = function(tab) {
    injectMockTestTabIntoDashboard();
    injectPersonalDashboardTabAndPane();
    if (typeof _origSwitchDashTabV3 === 'function') _origSwitchDashTabV3(tab);
    if (tab === 'mydashboard') renderMyLearningDashboard();
    if (tab === 'mocktest') renderMockTestTab();
    if (tab === 'home') renderHomeAssignmentsSection();
  };

  const _origRenderHomeTabV3 = window.renderHomeTab;
  window.renderHomeTab = function() {
    if (typeof _origRenderHomeTabV3 === 'function') _origRenderHomeTabV3();
    injectMockTestTabIntoDashboard();
    injectPersonalDashboardTabAndPane();
    renderHomeAssignmentsSection();
  };

  window.addEventListener('DOMContentLoaded', function() {
    ensureV3Collections();
    injectMockTestTabIntoDashboard();
    injectPersonalDashboardTabAndPane();
  });
})();