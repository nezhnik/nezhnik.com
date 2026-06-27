/**
 * Блок «Ещё проекты» на страницах кейсов — те же карточки, что на home-v2.
 * data-page на #home-v2-more-projects-list → slug страницы (csclick, legalbpm…)
 */
(function () {
  'use strict';

  /** slug страницы → slug карточек work-XX (строка или { slug, disabled }) */
  var MORE_BY_PAGE = {
    'raf-identic': ['work-02', 'work-03', 'work-04'],
    raf: ['work-01', 'work-03', 'work-04'],
    onesearch: ['work-01', 'work-02', 'work-04'],
    'raf-servicedesk': ['work-01', 'work-02', 'work-03'],
    legalbpm: ['work-06', 'work-07', 'work-08'],
    sberpravo: ['work-07', 'work-08', 'work-09'],
    csclick: ['work-08', 'work-09', 'work-10'],
    csradar: ['work-09', 'work-10', 'work-12'],
    crafter: ['work-10', 'work-12', 'work-13'],
    zesklad: ['work-12', 'work-13', 'work-14'],
    smarthome: [{ slug: 'work-04', disabled: true }, 'work-05', 'work-06'],
    sibpromstroy: ['work-13', 'work-14', 'work-11'],
    designconference: ['work-14', 'work-11', { slug: 'work-04', disabled: true }],
    glavpivmag: ['work-11', { slug: 'work-04', disabled: true }, 'work-05']
  };

  function normalizeEntry(entry) {
    if (typeof entry === 'string') return { slug: entry, disabled: false };
    return { slug: entry.slug, disabled: !!entry.disabled };
  }

  function mountMoreProjects() {
    var root = document.getElementById('home-v2-more-projects-list');
    if (!root) return;

    var page = root.getAttribute('data-page');
    var slugs = MORE_BY_PAGE[page];
    var api = window.HOME_V2_CARDS;
    if (!slugs || !api) return;

    api.markProjectCardsPanel(root);

    var html = slugs.map(function (entry) {
      var item = normalizeEntry(entry);
      var card = api.getWorkCardBySlug(item.slug);
      if (!card) return '';
      return api.renderWorkCard(card, { disabled: item.disabled });
    }).join('');

    root.innerHTML = html;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountMoreProjects);
  } else {
    mountMoreProjects();
  }

  window.HOME_V2_MORE_BY_PAGE = MORE_BY_PAGE;
})();
