export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS - allow your domain (update this when you have a real domain)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
  const AIRTABLE_BASE_ID = 'appWiyGRT2AuqvJb9';
  const AIRTABLE_TABLE_ID = 'tbl93muimN21fHADQ';

  if (!AIRTABLE_API_KEY) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const body = req.body;

    // Validate required fields
    if (!body.firstName || !body.email || !body.model) {
      return res.status(400).json({ error: 'Missing required fields: firstName, email, model' });
    }

    // Build Airtable record
    const record = {
      records: [{
        fields: {
          // Name (primary field)
          "fldGs2shCmLANsEB9": `${body.firstName} ${body.lastName || ''} — ${body.model}`.trim(),

          // Client info
          "fldcbHxuy5vY9qOSW": body.firstName,
          "fldY5IsA3tnreOpjj": body.lastName || '',
          "fldI44kJRuo1jx5I2": body.email,
          "fldmVoRD5dJZWgenE": body.phone || '',
          "fld7mXJQpsJRWn8jg": body.address || '',

          // Build specs
          "fldXwWEcBVVchVqKP": body.model,
          "fldUSSdWgjrXLx4T4": body.heater,
          "fld5dysRgcctQ8dax": body.exterior,
          "fld75hrkAClpJa2sn": body.interior,
          "fldoAc0ypW0yWKsGW": body.bench,

          // Pricing
          "fldGVAlkO9o6ymXjQ": body.basePrice || 0,
          "fldpUvPRzLKLU8afh": body.upgradesPrice || 0,
          "fldKy6XfSw2nu8CRO": body.addonsPrice || 0,
          "fldht9UOmEN9Pg7Ss": body.totalPrice || 0,

          // Status & notes
          "fldsTiNVei140U9sq": "Draft",
          "fldtM138Tqxh5Vm32": body.notes || '',
          "fldkmv40BWcKNzZvt": body.addons || '',

          // Source tracking
          "fldkyLzxioXjqHwc7": `Submitted via configurator on ${new Date().toLocaleDateString('en-US')}`,
        }
      }]
    };

    const response = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`,
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
      const errorData = await response.json();
      console.error('Airtable error:', errorData);
      return res.status(502).json({ error: 'Failed to save to Airtable', details: errorData });
    }

    const data = await response.json();
    return res.status(200).json({
      success: true,
      recordId: data.records?.[0]?.id,
    });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
