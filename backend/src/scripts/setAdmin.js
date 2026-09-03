/**
 * Grant, revoke and list admin rights.
 *
 *   npm run set-admin -- --list
 *   npm run set-admin -- shop@example.com
 *   npm run set-admin -- shop@example.com --revoke
 *
 * Admin is an `admin: true` custom claim on the Firebase account. It rides
 * inside the signed ID token, so the API can trust it without a lookup, and
 * granting one no longer means editing ADMIN_UIDS on Render and waiting for a
 * redeploy -- which is how the shop owner ended up an admin on a developer's
 * laptop and not in their own shop.
 *
 * This touches Firebase only. It needs no database, so it runs even when Atlas
 * is unreachable.
 */
import { firebaseAuth } from '../config/firebase.js';
import config from '../config/env.js';

const args = process.argv.slice(2);
const wantsList = args.includes('--list');
const wantsRevoke = args.includes('--revoke');
const identifier = args.find((arg) => !arg.startsWith('--'));

const usage = () => {
  console.log(`
Usage:
  npm run set-admin -- --list                     who is an admin today
  npm run set-admin -- <email|uid>                make them an admin
  npm run set-admin -- <email|uid> --revoke       take it away
`);
};

/** Accept whichever of the two the caller has to hand. */
const findUser = async (value) => {
  if (value.includes('@')) return firebaseAuth.getUserByEmail(value);
  return firebaseAuth.getUser(value);
};

const describe = (user) => `${user.email ?? '(no email)'}  ${user.uid}`;

/**
 * Every account carrying the claim.
 *
 * Firebase has no "query users by claim", so this walks the whole list a
 * thousand at a time. That is fine at this shop's size and would want rethinking
 * at a hundred thousand customers.
 */
const listAdmins = async () => {
  const admins = [];
  let pageToken;

  do {
    const page = await firebaseAuth.listUsers(1000, pageToken);
    for (const user of page.users) {
      if (user.customClaims?.admin === true) admins.push(user);
    }
    pageToken = page.pageToken;
  } while (pageToken);

  console.log(`\nAdmins by custom claim (${admins.length}):`);
  if (admins.length === 0) {
    console.log('  none — nobody has been granted the claim yet');
  } else {
    admins.forEach((user) => console.log(`  ${describe(user)}`));
  }

  /*
    ADMIN_UIDS still grants access, so listing the claim alone would understate
    who can get in. Anyone appearing only here is relying on the fallback, and
    is the reason the variable cannot be emptied yet.
  */
  const claimUids = new Set(admins.map((user) => user.uid));
  const envOnly = config.adminUids.filter((uid) => !claimUids.has(uid));

  console.log(`\nADMIN_UIDS in this environment (${config.adminUids.length}):`);
  if (config.adminUids.length === 0) {
    console.log('  empty');
  } else {
    for (const uid of config.adminUids) {
      let label = uid;
      try {
        const user = await firebaseAuth.getUser(uid);
        label = describe(user);
      } catch {
        label = `${uid}  (no such Firebase account)`;
      }
      console.log(`  ${label}${claimUids.has(uid) ? '  [also has the claim]' : ''}`);
    }
  }

  if (envOnly.length > 0) {
    console.log(
      `\n${envOnly.length} account(s) rely on ADMIN_UIDS alone. Grant them the` +
        ' claim before emptying that variable, here and in Render.'
    );
  } else if (config.adminUids.length > 0) {
    console.log(
      '\nEveryone in ADMIN_UIDS also holds the claim, so the variable can be' +
        ' emptied in Render and in backend/.env.'
    );
  }
};

const setAdmin = async (value, grant) => {
  const user = await findUser(value);
  const existing = user.customClaims ?? {};

  if (grant && existing.admin === true) {
    console.log(`Already an admin: ${describe(user)}`);
    return;
  }
  if (!grant && existing.admin !== true) {
    console.log(`Not an admin anyway: ${describe(user)}`);
    return;
  }

  /*
    Merge, never replace. setCustomUserClaims overwrites the whole object, so
    building it from scratch would silently drop any other claim the account
    carries. There are none today; there is no reason to make that a trap.
  */
  const claims = { ...existing };
  if (grant) {
    claims.admin = true;
  } else {
    delete claims.admin;
  }

  await firebaseAuth.setCustomUserClaims(user.uid, claims);

  console.log(`${grant ? 'Granted' : 'Revoked'} admin: ${describe(user)}`);

  if (grant) {
    console.log(
      '\nThey must sign out and back in for it to take effect.\n' +
        'The claim is baked into the ID token, and the one their browser is\n' +
        'holding was minted before this ran. It would refresh on its own within\n' +
        'the hour; signing out is the way to have it now.'
    );
  } else {
    console.log(
      '\nTheir current token still carries the claim until it expires, up to an\n' +
        'hour. To end it immediately:\n' +
        `  node -e "import('./src/config/firebase.js').then(m =>` +
        ` m.firebaseAuth.revokeRefreshTokens('${user.uid}'))"\n` +
        'and note that ADMIN_UIDS is a separate grant -- if they are listed\n' +
        'there, revoking the claim changes nothing.'
    );

    if (config.adminUids.includes(user.uid)) {
      console.log(
        `\nWARNING: ${user.uid} is still in ADMIN_UIDS, so they remain an admin.\n` +
          'Remove them from backend/.env and from Render as well.'
      );
    }
  }
};

const main = async () => {
  if (wantsList) return listAdmins();

  if (!identifier) {
    usage();
    process.exitCode = 1;
    return;
  }

  return setAdmin(identifier, !wantsRevoke);
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    if (error.code === 'auth/user-not-found') {
      console.error(`No Firebase account for "${identifier}".`);
    } else {
      console.error('[set-admin] failed:', error.message);
    }
    process.exit(1);
  });
