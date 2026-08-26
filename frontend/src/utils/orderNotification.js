// Order Notification System - Google Sheets Only
// Saves order details to Google Sheets for client to track

// Google Sheets Configuration
// IMPORTANT: Update WEBAPP_URL after deploying Google Apps Script
export const GOOGLE_SHEETS_CONFIG = {
  WEBAPP_URL: import.meta.env.VITE_SHEETS_WEBAPP_URL,
};

/**
 * Format order data for Google Sheets
 */
export const formatForGoogleSheets = (orderData) => {
  const { orderId, userName, userEmail, address, items, total, orderDate } = orderData;
  
  // Format items as comma-separated list
  const itemsList = items
    .map(item => `${item.name} (${item.size}) x${item.quantity}`)
    .join(', ');
  
  // Build full address string
  const fullAddress = address 
    ? `${address.street || ''}${address.street2 ? ', ' + address.street2 : ''}, ${address.city || ''}, ${address.state || ''} - ${address.zipCode || ''}`
    : 'N/A';
  
  return {
    'Order ID': orderId,
    'Date': new Date(orderDate).toLocaleString('en-IN'),
    'Customer Name': userName || 'Guest',
    'Email': userEmail || '-',
    'Address': fullAddress,
    'City': address?.city || '-',
    'State': address?.state || '-',
    'Pincode': address?.zipCode || '-',
    'Items': itemsList,
    'Total Items': items.reduce((sum, item) => sum + item.quantity, 0),
    'Total Amount': total,
    'Payment': orderData.paymentMethod || 'COD',
    'Status': 'Pending',
  };
};

/**
 * Save order to Google Sheets via Apps Script Web App
 */
export const saveToGoogleSheets = async (orderData) => {
  const formattedData = formatForGoogleSheets(orderData);

  console.log("📤 Sending order to Google Sheets (no-cors):", formattedData);

  try {
    await fetch(GOOGLE_SHEETS_CONFIG.WEBAPP_URL, {
      method: "POST",
      mode: "no-cors",              // 🔥 IMPORTANT
      headers: {
        "Content-Type": "text/plain" // 🔥 IMPORTANT (JSON mat bhejo)
      },
      body: JSON.stringify(formattedData),
    });

    console.log("✅ Order request sent (assumed success)");
    return true;

  } catch (error) {
    console.error("❌ Fetch failed:", error);
    throw error;
  }
};


/**
 * Process new order - save to Google Sheets
 */
export const notifyNewOrder = async (orderData) => {
  try {
    // 1. Save to localStorage (backup)
    const existingOrders = JSON.parse(localStorage.getItem('timeless-baazar-orders') || '[]');
    existingOrders.push(orderData);
    localStorage.setItem('timeless-baazar-orders', JSON.stringify(existingOrders));
    console.log('✅ Order saved to localStorage (backup)');
    
    // 2. Save to Google Sheets
    await saveToGoogleSheets(orderData);
    
    return true;
  } catch (error) {
    console.error('❌ Error in notifyNewOrder:', error);
    alert(`⚠️ Order saved locally but failed to send to Google Sheets.\n\nError: ${error.message}\n\nPlease check:\n1. Web App URL is configured correctly\n2. Google Apps Script is deployed\n3. Check browser console for details`);
    return false;
  }
};

