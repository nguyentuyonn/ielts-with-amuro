/* ============================================================================
   FILE 3/3: exam-engine.js
   ĐỘNG CƠ PHÒNG THI INSPERA: READING, LISTENING (NO PAUSE), WRITING,
   GIỮ HIGHLIGHT KHI CHUYỂN PART, CHIA ĐỀ ROUND-ROBIN, MOCK FLOW & REVIEW ENGINE
   ============================================================================ */

/* 1. BỘ NHỚ HIGHLIGHT THEO TỪNG PART & TRẠNG THÁI THI THỬ MOCK TEST */
window.__examPartHighlights = {}; // Cấu trúc: { left_1: html, right_1: html, ... }
window.__tabSwitchCount = 0;
window.__lastTabSwitchTime = 0;

window.mockFlowState = {
  active: false,
  step: null, // 'listening' -> 'reading' -> 'writing'
  listeningExamId: null,
  readingExamId: null,
  writingExamId: null,
  scores: {}
};

let currentSelectedRange = null;
let currentActiveSyntaxKey = null;
let currentActiveEvidenceQuote = null;
let lastEvidenceScrollIdx = 0;

function clearExamHighlightMemory() {
  window.__examPartHighlights = {};
  currentActiveSyntaxKey = null;
  currentActiveEvidenceQuote = null;
}

/* 2. HỆ THỐNG CẢNH BÁO RỜI TAB (ANTI-CHEAT TAB SWITCH DETECTOR) */
function updateAntiCheatBadgeUI() {
  let badge = document.getElementById('examAntiCheatBadge');
  const topBarLeft = document.querySelector('.inspera-top-left');
  if (topBarLeft && !badge) {
    badge = document.createElement('span');
    badge.id = 'examAntiCheatBadge';
    badge.className = 'anti-cheat-badge';
    topBarLeft.appendChild(badge);
  }
  if (badge) {
    const inRoom = isStudentInActiveExamRoom();
    badge.style.display = inRoom ? 'inline-flex' : 'none';
    badge.innerHTML = `<i class="fas fa-eye"></i> Rời tab: ${window.__tabSwitchCount} lần`;
  }
}

function recordStudentTabSwitch() {
  if (!isStudentInActiveExamRoom()) return;
  if (activeUser && activeUser.role === 'teacher') return;

  const now = Date.now();
  if (now - window.__lastTabSwitchTime < 1200) return;
  window.__lastTabSwitchTime = now;

  window.__tabSwitchCount++;
  updateAntiCheatBadgeUI();

  const toast = document.getElementById('antiCheatWarningToast');
  const toastTxt = document.getElementById('antiCheatToastText');
  if (toast && toastTxt) {
    toastTxt.textContent = `⚠️ CẢNH BÁO VI PHẠM (${window.__tabSwitchCount} lần): Phát hiện rời khỏi màn hình làm bài thi! Hệ thống đã ghi nhận vào kết quả.`;
    toast.style.display = 'flex';
    setTimeout(() => { toast.style.display = 'none'; }, 4500);
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) recordStudentTabSwitch();
});

window.addEventListener('blur', () => {
  if (document.activeElement && document.activeElement.tagName === 'IFRAME') return;
  recordStudentTabSwitch();
});

/* 3. THUẬT TOÁN CHIA ĐỀ NGẪU NHIÊN KHÔNG TRÙNG LẶP (ROUND-ROBIN SHUFFLE CHO N THÍ SINH) */
function hashSeedString(str) {
  let h = 2166136261 >>> 0;
  const s = String(str || '');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function deterministicShuffle(array, seedNum) {
  const arr = array.slice();
  let s = seedNum || 123456789;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) % 4294967296;
    const j = s % (i + 1);
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

window.pickRoundRobinExamForStudent = function(skillType) {
  const rawPool = skillType === 'listening' ? getVisibleExams(db.listeningExams || [])
    : (skillType === 'reading' ? getVisibleExams(db.readingExams || []) : getVisibleExams(db.writingExams || []));

  if (!rawPool.length) return null;

  // Sắp xếp cố định theo ID trước khi xáo trộn theo ngày để mọi máy có cùng trục phân phối
  const sortedPool = rawPool.slice().sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const todayKey = new Date().toISOString().slice(0, 10);
  const shuffledPool = deterministicShuffle(sortedPool, hashSeedString(todayKey + '_' + skillType));

  // Xác định số thứ tự (Slot) của học sinh trong tổng danh sách học sinh (hỗ trợ không giới hạn số lượng N thí sinh)
  const allStudents = (db.users || [])
    .filter(u => u.role === 'student')
    .sort((a, b) => String(a.username).localeCompare(String(b.username)));

  let studentRank = allStudents.findIndex(u => activeUser && u.username === activeUser.username);
  if (studentRank < 0) {
    studentRank = activeUser ? (hashSeedString(activeUser.username) % Math.max(1, shuffledPool.length)) : 0;
  }

  // Kiểm tra lịch sử các đề học sinh này đã từng làm để ưu tiên phát đề mới 100%
  const completedIds = new Set(getStudentCompletedExamIds(skillType));
  const totalExams = shuffledPool.length;

  for (let offset = 0; offset < totalExams; offset++) {
    const candidateIdx = (studentRank + offset) % totalExams;
    const candidateExam = shuffledPool[candidateIdx];
    if (!completedIds.has(candidateExam.id)) {
      return candidateExam;
    }
  }

  // Nếu học sinh đã làm hết sạch cả kho đề (100 đề), xoay sang vòng thứ 2 đồng đều
  const secondRoundIdx = (studentRank + completedIds.size) % totalExams;
  return shuffledPool[secondRoundIdx];
};

/* 4. ĐIỀU KHIỂN GIAO DIỆN & THANH AUDIO LISTENING (KHÔNG CÓ NÚT PAUSE KHI THI) */
function changeExamFontSize(size) {
  const left = document.getElementById('insperaLeftPane');
  const right = document.getElementById('insperaRightPane');
  if (left) left.style.fontSize = size;
  if (right) right.style.fontSize = size;
}

function changeExamTheme(theme) {
  const shell = document.getElementById('examShell');
  if (!shell) return;
  shell.classList.remove('theme-dark', 'theme-yellow');
  if (theme === 'dark') shell.classList.add('theme-dark');
  if (theme === 'yellow') shell.classList.add('theme-yellow');
}

function stopAllAudioPlayers() {
  const audioEl = document.getElementById('examAudioPlayer');
  if (audioEl) {
    audioEl.pause();
    audioEl.removeAttribute('src');
  }
  const driveIframe = document.getElementById('examDriveAudioIframe');
  if (driveIframe) {
    driveIframe.src = 'about:blank';
    driveIframe.style.display = 'none';
  }
  const container = document.getElementById('listeningAudioHeaderContainer');
  if (container) container.style.display = 'none';
}

function setupHeaderAudioPlayer(rawUrl) {
  const container = document.getElementById('listeningAudioHeaderContainer');
  const audioEl = document.getElementById('examAudioPlayer');
  const driveIframe = document.getElementById('examDriveAudioIframe');
  const fallbackLink = document.getElementById('examAudioFallbackLink');
  const speedSel = document.getElementById('examAudioSpeedSelect');

  if (!container || !audioEl) return;
  container.style.display = 'flex';

  // Đảm bảo xóa sạch mọi nút Pause thừa nếu từng bị chèn trước đó
  container.querySelectorAll('button').forEach(btn => btn.remove());

  let url = (rawUrl || '').trim();
  if (!url) return;

  if (url.includes('dropbox.com')) {
    url = url.replace('www.dropbox.com', 'dl.dropboxusercontent.com').replace(/[?&]dl=[01]/, '');
  }

  const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (url.includes('drive.google.com') && driveMatch && driveMatch[1]) {
    const fileId = driveMatch[1];
    audioEl.pause();
    audioEl.style.display = 'none';
    if (speedSel) speedSel.style.display = 'none';
    driveIframe.style.display = 'block';
    const previewUrl = `https://drive.google.com/file/d/${fileId}/preview`;
    if (driveIframe.src !== previewUrl) {
      driveIframe.src = previewUrl;
    }
    if (fallbackLink) {
      fallbackLink.href = `https://drive.google.com/file/d/${fileId}/view`;
      fallbackLink.style.display = 'inline';
    }
  } else {
    driveIframe.src = 'about:blank';
    driveIframe.style.display = 'none';
    audioEl.style.display = 'block';
    if (speedSel) {
      speedSel.style.display = 'inline-block';
      speedSel.value = '1';
      speedSel.onchange = function() {
        audioEl.playbackRate = parseFloat(this.value) || 1.0;
      };
    }
    if (audioEl.src !== url) {
      audioEl.src = url;
      audioEl.load();
    }
    audioEl.playbackRate = 1.0;
    audioEl.play().catch(() => {});
    if (fallbackLink) {
      fallbackLink.href = url;
      fallbackLink.style.display = url.startsWith('data:') ? 'none' : 'inline';
    }
  }
}

async function handleListeningAudioUpload(input) {
  const file = input.files && input.files[0];
  if (!file) return;

  const btnText = document.getElementById('uploadAudioBtnText');
  const origText = btnText ? btnText.textContent : 'Upload MP3';
  if (btnText) btnText.textContent = '⏳ Uploading...';

  if (CLOUD_STORAGE) {
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storageRef = CLOUD_STORAGE.ref(`listening_audio/${Date.now()}_${safeName}`);
      const snapshot = await storageRef.put(file);
      const downloadUrl = await snapshot.ref.getDownloadURL();
      document.getElementById('leAudioUrl').value = downloadUrl;
      if (btnText) btnText.textContent = '✅ Uploaded';
      setTimeout(() => { if (btnText) btnText.textContent = origText; }, 2500);
      input.value = '';
      return;
    } catch (storageErr) {
      console.warn('Firebase Storage fallback:', storageErr.message);
    }
  }

  try {
    const formData = new FormData();
    formData.append('reqtype', 'fileupload');
    formData.append('fileToUpload', file);
    const res = await fetch('https://catbox.moe/user/api.php', { method: 'POST', body: formData });
    if (res.ok) {
      const directMp3Url = (await res.text()).trim();
      if (directMp3Url.startsWith('http')) {
        document.getElementById('leAudioUrl').value = directMp3Url;
        if (btnText) btnText.textContent = '✅ Uploaded';
        setTimeout(() => { if (btnText) btnText.textContent = origText; }, 2500);
        input.value = '';
        return;
      }
    }
  } catch (cloudErr) {}

  if (btnText) btnText.textContent = origText;
  input.value = '';
  alert('Bạn có thể dán trực tiếp link Google Drive, Dropbox hoặc link .mp3 vào ô Audio Source.');
}

