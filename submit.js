export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
  if (!AIRTABLE_API_KEY) return res.status(500).json({ error: 'Server config error' });

  try {
    const body = req.body;
    if (!body.firstName || !body.email || !body.model) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const record = {
      records: [{
        fields: {
          "fldGs2shCmLANsEB9": `${body.firstName} ${body.lastName || ''} — ${body.model}`.trim(),
          "fldcbHxuy5vY9qOSW": body.firstName,
          "fldY5IsA3tnreOpjj": body.lastName || '',
          "fldI44kJRuo1jx5I2": body.email,
          "fldmVoRD5dJZWgenE": body.phone || '',
          "fld7mXJQpsJRWn8jg": body.address || '',
          "fldXwWEcBVVchVqKP": body.model,
          "fldUSSdWgjrXLx4T4": body.heater,
          "fld5dysRgcctQ8dax": body.exterior,
          "fld75hrkAClpJa2sn": body.interior,
          "fldoAc0ypW0yWKsGW": body.bench,
          "fldGVAlkO9o6ymXjQ": body.basePrice || 0,
          "fldpUvPRzLKLU8afh": body.upgradesPrice || 0,
          "fldKy6XfSw2nu8CRO": body.addonsPrice || 0,
          "fldht9UOmEN9Pg7Ss": body.totalPrice || 0,
          "fldsTiNVei140U9sq": "Draft",
          "fldtM138Tqxh5Vm32": body.notes || '',
          "fldkmv40BWcKNzZvt": body.addons || '',
          "fldkyLzxioXjqHwc7": `Submitted via configurator on ${new Date().toLocaleDateString('en-US')}`,
        }
      }]
    };

    const response = await fetch(
      `https://api.airtable.com/v0/appWiyGRT2AuqvJb9/tbl93muimN21fHADQ`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        },
        body: JSON.stringify(record),
      }
    );

    if (!response.ok) {
      const err = await response.json();
      return res.status(502).json({ error: 'Failed to save', details: err });
    }

    const data = await response.json();
    return res.status(200).json({ success: true, recordId: data.records?.[0]?.id });

  } catch (err) {
    console.error('Submit error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
