# app.py
import os
import logging
from typing import List, Dict, Optional

from fastapi import FastAPI, HTTPException
from fastapi.concurrency import run_in_threadpool

from utils.schema_ import EmbedRequest, SearchRequest, DeleteRequest
from vectordb.chroma_store import ChromaStore
from models.embedder import chat_embedder, categ_embedder

logger = logging.getLogger("uvicorn.error")

app = FastAPI(title="Embeddings microservice (chat + categorization)")

# DB path used only for persistent stores
DB_PATH = os.getenv("CHROMA_DB_PATH", "./chromadb")

# Persistent chat store (survives restarts)
chat_store = ChromaStore(
    db_path=DB_PATH,
    collection_name="chat-embeddings",
    embedder=chat_embedder,
    persist=True,
)

# Volatile categorization store (in-memory, lost on shutdown)
categ_store = ChromaStore(
    db_path=None,
    collection_name="categorization-embeddings",
    embedder=categ_embedder,
    persist=False,
)


# ------------------------
# Helpers
# ------------------------
def normalize_request(req: EmbedRequest, default_source: str = "generic"):
    """
    Normalize content and metadata to lists.
    Ensures metadata for each text is a non-empty dict (Chroma requires non-empty metadata).
    Returns: (texts: List[str], metadatas: List[Dict])
    """
    # normalize texts
    texts = req.content if isinstance(req.content, list) else [req.content]

    # validate and clean texts
    cleaned_texts: List[str] = []
    for t in texts:
        if t is None:
            continue
        if not isinstance(t, str):
            raise HTTPException(status_code=400, detail="Each content item must be a string.")
        s = t.strip()
        if s == "":
            continue
        cleaned_texts.append(s)

    if not cleaned_texts:
        raise HTTPException(status_code=400, detail="No valid text content provided.")

    # normalize metadata to a list
    if isinstance(req.metadata, list):
        metadatas: List[Optional[Dict]] = req.metadata
    elif isinstance(req.metadata, dict):
        metadatas = [req.metadata] * len(cleaned_texts)
    elif req.metadata is None:
        metadatas = [{} for _ in cleaned_texts]
    else:
        raise HTTPException(status_code=400, detail="metadata must be dict or list[dict] or omitted.")

    # Trim or pad metadata list to match texts length
    if len(metadatas) < len(cleaned_texts):
        metadatas = metadatas + [{} for _ in range(len(cleaned_texts) - len(metadatas))]
    elif len(metadatas) > len(cleaned_texts):
        metadatas = metadatas[: len(cleaned_texts)]

    # Ensure each metadata is a non-empty dict (Chroma requirement)
    final_metas: List[Dict] = []
    for i, m in enumerate(metadatas):
        if not isinstance(m, dict) or len(m) == 0:
            final_metas.append(
                {
                    "source": default_source,
                    "text_len": len(cleaned_texts[i]),
                }
            )
        else:
            final_metas.append(m)

    return cleaned_texts, final_metas


def safe_result_wrapper(message: str, ids: List[str]):
    return {"message": message, "ids": ids, "success": True}


# ------------------------
# Index
# ------------------------
@app.get("/")
async def index():
    return {
        "status": "ChromaDB context engine is live.",
        "collections": {"chat": chat_store.collection_name, "categorization": categ_store.collection_name},
    }


# ------------------------
# CHAT endpoints
# ------------------------
@app.post("/embed/chat")
async def embed_chat(req: EmbedRequest):
    try:
        texts, metadatas = normalize_request(req, default_source="chat")
        logger.info("Embed chat called", extra={"count": len(texts)})
        # run potentially blocking store/embed ops in threadpool
        ids = await run_in_threadpool(chat_store.add_texts, texts, metadatas)
        # ensure ids is serializable list
        if not isinstance(ids, list):
            logger.error("chat_store.add_texts returned non-list", extra={"type": type(ids)})
            raise HTTPException(status_code=500, detail="Embedding failed: invalid store response.")
        return safe_result_wrapper(f"{len(ids)} chat item(s) embedded successfully.", ids)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Chat embedding failed")
        raise HTTPException(status_code=500, detail="Chat embedding failed (server error). Check logs.")


