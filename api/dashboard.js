export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
  const BASE_ID = 'appWiyGRT2AuqvJb9';

  if (!AIRTABLE_API_KEY) return res.status(500).json({ error: 'Server config error' });

  const headers = { Authorization: `Bearer ${AIRTABLE_API_KEY}` };

  async function fetchTable(tableId, fields, filterFormula = '') {
    const params = new URLSearchParams();
    fields.forEach(f => params.append('fields[]', f));
    if (filterFormula) params.set('filterByFormula', filterFormula);
    params.set('sort[0][field]', fields[0]);
    params.set('sort[0][direction]', 'desc');

    let records = [];
    let offset = null;
    do {
      if (offset) params.set('offset', offset);
      const r = await fetch(
        `https://api.airtable.com/v0/${BASE_ID}/${tableId}?${params.toString()}`,
        { headers }
      );
      if (!r.ok) throw new Error(`Airtable error on ${tableId}: ${r.status}`);
      const data = await r.json();
      records = records.concat(data.records);
      offset = data.offset || null;
    } while (offset);

    return records;
  }

  try {
    const [buildQueueRaw, estimatesRaw, pipelineRaw] = await Promise.all([
      fetchTable('tblGvG8dQt5XpLuPu', [
        'Full Name', 'Project Status', 'Project Stage', 'Product Model',
        'Estimated Deal Value', 'Primary Deposit Received', 'Primary Deposit Amount',
        'Micro Deposit Received', 'Micro Deposit Amount',
        'Build Production Start Date', 'Installation Date', 'Deadline Date',
        'Days Left To Complete Project', 'Estimated COGS', 'Actual COGS',
        'Est. Margin %', 'Account Manager', 'Email', 'Phone',
        'Exterior', 'Interior', 'Heater', 'Add-Ons', 'Lead Source',
        'Next Follow-Up Date', 'Lead Created Time', 'Sales Owner',
        'Order Packet Ready', 'Order Packet Sent'
      ], "NOT({Project Status} = 'Lost')"),

      fetchTable('tbl93muimN21fHADQ', [
        'Client First Name', 'Client Last Name', 'Client Email', 'Client Phone',
        'Base Model', 'Total Estimate', 'Estimate Status', 'Estimate Date',
        'Follow-Up Date', 'Heater', 'Exterior Cladding', 'Interior Wall Material',
        'Add-Ons', 'Deposit Required', 'Internal Notes', 'Estimate Date'
      ], ''),

      fetchTable('tblxfRSGQUAAxkJ4p', [
        'Project Name', 'Client Name', 'Stage', 'Deal Size', 'Confidence',
        'Next Action', 'Blocker', 'Blocker Description', 'Owner', 'Days in Stage',
        'Budget Aligned', 'Timeline Fit', 'Path'
      ], ''),
    ]);

    // Shape build queue
    const buildQueue = buildQueueRaw.map(r => ({ id: r.id, ...r.fields }));

    // Shape estimates
    const estimates = estimatesRaw.map(r => ({ id: r.id, ...r.fields }));

    // Shape pipeline
    const pipeline = pipelineRaw.map(r => ({ id: r.id, ...r.fields }));

    // Compute summary stats
    const activeBuilds = buildQueue.filter(b =>
      ['In Production', 'In Build', 'Active'].includes(b['Project Status'])
    ).length;

    const totalPipelineValue = pipeline.reduce((sum, d) => sum + (d['Deal Size'] || 0), 0);

    const depositsReceived = buildQueue.filter(b => b['Primary Deposit Received']).length;

    const now = new Date();
    const thisMonth = buildQueue.filter(b => {
      if (!b['Installation Date']) return false;
      const d = new Date(b['Installation Date']);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    return res.status(200).json({
      success: true,
      stats: { activeBuilds, totalPipelineValue, depositsReceived, installsThisMonth: thisMonth },
      buildQueue,
      estimates,
      pipeline,
    });

  } catch (err) {
    console.error('Dashboard API error:', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
}
