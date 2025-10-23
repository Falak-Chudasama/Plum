from pydantic import BaseModel
from typing import List, Optional, Dict

class EmbedItem(BaseModel):
    content: str
    meta: Optional[Dict] = None

class EmbedRequest(BaseModel):
    items: List[EmbedItem]

class SearchRequest(BaseModel):
    query: str
    k: int = 5

class DeleteRequest(BaseModel):
    ids: List[str]