"""Retrieval debug service — run a RAG query with trace capture."""
from __future__ import annotations

from typing import Any


async def run_rag_debug(
    vectorstore_config: dict[str, Any],
    vectorstore_type: str,
    llm_config: dict[str, Any],
    llm_type: str,
    query: str,
    k: int,
    prompt_template: str,
) -> dict[str, Any]:
    """
    Run a RAG query and return a full retrieval trace:
      - query
      - retrieved chunks (text, score, source)
      - assembled prompt
      - final response
    """
    try:
        retriever, embeddings_fn = _build_retriever(vectorstore_config, vectorstore_type, k)
        llm = _build_llm(llm_config, llm_type)
    except ImportError as exc:
        raise RuntimeError(f"Missing package: {exc}") from exc

    # Retrieve with scores
    try:
        results_with_scores = retriever.vectorstore.similarity_search_with_relevance_scores(query, k=k)
        chunks = [
            {
                "text": doc.page_content,
                "score": float(score),
                "source": doc.metadata.get("source", ""),
                "metadata": {k: str(v) for k, v in doc.metadata.items()},
            }
            for doc, score in results_with_scores
        ]
    except Exception:
        # Fallback: retrieve without scores
        docs = retriever.get_relevant_documents(query)
        chunks = [
            {
                "text": doc.page_content,
                "score": None,
                "source": doc.metadata.get("source", ""),
                "metadata": {k: str(v) for k, v in doc.metadata.items()},
            }
            for doc in docs
        ]

    # Build context string
    context = "\n\n".join(c["text"] for c in chunks)

    # Assemble prompt
    assembled_prompt = prompt_template.format(context=context, question=query)

    # Invoke LLM
    try:
        response = llm.invoke(assembled_prompt)
        response_text = response.content if hasattr(response, "content") else str(response)
    except Exception as exc:
        response_text = f"[LLM error: {exc}]"

    return {
        "query": query,
        "chunks": chunks,
        "assembled_prompt": assembled_prompt,
        "response": response_text,
    }


def _build_retriever(config: dict[str, Any], vs_type: str, k: int):
    """Build a LangChain retriever from config."""
    if vs_type == "chroma":
        from langchain_chroma import Chroma
        from langchain_openai import OpenAIEmbeddings
        embeddings = OpenAIEmbeddings(
            api_key=config.get("openai_api_key", ""),
        )
        vs = Chroma(
            collection_name=config.get("collection_name", "default"),
            persist_directory=config.get("persist_directory", "./chroma_db"),
            embedding_function=embeddings,
        )
        return vs.as_retriever(search_kwargs={"k": k}), embeddings
    elif vs_type == "faiss":
        from langchain_community.vectorstores import FAISS
        from langchain_openai import OpenAIEmbeddings
        import os
        embeddings = OpenAIEmbeddings(api_key=config.get("openai_api_key", ""))
        vs = FAISS.load_local(
            config.get("index_path", "./faiss_index"),
            embeddings,
            allow_dangerous_deserialization=True,
        )
        return vs.as_retriever(search_kwargs={"k": k}), embeddings
    else:
        raise ValueError(f"Unsupported vectorstore type: {vs_type}")


def _build_llm(config: dict[str, Any], llm_type: str):
    if llm_type == "openai":
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=config.get("model_name", "gpt-4o-mini"),
            api_key=config.get("api_key", ""),
            temperature=float(config.get("temperature", 0.0)),
        )
    elif llm_type == "anthropic":
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(
            model=config.get("model_name", "claude-3-5-haiku-20241022"),
            api_key=config.get("api_key", ""),
            temperature=float(config.get("temperature", 0.0)),
        )
    elif llm_type == "ollama":
        from langchain_ollama import ChatOllama
        return ChatOllama(
            model=config.get("model_name", "llama3.2"),
            base_url=config.get("base_url", "http://localhost:11434"),
        )
    else:
        raise ValueError(f"Unsupported LLM type: {llm_type}")
