// Vercel server-side function. Secrets belong in Vercel environment settings.
module.exports = require('../server/orders.cjs').createOrderHandler();
