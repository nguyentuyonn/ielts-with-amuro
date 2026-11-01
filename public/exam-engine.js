/* === MODULE PART 19 (Lines 17273-17491) === */
// 1. Hàm trích xuất hình ảnh Biểu đồ / Bản đồ của Task 1 từ dữ liệu đề thi
  function extractTask1ChartImageSrc(wExam) {
    if (!wExam) return '';
    const t1 = wExam.task1 || {};
    const directUrl = t1.image || t1.imageUrl || t1.img || t1.chartUrl || t1.mediaUrl || wExam.image || wExam.imageUrl || '';
    if (directUrl && String(directUrl).trim()) return String(directUrl).trim();

    // Nếu ảnh được nhúng dạng thẻ <img src="..."> bên trong chuỗi prompt của Task 1
    const promptStr = String(t1.prompt || '');
    const imgMatch = promptStr.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch && imgMatch[1]) return imgMatch[1];

    return '';
  }

  window.openRewriteChartZoom = function(imgSrc) {
    if (!imgSrc) return;
    const overlay = document.getElementById('rewriteChartZoomOverlay');
    const imgEl = document.getElementById('rewriteChartZoomImg');
    if (overlay && imgEl) {
      imgEl.src = imgSrc;
      overlay.style.display = 'flex';
    }
  };

  // 2. Hàm bóc tách RIÊNG các lỗi cần sửa & điểm cần cải thiện (Lọc bỏ phần khen và lý thuyết dài dòng)
  function extractActionableFeedbackForRewrite(rawFb) {
    const text = String(rawFb || '').trim();
    if (!text) {
      return { fixes: [], improvements: ['Hãy đọc kỹ lại bài viết, rà soát lỗi chính tả, ngữ pháp và nâng cấp các từ vựng lặp lại.'] };
    }

    const fixes = [];
    const arrowRegex = /([^\n\->➔]{3,75})\s*(?:->|➔|=>)\s*([^\n]{3,85})/g;
    let m;
    while ((m = arrowRegex.exec(text)) !== null && fixes.length < 10) {
      const bad = m[1].replace(/^[\s•\-\*1-9.]+/, '').replace(/["“”]/g, '').trim();
      const good = m[2].replace(/["“”]/g, '').trim();
      if (bad && good && bad.length < 70) {
        fixes.push({ bad, good });
      }
    }

    // Lọc lấy các dòng chỉ ra lỗi sai / điểm cần cải thiện (Areas for Improvement, Hạn chế, Cần cải thiện, Tuy nhiên, Lỗi...)
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const improvements = [];

    lines.forEach(line => {
      const clean = line.replace(/^[\s•\-\*]+/, '').trim();
      if (clean.length < 25) return;
      if (clean.includes('->') || clean.includes('➔')) return;

      // Bỏ qua các dòng khen ngợi thuần túy (Strengths / Điểm mạnh / Hoàn thành xuất sắc)
      if (/^(?:Strengths|Điểm mạnh|Ưu điểm)\s*:/i.test(clean)) return;
      if (/hoàn thành xuất sắc yêu cầu đề bài/i.test(clean) && !/tuy nhiên|cần|nhưng|hạn chế/i.test(clean)) return;

      const isActionable = /(?:Areas?\s*for\s*Improvement|Weakness|To\s*improve|Suggestion|Fix|Error|Mistake|Instead\s*of|Avoid|Should|Could\s*be\s*improved|Hạn\s*chế|Cần\s*cải\s*thiện|Cần\s*khắc\s*phục|Cần\s*lưu\s*ý|Cần\s*sửa|Lỗi|Tuy\s*nhiên|Chú\s*ý|Nên\s*dùng|Nâng\s*cấp)/i.test(clean);

      if (isActionable) {
        // Làm gọn nhãn đầu dòng cho dễ đọc
        const stripped = clean.replace(/^(?:Areas?\s*for\s*Improvement|Điểm\s*cần\s*cải\s*thiện|Hạn\s*chế)\s*:\s*/i, '');
        improvements.push(stripped);
      }
    });

    // Nếu bài nhận xét viết tự do không có từ khóa đặc trưng, lấy 3-4 dòng ngắn gọn nhất không phải tiêu đề
    if (!improvements.length) {
      lines.forEach(line => {
        const clean = line.replace(/^[\s•\-\*]+/, '').trim();
        if (
          clean.length > 35 &&
          !clean.startsWith('[') &&
          !clean.includes('->') &&
          !clean.includes('➔') &&
          !/^(?:OVERALL|DETAILED\s*EVALUATION|Strengths)/i.test(clean) &&
          improvements.length < 4
        ) {
          improvements.push(clean);
        }
      });
    }

    return { fixes, improvements: improvements.slice(0, 6) };
  }

  // 3. Ghi đè hàm mở cửa sổ Rewrite V2 với bố cục rộng thoáng + Hiện biểu đồ Task 1 + Nhận xét lọc gọn
  window.openWritingRewriteModal = function(resId) {
    const res = (db.results || []).find(r => r.id === resId);
    if (!res) return alert('Không tìm thấy bài nộp Writing!');
    activeRewriteResId = resId;

    const wExam = (db.writingExams || []).find(e => e.id === res.examId);
    const stuT1 = String(res.writingSubmission?.task1 || '').trim();
    const stuT2 = String(res.writingSubmission?.task2 || '').trim();
    const scoreStr = String(res.score || '');

    // Xác định học sinh đã làm Task nào trong lần nộp này
    const didT1 = stuT1.length > 0 || (!stuT2.length && Boolean(wExam?.task1?.prompt) && !scoreStr.includes('T1: 0w'));
    const didT2 = stuT2.length > 0 || (!stuT1.length && Boolean(wExam?.task2?.prompt) && !scoreStr.includes('T2: 0w'));

    const savedV2T1 = res.rewriteSubmission?.task1 || stuT1;
    const savedV2T2 = res.rewriteSubmission?.task2 || stuT2;

    const chartImgSrc = extractTask1ChartImageSrc(wExam);
    const rawFb = String(res.teacherFeedback || '');
    const parsedFb = extractActionableFeedbackForRewrite(rawFb);

    document.getElementById('writingRewriteModalTitle').innerHTML = `✏️ Viết Lại Bản Sửa (Rewrite V2) — <span style="color:#a7f3d0;">${res.examTitle}</span>`;
    const expBtn = document.getElementById('btnExportDocFromRewrite');
    if (expBtn) expBtn.onclick = () => exportWritingFeedbackToDoc(res.id);

    const body = document.getElementById('writingRewriteModalBody');
    body.innerHTML = `
      <div class="rewrite-v7-grid">
        <!-- CỘT TRÁI (40%): ĐỀ BÀI + ẢNH BIỂU ĐỒ TASK 1 + LỖI CẦN SỬA TRỌNG TÂM -->
        <div class="rewrite-v7-left">
          <!-- Khối Đề bài & Biểu đồ Task 1 -->
          <div style="background:#ffffff; border:1px solid #cbd5e1; border-radius:12px; padding:13px 15px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <span style="font-weight:800; color:#1f3d32; font-size:13.5px;">📌 Đề Bài & Biểu Đồ Đối Chiếu</span>
              <span style="background:#1f3d32; color:#ffffff; padding:3px 10px; border-radius:99px; font-size:12px; font-weight:800;">
                ${String(res.band).startsWith('Band') ? res.band : 'Band ' + res.band}
              </span>
            </div>

            ${didT1 && wExam?.task1?.prompt ? `
              <div style="font-size:13px; color:#1e293b; line-height:1.55; margin-bottom:6px;">
                <b style="color:#065f46;">Task 1:</b> ${wExam.task1.prompt}
              </div>
            ` : ''}

            ${didT1 && chartImgSrc ? `
              <div class="rewrite-chart-img-box">
                <img src="${chartImgSrc}" alt="Task 1 Chart" onclick="openRewriteChartZoom('${chartImgSrc.replace(/'/g, "\\'")}')" title="Bấm vào biểu đồ để phóng to toàn màn hình">
                <div style="font-size:11px; color:#64748b; margin-top:4px; font-weight:700;">🔍 Bấm vào biểu đồ để phóng to xem rõ số liệu</div>
              </div>
            ` : ''}

            ${didT2 && wExam?.task2?.prompt ? `
              <div style="font-size:13px; color:#1e293b; line-height:1.55; margin-top:${didT1 ? '10px' : '0'};">
                <b style="color:#065f46;">Task 2:</b> ${wExam.task2.prompt}
              </div>
            ` : ''}
          </div>

          <!-- Khối 1: Các cặp từ / diễn đạt cần thay thế ngay -->
          <div style="background:#ffffff; border:1px solid #cbd5e1; border-radius:12px; padding:13px 15px;">
            <div style="font-weight:800; color:#92400e; font-size:13.5px; margin-bottom:8px;">
              🛠️ 1. Các Cụm Từ & Câu Cần Sửa / Nâng Cấp Trực Tiếp
            </div>
            ${!parsedFb.fixes.length ? `
              <div style="font-size:12.5px; color:#64748b; font-style:italic;">
                Hãy đối chiếu các điểm cần cải thiện bên dưới để nâng cấp từ vựng và cấu trúc câu.
              </div>
            ` : parsedFb.fixes.map(fx => `
              <div class="rewrite-fix-pair-item">
                <span style="color:#dc2626; text-decoration:line-through; font-weight:700;">"${fx.bad}"</span>
                &nbsp; ➔ &nbsp;
                <span style="color:#065f46; font-weight:800; background:#dcfce7; padding:1px 6px; border-radius:5px;">"${fx.good}"</span>
              </div>
            `).join('')}
          </div>

          <!-- Khối 2: Chỉ hiện các điểm cần cải thiện (Areas for Improvement) -->
          <div style="background:#f0fdf4; border:1px solid #86efac; border-radius:12px; padding:13px 15px;">
            <div style="font-weight:800; color:#065f46; font-size:13.5px; margin-bottom:8px;">
              🎯 2. Điểm Cần Cải Thiện Trọng Tâm Khi Viết Lại
            </div>
            <div style="display:flex; flex-direction:column; gap:8px;">
              ${parsedFb.improvements.map(imp => `
                <div style="font-size:13px; color:#1e293b; line-height:1.55; background:#ffffff; padding:8px 11px; border-radius:8px; border:1px solid #bbf7d0;">
                  • ${imp}
                </div>
              `).join('')}
            </div>

            ${rawFb ? `
              <details style="margin-top:10px; font-size:12px; color:#475569;">
                <summary style="cursor:pointer; font-weight:700; color:#065f46;">👁️ Xem toàn bộ nhận xét gốc đầy đủ</summary>
                <div style="white-space:pre-wrap; background:#ffffff; padding:10px; border-radius:8px; border:1px solid #cbd5e1; margin-top:6px; max-height:220px; overflow-y:auto;">${rawFb}</div>
              </details>
            ` : ''}
          </div>
        </div>

        <!-- CỘT PHẢI (60%): KHUNG SOẠN THẢO BẢN SỬA CAO THOÁNG RỘNG RÃI -->
        <div class="rewrite-v7-right">
          ${didT1 ? `
            <div class="rewrite-task-editor-card" style="${didT1 && didT2 ? 'min-height:280px;' : 'min-height:100%;'}">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <label style="font-weight:800; font-size:14.5px; color:#1f3d32;">✍️ Không Gian Viết Lại Bản Sửa Task 1 (Version 2):</label>
                <span id="rewriteT1WordCount" style="background:#ecfdf5; color:#059669; border:1px solid #a7f3d0; padding:3px 12px; border-radius:99px; font-size:12.5px; font-weight:800;">0 words</span>
              </div>
              <textarea id="rewriteInputTask1" class="rewrite-v7-textarea" style="${didT1 && didT2 ? 'min-height:220px;' : 'min-height:450px;'}"
                placeholder="Sửa lại bài viết Task 1 của bạn tại đây..."
                oninput="updateRewriteWordCounts()">${savedV2T1}</textarea>
            </div>
          ` : ''}

          ${didT2 ? `
            <div class="rewrite-task-editor-card" style="${didT1 && didT2 ? 'min-height:320px;' : 'min-height:100%;'}">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <label style="font-weight:800; font-size:14.5px; color:#1f3d32;">✍️ Không Gian Viết Lại Bản Sửa Task 2 (Version 2):</label>
                <span id="rewriteT2WordCount" style="background:#ecfdf5; color:#059669; border:1px solid #a7f3d0; padding:3px 12px; border-radius:99px; font-size:12.5px; font-weight:800;">0 words</span>
              </div>
              <textarea id="rewriteInputTask2" class="rewrite-v7-textarea" style="${didT1 && didT2 ? 'min-height:260px;' : 'min-height:450px;'}"
                placeholder="Sửa lại bài viết Task 2 của bạn tại đây..."
                oninput="updateRewriteWordCounts()">${savedV2T2}</textarea>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    openModal('writingRewriteModal');
    setTimeout(updateRewriteWordCounts, 50);
  };

/* === MODULE PART 20 (Lines 17591-17796) === */
/* ==========================================================================
     1. BỘ NHỚ LƯU VẾT HIGHLIGHT THEO TỪNG PART (KHÔNG BỊ MẤT KHI CHUYỂN PART)
     ========================================================================== */
  let partHighlightCache = {
    examId: null,
    isReview: null,
    leftByPart: {},
    rightByPart: {}
  };

  function resetPartHighlightCacheIfNeeded() {
    const curExamId = activeExam ? activeExam.id : null;
    const curRev = Boolean(isReviewMode);
    if (partHighlightCache.examId !== curExamId || partHighlightCache.isReview !== curRev) {
      partHighlightCache = {
        examId: curExamId,
        isReview: curRev,
        leftByPart: {},
        rightByPart: {}
      };
    }
  }

  // Lưu lại HTML đã tô màu của Part hiện tại (Xóa tạm vệt nháy Locate Evidence để chỉ lưu vết Highlight của học sinh)
  function saveCurrentPartHighlightsToCache(partNum) {
    if (!activeExam || !partNum) return;
    resetPartHighlightCacheIfNeeded();

    const leftPane = document.getElementById('insperaLeftPane');
    const rightPane = document.getElementById('insperaRightPane');

    if (leftPane && (leftPane.querySelector('.user-hl-yellow') || leftPane.querySelector('.user-hl-green') || partHighlightCache.leftByPart[partNum])) {
      const cloneL = leftPane.cloneNode(true);
      cloneL.querySelectorAll('.evidence-highlight-active').forEach(el => {
        const p = el.parentNode;
        while (el.firstChild) p.insertBefore(el.firstChild, el);
        p.removeChild(el);
      });
      partHighlightCache.leftByPart[partNum] = cloneL.innerHTML;
    }

    if (rightPane && (rightPane.querySelector('.user-hl-yellow') || rightPane.querySelector('.user-hl-green') || partHighlightCache.rightByPart[partNum])) {
      partHighlightCache.rightByPart[partNum] = rightPane.innerHTML;
    }
  }

  // Khôi phục lại vết Highlight của Part vừa mở
  function restorePartHighlightsFromCache(partNum) {
    if (!activeExam || !partNum) return;
    resetPartHighlightCacheIfNeeded();

    const leftPane = document.getElementById('insperaLeftPane');
    const rightPane = document.getElementById('insperaRightPane');

    if (leftPane && partHighlightCache.leftByPart[partNum]) {
      leftPane.innerHTML = partHighlightCache.leftByPart[partNum];
    }

    if (rightPane && partHighlightCache.rightByPart[partNum]) {
      rightPane.innerHTML = partHighlightCache.rightByPart[partNum];
      if (typeof setupDragDropEngine === 'function') setupDragDropEngine();
      if (typeof restoreUserAnswersInDOM === 'function') {
        restoreUserAnswersInDOM(document.getElementById('insperaSplitBox'));
      }
      if (isReviewMode && typeof injectSaveMistakeButtonsInReviewDOM === 'function') {
        injectSaveMistakeButtonsInReviewDOM();
      }
    }
  }

  // Bọc hàm switchExamPassage để tự động Lưu Part cũ -> Chuyển Part -> Khôi phục Part mới
  const _v8OrigSwitchExamPassage = switchExamPassage;
  switchExamPassage = function(partNum) {
    if (activeExam && activePartNum) {
      saveCurrentPartHighlightsToCache(activePartNum);
    }
    _v8OrigSwitchExamPassage(partNum);
    restorePartHighlightsFromCache(partNum);
  };

  // Tự động cập nhật ngay vào bộ nhớ mỗi khi học sinh bấm tô màu (Keyword / Evidence) hoặc Xóa màu
  const _v8OrigApplyHighlight = window.applyUserTextHighlight;
  window.applyUserTextHighlight = function(colorType, ev) {
    if (typeof _v8OrigApplyHighlight === 'function') {
      _v8OrigApplyHighlight(colorType, ev);
    }
    if (activeExam && activePartNum) {
      saveCurrentPartHighlightsToCache(activePartNum);
    }
  };

  const _v8OrigClearHighlight = window.clearSelectedHighlights;
  window.clearSelectedHighlights = function(ev) {
    if (typeof _v8OrigClearHighlight === 'function') {
      _v8OrigClearHighlight(ev);
    }
    if (activeExam && activePartNum) {
      // Cập nhật lại bản đã xóa màu vào cache của Part hiện tại
      const leftPane = document.getElementById('insperaLeftPane');
      const rightPane = document.getElementById('insperaRightPane');
      if (leftPane) partHighlightCache.leftByPart[activePartNum] = leftPane.innerHTML;
      if (rightPane) partHighlightCache.rightByPart[activePartNum] = rightPane.innerHTML;
    }
  };

  // Reset bộ nhớ highlight khi bắt đầu mở một đề mới
  const _v8OrigLaunchReading = launchReadingExam;
  launchReadingExam = function(examId) {
    partHighlightCache = { examId, isReview: false, leftByPart: {}, rightByPart: {} };
    _v8OrigLaunchReading(examId);
  };

  const _v8OrigLaunchListening = launchListeningExam;
  launchListeningExam = function(examId) {
    partHighlightCache = { examId, isReview: false, leftByPart: {}, rightByPart: {} };
    _v8OrigLaunchListening(examId);
  };

  const _v8OrigReopenReview = reopenReviewFromHistory;
  reopenReviewFromHistory = function(resId) {
    partHighlightCache = { examId: null, isReview: true, leftByPart: {}, rightByPart: {} };
    _v8OrigReopenReview(resId);
  };

  /* ==========================================================================
     2. THU GỌN THANH TOPBAR TRÊN CÙNG CHO THOÁNG MẮT
        - Gom 2 menu "Standard Text" và "Black on White" vào nút "⚙️ Hiển thị"
        - Tinh giản thanh trượt Speed (Bỏ nhãn thừa & nút 1.0x trùng lặp)
        - Rút gọn chữ "Candidate:" trên thanh tiêu đề
     ========================================================================== */
  function compactExamTopbarLayout() {
    const overlay = document.getElementById('insperaExamOverlay');
    if (!overlay || overlay.style.display === 'none') return;

    // 2.1. Tinh giản thanh kéo tốc độ Audio (chỉ giữ [Slider] + nhãn 1.0x có thể bấm để reset)
    const speedWrap = overlay.querySelector('.audio-speed-slider-wrap');
    if (speedWrap && !speedWrap.getAttribute('data-compacted')) {
      speedWrap.setAttribute('data-compacted', '1');
      const curVal = document.getElementById('listeningSpeedRangeInput')?.value || '1.0';
      speedWrap.innerHTML = `
        <span style="font-size:11px;" title="Kéo để chỉnh tốc độ nghe (0.5x - 2.0x)">⚡</span>
        <input type="range" id="listeningSpeedRangeInput" min="0.5" max="2.0" step="0.05" value="${curVal}"
          oninput="applyCustomListeningSpeed(this.value)">
        <span id="listeningSpeedValueLabel" onclick="applyCustomListeningSpeed(1.0)" title="Bấm vào đây để đặt lại tốc độ chuẩn 1.0x">
          ${parseFloat(curVal).toFixed(1)}x
        </span>
      `;
    }

    // 2.2. Rút gọn chữ "Candidate: ..." để đỡ chiếm diện tích ngang
    overlay.querySelectorAll('span, div').forEach(el => {
      if (el.children.length === 0 && (el.textContent || '').includes('Candidate:')) {
        el.textContent = el.textContent.replace('Candidate:', '👤').trim();
        el.style.whiteSpace = 'nowrap';
      }
    });

    // 2.3. Gom 2 thẻ <select> "Standard Text" và "Black on White" vào nút "⚙️ Hiển thị"
    if (!document.getElementById('topbarDisplayGearWrap')) {
      let fontSelect = null;
      let contrastSelect = null;

      overlay.querySelectorAll('select').forEach(sel => {
        const txt = sel.textContent || '';
        if (txt.includes('Standard Text') || txt.includes('Large Text')) fontSelect = sel;
        if (txt.includes('Black on White') || txt.includes('White on Black') || txt.includes('Yellow on Black')) contrastSelect = sel;
      });

      if (fontSelect && contrastSelect && fontSelect.parentNode) {
        const gearWrap = document.createElement('div');
        gearWrap.id = 'topbarDisplayGearWrap';
        gearWrap.className = 'topbar-display-gear-wrap';

        gearWrap.innerHTML = `
          <button type="button" class="topbar-gear-btn" onclick="document.getElementById('topbarGearPopover').classList.toggle('open')" title="Tùy chỉnh cỡ chữ & màu nền bài thi">
            ⚙️ Hiển thị
          </button>
          <div id="topbarGearPopover" class="topbar-gear-popover">
            <div id="gearFontSelectSlot">
              <label>🔤 Cỡ chữ bài đọc (Text Size):</label>
            </div>
            <div id="gearContrastSelectSlot">
              <label>🎨 Chế độ màu (Contrast):</label>
            </div>
          </div>
        `;

        fontSelect.parentNode.insertBefore(gearWrap, fontSelect);
        gearWrap.querySelector('#gearFontSelectSlot').appendChild(fontSelect);
        gearWrap.querySelector('#gearContrastSelectSlot').appendChild(contrastSelect);
      }
    }
  }

  // Đóng popover "⚙️ Hiển thị" khi bấm ra ngoài
  document.addEventListener('click', function(ev) {
    const gearWrap = document.getElementById('topbarDisplayGearWrap');
    const pop = document.getElementById('topbarGearPopover');
    if (gearWrap && pop && pop.classList.contains('open') && !gearWrap.contains(ev.target)) {
      pop.classList.remove('open');
    }
  });

  setInterval(compactExamTopbarLayout, 500);

/* === MODULE PART 21 (Lines 17944-18011) === */
function optimizeRealExamShellTopbar() {
    const shell = document.getElementById('examShell');
    if (!shell || shell.style.display === 'none') return;

    // 1. Gom 2 thẻ <select id="examFontSizeSelect"> và <select id="examThemeSelect"> vào nút "⚙️ Hiển thị"
    const fontSel = document.getElementById('examFontSizeSelect');
    const themeSel = document.getElementById('examThemeSelect');

    if (fontSel && themeSel && !document.getElementById('examDisplayGearContainer')) {
      const rightControlsBox = fontSel.parentNode;
      const gearContainer = document.createElement('div');
      gearContainer.id = 'examDisplayGearContainer';
      gearContainer.className = 'exam-display-gear-container';

      gearContainer.innerHTML = `
        <button type="button" class="exam-display-gear-btn" onclick="event.stopPropagation(); document.getElementById('examDisplayGearDropdown').classList.toggle('show')" title="Chỉnh cỡ chữ & màu nền">
          ⚙️ Hiển thị
        </button>
        <div id="examDisplayGearDropdown" class="exam-display-gear-dropdown" onclick="event.stopPropagation()">
          <div id="gearSlotFont">
            <span class="gear-field-label">🔤 Cỡ chữ (Text Size):</span>
          </div>
          <div id="gearSlotTheme">
            <span class="gear-field-label">🎨 Giao diện (Contrast):</span>
          </div>
        </div>
      `;

      rightControlsBox.insertBefore(gearContainer, fontSel);
      gearContainer.querySelector('#gearSlotFont').appendChild(fontSel);
      gearContainer.querySelector('#gearSlotTheme').appendChild(themeSel);
    }

    // 2. Rút gọn nhãn "Candidate: Tên" thành "👤 Tên" để không chiếm chỗ
    const candTag = document.getElementById('insperaCandidateTag');
    if (candTag && (candTag.textContent || '').includes('Candidate:')) {
      candTag.textContent = candTag.textContent.replace('Candidate:', '👤').trim();
    }

    // 3. Rút gọn thanh trượt tốc độ Audio (Bỏ chữ "Speed:" dài dòng, bấm vào số 1.0x để reset)
    const speedWrap = shell.querySelector('.audio-speed-slider-wrap');
    if (speedWrap) {
      const firstSpan = speedWrap.querySelector('span');
      if (firstSpan && (firstSpan.textContent || '').includes('Speed')) {
        firstSpan.innerHTML = '⚡';
        firstSpan.title = 'Kéo để chỉnh tốc độ nghe (0.5x - 2.0x)';
      }
      const valLabel = document.getElementById('listeningSpeedValueLabel');
      if (valLabel && !valLabel.getAttribute('data-reset-bound')) {
        valLabel.setAttribute('data-reset-bound', '1');
        valLabel.title = 'Bấm vào đây để đặt lại tốc độ chuẩn 1.0x';
        valLabel.onclick = () => applyCustomListeningSpeed(1.0);
      }
    }
  }

  // Đóng menu "⚙️ Hiển thị" khi bấm ra ngoài
  document.addEventListener('click', function() {
    const dd = document.getElementById('examDisplayGearDropdown');
    if (dd && dd.classList.contains('show')) {
      dd.classList.remove('show');
    }
  });

  // Tự động kích hoạt ngay khi mở bài thi Reading, Listening, Writing hoặc Review Mode
  setInterval(optimizeRealExamShellTopbar, 350);

/* === MODULE PART 22 (Lines 18180-18404) === */
/* ==========================================================================
     1. HỆ THỐNG BOOKMARK CHUẨN INSPERA (ĐỒNG BỘ NÚT CÂU HỎI & Ô SỐ FOOTER)
     ========================================================================== */
  let bookmarkedQuestionKeys = new Set();
  let lastBookmarkExamId = null;

  function ensureBookmarkSetForCurrentExam() {
    const curId = activeExam ? activeExam.id : null;
    if (curId !== lastBookmarkExamId) {
      bookmarkedQuestionKeys = new Set();
      lastBookmarkExamId = curId;
    }
  }

  function createBookmarkButtonHtml(qKey) {
    const isBookmarked = bookmarkedQuestionKeys.has(qKey);
    const qNum = String(qKey).replace(/^q/i, '');
    return `
      <button type="button" class="inspera-bookmark-btn ${isBookmarked ? 'active' : ''}"
        data-bm-key="${qKey}"
        onclick="toggleInsperaBookmark('${qKey}', event)"
        title="Bookmark Question ${qNum} for review">
        <svg viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
      </button>
    `;
  }

  window.toggleInsperaBookmark = function(qKey, ev) {
    if (ev) {
      ev.preventDefault();
      ev.stopPropagation();
    }
    ensureBookmarkSetForCurrentExam();
    if (bookmarkedQuestionKeys.has(qKey)) {
      bookmarkedQuestionKeys.delete(qKey);
    } else {
      bookmarkedQuestionKeys.add(qKey);
    }
    syncBookmarkVisualState();
  };

  function syncBookmarkVisualState() {
    ensureBookmarkSetForCurrentExam();
    // Cập nhật trạng thái các nút Bookmark trên màn hình câu hỏi
    document.querySelectorAll('.inspera-bookmark-btn[data-bm-key]').forEach(btn => {
      const k = btn.getAttribute('data-bm-key');
      btn.classList.toggle('active', bookmarkedQuestionKeys.has(k));
    });
    // Cập nhật dấu tam giác góc trên các ô số dưới thanh Footer
    document.querySelectorAll('#insperaFooterList .progress-item').forEach(pill => {
      const qKey = String(pill.id || '').replace('fpill_', '');
      if (qKey) {
        pill.classList.toggle('bookmarked-pill', bookmarkedQuestionKeys.has(qKey));
      }
    });
  }

  // Tự động gắn nút Bookmark vào mọi định dạng câu hỏi trong bài thi (Reading & Listening)
  function injectInsperaBookmarkButtons() {
    if (!activeExam || activeExamType === 'writing' || isReviewMode) return;
    ensureBookmarkSetForCurrentExam();

    const rightPane = document.getElementById('insperaRightPane');
    if (!rightPane) return;

    const allKeys = Object.keys(activeExam.correctAnswers || {}).sort(
      (a, b) => parseInt(a.replace('q', '')) - parseInt(b.replace('q', ''))
    );

    allKeys.forEach(qKey => {
      // Nếu câu hỏi này đã có nút Bookmark rồi thì bỏ qua
      if (rightPane.querySelector(`.inspera-bookmark-btn[data-bm-key="${qKey}"]`)) return;

      const qNum = qKey.replace(/^q/i, '');

      // Trường hợp 1: Câu hỏi dạng khối chuẩn (.question[data-question="27"]) hoặc bảng Matrix (tr.question)
      const qBlock = rightPane.querySelector(`.question[data-question="${qNum}"]`);
      if (qBlock) {
        const qTextEl = qBlock.querySelector('.question-text') || qBlock.querySelector('td.matrix-statement');
        if (qTextEl) {
          // Bọc nội dung chữ bên trái nếu chưa bọc để flex đẩy nút Bookmark sang phải
          if (qTextEl.classList.contains('question-text') && !qTextEl.querySelector('.q-stem-wrap')) {
            const wrapSpan = document.createElement('span');
            wrapSpan.className = 'q-stem-wrap';
            while (qTextEl.firstChild) wrapSpan.appendChild(qTextEl.firstChild);
            qTextEl.appendChild(wrapSpan);
          }
          qTextEl.insertAdjacentHTML('beforeend', createBookmarkButtonHtml(qKey));
          return;
        }
      }

      // Trường hợp 2: Câu hỏi điền từ trực tiếp (input[name="q1"], select[name="q1"]) hoặc Kéo thả (.drop-zone[data-target="q36"])
      const inlineTarget = rightPane.querySelector(`input[name="${qKey}"], select[name="${qKey}"], .drop-zone[data-target="${qKey}"]`);
      if (inlineTarget) {
        // Nếu là radio button nhưng không có .question bọc ngoài, gắn vào dòng chứa đầu tiên
        if (inlineTarget.type === 'radio') {
          const parentBox = inlineTarget.closest('div, li, p, tr');
          if (parentBox && !parentBox.querySelector(`.inspera-bookmark-btn[data-bm-key="${qKey}"]`)) {
            parentBox.insertAdjacentHTML('beforeend', createBookmarkButtonHtml(qKey));
          }
          return;
        }
        inlineTarget.insertAdjacentHTML('afterend', createBookmarkButtonHtml(qKey));
      }
    });

    syncBookmarkVisualState();
  }

  /* ==========================================================================
     2. TỰ ĐỘNG CHUYỂN DẠNG BÀI MAP / DIAGRAM SANG CHIA ĐÔI 2 CỘT (TRÁI: MAP - PHẢI: CÂU HỎI)
        - Hoạt động cho cả các đề cũ đã nhập từ trước lẫn đề mới!
     ========================================================================== */
  function upgradeMapQuestionsToSplitLayout() {
    if (!activeExam || activeExamType === 'writing') return;
    const rightPane = document.getElementById('insperaRightPane');
    if (!rightPane) return;

    // Khi đang thi Listening (không có cột Transcript bên trái), cho phép khung câu hỏi mở rộng lên 1220px để Map và Câu hỏi đứng cạnh nhau rộng rãi
    if (activeExamType === 'listening' && !isReviewMode) {
      const innerWrapper = rightPane.firstElementChild;
      if (innerWrapper && innerWrapper.style && innerWrapper.style.maxWidth === '960px') {
        innerWrapper.style.maxWidth = '1220px';
      }
    }

    rightPane.querySelectorAll('.question-group').forEach(group => {
      if (group.querySelector('.inspera-map-split-layout')) return;

      const imgEl = group.querySelector('img');
      if (!imgEl) return;

      // Tìm thẻ chứa ảnh (thường là div có text-align:center) và khối chứa các câu hỏi bên dưới
      const imgContainer = imgEl.parentElement && imgEl.parentElement !== group ? imgEl.parentElement : imgEl;
      const questionNodes = [];

      Array.from(group.children).forEach(child => {
        if (child === imgContainer || child.contains(imgEl)) return;
        if (child.classList.contains('question-group-title')) return;
        if (child.tagName === 'P' && !child.querySelector('input, select, .drop-zone, .question')) return;
        questionNodes.push(child);
      });

      if (!questionNodes.length) return;

      const splitWrapper = document.createElement('div');
      splitWrapper.className = 'inspera-map-split-layout';

      const leftMapCol = document.createElement('div');
      leftMapCol.className = 'inspera-map-left-sticky';
      imgEl.onclick = () => {
        if (typeof openRewriteChartZoom === 'function') openRewriteChartZoom(imgEl.src);
      };
      imgEl.title = 'Bấm vào ảnh Bản đồ / Sơ đồ để phóng to';
      leftMapCol.appendChild(imgEl);
      const hintCap = document.createElement('div');
      hintCap.style.cssText = 'font-size:11.5px; color:#6b7280; margin-top:6px; font-weight:600;';
      hintCap.textContent = '🔍 Bấm vào hình để phóng to xem chi tiết';
      leftMapCol.appendChild(hintCap);

      const rightQCol = document.createElement('div');
      rightQCol.className = 'inspera-map-right-questions';
      questionNodes.forEach(node => rightQCol.appendChild(node));

      splitWrapper.appendChild(leftMapCol);
      splitWrapper.appendChild(rightQCol);

      if (imgContainer !== imgEl && imgContainer.parentNode === group) {
        imgContainer.replaceWith(splitWrapper);
      } else {
        group.appendChild(splitWrapper);
      }
    });
  }

  /* ==========================================================================
     3. CẬP NHẬT NÚT TEMPLATE "+ Map / Plan Labelling Image" TRONG TRÌNH TẠO ĐỀ
        SANG SẴN KHUNG CHIA 2 CỘT TRÁI - PHẢI
     ========================================================================== */
  const _v10OrigInsertQuestionTemplate = insertQuestionTemplate;
  insertQuestionTemplate = function(type, mode = 're') {
    if (type !== 'diagram') {
      return _v10OrigInsertQuestionTemplate(type, mode);
    }
    const qBox = document.getElementById(mode === 'le' ? 'leQuestions' : 'rePQuestionsHtml');
    if (!qBox) return;

    const splitMapSnippet = `\n<div class="question-group">
  <div class="question-group-title">Questions 15–18: Map / Plan Labelling</div>
  <p>Label the map below. Write the correct letter, <strong>A–H</strong>, next to questions 15–18.</p>
  <div class="inspera-map-split-layout">
    <div class="inspera-map-left-sticky">
      <img src="PASTE_YOUR_MAP_IMAGE_URL_HERE" alt="IELTS Map / Plan">
      <div style="font-size:11.5px; color:#6b7280; margin-top:6px; font-weight:600;">🔍 Click image to zoom</div>
    </div>
    <div class="inspera-map-right-questions" style="background:#f8fafc; border:1px solid #cbd5e1; padding:16px;">
      <div><span class="q-badge">15</span> Library Entrance: <input type="text" class="input-field inline-input" name="q15" placeholder="15" autocomplete="off"></div>
      <div><span class="q-badge">16</span> Main Lecture Hall: <input type="text" class="input-field inline-input" name="q16" placeholder="16" autocomplete="off"></div>
      <div><span class="q-badge">17</span> Student Cafeteria: <input type="text" class="input-field inline-input" name="q17" placeholder="17" autocomplete="off"></div>
      <div><span class="q-badge">18</span> Sports Centre: <input type="text" class="input-field inline-input" name="q18" placeholder="18" autocomplete="off"></div>
    </div>
  </div>
</div>\n`;
    qBox.value += splitMapSnippet;
  };

  /* ==========================================================================
     4. KẾT NỐI TỰ ĐỘNG VÀO CHU TRÌNH LOAD BÀI THI & CHUYỂN PART
     ========================================================================== */
  const _v10OrigLoadPassageView = loadPassageView;
  loadPassageView = function(partNum) {
    _v10OrigLoadPassageView(partNum);
    upgradeMapQuestionsToSplitLayout();
    injectInsperaBookmarkButtons();
    syncBookmarkVisualState();
  };

  const _v10OrigUpdateFooterNav = updateFooterNav;
  updateFooterNav = function() {
    _v10OrigUpdateFooterNav();
    syncBookmarkVisualState();
  };

/* === MODULE PART 23 (Lines 18709-19302) === */
/* ==========================================================================
     1. TÁI CẤU TRÚC FOOTER THEO CỤM PART (IELTS MATE STYLE) & NÚT CHUYỂN CÂU ← →
     ========================================================================== */
  let currentFocusedQuestionKey = null;

  function getSortedExamQuestionKeys() {
    if (!activeExam || !activeExam.correctAnswers) return [];
    return Object.keys(activeExam.correctAnswers).sort(
      (a, b) => parseInt(a.replace(/\D/g, '')) - parseInt(b.replace(/\D/g, ''))
    );
  }

  function getKeysGroupedByPart() {
    const groups = {};
    const passages = (activeExam && activeExam.passages) || [];
    passages.forEach(p => { groups[p.partNum] = []; });

    const allKeys = getSortedExamQuestionKeys();
    allKeys.forEach(k => {
      const pNum = findPartForQuestionKey(k) || (passages[0] ? passages[0].partNum : 1);
      if (!groups[pNum]) groups[pNum] = [];
      groups[pNum].push(k);
    });
    return groups;
  }

  // Ghi đè buildFooterNav & updateFooterNav để chỉ bung dãy số của Part đang làm, các Part khác hiện "Part X  0 of 10"
  buildFooterNav = function() {
    const container = document.getElementById('insperaFooterList');
    if (!container) return;
    if (activeExamType === 'writing') return;

    const btnBottom = document.getElementById('btnSubmitBottom');
    if (btnBottom) btnBottom.innerHTML = '✓';

    const grouped = getKeysGroupedByPart();
    const partNums = Object.keys(grouped).map(Number).sort((a, b) => a - b);

    container.innerHTML = partNums.map(pNum => {
      const keysInPart = grouped[pNum] || [];
      const answeredCount = keysInPart.filter(k => Boolean(userAnswers[k] && String(userAnswers[k]).trim() !== '')).length;
      const isCurrentPart = (Number(pNum) === Number(activePartNum));

      if (!isCurrentPart) {
        return `
          <div class="mate-footer-part-group" onclick="switchExamPassage(${pNum})" title="Chuyển sang Part ${pNum}">
            <span class="mate-footer-part-title">Part ${pNum}</span>
            <span class="mate-footer-part-count">${answeredCount} of ${keysInPart.length}</span>
          </div>
        `;
      }

      return `
        <div class="mate-footer-part-group" style="background:#f8fafc; border:1px solid #e2e8f0;">
          <span class="mate-footer-part-title" style="margin-right:4px;">Part ${pNum}</span>
          <div class="mate-footer-q-pills">
            ${keysInPart.map(k => {
              const num = k.replace('q', '');
              const hasVal = Boolean(userAnswers[k] && String(userAnswers[k]).trim() !== '');
              const isCur = (currentFocusedQuestionKey === k);
              const isBm = (typeof bookmarkedQuestionKeys !== 'undefined' && bookmarkedQuestionKeys.has(k));
              let revCls = '';
              if (isReviewMode) {
                revCls = isAnswerCorrect(k) ? 'correct' : 'incorrect';
              }
              return `
                <button type="button"
                  class="progress-item ${hasVal ? 'answered' : ''} ${isCur ? 'current' : ''} ${isBm ? 'bookmarked-pill' : ''} ${revCls}"
                  id="fpill_${k}"
                  onclick="event.stopPropagation(); jumpToQuestionKey('${k}')">${num}</button>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');
  };

  updateFooterNav = function() {
    if (activeExamType === 'writing') return;
    buildFooterNav();
  };

  window.jumpToQuestionKey = function(qKey) {
    if (!activeExam) return;
    currentFocusedQuestionKey = qKey;
    const num = qKey.replace('q', '');
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
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const inputInside = targetEl.matches('input, select') ? targetEl : targetEl.querySelector('input, select');
        if (inputInside && inputInside.focus) inputInside.focus();
      }
    }, 45);
  };

  window.stepExamQuestionByDelta = function(delta) {
    if (!activeExam) return;
    if (activeExamType === 'writing') {
      const nextTask = activePartNum === 1 ? 2 : 1;
      if (typeof switchWritingTask === 'function') switchWritingTask(nextTask);
      return;
    }
    const allKeys = getSortedExamQuestionKeys();
    if (!allKeys.length) return;
    let idx = allKeys.indexOf(currentFocusedQuestionKey);
    if (idx === -1) {
      const grouped = getKeysGroupedByPart();
      const curPartKeys = grouped[activePartNum] || [];
      idx = curPartKeys.length ? allKeys.indexOf(curPartKeys[0]) : 0;
    } else {
      idx = Math.max(0, Math.min(allKeys.length - 1, idx + delta));
    }
    jumpToQuestionKey(allKeys[idx]);
  };

  /* ==========================================================================
     2. PHÒNG THI THỬ 3 KỸ NĂNG LIÊN HOÀN (FULL MOCK TEST ENGINE)
        - Hỗ trợ cả Random bốc đề tự động & Bộ đề cố định giáo viên giao cho lớp
     ========================================================================== */
  let mockSession = {
    active: false,
    title: '',
    stage: 0, // 1: Listening, 2: Reading, 3: Writing
    listeningExam: null,
    readingExam: null,
    writingExam: null,
    listeningResult: null,
    readingResult: null,
    writingResult: null,
    breakTimer: null
  };

  function ensureMockSetsInitialized() {
    if (!db.mockSets) db.mockSets = [];
    // Đồng bộ danh sách bộ đề Mock Test từ collection nhẹ suite_mockSets
    const fs = typeof getActiveFirestore === 'function' ? getActiveFirestore() : CLOUD_DB;
    if (fs && !window._mockSetsListenerBound) {
      window._mockSetsListenerBound = true;
      fs.collection('suite_mockSets').onSnapshot(snap => {
        if (!snap.empty) {
          db.mockSets = snap.docs.map(d => d.data());
          if (document.getElementById('tab-mocktest')?.style.display === 'block') {
            renderMockTestTab();
          }
        }
      });
    }
  }

  function injectMockTestTabIntoDashboard() {
    const tabsBar = document.querySelector('.dash-tabs');
    const writingTabBtn = document.getElementById('tabbtn-writing');
    if (tabsBar && writingTabBtn && !document.getElementById('tabbtn-mocktest')) {
      const btn = document.createElement('button');
      btn.className = 'dash-tab-btn';
      btn.id = 'tabbtn-mocktest';
      btn.innerHTML = '🎓 Full Mock Test (3 Kỹ Năng)';
      btn.onclick = () => switchDashTab('mocktest');
      writingTabBtn.insertAdjacentElement('afterend', btn);
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

  const _v11OrigSwitchDashTab = switchDashTab;
  switchDashTab = function(tab) {
    injectMockTestTabIntoDashboard();
    _v11OrigSwitchDashTab(tab);
    if (tab === 'mocktest') {
      renderMockTestTab();
    }
  };

  // Thuật toán chọn đề ngẫu nhiên thông minh (Ưu tiên đề Full & chưa làm, tự gộp Task 1 + Task 2 nếu thiếu Writing Full)
  function buildRandomMockTestBundle() {
    const doneR = new Set(getStudentCompletedExamIds('reading'));
    const doneL = new Set(getStudentCompletedExamIds('listening'));

    const allL = getVisibleExams(db.listeningExams || []);
    const fullL = allL.filter(e => (e.passages && e.passages.length >= 4) || String(e.category || '').includes('Full'));
    const poolL = fullL.length ? fullL : allL;
    const freshL = poolL.filter(e => !doneL.has(e.id));
    const chosenL = (freshL.length ? freshL : poolL)[Math.floor(Math.random() * (freshL.length ? freshL.length : poolL.length))];

    const allR = getVisibleExams(db.readingExams || []);
    const fullR = allR.filter(e => (e.passages && e.passages.length >= 3) || String(e.category || '').includes('Full'));
    const poolR = fullR.length ? fullR : allR;
    const freshR = poolR.filter(e => !doneR.has(e.id));
    const chosenR = (freshR.length ? freshR : poolR)[Math.floor(Math.random() * (freshR.length ? freshR.length : poolR.length))];

    const allW = getVisibleExams(db.writingExams || []);
    const fullW = allW.filter(w => w.task1?.prompt && w.task2?.prompt);
    let chosenW = null;

    if (fullW.length) {
      chosenW = fullW[Math.floor(Math.random() * fullW.length)];
    } else {
      const t1Pool = allW.filter(w => w.task1?.prompt);
      const t2Pool = allW.filter(w => w.task2?.prompt);
      const pickT1 = t1Pool.length ? t1Pool[Math.floor(Math.random() * t1Pool.length)] : null;
      const pickT2 = t2Pool.length ? t2Pool[Math.floor(Math.random() * t2Pool.length)] : null;
      if (pickT1 || pickT2) {
        chosenW = {
          id: (pickT1 ? pickT1.id : pickT2.id),
          title: `Writing Mock (${pickT1 ? pickT1.title : 'Task 1'} + ${pickT2 ? pickT2.title : 'Task 2'})`,
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
    startMockTestFlow('Full CD-IELTS Mock Test (Random Official Simulation)', bundle.listening, bundle.reading, bundle.writing);
  };

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
      title: w2 && w2.id !== w1.id ? `${w1.title} + ${w2.title}` : w1.title,
      duration: 60,
      task1: w1.task1 || { prompt: '', image: '' },
      task2: (w2 && w2.task2?.prompt) ? w2.task2 : (w1.task2 || { prompt: '' })
    };

    startMockTestFlow(ms.title, lEx, rEx, combinedW);
  };

  function startMockTestFlow(title, lExam, rExam, wExam) {
    if (!confirm(`🎓 BẮT ĐẦU KỲ THI THỬ 3 KỸ NĂNG LIÊN HOÀN:\n"${title}"\n\n1. Listening: ${lExam.title} (${lExam.duration || 30} phút)\n2. Reading: ${rExam.title} (${rExam.duration || 60} phút)\n3. Writing: ${wExam.title} (60 phút)\n\nBạn đã sẵn sàng tai nghe và thời gian làm bài liên tục chưa?`)) {
      return;
    }
    mockSession = {
      active: true,
      title,
      stage: 1,
      listeningExam: lExam,
      readingExam: rExam,
      writingExam: wExam,
      listeningResult: null,
      readingResult: null,
      writingResult: null,
      breakTimer: null
    };
    launchListeningExam(lExam.id);
  }

  // Can thiệp vào submitExam để nếu học sinh đang trong phiên Thi Thử 3 Kỹ Năng thì tự động chuyển sang kỹ năng kế tiếp!
  const _v11OrigSubmitExam = submitExam;
  submitExam = async function(forceSubmit = false) {
    if (!mockSession.active) {
      return _v11OrigSubmitExam(forceSubmit);
    }

    if (!forceSubmit && !confirm(`Nộp bài kỹ năng ${mockSession.stage === 1 ? 'LISTENING' : (mockSession.stage === 2 ? 'READING' : 'WRITING')} và chuyển sang phần tiếp theo?`)) {
      return;
    }

    // Lưu kết quả kỹ năng hiện tại bằng hàm gốc (ép forceSubmit = true để không hỏi confirm 2 lần)
    await _v11OrigSubmitExam(true);

    // Đóng popup điểm lẻ nếu vừa nộp Listening/Reading
    closeModal('scoreSummaryModal');
    closeModal('gradeWritingModal');
    closeModal('studentViewWritingModal');

    const latestRes = (db.results && db.results.length) ? db.results[db.results.length - 1] : null;

    if (mockSession.stage === 1) {
      mockSession.listeningResult = latestRes;
      mockSession.stage = 2;
      showMockIntermissionScreen(
        '✅ Đã hoàn thành Kỹ năng 1: LISTENING',
        `Điểm Listening của bạn: <b style="color:#059669;">${latestRes ? latestRes.score : ''} (Band ${latestRes ? latestRes.band : ''})</b>.<br>Hệ thống sẽ tự động chuyển sang <b>Kỹ năng 2: READING (60 phút)</b> sau khi hết thời gian nghỉ chuyển tiếp.`,
        '📖 Bắt Đầu Thi READING Ngay',
        () => launchExam(mockSession.readingExam.id)
      );
      return;
    }

    if (mockSession.stage === 2) {
      mockSession.readingResult = latestRes;
      mockSession.stage = 3;
      showMockIntermissionScreen(
        '✅ Đã hoàn thành Kỹ năng 2: READING',
        `Điểm Reading của bạn: <b style="color:#059669;">${latestRes ? latestRes.score : ''} (Band ${latestRes ? latestRes.band : ''})</b>.<br>Tiếp theo là phần thi cuối cùng: <b>Kỹ năng 3: WRITING (60 phút)</b>.`,
        '✍️ Bắt Đầu Thi WRITING Ngay',
        () => {
          // Đảm bảo nếu đề Writing là đề ghép tạm thời Task 1 + Task 2 thì vẫn mở được trong launchWritingExam
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
            document.getElementById('insperaExamTitle').textContent = tempW.title;
            document.getElementById('insperaCandidateTag').textContent = `👤 ${activeUser.name}`;
            document.getElementById('btnSubmitExam').style.display = '';
            document.getElementById('btnSubmitBottom').style.display = '';
            const topTabs = document.getElementById('insperaPartTabs');
            topTabs.innerHTML = `
              ${tempW.task1?.prompt ? `<button class="part-pill active" id="wtab_1" onclick="switchWritingTask(1)">Part 1</button>` : ''}
              ${tempW.task2?.prompt ? `<button class="part-pill" id="wtab_2" onclick="switchWritingTask(2)">Part 2</button>` : ''}
            `;
            loadWritingWorkspace(activePartNum);
            setupResizer();
            startTimer();
          } else {
            launchWritingExam(tempW.id);
          }
        }
      );
      return;
    }

    if (mockSession.stage === 3) {
      mockSession.writingResult = latestRes;
      mockSession.active = false;
      showFinalMockTrfReport();
    }
  };

  function showMockIntermissionScreen(headerTitle, messageHtml, nextBtnText, onProceed) {
    clearInterval(mockSession.breakTimer);
    let breakSecs = 60;
    document.getElementById('mockTransitionHeader').textContent = headerTitle;
    const body = document.getElementById('mockTransitionBody');
    const footer = document.getElementById('mockTransitionFooter');

    body.innerHTML = `
      <div style="font-size:14.5px; color:#334155; line-height:1.65; margin-bottom:16px;">${messageHtml}</div>
      <div style="background:#f0fdf4; border:1.5px solid #86efac; border-radius:12px; padding:14px; display:inline-block; min-width:220px;">
        <div style="font-size:11.5px; font-weight:800; color:#065f46; text-transform:uppercase;">Thời gian nghỉ chuyển tiếp</div>
        <div id="mockBreakCountdownLabel" style="font-size:32px; font-weight:800; color:#059669; margin-top:4px;">01:00</div>
      </div>
    `;
    footer.innerHTML = `
      <button type="button" class="btn btn-emerald" id="btnProceedNextMockStage" style="padding:10px 22px; font-size:14px;">${nextBtnText}</button>
    `;

    const proceedHandler = () => {
      clearInterval(mockSession.breakTimer);
      closeModal('mockTransitionModal');
      onProceed();
    };
    document.getElementById('btnProceedNextMockStage').onclick = proceedHandler;

    mockSession.breakTimer = setInterval(() => {
      breakSecs--;
      const lbl = document.getElementById('mockBreakCountdownLabel');
      if (lbl) lbl.textContent = `00:${String(Math.max(0, breakSecs)).padStart(2, '0')}`;
      if (breakSecs <= 0) {
        proceedHandler();
      }
    }, 1000);

    openModal('mockTransitionModal');
  }

  function showFinalMockTrfReport() {
    const lBand = parseFloat(String(mockSession.listeningResult?.band || '0').replace(/[^0-9.]/g, '')) || 0;
    const rBand = parseFloat(String(mockSession.readingResult?.band || '0').replace(/[^0-9.]/g, '')) || 0;
    const wBandRaw = String(mockSession.writingResult?.band || 'Submitted');
    const wBandNum = parseFloat(wBandRaw.replace(/[^0-9.]/g, '')) || 0;

    const validNums = [lBand, rBand, wBandNum].filter(n => n > 0);
    const overall = validNums.length ? (Math.round((validNums.reduce((a, b) => a + b, 0) / validNums.length) * 2) / 2).toFixed(1) : '—';

    document.getElementById('mockTransitionHeader').textContent = '🏆 KẾT QUẢ THI THỬ 3 KỸ NĂNG (MOCK TEST REPORT FORM)';
    document.getElementById('mockTransitionBody').innerHTML = `
      <div style="font-size:14px; font-weight:700; color:#1f3d32; margin-bottom:14px;">${mockSession.title}</div>
      <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:10px; margin-bottom:18px;">
        <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:10px; padding:12px 8px;">
          <div style="font-size:11px; font-weight:700; color:#64748b;">LISTENING</div>
          <div style="font-size:22px; font-weight:800; color:#2563eb; margin:4px 0;">${lBand || '—'}</div>
          <div style="font-size:11px; color:#475569;">${mockSession.listeningResult?.score || ''}</div>
        </div>
        <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:10px; padding:12px 8px;">
          <div style="font-size:11px; font-weight:700; color:#64748b;">READING</div>
          <div style="font-size:22px; font-weight:800; color:#059669; margin:4px 0;">${rBand || '—'}</div>
          <div style="font-size:11px; color:#475569;">${mockSession.readingResult?.score || ''}</div>
        </div>
        <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:10px; padding:12px 8px;">
          <div style="font-size:11px; font-weight:700; color:#64748b;">WRITING</div>
          <div style="font-size:18px; font-weight:800; color:#d97706; margin:6px 0;">${wBandNum ? wBandNum : 'Chờ chấm'}</div>
          <div style="font-size:11px; color:#475569;">${mockSession.writingResult?.score || ''}</div>
        </div>
        <div style="background:#ecfdf5; border:1.5px solid #059669; border-radius:10px; padding:12px 8px;">
          <div style="font-size:11px; font-weight:800; color:#065f46;">OVERALL</div>
          <div style="font-size:24px; font-weight:800; color:#047857; margin:4px 0;">${overall}</div>
          <div style="font-size:10.5px; color:#065f46; font-weight:700;">CD-IELTS</div>
        </div>
      </div>
      <div style="font-size:12.5px; color:#475569;">
        Toàn bộ kết quả từng kỹ năng đã được lưu vào bảng lịch sử làm bài ở trang <b>Home</b> để bạn xem lại đáp án chi tiết.
      </div>
    `;
    document.getElementById('mockTransitionFooter').innerHTML = `
      <button type="button" class="btn btn-emerald" onclick="closeModal('mockTransitionModal'); switchDashTab('home');">🏠 Về Trang Chủ Xem Chi Tiết</button>
    `;
    openModal('mockTransitionModal');
  }

  /* ==========================================================================
     3. GIAO DIỆN TAB "🎓 FULL MOCK TEST" & QUẢN LÝ GÓI ĐỀ GIAO LỚP CHO GIÁO VIÊN
     ========================================================================== */
  function renderMockTestTab() {
    ensureMockSetsInitialized();
    const pane = document.getElementById('tab-mocktest');
    if (!pane || !activeUser) return;

    const isTeacher = activeUser.role === 'teacher';
    const visibleSets = (db.mockSets || []).filter(ms => {
      if (isTeacher) return true;
      if (!ms.classId || ms.classId === 'ALL') return true;
      return ms.classId === activeUser.classId;
    });

    pane.innerHTML = `
      <div class="card">
        <div class="card-title">
          <span>🎓 Phòng Thi Thử 3 Kỹ Năng Chuẩn Thi Thật (Listening ➔ Reading ➔ Writing)</span>
          ${isTeacher ? `<button class="btn btn-emerald" onclick="openCreateMockSetModal()">+ Tạo Bộ Đề Mock Test Giao Lớp</button>` : ''}
        </div>

        <!-- Chế độ 1: Bốc đề ngẫu nhiên thông minh -->
        <div style="background:linear-gradient(135deg,#ecfdf5 0%,#eff6ff 100%); border:1.5px solid #86efac; border-radius:16px; padding:22px 26px; margin-bottom:22px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
          <div style="max-width:720px;">
            <div style="font-size:17px; font-weight:800; color:#064e3b; margin-bottom:6px;">
              🎲 Chế Độ 1: Thi Thử Tổ Hợp Đề Ngẫu Nhiên (Smart Random Mock Test)
            </div>
            <div style="font-size:13.5px; color:#334155; line-height:1.6;">
              Hệ thống tự động bốc ngẫu nhiên <b>1 đề Listening Full + 1 đề Reading Full + 1 đề Writing Full</b> (hoặc tự ghép 1 Task 1 + 1 Task 2) ưu tiên từ những đề bạn chưa làm. Trải nghiệm áp lực thời gian liên hoàn ~2 giờ 30 phút giống 100% kỳ thi thật trên máy tại IDP / BC.
            </div>
          </div>
          <button class="btn btn-emerald" style="padding:12px 22px; font-size:14px;" onclick="startRandomFullMockTest()">
            🚀 Bắt Đầu Thi Thử Ngẫu Nhiên Ngay
          </button>
        </div>

        <!-- Chế độ 2: Danh sách bộ đề cố định Giáo viên giao cho lớp -->
        <div style="font-size:15px; font-weight:800; color:#0f172a; margin-bottom:12px;">
          📋 Chế Độ 2: Các Kỳ Thi Thử Cố Định Do Giáo Viên Giao Cho Lớp (${visibleSets.length})
        </div>
        <table>
          <thead>
            <tr>
              <th>Tên Kỳ Thi Thử</th>
              <th>🎧 Listening</th>
              <th>📖 Reading</th>
              <th>✍️ Writing</th>
              <th>Lớp Nhận Bài</th>
              <th>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            ${!visibleSets.length ? `
              <tr><td colspan="6" style="text-align:center; color:#94a3b8; padding:22px;">Chưa có bộ đề thi thử cố định nào được giao. Bạn có thể bấm nút "Bắt Đầu Thi Thử Ngẫu Nhiên" ở trên nhé!</td></tr>
            ` : visibleSets.map(ms => {
              const cls = (db.classes || []).find(c => c.id === ms.classId);
              return `
                <tr>
                  <td><b>${ms.title}</b></td>
                  <td>${ms.listeningTitle || 'Listening Test'}</td>
                  <td>${ms.readingTitle || 'Reading Test'}</td>
                  <td>${ms.writingTitle || 'Writing Task 1 & 2'}</td>
                  <td><span style="background:#f1f5f9; padding:3px 10px; border-radius:99px; font-size:12px; font-weight:700;">${cls ? cls.name : 'Tất cả các lớp'}</span></td>
                  <td style="display:flex; gap:6px;">
                    <button class="btn btn-emerald" onclick="startAssignedMockSet('${ms.id}')">▶️ Vào Phòng Thi</button>
                    ${isTeacher ? `<button class="btn btn-danger" onclick="deleteMockSet('${ms.id}')">Xóa</button>` : ''}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  window.openCreateMockSetModal = function() {
    populateClassSelect('mockSetClassSelect', true);
    const lSel = document.getElementById('mockSetListeningSelect');
    const rSel = document.getElementById('mockSetReadingSelect');
    const w1Sel = document.getElementById('mockSetWritingT1Select');
    const w2Sel = document.getElementById('mockSetWritingT2Select');

    lSel.innerHTML = (db.listeningExams || []).map(e => `<option value="${e.id}">${e.title}</option>`).join('');
    rSel.innerHTML = (db.readingExams || []).map(e => `<option value="${e.id}">${e.title}</option>`).join('');
    w1Sel.innerHTML = (db.writingExams || []).map(w => `<option value="${w.id}">${w.title}</option>`).join('');
    w2Sel.innerHTML = `<option value="">-- Giữ nguyên theo đề trên (Nếu đã đủ 2 Task) --</option>` +
      (db.writingExams || []).map(w => `<option value="${w.id}">${w.title}</option>`).join('');

    document.getElementById('mockSetTitleInput').value = '';
    openModal('createMockSetModal');
  };

  window.saveCustomMockSet = async function() {
    ensureMockSetsInitialized();
    const title = document.getElementById('mockSetTitleInput').value.trim();
    const classId = document.getElementById('mockSetClassSelect').value;
    const lId = document.getElementById('mockSetListeningSelect').value;
    const rId = document.getElementById('mockSetReadingSelect').value;
    const w1Id = document.getElementById('mockSetWritingT1Select').value;
    const w2Id = document.getElementById('mockSetWritingT2Select').value;

    if (!title || !lId || !rId || !w1Id) return alert('Vui lòng nhập tên kỳ thi và chọn đủ đề 3 kỹ năng!');

    const lObj = (db.listeningExams || []).find(e => e.id === lId);
    const rObj = (db.readingExams || []).find(e => e.id === rId);
    const w1Obj = (db.writingExams || []).find(e => e.id === w1Id);
    const w2Obj = w2Id ? (db.writingExams || []).find(e => e.id === w2Id) : null;

    const newSet = {
      id: 'mockset_' + Date.now(),
      title,
      classId,
      listeningId: lId,
      listeningTitle: lObj ? lObj.title : '',
      readingId: rId,
      readingTitle: rObj ? rObj.title : '',
      writingT1Id: w1Id,
      writingT2Id: w2Id || '',
      writingTitle: w2Obj ? `${w1Obj?.title || ''} + ${w2Obj.title}` : (w1Obj?.title || ''),
      createdAt: Date.now()
    };

    db.mockSets.unshift(newSet);
    const fs = typeof getActiveFirestore === 'function' ? getActiveFirestore() : CLOUD_DB;
    if (fs) {
      try { await fs.collection('suite_mockSets').doc(newSet.id).set(newSet); } catch (e) {}
    }
    closeModal('createMockSetModal');
    renderMockTestTab();
    alert('✅ Đã tạo và giao bộ đề Thi Thử 3 Kỹ Năng thành công!');
  };

  window.deleteMockSet = async function(id) {
    if (!confirm('Xóa bộ đề thi thử này?')) return;
    db.mockSets = (db.mockSets || []).filter(x => x.id !== id);
    const fs = typeof getActiveFirestore === 'function' ? getActiveFirestore() : CLOUD_DB;
    if (fs) {
      try { await fs.collection('suite_mockSets').doc(id).delete(); } catch (e) {}
    }
    renderMockTestTab();
  };

  window.addEventListener('load', () => {
    setTimeout(() => {
      injectMockTestTabIntoDashboard();
      ensureMockSetsInitialized();
    }, 500);
  });

/* === MODULE PART 24 (Lines 19562-19992) === */
/* ==========================================================================
     1. ĐỒNG BỘ ẨN KHUNG CHAT KHI VÀO PHÒNG THI & LÀM SẠCH POPUP HIGHLIGHT TRẮNG
     ========================================================================== */
  function syncExamRoomBodyClass() {
    const shell = document.getElementById('examShell');
    const lobby = document.getElementById('officialMockLobbyOverlay');
    const inExam = (shell && shell.style.display !== 'none') || (lobby && lobby.style.display !== 'none');
    document.body.classList.toggle('in-active-exam-room', Boolean(inExam));

    // Ẩn trực tiếp mọi phần tử nổi có chữ "Study Lounge Chat" khi đang thi
    document.querySelectorAll('div, button, aside').forEach(el => {
      if (el.id === 'examShell' || el.contains(shell)) return;
      const txt = (el.textContent || '').trim();
      if (txt.startsWith('Study Lounge Chat') && txt.length < 40) {
        const floatingRoot = el.closest('[style*="fixed"]') || el;
        floatingRoot.style.display = inExam ? 'none' : '';
      }
    });
  }

  function upgradeSelectionTooltipToLightCard() {
    const tooltip = document.getElementById('selectionTooltip');
    if (tooltip && !tooltip.getAttribute('data-light-upgraded')) {
      tooltip.setAttribute('data-light-upgraded', '1');
      tooltip.innerHTML = `
        <button type="button" onclick="applyUserHighlightColor('yellow')" title="Tô vàng từ khóa">
          <span style="width:10px; height:10px; border-radius:50%; background:#facc15; border:1px solid #ca8a04; display:inline-block;"></span>
          <span>Keyword</span>
        </button>
        <button type="button" onclick="applyUserHighlightColor('green')" title="Tô xanh dẫn chứng">
          <span style="width:10px; height:10px; border-radius:50%; background:#4ade80; border:1px solid #16a34a; display:inline-block;"></span>
          <span>Evidence</span>
        </button>
        <button type="button" onclick="removeUserHighlight()" title="Xóa màu highlight">
          <span style="color:#dc2626; font-weight:900;">✕</span>
          <span>Xóa màu</span>
        </button>
      `;
    }
  }

  window.applyUserHighlightColor = function(colorType) {
    if (!currentSelectedRange) return;
    const span = document.createElement('span');
    span.className = colorType === 'green' ? 'user-highlight-green' : 'user-highlight-span';
    try {
      currentSelectedRange.surroundContents(span);
    } catch (err) {
      document.execCommand('hiliteColor', false, colorType === 'green' ? '#bbf7d0' : '#fde047');
    }
    const tooltip = document.getElementById('selectionTooltip');
    if (tooltip) tooltip.style.display = 'none';
    window.getSelection().removeAllRanges();
    currentSelectedRange = null;
  };

  /* ==========================================================================
     2. CHẾ ĐỘ AUDIO TỰ ĐỘNG PHÁT (AUTOPLAY) & KHÓA TUA CHO MOCK TEST
     ========================================================================== */
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

    if (mockSession && mockSession.active && activeExamType === 'listening' && !isReviewMode) {
      shell.classList.add('mock-strict-audio');
      const audioEl = document.getElementById('examAudioPlayer');
      if (audioEl) {
        audioEl.playbackRate = 1.0;
        setTimeout(() => {
          audioEl.play().catch(() => {});
        }, 300);
      }
    } else {
      shell.classList.remove('mock-strict-audio');
    }
  }

  /* ==========================================================================
     3. CỔNG THI THỬ 4 BƯỚC (PRE-TEST -> LISTENING -> READING -> WRITING) NHƯ VIDEO
     ========================================================================== */
  let lobbyStepState = {
    pretestDone: false,
    listeningIntroConfirmed: false,
    slideIndex: 0,
    slideTimer: null
  };

  const LISTENING_INTRO_SLIDES = [
    'IELTS Listening Test<br><span style="font-size:15px; font-weight:500; color:#64748b;">Test instructions</span>',
    'Your listening test is<br><b>approximately 30 minutes.</b>',
    'There are <b>40 questions.</b>',
    'Each question carries <b>one mark.</b>',
    'There are <b>four parts</b> to the test.',
    'You will hear each part <b>once only.</b>',
    'Listen and read the <b>instructions</b><br>carefully.',
    'At the end, you will have <b>2 minutes</b><br>to check your answers.',
    'The time <b>at the top of the screen</b><br>shows how much time you have left.',
    'At the end of the test, the test<br>will <b>finish automatically.</b>'
  ];

  // Ghi đè hàm khởi động Mock Test để mở Cổng Lobby 4 Bước chuẩn thi thật
  startMockTestFlow = function(title, lExam, rExam, wExam) {
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
    lobby.style.display = 'flex';
    document.getElementById('lobbyCandidateLabel').textContent = `Candidate: ${activeUser ? activeUser.name : 'Student'}`;
    document.getElementById('lobbyMockTitleLabel').textContent = mockSession.title || 'Official Mock Test';
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

    // CARD 1: PRE-TEST (KIỂM TRA ÂM THANH & BÀN PHÍM)
    const pretestCardHtml = `
      <div class="lobby-step-card">
        <div class="lobby-step-header">
          <div>
            <div class="lobby-step-title">Pre-test</div>
            <div class="lobby-step-sub">2 Parts • Sound & Keyboard Check</div>
          </div>
          ${st > 0 ? `<span class="lobby-status-pill completed">✓</span>` : `<span class="lobby-status-pill">In Progress</span>`}
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

    // CARD 2: LISTENING
    const listeningCardHtml = `
      <div class="lobby-step-card">
        <div class="lobby-step-header">
          <div>
            <div class="lobby-step-title">Listening</div>
            <div class="lobby-step-sub">4 Parts • ~30 minutes</div>
          </div>
          ${st > 1 ? `<span class="lobby-status-pill completed">✓</span>` : (st === 1 ? `<span class="lobby-status-pill" style="color:#111827; border-color:#111827;">Ready</span>` : `<span class="lobby-status-pill">Not started</span>`)}
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

    // CARD 3: READING
    const readingCardHtml = `
      <div class="lobby-step-card">
        <div class="lobby-step-header">
          <div>
            <div class="lobby-step-title">Reading</div>
            <div class="lobby-step-sub">3 Parts • 60 minutes</div>
          </div>
          ${st > 2 ? `<span class="lobby-status-pill completed">✓</span>` : (st === 2 ? `<span class="lobby-status-pill" style="color:#111827; border-color:#111827;">Ready</span>` : `<span class="lobby-status-pill">Not started</span>`)}
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

    // CARD 4: WRITING
    const writingCardHtml = `
      <div class="lobby-step-card">
        <div class="lobby-step-header">
          <div>
            <div class="lobby-step-title">Writing</div>
            <div class="lobby-step-sub">2 Parts • 60 minutes</div>
          </div>
          ${st > 3 ? `<span class="lobby-status-pill completed">✓</span>` : (st === 3 ? `<span class="lobby-status-pill" style="color:#111827; border-color:#111827;">Ready</span>` : `<span class="lobby-status-pill">Not started</span>`)}
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

    // Tự động chạy hiệu ứng chuyển Slide quy chế thi Listening giống trong video
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
    if (typeof currentExecutionMode !== 'undefined') currentExecutionMode = 'exam';
    if (typeof isPracticePaused !== 'undefined') isPracticePaused = false;
    const pb = document.getElementById('btnPracticePauseToggle'); if (pb) pb.style.display = 'none';
    document.getElementById('officialMockLobbyOverlay').style.display = 'none';
    launchListeningExam(mockSession.listeningExam.id);
    activateStrictMockListeningAudio();
    syncExamRoomBodyClass();
  };

  window.enterMockReadingRoomNow = function() {
    if (typeof currentExecutionMode !== 'undefined') currentExecutionMode = 'exam';
    if (typeof isPracticePaused !== 'undefined') isPracticePaused = false;
    const pb = document.getElementById('btnPracticePauseToggle'); if (pb) pb.style.display = 'none';
    document.getElementById('officialMockLobbyOverlay').style.display = 'none';
    launchExam(mockSession.readingExam.id);
    activateStrictMockListeningAudio();
    syncExamRoomBodyClass();
  };

  window.enterMockWritingRoomNow = function() {
    if (typeof currentExecutionMode !== 'undefined') currentExecutionMode = 'exam';
    if (typeof isPracticePaused !== 'undefined') isPracticePaused = false;
    const pb = document.getElementById('btnPracticePauseToggle'); if (pb) pb.style.display = 'none';
    document.getElementById('officialMockLobbyOverlay').style.display = 'none';
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
      document.getElementById('insperaExamTitle').textContent = tempW.title;
      document.getElementById('insperaCandidateTag').textContent = `👤 ${activeUser.name}`;
      document.getElementById('btnSubmitExam').style.display = '';
      document.getElementById('btnSubmitBottom').style.display = '';
      loadWritingWorkspace(activePartNum);
      setupResizer();
      startTimer();
    } else {
      launchWritingExam(tempW.id);
    }
    activateStrictMockListeningAudio();
    syncExamRoomBodyClass();
  };

  // Khi nộp từng kỹ năng trong Mock Test -> Quay lại Cổng Lobby 4 Bước, đánh dấu ✓ xanh và mở phần tiếp theo!
  submitExam = async function(forceSubmit = false) {
    if (!mockSession.active) {
      return _v11OrigSubmitExam(forceSubmit);
    }
    const skillName = mockSession.stage === 1 ? 'LISTENING' : (mockSession.stage === 2 ? 'READING' : 'WRITING');
    if (!forceSubmit && !confirm(`Hoàn thành phần thi ${skillName} (Finish section) và chuyển sang bước tiếp theo?`)) {
      return;
    }

    await _v11OrigSubmitExam(true);
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

  // Đồng bộ liên tục trạng thái phòng thi & giao diện sạch
  setInterval(() => {
    syncExamRoomBodyClass();
    upgradeSelectionTooltipToLightCard();
  }, 400);

/* === MODULE PART 25 (Lines 20186-20607) === */
/* ==========================================================================
     1. VÔ HIỆU HÓA #selectionTooltip ĐỂ CHỈ HIỆN 1 THANH HIGHLIGHT DUY NHẤT
     ========================================================================== */
  setupInExamHighlightEngine = function() {
    const oldTip = document.getElementById('selectionTooltip');
    if (oldTip) oldTip.style.display = 'none';
  };

  /* ==========================================================================
     2. CƠ CHẾ GỘP KẾT QUẢ MOCK TEST 3 KỸ NĂNG THÀNH 1 DÒNG DUY NHẤT
     ========================================================================== */
  function roundIeltsBand(num) {
    const n = parseFloat(num);
    if (isNaN(n) || n <= 0) return null;
    return (Math.round(n * 2) / 2).toFixed(1);
  }

  function extractNumericBand(bandStr) {
    if (!bandStr) return null;
    const str = String(bandStr).replace(/Band/i, '').replace(/\(Overall\)/i, '').trim();
    if (!str || str.toLowerCase() === 'submitted' || str.toLowerCase() === 'pending') return null;
    const m = str.match(/(\d+(?:\.\d+)?)/);
    return m ? parseFloat(m[1]) : null;
  }

  function isConsolidatedMockResult(res) {
    if (!res) return false;
    return Boolean(
      res.isMockConsolidated ||
      res.mockData ||
      String(res.examTitle || '').includes('[Full Mock Test]') ||
      (String(res.score || '').includes('🎧 L:') && String(res.score || '').includes('📖 R:'))
    );
  }

  // Kiểm tra xem bài Mock Test đã được chấm điểm Writing hay chưa
  function isMockWritingGraded(res) {
    if (!res) return false;
    if (res.mockData && res.mockData.writing) {
      const wBand = extractNumericBand(res.mockData.writing.band);
      if (wBand !== null) return true;
    }
    const scoreWMatch = String(res.score || '').match(/✍️\s*W:[^|]*\((?:Band\s*)?(\d+(?:\.\d+)?)\)/i);
    if (scoreWMatch) return true;
    // Nếu có teacherFeedback và band tổng không chứa chữ Pending/Submitted
    if (res.teacherFeedback && String(res.teacherFeedback).trim() !== '' && extractNumericBand(res.band) !== null) {
      return true;
    }
    return false;
  }

  // Lấy thông tin điểm 3 kỹ năng từ bản ghi Mock Test
  function parseMockScoresFromRecord(res) {
    const mData = res.mockData || {};
    const scoreStr = String(res.score || '');

    let lRaw = mData.listening?.score || '';
    let lBand = extractNumericBand(mData.listening?.band);
    if (!lRaw || lBand === null) {
      const lm = scoreStr.match(/L:\s*([0-9/]+)\s*\((?:Band\s*)?([0-9.]+)\)/i);
      if (lm) { lRaw = lRaw || lm[1]; if (lBand === null) lBand = parseFloat(lm[2]); }
    }

    let rRaw = mData.reading?.score || '';
    let rBand = extractNumericBand(mData.reading?.band);
    if (!rRaw || rBand === null) {
      const rm = scoreStr.match(/R:\s*([0-9/]+)\s*\((?:Band\s*)?([0-9.]+)\)/i);
      if (rm) { rRaw = rRaw || rm[1]; if (rBand === null) rBand = parseFloat(rm[2]); }
    }

    let wScoreText = mData.writing?.score || '';
    let wBand = extractNumericBand(mData.writing?.band);
    if (wBand === null) {
      const wm = scoreStr.match(/W:[^|]*\((?:Band\s*)?([0-9.]+)\)/i);
      if (wm) wBand = parseFloat(wm[1]);
    }

    const validBands = [lBand, rBand, wBand].filter(b => b !== null && !isNaN(b));
    const overall = validBands.length
      ? roundIeltsBand(validBands.reduce((a, b) => a + b, 0) / validBands.length)
      : (extractNumericBand(res.band) ? roundIeltsBand(extractNumericBand(res.band)) : '—');

    return {
      lRaw: lRaw || '—',
      lBand: lBand !== null ? lBand.toFixed(1) : '—',
      rRaw: rRaw || '—',
      rBand: rBand !== null ? rBand.toFixed(1) : '—',
      wScoreText: wScoreText || 'Submitted',
      wBand: wBand !== null ? wBand.toFixed(1) : null,
      overall: overall
    };
  }

  // Tự động gộp kết quả nếu học sinh đang trong phiên thi Mock Test (window.activeMockSession hoặc window.mockSession)
  const _mockOrigSubmitExam = submitExam;
  submitExam = async function(forceSubmit = false) {
    const currentMock = window.mockSession || window.activeMockSession;
    if (!currentMock || !currentMock.active) {
      return _mockOrigSubmitExam(forceSubmit);
    }

    const prevLen = (db.results || []).length;
    await _mockOrigSubmitExam(forceSubmit);

    // Nếu hàm gốc vừa đẩy 1 kết quả lẻ vào db.results trong lúc đang thi Mock Test:
    if ((db.results || []).length > prevLen) {
      const newlyPushed = db.results.pop(); // Lấy kết quả lẻ ra để cất vào phiên Mock
      const fs = (typeof getActiveFirestore === 'function') ? getActiveFirestore() : CLOUD_DB;
      if (fs && newlyPushed && newlyPushed.id) {
        try { await fs.collection('suite_results').doc(String(newlyPushed.id)).delete(); } catch (e) {}
      }

      if (!currentMock.collected) currentMock.collected = {};

      if (activeExamType === 'listening') {
        currentMock.collected.listening = {
          examId: activeExam.id,
          examTitle: activeExam.title,
          score: newlyPushed.score,
          band: newlyPushed.band,
          userAnswersCopy: newlyPushed.userAnswersCopy || JSON.parse(JSON.stringify(userAnswers || {}))
        };
      } else if (activeExamType === 'reading') {
        currentMock.collected.reading = {
          examId: activeExam.id,
          examTitle: activeExam.title,
          score: newlyPushed.score,
          band: newlyPushed.band,
          userAnswersCopy: newlyPushed.userAnswersCopy || JSON.parse(JSON.stringify(userAnswers || {}))
        };
      } else if (activeExamType === 'writing') {
        currentMock.collected.writing = {
          examId: activeExam.id,
          examTitle: activeExam.title,
          score: newlyPushed.score,
          band: newlyPushed.band,
          writingSubmission: newlyPushed.writingSubmission,
          teacherFeedback: newlyPushed.teacherFeedback || ''
        };

        // Đã hoàn thành kỹ năng cuối (Writing) -> Tạo 1 dòng kết quả Mock Test tổng hợp duy nhất
        const lObj = currentMock.collected.listening || {};
        const rObj = currentMock.collected.reading || {};
        const wObj = currentMock.collected.writing || {};

        const lBandNum = extractNumericBand(lObj.band);
        const rBandNum = extractNumericBand(rObj.band);
        const wBandNum = extractNumericBand(wObj.band);
        const nums = [lBandNum, rBandNum, wBandNum].filter(x => x !== null);
        const avgBand = nums.length ? roundIeltsBand(nums.reduce((a, b) => a + b, 0) / nums.length) : 'Pending';

        const wWords = (wObj.score || '').replace(/T1:\s*(\d+)w\s*\|\s*T2:\s*(\d+)w/i, (_, a, b) => `${Number(a) + Number(b)}w`);
        const wBandTag = wBandNum !== null ? ` (${wBandNum.toFixed(1)})` : '';

        const consolidatedRecord = {
          id: 'res_mock_' + Date.now(),
          isMockConsolidated: true,
          examId: currentMock.mockId || wObj.examId || 'mock_test',
          userName: activeUser.name,
          examTitle: `🎓 [Full Mock Test] ${currentMock.title || activeExam.title || 'IELTS Simulation'}`,
          score: `🎧 L: ${lObj.score || '0/40'} (${lBandNum !== null ? lBandNum.toFixed(1) : '—'}) | 📖 R: ${rObj.score || '0/40'} (${rBandNum !== null ? rBandNum.toFixed(1) : '—'}) | ✍️ W: ${wWords}${wBandTag}`,
          band: avgBand !== 'Pending' ? `Band ${avgBand} (Overall)` : 'Band Pending',
          writingSubmission: wObj.writingSubmission || { task1: '', task2: '' },
          teacherFeedback: wObj.teacherFeedback || '',
          mockData: {
            listening: lObj,
            reading: rObj,
            writing: wObj
          },
          isoDate: getTodayIsoString(),
          timestamp: new Date().toLocaleString()
        };

        db.results.push(consolidatedRecord);
        currentMock.active = false;

        if (fs) {
          try { await fs.collection('suite_results').doc(String(consolidatedRecord.id)).set(JSON.parse(JSON.stringify(consolidatedRecord))); } catch (e) {}
        }
        await persist();
        renderDashboard();
      }
    }
  };

  /* ==========================================================================
     3. BẢNG ĐIỀU KHIỂN MOCK TEST HUB MODAL & CHẤM WRITING TỰ CẬP NHẬT OVERALL
     ========================================================================== */
  window.openMockTestHubModal = function(resId) {
    const res = (db.results || []).find(r => r.id === resId);
    if (!res) return alert('Không tìm thấy dữ liệu bài thi Mock Test này.');

    const parsed = parseMockScoresFromRecord(res);
    const isTeacher = activeUser && activeUser.role === 'teacher';
    const writingGraded = isMockWritingGraded(res);

    document.getElementById('mockHubModalTitle').textContent = `${res.examTitle} — ${res.userName}`;

    const body = document.getElementById('mockHubModalBody');
    body.innerHTML = `
      <div style="background:linear-gradient(135deg,#ecfdf5,#eff6ff); border:1px solid #a7f3d0; border-radius:12px; padding:16px 20px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        <div>
          <div style="font-size:12px; font-weight:800; color:#047857; text-transform:uppercase;">Thí sinh: ${res.userName}</div>
          <div style="font-size:13px; color:#475569; margin-top:2px;">Ngày nộp: ${res.timestamp}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:11px; font-weight:800; color:#065f46; text-transform:uppercase;">Overall Band Score</div>
          <div style="font-size:26px; font-weight:800; color:#059669;">Band ${parsed.overall}</div>
        </div>
      </div>

      <!-- Kỹ năng 1: Listening -->
      <div class="mock-hub-skill-row">
        <div>
          <div style="font-weight:800; font-size:14.5px; color:#0f172a;">🎧 Kỹ năng 1: Listening</div>
          <div style="font-size:13px; color:#475569; margin-top:2px;">Kết quả: <b>${parsed.lRaw}</b> — <b style="color:#2563eb;">Band ${parsed.lBand}</b></div>
        </div>
        <button class="btn btn-secondary" onclick="reviewMockSkillPart('${res.id}', 'listening')">
          🎧 Xem lại đáp án & Transcript Listening
        </button>
      </div>

      <!-- Kỹ năng 2: Reading -->
      <div class="mock-hub-skill-row">
        <div>
          <div style="font-weight:800; font-size:14.5px; color:#0f172a;">📖 Kỹ năng 2: Reading</div>
          <div style="font-size:13px; color:#475569; margin-top:2px;">Kết quả: <b>${parsed.rRaw}</b> — <b style="color:#059669;">Band ${parsed.rBand}</b></div>
        </div>
        <button class="btn btn-secondary" onclick="reviewMockSkillPart('${res.id}', 'reading')">
          📖 Xem lại đáp án & Evidence Reading
        </button>
      </div>

      <!-- Kỹ năng 3: Writing -->
      <div class="mock-hub-skill-row">
        <div>
          <div style="font-weight:800; font-size:14.5px; color:#0f172a;">✍️ Kỹ năng 3: Writing (Task 1 & Task 2)</div>
          <div style="font-size:13px; color:#475569; margin-top:2px;">
            Trạng thái: ${writingGraded ? `<b style="color:#d97706;">Đã chấm — Band ${parsed.wBand}</b>` : `<span style="color:#64748b; font-style:italic;">⏳ Đang chờ giáo viên chấm điểm</span>`}
          </div>
        </div>
        <button class="btn btn-emerald" onclick="reviewMockSkillPart('${res.id}', 'writing')">
          ✍️ ${isTeacher ? 'Chấm bài / Sửa nhận xét Writing' : 'Xem bài làm & Nhận xét Writing'}
        </button>
      </div>
    `;

    const footer = document.getElementById('mockHubModalFooter');
    footer.innerHTML = `
      <div>
        ${writingGraded ? `
          <button class="btn btn-emerald" style="background:#047857;" onclick="openCleanMockScorePrintModal('${res.id}')">
            🖨️ In Kết Quả Mock Test
          </button>
        ` : `<span style="font-size:12px; color:#64748b;">💡 Nút in kết quả sẽ mở khóa sau khi giáo viên chấm điểm Writing.</span>`}
      </div>
      <button class="btn btn-secondary" onclick="closeModal('mockTestHubModal')">Đóng</button>
    `;

    openModal('mockTestHubModal');
  };

  window.reviewMockSkillPart = function(resId, skill) {
    const res = (db.results || []).find(r => r.id === resId);
    if (!res) return;
    closeModal('mockTestHubModal');

    const mData = res.mockData || {};
    if (skill === 'listening') {
      const lInfo = mData.listening || {};
      const lExam = (db.listeningExams || []).find(e => e.id === lInfo.examId || e.id === res.listeningExamId) || (db.listeningExams || [])[0];
      if (!lExam) return alert('Không tìm thấy đề Listening gốc của ca thi này.');
      launchListeningExam(lExam.id);
      userAnswers = lInfo.userAnswersCopy || res.listeningAnswers || {};
      enterReviewModeFromSummary();
    } else if (skill === 'reading') {
      const rInfo = mData.reading || {};
      const rExam = (db.readingExams || []).find(e => e.id === rInfo.examId || e.id === res.readingExamId) || (db.readingExams || [])[0];
      if (!rExam) return alert('Không tìm thấy đề Reading gốc của ca thi này.');
      launchExam(rExam.id);
      userAnswers = rInfo.userAnswersCopy || res.readingAnswers || {};
      enterReviewModeFromSummary();
    } else if (skill === 'writing') {
      if (activeUser && activeUser.role === 'teacher') {
        openGradeWritingModal(res.id);
      } else {
        openStudentViewWritingModal(res.id);
      }
    }
  };

  // Khi Giáo viên chấm xong Writing của bài Mock Test và bấm Save Evaluation -> Tự động tính lại Band Overall 3 kỹ năng!
  const _mockOrigSaveWritingEval = saveWritingEvaluation;
  saveWritingEvaluation = async function() {
    const resId = document.getElementById('gradeSubmissionId').value;
    const res = (db.results || []).find(r => r.id === resId);
    const bandInputVal = document.getElementById('gradeBandInput').value.trim();
    const fbInputVal = document.getElementById('gradeFeedbackInput').value.trim();

    if (res && isConsolidatedMockResult(res)) {
      const wNumeric = extractNumericBand(bandInputVal);
      if (wNumeric === null) return alert('Vui lòng nhập điểm Band Writing hợp lệ (VD: 6.5, 7.0)!');

      if (!res.mockData) res.mockData = {};
      if (!res.mockData.writing) res.mockData.writing = {};
      res.mockData.writing.band = wNumeric.toFixed(1);
      res.writingBand = wNumeric.toFixed(1);
      res.teacherFeedback = fbInputVal;

      const parsed = parseMockScoresFromRecord(res);
      const lB = extractNumericBand(parsed.lBand);
      const rB = extractNumericBand(parsed.rBand);
      const validList = [lB, rB, wNumeric].filter(v => v !== null && !isNaN(v));
      const newOverall = validList.length
        ? roundIeltsBand(validList.reduce((a, b) => a + b, 0) / validList.length)
        : wNumeric.toFixed(1);

      res.band = `Band ${newOverall} (Overall)`;

      // Cập nhật chuỗi hiển thị cột Score có kèm điểm Writing
      const baseScore = String(res.score || '').replace(/\s*\|\s*✍️\s*W:.*$/i, '');
      const w1 = res.writingSubmission?.task1?.trim() ? res.writingSubmission.task1.trim().split(/\s+/).length : 0;
      const w2 = res.writingSubmission?.task2?.trim() ? res.writingSubmission.task2.trim().split(/\s+/).length : 0;
      res.score = `${baseScore} | ✍️ W: ${w1 + w2}w (${wNumeric.toFixed(1)})`;

      const fs = (typeof getActiveFirestore === 'function') ? getActiveFirestore() : CLOUD_DB;
      if (fs && res.id) {
        try { await fs.collection('suite_results').doc(String(res.id)).set(JSON.parse(JSON.stringify(res))); } catch (e) {}
      }
      await persist();
      closeModal('gradeWritingModal');
      renderAnalyticsTable();
      renderHomeTab();
      alert(`✅ Đã lưu điểm Writing (Band ${wNumeric.toFixed(1)}) và tự động cập nhật Điểm Tổng Mock Test: Band ${newOverall} (Overall)!\n\nHọc sinh hiện đã có thể bấm nút "🖨️ In Kết Quả" cho bài Mock Test này.`);
      return;
    }

    _mockOrigSaveWritingEval();
  };

  /* ==========================================================================
     4. HÀM MỞ PHIẾU IN KẾT QUẢ MOCK TEST (CHỈ IN ĐIỂM SỐ GỌN SẠCH)
     ========================================================================== */
  window.openCleanMockScorePrintModal = function(resId) {
    const res = (db.results || []).find(r => r.id === resId);
    if (!res) return alert('Không tìm thấy kết quả Mock Test.');
    if (!isMockWritingGraded(res)) {
      return alert('Bài Mock Test này cần được giáo viên chấm điểm Writing trước khi in phiếu kết quả!');
    }

    const parsed = parseMockScoresFromRecord(res);
    document.getElementById('prtMockExamTitle').textContent = String(res.examTitle || 'IELTS MOCK TEST').replace('🎓', '').trim();
    document.getElementById('prtMockDate').textContent = `Date: ${res.timestamp || res.isoDate || ''}`;
    document.getElementById('prtMockStudentName').textContent = res.userName || '';

    document.getElementById('prtMockLBand').textContent = parsed.lBand;
    document.getElementById('prtMockLRaw').textContent = parsed.lRaw !== '—' ? `Correct: ${parsed.lRaw}` : '';

    document.getElementById('prtMockRBand').textContent = parsed.rBand;
    document.getElementById('prtMockRRaw').textContent = parsed.rRaw !== '—' ? `Correct: ${parsed.rRaw}` : '';

    document.getElementById('prtMockWBand').textContent = parsed.wBand !== null ? parsed.wBand : '—';
    document.getElementById('prtMockOverall').textContent = parsed.overall;

    openModal('mockCleanScorePrintModal');
  };

  // Tự động gắn nút "🎛️ Chi tiết Mock" và nút "🖨️ In Kết Quả" (khi đã chấm Writing) vào bảng Home & Submissions
  function upgradeMockTestRowsInTables() {
    const allTbodies = [
      document.getElementById('homeRecentActivityTbody'),
      document.getElementById('analyticsTbody')
    ].filter(Boolean);

    allTbodies.forEach(tbody => {
      tbody.querySelectorAll('tr').forEach(tr => {
        const actionCell = tr.querySelector('td:last-child');
        if (!actionCell) return;
        const firstBtn = actionCell.querySelector('button[onclick]');
        if (!firstBtn) return;

        const onclickStr = firstBtn.getAttribute('onclick') || '';
        const idMatch = onclickStr.match(/'([^']+)'/);
        if (!idMatch) return;
        const resId = idMatch[1];
        const res = (db.results || []).find(r => r.id === resId);
        if (!res || !isConsolidatedMockResult(res)) return;

        // Tránh gắn trùng lặp
        if (actionCell.dataset.mockUpgraded === '1') return;
        actionCell.dataset.mockUpgraded = '1';

        const graded = isMockWritingGraded(res);
        actionCell.innerHTML = `
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="btn btn-emerald" style="padding:5px 11px; font-size:12px;" onclick="openMockTestHubModal('${res.id}')">
              🎓 Chi tiết 3 Kỹ năng
            </button>
            ${graded ? `
              <button class="btn btn-secondary" style="padding:5px 11px; font-size:12px; color:#047857; border-color:#6ee7b7; background:#ecfdf5; font-weight:800;" onclick="openCleanMockScorePrintModal('${res.id}')">
                🖨️ In Kết Quả
              </button>
            ` : ''}
          </div>
        `;
      });
    });
  }

  const _mockOrigRenderHome = renderHomeTab;
  renderHomeTab = function() {
    _mockOrigRenderHome();
    upgradeMockTestRowsInTables();
  };

  const _mockOrigRenderAnalytics = renderAnalyticsTable;
  renderAnalyticsTable = function() {
    _mockOrigRenderAnalytics();
    upgradeMockTestRowsInTables();
  };

/* === MODULE PART 26 (Lines 20614-20905) === */
/* 1. CHUẨN HÓA BỘ ĐẾM SỐ CÂU TỪNG PASSAGE (KHÔNG BỊ NHẢY CÂU CỦA PASSAGE 2 VỀ PASSAGE 1) */
  let _cachedExamPartMap = { examId: null, map: {} };

  function extractQuestionNumbersFromPassageDOM(p) {
    const nums = new Set();
    const qHtml = String(p.questionsHtml || '');
    const pHtml = String(p.passageHtml || '');

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<div>${qHtml}</div>`, 'text/html');

      doc.querySelectorAll('[name]').forEach(el => {
        const m = String(el.getAttribute('name') || '').match(/^q?(\d+)$/i);
        if (m) nums.add(parseInt(m[1], 10));
      });
      doc.querySelectorAll('[data-target]').forEach(el => {
        const m = String(el.getAttribute('data-target') || '').match(/^q?(\d+)$/i);
        if (m) nums.add(parseInt(m[1], 10));
      });
      doc.querySelectorAll('[data-question]').forEach(el => {
        const raw = String(el.getAttribute('data-question') || '');
        (raw.match(/\d+/g) || []).forEach(n => nums.add(parseInt(n, 10)));
      });
      doc.querySelectorAll('[data-multi-pair], [data-pair-group]').forEach(el => {
        const raw = (el.getAttribute('data-multi-pair') || '') + ',' + (el.getAttribute('data-pair-group') || '');
        (raw.match(/\d+/g) || []).forEach(n => nums.add(parseInt(n, 10)));
      });
      doc.querySelectorAll('.q-badge').forEach(el => {
        const raw = String(el.textContent || '').trim();
        const rangeMatch = raw.match(/^(\d+)\s*[-–—]\s*(\d+)$/);
        if (rangeMatch) {
          const s = parseInt(rangeMatch[1], 10), e = parseInt(rangeMatch[2], 10);
          if (e >= s && (e - s) <= 6) {
            for (let k = s; k <= e; k++) nums.add(k);
          }
        } else {
          const singleMatch = raw.match(/^(\d+)$/);
          if (singleMatch) nums.add(parseInt(singleMatch[1], 10));
        }
      });

      // Quét riêng các ô kéo thả Matching Headings nằm bên trong bài đọc (passageHtml)
      const pDoc = parser.parseFromString(`<div>${pHtml}</div>`, 'text/html');
      pDoc.querySelectorAll('.drop-zone[data-target]').forEach(el => {
        const m = String(el.getAttribute('data-target') || '').match(/^q?(\d+)$/i);
        if (m) nums.add(parseInt(m[1], 10));
      });
    } catch (e) {}

    return nums;
  }

  function buildAccuratePartMapForActiveExam() {
    if (!activeExam) return {};
    const curExamSignature = `${activeExam.id}_${Object.keys(activeExam.correctAnswers || {}).length}`;
    if (_cachedExamPartMap.examId === curExamSignature) {
      return _cachedExamPartMap.map;
    }

    const passages = activeExam.passages || [];
    const partMap = {};
    const passageNumSets = {};

    passages.forEach(p => {
      passageNumSets[p.partNum] = extractQuestionNumbersFromPassageDOM(p);
    });

    const allKeys = Object.keys(activeExam.correctAnswers || {}).sort(
      (a, b) => parseInt(a.replace(/\D/g, ''), 10) - parseInt(b.replace(/\D/g, ''), 10)
    );

    // Gán trực tiếp câu hỏi tìm thấy trong DOM của từng Passage
    allKeys.forEach(qKey => {
      const qNum = parseInt(qKey.replace(/\D/g, ''), 10);
      for (const p of passages) {
        if (passageNumSets[p.partNum] && passageNumSets[p.partNum].has(qNum)) {
          partMap[qKey] = p.partNum;
          break;
        }
      }
    });

    // Với các câu hỏi đặc biệt chưa khớp trực tiếp, suy luận theo câu liền kề hoặc dải câu chuẩn IELTS
    allKeys.forEach((qKey, idx) => {
      if (partMap[qKey]) return;
      const qNum = parseInt(qKey.replace(/\D/g, ''), 10);

      for (let step = 1; step < allKeys.length; step++) {
        const prevKey = idx - step >= 0 ? allKeys[idx - step] : null;
        if (prevKey && partMap[prevKey]) {
          partMap[qKey] = partMap[prevKey];
          return;
        }
        const nextKey = idx + step < allKeys.length ? allKeys[idx + step] : null;
        if (nextKey && partMap[nextKey]) {
          partMap[qKey] = partMap[nextKey];
          return;
        }
      }

      if (passages.length === 3) {
        partMap[qKey] = qNum <= 13 ? passages[0].partNum : (qNum <= 26 ? passages[1].partNum : passages[2].partNum);
      } else if (passages.length === 4) {
        partMap[qKey] = qNum <= 10 ? passages[0].partNum : (qNum <= 20 ? passages[1].partNum : (qNum <= 30 ? passages[2].partNum : passages[3].partNum));
      } else {
        partMap[qKey] = passages[0] ? passages[0].partNum : 1;
      }
    });

    _cachedExamPartMap = { examId: curExamSignature, map: partMap };
    return partMap;
  }

  findPartForQuestionKey = function(qKey) {
    if (!activeExam) return 1;
    const map = buildAccuratePartMapForActiveExam();
    return map[qKey] || ((activeExam.passages && activeExam.passages[0]) ? activeExam.passages[0].partNum : 1);
  };

  /* 2. KHÓA & KHÔI PHỤC 100% ĐÁP ÁN KHI CHUYỂN QUA LẠI GIỮA CÁC PASSAGE */
  function normalizeQKey(rawName) {
    if (!rawName) return '';
    const clean = String(rawName).trim();
    if (/^q\d+$/i.test(clean)) return clean.toLowerCase();
    if (/^\d+$/.test(clean)) return 'q' + clean;
    return clean;
  }

  function harvestCurrentDOMAnswers() {
    if (isReviewMode || !activeExam || activeExamType === 'writing') return;
    const scope = document.getElementById('insperaSplitBox');
    if (!scope) return;

    // Lưu tất cả ô điền từ & select
    scope.querySelectorAll('input:not([type="radio"]):not([type="checkbox"]):not([type="button"]):not([type="submit"]), select, textarea').forEach(inp => {
      const rawName = inp.getAttribute('name') || inp.getAttribute('data-target') || '';
      const qKey = normalizeQKey(rawName);
      if (!qKey) return;
      const val = String(inp.value || '').trim();
      if (val !== '') {
        userAnswers[qKey] = val;
      } else {
        delete userAnswers[qKey];
      }
    });

    // Lưu tất cả Radio Buttons (Trắc nghiệm đơn, TFNG, YNNG, Bảng Matrix)
    scope.querySelectorAll('input[type="radio"]:checked').forEach(rad => {
      const qKey = normalizeQKey(rad.getAttribute('name'));
      if (qKey) userAnswers[qKey] = rad.value;
    });

    // Lưu tất cả Checkbox chọn nhiều đáp án (Choose TWO letters)
    const pairGroups = new Set();
    scope.querySelectorAll('input[type="checkbox"][data-pair-group]').forEach(chk => {
      pairGroups.add(chk.getAttribute('data-pair-group'));
    });
    pairGroups.forEach(groupName => {
      const allBoxes = Array.from(scope.querySelectorAll(`input[type="checkbox"][data-pair-group="${groupName}"]`));
      const checkedVals = allBoxes.filter(b => b.checked).map(b => b.value).sort();
      const qKeys = groupName.split(/[_,\s]+/).map(normalizeQKey).filter(Boolean);
      qKeys.forEach((k, idx) => {
        if (checkedVals[idx]) userAnswers[k] = checkedVals[idx];
        else delete userAnswers[k];
      });
    });

    scope.querySelectorAll('[data-multi-pair]').forEach(box => {
      const rawPair = box.getAttribute('data-multi-pair') || '';
      const qKeys = rawPair.split(/[_,\s]+/).map(normalizeQKey).filter(Boolean);
      const checkedVals = Array.from(box.querySelectorAll('input[type="checkbox"]:checked')).map(b => b.value).sort();
      if (qKeys.length) {
        qKeys.forEach((k, idx) => {
          if (checkedVals[idx]) userAnswers[k] = checkedVals[idx];
          else delete userAnswers[k];
        });
      }
    });
  }

  bindInputListeners = function(scope) {
    if (!scope) return;
    scope.querySelectorAll('input:not([type="checkbox"]):not([type="button"]), select, textarea').forEach(inp => {
      const handler = () => {
        if (isReviewMode) return;
        const qKey = normalizeQKey(inp.getAttribute('name') || inp.getAttribute('data-target'));
        if (!qKey) return;
        if (inp.type === 'radio') {
          if (inp.checked) userAnswers[qKey] = inp.value;
        } else {
          const val = String(inp.value || '').trim();
          if (val !== '') userAnswers[qKey] = val;
          else delete userAnswers[qKey];
        }
        updateFooterNav();
      };
      inp.addEventListener('input', handler);
      inp.addEventListener('change', handler);
    });

    scope.querySelectorAll('input[type="checkbox"]').forEach(chk => {
      chk.addEventListener('change', () => {
        if (isReviewMode) return;
        const groupName = chk.getAttribute('data-pair-group')
          || chk.closest('[data-multi-pair]')?.getAttribute('data-multi-pair')
          || chk.getAttribute('name') || '';
        const qNames = groupName.split(/[_,\s]+/).map(normalizeQKey).filter(Boolean);
        let allBoxes = [];
        if (chk.getAttribute('data-pair-group')) {
          allBoxes = Array.from(scope.querySelectorAll(`input[type="checkbox"][data-pair-group="${chk.getAttribute('data-pair-group')}"]`));
        } else if (chk.closest('[data-multi-pair]')) {
          allBoxes = Array.from(chk.closest('[data-multi-pair]').querySelectorAll('input[type="checkbox"]'));
        } else if (chk.name) {
          allBoxes = Array.from(scope.querySelectorAll(`input[type="checkbox"][name="${chk.name}"]`));
        }
        const checkedBoxes = allBoxes.filter(b => b.checked);
        if (qNames.length > 1 && checkedBoxes.length > qNames.length) {
          chk.checked = false;
          return alert(`Bạn chỉ được chọn tối đa ${qNames.length} đáp án cho nhóm câu hỏi này.`);
        }
        const selectedValues = checkedBoxes.map(b => b.value).sort();
        qNames.forEach((qKey, idx) => {
          if (selectedValues[idx]) userAnswers[qKey] = selectedValues[idx];
          else delete userAnswers[qKey];
        });
        updateFooterNav();
      });
    });
  };

  restoreUserAnswersInDOM = function(scope) {
    if (!scope) return;

    Object.keys(userAnswers).forEach(rawKey => {
      const name = normalizeQKey(rawKey);
      const rawNum = name.replace(/^q/i, '');
      const val = userAnswers[rawKey];
      if (val === undefined || val === null) return;

      scope.querySelectorAll(`input[name="${name}"]:not([type="radio"]):not([type="checkbox"]), input[name="${rawNum}"]:not([type="radio"]):not([type="checkbox"]), textarea[name="${name}"]`).forEach(inp => {
        inp.value = val;
      });

      scope.querySelectorAll(`select[name="${name}"], select[name="${rawNum}"]`).forEach(sel => {
        sel.value = val;
      });

      scope.querySelectorAll(`input[type="radio"][name="${name}"], input[type="radio"][name="${rawNum}"]`).forEach(rad => {
        if (String(rad.value).trim().toLowerCase() === String(val).trim().toLowerCase()) {
          rad.checked = true;
        }
      });

      const zone = scope.querySelector(`.drop-zone[data-target="${name}"], .drop-zone[data-target="${rawNum}"]`);
      if (zone && String(val).trim() !== '') {
        const item = scope.querySelector(`.drag-item[data-answer="${val}"]`);
        zone.textContent = item ? item.textContent.trim() : val;
        zone.classList.add('filled');
        if (item) item.classList.add('used');
      }
    });

    const pairGroups = new Set();
    scope.querySelectorAll('input[type="checkbox"][data-pair-group]').forEach(chk => {
      pairGroups.add(chk.getAttribute('data-pair-group'));
    });
    pairGroups.forEach(groupName => {
      const qKeys = groupName.split(/[_,\s]+/).map(normalizeQKey).filter(Boolean);
      const chosenVals = qKeys.map(k => userAnswers[k]).filter(Boolean).map(v => String(v).trim());
      scope.querySelectorAll(`input[type="checkbox"][data-pair-group="${groupName}"]`).forEach(box => {
        box.checked = chosenVals.includes(String(box.value).trim());
      });
    });

    scope.querySelectorAll('[data-multi-pair]').forEach(container => {
      const pairKeys = (container.getAttribute('data-multi-pair') || '').split(/[_,\s]+/).map(normalizeQKey).filter(Boolean);
      const chosenVals = pairKeys.map(k => userAnswers[k]).filter(Boolean).map(v => String(v).trim());
      container.querySelectorAll('input[type="checkbox"]').forEach(box => {
        box.checked = chosenVals.includes(String(box.value).trim());
      });
    });
  };

  // Tự động lưu chặt đáp án trên màn hình trước khi chuyển sang Passage/Part khác
  const _fixPassageSwitchOrig = switchExamPassage;
  switchExamPassage = function(partNum) {
    harvestCurrentDOMAnswers();
    _fixPassageSwitchOrig(partNum);
  };

/* === MODULE PART 27 (Lines 20912-21091) === */
/* ==========================================================================
     1. KHÓA CHẶT CÂU HỎI ĐÚNG PART (CHỐNG LẪN CÂU SANG PART KHÁC & MẤT ĐÁP ÁN)
     ========================================================================== */
  window.findPartForQuestionKey = function(qKey) {
    if (!activeExam) return 1;
    const qNum = parseInt(String(qKey || '').replace(/\D/g, ''), 10);
    const passages = activeExam.passages || [];
    if (!passages.length) return 1;

    // Bước 1: Quét DOM thực tế chỉ riêng trong ô câu hỏi (questionsHtml) và ô drop-zone của từng Part
    // (Tuyệt đối không quét chuỗi văn bản passageHtml để tránh bắt nhầm chữ q15 trong đoạn văn)
    for (const p of passages) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = (p.questionsHtml || '');
      const hasInputInQuestions = tempDiv.querySelector(
        `[name="${qKey}"], [data-target="${qKey}"], [data-question="${qNum}"], [data-multi-pair*="${qKey}"], [data-pair-group*="${qKey}"]`
      );
      if (hasInputInQuestions) {
        // Kiểm tra chéo với dải câu chuẩn của Listening (4 Parts: 1-10, 11-20, 21-30, 31-40)
        // Nếu đề có đủ 4 Part mà câu 15 lại bị dán nhầm HTML vào Part 1, tự động trả về đúng Part theo chuẩn số câu!
        if (activeExamType === 'listening' && passages.length === 4 && !isNaN(qNum)) {
          const standardPart = qNum <= 10 ? 1 : (qNum <= 20 ? 2 : (qNum <= 30 ? 3 : 4));
          // Chỉ cho phép nằm ở p.partNum nếu thực sự Part chuẩn không có ô input của câu đó
          const stdPassage = passages.find(x => x.partNum === standardPart);
          if (stdPassage && stdPassage.partNum !== p.partNum) {
            const stdDiv = document.createElement('div');
            stdDiv.innerHTML = (stdPassage.questionsHtml || '');
            const existsInStd = stdDiv.querySelector(
              `[name="${qKey}"], [data-target="${qKey}"], [data-question="${qNum}"], [data-multi-pair*="${qKey}"], [data-pair-group*="${qKey}"]`
            );
            if (existsInStd) return standardPart;
          }
        }
        return p.partNum;
      }

      // Kiểm tra riêng trường hợp Matching Headings (drop-zone nằm bên passageHtml)
      const leftDiv = document.createElement('div');
      leftDiv.innerHTML = (p.passageHtml || '');
      if (leftDiv.querySelector(`.drop-zone[data-target="${qKey}"]`)) {
        return p.partNum;
      }
    }

    // Bước 2: Phân bổ dự phòng chuẩn xác theo dải số câu IELTS nếu không dò thấy trong HTML
    if (!isNaN(qNum)) {
      if (activeExamType === 'listening' || passages.length === 4) {
        if (qNum <= 10) return passages[0]?.partNum || 1;
        if (qNum <= 20) return passages[1]?.partNum || 2;
        if (qNum <= 30) return passages[2]?.partNum || 3;
        return passages[3]?.partNum || 4;
      }
      if (passages.length === 3) {
        if (qNum <= 13) return passages[0]?.partNum || 1;
        if (qNum <= 26) return passages[1]?.partNum || 2;
        return passages[2]?.partNum || 3;
      }
    }
    return passages[0]?.partNum || 1;
  };

  /* ==========================================================================
     2. SỬA TRIỆT ĐỂ THANH ĐIỀU HƯỚNG DƯỚI CHÂN TRANG CHO BÀI WRITING
        (XÓA SẠCH 40 CÂU READING, CHỈ ĐỂ PART 1 & PART 2 Ở DƯỚI CÙNG)
     ========================================================================== */
  function renderCleanWritingFooterBar() {
    if (activeExamType !== 'writing' || !activeExam) return;

    // Ẩn thanh Part Tabs ở phía trên cùng khi làm bài Writing (chỉ dùng thanh dưới cùng)
    const topTabs = document.getElementById('insperaPartTabs');
    if (topTabs) {
      topTabs.innerHTML = '';
      topTabs.style.display = 'none';
    }

    const hasT1 = Boolean(activeExam.task1 && String(activeExam.task1.prompt || '').trim());
    const hasT2 = Boolean(activeExam.task2 && String(activeExam.task2.prompt || '').trim());

    const footerLabel = document.getElementById('footerSectionLabel');
    if (footerLabel) {
      footerLabel.textContent = `Writing Task ${activePartNum}`;
    }

    const footerList = document.getElementById('insperaFooterList');
    if (!footerList) return;

    const w1Text = (writingAnswers && writingAnswers.task1) ? writingAnswers.task1.trim() : '';
    const w2Text = (writingAnswers && writingAnswers.task2) ? writingAnswers.task2.trim() : '';
    const currentText = activePartNum === 1 ? w1Text : w2Text;
    const currentWords = currentText ? currentText.split(/\s+/).length : 0;

    // Xóa sạch mọi nút câu hỏi 1..40 của Reading/Listening còn sót lại và chỉ vẽ Part 1 & Part 2
    footerList.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        ${hasT1 ? `
          <button type="button" class="progress-item ${activePartNum === 1 ? 'current' : ''} ${w1Text.length > 0 ? 'answered' : ''}" 
            id="wfoot_1" onclick="switchWritingTask(1)" 
            style="min-width:92px; height:32px; padding:0 14px; font-size:13px; font-weight:800; border-radius:4px;">
            Part 1 (Task 1)
          </button>
        ` : ''}
        ${hasT2 ? `
          <button type="button" class="progress-item ${activePartNum === 2 ? 'current' : ''} ${w2Text.length > 0 ? 'answered' : ''}" 
            id="wfoot_2" onclick="switchWritingTask(2)" 
            style="min-width:92px; height:32px; padding:0 14px; font-size:13px; font-weight:800; border-radius:4px;">
            Part 2 (Task 2)
          </button>
        ` : ''}
        <span id="writingWordCountDisplay" style="margin-left:14px; font-weight:800; color:#111827; font-size:13px; background:#f3f4f6; padding:5px 12px; border-radius:4px; border:1px solid #d1d5db;">
          Word count: ${currentWords}
        </span>
      </div>
    `;
  }

  // Khôi phục lại hiển thị thanh Part Tabs phía trên khi làm bài Reading hoặc Listening
  const _fixOrigRenderPartPills = renderPartPills;
  renderPartPills = function() {
    if (activeExamType === 'writing') {
      const topTabs = document.getElementById('insperaPartTabs');
      if (topTabs) { topTabs.innerHTML = ''; topTabs.style.display = 'none'; }
      return;
    }
    const topTabs = document.getElementById('insperaPartTabs');
    if (topTabs) topTabs.style.display = 'flex';
    _fixOrigRenderPartPills();
  };

  // Chặn mọi lệnh buildFooterNav() và updateFooterNav() của Reading/Listening không cho ghi đè lên Writing
  const _fixOrigBuildFooterNav = buildFooterNav;
  buildFooterNav = function() {
    if (activeExamType === 'writing') {
      renderCleanWritingFooterBar();
      return;
    }
    _fixOrigBuildFooterNav();
  };

  const _fixOrigUpdateFooterNav = updateFooterNav;
  updateFooterNav = function() {
    if (activeExamType === 'writing') {
      renderCleanWritingFooterBar();
      return;
    }
    _fixOrigUpdateFooterNav();
  };

  // Đảm bảo khi khởi chạy bài Writing (kể cả trong Mock Test) luôn ép đúng activeExamType = 'writing' và hiện đủ Part 1 & Part 2
  const _fixOrigLaunchWriting = launchWritingExam;
  launchWritingExam = function(examId) {
    activeExamType = 'writing';
    _fixOrigLaunchWriting(examId);
    renderCleanWritingFooterBar();
    // Chạy lại thêm 1 nhịp sau 60ms để xóa triệt để nếu có script Mock Test nào vừa vẽ đè thanh 40 câu
    setTimeout(renderCleanWritingFooterBar, 60);
  };

  // Đảm bảo khi bấm chuyển giữa Part 1 (Task 1) và Part 2 (Task 2) luôn lưu bài đang gõ và cập nhật nút dưới chân trang
  window.switchWritingTask = function(taskNum) {
    activeExamType = 'writing';
    const currentEditor = document.getElementById('writingEditor');
    if (currentEditor) {
      if (activePartNum === 1) writingAnswers.task1 = currentEditor.value;
      else writingAnswers.task2 = currentEditor.value;
    }
    activePartNum = taskNum;
    loadWritingWorkspace(taskNum);
    renderCleanWritingFooterBar();
  };

  const _fixOrigHandleWritingInput = handleWritingInput;
  window.handleWritingInput = function(text) {
    _fixOrigHandleWritingInput(text);
    const wFootBtn = document.getElementById('wfoot_' + activePartNum);
    if (wFootBtn) {
      wFootBtn.classList.toggle('answered', String(text || '').trim().length > 0);
    }
  };

/* === MODULE PART 28 (Lines 21133-21196) === */
function forceRenderWritingFooterClean() {
    const isWritingScreen = (activeExamType === 'writing') || Boolean(document.getElementById('writingEditor'));
    if (!isWritingScreen || !activeExam) return;

    activeExamType = 'writing';

    const topTabs = document.getElementById('insperaPartTabs');
    if (topTabs) {
      topTabs.innerHTML = '';
      topTabs.style.display = 'none';
    }

    // Dò xem đề có Task 1 và Task 2 hay không (nếu là Mock Test thì mặc định bật cả 2 nút Part 1 & Part 2)
    const hasT1 = Boolean((activeExam.task1 && String(activeExam.task1.prompt || '').trim()) || (window.mockSession && window.mockSession.active));
    const hasT2 = Boolean((activeExam.task2 && String(activeExam.task2.prompt || '').trim()) || (window.mockSession && window.mockSession.active));

    const footerLabel = document.getElementById('footerSectionLabel');
    if (footerLabel) {
      footerLabel.style.display = '';
      footerLabel.textContent = `Writing Task ${activePartNum}`;
    }

    const footerList = document.getElementById('insperaFooterList');
    if (!footerList) return;

    const w1Text = (writingAnswers && writingAnswers.task1) ? writingAnswers.task1.trim() : '';
    const w2Text = (writingAnswers && writingAnswers.task2) ? writingAnswers.task2.trim() : '';
    const currentText = activePartNum === 1 ? w1Text : w2Text;
    const currentWords = currentText ? currentText.split(/\s+/).length : 0;

    footerList.style.cssText = 'display:flex !important; align-items:center !important; gap:10px !important; overflow:visible !important;';
    footerList.innerHTML = `
      ${hasT1 || (!hasT1 && !hasT2) ? `
        <button type="button" id="wfoot_1" class="writing-footer-pill ${activePartNum === 1 ? 'current' : ''} ${w1Text.length > 0 ? 'answered' : ''}" onclick="switchWritingTask(1)">
          Part 1 (Task 1)
        </button>
      ` : ''}
      ${hasT2 || (!hasT1 && !hasT2) ? `
        <button type="button" id="wfoot_2" class="writing-footer-pill ${activePartNum === 2 ? 'current' : ''} ${w2Text.length > 0 ? 'answered' : ''}" onclick="switchWritingTask(2)">
          Part 2 (Task 2)
        </button>
      ` : ''}
      <span id="writingWordCountDisplay" style="margin-left:10px; font-weight:800; color:#111827; font-size:13px; background:#f3f4f6; padding:6px 14px; border-radius:6px; border:1px solid #d1d5db; white-space:nowrap;">
        Word count: ${currentWords}
      </span>
    `;
  }

  // Ghi đè hàm renderCleanWritingFooterBar trước đó
  window.renderCleanWritingFooterBar = forceRenderWritingFooterClean;

  // Tự động theo dõi thanh Footer: Hễ đang ở màn hình Writing mà có hàm nào vẽ "Part 1 0 of 13" đè vào là lập tức đổi về 2 nút Part 1 & Part 2 ngay!
  const footerObserverTarget = document.getElementById('insperaFooterList');
  if (footerObserverTarget) {
    const writingFooterGuard = new MutationObserver(() => {
      const isWritingNow = (activeExamType === 'writing') || Boolean(document.getElementById('writingEditor'));
      if (isWritingNow && !document.getElementById('wfoot_1') && !document.getElementById('wfoot_2')) {
        forceRenderWritingFooterClean();
      }
    });
    writingFooterGuard.observe(footerObserverTarget, { childList: true });
  }

/* === MODULE PART 29 (Lines 21238-21306) === */
function forceRenderWritingFooterClean() {
    // Nhận diện chính xác đang ở màn hình làm bài Writing
    const hasWritingBox = Boolean(document.getElementById('writingEditor'));
    if (!hasWritingBox && activeExamType !== 'writing') return;

    activeExamType = 'writing';

    // Ẩn thanh Part Tabs ở trên cùng
    const topTabs = document.getElementById('insperaPartTabs');
    if (topTabs) {
      topTabs.innerHTML = '';
      topTabs.style.display = 'none';
    }

    const footerLabel = document.getElementById('footerSectionLabel');
    if (footerLabel) {
      footerLabel.style.display = 'none';
    }

    const footerList = document.getElementById('insperaFooterList');
    if (!footerList) return;

    const w1Text = (writingAnswers && writingAnswers.task1) ? writingAnswers.task1.trim() : '';
    const w2Text = (writingAnswers && writingAnswers.task2) ? writingAnswers.task2.trim() : '';
    const currentEditor = document.getElementById('writingEditor');
    const liveText = currentEditor ? currentEditor.value.trim() : (activePartNum === 1 ? w1Text : w2Text);
    const currentWords = liveText ? liveText.split(/\s+/).length : 0;

    footerList.style.cssText = 'display:flex !important; align-items:center !important; justify-content:space-between !important; width:100% !important; max-width:92% !important; gap:12px !important; overflow:visible !important; padding:0 8px !important;';
    footerList.innerHTML = `
      <button type="button" id="wfoot_1" class="writing-footer-pill ${activePartNum === 1 ? 'current' : ''} ${w1Text.length > 0 ? 'answered' : ''}" onclick="switchWritingTask(1)">
        Part 1 (Task 1)
      </button>
      <button type="button" id="wfoot_2" class="writing-footer-pill ${activePartNum === 2 ? 'current' : ''} ${w2Text.length > 0 ? 'answered' : ''}" onclick="switchWritingTask(2)">
        Part 2 (Task 2)
      </button>
      <span id="writingWordCountDisplay" style="font-weight:800; color:#111827; font-size:13px; background:#f3f4f6; padding:6px 14px; border-radius:6px; border:1px solid #d1d5db; white-space:nowrap;">
        Word count: ${currentWords}
      </span>
    `;
  }

  window.renderCleanWritingFooterBar = forceRenderWritingFooterClean;

  // Bọc trực tiếp vào hàm loadWritingWorkspace (hàm tạo ra ô #writingEditor mỗi khi mở bài Writing)
  const _guardOrigLoadWritingWorkspace = loadWritingWorkspace;
  window.loadWritingWorkspace = function(taskNum) {
    activeExamType = 'writing';
    _guardOrigLoadWritingWorkspace(taskNum);
    forceRenderWritingFooterClean();
    // Khóa chặt ở mọi mốc thời gian để đè bẹp mọi lệnh setTimeout của Reading/Mock Test chạy trễ
    [30, 100, 220, 400, 700].forEach(ms => setTimeout(forceRenderWritingFooterClean, ms));
  };

  // Canh gác toàn bộ khung phòng thi (#examShell): Hễ thấy #writingEditor xuất hiện mà dưới đáy chưa phải là nút #wfoot_1 thì lập tức sửa ngay lập tức!
  const examShellEl = document.getElementById('examShell');
  if (examShellEl) {
    const masterWritingObserver = new MutationObserver(() => {
      if (document.getElementById('writingEditor')) {
        const fList = document.getElementById('insperaFooterList');
        if (fList && (!document.getElementById('wfoot_1') || fList.textContent.includes(' of '))) {
          forceRenderWritingFooterClean();
        }
      }
    });
    masterWritingObserver.observe(examShellEl, { childList: true, subtree: true });
  }

/* === MODULE PART 30 (Lines 21529-22230) === */
/* ==========================================================================
     1. TẮT GỢI Ý TRÌNH DUYỆT (AUTOCOMPLETE="OFF") CHO TOÀN BỘ Ô NHẬP ĐÁP ÁN
     ========================================================================== */
  function disableBrowserAutofillInExam() {
    document.querySelectorAll('#examShell input, #examShell textarea, #examShell select').forEach(el => {
      el.setAttribute('autocomplete', 'off');
      el.setAttribute('autocorrect', 'off');
      el.setAttribute('autocapitalize', 'off');
      el.setAttribute('spellcheck', 'false');
    });
  }

  const _afOrigBindInputs = bindInputListeners;
  bindInputListeners = function(scope) {
    _afOrigBindInputs(scope);
    disableBrowserAutofillInExam();
  };

  /* ==========================================================================
     2. HIỂN THỊ "AI ĐANG ONLINE" CHO TẤT CẢ HỌC SINH & GIÁO VIÊN CÙNG THẤY
     ========================================================================== */
  renderTeacherOnlineMonitor = function() {
    const existingBar = document.getElementById('teacherOnlineMonitorBar');
    if (!activeUser) {
      if (existingBar) existingBar.style.display = 'none';
      return;
    }
    const homeTab = document.getElementById('tab-home');
    if (!homeTab) return;
    let bar = existingBar;
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'teacherOnlineMonitorBar';
      bar.className = 'online-monitor-bar';
      homeTab.insertBefore(bar, homeTab.firstChild);
    }
    bar.style.display = 'flex';
    const now = Date.now();

    const activeMembers = Object.values(onlinePresenceMap || {}).filter(p =>
      p && p.name && (now - (p.lastSeen || 0)) < 180000
    );

    if (!activeMembers.some(m => m.username === activeUser.username)) {
      activeMembers.unshift({
        username: activeUser.username,
        name: activeUser.name,
        role: activeUser.role,
        isPro: Boolean(typeof isStudentPro === 'function' && isStudentPro(activeUser)),
        activity: getCurrentStudentActivityLabel()
      });
    }

    bar.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; width:100%;">
        <span style="font-weight:800; font-size:13.5px; color:#065f46; margin-right:6px;">
          🟢 Thành viên đang Online (${activeMembers.length}):
        </span>
        ${activeMembers.map(st => {
          const roleBadge = st.role === 'teacher' ? '👨‍🏫' : (st.isPro ? '👑' : '👤');
          return `
            <div class="online-user-pill" title="${st.className || ''}">
              <span class="online-pulse-dot"></span>
              <span>${roleBadge} ${st.name}</span>
              <span style="font-weight:500; color:#047857; font-size:11.5px;">• ${st.activity || 'Đang học'}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  };

  /* ==========================================================================
     3. KHÔI PHỤC GIỮ CHUỖI HỌC TẬP (🔥 STREAK) & BẢNG XẾP HẠNG (🏆 LEADERBOARD)
     ========================================================================== */
  function extractResultIsoDate(res) {
    if (!res) return null;
    if (res.isoDate && /^\d{4}-\d{2}-\d{2}$/.test(res.isoDate)) return res.isoDate;
    const idMatch = String(res.id || '').match(/(\d{13})/);
    if (idMatch) {
      const dt = new Date(Number(idMatch[1]));
      if (!isNaN(dt.getTime())) {
        return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
      }
    }
    const parsed = new Date(res.timestamp);
    if (!isNaN(parsed.getTime())) {
      return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
    }
    return null;
  }

  function calculateUserStreakInfo(userName) {
    const myResults = (db.results || []).filter(r =>
      String(r.userName || '').trim().toLowerCase() === String(userName || '').trim().toLowerCase()
    );
    const activeDates = new Set();
    myResults.forEach(r => {
      const d = extractResultIsoDate(r);
      if (d) activeDates.add(d);
    });

    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const iso = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
      if (activeDates.has(iso)) {
        streak++;
      } else {
        if (i === 0) continue;
        break;
      }
    }

    const last7Days = [];
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      last7Days.push({
        label: i === 0 ? 'H.Nay' : dayNames[d.getDay()],
        done: activeDates.has(iso)
      });
    }

    return { streak, totalTests: myResults.length, last7Days };
  }

  function renderStreakAndLeaderboardSection() {
    if (!activeUser) return;
    const homeTab = document.getElementById('tab-home');
    const statGrid = homeTab ? homeTab.querySelector('.stat-grid') : null;
    if (!homeTab || !statGrid) return;

    let container = document.getElementById('gamificationStreakLeaderboardBox');
    if (!container) {
      container = document.createElement('div');
      container.id = 'gamificationStreakLeaderboardBox';
      container.className = 'gamification-row';
      statGrid.insertAdjacentElement('afterend', container);
    }

    const myStreakInfo = calculateUserStreakInfo(activeUser.name);

    const studentStatsMap = new Map();
    (db.results || []).forEach(r => {
      if (!r || !r.userName) return;
      const lowName = String(r.userName).trim().toLowerCase();
      if (lowName.includes('amuro') || lowName.includes('teacher') || lowName === 'admin') return;
      const uObj = (db.users || []).find(u => String(u.name || '').trim().toLowerCase() === lowName);
      if (uObj && uObj.role === 'teacher') return;

      if (!studentStatsMap.has(r.userName)) {
        studentStatsMap.set(r.userName, {
          name: r.userName,
          isPro: Boolean(uObj && uObj.isPro),
          count: 0,
          bands: []
        });
      }
      const entry = studentStatsMap.get(r.userName);
      entry.count++;
      const bNum = parseFloat(String(r.band || '').replace(/Band/i, '').replace(/\(Overall\)/i, '').trim());
      if (!isNaN(bNum) && bNum >= 1 && bNum <= 9) {
        entry.bands.push(bNum);
      }
    });

    const leaderboardList = Array.from(studentStatsMap.values()).map(item => {
      const avg = item.bands.length
        ? (item.bands.reduce((a, b) => a + b, 0) / item.bands.length).toFixed(1)
        : '—';
      const stInfo = calculateUserStreakInfo(item.name);
      return { ...item, avgBand: avg, streak: stInfo.streak };
    }).sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return (parseFloat(b.avgBand) || 0) - (parseFloat(a.avgBand) || 0);
    }).slice(0, 5);

    container.innerHTML = `
      <div class="streak-card-box">
        <div>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:12px; font-weight:800; color:#b45309; text-transform:uppercase; letter-spacing:0.6px;">🔥 Chuỗi Học Tập Liên Tục</span>
            <span style="background:#fef3c7; border:1px solid #f59e0b; color:#92400e; padding:2px 9px; border-radius:999px; font-size:11.5px; font-weight:800;">
              Tổng: ${myStreakInfo.totalTests} bài đã hoàn thành
            </span>
          </div>
          <div style="display:flex; align-items:baseline; gap:10px; margin-top:10px;">
            <span style="font-size:38px; font-weight:900; color:#d97706; line-height:1;">${myStreakInfo.streak}</span>
            <span style="font-size:15px; font-weight:800; color:#78350f;">ngày giữ chuỗi liên tiếp!</span>
          </div>
          <div style="font-size:12.5px; color:#92400e; margin-top:6px;">
            ${myStreakInfo.streak > 0
              ? 'Tuyệt vời! Hãy hoàn thành ít nhất 1 bài mỗi ngày để giữ ngọn lửa không tắt nhé!'
              : 'Hãy làm ngay 1 đề Reading, Listening hoặc Writing hôm nay để bắt đầu thắp sáng chuỗi Streak!'}
          </div>
        </div>
        <div class="streak-days-row">
          ${myStreakInfo.last7Days.map(d => `
            <div class="streak-day-circle ${d.done ? 'active' : ''}">
              <div>${d.label}</div>
              <div style="font-size:13px; margin-top:2px;">${d.done ? '🔥' : '⚪'}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="leaderboard-card-box">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <div style="font-size:15px; font-weight:800; color:#0f172a;">🏆 Bảng Xếp Hạng Học Viên Chăm Chỉ</div>
          <span style="font-size:11.5px; color:#64748b; font-weight:700;">Cập nhật theo thời gian thực</span>
        </div>
        ${!leaderboardList.length ? `
          <div style="text-align:center; color:#94a3b8; padding:26px 10px; font-size:13px;">Chưa có dữ liệu xếp hạng học viên.</div>
        ` : leaderboardList.map((stu, idx) => {
          const medal = idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : `#${idx + 1}`));
          return `
            <div class="lb-item-row">
              <div style="display:flex; align-items:center; gap:10px;">
                <span style="font-size:16px; font-weight:900; min-width:24px; text-align:center;">${medal}</span>
                <div>
                  <b style="color:#0f172a;">${stu.name}</b> ${stu.isPro ? '<span style="color:#d97706; font-size:11px; font-weight:800;">👑 PRO</span>' : ''}
                  ${stu.streak > 0 ? `<span style="background:#ffedd5; color:#c2410c; padding:1px 6px; border-radius:6px; font-size:10.5px; font-weight:800; margin-left:6px;">🔥 ${stu.streak}d</span>` : ''}
                </div>
              </div>
              <div style="display:flex; align-items:center; gap:10px;">
                <span style="background:#ecfdf5; color:#047857; padding:3px 9px; border-radius:999px; font-weight:800; font-size:11.5px;">
                  ✅ ${stu.count} đề
                </span>
                <span style="font-weight:800; color:#0f172a; font-size:12.5px; min-width:68px; text-align:right;">
                  Avg: ${stu.avgBand}
                </span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  /* ==========================================================================
     4. SỬA TRIỆT ĐỂ BỘ LỌC "ĐÃ HOÀN THÀNH (DONE) / CHƯA LÀM (TO-DO)" Ở MỨC DỮ LIỆU GỐC
     ========================================================================== */
  function isExamCompletedByActiveUser(examObj, skillType) {
    if (!activeUser || !examObj) return false;
    const doneIds = (typeof getStudentCompletedExamIds === 'function') ? getStudentCompletedExamIds(skillType) : [];
    if (doneIds.includes(examObj.id)) return true;

    const cleanExamTitle = String(examObj.title || '').trim().toLowerCase();
    return (db.results || []).some(r => {
      if (String(r.userName || '').trim().toLowerCase() !== String(activeUser.name || '').trim().toLowerCase()) return false;
      if (r.examId === examObj.id) return true;
      if (cleanExamTitle && String(r.examTitle || '').trim().toLowerCase() === cleanExamTitle) return true;
      if (r.mockData) {
        if (skillType === 'listening' && (r.mockData.listening?.examId === examObj.id || String(r.mockData.listening?.examTitle || '').trim().toLowerCase() === cleanExamTitle)) return true;
        if (skillType === 'reading' && (r.mockData.reading?.examId === examObj.id || String(r.mockData.reading?.examTitle || '').trim().toLowerCase() === cleanExamTitle)) return true;
        if (skillType === 'writing' && (r.mockData.writing?.examId === examObj.id || String(r.mockData.writing?.examTitle || '').trim().toLowerCase() === cleanExamTitle)) return true;
      }
      return false;
    });
  }

  const _filterOrigGetVisibleExams = getVisibleExams;
  getVisibleExams = function(examList) {
    const baseList = _filterOrigGetVisibleExams(examList);
    if (!Array.isArray(baseList) || !baseList.length) return baseList;

    let skillType = null;
    let statusSelectId = null;
    if (examList === db.readingExams) {
      skillType = 'reading';
      statusSelectId = 'filterReadingDoneStatus';
    } else if (examList === db.listeningExams) {
      skillType = 'listening';
      statusSelectId = 'filterListeningDoneStatus';
    } else if (examList === db.writingExams) {
      skillType = 'writing';
      statusSelectId = 'filterWritingDoneStatus';
    }

    if (!skillType || !statusSelectId) return baseList;
    const statusFilterVal = document.getElementById(statusSelectId)?.value || 'ALL';
    if (statusFilterVal === 'ALL') return baseList;

    return baseList.filter(ex => {
      const done = isExamCompletedByActiveUser(ex, skillType);
      return statusFilterVal === 'DONE' ? done : !done;
    });
  };

  /* ==========================================================================
     5. TỰ ĐỘNG GỘP 3 BÀI LẺ CỦA MOCK TEST (L + R + W) THÀNH 1 DÒNG MOCK TEST DUY NHẤT
        & MỞ KHÓA NÚT IN PHIẾU ĐIỂM SAU KHI CHẤM WRITING
     ========================================================================== */
  function roundIeltsBand(num) {
    const n = parseFloat(num);
    if (isNaN(n) || n <= 0) return null;
    return (Math.round(n * 2) / 2).toFixed(1);
  }

  function extractNumericBand(bandStr) {
    if (!bandStr) return null;
    const str = String(bandStr).replace(/Band/i, '').replace(/\(Overall\)/i, '').trim();
    if (!str || str.toLowerCase().includes('submit') || str.toLowerCase().includes('pending') || str.toLowerCase().includes('chờ')) return null;
    const m = str.match(/(\d+(?:\.\d+)?)/);
    return m ? parseFloat(m[1]) : null;
  }

  function isConsolidatedMockResult(res) {
    if (!res) return false;
    return Boolean(
      res.isMockConsolidated ||
      res.mockData ||
      String(res.examTitle || '').includes('[Full Mock Test]') ||
      (String(res.score || '').includes('🎧 L:') && String(res.score || '').includes('📖 R:'))
    );
  }

  function isMockWritingGraded(res) {
    if (!res) return false;
    if (res.mockData && res.mockData.writing) {
      if (extractNumericBand(res.mockData.writing.band) !== null) return true;
    }
    if (extractNumericBand(res.writingBand) !== null) return true;
    if (/✍️\s*W:[^|]*\((?:Band\s*)?(\d+(?:\.\d+)?)\)/i.test(String(res.score || ''))) return true;
    return false;
  }

  async function autoMergeStandaloneMockTriplets() {
    if (!db || !Array.isArray(db.results) || db.results.length < 3) return false;
    let mergedAny = false;
    const fs = (typeof getActiveFirestore === 'function') ? getActiveFirestore() : CLOUD_DB;

    for (let i = db.results.length - 1; i >= 2; i--) {
      const wRes = db.results[i];
      if (!wRes || isConsolidatedMockResult(wRes)) continue;
      const isWriting = Boolean(wRes.writingSubmission || String(wRes.id || '').startsWith('res_w_'));
      if (!isWriting) continue;

      const isWritingMockNamed = String(wRes.examTitle || '').toLowerCase().includes('mock');
      let rIdx = -1, lIdx = -1;
      for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
        const cand = db.results[j];
        if (!cand || isConsolidatedMockResult(cand)) continue;
        if (String(cand.userName || '').toLowerCase() !== String(wRes.userName || '').toLowerCase()) continue;
        if (cand.isoDate && wRes.isoDate && cand.isoDate !== wRes.isoDate) continue;

        const sType = (typeof detectResultSkillType === 'function') ? detectResultSkillType(cand) : 'reading';
        if (sType === 'reading' && rIdx === -1) rIdx = j;
        else if (sType === 'listening' && lIdx === -1) lIdx = j;
      }

      if (isWritingMockNamed && rIdx !== -1 && lIdx !== -1) {
        const lRes = db.results[lIdx];
        const rRes = db.results[rIdx];

        const lBandNum = extractNumericBand(lRes.band);
        const rBandNum = extractNumericBand(rRes.band);
        const wBandNum = extractNumericBand(wRes.band);

        const wWords = String(wRes.score || '0w');
        const wBandText = wBandNum !== null ? ` (${wBandNum.toFixed(1)})` : ' (Chờ chấm)';

        let overallBandStr = 'Chờ chấm Writing';
        if (wBandNum !== null) {
          const valid = [lBandNum, rBandNum, wBandNum].filter(x => x !== null);
          overallBandStr = `Band ${roundIeltsBand(valid.reduce((a, b) => a + b, 0) / valid.length)} (Overall)`;
        }

        const cleanWTitle = String(wRes.examTitle || '').replace(/^Writing Mock\s*/i, '').trim();
        const mockTitle = `🎓 [Full Mock Test] ${lRes.examTitle} + ${rRes.examTitle}`;

        wRes.isMockConsolidated = true;
        wRes.examTitle = mockTitle;
        wRes.score = `🎧 L: ${lRes.score} (${lBandNum !== null ? lBandNum.toFixed(1) : '—'}) | 📖 R: ${rRes.score} (${rBandNum !== null ? rBandNum.toFixed(1) : '—'}) | ✍️ W: ${wWords}${wBandText}`;
        wRes.band = overallBandStr;
        wRes.writingBand = wBandNum !== null ? wBandNum.toFixed(1) : null;
        wRes.mockData = {
          listening: {
            examId: lRes.examId,
            examTitle: lRes.examTitle,
            score: lRes.score,
            band: lBandNum !== null ? lBandNum.toFixed(1) : lRes.band,
            userAnswersCopy: lRes.userAnswersCopy || {}
          },
          reading: {
            examId: rRes.examId,
            examTitle: rRes.examTitle,
            score: rRes.score,
            band: rBandNum !== null ? rBandNum.toFixed(1) : rRes.band,
            userAnswersCopy: rRes.userAnswersCopy || {}
          },
          writing: {
            examId: wRes.examId,
            examTitle: cleanWTitle || wRes.examTitle,
            score: wRes.score,
            band: wBandNum !== null ? wBandNum.toFixed(1) : 'Submitted'
          }
        };

        const removeIds = [lRes.id, rRes.id];
        db.results = db.results.filter(item => !removeIds.includes(item.id));
        mergedAny = true;

        if (fs) {
          try {
            await fs.collection('suite_results').doc(String(wRes.id)).set(JSON.parse(JSON.stringify(wRes)));
            for (const oldId of removeIds) {
              if (oldId) await fs.collection('suite_results').doc(String(oldId)).delete();
            }
          } catch (e) {}
        }
        break;
      }
    }
    return mergedAny;
  }

  function parseMockScoresFromRecord(res) {
    const mData = res.mockData || {};
    const scoreStr = String(res.score || '');

    let lRaw = mData.listening?.score || '';
    let lBand = extractNumericBand(mData.listening?.band);
    if (!lRaw || lBand === null) {
      const lm = scoreStr.match(/L:\s*([0-9/]+)\s*\((?:Band\s*)?([0-9.]+)\)/i);
      if (lm) { lRaw = lRaw || lm[1]; if (lBand === null) lBand = parseFloat(lm[2]); }
    }

    let rRaw = mData.reading?.score || '';
    let rBand = extractNumericBand(mData.reading?.band);
    if (!rRaw || rBand === null) {
      const rm = scoreStr.match(/R:\s*([0-9/]+)\s*\((?:Band\s*)?([0-9.]+)\)/i);
      if (rm) { rRaw = rRaw || rm[1]; if (rBand === null) rBand = parseFloat(rm[2]); }
    }

    let wBand = extractNumericBand(res.writingBand) ?? extractNumericBand(mData.writing?.band);
    if (wBand === null) {
      const wm = scoreStr.match(/W:[^|]*\((?:Band\s*)?([0-9.]+)\)/i);
      if (wm) wBand = parseFloat(wm[1]);
    }

    const validBands = [lBand, rBand, wBand].filter(b => b !== null && !isNaN(b));
    const overall = (wBand !== null && validBands.length)
      ? roundIeltsBand(validBands.reduce((a, b) => a + b, 0) / validBands.length)
      : 'Chờ chấm W';

    return {
      lRaw: lRaw || '—',
      lBand: lBand !== null ? lBand.toFixed(1) : '—',
      rRaw: rRaw || '—',
      rBand: rBand !== null ? rBand.toFixed(1) : '—',
      wBand: wBand !== null ? wBand.toFixed(1) : null,
      overall: overall
    };
  }

  window.openMockTestHubModal = function(resId) {
    const res = (db.results || []).find(r => r.id === resId);
    if (!res) return alert('Không tìm thấy dữ liệu bài thi Mock Test này.');

    const parsed = parseMockScoresFromRecord(res);
    const isTeacher = activeUser && activeUser.role === 'teacher';
    const writingGraded = isMockWritingGraded(res);

    document.getElementById('mockHubModalTitle').textContent = `${res.examTitle} — ${res.userName}`;

    const body = document.getElementById('mockHubModalBody');
    body.innerHTML = `
      <div style="background:linear-gradient(135deg,#ecfdf5,#eff6ff); border:1px solid #a7f3d0; border-radius:12px; padding:16px 20px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        <div>
          <div style="font-size:12px; font-weight:800; color:#047857; text-transform:uppercase;">Thí sinh: ${res.userName}</div>
          <div style="font-size:13px; color:#475569; margin-top:2px;">Thời gian nộp: ${res.timestamp}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:11px; font-weight:800; color:#065f46; text-transform:uppercase;">Overall Mock Band</div>
          <div style="font-size:24px; font-weight:800; color:#059669;">${writingGraded ? 'Band ' + parsed.overall : '⏳ Chờ chấm Writing'}</div>
        </div>
      </div>

      <div class="mock-hub-skill-row">
        <div>
          <div style="font-weight:800; font-size:14.5px; color:#0f172a;">🎧 Kỹ năng 1: Listening (${res.mockData?.listening?.examTitle || 'Listening'})</div>
          <div style="font-size:13px; color:#475569; margin-top:2px;">Điểm: <b>${parsed.lRaw}</b> — <b style="color:#2563eb;">Band ${parsed.lBand}</b></div>
        </div>
        <button class="btn btn-secondary" onclick="reviewMockSkillPart('${res.id}', 'listening')">🔍 Xem lại Listening</button>
      </div>

      <div class="mock-hub-skill-row">
        <div>
          <div style="font-weight:800; font-size:14.5px; color:#0f172a;">📖 Kỹ năng 2: Reading (${res.mockData?.reading?.examTitle || 'Reading'})</div>
          <div style="font-size:13px; color:#475569; margin-top:2px;">Điểm: <b>${parsed.rRaw}</b> — <b style="color:#059669;">Band ${parsed.rBand}</b></div>
        </div>
        <button class="btn btn-secondary" onclick="reviewMockSkillPart('${res.id}', 'reading')">🔍 Xem lại Reading</button>
      </div>

      <div class="mock-hub-skill-row">
        <div>
          <div style="font-weight:800; font-size:14.5px; color:#0f172a;">✍️ Kỹ năng 3: Writing (Task 1 & Task 2)</div>
          <div style="font-size:13px; color:#475569; margin-top:2px;">
            Trạng thái: ${writingGraded ? `<b style="color:#d97706;">Đã chấm — Band ${parsed.wBand}</b>` : `<span style="color:#dc2626; font-weight:700;">⏳ Chưa chấm điểm</span>`}
          </div>
        </div>
        <button class="btn btn-emerald" onclick="reviewMockSkillPart('${res.id}', 'writing')">
          ✍️ ${isTeacher ? 'Chấm điểm Writing' : 'Xem bài & Nhận xét Writing'}
        </button>
      </div>
    `;

    const footer = document.getElementById('mockHubModalFooter');
    footer.innerHTML = `
      <div>
        ${writingGraded ? `
          <button class="btn btn-emerald" style="background:#047857;" onclick="openCleanMockScorePrintModal('${res.id}')">
            🖨️ In Phiếu Điểm Mock Test
          </button>
        ` : `<span style="font-size:12px; color:#64748b;">💡 Sau khi giáo viên chấm điểm Writing, nút In Phiếu Điểm sẽ xuất hiện tại đây.</span>`}
      </div>
      <button class="btn btn-secondary" onclick="closeModal('mockTestHubModal')">Đóng</button>
    `;

    openModal('mockTestHubModal');
  };

  window.reviewMockSkillPart = function(resId, skill) {
    const res = (db.results || []).find(r => r.id === resId);
    if (!res) return;
    closeModal('mockTestHubModal');

    const mData = res.mockData || {};
    if (skill === 'listening') {
      const lInfo = mData.listening || {};
      const lExam = (db.listeningExams || []).find(e => e.id === lInfo.examId || e.title === lInfo.examTitle) || (db.listeningExams || [])[0];
      if (!lExam) return alert('Không tìm thấy đề Listening gốc.');
      launchListeningExam(lExam.id);
      userAnswers = lInfo.userAnswersCopy || {};
      enterReviewModeFromSummary();
    } else if (skill === 'reading') {
      const rInfo = mData.reading || {};
      const rExam = (db.readingExams || []).find(e => e.id === rInfo.examId || e.title === rInfo.examTitle) || (db.readingExams || [])[0];
      if (!rExam) return alert('Không tìm thấy đề Reading gốc.');
      launchExam(rExam.id);
      userAnswers = rInfo.userAnswersCopy || {};
      enterReviewModeFromSummary();
    } else if (skill === 'writing') {
      if (activeUser && activeUser.role === 'teacher') {
        openGradeWritingModal(res.id);
      } else {
        openStudentViewWritingModal(res.id);
      }
    }
  };

  saveWritingEvaluation = async function() {
    const resId = document.getElementById('gradeSubmissionId').value;
    const res = (db.results || []).find(r => r.id === resId);
    if (!res) return;

    const bandVal = document.getElementById('gradeBandInput').value.trim();
    const fbVal = document.getElementById('gradeFeedbackInput').value.trim();

    if (isConsolidatedMockResult(res)) {
      const wNumeric = extractNumericBand(bandVal);
      if (wNumeric === null) return alert('Vui lòng nhập điểm Band Writing hợp lệ (ví dụ: 6.5, 7.0)!');

      if (!res.mockData) res.mockData = {};
      if (!res.mockData.writing) res.mockData.writing = {};
      res.mockData.writing.band = wNumeric.toFixed(1);
      res.writingBand = wNumeric.toFixed(1);
      res.teacherFeedback = fbVal;

      const parsed = parseMockScoresFromRecord(res);
      const lB = extractNumericBand(parsed.lBand);
      const rB = extractNumericBand(parsed.rBand);
      const validList = [lB, rB, wNumeric].filter(v => v !== null && !isNaN(v));
      const newOverall = validList.length
        ? roundIeltsBand(validList.reduce((a, b) => a + b, 0) / validList.length)
        : wNumeric.toFixed(1);

      res.band = `Band ${newOverall} (Overall)`;
      const baseScore = String(res.score || '').replace(/\s*\|\s*✍️\s*W:.*$/i, '');
      const w1 = res.writingSubmission?.task1?.trim() ? res.writingSubmission.task1.trim().split(/\s+/).length : 0;
      const w2 = res.writingSubmission?.task2?.trim() ? res.writingSubmission.task2.trim().split(/\s+/).length : 0;
      res.score = `${baseScore} | ✍️ W: T1: ${w1}w, T2: ${w2}w (${wNumeric.toFixed(1)})`;

      const fs = (typeof getActiveFirestore === 'function') ? getActiveFirestore() : CLOUD_DB;
      if (fs && res.id) {
        try { await fs.collection('suite_results').doc(String(res.id)).set(JSON.parse(JSON.stringify(res))); } catch (e) {}
      }
      await persist();
      closeModal('gradeWritingModal');
      renderDashboard();
      alert(`✅ Đã chấm Writing (Band ${wNumeric.toFixed(1)}) và tính điểm Overall Mock Test: Band ${newOverall}!\n\nBây giờ học sinh đã có thể bấm nút "🖨️ In Phiếu Điểm" cho bài Mock Test này.`);
      return;
    }

    if (bandVal) res.band = bandVal.startsWith('Band') ? bandVal : `Band ${bandVal}`;
    res.teacherFeedback = fbVal;
    const fs = (typeof getActiveFirestore === 'function') ? getActiveFirestore() : CLOUD_DB;
    if (fs && res.id) {
      try { await fs.collection('suite_results').doc(String(res.id)).set(JSON.parse(JSON.stringify(res))); } catch (e) {}
    }
    await persist();
    closeModal('gradeWritingModal');
    renderDashboard();
    alert('Đã lưu điểm và nhận xét bài Writing!');
  };

  window.openCleanMockScorePrintModal = function(resId) {
    const res = (db.results || []).find(r => r.id === resId);
    if (!res) return alert('Không tìm thấy kết quả Mock Test.');
    if (!isMockWritingGraded(res)) {
      return alert('Bài Mock Test này cần được giáo viên chấm điểm Writing trước khi in phiếu điểm!');
    }

    const parsed = parseMockScoresFromRecord(res);
    document.getElementById('prtMockExamTitle').textContent = String(res.examTitle || 'IELTS MOCK TEST').replace('🎓', '').trim();
    document.getElementById('prtMockDate').textContent = `Date: ${res.timestamp || res.isoDate || ''}`;
    document.getElementById('prtMockStudentName').textContent = res.userName || '';

    document.getElementById('prtMockLBand').textContent = parsed.lBand;
    document.getElementById('prtMockLRaw').textContent = parsed.lRaw !== '—' ? `Score: ${parsed.lRaw}` : '';

    document.getElementById('prtMockRBand').textContent = parsed.rBand;
    document.getElementById('prtMockRRaw').textContent = parsed.rRaw !== '—' ? `Score: ${parsed.rRaw}` : '';

    document.getElementById('prtMockWBand').textContent = parsed.wBand !== null ? parsed.wBand : '—';
    document.getElementById('prtMockOverall').textContent = parsed.overall;

    openModal('mockCleanScorePrintModal');
  };

  function upgradeMockTestRowsInTables() {
    const allTbodies = [
      document.getElementById('homeRecentActivityTbody'),
      document.getElementById('analyticsTbody')
    ].filter(Boolean);

    allTbodies.forEach(tbody => {
      tbody.querySelectorAll('tr').forEach(tr => {
        const actionCell = tr.querySelector('td:last-child');
        if (!actionCell) return;
        const firstBtn = actionCell.querySelector('button[onclick]');
        if (!firstBtn) return;

        const onclickStr = firstBtn.getAttribute('onclick') || '';
        const idMatch = onclickStr.match(/'([^']+)'/);
        if (!idMatch) return;
        const resId = idMatch[1];
        const res = (db.results || []).find(r => r.id === resId);
        if (!res || !isConsolidatedMockResult(res)) return;

        const graded = isMockWritingGraded(res);
        const isTeacher = activeUser && activeUser.role === 'teacher';

        actionCell.innerHTML = `
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button class="btn btn-emerald" style="padding:5px 11px; font-size:12px;" onclick="openMockTestHubModal('${res.id}')">
              🎓 ${isTeacher && !graded ? 'Chấm Mock Test' : 'Chi tiết Mock Test'}
            </button>
            ${graded ? `
              <button class="btn btn-secondary" style="padding:5px 11px; font-size:12px; color:#047857; border-color:#6ee7b7; background:#ecfdf5; font-weight:800;" onclick="openCleanMockScorePrintModal('${res.id}')">
                🖨️ In Phiếu Điểm
              </button>
            ` : ''}
          </div>
        `;
      });
    });
  }

  /* ==========================================================================
     6. KẾT NỐI ĐỒNG BỘ VÀO DASHBOARD
     ========================================================================== */
  const _finalOrigRenderHome = renderHomeTab;
  renderHomeTab = function() {
    autoMergeStandaloneMockTriplets();
    _finalOrigRenderHome();
    renderTeacherOnlineMonitor();
    renderStreakAndLeaderboardSection();
    upgradeMockTestRowsInTables();
  };

  const _finalOrigRenderAnalytics = renderAnalyticsTable;
  renderAnalyticsTable = function() {
    autoMergeStandaloneMockTriplets();
    _finalOrigRenderAnalytics();
    upgradeMockTestRowsInTables();
  };

  window.addEventListener('load', () => {
    setTimeout(async () => {
      await autoMergeStandaloneMockTriplets();
      if (activeUser) renderDashboard();
    }, 1000);
  });

/* === MODULE PART 31 (Lines 22245-22317) === */
function applyCleanHomeDisplayRules() {
    if (!activeUser) return;
    const isTeacher = (activeUser.role === 'teacher');

    // 1. Chỉ hiện khối 5 ô thống kê (.stat-grid) cho Giáo viên, ẩn hoàn toàn đối với Học sinh
    const statGrid = document.querySelector('#tab-home .stat-grid');
    if (statGrid) {
      statGrid.style.display = isTeacher ? 'grid' : 'none';
    }

    // 2. Xóa bỏ dòng Online thứ 2 và khối BXH to nếu đã từng được tạo ra
    const dupOnlineBar = document.getElementById('teacherOnlineMonitorBar');
    if (dupOnlineBar) dupOnlineBar.style.display = 'none';
    const dupGamification = document.getElementById('gamificationStreakLeaderboardBox');
    if (dupGamification) dupGamification.style.display = 'none';

    // 3. Lọc bỏ tài khoản Giáo viên (Amuro) ra khỏi dữ liệu Online Presence & thanh Phòng Tự Học
    if (typeof onlinePresenceMap === 'object' && onlinePresenceMap) {
      Object.keys(onlinePresenceMap).forEach(k => {
        const p = onlinePresenceMap[k];
        if (!p) return;
        const lowName = String(p.name || '').toLowerCase();
        const lowUser = String(p.username || k || '').toLowerCase();
        if (p.role === 'teacher' || lowName.includes('amuro') || lowUser === 'amuro') {
          delete onlinePresenceMap[k];
        }
      });
    }

    // Ẩn mọi thẻ pill trên thanh Phòng Tự Học Trực Tuyến nếu có chứa tên Amuro / Teacher
    document.querySelectorAll('#tab-home span, #tab-home div').forEach(el => {
      if (el.children.length === 0 && /amuro/i.test(el.textContent || '')) {
        const pill = el.closest('[class*="pill"], [style*="border-radius: 999px"], [style*="border-radius:999px"]');
        if (pill) pill.style.display = 'none';
      }
    });
  }

  // Không phát tín hiệu Online lên danh sách học sinh nếu người đang đăng nhập là Giáo viên (Amuro)
  if (typeof sendStudentHeartbeat === 'function') {
    const _origSendHeartbeat = sendStudentHeartbeat;
    sendStudentHeartbeat = async function() {
      if (!activeUser) return;
      if (activeUser.role === 'teacher' || String(activeUser.username || '').toLowerCase() === 'amuro') {
        const fs = (typeof getActiveFirestore === 'function') ? getActiveFirestore() : CLOUD_DB;
        if (fs) {
          try { await fs.collection('suite_presence').doc(String(activeUser.username)).delete(); } catch (e) {}
        }
        return;
      }
      return _origSendHeartbeat();
    };
  }

  // Tự động áp dụng mỗi khi vẽ lại trang Home hoặc Dashboard
  const _cleanHomeOrigRenderHome = renderHomeTab;
  renderHomeTab = function() {
    _cleanHomeOrigRenderHome();
    applyCleanHomeDisplayRules();
  };

  const _cleanHomeOrigCheckSession = checkSession;
  checkSession = function() {
    _cleanHomeOrigCheckSession();
    applyCleanHomeDisplayRules();
  };

  window.addEventListener('load', () => {
    applyCleanHomeDisplayRules();
    setTimeout(applyCleanHomeDisplayRules, 600);
  });

/* === MODULE PART 32 (Lines 22374-22809) === */
/* 1. KÍCH HOẠT LẠI THANH HỌC SINH ĐANG ONLINE Ở ĐẦU TAB HOME */
  let _v14PresenceMap = {};

  function _v14GetActivityLabel() {
    const shell = document.getElementById('examShell');
    if (shell && shell.style.display !== 'none' && activeExam) {
      const icon = activeExamType === 'reading' ? '📖' : (activeExamType === 'listening' ? '🎧' : '✍️');
      return `Đang làm ${icon} ${activeExam.title}`;
    }
    return 'Đang ở Dashboard';
  }

  async function _v14SendHeartbeat() {
    if (!activeUser) return;
    const fs = typeof getActiveFirestore === 'function' ? getActiveFirestore() : CLOUD_DB;
    if (!fs) return;
    try {
      const cls = (db.classes || []).find(c => c.id === activeUser.classId);
      await fs.collection('suite_presence').doc(String(activeUser.username)).set({
        username: activeUser.username,
        name: activeUser.name,
        role: activeUser.role,
        isPro: Boolean(typeof isStudentPro === 'function' && isStudentPro(activeUser)),
        className: cls ? cls.name : '',
        activity: _v14GetActivityLabel(),
        lastSeen: Date.now()
      });
    } catch (e) {}
  }

  function _v14RenderOnlineMonitor() {
    const existingBar = document.getElementById('teacherOnlineMonitorBar');
    if (!activeUser || activeUser.role !== 'teacher') {
      if (existingBar) existingBar.style.display = 'none';
      return;
    }
    const homeTab = document.getElementById('tab-home');
    if (!homeTab) return;

    let bar = existingBar;
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'teacherOnlineMonitorBar';
      bar.className = 'online-monitor-bar';
      homeTab.insertBefore(bar, homeTab.firstChild);
    }
    bar.style.display = 'flex';

    const now = Date.now();
    const activeStudents = Object.values(_v14PresenceMap).filter(p =>
      p && p.role === 'student' && (now - (p.lastSeen || 0)) < 180000
    );

    if (!activeStudents.length) {
      bar.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px; width:100%; justify-content:space-between; flex-wrap:wrap;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span class="online-pulse-dot" style="background:#94a3b8; box-shadow:none;"></span>
            <span style="font-weight:800; font-size:13.5px; color:#475569;">🟢 Học sinh đang Online (0):</span>
            <span style="font-size:13px; color:#94a3b8;">Hiện chưa có học sinh nào đang mở trang web.</span>
          </div>
          <button class="btn btn-secondary" style="padding:4px 10px; font-size:11.5px;" onclick="openStreakAndTrendModal()">🔥 Xem BXH Streak Lớp</button>
        </div>
      `;
      return;
    }

    bar.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; width:100%; flex-wrap:wrap; gap:10px;">
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <span style="font-weight:800; font-size:13.5px; color:#065f46; margin-right:4px;">
            🟢 Học sinh đang Online (${activeStudents.length}):
          </span>
          ${activeStudents.map(st => `
            <div class="online-user-pill" title="${st.className || 'Unassigned'}">
              <span class="online-pulse-dot"></span>
              <span>${st.name}${st.isPro ? ' 👑' : ''}</span>
              <span style="font-weight:500; color:#047857; font-size:11.5px;">• ${st.activity || 'Online'}</span>
            </div>
          `).join('')}
        </div>
        <button class="btn btn-secondary" style="padding:4px 10px; font-size:11.5px;" onclick="openStreakAndTrendModal()">🔥 BXH Streak</button>
      </div>
    `;
  }

  let _v14PresenceStarted = false;
  function _v14InitPresence() {
    if (_v14PresenceStarted) return;
    const fs = typeof getActiveFirestore === 'function' ? getActiveFirestore() : CLOUD_DB;
    if (!fs) return;
    _v14PresenceStarted = true;
    _v14SendHeartbeat();
    setInterval(_v14SendHeartbeat, 35000);
    fs.collection('suite_presence').onSnapshot(snap => {
      _v14PresenceMap = {};
      snap.forEach(doc => { _v14PresenceMap[doc.id] = doc.data(); });
      _v14RenderOnlineMonitor();
    });
    setInterval(_v14RenderOnlineMonitor, 15000);
  }

  /* 2. CHUỖI KỶ LUẬT (STUDY STREAK 🔥) & BIỂU ĐỒ XU HƯỚNG */
  function _v14ExtractIsoDate(resItem) {
    if (!resItem) return null;
    if (resItem.isoDate && /^\d{4}-\d{2}-\d{2}$/.test(resItem.isoDate)) return resItem.isoDate;
    const idMatch = String(resItem.id || '').match(/(\d{13})/);
    if (idMatch) {
      const dt = new Date(Number(idMatch[1]));
      if (!isNaN(dt.getTime())) {
        return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
      }
    }
    const parsed = new Date(resItem.timestamp);
    if (!isNaN(parsed.getTime())) {
      return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
    }
    return null;
  }

  function calculateUserStreak(userName) {
    if (!userName) return { currentStreak: 0, totalDays: 0, activeToday: false };
    const uLow = String(userName).toLowerCase().trim();
    const dateSet = new Set();
    (db.results || []).forEach(r => {
      if (String(r.userName || '').toLowerCase().trim() === uLow) {
        const dStr = _v14ExtractIsoDate(r);
        if (dStr) dateSet.add(dStr);
      }
    });
    if (dateSet.size === 0) return { currentStreak: 0, totalDays: 0, activeToday: false };

    const today = new Date();
    const toIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const todayStr = toIso(today);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = toIso(yesterday);

    const activeToday = dateSet.has(todayStr);
    if (!activeToday && !dateSet.has(yesterdayStr)) {
      return { currentStreak: 0, totalDays: dateSet.size, activeToday: false };
    }
    let streak = 0;
    let cursor = new Date(activeToday ? today : yesterday);
    while (true) {
      if (dateSet.has(toIso(cursor))) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else break;
    }
    return { currentStreak: streak, totalDays: dateSet.size, activeToday };
  }

  function injectHeaderStreakBadge() {
    if (!activeUser) return;
    const controls = document.querySelector('.dash-user-controls');
    const profileLabel = document.getElementById('userProfileLabel');
    if (!controls || !profileLabel) return;

    let badge = document.getElementById('headerStreakBadgeBtn');
    if (!badge) {
      badge = document.createElement('button');
      badge.id = 'headerStreakBadgeBtn';
      badge.type = 'button';
      badge.className = 'header-streak-pill';
      badge.onclick = () => openStreakAndTrendModal();
      controls.insertBefore(badge, profileLabel);
    }
    const st = calculateUserStreak(activeUser.name);
    badge.innerHTML = activeUser.role === 'teacher'
      ? `🔥 Streak & Xu Hướng Lớp`
      : `🔥 ${st.currentStreak} ngày liên tục`;
  }

  window.openStreakAndTrendModal = function() {
    if (!activeUser) return;
    const body = document.getElementById('streakAndTrendModalBody');
    if (!body) return;

    const students = (db.users || []).filter(u => u.role === 'student');
    const leaderboard = students.map(u => {
      const st = calculateUserStreak(u.name);
      const subCount = (db.results || []).filter(r => String(r.userName || '').toLowerCase() === String(u.name || '').toLowerCase()).length;
      return { name: u.name, isPro: u.isPro, streak: st.currentStreak, totalDays: st.totalDays, subCount };
    }).sort((a, b) => (b.streak - a.streak) || (b.subCount - a.subCount));

    let targetResults = (db.results || []).slice();
    if (activeUser.role === 'student') {
      targetResults = targetResults.filter(r => String(r.userName || '').toLowerCase() === String(activeUser.name || '').toLowerCase());
    }
    const bandPoints = [];
    targetResults.forEach(r => {
      const num = parseFloat(String(r.band || '').replace(/[^0-9.]/g, ''));
      if (!isNaN(num) && num >= 1 && num <= 9) {
        bandPoints.push({ title: r.examTitle || 'Test', band: num, date: _v14ExtractIsoDate(r) || '' });
      }
    });
    const recentPoints = bandPoints.slice(-10);

    let svgChartHtml = '';
    if (recentPoints.length < 2) {
      svgChartHtml = `<div style="text-align:center; padding:30px; color:#94a3b8; font-weight:600; background:#f8fafc; border-radius:12px; border:1px dashed #cbd5e1;">Cần tối thiểu 2 bài thi có điểm Band để vẽ biểu đồ xu hướng tiến bộ.</div>`;
    } else {
      const w = 700, h = 210, padL = 42, padR = 28, padT = 24, padB = 34;
      const plotW = w - padL - padR, plotH = h - padT - padB;
      const coords = recentPoints.map((pt, idx) => ({
        ...pt,
        x: padL + (idx / (recentPoints.length - 1)) * plotW,
        y: padT + plotH - ((pt.band - 3.0) / 6.0) * plotH
      }));
      const polyPoints = coords.map(c => `${c.x},${c.y}`).join(' ');
      svgChartHtml = `
        <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:14px; padding:14px; overflow-x:auto;">
          <svg viewBox="0 0 ${w} ${h}" style="width:100%; height:auto; min-width:520px;">
            ${[4.0, 5.5, 7.0, 8.5].map(bVal => {
              const y = padT + plotH - ((bVal - 3.0) / 6.0) * plotH;
              return `<line x1="${padL}" y1="${y}" x2="${w - padR}" y2="${y}" stroke="#f1f5f9" stroke-width="1.5" /><text x="${padL - 8}" y="${y + 4}" text-anchor="end" font-size="11" font-weight="700" fill="#64748b">${bVal.toFixed(1)}</text>`;
            }).join('')}
            <polyline fill="none" stroke="#059669" stroke-width="3" points="${polyPoints}" />
            ${coords.map(c => `<circle cx="${c.x}" cy="${c.y}" r="5.5" fill="#ffffff" stroke="#059669" stroke-width="3"><title>${c.title}: Band ${c.band}</title></circle><text x="${c.x}" y="${c.y - 10}" text-anchor="middle" font-size="11" font-weight="800" fill="#065f46">${c.band}</text><text x="${c.x}" y="${h - 10}" text-anchor="middle" font-size="10" fill="#64748b">${c.date ? c.date.slice(5) : ''}</text>`).join('')}
          </svg>
        </div>
      `;
    }

    const myStreak = calculateUserStreak(activeUser.name);
    body.innerHTML = `
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap:14px; margin-bottom:20px;">
        <div style="background:linear-gradient(135deg,#fffbeb,#fef3c7); border:1px solid #fcd34d; border-radius:14px; padding:16px;">
          <div style="font-size:12px; font-weight:800; color:#b45309; text-transform:uppercase;">🔥 Chuỗi Streak Hiện Tại</div>
          <div style="font-size:28px; font-weight:800; color:#92400e; margin-top:4px;">${myStreak.currentStreak} Ngày</div>
          <div style="font-size:12px; color:#b45309; margin-top:4px;">${myStreak.activeToday ? '✅ Hôm nay đã hoàn thành bài!' : '⏳ Hãy làm 1 bài hôm nay để giữ lửa!'}</div>
        </div>
        <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:14px; padding:16px;">
          <div style="font-size:12px; font-weight:800; color:#047857; text-transform:uppercase;">📅 Tổng Số Ngày Tích Lũy</div>
          <div style="font-size:28px; font-weight:800; color:#065f46; margin-top:4px;">${myStreak.totalDays} Ngày</div>
          <div style="font-size:12px; color:#047857; margin-top:4px;">Duy trì đều đặn mỗi ngày</div>
        </div>
      </div>
      <div style="font-size:15px; font-weight:800; color:#0f172a; margin-bottom:10px;">📈 Biểu Đồ Xu Hướng Điểm Số (${recentPoints.length} bài gần nhất)</div>
      ${svgChartHtml}
      <div style="font-size:15px; font-weight:800; color:#0f172a; margin:22px 0 10px;">🏆 Bảng Vinh Danh Chuỗi Kỷ Luật Lớp (Top Study Streak)</div>
      <div>
        ${!leaderboard.length ? `<p style="color:#94a3b8;">Chưa có dữ liệu học sinh.</p>` : leaderboard.slice(0, 10).map((item, idx) => {
          const medal = idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : `#${idx + 1}`));
          return `<div class="streak-leaderboard-row"><div style="display:flex; align-items:center; gap:10px;"><span style="font-weight:800; font-size:15px; width:28px;">${medal}</span><div><div style="font-weight:800; color:#0f172a; font-size:13.5px;">${item.name} ${item.isPro ? '👑' : ''}</div><div style="font-size:11.5px; color:#64748b;">Đã nộp ${item.subCount} bài • Tích lũy ${item.totalDays} ngày học</div></div></div><span style="background:#fef3c7; color:#b45309; border:1px solid #fde68a; padding:4px 12px; border-radius:999px; font-weight:800; font-size:12.5px;">🔥 ${item.streak} ngày</span></div>`;
        }).join('')}
      </div>
    `;
    openModal('streakAndTrendModal');
  };

  /* 3. KHÔI PHỤC SỔ TAY LỖI SAI (MISTAKE NOTEBOOK TAB & NÚT LƯU TRONG REVIEW) */
  function ensureMistakeVaultInitialized() {
    if (!db.mistakeNotebook) db.mistakeNotebook = {};
    if (activeUser && !db.mistakeNotebook[activeUser.username]) {
      try {
        const cached = localStorage.getItem(`AMURO_MISTAKE_VAULT_${activeUser.username}`);
        db.mistakeNotebook[activeUser.username] = cached ? JSON.parse(cached) : [];
      } catch (e) {
        db.mistakeNotebook[activeUser.username] = [];
      }
    }
  }

  function saveUserMistakesToStorage() {
    if (!activeUser) return;
    ensureMistakeVaultInitialized();
    const list = db.mistakeNotebook[activeUser.username] || [];
    try { localStorage.setItem(`AMURO_MISTAKE_VAULT_${activeUser.username}`, JSON.stringify(list)); } catch (e) {}
    const fs = typeof getActiveFirestore === 'function' ? getActiveFirestore() : CLOUD_DB;
    if (fs) {
      try { fs.collection('suite_meta').doc('core').set({ mistakeNotebook: db.mistakeNotebook }, { merge: true }); } catch (e) {}
    }
  }

  function injectMistakeNotebookTab() {
    const tabsBar = document.querySelector('.dash-tabs');
    const vocabTabBtn = document.getElementById('tabbtn-myvocab');
    if (tabsBar && vocabTabBtn && !document.getElementById('tabbtn-mistakes')) {
      const btn = document.createElement('button');
      btn.className = 'dash-tab-btn';
      btn.id = 'tabbtn-mistakes';
      btn.innerHTML = '📓 Sổ Lỗi Sai (<span id="mistakeVaultTabCount">0</span>)';
      btn.onclick = () => switchDashTab('mistakes');
      vocabTabBtn.insertAdjacentElement('afterend', btn);
    }
    const dashBody = document.querySelector('.dash-body');
    if (dashBody && !document.getElementById('tab-mistakes')) {
      const pane = document.createElement('div');
      pane.id = 'tab-mistakes';
      pane.className = 'dash-pane';
      pane.style.display = 'none';
      dashBody.appendChild(pane);
    }
    if (activeUser) {
      ensureMistakeVaultInitialized();
      const cntEl = document.getElementById('mistakeVaultTabCount');
      if (cntEl) cntEl.textContent = (db.mistakeNotebook[activeUser.username] || []).length;
    }
  }

  window.saveQuestionToMistakeVault = function(qKey, btnEl) {
    if (!activeUser || !activeExam) return;
    ensureMistakeVaultInitialized();
    const list = db.mistakeNotebook[activeUser.username];
    const scope = document.getElementById('insperaSplitBox') || document.body;
    const itemId = `${activeExam.id}_${qKey}`;
    if (list.some(x => x.id === itemId)) return alert('Câu hỏi này đã có trong Sổ Lỗi Sai!');

    const qNum = qKey.replace(/\D/g, '');
    const qBox = scope.querySelector(`[data-question="${qNum}"]`) || scope.querySelector(`[name="${qKey}"]`)?.closest('.question, tr, li, p, div');
    let stemText = `Câu hỏi ${qNum}`;
    if (qBox) {
      const clone = qBox.cloneNode(true);
      clone.querySelectorAll('.answer-indicator, .teacher-edit-badge, button').forEach(el => el.remove());
      stemText = String(clone.textContent || '').replace(/\s+/g, ' ').trim().substring(0, 260);
    }

    list.unshift({
      id: itemId,
      examId: activeExam.id,
      examTitle: activeExam.title,
      skill: activeExamType || 'reading',
      qKey,
      qNum,
      stem: stemText,
      userAnswer: userAnswers[qKey] || '(Bỏ trống)',
      correctKey: (activeExam.correctAnswers && activeExam.correctAnswers[qKey]) || '',
      explanation: (activeExam.explanations && activeExam.explanations[qKey]) || '',
      evidence: (activeExam.evidences && activeExam.evidences[qKey]) || '',
      note: '',
      savedAt: new Date().toLocaleString()
    });

    saveUserMistakesToStorage();
    injectMistakeNotebookTab();
    if (btnEl) {
      btnEl.classList.add('saved');
      btnEl.innerHTML = '✓ Đã lưu vào Sổ lỗi';
    }
  };

  let _v14MistakeFilter = 'ALL';
  window.renderMistakeNotebookTab = function() {
    ensureMistakeVaultInitialized();
    injectMistakeNotebookTab();
    const pane = document.getElementById('tab-mistakes');
    if (!pane || !activeUser) return;
    const allMistakes = db.mistakeNotebook[activeUser.username] || [];
    const filtered = allMistakes.filter(m => _v14MistakeFilter === 'ALL' || m.skill === _v14MistakeFilter);

    pane.innerHTML = `
      <div class="card">
        <div class="card-title">
          <span>📓 Sổ Tay Lỗi Sai Cá Nhân (${allMistakes.length} câu cần ôn)</span>
          <div style="display:flex; gap:8px;">
            <button class="btn ${_v14MistakeFilter === 'ALL' ? 'btn-emerald' : 'btn-secondary'}" onclick="_v14MistakeFilter='ALL'; renderMistakeNotebookTab();">Tất cả (${allMistakes.length})</button>
            <button class="btn ${_v14MistakeFilter === 'reading' ? 'btn-emerald' : 'btn-secondary'}" onclick="_v14MistakeFilter='reading'; renderMistakeNotebookTab();">📖 Reading</button>
            <button class="btn ${_v14MistakeFilter === 'listening' ? 'btn-emerald' : 'btn-secondary'}" onclick="_v14MistakeFilter='listening'; renderMistakeNotebookTab();">🎧 Listening</button>
          </div>
        </div>
        ${!filtered.length ? `<div style="text-align:center; padding:40px; color:#94a3b8;">Sổ lỗi sai đang trống. Khi xem đáp án (Review Keys), hãy bấm <b>"📌 Lưu vào Sổ lỗi"</b> ở câu sai để lưu về đây nhé!</div>` : filtered.map(item => `
          <div class="mistake-card">
            <div class="mistake-card-header">
              <div>
                <span class="mistake-tag-skill" style="background:${item.skill === 'listening' ? '#eff6ff' : '#ecfdf5'}; color:${item.skill === 'listening' ? '#2563eb' : '#059669'};">${item.skill === 'listening' ? '🎧 Listening' : '📖 Reading'}</span>
                <b style="font-size:14.5px; margin-left:6px;">${item.examTitle} — Câu ${item.qNum}</b>
              </div>
              <button class="btn btn-danger" style="padding:4px 10px; font-size:11.5px;" onclick="removeMistakeItem('${item.id}')">Xóa</button>
            </div>
            <div style="font-size:13.5px; background:#f8fafc; padding:10px 12px; border-radius:8px; margin-bottom:10px;"><b>Câu hỏi:</b> ${item.stem}</div>
            <div style="display:flex; gap:16px; font-size:13px; margin-bottom:8px;">
              <span>❌ <b>Bạn chọn:</b> <b style="color:#dc2626;">${item.userAnswer}</b></span>
              <span>✅ <b>Đáp án đúng:</b> <b style="color:#16a34a;">${item.correctKey}</b></span>
            </div>
            ${item.explanation ? `<div style="font-size:12.5px; margin-bottom:6px;">💡 <b>Giải thích:</b> ${item.explanation}</div>` : ''}
            ${item.evidence ? `<div style="font-size:12.5px; color:#065f46; background:#f0fdf4; padding:6px 10px; border-radius:6px; margin-bottom:6px;">🔍 <b>Dẫn chứng:</b> "${item.evidence}"</div>` : ''}
            <input type="text" class="mistake-note-input" placeholder="✍️ Ghi chú nguyên nhân sai..." value="${(item.note || '').replace(/"/g, '&quot;')}" onchange="updateMistakePersonalNote('${item.id}', this.value)">
          </div>
        `).join('')}
      </div>
    `;
  };

  window.updateMistakePersonalNote = function(itemId, noteText) {
    if (!activeUser) return;
    ensureMistakeVaultInitialized();
    const target = (db.mistakeNotebook[activeUser.username] || []).find(x => x.id === itemId);
    if (target) { target.note = noteText.trim(); saveUserMistakesToStorage(); }
  };

  window.removeMistakeItem = function(itemId) {
    if (!activeUser) return;
    ensureMistakeVaultInitialized();
    db.mistakeNotebook[activeUser.username] = (db.mistakeNotebook[activeUser.username] || []).filter(x => x.id !== itemId);
    saveUserMistakesToStorage();
    renderMistakeNotebookTab();
  };

  // Tự động gắn nút "📌 Lưu vào Sổ lỗi" trong chế độ Review & duy trì hiển thị Streak + Online Monitor
  setInterval(() => {
    if (!activeUser) return;
    injectMistakeNotebookTab();
    injectHeaderStreakBadge();
    _v14InitPresence();
    _v14RenderOnlineMonitor();

    if (isReviewMode && activeExam && activeExamType !== 'writing') {
      ensureMistakeVaultInitialized();
      const savedList = db.mistakeNotebook[activeUser.username] || [];
      document.querySelectorAll('#insperaSplitBox .answer-indicator[data-ind]').forEach(indBox => {
        const k = indBox.getAttribute('data-ind');
        if (k && !indBox.querySelector(`.btn-save-mistake-inline[data-mkey="${k}"]`)) {
          const alreadySaved = savedList.some(x => x.id === `${activeExam.id}_${k}`);
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'btn-save-mistake-inline' + (alreadySaved ? ' saved' : '');
          btn.setAttribute('data-mkey', k);
          btn.innerHTML = alreadySaved ? '✓ Đã lưu vào Sổ lỗi' : '📌 Lưu vào Sổ lỗi';
          btn.onclick = function() { saveQuestionToMistakeVault(k, this); };
          indBox.appendChild(btn);
        }
      });
    }
  }, 600);

  const _v14OrigSwitchTab = switchDashTab;
  switchDashTab = function(tab) {
    injectMistakeNotebookTab();
    _v14OrigSwitchTab(tab);
    if (tab === 'mistakes') renderMistakeNotebookTab();
  };

/* === MODULE PART 33 (Lines 22838-23000) === */
(function() {
    let _v15OnlineMap = {};
    let _v15ListenerBound = false;

    function _v15IsTeacher(u) {
      if (!u) return true;
      const r = String(u.role || '').toLowerCase().trim();
      const un = String(u.username || '').toLowerCase().trim();
      const nm = String(u.name || '').toLowerCase().trim();
      if (r === 'teacher' || r === 'admin') return true;
      if (un === 'amuro' || nm.includes('teacher amuro') || nm.includes('wibu')) return true;
      return false;
    }

    function _v15GetCurrentActivity() {
      const shell = document.getElementById('examShell');
      if (shell && shell.style.display !== 'none' && typeof activeExam !== 'undefined' && activeExam) {
        const icon = activeExamType === 'reading' ? '📖' : (activeExamType === 'listening' ? '🎧' : '✍️');
        return `Đang làm ${icon} ${activeExam.title}`;
      }
      return 'Đang ở Dashboard';
    }

    async function _v15PushHeartbeat() {
      if (typeof activeUser === 'undefined' || !activeUser) return;
      const fs = (typeof getActiveFirestore === 'function' ? getActiveFirestore() : null)
        || (typeof CLOUD_DB !== 'undefined' ? CLOUD_DB : null)
        || (typeof firebase !== 'undefined' && firebase.firestore ? firebase.firestore() : null);

      // Nếu là tài khoản của anh (Giáo viên) -> Xóa khỏi danh sách Online và không gửi heartbeat
      if (_v15IsTeacher(activeUser)) {
        delete _v15OnlineMap[activeUser.username];
        if (fs) {
          try { await fs.collection('suite_presence').doc(String(activeUser.username)).delete(); } catch (e) {}
        }
        _v15RenderBanner();
        return;
      }

      const cls = (typeof db !== 'undefined' && db.classes || []).find(c => c.id === activeUser.classId);
      const record = {
        username: activeUser.username,
        name: activeUser.name,
        role: 'student',
        isPro: Boolean(typeof isStudentPro === 'function' && isStudentPro(activeUser)),
        className: cls ? cls.name : '',
        activity: _v15GetCurrentActivity(),
        lastSeen: Date.now()
      };

      _v15OnlineMap[activeUser.username] = record;
      _v15RenderBanner();

      if (fs) {
        try {
          await fs.collection('suite_presence').doc(String(activeUser.username)).set(record);
        } catch (e) {}
      }
    }

    function _v15StartFirestoreListener() {
      if (_v15ListenerBound) return;
      const fs = (typeof getActiveFirestore === 'function' ? getActiveFirestore() : null)
        || (typeof CLOUD_DB !== 'undefined' ? CLOUD_DB : null)
        || (typeof firebase !== 'undefined' && firebase.firestore ? firebase.firestore() : null);
      if (!fs) return;
      _v15ListenerBound = true;

      fs.collection('suite_presence').onSnapshot(snap => {
        snap.forEach(doc => {
          const data = doc.data();
          if (data && data.username) {
            _v15OnlineMap[data.username] = data;
          }
        });
        _v15RenderBanner();
      });
    }

    function _v15RenderBanner() {
      if (typeof activeUser === 'undefined' || !activeUser) return;
      const homeTab = document.getElementById('tab-home');
      if (!homeTab) return;

      let banner = document.getElementById('liveStudentOnlineBannerV15');
      if (!banner) {
        banner = document.createElement('div');
        banner.id = 'liveStudentOnlineBannerV15';
        const heroBanner = homeTab.querySelector('.home-hero-banner');
        if (heroBanner) {
          homeTab.insertBefore(banner, heroBanner);
        } else {
          homeTab.insertBefore(banner, homeTab.firstChild);
        }
      }

      // Nếu tài khoản đang đăng nhập là Học sinh (như demo), luôn đảm bảo có mặt ngay lập tức
      if (!_v15IsTeacher(activeUser) && !_v15OnlineMap[activeUser.username]) {
        const cls = (typeof db !== 'undefined' && db.classes || []).find(c => c.id === activeUser.classId);
        _v15OnlineMap[activeUser.username] = {
          username: activeUser.username,
          name: activeUser.name,
          role: 'student',
          isPro: Boolean(typeof isStudentPro === 'function' && isStudentPro(activeUser)),
          className: cls ? cls.name : '',
          activity: _v15GetCurrentActivity(),
          lastSeen: Date.now()
        };
      }

      const now = Date.now();
      const onlineStudents = Object.values(_v15OnlineMap).filter(st =>
        st && !_v15IsTeacher(st) && (now - (st.lastSeen || 0)) < 180000
      );

      if (onlineStudents.length === 0) {
        banner.innerHTML = `
          <div style="display:flex; align-items:center; justify-content:space-between; width:100%; flex-wrap:wrap; gap:10px;">
            <div style="display:flex; align-items:center; gap:10px;">
              <span class="online-pulse-dot" style="background:#94a3b8; box-shadow:none;"></span>
              <span style="font-weight:800; font-size:13.5px; color:#334155;">🟢 Học sinh đang Online (0):</span>
              <span style="font-size:13px; color:#64748b;">Hiện chưa có học sinh nào đang trực tuyến.</span>
            </div>
            <button type="button" class="btn btn-secondary" style="padding:5px 12px; font-size:12px;" onclick="openStreakAndTrendModal()">🔥 Xem BXH Streak Lớp</button>
          </div>
        `;
      } else {
        banner.innerHTML = `
          <div style="display:flex; align-items:center; justify-content:space-between; width:100%; flex-wrap:wrap; gap:10px;">
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <span style="font-weight:800; font-size:13.5px; color:#065f46; margin-right:4px;">
                🟢 Học sinh đang Online (${onlineStudents.length}):
              </span>
              ${onlineStudents.map(st => `
                <div class="online-user-pill" title="${st.className || 'Học viên'}">
                  <span class="online-pulse-dot"></span>
                  <span>${st.name}${st.isPro ? ' 👑' : ''}</span>
                  <span style="font-weight:500; color:#047857; font-size:11.5px;">• ${st.activity || 'Đang ở Dashboard'}</span>
                </div>
              `).join('')}
            </div>
            <button type="button" class="btn btn-secondary" style="padding:5px 12px; font-size:12px;" onclick="openStreakAndTrendModal()">🔥 BXH Streak</button>
          </div>
        `;
      }
    }

    // Chạy ngay lập tức và duy trì liên tục
    setTimeout(() => {
      _v15StartFirestoreListener();
      _v15PushHeartbeat();
      _v15RenderBanner();
    }, 200);

    setInterval(() => {
      _v15StartFirestoreListener();
      _v15RenderBanner();
    }, 1000);

    setInterval(_v15PushHeartbeat, 30000);
  })();

/* === MODULE PART 34 (Lines 23032-23069) === */
(function() {
    // Ngắt toàn bộ các hàm của Sổ lỗi sai để không chạy ngầm nữa
    window.injectMistakeNotebookTab = function() {};
    window.renderMistakeNotebookTab = function() {};
    window.renderUnifiedMistakeNotebook = function() {};
    window.saveQuestionToMistakeVault = function() {};
    window.unifiedSaveMistakeItem = function() {};

    function nukeAllMistakeUI() {
      // Ẩn mọi nút trên thanh menu Dashboard có chữ "Sổ Lỗi Sai"
      document.querySelectorAll('.dash-tabs button').forEach(btn => {
        const txt = (btn.textContent || '').toLowerCase();
        if (txt.includes('sổ lỗi') || txt.includes('mistake')) {
          btn.style.setProperty('display', 'none', 'important');
        }
      });

      // Ẩn mọi nút trong khung giải thích câu hỏi có chữ "Sổ Lỗi"
      document.querySelectorAll('#insperaSplitBox .answer-indicator button').forEach(btn => {
        const txt = (btn.textContent || '').toLowerCase();
        if (txt.includes('sổ lỗi') || txt.includes('mistake')) {
          btn.style.setProperty('display', 'none', 'important');
        }
      });

      // Nếu đang đứng ở tab Sổ lỗi sai thì tự động chuyển về tab Home
      const mPane = document.getElementById('tab-mistakes');
      if (mPane && mPane.style.display !== 'none') {
        mPane.style.setProperty('display', 'none', 'important');
        if (typeof switchDashTab === 'function') switchDashTab('home');
      }
    }

    nukeAllMistakeUI();
    setInterval(nukeAllMistakeUI, 400);
  })();

/* === MODULE PART 35 (Lines 23290-23693) === */
(function() {
    // Vô hiệu hóa hàm highlight cũ để không xung đột
    window.setupInExamHighlightEngine = function() {};
    window.applyUserHighlight = function() {};
    window.removeUserHighlight = function() {};

    const popup = document.getElementById('insperaHlPopup');
    const noteCard = document.getElementById('insperaNoteCard');
    const noteInput = document.getElementById('insperaNoteTextarea');
    const noteSaveBtn = document.getElementById('insperaNoteSaveBtn');
    const noteDeleteBtn = document.getElementById('insperaNoteDeleteBtn');
    const noteCloseBtn = document.getElementById('insperaNoteCloseBtn');

    let savedRange = null;
    let activeHlGroupId = null;
    let notesStore = {}; // { hlId: "nội dung ghi chú" }
    let partDomSnapshots = {}; // Lưu HTML đã highlight của từng Part để chuyển Part không bị mất

    // Icon SVG chuẩn theo đúng thiết kế của Inspera
    const ICON_NOTE = `<svg viewBox="0 0 24 24"><path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/></svg>`;
    const ICON_MARKER = `<svg viewBox="0 0 24 24"><path d="M18.5 1.15c-.53 0-1.04.19-1.43.58l-5.81 5.82 5.65 5.65 5.82-5.81c.77-.78.77-2.04 0-2.83l-2.84-2.83c-.39-.39-.89-.58-1.39-.58zM10.3 8.5L4 14.8V19h4.2l6.3-6.3-4.2-4.2zM3 21v2h18v-2H3z"/></svg>`;
    const ICON_CLEAR = `<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>`;

    function getCurrentPartStorageKey() {
      if (typeof activeExam === 'undefined' || !activeExam) return null;
      return `${activeExam.id}_part_${typeof activePartNum !== 'undefined' ? activePartNum : 1}`;
    }

        function savePartHighlightSnapshot() {
      if ((typeof isReviewMode !== 'undefined' && isReviewMode) || (typeof activeExamType !== 'undefined' && activeExamType === 'writing')) return;
      const key = getCurrentPartStorageKey();
      if (!key) return;

      const leftPane = document.getElementById('insperaLeftPane');
      if (leftPane) {
        const contentEl = leftPane.querySelector('.passage-content') || leftPane;
        partDomSnapshots[key + '_left'] = contentEl.innerHTML;
      }

      const rightPane = document.getElementById('insperaRightPane');
      if (rightPane) {
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
      if ((typeof isReviewMode !== 'undefined' && isReviewMode) || (typeof activeExamType !== 'undefined' && activeExamType === 'writing')) return;
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

    function hidePopup() {
      popup.style.display = 'none';
    }

    function hideNoteCard() {
      noteCard.style.display = 'none';
    }

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

    // Bọc vùng chọn bằng thẻ <mark> an toàn (hỗ trợ cả khi bôi đen qua nhiều thẻ in nghiêng/in đậm/đoạn văn)
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
      while ((current = walker.nextNode())) {
        textNodes.push(current);
      }

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

        // Nếu text node này đã nằm sẵn trong 1 thẻ mark cùng loại thì chỉ cập nhật trạng thái Note
        const existingMark = node.parentElement && node.parentElement.closest('mark.inspera-hl-mark');
        if (existingMark && startOff === 0 && endOff === node.nodeValue.length) {
          existingMark.setAttribute('data-hl-id', groupId);
          if (isNote) existingMark.classList.add('has-note');
          if (!firstCreatedMark) firstCreatedMark = existingMark;
          return;
        }

        let targetNode = node;
        if (endOff < targetNode.nodeValue.length) {
          targetNode.splitText(endOff);
        }
        if (startOff > 0) {
          targetNode = targetNode.splitText(startOff);
        }

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

    // Xóa riêng 1 cụm Highlight theo đúng ID (Tuyệt đối không ảnh hưởng các câu khác)
    function removeSingleHighlightGroup(groupId) {
      if (!groupId) return;
      const workspace = document.getElementById('insperaSplitBox');
      if (!workspace) return;

      workspace.querySelectorAll(`mark.inspera-hl-mark[data-hl-id="${groupId}"]`).forEach(mark => {
        const parent = mark.parentNode;
        while (mark.firstChild) {
          parent.insertBefore(mark.firstChild, mark);
        }
        parent.removeChild(mark);
        parent.normalize();
      });

      delete notesStore[groupId];
      savePartHighlightSnapshot();
    }

    // Xóa toàn bộ Highlight trong màn hình hiện tại (khi người dùng chủ động bấm Clear all)
    function removeAllHighlightsInWorkspace() {
      const workspace = document.getElementById('insperaSplitBox');
      if (!workspace) return;
      workspace.querySelectorAll('mark.inspera-hl-mark').forEach(mark => {
        const id = mark.getAttribute('data-hl-id');
        if (id) delete notesStore[id];
        const parent = mark.parentNode;
        while (mark.firstChild) {
          parent.insertBefore(mark.firstChild, mark);
        }
        parent.removeChild(mark);
        parent.normalize();
      });
      savePartHighlightSnapshot();
    }

    // Mở khung Note ngay cạnh cụm từ được chọn
    function openNoteCardForGroup(groupId, anchorEl) {
      activeHlGroupId = groupId;
      hidePopup();

      const existingNote = notesStore[groupId] || '';
      noteInput.value = existingNote;
      noteDeleteBtn.style.display = existingNote ? 'inline-block' : 'none';

      noteCard.style.display = 'block';
      const rect = anchorEl ? anchorEl.getBoundingClientRect() : { left: window.innerWidth / 2 - 135, bottom: 180, top: 150 };
      let left = Math.max(12, Math.min(window.innerWidth - 285, rect.left));
      let top = rect.bottom + 8;
      if (top + 175 > window.innerHeight) {
        top = Math.max(12, rect.top - 175);
      }

      noteCard.style.left = `${left}px`;
      noteCard.style.top = `${top}px`;
      setTimeout(() => noteInput.focus(), 20);
    }

    // 1. Render Popup khi người dùng BÔI ĐEN văn bản mới (Chỉ hiện Note | Highlight giống hệt Inspera)
    function showCreationPopup(rect) {
      popup.innerHTML = `
        <button type="button" class="inspera-pop-btn" id="insperaBtnCreateNote">
          ${ICON_NOTE}
          <span>Note</span>
        </button>
        <div class="inspera-pop-divider"></div>
        <button type="button" class="inspera-pop-btn" id="insperaBtnCreateHl">
          ${ICON_MARKER}
          <span>Highlight</span>
        </button>
      `;
      positionPopupAtRect(rect);

      document.getElementById('insperaBtnCreateHl').onclick = function(e) {
        e.stopPropagation();
        if (!savedRange) return;
        const newId = 'hl_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        highlightRangeWithGroupId(savedRange, newId, false);
        savedRange = null;
        hidePopup();
      };

      document.getElementById('insperaBtnCreateNote').onclick = function(e) {
        e.stopPropagation();
        if (!savedRange) return;
        const newId = 'hl_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        const markEl = highlightRangeWithGroupId(savedRange, newId, true);
        savedRange = null;
        openNoteCardForGroup(newId, markEl);
      };
    }

    // 2. Render Popup khi người dùng CLICK TRỰC TIẾP vào một từ đã Highlight (Không cần bôi đen)
    function showExistingMarkPopup(markEl) {
      const groupId = markEl.getAttribute('data-hl-id');
      activeHlGroupId = groupId;
      const hasNote = Boolean(notesStore[groupId]);

      popup.innerHTML = `
        <button type="button" class="inspera-pop-btn" id="insperaBtnEditNote">
          ${ICON_NOTE}
          <span>${hasNote ? 'View Note' : 'Note'}</span>
        </button>
        <div class="inspera-pop-divider"></div>
        <button type="button" class="inspera-pop-btn" id="insperaBtnClearOne">
          ${ICON_CLEAR}
          <span>Clear</span>
        </button>
        <div class="inspera-pop-divider"></div>
        <button type="button" class="inspera-pop-btn" id="insperaBtnClearAll">
          ${ICON_CLEAR}
          <span>Clear all</span>
        </button>
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

    // Xử lý các nút trong cửa sổ Note Card
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
      // Nếu vừa bấm tạo Note mới mà chưa gõ chữ nào đã đóng lại thì gỡ luôn vệt màu Note rỗng
      if (activeHlGroupId && !notesStore[activeHlGroupId]) {
        const workspace = document.getElementById('insperaSplitBox');
        const marks = workspace ? workspace.querySelectorAll(`mark.inspera-hl-mark.has-note[data-hl-id="${activeHlGroupId}"]`) : [];
        if (marks.length) removeSingleHighlightGroup(activeHlGroupId);
      }
      hideNoteCard();
    };

    // Lắng nghe sự kiện Bôi đen & Click trong vùng làm bài (#insperaSplitBox)
    document.addEventListener('mouseup', function(e) {
      if (popup.contains(e.target) || noteCard.contains(e.target)) return;

      const workspace = document.getElementById('insperaSplitBox');
      if (!workspace || !workspace.contains(e.target)) {
        hidePopup();
        return;
      }

      // Bỏ qua nếu đang thao tác trên ô nhập đáp án hoặc nút bấm câu hỏi
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
          // Nếu không bôi đen mà CLICK TRỰC TIẾP vào một chữ đã highlight -> Hiện ngay menu Clear / Note!
          const clickedMark = e.target.closest('mark.inspera-hl-mark');
          if (clickedMark) {
            savedRange = null;
            // Nếu đoạn đó đã có Note sẵn, click vào mở xem Note hoặc hiện thanh công cụ
            showExistingMarkPopup(clickedMark);
          } else {
            hidePopup();
          }
        }
      }, 15);
    });

    // Tự động ẩn popup khi cuộn trang hoặc bấm ra ngoài
    document.addEventListener('mousedown', function(e) {
      if (!popup.contains(e.target) && !e.target.closest('mark.inspera-hl-mark')) {
        hidePopup();
      }
      if (!noteCard.contains(e.target) && !popup.contains(e.target) && !e.target.closest('mark.inspera-hl-mark')) {
        hideNoteCard();
      }
    });

    ['insperaLeftPane', 'insperaRightPane'].forEach(paneId => {
      const pane = document.getElementById(paneId);
      if (pane) {
        pane.addEventListener('scroll', () => {
          hidePopup();
        }, { passive: true });
      }
    });

    // Giữ nguyên các đoạn đã Highlight khi học sinh chuyển qua lại giữa các Part / Passage
    if (typeof loadPassageView === 'function') {
      const _origLoadPassageView = loadPassageView;
      loadPassageView = function(partNum) {
        _origLoadPassageView(partNum);
        restorePartHighlightSnapshot();
      };
    }

    if (typeof switchExamPassage === 'function') {
      const _origSwitchPassage = switchExamPassage;
      switchExamPassage = function(partNum) {
        savePartHighlightSnapshot();
        hidePopup();
        hideNoteCard();
        _origSwitchPassage(partNum);
      };
    }
  })();