/* 5. KHỞI CHẠY BÀI THI (READING, LISTENING, WRITING & FULL MOCK TEST) */
function launchExam(examId) {
  const targetId = examId || (pickRoundRobinExamForStudent('reading') || {}).id;
  if (!targetId) return alert('Kho đề Reading hiện đang trống!');

  const st = getMilestoneQuizStatus();
  const completedIds = getStudentCompletedExamIds('reading');
  if (st.locked && !completedIds.includes(targetId) && !(window.mockFlowState && window.mockFlowState.active)) {
    if (confirm(`🔒 KHÓA TIẾN ĐỘ READING!\n\nBạn đã hoàn thành ${st.completedCount} bài Reading (Chặng ${st.milestoneNum} bài).\nBạn cần vượt qua bài Vocab Quiz 40 câu (đạt >= 60%) để mở khóa các bài Reading tiếp theo.\n\nBấm OK để làm Vocab Quiz mở khóa ngay!`)) {
      triggerVocabMilestoneQuiz(st.milestoneNum);
    }
    return;
  }

  activeExam = (db.readingExams || []).find(e => e.id === targetId);
  if (!activeExam) return alert('Không tìm thấy đề Reading!');

  stopAllAudioPlayers();
  clearExamHighlightMemory();
  window.__tabSwitchCount = 0;
  activeExamType = 'reading';
  isReviewMode = false;
  isTeacherEditMode = false;
  activePartNum = (activeExam.passages && activeExam.passages[0]) ? activeExam.passages[0].partNum : 1;
  userAnswers = {};
  selectedDragItem = null;
  secondsRemaining = (activeExam.duration || 60) * 60;

  document.getElementById('dashboardApp').style.display = 'none';
  document.getElementById('examShell').style.display = 'flex';
  document.getElementById('insperaExamTitle').textContent = activeExam.title;
  document.getElementById('insperaCandidateTag').textContent = `Candidate: ${activeUser ? activeUser.name : 'Student'}`;
  document.getElementById('btnSubmitExam').style.display = '';
  document.getElementById('btnSubmitBottom').style.display = '';
  document.getElementById('btnToggleTeacherMode').style.display = (activeUser && activeUser.role === 'teacher') ? '' : 'none';
  document.getElementById('footerSectionLabel').textContent = `Part ${activePartNum}`;

  updateAntiCheatBadgeUI();
  renderPartPills();
  loadPassageView(activePartNum);
  buildFooterNav();
  setupResizer();
  setupInExamHighlightEngine();
  startTimer();
}

// Khai báo chuẩn launchReadingExam để không bao giờ bị lỗi đỏ Console
window.launchReadingExam = function(examId) {
  launchExam(examId);
};

window.launchListeningExam = function(examId) {
  const targetId = examId || (pickRoundRobinExamForStudent('listening') || {}).id;
  if (!targetId) return alert('Kho đề Listening hiện đang trống!');

  activeExam = (db.listeningExams || []).find(e => e.id === targetId);
  if (!activeExam) return alert('Không tìm thấy đề Listening!');

  clearExamHighlightMemory();
  window.__tabSwitchCount = 0;
  activeExamType = 'listening';
  isReviewMode = false;
  isTeacherEditMode = false;
  activePartNum = (activeExam.passages && activeExam.passages[0]) ? activeExam.passages[0].partNum : 1;
  userAnswers = {};
  selectedDragItem = null;
  secondsRemaining = (activeExam.duration || 30) * 60;

  document.getElementById('dashboardApp').style.display = 'none';
  document.getElementById('examShell').style.display = 'flex';
  document.getElementById('insperaExamTitle').textContent = activeExam.title;
  document.getElementById('insperaCandidateTag').textContent = `Candidate: ${activeUser ? activeUser.name : 'Student'}`;
  document.getElementById('btnSubmitExam').style.display = '';
  document.getElementById('btnSubmitBottom').style.display = '';
  document.getElementById('btnToggleTeacherMode').style.display = (activeUser && activeUser.role === 'teacher') ? '' : 'none';
  document.getElementById('footerSectionLabel').textContent = `Part ${activePartNum}`;

  updateAntiCheatBadgeUI();
  setupHeaderAudioPlayer(activeExam.audioUrl);
  renderPartPills();
  loadPassageView(activePartNum);
  buildFooterNav();
  setupResizer();
  setupInExamHighlightEngine();
  startTimer();
};

window.launchWritingExam = function(examId) {
  const targetId = examId || (pickRoundRobinExamForStudent('writing') || {}).id;
  if (!targetId) return alert('Kho đề Writing hiện đang trống!');

  activeExam = (db.writingExams || []).find(w => w.id === targetId);
  if (!activeExam) return alert('Không tìm thấy đề Writing!');

  stopAllAudioPlayers();
  clearExamHighlightMemory();
  window.__tabSwitchCount = 0;

  const hasT1 = Boolean(activeExam.task1 && activeExam.task1.prompt);
  const hasT2 = Boolean(activeExam.task2 && activeExam.task2.prompt);

  activeExamType = 'writing';
  isReviewMode = false;
  isTeacherEditMode = false;
  activePartNum = hasT1 ? 1 : 2;
  writingAnswers = { task1: '', task2: '' };
  secondsRemaining = (activeExam.duration || (hasT1 && hasT2 ? 60 : (hasT1 ? 20 : 40))) * 60;

  document.getElementById('dashboardApp').style.display = 'none';
  document.getElementById('examShell').style.display = 'flex';
  document.getElementById('insperaExamTitle').textContent = activeExam.title;
  document.getElementById('insperaCandidateTag').textContent = `Candidate: ${activeUser ? activeUser.name : 'Student'}`;
  document.getElementById('btnToggleTeacherMode').style.display = 'none';
  document.getElementById('btnSubmitExam').style.display = '';
  document.getElementById('btnSubmitBottom').style.display = '';
  document.getElementById('footerSectionLabel').textContent = 'Writing';

  const topTabs = document.getElementById('insperaPartTabs');
  topTabs.innerHTML = `
    ${hasT1 ? `<button class="part-pill ${activePartNum === 1 ? 'active' : ''}" id="wtab_1" onclick="switchWritingTask(1)">Part 1</button>` : ''}
    ${hasT2 ? `<button class="part-pill ${activePartNum === 2 ? 'active' : ''}" id="wtab_2" onclick="switchWritingTask(2)">Part 2</button>` : ''}
  `;

  const footerList = document.getElementById('insperaFooterList');
  footerList.innerHTML = `
    ${hasT1 ? `<button class="progress-item ${activePartNum === 1 ? 'current' : ''}" id="wfoot_1" onclick="switchWritingTask(1)" style="min-width:75px; height:28px;">Part 1</button>` : ''}
    ${hasT2 ? `<button class="progress-item ${activePartNum === 2 ? 'current' : ''}" id="wfoot_2" onclick="switchWritingTask(2)" style="min-width:75px; height:28px;">Part 2</button>` : ''}
    <span id="writingWordCountDisplay" style="margin-left: 16px; font-weight: 700; color: #111827; font-size: 13px;">Word count: 0</span>
  `;

  updateAntiCheatBadgeUI();
  loadWritingWorkspace(activePartNum);
  setupResizer();
  setupInExamHighlightEngine();
  startTimer();
};

