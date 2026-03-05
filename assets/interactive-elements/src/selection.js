// Returns the leaf data point IDs belonging to any node type:
//   leaf node → [node.id]
//   division node (e.g. the "setosa" group) → all leaf IDs in that division
//   dimension root (e.g. the species dimension) → all leaf IDs in all divisions
export function getLeafIds(node) {
    if (!node.derivedNode) return [node.id];
    if (node.data?.dimensionKey) {
        const ids = [];
        for (const div of Object.values(node.data.divisions || {}))
            for (const leafId of Object.keys(div.values || {})) ids.push(leafId);
        return ids;
    }
    return Object.keys(node.data?.values || {});
}

// Toggle selection for a node (leaf, division, or dimension).
// Modifies selectedIds in place.
export function toggleNode(node, selectedIds) {
    const leafIds = getLeafIds(node);
    const allSelected = leafIds.length > 0 && leafIds.every(id => selectedIds.has(id));
    if (allSelected) leafIds.forEach(id => selectedIds.delete(id));
    else leafIds.forEach(id => selectedIds.add(id));
}

// Sync aria-selected on the Data Navigator overlay element for a node.
export function syncAriaSelected(node, selectedIds) {
    const el = document.getElementById(node.id);
    if (!el) return;
    const leafIds = getLeafIds(node);
    const allSelected = leafIds.length > 0 && leafIds.every(id => selectedIds.has(id));
    el.setAttribute('aria-selected', String(allSelected));
}

// Render a summary table of selected data points.
export function renderTable(selectedIds, data) {
    const titleEl = document.getElementById('ie-table-title');
    const containerEl = document.getElementById('ie-table-container');
    if (!titleEl || !containerEl) return;

    const count = selectedIds.size;
    titleEl.textContent = `${count} Selected Data Point${count !== 1 ? 's' : ''}`;
    if (count === 0) {
        containerEl.innerHTML = '';
        return;
    }

    const selected = data.filter(d => selectedIds.has(d.pt));
    const table = document.createElement('table');
    table.style.borderCollapse = 'collapse';
    table.style.marginTop = '0.5em';

    const thead = table.createTHead();
    const headerRow = thead.insertRow();
    ['ID', 'Sepal Length', 'Petal Length', 'Species'].forEach(h => {
        const th = document.createElement('th');
        th.textContent = h;
        th.style.cssText = 'border:1px solid #ccc;padding:4px 8px;text-align:left;background:#f5f5f5;';
        headerRow.appendChild(th);
    });

    const tbody = table.createTBody();
    selected.forEach(d => {
        const row = tbody.insertRow();
        [d.pt, d.sepal_length, d.petal_length, d.species].forEach(val => {
            const td = row.insertCell();
            td.textContent = val;
            td.style.cssText = 'border:1px solid #ccc;padding:4px 8px;';
        });
    });

    containerEl.innerHTML = '';
    containerEl.appendChild(table);
}
