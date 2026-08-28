/**
 * Check if a message asks about POS workflows like pending payments, returns, exchanges, or bill verification.
 */
export function isSellerPosWorkflowQuestion(message: string): boolean {
  const normalized = message.toLowerCase();
  return /(card|upi|wallet|bank).*(pending|payment|sale)|(pending|payment|sale).*(card|upi|wallet|bank)|what does.*(paid|pending|partially)|why.*return|can't.*return|cannot.*return|return.*(quantity|gram|metal)|exchange|store credit|verify.*bill|bill.*verify|qr.*bill/.test(
    normalized,
  );
}

/**
 * Generate a contextual help reply for recognized POS workflow questions.
 */
export function formatSellerPosWorkflowReply(message: string): string {
  const normalized = message.toLowerCase();

  if (/(why.*return|can't.*return|cannot.*return|return.*(quantity|gram|metal))/.test(normalized)) {
    return "A return cannot exceed the quantity still outstanding on the original bill, so a previously returned portion is not available again. Open POS → Return / Exchange, find the original bill, and use the remaining quantity shown for that item. The historic bill line amount is used for the refund.";
  }

  if (/(exchange|store credit)/.test(normalized)) {
    return "Open POS → Return / Exchange and find the original bill. Use the historical line amount and remaining quantity; choose store credit when the customer will use the value on a later purchase. Cash refunds can settle immediately, while a non-cash reversal remains pending until completed.";
  }

  if (/(verify.*bill|bill.*verify|qr.*bill)/.test(normalized)) {
    return "Scan the QR on the printed bill, or open its verification link, to check that invoice. The QR verifies the bill; it does not change a payment's status.";
  }

  if (/what does.*(paid|pending|partially)/.test(normalized)) {
    return "PAID means the full invoice balance has been received. PENDING means a payment is still awaiting actual receipt. PARTIALLY_PAID means some payment is received and a balance remains; open the invoice or pending-payment list and confirm only the payment that has actually arrived.";
  }

  return "A manual card, UPI, wallet, or bank-transfer payment stays pending until the money has actually been received and a cashier chooses Confirm Payment Received. Open the invoice or pending-payment list, select that payment, and confirm it after receipt; do not mark it received merely because checkout or printing finished.";
}
