/**
 * 티니핑 미니게임 T2: 새콤달콤 마법 파르페 만들기 (tp-parfait.js)
 * - 6~7세 맞춤 실패 없는 3단계 간식 꾸미기 & 먹여주기 힐링 놀이
 * - 1단계(크림) ➔ 2단계(과일·과자) ➔ 3단계(마법 토핑) ➔ 🥄 냠냠 먹여주기! (총 3그릇)
 */
(function (global) {
  'use strict';

  var PARFAIT_STEPS = [
    {
      stepIndex: 0,
      title: '1단계 — 폭신폭신 크림 고르기',
      badge: 'STEP 1 · 크림 층',
      options: [
        { idx: 0, icon: '🍓', label: '🍓 핑크 딸기크림', name: '핑크 딸기크림', color: '#FF80AB', gradient: 'linear-gradient(180deg, #FFACC7 0%, #F06292 100%)' },
        { idx: 1, icon: '🍋', label: '🍋 노랑 레몬크림', name: '노랑 레몬크림', color: '#FFD54F', gradient: 'linear-gradient(180deg, #FFF176 0%, #FFD54F 100%)' },
        { idx: 2, icon: '🫐', label: '🫐 파랑 소다크림', name: '파랑 소다크림', color: '#4FC3F7', gradient: 'linear-gradient(180deg, #81D4FA 0%, #29B6F6 100%)' },
        { idx: 3, icon: '🍇', label: '🍇 보라 포도크림', name: '보라 포도크림', color: '#BA68C8', gradient: 'linear-gradient(180deg, #CE93D8 0%, #AB47BC 100%)' }
      ]
    },
    {
      stepIndex: 1,
      title: '2단계 — 달콤달콤 과일·과자 올리기',
      badge: 'STEP 2 · 과일·과자 층',
      options: [
        { idx: 0, icon: '🍒', label: '🍒 체리&딸기', name: '체리&딸기', color: '#EF5350', gradient: 'linear-gradient(180deg, #FF8A80 0%, #E53935 100%)' },
        { idx: 1, icon: '🍪', label: '🍪 마카롱&쿠키', name: '마카롱&쿠키', color: '#FFB74D', gradient: 'linear-gradient(180deg, #FFE082 0%, #FFA726 100%)' },
        { idx: 2, icon: '🍑', label: '🍑 복숭아&젤리', name: '복숭아&젤리', color: '#FF8A65', gradient: 'linear-gradient(180deg, #FFAB91 0%, #FF7043 100%)' },
        { idx: 3, icon: '🍫', label: '🍫 초코&바나나', name: '초코&바나나', color: '#8D6E63', gradient: 'linear-gradient(180deg, #BCAAA4 0%, #795548 100%)' }
      ]
    },
    {
      stepIndex: 2,
      title: '3단계 — 샤랄라 마법 토핑 꾸미기',
      badge: 'STEP 3 · 마법 토핑 층',
      options: [
        { idx: 0, icon: '💖', label: '💖 사랑 하트보석', name: '사랑 하트보석', color: '#EC407A', gradient: 'linear-gradient(180deg, #F48FB1 0%, #D81B60 100%)' },
        { idx: 1, icon: '👑', label: '👑 로열 황금왕관', name: '로열 황금왕관', color: '#FFCA28', gradient: 'linear-gradient(180deg, #FFF59D 0%, #FFB300 100%)' },
        { idx: 2, icon: '⭐', label: '⭐ 슈팅스타 별사탕', name: '슈팅스타 별사탕', color: '#26C6DA', gradient: 'linear-gradient(180deg, #80DEEA 0%, #00ACC1 100%)' },
        { idx: 3, icon: '💎', label: '💎 반짝 크리스탈', name: '반짝 크리스탈', color: '#7E57C2', gradient: 'linear-gradient(180deg, #B39DDB 0%, #5E35B1 100%)' }
      ]
    }
  ];

  var RECOMMENDED_PRESETS = [
    [0, 0, 0],
    [1, 0, 1],
    [2, 1, 0]
  ];

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function buildParfaitStyles() {
    return [
      '.tp-parfait-wrap {',
      '  position: relative; width: 100%; max-width: 680px; margin: 0 auto;',
      '  display: flex; flex-direction: column; gap: 10px;',
      '  font-family: "Pretendard", "Malgun Gothic", sans-serif; user-select: none;',
      '}',
      '.tp-parfait-hud {',
      '  display: flex; align-items: center; justify-content: space-between; gap: 8px;',
      '  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(252, 228, 236, 0.94) 100%);',
      '  border: 3px solid #F48FB1;',
      '  border-radius: 18px; padding: 8px 14px; box-shadow: 0 4px 0 rgba(236, 64, 122, 0.2), 0 6px 14px rgba(171, 71, 188, 0.14);',
      '}',
      '.tp-parfait-bowls { font-size: 1.15rem; font-weight: 800; color: #7B1FA2; }',
      '.tp-parfait-score { font-size: 1.05rem; font-weight: 900; color: #AD1457; }',
      '.tp-parfait-table {',
      '  position: relative; overflow: hidden;',
      '  display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 12px; align-items: center;',
      '  background: radial-gradient(circle at 75% 45%, rgba(255, 255, 255, 0.88) 0%, rgba(255, 240, 245, 0.5) 55%, rgba(243, 229, 245, 0.95) 100%);',
      '  border: 3px solid #E1BEE7; border-radius: 22px; padding: 24px 14px 14px;',
      '  box-shadow: inset 0 0 18px rgba(255, 255, 255, 0.88), 0 8px 18px rgba(171, 71, 188, 0.16);',
      '}',
      '.tp-parfait-table::before {',
      '  content: ""; position: absolute; top: 0; left: 0; right: 0; height: 14px; z-index: 2; pointer-events: none;',
      '  background: repeating-linear-gradient(90deg, #FF80AB 0px, #FF80AB 22px, #FFFFFF 22px, #FFFFFF 44px);',
      '  border-bottom: 2.5px solid #F06292;',
      '  box-shadow: 0 3px 8px rgba(236, 64, 122, 0.24);',
      '}',
      '.tp-parfait-guest {',
      '  display: flex; flex-direction: column; align-items: center; gap: 8px; position: relative; z-index: 3;',
      '}',
      '.tp-parfait-avatar-wrap {',
      '  position: relative; width: 92px; height: 92px; border-radius: 50%; border: 4px solid #FFFFFF;',
      '  box-shadow: 0 6px 16px rgba(171, 71, 188, 0.32), 0 0 0 2px #F48FB1; overflow: visible;',
      '  display: flex; align-items: center; justify-content: center; background: #FF80AB;',
      '  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);',
      '}',
      '.tp-parfait-avatar-wrap.is-happy-jump { transform: translateY(-14px) scale(1.1); }',
      '.tp-parfait-avatar-inner {',
      '  width: 100%; height: 100%; border-radius: 50%; overflow: hidden;',
      '  display: flex; align-items: center; justify-content: center; color: #FFF; font-size: 2rem; font-weight: 900;',
      '}',
      '.tp-parfait-avatar-inner img { width: 100%; height: 100%; object-fit: cover; display: block; }',
      '.tp-parfait-blush {',
      '  position: absolute; bottom: 18px; width: 18px; height: 10px; border-radius: 50%;',
      '  background: rgba(255, 23, 68, 0.55); filter: blur(1px); opacity: 0; transition: opacity 0.2s ease;',
      '}',
      '.tp-parfait-blush.left { left: 10px; }',
      '.tp-parfait-blush.right { right: 10px; }',
      '.tp-parfait-avatar-wrap.is-happy-jump .tp-parfait-blush { opacity: 1; }',
      '.tp-parfait-order-bubble {',
      '  background: #FFFFFF; border: 2.5px solid #CE93D8; border-radius: 16px; padding: 10px 12px;',
      '  text-align: center; font-size: 0.88rem; font-weight: 800; color: #4A148C; width: 100%; box-sizing: border-box;',
      '  min-height: 82px; display: flex; flex-direction: column; align-items: center; justify-content: center;',
      '  box-shadow: 0 4px 10px rgba(171, 71, 188, 0.12);',
      '}',
      '.tp-parfait-recommend-row {',
      '  margin-top: 6px; display: inline-flex; align-items: center; gap: 6px;',
      '  background: #FCE4EC; border: 1.5px solid #F8BBD0; padding: 4px 10px; border-radius: 999px; font-size: 0.82rem; color: #C2185B;',
      '}',
      '.tp-parfait-cup-area {',
      '  display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative;',
      '  min-height: 204px; z-index: 3;',
      '}',
      '.parfait-cup {',
      '  width: 132px; height: 158px; min-height: 158px; max-height: 158px; border: 4px solid rgba(255, 255, 255, 0.96);',
      '  border-top-width: 2.5px; border-radius: 18px 18px 48px 48px; box-sizing: border-box;',
      '  background: linear-gradient(135deg, rgba(255,255,255,0.68) 0%, rgba(225,245,254,0.48) 55%, rgba(248,187,208,0.42) 100%);',
      '  box-shadow: inset 0 0 14px rgba(255,255,255,0.95), inset -6px 0 12px rgba(186,104,200,0.18), 0 8px 18px rgba(142, 36, 170, 0.24);',
      '  display: flex; flex-direction: column-reverse; justify-content: flex-start; overflow: hidden;',
      '  padding: 6px; gap: 4px; cursor: pointer; position: relative; z-index: 2;',
      '}',
      '.parfait-cup::after {',
      '  content: ""; position: absolute; top: 8px; left: 9px; bottom: 20px; width: 11px;',
      '  border-radius: 999px; background: linear-gradient(180deg, rgba(255,255,255,0.78) 0%, rgba(255,255,255,0.12) 100%);',
      '  pointer-events: none; z-index: 4;',
      '}',
      '.parfait-cup-stem {',
      '  width: 22px; height: 22px; background: linear-gradient(90deg, rgba(255,255,255,0.96) 0%, #F3E5F5 60%, rgba(255,255,255,0.9) 100%);',
      '  border: 2px solid #E1BEE7; margin-top: -2px; z-index: 2;',
      '}',
      '.parfait-cup-base {',
      '  width: 78px; height: 12px; border-radius: 999px;',
      '  background: linear-gradient(180deg, #FFFFFF 0%, #F3E5F5 100%); border: 2px solid #E1BEE7;',
      '  box-shadow: 0 3px 6px rgba(142, 36, 170, 0.18); z-index: 2;',
      '}',
      '.parfait-doily-coaster {',
      '  width: 118px; height: 22px; margin-top: -9px; border-radius: 50%;',
      '  background: radial-gradient(ellipse at center, #FFFFFF 0%, #FFF8FB 68%, rgba(255,255,255,0.85) 100%);',
      '  border: 3px dotted #F48FB1;',
      '  box-shadow: 0 4px 10px rgba(171, 71, 188, 0.18), inset 0 0 0 2px #FCE4EC;',
      '  pointer-events: none; z-index: 1;',
      '}',
      '.parfait-layer {',
      '  position: relative; width: 100%; height: 42px; min-height: 42px; max-height: 42px; flex-shrink: 0;',
      '  border-radius: 16px 16px 12px 12px; display: flex; align-items: center; justify-content: center;',
      '  gap: 4px; color: #FFFFFF; font-weight: 900; font-size: 0.84rem; text-shadow: 0 1px 2px rgba(0,0,0,0.28);',
      '  box-shadow: inset 0 5px 8px rgba(255,255,255,0.68), inset 0 -3px 6px rgba(0,0,0,0.14);',
      '  animation: tpParfaitPop 0.26s ease-out; overflow: hidden;',
      '}',
      '.parfait-layer::before {',
      '  content: ""; position: absolute; top: 0; left: 6px; right: 6px; height: 6px;',
      '  border-radius: 999px; background: rgba(255, 255, 255, 0.48); pointer-events: none;',
      '}',
      '@keyframes tpParfaitPop {',
      '  0% { transform: scale(0.6) translateY(-16px); opacity: 0.3; }',
      '  80% { transform: scale(1.06) translateY(0); opacity: 1; }',
      '  100% { transform: scale(1); opacity: 1; }',
      '}',
      '.tp-parfait-spoon {',
      '  position: absolute; top: 8px; right: 12px; font-size: 2rem; pointer-events: none;',
      '  transition: transform 0.35s ease; opacity: 0; z-index: 5;',
      '}',
      '.tp-parfait-spoon.is-flying { opacity: 1; transform: translate(-110px, -25px) rotate(-25deg) scale(1.2); }',
      '.tp-parfait-kitchen {',
      '  background: linear-gradient(180deg, #FFFFFF 0%, #FFF9FB 100%);',
      '  border: 3px solid #F48FB1; border-radius: 22px; padding: 12px 14px;',
      '  box-shadow: 0 6px 0 rgba(244, 143, 177, 0.35), 0 8px 16px rgba(236, 64, 122, 0.12);',
      '  min-height: 164px; box-sizing: border-box;',
      '}',
      '.tp-parfait-step-title {',
      '  font-size: 1rem; font-weight: 900; color: #AD1457; margin-bottom: 10px; text-align: center;',
      '  min-height: 24px;',
      '}',
      '.tp-parfait-action-zone {',
      '  min-height: 112px; display: flex; align-items: center; justify-content: center; width: 100%;',
      '}',
      '.tp-parfait-grid {',
      '  display: grid; grid-template-columns: 1fr 1fr; gap: 10px; width: 100%;',
      '}',
      '.tp-parfait-ing-btn {',
      '  display: flex; align-items: center; justify-content: center; gap: 8px;',
      '  min-height: 48px; padding: 11px 10px; border-radius: 16px; border: 2.5px solid #F8BBD0;',
      '  background: linear-gradient(180deg, #FFF9FB 0%, #FCE4EC 100%);',
      '  color: #880E4F; font-family: inherit; font-weight: 900; font-size: 1rem; cursor: pointer;',
      '  box-shadow: 0 4px 0 #F48FB1, inset 0 2px 0 #FFFFFF; transition: transform 0.1s ease; touch-action: manipulation;',
      '}',
      '.tp-parfait-ing-btn.is-recommended {',
      '  border-color: #FFB300; background: linear-gradient(180deg, #FFFDE7 0%, #FFF8E1 100%);',
      '  box-shadow: 0 4px 0 #FFA000, 0 0 12px rgba(255, 193, 7, 0.35), inset 0 2px 0 #FFFFFF;',
      '}',
      '.tp-parfait-ing-btn:active { transform: translateY(2px); }',
      '.parfait-feed-btn {',
      '  width: 100%; min-height: 104px; padding: 16px 14px; border-radius: 18px; border: 3px solid #FFF59D;',
      '  background: linear-gradient(135deg, #FF4081 0%, #AB47BC 100%); color: #FFFFFF;',
      '  font-family: inherit; font-weight: 900; font-size: 1.2rem; cursor: pointer;',
      '  box-shadow: 0 6px 0 #7B1FA2, 0 8px 20px rgba(236, 64, 122, 0.35); touch-action: manipulation;',
      '}'
    ].join('\n');
  }

  var gameDef = {
    id: 'parfait',
    title: '새콤달콤 마법 파르페',
    subtitle: '티니핑 친구에게 맛있는 간식을 만들어줘요!',
    icon: '🍰',
    badgeColor: '#AB47BC',

    mount: function (stageEl, charCtx, helpers) {
      if (!stageEl) {
        return function () {};
      }

      var ctxChar = Object.assign({
        name: '하츄핑',
        nameEn: 'Heartsping',
        image: '',
        color: '#FF69B4',
        grade: '로열',
        emotion: '사랑',
        gender: '여',
        mainSeason: 1,
        seasonTheme: '샤랄라 하트',
        seasonEmoji: '🍓',
        pool: []
      }, charCtx || {});

      var safeHelpers = Object.assign({
        playSfx: function () {},
        playCry: function () {},
        computeRunTransform: function () { return {}; },
        getHighScore: function () { return 0; },
        saveHighScore: function () {},
        rewardCharacter: function () {},
        createHeartExplosion: function () {},
        renderAvatarHtml: null,
        showResultOverlay: function () {}
      }, helpers || {});

      var highScore = Number(safeHelpers.getHighScore('parfait')) || 0;
      var score = 0;
      var step = 0;
      var bowlsCompleted = 0;
      var maxBowls = 3;
      var selectedLayers = [];
      var lastPraise = '';
      var isCompleted = false;
      var isCleanedUp = false;
      var animTimers = [];

      function getRecommendedIndicesForBowl(bowlIdx) {
        var preset = RECOMMENDED_PRESETS[bowlIdx % RECOMMENDED_PRESETS.length];
        return preset.slice();
      }

      var recommendedIndices = getRecommendedIndicesForBowl(0);

      function getRecommendedIcons() {
        return [
          PARFAIT_STEPS[0].options[recommendedIndices[0]].icon,
          PARFAIT_STEPS[1].options[recommendedIndices[1]].icon,
          PARFAIT_STEPS[2].options[recommendedIndices[2]].icon
        ];
      }

      var initialChar = escapeHtml((ctxChar.name || '핑').charAt(0));
      var heroColor = escapeHtml(ctxChar.color || '#FF69B4');
      var avatarHtml = ctxChar.image
        ? '<img src="' + escapeHtml(ctxChar.image) + '" alt="' + escapeHtml(ctxChar.name) + '" onerror="this.style.display=\'none\';if(this.nextElementSibling)this.nextElementSibling.style.display=\'flex\';" />' +
          '<span style="display:none;width:100%;height:100%;align-items:center;justify-content:center;background:' + heroColor + ';">' + initialChar + '</span>'
        : '<span style="display:flex;width:100%;height:100%;align-items:center;justify-content:center;background:' + heroColor + ';">' + initialChar + '</span>';

      stageEl.innerHTML = [
        '<style class="tp-parfait-style">' + buildParfaitStyles() + '</style>',
        '<div class="tp-parfait-wrap" data-game="parfait">',
        '  <div class="tp-parfait-hud">',
        '    <div class="tp-parfait-bowls" aria-label="파르페 그릇 진행도">🍨 파르페 1 / 3 그릇</div>',
        '    <div class="tp-parfait-score">💖 0점 <small style="font-size:0.78rem;color:#7B1FA2;">(최고 ' + highScore + '점)</small></div>',
        '  </div>',
        '  <div class="tp-parfait-table">',
        '    <div class="tp-parfait-guest">',
        '      <div class="tp-parfait-avatar-wrap" style="background:' + heroColor + ';">',
        '        <div class="tp-parfait-avatar-inner">' + avatarHtml + '</div>',
        '        <span class="tp-parfait-blush left"></span>',
        '        <span class="tp-parfait-blush right"></span>',
        '      </div>',
        '      <div class="tp-parfait-order-bubble"></div>',
        '    </div>',
        '    <div class="tp-parfait-cup-area">',
        '      <span class="tp-parfait-spoon">🥄</span>',
        '      <div class="parfait-cup" title="파르페 컵"></div>',
        '      <div class="parfait-cup-stem"></div>',
        '      <div class="parfait-cup-base"></div>',
        '      <div class="parfait-doily-coaster" aria-hidden="true"></div>',
        '    </div>',
        '  </div>',
        '  <div class="tp-parfait-kitchen">',
        '    <div class="tp-parfait-step-title"></div>',
        '    <div class="tp-parfait-action-zone"></div>',
        '  </div>',
        '</div>'
      ].join('\n');

      var bowlsEl = stageEl.querySelector('.tp-parfait-bowls');
      var scoreEl = stageEl.querySelector('.tp-parfait-score');
      var avatarWrapEl = stageEl.querySelector('.tp-parfait-avatar-wrap');
      var orderBubbleEl = stageEl.querySelector('.tp-parfait-order-bubble');
      var cupEl = stageEl.querySelector('.parfait-cup');
      var spoonEl = stageEl.querySelector('.tp-parfait-spoon');
      var stepTitleEl = stageEl.querySelector('.tp-parfait-step-title');
      var actionZoneEl = stageEl.querySelector('.tp-parfait-action-zone');

      function renderOrderBubble(customPraise) {
        if (!orderBubbleEl) return;
        var recIcons = getRecommendedIcons();
        var orderLine = '내 기분은 [' + escapeHtml(ctxChar.emotion) + ']! 반짝반짝 [' + escapeHtml(ctxChar.seasonTheme) + '] 파르페를 만들어줘~ 츄! 💖';
        var praiseHtml = customPraise
          ? '<div class="tp-parfait-praise" style="color:#D81B60;margin-bottom:4px;font-weight:900;">' + escapeHtml(customPraise) + '</div>'
          : '';
        orderBubbleEl.innerHTML =
          praiseHtml +
          '<div>' + orderLine + '</div>' +
          '<div class="tp-parfait-recommend-row">✨ 추천 재료: <strong>' + recIcons.join(' ') + '</strong></div>';
      }

      function renderCupLayers() {
        if (!cupEl) return;
        if (selectedLayers.length === 0) {
          cupEl.innerHTML = '<div style="margin:auto;color:#9C27B0;font-size:0.78rem;font-weight:800;text-align:center;opacity:0.75;">재료를 골라<br/>층층이 쌓아줘요!</div>';
          return;
        }
        var html = '';
        for (var i = 0; i < selectedLayers.length; i++) {
          var layer = selectedLayers[i];
          html += '<div class="parfait-layer layer-step-' + (i + 1) + '" style="background:' + layer.gradient + ';">' +
            '<span>' + layer.icon + '</span><span>' + escapeHtml(layer.name) + '</span>' +
            '</div>';
        }
        cupEl.innerHTML = html;
      }

      function renderHud() {
        if (bowlsEl) {
          var currentDisplayBowl = Math.min(maxBowls, bowlsCompleted + 1);
          bowlsEl.textContent = '🍨 파르페 ' + (isCompleted ? maxBowls : currentDisplayBowl) + ' / ' + maxBowls + ' 그릇 (완성 ' + bowlsCompleted + '개)';
        }
        if (scoreEl) {
          var best = Math.max(highScore, score);
          scoreEl.innerHTML = '💖 ' + score + '점 <small style="font-size:0.78rem;color:#7B1FA2;">(최고 ' + best + '점)</small>';
        }
      }

      function renderKitchen() {
        if (!stepTitleEl || !actionZoneEl) return;

        if (step < 3) {
          var stepDef = PARFAIT_STEPS[step];
          var recIdx = recommendedIndices[step];
          stepTitleEl.textContent = stepDef.title;

          var btnsHtml = '<div class="tp-parfait-grid">';
          for (var i = 0; i < stepDef.options.length; i++) {
            var opt = stepDef.options[i];
            var isRec = (i === recIdx);
            btnsHtml +=
              '<button type="button" class="tp-parfait-ing-btn' + (isRec ? ' is-recommended' : '') + '" data-ing-idx="' + i + '">' +
              '<span>' + escapeHtml(opt.label) + '</span>' +
              (isRec ? '<small style="color:#E65100;font-weight:900;">✨추천</small>' : '') +
              '</button>';
          }
          btnsHtml += '</div>';
          actionZoneEl.innerHTML = btnsHtml;

          var ingBtns = actionZoneEl.querySelectorAll('.tp-parfait-ing-btn');
          for (var b = 0; b < ingBtns.length; b++) {
            (function (btnIdx) {
              ingBtns[btnIdx].addEventListener('click', function () {
                selectIngredient(btnIdx);
              });
            })(b);
          }
        } else {
          stepTitleEl.textContent = '✨ 샤랄라 파르페 완성! 티니핑에게 먹여줄 시간이에요!';
          actionZoneEl.innerHTML =
            '<button type="button" class="parfait-feed-btn">' +
            '🥄 티니핑에게 냠냠 먹여주기!' +
            '</button>';
          var feedBtn = actionZoneEl.querySelector('.parfait-feed-btn');
          if (feedBtn && feedBtn.addEventListener) {
            feedBtn.addEventListener('click', function () {
              feedTiniping();
            });
          }
        }
      }

      function selectIngredient(idx) {
        if (isCompleted || isCleanedUp) return false;
        if (step >= 3) return false;

        var normalizedIdx = Number(idx);
        if (isNaN(normalizedIdx) || normalizedIdx < 0 || normalizedIdx > 3) {
          normalizedIdx = 0;
        }

        var stepDef = PARFAIT_STEPS[step];
        var chosen = stepDef.options[normalizedIdx];
        var isRecommended = (normalizedIdx === recommendedIndices[step]);

        selectedLayers.push({
          step: step,
          idx: normalizedIdx,
          icon: chosen.icon,
          label: chosen.label,
          name: chosen.name,
          color: chosen.color,
          gradient: chosen.gradient,
          isRecommended: isRecommended
        });

        step += 1;
        safeHelpers.playSfx('pop', step);

        renderCupLayers();
        renderKitchen();
        renderHud();
        return true;
      }

      function feedTiniping() {
        if (isCompleted || isCleanedUp) return false;

        // 만약 아직 3단계가 다 채워지지 않았더라도 빈 단계를 기본 재료(0번)로 채워 안전하게 처리
        while (selectedLayers.length < 3) {
          var s = selectedLayers.length;
          var fallbackOpt = PARFAIT_STEPS[s].options[0];
          selectedLayers.push({
            step: s,
            idx: 0,
            icon: fallbackOpt.icon,
            label: fallbackOpt.label,
            name: fallbackOpt.name,
            color: fallbackOpt.color,
            gradient: fallbackOpt.gradient,
            isRecommended: (recommendedIndices[s] === 0)
          });
        }

        var matchedRecommended = false;
        for (var i = 0; i < selectedLayers.length; i++) {
          if (selectedLayers[i].isRecommended) {
            matchedRecommended = true;
            break;
          }
        }

        var earnedPoints = matchedRecommended ? 120 : 100;
        var praiseMessage = matchedRecommended
          ? '😍 우와아~! 내가 제일 좋아하는 맛이야! 최고최고~ (+120점)'
          : '😋 냠냠! 세상에 하나뿐인 특별한 파르페네! 고마워~ (+100점)';

        score += earnedPoints;
        bowlsCompleted += 1;
        lastPraise = praiseMessage;

        safeHelpers.playSfx('fanfare', bowlsCompleted);
        safeHelpers.createHeartExplosion(320, 110);

        if (spoonEl && spoonEl.classList) {
          spoonEl.classList.add('is-flying');
        }
        if (avatarWrapEl && avatarWrapEl.classList) {
          avatarWrapEl.classList.add('is-happy-jump');
        }

        var tId = setTimeout(function () {
          if (isCleanedUp) return;
          if (spoonEl && spoonEl.classList) {
            spoonEl.classList.remove('is-flying');
          }
          if (avatarWrapEl && avatarWrapEl.classList) {
            avatarWrapEl.classList.remove('is-happy-jump');
          }
        }, 420);
        animTimers.push(tId);

        if (bowlsCompleted >= maxBowls) {
          isCompleted = true;
          var best = Math.max(highScore, score);
          highScore = best;
          renderOrderBubble(praiseMessage);
          renderHud();
          safeHelpers.saveHighScore('parfait', score);
          safeHelpers.rewardCharacter();
          safeHelpers.showResultOverlay(stageEl, {
            gameId: 'parfait',
            title: '새콤달콤 마법 파르페 3그릇 완성!',
            score: score,
            highScore: best,
            charCtx: ctxChar,
            message: ctxChar.name + ' 친구가 파르페 3그릇을 맛있게 먹고 행복해졌어요! 💖'
          });
          return true;
        }

        // 다음 그릇 준비 (동기적으로 리셋하여 연속 호출 및 UI 모두 즉시 대응)
        step = 0;
        selectedLayers = [];
        recommendedIndices = getRecommendedIndicesForBowl(bowlsCompleted);

        renderOrderBubble(praiseMessage);
        renderCupLayers();
        renderKitchen();
        renderHud();
        return true;
      }

      function onCupClick() {
        if (step >= 3 && !isCompleted && !isCleanedUp) {
          feedTiniping();
        }
      }

      if (cupEl && cupEl.addEventListener) {
        cupEl.addEventListener('click', onCupClick);
      }

      function getState() {
        return {
          score: score,
          highScore: Math.max(highScore, score),
          step: step,
          currentStep: step,
          bowlsCompleted: bowlsCompleted,
          bowlCount: bowlsCompleted,
          completedBowls: bowlsCompleted,
          maxBowls: maxBowls,
          selectedLayers: selectedLayers.slice(),
          layers: selectedLayers.slice(),
          recommended: getRecommendedIcons(),
          lastPraise: lastPraise,
          isCompleted: isCompleted,
          isCleanedUp: isCleanedUp
        };
      }

      // 테스트용 훅 노출
      stageEl._parfaitGame = {
        selectIngredient: selectIngredient,
        feedTiniping: feedTiniping,
        getState: getState
      };
      stageEl._tpGameInstance = stageEl._parfaitGame;

      renderOrderBubble('');
      renderCupLayers();
      renderKitchen();
      renderHud();

      return function cleanup() {
        isCleanedUp = true;
        for (var i = 0; i < animTimers.length; i++) {
          clearTimeout(animTimers[i]);
        }
        animTimers = [];
        if (cupEl && cupEl.removeEventListener) {
          cupEl.removeEventListener('click', onCupClick);
        }
      };
    }
  };

  if (global.TpMiniGames && typeof global.TpMiniGames.register === 'function') {
    global.TpMiniGames.register(gameDef.id, gameDef);
  }
  global.TpGameParfait = gameDef;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = gameDef;
  }
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
