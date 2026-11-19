const siteUrl = (file) => new URL(file, window.location.href).href;

window.TrelloPowerUp.initialize({
  'card-buttons': () => [{
    text: 'SimpleLinks',
    icon: siteUrl('link.svg'),
    callback: (t) => t.popup({
      title: 'SimpleLinks',
      url: siteUrl('links.html'),
      height: 460,
    }),
  }],
});
