import base64
import hashlib
import io
import os
import re
from pathlib import Path
from typing import List, Optional, Tuple, Dict, Any

from PIL import Image, ImageOps
import pymupdf as fitz

MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024  # 15 MB
MAX_PDF_PAGES = 20

# MIME Magic Signatures
MAGIC_SIGNATURES = {
    "pdf": [b"%PDF-"],
    "jpeg": [b"\xFF\xD8\xFF"],
    "png": [b"\x89PNG\r\n\x1a\n"],
    "webp": [b"RIFF"],
}

# In-memory document cache (stores recent processed documents for extraction)
DOCUMENT_CACHE: Dict[str, Dict[str, Any]] = {}

def get_document_cache(sha256_hash: str) -> Optional[Dict[str, Any]]:
    return DOCUMENT_CACHE.get(sha256_hash)

def store_document_cache(sha256_hash: str, doc_data: Dict[str, Any]) -> None:
    if len(DOCUMENT_CACHE) >= 50:
        first_key = next(iter(DOCUMENT_CACHE))
        del DOCUMENT_CACHE[first_key]
    DOCUMENT_CACHE[sha256_hash] = doc_data

class DocumentValidationError(Exception):
    def __init__(self, message: str, code: str):
        super().__init__(message)
        self.code = code
        self.message = message


def validate_file_bytes(file_bytes: bytes, filename: str) -> str:
    """
    Validates file size, extension, and true MIME magic byte signatures.
    Returns detected format ('pdf', 'jpeg', 'png', 'webp').
    """
    if not file_bytes or len(file_bytes) == 0:
        raise DocumentValidationError("Uploaded file is empty (0 bytes).", "EMPTY_FILE")

    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise DocumentValidationError(
            f"File exceeds maximum allowed size of 15 MB ({len(file_bytes) / (1024*1024):.2f} MB provided).",
            "FILE_TOO_LARGE"
        )

    # Sanitize filename
    safe_name = os.path.basename(filename)
    if not safe_name or ".." in filename or "/" in filename or "\\" in filename:
        raise DocumentValidationError("Invalid or malicious filename path.", "INVALID_FILENAME")

    # Extension check
    ext = safe_name.lower().split(".")[-1] if "." in safe_name else ""
    if ext not in ("pdf", "jpg", "jpeg", "png", "webp"):
        raise DocumentValidationError(
            f"Unsupported file extension '.{ext}'. Supported formats: PDF, JPG, JPEG, PNG, WEBP.",
            "UNSUPPORTED_FORMAT"
        )

    # Magic signature verification
    detected_format = None
    if file_bytes.startswith(b"%PDF-"):
        detected_format = "pdf"
    elif file_bytes.startswith(b"\xFF\xD8\xFF"):
        detected_format = "jpeg"
    elif file_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        detected_format = "png"
    elif len(file_bytes) >= 12 and file_bytes.startswith(b"RIFF") and file_bytes[8:12] == b"WEBP":
        detected_format = "webp"

    if not detected_format:
        raise DocumentValidationError(
            "File header signature mismatch. File content does not match a valid PDF, JPEG, PNG or WEBP.",
            "SIGNATURE_MISMATCH"
        )

    return detected_format


def compute_sha256(file_bytes: bytes) -> str:
    return hashlib.sha256(file_bytes).hexdigest()


def process_uploaded_document(
    file_bytes: bytes,
    filename: str,
    page_rotations: Optional[Dict[int, int]] = None
) -> Dict[str, Any]:
    """
    Validates, extracts structure, and renders page previews for PDF or image documents.
    """
    fmt = validate_file_bytes(file_bytes, filename)
    sha256_hash = compute_sha256(file_bytes)
    page_rotations = page_rotations or {}

    pages_info: List[Dict[str, Any]] = []

    if fmt == "pdf":
        try:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
        except Exception as exc:
            raise DocumentValidationError(f"Corrupted or invalid PDF structure: {str(exc)}", "CORRUPTED_PDF")

        if doc.is_encrypted:
            raise DocumentValidationError(
                "Password-protected PDF detected. Please provide an unencrypted deed.",
                "PASSWORD_PROTECTED"
            )

        total_pages = len(doc)
        if total_pages == 0:
            raise DocumentValidationError("PDF contains 0 pages.", "EMPTY_PDF")
        if total_pages > MAX_PDF_PAGES:
            raise DocumentValidationError(
                f"PDF page count ({total_pages}) exceeds maximum allowed of {MAX_PDF_PAGES} pages.",
                "PAGE_LIMIT_EXCEEDED"
            )

        for page_num in range(total_pages):
            page = doc[page_num]
            # Apply user requested rotation if specified
            user_rot = page_rotations.get(page_num + 1, 0)
            if user_rot:
                page.set_rotation((page.rotation + user_rot) % 360)

            # Extract existing text layer
            raw_text = page.get_text("text")
            text_content = raw_text.strip() if isinstance(raw_text, str) else str(raw_text).strip()
            
            # Render page thumbnail for preview (150 DPI)
            pix = page.get_pixmap(dpi=150)
            img_bytes = pix.tobytes("jpeg")
            img_b64 = base64.b64encode(img_bytes).decode("ascii")

            pages_info.append({
                "page_number": page_num + 1,
                "width": int(page.rect.width),
                "height": int(page.rect.height),
                "rotation": int(page.rotation),
                "has_text_layer": len(text_content) > 10,
                "raw_text": text_content,
                "preview_image_b64": f"data:image/jpeg;base64,{img_b64}",
            })

        doc.close()

    else:
        # Image processing (JPEG, PNG, WEBP)
        try:
            img = Image.open(io.BytesIO(file_bytes))
            img = ImageOps.exif_transpose(img)  # Auto-rotate based on EXIF
        except Exception as exc:
            raise DocumentValidationError(f"Corrupted or unreadable image: {str(exc)}", "CORRUPTED_IMAGE")

        # Apply rotation if requested for page 1
        user_rot = page_rotations.get(1, 0)
        if user_rot:
            img = img.rotate(-user_rot, expand=True)

        if img.mode not in ("RGB", "L"):
            img = img.convert("RGB")

        # Generate base64 preview
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=85)
        img_b64 = base64.b64encode(buf.getvalue()).decode("ascii")

        pages_info.append({
            "page_number": 1,
            "width": img.width,
            "height": img.height,
            "rotation": user_rot % 360,
            "has_text_layer": False,
            "raw_text": "",
            "preview_image_b64": f"data:image/jpeg;base64,{img_b64}",
        })

    doc_info = {
        "filename": os.path.basename(filename),
        "format": fmt,
        "size_bytes": len(file_bytes),
        "sha256": sha256_hash,
        "page_count": len(pages_info),
        "pages": pages_info,
        "status": "VALIDATED",
    }
    store_document_cache(sha256_hash, doc_info)
    return doc_info
