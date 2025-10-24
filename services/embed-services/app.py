# app.py
import os
import logging
from typing import List, Dict, Optional

from fastapi import FastAPI, HTTPException
from fastapi.concurrency import run_in_threadpool

from utils.schema_ import EmbedRequest, SearchRequest, DeleteRequest
from vectordb.chroma_store import ChromaStore
from models.embedder import LocalEmbedder, OllamaEmbedder

logger = logging.getLogger("uvicorn.error")

app = FastAPI(title="Embeddings microservice (categorization + intent)")

DB_PATH = os.getenv("CHROMA_DB_PATH", "./chromadb")

# instantiate embedders:
# - categorization uses local sentence-transformers
# - intent uses Ollama HTTP embedder
local_emb = LocalEmbedder()      # used by /embed/categorization and /search/categorization
ollama_emb = OllamaEmbedder()    # used by /embed/intent and /search/intent

categ_store = ChromaStore(
    db_path=None,
    collection_name="categorization-embeddings",
    embedder=local_emb,
    persist=False,
)

intent_store = ChromaStore(
    db_path=None,
    collection_name="intent-embeddings",
    embedder=ollama_emb,
    persist=False,
)


def safe_result_wrapper(message: str, ids: List[str]):
    return {"message": message, "ids": ids, "success": True}


@app.get("/")
async def index():
    return {
        "status": "ChromaDB engine is live.",
        "collections": {
            "categorization": categ_store.collection_name,
            "intent": intent_store.collection_name,
        },
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


@app.post("/embed/intent")
async def embed_intent(req: EmbedRequest):
    try:
        texts = [item.content for item in req.items]
        metadatas = []
        for item in req.items:
            m = item.meta or {}
            if not isinstance(m, dict) or "intent" not in m:
                raise HTTPException(status_code=400, detail="Each intent embed metadata must include an 'intent' key.")
            metadatas.append(m)
        logger.info("Embed intent called", extra={"count": len(texts)})
        if len(texts) > 1000:
            raise HTTPException(status_code=413, detail="Too many items in request; split into smaller batches.")
        ids = await run_in_threadpool(intent_store.add_texts, texts, metadatas)
        if not isinstance(ids, list):
            logger.error("intent_store.add_texts returned non-list", extra={"type": type(ids)})
            raise HTTPException(status_code=500, detail="Embedding failed: invalid store response.")
        return safe_result_wrapper(f"{len(ids)} intent item(s) embedded successfully.", ids)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Intent embedding failed")
        raise HTTPException(status_code=500, detail="Intent embedding failed (server error). Check logs.")


@app.post("/search/intent")
async def search_intent(req: SearchRequest):
    try:
        logger.info("Search intent called", extra={"query": req.query, "k": req.k})
        results = await run_in_threadpool(intent_store.search, req.query, req.k)
        documents = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]
        rows = [{"text": doc, "metadata": meta, "distance": dist} for doc, meta, dist in zip(documents, metadatas, distances)]
        return {"results": rows, "success": True}
    except HTTPException:
        raise
    except Exception:
        logger.exception("Intent search failed")
        raise HTTPException(status_code=500, detail="Intent search failed (server error). Check logs.")


@app.post("/parse/intent")
async def parse_intent(req: SearchRequest, threshold: float = 0.84):
    try:
        logger.info("Parse intent called", extra={"query": req.query, "k": req.k, "threshold": threshold})
        results = await run_in_threadpool(intent_store.search, req.query, req.k)
        documents = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]

        scores_by_intent: Dict[str, float] = {}
        support_by_intent: Dict[str, int] = {}

        for meta, score in zip(metadatas, distances):
            intent_label = meta.get("intent") if isinstance(meta, dict) else None
            if not intent_label:
                intent_label = "unknown"
            prev = scores_by_intent.get(intent_label, -1.0)
            if score > prev:
                scores_by_intent[intent_label] = score
            support_by_intent[intent_label] = support_by_intent.get(intent_label, 0) + 1

        if not scores_by_intent:
            return {"intent": "none", "confidence": 0.0, "candidates": [], "success": True}

        sorted_candidates = sorted(scores_by_intent.items(), key=lambda x: x[1], reverse=True)
        best_intent, best_score = sorted_candidates[0]
        candidates = [
            {"intent": it, "score": float(sc), "support": int(support_by_intent.get(it, 0))}
            for it, sc in sorted_candidates
        ]

        if best_score < threshold:
            return {"intent": "none", "confidence": float(best_score), "candidates": candidates, "success": True}

        return {"intent": best_intent, "confidence": float(best_score), "candidates": candidates, "success": True}
    except HTTPException:
        raise
    except Exception:
        logger.exception("Intent parse failed")
        raise HTTPException(status_code=500, detail="Intent parse failed (server error). Check logs.")


@app.delete("/delete-all/intent")
async def delete_all_intent():
    try:
        await run_in_threadpool(intent_store.delete_all)
        return {"status": "success", "message": f"Collection '{intent_store.collection_name}' cleared.", "success": True}
    except Exception:
        logger.exception("Intent delete-all failed")
        raise HTTPException(status_code=500, detail="Intent delete-all failed (server error). Check logs.")


@app.delete("/delete-items/intent")
async def delete_items_intent(req: DeleteRequest):
    try:
        await run_in_threadpool(intent_store.delete_items, req.ids)
        return {"status": "success", "message": f"Successfully deleted {len(req.ids)} intent item(s).", "success": True}
    except Exception:
        logger.exception("Intent delete-items failed")
        raise HTTPException(status_code=500, detail="Intent delete-items failed (server error). Check logs.")
