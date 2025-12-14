const amqp = require('amqplib');
const express = require('express');
const client = require('prom-client');

// --- Metrics Setup ---
const app = express();
const PORT = 3003;
client.collectDefaultMetrics();
const notifCounter = new client.Counter({
    name: 'ecommerce_notifications_sent',
    help: 'Total emails sent'
});

app.get('/metrics', async (req, res) => {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
});

app.listen(PORT, () => console.log(`Notification Metrics server on ${PORT}`));

// --- RabbitMQ Connection with Retry ---
async function connect() {
    const amqpServer = process.env.AMQP_URL || 'amqp://localhost:5672';
    console.log(`[Notification Service] Connecting to RabbitMQ at: ${amqpServer}`);

    try {
        const connection = await amqp.connect(amqpServer);
        const channel = await connection.createChannel();
        await channel.assertExchange('ecommerce_exchange', 'direct', { durable: true });

        const q = await channel.assertQueue('notification_queue');

        // Listen for "payment.processed" events
        await channel.bindQueue(q.queue, 'ecommerce_exchange', 'payment.processed');

        console.log("[Notification Service] Connected & Waiting for messages...");

        channel.consume(q.queue, (data) => {
            const order = JSON.parse(data.content);

            notifCounter.inc(); // Update Prometheus Metric

            console.log(`[Notification] 📧 Sending email to user for Order ${order.id}`);
            channel.ack(data);
        });

        connection.on("close", () => {
            console.error("[Notification Service] Connection closed, retrying...");
            setTimeout(connect, 5000);
        });

    } catch (error) {
        console.error(`[Notification Service] Connection failed: ${error.message}`);
        console.error("[Notification Service] Retrying in 5 seconds...");
        setTimeout(connect, 5000);
    }
}

connect();