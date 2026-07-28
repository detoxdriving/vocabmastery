const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function buildUrl(table, filter) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  if (filter) url.search = filter;
  return url.toString();
}

async function call(method, table, opts) {
  opts = opts || {};
  const filter = opts.filter || '';
  const body = opts.body;
  const single = opts.single === true;
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json'
  };
  if (method === 'POST') {
    headers.Prefer = (opts.prefer || 'return=representation');
  } else if (method === 'PATCH' || method === 'DELETE') {
    headers.Prefer = 'return=representation';
  }
  if (single) headers.Accept = 'application/vnd.pgrst.object+json';

  const init = { method, headers };
  if (body !== undefined && body !== null) {
    init.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  const res = await fetch(buildUrl(table, filter), init);
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    data = text;
  }
  if (!res.ok) {
    const msg = (data && data.message) || (data && data.error) || res.statusText || ('HTTP ' + res.status);
    const err = new Error(`DB ${method} ${table} failed: ${msg}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export async function selectAll(table, filter) {
  return call('GET', table, { filter });
}

export async function selectOne(table, filter) {
  return call('GET', table, { filter, single: true });
}

export async function insertRow(table, row) {
  const isArray = Array.isArray(row);
  return call('POST', table, { body: row, single: !isArray });
}

export async function updateRow(table, filter, patch) {
  return call('PATCH', table, { filter, body: patch, single: true });
}

export async function deleteRow(table, filter) {
  return call('DELETE', table, { filter });
}

export async function upsertRow(table, rows, onConflict) {
  const opts = {
    body: rows,
    filter: onConflict ? `on_conflict=${encodeURIComponent(onConflict)}` : '',
    prefer: 'resolution=merge-duplicates,return=representation'
  };
  return call('POST', table, opts);
}