/* === MODULE PART 36 (Lines 23699-23755) === */
(function() {
    function getQuestionNumFromKey(keyStr) {
      return parseInt(String(keyStr || '').replace(/\D/g, ''), 10) || 0;
    }

    function sortReviewIndicatorsInScope(scope) {
      if (!scope) return;

      // Tìm tất cả các thẻ cha đang chứa từ 2 khung giải thích (.answer-indicator) trở lên
      const parents = new Set();
      scope.querySelectorAll('.answer-indicator[data-ind]').forEach(ind => {
        if (ind.parentElement) parents.add(ind.parentElement);
      });

      parents.forEach(parent => {
        // Chỉ sắp xếp khi các khung giải thích là anh em trực tiếp trong cùng 1 nhóm (như Matrix / Matching / Summary)
        const directIndicators = Array.from(parent.children).filter(el =>
          el.classList && el.classList.contains('answer-indicator') && el.hasAttribute('data-ind')
        );

        if (directIndicators.length > 1) {
          directIndicators
            .sort((a, b) => {
              const numA = getQuestionNumFromKey(a.getAttribute('data-ind'));
              const numB = getQuestionNumFromKey(b.getAttribute('data-ind'));
              return numA - numB;
            })
            .forEach(ind => parent.appendChild(ind)); // Đưa lần lượt từng câu theo đúng thứ tự Q14 -> Q15 -> Q16...
        }
      });
    }

    if (typeof window.showReviewAnswersInDOM === 'function') {
      const _origShowReviewAnswersForSort = window.showReviewAnswersInDOM;

      window.showReviewAnswersInDOM = function(scope) {
        // 1. Sắp xếp lại thứ tự key trong activeExam.correctAnswers từ bé đến lớn trước khi render
        if (typeof activeExam !== 'undefined' && activeExam && activeExam.correctAnswers) {
          const sortedObj = {};
          Object.keys(activeExam.correctAnswers)
            .sort((a, b) => getQuestionNumFromKey(a) - getQuestionNumFromKey(b))
            .forEach(k => {
              sortedObj[k] = activeExam.correctAnswers[k];
            });
          activeExam.correctAnswers = sortedObj;
        }

        // 2. Gọi nguyên vẹn hàm hiển thị Review gốc (giữ nguyên mọi nút Locate Evidence & Gạch chân cấu trúc)
        _origShowReviewAnswersForSort.apply(this, arguments);

        // 3. Đảm bảo các hộp giải thích trong cùng một nhóm luôn nằm đúng thứ tự số câu
        sortReviewIndicatorsInScope(scope || document.getElementById('insperaSplitBox'));
      };
    }
  })();