// Luồng thi liên hoàn Full Mock Test 3 kỹ năng (Listening -> Reading -> Writing)
window.startFullMockTestSession = function() {
  const lisExam = pickRoundRobinExamForStudent('listening');
  const readExam = pickRoundRobinExamForStudent('reading');
  const writeExam = pickRoundRobinExamForStudent('writing');

  if (!lisExam && !readExam && !writeExam) {
    return alert('Kho đề hiện tại chưa có bài thi nào!');
  }

  const msg = `🎯 BẮT ĐẦU KỲ THI FULL MOCK TEST (CHIA ĐỀ ROUND-ROBIN KHÔNG TRÙNG LẶP):\n\n` +
    `1. 🎧 Listening: ${lisExam ? lisExam.title : '(Chưa có đề)'}\n` +
    `2. 📖 Reading: ${readExam ? readExam.title : '(Chưa có đề)'}\n` +
    `3. ✍️ Writing: ${writeExam ? writeExam.title : '(Chưa có đề)'}\n\n` +
    `Hệ thống sẽ tự động chuyển tiếp giữa các kỹ năng ngay sau khi bạn nộp bài. Bấm OK để vào phòng thi!`;

  if (!confirm(msg)) return;

  window.mockFlowState = {
    active: true,
    step: lisExam ? 'listening' : (readExam ? 'reading' : 'writing'),
    listeningExamId: lisExam ? lisExam.id : null,
    readingExamId: readExam ? readExam.id : null,
    writingExamId: writeExam ? writeExam.id : null,
    scores: {}
  };

  if (window.mockFlowState.step === 'listening') {
    launchListeningExam(lisExam.id);
  } else if (window.mockFlowState.step === 'reading') {
    launchReadingExam(readExam.id);
  } else {
    launchWritingExam(writeExam.id);
  }
};

/* 6. CHUYỂN PART & BẢO TOÀN 100% VẾT HIGHLIGHT CHO CẢ LISTENING & READING */
function saveCurrentPartHighlightsToMemory(partNum) {
  if (!partNum || activeExamType === 'writing' || isReviewMode || isTeacherEditMode) return;
  const leftPane = document.getElementById('insperaLeftPane');
  const rightPane = document.getElementById('insperaRightPane');

  if (leftPane && activeExamType === 'reading') {
    window.__examPartHighlights['left_' + partNum] = leftPane.innerHTML;
  }
  if (rightPane) {
    // Đồng bộ giá trị đang gõ vào thuộc tính HTML trước khi lưu vào bộ đệm
    rightPane.querySelectorAll('input[type="text"]').forEach(inp => {
      inp.setAttribute('value', inp.value);
    });
    rightPane.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(chk => {
      if (chk.checked) chk.setAttribute('checked', 'checked');
      else chk.removeAttribute('checked');
    });
    rightPane.querySelectorAll('select').forEach(sel => {
      Array.from(sel.options).forEach(opt => {
        if (opt.value === sel.value) opt.setAttribute('selected', 'selected');
        else opt.removeAttribute('selected');
      });
    });
    window.__examPartHighlights['right_' + partNum] = rightPane.innerHTML;
  }
}

function renderPartPills() {
  const nav = document.getElementById('insperaPartTabs');
  if (!nav || !activeExam) return;
  const passages = activeExam.passages || [];
  if (!passages.length) {
    nav.innerHTML = `<button class="part-pill active">Part 1</button>`;
    return;
  }
  nav.innerHTML = passages.map(p => `
    <button class="part-pill ${p.partNum === activePartNum ? 'active' : ''}" onclick="switchExamPassage(${p.partNum})">
      Part ${p.partNum}
    </button>
  `).join('');
}

window.switchExamPassage = function(partNum) {
  saveCurrentPartHighlightsToMemory(activePartNum);
  currentActiveSyntaxKey = null;
  currentActiveEvidenceQuote = null;
  activePartNum = partNum;
  const footerLbl = document.getElementById('footerSectionLabel');
  if (footerLbl) footerLbl.textContent = `Part ${partNum}`;
  renderPartPills();
  loadPassageView(activePartNum);
  updateFooterNav();
};

function loadPassageView(partNum) {
  const passage = (activeExam.passages || []).find(p => p.partNum === partNum) || (activeExam.passages || [])[0] || { title: '', passageHtml: '', questionsHtml: '' };
  const left = document.getElementById('insperaLeftPane');
  const right = document.getElementById('insperaRightPane');
  const resizer = document.getElementById('insperaResizer');

  document.getElementById('insperaPartInstructionText').innerHTML = activeExamType === 'listening'
    ? (isReviewMode ? `<b>Part ${partNum} (Review Mode)</b> &nbsp; Compare your responses on the right with the audio transcript on the left.` : `<b>Part ${partNum}</b> &nbsp; Listen to the audio and answer the questions below.`)
    : `<b>Part ${partNum}</b> &nbsp; Read the text on the left and answer the questions on the right.`;

  const savedLeft = (!isReviewMode && !isTeacherEditMode) ? window.__examPartHighlights['left_' + partNum] : null;
  const savedRight = (!isReviewMode && !isTeacherEditMode) ? window.__examPartHighlights['right_' + partNum] : null;

  if (activeExamType === 'listening' && !isReviewMode) {
    left.style.display = 'none';
    resizer.style.display = 'none';
    right.style.width = '100%';
    if (savedRight) {
      right.innerHTML = savedRight;
    } else {
      right.innerHTML = `<div style="max-width: 960px; margin: 0 auto;"><h2 class="section-title">${passage.title || 'Questions'}</h2>${passage.questionsHtml || ''}</div>`;
    }
  } else {
    left.style.display = 'block';
    resizer.style.display = 'flex';
    left.style.width = '50%';
    right.style.width = '50%';

    if (savedLeft && activeExamType === 'reading') {
      left.innerHTML = savedLeft;
    } else {
      left.innerHTML = `<h2 class="section-title">${activeExamType === 'listening' ? 'Audio Transcript - Part ' + partNum : (passage.title || 'READING PASSAGE ' + partNum)}</h2><div class="passage-content">${passage.passageHtml || '<p>No transcript/passage text provided.</p>'}</div>`;
    }

    if (savedRight) {
      right.innerHTML = savedRight;
    } else {
      right.innerHTML = `<h2 class="section-title">Questions</h2>${passage.questionsHtml || ''}`;
    }
  }

  // Tắt gợi ý tự động của trình duyệt trên mọi ô input
  document.querySelectorAll('#examShell input, #examShell textarea, #examShell select').forEach(el => {
    el.setAttribute('autocomplete', 'off');
    el.setAttribute('autocorrect', 'off');
    el.setAttribute('autocapitalize', 'off');
    el.setAttribute('spellcheck', 'false');
  });

  bindInputListeners(document.getElementById('insperaSplitBox'));
  setupDragDropEngine();
  restoreUserAnswersInDOM(document.getElementById('insperaSplitBox'));

  if (isReviewMode) {
    showReviewAnswersInDOM(document.getElementById('insperaSplitBox'));
  }

  if (isTeacherEditMode && activeUser && activeUser.role === 'teacher') {
    injectTeacherEditBadges(document.getElementById('insperaSplitBox'));
  }
}

/* 7. CÔNG CỤ BÔI VÀNG (HIGHLIGHT) TRONG PHÒNG THI */
function setupInExamHighlightEngine() {
  const workspace = document.getElementById('insperaSplitBox');
  const tooltip = document.getElementById('selectionTooltip');
  if (!workspace || !tooltip) return;

  workspace.onmouseup = (e) => {
    setTimeout(() => {
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed && sel.toString().trim().length > 0) {
        const range = sel.getRangeAt(0);
        currentSelectedRange = range.cloneRange();
        const rect = range.getBoundingClientRect();
        tooltip.style.left = `${Math.max(10, rect.left + (rect.width / 2) - 55)}px`;
        tooltip.style.top = `${Math.max(10, rect.top - 42)}px`;
        tooltip.style.display = 'flex';
      } else {
        if (!e.target.closest('#selectionTooltip')) {
          tooltip.style.display = 'none';
        }
      }
    }, 15);
  };
}

window.applyUserHighlight = function() {
  if (!currentSelectedRange) return;
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(currentSelectedRange);

  const span = document.createElement('span');
  span.className = 'user-highlight-span';
  try {
    currentSelectedRange.surroundContents(span);
  } catch (err) {
    try {
      const fragment = currentSelectedRange.extractContents();
      span.appendChild(fragment);
      currentSelectedRange.insertNode(span);
    } catch (e2) {}
  }

  document.getElementById('selectionTooltip').style.display = 'none';
  sel.removeAllRanges();
  currentSelectedRange = null;
  saveCurrentPartHighlightsToMemory(activePartNum);
};

