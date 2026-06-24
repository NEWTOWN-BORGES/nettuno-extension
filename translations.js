/**
 * NETTUNO v4.0 - Internacionalização (i18n)
 * Deteta idioma automaticamente pelo domínio e traduz toda a UI + sinais.
 */

const SCM_I18N = {

  pt: {
    ui: {
      badge_risk: 'CAUTELA', badge_alert: 'SINAIS', badge_warning: 'ATENÇÃO', badge_safe: 'SEM ALERTAS', badge_trusted: 'BEM AVALIADO',
      disclaimer: 'Indicadores automáticos e votos da comunidade. Não são uma acusação nem uma garantia — verifica sempre antes de pagar.',
      tab_stats: '📊 SINAIS', tab_contact: '💬 CONTACTO', tab_interaction: '⚠️ INTERAÇÃO', tab_result: '📋 RESULTADO',
      stat_participants: 'PART.', stat_signals: 'SINAIS', stat_confidence: 'CONF.',
      community_signals: 'SINAIS DA COMUNIDADE', participants: 'PARTICIPANTES',
      no_signals: 'Ainda não há sinais comunitários registados.',
      no_category: 'Nenhum sinal disponível para esta categoria.',
      votes_label: 'VOTOS', sites_label: 'SITES',
      logout_btn: '🚪 TERMINAR SESSÃO',
      sync_info: 'Em breve: criar conta para sincronizar entre dispositivos.',
      logout_confirm: 'Tens a certeza que queres terminar sessão? O teu histórico local será apagado.',
      ad_space: 'Espaço publicitário', partner_badge: 'PARCEIRO',
      sign_in_btn: 'Entrar com Google',
      sign_in_prompt: 'Cria conta para votar e ajudar a comunidade.',
      verified_voter: '✓ VOTANTE VERIFICADO',
      vote_gate_msg: 'Entra para votar neste anúncio.'
    },
    signals: {
      unrealistic_price: 'Preço fora da realidade', ai_photos: 'Fotos geradas por IA',
      ai_generated_photos: 'Fotos geradas por IA', stolen_photos: 'Fotos roubadas / anúncio clonado',
      new_account: 'Conta nova / sem avaliações', answered_call: 'Atendeu chamada',
      trusted_seller: 'Vendedor confiável', success: 'Transação correu bem',
      scam: 'Burla confirmada', lost_money: 'Perdi dinheiro', suspicious: 'Suspeito',
      pressure_sale: 'Urgência / "tem outro comprador"', asked_personal_data: 'Pediu dados pessoais',
      redirected_chat: 'Redirecionou para WhatsApp/Telegram', unresponsive: 'Deixou de responder',
      never_arrived: 'Produto nunca chegou', wrong_item: 'Produto trocado / caixa vazia',
      as_described: 'Conforme descrito', fast_shipping: 'Envio rápido',
      payment_outside: 'Pagamento fora da plataforma',
      instant_reply: 'Respondeu em segundos', reposted_ad: 'Anúncio republicado várias vezes',
      fake_profile_pic: 'Foto de perfil falsa', bad_portuguese: 'Português traduzido',
      mbway_pressure: 'Insistiu em MBWay / transferência',
      fake_payment_link: 'Link de pagamento falso', fake_proof: 'Comprovativo de pagamento falso',
      abroad_excuse: '"Estou no estrangeiro / militar"', refused_meeting: 'Recusou encontro / videochamada',
      fake_invoice: 'Fatura / garantia falsa', accepted_meeting: 'Aceita encontro presencial',
      shows_invoice: 'Mostrou fatura / prova de compra', seller_vanished: 'Desapareceu após pagamento',
      courier_extra_fee: 'Transportadora cobrou taxa falsa', with_invoice: 'Veio com fatura / garantia',
      verified_seller: 'Vendedor de confiança',
      counterfeit_luxury: 'Artigo de luxo falsificado', no_measures: 'Sem medidas / etiqueta',
      bad_description: 'Descrição vaga / sem defeitos assinalados',
      good_reviews: 'Perfil com boas avaliações', verified_profile: 'Perfil verificado Vinted',
      fast_responses: 'Respostas rápidas e detalhadas', extra_photos: 'Enviou fotos extra a pedido',
      counterfeit_received: 'Recebi artigo falsificado', not_as_described: 'Artigo diferente do descrito',
      new_seller: 'Vendedor novo (< 30 dias)', low_feedback: 'Feedback baixo (< 95%)',
      high_shipping: 'Shipping excessivamente caro', asks_personal_data: 'Pediu dados pessoais',
      friends_family_payment: 'Pede "friends & family"',
      shipped_outside_eu: 'Enviado fora da UE (impostos escondidos)',
      prohibited_item: 'Produto proibido na região', gdpr_not_compliant: 'Sem GDPR compliance',
      seller_unresponsive: 'Vendedor sem resposta (> 24h)', item_not_arrived: 'Produto não chegou',
      tracking_dead: 'Tracking morto', dispute_lost: 'Dispute perdido / sem reembolso',
      responsive: 'Responde rápido e profissionalmente',
      tracking_updated: 'Tracking atualizado regularmente', top_rated: 'Top Rated Seller',
      counterfeit: 'Artigo falsificado',
      ml_fake_product: 'Produto falsificado', ml_payment_outside: 'Pagamento fora do Mercado Pago',
      ml_fake_seller: 'Vendedor falso', ml_bad_description: 'Descrição enganosa',
      ml_no_return: 'Sem política de devolução', ml_new_seller: 'Vendedor sem reputação',
      ml_gold_seller: 'Mercado Líder Gold', ml_platinum_seller: 'Mercado Líder Platinum',
      ml_fulfillment: 'Enviado pelo Mercado Envios', ml_item_not_arrived: 'Item não chegou',
      ml_different_item: 'Item diferente do anunciado', ml_counterfeit: 'Produto falsificado recebido',
      ml_dispute_won: 'Disputa ganha pelo comprador', ml_dispute_lost: 'Disputa perdida / sem reembolso',
      ml_success: 'Compra bem-sucedida', ml_scam: 'Golpe confirmado',
      ml_pix_redirect: 'Pediu Pix fora da plataforma', ml_boleto_fraud: 'Boleto falsificado',
      // Wallapop
      wp_no_wallapop_pay: 'Recusa Wallapop Pay (quer fora da app)', wp_fake_envio: '"Wallapop Envío" falso / link suspeito', wp_fake_link: 'Enviou link de pagamento falso',
      // leboncoin
      lbc_chatonly: 'Recusa contacto fora do chat', lbc_fake_protection: 'Link de "proteção" leboncoin suspeito', lbc_fake_delivery: 'Link de entrega fraudulento (Colissimo falso)',
      // Kleinanzeigen
      ka_only_chat: 'Recusa chamada / só chat', ka_sicherheitscheck: 'Link "Sicherheitscheck" enviado', ka_fake_schutz: 'Página de proteção de comprador falsa',
      // Subito
      sub_fake_protect: 'Link "Subito Protect" suspeito', sub_postepay: 'Pediu recarga PostePay fora da app',
      // eBay
      vague_description: 'Descrição vaga / sem detalhes', no_returns: 'Sem política de devoluções',
      good_feedback: 'Feedback excelente', fast_reply: 'Respondeu rapidamente',
      accepted_returns: 'Aceita devoluções', fake_reviews: 'Avaliações suspeitas / compradas',
      third_party_seller: 'Vendedor terceiro sem histórico'
    }
  },

  en: {
    ui: {
      badge_risk: 'CAUTION', badge_alert: 'SIGNALS', badge_warning: 'CHECK', badge_safe: 'NO FLAGS', badge_trusted: 'WELL-RATED',
      disclaimer: 'Automated indicators and community votes. Not an accusation nor a guarantee — always verify before paying.',
      tab_stats: '📊 SIGNALS', tab_contact: '💬 CONTACT', tab_interaction: '⚠️ INTERACTION', tab_result: '📋 RESULT',
      stat_participants: 'PART.', stat_signals: 'SIGNALS', stat_confidence: 'CONF.',
      community_signals: 'COMMUNITY SIGNALS', participants: 'PARTICIPANTS',
      no_signals: 'No community signals recorded yet.',
      no_category: 'No signals available for this category.',
      votes_label: 'VOTES', sites_label: 'SITES',
      logout_btn: '🚪 LOG OUT',
      sync_info: 'Coming soon: create an account to sync across devices.',
      sign_in_btn: 'Sign in with Google',
      sign_in_prompt: 'Create an account to vote and help the community.',
      verified_voter: '✓ VERIFIED VOTER',
      vote_gate_msg: 'Sign in to vote on this listing.',
      logout_confirm: 'Are you sure you want to log out? Your local history will be deleted.',
      ad_space: 'Ad space', partner_badge: 'PARTNER'
    },
    signals: {
      unrealistic_price: 'Price too low to be real', ai_photos: 'AI-generated photos',
      ai_generated_photos: 'AI-generated photos', stolen_photos: 'Stolen/cloned photos',
      new_account: 'New account / no reviews', answered_call: 'Answered phone call',
      trusted_seller: 'Trusted seller', success: 'Transaction went well',
      scam: 'Confirmed scam', lost_money: 'Lost money', suspicious: 'Suspicious',
      pressure_sale: 'Urgency / "buy now"', asked_personal_data: 'Asked for personal data',
      redirected_chat: 'Redirected to WhatsApp/Telegram', unresponsive: 'Stopped responding',
      never_arrived: 'Item never arrived', wrong_item: 'Wrong item / empty box',
      as_described: 'As described', fast_shipping: 'Fast shipping',
      payment_outside: 'Payment outside platform',
      instant_reply: 'Instant reply (bot?)', reposted_ad: 'Ad reposted multiple times',
      fake_profile_pic: 'Fake profile picture', bad_portuguese: 'Machine-translated text',
      mbway_pressure: 'Insisted on instant transfer',
      fake_payment_link: 'Fake payment link', fake_proof: 'Fake payment proof',
      abroad_excuse: '"I\'m abroad / in the military"', refused_meeting: 'Refused meeting / video call',
      fake_invoice: 'Fake invoice/warranty', accepted_meeting: 'Accepted in-person meeting',
      shows_invoice: 'Showed invoice/proof of purchase', seller_vanished: 'Vanished after payment',
      courier_extra_fee: 'Courier charged fake fee', with_invoice: 'Came with invoice/warranty',
      verified_seller: 'Verified trusted seller',
      counterfeit_luxury: 'Counterfeit luxury item', no_measures: 'No measurements or label',
      bad_description: 'Vague description / no defects listed',
      good_reviews: 'Profile with good reviews', verified_profile: 'Verified Vinted profile',
      fast_responses: 'Fast and detailed responses', extra_photos: 'Sent extra photos on request',
      counterfeit_received: 'Received counterfeit item', not_as_described: 'Item not as described',
      new_seller: 'New seller (< 30 days)', low_feedback: 'Low seller feedback (< 95%)',
      high_shipping: 'Excessively high shipping cost', asks_personal_data: 'Asked for personal info',
      friends_family_payment: 'Requested "friends & family" payment',
      shipped_outside_eu: 'Shipped from outside EU (hidden customs)',
      prohibited_item: 'Item prohibited in this region', gdpr_not_compliant: 'No GDPR compliance (EU)',
      seller_unresponsive: 'Seller unresponsive (> 24h)', item_not_arrived: 'Item not arrived',
      tracking_dead: 'Dead tracking / disappeared', dispute_lost: 'Dispute lost / no refund',
      responsive: 'Quick & professional responses',
      tracking_updated: 'Tracking updated regularly', top_rated: 'Top Rated Seller',
      counterfeit: 'Counterfeit item',
      // Idealista / Default platform signals
      no_photos: 'No photos', doesnt_answer: 'Does not answer',
      number_off_or_fake: 'Number disconnected/fake', seen_no_reply: 'Seen without reply',
      replied_messages: 'Replied to messages', visit_done: 'Visited the property',
      clear_communication: 'Clear communication', refused_visit: 'Refused visit',
      wrong_location: 'Wrong location', stopped_responding: 'Stopped responding',
      asked_money_upfront: 'Asked for money upfront', redirected_convo: 'Redirected conversation',
      // Wallapop
      wp_no_wallapop_pay: 'Refuses Wallapop Pay (wants outside payment)', wp_fake_envio: 'Suspicious "Wallapop Envío" / fake link', wp_fake_link: 'Sent fake payment link',
      // leboncoin
      lbc_chatonly: 'Refuses contact outside chat', lbc_fake_protection: 'Suspicious "buyer protection" link', lbc_fake_delivery: 'Fake delivery link (fake Colissimo)',
      // Kleinanzeigen
      ka_only_chat: 'Refuses call / chat only', ka_sicherheitscheck: 'Sent "Sicherheitscheck" link', ka_fake_schutz: 'Fake buyer protection page',
      // Subito
      sub_fake_protect: 'Suspicious "Subito Protect" link', sub_postepay: 'Asked for PostePay top-up outside app',
      // eBay
      vague_description: 'Vague description / no details', no_returns: 'No returns policy',
      good_feedback: 'Excellent seller feedback', fast_reply: 'Replied quickly',
      accepted_returns: 'Accepts returns', fake_reviews: 'Suspicious / paid reviews',
      third_party_seller: 'Third-party seller with no history'
    }
  },

  de: {
    ui: {
      badge_risk: 'VORSICHT', badge_alert: 'HINWEISE', badge_warning: 'PRÜFEN', badge_safe: 'KEINE HINWEISE', badge_trusted: 'GUT BEWERTET',
      disclaimer: 'Automatische Hinweise und Community-Stimmen. Keine Anschuldigung, keine Garantie — vor dem Bezahlen prüfen.',
      tab_stats: '📊 SIGNALE', tab_contact: '💬 KONTAKT', tab_interaction: '⚠️ INTERAKTION', tab_result: '📋 ERGEBNIS',
      stat_participants: 'TEILN.', stat_signals: 'SIGNALE', stat_confidence: 'KONF.',
      community_signals: 'GEMEINSCHAFTSSIGNALE', participants: 'TEILNEHMER',
      no_signals: 'Noch keine gemeinschaftlichen Signale aufgezeichnet.',
      no_category: 'Keine Signale für diese Kategorie verfügbar.',
      votes_label: 'STIMMEN', sites_label: 'SEITEN',
      logout_btn: '🚪 ABMELDEN',
      sync_info: 'Demnächst: Konto erstellen, um geräteübergreifend zu synchronisieren.',
      sign_in_btn: 'Mit Google anmelden',
      sign_in_prompt: 'Erstelle ein Konto, um zu abstimmen und die Community zu unterstützen.',
      verified_voter: '✓ VERIFIZIERTER WÄHLER',
      vote_gate_msg: 'Anmelden, um für dieses Angebot abzustimmen.',
      logout_confirm: 'Möchtest du dich wirklich abmelden? Dein lokaler Verlauf wird gelöscht.',
      ad_space: 'Werbefläche', partner_badge: 'PARTNER'
    },
    signals: {
      unrealistic_price: 'Unrealistischer Preis', ai_photos: 'KI-generierte Fotos',
      ai_generated_photos: 'KI-generierte Fotos', stolen_photos: 'Gestohlene Fotos / geklontes Inserat',
      new_account: 'Neues Konto / keine Bewertungen', answered_call: 'Anruf beantwortet',
      trusted_seller: 'Vertrauenswürdiger Verkäufer', success: 'Transaktion erfolgreich',
      scam: 'Betrug bestätigt', lost_money: 'Geld verloren', suspicious: 'Verdächtig',
      pressure_sale: 'Kaufdruck / "sofort kaufen"', asked_personal_data: 'Persönliche Daten verlangt',
      redirected_chat: 'Auf WhatsApp/Telegram weitergeleitet', unresponsive: 'Keine Antwort mehr',
      never_arrived: 'Artikel nie angekommen', wrong_item: 'Falscher Artikel erhalten',
      as_described: 'Wie beschrieben', fast_shipping: 'Schneller Versand',
      payment_outside: 'Zahlung außerhalb der Plattform',
      instant_reply: 'Sofortige Antwort (Bot?)', reposted_ad: 'Inserat mehrfach neu eingestellt',
      fake_profile_pic: 'Falsches Profilfoto', bad_portuguese: 'Maschinell übersetzter Text',
      mbway_pressure: 'Auf Sofortüberweisung bestanden',
      fake_payment_link: 'Gefälschter Zahlungslink', fake_proof: 'Gefälschter Zahlungsbeleg',
      abroad_excuse: '"Ich bin im Ausland / beim Militär"', refused_meeting: 'Treffen / Videoanruf abgelehnt',
      fake_invoice: 'Gefälschte Rechnung/Garantie', accepted_meeting: 'Persönliches Treffen akzeptiert',
      shows_invoice: 'Rechnung/Kaufnachweis gezeigt', seller_vanished: 'Nach Zahlung verschwunden',
      courier_extra_fee: 'Kurier berechnete gefälschte Gebühr', with_invoice: 'Mit Rechnung/Garantie geliefert',
      verified_seller: 'Verifizierter Verkäufer',
      counterfeit_luxury: 'Gefälschter Luxusartikel', no_measures: 'Keine Maße oder Etiketten',
      bad_description: 'Vage Beschreibung / keine Mängel aufgelistet',
      good_reviews: 'Profil mit guten Bewertungen', verified_profile: 'Verifiziertes Vinted-Profil',
      fast_responses: 'Schnelle und detaillierte Antworten', extra_photos: 'Auf Anfrage zusätzliche Fotos',
      counterfeit_received: 'Gefälschten Artikel erhalten', not_as_described: 'Artikel nicht wie beschrieben',
      new_seller: 'Neuer Verkäufer (< 30 Tage)', low_feedback: 'Niedrige Bewertung (< 95%)',
      high_shipping: 'Übermäßig hohe Versandkosten', asks_personal_data: 'Persönliche Daten angefordert',
      friends_family_payment: '"Freunde & Familie"-Zahlung verlangt',
      shipped_outside_eu: 'Versand außerhalb der EU (versteckte Zölle)',
      prohibited_item: 'In dieser Region verbotener Artikel', gdpr_not_compliant: 'Kein DSGVO-Compliance',
      seller_unresponsive: 'Verkäufer antwortet nicht (> 24h)', item_not_arrived: 'Artikel nicht angekommen',
      tracking_dead: 'Tracking tot / verschwunden', dispute_lost: 'Streitfall verloren / keine Erstattung',
      responsive: 'Schnelle und professionelle Antworten',
      tracking_updated: 'Tracking regelmäßig aktualisiert', top_rated: 'Top-bewerteter Verkäufer',
      counterfeit: 'Gefälschter Artikel',
      no_photos: 'Keine Fotos', doesnt_answer: 'Antwortet nicht',
      number_off_or_fake: 'Nummer getrennt/falsch', seen_no_reply: 'Gelesen, keine Antwort',
      replied_messages: 'Hat Nachrichten beantwortet', visit_done: 'Immobilie besichtigt',
      clear_communication: 'Klare Kommunikation', refused_visit: 'Besichtigung abgelehnt',
      wrong_location: 'Falscher Standort', stopped_responding: 'Keine Antwort mehr',
      asked_money_upfront: 'Anzahlung verlangt', redirected_convo: 'Gespräch weitergeleitet',
      // Kleinanzeigen
      ka_only_chat: 'Verweigert Telefonat / nur Chat', ka_sicherheitscheck: '"Sicherheitscheck"-Link verschickt', ka_fake_schutz: 'Gefälschte Käuferschutz-Seite',
      // Wallapop / leboncoin (fallback DE)
      wp_no_wallapop_pay: 'Verweigert In-App-Zahlung', wp_fake_envio: 'Verdächtiger Versandlink', wp_fake_link: 'Gefälschten Zahlungslink geschickt',
      lbc_chatonly: 'Verweigert Kontakt außerhalb Chat', lbc_fake_protection: 'Verdächtiger "Käuferschutz"-Link', lbc_fake_delivery: 'Gefälschter Lieferlink',
      sub_fake_protect: 'Verdächtiger Schutzlink', sub_postepay: 'PostePay-Aufladung außerhalb App verlangt',
      // eBay
      vague_description: 'Vage Beschreibung / keine Details', no_returns: 'Keine Rückgabemöglichkeit',
      good_feedback: 'Hervorragendes Verkäuferfeedback', fast_reply: 'Schnell geantwortet',
      accepted_returns: 'Akzeptiert Rücksendungen', fake_reviews: 'Verdächtige / gekaufte Bewertungen',
      third_party_seller: 'Drittanbieter ohne Verlauf'
    }
  },

  fr: {
    ui: {
      badge_risk: 'PRUDENCE', badge_alert: 'SIGNAUX', badge_warning: 'À VÉRIFIER', badge_safe: 'AUCUN SIGNAL', badge_trusted: 'BIEN NOTÉ',
      disclaimer: 'Indicateurs automatiques et votes de la communauté. Ni une accusation ni une garantie — vérifiez avant de payer.',
      tab_stats: '📊 SIGNAUX', tab_contact: '💬 CONTACT', tab_interaction: '⚠️ INTERACTION', tab_result: '📋 RÉSULTAT',
      stat_participants: 'PART.', stat_signals: 'SIGNAUX', stat_confidence: 'CONF.',
      community_signals: 'SIGNAUX COMMUNAUTAIRES', participants: 'PARTICIPANTS',
      no_signals: 'Aucun signal communautaire enregistré pour l\'instant.',
      no_category: 'Aucun signal disponible pour cette catégorie.',
      votes_label: 'VOTES', sites_label: 'SITES',
      logout_btn: '🚪 DÉCONNEXION',
      sync_info: 'Bientôt : créer un compte pour synchroniser entre appareils.',
      sign_in_btn: 'Se connecter avec Google',
      sign_in_prompt: 'Créez un compte pour voter et aider la communauté.',
      verified_voter: '✓ VOTANT VÉRIFIÉ',
      vote_gate_msg: 'Connectez-vous pour voter sur cette annonce.',
      logout_confirm: 'Êtes-vous sûr de vouloir vous déconnecter ? Votre historique local sera supprimé.',
      ad_space: 'Espace publicitaire', partner_badge: 'PARTENAIRE'
    },
    signals: {
      unrealistic_price: 'Prix irréaliste', ai_photos: 'Photos générées par IA',
      ai_generated_photos: 'Photos générées par IA', stolen_photos: 'Photos volées / annonce clonée',
      new_account: 'Nouveau compte / pas d\'avis', answered_call: 'A répondu au téléphone',
      trusted_seller: 'Vendeur de confiance', success: 'Transaction réussie',
      scam: 'Arnaque confirmée', lost_money: 'Argent perdu', suspicious: 'Suspect',
      pressure_sale: 'Pression d\'achat / "achetez maintenant"', asked_personal_data: 'A demandé des données personnelles',
      redirected_chat: 'Redirigé vers WhatsApp/Telegram', unresponsive: 'A arrêté de répondre',
      never_arrived: 'Article jamais arrivé', wrong_item: 'Mauvais article reçu',
      as_described: 'Conforme à la description', fast_shipping: 'Livraison rapide',
      payment_outside: 'Paiement hors plateforme',
      instant_reply: 'Réponse instantanée (bot ?)', reposted_ad: 'Annonce republiée plusieurs fois',
      fake_profile_pic: 'Fausse photo de profil', bad_portuguese: 'Texte traduit automatiquement',
      mbway_pressure: 'A insisté sur le virement immédiat',
      fake_payment_link: 'Lien de paiement frauduleux', fake_proof: 'Preuve de paiement falsifiée',
      abroad_excuse: '"Je suis à l\'étranger / militaire"', refused_meeting: 'A refusé la rencontre / l\'appel vidéo',
      fake_invoice: 'Facture/garantie falsifiée', accepted_meeting: 'A accepté une rencontre',
      shows_invoice: 'A montré la facture/preuve d\'achat', seller_vanished: 'A disparu après paiement',
      courier_extra_fee: 'Livreur a facturé des frais fictifs', with_invoice: 'Livré avec facture/garantie',
      verified_seller: 'Vendeur vérifié de confiance',
      counterfeit_luxury: 'Article de luxe contrefait', no_measures: 'Pas de mesures ni d\'étiquette',
      bad_description: 'Description vague / pas de défauts',
      good_reviews: 'Profil avec de bonnes évaluations', verified_profile: 'Profil Vinted vérifié',
      fast_responses: 'Réponses rapides et détaillées', extra_photos: 'Photos supplémentaires envoyées',
      counterfeit_received: 'Article contrefait reçu', not_as_described: 'Article non conforme',
      new_seller: 'Nouveau vendeur (< 30 jours)', low_feedback: 'Faible évaluation (< 95%)',
      high_shipping: 'Livraison excessivement chère', asks_personal_data: 'A demandé des informations personnelles',
      friends_family_payment: 'Paiement "amis et famille" demandé',
      shipped_outside_eu: 'Expédié hors UE (douanes cachées)',
      prohibited_item: 'Article interdit dans cette région', gdpr_not_compliant: 'Pas de conformité RGPD',
      seller_unresponsive: 'Vendeur ne répond pas (> 24h)', item_not_arrived: 'Article non arrivé',
      tracking_dead: 'Suivi mort / disparu', dispute_lost: 'Litige perdu / pas de remboursement',
      responsive: 'Réponses rapides et professionnelles',
      tracking_updated: 'Suivi mis à jour régulièrement', top_rated: 'Vendeur Top Évalué',
      counterfeit: 'Article contrefait',
      no_photos: 'Pas de photos', doesnt_answer: 'Ne répond pas',
      number_off_or_fake: 'Numéro coupé/faux', seen_no_reply: 'Vu sans réponse',
      replied_messages: 'A répondu aux messages', visit_done: 'J\'ai visité le bien',
      clear_communication: 'Communication claire', refused_visit: 'A refusé la visite',
      wrong_location: 'Mauvaise localisation', stopped_responding: 'A arrêté de répondre',
      asked_money_upfront: 'A demandé un acompte', redirected_convo: 'A redirigé la conversation',
      // leboncoin
      lbc_chatonly: 'Refuse tout contact hors chat', lbc_fake_protection: 'Lien de "protection acheteur" suspect', lbc_fake_delivery: 'Lien de livraison frauduleux (Colissimo faux)',
      // Wallapop / Kleinanzeigen / Subito (fallback FR)
      wp_no_wallapop_pay: 'Refuse le paiement in-app', wp_fake_envio: 'Lien de livraison suspect', wp_fake_link: 'Lien de paiement frauduleux envoyé',
      ka_only_chat: 'Refuse appel / chat uniquement', ka_sicherheitscheck: 'Lien de "vérification sécurité" envoyé', ka_fake_schutz: 'Fausse page de protection acheteur',
      sub_fake_protect: 'Lien de protection suspect', sub_postepay: 'Demande rechargement hors plateforme',
      // eBay
      vague_description: 'Description vague / sans détails', no_returns: 'Pas de politique de retour',
      good_feedback: 'Excellent retour vendeur', fast_reply: 'Réponse rapide',
      accepted_returns: 'Accepte les retours', fake_reviews: 'Avis suspects / achetés',
      third_party_seller: 'Vendeur tiers sans historique'
    }
  },

  es: {
    ui: {
      badge_risk: 'PRECAUCIÓN', badge_alert: 'SEÑALES', badge_warning: 'REVISAR', badge_safe: 'SIN ALERTAS', badge_trusted: 'BIEN VALORADO',
      disclaimer: 'Indicadores automáticos y votos de la comunidad. No es una acusación ni una garantía — verifica antes de pagar.',
      tab_stats: '📊 SEÑALES', tab_contact: '💬 CONTACTO', tab_interaction: '⚠️ INTERACCIÓN', tab_result: '📋 RESULTADO',
      stat_participants: 'PART.', stat_signals: 'SEÑALES', stat_confidence: 'CONF.',
      community_signals: 'SEÑALES COMUNITARIAS', participants: 'PARTICIPANTES',
      no_signals: 'Aún no hay señales comunitarias registradas.',
      no_category: 'No hay señales disponibles para esta categoría.',
      votes_label: 'VOTOS', sites_label: 'SITIOS',
      logout_btn: '🚪 CERRAR SESIÓN',
      sync_info: 'Próximamente: crear cuenta para sincronizar entre dispositivos.',
      sign_in_btn: 'Entrar con Google',
      sign_in_prompt: 'Crea una cuenta para votar y ayudar a la comunidad.',
      verified_voter: '✓ VOTANTE VERIFICADO',
      vote_gate_msg: 'Inicia sesión para votar en este anuncio.',
      logout_confirm: '¿Estás seguro de que quieres cerrar sesión? Tu historial local será eliminado.',
      ad_space: 'Espacio publicitario', partner_badge: 'SOCIO'
    },
    signals: {
      unrealistic_price: 'Precio irreal', ai_photos: 'Fotos generadas por IA',
      ai_generated_photos: 'Fotos generadas por IA', stolen_photos: 'Fotos robadas / anuncio clonado',
      new_account: 'Cuenta nueva / sin reseñas', answered_call: 'Respondió la llamada',
      trusted_seller: 'Vendedor de confianza', success: 'Transacción exitosa',
      scam: 'Estafa confirmada', lost_money: 'Perdí dinero', suspicious: 'Sospechoso',
      pressure_sale: 'Presión de compra / "compre ahora"', asked_personal_data: 'Pidió datos personales',
      redirected_chat: 'Redirigió a WhatsApp/Telegram', unresponsive: 'Dejó de responder',
      never_arrived: 'Artículo nunca llegó', wrong_item: 'Artículo incorrecto recibido',
      as_described: 'Tal como se describió', fast_shipping: 'Envío rápido',
      payment_outside: 'Pago fuera de la plataforma',
      instant_reply: 'Respuesta instantánea (¿bot?)', reposted_ad: 'Anuncio republicado varias veces',
      fake_profile_pic: 'Foto de perfil falsa', bad_portuguese: 'Texto traducido automáticamente',
      mbway_pressure: 'Insistió en transferencia inmediata',
      fake_payment_link: 'Enlace de pago falso', fake_proof: 'Comprobante de pago falso',
      abroad_excuse: '"Estoy en el extranjero / militar"', refused_meeting: 'Rechazó encuentro / videollamada',
      fake_invoice: 'Factura/garantía falsa', accepted_meeting: 'Aceptó encuentro presencial',
      shows_invoice: 'Mostró factura/prueba de compra', seller_vanished: 'Desapareció tras el pago',
      courier_extra_fee: 'Mensajería cobró tarifa falsa', with_invoice: 'Entregado con factura/garantía',
      verified_seller: 'Vendedor verificado de confianza',
      counterfeit_luxury: 'Artículo de lujo falsificado', no_measures: 'Sin medidas ni etiqueta',
      bad_description: 'Descripción vaga / sin defectos',
      good_reviews: 'Perfil con buenas valoraciones', verified_profile: 'Perfil verificado Vinted',
      fast_responses: 'Respuestas rápidas y detalladas', extra_photos: 'Fotos adicionales enviadas',
      counterfeit_received: 'Artículo falsificado recibido', not_as_described: 'Artículo no corresponde',
      new_seller: 'Vendedor nuevo (< 30 días)', low_feedback: 'Calificación baja (< 95%)',
      high_shipping: 'Costo de envío excesivo', asks_personal_data: 'Pidió información personal',
      friends_family_payment: 'Pidió pago "amigos y familia"',
      shipped_outside_eu: 'Enviado fuera de la UE (aduanas ocultas)',
      prohibited_item: 'Artículo prohibido en esta región', gdpr_not_compliant: 'Sin cumplimiento RGPD',
      seller_unresponsive: 'Vendedor sin respuesta (> 24h)', item_not_arrived: 'Artículo no llegó',
      tracking_dead: 'Seguimiento muerto / desaparecido', dispute_lost: 'Disputa perdida / sin reembolso',
      responsive: 'Respuestas rápidas y profesionales',
      tracking_updated: 'Seguimiento actualizado regularmente', top_rated: 'Vendedor Mejor Valorado',
      counterfeit: 'Artículo falsificado',
      ml_fake_product: 'Producto falsificado', ml_payment_outside: 'Pago fuera de Mercado Pago',
      ml_fake_seller: 'Vendedor falso', ml_bad_description: 'Descripción engañosa',
      ml_no_return: 'Sin política de devolución', ml_new_seller: 'Vendedor sin reputación',
      ml_gold_seller: 'Mercado Líder Gold', ml_platinum_seller: 'Mercado Líder Platinum',
      ml_fulfillment: 'Enviado por Mercado Envíos', ml_item_not_arrived: 'Artículo no llegó',
      ml_different_item: 'Artículo diferente al anunciado', ml_counterfeit: 'Producto falsificado recibido',
      ml_dispute_won: 'Disputa ganada por el comprador', ml_dispute_lost: 'Disputa perdida / sin reembolso',
      ml_success: 'Compra exitosa', ml_scam: 'Estafa confirmada',
      // Idealista ES
      no_photos: 'Sin fotos', doesnt_answer: 'No contesta',
      number_off_or_fake: 'Número desconectado/falso', seen_no_reply: 'Visto sin respuesta',
      replied_messages: 'Respondió mensajes', visit_done: 'Visité el inmueble',
      clear_communication: 'Comunicación clara', refused_visit: 'Rechazó la visita',
      wrong_location: 'Ubicación incorrecta', stopped_responding: 'Dejó de responder',
      asked_money_upfront: 'Pidió dinero por adelantado', redirected_convo: 'Redirigió la conversación',
      // Wallapop
      wp_no_wallapop_pay: 'Rechaza Wallapop Pay (pide fuera)', wp_fake_envio: '"Wallapop Envío" falso / enlace sospechoso', wp_fake_link: 'Envió enlace de pago falso',
      // leboncoin / Kleinanzeigen / Subito (fallback ES)
      lbc_chatonly: 'Rechaza contacto fuera del chat', lbc_fake_protection: 'Enlace de "protección" sospechoso', lbc_fake_delivery: 'Enlace de entrega fraudulento',
      ka_only_chat: 'Rechaza llamada / solo chat', ka_sicherheitscheck: 'Envió enlace de "verificación"', ka_fake_schutz: 'Página de protección al comprador falsa',
      sub_fake_protect: 'Enlace de protección sospechoso', sub_postepay: 'Pidió recarga fuera de la app',
      // eBay
      vague_description: 'Descripción vaga / sin detalles', no_returns: 'Sin política de devoluciones',
      good_feedback: 'Valoraciones excelentes', fast_reply: 'Respondió rápidamente',
      accepted_returns: 'Acepta devoluciones', fake_reviews: 'Valoraciones sospechosas / compradas',
      third_party_seller: 'Vendedor tercero sin historial'
    }
  },

  it: {
    ui: {
      badge_risk: 'CAUTELA', badge_alert: 'SEGNALI', badge_warning: 'DA VERIFICARE', badge_safe: 'NESSUN SEGNALE', badge_trusted: 'BEN VALUTATO',
      disclaimer: 'Indicatori automatici e voti della community. Non è un\'accusa né una garanzia — verifica prima di pagare.',
      tab_stats: '📊 SEGNALI', tab_contact: '💬 CONTATTO', tab_interaction: '⚠️ INTERAZIONE', tab_result: '📋 RISULTATO',
      stat_participants: 'PART.', stat_signals: 'SEGNALI', stat_confidence: 'CONF.',
      community_signals: 'SEGNALI DELLA COMUNITÀ', participants: 'PARTECIPANTI',
      no_signals: 'Nessun segnale comunitario registrato ancora.',
      no_category: 'Nessun segnale disponibile per questa categoria.',
      votes_label: 'VOTI', sites_label: 'SITI',
      logout_btn: '🚪 DISCONNETTI',
      sync_info: 'Prossimamente: crea un account per sincronizzare tra dispositivi.',
      sign_in_btn: 'Accedi con Google',
      sign_in_prompt: 'Crea un account per votare e aiutare la community.',
      verified_voter: '✓ VOTANTE VERIFICATO',
      vote_gate_msg: 'Accedi per votare su questo annuncio.',
      logout_confirm: 'Sei sicuro di voler disconnetterti? La tua cronologia locale verrà eliminata.',
      ad_space: 'Spazio pubblicitario', partner_badge: 'PARTNER'
    },
    signals: {
      unrealistic_price: 'Prezzo irrealistico', ai_photos: 'Foto generate da IA',
      ai_generated_photos: 'Foto generate da IA', stolen_photos: 'Foto rubate / annuncio clonato',
      new_account: 'Account nuovo / nessuna recensione', answered_call: 'Ha risposto al telefono',
      trusted_seller: 'Venditore affidabile', success: 'Transazione riuscita',
      scam: 'Truffa confermata', lost_money: 'Ho perso denaro', suspicious: 'Sospetto',
      pressure_sale: 'Pressione all\'acquisto', asked_personal_data: 'Ha chiesto dati personali',
      redirected_chat: 'Reindirizzato a WhatsApp/Telegram', unresponsive: 'Ha smesso di rispondere',
      never_arrived: 'Articolo mai arrivato', wrong_item: 'Articolo errato ricevuto',
      as_described: 'Come descritto', fast_shipping: 'Spedizione veloce',
      payment_outside: 'Pagamento fuori piattaforma',
      instant_reply: 'Risposta istantanea (bot?)', reposted_ad: 'Annuncio ripubblicato più volte',
      fake_profile_pic: 'Foto profilo falsa', bad_portuguese: 'Testo tradotto automaticamente',
      mbway_pressure: 'Ha insistito sul bonifico immediato',
      fake_payment_link: 'Link di pagamento falso', fake_proof: 'Prova di pagamento falsa',
      abroad_excuse: '"Sono all\'estero / militare"', refused_meeting: 'Ha rifiutato incontro / videochiamata',
      fake_invoice: 'Fattura/garanzia falsa', accepted_meeting: 'Ha accettato l\'incontro',
      shows_invoice: 'Ha mostrato fattura/prova d\'acquisto', seller_vanished: 'Sparito dopo il pagamento',
      courier_extra_fee: 'Corriere ha addebitato tariffa falsa', with_invoice: 'Consegnato con fattura/garanzia',
      verified_seller: 'Venditore verificato affidabile',
      counterfeit_luxury: 'Articolo di lusso contraffatto', no_measures: 'Nessuna misura o etichetta',
      bad_description: 'Descrizione vaga / nessun difetto elencato',
      good_reviews: 'Profilo con buone recensioni', verified_profile: 'Profilo Vinted verificato',
      fast_responses: 'Risposte rapide e dettagliate', extra_photos: 'Foto aggiuntive inviate su richiesta',
      counterfeit_received: 'Articolo contraffatto ricevuto', not_as_described: 'Articolo non come descritto',
      new_seller: 'Venditore nuovo (< 30 giorni)', low_feedback: 'Valutazione bassa (< 95%)',
      high_shipping: 'Costo di spedizione eccessivo', asks_personal_data: 'Ha chiesto informazioni personali',
      friends_family_payment: 'Richiesto pagamento "amici e famiglia"',
      shipped_outside_eu: 'Spedito fuori dall\'UE (dogana nascosta)',
      prohibited_item: 'Articolo vietato in questa regione', gdpr_not_compliant: 'Nessuna conformità GDPR',
      seller_unresponsive: 'Venditore non risponde (> 24h)', item_not_arrived: 'Articolo non arrivato',
      tracking_dead: 'Tracciamento morto / scomparso', dispute_lost: 'Controversia persa / nessun rimborso',
      responsive: 'Risposte rapide e professionali',
      tracking_updated: 'Tracciamento aggiornato regolarmente', top_rated: 'Venditore Top Rated',
      counterfeit: 'Articolo contraffatto',
      // Idealista IT
      no_photos: 'Nessuna foto', doesnt_answer: 'Non risponde',
      number_off_or_fake: 'Numero spento/falso', seen_no_reply: 'Visto senza risposta',
      replied_messages: 'Ha risposto ai messaggi', visit_done: 'Ho visitato l\'immobile',
      clear_communication: 'Comunicazione chiara', refused_visit: 'Ha rifiutato la visita',
      wrong_location: 'Posizione errata', stopped_responding: 'Ha smesso di rispondere',
      asked_money_upfront: 'Ha chiesto denaro in anticipo', redirected_convo: 'Ha reindirizzato la conversazione',
      // Subito
      sub_fake_protect: 'Link "Subito Protect" sospetto', sub_postepay: 'Chiede ricarica PostePay fuori app',
      // Wallapop / leboncoin / Kleinanzeigen (fallback IT)
      wp_no_wallapop_pay: 'Rifiuta pagamento in-app', wp_fake_envio: 'Link di spedizione sospetto', wp_fake_link: 'Inviato link di pagamento falso',
      lbc_chatonly: 'Rifiuta contatti fuori chat', lbc_fake_protection: 'Link di "protezione acquirente" sospetto', lbc_fake_delivery: 'Link di consegna fraudolento',
      ka_only_chat: 'Rifiuta chiamata / solo chat', ka_sicherheitscheck: 'Inviato link di "verifica sicurezza"', ka_fake_schutz: 'Pagina di protezione acquirente falsa',
      // eBay
      vague_description: 'Descrizione vaga / senza dettagli', no_returns: 'Nessuna politica di reso',
      good_feedback: 'Feedback venditore eccellente', fast_reply: 'Risposta rapida',
      accepted_returns: 'Accetta i resi', fake_reviews: 'Recensioni sospette / acquistate',
      third_party_seller: 'Venditore terzo senza storico'
    }
  }

};

