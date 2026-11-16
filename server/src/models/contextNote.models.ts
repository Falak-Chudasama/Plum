import Note, { INote, NoteSchema } from './note.models';

export type IContextNote = INote;
export const contextNoteSchema = NoteSchema;
export default Note;
