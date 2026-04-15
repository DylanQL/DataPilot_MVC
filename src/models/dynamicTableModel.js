const { pool } = require('./db');
const { RESERVED_TABLES, quoteIdentifier, assertTableAllowed, isValidIdentifier } = require('../services/sqlUtils');

const ALLOWED_TYPES = new Set([
  'INT',
  'BIGINT',
  'DECIMAL(10,2)',
  'VARCHAR(255)',
  'TEXT',
  'DATE',
  'DATETIME',
  'BOOLEAN'
]);

async function listTables() {
  const [rows] = await pool.query('SHOW TABLES');
  const key = Object.keys(rows[0] || {})[0];
  const tables = rows.map((row) => row[key]);

  return tables.filter((tableName) => !RESERVED_TABLES.has(String(tableName).toLowerCase()));
}

async function getColumns(tableName) {
  assertTableAllowed(tableName);
  const safeTable = quoteIdentifier(tableName);
  const [rows] = await pool.query(`DESCRIBE ${safeTable}`);
  return rows;
}

function normalizeColumn(column) {
  const name = String(column.name || '').trim();
  const type = String(column.type || '').toUpperCase().trim();
  const nullable = Boolean(column.nullable);

  if (!isValidIdentifier(name)) {
    throw new Error(`Nombre de campo invalido: ${name}`);
  }
  if (!ALLOWED_TYPES.has(type)) {
    throw new Error(`Tipo no permitido para ${name}. Usa uno de: ${Array.from(ALLOWED_TYPES).join(', ')}`);
  }

  return { name, type, nullable };
}

async function createTable(tableName, columns) {
  assertTableAllowed(tableName);

  if (!Array.isArray(columns) || columns.length === 0) {
    throw new Error('Debes enviar al menos una columna.');
  }

  const normalizedColumns = columns.map(normalizeColumn);
  const safeTable = quoteIdentifier(tableName);

  const columnSql = normalizedColumns
    .map((column) => `${quoteIdentifier(column.name)} ${column.type} ${column.nullable ? 'NULL' : 'NOT NULL'}`)
    .join(', ');

  const sql = `CREATE TABLE ${safeTable} (id INT AUTO_INCREMENT PRIMARY KEY, ${columnSql})`;
  await pool.query(sql);
}

async function deleteTable(tableName) {
  assertTableAllowed(tableName);
  const safeTable = quoteIdentifier(tableName);
  await pool.query(`DROP TABLE ${safeTable}`);
}

async function addColumn(tableName, column) {
  assertTableAllowed(tableName);
  const normalized = normalizeColumn(column);
  const safeTable = quoteIdentifier(tableName);
  await pool.query(
    `ALTER TABLE ${safeTable} ADD COLUMN ${quoteIdentifier(normalized.name)} ${normalized.type} ${normalized.nullable ? 'NULL' : 'NOT NULL'}`
  );
}

async function modifyColumn(tableName, oldName, column) {
  assertTableAllowed(tableName);

  if (!isValidIdentifier(oldName)) {
    throw new Error('Nombre de columna origen invalido.');
  }

  const normalized = normalizeColumn(column);
  const safeTable = quoteIdentifier(tableName);

  await pool.query(
    `ALTER TABLE ${safeTable} CHANGE COLUMN ${quoteIdentifier(oldName)} ${quoteIdentifier(normalized.name)} ${normalized.type} ${normalized.nullable ? 'NULL' : 'NOT NULL'}`
  );
}

async function dropColumn(tableName, columnName) {
  assertTableAllowed(tableName);

  if (String(columnName).toLowerCase() === 'id') {
    throw new Error('No puedes borrar la columna id.');
  }
  if (!isValidIdentifier(columnName)) {
    throw new Error('Nombre de columna invalido.');
  }

  const safeTable = quoteIdentifier(tableName);
  await pool.query(`ALTER TABLE ${safeTable} DROP COLUMN ${quoteIdentifier(columnName)}`);
}

function buildFilterQuery(filters, availableColumns) {
  const conditions = [];
  const values = [];

  for (const [field, value] of Object.entries(filters)) {
    if (!value || !value.trim()) continue;
    if (!availableColumns.has(field)) continue;

    conditions.push(`${quoteIdentifier(field)} LIKE ?`);
    values.push(`%${value.trim()}%`);
  }

  return {
    whereClause: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    values
  };
}

async function getRecords(tableName, page = 1, pageSize = 10, filters = {}) {
  assertTableAllowed(tableName);

  const safePage = Math.max(Number(page) || 1, 1);
  const safePageSize = Math.min(Math.max(Number(pageSize) || 10, 1), 100);
  const offset = (safePage - 1) * safePageSize;
  const safeTable = quoteIdentifier(tableName);

  const columns = await getColumns(tableName);
  const availableColumns = new Set(columns.map((column) => column.Field));

  const { whereClause, values } = buildFilterQuery(filters, availableColumns);

  const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM ${safeTable} ${whereClause}`, values);
  const total = countRows[0]?.total || 0;

  const [rows] = await pool.query(
    `SELECT * FROM ${safeTable} ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`,
    [...values, safePageSize, offset]
  );

  return {
    data: rows,
    pagination: {
      page: safePage,
      pageSize: safePageSize,
      total,
      totalPages: Math.ceil(total / safePageSize) || 1
    },
    columns: columns.map((column) => column.Field)
  };
}

async function addRecord(tableName, payload) {
  assertTableAllowed(tableName);

  if (!payload || typeof payload !== 'object') {
    throw new Error('Registro invalido.');
  }

  const safeTable = quoteIdentifier(tableName);
  const columns = await getColumns(tableName);
  const allowed = new Set(columns.map((column) => column.Field));

  const entries = Object.entries(payload).filter(([key, value]) => key !== 'id' && allowed.has(key) && value !== undefined);

  if (!entries.length) {
    throw new Error('No hay campos validos para insertar.');
  }

  const columnSql = entries.map(([key]) => quoteIdentifier(key)).join(', ');
  const placeholders = entries.map(() => '?').join(', ');
  const values = entries.map(([, value]) => value);

  const [result] = await pool.query(
    `INSERT INTO ${safeTable} (${columnSql}) VALUES (${placeholders})`,
    values
  );

  return result.insertId;
}

async function deleteRecord(tableName, id) {
  assertTableAllowed(tableName);

  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw new Error('ID de registro invalido.');
  }

  const safeTable = quoteIdentifier(tableName);
  const [result] = await pool.query(`DELETE FROM ${safeTable} WHERE id = ?`, [numericId]);

  if (!result.affectedRows) {
    throw new Error('No se encontro el registro a eliminar.');
  }
}

module.exports = {
  listTables,
  getColumns,
  createTable,
  deleteTable,
  addColumn,
  modifyColumn,
  dropColumn,
  getRecords,
  addRecord,
  deleteRecord,
  ALLOWED_TYPES: Array.from(ALLOWED_TYPES)
};
