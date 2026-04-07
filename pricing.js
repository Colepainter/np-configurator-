export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
  const BASE_ID = 'appWiyGRT2AuqvJb9';
  const TABLE_ID = 'tblMrCrgcdqf0hyYz';

  if (!AIRTABLE_API_KEY) return res.status(500).json({ error: 'Server config error' });

  try {
    const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?sort[0][field]=Sort%20Order&sort[0][direction]=asc`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` }
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(502).json({ error: 'Airtable error', details: err });
    }

    const data = await response.json();

    // Shape into categories
    const pricing = {
      models: [],
      exteriors: [],
      interiors: [],
      heaters: [],
      addons: []
    };

    for (const record of data.records) {
      const f = record.fields;
      if (!f['Active']) continue;

      const item = {
        id: record.id,
        name: f['Item Name'],
        price: f['Price'] || 0,
        description: f['Description'] || '',
        isUpgrade: f['Is Upgrade'] || false,
        sku: f['SKU'] || '',
        imageUrl: f['Image URL'] || '',
        sortOrder: f['Sort Order'] || 0,
      };

      const cat = f['Category']?.name || f['Category'];
      if (cat === 'Base Model') pricing.models.push(item);
      else if (cat === 'Exterior Cladding') pricing.exteriors.push(item);
      else if (cat === 'Interior Wood') pricing.interiors.push(item);
      else if (cat === 'Heater') pricing.heaters.push(item);
      else if (cat === 'Add-On') pricing.addons.push(item);
    }

    return res.status(200).json({ success: true, pricing });

  } catch (err) {
    console.error('Pricing API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
