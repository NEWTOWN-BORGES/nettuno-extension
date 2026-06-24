/**
 * NETTUNO v4.0 - Signals Data
 * Dados de sinais organizados por fase (contact, interaction, result)
 * Extraídos da v3
 */

const SIGNALS_DATA = {
  // ========== IDEALISTA / DEFAULT (Imobiliário) ==========
  default: {
    contact: [
      { signal: 'unrealistic_price', label: 'Preço fora da realidade', icon: '💰', positive: false, negative: false },
      { signal: 'no_photos', label: 'Sem fotos', icon: '📷', positive: false, negative: true },
      { signal: 'doesnt_answer', label: 'Não atende', icon: '📵', positive: false, negative: false },
      { signal: 'number_off_or_fake', label: 'Nº desligado/falso', icon: '🔌', positive: false, negative: true },
      { signal: 'seen_no_reply', label: 'Visto sem resposta', icon: '👀', positive: false, negative: false },
      { signal: 'ai_generated_photos', label: 'Fotos geradas por IA', icon: '🤖', positive: false, negative: true },
      { signal: 'answered_call', label: 'Atendeu chamada', icon: '📞', positive: true, negative: false },
      { signal: 'replied_messages', label: 'Respondeu mensagens', icon: '💬', positive: true, negative: false }
    ],
    interaction: [
      { signal: 'visit_done', label: 'Visitei o local', icon: '📍', positive: true, negative: false },
      { signal: 'clear_communication', label: 'Comunicação clara', icon: '🗣️', positive: true, negative: false },
      { signal: 'refused_visit', label: 'Recusou visita', icon: '🚫', positive: false, negative: true },
      { signal: 'wrong_location', label: 'Local errado', icon: '🗺️', positive: false, negative: false },
      { signal: 'stopped_responding', label: 'Parou de responder', icon: '🔇', positive: false, negative: false },
      { signal: 'asked_money_upfront', label: 'Pediu dinheiro antecipado', icon: '💸', positive: false, negative: true },
      { signal: 'redirected_convo', label: 'Redirecionou conversa', icon: '📲', positive: false, negative: false, hasSub: true }
    ],
    result: [
      { signal: 'success', label: 'Sucesso', icon: '🤝', positive: true, negative: false },
      { signal: 'trusted_seller', label: 'Vendedor confiável', icon: '🏅', positive: true, negative: false },
      { signal: 'scam', label: 'Scam/Burla', icon: '🚨', positive: false, negative: true },
      { signal: 'lost_money', label: 'Perdi dinheiro', icon: '📉', positive: false, negative: true },
      { signal: 'suspicious', label: 'Suspeito', icon: '🤨', positive: false, negative: true }
    ]
  },

  // ========== OLX / CustoJusto (Classificados Gerais) ==========
  // Sinais derivados de pesquisa em ZWAME, Portal da Queixa, DECO Proteste,
  // alertas PSP/GNR/PJ e OLX.pt oficial. Ver plano em ~/.claude/plans/.
  olx: {
    contact: [
      // Vermelhos — burla quase certa no anúncio / primeiro contacto
      { signal: 'ai_photos', label: 'Fotos geradas por IA', icon: '🤖', positive: false, negative: true },
      { signal: 'stolen_photos', label: 'Fotos roubadas / anúncio clonado', icon: '📋', positive: false, negative: true },
      { signal: 'instant_reply', label: 'Respondeu em segundos', icon: '⚡', positive: false, negative: true },
      { signal: 'reposted_ad', label: 'Anúncio republicado várias vezes', icon: '🔁', positive: false, negative: true },
      { signal: 'fake_profile_pic', label: 'Foto de perfil falsa', icon: '👻', positive: false, negative: true },
      // Amarelos — suspeitos
      { signal: 'unrealistic_price', label: 'Preço fora da realidade', icon: '💰', positive: false, negative: false },
      { signal: 'new_account', label: 'Conta nova / 0 reviews', icon: '🌱', positive: false, negative: false },
      { signal: 'bad_portuguese', label: 'Português traduzido', icon: '🌍', positive: false, negative: false },
      { signal: 'seen_no_reply', label: 'Visto sem responder', icon: '👀', positive: false, negative: false },
      // Verdes — sinais positivos
      { signal: 'answered_call', label: 'Atendeu chamada', icon: '📞', positive: true, negative: false },
      { signal: 'trusted_seller', label: 'Histórico longo de vendas', icon: '🏅', positive: true, negative: false }
    ],
    interaction: [
      // Vermelhos — durante a negociação
      { signal: 'asked_money_upfront', label: 'Pediu pagamento adiantado', icon: '💸', positive: false, negative: true },
      { signal: 'mbway_pressure', label: 'Insistiu em MBWay / transferência', icon: '🏧', positive: false, negative: true },
      { signal: 'redirected_chat', label: 'Redirecionou para WhatsApp/Telegram', icon: '📲', positive: false, negative: true, hasSub: true },
      { signal: 'asked_personal_data', label: 'Pediu NIF / IBAN / cartão', icon: '🪪', positive: false, negative: true },
      { signal: 'fake_payment_link', label: 'Link de pagamento falso', icon: '🔗', positive: false, negative: true },
      { signal: 'fake_proof', label: 'Comprovativo de pagamento falso', icon: '📧', positive: false, negative: true },
      { signal: 'abroad_excuse', label: '"Estou no estrangeiro / militar"', icon: '✈️', positive: false, negative: true },
      { signal: 'refused_meeting', label: 'Recusou encontro / videochamada', icon: '🚫', positive: false, negative: true },
      { signal: 'fake_invoice', label: 'Fatura / garantia falsa', icon: '📄', positive: false, negative: true },
      // Amarelos
      { signal: 'pressure_sale', label: 'Urgência / "tem outro comprador"', icon: '⏱️', positive: false, negative: false },
      { signal: 'unresponsive', label: 'Deixou de responder a meio', icon: '🔇', positive: false, negative: false },
      // Verdes
      { signal: 'accepted_meeting', label: 'Aceita encontro presencial', icon: '🤝', positive: true, negative: false },
      { signal: 'shows_invoice', label: 'Mostrou fatura / prova de compra', icon: '📑', positive: true, negative: false }
    ],
    result: [
      // Vermelhos — pós-transação que correu mal
      { signal: 'scam', label: 'Burla confirmada', icon: '🚨', positive: false, negative: true },
      { signal: 'lost_money', label: 'Perdi dinheiro', icon: '📉', positive: false, negative: true },
      { signal: 'never_arrived', label: 'Produto nunca chegou', icon: '📦', positive: false, negative: true },
      { signal: 'wrong_item', label: 'Produto trocado / caixa vazia', icon: '🎁', positive: false, negative: true },
      { signal: 'seller_vanished', label: 'Desapareceu após pagamento', icon: '👻', positive: false, negative: true },
      { signal: 'courier_extra_fee', label: 'Transportadora cobrou taxa falsa', icon: '🚚', positive: false, negative: true },
      // Amarelo
      { signal: 'suspicious', label: 'Suspeito (não confirmado)', icon: '🤨', positive: false, negative: false },
      // Verdes
      { signal: 'success', label: 'Transação correu bem', icon: '🤝', positive: true, negative: false },
      { signal: 'as_described', label: 'Recebido conforme descrito', icon: '✅', positive: true, negative: false },
      { signal: 'with_invoice', label: 'Veio com fatura / garantia', icon: '📑', positive: true, negative: false },
      { signal: 'verified_seller', label: 'Vendedor de confiança', icon: '🏅', positive: true, negative: false }
    ]
  },

  // ========== VINTED (Segunda mão — roupa, calçado, acessórios) ==========
  // Sinais focados nos padrões documentados pela Vinted, DECO e Portal da Queixa:
  // pagamento fora da plataforma, falsificados de luxo, artigo diferente do descrito.
  vinted: {
    contact: [
      { signal: 'counterfeit_luxury', label: 'Artigo de luxo falsificado', icon: '🎭', positive: false, negative: true },
      { signal: 'ai_photos', label: 'Fotos geradas por IA', icon: '🤖', positive: false, negative: true },
      { signal: 'stolen_photos', label: 'Fotos roubadas de outra loja', icon: '📋', positive: false, negative: true },
      { signal: 'unrealistic_price', label: 'Preço fora da realidade', icon: '💰', positive: false, negative: false },
      { signal: 'new_account', label: 'Conta nova / sem avaliações', icon: '🌱', positive: false, negative: false },
      { signal: 'no_measures', label: 'Sem medidas / etiqueta', icon: '📏', positive: false, negative: false },
      { signal: 'bad_description', label: 'Descrição vaga / sem defeitos assinalados', icon: '📝', positive: false, negative: false },
      { signal: 'good_reviews', label: 'Perfil com boas avaliações', icon: '⭐', positive: true, negative: false },
      { signal: 'verified_profile', label: 'Perfil verificado Vinted', icon: '✅', positive: true, negative: false }
    ],
    interaction: [
      { signal: 'payment_outside', label: 'Pediu pagamento FORA da Vinted', icon: '💳', positive: false, negative: true },
      { signal: 'redirected_chat', label: 'Redirecionou para WhatsApp/Telegram', icon: '📲', positive: false, negative: true, hasSub: true },
      { signal: 'asked_personal_data', label: 'Pediu IBAN / dados pessoais', icon: '🪪', positive: false, negative: true },
      { signal: 'fake_payment_link', label: 'Link de pagamento falso', icon: '🔗', positive: false, negative: true },
      { signal: 'pressure_sale', label: 'Urgência / "outro comprador"', icon: '⏱️', positive: false, negative: false },
      { signal: 'unresponsive', label: 'Deixou de responder', icon: '🔇', positive: false, negative: false },
      { signal: 'fast_responses', label: 'Respostas rápidas e detalhadas', icon: '💬', positive: true, negative: false },
      { signal: 'extra_photos', label: 'Enviou fotos extra a pedido', icon: '📸', positive: true, negative: false }
    ],
    result: [
      { signal: 'scam', label: 'Burla confirmada', icon: '🚨', positive: false, negative: true },
      { signal: 'lost_money', label: 'Perdi dinheiro', icon: '📉', positive: false, negative: true },
      { signal: 'counterfeit_received', label: 'Recebi artigo falsificado', icon: '🎭', positive: false, negative: true },
      { signal: 'not_as_described', label: 'Artigo diferente do descrito', icon: '📦', positive: false, negative: true },
      { signal: 'never_arrived', label: 'Nunca chegou', icon: '📭', positive: false, negative: true },
      { signal: 'suspicious', label: 'Suspeito (não confirmado)', icon: '🤨', positive: false, negative: false },
      { signal: 'success', label: 'Transação correu bem', icon: '🤝', positive: true, negative: false },
      { signal: 'as_described', label: 'Conforme descrito', icon: '✅', positive: true, negative: false },
      { signal: 'fast_shipping', label: 'Envio rápido', icon: '🚀', positive: true, negative: false }
    ]
  },

  // ========== STANDVIRTUAL (Veículos) ==========
  standvirtual: {
    contact: [
      { signal: 'deposit_before_see', label: 'Pede sinal s/ ver', icon: '💸', positive: false, negative: true },
      { signal: 'fake_payment_proof', label: 'Comprovativo falso', icon: '📧', positive: false, negative: true },
      { signal: 'abroad_car', label: 'Artigo no estrangeiro', icon: '✈️', positive: false, negative: true },
      { signal: 'cloned_ad', label: 'Anúncio clonado', icon: '📋', positive: false, negative: true },
      { signal: 'fake_photo', label: 'Foto falsa', icon: '📸', positive: false, negative: true },
      { signal: 'too_cheap', label: 'Preço bom demais', icon: '🤷', positive: false, negative: true },
      { signal: 'only_whatsapp', label: 'Só comunica WhatsApp', icon: '📞', positive: false, negative: false },
      { signal: 'km_suspect', label: 'Km adulterados', icon: '🔢', positive: false, negative: false },
      { signal: 'accident_hidden', label: 'Sinistro oculto', icon: '💥', positive: false, negative: true },
      { signal: 'debts_hidden', label: 'Penhora/dívida oculta', icon: '⚖️', positive: false, negative: true },
      { signal: 'no_test_drive', label: 'Recusa test drive', icon: '🚫', positive: false, negative: false },
      { signal: 'docs_incomplete', label: 'Documentos incompletos', icon: '📝', positive: false, negative: false },
      { signal: 'pressure_sale', label: 'Pressiona venda', icon: '⏱️', positive: false, negative: false },
      { signal: 'evasive', label: 'Evita perguntas', icon: '⏳', positive: false, negative: false },
      { signal: 'new_profile', label: 'Perfil novo', icon: '🌱', positive: false, negative: false },
      { signal: 'saw_car', label: 'Vi pessoalmente', icon: '👁️', positive: true, negative: false },
      { signal: 'test_drive_ok', label: 'Test drive OK', icon: '🚗', positive: true, negative: false },
      { signal: 'mechanic_check', label: 'Mecânico aprovou', icon: '🔧', positive: true, negative: false },
      { signal: 'docs_complete', label: 'Documentos OK', icon: '📄', positive: true, negative: false },
      { signal: 'history_clear', label: 'Historial limpo', icon: '📊', positive: true, negative: false },
      { signal: 'real_owner', label: 'Dono confirmado', icon: '✅', positive: true, negative: false },
      { signal: 'trusted_stand', label: 'Stand conhecido', icon: '🏅', positive: true, negative: false },
      { signal: 'ai_generated_photos', label: 'Fotos geradas por IA', icon: '🤖', positive: false, negative: true },
      { signal: 'fair_price', label: 'Preço justo', icon: '💰', positive: true, negative: false }
    ],
    interaction: [
      { signal: 'mechanic_check_ok', label: 'Mecânico aprovou', icon: '🔧', positive: true, negative: false },
      { signal: 'history_check_ok', label: 'Histórico limpo', icon: '📊', positive: true, negative: false },
      { signal: 'test_drive_ok', label: 'Test drive OK', icon: '🚗', positive: true, negative: false },
      { signal: 'stopped_responding', label: 'Parou de responder', icon: '🔇', positive: false, negative: false },
      { signal: 'asked_money_upfront', label: 'Pediu sinal s/ ver', icon: '💸', positive: false, negative: true },
      { signal: 'refused_mechanic', label: 'Recusou mecânico', icon: '🚫', positive: false, negative: true },
      { signal: 'engine_issue', label: 'Problema motor/caixa', icon: '⚙️', positive: false, negative: true },
      { signal: 'accident_hidden', label: 'Sinistro oculto', icon: '💥', positive: false, negative: true }
    ],
    result: [
      { signal: 'success', label: 'Sucesso', icon: '🤝', positive: true, negative: false },
      { signal: 'trusted_seller', label: 'Vendedor confiável', icon: '🏅', positive: true, negative: false },
      { signal: 'scam', label: 'Scam/Burla', icon: '🚨', positive: false, negative: true },
      { signal: 'lost_money', label: 'Perdi dinheiro', icon: '📉', positive: false, negative: true },
      { signal: 'suspicious', label: 'Suspeito', icon: '🤨', positive: false, negative: true }
    ]
  },

  // ========== FACEBOOK MARKETPLACE ==========
  // Mesmos padrões de burla que OLX (MBWay, courier falso, redirect chat, perfil fantasma).
  facebook: {
    contact: [
      { signal: 'ai_photos', label: 'Fotos geradas por IA', icon: '🤖', positive: false, negative: true },
      { signal: 'stolen_photos', label: 'Fotos roubadas / anúncio clonado', icon: '📋', positive: false, negative: true },
      { signal: 'instant_reply', label: 'Respondeu em segundos', icon: '⚡', positive: false, negative: true },
      { signal: 'reposted_ad', label: 'Anúncio republicado várias vezes', icon: '🔁', positive: false, negative: true },
      { signal: 'fake_profile_pic', label: 'Foto de perfil falsa', icon: '👻', positive: false, negative: true },
      { signal: 'unrealistic_price', label: 'Preço fora da realidade', icon: '💰', positive: false, negative: false },
      { signal: 'new_account', label: 'Conta nova / 0 reviews', icon: '🌱', positive: false, negative: false },
      { signal: 'bad_portuguese', label: 'Português traduzido', icon: '🌍', positive: false, negative: false },
      { signal: 'seen_no_reply', label: 'Visto sem responder', icon: '👀', positive: false, negative: false },
      { signal: 'answered_call', label: 'Atendeu chamada', icon: '📞', positive: true, negative: false },
      { signal: 'trusted_seller', label: 'Histórico longo de vendas', icon: '🏅', positive: true, negative: false }
    ],
    interaction: [
      { signal: 'asked_money_upfront', label: 'Pediu pagamento adiantado', icon: '💸', positive: false, negative: true },
      { signal: 'mbway_pressure', label: 'Insistiu em MBWay / transferência', icon: '🏧', positive: false, negative: true },
      { signal: 'redirected_chat', label: 'Redirecionou para WhatsApp/Telegram', icon: '📲', positive: false, negative: true, hasSub: true },
      { signal: 'asked_personal_data', label: 'Pediu NIF / IBAN / cartão', icon: '🪪', positive: false, negative: true },
      { signal: 'fake_payment_link', label: 'Link de pagamento falso', icon: '🔗', positive: false, negative: true },
      { signal: 'fake_proof', label: 'Comprovativo de pagamento falso', icon: '📧', positive: false, negative: true },
      { signal: 'abroad_excuse', label: '"Estou no estrangeiro / militar"', icon: '✈️', positive: false, negative: true },
      { signal: 'refused_meeting', label: 'Recusou encontro / videochamada', icon: '🚫', positive: false, negative: true },
      { signal: 'fake_invoice', label: 'Fatura / garantia falsa', icon: '📄', positive: false, negative: true },
      { signal: 'pressure_sale', label: 'Urgência / "tem outro comprador"', icon: '⏱️', positive: false, negative: false },
      { signal: 'unresponsive', label: 'Deixou de responder a meio', icon: '🔇', positive: false, negative: false },
      { signal: 'accepted_meeting', label: 'Aceita encontro presencial', icon: '🤝', positive: true, negative: false },
      { signal: 'shows_invoice', label: 'Mostrou fatura / prova de compra', icon: '📑', positive: true, negative: false }
    ],
    result: [
      { signal: 'scam', label: 'Burla confirmada', icon: '🚨', positive: false, negative: true },
      { signal: 'lost_money', label: 'Perdi dinheiro', icon: '📉', positive: false, negative: true },
      { signal: 'never_arrived', label: 'Produto nunca chegou', icon: '📦', positive: false, negative: true },
      { signal: 'wrong_item', label: 'Produto trocado / caixa vazia', icon: '🎁', positive: false, negative: true },
      { signal: 'seller_vanished', label: 'Desapareceu após pagamento', icon: '👻', positive: false, negative: true },
      { signal: 'courier_extra_fee', label: 'Transportadora cobrou taxa falsa', icon: '🚚', positive: false, negative: true },
      { signal: 'suspicious', label: 'Suspeito (não confirmado)', icon: '🤨', positive: false, negative: false },
      { signal: 'success', label: 'Transação correu bem', icon: '🤝', positive: true, negative: false },
      { signal: 'as_described', label: 'Recebido conforme descrito', icon: '✅', positive: true, negative: false },
      { signal: 'with_invoice', label: 'Veio com fatura / garantia', icon: '📑', positive: true, negative: false },
      { signal: 'verified_seller', label: 'Vendedor de confiança', icon: '🏅', positive: true, negative: false }
    ]
  },

  // ========== TEMU / SHEIN / ALIEXPRESS ==========
  chinashops: {
    contact: [
      { signal: 'bad_quality', label: 'Má qualidade', icon: '🧵', positive: false, negative: true },
      { signal: 'wrong_size', label: 'Tamanho errado', icon: '📏', positive: false, negative: true },
      { signal: 'fake_photo', label: 'Foto falsa', icon: '📸', positive: false, negative: true },
      { signal: 'fake_promo', label: 'Promo falsa', icon: '💸', positive: false, negative: false },
      { signal: 'never_arrived', label: 'Nunca chegou', icon: '📦', positive: false, negative: true },
      { signal: 'hard_return', label: 'Devolução difícil', icon: '🔄', positive: false, negative: false },
      { signal: 'good_quality', label: 'Boa qualidade', icon: '✨', positive: true, negative: false },
      { signal: 'true_size', label: 'Tamanho real', icon: '✅', positive: true, negative: false },
      { signal: 'fast_shipping', label: 'Chegou rápido', icon: '🚀', positive: true, negative: false }
    ],
    interaction: [],
    result: [
      { signal: 'success', label: 'Sucesso', icon: '🤝', positive: true, negative: false },
      { signal: 'trusted_seller', label: 'Vendedor confiável', icon: '🏅', positive: true, negative: false },
      { signal: 'scam', label: 'Scam/Burla', icon: '🚨', positive: false, negative: true },
      { signal: 'lost_money', label: 'Perdi dinheiro', icon: '📉', positive: false, negative: true },
      { signal: 'suspicious', label: 'Suspeito', icon: '🤨', positive: false, negative: true }
    ]
  },

  // ========== MERCADO LIVRE / MERCADO LIBRE (Brasil + LATAM) ==========
  // Padrões documentados por Procon-SP, Reclame Aqui, SENACON (Brasil)
  // e organismos equivalentes LATAM. Pagamento fora do Mercado Pago é burla #1.
  mercadolivre: {
    contact: [
      { signal: 'ml_fake_product', label: 'Produto falsificado', icon: '🎭', positive: false, negative: true },
      { signal: 'ml_payment_outside', label: 'Pagamento fora do Mercado Pago', icon: '💳', positive: false, negative: true },
      { signal: 'ml_fake_seller', label: 'Vendedor falso / conta clonada', icon: '👻', positive: false, negative: true },
      { signal: 'unrealistic_price', label: 'Preço irreal / muito abaixo', icon: '💰', positive: false, negative: false },
      { signal: 'ml_new_seller', label: 'Sem reputação / conta nova', icon: '🌱', positive: false, negative: false },
      { signal: 'ai_photos', label: 'Fotos parecem stock / IA', icon: '🤖', positive: false, negative: false },
      { signal: 'ml_bad_description', label: 'Descrição enganosa / incompleta', icon: '📝', positive: false, negative: false },
      { signal: 'ml_no_return', label: 'Sem política de devolução', icon: '🔄', positive: false, negative: false },
      { signal: 'ml_gold_seller', label: 'Mercado Líder Gold', icon: '🥇', positive: true, negative: false },
      { signal: 'ml_platinum_seller', label: 'Mercado Líder Platinum', icon: '💎', positive: true, negative: false },
      { signal: 'ml_fulfillment', label: 'Enviado pelo Mercado Envios', icon: '📦', positive: true, negative: false }
    ],
    interaction: [
      { signal: 'ml_pix_redirect', label: 'Pediu Pix fora da plataforma', icon: '💸', positive: false, negative: true },
      { signal: 'ml_boleto_fraud', label: 'Boleto modificado / falsificado', icon: '📄', positive: false, negative: true },
      { signal: 'redirected_chat', label: 'Redirecionou para WhatsApp/Telegram', icon: '📲', positive: false, negative: true, hasSub: true },
      { signal: 'pressure_sale', label: 'Pressão: "oferta por tempo limitado"', icon: '⏱️', positive: false, negative: false },
      { signal: 'unresponsive', label: 'Vendedor sem resposta', icon: '🔇', positive: false, negative: false },
      { signal: 'responsive', label: 'Responde rapidamente', icon: '💬', positive: true, negative: false }
    ],
    result: [
      { signal: 'ml_success', label: 'Compra bem-sucedida', icon: '🤝', positive: true, negative: false },
      { signal: 'as_described', label: 'Conforme anunciado', icon: '✅', positive: true, negative: false },
      { signal: 'ml_dispute_won', label: 'Disputa ganha pelo comprador', icon: '⚖️', positive: true, negative: false },
      { signal: 'ml_scam', label: 'Golpe confirmado', icon: '🚨', positive: false, negative: true },
      { signal: 'lost_money', label: 'Perdi dinheiro', icon: '📉', positive: false, negative: true },
      { signal: 'ml_item_not_arrived', label: 'Item não chegou', icon: '📭', positive: false, negative: true },
      { signal: 'ml_different_item', label: 'Item diferente do anunciado', icon: '🎁', positive: false, negative: true },
      { signal: 'ml_counterfeit', label: 'Produto falsificado recebido', icon: '🎭', positive: false, negative: true },
      { signal: 'ml_dispute_lost', label: 'Disputa perdida / sem reembolso', icon: '🔄', positive: false, negative: true },
      { signal: 'suspicious', label: 'Suspeito (não confirmado)', icon: '🤨', positive: false, negative: false }
    ]
  },

  // ========== WALLAPOP (Espanha — Classificados P2P) ==========
  // Burlas mais comuns: "Wallapop Envío" falso, pagamento fora da app, bots
  wallapop: {
    contact: [
      { signal: 'ai_photos', label: 'Fotos parecen IA/stock', icon: '🤖', positive: false, negative: true },
      { signal: 'stolen_photos', label: 'Fotos robadas / anuncio clonado', icon: '📋', positive: false, negative: true },
      { signal: 'instant_reply', label: 'Respondió al instante (¿bot?)', icon: '⚡', positive: false, negative: true },
      { signal: 'unrealistic_price', label: 'Precio irreal / muy bajo', icon: '💰', positive: false, negative: false },
      { signal: 'new_account', label: 'Cuenta nueva / sin valoraciones', icon: '🌱', positive: false, negative: false },
      { signal: 'wp_no_wallapop_pay', label: 'Rechaza Wallapop Pay (pide fuera)', icon: '💳', positive: false, negative: true },
      { signal: 'wp_fake_envio', label: '"Wallapop Envío" sospechoso / link falso', icon: '📦', positive: false, negative: true },
      { signal: 'trusted_seller', label: 'Buenas valoraciones / perfil activo', icon: '🏅', positive: true, negative: false }
    ],
    interaction: [
      { signal: 'redirected_chat', label: 'Redirigió a WhatsApp/Telegram', icon: '📲', positive: false, negative: true, hasSub: true },
      { signal: 'pressure_sale', label: 'Presión: "hay más compradores"', icon: '⏱️', positive: false, negative: false },
      { signal: 'unresponsive', label: 'Dejó de responder', icon: '🔇', positive: false, negative: false },
      { signal: 'wp_fake_link', label: 'Envió enlace de pago falso', icon: '🔗', positive: false, negative: true },
      { signal: 'accepted_meeting', label: 'Acepta quedar en persona', icon: '🤝', positive: true, negative: false }
    ],
    result: [
      { signal: 'success', label: 'Transacción correcta', icon: '✅', positive: true, negative: false },
      { signal: 'as_described', label: 'Producto como anunciado', icon: '👍', positive: true, negative: false },
      { signal: 'scam', label: 'Estafa confirmada', icon: '🚨', positive: false, negative: true },
      { signal: 'lost_money', label: 'Perdí dinero', icon: '📉', positive: false, negative: true },
      { signal: 'never_arrived', label: 'Artículo nunca llegó', icon: '📭', positive: false, negative: true },
      { signal: 'seller_vanished', label: 'Desapareció tras el pago', icon: '👻', positive: false, negative: true },
      { signal: 'suspicious', label: 'Sospechoso (sin confirmar)', icon: '🤨', positive: false, negative: false }
    ]
  },

  // ========== LEBONCOIN (França — Classificados) ==========
  // Burlas mais comuns: página de "protection acheteur" falsa, links de entrega falsos
  leboncoin: {
    contact: [
      { signal: 'ai_photos', label: 'Photos semblent IA/stock', icon: '🤖', positive: false, negative: true },
      { signal: 'stolen_photos', label: 'Photos volées / annonce clonée', icon: '📋', positive: false, negative: true },
      { signal: 'instant_reply', label: 'Réponse instantanée (bot ?)', icon: '⚡', positive: false, negative: true },
      { signal: 'unrealistic_price', label: 'Prix trop bas / irréaliste', icon: '💰', positive: false, negative: false },
      { signal: 'new_account', label: 'Nouveau compte / pas d\'avis', icon: '🌱', positive: false, negative: false },
      { signal: 'lbc_chatonly', label: 'Refuse tout contact hors chat', icon: '💬', positive: false, negative: false },
      { signal: 'trusted_seller', label: 'Bons avis / profil actif', icon: '🏅', positive: true, negative: false }
    ],
    interaction: [
      { signal: 'redirected_chat', label: 'Redirigé vers WhatsApp/Telegram', icon: '📲', positive: false, negative: true, hasSub: true },
      { signal: 'pressure_sale', label: 'Pression: "autre acheteur intéressé"', icon: '⏱️', positive: false, negative: false },
      { signal: 'unresponsive', label: 'A arrêté de répondre', icon: '🔇', positive: false, negative: false },
      { signal: 'lbc_fake_protection', label: 'Lien "protection acheteur" suspect', icon: '🔗', positive: false, negative: true },
      { signal: 'lbc_fake_delivery', label: 'Lien de livraison frauduleux (Colissimo faux)', icon: '📦', positive: false, negative: true },
      { signal: 'accepted_meeting', label: 'Accepte une rencontre en personne', icon: '🤝', positive: true, negative: false }
    ],
    result: [
      { signal: 'success', label: 'Transaction réussie', icon: '✅', positive: true, negative: false },
      { signal: 'as_described', label: 'Conforme à l\'annonce', icon: '👍', positive: true, negative: false },
      { signal: 'scam', label: 'Arnaque confirmée', icon: '🚨', positive: false, negative: true },
      { signal: 'lost_money', label: 'Argent perdu', icon: '📉', positive: false, negative: true },
      { signal: 'never_arrived', label: 'Colis jamais arrivé', icon: '📭', positive: false, negative: true },
      { signal: 'seller_vanished', label: 'Disparu après paiement', icon: '👻', positive: false, negative: true },
      { signal: 'suspicious', label: 'Suspect (non confirmé)', icon: '🤨', positive: false, negative: false }
    ]
  },

  // ========== KLEINANZEIGEN (Alemanha — Classificados) ==========
  // Burlas mais comuns: "Sicherheitscheck" falso, PayPal Freunde/Familie, bots
  kleinanzeigen: {
    contact: [
      { signal: 'ai_photos', label: 'Fotos wirken KI/Stock', icon: '🤖', positive: false, negative: true },
      { signal: 'stolen_photos', label: 'Gestohlene Fotos / geklontes Inserat', icon: '📋', positive: false, negative: true },
      { signal: 'instant_reply', label: 'Sofortige Antwort (Bot?)', icon: '⚡', positive: false, negative: true },
      { signal: 'unrealistic_price', label: 'Preis unrealistisch / zu niedrig', icon: '💰', positive: false, negative: false },
      { signal: 'new_account', label: 'Neues Konto / keine Bewertungen', icon: '🌱', positive: false, negative: false },
      { signal: 'ka_only_chat', label: 'Verweigert Telefonat / nur Chat', icon: '💬', positive: false, negative: false },
      { signal: 'trusted_seller', label: 'Gute Bewertungen / aktives Profil', icon: '🏅', positive: true, negative: false }
    ],
    interaction: [
      { signal: 'redirected_chat', label: 'Weiterleitung zu WhatsApp/Telegram', icon: '📲', positive: false, negative: true, hasSub: true },
      { signal: 'friends_family_payment', label: 'PayPal "Freunde & Familie" verlangt', icon: '💳', positive: false, negative: true },
      { signal: 'pressure_sale', label: 'Kaufdruck: "anderer Interessent"', icon: '⏱️', positive: false, negative: false },
      { signal: 'unresponsive', label: 'Keine Antwort mehr', icon: '🔇', positive: false, negative: false },
      { signal: 'ka_sicherheitscheck', label: '"Sicherheitscheck"-Link verschickt', icon: '🔗', positive: false, negative: true },
      { signal: 'ka_fake_schutz', label: 'Gefälschte Käuferschutz-Seite', icon: '🛡️', positive: false, negative: true },
      { signal: 'accepted_meeting', label: 'Persönliche Übergabe akzeptiert', icon: '🤝', positive: true, negative: false }
    ],
    result: [
      { signal: 'success', label: 'Transaktion erfolgreich', icon: '✅', positive: true, negative: false },
      { signal: 'as_described', label: 'Wie beschrieben erhalten', icon: '👍', positive: true, negative: false },
      { signal: 'scam', label: 'Betrug bestätigt', icon: '🚨', positive: false, negative: true },
      { signal: 'lost_money', label: 'Geld verloren', icon: '📉', positive: false, negative: true },
      { signal: 'never_arrived', label: 'Artikel nie angekommen', icon: '📭', positive: false, negative: true },
      { signal: 'seller_vanished', label: 'Nach Zahlung verschwunden', icon: '👻', positive: false, negative: true },
      { signal: 'suspicious', label: 'Verdächtig (nicht bestätigt)', icon: '🤨', positive: false, negative: false }
    ]
  },

  // ========== SUBITO.IT (Itália — Classificados) ==========
  // Burlas mais comuns: página "Subito Protect" falsa, pedidos PostePay, bots
  subito: {
    contact: [
      { signal: 'ai_photos', label: 'Foto sembrano IA/stock', icon: '🤖', positive: false, negative: true },
      { signal: 'stolen_photos', label: 'Foto rubate / annuncio clonato', icon: '📋', positive: false, negative: true },
      { signal: 'instant_reply', label: 'Risposta istantanea (bot?)', icon: '⚡', positive: false, negative: true },
      { signal: 'unrealistic_price', label: 'Prezzo irrealistico / troppo basso', icon: '💰', positive: false, negative: false },
      { signal: 'new_account', label: 'Account nuovo / nessuna recensione', icon: '🌱', positive: false, negative: false },
      { signal: 'trusted_seller', label: 'Buone recensioni / profilo attivo', icon: '🏅', positive: true, negative: false }
    ],
    interaction: [
      { signal: 'redirected_chat', label: 'Reindirizzato su WhatsApp/Telegram', icon: '📲', positive: false, negative: true, hasSub: true },
      { signal: 'pressure_sale', label: 'Pressione: "altro compratore"', icon: '⏱️', positive: false, negative: false },
      { signal: 'unresponsive', label: 'Ha smesso di rispondere', icon: '🔇', positive: false, negative: false },
      { signal: 'sub_fake_protect', label: 'Link "Subito Protect" sospetto', icon: '🔗', positive: false, negative: true },
      { signal: 'sub_postepay', label: 'Chiede ricarica PostePay / fuori app', icon: '💳', positive: false, negative: true },
      { signal: 'accepted_meeting', label: 'Accetta consegna a mano', icon: '🤝', positive: true, negative: false }
    ],
    result: [
      { signal: 'success', label: 'Transazione riuscita', icon: '✅', positive: true, negative: false },
      { signal: 'as_described', label: 'Come descritto nell\'annuncio', icon: '👍', positive: true, negative: false },
      { signal: 'scam', label: 'Truffa confermata', icon: '🚨', positive: false, negative: true },
      { signal: 'lost_money', label: 'Ho perso denaro', icon: '📉', positive: false, negative: true },
      { signal: 'never_arrived', label: 'Articolo mai arrivato', icon: '📭', positive: false, negative: true },
      { signal: 'seller_vanished', label: 'Sparito dopo il pagamento', icon: '👻', positive: false, negative: true },
      { signal: 'suspicious', label: 'Sospetto (non confermato)', icon: '🤨', positive: false, negative: false }
    ]
  },

  // ========== eBay (Global — marketplace de segunda mão e novo) ==========
  ebay: {
    contact: [
      { signal: 'ai_photos',         label: 'Fotos geradas por IA / stock',    icon: '🤖', positive: false, negative: true },
      { signal: 'stolen_photos',      label: 'Fotos roubadas / anúncio clonado', icon: '📋', positive: false, negative: true },
      { signal: 'new_seller',         label: 'Vendedor novo (< 10 avaliações)', icon: '🌱', positive: false, negative: false },
      { signal: 'low_feedback',       label: 'Feedback negativo / baixo',        icon: '⭐', positive: false, negative: true },
      { signal: 'unrealistic_price',  label: 'Preço muito abaixo do mercado',    icon: '💰', positive: false, negative: false },
      { signal: 'vague_description',  label: 'Descrição vaga / sem detalhes',    icon: '📝', positive: false, negative: false },
      { signal: 'no_returns',         label: 'Sem política de devoluções',        icon: '🚫', positive: false, negative: false },
      { signal: 'good_feedback',      label: 'Vendedor com excelente feedback',  icon: '🏅', positive: true,  negative: false },
      { signal: 'fast_reply',         label: 'Respondeu rapidamente',             icon: '💬', positive: true,  negative: false }
    ],
    interaction: [
      { signal: 'payment_outside',    label: 'Pediu pagamento FORA do eBay',    icon: '💳', positive: false, negative: true },
      { signal: 'fake_payment_link',  label: 'Link de pagamento falso',          icon: '🔗', positive: false, negative: true },
      { signal: 'redirected_chat',    label: 'Redirecionou para email/WhatsApp', icon: '📲', positive: false, negative: true, hasSub: true },
      { signal: 'asked_personal_data',label: 'Pediu dados pessoais / bancários', icon: '🪪', positive: false, negative: true },
      { signal: 'pressure_sale',      label: 'Pressão para comprar agora',       icon: '⏱️', positive: false, negative: false },
      { signal: 'accepted_returns',   label: 'Aceita devoluções',                icon: '🔄', positive: true,  negative: false },
      { signal: 'extra_photos',       label: 'Enviou fotos extra a pedido',      icon: '📸', positive: true,  negative: false }
    ],
    result: [
      { signal: 'scam',               label: 'Burla confirmada',                 icon: '🚨', positive: false, negative: true },
      { signal: 'lost_money',         label: 'Perdi dinheiro',                   icon: '📉', positive: false, negative: true },
      { signal: 'never_arrived',      label: 'Produto nunca chegou',             icon: '📦', positive: false, negative: true },
      { signal: 'wrong_item',         label: 'Produto diferente do anunciado',   icon: '🎁', positive: false, negative: true },
      { signal: 'counterfeit',        label: 'Produto falsificado',              icon: '🎭', positive: false, negative: true },
      { signal: 'suspicious',         label: 'Suspeito (não confirmado)',         icon: '🤨', positive: false, negative: false },
      { signal: 'success',            label: 'Transação correu bem',             icon: '🤝', positive: true,  negative: false },
      { signal: 'as_described',       label: 'Conforme descrito',                icon: '✅', positive: true,  negative: false },
      { signal: 'fast_shipping',      label: 'Envio rápido',                     icon: '🚀', positive: true,  negative: false }
    ]
  },

  // ========== Amazon (Global) ==========
  amazon: {
    contact: [
      { signal: 'ai_photos',          label: 'Fotos de stock / IA',              icon: '🤖', positive: false, negative: true },
      { signal: 'fake_reviews',       label: 'Avaliações suspeitas / compradas', icon: '⭐', positive: false, negative: true },
      { signal: 'unrealistic_price',  label: 'Preço bom demais',                 icon: '💰', positive: false, negative: false },
      { signal: 'third_party_seller', label: 'Vendedor terceiro sem histórico',  icon: '🌱', positive: false, negative: false },
      { signal: 'vague_description',  label: 'Descrição vaga / traduzida',       icon: '📝', positive: false, negative: false },
      { signal: 'verified_seller',    label: 'Vendedor Amazon Verified',         icon: '✅', positive: true,  negative: false },
      { signal: 'good_reviews',       label: 'Muitas avaliações positivas reais',icon: '🏅', positive: true,  negative: false }
    ],
    interaction: [
      { signal: 'payment_outside',    label: 'Pediu pagamento fora da Amazon',   icon: '💳', positive: false, negative: true },
      { signal: 'fake_invoice',       label: 'Fatura / garantia falsa',          icon: '📄', positive: false, negative: true },
      { signal: 'counterfeit',        label: 'Produto falsificado',              icon: '🎭', positive: false, negative: true },
      { signal: 'no_returns',         label: 'Recusa devoluções',                icon: '🚫', positive: false, negative: false },
      { signal: 'accepted_returns',   label: 'Devoluções fáceis',                icon: '🔄', positive: true,  negative: false }
    ],
    result: [
      { signal: 'scam',               label: 'Burla confirmada',                 icon: '🚨', positive: false, negative: true },
      { signal: 'counterfeit',        label: 'Produto falsificado recebido',     icon: '🎭', positive: false, negative: true },
      { signal: 'never_arrived',      label: 'Nunca chegou',                     icon: '📦', positive: false, negative: true },
      { signal: 'wrong_item',         label: 'Produto errado',                   icon: '🎁', positive: false, negative: true },
      { signal: 'suspicious',         label: 'Suspeito',                         icon: '🤨', positive: false, negative: false },
      { signal: 'success',            label: 'Transação correu bem',             icon: '🤝', positive: true,  negative: false },
      { signal: 'as_described',       label: 'Conforme descrito',                icon: '✅', positive: true,  negative: false },
      { signal: 'fast_shipping',      label: 'Envio rápido',                     icon: '🚀', positive: true,  negative: false }
    ]
  }
};

