const state = {
  tables: window.__APP_DATA__?.tables || [],
  sqlTypes: window.__APP_DATA__?.sqlTypes || [],
  currentTable: '',
  currentPage: 1,
  pageSize: 10,
  totalPages: 1,
  currentColumns: []
};

const tableSelect = document.getElementById('tableSelect');
const editTableSelect = document.getElementById('editTableSelect');
const deleteTableSelect = document.getElementById('deleteTableSelect');
const recordTableSelect = document.getElementById('recordTableSelect');
const recordsTable = document.getElementById('recordsTable');
const pageInfo = document.getElementById('pageInfo');
const filtersContainer = document.getElementById('filtersContainer');
const toast = document.getElementById('toast');

function showToast(message, type = 'success') {
  toast.className = `show ${type}`;
  toast.textContent = message;
  setTimeout(() => {
    toast.className = '';
  }, 2500);
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json'
    },
    ...options
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Ocurrio un error en la solicitud.');
  }

  return data;
}

function renderTableOptions() {
  const optionsHtml = state.tables.length
    ? state.tables.map((table) => `<option value="${table}">${table}</option>`).join('')
    : '<option value="">No hay tablas disponibles</option>';

  tableSelect.innerHTML = optionsHtml;
  editTableSelect.innerHTML = optionsHtml;
  deleteTableSelect.innerHTML = optionsHtml;
  recordTableSelect.innerHTML = optionsHtml;

  if (state.tables.length && !state.currentTable) {
    state.currentTable = state.tables[0];
    tableSelect.value = state.currentTable;
  }
}

function buildTypeOptions(selectEl) {
  selectEl.innerHTML = state.sqlTypes.map((type) => `<option value="${type}">${type}</option>`).join('');
}

function setMenuNavigation() {
  const menuItems = Array.from(document.querySelectorAll('.menu-item'));
  const sectionPanels = Array.from(document.querySelectorAll('.section-panel'));

  menuItems.forEach((button) => {
    button.addEventListener('click', () => {
      menuItems.forEach((item) => item.classList.remove('active'));
      sectionPanels.forEach((panel) => panel.classList.remove('active'));

      button.classList.add('active');
      const panel = document.getElementById(button.dataset.section);
      if (panel) panel.classList.add('active');
    });
  });
}

function addFilterRow(field = '', value = '') {
  const row = document.createElement('div');
  row.className = 'filter-row';

  const fieldOptions = state.currentColumns
    .map((column) => `<option value="${column}" ${field === column ? 'selected' : ''}>${column}</option>`)
    .join('');

  row.innerHTML = `
    <select class="filter-field">${fieldOptions}</select>
    <input class="filter-value" type="text" placeholder="Valor filtro" value="${value}" />
    <button type="button" class="btn btn-danger btn-sm remove-filter">Quitar</button>
  `;

  row.querySelector('.remove-filter').addEventListener('click', () => {
    row.remove();
    loadRecords();
  });

  row.querySelector('.filter-value').addEventListener('input', () => {
    state.currentPage = 1;
    loadRecords();
  });

  row.querySelector('.filter-field').addEventListener('change', () => {
    state.currentPage = 1;
    loadRecords();
  });

  filtersContainer.appendChild(row);
}

function getFiltersFromUi() {
  const rows = Array.from(document.querySelectorAll('.filter-row'));
  const filters = {};

  rows.forEach((row) => {
    const field = row.querySelector('.filter-field')?.value;
    const value = row.querySelector('.filter-value')?.value || '';

    if (field && value.trim()) {
      filters[field] = value.trim();
    }
  });

  return filters;
}

