import os
import logging
from typing import List, Dict, Optional

from fastapi import FastAPI, HTTPException
from fastapi.concurrency import run_in_threadpool

from utils.schema_ import EmbedRequest, SearchRequest, DeleteRequest
from vectordb.chroma_store import ChromaStore
from models.embedder import categ_embedder

logger = logging.getLogger("uvicorn.error")

app = FastAPI(title="Embeddings microservice (categorization)")

DB_PATH = os.getenv("CHROMA_DB_PATH", "./chromadb")

categ_store = ChromaStore(
    db_path=None,
    collection_name="categorization-embeddings",
    embedder=categ_embedder,
    persist=False,
)

def safe_result_wrapper(message: str, ids: List[str]):
    return {"message": message, "ids": ids, "success": True}

@app.get("/")
async def index():
    return {
        "status": "ChromaDB categorization engine is live.",
        "collections": {"categorization": categ_store.collection_name},
    }

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