window.removeUserHighlight = function() {
  if (currentSelectedRange) {
    const container = currentSelectedRange.commonAncestorContainer;
    const el = container.nodeType === 3 ? container.parentElement : container;
    const hlSpan = el ? el.closest('.user-highlight-span') : null;
    if (hlSpan) {
      hlSpan.outerHTML = hlSpan.innerHTML;
    } else if (el) {
      el.querySelectorAll('.user-highlight-span').forEach(s => { s.outerHTML = s.innerHTML; });
    }
  }
  document.getElementById('selectionTooltip').style.display = 'none';
  window.getSelection().removeAllRanges();
  currentSelectedRange = null;
  saveCurrentPartHighlightsToMemory(activePartNum);
};

/* 8. NHẬP ĐÁP ÁN, KÉO THẢ (DRAG & DROP) & LƯU NHÁP LOCAL (KHÔNG GỌI FIREBASE) */
function bindInputListeners(scope) {
  if (!scope) return;
  scope.querySelectorAll('input[type="text"], input[type="radio"], select').forEach(inp => {
    const handler = () => {
      if (isReviewMode) return;
      if (inp.type === 'radio') {
        if (inp.checked) userAnswers[inp.name] = inp.value;
      } else {
        userAnswers[inp.name] = inp.value.trim();
      }
      updateFooterNav();
      saveProgressToLocalOnly();
      saveCurrentPartHighlightsToMemory(activePartNum);
    };
    inp.oninput = handler;
    inp.onchange = handler;
  });

  scope.querySelectorAll('input[type="checkbox"][data-pair-group]').forEach(chk => {
    chk.onchange = () => {
      if (isReviewMode) return;
      const groupName = chk.getAttribute('data-pair-group');
      const allBoxes = Array.from(scope.querySelectorAll(`input[type="checkbox"][data-pair-group="${groupName}"]`));
      const checkedBoxes = allBoxes.filter(b => b.checked);
      const qNames = groupName.split('_');

      if (checkedBoxes.length > qNames.length) {
        chk.checked = false;
        return alert(`You can only select ${qNames.length} options for this question group.`);
      }

      const selectedValues = checkedBoxes.map(b => b.value).sort();
      qNames.forEach((qKey, idx) => {
        if (selectedValues[idx]) userAnswers[qKey] = selectedValues[idx];
        else delete userAnswers[qKey];
      });
      updateFooterNav();
      saveProgressToLocalOnly();
      saveCurrentPartHighlightsToMemory(activePartNum);
    };
  });
}

function restoreUserAnswersInDOM(scope) {
  if (!scope) return;
  Object.keys(userAnswers).forEach(name => {
    const val = userAnswers[name];
    const textInp = scope.querySelector(`input[type="text"][name="${name}"]`);
    if (textInp) textInp.value = val;

    const selInp = scope.querySelector(`select[name="${name}"]`);
    if (selInp) selInp.value = val;

    const radio = scope.querySelector(`input[type="radio"][name="${name}"][value="${val}"]`);
    if (radio) radio.checked = true;

    const zone = scope.querySelector(`.drop-zone[data-target="${name}"]`);
    if (zone && val) {
      const item = scope.querySelector(`.drag-item[data-answer="${val}"]`);
      zone.textContent = item ? item.textContent.trim() : val;
      zone.classList.add('filled');
      if (item) item.classList.add('used');
    }
  });

  scope.querySelectorAll('[data-multi-pair]').forEach(container => {
    const pairKeys = container.getAttribute('data-multi-pair').split(',');
    const chosenVals = pairKeys.map(k => userAnswers[k.trim()]).filter(Boolean);
    container.querySelectorAll('input[type="checkbox"]').forEach(box => {
      box.checked = chosenVals.includes(box.value);
    });
  });
}

function setupDragDropEngine() {
  const items = document.querySelectorAll('#insperaSplitBox .drag-item');
  const zones = document.querySelectorAll('#insperaSplitBox .drop-zone');

  items.forEach(item => {
    item.ondragstart = (e) => {
      if (isReviewMode) return;
      e.dataTransfer.setData('ans', item.dataset.answer || '');
      e.dataTransfer.setData('label', item.textContent.trim());
    };
    item.onclick = () => {
      if (isReviewMode || item.classList.contains('used')) return;
      items.forEach(i => i.style.outline = 'none');
      selectedDragItem = { ans: item.dataset.answer, label: item.textContent.trim() };
      item.style.outline = '2px solid #2563eb';
    };
  });

  function assignDropValue(zone, ans, lbl) {
    if (!ans) return;
    const oldAns = userAnswers[zone.dataset.target];
    if (oldAns) {
      const oldItem = document.querySelector(`#insperaSplitBox .drag-item[data-answer="${oldAns}"]`);
      if (oldItem) oldItem.classList.remove('used');
    }

    zone.textContent = lbl || ans;
    zone.classList.add('filled');
    const qName = zone.dataset.target;
    userAnswers[qName] = ans;

    const currentItem = document.querySelector(`#insperaSplitBox .drag-item[data-answer="${ans}"]`);
    if (currentItem) {
      currentItem.classList.add('used');
      currentItem.style.outline = 'none';
    }
    selectedDragItem = null;
    updateFooterNav();
    saveProgressToLocalOnly();
    saveCurrentPartHighlightsToMemory(activePartNum);
  }

  zones.forEach(zone => {
    zone.ondragover = (e) => {
      if (isReviewMode) return;
      e.preventDefault();
      zone.classList.add('over');
    };
    zone.ondragleave = () => zone.classList.remove('over');
    zone.ondrop = (e) => {
      if (isReviewMode) return;
      e.preventDefault();
      zone.classList.remove('over');
      const ans = e.dataTransfer.getData('ans');
      const lbl = e.dataTransfer.getData('label');
      assignDropValue(zone, ans, lbl);
    };

    zone.onclick = () => {
      if (isReviewMode) return;
      if (selectedDragItem) {
        assignDropValue(zone, selectedDragItem.ans, selectedDragItem.label);
        return;
      }
      if (zone.classList.contains('filled')) {
        const oldAns = userAnswers[zone.dataset.target];
        if (oldAns) {
          const oldItem = document.querySelector(`#insperaSplitBox .drag-item[data-answer="${oldAns}"]`);
          if (oldItem) oldItem.classList.remove('used');
        }
        zone.textContent = zone.dataset.placeholder || '';
        zone.classList.remove('filled');
        delete userAnswers[zone.dataset.target];
        updateFooterNav();
        saveProgressToLocalOnly();
        saveCurrentPartHighlightsToMemory(activePartNum);
      }
    };
  });
}

/* 9. THANH ĐIỀU HƯỚNG CÂU HỎI Ở FOOTER */
window.findPartForQuestionKey = function(qKey) {
  if (!activeExam) return 1;
  const qNum = parseInt(String(qKey || '').replace(/\D/g, ''), 10);
  const passages = activeExam.passages || [];
  for (const p of passages) {
    const html = (p.passageHtml || '') + '\n' + (p.questionsHtml || '');
    const rx = new RegExp(`(name|data-target)=["']${qKey}["']|data-question=["']${qNum}["']|data-multi-pair=["'][^"']*\\b${qKey}\\b`, 'i');
    if (rx.test(html)) return p.partNum;
  }
  return passages[0] ? passages[0].partNum : 1;
};

function buildFooterNav() {
  const container = document.getElementById('insperaFooterList');
  if (!container) return;
  container.innerHTML = '';
  if (activeExamType === 'writing' || !activeExam) return;

  const keys = Object.keys(activeExam.correctAnswers || {}).sort((a, b) => parseInt(a.replace(/\D/g, '')) - parseInt(b.replace(/\D/g, '')));
  keys.forEach(k => {
    const num = k.replace('q', '');
    const btn = document.createElement('button');
    btn.className = 'progress-item';
    btn.id = `fpill_${k}`;
    btn.textContent = num;
    btn.onclick = () => {
      const targetPart = findPartForQuestionKey(k);
      if (targetPart && targetPart !== activePartNum) {
        switchExamPassage(targetPart);
      }
      setTimeout(() => {
        const targetEl = document.querySelector(`#insperaSplitBox [data-question="${num}"]`)
          || document.querySelector(`#insperaSplitBox [name="${k}"]`)
          || document.querySelector(`#insperaSplitBox .drop-zone[data-target="${k}"]`);
        if (targetEl) {
          document.querySelectorAll('.question-scroll-focus').forEach(el => el.classList.remove('question-scroll-focus'));
          const box = targetEl.closest('.question') || targetEl;
          box.classList.add('question-scroll-focus');
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (targetEl.focus) targetEl.focus();
        }
      }, 60);
    };
    container.appendChild(btn);
  });
  updateFooterNav();
}

function updateFooterNav() {
  if (activeExamType === 'writing' || !activeExam) return;
  const keys = Object.keys(activeExam.correctAnswers || {});
  keys.forEach(k => {
    const btn = document.getElementById(`fpill_${k}`);
    if (btn && !isReviewMode) {
      const hasVal = Boolean(userAnswers[k] && String(userAnswers[k]).trim() !== '');
      btn.classList.toggle('answered', hasVal);
    }
  });
}

