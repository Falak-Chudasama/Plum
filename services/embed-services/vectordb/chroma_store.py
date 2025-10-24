# vectordb/chroma_store.py
import uuid
from typing import List, Optional
import chromadb


class ChromaStore:
    def __init__(
        self,
        db_path: Optional[str] = "./chromadb",
        collection_name: str = "collection",
        embedder=None,
        persist: bool = True,
    ):
        if embedder is None:
            raise ValueError("embedder must be provided")

        self.collection_name = collection_name
        self.embedder = embedder
        self.persist = bool(persist)

        if self.persist:
            if not db_path:
                raise ValueError("db_path must be provided for persistent mode")
            self.client = chromadb.PersistentClient(path=db_path)
        else:
            self.client = chromadb.Client()

        self.collection = self.client.get_or_create_collection(self.collection_name)

    def add_texts(self, texts: List[str], metadatas: Optional[List[dict]] = None) -> List[str]:
        if metadatas and len(metadatas) != len(texts):
            raise ValueError("metadatas length must match texts length")

        embeddings = self.embedder.embed(texts).tolist()
        ids = [str(uuid.uuid4()) for _ in texts]

        self.collection.add(
            ids=ids,
            documents=texts,
            embeddings=embeddings,
            metadatas=metadatas if metadatas else [{} for _ in texts],
        )
        return ids

    def search(self, query: str, k: int = 5):
        embedding = self.embedder.embed(query).tolist()[0]
        return self.collection.query(query_embeddings=[embedding], n_results=k)

    def get_all(self):
        results = self.collection.get()
        documents = results.get("documents", [])
        metadatas = results.get("metadatas", [])
        ids = results.get("ids", [])
        return [
            {"id": id_, "text": doc, "metadata": meta}
            for id_, doc, meta in zip(ids, documents, metadatas)
        ]

    def count(self) -> int:
        return self.collection.count()

    def delete_items(self, ids: List[str]):
        self.collection.delete(ids=ids)

    def delete_all(self):
        try:
            self.client.delete_collection(name=self.collection_name)
        except Exception:
            pass
        self.collection = self.client.get_or_create_collection(self.collection_name)
