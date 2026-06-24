# NETTUNO

Extensão de browser (Chrome, MV3) que mostra escudos de confiança da comunidade
em anúncios de plataformas de compra/venda online (OLX, Vinted, eBay, Amazon,
Idealista, Facebook Marketplace, entre outras) — para ajudar a evitar burlas
antes de pagar.

- Loja: https://nettuno-e6036.web.app/
- Política de privacidade: [privacy.html](privacy.html)

## O que está neste repositório

O código-fonte completo do **cliente** da extensão: content scripts, lógica de
heurísticas, UI dos escudos/painel, e a integração com Firebase Auth/Firestore.
É o mesmo código que corre no navegador de quem instala a extensão — por isso
está aqui, para inspeção e contributos da comunidade.

## O que NÃO está aqui

O **backend** (Cloud Functions): motor de scoring, lógica de anti-abuso/anti-bot,
pesos de confiança e os dados de votos da comunidade. Essa parte mantém-se
privada — é onde está o verdadeiro valor do projeto (o conhecimento acumulado
pela comunidade), não no código do cliente.

## Stack

JavaScript vanilla (sem framework), Manifest V3, Firebase (Auth + Firestore)
no lado do cliente.

## Licença

MIT para o código — ver [LICENSE](LICENSE). O nome "NETTUNO" e o logótipo não
estão cobertos pela licença.
