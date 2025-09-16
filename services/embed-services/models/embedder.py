# models/embedder.py
import os
from sentence_transformers import SentenceTransformer
import numpy as np

class Embedder:
    def __init__(self, model_name: str):
        self.model_name = model_name
        # trust_remote_code left to True because some HF models require it.
        # If you want safety, set trust_remote_code=False and ensure model supports SentenceTransformers.
        self.model = SentenceTransformer(model_name, trust_remote_code=True)

    def embed(self, texts: str | list[str]) -> np.ndarray:
        if isinstance(texts, str):
            texts = [texts]
        # convert_to_numpy=True yields numpy array; normalize_embeddings helps with cosine sim
        return self.model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)

# Defaults can be overridden with environment variables
DEFAULT_CHAT_MODEL = os.getenv("CHAT_EMBED_MODEL", "nomic-ai/nomic-embed-text-v1")
DEFAULT_CATEG_MODEL = os.getenv("CATEG_EMBED_MODEL", "BAAI/bge-large-en-v1.5")

# Instantiate singletons for convenience. Loading happens at import (warmup).
chat_embedder = Embedder(DEFAULT_CHAT_MODEL)
categ_embedder = Embedder(DEFAULT_CATEG_MODEL)