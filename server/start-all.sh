#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# PLMS Microservices — Start All Services
# Usage: bash start-all.sh
# ─────────────────────────────────────────────────────────────────────────────

SERVER_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$SERVER_DIR/logs"
mkdir -p "$LOG_DIR"

# Kill anything already on our ports
echo "🧹 Clearing ports 5000-5005..."
for PORT in 5000 5001 5002 5003 5004 5005; do
  fuser -k ${PORT}/tcp 2>/dev/null && echo "   Killed process on :${PORT}"
done
sleep 1

# Start infrastructure services check
echo ""
echo "🔍 Checking infrastructure..."
redis-cli ping > /dev/null 2>&1 && echo "   ✅ Redis/Valkey on :6379" || echo "   ⚠️  Redis unavailable — run: sudo systemctl start valkey"
rabbitmqctl status > /dev/null 2>&1 || systemctl is-active rabbitmq-server > /dev/null 2>&1 && echo "   ✅ RabbitMQ on :5672" || echo "   ⚠️  RabbitMQ unavailable — run: sudo systemctl start rabbitmq-server"

echo ""
echo "🚀 Starting microservices..."

# Start each service in background
node "$SERVER_DIR/notification-service.js" > "$LOG_DIR/notification-service.log" 2>&1 &
echo "   📬 Notification Service  → :5002  (PID $!)"

sleep 0.5
node "$SERVER_DIR/auth-service.js" > "$LOG_DIR/auth-service.log" 2>&1 &
echo "   🔐 Auth Service          → :5001  (PID $!)"

sleep 0.5
node "$SERVER_DIR/course-service.js" > "$LOG_DIR/course-service.log" 2>&1 &
echo "   📚 Course Service        → :5003  (PID $!)"

sleep 0.5
node "$SERVER_DIR/quiz-service.js" > "$LOG_DIR/quiz-service.log" 2>&1 &
echo "   📝 Quiz Service          → :5004  (PID $!)"

sleep 0.5
node "$SERVER_DIR/chat-service.js" > "$LOG_DIR/chat-service.log" 2>&1 &
echo "   💬 Chat Service          → :5005  (PID $!)"

sleep 1
node "$SERVER_DIR/gateway.js" > "$LOG_DIR/gateway.log" 2>&1 &
echo "   🌐 API Gateway           → :5000  (PID $!)"

echo ""
echo "⏳ Waiting for services to initialise..."
sleep 4

echo ""
echo "✅ All services started!"
echo ""
echo "📊 Health check:  http://localhost:5000/health"
echo "📬 Notifications: http://localhost:5002/api/notifications"
echo "🔑 Redis keys:    redis-cli keys '*'"
echo ""
echo "📂 Logs: $LOG_DIR/"
echo ""
echo "To stop all:  bash stop-all.sh"
echo "─────────────────────────────────────────────────────────────────────────────"
