#!/bin/bash
# Stop all PLMS microservices
echo "🛑 Stopping all PLMS microservices..."
for PORT in 5000 5001 5002 5003 5004 5005; do
  fuser -k ${PORT}/tcp 2>/dev/null && echo "   Stopped :${PORT}" || echo "   :${PORT} was not running"
done
echo "✅ All services stopped."
