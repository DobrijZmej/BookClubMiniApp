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
            "total_requests": 0,
            "first_request": None,
            "last_request": None
        }

def save_stats(stats: Dict[str, Any]):
    ensure_stats_file()
    with open(STATS_FILE, 'w', encoding='utf-8') as f:
        json.dump(stats, f, indent=2, ensure_ascii=False)

def track_request(path: str, method: str, status_code: int, user_id: str = None):
    stats = load_stats()
    
    now = datetime.now().isoformat()
    today = datetime.now().strftime("%Y-%m-%d")
    
    # Update counters
    stats["total_requests"] += 1
    stats["endpoints"][path] = stats["endpoints"].get(path, 0) + 1
    stats["methods"][method] = stats["methods"].get(method, 0) + 1
    stats["status_codes"][str(status_code)] = stats["status_codes"].get(str(status_code), 0) + 1
    
    # Track unique users (only if provided and valid)
    if user_id and user_id not in stats["unique_users"]:
        stats["unique_users"].append(user_id)
    
    # Daily stats
    if today not in stats["daily"]:
        stats["daily"][today] = 0
    stats["daily"][today] += 1
    
    # Timestamps
    if not stats["first_request"]:
        stats["first_request"] = now
    stats["last_request"] = now
    
    save_stats(stats)

def get_stats() -> Dict[str, Any]:
    return load_stats()
