'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type FontFamily = 'Inter' | 'Kaivalya' | 'Georgia' | 'Courier New';
type TextAlign = 'left' | 'center' | 'right';

export type InviteLayer = {
  id: string;
  label: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  rotation: number;
  color: string;
  fontFamily: FontFamily;
  fontWeight: 400 | 500 | 600 | 700;
  align: TextAlign;
  opacity: number;
};

const INITIAL_LAYERS: InviteLayer[] = [
  {
    id: 'title',
    label: 'Title',
    text: 'Wedding Invitation',
    x: 50,
    y: 18,
    fontSize: 32,
    rotation: 0,
    color: '#6b4730',
    fontFamily: 'Kaivalya',
    fontWeight: 600,
    align: 'center',
    opacity: 1,
  },
  {
    id: 'names',
    label: 'Names',
    text: 'Aarav\n&\nMaya',
    x: 50,
    y: 34,
    fontSize: 42,
    rotation: 0,
    color: '#2d1810',
    fontFamily: 'Georgia',
    fontWeight: 600,
    align: 'center',
    opacity: 1,
  },
  {
    id: 'date',
    label: 'Date',
    text: 'Saturday, November 21, 2026',
    x: 50,
    y: 61,
    fontSize: 18,
    rotation: 0,
    color: '#4f3422',
    fontFamily: 'Inter',
    fontWeight: 500,
    align: 'center',
    opacity: 1,
  },
  {
    id: 'venue',
    label: 'Venue',
    text: 'The Garden Estate\nScottsdale, Arizona',
    x: 50,
    y: 72,
    fontSize: 17,
    rotation: 0,
    color: '#4f3422',
    fontFamily: 'Inter',
    fontWeight: 500,
    align: 'center',
    opacity: 1,
  },
  {
    id: 'rsvp',
    label: 'RSVP',
    text: 'RSVP by October 20\nwith Priya at (555) 123-4567',
    x: 50,
    y: 84,
    fontSize: 15,
    rotation: 0,
    color: '#6b5b4f',
    fontFamily: 'Inter',
    fontWeight: 400,
    align: 'center',
    opacity: 0.95,
  },
];

const FONT_OPTIONS: FontFamily[] = ['Inter', 'Kaivalya', 'Georgia', 'Courier New'];
const FONT_WEIGHTS: InviteLayer['fontWeight'][] = [400, 500, 600, 700];

function getCanvasFont(layer: InviteLayer) {
  return `${layer.fontWeight} ${layer.fontSize}px "${layer.fontFamily}"`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function dataUrlToBlob(dataUrl: string) {
  const [header, body] = dataUrl.split(',');
  const mimeMatch = header.match(/data:(.*?);base64/);
  const mime = mimeMatch?.[1] ?? 'image/png';
  const bytes = atob(body);
  const array = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i += 1) {
    array[i] = bytes.charCodeAt(i);
  }
  return new Blob([array], { type: mime });
}

async function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load image.'));
    image.src = src;
  });
}

type InviteEditorModalProps = {
  backgroundSrc: string;
  onClose: () => void;
  onSaveToEvent?: (imageDataUrl: string) => void;
};

