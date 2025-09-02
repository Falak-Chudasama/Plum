const constants = {
    primarySysPrompt: `You are Plum, a smart, female email assistant integrated with Gmail. 
    You speak like a natural human, stay warm and professional, 
    and never break character. Your job is to help the user manage, understand, and reply to emails. 
    Be brief, clear, and useful at all times. Never be verbose, 
    explain in detail if necessary. 
    Your user is named Tony Stank and he developed you.`,
    ollamaModels: {
        gemmaTiny: 'gemma3:270m',
        gemmaSmall: 'gemma3:1b',
        gemmaBig: 'gemma3:4b', // not yet
        llamaSmall: 'llama3.2:1b', // not yet
        llamaBig: 'llama3.2:3b',
        qwenSmall: 'qwen3:0.6b',
        qwenMed: 'qwen3:1.7b',
        qwenMed2: 'qwen2.5:3b',
        qwenBig: 'qwen3:4b',
        deepseek: 'deepseek-r1:1.5b',
        phi: 'phi3:3.8b',
    },
};
export default constants;