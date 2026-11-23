(function () {
  'use strict';

  var gallery = document.querySelector('.photo-gallery');
  if (!gallery) return;

  var photos = Array.prototype.slice.call(gallery.querySelectorAll('.photo-card img'));
  if (!photos.length) return;

  var dialog = document.createElement('dialog');
  dialog.className = 'photo-lightbox';
  dialog.setAttribute('aria-modal', 'true');

  var content = document.createElement('div');
  content.className = 'photo-lightbox__content';

  var closeButton = document.createElement('button');
  closeButton.className = 'photo-lightbox__close';
  closeButton.type = 'button';
  closeButton.textContent = '×';

  var enlargedImage = document.createElement('img');
  enlargedImage.className = 'photo-lightbox__image';
  enlargedImage.alt = '';

  var caption = document.createElement('p');
  caption.className = 'photo-lightbox__caption';

  content.appendChild(closeButton);
  content.appendChild(enlargedImage);
  content.appendChild(caption);
  dialog.appendChild(content);
  document.body.appendChild(dialog);

  var activeButton = null;

  function isEnglish() {
    return document.documentElement.lang.toLowerCase().indexOf('en') === 0;
  }

  function setLanguageLabels() {
    var english = isEnglish();
    dialog.setAttribute('aria-label', english ? 'Enlarged apartment photo' : 'Photo de l’appartement agrandie');
    closeButton.setAttribute('aria-label', english ? 'Close photo' : 'Fermer la photo');
    photos.forEach(function (photo) {
      var button = photo.closest('.photo-zoom-button');
      if (!button) return;
      var alt = photo.getAttribute('alt') || (english ? 'Apartment photo' : 'Photo de l’appartement');
      button.setAttribute('aria-label', english ? 'Open enlarged photo: ' + alt : 'Agrandir la photo : ' + alt);
    });
  }

  function openPhoto(button) {
    var photo = button.querySelector('img');
    if (!photo) return;

    activeButton = button;
    enlargedImage.src = photo.currentSrc || photo.src;
    enlargedImage.alt = photo.alt || '';
    caption.textContent = photo.alt || '';
    setLanguageLabels();

    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
  }

  photos.forEach(function (photo) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'photo-zoom-button';
    button.setAttribute('aria-haspopup', 'dialog');

    var parent = photo.parentNode;
    parent.insertBefore(button, photo);
    button.appendChild(photo);
  });

  gallery.querySelectorAll('.photo-zoom-button').forEach(function (button) {
    button.addEventListener('click', function () {
      openPhoto(button);
    });
  });

  closeButton.addEventListener('click', function () {
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  });

  dialog.addEventListener('click', function (event) {
    if (event.target === dialog) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  });

  dialog.addEventListener('close', function () {
    enlargedImage.removeAttribute('src');
    if (activeButton) activeButton.focus();
  });

  var languageObserver = new MutationObserver(setLanguageLabels);
  languageObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  setLanguageLabels();
})();
