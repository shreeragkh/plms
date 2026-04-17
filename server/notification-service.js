const express  = require('express');
const cors     = require('cors');
const amqplib  = require('amqplib');

const app = express();
app.use(cors());
app.use(express.json());

// ── In-memory notification log ────────────────────────────────────────────────
const notifications = [];

// ── Health check (used by API Gateway) ───────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ service: 'notification-service', status: 'ok', port: 5002, notifications: notifications.length });
});

// ── REST endpoints ────────────────────────────────────────────────────────────
// GET all logged notifications
app.get('/notifications', (req, res) => {
  res.json(notifications);
});

// POST (kept for manual testing / HTTP fallback)
app.post('/notifications/log', (req, res) => {
  const { event, payload, timestamp } = req.body;
  const notification = {
    id: Date.now(),
    event,
    payload,
    timestamp: timestamp || new Date().toISOString(),
    source: 'http'
  };
  notifications.push(notification);
  console.log(`[Notification] 📬 HTTP event: ${event}`, payload);
  res.status(200).json({ success: true, message: 'Notification logged', notification });
});

// ── RabbitMQ Consumer ─────────────────────────────────────────────────────────
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const EXCHANGE     = 'plms_events';
const QUEUE        = 'notification_service_queue';

async function startConsumer() {
  try {
    const connection = await amqplib.connect(RABBITMQ_URL);
    const channel    = await connection.createChannel();

    // Must match the exchange declared by the publisher (durable fanout)
    await channel.assertExchange(EXCHANGE, 'fanout', { durable: true });

    // Exclusive queue bound to the fanout exchange
    const q = await channel.assertQueue(QUEUE, { durable: true });
    await channel.bindQueue(q.queue, EXCHANGE, '');

    console.log(`[Notification] ✅ RabbitMQ consumer ready — listening on "${QUEUE}"`);

    channel.consume(q.queue, (msg) => {
      if (!msg) return;
      try {
        const data = JSON.parse(msg.content.toString());
        const latency = Date.now() - new Date(data.timestamp).getTime();
        
        const notification = {
          id: Date.now(),
          event: data.event,
          payload: data.payload,
          timestamp: data.timestamp || new Date().toISOString(),
          source: 'rabbitmq'
        };
        notifications.push(notification);
        
        console.log(`[Notification Service] 📥 INTER-SERVICE EVENT RECEIVED: "${data.event}"`);
        console.log(`   └─ Status: Taken from RabbitMQ queue`);
        console.log(`   └─ Network Latency (MQ): ${latency}ms`);
        console.log(`   └─ Source Payload:`, data.payload);
        
        channel.ack(msg);
      } catch (err) {
        console.error('[Notification] ❌ Failed to parse message:', err.message);
        channel.nack(msg, false, false); // discard invalid message
      }
    });

    connection.on('error', (err) => {
      console.warn(`[Notification] RabbitMQ error: ${err.message} — reconnecting in 5s`);
      setTimeout(startConsumer, 5000);
    });
    connection.on('close', () => {
      console.warn('[Notification] RabbitMQ connection closed — reconnecting in 5s');
      setTimeout(startConsumer, 5000);
    });

  } catch (err) {
    console.warn(`[Notification] ⚠️  RabbitMQ unavailable: ${err.message} — retrying in 5s`);
    setTimeout(startConsumer, 5000);
  }
}

// Start consumer (non-blocking — server starts first)
startConsumer();

// ── Start HTTP server ─────────────────────────────────────────────────────────
const PORT = process.env.NOTIFICATION_PORT || 5002;
app.listen(PORT, () => {
  console.log(`[Notification] 🚀 Microservice running on port ${PORT}`);
  console.log(`[Notification] 📡 View notifications: http://localhost:${PORT}/notifications`);
});
