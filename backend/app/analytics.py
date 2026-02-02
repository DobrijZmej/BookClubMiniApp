import json
import os
import logging
from datetime import datetime
from pathlib import Path
from collections import defaultdict
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

STATS_FILE = Path("backend/data/analytics.json")

def ensure_stats_file():
    STATS_FILE.parent.mkdir(parents=True, exist_ok=True)
    if not STATS_FILE.exists():
        STATS_FILE.write_text(json.dumps({
            "clubs": {},  # {club_id: {name, views, members_count, books_count, last_activity}}
            "books": {},  # {book_id: {title, club_name, views, borrows, reviews, last_activity}}
            "reviews_total": 0,
            "unique_users": [],
            "daily_activity": {},  # {date: {clubs_views, books_views, reviews, joins, app_opens, new_users}}
            "recent_activity": [],  # Last 50 activities
            "first_activity": None,
            "last_activity": None,
            "app_opens": {}  # {user_id: {first_open, last_open, total_opens}}
        }, indent=2))

def load_stats() -> Dict[str, Any]:
    ensure_stats_file()
    try:
        with open(STATS_FILE, 'r', encoding='utf-8') as f:
            stats = json.load(f)
        
        # Міграція структури: додаємо нові поля якщо їх немає
        migrated = False
        
        # Перевіряємо основні ключі
        default_structure = {
            "clubs": {},
            "books": {},
            "reviews_total": 0,
            "unique_users": [],
            "daily_activity": {},
            "recent_activity": [],
            "first_activity": None,
            "last_activity": None,
            "app_opens": {}  # {user_id: {first_open, last_open, total_opens}}
        }
        
        for key, default_value in default_structure.items():
            if key not in stats:
                stats[key] = default_value
                migrated = True
                logger.info(f"Analytics migration: added missing key '{key}'")
        
        # Мігруємо daily_activity: додаємо нові поля в існуючі дати
        required_daily_fields = {
            "clubs_views": 0,
            "books_views": 0,
            "reviews": 0,
            "joins": 0,
            "activity_feed_views": 0,
            "search_count": 0,
            "app_opens": 0,
            "new_users": 0
        }
        
        for date, daily_data in stats.get("daily_activity", {}).items():
            for field, default_val in required_daily_fields.items():
                if field not in daily_data:
                    daily_data[field] = default_val
                    migrated = True
        
        if migrated:
            logger.info("Analytics structure migrated successfully")
            save_stats(stats)
        
        return stats
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse analytics.json: {e}")
        return default_structure
    except Exception as e:
        logger.error(f"Failed to load analytics: {e}")
        return default_structure

def save_stats(stats: Dict[str, Any]):
    ensure_stats_file()
    try:
        with open(STATS_FILE, 'w', encoding='utf-8') as f:
            json.dump(stats, f, indent=2, ensure_ascii=False)
    except Exception as e:
        logger.error(f"Failed to save analytics: {e}")

