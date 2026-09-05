"use client";

import Cropper, { type Area, type Point } from "react-easy-crop";
import { Camera, ImagePlus, Minus, Plus, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { saveAvatarAction, removeAvatarAction, type AccountFormState } from "@/lib/actions/account";
import { StudentAvatar } from "@/components/student/student-avatar";
import {
  AVATAR_MAX_BYTES,
  AVATAR_OUTPUT_SIZE,
  webpDimensions,
} from "@/lib/avatar/rules";

const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
const MAX_SOURCE_PIXELS = 24_000_000;
const MAX_SOURCE_EDGE = 10_000;
const HEADER_BYTES = 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type ImageDimensions = { width: number; height: number };

function jpegDimensions(bytes: Uint8Array): ImageDimensions | null {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  const frameMarkers = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7,
    0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
  ]);
  let offset = 2;
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset];
    if (marker === 0xd9 || marker === 0xda) return null;
    if (offset + 2 >= bytes.length) return null;
    const segmentLength = (bytes[offset + 1] << 8) | bytes[offset + 2];
    if (segmentLength < 2 || offset + 1 + segmentLength > bytes.length) return null;
    if (frameMarkers.has(marker)) {
      return {
        height: (bytes[offset + 4] << 8) | bytes[offset + 5],
        width: (bytes[offset + 6] << 8) | bytes[offset + 7],
      };
    }
    offset += 1 + segmentLength;
  }
  return null;
}

function pngDimensions(bytes: Uint8Array): ImageDimensions | null {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length < 24 || signature.some((value, index) => bytes[index] !== value)) {
    return null;
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

async function sourceImageDimensions(file: File): Promise<ImageDimensions | null> {
  const bytes = new Uint8Array(
    await file.slice(0, Math.min(file.size, HEADER_BYTES)).arrayBuffer(),
  );
  if (file.type === "image/jpeg") return jpegDimensions(bytes);
  if (file.type === "image/png") return pngDimensions(bytes);
  return webpDimensions(bytes);
}

function dataUrlByteLength(dataUrl: string): number {
  const encoded = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const padding = encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0;
  return Math.floor((encoded.length * 3) / 4) - padding;
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Không thể đọc ảnh đã chọn."));
    image.src = url;
  });
}

async function croppedWebp(imageUrl: string, crop: Area): Promise<string> {
  const image = await loadImage(imageUrl);
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_OUTPUT_SIZE;
  canvas.height = AVATAR_OUTPUT_SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Trình duyệt không thể xử lý ảnh này.");

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    AVATAR_OUTPUT_SIZE,
    AVATAR_OUTPUT_SIZE,
  );

  // Giam dan chat luong thay vi thu dung hai moc. Anh nhieu chi tiet van phai
  // nam duoi gioi han server, con anh thong thuong dung ngay moc dep nhat.
  for (const quality of [0.84, 0.76, 0.68, 0.6, 0.52]) {
    const result = canvas.toDataURL("image/webp", quality);
    if (!result.startsWith("data:image/webp;base64,")) {
      throw new Error("Trình duyệt này chưa hỗ trợ xuất ảnh WebP.");
    }
    if (dataUrlByteLength(result) <= AVATAR_MAX_BYTES) return result;
  }
  throw new Error("Ảnh có quá nhiều chi tiết để nén. Hãy chọn ảnh khác.");
}

