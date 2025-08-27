export default class TaskQueue<TArg = any, TResult = any> {
    private queue: {
        task: (arg: TArg) => Promise<TResult>;
        arg: TArg;
        resolve: (value: TResult) => void;
        reject: (reason?: any) => void;
    }[] = [];

    private isRunning = false;

    add(task: (arg: TArg) => Promise<TResult>, arg: TArg): Promise<TResult> {
        return new Promise<TResult>((resolve, reject) => {
            this.queue.push({ task, arg, resolve, reject });
            this.processQueue();
        });
    }

    private async processQueue() {
        if (this.isRunning) return;

        const item = this.queue.shift();
        if (!item) return;

        this.isRunning = true;
        try {
            const result = await item.task(item.arg);
            item.resolve(result);
        } catch (err) {
            item.reject(err);
        } finally {
            this.isRunning = false;
            if (this.queue.length > 0) {
                setTimeout(() => this.processQueue(), 0);
            }
        }
    }
}
