export class CommandsTable extends HTMLElement {
    #commands = [];
    #connected = false;

    static get observedAttributes() {
        return ["title"];
    }

    set commands(value) {
        this.#commands = value;
        this.#render();
    }

    get commands() {
        return this.#commands;
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

        const caption = document.createElement("caption");
        caption.classList.add('dn-commands-table-caption');
        caption.textContent = this.getAttribute("title") ?? "Keyboard commands";

        const commandHeader = document.createElement("th");
        commandHeader.classList.add('dn-commands-table-th');
        commandHeader.textContent = "Command";

        const keyHeader = document.createElement("th");
        keyHeader.classList.add('dn-commands-table-th');
        keyHeader.textContent = "Key";

        const headerRow = document.createElement("tr");
        headerRow.classList.add('dn-commands-table-thead-tr');
        headerRow.appendChild(commandHeader);
        headerRow.appendChild(keyHeader);

        const thead = document.createElement("thead");
        thead.classList.add('dn-commands-table-thead');
        thead.appendChild(headerRow);

        const tbody = document.createElement("tbody");
        tbody.classList.add('dn-commands-table-tbody');
        for (const command of this.#commands) {
            const descriptionCell = document.createElement("td");
            descriptionCell.classList.add('dn-commands-table-td');
            descriptionCell.textContent = command.description;

            const commandCell = document.createElement("td");
            commandCell.classList.add('dn-commands-table-td');
            commandCell.textContent = command.command;

            const row = document.createElement("tr");
            row.classList.add('dn-commands-table-tbody-tr');
            row.appendChild(descriptionCell);
            row.appendChild(commandCell);

            tbody.appendChild(row);
        }

        const table = document.createElement("table");
        table.classList.add('dn-commands-table');
        table.appendChild(caption);
        table.appendChild(thead);
        table.appendChild(tbody);

        this.appendChild(table);
    }

    disconnectedCallback() {
        this.#connected = false;
    }
}