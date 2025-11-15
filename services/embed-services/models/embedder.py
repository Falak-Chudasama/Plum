# models/embedder.py
"""
Combined embedder module:
- LocalEmbedder: uses sentence-transformers locally (for categorization).
- OllamaEmbedder: HTTP client to Ollama (for intent).

Usage:
  from models.embedder import LocalEmbedder, OllamaEmbedder
  local = LocalEmbedder()
  ollama = OllamaEmbedder()
"""
import os
import logging
from typing import List, Union, Optional

import numpy as np

logger = logging.getLogger(__name__)

import os
os.environ["HF_HUB_OFFLINE"] = "1"

# Local (sentence-transformers)
try:
    from sentence_transformers import SentenceTransformer
except Exception:  # if not installed, raise at instantiation time
    SentenceTransformer = None


class LocalEmbedder:
    def __init__(self, model_name: Optional[str] = None, normalize_embeddings: bool = True):
        if SentenceTransformer is None:
            raise ImportError("sentence-transformers not installed. Run: pip install sentence-transformers")
        self.model_name = model_name or os.getenv("CATEG_EMBED_MODEL", "BAAI/bge-large-en-v1.5")
        self.model = SentenceTransformer(self.model_name, trust_remote_code=True)
        self.normalize_embeddings = normalize_embeddings

    def embed(self, texts: Union[str, List[str]]) -> np.ndarray:
        """
        Accepts a single string or list[str], returns np.ndarray shape (n_texts, dim), dtype float32.
        """
        if isinstance(texts, str):
            texts = [texts]
        if not isinstance(texts, list):
            raise ValueError("texts must be a str or a list of str")

        arr = self.model.encode(texts, convert_to_numpy=True)
        if self.normalize_embeddings:
            norms = np.linalg.norm(arr, axis=1, keepdims=True)
            norms[norms == 0] = 1.0
            arr = arr / norms
        return arr.astype(np.float32)


# Ollama HTTP embedder
import requests


class OllamaEmbedder:
    def __init__(
        self,
        model_name: Optional[str] = None,
        ollama_url: Optional[str] = None,
        timeout: int = 30,
        normalize_embeddings: bool = True,
    ):
        self.model_name = model_name or os.getenv("CATEG_EMBED_MODEL", "embeddinggemma:300m")
        self.ollama_url = ollama_url or os.getenv("OLLAMA_EMBED_URL", "http://localhost:11434/api/embeddings")
        try:
            self.timeout = int(os.getenv("OLLAMA_TIMEOUT", timeout))
        except Exception:
            self.timeout = timeout
        env_norm = os.getenv("NORMALIZE_EMBEDDINGS")
        if env_norm is not None:
            self.normalize_embeddings = env_norm not in ("0", "false", "False")
        else:
            self.normalize_embeddings = normalize_embeddings

    def _embed_single(self, text: str) -> List[float]:
        payload = {"model": self.model_name, "prompt": text}
        try:
            resp = requests.post(self.ollama_url, json=payload, timeout=self.timeout)
            resp.raise_for_status()
            data = resp.json()

            # extract embedding from possible shapes
            if isinstance(data, dict) and "embedding" in data:
                emb = data["embedding"]
            elif isinstance(data, dict) and "embeddings" in data:
                emb_field = data["embeddings"]
                if isinstance(emb_field, list) and len(emb_field) > 0 and isinstance(emb_field[0], list):
                    emb = emb_field[0]
                else:
                    emb = emb_field
            elif isinstance(data, list):
                emb = data
            else:
                raise ValueError(f"Unexpected embedding response format: {data}")

            if not isinstance(emb, list):
                raise ValueError("Embedding returned by Ollama is not a list")

            return emb
        except Exception as e:
            logger.exception("Failed to get embedding from Ollama")
            raise RuntimeError(f"Ollama embedding request failed: {e}") from e

    def embed(self, texts: Union[str, List[str]]) -> np.ndarray:
        if isinstance(texts, str):
            texts = [texts]
        if not isinstance(texts, list):
            raise ValueError("texts must be a string or a list of strings")

        embeddings = []
        for t in texts:
            emb = self._embed_single(t)
            embeddings.append(emb)

        arr = np.asarray(embeddings, dtype=np.float32)

        if self.normalize_embeddings:
            norms = np.linalg.norm(arr, axis=1, keepdims=True)
            norms[norms == 0] = 1.0
            arr = arr / norms

        return arr
