"""
File Storage Module for Local File System
Handles image uploads with validation, resize, and security checks
"""

import os
import uuid
from pathlib import Path
from typing import Optional, Tuple
from fastapi import UploadFile, HTTPException
from PIL import Image
import io
from loguru import logger

# Configuration
BASE_DIR = Path(__file__).resolve().parent.parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
CLUB_AVATARS_DIR = UPLOAD_DIR / "clubs"
BOOK_COVERS_DIR = UPLOAD_DIR / "books"

# Limits
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
MAX_IMAGE_SIZE = (300, 300)  # 300x300 pixels
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
ALLOWED_MIME_TYPES = {
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
}

# Create directories on import
CLUB_AVATARS_DIR.mkdir(parents=True, exist_ok=True)
BOOK_COVERS_DIR.mkdir(parents=True, exist_ok=True)


def validate_image_file(file: UploadFile) -> None:
    """
    Validate uploaded file is a safe image
    
    Args:
        file: FastAPI UploadFile object
        
    Raises:
        HTTPException: If validation fails
    """
    # Check content type
    if file.content_type not in ALLOWED_MIME_TYPES:
        logger.warning(f"Invalid content type: {file.content_type}")
        raise HTTPException(
            status_code=400,
            detail=f"Непідтримуваний тип файлу. Дозволені: JPEG, PNG, GIF, WebP"
        )
    
    # Check file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        logger.warning(f"Invalid extension: {file_ext}")
        raise HTTPException(
            status_code=400,
            detail=f"Непідтримуване розширення файлу: {file_ext}"
        )
    
    # Check file size
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()
    file.file.seek(0)  # Reset to beginning
    
    if file_size > MAX_FILE_SIZE:
        logger.warning(f"File too large: {file_size} bytes")
        raise HTTPException(
            status_code=400,
            detail=f"Файл занадто великий. Максимум {MAX_FILE_SIZE // (1024*1024)}MB"
        )
    
    if file_size == 0:
        logger.warning("Empty file uploaded")
        raise HTTPException(
            status_code=400,
            detail="Файл порожній"
        )


def validate_image_content(image_data: bytes) -> Image.Image:
    """
    Validate image content using PIL
    This ensures the file is actually an image and not a malicious script
    
    Args:
        image_data: Raw image bytes
        
    Returns:
        PIL Image object
        
    Raises:
        HTTPException: If image is invalid
    """
    try:
        img = Image.open(io.BytesIO(image_data))
        img.verify()  # Verify it's actually an image
        
        # Reopen after verify (verify closes the file)
        img = Image.open(io.BytesIO(image_data))
        
        # Convert RGBA to RGB if needed
        if img.mode in ('RGBA', 'LA', 'P'):
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
            img = background
        
        return img
    except Exception as e:
        logger.error(f"Invalid image content: {e}")
        raise HTTPException(
            status_code=400,
            detail="Файл не є дійсним зображенням"
        )


def resize_image(img: Image.Image, max_size: Tuple[int, int] = MAX_IMAGE_SIZE) -> Image.Image:
    """
    Resize image to fit within max_size while maintaining aspect ratio
    
    Args:
        img: PIL Image object
        max_size: Maximum dimensions (width, height)
        
    Returns:
        Resized PIL Image object
    """
    # Calculate new size maintaining aspect ratio
    img.thumbnail(max_size, Image.Resampling.LANCZOS)
    
    logger.info(f"Image resized to {img.size}")
    return img


def optimize_image(img: Image.Image, quality: int = 85) -> bytes:
    """
    Optimize image for web delivery
    
    Args:
        img: PIL Image object
        quality: JPEG quality (1-100)
        
    Returns:
        Optimized image bytes
    """
    output = io.BytesIO()
    
    # Save as JPEG with optimization
    img.save(
        output,
        format='JPEG',
        quality=quality,
        optimize=True,
        progressive=True
    )
    
    output.seek(0)
    return output.read()


def save_club_avatar(club_id: int, file: UploadFile) -> str:
    """
    Save club avatar image
    
    Args:
        club_id: Club ID
        file: Uploaded file
        
    Returns:
        Relative URL path to saved image
        
    Raises:
        HTTPException: If validation or saving fails
    """
    # Validate file metadata
    validate_image_file(file)
    
    # Read file content
    file_content = file.file.read()
    
    # Validate image content and load
    img = validate_image_content(file_content)
    
    # Resize to max dimensions
    img = resize_image(img, MAX_IMAGE_SIZE)
    
    # Optimize
    optimized_data = optimize_image(img)
    
    # Generate unique filename
    filename = f"{club_id}_avatar_{uuid.uuid4().hex[:8]}.jpg"
    filepath = CLUB_AVATARS_DIR / filename
    
    # Delete old avatar if exists
    delete_old_files(CLUB_AVATARS_DIR, f"{club_id}_avatar_*.jpg")
    
    # Save file
    try:
        with open(filepath, 'wb') as f:
            f.write(optimized_data)
        
        logger.success(f"✅ Club avatar saved: {filepath}")
        
        # Return relative URL
        return f"/uploads/clubs/{filename}"
    except Exception as e:
        logger.error(f"Failed to save file: {e}")
        raise HTTPException(
            status_code=500,
            detail="Помилка збереження файлу"
        )


def save_book_cover(book_id: int, file: UploadFile) -> str:
    """
    Save book cover image
    
    Args:
        book_id: Book ID
        file: Uploaded file
        
    Returns:
        Relative URL path to saved image
    """
    # Validate file metadata
    validate_image_file(file)
    
    # Read file content
    file_content = file.file.read()
    
    # Validate image content and load
    img = validate_image_content(file_content)
    
    # Resize to max dimensions
    img = resize_image(img, MAX_IMAGE_SIZE)
    
    # Optimize
    optimized_data = optimize_image(img)
    
    # Generate unique filename
    filename = f"{book_id}_cover_{uuid.uuid4().hex[:8]}.jpg"
    filepath = BOOK_COVERS_DIR / filename
    
    # Delete old cover if exists
    delete_old_files(BOOK_COVERS_DIR, f"{book_id}_cover_*.jpg")
    
    # Save file
    try:
        with open(filepath, 'wb') as f:
            f.write(optimized_data)
        
        logger.success(f"✅ Book cover saved: {filepath}")
        
        # Return relative URL
        return f"/uploads/books/{filename}"
    except Exception as e:
        logger.error(f"Failed to save file: {e}")
        raise HTTPException(
            status_code=500,
            detail="Помилка збереження файлу"
        )


def delete_old_files(directory: Path, pattern: str) -> None:
    """
    Delete old files matching pattern
    
    Args:
        directory: Directory to search
        pattern: Glob pattern to match
    """
    try:
        for old_file in directory.glob(pattern):
            old_file.unlink()
            logger.info(f"Deleted old file: {old_file}")
    except Exception as e:
        logger.warning(f"Failed to delete old files: {e}")


def delete_file(file_url: str) -> None:
    """
    Delete file by its URL path
    
    Args:
        file_url: Relative URL path (e.g., /uploads/clubs/1_avatar_abc123.jpg)
    """
    if not file_url:
        return
    
    try:
        # Convert URL to file path
        # Remove leading slash and convert to Path
        relative_path = file_url.lstrip('/')
        filepath = BASE_DIR / relative_path
        
        if filepath.exists() and filepath.is_file():
            filepath.unlink()
            logger.info(f"Deleted file: {filepath}")
    except Exception as e:
        logger.warning(f"Failed to delete file {file_url}: {e}")
