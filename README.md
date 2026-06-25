# NETTUNO

Extensão de browser (Chrome, MV3) que mostra escudos de confiança da comunidade
em anúncios de plataformas de compra/venda online (OLX, Vinted, eBay, Amazon,
Idealista, Facebook Marketplace, Mercado Livre, entre outras) — para ajudar a
evitar burlas antes de pagar.

- Instalar: https://chromewebstore.google.com/detail/nettuno-%E2%80%94-prote%C3%A7%C3%A3o-contra/mgddelgeeeopanechjlbgelhbmnegdpl
- Site: https://nettuno-e6036.web.app/
- Política de privacidade: [privacy.html](privacy.html)

## O que está neste repositório

**Tudo** — cliente e backend. O projeto é open source:

- **Cliente** (raiz): content scripts, heurísticas, UI dos escudos/painel,
  integração Firebase Auth/Firestore. É o mesmo código que corre no navegador.
- **Backend** ([`functions/`](functions/)): as Cloud Functions que processam os
  votos — o motor de scoring ([`functions/lib/scoreEngine.js`](functions/lib/scoreEngine.js):
  Bayesiano + Wilson, votos com peso por cor e decaimento), confiança do
  utilizador ([`functions/lib/trust.js`](functions/lib/trust.js)), e o treino
  das heurísticas a partir dos votos ([`functions/training.js`](functions/training.js)).
- **Regras de segurança**: [`firestore.rules`](firestore.rules).

## O que NÃO está aqui

Só o que não é código: os **segredos de runtime** (ex.: `IP_SALT`, lido do
ambiente, nunca no código) e os **dados de votos da comunidade** (que vivem no
Firestore em produção). O valor acumulado do projeto é esse histórico da
comunidade — não o código, que está todo aberto.

## Stack

JavaScript vanilla (sem framework) + Manifest V3 no cliente; Firebase
(Firestore + Cloud Functions, Node 20 + App Check) no backend.

## Correr o backend

```bash
cd functions && npm install

# Deploy das regras
firebase deploy --only firestore:rules --project <o-teu-projeto>

# Deploy das functions (requer plano Blaze)
firebase deploy --only functions --project <o-teu-projeto>
```

O acesso de admin (dashboard / treino manual) é controlado por uma custom claim
`admin` definida via Admin SDK — ver
[`functions/scripts/setAdminClaim.js`](functions/scripts/setAdminClaim.js).

## Licença

MIT — ver [LICENSE](LICENSE). O nome "NETTUNO" e o logótipo não estão cobertos
pela licença.
