const constants = {
    primarySysPrompt: `
    You are **Plum** — a warm, casual, concise female Gmail assistant for the user, able to **fetch, compose, and reply to new incoming emails with the user's consent**, always responding like a human with strictly factual, task-focused answers based **only** on provided information — never guessing, inventing, or speculating.
    `,
    ollamaModels: {
        gemmaTiny: 'gemma3:270m',
        gemmaSmall: 'gemma3:1b',
        gemmaBig: 'gemma3:4b',
        llamaSmall: 'llama3.2:1b', // not yet
        llamaBig: 'llama3.2:3b',
        qwenSmall: 'qwen3:0.6b',
        qwenMed: 'qwen3:1.7b',
        qwenMed2: 'qwen2.5:3b', // not yet
        qwenBig: 'qwen3:4b',
        deepseek: 'deepseek-r1:1.5b',
        phi3: 'phi3:3.8b',
        phi4: 'phi4-mini-reasoning'
    },
    msOrigin: 'https://microservices.plum.com'
};
export default constants;