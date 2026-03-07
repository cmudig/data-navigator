<script lang="ts">
    import { appState, DEFAULT_APP_STATE, type AppState } from '../../store/appState';

    // ─── Image upload ──────────────────────────────────────────────────────────
    let imageDataUrl: string | null = $state(null);
    let imageWidth: number | null = $state(null);
    let imageHeight: number | null = $state(null);
    let imageStatus = $state('');
    let imageDragging = $state(false);
    let imageFileInput: HTMLInputElement;

    // ─── Data upload ───────────────────────────────────────────────────────────
    let uploadedData: Record<string, unknown>[] | null = $state(null);
    let uploadedDataRaw: { filename: string; content: string } | null = $state(null);
    let dataStatus = $state('');
    let dataDragging = $state(false);
    let dataFileInput: HTMLInputElement;

    // ─── Example loaders ───────────────────────────────────────────────────────
    const BASE = import.meta.env.BASE_URL;

    async function useExampleImage() {
        imageStatus = 'Loading example image…';
        try {
            const res = await fetch(`${BASE}skeleton_starter.png`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const blob = await res.blob();
            const reader = new FileReader();
            reader.onload = () => {
                const dataUrl = reader.result as string;
                const img = new Image();
                img.onload = () => {
                    imageDataUrl = dataUrl;
                    imageWidth = img.naturalWidth || null;
                    imageHeight = img.naturalHeight || null;
                    imageStatus = `Example image loaded${imageWidth ? ` (${imageWidth}×${imageHeight})` : ''}.`;
                    appState.update(s => ({ ...s, imageDataUrl, imageWidth, imageHeight }));
                };
                img.onerror = () => {
                    imageDataUrl = dataUrl;
                    imageWidth = null; imageHeight = null;
                    imageStatus = 'Example image loaded.';
                    appState.update(s => ({ ...s, imageDataUrl, imageWidth: null, imageHeight: null }));
                };
                img.src = dataUrl;
            };
            reader.readAsDataURL(blob);
        } catch (e) {
            imageStatus = `Error loading example image: ${(e as Error).message}`;
        }
    }

    async function useExampleData() {
        dataStatus = 'Loading example dataset…';
        try {
            const res = await fetch(`${BASE}skeleton_starter.json`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const content = await res.text();
            const data: Record<string, unknown>[] = JSON.parse(content);
            const raw = { filename: 'skeleton_starter.json', content };
            uploadedData = data;
            uploadedDataRaw = raw;
            dataStatus = `Example dataset loaded (${data.length} row${data.length !== 1 ? 's' : ''}).`;
            appState.update(s => ({ ...s, uploadedData: data, uploadedDataRaw: raw }));
        } catch (e) {
            dataStatus = `Error loading example dataset: ${(e as Error).message}`;
        }
    }

    // ─── Session restore ───────────────────────────────────────────────────────
    let sessionFileInput: HTMLInputElement;
    let sessionStatus = $state('');

    // ─── Minimal CSV parser ───────────────────────────────────────────────────
    function parseCSVLine(line: string): string[] {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
                if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
                else { inQuotes = !inQuotes; }
            } else if (ch === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += ch;
            }
        }
        result.push(current);
        return result;
    }

    function parseCSV(text: string): Record<string, string>[] {
        const lines = text.trim().split(/\r?\n/);
        if (lines.length < 2) return [];
        const headers = parseCSVLine(lines[0]);
        return lines.slice(1).filter(l => l.trim()).map(line => {
            const values = parseCSVLine(line);
            const row: Record<string, string> = {};
            headers.forEach((h, i) => { row[h.trim()] = (values[i] ?? '').trim(); });
            return row;
        });
    }

    // ─── File handlers ────────────────────────────────────────────────────────
    function handleImageFile(file: File) {
        const validTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml'];
        const validExts = ['.png', '.jpg', '.jpeg', '.svg', '.gif'];
        const nameLower = file.name.toLowerCase();
        if (!validTypes.includes(file.type) && !validExts.some(ext => nameLower.endsWith(ext))) {
            imageStatus = 'Error: only PNG, JPG, JPEG, SVG, or GIF files accepted.';
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result as string;
            const img = new Image();
            img.onload = () => {
                imageDataUrl = dataUrl;
                imageWidth = img.naturalWidth || null;
                imageHeight = img.naturalHeight || null;
                imageStatus = `Image uploaded: ${file.name}${imageWidth ? ` (${imageWidth}×${imageHeight})` : ''}.`;
                appState.update(s => ({ ...s, imageDataUrl, imageWidth, imageHeight }));
            };
            img.onerror = () => {
                imageDataUrl = dataUrl;
                imageWidth = null;
                imageHeight = null;
                imageStatus = `Image uploaded: ${file.name}.`;
                appState.update(s => ({ ...s, imageDataUrl, imageWidth: null, imageHeight: null }));
            };
            img.src = dataUrl;
        };
        reader.readAsDataURL(file);
    }

    function handleDataFile(file: File) {
        const validExts = ['.csv', '.json'];
        const nameLower = file.name.toLowerCase();
        if (!validExts.some(ext => nameLower.endsWith(ext))) {
            dataStatus = 'Error: only CSV and JSON files accepted.';
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            const content = reader.result as string;
            const raw = { filename: file.name, content };
            try {
                let data: Record<string, unknown>[];
                if (nameLower.endsWith('.json')) {
                    const parsed = JSON.parse(content);
                    data = Array.isArray(parsed) ? parsed : [parsed];
                } else {
                    data = parseCSV(content);
                }
                uploadedData = data;
                uploadedDataRaw = raw;
                dataStatus = `Data uploaded: ${file.name} (${data.length} row${data.length !== 1 ? 's' : ''}).`;
                appState.update(s => ({ ...s, uploadedData: data, uploadedDataRaw: raw }));
            } catch (e) {
                dataStatus = `Error parsing ${file.name}: ${(e as Error).message}`;
            }
        };
        reader.readAsText(file);
    }

    function removeImage() {
        imageDataUrl = null;
        imageWidth = null;
        imageHeight = null;
        imageStatus = 'Image removed.';
        imageFileInput.value = '';
        appState.update(s => ({ ...s, imageDataUrl: null, imageWidth: null, imageHeight: null }));
    }

    function removeData() {
        uploadedData = null;
        uploadedDataRaw = null;
        dataStatus = 'Data removed.';
        dataFileInput.value = '';
        appState.update(s => ({ ...s, uploadedData: null, uploadedDataRaw: null }));
    }

    // ─── Session restore ──────────────────────────────────────────────────────
    function handleSessionFile(file: File) {
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const raw = JSON.parse(reader.result as string);
                // JSON.parse gives plain objects; convert to Map/Set
                const nodes = new Map(Object.entries(raw.nodes ?? {}));
                const edges = new Map(Object.entries(raw.edges ?? {}));
                const session: AppState = {
                    ...DEFAULT_APP_STATE,
                    ...raw,
                    nodes,
                    edges,
                    selectedNodeIds: new Set<string>(),
                    selectedEdgeIds: new Set<string>(),
                    entryNodeId: raw.entryNodeId ?? null,
                };
                const nodeCount = nodes.size;
                const edgeCount = edges.size;
                appState.set(session);
                // Sync local mirrors
                imageDataUrl = session.imageDataUrl;
                imageWidth = session.imageWidth;
                imageHeight = session.imageHeight;
                uploadedData = session.uploadedData;
                uploadedDataRaw = session.uploadedDataRaw;
                sessionStatus = `Session loaded: ${nodeCount} node${nodeCount !== 1 ? 's' : ''}, ${edgeCount} edge${edgeCount !== 1 ? 's' : ''}.`;
            } catch (e) {
                sessionStatus = `Error loading session: ${(e as Error).message}`;
            }
        };
        reader.readAsText(file);
    }

    // ─── Drag-and-drop ────────────────────────────────────────────────────────
    function onImageDragOver(e: DragEvent) { e.preventDefault(); imageDragging = true; }
    function onImageDragLeave(e: DragEvent) {
        if (!(e.currentTarget as Element).contains(e.relatedTarget as Node)) imageDragging = false;
    }
    function onImageDrop(e: DragEvent) {
        e.preventDefault();
        imageDragging = false;
        const file = e.dataTransfer?.files[0];
        if (file) handleImageFile(file);
    }

    function onDataDragOver(e: DragEvent) { e.preventDefault(); dataDragging = true; }
    function onDataDragLeave(e: DragEvent) {
        if (!(e.currentTarget as Element).contains(e.relatedTarget as Node)) dataDragging = false;
    }
    function onDataDrop(e: DragEvent) {
        e.preventDefault();
        dataDragging = false;
        const file = e.dataTransfer?.files[0];
        if (file) handleDataFile(file);
    }

    // ─── Zone click/keyboard ──────────────────────────────────────────────────
    function onImageZoneClick() {
        if (!imageDataUrl) imageFileInput.click();
    }
    function onImageZoneKeydown(e: KeyboardEvent) {
        if ((e.key === 'Enter' || e.key === ' ') && !imageDataUrl) {
            e.preventDefault();
            imageFileInput.click();
        }
    }

    function onDataZoneClick() {
        if (!uploadedData) dataFileInput.click();
    }
    function onDataZoneKeydown(e: KeyboardEvent) {
        if ((e.key === 'Enter' || e.key === ' ') && !uploadedData) {
            e.preventDefault();
            dataFileInput.click();
        }
    }

    // ─── Continue ─────────────────────────────────────────────────────────────
    function continueToStructure() {
        appState.update(s => ({ ...s, currentStep: 1 }));
    }

    // ─── Preview ──────────────────────────────────────────────────────────────
    const previewRows = $derived(uploadedData ? uploadedData.slice(0, 5) : []);
    const previewCols = $derived(
        previewRows.length > 0 ? Object.keys(previewRows[0]).slice(0, 5) : []
    );

    const imageZoneLabel = $derived(
        imageDataUrl
            ? `Uploaded image preview${imageWidth ? `, ${imageWidth} by ${imageHeight} pixels` : ''}.`
            : 'Image upload zone. Accepts PNG, JPG, JPEG, SVG, GIF. Drag and drop or press Enter to browse files.'
    );
    const dataZoneLabel = $derived(
        uploadedData
            ? `Uploaded data preview. ${uploadedDataRaw?.filename}, ${uploadedData.length} rows.`
            : 'Data upload zone. Accepts CSV and JSON files. Drag and drop or press Enter to browse files.'
    );
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
                role="button"
                tabindex="0"
                aria-label={imageZoneLabel}
                ondragover={onImageDragOver}
                ondragleave={onImageDragLeave}
                ondrop={onImageDrop}
                onclick={onImageZoneClick}
                onkeydown={onImageZoneKeydown}
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
                    <div class="zone-prompt">
                        <svg class="zone-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <polyline points="21 15 16 10 5 21"/>
                        </svg>
                        <p class="zone-title">Image</p>
                        <p class="zone-hint">PNG, JPG, JPEG, SVG, GIF</p>
                        <p class="zone-hint">Drag &amp; drop or click to browse</p>
                    </div>
                {:else}
                    <div
                        class="image-preview"
                        role="presentation"
                        onclick={(e) => e.stopPropagation()}
                        onkeydown={(e) => e.stopPropagation()}
                    >
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
                            onclick={(e) => { e.stopPropagation(); removeImage(); }}
                        >
                            Remove image
                        </button>
                    </div>
                {/if}
            </div>
            {#if imageDataUrl === null}
                <button class="btn-example" type="button" onclick={useExampleImage}>
                    Use example image
                </button>
            {/if}
        </div>

        <!-- ── Data zone + example ──────────────────────────────────────────── -->
        <div class="upload-zone-group">
            <div
                class="upload-zone"
                class:dragging={dataDragging}
                class:has-content={uploadedData !== null}
                role="button"
                tabindex="0"
                aria-label={dataZoneLabel}
                ondragover={onDataDragOver}
                ondragleave={onDataDragLeave}
                ondrop={onDataDrop}
                onclick={onDataZoneClick}
                onkeydown={onDataZoneKeydown}
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
                    <div class="zone-prompt">
                        <svg class="zone-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 3h18v4H3zM3 10h18v4H3zM3 17h18v4H3z"/>
                        </svg>
                        <p class="zone-title">Data</p>
                        <p class="zone-hint">CSV or JSON</p>
                        <p class="zone-hint">Drag &amp; drop or click to browse</p>
                    </div>
                {:else}
                    <div
                        class="data-preview"
                        role="presentation"
                        onclick={(e) => e.stopPropagation()}
                        onkeydown={(e) => e.stopPropagation()}
                    >
                        <p class="preview-meta">
                            {uploadedDataRaw?.filename} — {uploadedData.length} row{uploadedData.length !== 1 ? 's' : ''}
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
                            onclick={(e) => { e.stopPropagation(); removeData(); }}
                        >
                            Remove data
                        </button>
                    </div>
                {/if}
            </div>
            {#if uploadedData === null}
                <button class="btn-example" type="button" onclick={useExampleData}>
                    Use example dataset
                </button>
            {/if}
        </div>
    </div>

    <!-- aria-live status regions (screen-reader announcements) -->
    <div class="visually-hidden" aria-live="polite" aria-atomic="true">{imageStatus}</div>
    <div class="visually-hidden" aria-live="polite" aria-atomic="true">{dataStatus}</div>

    <!-- ── Actions row ─────────────────────────────────────────────────────── -->
    <div class="step-actions">
        <div class="session-load">
            <input
                bind:this={sessionFileInput}
                type="file"
                accept=".json"
                class="visually-hidden"
                aria-hidden="true"
                tabindex="-1"
                onchange={(e) => {
                    const f = (e.target as HTMLInputElement).files?.[0];
                    if (f) handleSessionFile(f);
                    (e.target as HTMLInputElement).value = '';
                }}
            />
            <button
                class="btn-ghost"
                type="button"
                onclick={() => sessionFileInput.click()}
            >
                Load previous session
            </button>
            {#if sessionStatus}
                <span class="session-status" aria-live="polite" aria-atomic="true">
                    {sessionStatus}
                </span>
            {/if}
        </div>

        <button class="btn-primary" type="button" onclick={continueToStructure}>
            Continue to Structure →
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

    .btn-example {
        display: block;
        width: 100%;
        background: transparent;
        border: 1px dashed var(--dn-border);
        border-radius: var(--dn-radius);
        color: var(--dn-accent-light);
        font-family: var(--dn-font);
        font-size: 0.8125rem;
        font-weight: 500;
        padding: calc(var(--dn-space) * 0.75) calc(var(--dn-space) * 1.5);
        cursor: pointer;
        text-align: center;
        transition: background 0.15s, color 0.15s, border-color 0.15s;
        min-height: 36px;
    }

    .btn-example:hover {
        background: var(--dn-accent-soft);
        color: var(--dn-accent);
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
        gap: calc(var(--dn-space) * 0.75);
        text-align: center;
        pointer-events: none;
        user-select: none;
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
        border: 1px solid var(--dn-border);
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
        border-bottom: 1px solid var(--dn-border);
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

    .session-load {
        display: flex;
        align-items: center;
        gap: calc(var(--dn-space) * 1.5);
        flex-wrap: wrap;
    }

    .session-status {
        font-size: 0.875rem;
        color: var(--dn-accent);
        font-weight: 500;
    }
</style>
