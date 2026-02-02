"""
Google Books API Integration Service
Provides book search functionality with caching and scoring
"""
import os
import re
import json
import requests
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from loguru import logger

from app.models.db_models import GoogleBooksCache


class GoogleBooksService:
    """Service for searching books via Google Books API"""
    
    API_BASE_URL = "https://www.googleapis.com/books/v1/volumes"
    CACHE_TTL_DAYS = 30
    CONFIDENCE_THRESHOLD = 0.80
    
    def __init__(self, db: Session):
        self.db = db
        self.api_key = os.getenv('GOOGLE_BOOKS_API_KEY', '').strip()
        
        if self.api_key:
            logger.info(f"✅ Google Books API key configured: {self.api_key[:10]}...")
        else:
            logger.warning("⚠️ GOOGLE_BOOKS_API_KEY not set in .env - rate limits will be strict (1000 req/day)")
        
    def normalize_string(self, s: str) -> str:
        """Normalize string for comparison: lowercase, remove extra spaces, trim"""
        if not s:
            return ""
        # Remove extra spaces and convert to lowercase
        normalized = re.sub(r'\s+', ' ', s.lower().strip())
        return normalized
    
    def calculate_confidence_score(
        self, 
        query_title: str, 
        query_author: Optional[str],
        result_title: str,
        result_authors: List[str],
        result_language: Optional[str],
        has_isbn: bool
    ) -> Tuple[float, str]:
        """
        Calculate confidence score for a search result
        Returns: (score, reason)
        """
        score = 0.0
        reasons = []
        
        # Title match (40% weight)
        query_title_norm = self.normalize_string(query_title)
        result_title_norm = self.normalize_string(result_title)
        
        if query_title_norm == result_title_norm:
            score += 0.40
            reasons.append("exact title match")
        elif query_title_norm in result_title_norm or result_title_norm in query_title_norm:
            score += 0.30
            reasons.append("partial title match")
        elif any(word in result_title_norm for word in query_title_norm.split() if len(word) > 3):
            score += 0.20
            reasons.append("title keywords match")
        else:
            reasons.append("title mismatch")
        
        # Author match (30% weight) - only if author was provided
        if query_author and query_author.strip():
            query_author_norm = self.normalize_string(query_author)
            result_authors_norm = [self.normalize_string(a) for a in result_authors]
            
            if any(query_author_norm == ra for ra in result_authors_norm):
                score += 0.30
                reasons.append("exact author match")
            elif any(query_author_norm in ra or ra in query_author_norm for ra in result_authors_norm):
                score += 0.20
                reasons.append("partial author match")
            else:
                reasons.append("author mismatch")
        else:
            # No author provided - don't penalize, but don't add points either
            score += 0.15  # Small bonus for having author data
            reasons.append("no author to compare")
        
        # Language bonus (15% weight)
        if result_language and result_language.lower() in ['uk', 'ua', 'ukr']:
            score += 0.15
            reasons.append("Ukrainian language")
        elif result_language and result_language.lower() in ['ru', 'rus']:
            score += 0.10
            reasons.append("Russian language")
        elif result_language:
            score += 0.05
            reasons.append(f"language: {result_language}")
        
        # ISBN bonus (15% weight)
        if has_isbn:
            score += 0.15
            reasons.append("has ISBN")
        
        # Penalty for collection/bundle keywords
        collection_keywords = ['комплект', 'набір', 'збірка', 'коллекция', 'collection', 'bundle', 'set of']
        if any(keyword in result_title_norm for keyword in collection_keywords):
            score *= 0.6  # 40% penalty
            reasons.append("collection penalty")
        
        return round(score, 2), "; ".join(reasons)
    
    def check_cache(self, title: str, author: Optional[str] = None) -> Optional[Dict]:
        """Check if we have cached results for this search"""
        title_norm = self.normalize_string(title)
        author_norm = self.normalize_string(author) if author else None
        
        # Look for cached entry
        query = self.db.query(GoogleBooksCache).filter(
            GoogleBooksCache.title_norm == title_norm
        )
        
        if author_norm:
            query = query.filter(GoogleBooksCache.author_norm == author_norm)
        
        cached = query.first()
        
        if cached:
            # Check if cache is still valid
            expiry_date = cached.fetched_at + timedelta(days=cached.ttl_days)
            if datetime.now() < expiry_date:
                logger.info(f"✅ Cache HIT for '{title}' by '{author}'")
                return json.loads(cached.payload_json)
            else:
                # Cache expired - delete it
                logger.info(f"🕐 Cache EXPIRED for '{title}' by '{author}'")
                self.db.delete(cached)
                self.db.commit()
        
        logger.info(f"❌ Cache MISS for '{title}' by '{author}'")
        return None
    
    def save_to_cache(self, title: str, author: Optional[str], google_volume_id: str, payload: Dict):
        """Save search result to cache"""
        title_norm = self.normalize_string(title)
        author_norm = self.normalize_string(author) if author else None
        
        try:
            # Check if entry already exists
            existing = self.db.query(GoogleBooksCache).filter(
                GoogleBooksCache.google_volume_id == google_volume_id
            ).first()
            
            if existing:
                # Update existing
                existing.title_norm = title_norm
                existing.author_norm = author_norm
                existing.payload_json = json.dumps(payload, ensure_ascii=False)
                existing.fetched_at = datetime.now()
            else:
                # Create new
                cache_entry = GoogleBooksCache(
                    google_volume_id=google_volume_id,
                    title_norm=title_norm,
                    author_norm=author_norm,
                    payload_json=json.dumps(payload, ensure_ascii=False),
                    ttl_days=self.CACHE_TTL_DAYS
                )
                self.db.add(cache_entry)
            
            self.db.commit()
            logger.info(f"💾 Cached result for '{title}' (volume_id: {google_volume_id})")
        except Exception as e:
            logger.error(f"Failed to cache result: {e}")
            self.db.rollback()
    
    def search_google_books(
        self, 
        title: str, 
        author: Optional[str] = None,
        max_results: int = 10
    ) -> Optional[Dict[str, Any]]:
        """
        Search Google Books API
        Returns: {
            'bestMatch': {...},
            'candidates': [...],
            'source': 'google_books'
        }
        """
        if not title or len(title.strip()) < 3:
            return None
        
        # Check cache first
        cached_result = self.check_cache(title, author)
        if cached_result:
            return cached_result
        
        # Build query
        query_parts = [f'intitle:{title}']
        if author and len(author.strip()) >= 3:
            query_parts.append(f'inauthor:{author}')
        
        query = ' '.join(query_parts)
        
        params = {
            'q': query,
            'printType': 'books',
            'orderBy': 'relevance',
            'maxResults': max_results,
            'langRestrict': 'uk'  # Prefer Ukrainian, but not guaranteed
        }
        
        if self.api_key:
            params['key'] = self.api_key
            logger.debug(f"Using API key: {self.api_key[:10]}...")
        else:
            logger.warning("⚠️ No API key provided - rate limits will be strict")
        
        # Add headers
        headers = {
            'User-Agent': 'BookClubMiniApp/1.0 (Telegram Mini App)',
            'Accept': 'application/json'
        }
        
        try:
            logger.info(f"🔍 Searching Google Books: {query}")
            response = requests.get(self.API_BASE_URL, params=params, headers=headers, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            if not data.get('items'):
                logger.warning(f"No results found for '{title}' by '{author}'")
                return None
            
            # Process results
            candidates = []
            for item in data['items'][:max_results]:
                volume_info = item.get('volumeInfo', {})
                
                # Extract data
                result_title = volume_info.get('title', '')
                result_authors = volume_info.get('authors', [])
                result_description = volume_info.get('description', '')
                result_language = volume_info.get('language', '')
                
                # Image links
                image_links = volume_info.get('imageLinks', {})
                thumbnail = image_links.get('thumbnail', '')
                small_thumbnail = image_links.get('smallThumbnail', '')
                
                # ISBN
                identifiers = volume_info.get('industryIdentifiers', [])
                isbn_10 = None
                isbn_13 = None
                for ident in identifiers:
                    if ident.get('type') == 'ISBN_10':
                        isbn_10 = ident.get('identifier')
                    elif ident.get('type') == 'ISBN_13':
                        isbn_13 = ident.get('identifier')
                
                has_isbn = bool(isbn_10 or isbn_13)
                
                # Calculate confidence score
                confidence_score, confidence_reason = self.calculate_confidence_score(
                    query_title=title,
                    query_author=author,
                    result_title=result_title,
                    result_authors=result_authors,
                    result_language=result_language,
                    has_isbn=has_isbn
                )
                
                candidate = {
                    'google_volume_id': item.get('id'),
                    'title': result_title,
                    'authors': result_authors,
                    'description': result_description,
                    'language': result_language,
                    'image': {
                        'thumbnail': thumbnail,
                        'smallThumbnail': small_thumbnail
                    },
                    'industryIdentifiers': identifiers,
                    'isbn_10': isbn_10,
                    'isbn_13': isbn_13,
                    'publishedDate': volume_info.get('publishedDate'),
                    'confidence_score': confidence_score,
                    'confidence_reason': confidence_reason
                }
                
                candidates.append(candidate)
            
            # Sort by confidence score
            candidates.sort(key=lambda x: x['confidence_score'], reverse=True)
            
            if not candidates:
                return None
            
            # Best match is the first one
            best_match = candidates[0]
            
            # Prepare result
            result = {
                'bestMatch': best_match,
                'candidates': candidates[:5],  # Return top 5
                'source': 'google_books'
            }
            
            # Cache the best match
            if best_match.get('google_volume_id'):
                self.save_to_cache(title, author, best_match['google_volume_id'], result)
            
            logger.success(
                f"✅ Found {len(candidates)} results. "
                f"Best match: '{best_match['title']}' "
                f"(confidence: {best_match['confidence_score']})"
            )
            
            return result
            
        except requests.HTTPError as e:
            if e.response.status_code == 429:
                logger.error(f"❌ Google Books API rate limit exceeded (429). Please add GOOGLE_BOOKS_API_KEY to .env")
                # Check if API key is configured
                if not self.api_key:
                    logger.error("💡 Hint: Get API key from https://console.cloud.google.com/ → Books API")
            else:
                logger.error(f"Google Books API HTTP error: {e.response.status_code} - {e}")
            return None
        except requests.RequestException as e:
            logger.error(f"Google Books API request error: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error in Google Books search: {e}")
            return None
