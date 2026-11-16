import User from "./user.models";
import InboundEmail from "./inboundEmail.models";
import OutboundEmail from "./outboundEmail.models";
import CategoryModel from "./category";
import SettingsModel from "./settings.models";
import SummaryModel from "./summary";
import Mailbox from "./mailbox.models";
import ContextNote from "./contextNote.models";
import Note from "./note.models";
import Command from "./command.models";
import Chats from "./chat";

const models = {
    User,
    Mailbox,
    InboundEmail,
    OutboundEmail,
    CategoryModel,
    SettingsModel,
    SummaryModel,
    ContextNote,
    Note,
    Command,
    Chats,
};

export default models;
