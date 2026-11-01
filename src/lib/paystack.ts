/**
 * COORDINA Paystack Service
 * Client-side Paystack Inline popup uses VITE_PAYSTACK_PUBLIC_KEY.
 * Server-side NIBSS resolution & transfers run via /api/paystack using PAYSTACK_SECRET_KEY in Vercel env.
 */

const PAYSTACK_PUBLIC_KEY = (import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '').trim();

export interface PaystackCheckoutOptions {
  email: string;
  amountKobo: number;
  reference: string;
  currency?: string;
  channels?: string[];
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

export function isPaystackConfigured(): boolean {
  return Boolean(PAYSTACK_PUBLIC_KEY);
}

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
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export async function payWithPaystack(opts: PaystackCheckoutOptions): Promise<{
  launched: boolean;
  error?: string;
}> {
  if (!PAYSTACK_PUBLIC_KEY) {
    return {
      launched: false,
      error:
        'Paystack public key (VITE_PAYSTACK_PUBLIC_KEY) is not configured in environment variables.',
    };
  }

  const loaded = await loadPaystackScript();
  if (!loaded || !window.PaystackPop) {
    return {
      launched: false,
      error: 'Unable to load Paystack payment gateway. Check your internet connection and retry.',
    };
  }

  const handler = window.PaystackPop.setup({
    key: PAYSTACK_PUBLIC_KEY,
    email: opts.email,
    amount: opts.amountKobo,
    currency: opts.currency || 'NGN',
    ref: opts.reference,
    metadata: opts.metadata,
    channels: opts.channels || ['card', 'bank_transfer', 'ussd', 'qr'],
    callback: (res: any) => {
      opts.onSuccess(res);
    },
    onClose: () => {
      opts.onCancel?.();
    },
  });

  handler.openIframe();
  return { launched: true };
}

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

export async function resolveAccount(
  accountNumber: string,
  bankCode: string
): Promise<{
  success: boolean;
  accountName?: string;
  accountNumber?: string;
  error?: string;
}> {
  try {
    const res = await fetch('/api/paystack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'resolve_account',
        accountNumber: accountNumber.trim(),
        bankCode: bankCode.trim(),
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.status) {
      return {
        success: false,
        error: data.message || 'Could not resolve NUBAN account with NIBSS.',
      };
    }
    return {
      success: true,
      accountName: data.data.account_name,
      accountNumber: data.data.account_number,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error verifying bank account.',
    };
  }
}

export async function createTransferRecipient(params: {
  name: string;
  accountNumber: string;
  bankCode: string;
}): Promise<{ success: boolean; recipientCode?: string; error?: string }> {
  try {
    const res = await fetch('/api/paystack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_recipient',
        name: params.name,
        accountNumber: params.accountNumber.trim(),
        bankCode: params.bankCode.trim(),
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.status) {
      return { success: false, error: data.message || 'Failed to register transfer recipient.' };
    }
    return {
      success: true,
      recipientCode: data.data.recipient_code,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error registering recipient.' };
  }
}

export async function initiateTransfer(params: {
  amountNaira: number;
  recipientCode: string;
  reason: string;
  reference?: string;
}): Promise<{ success: boolean; transferCode?: string; status?: string; error?: string }> {
  try {
    const ref = params.reference || `TRF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const res = await fetch('/api/paystack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'initiate_transfer',
        amountNaira: params.amountNaira,
        recipientCode: params.recipientCode,
        reason: params.reason,
        reference: ref,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.status) {
      return { success: false, error: data.message || 'Transfer failed to dispatch.' };
    }
    return {
      success: true,
      transferCode: data.data.transfer_code,
      status: data.data.status,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error initiating transfer.' };
  }
}
