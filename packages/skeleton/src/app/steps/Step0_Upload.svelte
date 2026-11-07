<script lang="ts">
    import { app, commit, goTo, load } from '../../model/state.svelte';
    import { emptyDoc, guessId, inferFields, type Row } from '../../model/doc';
    import { loadDoc } from '../../utils/saveLoad';

    const imageDataUrl = $derived(app.doc.image?.url ?? null);
    const imageWidth = $derived(app.doc.image?.width ?? null);
    const imageHeight = $derived(app.doc.image?.height ?? null);
    const uploadedData = $derived(app.doc.data.rows);
    const fileName = $derived(app.doc.data.name);
    let imageStatus = $state('');
    let dataStatus = $state('');
    let imageDragging = $state(false);
    let dataDragging = $state(false);
    let imageFileInput: HTMLInputElement;
    let dataFileInput: HTMLInputElement;

    const BASE = import.meta.env.BASE_URL;
    const EXAMPLES = [
        { group: 'Data only', label: 'City climate', data: 'climate.json', step: 1 },
        { group: 'Unprepped', label: 'Bar Chart', image: 'skeleton_starter.png', data: 'skeleton_starter.json', step: 1 },
        { group: 'Unprepped', label: 'Stacked Bar Chart', image: 'stack.png', data: 'stack.json', step: 1 },
        { group: 'Unprepped', label: 'Line Chart', image: 'line.png', data: 'line.json', step: 1 },
        { group: 'Unprepped', label: 'Scatter Plot', image: 'scatter.png', data: 'scatter.json', step: 1 },
        { group: 'Prep done', label: 'Scatter Plot', session: '2026-07-skeleton-sample-editor-view.zip', step: 2 },
        { group: 'Ready to test', label: 'Scatter Plot', session: '2026-07-skeleton-sample-scaffolded-view.zip', step: 3 }
    ];
    type Example = (typeof EXAMPLES)[number];
    const GROUPS = [...new Set(EXAMPLES.map(e => e.group))];

    const readAs = (blob: Blob, how: 'text' | 'url') =>
        new Promise<string>((res, rej) => {
            const r = new FileReader();
            r.onload = () => res(r.result as string);
            r.onerror = rej;
            how === 'text' ? r.readAsText(blob) : r.readAsDataURL(blob);
        });

    const imageSize = (url: string) =>
        new Promise<{ width: number; height: number }>(res => {
            const img = new Image();
            img.onload = () => res({ width: img.naturalWidth || 800, height: img.naturalHeight || 600 });
            img.onerror = () => res({ width: 800, height: 600 });
            img.src = url;
        });

    async function setImage(blob: Blob, name: string) {
        const url = await readAs(blob, 'url');
        const size = await imageSize(url);
        commit('Uploaded image', d => ({ ...d, image: { url, ...size } }));
        imageStatus = `Image loaded: ${name} (${size.width}×${size.height}).`;
    }

    function setData(rows: Row[] | null, name: string) {
        const d = app.doc;
        const hasWork = d.recipe.dimensions.length > 0 || Object.keys(d.overrides.added.nodes).length > 0;
        if (hasWork && !confirm('Replacing the data resets prep answers, dimensions, labels and manual nodes. Continue?')) return false;
        const fields = rows ? inferFields(rows) : [];
        commit(rows ? 'Uploaded data' : 'Removed data', doc => ({
            ...emptyDoc(),
            image: doc.image,
            data: { rows, name, fields, idKey: rows ? guessId(rows, fields) : null }
        }));
        return true;
    }

    async function loadExample(ex: Example) {
        imageStatus = dataStatus = 'Loading example…';
        try {
            if (ex.session) {
                const res = await fetch(BASE + ex.session);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                load(await loadDoc(await res.blob()));
                imageStatus = `Loaded session ${ex.session}.`;
            } else {
                const [img, data] = await Promise.all([ex.image && fetch(BASE + ex.image), fetch(BASE + ex.data)]);
                if ((img && !img.ok) || !data.ok) throw new Error(`HTTP ${data.ok ? img && img.status : data.status}`);
                const rows: Row[] = await data.json();
                if (!setData(rows, ex.data!)) return (imageStatus = dataStatus = '');
                dataStatus = `Example dataset loaded (${rows.length} rows).`;
                if (img) await setImage(await img.blob(), ex.image!);
                else imageStatus = '';
            }
            goTo(ex.step, true);
        } catch (e) {
            imageStatus = `Error loading example: ${(e as Error).message}`;
            dataStatus = '';
        }
    }

    function onExampleChange(e: Event) {
        const el = e.target as HTMLSelectElement;
        const ex = EXAMPLES[+el.value];
        el.value = '';
        if (ex) loadExample(ex);
    }

    function parseCSVLine(line: string): string[] {
        const out: string[] = [];
        let cur = '';
        let quoted = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"' && quoted && line[i + 1] === '"') (cur += '"'), i++;
            else if (ch === '"') quoted = !quoted;
            else if (ch === ',' && !quoted) out.push(cur), (cur = '');
            else cur += ch;
        }
        return [...out, cur];
    }

    function parseCSV(text: string): Row[] {
        const [head, ...lines] = text.trim().split(/\r?\n/);
        const headers = parseCSVLine(head).map(h => h.trim());
        return lines.filter(l => l.trim()).map(l => {
            const v = parseCSVLine(l);
            return Object.fromEntries(headers.map((h, i) => [h, (v[i] ?? '').trim()]));
        });
    }

    function handleImageFile(file: File) {
        if (!/\.(png|jpe?g|svg|gif)$/i.test(file.name) && !file.type.startsWith('image/')) {
            imageStatus = 'Error: only PNG, JPG, JPEG, SVG, or GIF files accepted.';
            return;
        }
        setImage(file, file.name);
    }

    async function handleDataFile(file: File) {
        if (!/\.(csv|json)$/i.test(file.name)) {
            dataStatus = 'Error: only CSV and JSON files accepted.';
            return;
        }
        try {
            const text = await readAs(file, 'text');
            const parsed = file.name.toLowerCase().endsWith('.json') ? JSON.parse(text) : parseCSV(text);
            const rows: Row[] = Array.isArray(parsed) ? parsed : [parsed];
            if (setData(rows, file.name)) dataStatus = `Data uploaded: ${file.name} (${rows.length} rows).`;
        } catch (e) {
            dataStatus = `Error parsing ${file.name}: ${(e as Error).message}`;
        }
    }

    function removeImage() {
        commit('Removed image', d => ({ ...d, image: null }));
        imageStatus = 'Image removed.';
    }

    function removeData() {
        if (setData(null, '')) dataStatus = 'Data removed.';
    }

    const dropper = (set: (v: boolean) => void, handle: (f: File) => void) => ({
        ondragover: (e: DragEvent) => (e.preventDefault(), set(true)),
        ondragleave: (e: DragEvent) => !(e.currentTarget as Element).contains(e.relatedTarget as Node) && set(false),
        ondrop: (e: DragEvent) => {
            e.preventDefault();
            set(false);
            const f = e.dataTransfer?.files[0];
            if (f) handle(f);
        }
    });
    const imageDrop = dropper(v => (imageDragging = v), handleImageFile);
    const dataDrop = dropper(v => (dataDragging = v), handleDataFile);

    const previewRows = $derived(uploadedData?.slice(0, 5) ?? []);
    const previewCols = $derived(Object.keys(previewRows[0] ?? {}).slice(0, 5));
