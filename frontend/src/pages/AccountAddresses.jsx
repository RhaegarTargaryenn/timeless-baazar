import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';

import AddressManager from '../components/AddressManager';
import { pageIn, tap } from '../lib/motion';

/**
 * Delivery addresses, reached from Account.
 *
 * The design has no screen for this — its Account row just points at a chevron.
 * `AddressManager` already does the whole job (list, add, edit, delete, set
 * default) and is what Checkout uses, so this is only the header around it. One
 * component means an address edited here and an address picked at checkout can
 * never drift apart.
 */
const AccountAddresses = () => {
  const navigate = useNavigate();

  // AddressManager is built for checkout, where picking one matters. Here the
  // selection is only what it highlights, so it lives and dies with the screen.
  const [selected, setSelected] = useState(null);

  return (
    <motion.div {...pageIn} className="min-h-screen bg-surface">
      <header className="relative px-[25px] pt-12 pb-5 border-b border-line">
        <motion.button
          whileTap={tap}
          onClick={() => navigate('/account')}
          aria-label="Back to account"
          className="absolute left-[15px] top-[42px] w-10 h-10 flex items-center justify-center text-ink"
        >
          <ChevronLeft className="w-6 h-6" strokeWidth={2.6} />
        </motion.button>

        <h1 className="text-center text-[20px] font-bold text-ink">Delivery Address</h1>
      </header>

      <div className="px-[25px] pt-6 pb-[calc(8rem+env(safe-area-inset-bottom))] sm:pb-10">
        <AddressManager onSelectAddress={setSelected} selectedAddressId={selected?._id} />
      </div>
    </motion.div>
  );
};

export default AccountAddresses;
