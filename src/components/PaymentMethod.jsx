import React from 'react';
import { motion } from 'framer-motion';
import { Wallet, Check, Clock } from 'lucide-react';
import { SiPhonepe, SiPaytm, SiGooglepay } from 'react-icons/si';

import { spring, tap } from '../lib/motion';
import { cx } from './ui';

const AVAILABLE = [
  {
    id: 'cod',
    name: 'Cash on delivery',
    hint: 'Pay the delivery person when your order arrives',
    icon: <Wallet className="w-5 h-5" />,
  },
];

/**
 * Everything the shop does not actually accept yet is listed as coming soon
 * rather than hidden, so a customer looking for UPI can see it is planned
 * instead of concluding the shop cannot take their money.
 */
const COMING_SOON = [
  { id: 'phonepe', name: 'PhonePe', icon: <SiPhonepe className="w-5 h-5" /> },
  { id: 'paytm', name: 'Paytm', icon: <SiPaytm className="w-5 h-5" /> },
  { id: 'gpay', name: 'Google Pay', icon: <SiGooglepay className="w-5 h-5" /> },
];

const PaymentMethod = ({ onSelectMethod, selectedMethod }) => (
  <div>
    <h2 className="text-base font-bold text-ink mb-3">How would you like to pay?</h2>

    <div className="space-y-2.5">
      {AVAILABLE.map((method) => {
        const active = selectedMethod?.id === method.id;
        return (
          <motion.button
            key={method.id}
            whileTap={tap}
            onClick={() => onSelectMethod(method)}
            className={cx(
              'w-full flex items-center gap-3 p-4 rounded-card border-2 text-left transition-colors',
              active
                ? 'border-brand-600 bg-brand-50 dark:bg-brand-950/30'
                : 'border-line bg-surface-raised'
            )}
          >
            <span
              className={cx(
                'w-11 h-11 rounded-xl flex items-center justify-center shrink-0',
                active ? 'bg-brand-600 text-white' : 'bg-surface-sunken text-ink-muted'
              )}
            >
              {method.icon}
            </span>

            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-ink">{method.name}</span>
              <span className="block text-xs text-ink-muted mt-0.5">{method.hint}</span>
            </span>

            <span
              className={cx(
                'w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0',
                active ? 'border-brand-600 bg-brand-600' : 'border-line'
              )}
            >
              {active && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={spring.snappy}
                >
                  <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                </motion.span>
              )}
            </span>
          </motion.button>
        );
      })}
    </div>

    <div className="mt-6">
      <p className="text-xs font-semibold text-ink-faint mb-2 flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5" />
        Coming soon
      </p>
      <div className="grid grid-cols-3 gap-2">
        {COMING_SOON.map((method) => (
          <div
            key={method.id}
            className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-surface-sunken text-ink-faint"
          >
            {method.icon}
            <span className="text-[10px] font-semibold">{method.name}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default PaymentMethod;
