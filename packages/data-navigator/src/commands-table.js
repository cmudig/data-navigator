import { commandsTableDefaultColumns } from './consts';

export class CommandsTable extends HTMLElement {
    #commands = [];
    #columns = commandsTableDefaultColumns;
    #connected = false;

    static get observedAttributes() {
        return ['title'];
    }

    set commands(value) {
        this.#commands = value;
        if (!this.#connected) return;
        this.#render();
    }

    get commands() {
        return this.#commands;
    }

    set columns(value) {
        this.#columns = value;
        if (!this.#connected) return;
        this.#render();
    }

    get columns() {
        return this.#columns;
    }

    attributeChangedCallback() {
        //  Avoid render when the attribute changes on init
        if (!this.#connected) return;
        this.#render();
    }

    connectedCallback() {
        this.#connected = true;
        this.#render();
    }

    #render() {
        this.replaceChildren();

        const headerCells = [];
        for (const column of this.#columns) {
            const headerCell = document.createElement('th');
            headerCell.classList.add('dn-commands-table-th');
            headerCell.textContent = column.label;

            headerCells.push(headerCell);
        }

        const headerRow = document.createElement('tr');
        headerRow.classList.add('dn-commands-table-thead-tr');
        for (const headerCell of headerCells) {
            headerRow.appendChild(headerCell);
        }

        const thead = document.createElement('thead');
        thead.classList.add('dn-commands-table-thead');
        thead.appendChild(headerRow);

        const tbody = document.createElement('tbody');
        tbody.classList.add('dn-commands-table-tbody');
        for (const command of this.#commands) {
            const rowCells = [];

            for (const column of this.#columns) {
                const cellValue = command[column.id];

                const rowCell = document.createElement('td');
                rowCell.classList.add('dn-commands-table-td');
                if (column.id === 'label' && cellValue) {
                    const kbd = document.createElement('kbd');
                    kbd.classList.add('dn-commands-table-td-kbd');
                    kbd.textContent = cellValue;
                    rowCell.append(kbd);
                } else {
                    rowCell.textContent = cellValue;
                }

                rowCells.push(rowCell);
            }

            const row = document.createElement('tr');
            row.classList.add('dn-commands-table-tbody-tr');
            for (const rowCell of rowCells) {
                row.appendChild(rowCell);
            }

            tbody.appendChild(row);
        }

        const table = document.createElement('table');
        table.classList.add('dn-commands-table');

        const title = this.getAttribute('title');
        if (title) {
            const caption = document.createElement('caption');
            caption.classList.add('dn-commands-table-caption');
            caption.textContent = title;
            table.appendChild(caption);
        }

        table.appendChild(thead);
        table.appendChild(tbody);

        this.appendChild(table);
    }

    disconnectedCallback() {
        this.#connected = false;
    }
}
