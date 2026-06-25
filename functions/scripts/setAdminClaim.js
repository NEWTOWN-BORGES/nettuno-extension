/**
 * Define (uma vez) a custom claim { admin: true } na conta de administrador.
 * Substitui o antigo check por email hardcoded nas firestore.rules.
 *
 * PRÉ-REQUISITOS (NÃO precisa do plano Blaze):
 *   1. Autenticação local com Application Default Credentials:
 *        gcloud auth application-default login
 *      (em alternativa, definir GOOGLE_APPLICATION_CREDENTIALS para uma
 *       service account key — mas a ADC evita criar/descarregar chaves).
 *   2. firebase-admin instalado (já é dependência das functions):
 *        cd functions && npm install
 *
 * USO:
 *   node scripts/setAdminClaim.js teu-email@gmail.com
 *
 * IMPORTANTE — ordem para não perder o acesso ao dashboard:
 *   a) Corre este script.
 *   b) Faz LOGOUT/LOGIN no dashboard (a claim só entra num ID token novo).
 *   c) SÓ DEPOIS faz deploy das firestore.rules novas (baseadas em admin==true).
 */
const admin = require('firebase-admin');

admin.initializeApp({ projectId: 'nettuno-e6036' });

const email = process.argv[2];
if (!email) {
  console.error('Uso: node scripts/setAdminClaim.js <email>');
  process.exit(1);
}

(async () => {
  const user = await admin.auth().getUserByEmail(email);
  await admin.auth().setCustomUserClaims(user.uid, { admin: true });
  console.log(`OK: claim { admin: true } definida para ${email} (uid ${user.uid}).`);
  console.log('Agora: logout/login no dashboard e SÓ DEPOIS faz deploy das rules.');
  process.exit(0);
})().catch((e) => {
  console.error('ERRO:', e.message);
  process.exit(1);
});
