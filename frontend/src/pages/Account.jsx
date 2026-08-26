import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag,
  IdCard,
  MapPin,
  CreditCard,
  HelpCircle,
  Info,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  LogOut,
  Phone,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '../context/AuthContext';
import { EASE, pageIn, tap } from '../lib/motion';
import { cx } from '../components/ui';

/**
 * Account, from the Figma source (node `1:1258`).
 *
 * The identity block sits above a full-bleed hairline, then a list of 18px rows
 * with a 24px glyph and a chevron, grouped by hairlines, and a `#F2F3F2` 67px
 * pill at the foot for Log Out.
 *
 * **The design's row list is not reproduced verbatim.** Promo Code and
 * Notifications are dropped: coupons are only ever validated at checkout -- the
 * API has no per-customer coupon list -- and this app sends no notifications, so
 * both rows would open onto nothing. An Admin panel row is added instead, and
 * only for the shop owner, because that is a real destination they need.
 *
 * Rows that lead to another screen carry a right chevron; rows whose content is
 * short enough to sit here expand in place.
 */

const SHOP_PHONES = ['9266667069', '9654653719'];

/** One row: 24px glyph, 18px semibold label, chevron. */
const Row = ({ icon: Icon, label, onClick, expanded, expandable, children, tone }) => (
  <div>
    <motion.button
      whileTap={tap}
      onClick={onClick}
      aria-expanded={expandable ? Boolean(expanded) : undefined}
      className="w-full h-[62px] flex items-center gap-[21px] text-left"
    >
      <Icon
        className={cx('w-6 h-6 shrink-0', tone === 'brand' ? 'text-brand-600' : 'text-ink')}
        strokeWidth={1.8}
      />
      <span
        className={cx(
          'flex-1 text-[18px] font-semibold',
          tone === 'brand' ? 'text-brand-600' : 'text-ink'
        )}
      >
        {label}
      </span>
      {expandable ? (
        <ChevronDown
          className={cx(
            'w-[18px] h-[18px] shrink-0 text-ink transition-transform duration-200',
            expanded ? 'rotate-180' : 'rotate-0'
          )}
        />
      ) : (
        <ChevronRight className="w-[18px] h-[18px] shrink-0 text-ink" strokeWidth={2.4} />
      )}
    </motion.button>

    {expandable && (
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="pb-5 pl-[45px] pr-2 text-[14px] leading-[21px] text-ink-muted">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    )}
  </div>
);

/** A hairline that runs the full width, as the design groups its rows. */
const Divider = () => <div className="h-px bg-line -mx-[25px]" />;

const Account = () => {
  const navigate = useNavigate();
  const { user, profile, isAdmin, signOut } = useAuth();
  const [openRow, setOpenRow] = useState(null);

  const toggle = (id) => setOpenRow((current) => (current === id ? null : id));

  const name = profile?.name || user?.displayName || 'Your account';
  const email = user?.email ?? '';
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out');
      navigate('/');
    } catch {
      toast.error('Could not sign out. Try again.');
    }
  };

  return (
    <motion.div {...pageIn} className="min-h-screen bg-surface flex flex-col">
      {/* ── Identity ─────────────────────────────────────────────────────── */}
      <header className="px-[25px] pt-12 pb-8 flex items-center gap-5">
        {user?.photoURL ? (
          <img
            src={user.photoURL}
            alt=""
            referrerPolicy="no-referrer"
            className="w-[64px] h-[64px] rounded-[27px] object-cover shrink-0"
          />
        ) : (
          /* The design's avatar is a colourful gradient; initials stand in when
             the account has no photo, which every email signup does not. */
          <span className="w-[64px] h-[64px] rounded-[27px] shrink-0 flex items-center justify-center text-[22px] font-bold text-white bg-gradient-to-br from-brand-400 to-[#B7DFF5]">
            {initials || '?'}
          </span>
        )}

        <div className="min-w-0">
          <h1 className="text-[20px] font-bold text-ink truncate">{name}</h1>
          {email && <p className="mt-1 text-[16px] text-ink-muted truncate">{email}</p>}
        </div>
      </header>

      <Divider />

      <div className="px-[25px]">
        <Row icon={ShoppingBag} label="Orders" onClick={() => navigate('/track-order')} />

        <Divider />

        <Row
          icon={IdCard}
          label="My Details"
          expandable
          expanded={openRow === 'details'}
          onClick={() => toggle('details')}
        >
          <dl className="space-y-2">
            <div className="flex gap-2">
              <dt className="w-24 shrink-0 text-ink-faint">Name</dt>
              <dd className="text-ink">{name}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-24 shrink-0 text-ink-faint">Email</dt>
              <dd className="text-ink break-all">{email || '—'}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-24 shrink-0 text-ink-faint">Verified</dt>
              <dd className={user?.emailVerified ? 'text-brand-600' : 'text-coral'}>
                {user?.emailVerified ? 'Yes' : 'Not yet — you will be asked at checkout'}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-ink-faint">
            These come from the account you signed in with. To change them, sign in with a
            different account.
          </p>
        </Row>

        <div className="h-px bg-line" />

        <Row
          icon={MapPin}
          label="Delivery Address"
          onClick={() => navigate('/account/addresses')}
        />

        <div className="h-px bg-line" />

        <Row
          icon={CreditCard}
          label="Payment Methods"
          expandable
          expanded={openRow === 'payment'}
          onClick={() => toggle('payment')}
        >
          <p className="text-ink">Cash on delivery</p>
          <p className="mt-1">
            The shop takes payment at the door. There is nothing to save here, and no card
            details are ever stored.
          </p>
        </Row>

        <Divider />

        <Row
          icon={HelpCircle}
          label="Help"
          expandable
          expanded={openRow === 'help'}
          onClick={() => toggle('help')}
        >
          <p>Call the shop — someone will pick up during opening hours.</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {SHOP_PHONES.map((number) => (
              <a
                key={number}
                href={`tel:${number}`}
                className="inline-flex items-center gap-2 h-11 px-4 rounded-full bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 text-[14px] font-semibold"
              >
                <Phone className="w-4 h-4" />
                {number}
              </a>
            ))}
          </div>
        </Row>

        <Divider />

        <Row
          icon={Info}
          label="About"
          expandable
          expanded={openRow === 'about'}
          onClick={() => toggle('about')}
        >
          <p>
            Timeless Baazar is a real grocery shop delivering daal, rice, flour, spices and
            everyday staples across Delhi NCR.
          </p>
          <p className="mt-2 text-ink-faint">
            Prices are set by the shop and can change — the total you are charged is always
            worked out fresh when the order is placed.
          </p>
        </Row>

        {isAdmin && (
          <>
            <Divider />
            <Row
              icon={ShieldCheck}
              label="Admin panel"
              tone="brand"
              onClick={() => navigate('/admin')}
            />
          </>
        )}

        <Divider />
      </div>

      {/* ── Log out ──────────────────────────────────────────────────────── */}
      <div className="px-[25px] pt-10 pb-[calc(8rem+env(safe-area-inset-bottom))] sm:pb-8 mt-auto">
        <motion.button
          whileTap={tap}
          onClick={handleSignOut}
          className="relative w-full h-[67px] rounded-[19px] bg-surface-sunken text-brand-600 text-[18px] font-semibold flex items-center justify-center"
        >
          <LogOut className="absolute left-[46px] w-6 h-6" strokeWidth={2} />
          Log Out
        </motion.button>
      </div>
    </motion.div>
  );
};

export default Account;
