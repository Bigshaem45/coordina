export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ status: false, message: 'Method not allowed' });
  }

  const secretKey = (process.env.PAYSTACK_SECRET_KEY || '').trim();
  if (!secretKey) {
    return res.status(200).json({
      status: false,
      message: 'PAYSTACK_SECRET_KEY is not configured in Vercel Environment Variables.',
    });
  }

  const { action, accountNumber, bankCode, name, amountNaira, recipientCode, reason, reference } =
    req.body || {};

  const headers = {
    Authorization: `Bearer ${secretKey}`,
    'Content-Type': 'application/json',
  };

  try {
    if (action === 'resolve_account') {
      const r = await fetch(
        `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(
          String(accountNumber || '').trim()
        )}&bank_code=${encodeURIComponent(String(bankCode || '').trim())}`,
        { method: 'GET', headers }
      );
      const data = await r.json();
      return res.status(200).json(data);
    }

    if (action === 'create_recipient') {
      const r = await fetch('https://api.paystack.co/transferrecipient', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type: 'nuban',
          name: String(name || '').trim(),
          account_number: String(accountNumber || '').trim(),
          bank_code: String(bankCode || '').trim(),
          currency: 'NGN',
        }),
      });
      const data = await r.json();
      return res.status(200).json(data);
    }

    if (action === 'initiate_transfer') {
      const r = await fetch('https://api.paystack.co/transfer', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          source: 'balance',
          amount: Math.round(Number(amountNaira || 0) * 100),
          recipient: String(recipientCode || '').trim(),
          reason: String(reason || 'COORDINA Organizer Settlement'),
          reference: reference || `TRF-${Date.now()}`,
        }),
      });
      const data = await r.json();
      return res.status(200).json(data);
    }

    if (action === 'verify_transaction') {
      const r = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(String(reference || '').trim())}`,
        { method: 'GET', headers }
      );
      const data = await r.json();
      return res.status(200).json(data);
    }

    return res.status(400).json({ status: false, message: 'Unsupported Paystack action' });
  } catch (err: any) {
    return res.status(200).json({
      status: false,
      message: err?.message || 'Error communicating with Paystack API',
    });
  }
}

