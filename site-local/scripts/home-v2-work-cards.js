/**
 * Карточки home-v2 — слои как в Figma: фон · текст · экран(ы).
 * Слои: scripts/home-v2-cards-layers.js (генерируется build-home-v2-card-layers.mjs)
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
    { href: 'raf-identic.html', title: 'Райффайзен банк', accent: '#ffe600', desc: 'Айдентика, визуальный стиль и стратегия коммуникации Рафа — основного ИИ-ассистента для всех сотрудников', descLight: true, mac: true, preview: 'images/home-v2/work-01.png' },
    { href: 'legalbpm.html', title: 'Райффайзен банк', accent: '#ffe600', desc: 'Веб-интерфейс и мобильное приложение Рафа — основного ИИ-ассистента для всех сотрудников', descLight: false, phone: true, mac: true, preview: 'images/home-v2/work-02.png' },
    { href: 'legalbpm.html', title: 'Райффайзен банк', accent: '#ffe600', desc: 'Редизайн и проектирование единого решения поиска для основных порталов банка — «Инсайдер» и «Сервис-деск»', descLight: true, mac: true, preview: 'images/home-v2/work-03.png' },
    { href: 'legalbpm.html', title: 'Райффайзен банк', accent: '#ffe600', desc: 'Редизайн портала «Сервис-деск» — сервиса решения рабочих вопросов всех сотрудников и обращений клиентов банка', descLight: true, mac: true, preview: 'images/home-v2/work-04.png' },
    { href: 'sberpravo.html', title: 'Сбер Право', titleParts: [{ text: 'Сбер ', color: '#2a9f3f' }, { text: 'Право', color: '#2c9ce6' }], accent: '#2c9ce6', desc: 'Редизайн юридического сервиса «LegalBPM» — системы менеджмента бизнес-процессов правовых запросов и судебной работы Сбера', descLight: false, mac: true, preview: 'images/home-v2/work-05.png' },
    { href: 'sberpravo.html', title: 'Сбер Право', titleParts: [{ text: 'Сбер ', color: '#2a9f3f' }, { text: 'Право', color: '#2c9ce6' }], accent: '#2c9ce6', desc: 'Каталог услуг и набор 3D-иллюстраций для юридического сервиса Сбера', descLight: true, phone: true, mac: true, preview: 'images/home-v2/work-06.png' },
    { href: 'csclick.html', title: 'Сбер', accent: '#2a9f3f', desc: 'Сервис заказа товаров «CS-Клик» для всех сотрудников и партнеров Сбера', descLight: false, phone: true, mac: true, preview: 'images/home-v2/work-07.png' },
    { href: 'csradar.html', title: 'Сбер', accent: '#2a9f3f', desc: 'Личные кабинеты логистов и операторов для логистической платформы «CS Radar»', descLight: false, phone: true, mac: true, preview: 'images/home-v2/work-08.png' },
    { href: 'crafter.html', title: 'Crafter', accent: '#fd7350', desc: 'Личные кабинеты логистов и перевозчиков для логистической компании', descLight: true, phone: true, mac: true, preview: 'images/home-v2/work-09.png' },
    { href: 'zesklad.html', title: 'ZeСклад', titleParts: [{ text: 'Ze', color: '#41e6db' }, { text: 'Склад', color: '#292932' }], accent: '#41e6db', desc: 'Личный кабинет и сайт для сервиса хранения вещей', descLight: true, phone: true, mac: true, preview: 'images/home-v2/work-10.png' },
    { href: 'smarthome.html', title: 'Smart home', accent: '#2969df', desc: 'Концепция приложения умного дома', descLight: true, phone: true, mac: false, preview: 'images/home-v2/work-11.png' },
    { href: 'sibpromstroy.html', title: 'Сибпромстрой', accent: '#1077e0', desc: 'Редизайн сайта для строительной компании', descLight: false, mac: true, preview: 'images/home-v2/work-12.png' },
    { href: 'designconference.html', title: 'Design Conference', titleGradient: true, accent: '#ffffff', desc: 'Лендинг для дизайн-конференции', descLight: true, mac: true, preview: 'images/home-v2/work-13.png' },
    { href: 'glavpivmag.html', title: 'ГлавПивМаг', accent: '#f2cb82', desc: 'Главная страница и каталог для магазина крафтового пива', descLight: true, mac: true, preview: 'images/home-v2/work-14.png' }
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
    return (window.homeV2ImageUrl || function (p) { return p; })(path);
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

  function renderDeviceImg(src, mobileSrc) {
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
    return (
      '<div class="' + deviceClass + '" style="' + boxStyle(box) + '">' +
        renderDeviceImg(box.src, mobileSrc) +
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

  function renderWorkCard(card, options) {
    var layer = card.layer;
    if (!layer) return '';
    var tone = card.descLight ? 'light' : 'dark';
    var text = layer.text;
    var disabled = options && options.disabled;
    var external = !disabled && /^https?:\/\//.test(card.href);
    var rel = external ? ' rel="noopener noreferrer"' : '';
    var target = external ? ' target="_blank"' : '';
    var devices = renderDevices(layer, card);
    var cls = cardClasses(card) + (disabled ? ' home-v2-project-card--disabled' : '');
    var stage =
      '<div class="home-v2-project-card__stage">' +
        '<div class="home-v2-project-card__bg" aria-hidden="true">' + renderBg(layer.bg) + '</div>' +
        '<div class="home-v2-project-card__copy home-v2-project-card__copy--' + tone + '" style="' + boxStyle(text) + '">' +
          '<h3 class="' + titleClassName(card) + '">' + renderTitle(card) + '</h3>' +
          '<p class="home-v2-project-card__desc">' + escapeHtml(card.desc) + '</p>' +
        '</div>' +
        devices +
      '</div>';

    if (disabled) {
      return (
        '<div class="' + cls + '" aria-disabled="true" style="--project-accent:' + escapeHtml(card.accent || '#fff') + '">' +
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
    var layers = window.HOME_V2_CARD_LAYERS;
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

  function mountCards(rootId, cards) {
    var root = document.getElementById(rootId);
    if (!root) return;
    markProjectCardsPanel(root);
    root.innerHTML = cards.map(renderWorkCard).join('');
  }

  function mountWorkCards() {
    if (!document.getElementById('home-v2-work-list') && !document.getElementById('home-v2-personal-list')) {
      return;
    }
    var layers = window.HOME_V2_CARD_LAYERS;
    if (!layers) return;

    mountCards('home-v2-work-list', getWorkCardsWithLayers());
    mountCards('home-v2-personal-list', attachLayers(PERSONAL_CARDS, layers.personal));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountWorkCards);
  } else {
    mountWorkCards();
  }

  window.HOME_V2_WORK_CARDS = WORK_CARDS;
  window.HOME_V2_PERSONAL_CARDS = PERSONAL_CARDS;
  window.HOME_V2_CARDS = {
    renderWorkCard: renderWorkCard,
    getWorkCardBySlug: getWorkCardBySlug,
    getWorkCardsWithLayers: getWorkCardsWithLayers,
    markProjectCardsPanel: markProjectCardsPanel
  };
})();