async function loadRecords() {
  if (!state.currentTable) {
    recordsTable.innerHTML = '<tr><td>No hay tabla seleccionada.</td></tr>';
    return;
  }

  try {
    const filters = getFiltersFromUi();
    const params = new URLSearchParams({
      page: String(state.currentPage),
      pageSize: String(state.pageSize)
    });

    Object.entries(filters).forEach(([field, value]) => {
      params.append(field, value);
    });

    const data = await request(`/api/tables/${encodeURIComponent(state.currentTable)}/records?${params.toString()}`);

    state.totalPages = data.pagination.totalPages;
    state.currentColumns = data.columns || [];

    renderRecordsTable(data.columns, data.data);
    pageInfo.textContent = `Pagina ${data.pagination.page} de ${data.pagination.totalPages} (Total: ${data.pagination.total})`;
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function renderRecordsTable(columns = [], rows = []) {
  if (!columns.length) {
    recordsTable.innerHTML = '<tr><td>No hay columnas disponibles.</td></tr>';
    return;
  }

  const head = `<thead><tr>${columns.map((col) => `<th>${col}</th>`).join('')}</tr></thead>`;

  if (!rows.length) {
    recordsTable.innerHTML = `${head}<tbody><tr><td colspan="${columns.length}">No hay registros para mostrar.</td></tr></tbody>`;
    return;
  }

  const body = rows
    .map(
      (row) => `<tr>${columns.map((col) => `<td>${row[col] ?? ''}</td>`).join('')}</tr>`
    )
    .join('');

  recordsTable.innerHTML = `${head}<tbody>${body}</tbody>`;
}

function createColumnRow() {
  const container = document.createElement('div');
  container.className = 'column-row';

  container.innerHTML = `
    <input type="text" placeholder="campo" class="column-name" required />
    <select class="column-type">${state.sqlTypes.map((type) => `<option value="${type}">${type}</option>`).join('')}</select>
    <label class="check-label"><input type="checkbox" class="column-nullable" /> NULL</label>
    <button type="button" class="btn btn-danger btn-sm remove-column">Quitar</button>
  `;

  container.querySelector('.remove-column').addEventListener('click', () => {
    container.remove();
  });

  return container;
}

function setupCreateTable() {
  const form = document.getElementById('createTableForm');
  const createColumnsContainer = document.getElementById('createColumnsContainer');

  document.getElementById('addCreateColumn').addEventListener('click', () => {
    createColumnsContainer.appendChild(createColumnRow());
  });

  createColumnsContainer.appendChild(createColumnRow());

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const tableName = form.tableName.value.trim();
    const columns = Array.from(createColumnsContainer.querySelectorAll('.column-row')).map((row) => ({
      name: row.querySelector('.column-name').value.trim(),
      type: row.querySelector('.column-type').value,
      nullable: row.querySelector('.column-nullable').checked
    }));

    try {
      await request('/api/tables', {
        method: 'POST',
        body: JSON.stringify({ tableName, columns })
      });

      showToast('Tabla creada correctamente.');
      form.reset();
      createColumnsContainer.innerHTML = '';
      createColumnsContainer.appendChild(createColumnRow());
      await refreshTables();
    } catch (error) {
      showToast(error.message, 'error');
    }
  });
}

function setupEditTable() {
  const form = document.getElementById('editTableForm');
  const actionSelect = document.getElementById('editAction');
  const oldNameWrap = document.getElementById('oldNameWrap');
  const typeWrap = document.getElementById('typeWrap');
  const nullableWrap = document.getElementById('nullableWrap');

  function updateEditLayout() {
    const action = actionSelect.value;

    oldNameWrap.style.display = action === 'modify' ? 'grid' : 'none';
    typeWrap.style.display = action === 'drop' ? 'none' : 'grid';
    nullableWrap.style.display = action === 'drop' ? 'none' : 'flex';
  }

  actionSelect.addEventListener('change', updateEditLayout);
  updateEditLayout();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const payload = {
      action: form.action.value,
      oldName: form.oldName.value.trim(),
      name: form.name.value.trim(),
      type: form.type.value,
      nullable: form.nullable.checked
    };

    try {
      await request(`/api/tables/${encodeURIComponent(form.tableName.value)}/edit`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      showToast('Tabla editada correctamente.');
      form.reset();
      updateEditLayout();
      await refreshTables();
      await loadRecordFields();
      await loadRecords();
    } catch (error) {
      showToast(error.message, 'error');
    }
  });
}

