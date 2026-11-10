import { run } from "node:test";
import { spec } from "node:test/reporters";
import path from "node:path";

const testFile = path.resolve(__dirname, "live_integration.test.ts");

console.log("Starting Live Integration Test Suite against Basket...");

run({ files: [testFile] })
    .on("test:fail", () => {
        process.exitCode = 1;
    })
    .compose(new spec())
    .pipe(process.stdout);

