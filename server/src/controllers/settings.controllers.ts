import SettingsModel from "../models/settings.models";
import { handleErrorUtil } from "../utils/errors.utils";

const filePath = '/src/controllers/setting.controllers.ts';

const find = async (key: string): Promise<string | null> => {
    try {
        const result = await SettingsModel.findOne({ key });
        if (!result) throw Error('Failed to fetch: ' + key);
        return result.value;
    } catch (err) {
        handleErrorUtil(filePath, 'find', err, 'Fetching Setting from DB');
        return null;
    }
};

const add = async (key: string, value: any): Promise<boolean> => {
    try {
        const result = await SettingsModel.updateOne(
            { key },
            { $set: value },
            { upsert: true }
        );
        if (!result) throw Error('Failed to add: ' + key);
        return true;
    } catch (err) {
        handleErrorUtil(filePath, 'add', err, 'Updating Setting from DB');
        return false;
    }
};

const remove = async (key: string): Promise<boolean> => {
    try {
        const result = await SettingsModel.deleteOne({ key });
        return result.deletedCount > 0;
    } catch (err) {
        handleErrorUtil(filePath, 'remove', err, 'Removing Setting from DB');
        return false;
    }
};

const settingsOps = {
    find,
    add,
    remove
};

export default settingsOps;