</script>

<div class="upload-step">
    <h2 id="step-heading-0" tabindex="-1">Upload</h2>
    <p class="step-desc">
        Optionally upload an image and/or structured data file to use as a reference when building your navigation structure.
    </p>

    <div class="upload-zones">
        <!-- ── Image zone + example ────────────────────────────────────────── -->
        <div class="upload-zone-group">
            <div
                class="upload-zone"
                class:dragging={imageDragging}
                class:has-content={imageDataUrl !== null}
                role="region"
                aria-label="Image upload"
                {...imageDrop}
            >
                <input
                    bind:this={imageFileInput}
                    type="file"
                    accept=".png,.jpg,.jpeg,.svg,.gif,image/png,image/jpeg,image/gif,image/svg+xml"
                    class="visually-hidden"
                    aria-hidden="true"
                    tabindex="-1"
                    onchange={(e) => {
                        const f = (e.target as HTMLInputElement).files?.[0];
                        if (f) handleImageFile(f);
                        (e.target as HTMLInputElement).value = '';
                    }}
                />

                {#if imageDataUrl === null}
                    <button class="zone-prompt" type="button" onclick={() => imageFileInput.click()}>
                        <svg class="zone-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <polyline points="21 15 16 10 5 21"/>
                        </svg>
                        <p class="zone-title">Image</p>
                        <p class="zone-hint">PNG, JPG, JPEG, SVG, GIF</p>
                        <p class="zone-hint">Drag &amp; drop or click to browse</p>
                    </button>
                {:else}
                    <div class="image-preview">
                        <img
                            src={imageDataUrl}
                            alt="Uploaded preview"
                            class="preview-img"
                        />
                        {#if imageWidth && imageHeight}
                            <p class="preview-meta">{imageWidth}×{imageHeight}px</p>
                        {/if}
                        <button
                            class="btn-ghost btn-sm"
                            type="button"
                            onclick={removeImage}
                        >
                            Remove image
                        </button>
                    </div>
                {/if}
            </div>
        </div>

        <!-- ── Data zone + example ──────────────────────────────────────────── -->
        <div class="upload-zone-group">
            <div
                class="upload-zone"
                class:dragging={dataDragging}
                class:has-content={uploadedData !== null}
                role="region"
                aria-label="Data upload"
                {...dataDrop}
            >
                <input
                    bind:this={dataFileInput}
                    type="file"
                    accept=".csv,.json,text/csv,application/json"
                    class="visually-hidden"
                    aria-hidden="true"
                    tabindex="-1"
                    onchange={(e) => {
                        const f = (e.target as HTMLInputElement).files?.[0];
                        if (f) handleDataFile(f);
                        (e.target as HTMLInputElement).value = '';
                    }}
                />

                {#if uploadedData === null}
                    <button class="zone-prompt" type="button" onclick={() => dataFileInput.click()}>
                        <svg class="zone-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 3h18v4H3zM3 10h18v4H3zM3 17h18v4H3z"/>
                        </svg>
                        <p class="zone-title">Data</p>
                        <p class="zone-hint">CSV or JSON</p>
                        <p class="zone-hint">Drag &amp; drop or click to browse</p>
                    </button>
                {:else}
                    <div class="data-preview">
                        <p class="preview-meta">
                            {fileName} ({uploadedData.length} row{uploadedData.length !== 1 ? 's' : ''})
                        </p>
                        {#if previewCols.length > 0}
                            <div class="preview-table-wrapper">
                                <table class="preview-table">
                                    <caption class="visually-hidden">
                                        Data preview: first {previewRows.length} rows and {previewCols.length} columns
                                    </caption>
                                    <thead>
                                        <tr>
                                            {#each previewCols as col}
                                                <th scope="col">{col}</th>
                                            {/each}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {#each previewRows as row}
                                            <tr>
                                                {#each previewCols as col}
                                                    <td>{row[col]}</td>
                                                {/each}
                                            </tr>
                                        {/each}
                                    </tbody>
                                </table>
                            </div>
                        {/if}
                        <button
                            class="btn-ghost btn-sm"
                            type="button"
                            onclick={removeData}
                        >
                            Remove data
                        </button>
                    </div>
                {/if}
            </div>
        </div>
    </div>

    <!-- ── Examples dropdown ───────────────────────────────────────────────── -->
    <div class="examples-row">
        <label for="example-select" class="examples-label">Load an example</label>
        <select id="example-select" class="examples-select" onchange={onExampleChange}>
            <option value="">— choose an example —</option>
            {#each GROUPS as group (group)}
                <optgroup label={group}>
                    {#each EXAMPLES as ex, i (i)}
                        {#if ex.group === group}<option value={i}>{ex.label}</option>{/if}
                    {/each}
                </optgroup>
            {/each}
        </select>
        <button class="btn-ghost btn-sm" type="button" onclick={() => loadExample(EXAMPLES[0])}>Try sample data</button>
    </div>

    <!-- aria-live status regions (screen-reader announcements) -->
    <div class="visually-hidden" aria-live="polite" aria-atomic="true">{imageStatus}</div>
    <div class="visually-hidden" aria-live="polite" aria-atomic="true">{dataStatus}</div>

    <!-- ── Actions row ─────────────────────────────────────────────────────── -->
    <div class="step-actions">
        <button class="btn-primary" type="button" onclick={() => goTo(1)}>
            Continue to Prep →
        </button>
    </div>
</div>

<style>
    .upload-step {
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 3);
        max-width: 900px;
    }

    .upload-step h2 {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--dn-text);
    }

    .step-desc {
        margin: calc(var(--dn-space) * -2) 0 0;
        color: var(--dn-text-muted);
    }

    /* ── Two-zone layout ───────────────────────────────────────────────────── */

    .upload-zones {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: calc(var(--dn-space) * 2);
    }

    @media (max-width: 640px) {
        .upload-zones {
            grid-template-columns: 1fr;
        }
    }

    .upload-zone-group {
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 1);
    }

    /* ── Examples dropdown ─────────────────────────────────────────────────── */

    .examples-row {
        display: flex;
        align-items: center;
        gap: calc(var(--dn-space) * 1.5);
        flex-wrap: wrap;
    }

    .examples-label {
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--dn-text-muted);
        white-space: nowrap;
    }

    .examples-select {
        flex: 1;
        min-width: 180px;
        max-width: 300px;
        background: var(--dn-surface);
        border: 1px solid var(--dn-border);
        border-radius: var(--dn-radius);
        color: var(--dn-text);
        font-family: var(--dn-font);
        font-size: 0.875rem;
        padding: calc(var(--dn-space) * 0.5) calc(var(--dn-space) * 1);
        cursor: pointer;
        transition: border-color 0.15s;
    }

    .examples-select:focus-visible {
        outline: 3px solid var(--dn-accent);
        outline-offset: 2px;
        border-color: var(--dn-accent);
    }

    .examples-select:hover {
        border-color: var(--dn-accent-light);
    }

    /* ── Upload zone ───────────────────────────────────────────────────────── */

    .upload-zone {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 260px;
        border: 2px dashed var(--dn-border);
        border-radius: var(--dn-radius);
        background: var(--dn-surface);
        cursor: pointer;
        transition: border-color 0.15s, background 0.15s;
        padding: calc(var(--dn-space) * 2);
        overflow: hidden;
        position: relative;
    }

    .upload-zone:hover:not(.has-content),
    .upload-zone:focus-visible:not(.has-content) {
        border-color: var(--dn-accent-light);
        background: var(--dn-accent-soft);
        outline: none;
    }

    .upload-zone.dragging {
        border-color: var(--dn-accent);
        background: var(--dn-accent-soft);
    }

    .upload-zone.has-content {
        cursor: default;
        border-style: solid;
        border-color: var(--dn-border);
        align-items: flex-start;
        justify-content: flex-start;
    }

    .upload-zone:focus-visible {
        outline: 3px solid var(--dn-accent);
        outline-offset: 2px;
    }

    /* ── Empty zone prompt ─────────────────────────────────────────────────── */

    .zone-prompt {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: calc(var(--dn-space) * 0.75);
        text-align: center;
        user-select: none;
        width: 100%;
        height: 100%;
        background: none;
        border: none;
        color: inherit;
        font: inherit;
        cursor: pointer;
    }

    .zone-icon {
        width: 40px;
        height: 40px;
        color: var(--dn-text-muted);
        opacity: 0.6;
    }

    .zone-title {
        margin: 0;
        font-weight: 600;
        font-size: 1rem;
        color: var(--dn-text);
    }

    .zone-hint {
        margin: 0;
        font-size: 0.8125rem;
        color: var(--dn-text-muted);
    }

    /* ── Image preview ─────────────────────────────────────────────────────── */

    .image-preview {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: calc(var(--dn-space) * 1);
        width: 100%;
    }

    .preview-img {
        max-height: 240px;
        max-width: 100%;
        object-fit: contain;
        border-radius: calc(var(--dn-radius) / 2);
        display: block;
    }

    /* ── Data preview ──────────────────────────────────────────────────────── */

    .data-preview {
        display: flex;
        flex-direction: column;
        gap: calc(var(--dn-space) * 1);
        width: 100%;
        overflow: hidden;
    }

    .preview-meta {
        margin: 0;
        font-size: 0.8125rem;
        font-weight: 600;
        color: var(--dn-text-muted);
    }

    .preview-table-wrapper {
        overflow-x: auto;
        border: 1px solid var(--dn-control);
        border-radius: calc(var(--dn-radius) / 2);
    }

    .preview-table {
        border-collapse: collapse;
        font-size: 0.75rem;
        width: 100%;
        min-width: max-content;
    }

    .preview-table th,
    .preview-table td {
        padding: calc(var(--dn-space) * 0.5) calc(var(--dn-space) * 1);
        text-align: left;
        border-bottom: 1px solid var(--dn-control);
        white-space: nowrap;
        max-width: 120px;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .preview-table th {
        background: var(--dn-surface);
        font-weight: 600;
        color: var(--dn-text);
        position: sticky;
        top: 0;
    }

    .preview-table td {
        color: var(--dn-text-muted);
    }

    .preview-table tbody tr:last-child td {
        border-bottom: none;
    }

    /* ── Actions row ───────────────────────────────────────────────────────── */

    .step-actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: calc(var(--dn-space) * 2);
        flex-wrap: wrap;
    }

</style>
