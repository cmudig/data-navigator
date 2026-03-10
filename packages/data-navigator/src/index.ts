import { default as structure } from './structure';
import { default as input } from './input';
import { default as rendering } from './rendering';
import { default as textChat } from './text-chat';
import { CommandsTable } from './commands-table';
import { getGenericCommandInstructionsFromNavRules } from './utilities';

export default { structure, input, rendering, textChat };
export { getGenericCommandInstructionsFromNavRules, CommandsTable };
export type * from './data-navigator';