/* 10. CHẾ ĐỘ XEM LẠI ĐÁP ÁN (REVIEW), LOCATE EVIDENCE & GẠCH CHÂN CẤU TRÚC CÂU (S-V-O-M) */
function isAnswerCorrect(qKey) {
  const user = String(userAnswers[qKey] || '').trim().toLowerCase();
  const rawKey = String((activeExam && activeExam.correctAnswers && activeExam.correctAnswers[qKey]) || '').trim().toLowerCase();
  if (!user) return false;
  if (rawKey.includes('|')) {
    return rawKey.split('|').map(x => x.trim()).includes(user);
  }
  return user === rawKey;
}

function showReviewAnswersInDOM(scope) {
  if (!scope || !activeExam) return;
  const syntaxMap = activeExam.syntaxStructures || {};

  Object.keys(activeExam.correctAnswers || {}).sort((a, b) => parseInt(a.replace(/\D/g, '')) - parseInt(b.replace(/\D/g, ''))).forEach(k => {
    const keyVal = activeExam.correctAnswers[k];
    const userVal = userAnswers[k] || '';
    const isRight = isAnswerCorrect(k);
    const qNum = k.replace('q', '');
    const hasSyntax = Boolean(syntaxMap[k] && String(syntaxMap[k]).trim());

    const zone = scope.querySelector(`.drop-zone[data-target="${k}"]`) || scope.querySelector(`[data-target="${k}"]`);
    if (zone) {
      zone.style.borderColor = isRight ? '#16a34a' : '#dc2626';
      zone.style.background = isRight ? '#dcfce7' : '#fee2e2';

      const matchedUserItem = scope.querySelector(`.drag-item[data-answer="${userVal}"]`);
      const matchedKeyItem = scope.querySelector(`.drag-item[data-answer="${keyVal}"]`);
      const userDisplay = matchedUserItem ? matchedUserItem.textContent.trim() : (userVal || '(Blank)');
      const keyDisplay = matchedKeyItem ? matchedKeyItem.textContent.trim() : keyVal;

      if (!scope.querySelector(`.answer-indicator[data-ind="${k}"]`)) {
        const div = document.createElement('div');
        div.className = `answer-indicator ${isRight ? 'correct' : 'incorrect'}`;
        div.setAttribute('data-ind', k);
        div.innerHTML = `
          <b>Q${qNum}:</b> ${isRight ? '✓ Correct' : '✗ Incorrect'} &nbsp;|&nbsp; Your answer: <b>${userDisplay}</b> &nbsp;|&nbsp; Key: <b>${keyDisplay}</b>
          ${activeExam.explanations && activeExam.explanations[k] ? `<div style="font-size:12.5px; margin-top:4px; font-weight:normal; color:#111827;"><b>Explanation:</b> ${activeExam.explanations[k]}</div>` : ''}
          <div>
            ${activeExam.evidences && activeExam.evidences[k] ? `<button type="button" class="btn-locate" onclick="locateEvidenceSnippet('${encodeURIComponent(activeExam.evidences[k])}')">Locate Evidence</button>` : ''}
            ${hasSyntax ? `<button type="button" class="btn-syntax ${currentActiveSyntaxKey === k ? 'active-syntax' : ''}" data-syn-btn="${k}" onclick="highlightSyntaxInPassage('${k}')">🧩 Gạch chân cấu trúc</button>` : ''}
          </div>
        `;

        const inLeftPassage = Boolean(zone.closest('#insperaLeftPane'));
        const parentGroup = zone.closest('.question-group');
        if (inLeftPassage || zone.classList.contains('heading-drop')) {
          zone.insertAdjacentElement('afterend', div);
        } else if (parentGroup) {
          parentGroup.appendChild(div);
        } else {
          zone.insertAdjacentElement('afterend', div);
        }
      }
      return;
    }

    const target = scope.querySelector(`[data-question="${qNum}"]`)
      || scope.querySelector(`[name="${k}"]`)?.closest('.question')
      || scope.querySelector(`[name="${k}"]`)?.parentNode;

    if (target && !scope.querySelector(`.answer-indicator[data-ind="${k}"]`)) {
      const div = document.createElement('div');
      div.className = `answer-indicator ${isRight ? 'correct' : 'incorrect'}`;
      div.setAttribute('data-ind', k);
      div.innerHTML = `
        <b>Q${qNum}:</b> ${isRight ? '✓ Correct' : '✗ Incorrect'} &nbsp;|&nbsp; Your answer: <b>${userVal || '(Blank)'}</b> &nbsp;|&nbsp; Key: <b>${keyVal}</b>
        ${activeExam.explanations && activeExam.explanations[k] ? `<div style="font-size:12.5px; margin-top:4px; font-weight:normal; color:#111827;"><b>Explanation:</b> ${activeExam.explanations[k]}</div>` : ''}
        <div>
          ${activeExam.evidences && activeExam.evidences[k] ? `<button type="button" class="btn-locate" onclick="locateEvidenceSnippet('${encodeURIComponent(activeExam.evidences[k])}')">Locate Evidence</button>` : ''}
          ${hasSyntax ? `<button type="button" class="btn-syntax ${currentActiveSyntaxKey === k ? 'active-syntax' : ''}" data-syn-btn="${k}" onclick="highlightSyntaxInPassage('${k}')">🧩 Gạch chân cấu trúc</button>` : ''}
        </div>
      `;
      if (target.tagName === 'TR') {
        (target.closest('.question-group') || target.closest('table').parentNode).appendChild(div);
      } else {
        target.appendChild(div);
      }
    }
  });
}

