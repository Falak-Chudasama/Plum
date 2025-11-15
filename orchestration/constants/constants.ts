const constants = {
    primarySysPrompt: `You are **Plum** — a warm, casual, concise female Gmail assistant for the user, able to **fetch, compose, and reply to new incoming emails with the user's consent**, always responding like a human with strictly factual, task-focused answers based **only** on provided information — never guessing, inventing, or speculating.`,
    lmsModels: {
        llm: {
            BEST: 'qwen/qwen3-4b-2507',
            EFFICIENT: 'hermes-3-llama-3.2-3b',
            qwenMed: 'qwen/qwen3-1.7b',
            qwenBigThinking: 'qwen/qwen3-4b-thinking-2507',
            qwenBig: 'qwen/qwen3-4b-2507',
            qwenVision: 'qwen/qwen3-vl-4b',
            gemmaSmall: 'google/gemma-3-1b',
            gemmaBig: 'google/gemma-3-4b',
            llamaInstruct: 'llama-3.2-3b-instruct',
            llamaHermes: 'hermes-3-llama-3.2-3b',
            llamaMongoQuery: 'llama-3.2-3b-mongo-query-generator',
            graniteTinyH: 'ibm/granite-4-h-tiny',
        },
        embedding: {
            gemma: 'text-embedding-embeddinggemma-300m',
            nomic: 'text-embedding-nomic-embed-text-v1.5',
        }
    },
    defaultContextLength: 8000,
    msOrigin: 'https://microservices.plum.com',
    serverOrigin: 'https://api.plum.com',
    plumOrigin: 'https://plum.com'
};
export default constants;