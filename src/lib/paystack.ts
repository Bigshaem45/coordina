/**
 * COORDINA Paystack Service
 * Powers live checkout (Card, Instant Bank Transfer, USSD)
 * and the Organizer Payouts / Transfers API (NIBSS account resolution & instant disbursements).
 */

const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '';
const PAYSTACK_SECRET_KEY = import.meta.env.VITE_PAYSTACK_SECRET_KEY || '';

export interface PaystackCheckoutOptions {
  email: string;
  amountKobo: number; // in Kobo (e.g. ₦1,000 = 100000 kobo)
  reference: string;
  currency?: string;
  metadata?: Record<string, unknown>;
  onSuccess: (response: { reference: string; status: string; trans: string; message: string }) => void;
  onCancel?: () => void;
}

declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: Record<string, unknown>) => {
        openIframe: () => void;
      };
    };
  }
}

/**
 * Loads the official Paystack Inline script dynamically
 */
export function loadPaystackScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if (window.PaystackPop) return resolve(true);

    const existing = document.getElementById('paystack-inline-js');
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      return;
    }

    const script = document.createElement('script');
    script.id = 'paystack-inline-js';
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.warn('Failed to load Paystack Inline JS');
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

/**
 * Trigger Paystack Pop checkout modal
 */
export async function payWithPaystack(opts: PaystackCheckoutOptions): Promise<boolean> {
  const loaded = await loadPaystackScript();
  if (!loaded || !window.PaystackPop) {
    console.warn('PaystackPop is unavailable, falling back');
    return false;
  }

  const handler = window.PaystackPop.setup({
    key: PAYSTACK_PUBLIC_KEY,
    email: opts.email,
    amount: opts.amountKobo,
    currency: opts.currency || 'NGN',
    ref: opts.reference,
    metadata: opts.metadata,
    channels: ['card', 'bank_transfer', 'ussd', 'qr'],
    callback: (res: any) => {
      opts.onSuccess(res);
    },
    onClose: () => {
      opts.onCancel?.();
    },
  });

  handler.openIframe();
  return true;
}

// -------------------------------------------------------------
// PAYSTACK TRANSFERS & NIGERIAN BANKING SUITE (Organizer Payouts)
// -------------------------------------------------------------

export interface BankInfo {
  name: string;
  code: string;
  slug: string;
}

export const COMMON_NIGERIAN_BANKS: BankInfo[] = [
  { name: 'Access Bank', code: '044', slug: 'access-bank' },
  { name: 'Guaranty Trust Bank (GTBank)', code: '058', slug: 'guaranty-trust-bank' },
  { name: 'Zenith Bank', code: '057', slug: 'zenith-bank' },
  { name: 'United Bank for Africa (UBA)', code: '033', slug: 'united-bank-for-africa' },
  { name: 'First Bank of Nigeria', code: '011', slug: 'first-bank-of-nigeria' },
  { name: 'Kuda Bank', code: '50211', slug: 'kuda-bank' },
  { name: 'OPay Digital Services', code: '999992', slug: 'opay' },
  { name: 'PalmPay', code: '999991', slug: 'palmpay' },
  { name: 'Fidelity Bank', code: '070', slug: 'fidelity-bank' },
  { name: 'Stanbic IBTC Bank', code: '221', slug: 'stanbic-ibtc-bank' },
  { name: 'Sterling Bank', code: '232', slug: 'sterling-bank' },
  { name: 'Wema Bank (ALAT)', code: '035', slug: 'wema-bank' },
  { name: 'Moniepoint Microfinance Bank', code: '50515', slug: 'moniepoint-mfb' },
];

/**
 * Resolve a 10-digit NUBAN account number with NIBSS via Paystack API
 */
export async function resolveAccount(accountNumber: string, bankCode: string): Promise<{
  success: boolean;
  accountName?: string;
  accountNumber?: string;
  error?: string;
}> {
  try {
    const res = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${accountNumber.trim()}&bank_code=${bankCode.trim()}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await res.json();
    if (!res.ok || !data.status) {
      return { success: false, error: data.message || 'Could not verify account name' };
    }

    return {
      success: true,
      accountName: data.data.account_name,
      accountNumber: data.data.account_number,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error verifying account' };
  }
}

/**
 * Create a Transfer Recipient on Paystack for instant payouts
 */
export async function createTransferRecipient(params: {
  name: string;
  accountNumber: string;
  bankCode: string;
}): Promise<{ success: boolean; recipientCode?: string; error?: string }> {
  try {
    const res = await fetch('https://api.paystack.co/transferrecipient', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'nuban',
        name: params.name,
        account_number: params.accountNumber.trim(),
        bank_code: params.bankCode.trim(),
        currency: 'NGN',
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.status) {
      return { success: false, error: data.message || 'Failed to create recipient' };
    }

    return {
      success: true,
      recipientCode: data.data.recipient_code,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error registering recipient' };
  }
}

/**
 * Initiate an instant Paystack transfer disbursement to an organizer
 */
export async function initiateTransfer(params: {
  amountNaira: number;
  recipientCode: string;
  reason: string;
  reference?: string;
}): Promise<{ success: boolean; transferCode?: string; status?: string; error?: string }> {
  try {
    const ref = params.reference || `TRF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const res = await fetch('https://api.paystack.co/transfer', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: 'balance',
        amount: Math.round(params.amountNaira * 100), // convert to kobo
        recipient: params.recipientCode,
        reason: params.reason,
        reference: ref,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.status) {
      return { success: false, error: data.message || 'Transfer failed to dispatch' };
    }

    return {
      success: true,
      transferCode: data.data.transfer_code,
      status: data.data.status,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error initiating transfer' };
  }
}

/**
 * Fetch current Paystack organization balance in Naira
 */
export async function getPaystackBalance(): Promise<{
  success: boolean;
  balanceNaira: number;
  currency: string;
  error?: string;
}> {
  try {
    const res = await fetch('https://api.paystack.co/balance', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await res.json();
    if (!res.ok || !data.status) {
      return { success: false, balanceNaira: 0, currency: 'NGN', error: data.message };
    }

    const ngnItem = data.data.find((b: any) => b.currency === 'NGN') || data.data[0];
    const balanceNaira = ngnItem ? ngnItem.balance / 100 : 0;

    return {
      success: true,
      balanceNaira,
      currency: ngnItem?.currency || 'NGN',
    };
  } catch (err: any) {
    return { success: false, balanceNaira: 0, currency: 'NGN', error: err.message };
  }
}
