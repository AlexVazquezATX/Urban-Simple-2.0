const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

console.log('Available models:', Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$')).sort());

// Check for AI conversation models
console.log('Has aIConversation?', 'aIConversation' in prisma);
console.log('Has AIConversation?', 'AIConversation' in prisma);
console.log('Has aiConversation?', 'aiConversation' in prisma);