// Sub-botões para "Redirecionou Conversa"
const SUB_BUTTONS = [
  { signal: 'redirect_whatsapp', label: 'WhatsApp', icon: '🟢', color: '#22c55e' },
  { signal: 'redirect_telegram', label: 'Telegram', icon: '🔵', color: '#3b82f6' },
  { signal: 'redirect_sms', label: 'SMS', icon: '💬', color: '#facc15' },
  { signal: 'redirect_email', label: 'Email', icon: '📧', color: '#e2e8f0' },
  { signal: 'redirect_outro', label: 'Outro', icon: '🔗', color: '#111827' }
];

// Regras de contradição
const CONTRADICTIONS = {
  // IDEALISTA / DEFAULT
  'answered_call': ['doesnt_answer', 'number_off_or_fake'],
  'doesnt_answer': ['answered_call'],
  'number_off_or_fake': ['answered_call'],
  'replied_messages': ['seen_no_reply'],
  'seen_no_reply': ['replied_messages'],
  'visit_done': ['refused_visit'],
  'refused_visit': ['visit_done'],
  
  // OLX / FACEBOOK / CUSTOJUSTO — CONTACTO
  'answered_call': ['seen_no_reply'],
  'seen_no_reply': ['answered_call'],
  // trusted_seller: contradiz com sinais de "conta nova" (CONTACTO) e com resultados negativos (cross-platform).
  // Nota: também é usado por Standvirtual / Chinashops como sinal "Vendedor confiável".
  'trusted_seller': ['new_account', 'fake_profile_pic', 'scam', 'lost_money', 'suspicious'],
  'new_account': ['trusted_seller'],
  'fake_profile_pic': ['trusted_seller'],

  // OLX / FACEBOOK / CUSTOJUSTO — INTERAÇÃO
  'accepted_meeting': ['refused_meeting', 'abroad_excuse'],
  'refused_meeting': ['accepted_meeting'],
  'abroad_excuse': ['accepted_meeting'],
  'shows_invoice': ['fake_invoice'],
  'fake_invoice': ['shows_invoice', 'with_invoice'],

  // STANDVIRTUAL
  'saw_car': ['deposit_before_see', 'abroad_car'],
  'deposit_before_see': ['saw_car'],
  'abroad_car': ['saw_car'],
  'test_drive_ok': ['no_test_drive'],
  'no_test_drive': ['test_drive_ok'],
  'docs_complete': ['docs_incomplete'],
  'docs_incomplete': ['docs_complete'],
  'history_clear': ['accident_hidden', 'debts_hidden'],
  'accident_hidden': ['history_clear'],
  'debts_hidden': ['history_clear'],

  // CHINASHOPS
  'bad_quality': ['good_quality'],
  'good_quality': ['bad_quality'],
  'wrong_size': ['true_size'],
  'true_size': ['wrong_size'],

  // VINTED
  'payment_outside': ['fast_responses'],
  'counterfeit_received': ['success', 'as_described'],
  'not_as_described': ['success', 'as_described'],
  'fast_shipping': ['never_arrived'],
  'extra_photos': ['no_measures'],
  'good_reviews': ['new_account'],
  'verified_profile': ['new_account'],

  // RESULTADO (OLX / FACEBOOK / CUSTOJUSTO — mutuamente exclusivos)
  'success': ['scam', 'lost_money', 'never_arrived', 'wrong_item', 'seller_vanished', 'suspicious', 'counterfeit_received', 'not_as_described'],
  'verified_seller': ['scam', 'lost_money', 'seller_vanished'],
  'as_described': ['wrong_item', 'never_arrived', 'counterfeit_received', 'not_as_described'],
  'with_invoice': ['fake_invoice'],
  'scam': ['success', 'verified_seller'],
  'lost_money': ['success', 'verified_seller'],
  'never_arrived': ['success', 'as_described'],
  'wrong_item': ['success', 'as_described'],
  'seller_vanished': ['success', 'verified_seller'],
  'suspicious': ['success'],

  // MERCADO LIVRE
  'ml_gold_seller': ['ml_fake_seller', 'ml_new_seller', 'ml_scam'],
  'ml_platinum_seller': ['ml_fake_seller', 'ml_new_seller', 'ml_scam'],
  'ml_fulfillment': ['ml_item_not_arrived', 'ml_scam'],
  'ml_new_seller': ['ml_gold_seller', 'ml_platinum_seller'],
  'ml_fake_seller': ['ml_gold_seller', 'ml_platinum_seller', 'ml_success'],
  'ml_success': ['ml_scam', 'ml_item_not_arrived', 'ml_different_item', 'ml_counterfeit', 'ml_dispute_lost'],
  'ml_scam': ['ml_success', 'ml_dispute_won'],
  'ml_dispute_won': ['ml_dispute_lost', 'ml_scam'],
  'ml_dispute_lost': ['ml_dispute_won'],
  'ml_item_not_arrived': ['ml_success', 'as_described'],
  'ml_counterfeit': ['ml_success', 'as_described'],
  'ml_different_item': ['ml_success', 'as_described'],
  'ml_pix_redirect': ['ml_success'],
  'ml_boleto_fraud': ['ml_success'],

  // WALLAPOP
  'wp_no_wallapop_pay': ['success'],
  'wp_fake_envio': ['success', 'as_described'],
  'wp_fake_link': ['success'],

  // LEBONCOIN
  'lbc_fake_protection': ['success', 'as_described'],
  'lbc_fake_delivery': ['success', 'as_described'],

  // KLEINANZEIGEN
  'ka_sicherheitscheck': ['success', 'as_described'],
  'ka_fake_schutz': ['success', 'as_described'],

  // SUBITO
  'sub_fake_protect': ['success', 'as_described'],
  'sub_postepay': ['success'],

  // EBAY
  'good_feedback': ['new_seller', 'low_feedback', 'scam', 'lost_money'],
  'new_seller': ['good_feedback'],
  'low_feedback': ['good_feedback'],
  'no_returns': ['accepted_returns'],
  'accepted_returns': ['no_returns'],
  'as_described': ['wrong_item', 'never_arrived', 'counterfeit'],
  'success': ['scam', 'lost_money', 'counterfeit', 'never_arrived'],
  'counterfeit': ['as_described', 'success'],
  'payment_outside': ['success', 'as_described']
};

