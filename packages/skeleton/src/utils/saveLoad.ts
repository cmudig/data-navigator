import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { migrate, type Doc } from '../model/doc';

const MIME: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    svg: 'image/svg+xml',
    gif: 'image/gif',
    webp: 'image/webp'
};

const toBytes = (b64: string) => Uint8Array.from(atob(b64), c => c.charCodeAt(0));
function toBase64(bytes: Uint8Array) {
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(s);
}

export function download(name: string, data: BlobPart, type: string) {
    const url = URL.createObjectURL(new Blob([data], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
}

export function zip(files: Record<string, string | Uint8Array>) {
    return zipSync(
        Object.fromEntries(Object.entries(files).map(([k, v]) => [k, typeof v === 'string' ? strToU8(v) : v])),
        { level: 6 }
    ) as Uint8Array<ArrayBuffer>;
}

export function saveDoc(doc: Doc) {
    const files: Record<string, string | Uint8Array> = {
        'skeleton-state.json': JSON.stringify(
            {
                version: '2',
                savedAt: new Date().toISOString(),
                doc: { ...doc, image: doc.image && { ...doc.image, url: '' } }
            },
            null,
            1
        )
    };
    if (doc.image) {
        const ext = doc.image.url.match(/^data:image\/(\w+)/)?.[1] ?? 'png';
        files[`image.${ext === 'svg+xml' ? 'svg' : ext}`] = toBytes(doc.image.url.split(',')[1]);
    }
    download(`skeleton-${new Date().toISOString().slice(0, 10)}.zip`, zip(files), 'application/zip');
}

export async function loadDoc(file: Blob): Promise<Doc> {
    const files = unzipSync(new Uint8Array(await file.arrayBuffer()));
    const json = files['skeleton-state.json'];
    if (!json) throw new Error('Not a Skeleton save file (missing skeleton-state.json).');
    const saved = JSON.parse(strFromU8(json));
    const img = Object.keys(files).find(n => n.startsWith('image.'));
    const ext = img?.split('.').pop() ?? 'png';
    const url = img ? `data:${MIME[ext] ?? `image/${ext}`};base64,${toBase64(files[img])}` : null;
    if (saved.version === '1') return migrate(saved.state, url);
    if (saved.version !== '2' || !saved.doc) throw new Error('Unrecognized save file format.');
    const doc: Doc = saved.doc;
    doc.image = doc.image && url ? { ...doc.image, url } : null;
    doc.overrides.order ??= {};
    return doc;
}