export function AvatarUploader({
  src,
  googleAvatarSrc,
  name,
  email,
}: {
  src: string | null;
  googleAvatarSrc: string | null;
  name: string;
  email: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [cropPixels, setCropPixels] = useState<Area | null>(null);
  const [localError, setLocalError] = useState("");
  const [state, setState] = useState<AccountFormState>();
  const [processing, startProcessing] = useTransition();
  const pending = processing;

  useEffect(() => () => {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
  }, [photoUrl]);

  function openDialog() {
    setLocalError("");
    setState(undefined);
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    if (pending) return;
    dialogRef.current?.close();
  }

  function chooseFile(file: File | undefined) {
    if (!file) return;
    setLocalError("");
    setState(undefined);
    if (!ACCEPTED_TYPES.has(file.type)) {
      setLocalError("Chỉ nhận ảnh JPG, PNG hoặc WebP.");
      return;
    }
    if (file.size > MAX_SOURCE_BYTES) {
      setLocalError("Ảnh gốc không được vượt quá 10 MB.");
      return;
    }

    startProcessing(async () => {
      try {
        const dimensions = await sourceImageDimensions(file);
        if (!dimensions || dimensions.width < 1 || dimensions.height < 1) {
          setLocalError("Không đọc được kích thước ảnh. Hãy chọn ảnh JPG, PNG hoặc WebP khác.");
          return;
        }
        if (
          dimensions.width > MAX_SOURCE_EDGE ||
          dimensions.height > MAX_SOURCE_EDGE ||
          dimensions.width * dimensions.height > MAX_SOURCE_PIXELS
        ) {
          setLocalError("Ảnh có độ phân giải quá lớn. Hãy chọn ảnh dưới 24 megapixel.");
          return;
        }

        setPhotoUrl(URL.createObjectURL(file));
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setCropPixels(null);
      } catch {
        setLocalError("Không thể đọc ảnh đã chọn.");
      }
    });
  }

  function save() {
    if (!photoUrl || !cropPixels) {
      setLocalError("Hãy chọn và căn ảnh trước khi lưu.");
      return;
    }

    setLocalError("");
    startProcessing(async () => {
      try {
        const avatarData = await croppedWebp(photoUrl, cropPixels);
        const formData = new FormData();
        formData.set("avatarData", avatarData);
        const result = await saveAvatarAction(undefined, formData);
        setState(result);
        if (result?.success) {
          setPhotoUrl("");
          setCropPixels(null);
          dialogRef.current?.close();
        }
      } catch (error) {
        setLocalError(error instanceof Error ? error.message : "Không thể xử lý ảnh này.");
      }
    });
  }

  return (
    <div className="flex flex-col items-center text-center">
      <button
        type="button"
        onClick={openDialog}
        className="motion-press group relative rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stoic-primary focus-visible:ring-offset-4"
        aria-label="Đổi ảnh đại diện"
      >
        <StudentAvatar src={src} name={name} email={email} size="xl" />
        <span className="absolute bottom-1 right-1 grid size-10 place-items-center rounded-full border-2 border-paper bg-navy text-paper shadow-md transition-colors group-hover:bg-stoic-primary" aria-hidden="true">
          <Camera className="size-4" />
        </span>
      </button>
      {state?.success ? (
        <p role="status" className="mt-1 font-ui text-xs text-success">
          {state.success}
        </p>
      ) : null}
      <button
        type="button"
        onClick={openDialog}
        className="motion-press mt-4 min-h-11 font-ui text-xs font-semibold uppercase tracking-[0.1em] text-stoic-primary-deep underline decoration-stoic-primary/35 underline-offset-4 hover:decoration-stoic-primary"
      >
        Đổi ảnh đại diện
      </button>

      <dialog
        ref={dialogRef}
        className="motion-dialog avatar-crop-dialog text-left text-ink"
        aria-labelledby="avatar-dialog-title"
        aria-describedby="avatar-dialog-description"
        onCancel={(event) => {
          if (pending) event.preventDefault();
        }}
      >
        <div className="avatar-crop-dialog__surface border border-line bg-paper shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
          <div>
            <p className="label-caps">HỒ SƠ · ẢNH ĐẠI DIỆN</p>
            <h2 id="avatar-dialog-title" className="mt-2 font-display text-xl font-bold text-navy-deep">
              Chọn vùng ảnh muốn hiển thị
            </h2>
            <p id="avatar-dialog-description" className="mt-1 font-ui text-xs leading-relaxed text-muted">
              Ảnh vuông, tối đa 10 MB. Bạn có thể kéo ảnh và chỉnh độ phóng.
            </p>
          </div>
          <button
            type="button"
            onClick={closeDialog}
            disabled={pending}
            className="motion-press grid size-11 shrink-0 place-items-center border border-line text-muted hover:border-navy hover:text-navy disabled:opacity-50"
            aria-label="Đóng"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </header>

        <div className="space-y-4 px-5 py-5 sm:px-6">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={pending}
            className="hidden"
            onChange={(event) => {
              chooseFile(event.target.files?.[0]);
              event.currentTarget.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={pending}
            className="world-action motion-press inline-flex min-h-11 w-full items-center justify-center gap-2 border border-line-strong bg-canvas px-4 font-ui text-sm font-semibold text-navy-deep hover:border-stoic-primary disabled:opacity-50"
          >
            <ImagePlus className="size-4" aria-hidden="true" />
            {photoUrl ? "Chọn ảnh khác" : "Chọn ảnh từ thiết bị"}
          </button>

          {photoUrl ? (
            <>
              <p id="avatar-crop-help" className="font-ui text-xs leading-relaxed text-muted">
                Kéo ảnh hoặc dùng các phím mũi tên để đặt khuôn mặt vào giữa khung tròn.
              </p>
              <div className="relative aspect-square w-full overflow-hidden bg-navy-deep">
                <Cropper
                  image={photoUrl}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={(_, area) => setCropPixels(area)}
                  cropperProps={{
                    "aria-label": "Căn vị trí ảnh đại diện",
                    "aria-describedby": "avatar-crop-help",
                  }}
                  classes={{ containerClassName: pending ? "pointer-events-none opacity-70" : "" }}
                />
              </div>
              <div>
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="avatar-zoom" className="font-ui text-xs font-semibold text-navy-deep">
                    Độ phóng
                  </label>
                  <output htmlFor="avatar-zoom" className="font-ui text-xs tabular-nums text-muted">
                    {Math.round(zoom * 100)}%
                  </output>
                </div>
                <div className="mt-1 flex items-center gap-3">
                  <Minus className="size-4 text-muted" aria-hidden="true" />
                  <input
                    id="avatar-zoom"
                    type="range"
                    min={1}
                    max={3}
                    step={0.05}
                    value={zoom}
                    onChange={(event) => setZoom(Number(event.target.value))}
                    disabled={pending}
                    className="h-11 min-w-0 flex-1 accent-[var(--color-stoic-primary)]"
                  />
                  <Plus className="size-4 text-muted" aria-hidden="true" />
                </div>
              </div>
            </>
          ) : (
            <div className="grid min-h-56 place-items-center border border-dashed border-line bg-canvas px-6 text-center">
              <p className="max-w-xs font-ui text-sm leading-relaxed text-muted">
                Chọn một ảnh rõ khuôn mặt. Công cụ căn ảnh sẽ xuất hiện tại đây.
              </p>
            </div>
          )}

          {(localError || state?.error) ? (
            <p role="alert" className="font-ui text-sm text-vermilion-ink">
              {localError || state?.error}
            </p>
          ) : null}
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-line bg-canvas px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={closeDialog}
            disabled={pending}
            className="world-action motion-press min-h-11 border border-line-strong bg-paper px-5 font-ui text-sm font-semibold text-navy-deep hover:border-navy disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={save}
            disabled={pending || !photoUrl}
            className="world-action motion-press min-h-11 bg-navy px-5 font-ui text-sm font-semibold text-paper hover:bg-navy-deep disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Đang lưu…" : "Lưu ảnh"}
          </button>
        </footer>
        </div>
      </dialog>

      {src && src !== googleAvatarSrc ? (
        <form action={removeAvatarAction} className="mt-1">
          <button
            type="submit"
            className="motion-press inline-flex min-h-11 items-center gap-1.5 font-ui text-xs text-muted hover:text-vermilion-ink"
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
            Dùng lại ảnh mặc định
          </button>
        </form>
      ) : null}
    </div>
  );
}