// Helper para obter sinais de uma plataforma e fase
function getSignalsForPhase(platform, phase) {
  const platformData = SIGNALS_DATA[platform] || SIGNALS_DATA['default'];
  return platformData[phase] || [];
}

// Helper para obter informação de um sinal específico.
// Cache em Map: chamado N× por sinal durante render do painel Stats; sem cache
// itera 3 fases × Array.find linear por cada lookup. O conteúdo de SIGNALS_DATA
// é estático após o load, por isso o cache é seguro durante toda a sessão.
const _SIGNAL_INFO_CACHE = new Map();
function getSignalInfo(platform, signalType) {
  const cacheKey = `${platform}:${signalType}`;
  if (_SIGNAL_INFO_CACHE.has(cacheKey)) return _SIGNAL_INFO_CACHE.get(cacheKey);

  const platformData = SIGNALS_DATA[platform] || SIGNALS_DATA['default'];
  let result = null;
  for (const phase of Object.values(PHASES)) {
    const signal = platformData[phase]?.find(s => s.signal === signalType);
    if (signal) { result = signal; break; }
  }
  _SIGNAL_INFO_CACHE.set(cacheKey, result);
  return result;
}

// Helper para obter a cor do card baseada no tipo
function getSignalColorClass(signal) {
  if (!signal) return 'as-card-warning';
  if (signal.positive) return 'as-card-positive';
  if (signal.negative) return 'as-card-negative';
  return 'as-card-warning';
}

// Helper para obter a cor da barra de progresso
function getSignalBarColor(signal) {
  if (!signal) return '#facc15';
  if (signal.positive) return '#10b981';
  if (signal.negative) return '#ef4444';
  return '#facc15';
}

// Verificar se um sinal tem contradições
function getContradictions(signalType) {
  return CONTRADICTIONS[signalType] || [];
}

// País a partir do domínio do site. Tabela ordenada — primeira regex que casa ganha.
// Para adicionar país novo: inserir [/\.tld$/, 'XX'] antes de defaultCountry.
const COUNTRY_BY_DOMAIN = [
  [/\.pt$/,                  'PT'],
  [/\.es$|wallapop\.com$/,   'ES'],
  [/\.fr$/,                  'FR'],
  [/\.de$/,                  'DE'],
  [/\.it$/,                  'IT'],
  [/\.co\.uk$/,              'GB'],
  [/\.com\.br$/,             'BR'],
];
function getCountryFromHost(host) {
  const match = COUNTRY_BY_DOMAIN.find(([rx]) => rx.test(host));
  return match ? match[1] : 'OTHER';
}
