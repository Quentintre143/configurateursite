
(function () {
  var root = document.documentElement;

  /* Copier */
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', '');
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
  }
  document.querySelectorAll('[data-copy]').forEach(function (btn) {
    var label = btn.textContent;
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy');
      var done = function () {
        btn.textContent = 'Copié'; btn.setAttribute('data-done', 'true');
        setTimeout(function () { btn.textContent = label; btn.removeAttribute('data-done'); }, 1800);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
      } else { fallbackCopy(text); done(); }
    });
  });

  /* Avis catégorisés : enregistrement local dans le navigateur */
  var reviewForm = document.getElementById('review-form');
  var reviewList = document.getElementById('review-list');
  var reviewStatus = document.getElementById('review-status');
  var reviewKey = 'avis-site';
  function readReviews() { try { return JSON.parse(localStorage.getItem(reviewKey) || '[]'); } catch (e) { return []; } }
  function renderReviews() {
    if (!reviewList) return;
    var reviews = readReviews();
    reviewList.textContent = '';
    if (!reviews.length) { var empty = document.createElement('p'); empty.className = 'review-empty'; empty.textContent = 'Aucun avis enregistré pour le moment.'; reviewList.appendChild(empty); return; }
    reviews.slice().reverse().forEach(function (r) {
      var item = document.createElement('article'); item.className = 'review-item';
      var meta = document.createElement('div'); meta.className = 'review-meta';
      var who = document.createElement('strong'); who.textContent = r.name; meta.appendChild(who);
      var cat = document.createElement('span'); cat.textContent = '· ' + r.category; meta.appendChild(cat);
      var stars = document.createElement('span'); stars.className = 'review-stars'; stars.textContent = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating); meta.appendChild(stars);
      var text = document.createElement('p'); text.textContent = r.comment;
      item.appendChild(meta); item.appendChild(text);
      if (r.scores) { var scores = document.createElement('div'); scores.className = 'review-scores'; Object.keys(r.scores).forEach(function (key) { var label = { appartement:'Appartement', proprete:'Propreté', localisation:'Localisation', equipements:'Équipements', communication:'Communication', station:'Station', activites:'Restaurants et activités' }[key] || key; var chip = document.createElement('span'); chip.textContent = label + ' ' + '★'.repeat(Number(r.scores[key])) + '☆'.repeat(5 - Number(r.scores[key])); scores.appendChild(chip); }); item.appendChild(scores); }
      reviewList.appendChild(item);
    });
  }
  if (reviewForm) {
    reviewForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var fd = new FormData(reviewForm);
      var reviewAction = reviewForm.getAttribute('action') || '#';
      if (!reviewAction || reviewAction === '#') {
        var localReviews = readReviews();
        localReviews.push({ name: String(fd.get('name')).trim(), category: String(fd.get('category')), rating: Number(fd.get('rating')), comment: String(fd.get('comment')).trim(), date: new Date().toISOString() });
        try { localStorage.setItem(reviewKey, JSON.stringify(localReviews.slice(-30))); } catch (err) {}
        reviewForm.reset();
        reviewStatus.textContent = root.getAttribute('data-lang') === 'en' ? 'Review saved on this device only. Online sending is not configured.' : 'Avis enregistré sur cet appareil uniquement. L’envoi en ligne n’est pas configuré.';
        renderReviews();
        return;
      }
      reviewStatus.textContent = root.getAttribute('data-lang') === 'en' ? 'Sending your review…' : 'Envoi de votre avis…';
      fetch(reviewAction, { method: 'POST', body: fd, headers: { 'Accept': 'application/json' } }).then(function (r) {
        if (!r.ok) throw new Error('Review form error');
        var reviews = readReviews();
        reviews.push({ name: String(fd.get('name')).trim(), category: String(fd.get('category')), rating: Number(fd.get('rating')), scores: { appartement: Number(fd.get('scores.appartement')), proprete: Number(fd.get('scores.proprete')), localisation: Number(fd.get('scores.localisation')), equipements: Number(fd.get('scores.equipements')), communication: Number(fd.get('scores.communication')), station: Number(fd.get('scores.station')), activites: Number(fd.get('scores.activites')) }, comment: String(fd.get('comment')).trim(), date: new Date().toISOString() });
        try { localStorage.setItem(reviewKey, JSON.stringify(reviews.slice(-30))); } catch (err) {}
        reviewForm.reset();
        reviewStatus.textContent = root.getAttribute('data-lang') === 'en' ? 'Thank you, your review has been sent and saved on this device.' : 'Merci, votre avis a été envoyé et enregistré sur cet appareil.';
        renderReviews();
      }).catch(function () { reviewStatus.textContent = root.getAttribute('data-lang') === 'en' ? 'The review could not be sent. Please try again.' : 'L’avis n’a pas pu être envoyé. Veuillez réessayer.'; });
    });
    renderReviews();
  }


  /* Formulaire de signalement : envoi uniquement après configuration d’une destination. */
  var issueForm = document.getElementById('issue-form'), issueStatus = document.getElementById('issue-status');
  if (issueForm) issueForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var fd = new FormData(issueForm);
    var issueAction = issueForm.getAttribute('action') || '#';
    if (!issueAction || issueAction === '#') {
      if (issueStatus) issueStatus.textContent = root.getAttribute('data-lang') === 'en' ? 'Online sending is not configured. Please contact the concierge by phone or email.' : 'L’envoi en ligne n’est pas configuré. Contactez la conciergerie par téléphone ou e-mail.';
      return;
    }
    if (issueStatus) issueStatus.textContent = root.getAttribute('data-lang') === 'en' ? 'Sending your report…' : 'Envoi de votre signalement…';
    fetch(issueAction, { method: 'POST', body: fd, headers: { 'Accept': 'application/json' } }).then(function (r) {
      if (!r.ok) throw new Error('Issue form error');
      issueForm.reset();
      if (issueStatus) issueStatus.textContent = root.getAttribute('data-lang') === 'en' ? 'Your report has been sent to the concierge.' : 'Votre signalement a été envoyé à la conciergerie.';
    }).catch(function () { if (issueStatus) issueStatus.textContent = root.getAttribute('data-lang') === 'en' ? 'The report could not be sent. Please try again.' : 'Le signalement n’a pas pu être envoyé. Veuillez réessayer.'; });
  });

  /* Checklists du jour et d’arrivée, enregistrées localement. */
  function bindChecklist(selector, key, progressId) {
    var list = document.querySelectorAll(selector), progress = document.getElementById(progressId); if (!list.length) return;
    var saved = {}; try { saved = JSON.parse(localStorage.getItem(key) || '{}'); } catch (e) {}
    function update() { var done = 0; list.forEach(function (box) { box.checked = !!saved[box.getAttribute('data-today') || box.getAttribute('data-arrival') || box.getAttribute('data-depart')]; if (box.checked) done++; }); if (progress) progress.textContent = root.getAttribute('data-lang') === 'en' ? done + ' of ' + list.length + ' done' : done + ' sur ' + list.length + ' faits'; }
    list.forEach(function (box) { box.addEventListener('change', function () { saved[box.getAttribute('data-today') || box.getAttribute('data-arrival') || box.getAttribute('data-depart')] = box.checked; try { localStorage.setItem(key, JSON.stringify(saved)); } catch (e) {} update(); }); }); update();
  }
  bindChecklist('#today-list input', 'site-aujourdhui', 'today-progress');
  bindChecklist('#arrival-list input', 'site-arrivee', 'arrival-progress');
  bindChecklist('#checklist input', 'site-depart', 'progress');

  /* Version française / anglaise des éléments principaux. */
  var languageTexts = { en: { contactConcierge:'Contact the concierge', seeBuses:'See shuttle buses', seeWeather:'See the weather', reportIssue:'Report a problem', emergency:'Emergency', liveEyebrow:'Live information', weatherTitle:'Weather and resort conditions', weatherIntro:'Check official information before going out: weather, webcams, snow and openings', navArrival:'Arrival', navEquipment:'Equipment', navRules:'Rules', navInventory:'Inventory', navStation:'[[NOM_STATION]]', navFaq:'FAQ', navContact:'Contact' }, fr: { contactConcierge:'Contacter la conciergerie', seeBuses:'Voir les navettes', seeWeather:'Voir la météo', reportIssue:'Signaler un problème', emergency:'Urgence', liveEyebrow:'En direct', weatherTitle:'Météo et conditions de la station', weatherIntro:'Consultez les informations officielles avant de sortir : météo, webcams, neige et ouvertures', navArrival:'Arrivée', navEquipment:'Équipements', navRules:'Règles', navInventory:'Inventaire', navStation:'[[NOM_STATION]]', navFaq:'FAQ', navContact:'Contact' } };
  var langButtons = document.querySelectorAll('[data-lang-btn]');
  var fullEnglishTranslations = {"[[NOM_LOGEMENT]] [[NOM_RESIDENCE]]":"[[NOM_LOGEMENT]] [[NOM_RESIDENCE]]","[[NOM_RESIDENCE]] · [[NUMERO_LOGEMENT]]":"[[NOM_RESIDENCE]] · [[NUMERO_LOGEMENT]]","Bienvenue":"Welcome","Arrivée":"Arrival","Équipements":"Appliances","Règles":"Rules","Inventaire":"Inventory","[[NOM_STATION]]":"[[NOM_STATION]]","FAQ":"FAQ","Contact":"Contact","Hiver":"Winter","Printemps":"Spring","Été":"Summer","Automne":"Autumn","Livret d'accueil · L'art de vivre aux [[NOM_STATION]]":"Welcome booklet · The art of living in [[NOM_STATION]]","· Saison":"· Season","Bienvenue au [[NOM_RESIDENCE]].":"Welcome to [[NOM_RESIDENCE]].","Vous êtes dans l'appartement [[NUMERO_LOGEMENT]], au cœur de la station. Tout ce qu'il faut pour vous installer, faire marcher les appareils et profiter de la neige tient dans cette page.":"You’re in apartment [[NUMERO_LOGEMENT]], in the heart of the resort. Everything you need to settle in, use the appliances, and enjoy the snow is on this page.","Vous êtes dans l'appartement [[NUMERO_LOGEMENT]], au cœur de la station. Tout ce qu'il faut pour vous installer, faire marcher les appareils et profiter de la montagne tient dans cette page.":"You’re in apartment [[NUMERO_LOGEMENT]], in the heart of the resort. Everything you need to settle in, use the appliances, and enjoy the mountains is on this page.","Appartement [[NUMERO_LOGEMENT]]":"Apartment [[NUMERO_LOGEMENT]]","Placard à skis au niveau du garage":"Storage room with private storage unit","Garage de la résidence":"Residence garage","Wi-Fi inclus":"Wi-Fi included","Ménage de fin de séjour compris":"End-of-stay cleaning included","Connectez-vous":"Connect","Réseau Wi-Fi":"Wi-Fi network","Copier":"Copy","Mot de passe":"Password","[[MOT_DE_PASSE_WIFI]]":"[[MOT_DE_PASSE_WIFI]]","Résidence":"Residence","[[NOM_RESIDENCE]]":"[[NOM_RESIDENCE]]","Logement":"Apartment","Vos hôtes":"Your hosts","[[NOM_HOTES]]":"[[NOM_HOTES]]","Contacter la conciergerie":"Contact the concierge","Voir les navettes":"View shuttles","Voir la météo":"View the weather","Signaler un problème":"Report a problem","Urgence":"Emergency","Paysage 1 / 2":"Landscape 1 / 2","Le paysage change aussi en descendant.":"The scenery changes as you head back down, too.","Conciergerie":"Concierge","Navettes":"Shuttles","Météo":"Weather","Mot de bienvenue":"Welcome message","Chers voyageurs,":"Dear guests,","Nous sommes ravis de vous accueillir dans notre appartement, situé au cœur de la station des [[NOM_STATION]]. Nous espérons que vous passerez un séjour inoubliable, entre paysages enneigés, sports de glisse et moments de détente.":"We’re delighted to welcome you to our apartment, in the heart of the [[NOM_STATION]] resort. We hope you have an unforgettable stay, with snowy landscapes, winter sports, and relaxing moments.","Nous sommes ravis de vous accueillir dans notre appartement, situé au cœur de la station des [[NOM_STATION]]. Nous espérons que vous passerez un séjour inoubliable, entre grands espaces, balades en montagne et moments de détente.":"We’re delighted to welcome you to our apartment, in the heart of the [[NOM_STATION]] resort. We hope you have an unforgettable stay, with wide-open spaces, mountain walks, and relaxing moments.","Ce livret a été conçu pour vous faciliter la vie pendant votre séjour. Vous y trouverez toutes les informations pratiques concernant le fonctionnement des équipements, les bonnes adresses du coin, ainsi que les règles de la copropriété pour que tout se passe au mieux.":"This booklet is designed to make your stay easier. You’ll find practical information on how to use the appliances, local recommendations, and the building rules to help everything go smoothly.","Si vous avez la moindre question ou besoin de recommandations particulières, n'hésitez pas à contacter la conciergerie ou à nous laisser un message.":"If you have any questions or need specific recommendations, feel free to contact the concierge or leave us a message.","[[EMAIL_HOTES]]":"[[EMAIL_HOTES]]","Nous vous souhaitons un excellent séjour aux [[NOM_STATION]] !":"We hope you have a wonderful stay in [[NOM_STATION]]!","Chaleureusement, [[NOM_HOTES]]":"Warm regards, [[NOM_HOTES]]","L’esprit des [[NOM_STATION]]":"The spirit of [[NOM_STATION]]","La montagne, en vrai":"The mountains, up close","La photo affichée s’adapte automatiquement à la saison du moment.":"The photo shown automatically changes with the season.","L’hiver aux [[NOM_STATION]]":"Winter in [[NOM_STATION]]","Neige, glacier et grands espaces blancs.":"Snow, glacier, and wide-open white spaces.","Le printemps en altitude":"Spring in the mountains","Les sentiers se découvrent peu à peu sous la neige fondante.":"Trails gradually emerge as the snow melts.","L’été aux [[NOM_STATION]]":"Summer in [[NOM_STATION]]","Montagnes vertes, randonnées et air frais.":"Green mountains, hiking, and fresh air.","L’automne aux [[NOM_STATION]]":"Autumn in [[NOM_STATION]]","Des couleurs chaudes avant le retour de la neige.":"Warm colors before the snow returns.","À découvrir":"Explore","La résidence et la station en images":"The residence and resort in pictures","Quelques repères visuels pour vous projeter dans votre séjour aux [[NOM_STATION]].":"A few images to help you picture your stay in [[NOM_STATION]].","Votre intérieur":"Your apartment","Un espace chaleureux pour se retrouver après la montagne.":"A welcoming space to relax together after a day in the mountains.","Le village":"The village","Les commerces, restaurants et services de la station à portée de pas.":"The resort’s shops, restaurants, and services are just a short walk away.","Les grands panoramas":"Wide-open panoramas","Une station entourée de paysages alpins.":"A resort surrounded by Alpine scenery.","De la route à l'appartement [[NUMERO_LOGEMENT]]":"From the road to apartment [[NUMERO_LOGEMENT]]","Quatre repères pour vous installer sans attendre.":"Four quick steps to help you settle in.","Avant":"Before you arrive","Préparez la route":"Plan your drive","Vérifiez l'état de la route avant de partir et prévoyez":"Check the road conditions before setting off and bring","chaînes ou pneus neige":"snow chains or winter tires",". Une question sur l'accès ou l'heure d'arrivée ? Écrivez-nous à l'adresse en bas de page.":". Questions about access or your arrival time? Email us at the address at the bottom of the page.","La route de montagne comporte beaucoup de virages :":"The mountain road has lots of bends:","prévoyez du temps":"allow plenty of time","pour la montée. Une question sur l'accès ou l'heure d'arrivée ? Écrivez-nous à l'adresse en bas de page.":"for the drive up. Questions about access or your arrival time? Email us at the address at the bottom of the page.","Entrée":"Entrance","Repérez la barrière et les moloks":"Look for the barrier and the waste containers","À l'entrée de la résidence, juste à côté de la barrière, se trouvent les conteneurs (moloks) pour vos poubelles.":"The waste containers (moloks) are at the residence entrance, right next to the barrier.","Garage":"Garage","Rangez vos skis dans le placard à skis":"Store your skis in the garage","Le placard à skis":"Our storage unit","Le placard à skis est à votre disposition au niveau des garages de la résidence. Vérifiez bien sa fermeture après chaque utilisation. Notre":"The ski room is on the residence garage level. Our","placard à skis disponible":"private storage unit","y est à votre disposition pour ranger votre équipement en sécurité.":"is available there to store your gear safely.","Le placard à skis se trouve au niveau des garages de la résidence. Vérifiez bien sa fermeture après chaque utilisation. Notre":"The storage room is on the residence garage level. Our","Appt [[NUMERO_LOGEMENT]]":"Apartment [[NUMERO_LOGEMENT]]","Connectez-vous et installez-vous":"Connect and settle in","Le Wi-Fi est en haut de page, avec un QR code à flasher affiché dans l'appartement. Le guide des appareils juste en dessous explique tout, du lave-vaisselle à la télé.":"The Wi-Fi details are at the top of the page. There’s also a QR code in the apartment that you can scan. The appliance guide below explains everything from the dishwasher to the TV.","À l’arrivée":"When you arrive","Checklist d’installation":"Arrival checklist","À cocher dès votre arrivée pour vérifier que tout est prêt.":"Tick these off when you arrive to make sure everything is ready.","Vérifier les clés et l’accès à l’appartement":"Check the keys and access to the apartment","Vérifier le chauffage et la température":"Check the heating and temperature","Vérifier l’état général de l’appartement":"Check the overall condition of the apartment","Vérifier le matériel et les équipements":"Check the equipment and appliances","Signaler immédiatement un problème":"Report any problems immediately","0 sur 5 faits":"0 of 5 done","Rangement des skis":"Garage and storage room","Vos skis ont leur place dans le placard à skis":"Your skis have a place in the garage","Un placard à skis au niveau du garage":"A storage room for your gear","Emplacement":"Location","Au niveau du garage":"On the garage level","Le placard à skis est à votre disposition au niveau des garages de la résidence. Vérifiez bien sa fermeture après chaque utilisation.":"The ski room is on the residence garage level.","Le placard à skis se trouve au niveau des garages de la résidence. Vérifiez bien sa fermeture après chaque utilisation.":"The storage room is on the residence garage level.","Un placard à skis disponible":"A private storage unit","Votre équipement de ski peut être stocké en toute sécurité dans notre placard à skis disponible situé dans ce local.":"Your ski gear can be stored safely in our private storage unit in this room.","Votre équipement peut être stocké en toute sécurité dans notre placard à skis disponible situé dans ce local.":"Your gear can be stored safely in our private storage unit in this room.","Accès":"Access","Refermez et verrouillez":"Close and lock up","Vérifiez bien la fermeture du placard à skis après chaque utilisation, pour garder votre matériel en sécurité.":"Remember to close the room and lock the storage unit every time to keep your gear safe.","Comment ça marche, appareil par appareil":"How to use each appliance","Choisissez un appareil. Chaque fiche tient en quelques lignes.":"Choose an appliance. Each guide is just a few lines long.","Astuce énergie":"Energy-saving tip","Lancez le lave-vaisselle et le sèche-chaussures aux heures creuses :":"Run the dishwasher and boot dryer during off-peak hours:","14 h 40 – 17 h 10":"14 h 40 – 17 h 10","1 h 10 – 6 h 40":"1 h 10 – 6 h 40","Box Livebox":"Livebox unit","Lave-vaisselle":"Dishwasher","Four":"Oven","Frigo et congélateur":"Fridge and freezer","Télé et décodeur":"TV and set-top box","Sèche-chaussures & gants":"Boot and glove dryer","Catégorie dédiée":"Dedicated category","Livebox":"Livebox","Nom du réseau (SSID)":"Network name (SSID)","Astuce":"Tip","Connectez-vous rapidement en flashant le QR code dédié affiché dans l'appartement.":"Connect quickly by scanning the dedicated QR code displayed in the apartment.","Allumez":"Switch on","Appuyez sur le bouton Marche/Arrêt, tout à gauche du bandeau.":"Press the On/Off button at the far left of the control panel.","Ajoutez le produit":"Add detergent","Placez la pastille de lavage dans le bac à l'intérieur de la porte, puis refermez le clapet.":"Place a dishwasher tablet in the compartment inside the door, then close the lid.","Choisissez le programme":"Choose a cycle","Naviguez avec les touches < P et P >. Le programme recommandé est":"Scroll using the < P and P > buttons. The recommended cycle is","Heures creuses (facultatif)":"Off-peak hours (optional)","Appuyez sur la touche Horloge pour régler le nombre d'heures avant le démarrage. Calez le départ entre 14 h 40 et 17 h 10, ou entre 1 h 10 et 6 h 40.":"Press the Clock button to set how many hours to delay the start. Set it to start between 14 h 40 and 17 h 10, or between 1 h 10 and 6 h 40.","Lancez":"Start","Appuyez sur Start, puis refermez fermement la porte.":"Press Start, then close the door firmly.","En cas de mauvaise manipulation, maintenez la touche Start enfoncée pendant 3 secondes pour réinitialiser le cycle.":"If you make a mistake, hold down Start for 3 seconds to reset the cycle.","Four électrique":"Electric oven","Mode de cuisson":"Cooking mode",", bouton de gauche :":", left-hand dial:","Chaleur tournante":"Fan-assisted","Pour cuire sur plusieurs niveaux ou réchauffer rapidement.":"For cooking on multiple shelves or reheating quickly.","Convection naturelle":"Conventional heat","Haut et bas. Idéal pour gâteaux, rôtis et tartes.":"Top and bottom heat. Ideal for cakes, roasts, and pies.","Grill":"Grill","Pour gratiner en fin de cuisson.":"For browning at the end of cooking.","Réglez la température":"Set the temperature","Bouton de droite : tournez jusqu'à la température voulue, par exemple 180 °C. Le voyant lumineux reste allumé pendant le préchauffage.":"Right-hand dial: turn it to the desired temperature, for example 180 °C. The indicator light stays on while the oven preheats.","Éteignez":"Switch off","Remettez les deux boutons sur la position 0 après utilisation.":"Turn both dials back to 0 after use.","Important":"Important","Merci de ne pas activer l'auto-nettoyage (pyrolyse).":"Please do not use the self-cleaning (pyrolysis) function.","Réfrigérateur et congélateur":"Fridge and freezer","4 °C":"4 °C","Réfrigérateur":"Fridge","−18 °C":"−18 °C","Congélateur":"Freezer","Les températures sont préréglées de façon optimale. Merci de ne pas modifier les réglages.":"The temperatures are optimally preset. Please do not change the settings.","Bac du bas":"Bottom drawer","Zone fraîche : viande, poisson et légumes frais.":"Fresh zone: meat, fish, and fresh vegetables.","Clayettes du haut":"Upper shelves","Produits laitiers, plats cuisinés et boissons.":"Dairy products, ready meals, and drinks.","Bonne pratique":"Good to know","Ne collez pas les aliments directement contre les parois du fond.":"Do not place food directly against the back wall.","Télévision et décodeur":"TV and set-top box","Allumez la télé":"Turn on the TV","Avec la télécommande TCL, touche marche/arrêt.":"Use the On/Off button on the TCL remote.","Allumez le décodeur":"Turn on the set-top box","Avec la télécommande Orange, touche marche/arrêt.":"Use the On/Off button on the Orange remote.","Chaîne et volume":"Channels and volume","Utilisez uniquement la télécommande Orange : touches P+ et P−, ou pavé numérique.":"Use the Orange remote only: the P+ and P− buttons or the number pad.","Pas de signal ou écran noir ?":"No signal or a black screen?","Appuyez sur la touche Source (Input) de la télécommande TCL et sélectionnez HDMI 1.":"Press the Source (Input) button on the TCL remote and select HDMI 1.","Sèche-chaussures et gants":"Boot and glove dryer","Séchage mural avec minuterie":"Wall-mounted dryer with timer","Installez":"Place your items","Insérez les chaussures de ski ou les gants sur les tubes verticaux, pointe vers le haut.":"Place ski boots or gloves on the vertical tubes, toes pointing up.","Mettez sous tension":"Switch on","Actionnez l'interrupteur latéral On/Off. Le voyant LED rouge s'allume.":"Use the side On/Off switch. The red LED lights up.","Réglez la minuterie":"Set the timer","Durée recommandée de 2 à 3 heures après la skiade, idéalement sur les heures creuses (1 h 10 – 6 h 40 ou 14 h 40 – 17 h 10).":"Recommended drying time is 2 to 3 hours after skiing, ideally during off-peak hours (1 h 10 – 6 h 40 or 14 h 40 – 17 h 10).","Règle d'or":"Golden rule","Consommation douce de 20 W par paire. Merci de ne pas modifier les réglages de base de la minuterie.":"Low energy use: 20 W per pair. Please do not change the timer’s default settings.","Copropriété et bonnes manières":"Building rules and good manners","Quelques règles pour que tout le monde y soit bien":"A few rules to make everyone’s stay enjoyable","Animaux":"Pets","Chiens de moyenne et petite taille admis. Interdiction formelle de les faire monter sur les lits et les canapés.":"Small and medium-sized dogs are welcome. They must not be allowed on the beds or sofas.","Poubelles":"Rubbish","Des conteneurs (moloks) sont à votre disposition à l'entrée de la résidence, juste à côté de la barrière.":"Waste containers (moloks) are available at the residence entrance, right next to the barrier.","Ménage":"Cleaning","Le ménage de fin de séjour est compris dans le prix. Laissez l'appartement dans un état convenable et videz les poubelles avant de partir.":"End-of-stay cleaning is included in the price. Please leave the apartment in a reasonable condition and empty the bins before you leave.","Local":"Storage room","Vérifiez la fermeture du placard à skis après utilisation.":"Close the storage room and lock the storage unit after each use.","Ne pas activer l'auto-nettoyage (pyrolyse).":"Do not use the self-cleaning (pyrolysis) function.","Frigo":"Fridge","Les réglages de température sont préréglés : merci de ne pas les modifier.":"The temperature settings are preset: please do not change them.","Tout ce qui est à votre disposition":"Everything provided for your use","Pièce par pièce, pour que chacun sache où chercher et ce qui doit rester sur place.":"Room by room, so you know where to find things and what should stay in the apartment.","Séjour":"Living room","Mobilier":"Furniture","Canapé":"Sofa","Table à manger et chaises":"Dining table and chairs","Meuble TV":"TV stand","Télévision TCL":"TCL television","Décodeur TV Orange avec ses télécommandes":"Orange TV set-top box and remotes","Cuisine et repas":"Kitchen and dining","Électroménager":"Appliances","Réfrigérateur et congélateur SMEG":"SMEG fridge and freezer","Four électrique Electrolux":"Electrolux electric oven","Plaque de cuisson":"Cooktop","Hotte aspirante":"Extractor hood","Lave-vaisselle Candy Rapido'":"Candy Rapido' dishwasher","Vaisselle":"Dishes","Assiettes plates, creuses et à dessert":"Dinner, soup, and dessert plates","Bols, tasses et verres (eau, vin)":"Bowls, cups, and glasses (water, wine)","Couverts complets : fourchettes, couteaux, cuillères à soupe et à café":"Full set of cutlery: forks, knives, tablespoons, and teaspoons","Ustensiles":"Kitchen utensils","Poêles, casseroles, plats à gratin, saladier, passoire":"Frying pans, saucepans, oven dishes, salad bowl, and colander","Ouvre-boîtes, tire-bouchon, économe, spatules":"Can opener, corkscrew, peeler, and spatulas","Chambres et coin nuit":"Bedrooms and sleeping area","Literie":"Bedding","Lits avec matelas, oreillers, traversins et couettes pour chaque couchage":"Beds with mattresses, pillows, bolsters, and duvets for each sleeping space","Rangement":"Storage","Placards ou étagères":"Closets or shelves","Salle de bains et toilettes":"Bathroom and toilet","Douche ou baignoire":"Shower or bathtub","Lavabo et miroir":"Sink and mirror","Divers":"Other","Tapis de bain":"Bath mat","Poubelle de salle de bains":"Bathroom bin","Entrée et ski":"Entrance and ski gear","Porte-manteaux":"Coat hooks","Meuble à chaussures":"Shoe rack","Séchage":"Drying","Sèche-chaussures et gants mural avec minuterie":"Wall-mounted boot and glove dryer with timer","Cet inventaire a été réalisé avec soin avant votre arrivée. En cas de casse ou d'élément manquant, merci de le signaler rapidement à la conciergerie ou aux propriétaires.":"This inventory was carefully checked before your arrival. Please promptly report any damage or missing items to the concierge or the owners.","La station autour de vous":"Explore the resort","Quelques repères pour organiser vos journées.":"A few tips to help you plan your days.","Dans la station":"In the resort","Les remontées":"Lifts","Vérifiez les dates et horaires officiels des remontées avant votre sortie.":"Check the official lift dates and opening times before setting out.","Forfaits de ski":"Ski passes","Aux caisses des remontées mécaniques ou en ligne. Prenez-les dès la veille pour partir tôt.":"Buy them at the lift ticket offices or online. Get them the day before so you can set off early.","Location de matériel":"Equipment rental","Skis, snowboard, casque. En vacances scolaires, réservez à l'avance.":"Skis, snowboard, helmet. Book ahead during school holidays.","Remontées et glacier":"Lifts and glacier","Ouverture selon les dates de l'été : vérifiez les horaires avant de partir.":"Opening dates vary throughout the summer: check the schedule before you go.","Location de VTT":"Mountain bike rental","Vélos et protections à louer sur place. Réservez en juillet et août.":"Bikes and protective gear are available to rent locally. Book in July and August.","Autour de la station":"Around the resort","Randonnées":"Hiking","Sentiers balisés au départ de la station. Emportez de l'eau et une veste, il fait frais en altitude.":"Marked trails start from the resort. Bring water and a jacket; it can be cool at altitude.","Commerces":"Shops","Boulangerie et supérette en centre-station. Faites vos courses avant la fermeture du soir.":"There’s a bakery and convenience store in the resort center. Do your shopping before they close for the evening.","Restaurants et terrasses":"Restaurants and terraces","Réservez le soir pendant les vacances scolaires.":"Book ahead for dinner during school holidays.","Secours en montagne":"Mountain rescue","Pour un accident en montagne, appelez le 112.":"For a mountain accident, call 112.","Plan officiel":"Official map","Le plan interactif des [[NOM_STATION]]":"The interactive map of [[NOM_STATION]]","Repérez les parkings, les navettes, les remontées, les commerces et les différents secteurs de la station.":"Find parking, shuttles, lifts, shops, and the different areas of the resort.","Ouvrir le plan interactif officiel →":"Open the official interactive map →","Le plan officiel bloque l’affichage intégré dans cette page. Il s’ouvre en toute sécurité dans un nouvel onglet.":"The official map prevents it from being displayed within this page. It will open securely in a new tab.","Ouvrir le plan →":"Open the map →","Navettes gratuites":"Free shuttles","Bus On Time":"Bus On Time","Consultez les horaires et les informations utiles pour vos déplacements dans la station.":"Check the schedules and useful information for getting around the resort.","Infos navettes officielles":"Official shuttle information","Horaires en temps réel":"Live schedules","En direct":"Live","Météo et conditions de la station":"Weather and resort conditions","Consultez les informations officielles avant de sortir : météo, webcams, neige et ouvertures.":"Check the official updates before heading out: weather, webcams, snow, and openings.","Mise à jour en ligne":"Updated online","Météo du jour aux [[NOM_STATION]]":"Today’s weather in [[NOM_STATION]]","Chargement de la météo…":"Loading weather…","Bulletin officiel":"Official report","Webcams":"Webcams","Météo des [[NOM_STATION]]":"[[NOM_STATION]] weather","Prévisions et bulletin météo officiel de la station.":"The resort’s official forecast and weather report.","Voir la météo →":"View the weather →","Images en direct":"Live images","Regardez les conditions réelles dans la station et sur le domaine.":"See current conditions in the resort and ski area.","Voir les webcams →":"View the webcams →","Domaine skiable":"Ski area","Pistes et remontées":"Runs and lifts","Ouvertures, horaires et état du domaine en temps réel.":"Live updates on openings, schedules, and ski area conditions.","Pistes ouvertes":"Open runs","Remontées":"Lifts","Sécurité montagne":"Mountain safety","Neige et risque avalanche":"Snow and avalanche risk","Vérifiez l’enneigement et le bulletin officiel avant toute sortie.":"Check snow conditions and the official report before heading out.","Hauteur de neige":"Snow depth","Risque avalanche":"Avalanche risk","Mon séjour":"My stay","La liste « Aujourd’hui »":"The “Today” list","Une petite checklist pratique à cocher chaque jour. Elle est enregistrée sur cet appareil.":"A handy little checklist to tick off each day. It’s saved on this device.","Météo du jour vérifiée":"Checked today’s weather","Navettes disponibles vérifiées":"Checked available shuttles","Remontées ouvertes vérifiées":"Checked which lifts are open","Heure de fermeture des pistes vérifiée":"Checked the piste closing time","Activités ouvertes repérées":"Found open activities","Restaurant conseillé choisi":"Chosen a recommended restaurant","Sèche-chaussures programmé au retour":"Set the boot dryer for when you return","0 sur 7 faits":"0 of 7 done","Assistance":"Help","Choisissez le type de problème et préparez un message pour la conciergerie.":"Choose the type of problem and prepare a message for the concierge.","Type de problème":"Type of problem","Sélectionner…":"Select…","Problème avec le Wi-Fi":"Wi-Fi problem","Problème avec le chauffage":"Heating problem","Appareil qui ne fonctionne pas":"Appliance not working","Objet cassé ou manquant":"Broken or missing item","Problème dans le garage":"Garage problem","Autre":"Other","Expliquez le problème":"Describe the problem","Préparer l’e-mail à la conciergerie":"Prepare an email to the concierge","À utiliser en cas de besoin":"For emergencies","Pour une urgence vitale, appelez directement le 112 ou le 15. Pour un incident sur les pistes, contactez les secours via le 112.":"For a life-threatening emergency, call 112 or 15 directly. For an incident on the slopes, contact the emergency services on 112.","Urgences européennes / secours montagne":"European emergency number / mountain rescue","SAMU":"SAMU","Pompiers":"Fire service","Police":"Police","Maison de Santé":"Medical Center","Adresse exacte":"Exact address","[[ADRESSE_LOGEMENT]]":"[[ADRESSE_LOGEMENT]]","Votre avis":"Your review","Votre séjour s'est bien passé ? Dites-le aux prochains voyageurs.":"Enjoy your stay? Let future guests know.","Laisser un avis":"Leave a review","Choisissez une catégorie, laissez votre note et enregistrez votre commentaire. Le formulaire reste discret pour ne pas surcharger la page.":"Choose a category, give a rating, and save your comment. The form stays tucked away so the page remains uncluttered.","Ouvrir le formulaire d’avis":"Open the review form","Votre prénom":"Your first name","Catégorie":"Category","Appartement":"Apartment","Propreté":"Cleanliness","Localisation":"Location","Communication":"Communication","Station":"Resort","Restaurants et activités":"Restaurants and activities","Votre note générale":"Your overall rating","★★★★★ — Excellent":"★★★★★ — Excellent","★★★★☆ — Très bien":"★★★★☆ — Very good","★★★☆☆ — Bien":"★★★☆☆ — Good","★★☆☆☆ — Moyen":"★★☆☆☆ — Average","★☆☆☆☆ — À améliorer":"★☆☆☆☆ — Needs improvement","Notez chaque aspect":"Rate each aspect","★★★★★":"★★★★★","★★★★☆":"★★★★☆","★★★☆☆":"★★★☆☆","★★☆☆☆":"★★☆☆☆","★☆☆☆☆":"★☆☆☆☆","Enregistrer mon avis":"Save my review","Aucun avis enregistré pour le moment.":"No reviews yet.","Questions fréquentes":"Frequently asked questions","Comment me connecter au Wi-Fi ?":"How do I connect to the Wi-Fi?","Le nom du réseau et le mot de passe sont en haut de cette page. Vous pouvez aussi flasher le QR code affiché dans l'appartement.":"The network name and password are at the top of this page. You can also scan the QR code displayed in the apartment.","Où ranger mes skis ?":"Where can I store my skis?","Au placard à skis, au niveau des garages. Vérifiez bien sa fermeture après utilisation.":"In the ski room on the residence garage level. You can use our private storage unit there. Close the room and lock the unit after each use.","Où ranger mon matériel d'été ?":"Where can I store my summer gear?","Un placard à skis est à votre disposition au niveau des garages pour votre équipement. Vérifiez bien sa fermeture après utilisation. Si vous avez besoin de plus de place, écrivez-nous.":"There’s a private storage unit for your gear in the garage storage room. Close the room and lock the unit after each use. If you need more space, email us.","Combien de temps faire sécher mes chaussures de ski ?":"How long should I dry my ski boots for?","Comptez 2 à 3 heures après la skiade, idéalement sur les heures creuses : de 1 h 10 à 6 h 40 ou de 14 h 40 à 17 h 10. Ne modifiez pas les réglages de base de la minuterie.":"Allow 2 to 3 hours after skiing, ideally during off-peak hours: from 1 h 10 to 6 h 40 or from 14 h 40 to 17 h 10. Do not change the timer’s default settings.","À quel moment lancer le lave-vaisselle ?":"When should I run the dishwasher?","Quand vous voulez. Pour économiser l'énergie, programmez-le sur les heures creuses : de 14 h 40 à 17 h 10 ou de 1 h 10 à 6 h 40. Le programme recommandé est P1 Eco.":"Whenever you like. To save energy, set it to run during off-peak hours: from 14 h 40 to 17 h 10 or from 1 h 10 to 6 h 40. The recommended cycle is P1 Eco.","Les chiens sont-ils acceptés ?":"Are dogs allowed?","Oui, les chiens de moyenne et petite taille. Ils n'ont pas le droit de monter sur les lits et les canapés.":"Yes, small and medium-sized dogs are welcome. They are not allowed on the beds or sofas.","Où jeter mes poubelles ?":"Where should I take the rubbish?","Dans les conteneurs (moloks) à l'entrée de la résidence, juste à côté de la barrière. Videz les poubelles de l'appartement avant votre départ.":"Use the waste containers (moloks) at the residence entrance, right next to the barrier. Empty the apartment bins before you leave.","Dois-je faire le ménage avant de partir ?":"Do I need to clean before I leave?","Non, le ménage de fin de séjour est compris dans le prix. Laissez simplement l'appartement dans un état convenable et videz les poubelles.":"No, end-of-stay cleaning is included in the price. Just leave the apartment in a reasonable condition and empty the bins.","Un objet est cassé ou manque, que faire ?":"What should I do if something is broken or missing?","Signalez-le rapidement à la conciergerie ou aux propriétaires, par message. Cela évite tout malentendu à la fin du séjour.":"Please promptly report it by message to the concierge or the owners. This helps avoid any misunderstandings at the end of your stay.","Faut-il des équipements pour la voiture en hiver ?":"Do I need winter equipment for my car?","Oui. En zone de montagne, pneus hiver ou chaînes sont obligatoires du 1":"Yes. In mountain areas, winter tires or chains are mandatory from 1","er":"st","novembre au 31 mars. Vérifiez l'état des routes avant de partir.":"November to 31 March. Check the road conditions before setting off.","Qui contacter en cas de problème ?":"Who should I contact if there’s a problem?","La conciergerie ([[NOM_CONCIERGERIE]]) ou les propriétaires, [[NOM_HOTES]], par e-mail. Pour une urgence, voyez les numéros en bas de page.":"Email the concierge ([[NOM_CONCIERGERIE]]) or the owners, [[NOM_HOTES]]. For emergencies, see the numbers at the bottom of the page.","Départ":"Departure","Avant de fermer la porte":"Before you lock up","Le ménage est compris. Il reste quelques gestes, cochez-les au fur et à mesure.":"Cleaning is included. There are just a few things to do—tick them off as you go.","Vider les poubelles dans les moloks, à côté de la barrière":"Empty the rubbish into the moloks next to the barrier","Laisser l'appartement dans un état convenable":"Leave the apartment in a reasonable condition","Remettre les deux boutons du four sur 0":"Turn both oven dials back to 0","Récupérer vos affaires de ski et vérifier la fermeture du placard à skis":"Collect your ski gear, close the storage room, and lock the unit","Récupérer votre matériel et vérifier la fermeture du placard à skis":"Collect your gear, close the storage room, and lock the unit","Signaler toute casse ou tout élément manquant aux propriétaires":"Report any damage or missing items to the owners","Une question ?":"Any questions?","Écrivez à vos hôtes ou à la conciergerie, ils vous répondent dès que possible.":"Email your hosts or the concierge; they’ll get back to you as soon as possible.","Propriétaires":"Owners","[[NOM_CONCIERGERIE]]":"[[NOM_CONCIERGERIE]]","Contact local pour tout problème sur place.":"Local contact for any problems during your stay.","Urgences":"Emergencies","· urgences européennes":"· European emergency number","· Police":"· Police","· Pompiers":"· Fire service","· SAMU":"· SAMU","Merci d'avoir choisi le [[NOM_RESIDENCE]], appartement [[NUMERO_LOGEMENT]]. Excellent séjour aux [[NOM_STATION]] !":"Thank you for choosing [[NOM_RESIDENCE]], apartment [[NUMERO_LOGEMENT]]. Enjoy your stay in [[NOM_STATION]]!","Accueil":"Home","Guide logement":"Apartment guide","Guide station":"Resort guide","Guide du logement":"Apartment guide","Guide de la station":"Resort guide","Votre séjour au [[NOM_RESIDENCE]]":"Your stay at [[NOM_RESIDENCE]]","Navigation principale mobile":"Mobile main navigation","Actualités":"Updates","Le logement":"The apartment","La station":"The resort","Explorer [[NOM_STATION]]":"Explore [[NOM_STATION]]","La station, à votre rythme.":"The resort, at your own pace.","Activités, météo, navettes et bonnes adresses pour profiter de chaque journée en montagne.":"Activities, weather, shuttles and local tips to make the most of each day in the mountains.","Voir les activités":"Explore activities","Météo & conditions":"Weather & conditions","Votre séjour":"Your stay","Le guide de l’appartement [[NUMERO_LOGEMENT]].":"Your guide to apartment [[NUMERO_LOGEMENT]].","Arrivée, équipements et conseils pratiques pour vous installer sereinement.":"Arrival, amenities and practical tips to help you settle in.","Préparer mon arrivée":"Plan my arrival","Voir les équipements":"View amenities","Adresse":"Address","À consulter pendant votre séjour":"Useful during your stay","Choisissez votre guide":"Choose your guide","Choisissez le guide du logement ou de la station pour accéder directement aux informations utiles.":"Choose the apartment or resort guide to go straight to the information you need.","Chaque page rassemble les informations utiles à un moment différent de votre séjour.":"Each page brings together the information you need at a different point in your stay.","01 · Appartement":"01 · Apartment","02 · [[NOM_STATION]]":"02 · [[NOM_STATION]]","Le logement et le guide pratique":"The apartment and practical guide","Arrivée, équipements, règles et checklist réunis dans un espace dédié.":"Arrival, amenities, house rules and checklists in one dedicated place.","Les activités et la station":"Activities and the resort","Ski, randonnées, navettes, météo et bonnes adresses à portée de main.":"Skiing, hiking, shuttles, weather and local tips, all in one place.","Ouvrir le guide du logement →":"Open the apartment guide →","Ouvrir le guide de la station →":"Open the resort guide →","La remontée principale dépend de la station et de la saison.":"The main lift depends on the resort and the season.","Choisissez votre langue":"Choose your language","Sélectionnez la langue à utiliser sur le site.":"Select the language you want to use on the site.","Actualité du logement":"Apartment update","[[TITRE_ACTUALITE_FR]]":"[[TITRE_ACTUALITE_EN]]","[[TEXTE_ACTUALITE_FR]]":"[[TEXTE_ACTUALITE_EN]]","[[ALT_PHOTO_ACTUALITE_FR]]":"[[ALT_PHOTO_ACTUALITE_EN]]","Remontées et pistes":"Lifts and slopes","Voir l’état des pistes et des remontées en direct →":"View live slope and lift status →","Préparer une randonnée":"Plan a hike","Voir les itinéraires de randonnée →":"View hiking trails →","Vélos et protections à louer sur place.":"Bikes and protective gear are available to rent on site.","De nombreux commerces sont présents dans toute la station, du début à la fin et au centre.":"Shops are spread throughout the resort, from one end to the other, including the centre.","Restaurants et terrasses sont présents partout dans la station. Pensez à réserver pendant les vacances scolaires.":"Restaurants and terraces are spread across the resort. Reservations are recommended during school holidays."};
  Object.assign(fullEnglishTranslations, { 'Conciergerie':'Concierge', 'Acheter un forfait →':'Buy a ski pass →', 'Contact local pour tout problème sur place.':'Local contact for any issue during your stay.', 'Forfaits de ski':'Ski passes', 'Les forfaits peuvent s’acheter aux caisses des remontées ou en ligne sur le site officiel.':'Ski passes can be bought at the lift ticket offices or online on the official website.', 'Acheter un forfait de ski en ligne →':'Buy a ski pass online →' });
  var interfaceEnglishTranslations = { 'Sections':'Sections', 'Saison':'Season', 'Wi-Fi et infos du séjour':'Wi-Fi and stay information', 'Accès rapide':'Quick access', 'Paysages de la saison':'Seasonal landscapes', 'Paysage précédent':'Previous landscape', 'Paysage suivant':'Next landscape', 'Actions rapides sur mobile':'Quick mobile actions', 'Appareils':'Appliances', 'Ouvrir le plan interactif officiel des [[NOM_STATION]] dans un nouvel onglet':'Open the official interactive map of [[NOM_STATION]] in a new tab', 'Décrivez ce qui se passe…':'Describe what is happening…', 'Ex. Sophie':'E.g. Sophie', 'Partagez votre expérience…':'Share your experience…' };
  Object.assign(fullEnglishTranslations, { 'Au niveau des garages':'At garage level', 'Garage':'Garage', 'Placard à skis au niveau du garage':'Ski cupboard available in the apartment', 'placard à skis':'ski cupboard', 'Le placard à skis':'The ski cupboard', 'Le placard à skis se trouve au niveau des garages de la résidence. Vérifiez bien sa fermeture après chaque utilisation.':'The ski cupboard is in the apartment.', 'Rangez vos skis dans le placard à skis':'Store your skis in the ski cupboard', 'Vos skis ont leur place dans le placard à skis':'Your skis belong in the ski cupboard', 'Vérifiez la fermeture du placard à skis après utilisation.':'Close the ski cupboard after use.', 'Récupérer vos affaires de ski et vérifier la fermeture du placard à skis':'Collect your ski gear and close the ski cupboard', 'Récupérer votre matériel et vérifier la fermeture du placard à skis':'Collect your gear and close the ski cupboard', 'Au placard à skis, au niveau des garages. Vérifiez bien sa fermeture après utilisation.':'In the ski cupboard in the apartment. Close it after use.', 'Un placard à skis disponible':'A ski cupboard is available', 'Le placard à skis':'The ski cupboard', 'placard à skis disponible':'ski cupboard available' });
  Object.assign(fullEnglishTranslations, { 'Au niveau des garages':'At garage level', 'Garage':'Garage', 'Rangement des skis':'Ski storage', 'Un placard à skis au niveau du garage':'A ski cupboard in the apartment', 'Dans l’appartement':'In the apartment', 'Le placard à skis est à votre disposition au niveau des garages de la résidence. Vérifiez bien sa fermeture après chaque utilisation.':'The ski cupboard is available in the apartment.', 'Votre équipement de ski peut être rangé en toute sécurité dans le placard à skis au niveau des garages.':'Your ski equipment can be stored safely in the apartment ski cupboard.', 'Votre équipement peut être rangé en toute sécurité dans le placard à skis au niveau des garages.':'Your equipment can be stored safely in the apartment ski cupboard.', 'Vérifiez la fermeture après utilisation':'Close after use', 'Vérifiez bien la fermeture du placard à skis après chaque utilisation, pour garder votre matériel en sécurité.':'Please close the ski cupboard after each use to keep your equipment safe.' });
  Object.assign(fullEnglishTranslations, { 'Au niveau des garages':'At garage level', 'Garage':'Garage', 'Placard à skis':'Ski cupboard', 'Au placard à skis, au niveau des garages. Vérifiez bien sa fermeture après utilisation.':'In the ski cupboard in the apartment. Close it after use.' });
  Object.assign(fullEnglishTranslations, { 'Au niveau des garages':'At garage level', 'Garage':'Garage', 'Placard à skis au niveau du garage':'Ski cupboard at garage level', 'Un placard à skis au niveau du garage':'A ski cupboard at garage level', 'Le placard à skis se trouve au niveau des garages de la résidence. Vérifiez bien sa fermeture après chaque utilisation.':'The ski cupboard is at garage level. Make sure it is properly closed after each use.', 'Le placard à skis est à votre disposition au niveau des garages pour ranger votre équipement en sécurité. Vérifiez bien sa fermeture après chaque utilisation.':'The ski cupboard is available at garage level for your equipment. Make sure it is properly closed after each use.', 'Le placard à skis est à votre disposition au niveau des garages de la résidence. Vérifiez bien sa fermeture après chaque utilisation.':'The ski cupboard is available at the residence garage level. Make sure it is properly closed after each use.', 'Au placard à skis, au niveau des garages. Vérifiez bien sa fermeture après utilisation.':'At the ski cupboard on the garage level. Make sure it is properly closed after use.', 'Au placard à skis, au niveau des garages.':'At the ski cupboard on the garage level.', 'Vérifiez bien la fermeture du placard à skis après chaque utilisation, pour garder votre matériel en sécurité.':'Make sure the ski cupboard is properly closed after each use to keep your equipment safe.', 'Récupérer vos affaires de ski et vérifier la fermeture du placard à skis':'Collect your ski gear and check that the ski cupboard is closed', 'Récupérer votre matériel et vérifier la fermeture du placard à skis':'Collect your equipment and check that the ski cupboard is closed', 'Vérifiez la fermeture après utilisation':'Check that it is closed after use', 'Vérifiez la fermeture du placard à skis après utilisation.':'Check that the ski cupboard is closed after use.' });
  Object.assign(fullEnglishTranslations, { 'Votre e-mail (facultatif)':'Your email (optional)', 'Adresse e-mail':'Email address', 'Envoi de votre avis…':'Sending your review…', 'Envoi de votre signalement…':'Sending your report…', 'Merci, votre avis a été envoyé et enregistré sur cet appareil.':'Thank you, your review has been sent and saved on this device.', 'Votre signalement a été envoyé à la conciergerie.':'Your report has been sent to the concierge.', 'L’avis n’a pas pu être envoyé. Veuillez réessayer.':'The review could not be sent. Please try again.', 'Le signalement n’a pas pu être envoyé. Veuillez réessayer.':'The report could not be sent. Please try again.' });
  Object.assign(fullEnglishTranslations, { 'Laisser le chauffage réglé à 19 °C':'Leave the heating set to 19°C' });
  Object.assign(fullEnglishTranslations, {
    'Appartement [[NUMERO_LOGEMENT]]':'Apartment [[NUMERO_LOGEMENT]]', 'Actualités':'Updates', 'Le logement':'The apartment', 'Guide pratique':'Practical guide', 'La station':'The resort',
    '[[NOM_RESIDENCE]]':'[[NOM_RESIDENCE]]', '· Appartement [[NUMERO_LOGEMENT]]':'· Apartment [[NUMERO_LOGEMENT]]', 'Un séjour au cœur des [[NOM_STATION]]':'A stay in the heart of [[NOM_STATION]]', 'Votre refuge alpin aux [[NOM_STATION]].':'Your Alpine retreat in [[NOM_STATION]].',
    'Un appartement au cœur de la station, pensé pour profiter pleinement de la montagne et se sentir chez soi.':'An apartment in the heart of the resort, designed to enjoy the mountains and feel at home.',
    'Découvrir le livret':'Explore the guest guide', 'Les nouveautés':'What’s new', 'La vie de l’appartement':'Apartment updates',
    'Nouveautés & améliorations':'News & improvements', 'Retrouvez ici les changements apportés au logement : nouveaux équipements, aménagements et informations pratiques.':'Find updates about the apartment here: new equipment, improvements, and practical information.',
    'Le fil des nouveautés':'Latest updates', 'Les informations seront partagées ici':'Updates will be shared here',
    '[[NOM_HOTES]] mettront cette rubrique à jour au fil des évolutions de l’appartement, pour que vous disposiez des informations les plus récentes avant et pendant votre séjour.':'The hosts will update this section as the apartment evolves, so you have the latest information before and during your stay.',
    'À portée de main':'At a glance', 'Infos pratiques':'Practical information'
  });
  Object.assign(fullEnglishTranslations, {
    '7 emplacements pour vos photos':'7 photo slots', 'Votre appartement':'Your apartment', 'Remplacez cette image par votre photo.':'Replace this image with your photo.', 'Salon':'Living room', 'Cuisine':'Kitchen', 'Chambre':'Bedroom', 'Lits superposés':'Bunk beds', 'Salle de bains':'Bathroom', 'Balcon':'Balcony', 'Vue extérieure':'Exterior view',
    'Machine à laver':'Washing machine', 'À compléter':'To be completed', 'Radiateur':'Heater', 'Chauffage':'Heating',
    'Marque à compléter':'Brand to be completed', 'Chargez le linge':'Load the laundry', 'Ne surchargez pas le tambour et vérifiez les poches avant de fermer le hublot.':'Do not overload the drum and check the pockets before closing the door.',
    'Ajoutez la lessive':'Add detergent', "Placez la lessive dans le bac prévu à cet effet et ajoutez éventuellement l'adoucissant.":'Put detergent in the appropriate drawer and add fabric softener if needed.',
    'Sélectionnez le programme adapté au linge, puis vérifiez la température avant de lancer le cycle.':'Choose the right programme for the laundry, then check the temperature before starting the cycle.',
    'Vérifiez que le hublot est bien fermé.':'Check that the door is properly closed.', 'Laissez le hublot entrouvert après utilisation pour aérer le tambour.':'Leave the door slightly open after use to air the drum.',
    'Radiateur':'Heater', 'Allumez':'Switch on', 'Utilisez le bouton ou le thermostat du radiateur pour le mettre en marche.':'Use the radiator button or thermostat to switch it on.',
    'Choisissez une température confortable et évitez de régler le chauffage au maximum.':'Choose a comfortable temperature and avoid setting the heating to maximum.',
    'Avant de partir':'Before you leave', 'Ramenez le réglage à une température basse et vérifiez que rien ne couvre le radiateur.':'Set it to a low temperature and make sure nothing is covering the radiator.',
    'Ne couvrez jamais le radiateur et ne placez pas de meuble ou de linge contre lui.':'Never cover the radiator or place furniture or laundry against it.'
  });
  /* Textes simplifiés FR/EN */
  Object.assign(fullEnglishTranslations, {
  "Choisissez une langue": "Choose a language",
  "Choisissez la langue du site.": "Choose the site language.",
  "Langue": "Language",
  "Que souhaitez-vous consulter ?": "What would you like to see?",
  "Consultez le guide du logement ou celui de la station.": "Open the apartment or resort guide.",
  "Nouveautés": "What’s new",
  "Découvrez les changements apportés à l’appartement.": "See what’s new in the apartment.",
  "[[TITRE_ACTUALITE_FR]]": "[[TITRE_ACTUALITE_EN]]",
  "[[TEXTE_ACTUALITE_FR]]": "[[TEXTE_ACTUALITE_EN]]",
  "À retenir": "Quick facts",
  "Photos de l’appartement": "Apartment photos",
  "La table dressée": "Set dining table",
  "La cuisine équipée": "Equipped kitchen",
  "Contactez vos hôtes ou la conciergerie. Ils vous répondront dès que possible.": "Contact your hosts or the concierge. They will reply as soon as possible.",
  "Contact local en cas de problème.": "Local contact if you have a problem.",
  "Merci d’avoir choisi l’appartement [[NUMERO_LOGEMENT]]. Bon séjour aux [[NOM_STATION]] !": "Thank you for choosing apartment [[NUMERO_LOGEMENT]]. Enjoy your stay in [[NOM_STATION]]!",
  "Guide de l’appartement [[NUMERO_LOGEMENT]]": "Apartment [[NUMERO_LOGEMENT]] guide",
  "Arrivée, appareils, règles et conseils pratiques.": "Arrival, appliances, rules, and practical tips.",
  "Bienvenue aux [[NOM_STATION]] ! Nous sommes heureux de vous accueillir dans notre appartement. En hiver, profitez de la neige et des activités de la station.": "Welcome to [[NOM_STATION]]! We are happy to welcome you. In winter, enjoy the snow and resort activities.",
  "Bienvenue aux [[NOM_STATION]] ! Nous sommes heureux de vous accueillir dans notre appartement. En été, profitez des balades et de la montagne.": "Welcome to [[NOM_STATION]]! We are happy to welcome you. In summer, enjoy walks and mountain scenery.",
  "Ce guide rassemble les informations utiles pour votre séjour : appareils, règles et conseils pratiques.": "This guide brings together useful information for your stay: appliances, rules, and practical tips.",
  "Une question ? Contactez la conciergerie ou écrivez-nous.": "Questions? Contact the concierge or email us.",
  "Votre arrivée, étape par étape": "Your arrival, step by step",
  "Suivez ces quatre étapes pour vous installer.": "Follow these four steps to settle in.",
  "Vérifiez la route avant de partir. En hiver, prévoyez": "Check road conditions before you leave. In winter, bring",
  "des pneus neige ou des chaînes": "winter tires or snow chains",
  ". Pour l’accès ou l’heure d’arrivée, écrivez-nous.": ". For access or arrival time, email us.",
  "La route de montagne est sinueuse.": "The mountain road is winding.",
  "Prévoyez assez de temps": "Allow enough time",
  "pour monter. Pour l’accès ou l’heure d’arrivée, écrivez-nous.": "for the drive up. For access or arrival time, email us.",
  "Les conteneurs (moloks) sont à l’entrée de la résidence, près de la barrière.": "The waste containers (moloks) are at the residence entrance, near the barrier.",
  "Rangement des skis": "Ski storage",
  "Le placard à skis se trouve au niveau des garages. Fermez-le bien après chaque usage.": "The ski cupboard is on the garage level. Close it securely after each use.",
  "Connectez-vous au Wi-Fi": "Connect to Wi-Fi",
  "Le réseau et le mot de passe sont en haut de la page. Vous pouvez aussi scanner le QR code dans l’appartement. Le guide ci-dessous explique les appareils.": "The network name and password are at the top of the page. You can also scan the QR code in the apartment. The guide below explains the appliances.",
  "Cochez ces points à votre arrivée.": "Tick these off when you arrive.",
  "Vérifiez les clés et l’accès": "Check the keys and access",
  "Vérifiez le chauffage": "Check the heating",
  "Vérifiez l’état de l’appartement": "Check the apartment condition",
  "Vérifiez les appareils et le matériel": "Check the appliances and equipment",
  "Signalez tout problème": "Report any problem",
  "Un placard pour vos skis": "A cupboard for your skis",
  "Votre espace de rangement": "Your storage space",
  "Le placard se trouve au niveau des garages. Fermez-le après chaque usage.": "The cupboard is on the garage level. Close it after each use.",
  "Rangez vos skis dans le placard, au niveau des garages.": "Store your skis in the cupboard on the garage level.",
  "Rangez votre matériel dans le placard, au niveau des garages.": "Store your gear in the cupboard on the garage level.",
  "Un espace pour votre matériel": "Space for your gear",
  "Fermez après chaque usage": "Close it after each use",
  "Fermez bien le placard après chaque usage.": "Close the cupboard securely after each use.",
  "Mode d’emploi des appareils": "How to use the appliances",
  "Choisissez un appareil et suivez les étapes.": "Choose an appliance and follow the steps.",
  "Guide rapide": "Quick guide",
  "Marque non précisée": "Brand not specified",
  "Scannez le QR code affiché dans l’appartement pour vous connecter.": "Scan the QR code in the apartment to connect.",
  "Appuyez sur Marche/Arrêt, à gauche du bandeau.": "Press On/Off on the left of the control panel.",
  "Placez une pastille dans le bac de la porte, puis fermez le clapet.": "Place a tablet in the door compartment, then close the lid.",
  "Utilisez les boutons < P et P > pour choisir un programme. Programme conseillé :": "Use the < P and P > buttons to choose a cycle. Recommended cycle:",
  "Départ différé (facultatif)": "Delayed start (optional)",
  "Appuyez sur Horloge pour choisir un départ en heures creuses : 14 h 40–17 h 10 ou 1 h 10–6 h 40.": "Press Clock to set a start during off-peak hours: 14:40–17:10 or 1:10–6:40.",
  "Appuyez sur Start, puis fermez bien la porte.": "Press Start, then close the door firmly.",
  "Pour réinitialiser le cycle, maintenez Start pendant 3 secondes.": "To reset the cycle, hold Start for 3 seconds.",
  "Pour cuire sur plusieurs niveaux ou réchauffer.": "For cooking on several shelves or reheating.",
  "Chaleur en haut et en bas. Pour gâteaux, rôtis et tartes.": "Top and bottom heat. For cakes, roasts, and pies.",
  "Tournez le bouton de droite jusqu’à la température voulue (ex. 180 °C). Le voyant reste allumé pendant le préchauffage.": "Turn the right dial to the temperature you want (e.g. 180 °C). The light stays on while the oven heats.",
  "Après usage, remettez les deux boutons sur 0.": "After use, turn both dials back to 0.",
  "N’utilisez pas le nettoyage par pyrolyse.": "Do not use the pyrolysis self-cleaning function.",
  "Les températures sont déjà réglées. Ne les modifiez pas.": "The temperatures are preset. Do not change them.",
  "Sur la télécommande TCL, appuyez sur Marche/Arrêt.": "Press On/Off on the TCL remote.",
  "Sur la télécommande Orange, appuyez sur Marche/Arrêt.": "Press On/Off on the Orange remote.",
  "Utilisez la télécommande Orange pour les chaînes et le volume. Pour changer de chaîne, appuyez sur P+ / P− ou utilisez le pavé numérique.": "Use the Orange remote for channels and volume. Change channels with P+ / P− or the number pad.",
  "Sur la télécommande TCL, appuyez sur Source (Input), puis choisissez HDMI 1.": "On the TCL remote, press Source (Input), then choose HDMI 1.",
  "Placez les chaussures de ski ou les gants sur les tubes, pointes vers le haut.": "Place ski boots or gloves on the tubes, toes pointing up.",
  "Basculez l’interrupteur On/Off sur le côté. Le voyant rouge s’allume.": "Use the side On/Off switch. The red light comes on.",
  "Faites sécher 2 à 3 heures après le ski, de préférence en heures creuses (1 h 10–6 h 40 ou 14 h 40–17 h 10).": "Dry items for 2 to 3 hours after skiing, preferably off-peak (1:10–6:40 or 14:40–17:10).",
  "Le sèche-chaussures consomme 20 W par paire. Ne modifiez pas la minuterie.": "The boot dryer uses 20 W per pair. Do not change the timer.",
  "Ne surchargez pas le tambour. Vérifiez les poches et fermez le hublot.": "Do not overload the drum. Check the pockets and close the door.",
  "Mettez la lessive dans le bac. Ajoutez de l’adoucissant si besoin.": "Put detergent in the drawer. Add fabric softener if needed.",
  "Choisissez le programme et la température adaptés au linge.": "Choose the right cycle and temperature for the laundry.",
  "Appuyez sur Start. Vérifiez que le hublot est bien fermé.": "Press Start. Check that the door is fully closed.",
  "Après usage, laissez le hublot entrouvert pour aérer le tambour.": "Leave the door slightly open after use to air the drum.",
  "Allumez le radiateur avec son bouton ou son thermostat.": "Switch on the radiator with its button or thermostat.",
  "Choisissez une température agréable. Évitez le maximum.": "Choose a comfortable temperature. Avoid the maximum setting.",
  "Avant de partir, baissez le chauffage. Ne couvrez pas le radiateur.": "Before leaving, turn the heating down. Do not cover the radiator.",
  "Ne couvrez pas le radiateur. N’y placez ni meuble ni linge.": "Do not cover the radiator or place furniture or laundry against it.",
  "Quelques règles pour bien vivre ensemble": "A few rules for a good stay",
  "Les petits et moyens chiens sont acceptés. Ils ne doivent pas monter sur les lits ni les canapés.": "Small and medium-sized dogs are allowed. They must stay off the beds and sofas.",
  "Les moloks sont à l’entrée de la résidence, près de la barrière.": "The moloks are at the residence entrance, near the barrier.",
  "Le ménage de fin de séjour est compris. Laissez l’appartement en bon état et videz les poubelles.": "End-of-stay cleaning is included. Leave the apartment in good condition and empty the bins.",
  "Fermez le placard à skis après usage.": "Close the ski cupboard after use.",
  "Les températures sont réglées. Ne les modifiez pas.": "The temperatures are preset. Do not change them.",
  "Équipements à votre disposition": "What is provided",
  "Retrouvez les équipements, pièce par pièce.": "See what is provided, room by room.",
  "Signalez rapidement toute casse ou tout objet manquant à la conciergerie ou aux propriétaires.": "Promptly report any damage or missing items to the concierge or the owners.",
  "Décrivez le problème. Votre message sera envoyé à la conciergerie.": "Describe the problem. Your message will be sent to the concierge.",
  "Envoyer le message à la conciergerie": "Send a message to the concierge",
  "Partagez votre avis avec les prochains voyageurs.": "Share your review with future guests.",
  "Choisissez une catégorie, donnez une note et ajoutez un commentaire.": "Choose a category, give a rating, and add a comment.",
  "Le réseau et le mot de passe sont en haut de la page. Vous pouvez aussi scanner le QR code dans l’appartement.": "The network name and password are at the top of the page. You can also scan the QR code in the apartment.",
  "Dans le local au niveau des garages. Fermez le placard après usage.": "In the storage room on the garage level. Close the cupboard after use.",
  "Utilisez le placard du garage pour votre matériel. Fermez-le après usage. Besoin de plus de place ? Écrivez-nous.": "Use the garage cupboard for your gear. Close it after use. Need more space? Email us.",
  "Faites sécher les chaussures 2 à 3 heures après le ski. Privilégiez les heures creuses : 1 h 10–6 h 40 ou 14 h 40–17 h 10. Ne changez pas la minuterie.": "Dry boots for 2 to 3 hours after skiing. Use off-peak hours if possible: 1:10–6:40 or 14:40–17:10. Do not change the timer.",
  "Vous pouvez le lancer à tout moment. Pour économiser, choisissez les heures creuses : 14 h 40–17 h 10 ou 1 h 10–6 h 40. Programme conseillé : P1 Eco.": "Run it whenever you like. To save energy, use off-peak hours: 14:40–17:10 or 1:10–6:40. Recommended cycle: P1 Eco.",
  "Oui, les petits et moyens chiens sont acceptés. Ils ne doivent pas monter sur les lits ni les canapés.": "Yes, small and medium-sized dogs are allowed. They must stay off the beds and sofas.",
  "Dans les moloks à l’entrée de la résidence, près de la barrière. Videz les poubelles avant votre départ.": "Use the moloks at the residence entrance, near the barrier. Empty the bins before you leave.",
  "Non, le ménage est compris. Laissez l’appartement en bon état et videz les poubelles.": "No, cleaning is included. Leave the apartment in good condition and empty the bins.",
  "Prévenez rapidement la conciergerie ou les propriétaires par message.": "Promptly message the concierge or the owners.",
  "Du 1<sup>er</sup> novembre au 31 mars, les pneus hiver ou les chaînes sont obligatoires. Vérifiez la route avant de partir.": "Winter tires or snow chains are required from 1 November to 31 March. Check road conditions before you leave.",
  "Contactez la conciergerie ([[NOM_CONCIERGERIE]]) ou les propriétaires, [[NOM_HOTES]], par e-mail. En urgence, appelez un numéro en bas de page.": "Email the concierge ([[NOM_CONCIERGERIE]]) or the owners, [[NOM_HOTES]]. In an emergency, call one of the numbers below.",
  "Le ménage est compris. Cochez ces gestes avant votre départ.": "Cleaning is included. Tick these off before you leave.",
  "Videz les poubelles dans les moloks, près de la barrière": "Empty the bins in the moloks near the barrier",
  "Laissez l’appartement en bon état": "Leave the apartment in good condition",
  "Remettez les deux boutons du four sur 0": "Turn both oven dials back to 0",
  "Laissez le chauffage à 19 °C": "Leave the heating at 19 °C",
  "Prenez vos affaires de ski et fermez le placard": "Take your ski gear and close the cupboard",
  "Récupérez votre matériel et fermez le placard": "Take your gear and close the cupboard",
  "Signalez toute casse ou tout objet manquant aux propriétaires": "Report damage or missing items to the owners",
  "La station à votre rythme": "The resort at your pace",
  "Activités, météo, navettes et bonnes adresses pour vos journées en montagne.": "Activities, weather, shuttles, and local tips for your days in the mountains.",
  "Quelques images pour préparer votre séjour.": "A few images to help you plan your stay.",
  "Quelques repères pour vos sorties.": "A few tips for getting around.",
  "Les remontées et leurs horaires dépendent de la station et de la saison.": "Lifts and their opening times depend on the resort and the season.",
  "Achetez vos forfaits aux caisses ou en ligne sur le site officiel.": "Buy ski passes at the ticket offices or on the official website.",
  "Acheter un forfait en ligne →": "Buy a ski pass online →",
  "Skis, snowboard et casques à louer dans la station.": "Skis, snowboards, and helmets are available to rent in the resort.",
  "Les horaires varient selon les dates. Vérifiez les pistes et remontées avant de partir.": "Opening times vary by date. Check the runs and lifts before you go.",
  "Les sentiers balisés partent de la station. Prenez de l’eau et une veste : il fait frais en altitude.": "Marked trails start from the resort. Bring water and a jacket; it can be cool at altitude.",
  "Vous trouverez des commerces partout : en bas, au centre et en haut de la station.": "Shops are spread throughout the resort, from the bottom to the centre and the top.",
  "Restaurants et terrasses sont partout. Réservez pendant les vacances scolaires.": "Restaurants and terraces are everywhere. Book during school holidays.",
  "Trouvez les parkings, navettes, remontées, commerces et quartiers de la station.": "Find car parks, shuttles, lifts, shops, and resort areas.",
  "La carte ne s’affiche pas ici. Elle s’ouvre dans un nouvel onglet.": "The map cannot be shown here. It opens in a new tab.",
  "Ouvrir la carte →": "Open the map →",
  "Consultez les horaires et les infos pour vos trajets dans la station.": "Check shuttle times and travel information for the resort.",
  "Avant de sortir, consultez la météo, les webcams, la neige et les ouvertures.": "Before you head out, check the weather, webcams, snow, and openings.",
  "Cochez les infos vérifiées. La liste reste enregistrée sur cet appareil.": "Tick off the information you have checked. The list is saved on this device.",
  "Météo vérifiée": "Weather checked",
  "Navettes vérifiées": "Shuttles checked",
  "Remontées vérifiées": "Lifts checked",
  "Heure de fermeture vérifiée": "Closing time checked",
  "Activités ouvertes repérées": "Open activities checked",
  "Restaurant choisi": "Restaurant chosen",
  "Sèche-chaussures programmé": "Boot dryer set",
  "En cas d’urgence vitale, appelez le 112 ou le 15. Sur les pistes, appelez le 112.": "For a life-threatening emergency, call 112 or 15. On the slopes, call 112."
});
  Object.assign(interfaceEnglishTranslations, { "Langue": "Language" });
  /* Traductions finales des textes simplifiés */
  /* Traductions photo et consignes courtes */
  Object.assign(fullEnglishTranslations, {
  "Faites sécher 2 à 3 h après le ski. Heures creuses : 1 h 10–6 h 40 ou 14 h 40–17 h 10.": "Dry items for 2 to 3 hours after skiing. Off-peak hours: 1:10–6:40 or 14:40–17:10.",
  "Comptez 2 à 3 h après le ski. Heures creuses : 1 h 10–6 h 40 ou 14 h 40–17 h 10. Ne changez pas la minuterie.": "Allow 2 to 3 hours after skiing. Off-peak hours: 1:10–6:40 or 14:40–17:10. Do not change the timer.",
  "Le salon de l’appartement": "Apartment living room",
  "Vue d’ensemble de l’appartement": "Apartment overview",
  "Escalier, table, canapé et cuisine en arrière-plan.": "Stairs, table, sofa, and kitchen in the background.",
  "La table, le canapé et la télévision": "Table, sofa, and television",
  "Vue de l’appartement depuis l’escalier": "View of the apartment from the stairs"
});
  Object.assign(fullEnglishTranslations, {
  "Bienvenue aux [[NOM_STATION]] ! Nous sommes heureux de vous accueillir. Profitez de la neige et des activités d’hiver.": "Welcome to [[NOM_STATION]]! We are happy to welcome you. Enjoy the snow and winter activities.",
  "Bienvenue aux [[NOM_STATION]] ! Nous sommes heureux de vous accueillir. Profitez des balades et de la montagne.": "Welcome to [[NOM_STATION]]! We are happy to welcome you. Enjoy the walks and mountain scenery.",
  "Infos Wi-Fi en haut de page. Scannez le QR code dans l’appartement. Consultez le guide des appareils ci-dessous.": "Wi-Fi details are at the top of the page. Scan the QR code in the apartment. See the appliance guide below.",
  "Avec Horloge, programmez un départ en heures creuses : 14 h 40–17 h 10 ou 1 h 10–6 h 40.": "Use Clock to set a start during off-peak hours: 14:40–17:10 or 1:10–6:40.",
  "Utilisez la télécommande Orange pour les chaînes et le volume. Changez de chaîne avec P+ / P− ou le pavé numérique.": "Use the Orange remote for channels and volume. Change channels with P+ / P− or the number pad.",
  "Faites sécher 2 à 3 heures après le ski. Heures creuses : 1 h 10–6 h 40 ou 14 h 40–17 h 10.": "Dry items for 2 to 3 hours after skiing. Off-peak hours: 1:10–6:40 or 14:40–17:10.",
  "Faites sécher les chaussures 2 à 3 heures après le ski. Heures creuses : 1 h 10–6 h 40 ou 14 h 40–17 h 10. Ne changez pas la minuterie.": "Dry boots for 2 to 3 hours after skiing. Off-peak hours: 1:10–6:40 or 14:40–17:10. Do not change the timer.",
  "Lancez-le quand vous voulez. Heures creuses : 14 h 40–17 h 10 ou 1 h 10–6 h 40. Programme : P1 Eco.": "Run it whenever you like. Off-peak hours: 14:40–17:10 or 1:10–6:40. Cycle: P1 Eco.",
  "Location de skis, snowboards et casques. Réservez à l’avance pendant les vacances scolaires.": "Skis, snowboards, and helmets for rent. Book ahead during school holidays.",
  "Du 1": "From 1",
  "novembre au 31 mars, les pneus hiver ou les chaînes sont obligatoires. Vérifiez la route avant de partir.": "November to 31 March, winter tires or snow chains are required. Check road conditions before you leave.",
  "Lancez le cycle": "Start the cycle"
});
  /* Footer credit translations */
  Object.assign(fullEnglishTranslations, {
    'Site créé par': 'Site created by',
    '© [[ANNEE]] [[NOM_RESIDENCE]] · Appartement [[NUMERO_LOGEMENT]].': '© [[ANNEE]] [[NOM_RESIDENCE]] · Apartment [[NUMERO_LOGEMENT]].',
    'Tous droits réservés.': 'All rights reserved.',
    'Logo Écrin Web — création de sites web.': 'Écrin Web logo — website design.'
  });
  function normalizeTranslationMap(map) {
    var normalized = Object.create(null);
    Object.keys(map).forEach(function (key) { normalized[key.replace(/\s+/g, ' ').trim()] = map[key]; });
    return normalized;
  }
  var normalizedFullEnglishTranslations = normalizeTranslationMap(fullEnglishTranslations);
  var normalizedInterfaceEnglishTranslations = normalizeTranslationMap(interfaceEnglishTranslations);
  function translateAllText(lang) {
    document.querySelectorAll('body *').forEach(function (el) { Array.prototype.forEach.call(el.childNodes, function (node) {
      if (node.nodeType !== 3) return;
      if (node.__frText === undefined) node.__frText = node.nodeValue;
      var raw = node.__frText, key = raw.replace(/\s+/g, ' ').trim();
      if (!key) return;
      var translated = lang === 'en' ? (fullEnglishTranslations[key] || normalizedFullEnglishTranslations[key] || key) : key;
      var lead = raw.match(/^\s*/)[0], trail = raw.match(/\s*$/)[0];
      node.nodeValue = lead + translated + trail;
    });
    ['aria-label','placeholder','title','alt'].forEach(function (attr) { if (!el.hasAttribute(attr)) return; var rawAttr = el.getAttribute(attr); if (!el.__frAttrs) el.__frAttrs = {}; if (el.__frAttrs[attr] === undefined) el.__frAttrs[attr] = rawAttr; var keyAttr = el.__frAttrs[attr], normalizedAttr = keyAttr.replace(/\s+/g, ' ').trim(); el.setAttribute(attr, lang === 'en' ? (interfaceEnglishTranslations[keyAttr] || normalizedInterfaceEnglishTranslations[normalizedAttr] || fullEnglishTranslations[keyAttr] || normalizedFullEnglishTranslations[normalizedAttr] || keyAttr) : keyAttr); });
    });
  }
  function setLanguage(lang) { root.setAttribute('data-lang', lang); document.documentElement.lang = lang === 'en' ? 'en' : 'fr'; translateAllText(lang); if (typeof renderWeather === 'function') renderWeather(); if (typeof updateProgress === 'function') updateProgress(); langButtons.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-lang-btn') === lang ? 'true' : 'false'); }); try { localStorage.setItem('site-lang', lang); } catch (e) {} }
  langButtons.forEach(function (b) { b.addEventListener('click', function () { setLanguage(b.getAttribute('data-lang-btn')); }); });
  var savedLang = 'fr'; try { savedLang = localStorage.getItem('site-lang') || 'fr'; } catch (e) {} setLanguage(savedLang);


  /* Météo du jour : mode local, consulter le lien officiel de la station. */
  var weatherSummary = document.getElementById('weather-summary'), weatherValue = document.getElementById('weather-value');
  var weatherLabelsFr = { 0:'Ciel dégagé', 1:'Plutôt dégagé', 2:'Partiellement nuageux', 3:'Couvert', 45:'Brouillard', 48:'Brouillard givrant', 51:'Bruine', 61:'Pluie faible', 63:'Pluie', 65:'Forte pluie', 71:'Neige faible', 73:'Neige', 75:'Forte neige', 80:'Averses', 81:'Averses soutenues', 82:'Fortes averses', 95:'Orage' };
  var weatherLabelsEn = { 0:'Clear sky', 1:'Mainly clear', 2:'Partly cloudy', 3:'Overcast', 45:'Fog', 48:'Freezing fog', 51:'Light drizzle', 61:'Light rain', 63:'Rain', 65:'Heavy rain', 71:'Light snow', 73:'Snow', 75:'Heavy snow', 80:'Rain showers', 81:'Heavy showers', 82:'Violent showers', 95:'Thunderstorm' };
  var weatherDataCache = null;
  function renderWeather() { if (!weatherDataCache || !weatherSummary) return; var c = weatherDataCache.current, d = weatherDataCache.daily, en = root.getAttribute('data-lang') === 'en', labels = en ? weatherLabelsEn : weatherLabelsFr; weatherValue.textContent = Math.round(c.temperature_2m) + ' °C'; weatherSummary.textContent = (labels[c.weather_code] || (en ? 'Variable conditions' : 'Conditions variables')) + (en ? ' · feels like ' : ' · ressentie ') + Math.round(c.apparent_temperature) + ' °C' + (en ? ' · wind ' : ' · vent ') + Math.round(c.wind_speed_10m) + ' km/h · ' + (en ? 'high ' : 'max ') + Math.round(d.temperature_2m_max[0]) + ' °C / ' + (en ? 'low ' : 'min ') + Math.round(d.temperature_2m_min[0]) + ' °C'; }
  if (weatherSummary) weatherSummary.textContent = root.getAttribute('data-lang') === 'en' ? 'Check the resort’s official forecast.' : 'Consultez les prévisions officielles de la station.';

  /* Onglets du guide des appareils — délégation pour inclure les éléments ajoutés au configurateur. */
  function tabsInDom() { return Array.prototype.slice.call(document.querySelectorAll('.tab[role="tab"]')); }
  function selectTab(tab, focus) {
    tabsInDom().forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      var panel = document.getElementById(t.getAttribute('aria-controls'));
      if (panel) panel.hidden = !on;
    });
    if (focus && tab) tab.focus();
  }
  function visibleTabs() { return tabsInDom().filter(function (t) { return t.offsetParent !== null && !t.closest('[hidden]'); }); }
  document.addEventListener('click', function (e) {
    var tab = e.target.closest && e.target.closest('.tab[role="tab"]');
    if (tab && tab.closest('[role="tablist"]')) selectTab(tab, false);
  });
  document.addEventListener('keydown', function (e) {
    var tab = e.target.closest && e.target.closest('.tab[role="tab"]');
    if (!tab || !tab.closest('[role="tablist"]')) return;
    var v = visibleTabs(), i = v.indexOf(tab), n = -1;
    if (!v.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') n = (i + 1) % v.length;
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') n = (i - 1 + v.length) % v.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = v.length - 1;
    if (n > -1) { e.preventDefault(); selectTab(v[n], true); }
  });
  function fixTabs() {
    var visible = visibleTabs();
    if (!visible.length) return;
    var sel = tabsInDom().filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0];
    if (!sel || visible.indexOf(sel) < 0) selectTab(visible[0], false);
  }

  /* Les compteurs suivent les cases présentes, y compris celles ajoutées dans le configurateur. */
  var progress = document.getElementById('progress');
  function updateProgress() {
    var en = root.getAttribute('data-lang') === 'en';
    function count(selector, output, completeFr, completeEn) {
      if (!output) return;
      var total = 0, done = 0;
      document.querySelectorAll(selector).forEach(function (box) {
        var item = box.closest('li');
        if (item && item.offsetParent === null) return;
        total++; if (box.checked) done++;
      });
      output.textContent = (total && done === total) ? (en ? completeEn : completeFr) : (en ? done + ' of ' + total + ' done' : done + ' sur ' + total + ' faits');
    }
    count('#checklist input[type="checkbox"]', progress, 'Tout est fait, bon retour !', 'Everything is done — have a safe trip home!');
    count('#arrival-list input[type="checkbox"]', document.getElementById('arrival-progress'), 'Installation terminée !', 'You are all set!');
    count('#today-list input[type="checkbox"]', document.getElementById('today-progress'), 'Tout est prêt pour aujourd’hui !', 'Everything is ready for today!');
  }
  document.addEventListener('change', function (e) {
    if (e.target.matches && e.target.matches('#checklist input[type="checkbox"], #arrival-list input[type="checkbox"], #today-list input[type="checkbox"]')) updateProgress();
  });

  /* Effet saisonnier : neige l'hiver, soleil l'été */
  var cv = document.getElementById('fx');
  var ctx = cv.getContext('2d');
  var hero = cv.parentNode;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W = 0, H = 0, t = 0, raf = 0, visible = true;
  var flakes = [], dust = [];

  function rnd() { return Math.random(); }

  function seed() {
    var n = Math.round(Math.min(170, Math.max(40, W / 7)));
    flakes = [];
    for (var i = 0; i < n; i++) {
      var r = 1 + rnd() * 3.2;
      flakes.push({ x: rnd() * W, y: rnd() * H, r: r, v: 0.35 + r * 0.28, ph: rnd() * 6.28, a: 0.35 + rnd() * 0.5 });
    }
    dust = [];
    for (var j = 0; j < 36; j++) {
      dust.push({ x: rnd() * W, y: rnd() * H, r: 0.8 + rnd() * 2, v: 0.12 + rnd() * 0.3, ph: rnd() * 6.28, a: 0.2 + rnd() * 0.5 });
    }
  }

  function size() {
    var r = hero.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
    draw();
  }

  function drawWinter() {
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < flakes.length; i++) {
      var f = flakes[i];
      if (!reduce) {
        f.y += f.v;
        f.x += Math.sin(t * 0.6 + f.ph) * 0.35;
        if (f.y > H + 6) { f.y = -6; f.x = rnd() * W; }
        if (f.x > W + 6) f.x = -6; else if (f.x < -6) f.x = W + 6;
      }
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, 6.2832);
      ctx.fillStyle = 'rgba(255,255,255,' + f.a + ')';
      ctx.fill();
    }
  }

  function drawSummer() {
    ctx.clearRect(0, 0, W, H);
    var cx = W * (W < 700 ? 0.82 : 0.78), cy = H * (W < 700 ? 0.13 : 0.2);
    var R = W < 700 ? 34 : 50;
    var glowR = Math.max(W, H) * 0.7;
    var g = ctx.createRadialGradient(cx, cy, R * 0.5, cx, cy, glowR);
    g.addColorStop(0, 'rgba(255,214,102,0.55)');
    g.addColorStop(0.35, 'rgba(255,200,90,0.16)');
    g.addColorStop(1, 'rgba(255,200,90,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    var rot = reduce ? 0 : t * 0.04;
    var rays = 16;
    for (var i = 0; i < rays; i++) {
      var a = rot + i * (6.2832 / rays);
      var len = (i % 2 ? 1.5 : 2.4) * R * 2.2;
      var w = 0.07;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a - w) * R * 1.35, cy + Math.sin(a - w) * R * 1.35);
      ctx.lineTo(cx + Math.cos(a) * (R * 1.35 + len), cy + Math.sin(a) * (R * 1.35 + len));
      ctx.lineTo(cx + Math.cos(a + w) * R * 1.35, cy + Math.sin(a + w) * R * 1.35);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,224,138,0.16)';
      ctx.fill();
    }

    var d = ctx.createRadialGradient(cx - R * 0.25, cy - R * 0.25, R * 0.1, cx, cy, R);
    d.addColorStop(0, '#FFF1B8');
    d.addColorStop(1, '#FFC24A');
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.2832);
    ctx.fillStyle = d; ctx.fill();

    for (var k = 0; k < dust.length; k++) {
      var p = dust[k];
      if (!reduce) {
        p.y -= p.v;
        p.x += Math.sin(t * 0.5 + p.ph) * 0.25;
        if (p.y < -4) { p.y = H + 4; p.x = rnd() * W; }
      }
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832);
      ctx.fillStyle = 'rgba(255,230,150,' + (p.a * (0.6 + 0.4 * Math.sin(t * 1.2 + p.ph))) + ')';
      ctx.fill();
    }
  }

  function draw() {
    if (root.getAttribute('data-season') === 'summer') drawSummer(); else drawWinter();
  }

  function loop() {
    t += 0.016;
    draw();
    raf = requestAnimationFrame(loop);
  }
  function start() {
    cancelAnimationFrame(raf);
    if (reduce || !visible || document.hidden) { draw(); return; }
    raf = requestAnimationFrame(loop);
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting; start();
    }).observe(hero);
  }
  document.addEventListener('visibilitychange', start);
  window.addEventListener('resize', size);

  /* Rotation automatique des paysages : plusieurs photos, mais toujours dans la saison active. */
  var seasonPhotos = {
    winter: ['./montagne-pistes.jpg', './village-montagne.jpg'],
    spring: ['./montagne-printemps.jpg', './montagne-randonnee.jpg'],
    summer: ['./montagne-randonnee.jpg', './montagne-printemps.jpg'],
    autumn: ['./montagne-automne-3.jpg', './montagne-automne-2.jpg', './montagne-automne-hero.webp']
  };
  var seasonPhotoIndex = { winter: 0, spring: 0, summer: 0, autumn: 0 };
  var scrollFrame = 0;
  function applySeasonPhoto(season) {
    var list = seasonPhotos[season] || seasonPhotos.winter;
    var src = list[seasonPhotoIndex[season] % list.length];
    root.style.setProperty('--hero-image', 'url("' + src + '")');
    root.style.setProperty('--site-bg', 'url("' + src + '")');
  }
  function updatePhotoFromScroll() {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(function () {
      var season = root.getAttribute('data-season') || 'winter';
      var list = seasonPhotos[season] || seasonPhotos.winter;
      var step = Math.max(520, Math.round(window.innerHeight * 0.78));
      var next = Math.floor(Math.max(0, window.scrollY) / step) % list.length;
      if (next !== seasonPhotoIndex[season]) {
        seasonPhotoIndex[season] = next;
        document.body.classList.add('photo-changing');
        setTimeout(function () { applySeasonPhoto(season); document.body.classList.remove('photo-changing'); }, 180);
        updatePhotoIndicator();
      }
      scrollFrame = 0;
    });
  }
  window.addEventListener('scroll', updatePhotoFromScroll, { passive: true });
  window.addEventListener('resize', updatePhotoFromScroll);

  function updatePhotoIndicator() {
    var season = root.getAttribute('data-season') || 'winter', list = seasonPhotos[season] || seasonPhotos.winter, indicator = document.getElementById('photo-indicator');
    if (indicator) indicator.textContent = (root.getAttribute('data-lang') === 'en' ? 'Landscape ' : 'Paysage ') + (seasonPhotoIndex[season] + 1) + ' / ' + list.length;
  }
  function movePhoto(delta) {
    var season = root.getAttribute('data-season') || 'winter', list = seasonPhotos[season] || seasonPhotos.winter;
    seasonPhotoIndex[season] = (seasonPhotoIndex[season] + delta + list.length) % list.length;
    document.body.classList.add('photo-changing');
    setTimeout(function () { applySeasonPhoto(season); document.body.classList.remove('photo-changing'); }, 180);
    updatePhotoIndicator();
  }
  document.querySelectorAll('[data-photo-prev]').forEach(function (b) { b.addEventListener('click', function () { movePhoto(-1); }); });
  document.querySelectorAll('[data-photo-next]').forEach(function (b) { b.addEventListener('click', function () { movePhoto(1); }); });

  /* Choix de la saison */
  var btns = document.querySelectorAll('[data-season-btn]');
  var validSeasons = ['winter', 'spring', 'summer', 'autumn'];
  function seasonForToday() {
    var now = new Date(), md = (now.getMonth() + 1) * 100 + now.getDate();
    return md >= 1221 || md <= 319 ? 'winter' : md <= 620 ? 'spring' : md <= 921 ? 'summer' : 'autumn';
  }
  function setSeason(s, save) {
    if (validSeasons.indexOf(s) < 0) s = seasonForToday();
    root.setAttribute('data-season', s);
    root.setAttribute('data-mode', s === 'winter' ? 'winter' : 'summer');
    seasonPhotoIndex[s] = 0;
    applySeasonPhoto(s);
    updatePhotoIndicator();
    var labels = root.getAttribute('data-lang') === 'en' ? { winter: 'Winter', spring: 'Spring', summer: 'Summer', autumn: 'Autumn' } : { winter: 'Hiver', spring: 'Printemps', summer: 'Été', autumn: 'Automne' };
    var label = document.getElementById('season-label');
    if (label) label.textContent = '· ' + labels[s];
    btns.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-season-btn') === s ? 'true' : 'false'); });
    fixTabs();
    updateProgress();
    draw(); start();
  }
  btns.forEach(function (b) {
    b.addEventListener('click', function () { setSeason(b.getAttribute('data-season-btn'), true); });
  });

  size();
  var initialSeason = root.getAttribute('data-season');
  setSeason(validSeasons.indexOf(initialSeason) >= 0 ? initialSeason : seasonForToday(), false);
  updatePhotoFromScroll();
})();


(function () {
  var gate = document.getElementById('language-gate');
  if (!gate) return;
  var completed = false;
  try { completed = localStorage.getItem('site-language-choice-v3') === 'done'; } catch (e) {}
  if (completed) {
    document.documentElement.setAttribute('data-language-gate', 'done');
    gate.hidden = true;
    return;
  }
  gate.querySelectorAll('[data-language-choice]').forEach(function (button) {
    button.addEventListener('click', function () {
      var language = button.getAttribute('data-language-choice');
      var languageButton = document.querySelector('[data-lang-btn="' + language + '"]');
      if (languageButton) languageButton.click();
      try { localStorage.setItem('site-language-choice-v3', 'done'); } catch (e) {}
      document.documentElement.setAttribute('data-language-gate', 'done');
      gate.hidden = true;
      var main = document.querySelector('main');
      if (main) { main.setAttribute('tabindex', '-1'); main.focus(); }
    });
  });
  var firstChoice = gate.querySelector('[data-language-choice="fr"]');
  if (firstChoice) firstChoice.focus();
})();