// Deteção de idioma pelo domínio
function scmDetectLang() {
  if (typeof window === 'undefined') return 'pt';
  const h = window.location.hostname;
  if (/ebay\.de$|vinted\.de$|\.de$/.test(h)) return 'de';
  if (/ebay\.fr$|vinted\.fr$|\.fr$/.test(h)) return 'fr';
  if (/ebay\.it$|vinted\.it$|idealista\.it$|\.it$/.test(h)) return 'it';
  if (/ebay\.es$|vinted\.es$|idealista\.es$|mercadolibre\.|wallapop\.com$/.test(h)) return 'es';
  // Inglês: ebay.com, ebay.co.uk, vinted.com (internacional), vinted.co.uk, aliexpress.com, facebook.com
  if (/ebay\.com$|ebay\.co\.uk$|vinted\.com$|vinted\.co\.uk$|aliexpress\.com$|facebook\.com$/.test(h)) return 'en';
  return 'pt'; // olx.pt, vinted.pt, mercadolivre.com.br, custojusto.pt, standvirtual.pt, etc.
}

// Tradução de uma chave (ex: 'ui.badge_risk', 'signals.scam')
function scmT(key) {
  const lang = scmDetectLang();
  const [section, subkey] = key.split('.');
  if (!section || !subkey) return key;
  return (SCM_I18N[lang] && SCM_I18N[lang][section] && SCM_I18N[lang][section][subkey])
    || (SCM_I18N.pt[section] && SCM_I18N.pt[section][subkey])
    || subkey;
}

// Retorna o label traduzido de um sinal pelo seu ID
function scmSignalLabel(signalId, fallback) {
  const lang = scmDetectLang();
  return (SCM_I18N[lang] && SCM_I18N[lang].signals && SCM_I18N[lang].signals[signalId])
    || (SCM_I18N.pt.signals && SCM_I18N.pt.signals[signalId])
    || fallback
    || signalId;
}
