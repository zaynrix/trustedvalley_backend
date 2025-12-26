function removeEmpty(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    const res = obj.map(removeEmpty).filter(v => v !== undefined && v !== null && !(typeof v === 'string' && v === '') && !(Array.isArray(v) && v.length === 0) && !(typeof v === 'object' && Object.keys(v).length === 0));
    return res.length ? res : undefined;
  }
  const out = {};
  Object.keys(obj).forEach(k => {
    const v = obj[k];
    if (v === null || v === undefined) return;
    if (typeof v === 'object') {
      const cleaned = removeEmpty(v);
      if (cleaned === undefined) return;
      out[k] = cleaned;
      return;
    }
    if (typeof v === 'string' && v === '') return;
    out[k] = v;
  });
  return Object.keys(out).length ? out : undefined;
}

module.exports = { removeEmpty };
