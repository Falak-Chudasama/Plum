const constants = {
    primarySysPrompt: `You are **Plum** — a warm, casual, concise female Gmail assistant for the user, able to **fetch, compose, and reply to new incoming emails with the user's consent**, always responding like a human with strictly factual, task-focused answers based **only** on provided information — never guessing, inventing, or speculating.`,
    lmsModels: {
        llm: {
            lfm2: 'liquid/lfm2-1.2b',
            gemmaSmall: 'google/gemma-3-1b',
            gemmaBig: 'google/gemma-3-4b',
            llamaInstruct: 'llama-3.2-3b-instruct',
            llamaHermes: 'hermes-3-llama-3.2-3b',
            qwenMed: 'qwen/qwen3-1.7b',
            qwenBig: 'qwen/qwen3-4b-thinking-2507',
            qwenVision: 'qwen/qwen3-vl-4b',
            llamaMongoQuery: 'llama-3.2-3b-mongo-query-generator',
        },
        embedding: {
            gemma: 'text-embedding-embeddinggemma-300m',
            nomic: 'text-embedding-nomic-embed-text-v1.5',
        }
    },
    ollamaModels: {
        gemmaTiny: 'gemma3:270m',
        gemmaSmall: 'gemma3:1b',
        gemmaBig: 'gemma3:4b',
        llamaSmall: 'llama3.2:1b',
        llamaBig: 'llama3.2:3b',
        qwenSmall: 'qwen3:0.6b',
        qwenMed: 'qwen3:1.7b',
        qwenMed2: 'qwen2.5:3b',
        qwenBig: 'qwen3:4b',
        deepseek: 'deepseek-r1:1.5b',
        phi3: 'phi3:3.8b',
        phi4: 'phi4-mini-reasoning'
    },
    defaultContextLength: 8000,
    msOrigin: 'https://microservices.plum.com',
    serverOrigin: 'https://api.plum.com',
    plumOrigin: 'https://plum.com'
};
export default constants;