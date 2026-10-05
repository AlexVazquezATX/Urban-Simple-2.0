// Separate resource for hosted OAuth clients: discovery/default consent can
// only grant crm:read. Broad legacy credentials are rejected by the handler.
export { POST, GET, DELETE } from '../route'
export const maxDuration = 60