export default function InviteEditorModal({ backgroundSrc, onClose, onSaveToEvent }: InviteEditorModalProps) {
  const [layers, setLayers] = useState(INITIAL_LAYERS);
  const [selectedLayerId, setSelectedLayerId] = useState(INITIAL_LAYERS[0]?.id ?? null);
  const [isExporting, setIsExporting] = useState(false);
  const [draggingLayerId, setDraggingLayerId] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const selectedLayer = useMemo(
    () => layers.find((layer) => layer.id === selectedLayerId) ?? null,
    [layers, selectedLayerId]
  );

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const updateLayer = (id: string, updates: Partial<InviteLayer>) => {
    setLayers((current) =>
      current.map((layer) => (layer.id === id ? { ...layer, ...updates } : layer))
    );
  };

  const addCustomLayer = () => {
    const newLayer: InviteLayer = {
      id: `custom-${Date.now()}`,
      label: `Custom ${layers.filter((layer) => layer.id.startsWith('custom-')).length + 1}`,
      text: 'Add your message',
      x: 50,
      y: 50,
      fontSize: 20,
      rotation: 0,
      color: '#2d1810',
      fontFamily: 'Inter',
      fontWeight: 500,
      align: 'center',
      opacity: 1,
    };
    setLayers((current) => [...current, newLayer]);
    setSelectedLayerId(newLayer.id);
  };

  const removeSelectedLayer = () => {
    if (!selectedLayer) return;
    const remainingLayers = layers.filter((layer) => layer.id !== selectedLayer.id);
    setLayers(remainingLayers);
    setSelectedLayerId(remainingLayers[0]?.id ?? null);
  };

  const startDragging = (event: React.PointerEvent<HTMLDivElement>, layerId: string) => {
    const preview = previewRef.current;
    if (!preview) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedLayerId(layerId);
    setDraggingLayerId(layerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const preview = previewRef.current;
    if (!preview || !draggingLayerId) return;
    const rect = preview.getBoundingClientRect();
    const nextX = ((event.clientX - rect.left) / rect.width) * 100;
    const nextY = ((event.clientY - rect.top) / rect.height) * 100;
    updateLayer(draggingLayerId, {
      x: clamp(nextX, 8, 92),
      y: clamp(nextY, 8, 92),
    });
  };

  const stopDragging = () => setDraggingLayerId(null);

  const buildInviteDataUrl = async () => {
    await document.fonts.ready;
    const image = await loadImage(backgroundSrc);
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth || 1200;
    canvas.height = image.naturalHeight || 1600;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas export is not supported.');

    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    for (const layer of layers) {
      const lines = layer.text.split('\n');
      const x = (layer.x / 100) * canvas.width;
      const y = (layer.y / 100) * canvas.height;
      const lineHeight = layer.fontSize * 1.25;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((layer.rotation * Math.PI) / 180);
      ctx.globalAlpha = layer.opacity;
      ctx.fillStyle = layer.color;
      ctx.font = getCanvasFont(layer);
      ctx.textAlign = layer.align;
      ctx.textBaseline = 'middle';

      const offset = ((lines.length - 1) * lineHeight) / 2;
      lines.forEach((line, index) => {
        ctx.fillText(line, 0, index * lineHeight - offset);
      });
      ctx.restore();
    }

    return canvas.toDataURL('image/png');
  };

  const exportInvite = async () => {
    try {
      setIsExporting(true);
      const dataUrl = await buildInviteDataUrl();
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(dataUrlToBlob(dataUrl));
      downloadLink.download = `invite-${Date.now()}.png`;
      downloadLink.click();
      setTimeout(() => URL.revokeObjectURL(downloadLink.href), 1000);
    } catch (error) {
      console.error('Failed to export invite', error);
      window.alert('Something went wrong while exporting the invite. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const saveInviteToEvent = async () => {
    if (!onSaveToEvent) return;
    try {
      setIsExporting(true);
      const dataUrl = await buildInviteDataUrl();
      onSaveToEvent(dataUrl);
    } catch (error) {
      console.error('Failed to save invite to event', error);
      window.alert('Something went wrong while saving the invite to your event.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-[#2d1810]/70 px-4 py-6 sm:px-6">
      <div className="mx-auto flex h-full max-w-7xl flex-col overflow-hidden rounded-[28px] border border-white/40 bg-[#fcfaf7] shadow-2xl lg:flex-row">
        <div className="flex flex-1 flex-col border-b border-[#dfd7cc] lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-4 border-b border-[#dfd7cc] px-5 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9a7a56]">
                Create Invite
              </p>
              <h2 className="text-2xl font-semibold text-[#2d1810]">Compose your final invitation</h2>
            </div>
            <div className="flex items-center gap-2">
              {onSaveToEvent && (
                <button
                  type="button"
                  onClick={saveInviteToEvent}
                  disabled={isExporting}
                  className="rounded-full border border-[#d7cec2] bg-white px-5 py-2.5 text-sm font-semibold text-[#2d1810] transition hover:bg-[#f5eee5] disabled:cursor-wait disabled:opacity-70"
                >
                  Save to event
                </button>
              )}
              <button
                type="button"
                onClick={exportInvite}
                disabled={isExporting}
                className="rounded-full bg-[#d2b48c] px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-[#c8a979] disabled:cursor-wait disabled:opacity-70"
              >
                {isExporting ? 'Preparing PNG...' : 'Download invite'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-[#d7cec2] px-4 py-2 text-sm font-medium text-[#4f3422] transition hover:bg-[#f2ece3]"
              >
                Close
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto bg-[radial-gradient(circle_at_top,_rgba(210,180,140,0.28),_transparent_55%),linear-gradient(180deg,_#f6f1ea_0%,_#efe6da_100%)] p-4 sm:p-6">
            <div
              ref={previewRef}
              onPointerMove={handlePointerMove}
              onPointerUp={stopDragging}
              onPointerLeave={stopDragging}
              className="relative mx-auto aspect-[3/4] w-full max-w-3xl overflow-hidden rounded-[24px] border border-[#e4dbcf] bg-cover bg-center shadow-[0_24px_80px_rgba(45,24,16,0.18)] touch-none"
              style={{ backgroundImage: `url("${backgroundSrc}")` }}
            >
              <div className="absolute inset-0 bg-white/10" />
              {layers.map((layer) => (
                <div
                  key={layer.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedLayerId(layer.id)}
                  onPointerDown={(event) => startDragging(event, layer.id)}
                  className={`absolute min-w-[120px] max-w-[70%] -translate-x-1/2 -translate-y-1/2 cursor-move rounded-xl px-3 py-2 text-center transition ${
                    selectedLayerId === layer.id
                      ? 'ring-2 ring-[#d2b48c] bg-white/35 shadow-lg backdrop-blur-[2px]'
                      : 'hover:bg-white/20'
                  }`}
                  style={{
                    left: `${layer.x}%`,
                    top: `${layer.y}%`,
                    transform: `translate(-50%, -50%) rotate(${layer.rotation}deg)`,
                    color: layer.color,
                    fontFamily: layer.fontFamily,
                    fontSize: `${layer.fontSize}px`,
                    fontWeight: layer.fontWeight,
                    opacity: layer.opacity,
                    textAlign: layer.align,
                    whiteSpace: 'pre-line',
                    lineHeight: 1.2,
                  }}
                >
                  {layer.text}
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="w-full shrink-0 overflow-auto bg-[#fffaf4] lg:w-[360px]">
          <div className="space-y-6 p-5">
            <div className="rounded-3xl border border-[#ebe1d5] bg-white px-4 py-4 shadow-sm">
              <p className="text-sm font-semibold text-[#4f3422]">Editor workflow</p>
              <p className="mt-2 text-sm leading-6 text-[#6b5b4f]">
                Drag text directly on the invite preview, then fine-tune it here before exporting.
              </p>
            </div>

            <div className="rounded-3xl border border-[#ebe1d5] bg-[#f8f2ea] px-4 py-4 shadow-sm">
              <p className="text-sm font-semibold text-[#4f3422]">Quick guide</p>
              <div className="mt-3 space-y-2 text-sm leading-6 text-[#6b5b4f]">
                <p>1. Select a text layer on the card or from the list.</p>
                <p>2. Drag it into place, then refine font, color, size, and angle.</p>
                <p>3. Export a single PNG once the invite feels finished.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={addCustomLayer}
                className="flex-1 rounded-2xl bg-[#2d1810] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#4a2e1d]"
              >
                Add text box
              </button>
              <button
                type="button"
                onClick={removeSelectedLayer}
                disabled={!selectedLayer}
                className="rounded-2xl border border-[#dbcdbf] px-4 py-3 text-sm font-semibold text-[#6b4730] transition hover:bg-[#f6efe6] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Delete
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-[#4f3422]">Text layers</p>
              <div className="grid gap-2">
                {layers.map((layer) => (
                  <button
                    key={layer.id}
                    type="button"
                    onClick={() => setSelectedLayerId(layer.id)}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                      selectedLayerId === layer.id
                        ? 'border-[#d2b48c] bg-[#f7f0e6]'
                        : 'border-[#eadfd2] bg-white hover:bg-[#fbf6ef]'
                    }`}
                  >
                    <p className="text-sm font-semibold text-[#2d1810]">{layer.label}</p>
                    <p className="mt-1 truncate text-sm text-[#6b5b4f]">{layer.text.replace(/\n/g, ' ')}</p>
                  </button>
                ))}
              </div>
            </div>

            {selectedLayer && (
              <div className="space-y-4 rounded-3xl border border-[#ebe1d5] bg-white p-4 shadow-sm">
                <div>
                  <label htmlFor="layer-text" className="text-sm font-semibold text-[#4f3422]">
                    Copy
                  </label>
                  <textarea
                    id="layer-text"
                    value={selectedLayer.text}
                    onChange={(event) => updateLayer(selectedLayer.id, { text: event.target.value })}
                    className="mt-2 min-h-28 w-full rounded-2xl border border-[#dfd6ca] bg-[#fffdf9] px-4 py-3 text-sm text-[#2d1810] outline-none transition focus:border-[#d2b48c] focus:ring-2 focus:ring-[#d2b48c]/30"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="text-sm text-[#4f3422]">
                    Font
                    <select
                      value={selectedLayer.fontFamily}
                      onChange={(event) =>
                        updateLayer(selectedLayer.id, {
                          fontFamily: event.target.value as FontFamily,
                        })
                      }
                      className="mt-2 w-full rounded-2xl border border-[#dfd6ca] bg-[#fffdf9] px-3 py-2.5 outline-none transition focus:border-[#d2b48c]"
                    >
                      {FONT_OPTIONS.map((font) => (
                        <option key={font} value={font}>
                          {font}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm text-[#4f3422]">
                    Weight
                    <select
                      value={selectedLayer.fontWeight}
                      onChange={(event) =>
                        updateLayer(selectedLayer.id, {
                          fontWeight: Number(event.target.value) as InviteLayer['fontWeight'],
                        })
                      }
                      className="mt-2 w-full rounded-2xl border border-[#dfd6ca] bg-[#fffdf9] px-3 py-2.5 outline-none transition focus:border-[#d2b48c]"
                    >
                      {FONT_WEIGHTS.map((weight) => (
                        <option key={weight} value={weight}>
                          {weight}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="text-sm text-[#4f3422]">
                    Color
                    <input
                      type="color"
                      value={selectedLayer.color}
                      onChange={(event) => updateLayer(selectedLayer.id, { color: event.target.value })}
                      className="mt-2 h-11 w-full rounded-2xl border border-[#dfd6ca] bg-[#fffdf9] p-1"
                    />
                  </label>
                  <label className="text-sm text-[#4f3422]">
                    Align
                    <select
                      value={selectedLayer.align}
                      onChange={(event) =>
                        updateLayer(selectedLayer.id, { align: event.target.value as TextAlign })
                      }
                      className="mt-2 w-full rounded-2xl border border-[#dfd6ca] bg-[#fffdf9] px-3 py-2.5 outline-none transition focus:border-[#d2b48c]"
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </label>
                </div>

                <label className="block text-sm text-[#4f3422]">
                  Font size
                  <input
                    type="range"
                    min="12"
                    max="72"
                    value={selectedLayer.fontSize}
                    onChange={(event) =>
                      updateLayer(selectedLayer.id, { fontSize: Number(event.target.value) })
                    }
                    className="mt-2 w-full accent-[#9a7a56]"
                  />
                  <span className="mt-1 block text-xs text-[#7c6a5c]">{selectedLayer.fontSize}px</span>
                </label>

                <label className="block text-sm text-[#4f3422]">
                  Rotation
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    value={selectedLayer.rotation}
                    onChange={(event) =>
                      updateLayer(selectedLayer.id, { rotation: Number(event.target.value) })
                    }
                    className="mt-2 w-full accent-[#9a7a56]"
                  />
                  <span className="mt-1 block text-xs text-[#7c6a5c]">{selectedLayer.rotation} deg</span>
                </label>

                <label className="block text-sm text-[#4f3422]">
                  Opacity
                  <input
                    type="range"
                    min="0.2"
                    max="1"
                    step="0.05"
                    value={selectedLayer.opacity}
                    onChange={(event) =>
                      updateLayer(selectedLayer.id, { opacity: Number(event.target.value) })
                    }
                    className="mt-2 w-full accent-[#9a7a56]"
                  />
                  <span className="mt-1 block text-xs text-[#7c6a5c]">
                    {Math.round(selectedLayer.opacity * 100)}%
                  </span>
                </label>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
