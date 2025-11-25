const { handleParsedReportRequest, sendJson } = require('../reportService');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    sendJson(res, 405, {
      error: { code: 'method_not_allowed', message: 'Only POST is supported for /api/report.' },
    });
    return;
  }

  await handleParsedReportRequest(req, res);
};
