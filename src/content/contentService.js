const postgres = require('../services/postgresService');
const { getFirestore } = require('../services/firestoreService');

// Prefer Postgres when DATABASE_URL is provided. If not set, fall back to Firestore (legacy).
const usePostgres = !!process.env.DATABASE_URL;

async function getHomeContent() {
  if (usePostgres) {
    // admin_content table stores documents in JSONB under `data` column
    const res = await postgres.query('SELECT data FROM admin_content WHERE id = $1', ['home_content']);
    if (!res || !res.rows || res.rows.length === 0) return null;
    return res.rows[0].data;
  }

  const db = getFirestore();
  const docRef = db.collection('admin_content').doc('home_content');
  const snap = await docRef.get();
  if (!snap.exists) return null;
  return snap.data();
}

async function upsertHomeContent(data) {
  if (!data || !data.id) throw new Error('invalid-home-content');
  if (usePostgres) {
    // upsert into admin_content
    await postgres.query(
      `INSERT INTO admin_content (id, data, created_at, updated_at)
       VALUES ($1,$2,now(),now())
       ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = now()`,
      [data.id, data]
    );
    return data;
  }
  const db = getFirestore();
  await db.collection('admin_content').doc(data.id).set(data, { merge: true });
  return data;
}

async function createStatisticsItem(item) {
  if (!item || !item.id) throw new Error('invalid-item');
  if (usePostgres) {
    await postgres.query(
      `INSERT INTO statistics_items (id, label, description, value, order_index, is_active, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,now(),now())`,
      [item.id, item.label || null, item.description || null, item.value || null, item.orderIndex || 0, item.isActive !== false]
    );
    return item;
  }
  const db = getFirestore();
  await db.collection('admin_content').doc('statistics').collection('items').doc(item.id).set(item);
  return item;
}

async function updateStatisticsItem(id, fields) {
  if (!id) throw new Error('invalid-item-id');
  if (usePostgres) {
    const sets = [];
    const vals = [];
    let idx = 1;
    Object.keys(fields).forEach(k => {
      if (k === 'orderIndex') sets.push(`order_index = $${idx++}`), vals.push(fields[k]);
      else if (k === 'isActive') sets.push(`is_active = $${idx++}`), vals.push(fields[k]);
      else if (['label','description','value'].includes(k)) sets.push(`${k} = $${idx++}`), vals.push(fields[k]);
    });
    if (sets.length === 0) return null;
    vals.push(id);
    const q = `UPDATE statistics_items SET ${sets.join(',')}, updated_at = now() WHERE id = $${idx}`;
    await postgres.query(q, vals);
    return await getStatisticsItemById(id);
  }
  const db = getFirestore();
  const docRef = db.collection('admin_content').doc('statistics').collection('items').doc(id);
  await docRef.update(fields);
  const snap = await docRef.get();
  return { id: snap.id, ...snap.data() };
}

async function deleteStatisticsItem(id) {
  if (!id) throw new Error('invalid-item-id');
  if (usePostgres) {
    await postgres.query('DELETE FROM statistics_items WHERE id = $1', [id]);
    return true;
  }
  const db = getFirestore();
  await db.collection('admin_content').doc('statistics').collection('items').doc(id).delete();
  return true;
}

async function getStatisticsItems() {
  if (usePostgres) {
    const res = await postgres.query('SELECT id, label, description, value, order_index, is_active, created_at, updated_at FROM statistics_items ORDER BY order_index ASC');
    return res.rows.map(r => ({ id: r.id, label: r.label, description: r.description, value: r.value, orderIndex: r.order_index, isActive: r.is_active, createdAt: r.created_at, updatedAt: r.updated_at }));
  }

  const db = getFirestore();
  const itemsCol = db.collection('admin_content').doc('statistics').collection('items');
  const snap = await itemsCol.get();
  const results = [];
  snap.forEach(doc => results.push({ id: doc.id, ...doc.data() }));
  return results;
}

async function getStatisticsItemById(itemId) {
  if (!itemId) return null;
  if (usePostgres) {
    const res = await postgres.query('SELECT id, label, description, value, order_index, is_active, created_at, updated_at FROM statistics_items WHERE id = $1', [itemId]);
    if (!res || !res.rows || res.rows.length === 0) return null;
    const r = res.rows[0];
    return { id: r.id, label: r.label, description: r.description, value: r.value, orderIndex: r.order_index, isActive: r.is_active, createdAt: r.created_at, updatedAt: r.updated_at };
  }

  const db = getFirestore();
  const docRef = db.collection('admin_content').doc('statistics').collection('items').doc(itemId);
  const snap = await docRef.get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}

module.exports = { getHomeContent, getStatisticsItems, getStatisticsItemById, upsertHomeContent, createStatisticsItem, updateStatisticsItem, deleteStatisticsItem };
