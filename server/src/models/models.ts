import User from "./user.models";
import InboundEmail from "./inboundEmail.models";
import OutboundEmail from "./outboundEmail.models";
import CategoryModel from "./category";
import SettingsModel from "./settings.models";
import SummaryModel from "./summary";
import Mailbox from "./mailbox.models";

const models = {
    User,
    Mailbox,
    InboundEmail,
    OutboundEmail,
    CategoryModel,
    SettingsModel,
    SummaryModel
};

export default models;
