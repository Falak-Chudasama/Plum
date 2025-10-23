# embedder.py
import os
from sentence_transformers import SentenceTransformer
import numpy as np

class Embedder:
    def __init__(self, model_name: str):
        self.model_name = model_name
        self.model = SentenceTransformer(model_name, trust_remote_code=True)

    def embed(self, texts: str | list[str]) -> np.ndarray:
        if isinstance(texts, str):
            texts = [texts]
        return self.model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)

DEFAULT_CATEG_MODEL = os.getenv("CATEG_EMBED_MODEL", "BAAI/bge-large-en-v1.5")
categ_embedder = Embedder(DEFAULT_CATEG_MODEL)