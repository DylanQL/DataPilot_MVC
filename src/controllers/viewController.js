const tableModel = require('../models/dynamicTableModel');

async function renderDashboard(req, res) {
  try {
    const tables = await tableModel.listTables();

    return res.render('dashboard', {
      user: req.session.user,
      tables,
      sqlTypes: tableModel.ALLOWED_TYPES
    });
  } catch (error) {
    return res.status(500).send(`Error al cargar dashboard: ${error.message}`);
  }
}

module.exports = {
  renderDashboard
};