/* === MODULE PART 37 (Lines 23756-23768) === */
function formatSmartFeedbackHtml(rawText) {
    if (!rawText) return '<span style="color:#94a3b8; font-style:italic;">Chưa có nhận xét cho bài viết này.</span>';
    let safe = String(rawText)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    safe = safe.replace(/\[([^\]]+)\]/g, '<div style="font-weight:800; color:#0f172a; margin-top:12px; margin-bottom:4px; font-size:14px;">[$1]</div>');
    safe = safe.replace(/([a-zA-Z0-9\s,.'"-]+)\s*(?:->|➔|➜|-->)\s*([a-zA-Z0-9\s,.'"-]+)/g, '<span class="smart-err-bad">$1</span> ➔ <span class="smart-err-good">$2</span>');
    return '<div style="line-height:1.7; font-size:13.5px; color:#334155;">' + safe.replace(/\n/g, '<br>') + '</div>';
  }

/* === MODULE PART 38 (Lines 23988-24722) === */
// 1. Chống lỗi ReferenceError cho các hàm gọi ngoài màn hình
    if (typeof window.finishExam === 'undefined') {
      window.finishExam = function() {
        if (typeof submitExam === 'function') submitExam();
      };
    }
    if (typeof window.launchReadingExam === 'undefined') {
      window.launchReadingExam = function(examId) {
        if (typeof launchExam === 'function') launchExam(examId);
      };
    }

    // 2. Khởi tạo mảng dữ liệu mới an toàn
    var _lmsEnsureArrays = ensureArraysExist;
    ensureArraysExist = function() {
      if (typeof _lmsEnsureArrays === 'function') _lmsEnsureArrays();
      if (!db.assignments) db.assignments = [];
      if (!db.userProfiles) db.userProfiles = {};
    };

    var _lmsPersist = persist;
    persist = async function() {
      if (typeof _lmsPersist === 'function') await _lmsPersist();
      var fs = (typeof getActiveFirestore === 'function') ? getActiveFirestore() : (typeof CLOUD_DB !== 'undefined' ? CLOUD_DB : null);
      if (fs) {
        try {
          await fs.collection('suite_meta').doc('core').set(cleanForFirestore({
            assignments: db.assignments || [],
            userProfiles: db.userProfiles || {}
          }), { merge: true });
        } catch (e) {}
      }
    };

    // 3. Tự động đồng bộ Realtime từ Firebase
    window.addEventListener('load', function() {
      var fs = (typeof getActiveFirestore === 'function') ? getActiveFirestore() : (typeof CLOUD_DB !== 'undefined' ? CLOUD_DB : null);
      if (fs) {
        fs.collection('suite_meta').doc('core').onSnapshot(function(doc) {
          if (doc.exists) {
            var d = doc.data() || {};
            if (Array.isArray(d.assignments)) db.assignments = d.assignments;
            if (d.userProfiles) db.userProfiles = Object.assign({}, db.userProfiles || {}, d.userProfiles);
            if (typeof activeUser !== 'undefined' && activeUser) {
              renderHomeAssignmentsSection();
              var dashPane = document.getElementById('tab-mydashboard');
              if (dashPane && dashPane.style.display === 'block') {
                renderMyLearningDashboard();
              }
            }
          }
        });
      }
    });

    // 4. LOGIC TÔ MÀU VÀ GẮN SỰ KIỆN CUỘN CHO FOOTER REVIEW
    function applyReviewColoringToCurrentFooter() {
      if (typeof isReviewMode === 'undefined' || !isReviewMode) return;

      var allBtns = document.querySelectorAll('#insperaFooterList button, .progress-container button, .progress-item');
      allBtns.forEach(function(btn) {
        var txt = btn.textContent.trim();
        if (!/^\d+$/.test(txt)) return;

        var num = txt;
        var qKey = 'q' + num;

        var userVal = '';
        if (typeof userAnswers !== 'undefined' && userAnswers) {
          if (userAnswers[qKey] !== undefined) userVal = String(userAnswers[qKey]).trim();
          else if (userAnswers[num] !== undefined) userVal = String(userAnswers[num]).trim();
        }

        var isCorrect = false;
        if (typeof isAnswerCorrect === 'function') {
          isCorrect = isAnswerCorrect(qKey) || isAnswerCorrect(num);
        } else if (typeof activeExam !== 'undefined' && activeExam && activeExam.correctAnswers) {
          var cor = (activeExam.correctAnswers[qKey] || activeExam.correctAnswers[num] || '').toString().trim().toLowerCase();
          isCorrect = userVal !== '' && userVal.toLowerCase() === cor;
        }

        if (!userVal) {
          btn.style.setProperty('background-color', '#f1f5f9', 'important');
          btn.style.setProperty('color', '#64748b', 'important');
          btn.style.setProperty('border', '1.5px solid #cbd5e1', 'important');
          btn.style.setProperty('border-top', '3px solid #94a3b8', 'important');
        } else if (isCorrect) {
          btn.style.setProperty('background-color', '#dcfce7', 'important');
          btn.style.setProperty('color', '#15803d', 'important');
          btn.style.setProperty('border', '1.5px solid #16a34a', 'important');
          btn.style.setProperty('border-top', '3px solid #16a34a', 'important');
        } else {
          btn.style.setProperty('background-color', '#fee2e2', 'important');
          btn.style.setProperty('color', '#b91c1c', 'important');
          btn.style.setProperty('border', '1.5px solid #dc2626', 'important');
          btn.style.setProperty('border-top', '3px solid #dc2626', 'important');
        }

        btn.onclick = function(e) {
          e.stopPropagation();
          var targetPart = (typeof findPartForQuestionKey === 'function') ? (findPartForQuestionKey(qKey) || findPartForQuestionKey(num)) : null;
          if (targetPart && targetPart !== activePartNum && typeof switchExamPassage === 'function') {
            switchExamPassage(targetPart);
          }
          setTimeout(function() {
            document.querySelectorAll('.question-scroll-focus').forEach(function(el) {
              el.classList.remove('question-scroll-focus');
            });
            var targetEl = document.querySelector('[data-question="' + num + '"]') || 
                           document.querySelector('[name="' + qKey + '"]') || 
                           document.querySelector('[name="' + num + '"]') || 
                           document.querySelector('.answer-indicator[data-ind="' + qKey + '"]');
            if (targetEl) {
              var box = targetEl.closest('.question') || targetEl.closest('tr') || targetEl;
              box.classList.add('question-scroll-focus');
              box.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 70);
        };
      });
    }

    var _lmsEnterReview = enterReviewModeFromSummary;
    enterReviewModeFromSummary = function() {
      if (typeof _lmsEnterReview === 'function') _lmsEnterReview();
      setTimeout(applyReviewColoringToCurrentFooter, 60);
    };

    var _lmsSwitchPassage = switchExamPassage;
    switchExamPassage = function(partNum) {
      if (typeof _lmsSwitchPassage === 'function') _lmsSwitchPassage(partNum);
      if (typeof isReviewMode !== 'undefined' && isReviewMode) {
        setTimeout(applyReviewColoringToCurrentFooter, 60);
      }
    };

    // 5. TRANG HỌC TẬP CỦA TÔI (MY DASHBOARD)
    function injectPersonalDashboardTabAndPane() {
      var dashTabs = document.querySelector('.dash-tabs');
      if (dashTabs && !document.getElementById('tabbtn-mydashboard')) {
        var btn = document.createElement('button');
        btn.className = 'dash-tab-btn';
        btn.id = 'tabbtn-mydashboard';
        btn.innerHTML = '🎓 Personal Dashboard';
        btn.onclick = function() { switchDashTab('mydashboard'); };
        var homeBtn = document.getElementById('tabbtn-home');
        if (homeBtn && homeBtn.nextSibling) {
          dashTabs.insertBefore(btn, homeBtn.nextSibling);
        } else {
          dashTabs.appendChild(btn);
        }

        var hwBtn = document.createElement('button');
        hwBtn.className = 'dash-tab-btn teacher-item';
        hwBtn.id = 'tabbtn-assign-hw';
        hwBtn.style.cssText = 'background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe;';
        hwBtn.innerHTML = '📋 + Giao bài tập';
        hwBtn.onclick = function() { openCreateHomeworkModal(); };
        dashTabs.appendChild(hwBtn);
      }

      var dashBody = document.querySelector('.dash-body');
      if (dashBody && !document.getElementById('tab-mydashboard')) {
        var pane = document.createElement('div');
        pane.id = 'tab-mydashboard';
        pane.className = 'dash-pane';
        pane.style.display = 'none';
        pane.innerHTML = 
          '<div class="card" style="padding:20px 24px;">' +
            '<div class="card-title" style="margin-bottom:14px;">' +
              '<span>🎯 Hồ Sơ Học Tập & Mục Tiêu Cá Nhân</span>' +
              '<button class="btn btn-secondary" style="font-size:12px; padding:5px 12px;" onclick="promptUpdateStudyGoals()">⚙️ Chỉnh mục tiêu & Ngày thi</button>' +
            '</div>' +
            '<div class="pd-top-grid" id="pdPersonalMetricsBox"></div>' +
          '</div>' +
          '<div class="pd-comp-grid">' +
            '<div class="card" style="margin-bottom:0;">' +
              '<div class="card-title" style="font-size:15px;">📊 Đánh Giá Năng Lực Hiện Tại</div>' +
              '<div class="pd-band-box" id="pdCurrentBandsBox"></div>' +
            '</div>' +
            '<div class="card" style="margin-bottom:0;">' +
              '<div class="card-title" style="font-size:15px;">⏱️ Hoạt Động Học Trong Tuần (7 ngày)</div>' +
              '<div class="pd-bar-chart" id="pdWeeklyChartBox"></div>' +
            '</div>' +
            '<div class="card" style="margin-bottom:0;">' +
              '<div class="card-title" style="font-size:15px;">' +
                '<span>📅 Lịch Học Theo Tháng (Heatmap)</span>' +
                '<span id="pdHeatmapMonthLabel" style="font-size:12px; color:#059669; font-weight:700; margin-left:8px;"></span>' +
              '</div>' +
              '<div class="pd-heatmap-grid" id="pdMonthlyHeatmapBox"></div>' +
            '</div>' +
          '</div>' +
          '<div class="card">' +
            '<div class="card-title"><span>📚 Lịch Sử Bài Đã Làm</span></div>' +
            '<div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px;" id="pdTypeFilterPills">' +
              '<button class="btn btn-emerald" data-type="ALL" onclick="setPdHistoryType(\'ALL\')">Tất cả</button>' +
              '<button class="btn btn-secondary" data-type="SINGLE" onclick="setPdHistoryType(\'SINGLE\')">Thi 1 kỹ năng</button>' +
              '<button class="btn btn-secondary" data-type="PRACTICE" onclick="setPdHistoryType(\'PRACTICE\')">Luyện tập</button>' +
              '<button class="btn btn-secondary" data-type="DICTATION" onclick="setPdHistoryType(\'DICTATION\')">Từ vựng / Chính tả</button>' +
              '<button class="btn btn-secondary" data-type="MOCK" onclick="setPdHistoryType(\'MOCK\')">Thi thật (Full Test)</button>' +
            '</div>' +
            '<div style="display:grid; grid-template-columns: 1.4fr 1fr 1fr 1fr auto; gap:10px; margin-bottom:16px; background:#f8fafc; padding:12px; border-radius:12px; border:1px solid #e2e8f0; align-items:center;">' +
              '<input type="text" id="pdSearchInput" class="form-input" placeholder="🔍 Tìm kiếm theo tên đề thi..." oninput="renderPdHistoryTable()">' +
              '<select id="pdSkillSelect" class="form-input" onchange="renderPdHistoryTable()">' +
                '<option value="ALL">🎯 Tất cả kỹ năng</option>' +
                '<option value="reading">📖 Reading</option>' +
                '<option value="listening">🎧 Listening</option>' +
                '<option value="writing">✍️ Writing</option>' +
                '<option value="speaking">🗣️ Speaking</option>' +
                '<option value="full">🏆 Full Test</option>' +
              '</select>' +
              '<input type="date" id="pdDateFrom" class="form-input" onchange="renderPdHistoryTable()">' +
              '<input type="date" id="pdDateTo" class="form-input" onchange="renderPdHistoryTable()">' +
              '<button class="btn btn-secondary" onclick="resetPdHistoryFilters()">Xóa lọc</button>' +
            '</div>' +
            '<table>' +
              '<thead>' +
                '<tr>' +
                  '<th>Tên Bài Thi / Bài Tập</th>' +
                  '<th>Kỹ Năng</th>' +
                  '<th>Tỷ Lệ Đúng</th>' +
                  '<th>Band Score</th>' +
                  '<th>Thời Gian Nộp</th>' +
                  '<th>Thao Tác</th>' +
                '</tr>' +
              '</thead>' +
              '<tbody id="pdHistoryTbody"></tbody>' +
            '</table>' +
          '</div>';
        dashBody.appendChild(pane);
      }
    }

    var currentPdHistoryType = 'ALL';

    function getUserGoalProfile() {
      ensureArraysExist();
      if (!activeUser) return { targetBand: '7.5', examDate: '2026-12-30', targetDays: 30 };
      if (!db.userProfiles[activeUser.username]) {
        db.userProfiles[activeUser.username] = { targetBand: '7.5', examDate: '2026-12-30', targetDays: 30 };
      }
      return db.userProfiles[activeUser.username];
    }

    window.promptUpdateStudyGoals = function() {
      var prof = getUserGoalProfile();
      var newBand = prompt('Nhập Band mục tiêu (VD: 6.5, 7.0, 7.5, 8.0):', prof.targetBand);
      if (newBand === null) return;
      var newDate = prompt('Nhập Ngày thi dự kiến (YYYY-MM-DD):', prof.examDate);
      if (newDate === null) return;
      var newDays = prompt('Nhập tổng số ngày cần học:', prof.targetDays || 30);

      prof.targetBand = newBand.trim() || '7.5';
      prof.examDate = newDate.trim() || '2026-12-30';
      prof.targetDays = parseInt(newDays) || 30;
      persist();
      renderMyLearningDashboard();
    };

    function getResultIsoDate(r) {
      if (r.isoDate) return r.isoDate;
      var idMatch = String(r.id || '').match(/(\d{13})/);
      if (idMatch) {
        var d = new Date(Number(idMatch[1]));
        return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
      }
      return (typeof getTodayIsoString === 'function') ? getTodayIsoString() : '2026-10-30';
    }

    function calculateUserStreakAndDays(userResults) {
      var dateSet = new Set(userResults.map(function(r) { return getResultIsoDate(r); }));
      var totalActiveDays = dateSet.size;
      var streak = 0;
      var cur = new Date();
      for (var i = 0; i < 365; i++) {
        var d = new Date(cur);
        d.setDate(cur.getDate() - i);
        var iso = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
        if (dateSet.has(iso)) {
          streak++;
        } else if (i === 0) {
          continue;
        } else {
          break;
        }
      }
      return { streak: streak, totalActiveDays: totalActiveDays };
    }

    function renderMyLearningDashboard() {
      if (typeof activeUser === 'undefined' || !activeUser) return;
      injectPersonalDashboardTabAndPane();

      var myResults = (db.results || []).filter(function(r) {
        return activeUser.role === 'teacher' ? true : String(r.userName || '').toLowerCase() === String(activeUser.name || '').toLowerCase();
      });

      var stats = calculateUserStreakAndDays(myResults);
      var prof = getUserGoalProfile();

      var todayMs = new Date().setHours(0,0,0,0);
      var examMs = new Date(prof.examDate).setHours(0,0,0,0);
      var daysLeft = !isNaN(examMs) ? Math.max(0, Math.ceil((examMs - todayMs) / 86400000)) : '--';

      var metricsBox = document.getElementById('pdPersonalMetricsBox');
      if (metricsBox) {
        metricsBox.innerHTML = 
          '<div class="pd-metric-card"><div class="pd-metric-icon" style="background:#ffedd5; color:#ea580c;">🔥</div><div><div style="font-size:22px; font-weight:800; color:#0f172a;">' + stats.streak + ' ngày</div><div style="font-size:11.5px; font-weight:700; color:#64748b;">STREAK HỌC TẬP</div></div></div>' +
          '<div class="pd-metric-card"><div class="pd-metric-icon" style="background:#ecfdf5; color:#059669;">📝</div><div><div style="font-size:22px; font-weight:800; color:#0f172a;">' + myResults.length + ' lượt</div><div style="font-size:11.5px; font-weight:700; color:#64748b;">TỔNG LƯỢT LÀM BÀI</div></div></div>' +
          '<div class="pd-metric-card"><div class="pd-metric-icon" style="background:#eff6ff; color:#2563eb;">📆</div><div><div style="font-size:22px; font-weight:800; color:#0f172a;">' + stats.totalActiveDays + '/' + (prof.targetDays || 30) + '</div><div style="font-size:11.5px; font-weight:700; color:#64748b;">NGÀY CẦN HỌC</div></div></div>' +
          '<div class="pd-metric-card"><div class="pd-metric-icon" style="background:#fef3c7; color:#d97706;">🎯</div><div><div style="font-size:22px; font-weight:800; color:#059669;">Band ' + prof.targetBand + '</div><div style="font-size:11.5px; font-weight:700; color:#64748b;">BAND MỤC TIÊU</div></div></div>' +
          '<div class="pd-metric-card"><div class="pd-metric-icon" style="background:#f3e8ff; color:#7c3aed;">⏳</div><div><div style="font-size:16px; font-weight:800; color:#0f172a;">' + prof.examDate + '</div><div style="font-size:11.5px; font-weight:700; color:#7c3aed;">CÒN ' + daysLeft + ' NGÀY THI</div></div></div>';
      }

      function calcAvgBandForSkill(skill) {
        var nums = myResults
          .filter(function(r) { return (typeof detectResultSkillType === 'function') ? detectResultSkillType(r) === skill : false; })
          .map(function(r) { return parseFloat(String(r.band || '').replace('Band', '').trim()); })
          .filter(function(n) { return !isNaN(n) && n > 0; });
        if (!nums.length) return '—';
        var avg = nums.reduce(function(a, b) { return a + b; }, 0) / nums.length;
        return (Math.round(avg * 2) / 2).toFixed(1);
      }

      var bandsBox = document.getElementById('pdCurrentBandsBox');
      if (bandsBox) {
        bandsBox.innerHTML = 
          '<div class="pd-skill-pill"><div style="font-size:12px; font-weight:700; color:#64748b;">📖 Reading</div><div style="font-size:24px; font-weight:800; color:#059669; margin-top:4px;">' + calcAvgBandForSkill('reading') + '</div></div>' +
          '<div class="pd-skill-pill"><div style="font-size:12px; font-weight:700; color:#64748b;">🎧 Listening</div><div style="font-size:24px; font-weight:800; color:#2563eb; margin-top:4px;">' + calcAvgBandForSkill('listening') + '</div></div>' +
          '<div class="pd-skill-pill"><div style="font-size:12px; font-weight:700; color:#64748b;">✍️ Writing</div><div style="font-size:24px; font-weight:800; color:#d97706; margin-top:4px;">' + calcAvgBandForSkill('writing') + '</div></div>' +
          '<div class="pd-skill-pill"><div style="font-size:12px; font-weight:700; color:#64748b;">🗣️ Speaking</div><div style="font-size:24px; font-weight:800; color:#7c3aed; margin-top:4px;">—</div></div>';
      }

      var chartBox = document.getElementById('pdWeeklyChartBox');
      if (chartBox) {
        var dayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        var cols = [];
        var maxMins = 60;
        for (var i = 6; i >= 0; i--) {
          var dt = new Date();
          dt.setDate(dt.getDate() - i);
          var isoDate = dt.getFullYear() + '-' + String(dt.getMonth()+1).padStart(2,'0') + '-' + String(dt.getDate()).padStart(2,'0');
          var count = myResults.filter(function(r) { return getResultIsoDate(r) === isoDate; }).length;
          var mins = count * 30;
          if (mins > maxMins) maxMins = mins;
          cols.push({ label: dayLabels[dt.getDay()], mins: mins, count: count });
        }
        chartBox.innerHTML = cols.map(function(c) {
          var hPct = Math.max(6, Math.round((c.mins / maxMins) * 100));
          return '<div class="pd-bar-col" title="' + c.mins + ' phút (' + c.count + ' bài)">' +
            '<div style="font-size:10px; font-weight:700; color:#059669;">' + (c.mins > 0 ? c.mins + 'p' : '') + '</div>' +
            '<div class="pd-bar-fill" style="height:' + hPct + 'px; opacity:' + (c.mins > 0 ? 1 : 0.25) + ';"></div>' +
            '<div style="font-size:11px; font-weight:700; color:#475569;">' + c.label + '</div>' +
          '</div>';
        }).join('');
      }

      var heatBox = document.getElementById('pdMonthlyHeatmapBox');
      var monthLbl = document.getElementById('pdHeatmapMonthLabel');
      if (heatBox) {
        var now = new Date();
        var y = now.getFullYear();
        var m = now.getMonth();
        if (monthLbl) monthLbl.textContent = 'Tháng ' + (m + 1) + '/' + y;
        var daysInMonth = new Date(y, m + 1, 0).getDate();
        var cells = '';
        for (var day = 1; day <= daysInMonth; day++) {
          var dIso = y + '-' + String(m+1).padStart(2,'0') + '-' + String(day).padStart(2,'0');
          var cCnt = myResults.filter(function(r) { return getResultIsoDate(r) === dIso; }).length;
          var lv = cCnt >= 3 ? 'lv-3' : (cCnt === 2 ? 'lv-2' : (cCnt === 1 ? 'lv-1' : ''));
          cells += '<div class="pd-heat-cell ' + lv + '" title="Ngày ' + day + '/' + (m+1) + ': ' + cCnt + ' bài">' + day + '</div>';
        }
        heatBox.innerHTML = cells;
      }

      renderPdHistoryTable();
    }

    window.setPdHistoryType = function(typeKey) {
      currentPdHistoryType = typeKey;
      document.querySelectorAll('#pdTypeFilterPills button').forEach(function(b) {
        b.className = b.getAttribute('data-type') === typeKey ? 'btn btn-emerald' : 'btn btn-secondary';
      });
      renderPdHistoryTable();
    };

    window.resetPdHistoryFilters = function() {
      currentPdHistoryType = 'ALL';
      if (document.getElementById('pdSearchInput')) document.getElementById('pdSearchInput').value = '';
      if (document.getElementById('pdSkillSelect')) document.getElementById('pdSkillSelect').value = 'ALL';
      if (document.getElementById('pdDateFrom')) document.getElementById('pdDateFrom').value = '';
      if (document.getElementById('pdDateTo')) document.getElementById('pdDateTo').value = '';
      setPdHistoryType('ALL');
    };

    function classifySubmissionMode(r) {
      var sk = (typeof detectResultSkillType === 'function') ? detectResultSkillType(r) : '';
      if (sk === 'quiz') return 'DICTATION';
      var title = String(r.examTitle || '').toLowerCase();
      var scoreStr = String(r.score || '');
      var m = scoreStr.match(/(\d+)\s*\/\s*(\d+)/);
      var totalQ = m ? parseInt(m[2]) : 0;
      if (title.indexOf('full') !== -1 || totalQ >= 38) return 'MOCK';
      if (totalQ > 0 && totalQ <= 20) return 'PRACTICE';
      return 'SINGLE';
    }

    window.retakeFullExamById = function(examId, skillType) {
      if (skillType === 'listening' && typeof launchListeningExam === 'function') {
        launchListeningExam(examId);
      } else if (skillType === 'writing' && typeof launchWritingExam === 'function') {
        launchWritingExam(examId);
      } else if (typeof launchExam === 'function') {
        launchExam(examId);
      }
    };

    function renderPdHistoryTable() {
      var tbody = document.getElementById('pdHistoryTbody');
      if (!tbody || typeof activeUser === 'undefined' || !activeUser) return;
      tbody.innerHTML = '';

      var kw = (document.getElementById('pdSearchInput') ? document.getElementById('pdSearchInput').value : '').toLowerCase().trim();
      var skillFilter = document.getElementById('pdSkillSelect') ? document.getElementById('pdSkillSelect').value : 'ALL';
      var dateFrom = document.getElementById('pdDateFrom') ? document.getElementById('pdDateFrom').value : '';
      var dateTo = document.getElementById('pdDateTo') ? document.getElementById('pdDateTo').value : '';

      var list = (db.results || []).slice().reverse().filter(function(r) {
        if (activeUser.role === 'student' && String(r.userName || '').toLowerCase() !== String(activeUser.name || '').toLowerCase()) {
          return false;
        }
        if (kw && String(r.examTitle || '').toLowerCase().indexOf(kw) === -1) return false;

        var sk = (typeof detectResultSkillType === 'function') ? detectResultSkillType(r) : '';
        if (skillFilter !== 'ALL') {
          if (skillFilter === 'full') {
            if (classifySubmissionMode(r) !== 'MOCK') return false;
          } else if (sk !== skillFilter) {
            return false;
          }
        }

        if (currentPdHistoryType !== 'ALL' && classifySubmissionMode(r) !== currentPdHistoryType) {
          return false;
        }

        var iso = getResultIsoDate(r);
        if (dateFrom && iso < dateFrom) return false;
        if (dateTo && iso > dateTo) return false;
        return true;
      });

      if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:24px; color:#94a3b8;">Không có dữ liệu bài làm phù hợp.</td></tr>';
        return;
      }

      list.forEach(function(r) {
        var sk = (typeof detectResultSkillType === 'function') ? detectResultSkillType(r) : 'reading';
        var isWriting = sk === 'writing';
        var isQuiz = sk === 'quiz';

        var ringHtml = '<span style="font-weight:700; color:#475569;">' + (r.score || '—') + '</span>';
        var ratioMatch = String(r.score || '').match(/(\d+)\s*\/\s*(\d+)/);
        if (ratioMatch) {
          var c = parseInt(ratioMatch[1]);
          var t = Math.max(1, parseInt(ratioMatch[2]));
          var pct = Math.round((c / t) * 100);
          var color = pct >= 70 ? '#16a34a' : (pct >= 50 ? '#d97706' : '#dc2626');
          ringHtml = '<div style="display:flex; align-items:center; gap:8px;">' +
            '<div class="score-ring-badge" style="background: conic-gradient(' + color + ' ' + (pct * 3.6) + 'deg, #e2e8f0 0deg);">' +
              '<div class="score-ring-inner">' + c + '/' + t + '</div>' +
            '</div>' +
            '<span style="font-size:12px; font-weight:700; color:#64748b;">' + pct + '%</span>' +
          '</div>';
        }

        var skillBadges = {
          reading: '<span style="background:#ecfdf5; color:#059669; padding:3px 10px; border-radius:99px; font-weight:700; font-size:12px;">📖 Reading</span>',
          listening: '<span style="background:#eff6ff; color:#2563eb; padding:3px 10px; border-radius:99px; font-weight:700; font-size:12px;">🎧 Listening</span>',
          writing: '<span style="background:#fef3c7; color:#d97706; padding:3px 10px; border-radius:99px; font-weight:700; font-size:12px;">✍️ Writing</span>',
          quiz: '<span style="background:#f3e8ff; color:#7c3aed; padding:3px 10px; border-radius:99px; font-weight:700; font-size:12px;">🎯 Quiz</span>'
        };

        var tr = document.createElement('tr');
        tr.innerHTML = 
          '<td><b>' + r.examTitle + '</b>' + (activeUser.role === 'teacher' ? '<div style="font-size:11.5px; color:#64748b;">Học sinh: <b>' + r.userName + '</b></div>' : '') + '</td>' +
          '<td>' + (skillBadges[sk] || sk) + '</td>' +
          '<td>' + ringHtml + '</td>' +
          '<td><b style="color:var(--emerald-accent);">' + (String(r.band).indexOf('Band') !== -1 ? r.band : 'Band ' + r.band) + '</b></td>' +
          '<td><span style="font-size:12px; color:#64748b;">' + (r.timestamp || '') + '</span></td>' +
          '<td style="display:flex; gap:6px; flex-wrap:wrap;">' +
            (isWriting ? 
              '<button class="btn btn-secondary" onclick="openStudentViewWritingModal(\'' + r.id + '\')">👁️ Xem lại</button>' +
              '<button class="btn btn-emerald" onclick="retakeFullExamById(\'' + r.examId + '\', \'writing\')">🔄 Làm lại</button>' :
             (isQuiz ? 
              '<button class="btn btn-emerald" onclick="triggerVocabMilestoneQuiz(5)">🔄 Làm lại Quiz</button>' :
              '<button class="btn btn-secondary" onclick="reopenReviewFromHistory(\'' + r.id + '\')">🔍 Xem lại</button>' +
              '<button class="btn btn-emerald" onclick="retakeFullExamById(\'' + r.examId + '\', \'' + sk + '\')">🔄 Làm lại</button>'
             )
            ) +
          '</td>';
        tbody.appendChild(tr);
      });
    }

    // 6. TRANG CHỦ (MY ASSIGNMENTS)
    var currentHomeAsgTab = 'todo';

    window.switchHomeAsgTab = function(tabName) {
      currentHomeAsgTab = tabName;
      renderHomeAssignmentsSection();
    };

    function isHomeworkCompletedByUser(asg, userObj) {
      if (!userObj) return false;
      return (db.results || []).some(function(r) {
        var sameUser = String(r.userName || '').toLowerCase() === String(userObj.name || '').toLowerCase();
        var sameExam = r.examId === asg.examId;
        return sameUser && sameExam;
      });
    }

    function renderHomeAssignmentsSection() {
      if (typeof activeUser === 'undefined' || !activeUser) return;
      var oldTbody = document.getElementById('homeRecentActivityTbody');
      if (!oldTbody) return;
      var card = oldTbody.closest('.card');
      if (!card) return;

      ensureArraysExist();
      var myAsgs = (db.assignments || []).filter(function(a) {
        if (activeUser.role === 'teacher') return true;
        return (a.studentIds || []).indexOf(activeUser.id) !== -1 || (a.studentUsernames || []).indexOf(activeUser.username) !== -1;
      });

      var todoList = myAsgs.filter(function(a) { return !isHomeworkCompletedByUser(a, activeUser); });
      var doneList = myAsgs.filter(function(a) { return isHomeworkCompletedByUser(a, activeUser); });
      var activeList = currentHomeAsgTab === 'todo' ? todoList : doneList;

      card.innerHTML = 
        '<div class="card-title" style="margin-bottom:14px;">' +
          '<div style="display:flex; align-items:center; gap:10px;"><span>📌 Nhiệm vụ / Bài tập được giao (My Assignments)</span></div>' +
          '<div style="display:flex; gap:8px;">' +
            (activeUser.role === 'teacher' ? '<button class="btn btn-emerald" onclick="openCreateHomeworkModal()">📋 + Giao bài tập mới</button>' : '') +
            '<button class="btn btn-secondary" onclick="switchDashTab(\'mydashboard\')">📊 Xem Lịch sử bài đã làm ➔</button>' +
          '</div>' +
        '</div>' +
        '<div class="asg-tabs">' +
          '<button class="asg-tab-btn ' + (currentHomeAsgTab === 'todo' ? 'active' : '') + '" onclick="switchHomeAsgTab(\'todo\')">⏳ Cần làm (To-do) (' + todoList.length + ')</button>' +
          '<button class="asg-tab-btn ' + (currentHomeAsgTab === 'done' ? 'active' : '') + '" onclick="switchHomeAsgTab(\'done\')">✅ Đã hoàn thành (' + doneList.length + ')</button>' +
        '</div>' +
        '<div id="homeAssignmentsListContainer">' +
          (!activeList.length ? 
            '<div class="asg-empty-box">' +
              '<div style="font-size:32px; margin-bottom:8px;">🎉</div>' +
              '<div style="font-size:16px; font-weight:800; color:#0f172a;">' + (currentHomeAsgTab === 'todo' ? 'Bạn đã hoàn thành hết bài tập được giao!' : 'Chưa có bài tập nào hoàn thành.') + '</div>' +
              '<div style="font-size:13px; color:#64748b; margin-top:4px; margin-bottom:16px;">Tự luyện thêm trong thư viện để nâng Band điểm nhé!</div>' +
              '<div style="display:flex; justify-content:center; gap:10px; flex-wrap:wrap;">' +
                '<button class="btn btn-emerald" onclick="switchDashTab(\'reading\')">📖 Reading</button>' +
                '<button class="btn btn-secondary" onclick="switchDashTab(\'listening\')">🎧 Listening</button>' +
                '<button class="btn btn-secondary" onclick="switchDashTab(\'writing\')">✍️ Writing</button>' +
              '</div>' +
            '</div>' :
            activeList.map(function(a) {
              var isOverdue = a.deadline && (new Date(a.deadline).setHours(23,59,59) < Date.now()) && currentHomeAsgTab === 'todo';
              var skillBadge = a.skill === 'listening' ? '🎧 Listening' : (a.skill === 'writing' ? '✍️ Writing' : '📖 Reading');
              return '<div class="asg-card ' + (isOverdue ? 'overdue' : '') + '">' +
                '<div>' +
                  '<div style="display:flex; align-items:center; gap:8px; margin-bottom:6px; flex-wrap:wrap;">' +
                    '<span style="background:#ecfdf5; color:#047857; padding:2px 9px; border-radius:6px; font-size:11.5px; font-weight:800;">' + skillBadge + '</span>' +
                    '<b style="font-size:15px; color:#0f172a;">' + a.examTitle + '</b>' +
                    (a.deadline ? '<span style="background:' + (isOverdue ? '#fee2e2' : '#fef3c7') + '; color:' + (isOverdue ? '#dc2626' : '#b45309') + '; padding:2px 8px; border-radius:6px; font-size:11.5px; font-weight:700;">⏰ Hạn: ' + a.deadline + '</span>' : '') +
                  '</div>' +
                  (a.note ? '<div style="font-size:13px; color:#334155; background:#f8fafc; padding:6px 10px; border-radius:6px; border-left:3px solid #3b82f6;">💬 <b>Ghi chú:</b> ' + a.note + '</div>' : '') +
                  (activeUser.role === 'teacher' ? '<div style="font-size:11.5px; color:#64748b; margin-top:4px;">👥 Giao cho: ' + (a.studentNames || []).join(', ') + '</div>' : '') +
                '</div>' +
                '<div style="display:flex; gap:8px; align-items:center;">' +
                  '<button class="btn btn-emerald" onclick="retakeFullExamById(\'' + a.examId + '\', \'' + a.skill + '\')">' + (currentHomeAsgTab === 'todo' ? '🚀 Làm bài' : '🔄 Làm lại') + '</button>' +
                  (activeUser.role === 'teacher' ? '<button class="btn btn-danger" style="padding:7px 10px;" onclick="deleteHomeworkAssignment(\'' + a.id + '\')">🗑️</button>' : '') +
                '</div>' +
              '</div>';
            }).join('')
          ) +
        '</div>';
    }

    // 7. GIAO BÀI TẬP (TEACHER)
    window.openCreateHomeworkModal = function() {
      ensureArraysExist();
      populateHwExamOptions();
      var clsSel = document.getElementById('hwFilterClassSelect');
      if (clsSel) {
        clsSel.innerHTML = '<option value="ALL">🏫 Tất cả các lớp</option>' +
          (db.classes || []).map(function(c) { return '<option value="' + c.id + '">' + c.name + '</option>'; }).join('');
      }
      var d = new Date();
      d.setDate(d.getDate() + 3);
      var iso = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
      if (document.getElementById('hwDeadlineInput')) document.getElementById('hwDeadlineInput').value = iso;
      if (document.getElementById('hwNoteInput')) document.getElementById('hwNoteInput').value = '';
      renderHwStudentChecklist();
      openModal('createHomeworkModal');
    };

    window.populateHwExamOptions = function() {
      var sk = document.getElementById('hwSkillSelect') ? document.getElementById('hwSkillSelect').value : 'reading';
      var exSel = document.getElementById('hwExamSelect');
      if (!exSel) return;
      var pool = sk === 'listening' ? (db.listeningExams || []) : (sk === 'writing' ? (db.writingExams || []) : (db.readingExams || []));
      if (!pool.length) {
        exSel.innerHTML = '<option value="">-- Chưa có đề thi nào --</option>';
        return;
      }
      exSel.innerHTML = pool.map(function(e) { return '<option value="' + e.id + '">' + e.title + '</option>'; }).join('');
    };

    window.renderHwStudentChecklist = function() {
      var box = document.getElementById('hwStudentCheckListBox');
      if (!box) return;
      var clsFilter = document.getElementById('hwFilterClassSelect') ? document.getElementById('hwFilterClassSelect').value : 'ALL';
      var students = (db.users || []).filter(function(u) { return u.role === 'student' && (clsFilter === 'ALL' || u.classId === clsFilter); });
      if (!students.length) {
        box.innerHTML = '<div style="color:#94a3b8; font-style:italic; grid-column: 1 / -1;">Không có học sinh trong lớp này.</div>';
        return;
      }
      box.innerHTML = students.map(function(s) {
        var cls = (db.classes || []).find(function(c) { return c.id === s.classId; });
        return '<label style="display:flex; align-items:center; gap:8px; background:#fff; border:1px solid #e2e8f0; padding:7px 10px; border-radius:8px; cursor:pointer; font-size:12.5px; font-weight:600;">' +
          '<input type="checkbox" class="hw-stu-checkbox" value="' + s.id + '" data-uname="' + s.username + '" data-name="' + s.name + '" checked style="width:16px; height:16px; accent-color:#059669;">' +
          '<span>' + s.name + ' <small style="color:#64748b;">(' + (cls ? cls.name : 'Chưa xếp lớp') + ')</small></span>' +
        '</label>';
      }).join('');
    };

    window.toggleAllHwStudents = function(checkState) {
      document.querySelectorAll('#hwStudentCheckListBox .hw-stu-checkbox').forEach(function(cb) { cb.checked = checkState; });
    };

    window.saveNewHomeworkAssignment = async function() {
      var skill = document.getElementById('hwSkillSelect').value;
      var examId = document.getElementById('hwExamSelect').value;
      if (!examId) return alert('Vui lòng chọn đề thi!');
      var pool = skill === 'listening' ? (db.listeningExams || []) : (skill === 'writing' ? (db.writingExams || []) : (db.readingExams || []));
      var examObj = pool.find(function(e) { return e.id === examId; });
      var checked = Array.from(document.querySelectorAll('#hwStudentCheckListBox .hw-stu-checkbox:checked'));
      if (!checked.length) return alert('Vui lòng chọn học sinh!');

      var newAsg = {
        id: 'asg_' + Date.now(),
        skill: skill,
        examId: examId,
        examTitle: examObj ? examObj.title : 'Bài tập IELTS',
        studentIds: checked.map(function(b) { return b.value; }),
        studentUsernames: checked.map(function(b) { return b.getAttribute('data-uname'); }),
        studentNames: checked.map(function(b) { return b.getAttribute('data-name'); }),
        deadline: document.getElementById('hwDeadlineInput').value,
        note: document.getElementById('hwNoteInput').value.trim(),
        createdAt: Date.now()
      };

      ensureArraysExist();
      db.assignments.unshift(newAsg);
      await persist();
      closeModal('createHomeworkModal');
      renderHomeAssignmentsSection();
      alert('Đã giao bài tập thành công!');
    };

    window.deleteHomeworkAssignment = async function(asgId) {
      if (!confirm('Xóa bài tập này?')) return;
      db.assignments = (db.assignments || []).filter(function(a) { return a.id !== asgId; });
      await persist();
      renderHomeAssignmentsSection();
    };

    // 8. ĐIỀU HƯỚNG TỔNG QUÁT
    var _lmsHomeTab = renderHomeTab;
    renderHomeTab = function() {
      injectPersonalDashboardTabAndPane();
      if (typeof _lmsHomeTab === 'function') _lmsHomeTab();
      renderHomeAssignmentsSection();
    };

    var _lmsSwitchTab = switchDashTab;
    switchDashTab = function(tab) {
      injectPersonalDashboardTabAndPane();
      if (typeof _lmsSwitchTab === 'function') _lmsSwitchTab(tab);
      if (tab === 'mydashboard') {
        renderMyLearningDashboard();
      }
    };

    window.addEventListener('DOMContentLoaded', function() {
      injectPersonalDashboardTabAndPane();
    });
	// =========================================================================
    // 9. KHÓA NÚT "Open Audio" & ĐỒNG BỘ ĐỒNG HỒ LISTENING AN TOÀN (KHÔNG LỖI)
    // =========================================================================
    (function() {
      // 1. Dùng CSS thuần để ẩn nút Open Audio khi làm bài (tự hiện lại khi Review)
      var st = document.createElement('style');
      st.innerHTML = 'body:not(.review-mode) [title="Open Audio"] { display: none !important; pointer-events: none !important; }';
      document.head.appendChild(st);

      // 2. Chỉ đồng bộ thời gian khi có thẻ <audio> đang phát trực tiếp
      setInterval(function() {
        // Nếu không phải đang làm bài Listening hoặc đang ở chế độ Review thì thoát ngay, không can thiệp bất cứ thứ gì
        if (typeof activeExamType === 'undefined' || activeExamType !== 'listening') return;
        if (typeof isReviewMode !== 'undefined' && isReviewMode) return;

        // Ẩn riêng nút Open Audio nếu chưa có class
        var openBtn = document.querySelector('[title="Open Audio"]');
        if (openBtn) openBtn.style.display = 'none';

        // Tìm thẻ audio đang chạy để lấy thời lượng thực tế
        var audioEl = document.querySelector('audio');
        if (audioEl && !audioEl.paused && audioEl.duration && !isNaN(audioEl.duration) && audioEl.duration > 60) {
          var remainAudio = Math.max(0, Math.ceil(audioEl.duration - audioEl.currentTime));
          var targetSec = remainAudio + 120; // Thời gian còn lại của Audio + 2 phút check đáp án

          // Chỉ cập nhật vào biến số đếm giờ gốc nếu chênh lệch > 3 giây (để bộ đếm gốc tự chạy mượt, không bao giờ nháy)
          if (typeof remainingSeconds !== 'undefined' && Math.abs(remainingSeconds - targetSec) > 3) {
            remainingSeconds = targetSec;
          } else if (typeof timeLeft !== 'undefined' && Math.abs(timeLeft - targetSec) > 3) {
            timeLeft = targetSec;
          } else if (typeof examSecondsLeft !== 'undefined' && Math.abs(examSecondsLeft - targetSec) > 3) {
            examSecondsLeft = targetSec;
          }
        }
      }, 1000);
    })();