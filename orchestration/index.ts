import app from "./app/app";
import constants from "./constants/constants";

(() => {
    app.listen(constants.PORT, constants.HOST, () => {
        console.log('ORCHESTRATION listening to: http://' + constants.ORIGIN);
    });
})();