function parseSyntaxSegments(rawSyntaxStr) {
  const result = { segments: [] };
  if (!rawSyntaxStr) return result;
  String(rawSyntaxStr).split('|').map(s => s.trim()).filter(Boolean).forEach(part => {
    const colonIdx = part.indexOf(':');
    if (colonIdx > 0 && colonIdx < 24) {
      const rawLabel = part.substring(0, colonIdx).trim().toLowerCase();
      const cleanPhrase = part.substring(colonIdx + 1).replace(/\([^)]*\)/g, '').replace(/^["']|["']$/g, '').trim();
      if (rawLabel === 's' || rawLabel.includes('chủ ngữ') || rawLabel.includes('subject')) result.segments.push({ role: 's', text: cleanPhrase });
      else if (rawLabel === 'v' || rawLabel.includes('động từ') || rawLabel.includes('verb')) result.segments.push({ role: 'v', text: cleanPhrase });
      else if (rawLabel === 'o' || rawLabel === 'c' || rawLabel === 'o/c' || rawLabel.includes('tân ngữ')) result.segments.push({ role: 'o', text: cleanPhrase });
      else if (rawLabel === 'm' || rawLabel.includes('mệnh đề') || rawLabel.includes('trạng ngữ')) result.segments.push({ role: 'm', text: cleanPhrase });
    }
  });
  return result;
}

function buildFlexibleQuoteRegex(quoteStr) {
  let cleaned = String(quoteStr || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/\b[A-Z][A-Z0-9\s]{1,16}:\s*/g, ' ')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim();

  let words = cleaned.split(/\s+/).filter(Boolean);
  // Nếu câu dẫn chứng bị cắt cụt chữ cuối, bỏ từ cuối bị cụt để bắt neo chính xác
  if (words.length > 5 && words[words.length - 1].length <= 2) {
    words.pop();
  }
  words = words.slice(0, 24);
  if (!words.length) return null;
  const sep = '(?:<[^>]*>|[^a-zA-Z0-9]){1,45}?';
  return new RegExp(`(${words.map(w => escapeRegex(w)).join(sep)})`, 'gi');
}

function renderCombinedPassageHighlights(scrollMode) {
  const leftPane = document.getElementById('insperaLeftPane');
  if (!leftPane || !activeExam) return;

  // Dọn sạch các lớp span highlight cũ trên cột văn bản bên trái
  leftPane.querySelectorAll('.inline-syn-seg, .passage-syntax-sentence-focus, .evidence-highlight-active').forEach(el => {
    el.outerHTML = el.innerHTML;
  });

  // 1. Vẽ lớp Locate Evidence (Tô vàng dẫn chứng)
  if (currentActiveEvidenceQuote) {
    const parts = currentActiveEvidenceQuote.split(/\s*(?:\|\||\/\/)\s*/).map(s => s.trim()).filter(Boolean);
    parts.forEach((snippet, idx) => {
      let matched = false;
      const rx = buildFlexibleQuoteRegex(snippet);
      if (rx && rx.test(leftPane.innerHTML)) {
        leftPane.innerHTML = leftPane.innerHTML.replace(rx, (m) => {
          matched = true;
          return `<span class="evidence-highlight-active" data-evi-idx="${idx}">${m}</span>`;
        });
      }
      if (!matched) {
        const shortWords = snippet.replace(/[^a-zA-Z0-9\s]/g, ' ').trim().split(/\s+/).slice(0, 7).join(' ');
        const shortRx = buildFlexibleQuoteRegex(shortWords);
        if (shortRx && shortRx.test(leftPane.innerHTML)) {
          leftPane.innerHTML = leftPane.innerHTML.replace(shortRx, `<span class="evidence-highlight-active" data-evi-idx="${idx}">$1</span>`);
        }
      }
    });
  }

  // 2. Vẽ lớp Gạch chân cấu trúc câu (S, V, O/C, M)
  if (currentActiveSyntaxKey) {
    const qKey = currentActiveSyntaxKey;
    const rawSyntax = (activeExam.syntaxStructures && activeExam.syntaxStructures[qKey]) || '';
    const parsed = parseSyntaxSegments(rawSyntax);
    let firstMatched = false;

    parsed.segments.forEach(seg => {
      const subChunks = String(seg.text || '').split(/\s*(?:\.\.\.|\/)\s*/).filter(Boolean);
      subChunks.forEach(chunk => {
        if (chunk.length < 2) return;
        const rx = buildFlexibleQuoteRegex(chunk);
        if (rx && rx.test(leftPane.innerHTML)) {
          leftPane.innerHTML = leftPane.innerHTML.replace(rx, (m) => {
            const idAttr = !firstMatched ? 'id="activeSyntaxScrollTarget"' : '';
            firstMatched = true;
            return `<span class="inline-syn-seg syn-${seg.role}" ${idAttr}>${m}</span>`;
          });
        }
      });
    });
  }

  setupDragDropEngine();
  restoreUserAnswersInDOM(document.getElementById('insperaSplitBox'));
  if (isReviewMode) {
    showReviewAnswersInDOM(document.getElementById('insperaSplitBox'));
  }

  if (scrollMode === 'evidence') {
    const allTargets = leftPane.querySelectorAll('.evidence-highlight-active');
    if (allTargets.length > 0) {
      lastEvidenceScrollIdx = (lastEvidenceScrollIdx + 1) % allTargets.length;
      const targetEl = allTargets[lastEvidenceScrollIdx] || allTargets[0];
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      alert('Không tìm thấy cụm từ dẫn chứng này trong Part hiện tại. Bạn hãy kiểm tra xem câu hỏi thuộc Part nào nhé!');
    }
  } else if (scrollMode === 'syntax') {
    const target = document.getElementById('activeSyntaxScrollTarget') || leftPane.querySelector('.inline-syn-seg');
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

window.locateEvidenceSnippet = function(encodedSnippet) {
  const snippet = decodeURIComponent(encodedSnippet || '').trim();
  if (!snippet) return;
  currentActiveEvidenceQuote = snippet;
  renderCombinedPassageHighlights('evidence');
};

window.highlightSyntaxInPassage = function(qKey) {
  if (currentActiveSyntaxKey === qKey) {
    currentActiveSyntaxKey = null;
    renderCombinedPassageHighlights(null);
    return;
  }
  currentActiveSyntaxKey = qKey;
  renderCombinedPassageHighlights('syntax');
};

/* 11. GIÁO VIÊN SỬA ĐÁP ÁN TRỰC TIẾP (EDIT KEYS) & AI BÓC TÁCH CẤU TRÚC CÂU */
function toggleTeacherEditMode() {
  isTeacherEditMode = !isTeacherEditMode;
  const btn = document.getElementById('btnToggleTeacherMode');
  if (btn) btn.textContent = isTeacherEditMode ? 'Done Editing' : 'Edit Keys';
  loadPassageView(activePartNum);
}

function injectTeacherEditBadges(scope) {
  if (!scope || !activeExam) return;
  Object.keys(activeExam.correctAnswers || {}).forEach(k => {
    const qNum = k.replace('q', '');
    const zone = scope.querySelector(`.drop-zone[data-target="${k}"]`) || scope.querySelector(`[data-target="${k}"]`);
    const target = scope.querySelector(`[data-question="${qNum}"] .question-text`)
      || scope.querySelector(`[data-question="${qNum}"] td.matrix-statement`)
      || scope.querySelector(`input[name="${k}"]`)?.parentNode;

    if (!scope.querySelector(`.teacher-edit-badge[data-edit="${k}"]`)) {
      const badge = document.createElement('span');
      badge.className = 'teacher-edit-badge';
      badge.setAttribute('data-edit', k);
      badge.textContent = `Edit ${k.toUpperCase()}`;
      badge.onclick = (e) => {
        e.stopPropagation();
        openTeacherEditModal(k);
      };
      if (zone) zone.insertAdjacentElement('afterend', badge);
      else if (target) target.appendChild(badge);
    }
  });
}

function openTeacherEditModal(k) {
  document.getElementById('editKeyName').value = k;
  document.getElementById('teacherEditTitle').textContent = `Edit Key & Evidence for ${k.toUpperCase()}`;
  document.getElementById('editKeyVal').value = (activeExam.correctAnswers && activeExam.correctAnswers[k]) || '';
  document.getElementById('editKeyExp').value = (activeExam.explanations && activeExam.explanations[k]) || '';
  document.getElementById('editKeyEvi').value = (activeExam.evidences && activeExam.evidences[k]) || '';
  if (document.getElementById('editKeySyntax')) {
    document.getElementById('editKeySyntax').value = (activeExam.syntaxStructures && activeExam.syntaxStructures[k]) || '';
  }
  openModal('teacherEditModal');
}

async function saveTeacherKeyUpdate() {
  const k = document.getElementById('editKeyName').value;
  const keyVal = document.getElementById('editKeyVal').value.trim();
  const expVal = document.getElementById('editKeyExp').value.trim();
  const eviVal = document.getElementById('editKeyEvi').value.trim();
  const synVal = document.getElementById('editKeySyntax') ? document.getElementById('editKeySyntax').value.trim() : '';

  if (!activeExam.correctAnswers) activeExam.correctAnswers = {};
  if (!activeExam.explanations) activeExam.explanations = {};
  if (!activeExam.evidences) activeExam.evidences = {};
  if (!activeExam.syntaxStructures) activeExam.syntaxStructures = {};

  activeExam.correctAnswers[k] = keyVal;
  activeExam.explanations[k] = expVal;
  activeExam.evidences[k] = eviVal;
  activeExam.syntaxStructures[k] = synVal;
  activeExam.updatedAt = Date.now();

  const clonedExam = cleanForFirestore(activeExam);
  const fs = getActiveFirestore();

  if (activeExamType === 'listening') {
    const idx = (db.listeningExams || []).findIndex(e => e.id === activeExam.id);
    if (idx >= 0) db.listeningExams[idx] = clonedExam;
    if (fs) try { await fs.collection('suite_listeningExams').doc(String(activeExam.id)).set(clonedExam); } catch (e) {}
  } else {
    const idx = (db.readingExams || []).findIndex(e => e.id === activeExam.id);
    if (idx >= 0) db.readingExams[idx] = clonedExam;
    if (fs) try { await fs.collection('suite_readingExams').doc(String(activeExam.id)).set(clonedExam); } catch (e) {}
  }

  await persist(true);
  closeModal('teacherEditModal');
  loadPassageView(activePartNum);
  alert(`✅ Đã lưu và đồng bộ vĩnh viễn đáp án câu ${k.toUpperCase()} lên Firebase!`);
}

window.aiGenerateBatchSyntaxForEditor = async function() {
  const apiKey = getEffectiveGeminiKey();
  if (!apiKey) return alert('Vui lòng nhập Gemini API Key ở nút "🤖 AI Grader Config" trước!');
  const rawEvis = document.getElementById('rePEvis') ? document.getElementById('rePEvis').value.trim() : '';
  if (!rawEvis) return alert('Hãy nhập các câu dẫn chứng vào ô "Evidence Quotes" trước!');

  const btn = document.getElementById('btnAiSyntaxBatch');
  const origText = btn.innerHTML;
  btn.innerHTML = '⏳ AI đang tách cấu trúc...';
  btn.disabled = true;

  const prompt = `Tách từng câu dẫn chứng dưới đây thành các cụm từ NGUYÊN VĂN (exact substrings) theo định dạng:
q1=S: [cụm chủ ngữ] | V: [cụm động từ] | O/C: [cụm tân ngữ/bổ ngữ] | M: [mệnh đề phụ/trạng ngữ]
Danh sách câu dẫn chứng:
${rawEvis}
Chỉ trả về văn bản thuần túy theo định dạng qX=... trên từng dòng.`;

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    if (res.ok) {
      const data = await res.json();
      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (raw.trim()) {
        document.getElementById('rePSyntax').value = raw.replace(/```[a-z]*|```/gi, '').replace(/\*\*/g, '').trim();
        alert('✅ AI đã tách xong cấu trúc câu!');
      }
    }
  } catch (e) {
    alert('Không thể kết nối AI lúc này.');
  } finally {
    btn.innerHTML = origText;
    btn.disabled = false;
  }
};

window.aiGenerateSingleSyntaxForKeyModal = async function() {
  const apiKey = getEffectiveGeminiKey();
  if (!apiKey) return alert('Vui lòng nhập Gemini API Key trước!');
  const eviVal = document.getElementById('editKeyEvi') ? document.getElementById('editKeyEvi').value.trim() : '';
  if (!eviVal) return alert('Hãy điền câu dẫn chứng vào ô Evidence Quote trước!');

  const btn = document.getElementById('btnAiSyntaxSingle');
  const origText = btn.innerHTML;
  btn.innerHTML = '⏳ Đang bóc tách...';
  btn.disabled = true;

  const prompt = `Tách câu tiếng Anh sau thành các cụm từ NGUYÊN VĂN theo định dạng 1 dòng:
S: [chủ ngữ] | V: [động từ] | O/C: [tân ngữ/bổ ngữ] | M: [mệnh đề phụ]
Câu: "${eviVal}"`;

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    if (res.ok) {
      const data = await res.json();
      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (raw.trim()) {
        document.getElementById('editKeySyntax').value = raw.replace(/\r?\n/g, ' ').replace(/\*\*/g, '').trim();
      }
    }
  } catch (e) {} finally {
    btn.innerHTML = origText;
    btn.disabled = false;
  }
};

/* 12. THANH KÉO CHIA ĐÔI MÀN HÌNH, ĐỒNG HỒ ĐẾM NGƯỢC & PHÒNG THI WRITING */
function setupResizer() {
  const resizer = document.getElementById('insperaResizer');
  const left = document.getElementById('insperaLeftPane');
  const right = document.getElementById('insperaRightPane');
  const box = document.getElementById('insperaSplitBox');
  if (!resizer || !left || !right || !box) return;

  resizer.onmousedown = (e) => {
    e.preventDefault();
    const onMove = (moveEvt) => {
      const rect = box.getBoundingClientRect();
      const w = ((moveEvt.clientX - rect.left) / rect.width) * 100;
      if (w > 22 && w < 78) {
        left.style.width = `${w}%`;
        right.style.width = `${100 - w}%`;
      }
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };
}

function startTimer() {
  clearInterval(examTimer);
  const timerEl = document.getElementById('insperaTimer');
  examTimer = setInterval(() => {
    if (isReviewMode) {
      if (timerEl) timerEl.textContent = 'REVIEW MODE';
      return;
    }
    if (secondsRemaining <= 0) {
      clearInterval(examTimer);
      alert('Time has expired! Submitting your exam automatically.');
      submitExam(true);
      return;
    }
    secondsRemaining--;
    const m = String(Math.floor(secondsRemaining / 60)).padStart(2, '0');
    const s = String(secondsRemaining % 60).padStart(2, '0');
    if (timerEl) timerEl.textContent = `${m}:${s}`;
  }, 1000);
}

function exitExamShell() {
  if (confirm('Exit exam room and return to dashboard?')) {
    clearInterval(examTimer);
    stopAllAudioPlayers();
    window.mockFlowState.active = false;
    document.getElementById('examShell').style.display = 'none';
    document.getElementById('dashboardApp').style.display = 'flex';
    renderDashboard();
  }
}

function extractTask1ChartImageSrc(wExam) {
  if (!wExam) return '';
  const t1 = wExam.task1 || {};
  const directUrl = t1.image || t1.imageUrl || t1.img || wExam.image || '';
  if (directUrl && String(directUrl).trim()) return String(directUrl).trim();
  const m = String(t1.prompt || '').match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : '';
}

function switchWritingTask(taskNum) {
  const currentEditor = document.getElementById('writingEditor');
  if (currentEditor) {
    if (activePartNum === 1) writingAnswers.task1 = currentEditor.value;
    else writingAnswers.task2 = currentEditor.value;
  }
  activePartNum = taskNum;

  const wtab1 = document.getElementById('wtab_1');
  const wtab2 = document.getElementById('wtab_2');
  if (wtab1) wtab1.classList.toggle('active', taskNum === 1);
  if (wtab2) wtab2.classList.toggle('active', taskNum === 2);

  const foot1 = document.getElementById('wfoot_1');
  const foot2 = document.getElementById('wfoot_2');
  if (foot1) {
    foot1.classList.toggle('current', taskNum === 1);
    foot1.classList.toggle('answered', (writingAnswers.task1 || '').trim().length > 0);
  }
  if (foot2) {
    foot2.classList.toggle('current', taskNum === 2);
    foot2.classList.toggle('answered', (writingAnswers.task2 || '').trim().length > 0);
  }

  loadWritingWorkspace(taskNum);
}

function loadWritingWorkspace(taskNum) {
  const left = document.getElementById('insperaLeftPane');
  const right = document.getElementById('insperaRightPane');
  const resizer = document.getElementById('insperaResizer');
  const isTask1 = (taskNum === 1);
  const taskData = (isTask1 ? activeExam.task1 : activeExam.task2) || {};
  const savedText = (isTask1 ? writingAnswers.task1 : writingAnswers.task2) || '';
  const chartImg = isTask1 ? extractTask1ChartImageSrc(activeExam) : '';

  left.style.display = 'block';
  resizer.style.display = 'flex';
  left.style.width = '50%';
  right.style.width = '50%';

  document.getElementById('insperaPartInstructionText').innerHTML = isTask1
    ? `<b>Part 1</b> &nbsp; You should spend about 20 minutes on this task. Write at least 150 words.`
    : `<b>Part 2</b> &nbsp; You should spend about 40 minutes on this task. Write at least 250 words.`;

  left.innerHTML = `
    <h2 class="section-title">Writing Task ${taskNum}</h2>
    <div style="font-size: 15px; line-height: 1.7; margin-bottom: 18px; color: #111827; white-space: pre-wrap;">${taskData.prompt || ''}</div>
    ${chartImg ? `<div style="margin-top: 14px;"><img src="${chartImg}" style="max-width: 100%; border: 1px solid #9ca3af; border-radius: 4px;" alt="Task 1 Visual"></div>` : ''}
  `;

  right.innerHTML = `
    <textarea 
      id="writingEditor" 
      spellcheck="false"
      autocorrect="off"
      autocapitalize="off"
      autocomplete="off"
      style="width: 100%; height: calc(100vh - 210px); font-size: 15px; line-height: 1.7; padding: 14px; resize: none; outline: none; border: 1px solid #4b5563; border-radius: 2px;"
      placeholder="Type your response here..."
      oninput="handleWritingInput(this.value)"
    ></textarea>
    <div style="margin-top:8px; font-size:13px; font-weight:700; color:#111827;" id="inlineWordBadge">Word count: 0</div>
  `;

  const editorEl = document.getElementById('writingEditor');
  if (editorEl) editorEl.value = savedText;
  updateWordCountDisplay(savedText);
}

function handleWritingInput(text) {
  if (activePartNum === 1) writingAnswers.task1 = text;
  else writingAnswers.task2 = text;
  updateWordCountDisplay(text);
  saveProgressToLocalOnly();
}

function updateWordCountDisplay(text) {
  const words = (text || '').trim() ? text.trim().split(/\s+/).length : 0;
  const display = document.getElementById('writingWordCountDisplay');
  const inlineBadge = document.getElementById('inlineWordBadge');
  if (display) display.textContent = `Word count: ${words}`;
  if (inlineBadge) inlineBadge.textContent = `Word count: ${words}`;
}

/* 13. NỘP BÀI (SUBMIT EXAM / FINISH EXAM), TÍNH ĐIỂM CHUẨN & CHUYỂN TIẾP MOCK TEST */
function getTodayIsoString() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function calculateReadingListeningScoreAndBand() {
  let correct = 0;
  let total = 0;
  const keys = Object.keys((activeExam && activeExam.correctAnswers) || {});
  keys.forEach(k => {
    total++;
    if (isAnswerCorrect(k)) correct++;
  });

  let band = '4.0';
  if (total === 40) {
    if (correct >= 39) band = '9.0';
    else if (correct >= 37) band = '8.5';
    else if (correct >= 35) band = '8.0';
    else if (correct >= 33) band = '7.5';
    else if (correct >= 30) band = '7.0';
    else if (correct >= 27) band = '6.5';
    else if (correct >= 23) band = '6.0';
    else if (correct >= 19) band = '5.5';
    else if (correct >= 15) band = '5.0';
    else if (correct >= 13) band = '4.5';
  } else {
    const pct = total > 0 ? (correct / total) : 0;
    if (pct >= 0.95) band = '9.0';
    else if (pct >= 0.88) band = '8.5';
    else if (pct >= 0.82) band = '8.0';
    else if (pct >= 0.75) band = '7.5';
    else if (pct >= 0.68) band = '7.0';
    else if (pct >= 0.58) band = '6.5';
    else if (pct >= 0.48) band = '6.0';
    else if (pct >= 0.38) band = '5.5';
    else if (pct >= 0.28) band = '5.0';
    else if (pct >= 0.18) band = '4.5';
  }

  return { correct, total, band };
}

window.submitExam = async function(forceSubmit = false) {
  if (!activeExam || !activeUser) return;

  const isMock = Boolean(window.mockFlowState && window.mockFlowState.active);
  let confirmMsg = 'Are you sure you want to submit your test now?';
  if (isMock) {
    if (activeExamType === 'listening' && window.mockFlowState.readingExamId) {
      confirmMsg = 'Nộp bài Listening và chuyển sang phần thi tiếp theo: READING?';
    } else if (activeExamType === 'reading' && window.mockFlowState.writingExamId) {
      confirmMsg = 'Nộp bài Reading và chuyển sang phần thi cuối: WRITING?';
    } else {
      confirmMsg = 'Nộp bài Writing và hoàn tất toàn bộ kỳ thi Full Mock Test?';
    }
  }

  if (!forceSubmit && !confirm(confirmMsg)) return;
  clearInterval(examTimer);

  const fs = getActiveFirestore();
  const tabViolationsNote = window.__tabSwitchCount > 0 ? ` [⚠️ Rời tab: ${window.__tabSwitchCount}]` : '';

  // TRƯỜNG HỢP 1: NỘP BÀI WRITING
  if (activeExamType === 'writing') {
    const currentEditor = document.getElementById('writingEditor');
    if (currentEditor) {
      if (activePartNum === 1) writingAnswers.task1 = currentEditor.value;
      else writingAnswers.task2 = currentEditor.value;
    }

    const w1Count = (writingAnswers.task1 || '').trim() ? writingAnswers.task1.trim().split(/\s+/).length : 0;
    const w2Count = (writingAnswers.task2 || '').trim() ? writingAnswers.task2.trim().split(/\s+/).length : 0;

    const btnTop = document.getElementById('btnSubmitExam');
    const btnBot = document.getElementById('btnSubmitBottom');
    if (btnTop) { btnTop.textContent = '⏳ Submitting...'; btnTop.disabled = true; }
    if (btnBot) { btnBot.textContent = '⏳ Submitting...'; btnBot.disabled = true; }

    let finalBand = 'Submitted';
    let finalFeedback = '';

    // Tài khoản PRO được AI tự động chấm Writing ngay khi nộp
    if (isStudentPro(activeUser) && db.aiConfig && db.aiConfig.autoGrade && getEffectiveGeminiKey()) {
      try {
        const evalRes = await Promise.race([
          callGeminiWritingEvaluator(activeExam, writingAnswers),
          new Promise((_, rej) => setTimeout(() => rej(new Error('AI Timeout')), 12000))
        ]);
        if (evalRes && evalRes.band) {
          finalBand = `Band ${evalRes.band}`;
          finalFeedback = evalRes.feedback || '';
        }
      } catch (aiErr) {
        console.warn('Auto AI grading skipped:', aiErr.message);
      }
    }

    const newRes = cleanForFirestore({
      id: 'res_w_' + Date.now(),
      examId: activeExam.id,
      userName: activeUser.name,
      examTitle: activeExam.title + tabViolationsNote,
      score: `T1: ${w1Count}w | T2: ${w2Count}w`,
      band: finalBand,
      teacherFeedback: finalFeedback,
      writingSubmission: { ...writingAnswers },
      tabSwitches: window.__tabSwitchCount || 0,
      isoDate: getTodayIsoString(),
      timestamp: new Date().toLocaleString()
    });

    if (!db.results) db.results = [];
    db.results.push(newRes);

    if (fs) {
      try {
        await Promise.race([
          fs.collection('suite_results').doc(String(newRes.id)).set(newRes),
          new Promise(r => setTimeout(r, 2500))
        ]);
      } catch (e) {}
    }
    await persist(true);

    if (btnTop) { btnTop.textContent = 'Submit'; btnTop.disabled = false; }
    if (btnBot) { btnBot.textContent = 'Finish Test ✓'; btnBot.disabled = false; }

    stopAllAudioPlayers();
    document.getElementById('examShell').style.display = 'none';
    document.getElementById('dashboardApp').style.display = 'flex';
    renderDashboard();

    if (isMock) {
      window.mockFlowState.scores.writing = finalBand;
      const lScore = window.mockFlowState.scores.listening || 'N/A';
      const rScore = window.mockFlowState.scores.reading || 'N/A';
      window.mockFlowState.active = false;
      alert(`🎉 HOÀN THÀNH FULL MOCK TEST!\n\n• 🎧 Listening: ${lScore}\n• 📖 Reading: ${rScore}\n• ✍️ Writing: ${finalBand} (T1: ${w1Count}w | T2: ${w2Count}w)\n\nBài làm của bạn đã được lưu thành công!`);
    } else {
      openStudentViewWritingModal(newRes.id);
    }
    return;
  }

  // TRƯỜNG HỢP 2: NỘP BÀI LISTENING HOẶC READING
  const { correct, total, band } = calculateReadingListeningScoreAndBand();

  const res = cleanForFirestore({
    id: 'res_' + Date.now(),
    examId: activeExam.id,
    userName: activeUser.name,
    examTitle: activeExam.title + tabViolationsNote,
    score: `${correct}/${total}`,
    band: band,
    userAnswersCopy: JSON.parse(JSON.stringify(userAnswers || {})),
    tabSwitches: window.__tabSwitchCount || 0,
    isoDate: getTodayIsoString(),
    timestamp: new Date().toLocaleString()
  });

  if (!db.results) db.results = [];
  db.results.push(res);

  if (fs) {
    try {
      await Promise.race([
        fs.collection('suite_results').doc(String(res.id)).set(res),
        new Promise(r => setTimeout(r, 2500))
      ]);
    } catch (e) {}
  }
  await persist(true);

  // Chuyển tiếp tự động nếu đang trong kỳ thi Full Mock Test (Listening -> Reading -> Writing)
  if (isMock) {
    if (activeExamType === 'listening') {
      window.mockFlowState.scores.listening = `Band ${band} (${correct}/${total})`;
      stopAllAudioPlayers();
      if (window.mockFlowState.readingExamId) {
        window.mockFlowState.step = 'reading';
        alert(`✅ Đã nộp phần Listening: Band ${band} (${correct}/${total} câu đúng).\n\nBấm OK để chuyển sang phần thi READING!`);
        launchReadingExam(window.mockFlowState.readingExamId);
        return;
      } else if (window.mockFlowState.writingExamId) {
        window.mockFlowState.step = 'writing';
        alert(`✅ Đã nộp phần Listening: Band ${band} (${correct}/${total} câu đúng).\n\nBấm OK để chuyển sang phần thi WRITING!`);
        launchWritingExam(window.mockFlowState.writingExamId);
        return;
      }
    } else if (activeExamType === 'reading') {
      window.mockFlowState.scores.reading = `Band ${band} (${correct}/${total})`;
      if (window.mockFlowState.writingExamId) {
        window.mockFlowState.step = 'writing';
        alert(`✅ Đã nộp phần Reading: Band ${band} (${correct}/${total} câu đúng).\n\nBấm OK để chuyển sang phần thi cuối: WRITING!`);
        launchWritingExam(window.mockFlowState.writingExamId);
        return;
      }
    }
    window.mockFlowState.active = false;
  }

  document.getElementById('summaryBandDisplay').textContent = `Band ${band}`;
  document.getElementById('summaryScoreDisplay').textContent = `Correct: ${correct} / ${total} questions`;
  openModal('scoreSummaryModal');
};

// Khai báo chuẩn finishExam = submitExam để không bao giờ bị lỗi đỏ Console
window.finishExam = window.submitExam;

function closeScoreSummaryToDashboard() {
  closeModal('scoreSummaryModal');
  stopAllAudioPlayers();
  document.getElementById('examShell').style.display = 'none';
  document.getElementById('dashboardApp').style.display = 'flex';
  renderDashboard();
}

function enterReviewModeFromSummary() {
  closeModal('scoreSummaryModal');
  isReviewMode = true;
  document.getElementById('btnSubmitExam').style.display = 'none';
  document.getElementById('btnSubmitBottom').style.display = 'none';
  document.getElementById('insperaTimer').textContent = 'REVIEW MODE';

  loadPassageView(activePartNum);

  Object.keys(activeExam.correctAnswers || {}).forEach(k => {
    const btn = document.getElementById(`fpill_${k}`);
    if (btn) {
      btn.classList.remove('answered');
      const hasVal = Boolean(userAnswers[k] && String(userAnswers[k]).trim() !== '');
      if (!hasVal) btn.classList.add('review-unanswered');
      else btn.classList.add(isAnswerCorrect(k) ? 'correct' : 'incorrect');
    }
  });
}

function reopenReviewFromHistory(resId) {
  const res = (db.results || []).find(r => r.id === resId);
  if (!res) return;
  const lExam = (db.listeningExams || []).find(e => e.id === res.examId);
  if (lExam) {
    launchListeningExam(lExam.id);
  } else {
    const rExam = (db.readingExams || []).find(e => e.id === res.examId) || db.readingExams[0];
    if (!rExam) return;
    launchExam(rExam.id);
  }
  userAnswers = res.userAnswersCopy || {};
  enterReviewModeFromSummary();
}