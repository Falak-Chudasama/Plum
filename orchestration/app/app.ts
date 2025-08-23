import express, { Request, Response } from "express";

const app = express();

app.get('/', (req: Request, res: Response) => {
    res.send('Plum orchestration is listening');
});

export default app;