def track_activity(activity_type: str, user_id: Optional[str] = None,
                   club_id: Optional[int] = None, club_name: Optional[str] = None,
                   club_cover: Optional[str] = None,
                   book_id: Optional[int] = None, book_title: Optional[str] = None,
                   book_cover: Optional[str] = None,
                   members_count: Optional[int] = None, books_count: Optional[int] = None):
    """
    Track business activity instead of raw requests
    
    activity_type: 'club_view', 'book_view', 'review_created', 'member_joined', 'book_borrowed', etc.
    """
    try:
        stats = load_stats()
        
        now = datetime.now().isoformat()
        today = datetime.now().strftime("%Y-%m-%d")
        
        # Track unique users
        if user_id and user_id not in stats["unique_users"]:
            stats["unique_users"].append(user_id)
        
        # Track clubs
        if club_id and club_name:
            club_key = str(club_id)
            if club_key not in stats["clubs"]:
                stats["clubs"][club_key] = {
                    "name": club_name,
                    "cover_url": club_cover,
                    "views": 0,
                    "members_count": members_count or 0,
                    "books_count": books_count or 0,
                    "books": {},
                    "last_activity": now
                }
            
            stats["clubs"][club_key]["name"] = club_name  # Update in case changed
            if club_cover:
                stats["clubs"][club_key]["cover_url"] = club_cover
            stats["clubs"][club_key]["last_activity"] = now
            
            if activity_type == "club_view":
                stats["clubs"][club_key]["views"] += 1
            elif activity_type == "member_joined":
                if members_count is not None:
                    stats["clubs"][club_key]["members_count"] = members_count
            
            # Update counts if provided
            if members_count is not None:
                stats["clubs"][club_key]["members_count"] = members_count
            if books_count is not None:
                stats["clubs"][club_key]["books_count"] = books_count
        
        # Track books
        if book_id and book_title:
            book_key = str(book_id)
            if book_key not in stats["books"]:
                stats["books"][book_key] = {
                    "title": book_title,
                    "cover_url": book_cover,
                    "club_name": club_name or "Unknown",
                    "views": 0,
                    "borrows": 0,
                    "reviews": 0,
                    "last_activity": now
                }
            
            stats["books"][book_key]["title"] = book_title  # Update in case changed
            if book_cover:
                stats["books"][book_key]["cover_url"] = book_cover
            stats["books"][book_key]["last_activity"] = now
            
            # Add book to club's books list
            if club_id:
                club_key = str(club_id)
                if club_key in stats["clubs"]:
                    if "books" not in stats["clubs"][club_key]:
                        stats["clubs"][club_key]["books"] = {}
                    stats["clubs"][club_key]["books"][book_key] = {
                        "title": book_title,
                        "cover_url": book_cover
                    }
            
            if activity_type == "book_view":
                stats["books"][book_key]["views"] += 1
            elif activity_type == "book_borrowed":
                stats["books"][book_key]["borrows"] += 1
            elif activity_type == "review_created":
                stats["books"][book_key]["reviews"] += 1
                stats["reviews_total"] += 1
        
        # Daily activity
        if today not in stats["daily_activity"]:
            stats["daily_activity"][today] = {
                "clubs_views": 0,
                "books_views": 0,
                "reviews": 0,
                "joins": 0,
                "activity_feed_views": 0,
                "search_count": 0,
                "app_opens": 0,
                "new_users": 0
            }
        
        if activity_type == "club_view":
            stats["daily_activity"][today]["clubs_views"] += 1
        elif activity_type == "book_view":
            stats["daily_activity"][today]["books_views"] += 1
        elif activity_type == "review_created":
            stats["daily_activity"][today]["reviews"] += 1
        elif activity_type == "member_joined":
            stats["daily_activity"][today]["joins"] += 1
        elif activity_type == "activity_feed_view":
            stats["daily_activity"][today]["activity_feed_views"] += 1
        elif activity_type == "search_used":
            stats["daily_activity"][today]["search_count"] += 1
        elif activity_type == "app_opened":
            stats["daily_activity"][today]["app_opens"] += 1
            
            # Track per-user app opens
            if user_id:
                if "app_opens" not in stats:
                    stats["app_opens"] = {}
                
                if user_id not in stats["app_opens"]:
                    stats["app_opens"][user_id] = {
                        "first_open": now,
                        "last_open": now,
                        "total_opens": 1
                    }
                    stats["daily_activity"][today]["new_users"] += 1
                else:
                    stats["app_opens"][user_id]["last_open"] = now
                    stats["app_opens"][user_id]["total_opens"] += 1
        
        # Recent activity log (keep last 50)
        activity_entry = {
            "timestamp": now,
            "type": activity_type,
            "user_id": user_id
        }
        if club_name:
            activity_entry["club"] = club_name
        if book_title:
            activity_entry["book"] = book_title
        
        stats["recent_activity"].insert(0, activity_entry)
        stats["recent_activity"] = stats["recent_activity"][:50]
        
        # Timestamps
        if not stats["first_activity"]:
            stats["first_activity"] = now
        stats["last_activity"] = now
        
        save_stats(stats)
        
    except Exception as e:
        logger.error(f"Failed to track activity '{activity_type}': {e}")

def get_stats() -> Dict[str, Any]:
    return load_stats()
