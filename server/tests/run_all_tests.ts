import { run } from "node:test";
import { spec } from "node:test/reporters";
import path from "node:path";

const testFiles = [
    path.resolve(__dirname, "basket_and_grammars.test.ts"),
    path.resolve(__dirname, "multi_account_isolation.test.ts"),
    path.resolve(__dirname, "chat_e2e.test.ts"),
];

console.log("Starting test suite execution with node:test runner...");

run({ files: testFiles })
    .on("test:fail", () => {
        process.exitCode = 1;
    })
    .compose(new spec())
    .pipe(process.stdout);

