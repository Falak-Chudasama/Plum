import os
import logging
from typing import List, Union, Optional

import numpy as np

logger = logging.getLogger(__name__)

try:
    from sentence_transformers import SentenceTransformer
except ImportError:
    SentenceTransformer = None

import requests


def _resolve_cache_dir() -> str:
    return (
        os.getenv("HF_HOME")
        or os.getenv("SENTENCE_TRANSFORMERS_HOME")
        or os.path.join(os.path.expanduser("~"), ".cache", "huggingface", "hub")
    )


def _model_is_cached(model_name: str, cache_dir: str) -> bool:

    if not os.path.isdir(cache_dir):
        return False
    slug = model_name.replace("/", "--")
    for entry in os.listdir(cache_dir):
        if slug in entry:
            return True
    if os.path.isdir(model_name):
        return True
    return False


class LocalEmbedder:

    def __init__(
        self,
        model_name: Optional[str] = None,
        normalize_embeddings: bool = True,
        cache_folder: Optional[str] = None,
    ):
        if SentenceTransformer is None:
            raise ImportError(
                "sentence-transformers is not installed. "
                "Run: pip install sentence-transformers"
            )

        self.model_name = model_name or os.getenv("CATEG_EMBED_MODEL", "BAAI/bge-large-en-v1.5")
        self.normalize_embeddings = normalize_embeddings
        self.cache_folder = cache_folder or _resolve_cache_dir()
        self._model: Optional[SentenceTransformer] = None

    def _load_model(self) -> None:
        """Load the SentenceTransformer model exactly once."""
        if self._model is not None:
            return

        cached = _model_is_cached(self.model_name, self.cache_folder)

        if os.path.isdir(self.model_name):
            logger.info("LocalEmbedder: loading model from local path '%s'", self.model_name)
            self._model = SentenceTransformer(
                self.model_name,
                trust_remote_code=True,
                cache_folder=self.cache_folder,
            )
            return

        if cached:
            logger.info(
                "LocalEmbedder: model '%s' found in cache, loading offline.",
                self.model_name,
            )
            os.environ["TRANSFORMERS_OFFLINE"] = "1"
            os.environ["HF_DATASETS_OFFLINE"] = "1"
            os.environ["HF_HUB_OFFLINE"] = "1"
            self._model = SentenceTransformer(
                self.model_name,
                trust_remote_code=True,
                cache_folder=self.cache_folder,
            )
        else:
            logger.info(
                "LocalEmbedder: model '%s' not in cache (%s), attempting download.",
                self.model_name,
                self.cache_folder,
            )
            for flag in ("TRANSFORMERS_OFFLINE", "HF_DATASETS_OFFLINE", "HF_HUB_OFFLINE"):
                os.environ.pop(flag, None)

            try:
                self._model = SentenceTransformer(
                    self.model_name,
                    trust_remote_code=True,
                    cache_folder=self.cache_folder,
                )
            except Exception as exc:
                raise RuntimeError(
                    f"Could not load model '{self.model_name}'.\n"
                    f"Cache directory checked: {self.cache_folder}\n"
                    f"Options to fix this:\n"
                    f"  1. Download while online:  "
                    f"huggingface-cli download {self.model_name} --local-dir <dir>\n"
                    f"     then set CATEG_EMBED_MODEL=<dir>\n"
                    f"  2. Set HF_HOME to a directory that already contains the model.\n"
                    f"  3. Check your internet / proxy settings.\n"
                    f"Original error: {exc}"
                ) from exc

    def embed(self, texts: Union[str, List[str]]) -> np.ndarray:
        """
        Accepts a single string or list[str].
        Returns np.ndarray of shape (n_texts, dim), dtype float32.
        """
        if isinstance(texts, str):
            texts = [texts]
        if not isinstance(texts, list):
            raise ValueError("texts must be a str or a list of str")

        self._load_model()

        arr = self._model.encode(texts, convert_to_numpy=True)
        if self.normalize_embeddings:
            norms = np.linalg.norm(arr, axis=1, keepdims=True)
            norms[norms == 0] = 1.0
            arr = arr / norms
        return arr.astype(np.float32)


class OllamaEmbedder:
    """HTTP client to a running Ollama instance."""

    def __init__(
        self,
        model_name: Optional[str] = None,
        ollama_url: Optional[str] = None,
        timeout: int = 30,
        normalize_embeddings: bool = True,
    ):
        self.model_name = model_name or os.getenv("OLLAMA_EMBED_MODEL", "embeddinggemma:300m")
        self.ollama_url = ollama_url or os.getenv(
            "OLLAMA_EMBED_URL", "http://localhost:11434/api/embeddings"
        )
        try:
            self.timeout = int(os.getenv("OLLAMA_TIMEOUT", str(timeout)))
        except (ValueError, TypeError):
            self.timeout = timeout

        env_norm = os.getenv("NORMALIZE_EMBEDDINGS")
        self.normalize_embeddings = (
            env_norm not in ("0", "false", "False") if env_norm is not None else normalize_embeddings
        )

    def _embed_single(self, text: str) -> List[float]:
        payload = {"model": self.model_name, "prompt": text}
        try:
            resp = requests.post(self.ollama_url, json=payload, timeout=self.timeout)
            resp.raise_for_status()
            data = resp.json()

            if isinstance(data, dict) and "embedding" in data:
                emb = data["embedding"]
            elif isinstance(data, dict) and "embeddings" in data:
                emb_field = data["embeddings"]
                emb = emb_field[0] if (isinstance(emb_field, list) and emb_field and isinstance(emb_field[0], list)) else emb_field
            elif isinstance(data, list):
                emb = data
            else:
                raise ValueError(f"Unexpected embedding response format: {data}")

            if not isinstance(emb, list):
                raise ValueError("Embedding returned by Ollama is not a list")

            return emb
        except Exception as exc:
            logger.exception("Failed to get embedding from Ollama")
            raise RuntimeError(f"Ollama embedding request failed: {exc}") from exc

    def embed(self, texts: Union[str, List[str]]) -> np.ndarray:
        if isinstance(texts, str):
            texts = [texts]
        if not isinstance(texts, list):
            raise ValueError("texts must be a string or a list of strings")

        arr = np.asarray([self._embed_single(t) for t in texts], dtype=np.float32)

        if self.normalize_embeddings:
            norms = np.linalg.norm(arr, axis=1, keepdims=True)
            norms[norms == 0] = 1.0
            arr = arr / norms

        return arr