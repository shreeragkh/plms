const amqplib = require('amqplib');

// ── RabbitMQ Publisher ────────────────────────────────────────────────────────
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const EXCHANGE     = 'plms_events';  // fanout exchange — all queues receive all events

let connection = null;
let channel    = null;

async function connect() {
  try {
    connection = await amqplib.connect(RABBITMQ_URL);
    channel    = await connection.createChannel();

    // Durable fanout exchange — survives broker restarts
    await channel.assertExchange(EXCHANGE, 'fanout', { durable: true });

    connection.on('error', (err) => {
      console.warn(`[RabbitMQ] Connection error: ${err.message} — reconnecting in 5s`);
      connection = null; channel = null;
      setTimeout(connect, 5000);
    });
    connection.on('close', () => {
      if (connection) {
        console.warn('[RabbitMQ] Connection closed — reconnecting in 5s');
        connection = null; channel = null;
        setTimeout(connect, 5000);
      }
    });

    console.log('[RabbitMQ] ✅ Publisher connected');
  } catch (err) {
    console.warn(`[RabbitMQ] ⚠️  Could not connect: ${err.message} — retrying in 5s`);
    connection = null; channel = null;
    setTimeout(connect, 5000);
  }
}

/**
 * Publish an event to the fanout exchange.
 * @param {string} event   - e.g. "material_uploaded"
 * @param {object} payload - arbitrary JSON payload
 */
async function publishEvent(event, payload) {
  if (!channel) {
    console.warn(`[RabbitMQ] ⚠️  No channel — event "${event}" dropped (RabbitMQ unavailable)`);
    return false;
  }
  try {
    const message = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });
    channel.publish(EXCHANGE, '', Buffer.from(message), { persistent: true });
    console.log(`[RabbitMQ] 📤 INTER-SERVICE EVENT PUBLISHED: "${event}" → Dispatching to all subscribers...`);
    return true;
  } catch (err) {
    console.error(`[RabbitMQ] ❌ Publish failed: ${err.message}`);
    return false;
  }
}

async function close() {
  try {
    if (channel)    await channel.close();
    if (connection) await connection.close();
  } catch (_) {}
  connection = null; channel = null;
}

// Connect immediately on require
connect();

module.exports = { publishEvent, close, EXCHANGE, getRabbitMQUrl: () => RABBITMQ_URL };
