import json
import os
from datetime import datetime
from pathlib import Path
from collections import defaultdict
from typing import Dict, Any

STATS_FILE = Path("backend/data/analytics.json")

def ensure_stats_file():
    STATS_FILE.parent.mkdir(parents=True, exist_ok=True)
    if not STATS_FILE.exists():
        STATS_FILE.write_text(json.dumps({
            "endpoints": {},
            "methods": {},
            "status_codes": {},
            "daily": {},
            "unique_users": [],
            "recent_requests": [],
            "total_requests": 0,
            "first_request": None,
            "last_request": None
        }, indent=2))

def load_stats() -> Dict[str, Any]:
    ensure_stats_file()
    try:
        with open(STATS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return {
            "endpoints": {},
            "methods": {},
            "status_codes": {},
            "daily": {},
            "unique_users": [],
            "recent_requests": [],
            "total_requests": 0,
            "first_request": None,
            "last_request": None
        }

def save_stats(stats: Dict[str, Any]):
    ensure_stats_file()
    with open(STATS_FILE, 'w', encoding='utf-8') as f:
        json.dump(stats, f, indent=2, ensure_ascii=False)

def track_request(path: str, method: str, status_code: int, user_id: str = None, 
                  club_name: str = None, book_title: str = None):
    stats = load_stats()
    
    now = datetime.now().isoformat()
    today = datetime.now().strftime("%Y-%m-%d")
    
    # Update counters
    stats["total_requests"] += 1
    
    # Enhanced endpoint tracking with resource names
    if path not in stats["endpoints"]:
        stats["endpoints"][path] = {
            "count": 0,
            "resources": {}  # {"club_name": count} or {"book_title": count}
        }
    
    # Handle both old format (int) and new format (dict)
    if isinstance(stats["endpoints"][path], int):
        stats["endpoints"][path] = {
            "count": stats["endpoints"][path],
            "resources": {}
        }
    
    stats["endpoints"][path]["count"] += 1
    
    # Track resource names
    if club_name:
        if club_name not in stats["endpoints"][path]["resources"]:
            stats["endpoints"][path]["resources"][club_name] = 0
        stats["endpoints"][path]["resources"][club_name] += 1
    elif book_title:
        if book_title not in stats["endpoints"][path]["resources"]:
            stats["endpoints"][path]["resources"][book_title] = 0
        stats["endpoints"][path]["resources"][book_title] += 1
    
    stats["methods"][method] = stats["methods"].get(method, 0) + 1
    stats["status_codes"][str(status_code)] = stats["status_codes"].get(str(status_code), 0) + 1
    
    # Track unique users (only if provided and valid)
    if user_id and user_id not in stats["unique_users"]:
        stats["unique_users"].append(user_id)
    
    # Daily stats
    if today not in stats["daily"]:
        stats["daily"][today] = 0
    stats["daily"][today] += 1
    
    # Recent requests log (keep last 50)
    request_entry = {
        "timestamp": now,
        "path": path,
        "method": method,
        "status": status_code,
        "user_id": user_id
    }
    if club_name:
        request_entry["club_name"] = club_name
    if book_title:
        request_entry["book_title"] = book_title
    
    stats["recent_requests"].insert(0, request_entry)
    stats["recent_requests"] = stats["recent_requests"][:50]  # Keep only last 50
    
    # Timestamps
    if not stats["first_request"]:
        stats["first_request"] = now
    stats["last_request"] = now
    
    save_stats(stats)

def get_stats() -> Dict[str, Any]:
    return load_stats()
