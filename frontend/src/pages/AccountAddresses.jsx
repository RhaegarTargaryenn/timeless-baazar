import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

import AddressManager from '../components/AddressManager';
import PageHeader from '../components/PageHeader';
import { pageIn } from '../lib/motion';

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
      <PageHeader title="Delivery Address" onBack={() => navigate('/account')} />

      <div className="px-[25px] pt-6 pb-[calc(8rem+env(safe-area-inset-bottom))] sm:pb-10">
        <AddressManager onSelectAddress={setSelected} selectedAddressId={selected?._id} />
      </div>
    </motion.div>
  );
};

export default AccountAddresses;
