/**
 * Карточки главной — слои как в Figma: фон · текст · экран(ы).
 * Слои: scripts/cards-layers.js (генерируется build-card-layers.mjs)
 */
(function () {
  'use strict';

  var PERSONAL_CARDS = [
    {
      href: 'https://omonete.ru',
      title: 'О монете',
      accent: '#ffffff',
      desc: 'Каталог российских и иностранных монет с личным кабинетом, историей монетных дворов и графиками стоимости металлов',
      descLight: true,
      mac: true,
      preview: 'images/home-v2/personal-01.png'
    },
    {
      href: 'https://nezhnik.com/color/',
      title: 'Какой цвет отличается?',
      titleParts: [
        { text: 'Какой ', color: '#bd47b9' },
        { text: 'цв', color: '#bd47b9' },
        { text: 'е', color: '#474fbd' },
        { text: 'т', color: '#bd47b9' },
        { text: ' отличается?', color: '#bd47b9' }
      ],
      accent: '#bd47b9',
      desc: 'Браузерная игра на цветовосприятие с настройками уровня сложности и таблицей лидеров',
      descLight: false,
      mac: true,
      preview: 'images/home-v2/personal-02.png'
    },
    {
      href: 'https://www.figma.com/community/plugin/1518640289187057362',
      title: 'Basketball Game!',
      accent: '#11111b',
      desc: 'Figma плагин-игра в баскетбол с подсчетом очков и сохранением статистики',
      descLight: false,
      mac: true,
      preview: 'images/home-v2/personal-03.png'
    },
    {
      href: 'https://nezhnik.com/symbols/',
      title: 'Символы',
      accent: '#ffffff',
      desc: 'Сервис с символами для интерфейсов, презентаций и идей',
      descLight: true,
      mac: true,
      preview: 'images/home-v2/personal-04.png'
    }
  ];

  var WORK_CARDS = [
    { href: 'https://nezhnik.com/raf-identic', title: 'Райффайзен банк', accent: '#ffe600', desc: 'Айдентика и визуальный стиль Рафа — основного ИИ‑ассистента для всех сотрудников', descLight: true, mac: true, preview: 'images/home-v2/work-01.png', comingSoon: true },
    { href: 'https://nezhnik.com/raf', title: 'Райффайзен банк', accent: '#ffe600', desc: 'Веб-интерфейс и мобильное приложение Рафа — основного ИИ‑ассистента для всех сотрудников', descLight: false, phone: true, mac: true, preview: 'images/home-v2/work-02.png', comingSoon: true },
    { href: 'https://nezhnik.com/onesearch', title: 'Райффайзен банк', accent: '#ffe600', desc: 'Редизайн и проектирование единого решения поиска для основных порталов банка — «Инсайдер» и «Сервис-деск»', descLight: true, mac: true, preview: 'images/home-v2/work-03.png', comingSoon: true },
    { href: 'https://nezhnik.com/servicedesk', title: 'Райффайзен банк', accent: '#ffe600', desc: 'Редизайн портала «Сервис-деск» — сервиса решения рабочих вопросов всех сотрудников и обращений клиентов банка', descLight: true, mac: true, preview: 'images/home-v2/work-04.png', comingSoon: true },
    { href: 'https://nezhnik.com/sberpravo', title: 'Сбер Право', titleParts: [{ text: 'Сбер ', color: '#2a9f3f' }, { text: 'Право', color: '#2c9ce6' }], accent: '#2c9ce6', desc: 'Редизайн юридического сервиса «LegalBPM» — системы менеджмента бизнес-процессов правовых запросов и судебной работы Сбера', descLight: false, mac: true, preview: 'images/home-v2/work-05.png' },
    { href: 'https://nezhnik.com/sberpravo', title: 'Сбер Право', titleParts: [{ text: 'Сбер ', color: '#2a9f3f' }, { text: 'Право', color: '#2c9ce6' }], accent: '#2c9ce6', desc: 'Каталог услуг и набор 3D-иллюстраций для юридического сервиса Сбера', descLight: true, phone: true, mac: true, preview: 'images/home-v2/work-06.png' },
    { href: 'https://nezhnik.com/csclick', title: 'Сбер', accent: '#2a9f3f', desc: 'Сервис заказа товаров «CS-Клик» для всех сотрудников и партнеров Сбера', descLight: false, phone: true, mac: true, preview: 'images/home-v2/work-07.png' },
    { href: 'https://nezhnik.com/csradar', title: 'Сбер', accent: '#2a9f3f', desc: 'Личные кабинеты логистов и операторов для логистической платформы «CS Radar»', descLight: false, phone: true, mac: true, preview: 'images/home-v2/work-08.png' },
    { href: 'https://nezhnik.com/crafter', title: 'Crafter', accent: '#fd7350', desc: 'Личные кабинеты логистов и перевозчиков для логистической компании', descLight: true, phone: true, mac: true, preview: 'images/home-v2/work-09.png' },
    { href: 'https://nezhnik.com/zesklad', title: 'ZeСклад', titleParts: [{ text: 'Ze', color: '#41e6db' }, { text: 'Склад', color: '#292932' }], accent: '#41e6db', desc: 'Личный кабинет и сайт для сервиса хранения вещей', descLight: true, phone: true, mac: true, preview: 'images/home-v2/work-10.png' },
    { href: 'https://nezhnik.com/smarthome', title: 'Smart home', accent: '#2969df', desc: 'Концепция приложения умного дома', descLight: true, phone: true, mac: false, preview: 'images/home-v2/work-11.png' },
    { href: 'https://nezhnik.com/sibpromstroy', title: 'Сибпромстрой', accent: '#1077e0', desc: 'Редизайн сайта для строительной компании', descLight: false, mac: true, preview: 'images/home-v2/work-12.png' },
    { href: 'https://nezhnik.com/designconference', title: 'Design Conference', titleGradient: true, accent: '#ffffff', desc: 'Лендинг для дизайн-конференции', descLight: true, mac: true, preview: 'images/home-v2/work-13.png' },
    { href: 'https://nezhnik.com/glavpivmag', title: 'ГлавПивМаг', accent: '#f2cb82', desc: 'Главная страница и каталог для магазина крафтового пива', descLight: true, mac: true, preview: 'images/home-v2/work-14.png' }
  ];

  function inferCardMobileSrc(src) {
    if (!src) return null;
    if (/_desktop\.png$/.test(src)) {
      return src.replace(/_desktop\.png$/, '_card-mobile.png');
    }
    if (/\.png$/.test(src)) {
      return src.replace(/\.png$/, '_card-mobile.png');
    }
    return null;
  }

  function getCardMobileSrc(box) {
    if (box && box.srcMobile) return box.srcMobile;
    if (box && box.srcCardMobile) return box.srcCardMobile;
    return inferCardMobileSrc(box && box.src);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function cardClasses(card) {
    var list = ['home-v2-project-card'];
    if (card.phone) list.push('home-v2-project-card--has-phone');
    if (card.phone && !card.mac) list.push('home-v2-project-card--phone-only');
    return list.join(' ');
  }

  function boxStyle(box) {
    return (
      'left:' + box.left + '%;' +
      'top:' + box.top + '%;' +
      'width:' + box.width + '%;' +
      'height:' + box.height + '%'
    );
  }

  function normalizeBgSize(size) {
    return size.split(' ').map(function (part) {
      var n = parseFloat(part);
      return Math.abs(n).toFixed(4) + '%';
    }).join(' ');
  }

  function imgUrl(path) {
    return (window.siteImageUrl || function (p) { return p; })(path);
  }

  function renderBgLayer(layer) {
    if (layer.type === 'solid') {
      return '<span class="home-v2-project-card__bg-layer" style="background:' + escapeHtml(layer.color) + '"></span>';
    }

    var flipX = parseFloat(layer.size) < 0;
    var style =
      'background-image:url(' + escapeHtml(imgUrl(layer.src)) + ');' +
      'background-size:' + normalizeBgSize(layer.size) + ';' +
      'background-position:' + layer.position + ';' +
      (flipX ? 'transform:scaleX(-1);' : '');

    return '<span class="home-v2-project-card__bg-layer" style="' + style + '"></span>';
  }

  function renderBg(bg) {
    var layers = Array.isArray(bg) ? bg : [bg];
    return layers.map(renderBgLayer).join('');
  }

  function posterFromVideo(videoSrc) {
    return videoSrc.replace(/\.mp4$/i, '-poster.webp');
  }

  function renderScreenVideoStack(frameSrc, videoSrc, videoScreen, variant) {
    var frame = imgUrl(frameSrc);
    var poster = imgUrl(posterFromVideo(videoSrc));
    var radius = videoScreen.radiusTop != null ? videoScreen.radiusTop : 1.5;
    var aspect = videoScreen.aspect != null ? videoScreen.aspect : 2.1551;
    var screenStyle =
      boxStyle(videoScreen) +
      '--v2-screen-radius:' + radius + '%;';
    var fitStyle = '--v2-device-aspect:' + aspect + ';';
    var variantClass = variant ? ' home-v2-project-card__device-media-fit--' + variant : '';
    return (
      '<div class="home-v2-project-card__device-media-fit' + variantClass + '" style="' + fitStyle + '">' +
        '<div class="home-v2-project-card__device-screen" style="' + screenStyle + '">' +
          '<img class="home-v2-project-card__device-screen-poster" data-liquid-poster src="' + escapeHtml(poster) + '" alt="" crossorigin="anonymous" loading="eager"/>' +
          '<video class="home-v2-project-card__device-screen-video" data-liquid-ignore muted playsinline autoplay loop preload="auto">' +
            '<source src="' + escapeHtml(videoSrc) + '" type="video/mp4"/>' +
          '</video>' +
        '</div>' +
        '<img class="home-v2-project-card__device-frame" src="' + escapeHtml(frame) + '" alt="" crossorigin="anonymous" loading="lazy"/>' +
      '</div>'
    );
  }

  function renderDeviceImg(src, mobileSrc, videoSrc, videoScreen, videoScreenMobile) {
    if (videoSrc && videoScreen) {
      var hasMobileVideo = mobileSrc && videoScreenMobile;
      var mediaClass =
        'home-v2-project-card__device-media home-v2-project-card__device-media--screen-video' +
        (hasMobileVideo ? ' home-v2-project-card__device-media--screen-video-responsive' : '');
      var stacks = renderScreenVideoStack(src, videoSrc, videoScreen, hasMobileVideo ? 'web' : '');
      if (hasMobileVideo) {
        stacks += renderScreenVideoStack(mobileSrc, videoSrc, videoScreenMobile, 'mobile');
      }
      return '<div class="' + mediaClass + '">' + stacks + '</div>';
    }
    if (videoSrc) {
      var poster = imgUrl(posterFromVideo(videoSrc));
      return (
        '<img class="home-v2-project-card__device-poster" data-liquid-poster src="' + escapeHtml(poster) + '" alt="" crossorigin="anonymous" loading="eager"/>' +
        '<video class="home-v2-project-card__device-img home-v2-project-card__device-video" data-liquid-ignore muted playsinline autoplay loop preload="metadata">' +
          '<source src="' + escapeHtml(videoSrc) + '" type="video/mp4"/>' +
        '</video>'
      );
    }
    var desktop = imgUrl(src);
    var mobile = mobileSrc ? imgUrl(mobileSrc) : null;
    if (!mobile) {
      return '<img class="home-v2-project-card__device-img" src="' + escapeHtml(desktop) + '" alt="" crossorigin="anonymous" loading="lazy"/>';
    }
    return (
      '<picture>' +
        '<source media="(max-width: 991px)" srcset="' + escapeHtml(mobile) + '"/>' +
        '<img class="home-v2-project-card__device-img" src="' + escapeHtml(desktop) + '" alt="" crossorigin="anonymous" loading="lazy"/>' +
      '</picture>'
    );
  }

  function renderDevice(box, mobileSrc) {
    if (!box || !box.src) return '';
    var deviceClass = 'home-v2-project-card__device' + (mobileSrc ? ' home-v2-project-card__device--card-mobile' : '');
    if (box.video && box.videoScreen) {
      deviceClass += ' home-v2-project-card__device--screen-video';
    }
    return (
      '<div class="' + deviceClass + '" style="' + boxStyle(box) + '">' +
        renderDeviceImg(box.src, mobileSrc, box.video || null, box.videoScreen || null, box.videoScreenMobile || null) +
      '</div>'
    );
  }

  function renderDevices(layer, card) {
    var html = '';
    var webOnly = card.mac && !card.phone;
    var phoneOnly = card.phone && !card.mac;
    var macMobile = webOnly ? getCardMobileSrc(layer.mac) : null;
    if (layer.mac) html += renderDevice(layer.mac, macMobile);
    (layer.phones || []).forEach(function (phone) {
      var phoneMobile = phoneOnly ? getCardMobileSrc(phone) : null;
      html += renderDevice(phone, phoneMobile);
    });
    if (layer.mac && layer.phones && layer.phones.length) {
      return '<div class="home-v2-project-card__devices-group">' + html + '</div>';
    }
    if (phoneOnly && layer.phones && layer.phones.length) {
      return '<div class="home-v2-project-card__devices-group">' + html + '</div>';
    }
    return html;
  }

  function renderTitle(card) {
    if (card.titleParts && card.titleParts.length) {
      return card.titleParts.map(function (part) {
        return '<span style="color:' + escapeHtml(part.color) + '">' + escapeHtml(part.text) + '</span>';
      }).join('');
    }
    return escapeHtml(card.title);
  }

  function titleClassName(card) {
    var cls = 'home-v2-project-card__title';
    if (card.titleGradient) cls += ' home-v2-project-card__title--gradient';
    else if (card.titleParts) cls += ' home-v2-project-card__title--multi';
    return cls;
  }

  function renderCardHeading(card, comingSoon) {
    var title = '<h3 class="' + titleClassName(card) + '">' + renderTitle(card) + '</h3>';
    if (!comingSoon) return title;
    return (
      '<div class="home-v2-project-card__heading">' +
        title +
        '<span class="home-v2-project-card__chip">Будет позже</span>' +
      '</div>'
    );
  }

  function renderWorkCard(card, options) {
    var layer = card.layer;
    if (!layer) return '';
    var tone = card.descLight ? 'light' : 'dark';
    var text = layer.text;
    var comingSoon = !!card.comingSoon;
    var disabled = comingSoon || (options && options.disabled);
    var external = !disabled && /^https?:\/\//.test(card.href);
    var rel = external ? ' rel="noopener noreferrer"' : '';
    var target = external ? ' target="_blank"' : '';
    var devices = renderDevices(layer, card);
    var cls = cardClasses(card) + (disabled ? ' home-v2-project-card--disabled' : '') + (comingSoon ? ' home-v2-project-card--coming-soon' : '');
    var stage =
      '<div class="home-v2-project-card__stage">' +
        '<div class="home-v2-project-card__bg" aria-hidden="true">' + renderBg(layer.bg) + '</div>' +
        '<div class="home-v2-project-card__copy home-v2-project-card__copy--' + tone + '" style="' + boxStyle(text) + '">' +
          renderCardHeading(card, comingSoon) +
          '<p class="home-v2-project-card__desc">' + escapeHtml(card.desc) + '</p>' +
        '</div>' +
        devices +
      '</div>';

    if (disabled) {
      return (
        '<div class="' + cls + '" aria-disabled="true" role="group" aria-label="' + escapeHtml(card.desc) + ' — будет позже" style="--project-accent:' + escapeHtml(card.accent || '#fff') + '">' +
          stage +
        '</div>'
      );
    }

    return (
      '<a class="' + cls + '" href="' + escapeHtml(card.href) + '"' + target + rel + ' style="--project-accent:' + escapeHtml(card.accent || '#fff') + '">' +
        stage +
      '</a>'
    );
  }

  function attachLayers(cards, layers) {
    return cards.map(function (card, i) {
      return Object.assign({}, card, { layer: layers[i], slug: layers[i].slug });
    });
  }

  var workCardsWithLayers = null;

  function getWorkCardsWithLayers() {
    var layers = window.SITE_CARD_LAYERS;
    if (!layers) return [];
    if (!workCardsWithLayers) {
      workCardsWithLayers = attachLayers(WORK_CARDS, layers.work);
    }
    return workCardsWithLayers;
  }

  function getWorkCardBySlug(slug) {
    var cards = getWorkCardsWithLayers();
    for (var i = 0; i < cards.length; i++) {
      if (cards[i].slug === slug) return cards[i];
    }
    return null;
  }

  function markProjectCardsPanel(root) {
    root.classList.add('home-v2-project-cards');
  }

  function syncResponsiveScreenVideos(root) {
    var mobile = window.matchMedia('(max-width: 991px)').matches;
    root.querySelectorAll('.home-v2-project-card__device-media--screen-video-responsive').forEach(function (media) {
      var webVideo = media.querySelector('.home-v2-project-card__device-media-fit--web .home-v2-project-card__device-screen-video');
      var mobileVideo = media.querySelector('.home-v2-project-card__device-media-fit--mobile .home-v2-project-card__device-screen-video');
      if (!webVideo || !mobileVideo) return;
      var active = mobile ? mobileVideo : webVideo;
      var idle = mobile ? webVideo : mobileVideo;
      idle.pause();
      var p = active.play();
      if (p && p.catch) p.catch(function () {});
    });
  }

  function mountCards(rootId, cards) {
    var root = document.getElementById(rootId);
    if (!root) return;
    markProjectCardsPanel(root);
    root.innerHTML = cards.map(renderWorkCard).join('');
    root.querySelectorAll('.home-v2-project-card__device-video, .home-v2-project-card__device-screen-video').forEach(function (video) {
      var p = video.play();
      if (p && p.catch) p.catch(function () {});
    });
    syncResponsiveScreenVideos(root);
  }

  function mountWorkCards() {
    if (!document.getElementById('home-v2-work-list') && !document.getElementById('home-v2-personal-list')) {
      return;
    }
    var layers = window.SITE_CARD_LAYERS;
    if (!layers) return;

    mountCards('home-v2-work-list', getWorkCardsWithLayers());
    mountCards('home-v2-personal-list', attachLayers(PERSONAL_CARDS, layers.personal));
  }

  var WORKS_TAB_KEY = 'home-v2-works-tab';

  function saveWorksTab(id) {
    try {
      sessionStorage.setItem(WORKS_TAB_KEY, id);
    } catch (e) {}
  }

  function getSavedWorksTab() {
    try {
      var saved = sessionStorage.getItem(WORKS_TAB_KEY);
      if (saved === 'work' || saved === 'personal') return saved;
    } catch (e) {}
    return null;
  }

  function initWorksTabs() {
    var tabs = document.querySelectorAll('.home-v2-works__tab');
    var panelsRoot = document.querySelector('.home-v2-works__panels');
    if (!tabs.length || !panelsRoot) return;

    var FADE_MS = 480;
    var transitioning = false;
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function setActiveTab(tab) {
      var id = tab.getAttribute('data-tab');

      tabs.forEach(function (t) {
        var active = t === tab;
        t.classList.toggle('is-active', active);
        t.setAttribute('aria-selected', active ? 'true' : 'false');
      });

      panelsRoot.querySelectorAll('.home-v2-works__panel').forEach(function (panel) {
        var active = panel.getAttribute('data-panel') === id;
        panel.classList.toggle('is-active', active);
        panel.hidden = !active;
      });
    }

    function restoreSavedTab() {
      var saved = getSavedWorksTab();
      document.documentElement.classList.remove('home-v2-works-tab--personal');
      if (!saved || saved === 'work') return;

      var tab = document.querySelector('.home-v2-works__tab[data-tab="' + saved + '"]');
      if (tab) setActiveTab(tab);
    }

    restoreSavedTab();

    function finishCrossfade(fromPanel, toPanel) {
      panelsRoot.classList.remove('is-crossfading');
      panelsRoot.style.minHeight = '';

      fromPanel.classList.remove('is-tab-fade-from', 'is-tab-fade-hide', 'is-active');
      fromPanel.hidden = true;

      toPanel.classList.remove('is-tab-fade-to', 'is-tab-fade-show');
      toPanel.classList.add('is-active');
      toPanel.hidden = false;

      transitioning = false;
    }

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        if (tab.classList.contains('is-active') || transitioning) return;

        var id = tab.getAttribute('data-tab');
        var fromPanel = panelsRoot.querySelector('.home-v2-works__panel.is-active');
        var toPanel = panelsRoot.querySelector('.home-v2-works__panel[data-panel="' + id + '"]');
        if (!fromPanel || !toPanel || fromPanel === toPanel) return;

        saveWorksTab(id);

        tabs.forEach(function (t) {
          var active = t === tab;
          t.classList.toggle('is-active', active);
          t.setAttribute('aria-selected', active ? 'true' : 'false');
        });

        if (reducedMotion) {
          setActiveTab(tab);
          return;
        }

        transitioning = true;
        fromPanel.hidden = false;
        toPanel.hidden = false;

        var fromH = fromPanel.offsetHeight;
        panelsRoot.style.minHeight = fromH + 'px';
        panelsRoot.classList.add('is-crossfading');

        fromPanel.classList.add('is-tab-fade-from');
        toPanel.classList.add('is-tab-fade-to', 'is-active');
        fromPanel.classList.remove('is-active');

        var toH = toPanel.offsetHeight;

        window.requestAnimationFrame(function () {
          panelsRoot.style.minHeight = toH + 'px';
          fromPanel.classList.add('is-tab-fade-hide');
          toPanel.classList.add('is-tab-fade-show');
        });

        window.setTimeout(function () {
          finishCrossfade(fromPanel, toPanel);
        }, FADE_MS);
      });
    });
  }

  function init() {
    mountWorkCards();
    initWorksTabs();
    var syncAllScreenVideos = function () {
      ['home-v2-work-list', 'home-v2-personal-list'].forEach(function (id) {
        var root = document.getElementById(id);
        if (root) syncResponsiveScreenVideos(root);
      });
    };
    window.addEventListener('resize', syncAllScreenVideos);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.SITE_WORK_CARDS = WORK_CARDS;
  window.SITE_PERSONAL_CARDS = PERSONAL_CARDS;
  window.SITE_CARDS = {
    renderWorkCard: renderWorkCard,
    getWorkCardBySlug: getWorkCardBySlug,
    getWorkCardsWithLayers: getWorkCardsWithLayers,
    markProjectCardsPanel: markProjectCardsPanel
  };
})();


