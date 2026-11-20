export const dynamic = 'force-dynamic';

async function load() {
  const key = process.env.SUPABASE_SERVICE_KEY;
  const base = new URL(process.env.SUPABASE_URL.trim()).origin;
const url = `${base}/rest/v1/mail_analytics?select=*&order=received_at.desc&limit=5000`;
  const headers = key.startsWith('sb_') ? { apikey: key } : { apikey: key, Authorization: `Bearer ${key}` };
  const res = await fetch(url, { headers, cache: 'no-store' });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.json();
}

const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const daysOld = (d) => Math.floor((Date.now() - new Date(d)) / 864e5);
const LEVEL = { 1: 'var(--l1)', 5: 'var(--l5)', 10: 'var(--l10)' };

export default async function Page({ searchParams }) {
  const sp = await searchParams;
  const q = String(sp.q || '').trim().toLowerCase();
  const cat = String(sp.category || '');
  const rows = await load();

  // Category volume
  const catMap = new Map();
  rows.forEach((r) => r.category && catMap.set(r.category, (catMap.get(r.category) || 0) + 1));
  const cats = [...catMap].sort((a, b) => b[1] - a[1]);
  const maxCat = cats[0]?.[1] || 1;

  // Overdue (unreplied, level > 0)
  const overdue = rows.filter((r) => r.overdue_level > 0 && !r.is_replied).sort((a, b) => b.overdue_level - a.overdue_level);
  const lvlCount = (n) => overdue.filter((r) => r.overdue_level === n).length;

  // Top customers
  const custMap = new Map();
  rows.forEach((r) => {
    if (!r.customer_name) return;
    const c = custMap.get(r.customer_name) || { name: r.customer_name, enq: 0, ord: 0, total: 0 };
    if (r.category === 'RFQ Enquiry') c.enq++;
    if (r.category === 'Customer PO') c.ord++;
    c.total++;
    custMap.set(r.customer_name, c);
  });
  const custs = [...custMap.values()].sort((a, b) => b.total - a.total).slice(0, 8);
  const maxCust = custs[0]?.total || 1;

  // Searchable table
  const shown = rows.filter((r) => {
    if (cat && r.category !== cat) return false;
    if (!q) return true;
    return [r.subject, r.customer_name, r.enquiry_number, r.order_number, r.from_address].some((v) => (v || '').toLowerCase().includes(q));
  });

  return (
    <main>
      <h1>Mail analytics</h1>
      <p className="sub">{rows.length} emails logged, {overdue.length} awaiting a reply past their deadline.</p>

      <section>
        <h2>Overdue emails</h2>
        <div className="tiles">
          {[1, 5, 10].map((n) => (
            <div className="tile" key={n} style={{ '--c': LEVEL[n] }}>
              <b>{lvlCount(n)}</b>
              <span>Overdue day {n}</span>
            </div>
          ))}
        </div>
        {overdue.length === 0 ? (
          <p className="empty">Nothing overdue. Every RFQ and PO has been answered in time.</p>
        ) : (
          <div className="wrap">
            <table>
              <thead><tr><th>Level</th><th>Subject</th><th>Customer</th><th>Received</th><th>Age</th></tr></thead>
              <tbody>
                {overdue.map((r) => (
                  <tr key={r.id}>
                    <td><span className="pill" style={{ '--c': LEVEL[r.overdue_level] || 'var(--steel)' }}>Day {r.overdue_level}</span></td>
                    <td>{r.subject}</td>
                    <td>{r.customer_name || ''}</td>
                    <td>{fmt(r.received_at)}</td>
                    <td>{daysOld(r.received_at)} days</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="cols">
        <section>
          <h2>Emails by category</h2>
          {cats.length === 0 && <p className="empty">No categorised emails yet.</p>}
          {cats.map(([name, n]) => (
            <div className="bar" key={name}>
              <span>{name}</span>
              <i><span style={{ width: `${(n / maxCat) * 100}%` }} /></i>
              <em>{n}</em>
            </div>
          ))}
        </section>

        <section>
          <h2>Top customers</h2>
          {custs.length === 0 && <p className="empty">No customer names extracted yet.</p>}
          {custs.map((c) => (
            <div className="bar cust" key={c.name}>
              <span>{c.name}</span>
              <i><span style={{ width: `${(c.total / maxCust) * 100}%` }} /></i>
              <em>{c.enq} enq / {c.ord} PO</em>
            </div>
          ))}
        </section>
      </div>

      <section>
        <h2>All emails</h2>
        <form method="get">
          <input name="q" defaultValue={sp.q || ''} placeholder="Search subject, customer, enquiry or order number" aria-label="Search emails" />
          <select name="category" defaultValue={cat} aria-label="Filter by category">
            <option value="">All categories</option>
            {cats.map(([name]) => <option key={name} value={name}>{name}</option>)}
          </select>
          <button type="submit">Apply filters</button>
          {(q || cat) && <a className="clear" href="/">Clear filters</a>}
        </form>
        <p className="sub" style={{ margin: '0 0 10px' }}>Showing {shown.length} of {rows.length}</p>
        <div className="wrap">
          <table>
            <thead><tr><th>Received</th><th>Subject</th><th>Category</th><th>Customer</th><th>Enquiry</th><th>Order</th><th>Folder</th><th>Replied</th></tr></thead>
            <tbody>
              {shown.length === 0 && <tr><td colSpan="8" className="empty">No emails match these filters.</td></tr>}
              {shown.map((r) => (
                <tr key={r.id}>
                  <td>{fmt(r.received_at)}</td>
                  <td>{r.subject}</td>
                  <td>{r.category}</td>
                  <td>{r.customer_name}</td>
                  <td>{r.enquiry_number}</td>
                  <td>{r.order_number}</td>
                  <td>{r.folder_name}</td>
                  <td>{r.is_replied ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
