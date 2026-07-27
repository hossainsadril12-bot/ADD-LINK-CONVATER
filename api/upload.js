module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    let body = req.body || {};
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) {}
    }
    const { projectId, projectName } = body;
    const cleanId = projectId || 'banner_project';

    return res.status(200).json({
      success: true,
      projectId: cleanId,
      baseUrl: `/uploads/${cleanId}/`
    });
  }

  return res.status(200).json({ success: true, message: 'AdLink API operational' });
};