function setupDeleteTable() {
  const form = document.getElementById('deleteTableForm');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const tableName = form.tableName.value;
    if (!tableName) return;

    const ok = window.confirm(`Se eliminara la tabla ${tableName}. Esta accion no se puede deshacer.`);
    if (!ok) return;

    try {
      await request(`/api/tables/${encodeURIComponent(tableName)}`, { method: 'DELETE' });
      showToast('Tabla eliminada correctamente.');
      await refreshTables();
      await loadRecordFields();
      await loadRecords();
    } catch (error) {
      showToast(error.message, 'error');
    }
  });
}

async function loadRecordFields() {
  const tableName = recordTableSelect.value;
  const fieldsWrap = document.getElementById('recordFields');

  fieldsWrap.innerHTML = '';
  if (!tableName) return;

  try {
    const data = await request(`/api/tables/${encodeURIComponent(tableName)}/columns`);

    data.columns
      .filter((column) => column.Field !== 'id')
      .forEach((column) => {
        const label = document.createElement('label');
        label.innerHTML = `${column.Field}<input type="text" name="${column.Field}" placeholder="${column.Type}" />`;
        fieldsWrap.appendChild(label);
      });
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function setupAddRecord() {
  const form = document.getElementById('recordForm');

  recordTableSelect.addEventListener('change', loadRecordFields);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const tableName = form.tableName.value;
    if (!tableName) return;

    const values = {};
    Array.from(form.querySelectorAll('#recordFields input')).forEach((input) => {
      values[input.name] = input.value;
    });

    try {
      await request(`/api/tables/${encodeURIComponent(tableName)}/records`, {
        method: 'POST',
        body: JSON.stringify({ values })
      });

      showToast('Registro agregado correctamente.');
      form.querySelectorAll('#recordFields input').forEach((input) => {
        input.value = '';
      });

      if (tableName === state.currentTable) {
        await loadRecords();
      }
    } catch (error) {
      showToast(error.message, 'error');
    }
  });
}

function setupSelectTable() {
  tableSelect.addEventListener('change', async () => {
    state.currentTable = tableSelect.value;
    state.currentPage = 1;
    filtersContainer.innerHTML = '';
    await loadRecords();
  });

  document.getElementById('addFilterBtn').addEventListener('click', () => {
    if (!state.currentColumns.length) {
      showToast('Primero carga una tabla para conocer sus campos.', 'error');
      return;
    }
    addFilterRow();
  });

  document.getElementById('prevPage').addEventListener('click', async () => {
    if (state.currentPage > 1) {
      state.currentPage -= 1;
      await loadRecords();
    }
  });

  document.getElementById('nextPage').addEventListener('click', async () => {
    if (state.currentPage < state.totalPages) {
      state.currentPage += 1;
      await loadRecords();
    }
  });
}

async function refreshTables() {
  const data = await request('/api/tables');
  state.tables = data.tables;

  const previous = state.currentTable;
  renderTableOptions();

  if (state.tables.includes(previous)) {
    state.currentTable = previous;
    tableSelect.value = previous;
  } else {
    state.currentTable = state.tables[0] || '';
    tableSelect.value = state.currentTable;
  }

  editTableSelect.value = state.currentTable;
  deleteTableSelect.value = state.currentTable;
  recordTableSelect.value = state.currentTable;
}

function initWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(`${protocol}//${window.location.host}`);

  ws.onmessage = async (event) => {
    const message = JSON.parse(event.data);

    if (!message?.type) return;

    if (['table_created', 'table_edited', 'table_deleted', 'record_added'].includes(message.type)) {
      await refreshTables();
      await loadRecordFields();
      await loadRecords();
      showToast('Datos actualizados en tiempo real.');
    }
  };
}

async function init() {
  buildTypeOptions(document.getElementById('editType'));
  setMenuNavigation();
  setupSelectTable();
  setupCreateTable();
  setupEditTable();
  setupDeleteTable();
  setupAddRecord();

  await refreshTables();
  await loadRecordFields();
  await loadRecords();

  initWebSocket();
}

init().catch((error) => showToast(error.message, 'error'));
