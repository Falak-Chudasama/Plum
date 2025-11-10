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

app = FastAPI(title="Embeddings microservice (categorization + intent + chat)")

# === Base configs ===
DB_PATH = os.getenv("CHROMA_DB_PATH", "./chromadb")
CHAT_DB_PATH = os.getenv("CHROMA_CHAT_DB_PATH", "./chromadb_chat")
CHAT_COLLECTION = os.getenv("CHROMA_CHAT_COLLECTION", "chat-embeddings")

# === Embedders ===
local_emb = LocalEmbedder()
ollama_emb = OllamaEmbedder()
chat_emb = LocalEmbedder(model_name=os.getenv("CHAT_EMBED_MODEL", "BAAI/bge-large-en-v1.5"))

# === Vector stores ===
categ_store = ChromaStore(
    db_path=None,
    collection_name="categorization-embeddings",
    embedder=local_emb,
    persist=False,
)

intent_store = ChromaStore(
    db_path=None,
    collection_name="intent-embeddings",
    embedder=local_emb,
    persist=False,
)

chat_store = ChromaStore(
    db_path=CHAT_DB_PATH,
    collection_name=CHAT_COLLECTION,
    embedder=chat_emb,
    persist=True,
)

# === Utility ===
def safe_result_wrapper(message: str, ids: List[str]):
    return {"message": message, "ids": ids, "success": True}


def chunk_text(text: str, max_chars: int = 1200, overlap: int = 150) -> List[str]:
    """
    Splits a long string into overlapping chunks to keep context continuity.
    """
    if not text or len(text) <= max_chars:
        return [text]

    chunks = []
    start = 0
    while start < len(text):
        end = start + max_chars
        chunks.append(text[start:end])
        start = end - overlap
        if start >= len(text):
            break
    return chunks


# === Root ===
@app.get("/")
async def index():
    return {
        "status": "ChromaDB engine is live.",
        "collections": {
            "categorization": categ_store.collection_name,
            "intent": intent_store.collection_name,
            "chat": chat_store.collection_name,
        },
    }


# === CATEGORIZATION ENDPOINTS ===
@app.post("/embed/categorization")
async def embed_categorization(req: EmbedRequest):
    try:
        texts = [item.content for item in req.items]
        metadatas = [item.meta or {} for item in req.items]
        if len(texts) > 1000:
            raise HTTPException(status_code=413, detail="Too many items in request; split into smaller batches.")
        ids = await run_in_threadpool(categ_store.add_texts, texts, metadatas)
        return safe_result_wrapper(f"{len(ids)} categorization item(s) embedded successfully.", ids)
    except Exception as e:
        logger.exception("Categorization embedding failed")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/search/categorization")
async def search_categorization(req: SearchRequest):
    try:
        results = await run_in_threadpool(categ_store.search, req.query, req.k)
        documents = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]
        return {
            "results": [
                {"text": doc, "metadata": meta, "distance": dist}
                for doc, meta, dist in zip(documents, metadatas, distances)
            ],
            "success": True,
        }
    except Exception as e:
        logger.exception("Categorization search failed")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/delete-all/categorization")
async def delete_all_categorization():
    try:
        await run_in_threadpool(categ_store.delete_all)
        return {"status": "success", "message": f"Collection '{categ_store.collection_name}' cleared.", "success": True}
    except Exception as e:
        logger.exception("Categorization delete-all failed")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/delete-items/categorization")
async def delete_items_categorization(req: DeleteRequest):
    try:
        await run_in_threadpool(categ_store.delete_items, req.ids)
        return {"status": "success", "message": f"Deleted {len(req.ids)} items.", "success": True}
    except Exception as e:
        logger.exception("Categorization delete-items failed")
        raise HTTPException(status_code=500, detail=str(e))


# === INTENT ENDPOINTS ===
@app.post("/embed/intent")
async def embed_intent(req: EmbedRequest):
    try:
        texts = []
        metadatas = []
        for item in req.items:
            m = item.meta or {}
            if not isinstance(m, dict) or "intent" not in m:
                raise HTTPException(status_code=400, detail="Each intent metadata must include 'intent'.")
            texts.append(item.content)
            metadatas.append(m)
        ids = await run_in_threadpool(intent_store.add_texts, texts, metadatas)
        return safe_result_wrapper(f"{len(ids)} intent item(s) embedded successfully.", ids)
    except Exception as e:
        logger.exception("Intent embedding failed")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/search/intent")
async def search_intent(req: SearchRequest):
    try:
        results = await run_in_threadpool(intent_store.search, req.query, req.k)
        documents = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]
        return {
            "results": [
                {"text": doc, "metadata": meta, "distance": dist}
                for doc, meta, dist in zip(documents, metadatas, distances)
            ],
            "success": True,
        }
    except Exception as e:
        logger.exception("Intent search failed")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/parse/intent")