@app.post("/search/chat")
async def search_chat(req: SearchRequest):
    try:
        logger.info("Search chat called", extra={"query": req.query, "k": req.k})
        results = await run_in_threadpool(chat_store.search, req.query, req.k)
        documents = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]
        rows = [{"text": doc, "metadata": meta, "distance": dist} for doc, meta, dist in zip(documents, metadatas, distances)]
        return {"results": rows, "success": True}
    except HTTPException:
        raise
    except Exception:
        logger.exception("Chat search failed")
        raise HTTPException(status_code=500, detail="Chat search failed (server error). Check logs.")


@app.delete("/delete-all/chat")
async def delete_all_chat():
    try:
        await run_in_threadpool(chat_store.delete_all)
        return {"status": "success", "message": f"Collection '{chat_store.collection_name}' cleared.", "success": True}
    except Exception:
        logger.exception("Chat delete-all failed")
        raise HTTPException(status_code=500, detail="Chat delete-all failed (server error). Check logs.")


@app.delete("/delete-items/chat")
async def delete_items_chat(req: DeleteRequest):
    try:
        await run_in_threadpool(chat_store.delete_items, req.ids)
        return {"status": "success", "message": f"Successfully deleted {len(req.ids)} chat item(s).", "success": True}
    except Exception:
        logger.exception("Chat delete-items failed")
        raise HTTPException(status_code=500, detail="Chat delete-items failed (server error). Check logs.")


# ------------------------
# CATEGORIZATION endpoints (volatile store)
# ------------------------
@app.post("/embed/categorization")
async def embed_categorization(req: EmbedRequest):
    try:
        texts = [item.content for item in req.items]
        metadatas = [item.meta or {} for item in req.items]

        logger.info("Embed categorization called", extra={"count": len(texts)})

        if len(texts) > 1000:
            raise HTTPException(status_code=413, detail="Too many items in request; split into smaller batches.")

        ids = await run_in_threadpool(categ_store.add_texts, texts, metadatas)

        if not isinstance(ids, list):
            logger.error("categ_store.add_texts returned non-list", extra={"type": type(ids)})
            raise HTTPException(status_code=500, detail="Embedding failed: invalid store response.")

        return safe_result_wrapper(f"{len(ids)} categorization item(s) embedded successfully.", ids)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Categorization embedding failed")
        raise HTTPException(status_code=500, detail="Categorization embedding failed (server error). Check logs.")


@app.post("/search/categorization")
async def search_categorization(req: SearchRequest):
    try:
        logger.info("Search categorization called", extra={"query": req.query, "k": req.k})
        results = await run_in_threadpool(categ_store.search, req.query, req.k)
        documents = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]
        rows = [{"text": doc, "metadata": meta, "distance": dist} for doc, meta, dist in zip(documents, metadatas, distances)]
        return {"results": rows, "success": True}
    except HTTPException:
        raise
    except Exception:
        logger.exception("Categorization search failed")
        raise HTTPException(status_code=500, detail="Categorization search failed (server error). Check logs.")


@app.delete("/delete-all/categorization")
async def delete_all_categorization():
    try:
        await run_in_threadpool(categ_store.delete_all)
        return {"status": "success", "message": f"Collection '{categ_store.collection_name}' cleared.", "success": True}
    except Exception:
        logger.exception("Categorization delete-all failed")
        raise HTTPException(status_code=500, detail="Categorization delete-all failed (server error). Check logs.")


@app.delete("/delete-items/categorization")
async def delete_items_categorization(req: DeleteRequest):
    try:
        await run_in_threadpool(categ_store.delete_items, req.ids)
        return {"status": "success", "message": f"Successfully deleted {len(req.ids)} categorization item(s).", "success": True}
    except Exception:
        logger.exception("Categorization delete-items failed")
        raise HTTPException(status_code=500, detail="Categorization delete-items failed (server error). Check logs.")