async def parse_intent(req: SearchRequest, threshold: float = 0.84):
    try:
        results = await run_in_threadpool(intent_store.search, req.query, req.k)
        metadatas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]

        scores = {}
        support = {}
        for meta, score in zip(metadatas, distances):
            label = meta.get("intent", "unknown") if isinstance(meta, dict) else "unknown"
            if score > scores.get(label, -1):
                scores[label] = score
            support[label] = support.get(label, 0) + 1

        if not scores:
            return {"intent": "none", "confidence": 0.0, "candidates": [], "success": True}

        sorted_candidates = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        best_label, best_score = sorted_candidates[0]
        candidates = [{"intent": l, "score": float(s), "support": support[l]} for l, s in sorted_candidates]

        if best_score < threshold:
            return {"intent": "none", "confidence": float(best_score), "candidates": candidates, "success": True}

        return {"intent": best_label, "confidence": float(best_score), "candidates": candidates, "success": True}
    except Exception as e:
        logger.exception("Intent parse failed")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/delete-all/intent")
async def delete_all_intent():
    try:
        await run_in_threadpool(intent_store.delete_all)
        return {"status": "success", "message": f"Collection '{intent_store.collection_name}' cleared.", "success": True}
    except Exception as e:
        logger.exception("Intent delete-all failed")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/delete-items/intent")
async def delete_items_intent(req: DeleteRequest):
    try:
        await run_in_threadpool(intent_store.delete_items, req.ids)
        return {"status": "success", "message": f"Deleted {len(req.ids)} intent items.", "success": True}
    except Exception as e:
        logger.exception("Intent delete-items failed")
        raise HTTPException(status_code=500, detail=str(e))


# === CHAT ENDPOINTS ===
@app.post("/embed/chat")
async def embed_chat(req: EmbedRequest):
    try:
        all_texts = []
        all_metas = []

        for item in req.items:
            text = item.content.strip()
            meta = item.meta or {}

            chunks = chunk_text(text, max_chars=1200, overlap=150)
            for idx, chunk in enumerate(chunks):
                chunk_meta = dict(meta)
                chunk_meta.update({
                    "chunk_index": idx,
                    "total_chunks": len(chunks),
                    "chunk_length": len(chunk)
                })
                all_texts.append(chunk)
                all_metas.append(chunk_meta)

        if len(all_texts) > 5000:
            raise HTTPException(status_code=413, detail="Too many chunks in request; split input smaller.")

        ids = await run_in_threadpool(chat_store.add_texts, all_texts, all_metas)
        return safe_result_wrapper(f"{len(ids)} chat chunk(s) embedded successfully.", ids)
    except Exception as e:
        logger.exception("Chat embedding failed")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/search/chat")
async def search_chat(req: SearchRequest):
    try:
        results = await run_in_threadpool(chat_store.search, req.query, req.k)
        documents = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]
        return {
            "results": [
                {"text": doc, "metadata": meta, "distance": dist}
                for doc, meta, dist in zip(documents, metadatas, distances)
            ],
            "success": True,
        }
    except Exception as e:
        logger.exception("Chat search failed")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/parse/chat")
async def parse_chat(req: SearchRequest, threshold: float = 0.84):
    try:
        results = await run_in_threadpool(chat_store.search, req.query, req.k)
        metadatas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]

        scores = {}
        support = {}
        for meta, score in zip(metadatas, distances):
            label = meta.get("label", "unknown") if isinstance(meta, dict) else "unknown"
            if score > scores.get(label, -1):
                scores[label] = score
            support[label] = support.get(label, 0) + 1

        if not scores:
            return {"label": "none", "confidence": 0.0, "candidates": [], "success": True}

        sorted_candidates = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        best_label, best_score = sorted_candidates[0]
        candidates = [{"label": l, "score": float(s), "support": support[l]} for l, s in sorted_candidates]

        if best_score < threshold:
            return {"label": "none", "confidence": float(best_score), "candidates": candidates, "success": True}

        return {"label": best_label, "confidence": float(best_score), "candidates": candidates, "success": True}
    except Exception as e:
        logger.exception("Chat parse failed")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/delete-all/chat")
async def delete_all_chat():
    try:
        await run_in_threadpool(chat_store.delete_all)
        return {"status": "success", "message": f"Collection '{chat_store.collection_name}' cleared.", "success": True}
    except Exception as e:
        logger.exception("Chat delete-all failed")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/delete-items/chat")
async def delete_items_chat(req: DeleteRequest):
    try:
        await run_in_threadpool(chat_store.delete_items, req.ids)
        return {"status": "success", "message": f"Deleted {len(req.ids)} chat items.", "success": True}
    except Exception as e:
        logger.exception("Chat delete-items failed")
        raise HTTPException(status_code=500, detail=str(e))